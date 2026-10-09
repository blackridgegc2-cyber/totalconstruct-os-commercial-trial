-- Review-only: project banking purpose mapping. Do not store raw routing/account numbers.
create table if not exists public.project_payment_accounts (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 project_id uuid not null references public.projects(id),
 purpose text not null check (purpose in ('deposits','disbursements','overhead','fee_profit')),
 provider text not null check (provider in ('stripe','quickbooks','other_verified_provider')),
 provider_account_reference text not null,
 bank_display_name text,
 bank_last_four text check (bank_last_four is null or bank_last_four ~ '^[0-9]{4}$'),
 verified_at timestamptz,
 verified_by uuid references auth.users(id),
 approved_at timestamptz,
 approved_by uuid references auth.users(id),
 active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(project_id,purpose)
);
create index if not exists project_payment_accounts_company_idx on public.project_payment_accounts(company_id,project_id);
alter table public.project_payment_accounts enable row level security;
-- No public policies. Only privileged, authorized server actions may read or mutate mappings.
-- Require independent authorization and audit for changing payout destination.
-- Payment links are generated server-side for approved invoices only; never embed bank details.
-- Reconcile incoming payments to payapp/invoice ID and outgoing payments to approved AP records.
-- Verify provider capabilities for separate project bank accounts before activation.
