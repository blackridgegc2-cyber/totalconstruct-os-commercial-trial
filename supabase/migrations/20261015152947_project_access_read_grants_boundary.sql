create policy tc_project_company_boundary on public.projects as restrictive for select to authenticated using(tc_access_private.has_permission(id,'project'));
-- Explicit additional modules may supply read access, without broadening rows for
-- roles that already have that module as part of their normal restricted access.
create function tc_access_private.explicit_read(pid uuid,feature_ text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select tc_access_private.has_permission(pid,feature_) and exists(select 1 from public.tc_project_access_rules r join public.project_members m on m.project_id=r.project_id and m.user_id=r.user_id where r.project_id=pid and r.user_id=auth.uid() and m.active and feature_=any(r.allow_permissions) and not feature_=any(tc_access_private.base(m.role::text)))$$;
revoke all on function tc_access_private.explicit_read(uuid,text) from public,anon;
grant execute on function tc_access_private.explicit_read(uuid,text) to authenticated;
do $$declare r record;f text;begin for r in select tablename,qual from pg_policies where schemaname='public' and policyname='tc_scoped_feature_gate' loop
 f:=substring(r.qual from 'has_permission\(project_id, ''([^'']+)''');
 if f is not null then execute format('create policy tc_explicit_project_read on public.%I for select to authenticated using(tc_access_private.explicit_read(project_id,%L))',r.tablename,f);end if;
end loop;end $$;
-- Coordination create grants remain explicit, rather than being inferred from base read access.
do $$declare d text;begin
 d:=pg_get_functiondef('tc_coord_private.granted(uuid,uuid,text)'::regprocedure);
 d:=replace(d,'select exists(',E'select exists(select 1 from public.tc_project_access_rules where project_id=p_project and user_id=p_user and (case p_kind when ''rfi'' then ''rfi'' else ''submittal'' end)=any(allow_permissions) and not (case p_kind when ''rfi'' then ''rfi'' else ''submittal'' end)=any(deny_permissions)) or exists(');execute d;
end $$;
