-- Required staging amendment: prevent RLS invisibility from bypassing the
-- pay-app dispute trigger for external actors with pay_apps update access.
-- Trigger must inspect all project flags regardless of submitter's read rights.
create or replace function public.tc_pay_app_dispute_guard()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
begin
 if lower(coalesce(new.status,'')) not in ('draft','pending','returned')
   and (tg_op='INSERT' or new.status is distinct from old.status)
   and exists (
    select 1 from public.billing_dispute_flags f
    where f.project_id=new.project_id
      and f.status in ('pm-confirmation-required','billing-hold')
   ) then
  raise exception 'Pay application submission blocked: unresolved dispute billing review';
 end if;
 return new;
end $$;
revoke all on function public.tc_pay_app_dispute_guard() from public, anon, authenticated;
-- This is a narrowly scoped, no-argument trigger function, not an exposed RPC.
-- Requires migration owner to have read privileges on billing_dispute_flags.
