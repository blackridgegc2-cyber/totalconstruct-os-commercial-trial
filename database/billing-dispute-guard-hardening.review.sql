-- Additional hardening for billing_dispute_flags and pay_app state transitions.
-- Apply after billing-dispute-guard.review.sql in staging.
create or replace function public.tc_billing_flag_immutable_fields()
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
  raise exception 'Dispute identity and original evidence cannot be overwritten';
 end if;
 if new.status is distinct from old.status and
    (new.decided_by is distinct from auth.uid() or
     nullif(btrim(coalesce(new.decision_reason,'')),'') is null or
     nullif(btrim(coalesce(new.contract_basis,'')),'') is null) then
  raise exception 'Documented authorized PM decision required';
 end if;
 return new;
end $$;
drop trigger if exists tc_billing_flag_immutable_trg on public.billing_dispute_flags;
create trigger tc_billing_flag_immutable_trg before update
 on public.billing_dispute_flags for each row
 execute function public.tc_billing_flag_immutable_fields();

-- Guard must cover direct INSERT into non-draft status, not just UPDATE.
create or replace function public.tc_pay_app_dispute_guard()
returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if lower(coalesce(new.status,'')) not in ('draft','pending','returned')
   and (tg_op='INSERT' or new.status is distinct from old.status)
   and exists(select 1 from public.billing_dispute_flags f
     where f.project_id=new.project_id
       and f.status in ('pm-confirmation-required','billing-hold')) then
  raise exception 'Pay application submission blocked: unresolved dispute billing review';
 end if;
 return new;
end $$;
drop trigger if exists tc_pay_app_dispute_guard_trg on public.pay_apps;
create trigger tc_pay_app_dispute_guard_trg before insert or update of status
 on public.pay_apps for each row execute function public.tc_pay_app_dispute_guard();
