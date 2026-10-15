alter table public.tc_project_imports add column base_budget_revision integer;
-- Capture the current budget revision on every newly staged import.
create or replace function tc_import_private.capture_budget_base()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.base_budget_id is not null then select revision into new.base_budget_revision from public.tc_project_imports where id=new.base_budget_id;end if;
 return new;
end $$;
revoke all on function tc_import_private.capture_budget_base() from public,anon,authenticated;
create trigger tc_import_capture_budget_base before insert on public.tc_project_imports for each row execute function tc_import_private.capture_budget_base();

create or replace function public.tc_update_import_forecast(p_import_id uuid,p_expected_revision integer,p_line_index integer,p_forecast numeric)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.tc_project_imports;pid uuid;total numeric;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select project_id into pid from public.tc_project_imports where id=p_import_id and kind='budget';
 if not tc_import_private.can_access(pid,'budget') then raise exception 'Project financial permission required' using errcode='42501';end if;
 perform 1 from public.projects where id=pid for update;
 select * into r from public.tc_project_imports where id=p_import_id for update;
 if r.status<>'approved' or r.revision is distinct from p_expected_revision then raise exception 'Working budget changed; reload before updating the forecast' using errcode='40001';end if;
 if p_line_index is null or p_line_index<0 or p_line_index>=jsonb_array_length(r.payload->'proposedLines') or p_forecast is null or p_forecast::text in ('NaN','Infinity','-Infinity') or round(p_forecast,2)<>p_forecast or abs(p_forecast)>999999999999.99 then raise exception 'Invalid forecast line or amount' using errcode='22023';end if;
 r.payload:=jsonb_set(r.payload,array['proposedLines',p_line_index::text,'forecastCost'],to_jsonb(p_forecast));
 select sum((value->>'forecastCost')::numeric) into total from jsonb_array_elements(r.payload->'proposedLines');
 r.payload:=jsonb_set(r.payload,'{totalForecast}',to_jsonb(total));
 update public.projects set forecast_cost=total,updated_at=now() where id=pid;
 update public.tc_project_imports set payload=r.payload,revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 insert into public.tc_project_import_events(import_id,project_id,kind,action,actor_id,revision,snapshot) values(r.id,r.project_id,r.kind,'forecast',auth.uid(),r.revision,to_jsonb(r));
 return to_jsonb(r);
end $$;
revoke all on function public.tc_update_import_forecast(uuid,integer,integer,numeric) from public,anon;
grant execute on function public.tc_update_import_forecast(uuid,integer,integer,numeric) to authenticated;

create or replace function public.tc_apply_project_import(p_import_id uuid,p_expected_revision integer,p_values jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.tc_project_imports;pid uuid;kind_ text;line jsonb;amount numeric;original numeric:=0;forecast numeric:=0;active_budget uuid;active_revision integer;key_ text;value_ jsonb;patch jsonb:='{}';
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select project_id,kind into pid,kind_ from public.tc_project_imports where id=p_import_id;
 if not tc_import_private.can_access(pid,kind_) then raise exception 'Project import permission required' using errcode='42501';end if;
 perform 1 from public.projects where id=pid for update;
 select * into r from public.tc_project_imports where id=p_import_id for update;
 if jsonb_typeof(p_values) is distinct from 'object' then raise exception 'Reviewed values must be an object' using errcode='22023';end if;
 if r.status='approved' and r.revision=p_expected_revision+1 and r.approved_values=p_values then return to_jsonb(r);end if;
 if r.status<>'draft' or r.revision is distinct from p_expected_revision then raise exception 'Import changed on another device; reload before approval' using errcode='40001';end if;
 if kind_='budget' then
  if p_values<>'{}'::jsonb or jsonb_typeof(r.payload->'proposedLines') is distinct from 'array' or jsonb_array_length(r.payload->'proposedLines') not between 1 and 5000 then raise exception 'Invalid budget lines' using errcode='22023';end if;
  select id,revision into active_budget,active_revision from public.tc_project_imports where project_id=pid and kind='budget' and status='approved';
  if active_budget is distinct from r.base_budget_id or active_revision is distinct from r.base_budget_revision then raise exception 'A newer working budget was approved. Import and review against the current budget.' using errcode='40001';end if;
  for line in select value from jsonb_array_elements(r.payload->'proposedLines') loop
   if jsonb_typeof(line) is distinct from 'object' or nullif(btrim(line->>'description'),'') is null then raise exception 'Every budget line needs a description' using errcode='22023';end if;
   foreach key_ in array array['originalBudget','revisedBudget','forecastCost','committed','actual'] loop
    if jsonb_typeof(line->key_) is distinct from 'number' or (line->>key_) !~ '^-?[0-9]+([.][0-9]{1,2})?$' then raise exception 'Budget amounts must be finite numbers to cents' using errcode='22023';end if;
    amount:=(line->>key_)::numeric;if abs(amount)>999999999999.99 then raise exception 'Budget amount outside supported range' using errcode='22023';end if;
   end loop;
   original:=original+(line->>'originalBudget')::numeric;forecast:=forecast+(line->>'forecastCost')::numeric;
  end loop;
  if (r.payload->>'totalOriginal')::numeric is distinct from original or (r.payload->>'totalForecast')::numeric is distinct from forecast then raise exception 'Budget totals do not reconcile to lines' using errcode='23514';end if;
  if active_budget is not null then
   update public.tc_project_imports set status='superseded',revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=active_budget;
   insert into public.tc_project_import_events(import_id,project_id,kind,action,actor_id,revision,snapshot) select id,project_id,kind,'superseded',auth.uid(),revision,to_jsonb(x) from public.tc_project_imports x where id=active_budget;
  end if;
  update public.projects set forecast_cost=forecast,updated_at=now() where id=pid;
 else
  for key_,value_ in select key,value from jsonb_each(p_values) loop
   if key_ not in ('contract','client','contractType','retainage','substantialCompletion','paymentTerms','liquidatedDamages','noticeDays','insuranceRequirements','bondRequirements') then raise exception 'Unknown contract field' using errcode='22023';end if;
   if key_ in ('contract','retainage') then
    if jsonb_typeof(value_) is distinct from 'number' or value_::text !~ '^[0-9]+([.][0-9]{1,2})?$' then raise exception 'Contract amount and retainage must be nonnegative numbers to cents' using errcode='22023';end if;
    if key_='retainage' and value_::numeric>100 then raise exception 'Retainage must be 0 to 100' using errcode='22023';end if;
   elsif jsonb_typeof(value_) is distinct from 'string' or length(value_#>>'{}')>10000 then raise exception 'Contract term must be text' using errcode='22023';end if;
   if key_='substantialCompletion' and (value_#>>'{}')!~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'Completion date must use YYYY-MM-DD' using errcode='22023';end if;
  end loop;
  update public.projects set
   contract_value=case when p_values?'contract' then (p_values->>'contract')::numeric else contract_value end,
   original_contract_value=case when p_values?'contract' and coalesce(original_contract_value,0)=0 then (p_values->>'contract')::numeric else original_contract_value end,
   client_name=case when p_values?'client' then p_values->>'client' else client_name end,
   contract_method=case when p_values?'contractType' then p_values->>'contractType' else contract_method end,
   substantial_completion_date=case when p_values?'substantialCompletion' then (p_values->>'substantialCompletion')::date else substantial_completion_date end,
   updated_at=now() where id=pid;
 end if;
 update public.tc_project_imports set status='approved',approved_values=p_values,revision=revision+1,approved_by=auth.uid(),approved_at=now(),updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 insert into public.tc_project_import_events(import_id,project_id,kind,action,actor_id,revision,snapshot) values(r.id,r.project_id,r.kind,'approve',auth.uid(),r.revision,to_jsonb(r));
 return to_jsonb(r);
end $$;
