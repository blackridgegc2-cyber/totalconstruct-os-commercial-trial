# Production cloud contract — TotalConstruct

These contracts are **not** proof of a connected backend. They specify the acceptance boundary between the trial UI and authenticated Supabase services.

## createProject(payload, files)
- Verify current user through Supabase Auth; check tenant membership and permission to create projects.
- Insert one row in `public.projects`, returning its database UUID and tenant/company ID.
- Upload every selected original file to a private project-scoped storage path. Record `public.documents` rows with category, source filename, uploader, path and checksum.
- Return `{id, uploadedFiles:[...]}` only after verifying all uploads and document metadata. On partial failure, return an explicit recoverable state, not a success message.
- Never use localStorage snapshots as the authoritative project source.

## createPartner(payload) / getPartner(id)
- Verify the user is authorized for the company. Normalize company name, contact details and partner type.
- Use existing `public.subcontractors`, `public.companies` and `public.project_companies` appropriately; do not invent a duplicate vendor identity model.
- Return UUID and perform a scoped read-after-write. Do not expose W-9, EIN, bank routing or other sensitive onboarding documents to browser snapshots.
- Support deduplication, inactive status, compliance state and per-project association.

## File acceptance
- Signed-in upload and download; wrong-project denial; storage object and documents-row match.
- PDF, DOCX, XLSX, images, and drawing sets; large-file and retry behavior; revision and superseded version controls.
- Prevent arbitrary storage paths and MIME spoofing; enforce size limits and checksum; no public bucket.

## Current limitation
`tcCloud.createProject`, `tcCloud.createPartner`, and `tcCloud.getPartner` must be implemented and tested against the actual authenticated environment. No production readiness assertion until browser E2E tests prove these contracts.
