-- Retain native construction sources as private originals. No public access,
-- overwrite policy, storage allowance or per-file capacity is changed.
update storage.buckets set allowed_mime_types=case when allowed_mime_types is null then null else array(select distinct unnest(allowed_mime_types||array['application/octet-stream','application/zip','application/x-zip-compressed','application/acad','application/x-autocad','application/x-dwg','image/vnd.dwg','application/dxf','application/x-dxf','image/vnd.dxf','image/tiff'])) end where id='project-documents';
