create table if not exists public.equipment_assets (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null,
 asset_tag text not null,
 category text not null default 'tool',
 name text not null,
 manufacturer text,
 model text,
 serial_number text,
 condition text not null default 'new',
 status text not null default 'available',
 assigned_to uuid references auth.users(id) on delete set null,
 location text,
 purchase_date date,
 purchase_amount numeric(14,2),
 vendor_name text,
 receipt_id uuid,
 warranty_expiration date,
 service_interval_days integer,
 last_service_date date,
 next_service_date date,
 accounting_treatment text not null default 'pending_review',
 photo_storage_path text,
 serial_photo_storage_path text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(company_id,asset_tag),
 constraint equipment_amount_nonnegative check(purchase_amount is null or purchase_amount>=0),
 constraint equipment_treatment_check check(accounting_treatment in ('pending_review','expensed','capitalized','noncapital_tracked'))
);
create table if not exists public.expense_receipts (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null,
 uploaded_by uuid references auth.users(id) on delete set null,
 source_filename text not null,
 source_sha256 text not null,
 storage_path text not null,
 vendor_name text,
 receipt_date date,
 total_amount numeric(14,2),
 currency text not null default 'USD',
 review_status text not null default 'pending_review',
 quickbooks_entity_id text,
 extraction jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(company_id,source_sha256),
 constraint receipt_total_nonnegative check(total_amount is null or total_amount>=0),
 constraint receipt_review_check check(review_status in ('pending_review','approved','rejected','duplicate'))
);
alter table public.equipment_assets add constraint equipment_assets_receipt_fk foreign key(receipt_id) references public.expense_receipts(id) on delete set null;
create table if not exists public.equipment_asset_events (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 asset_id uuid not null references public.equipment_assets(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 event_type text not null,
 from_project_id uuid references public.projects(id) on delete set null,
 to_project_id uuid references public.projects(id) on delete set null,
 notes text,
 occurred_at timestamptz not null default now()
);
create table if not exists public.expense_receipt_lines (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id) on delete cascade,
 receipt_id uuid not null references public.expense_receipts(id) on delete cascade,
 project_id uuid references public.projects(id) on delete set null,
 description text not null,
 quantity numeric(14,3) not null default 1,
 amount numeric(14,2) not null default 0,
 cost_code text,
 cost_type text,
 asset_candidate boolean not null default false,
 asset_id uuid references public.equipment_assets(id) on delete set null,
 classification_status text not null default 'pending_review',
 created_at timestamptz not null default now()
);
create index if not exists equipment_assets_company_project_idx on public.equipment_assets(company_id,project_id);
create index if not exists receipts_company_date_idx on public.expense_receipts(company_id,receipt_date);
create index if not exists receipt_lines_receipt_idx on public.expense_receipt_lines(receipt_id);
create index if not exists asset_events_asset_idx on public.equipment_asset_events(asset_id,occurred_at);

alter table public.equipment_assets enable row level security;
alter table public.expense_receipts enable row level security;
alter table public.expense_receipt_lines enable row level security;
alter table public.equipment_asset_events enable row level security;
do $$
declare tab text;
begin
 foreach tab in array array['equipment_assets','expense_receipts','expense_receipt_lines','equipment_asset_events'] loop
  execute format('create policy %I on public.%I for select to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid())))',tab||'_read',tab,tab);
  execute format('create policy %I on public.%I for insert to authenticated with check (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and lower(cm.role) in (''owner'',''admin'',''executive'',''project_manager'',''superintendent'')))',tab||'_insert',tab,tab);
  execute format('create policy %I on public.%I for update to authenticated using (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and lower(cm.role) in (''owner'',''admin'',''executive'',''project_manager''))) with check (exists(select 1 from public.company_members cm where cm.company_id=%I.company_id and cm.user_id=(select auth.uid()) and lower(cm.role) in (''owner'',''admin'',''executive'',''project_manager'')))',tab||'_update',tab,tab,tab);
 end loop;
end $$;