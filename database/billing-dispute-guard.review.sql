-- TotalConstruct: project-scoped billing dispute review records.
-- Apply only after staging review. Existing pay_apps and project_members are reused.
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
   check(status in ('pm-confirmation-required','billing-hold','cleared-for-billing')),
 decision_reason text,
 contract_basis text,
 decided_by uuid references auth.users(id),
 decided_at timestamptz,
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 constraint billing_flag_clearance check (
   status = 'pm-confirmation-required' or
   (decided_by is not null and decided_at is not null and
    nullif(btrim(decision_reason),'') is not null and
    nullif(btrim(contract_basis),'') is not null)
 )
);
create index if not exists billing_dispute_flags_project_status_idx
 on public.billing_dispute_flags(project_id,status);
alter table public.billing_dispute_flags enable row level security;
-- Only internal authorized staff can see disputes; external Owner/Lender/Sub roles excluded.
create policy billing_flags_read_internal on public.billing_dispute_flags for select
 to authenticated using (exists (
  select 1 from public.project_members m where m.project_id=billing_dispute_flags.project_id
  and m.user_id=(select auth.uid()) and m.active
  and m.role in ('executive','admin','accounting','pm','apm')
 ));
create policy billing_flags_insert_internal on public.billing_dispute_flags for insert
 to authenticated with check (
  created_by=(select auth.uid()) and status='pm-confirmation-required'
  and exists(select 1 from public.project_members m
   where m.project_id=billing_dispute_flags.project_id
   and m.user_id=(select auth.uid()) and m.active
   and m.role in ('executive','admin','pm'))
 );
create policy billing_flags_update_pm on public.billing_dispute_flags for update
 to authenticated using (
  exists(select 1 from public.project_members m
   where m.project_id=billing_dispute_flags.project_id
   and m.user_id=(select auth.uid()) and m.active
   and m.role in ('executive','admin','pm'))
 ) with check (
  decided_by=(select auth.uid())
  and exists(select 1 from public.project_members m
   where m.project_id=billing_dispute_flags.project_id
   and m.user_id=(select auth.uid()) and m.active
   and m.role in ('executive','admin','pm'))
 );
-- Defense-in-depth: fail closed on submission/approval if ANY unresolved flag
-- affects the project. Conservative until precise SOV-to-subcontract mappings exist.
create or replace function public.tc_pay_app_dispute_guard()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.status is distinct from old.status
   and lower(new.status) not in ('draft','pending','returned')
   and exists(select 1 from public.billing_dispute_flags f
      where f.project_id=new.project_id
      and f.status in ('pm-confirmation-required','billing-hold')) then
  raise exception 'Pay application submission blocked: unresolved dispute billing review';
 end if;
 return new;
end $$;
drop trigger if exists tc_pay_app_dispute_guard_trg on public.pay_apps;
create trigger tc_pay_app_dispute_guard_trg before update of status
 on public.pay_apps for each row execute function public.tc_pay_app_dispute_guard();
