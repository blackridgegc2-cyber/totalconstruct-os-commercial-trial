-- Consolidated deployment candidate; review/test on staging before application.
-- Source of truth for billing dispute authorization; supersedes earlier *.review.sql drafts.
create table if not exists public.billing_dispute_flags (
 id uuid primary key default gen_random_uuid(),
 project_id uuid not null references public.projects(id),
 subcontractor_id uuid,
 case_reference text not null,
 source_document_id uuid,
 sov_line_id uuid references public.pay_app_lines(id),
 csi_code text,
 reason text not null,
 status text not null default 'pm-confirmation-required'
  check (status in ('pm-confirmation-required','billing-hold','cleared-for-billing')),
 decision_reason text,
 contract_basis text,
 decided_by uuid references auth.users(id),
 decided_at timestamptz,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 constraint billing_dispute_decision_documented check (
  status='pm-confirmation-required' or
  (decided_by is not null and decided_at is not null
   and nullif(btrim(decision_reason),'') is not null
   and nullif(btrim(contract_basis),'') is not null)
 )
);
create index if not exists billing_dispute_project_status
 on public.billing_dispute_flags(project_id,status);
alter table public.billing_dispute_flags enable row level security;
revoke all on public.billing_dispute_flags from anon;
grant select,insert,update on public.billing_dispute_flags to authenticated;
drop policy if exists billing_dispute_read on public.billing_dispute_flags;
create policy billing_dispute_read on public.billing_dispute_flags for select to authenticated
 using (public.can_access_financials(project_id));
drop policy if exists billing_dispute_insert on public.billing_dispute_flags;
create policy billing_dispute_insert on public.billing_dispute_flags for insert to authenticated
 with check (public.can_manage_project(project_id) and created_by=auth.uid()
 and status='pm-confirmation-required' and decided_by is null and decided_at is null);
drop policy if exists billing_dispute_update on public.billing_dispute_flags;
create policy billing_dispute_update on public.billing_dispute_flags for update to authenticated
 using (public.can_manage_project(project_id))
 with check (public.can_manage_project(project_id) and decided_by=auth.uid());
create or replace function public.tc_billing_dispute_immutable()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.project_id is distinct from old.project_id
 or new.subcontractor_id is distinct from old.subcontractor_id
 or new.case_reference is distinct from old.case_reference
 or new.source_document_id is distinct from old.source_document_id
 or new.sov_line_id is distinct from old.sov_line_id
 or new.csi_code is distinct from old.csi_code
 or new.reason is distinct from old.reason
 or new.created_by is distinct from old.created_by
 or new.created_at is distinct from old.created_at then
  raise exception 'Original dispute identity and evidence are immutable';
 end if;
 if new.status is distinct from old.status and (
  new.decided_by is distinct from auth.uid() or
  nullif(btrim(coalesce(new.decision_reason,'')),'') is null or
  nullif(btrim(coalesce(new.contract_basis,'')),'') is null) then
  raise exception 'Documented authorized PM decision required';
 end if;
 return new;
end $$;
drop trigger if exists tc_billing_dispute_immutable_trg on public.billing_dispute_flags;
create trigger tc_billing_dispute_immutable_trg before update on public.billing_dispute_flags
 for each row execute function public.tc_billing_dispute_immutable();
create or replace function public.tc_pay_app_dispute_guard()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public as $$
begin
 if lower(coalesce(new.status,'')) not in ('draft','pending','returned')
 and (tg_op='INSERT' or new.status is distinct from old.status)
 and exists(select 1 from public.billing_dispute_flags f
  where f.project_id=new.project_id
  and f.status in ('pm-confirmation-required','billing-hold')) then
  raise exception 'Pay app submission blocked: unresolved billing dispute';
 end if;
 return new;
end $$;
revoke all on function public.tc_pay_app_dispute_guard() from public,anon,authenticated;
drop trigger if exists tc_pay_app_dispute_guard_trg on public.pay_apps;
create trigger tc_pay_app_dispute_guard_trg
 before insert or update of status on public.pay_apps
 for each row execute function public.tc_pay_app_dispute_guard();
