-- Project-scoped append-only audit ledger. Review before deployment.
create table if not exists public.project_audit_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 project_id uuid not null references public.projects(id),
 actor_user_id uuid references auth.users(id),
 actor_type text not null check(actor_type in ('user','ai','system','integration')),
 action text not null,
 entity_type text not null,
 entity_id text not null,
 document_record_id uuid references public.project_document_records(id),
 document_version_id uuid references public.project_document_versions(id),
 occurred_at timestamptz not null default now(),
 before_state jsonb,
 after_state jsonb,
 metadata jsonb not null default '{}'::jsonb,
 request_id text,
 ip_address inet,
 user_agent text
);
create index if not exists project_audit_events_project_date_idx on public.project_audit_events(company_id,project_id,occurred_at desc);
create index if not exists project_audit_events_entity_idx on public.project_audit_events(company_id,entity_type,entity_id);
alter table public.project_audit_events enable row level security;
create policy project_audit_events_company_read on public.project_audit_events
 for select to authenticated using (
 exists(select 1 from public.company_members cm where cm.company_id=project_audit_events.company_id
 and cm.user_id=(select auth.uid()) and lower(cm.role) in ('owner','admin','executive'))
);
-- No authenticated INSERT, UPDATE, or DELETE policies. Only audited server-side service roles
-- may append after authorization, in the same transaction as the action.
-- Sensitive before/after values must be redacted or access-controlled at report time.
-- For stronger tamper evidence, add chained event hashes and immutable storage exports.
