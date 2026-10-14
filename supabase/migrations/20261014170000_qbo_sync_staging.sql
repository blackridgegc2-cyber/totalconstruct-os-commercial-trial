-- QBO staging is read-only relative to accounting journals. Never automatically post.
create table if not exists public.qbo_sync_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  realm_id text not null,
  entity_type text not null,
  provider_id text not null,
  source_updated_at timestamptz,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (company_id, realm_id, entity_type, provider_id)
);
create index if not exists qbo_sync_records_company_date_idx on public.qbo_sync_records(company_id, source_updated_at desc);
create table if not exists public.qbo_sync_checkpoints (
  company_id uuid not null,
  realm_id text not null,
  entity_type text not null,
  last_updated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (company_id, realm_id, entity_type)
);
alter table public.qbo_sync_records enable row level security;
alter table public.qbo_sync_checkpoints enable row level security;
-- No user-facing policies: server-side service role only; must validate
-- company finance authorization before any service-role writes.
revoke all on public.qbo_sync_records from anon, authenticated;
revoke all on public.qbo_sync_checkpoints from anon, authenticated;
comment on table public.qbo_sync_records is 'Read-only provider staging; not posted accounting records. OAuth credentials must never be stored here.';
