# Scan, help and accounting release — October 15, 2026

## Implemented fixes
- Contract scans use authenticated AI intake instead of labelling pattern matching as AI. Original PDF/Word inputs support scanned documents; spreadsheet AI intake includes all worksheets and row references.
- Text extractions require a source filename and quotation that matches the submitted text. Binary-file quotations still require human verification against the document. Unsupported values are withheld.
- Contract terms require explicit field-by-field approval, including previously blank fields. Store Only performs no scan; scan failure retains the source and applies no project terms.
- Budget CSV/XLS/XLSX uploads accept normal filenames. CSV BOM, CRLF, escaped quotes and multiline fields work. Financial parsing rejects invalid amounts, preserves negative credits and explicit zero forecasts, and excludes uncoded summary rows. Multi-sheet working-budget imports ask which sheet to use.
- Budget previews show source rows and individual lines. Applied lines populate the Cost Controls screen's actual field names. A rejected cloud forecast update leaves the local working budget unchanged.
- Document-import observation pauses while its own UI renders, preventing self-triggered render loops. Module loads and document-library loads can retry after failure.
- Ask AI calls an authenticated product-help endpoint; unavailable AI is identified explicitly and falls back to a labelled help library. Responses render as text. This assistant does not query live project records or automatically repair software.
- Journal entry validates decimal input without rejecting valid cents due to binary floating-point precision.

## Verification
- Automated tests cover AI authentication/configuration/error paths, source validation, read-only help context, explicit approval, project-scope checks, financial parsing, failed budget writes, canonical visible cost fields, Store Only, failed scans, permission scope, native PDFs and error handling.
- All existing static, module and Training Center isolation gates are required.
- Database accounting fixture passed ten checks: unauthorized creation blocked; unbalanced journals rejected; balanced $0.29 journal created; creator self-approval blocked; posting before approval blocked; separate approval accepted; approver self-posting blocked; posting accepted for a separate identity; posted header and posted lines immutable. All fixture users/company/accounts/journals were rolled back. This is database role simulation, not browser login acceptance.
- Production accounting tables checked have RLS enabled. Existing posted journals and reconciled statements were both zero before QA; zero exceptions does not establish accounting workflow use.

## Remaining release blockers
- Deployment configuration inspection found no OPENAI_API_KEY. AI scan and AI Help cannot produce model responses until the service is configured and tested with actual documents. Existing Supabase keys alone do not configure AI.
- Automatic bank/QuickBooks synchronization has not been verified. Keep the existing QuickBooks process until provider authorization and sync reconciliation pass.
- Separate-identity browser acceptance remains incomplete, including refresh/reopen persistence and all role-specific collaboration workflows. Local browser validation could not run because a Chromium executable was unavailable and the download failed.
- Budget working-line and contract review persistence across devices remains unverified. A successful project forecast PATCH alone does not establish complete working-line persistence.
- Full signature/approval and authorized-invoice acceptance remains outstanding; the user's deferred signature issue was not included in this patch.

This release improves the existing application. It does not certify the full product as complete.
