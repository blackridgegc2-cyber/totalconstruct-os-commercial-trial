-- REVIEW ONLY — GC-approved category access templates for newly invited project users.
-- Must be deployed atomically with replacement of existing broad documents/storage RLS.
create table if not exists public.tc_document_role_defaults (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id) on delete cascade,
 role text not null check(role in ('architect','engineer','owner','lender','subcontractor','vendor','inspector','consultant','pm','apm','superintendent')),
 category text not null check(category in ('rfi','submittal','ae_plans','specifications','prime_contract','subcontracts','design_agreements','pay_app','change_orders','meeting_minutes','schedule','safety','quality','correspondence','closeout','warranty','other')),
 can_view boolean not null default false,
 can_upload boolean not null default false,
 can_edit boolean not null default false,
 updated_by uuid not null references auth.users(id),
 updated_at timestamptz not null default now(),
 unique(project_id,role,category),
 constraint tc_role_default_edit check (not can_edit or can_upload),
 constraint tc_role_default_upload check (not can_upload or can_view)
);
alter table public.tc_document_role_defaults enable row level security;
revoke all on public.tc_document_role_defaults from anon;
grant select,insert,update,delete on public.tc_document_role_defaults to authenticated;
create policy tc_role_defaults_gc_manage on public.tc_document_role_defaults
 for all to authenticated
 using(public.tc_is_gc_document_admin(project_id))
 with check(public.tc_is_gc_document_admin(project_id) and updated_by=auth.uid());
-- Existing tc_document_category_grants are explicit per-user snapshots, NOT
-- a live fallback to role defaults. On invitation acceptance, GC-authorized
-- server code copies the current role template into individual grants, with
-- granted_by set to the GC administrator who approved the invitation.
-- No matching template => no grants => zero document access.
-- Later template changes do NOT silently widen existing user permissions.
-- A GC may explicitly 'apply to existing users' after a preview and audit.
-- User-specific overrides take precedence because effective access is checked
-- solely against tc_document_category_grants.
-- Revoke user/project access by revoking grants and project membership.
-- CRITICAL: do not activate until old broad RLS policies are removed.
