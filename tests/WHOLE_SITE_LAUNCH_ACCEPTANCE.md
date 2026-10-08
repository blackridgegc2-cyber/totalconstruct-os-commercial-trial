# TotalConstruct OS — whole-site launch acceptance matrix

Status definitions: **NOT VERIFIED** means source code presence does not prove the workflow works in production. **BLOCKED** means known unsafe/incomplete behavior. **PASS** requires a reproducible staging run with evidence.

| Area | Test required | Current assessment |
|---|---|---|
| Authentication | Sign in/out, expired token, user invitation, role isolation | NOT VERIFIED |
| New project | Manual and AI-assisted entry, validation, real DB row, refresh, second-user visibility | BLOCKED pending persistent lifecycle verification |
| Project document intake | PDF, DOCX, XLSX, drawings; original binary saved, checksum, version, download | NOT VERIFIED; AI extraction supports limited formats |
| Upload recovery | Large file, timeout, invalid MIME, duplicate name, unauthorized user, interrupted upload | NOT VERIFIED |
| New document | Create, edit, issue, revision, audit, approved template and PDF output | NOT VERIFIED |
| Drawing sets | Multi-PDF upload, classification, versioning, markup persistence, authorized retrieval | NOT VERIFIED |
| Subcontractor setup | Create unique vendor profile, trade, tax/insurance, W-9, contract, user access | BLOCKED: trial prompt/local state |
| Vendor setup | New vendor, duplicates, contacts, trade, compliance, approvals, project association | BLOCKED: no verified full onboarding |
| Bidders | Add, qualification, scorecard, invitations, bid attachments, permissions | NOT VERIFIED |
| Pay apps | G702/G703, SOV totals, stored materials, retainage, prior period carry-forward | BLOCKED pending server-side transaction |
| Billing disputes | Create case, evidence, PM decision, billing hold, audit, cross-project RLS | BLOCKED pending staging migration |
| Owner/lender | Read-only scope, review, approval, selected sheets, signatures, audit trail | NOT VERIFIED |
| RFI/submittals | Create, assign, attach, status, deadline, notification, close | NOT VERIFIED |
| Schedule/procurement | New item, predecessor, material vendor, dates, progress, persistence | NOT VERIFIED |
| Reports | WIP/financial export correctness, access filters, totals | NOT VERIFIED |
| Audit and security | Project membership RLS, restricted files, mutation audit, privilege escalation | NOT VERIFIED |
| Responsive UX | Desktop/tablet/mobile, modal keyboard navigation, error recovery | NOT VERIFIED |

## Release blockers
1. Browser-local trial state must not be represented as production persistence.
2. All upload flows must prove successful object-storage write **and** metadata linkage.
3. New Project/Subcontractor/Vendor/Document must pass create-read-update/reload and second-user checks.
4. Financial finalization and approvals must execute as authenticated database transactions.
5. Staging migration, role-based negative tests, E2E browser tests, production smoke test, and rollback plan are required.
