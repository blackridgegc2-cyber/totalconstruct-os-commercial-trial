create or replace function tc_access_private.assign(cid uuid,uid uuid,actor uuid,assignments_ jsonb) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare a jsonb;
begin
 perform tc_access_private.validate(cid,assignments_);
 update public.project_members m set active=false where user_id=uid and exists(select 1 from public.projects p where p.id=m.project_id and p.company_id=cid);
 delete from public.tc_project_access_rules r where user_id=uid and exists(select 1 from public.projects p where p.id=r.project_id and p.company_id=cid);
 for a in select value from jsonb_array_elements(assignments_) loop
  insert into public.project_members(project_id,user_id,role,active,permissions,assigned_by) values((a->>'projectId')::uuid,uid,(a->>'role')::public.app_role,true,'[]',actor) on conflict(project_id,user_id,role) do update set active=true,permissions='[]',assigned_by=actor;
  insert into public.tc_project_access_rules(project_id,user_id,allow_permissions,deny_permissions,updated_by) values((a->>'projectId')::uuid,uid,array(select jsonb_array_elements_text(a->'allow')),array(select jsonb_array_elements_text(a->'deny')),actor);
 end loop;
 -- A complete edited assignment replaces old extra grants in this company.
 delete from public.tc_project_permission_overrides o where user_id=uid and exists(select 1 from public.projects p where p.id=o.project_id and p.company_id=cid);
end $$;
