create or replace function tc_import_private.can_access(p_project uuid,p_kind text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(select 1 from public.profiles caller where caller.id=auth.uid() and caller.active) and p_kind in ('budget','contract') and exists(
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
 if auth.uid() is null or not exists(select 1 from public.profiles caller where caller.id=auth.uid() and caller.active) then return false;end if;
 begin pid:=split_part(p_name,'/',1)::uuid;exception when invalid_text_representation then return false;end;
 folder:=split_part(p_name,'/',2);
 if folder='budgets' then return tc_import_private.can_access(pid,'budget');end if;
 if folder='contracts' then return tc_import_private.can_access(pid,'contract');end if;
 return exists(select 1 from public.project_members pm where pm.project_id=pid and pm.user_id=auth.uid() and pm.active)
  or exists(select 1 from public.projects p join public.company_users cu on cu.company_id=p.company_id join public.profiles pr on pr.id=cu.user_id where p.id=pid and cu.user_id=auth.uid() and cu.active and pr.active and pr.role::text in ('admin','executive'));
end $$;
revoke all on function tc_import_private.source_access(text,boolean) from public,anon;
grant execute on function tc_import_private.source_access(text,boolean) to authenticated;
