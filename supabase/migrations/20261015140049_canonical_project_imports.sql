-- Canonical import revisions and approval. Browser snapshots are not authoritative.
create schema if not exists tc_import_private;
revoke all on schema tc_import_private from public,anon;
grant usage on schema tc_import_private to authenticated;

create or replace function tc_import_private.can_access(p_project uuid,p_kind text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and p_kind in ('budget','contract') and exists(
  select 1 from public.projects p where p.id=p_project and (
   exists(select 1 from public.company_users cu join public.profiles pr on pr.id=cu.user_id
    where cu.company_id=p.company_id and cu.user_id=auth.uid() and cu.active and pr.active and pr.role::text in ('admin','executive'))
   or exists(select 1 from public.company_members cm where cm.company_id=p.company_id and cm.user_id=auth.uid()
    and lower(cm.role) = any(case when p_kind='budget' then array['admin','administrator','executive','controller','accounting','accountant','finance'] else array['admin','administrator','executive'] end))
   or exists(select 1 from public.project_members pm where pm.project_id=p.id and pm.user_id=auth.uid() and pm.active and (
    pm.role::text in ('pm','apm')
    or (p_kind='budget' and (pm.permissions ?| array['financial_project','accounting','wip'] or exists(select 1 from public.tc_project_permission_overrides o where o.project_id=p.id and o.user_id=auth.uid() and o.enabled and o.permission in ('financial_project','accounting','wip'))))
    or (p_kind='contract' and (pm.permissions ? 'contracts' or exists(select 1 from public.tc_project_permission_overrides o where o.project_id=p.id and o.user_id=auth.uid() and o.enabled and o.permission='contracts')))
   ))
  )
 );
$$;
revoke all on function tc_import_private.can_access(uuid,text) from public,anon;
grant execute on function tc_import_private.can_access(uuid,text) to authenticated;

create or replace function tc_import_private.source_access(p_name text,p_write boolean default false)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare pid uuid;folder text;
begin
 if auth.uid() is null then return false;end if;
 begin pid:=split_part(p_name,'/',1)::uuid;exception when invalid_text_representation then return false;end;
 folder:=split_part(p_name,'/',2);
 if folder='budgets' then return tc_import_private.can_access(pid,'budget');end if;
 if folder='contracts' then return tc_import_private.can_access(pid,'contract');end if;
 return exists(select 1 from public.project_members pm where pm.project_id=pid and pm.user_id=auth.uid() and pm.active)
  or exists(select 1 from public.projects p join public.company_users cu on cu.company_id=p.company_id join public.profiles pr on pr.id=cu.user_id where p.id=pid and cu.user_id=auth.uid() and cu.active and pr.active and pr.role::text in ('admin','executive'));
end $$;
revoke all on function tc_import_private.source_access(text,boolean) from public,anon;
grant execute on function tc_import_private.source_access(text,boolean) to authenticated;

create table public.tc_project_imports(
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id),
 kind text not null check(kind in ('budget','contract')),
 status text not null default 'draft' check(status in ('draft','approved','superseded')),
 file_name text not null,source_path text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 revision integer not null default 1 check(revision>0),
 base_budget_id uuid,
 approved_values jsonb not null default '{}'::jsonb,
 created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),approved_by uuid references auth.users(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),approved_at timestamptz,
 unique(project_id,kind,source_path)
);
create index tc_project_imports_project_kind on public.tc_project_imports(project_id,kind,updated_at desc);
create unique index tc_project_imports_one_active_budget on public.tc_project_imports(project_id) where kind='budget' and status='approved';
create table public.tc_project_import_events(
 id bigint generated always as identity primary key,
 import_id uuid not null references public.tc_project_imports(id),project_id uuid not null references public.projects(id),kind text not null,
 action text not null,actor_id uuid not null references auth.users(id),revision integer not null,
 snapshot jsonb not null,created_at timestamptz not null default now()
);
create index tc_project_import_events_import on public.tc_project_import_events(import_id,created_at);
alter table public.tc_project_imports enable row level security;
alter table public.tc_project_import_events enable row level security;
create policy import_read on public.tc_project_imports for select to authenticated using(tc_import_private.can_access(project_id,kind));
create policy import_event_read on public.tc_project_import_events for select to authenticated using(tc_import_private.can_access(project_id,kind));
revoke all on public.tc_project_imports,public.tc_project_import_events from public,anon,authenticated;
grant select on public.tc_project_imports,public.tc_project_import_events to authenticated;

create or replace function public.tc_save_project_import(p_project_id uuid,p_kind text,p_import_id uuid,p_expected_revision integer,p_file_name text,p_source_path text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.tc_project_imports;active_budget uuid;
begin
 if not tc_import_private.can_access(p_project_id,p_kind) then raise exception 'Project import permission required' using errcode='42501';end if;
 perform 1 from public.projects where id=p_project_id for update;
 if jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>650000 or nullif(btrim(p_file_name),'') is null or length(p_file_name)>240
  or p_source_path not like p_project_id::text||'/'||(case p_kind when 'budget' then 'budgets' else 'contracts' end)||'/%'
  or not exists(select 1 from storage.objects where bucket_id='project-documents' and name=p_source_path) then raise exception 'Invalid import source or payload' using errcode='22023';end if;
 if p_import_id is null then
  if p_expected_revision is distinct from 0 then raise exception 'New import must start at revision zero' using errcode='40001';end if;
  select id into active_budget from public.tc_project_imports where project_id=p_project_id and kind='budget' and status='approved';
  insert into public.tc_project_imports(project_id,kind,file_name,source_path,payload,base_budget_id,created_by,updated_by)
   values(p_project_id,p_kind,p_file_name,p_source_path,p_payload,active_budget,auth.uid(),auth.uid()) returning * into r;
 else
  select * into r from public.tc_project_imports where id=p_import_id and project_id=p_project_id and kind=p_kind for update;
  if not found then raise exception 'Import unavailable' using errcode='P0002';end if;
  if r.revision is distinct from p_expected_revision or r.status<>'draft' then raise exception 'Import changed on another device; reload before reviewing' using errcode='40001';end if;
  if r.source_path<>p_source_path or r.file_name<>p_file_name then raise exception 'Source reference is immutable' using errcode='23514';end if;
  update public.tc_project_imports set payload=p_payload,revision=revision+1,updated_by=auth.uid(),updated_at=now() where id=r.id returning * into r;
 end if;
 insert into public.tc_project_import_events(import_id,project_id,kind,action,actor_id,revision,snapshot) values(r.id,r.project_id,r.kind,'save',auth.uid(),r.revision,to_jsonb(r));
 return to_jsonb(r);
end $$;
revoke all on function public.tc_save_project_import(uuid,text,uuid,integer,text,text,jsonb) from public,anon;
grant execute on function public.tc_save_project_import(uuid,text,uuid,integer,text,text,jsonb) to authenticated;

create or replace function public.tc_apply_project_import(p_import_id uuid,p_expected_revision integer,p_values jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.tc_project_imports;pid uuid;kind_ text;line jsonb;amount numeric;original numeric:=0;forecast numeric:=0;active_budget uuid;key_ text;value_ jsonb;patch jsonb:='{}';
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
  select id into active_budget from public.tc_project_imports where project_id=pid and kind='budget' and status='approved';
  if active_budget is distinct from r.base_budget_id then raise exception 'A newer working budget was approved. Import and review against the current budget.' using errcode='40001';end if;
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
revoke all on function public.tc_apply_project_import(uuid,integer,jsonb) from public,anon;
grant execute on function public.tc_apply_project_import(uuid,integer,jsonb) to authenticated;

-- Scope sensitive original source files as strictly as their import records.
alter policy "project members can read project files" on storage.objects to authenticated using(bucket_id='project-documents' and tc_import_private.source_access(name,false));
alter policy "project members can upload project files" on storage.objects to authenticated with check(bucket_id='project-documents' and tc_import_private.source_access(name,true));
alter policy "company members can read project documents" on storage.objects to authenticated using(bucket_id='project-documents' and tc_import_private.source_access(name,false));
alter policy "company members can upload project documents" on storage.objects to authenticated with check(bucket_id='project-documents' and tc_import_private.source_access(name,true));
-- Uploaded project sources are immutable through the ordinary client.
alter policy "company members can update project documents" on storage.objects to authenticated using(false) with check(false);
alter policy "company members can delete project documents" on storage.objects to authenticated using(false);
