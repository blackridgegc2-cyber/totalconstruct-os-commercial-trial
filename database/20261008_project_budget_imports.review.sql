-- Tenant-isolated project budget; pending review until explicit approval.
create table if not exists public.project_budget_imports (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 project_id uuid not null references public.projects(id),
 source_filename text not null,
 source_sha256 text not null,
 row_count integer not null check(row_count>0),
 total_amount numeric(16,2) not null check(total_amount>=0),
 status text not null default 'review' check(status in ('review','approved','rejected')),
 created_by uuid not null references auth.users(id),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 unique(company_id,project_id,source_sha256)
);
create table if not exists public.project_budget_lines (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 project_id uuid not null references public.projects(id),
 import_id uuid not null references public.project_budget_imports(id),
 agreement_code text not null,
 csi_division text not null,
 cost_code text not null,
 description text not null,
 cost_type text not null check(cost_type in ('SUBCONTRACT','LABOR','MATERIAL','EQUIPMENT','GENERAL_CONDITIONS','OVERHEAD','FEE','ALLOWANCE','CONTINGENCY','OTHER_DIRECT')),
 quantity numeric(16,4) not null check(quantity>=0),
 unit text not null,
 unit_cost numeric(16,2) not null check(unit_cost>=0),
 budget_amount numeric(16,2) not null check(budget_amount>=0),
 vendor_or_trade text,
 phase text,
 notes text,
 created_at timestamptz not null default now(),
 unique(import_id,agreement_code,cost_code,cost_type)
);
create index if not exists project_budget_lines_project_idx on public.project_budget_lines(company_id,project_id);
alter table public.project_budget_imports enable row level security;
alter table public.project_budget_lines enable row level security;
create policy project_budget_imports_read on public.project_budget_imports for select to authenticated using (
 exists(select 1 from public.company_members cm where cm.company_id=project_budget_imports.company_id and cm.user_id=(select auth.uid()))
);
create policy project_budget_lines_read on public.project_budget_lines for select to authenticated using (
 exists(select 1 from public.company_members cm where cm.company_id=project_budget_lines.company_id and cm.user_id=(select auth.uid()))
);
-- Mutations intentionally reserved for server-verified import transaction; no browser write grants.
