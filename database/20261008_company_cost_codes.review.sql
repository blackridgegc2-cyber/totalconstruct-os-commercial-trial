-- Review migration: tenant-specific cost code catalog; no changes to legacy global CSI reference data.
create table if not exists public.company_cost_codes (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 code text not null,
 division_no text,
 division_name text,
 description text not null,
 trade_name text,
 quickbooks_account_ref text,
 quickbooks_item_ref text,
 active boolean not null default true,
 sort_order integer not null default 0,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint company_cost_code_nonblank check (length(trim(code))>0 and length(trim(description))>0),
 constraint company_cost_code_unique unique (company_id,code)
);
create index if not exists company_cost_codes_company_idx on public.company_cost_codes(company_id,active,sort_order);
alter table public.company_cost_codes enable row level security;
drop policy if exists company_cost_codes_select on public.company_cost_codes;
create policy company_cost_codes_select on public.company_cost_codes for select to authenticated using (
 exists(select 1 from public.company_members cm where cm.company_id=company_cost_codes.company_id and cm.user_id=(select auth.uid()))
);
drop policy if exists company_cost_codes_manage on public.company_cost_codes;
create policy company_cost_codes_manage on public.company_cost_codes for all to authenticated using (
 exists(select 1 from public.company_members cm where cm.company_id=company_cost_codes.company_id and cm.user_id=(select auth.uid()) and lower(cm.role) in ('owner','admin','executive'))
) with check (
 exists(select 1 from public.company_members cm where cm.company_id=company_cost_codes.company_id and cm.user_id=(select auth.uid()) and lower(cm.role) in ('owner','admin','executive'))
);
