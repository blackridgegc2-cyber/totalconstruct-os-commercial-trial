-- Independent database identities and RLS; all fixture records roll back.
create temporary table tc_cloud_import_qa_20261015(result jsonb);
do $$
declare
 co uuid:=gen_random_uuid();other_co uuid:=gen_random_uuid();p uuid:=gen_random_uuid();other_p uuid:=gen_random_uuid();
 pm uuid:=gen_random_uuid();pm2 uuid:=gen_random_uuid();owner_ uuid:=gen_random_uuid();outsider uuid:=gen_random_uuid();
 source text;source2 text;contract_source text;doc jsonb;first_ jsonb;second_ jsonb;contract_ jsonb;count_ integer;checks integer:=0;caught boolean;
 payload jsonb:='{"proposedLines":[{"costCode":"01","description":"Design","originalBudget":100.29,"revisedBudget":100.29,"forecastCost":0,"committed":0,"actual":0}],"totalOriginal":100.29,"totalForecast":0}'::jsonb;
begin
 begin
  insert into auth.users(id,email) values(pm,pm::text||'@qa.invalid'),(pm2,pm2::text||'@qa.invalid'),(owner_,owner_::text||'@qa.invalid'),(outsider,outsider::text||'@qa.invalid');
  insert into public.profiles(id,role,active) values(pm,'pm',true),(pm2,'pm',true),(owner_,'owner',true),(outsider,'admin',true) on conflict(id) do update set role=excluded.role,active=true;
  insert into public.companies(id,name) values(co,'Transient cloud import QA'),(other_co,'Other transient QA');
  insert into public.projects(id,company_id,name,forecast_cost,contract_value,original_contract_value) values(p,co,'Transient project',50,500,500),(other_p,other_co,'Other transient project',80,500,500);
  insert into public.project_members(project_id,user_id,role,active) values(p,pm,'pm',true),(p,pm2,'pm',true),(p,owner_,'owner',true);
  insert into public.company_users(company_id,user_id,active) values(other_co,outsider,true);
  source:=p::text||'/budgets/qa.csv';source2:=p::text||'/budgets/qa2.csv';contract_source:=p::text||'/contracts/qa.pdf';
  insert into storage.objects(bucket_id,name) values('project-documents',source),('project-documents',source2),('project-documents',contract_source);
  perform set_config('request.jwt.claim.sub',pm::text,true);
  doc:=public.tc_save_project_import(p,'budget',null,0,'qa.csv',source,payload);checks:=checks+1;
  if (select forecast_cost from public.projects where id=p)<>50 then raise exception 'Staging changed the forecast';end if;checks:=checks+1;
  perform set_config('request.jwt.claim.sub',pm2::text,true);
  execute 'set local role authenticated';
  select count(*) into count_ from public.tc_project_imports where id=(doc->>'id')::uuid;
  if count_<>1 then raise exception 'Second authorized user could not reopen import';end if;checks:=checks+1;
  execute 'set local role postgres';
  -- Wrong revisions and invalid totals cannot alter the project.
  caught:=false;begin perform public.tc_apply_project_import((doc->>'id')::uuid,99,'{}');exception when serialization_failure then caught:=true;end;
  if not caught then raise exception 'Stale approval accepted';end if;checks:=checks+1;
  first_:=public.tc_apply_project_import((doc->>'id')::uuid,1,'{}');
  if (select forecast_cost from public.projects where id=p)<>0 or first_->>'status'<>'approved' then raise exception 'Zero forecast not atomically applied';end if;checks:=checks+1;
  second_:=public.tc_apply_project_import((doc->>'id')::uuid,1,'{}');if second_->>'revision'<>first_->>'revision' then raise exception 'Retry was not idempotent';end if;checks:=checks+1;
  -- A pending replacement must detect intervening edits on another device.
  second_:=public.tc_save_project_import(p,'budget',null,0,'qa2.csv',source2,payload);
  first_:=public.tc_update_import_forecast((first_->>'id')::uuid,(first_->>'revision')::integer,0,23.29);
  if (select forecast_cost from public.projects where id=p)<>23.29 then raise exception 'Forecast edit not saved';end if;checks:=checks+1;
  caught:=false;begin perform public.tc_apply_project_import((second_->>'id')::uuid,1,'{}');exception when serialization_failure then caught:=true;end;
  if not caught then raise exception 'Old replacement overwrote a newer forecast';end if;checks:=checks+1;
  caught:=false;begin perform public.tc_update_import_forecast((first_->>'id')::uuid,2,0,40);exception when serialization_failure then caught:=true;end;
  if not caught then raise exception 'Stale forecast overwrite accepted';end if;checks:=checks+1;
  -- Draft review cannot mutate the original source reference.
  caught:=false;begin perform public.tc_save_project_import(p,'budget',(second_->>'id')::uuid,1,'qa2.csv',source,payload);exception when check_violation then caught:=true;end;
  if not caught then raise exception 'Source reference changed';end if;checks:=checks+1;
  contract_:=public.tc_save_project_import(p,'contract',null,0,'qa.pdf',contract_source,'{"aiFields":{"contractValue":600,"client":"Test Owner"}}');
  contract_:=public.tc_apply_project_import((contract_->>'id')::uuid,1,'{"contract":600,"client":"Test Owner","retainage":0}');
  if (select contract_value from public.projects where id=p)<>600 or (select original_contract_value from public.projects where id=p)<>500 then raise exception 'Reviewed terms not applied or original baseline changed';end if;checks:=checks+1;
  -- A member without a financial/contract grant sees neither metadata nor sources.
  perform set_config('request.jwt.claim.sub',owner_::text,true);execute 'set local role authenticated';
  select count(*) into count_ from public.tc_project_imports where project_id=p;if count_<>0 then raise exception 'Owner can read private import metadata';end if;checks:=checks+1;
  select count(*) into count_ from storage.objects where bucket_id='project-documents' and name in (source,contract_source);if count_<>0 then raise exception 'Owner can read private source files';end if;checks:=checks+1;
  caught:=false;begin perform public.tc_apply_project_import((second_->>'id')::uuid,1,'{}');exception when insufficient_privilege then caught:=true;end;
  if not caught then raise exception 'Owner approved a private import';end if;checks:=checks+1;
  execute 'set local role postgres';
  insert into public.tc_project_permission_overrides(project_id,user_id,permission,enabled,granted_by) values(p,owner_,'financial_project',true,pm);
  if not tc_import_private.can_access(p,'budget') or tc_import_private.can_access(other_p,'budget') or tc_import_private.can_access(p,'contract') then raise exception 'Scoped grant expanded beyond one project/permission';end if;checks:=checks+1;
  update public.tc_project_permission_overrides set enabled=false where project_id=p and user_id=owner_;
  if tc_import_private.can_access(p,'budget') then raise exception 'Revocation did not take effect';end if;checks:=checks+1;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  if tc_import_private.can_access(p,'budget') or tc_import_private.source_access(source,false) then raise exception 'Other-company admin accessed private imports';end if;checks:=checks+1;
  perform set_config('request.jwt.claim.sub',pm2::text,true);
  if not exists(select 1 from public.tc_project_import_events where import_id=(first_->>'id')::uuid and action='forecast' and actor_id=pm2) then raise exception 'Forecast audit event missing';end if;checks:=checks+1;
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  update public.profiles set active=false where id=pm2;
  perform set_config('request.jwt.claim.sub',pm2::text,true);
  if tc_import_private.can_access(p,'budget') or tc_import_private.source_access(source,false) then raise exception 'Inactive user retained import access';end if;checks:=checks+1;
  raise exception using errcode='ZQ002',message='Roll back all fixture users, companies, sources and imports';
 exception when sqlstate 'ZQ002' then null;
 end;
 if exists(select 1 from public.companies where id=co) or exists(select 1 from auth.users where id=pm) then raise exception 'Fixture did not roll back';end if;
 insert into tc_cloud_import_qa_20261015 values(jsonb_build_object('status','PASS','checks',checks,'fixture_rolled_back',true,'scope','database role simulation and actual RLS'));
end $$;
select result from tc_cloud_import_qa_20261015;
