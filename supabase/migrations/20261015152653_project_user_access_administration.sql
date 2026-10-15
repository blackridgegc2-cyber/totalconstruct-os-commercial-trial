create schema if not exists tc_access_private;
revoke all on schema tc_access_private from public,anon;
grant usage on schema tc_access_private to authenticated;
create function tc_access_private.base(role_ text) returns text[] language sql immutable set search_path=pg_catalog as $$select case role_ when 'executive' then array['accounting','closeout','contracts','daily','drawings','employees_cost','equipment','external','field','financial_project','internal','meetings','payapps','procurement','project','quality','reports','rfi','safety','schedule','submittal','tasks','timesheet','tm','wip']::text[] when 'admin' then array['accounting','closeout','contracts','daily','drawings','employees_cost','equipment','external','field','financial_project','internal','meetings','payapps','procurement','project','quality','reports','rfi','safety','schedule','submittal','tasks','timesheet','tm','wip']::text[] when 'accounting' then array['project','financial_project','wip','payapps','contracts','employees_cost','timesheet','accounting','reports']::text[] when 'pm' then array['project','financial_project','contracts','rfi','submittal','schedule','payapps','internal','external','quality','tasks','meetings','daily','tm','procurement','closeout','timesheet','safety','equipment','drawings']::text[] when 'apm' then array['project','rfi','submittal','schedule','contracts','internal','external','tasks','meetings','daily','quality','procurement','closeout','drawings']::text[] when 'superintendent' then array['project','field','rfi','submittal','schedule','safety','timesheet','internal','quality','daily','tasks','tm','equipment','drawings']::text[] when 'safety' then array['project','safety','daily','tasks','reports']::text[] when 'qa_qc' then array['project','quality','daily','tasks','closeout','drawings']::text[] when 'employee' then array['project','timesheet','daily','tasks','drawings']::text[] when 'subcontractor' then array['project','rfi','submittal','schedule','daily','external']::text[] when 'architect' then array['project','rfi','submittal','schedule','drawings','meetings','tasks','external']::text[] when 'engineer' then array['project','rfi','submittal','schedule','drawings','meetings','tasks','external']::text[] when 'owner' then array['project','rfi','submittal','schedule','payapps','drawings','meetings','external']::text[] when 'lender' then array['project','payapps','schedule','drawings','reports']::text[] else array['project']::text[] end$$;
create table public.tc_user_access_versions(company_id uuid not null references public.companies(id),user_id uuid not null references public.profiles(id),version integer not null default 1,primary key(company_id,user_id));
create table public.tc_project_access_rules(project_id uuid not null references public.projects(id),user_id uuid not null references public.profiles(id),allow_permissions text[] not null default '{}',deny_permissions text[] not null default '{}',updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now(),primary key(project_id,user_id));
create table public.tc_user_access_events(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),user_id uuid not null references public.profiles(id),actor_id uuid not null references public.profiles(id),before_data jsonb,after_data jsonb not null,created_at timestamptz not null default now());
create table public.tc_invite_access_plans(id uuid primary key default gen_random_uuid(),company_id uuid not null references public.companies(id),email text not null,name text not null,role text not null,assignments jsonb not null,prepared_by uuid not null references public.profiles(id),status text not null default 'pending',user_id uuid references public.profiles(id),created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '1 day');
alter table public.tc_user_access_versions enable row level security;
alter table public.tc_project_access_rules enable row level security;
alter table public.tc_user_access_events enable row level security;
alter table public.tc_invite_access_plans enable row level security;
revoke all on public.tc_user_access_versions,public.tc_project_access_rules,public.tc_user_access_events,public.tc_invite_access_plans from public,anon,authenticated;
create function tc_access_private.admin(cid uuid) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select exists(select 1 from public.company_users cu join public.profiles pr on pr.id=cu.user_id where cu.company_id=cid and cu.user_id=auth.uid() and cu.active and pr.active and pr.role::text in ('admin','executive'))$$;
create function tc_access_private.has_permission(pid uuid,feature_ text,uid uuid default auth.uid()) returns boolean language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare role_ text;rules_ public.tc_project_access_rules;cid uuid;permissions_ jsonb;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid and active) then return false;end if;
 select company_id into cid from public.projects where id=pid;
 if exists(select 1 from public.company_users cu join public.profiles pr on pr.id=cu.user_id where cu.company_id=cid and cu.user_id=uid and cu.active and pr.role::text in ('admin','executive')) then return true;end if;
 select role::text,permissions into role_,permissions_ from public.project_members where project_id=pid and user_id=uid and active;
 if role_ is null then return false;end if;
 select * into rules_ from public.tc_project_access_rules where project_id=pid and user_id=uid;
 if feature_=any(coalesce(rules_.deny_permissions,'{}')) then return false;end if;
 return feature_=any(tc_access_private.base(role_)) or feature_=any(coalesce(rules_.allow_permissions,'{}')) or permissions_ ? feature_ or exists(select 1 from public.tc_project_permission_overrides where project_id=pid and user_id=uid and permission=feature_ and enabled);
end $$;
create function tc_access_private.validate(cid uuid,assignments_ jsonb) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare a jsonb;feature_ text;seen uuid[]:='{}';pid uuid;
begin
 if jsonb_typeof(assignments_) is distinct from 'array' or jsonb_array_length(assignments_)>200 then raise exception 'Invalid project assignments' using errcode='22023';end if;
 for a in select value from jsonb_array_elements(assignments_) loop
  pid:=(a->>'projectId')::uuid;
  if pid=any(seen) or not exists(select 1 from public.projects where id=pid and company_id=cid) then raise exception 'Invalid/duplicate company project' using errcode='42501';end if;seen:=array_append(seen,pid);
  if coalesce(a->>'role','') not in ('pm','apm','accounting','superintendent','safety','qa_qc','employee','architect','engineer','owner','lender','subcontractor') or jsonb_typeof(a->'allow') is distinct from 'array' or jsonb_typeof(a->'deny') is distinct from 'array' then raise exception 'Invalid role or permission rules' using errcode='22023';end if;
  for feature_ in select jsonb_array_elements_text((a->'allow')||(a->'deny')) loop
   if feature_='all' or not feature_=any(tc_access_private.base('admin')) then raise exception 'Invalid project permission' using errcode='22023';end if;
   if (a->'allow') ? feature_ and (a->'deny') ? feature_ then raise exception 'Permission cannot be both allowed and denied' using errcode='22023';end if;
  end loop;
 end loop;
end $$;
create function tc_access_private.assign(cid uuid,uid uuid,actor uuid,assignments_ jsonb) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare a jsonb;
begin
 perform tc_access_private.validate(cid,assignments_);
 update public.project_members m set active=false where user_id=uid and exists(select 1 from public.projects p where p.id=m.project_id and p.company_id=cid);
 delete from public.tc_project_access_rules r where user_id=uid and exists(select 1 from public.projects p where p.id=r.project_id and p.company_id=cid);
 for a in select value from jsonb_array_elements(assignments_) loop
  insert into public.project_members(project_id,user_id,role,active,permissions,assigned_by) values((a->>'projectId')::uuid,uid,(a->>'role')::public.app_role,true,'[]',actor) on conflict(project_id,user_id) do update set role=excluded.role,active=true,permissions='[]',assigned_by=actor;
  insert into public.tc_project_access_rules(project_id,user_id,allow_permissions,deny_permissions,updated_by) values((a->>'projectId')::uuid,uid,array(select jsonb_array_elements_text(a->'allow')),array(select jsonb_array_elements_text(a->'deny')),actor);
 end loop;
 -- A complete edited assignment replaces old extra grants in this company.
 delete from public.tc_project_permission_overrides o where user_id=uid and exists(select 1 from public.projects p where p.id=o.project_id and p.company_id=cid);
end $$;
create function tc_access_private.roster(cid uuid) returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if not tc_access_private.admin(cid) then raise exception 'Company administrator access required' using errcode='42501';end if;
 return jsonb_build_object('projects',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'status',status) order by name),'[]') from public.projects where company_id=cid),'users',(select coalesce(jsonb_agg(jsonb_build_object('id',pr.id,'name',coalesce(nullif(pr.display_name,''),pr.email,'User'),'email',pr.email,'role',pr.role,'active',pr.active,'version',coalesce(v.version,0),'assignments',(select coalesce(jsonb_agg(jsonb_build_object('projectId',m.project_id,'role',m.role,'allow',coalesce(to_jsonb(r.allow_permissions),'[]')||(select coalesce(jsonb_agg(o.permission),'[]') from public.tc_project_permission_overrides o where o.project_id=m.project_id and o.user_id=pr.id and o.enabled),'deny',coalesce(to_jsonb(r.deny_permissions),'[]'))),'[]') from public.project_members m join public.projects p on p.id=m.project_id left join public.tc_project_access_rules r on r.project_id=m.project_id and r.user_id=m.user_id where m.user_id=pr.id and m.active and p.company_id=cid)) order by pr.display_name),'[]') from public.profiles pr left join public.tc_user_access_versions v on v.user_id=pr.id and v.company_id=cid where exists(select 1 from public.company_users where user_id=pr.id and company_id=cid and active) or exists(select 1 from public.project_members m join public.projects p on p.id=m.project_id where m.user_id=pr.id and p.company_id=cid and m.active)));
end $$;
create function tc_access_private.save(cid uuid,uid uuid,expected_ integer,assignments_ jsonb) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare version_ integer;before_ jsonb;
begin
 if not tc_access_private.admin(cid) then raise exception 'Company administrator access required' using errcode='42501';end if;
 if uid=auth.uid() or exists(select 1 from public.company_users cu join public.profiles p on p.id=cu.user_id where cu.company_id=cid and cu.user_id=uid and cu.active and p.role::text in ('admin','executive')) then raise exception 'Company administrators retain company-wide access; project editor is for other users' using errcode='42501';end if;
 if not exists(select 1 from jsonb_array_elements(tc_access_private.roster(cid)->'users') u where u->>'id'=uid::text) then raise exception 'User is outside this company' using errcode='42501';end if;
 perform tc_access_private.validate(cid,assignments_);
 insert into public.tc_user_access_versions(company_id,user_id,version) values(cid,uid,0) on conflict do nothing;
 select version into version_ from public.tc_user_access_versions where company_id=cid and user_id=uid for update;
 if version_ is distinct from expected_ then raise exception 'Access changed. Reload before saving.' using errcode='40001';end if;
 select u into before_ from jsonb_array_elements(tc_access_private.roster(cid)->'users') u where u->>'id'=uid::text;
 perform tc_access_private.assign(cid,uid,auth.uid(),assignments_);
 update public.tc_user_access_versions set version=version+1 where company_id=cid and user_id=uid;
 insert into public.tc_user_access_events(company_id,user_id,actor_id,before_data,after_data) values(cid,uid,auth.uid(),before_,jsonb_build_object('assignments',assignments_,'version',version_+1));
end $$;
create function tc_access_private.prepare_invite(cid uuid,email_ text,name_ text,role_ text,assignments_ jsonb) returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$declare result_ uuid;begin
 if not tc_access_private.admin(cid) then raise exception 'Company administrator access required' using errcode='42501';end if;
 perform tc_access_private.validate(cid,assignments_);
 if role_ not in ('pm','apm','accounting','superintendent','safety','qa_qc','employee','architect','engineer','owner','lender','subcontractor') or nullif(btrim(name_),'') is null or email_ is null or email_ !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or jsonb_array_length(assignments_)=0 then raise exception 'Name, email, role and at least one project are required' using errcode='22023';end if;
 insert into public.tc_invite_access_plans(company_id,email,name,role,assignments,prepared_by) values(cid,lower(btrim(email_)),btrim(name_),role_,assignments_,auth.uid()) returning id into result_;return result_;
end $$;
create function tc_access_private.provision_invite() returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$declare plan_ public.tc_invite_access_plans;begin
 if new.raw_user_meta_data->>'access_plan_id' is null then return new;end if;
 select * into plan_ from public.tc_invite_access_plans where id=(new.raw_user_meta_data->>'access_plan_id')::uuid and email=lower(new.email) and status='pending' and expires_at>now() for update;
 if not found or not exists(select 1 from public.company_users cu join public.profiles p on p.id=cu.user_id where cu.company_id=plan_.company_id and cu.user_id=plan_.prepared_by and cu.active and p.active and p.role::text in ('admin','executive')) then raise exception 'Invitation access plan is unavailable';end if;
 insert into public.profiles(id,email,display_name,role,active) values(new.id,new.email,plan_.name,plan_.role::public.app_role,true) on conflict(id) do update set display_name=excluded.display_name,role=excluded.role,active=true;
 if plan_.role not in ('owner','lender','architect','engineer','subcontractor') then insert into public.company_users(company_id,user_id,active) values(plan_.company_id,new.id,true) on conflict(company_id,user_id) do update set active=true;end if;
 perform tc_access_private.assign(plan_.company_id,new.id,plan_.prepared_by,plan_.assignments);
 insert into public.tc_user_access_events(company_id,user_id,actor_id,after_data) values(plan_.company_id,new.id,plan_.prepared_by,jsonb_build_object('invitePlan',plan_.id,'assignments',plan_.assignments));
 update public.tc_invite_access_plans set status='provisioned',user_id=new.id where id=plan_.id;return new;
end $$;
create trigger zz_tc_provision_invite_access after insert on auth.users for each row execute function tc_access_private.provision_invite();
revoke all on all functions in schema tc_access_private from public,anon,authenticated;
grant execute on function tc_access_private.has_permission(uuid,text,uuid),tc_access_private.roster(uuid),tc_access_private.save(uuid,uuid,integer,jsonb),tc_access_private.prepare_invite(uuid,text,text,text,jsonb) to authenticated;
create function public.tc_access_roster(p_company uuid) returns jsonb language sql security invoker set search_path=pg_catalog,public as $$select tc_access_private.roster(p_company)$$;
create function public.tc_access_save(p_company uuid,p_user uuid,p_expected integer,p_assignments jsonb) returns void language sql security invoker set search_path=pg_catalog,public as $$select tc_access_private.save(p_company,p_user,p_expected,p_assignments)$$;
create function public.tc_access_prepare_invite(p_company uuid,p_email text,p_name text,p_role text,p_assignments jsonb) returns uuid language sql security invoker set search_path=pg_catalog,public as $$select tc_access_private.prepare_invite(p_company,p_email,p_name,p_role,p_assignments)$$;
revoke all on function public.tc_access_roster(uuid),public.tc_access_save(uuid,uuid,integer,jsonb),public.tc_access_prepare_invite(uuid,text,text,text,jsonb) from public,anon;
grant execute on function public.tc_access_roster(uuid),public.tc_access_save(uuid,uuid,integer,jsonb),public.tc_access_prepare_invite(uuid,text,text,text,jsonb) to authenticated;
-- Return the complete scoped effective set, with an explicit protocol marker.
create or replace function public.tc_my_project_permissions(p_project uuid) returns table(permission text,enabled boolean) language plpgsql stable security definer set search_path=pg_catalog,public as $$declare f text;begin
 return query select '__scoped__'::text,true;
 foreach f in array tc_access_private.base('admin') loop return query select f,tc_access_private.has_permission(p_project,f);end loop;
end $$;
-- Direct project membership changes must go through validated, audited administration.
revoke insert,update,delete on public.project_members from authenticated;
-- Restrictive gates complement existing row-level ownership/role checks.
do $$declare r record;f text;begin
 for r in select distinct c.table_name from information_schema.columns c join pg_class pc on pc.relname=c.table_name join pg_namespace ns on ns.oid=pc.relnamespace and ns.nspname='public' where c.table_schema='public' and c.column_name='project_id' and pc.relkind='r' and pc.relrowsecurity loop
 f:=case
 when r.table_name in ('rfis','rfi_events','rfi_distribution') then 'rfi'
 when r.table_name like 'submittal%' then 'submittal'
 when r.table_name like 'drawing%' or r.table_name like 'markup%' then 'drawings'
 when r.table_name like 'schedule%' then 'schedule'
 when r.table_name like 'daily%' then 'daily'
 when r.table_name like 'meeting%' then 'meetings'
 when r.table_name like 'task%' then 'tasks'
 when r.table_name like 'safety%' then 'safety'
 when r.table_name like 'quality%' then 'quality'
 when r.table_name like 'pay_app%' or r.table_name like 'sub_pay_app%' then 'payapps'
 when r.table_name in ('project_budget_lines','tc_budget_line_events','ledger_transactions','vendor_invoices') then 'financial_project'
 when r.table_name in ('contracts','project_subcontracts','nois') then 'contracts'
 else null end;
 if f is not null then execute format('create policy tc_scoped_feature_gate on public.%I as restrictive for all to authenticated using(tc_access_private.has_permission(project_id,%L)) with check(tc_access_private.has_permission(project_id,%L))',r.table_name,f,f);end if;
 end loop;
end $$;
-- Guard the durable coordination and budget RPC implementations as well as table reads.
do $$declare d text;begin
 d:=pg_get_functiondef('tc_coord_private.can_read(uuid,text,uuid,uuid,uuid,uuid)'::regprocedure);
 d:=replace(d,'begin','begin'||E'\n if not tc_access_private.has_permission(p_project,case p_kind when ''rfi'' then ''rfi'' else ''submittal'' end) then return false;end if;');execute d;
 d:=pg_get_functiondef('tc_coord_private.can_create(uuid,text)'::regprocedure);
 d:=replace(d,$patch$select p_kind in$patch$,$patch$select tc_access_private.has_permission(p_project,case p_kind when 'rfi' then 'rfi' else 'submittal' end) and p_kind in$patch$);execute d;
end $$;
create or replace function tc_import_private.can_access(p_project uuid,p_kind text) returns boolean language sql stable security definer set search_path=pg_catalog,public as $$select p_kind in ('budget','contract') and tc_access_private.has_permission(p_project,case p_kind when 'budget' then 'financial_project' else 'contracts' end)$$;
