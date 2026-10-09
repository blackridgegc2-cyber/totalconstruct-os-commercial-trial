-- Review-only project photo catalog and auditable attachment links.
-- Apply after project_audit_events migration; private object storage required.
create table if not exists public.project_photos (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references public.companies(id),
 project_id uuid not null references public.projects(id),
 uploaded_by uuid references auth.users(id),
 storage_path text not null,
 original_filename text not null,
 sha256 text not null,
 taken_at timestamptz,
 taken_at_source text not null default 'unknown' check(taken_at_source in ('exif','user','unknown')),
 uploaded_at timestamptz not null default now(),
 caption text,
 location_label text,
 gps_lat numeric(10,7),
 gps_lon numeric(10,7),
 mime_type text,
 image_width integer,
 image_height integer,
 linked_entity_type text,
 linked_entity_id text,
 ai_tags jsonb not null default '[]'::jsonb,
 ai_tags_reviewed boolean not null default false,
 archived_at timestamptz,
 constraint project_photo_unique_upload unique(company_id,project_id,sha256)
);
create index if not exists project_photos_taken_idx on public.project_photos(company_id,project_id,taken_at);
create index if not exists project_photos_uploaded_idx on public.project_photos(company_id,project_id,uploaded_at);
create index if not exists project_photos_entity_idx on public.project_photos(company_id,linked_entity_type,linked_entity_id);
alter table public.project_photos enable row level security;
-- Deny by default pending per-project membership and photo-category access policies.
-- Photos and GPS metadata must not be publicly accessible.
-- Upload and replacement events must be written to project_audit_events atomically.
