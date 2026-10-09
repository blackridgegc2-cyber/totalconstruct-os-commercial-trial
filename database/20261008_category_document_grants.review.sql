-- REVIEW ONLY: category-scoped access, default-deny for invited collaborators.
-- Staging rollout must remove all pre-existing broad documents/storage policies.
create table if not exists public.tc_document_category_grants (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 category text not null check (category in (
 'rfi','submittal','ae_plans','specifications','prime_contract',
 'subcontracts','design_agreements','pay_app','change_orders',
 'meeting_minutes','schedule','safety','quality','correspondence',
 'closeout','warranty','other')),
 can_view boolean not null default false,
 can_upload boolean not null default false,
 can_edit boolean not null default false,
 granted_by uuid not null references auth.users(id),
 granted_at timestamptz not null default now(),
 revoked_at timestamptz,
 unique(project_id,user_id,category),
 constraint tc_category_permissions_consistent check
 (not can_edit or can_upload),
 constraint tc_category_upload_requires_view check
 (not can_upload or can_view)
);
create index if not exists tc_category_grants_lookup
 on public.tc_document_category_grants(project_id,user_id,category);
alter table public.tc_document_category_grants enable row level security;
revoke all on public.tc_document_category_grants from anon;
grant select,insert,update,delete on public.tc_document_category_grants to authenticated;
create or replace function public.tc_is_gc_document_admin(p_project uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select public.is_management_user() or exists(
  select 1 from public.project_members m
  where m.project_id=p_project and m.user_id=auth.uid()
  and m.active and m.role in ('pm','apm','admin','executive')
 );
$$;
revoke all on function public.tc_is_gc_document_admin(uuid) from public,anon;
grant execute on function public.tc_is_gc_document_admin(uuid) to authenticated;
create or replace function public.tc_has_document_category(
 p_project uuid,p_category text,p_action text default 'view')
returns boolean language sql stable security definer set search_path=public as $$
 select public.tc_is_gc_document_admin(p_project) or (
 exists(select 1 from public.project_members m
 where m.project_id=p_project and m.user_id=auth.uid() and m.active)
 and exists(select 1 from public.tc_document_category_grants g
 where g.project_id=p_project and g.user_id=auth.uid()
 and g.category=p_category and g.revoked_at is null
 and case p_action
 when 'view' then g.can_view
 when 'upload' then g.can_upload
 when 'edit' then g.can_edit
 else false end)
 );
$$;
revoke all on function public.tc_has_document_category(uuid,text,text) from public,anon;
grant execute on function public.tc_has_document_category(uuid,text,text) to authenticated;
create policy tc_doc_grants_gc_manage on public.tc_document_category_grants
 for all to authenticated
 using (public.tc_is_gc_document_admin(project_id))
 with check (public.tc_is_gc_document_admin(project_id) and granted_by=auth.uid());
create policy tc_doc_grants_self_read on public.tc_document_category_grants
 for select to authenticated
 using (user_id=auth.uid() and public.tc_has_document_category(project_id,category,'view'));
-- Critical: remove prior broad document SELECT/WRITE policies before activating
-- category-scoped RLS. PostgreSQL permissive policies combine with OR.
-- Do not apply this draft alone to production.
-- Document category is authoritative only when linked to the same project.
-- Storage path format: <project_uuid>/<category>/<document_uuid>/<filename>.
