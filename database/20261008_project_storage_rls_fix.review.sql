-- STAGING REVIEW ONLY. Existing project-documents storage policies reference
-- storage.foldername(p.name) where p is the projects row, NOT the storage object.
-- This prevents normal project-id/path authorization and likely causes 403.
-- Replace all four operations after confirming project membership and tenant rules.
drop policy if exists "company members can read project documents" on storage.objects;
drop policy if exists "company members can upload project documents" on storage.objects;
drop policy if exists "company members can update project documents" on storage.objects;
drop policy if exists "company members can delete project documents" on storage.objects;

-- Use a project UUID as first storage path segment: <project-uuid>/<document-uuid>/<filename>
-- Internal access is project-scoped; external roles must use separate, limited delivery flows.
create policy "tc project documents internal read" on storage.objects
 for select to authenticated using (
 bucket_id='project-documents'
 and exists (select 1 from public.projects p
   where p.id::text=(storage.foldername(name))[1]
   and public.can_access_internal_project(p.id))
);
create policy "tc project documents internal upload" on storage.objects
 for insert to authenticated with check (
 bucket_id='project-documents'
 and exists (select 1 from public.projects p
   where p.id::text=(storage.foldername(name))[1]
   and public.can_manage_project(p.id))
);
create policy "tc project documents internal update" on storage.objects
 for update to authenticated using (
 bucket_id='project-documents'
 and exists (select 1 from public.projects p
   where p.id::text=(storage.foldername(name))[1]
   and public.can_manage_project(p.id))
 ) with check (
 bucket_id='project-documents'
 and exists (select 1 from public.projects p
   where p.id::text=(storage.foldername(name))[1]
   and public.can_manage_project(p.id))
);
-- Deliberately no DELETE policy: immutable originals require retention/version controls.
-- Verify role fixtures and exact storage path before migration.
