-- Reviewed migration: immutable document versions and atomic active version pointer.
-- Requires separate secure upload endpoint and role/document-category authorization before deployment.
create table if not exists public.project_document_records (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 project_id uuid not null references public.projects(id),
 document_type text not null,
 document_title text not null,
 current_version_id uuid,
 created_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.project_document_versions (
 id uuid primary key default gen_random_uuid(),
 record_id uuid not null references public.project_document_records(id),
 company_id uuid not null references public.companies(id),
 project_id uuid not null references public.projects(id),
 version_number integer not null check(version_number>0),
 storage_path text not null,
 sha256 text not null,
 filename text not null,
 mime_type text,
 change_reason text,
 supersedes_version_id uuid references public.project_document_versions(id),
 uploaded_by uuid references auth.users(id),
 uploaded_at timestamptz not null default now(),
 unique(record_id,version_number),
 unique(record_id,sha256)
);
alter table public.project_document_records add constraint project_document_current_version_fk
 foreign key(current_version_id) references public.project_document_versions(id) deferrable initially deferred;
create index if not exists document_versions_record_idx on public.project_document_versions(record_id,version_number desc);
alter table public.project_document_records enable row level security;
alter table public.project_document_versions enable row level security;
-- No direct browser grants: use a server-side authenticated transaction that verifies company,
-- project and document-category permissions and atomically changes current_version_id.
-- Never mutate existing version blobs, never delete historical versions on replacement.
-- Never update financial amounts when changing current_version_id.
