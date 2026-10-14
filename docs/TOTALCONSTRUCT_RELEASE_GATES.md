# TotalConstruct OS Commercial — Consolidated Requirements and Release Gates
Last reviewed: 2026-10-14. This is a reconciliation of prior requests, not a claim of completion. Only mark an item verified after authenticated role-scoped tests and evidence.

## Release policy
- **LAUNCH HOLD** until all critical gates pass. Vercel READY only confirms build/deployment, not financial correctness or access isolation.
- Do not invite Owner or Lender or submit Academic Orchard PA #1 until project-scoped invitations, dashboards, signatures, routing, attachments, audit and printable forms pass end-to-end.
- No production AI self-patching: incident → sanitized diagnostic → branch/PR → tests → staging → admin approval → production → rollback verification.
- No McCune Construction Service Group, LLC references/logos in owner/lender deliverables.
- Training projects must never appear in production financial/WIP totals.

## A. Project administration / permissions [NOT YET ACCEPTED]
- Company isolation, project-specific user membership, invitations and revocation.
- Role templates plus per-project overrides and individual checkbox permissions for RFIs, submittals, daily reports, schedules, photos, G702/G703, correspondence.
- Contractor, subcontractor, architect, engineer, owner, lender, accounting, admin separate dashboards and access.
- Architect and civil engineer must not see one another's contracts, invoices, drawings or correspondence unless specifically granted.
- Owner/lender access to approved records only; snapshot PDFs expire, revoke and audit, never expose live internal workbook tabs.
- Project intake, bid/award, contracts, GMP, precon, estimates, budgets, WIP, cost codes, change orders, POs, commitments, cost forecasting.
- Scheduling, milestones, daily logs, field photos, inspections, RFIs, submittals, drawing revisions, punch list, closeout, meetings, correspondence and document controls.

## B. Professional billing and subcontracts [PARTIAL, ACCEPTANCE OPEN]
- Architects and engineers submit their own standard professional invoices, NOT G702/G703; GC reviews, returns, rejects or approves.
- GC maps each design contract to an authorized G703 line; approved amounts transfer once and cannot be changed after certification.
- Subcontractors submit native G702/G703; GC Reject / Return for Correction / Approve / Add to GC Pay App, with auditable corrections.
- Approved sub amounts map to preassigned GC G703 SOV lines, accumulate without duplication and remain available for a later GC billing period.
- No automatic submission to Owner/Lender from subcontractor approval.
- Separate GC preconstruction/design section; Academic Orchard Architect/MEP $25,000, Civil $38,700, precon fee $45,000 outside preliminary construction estimate.
- No owner/lender visibility into internal design contracts, subcontractor source details or unauthorized tabs.

## C. GC owner/lender pay application [CRITICAL — NOT YET ACCEPTED]
- Native G702/G703 with 100+ SOV lines, continuation pages, original contract, changes, previous work, current work, stored materials, retainage, balance, current amount due, prior periods and no duplicate entry.
- Immutable printable G702/G703/PDF and authorized backup package with consistent amounts.
- Contractor signs in TotalConstruct; Owner receives notification and signs; Owner routes to Lender; Lender approves; approved invoice generated for payment.
- Signed documents retained with immutable snapshot, signer identity, timestamp, tamper-evident audit, explicit status transitions.
- Passwordless passkey/phone biometric with at least two fallback authentication options; desktop-to-phone signing must be tested.
- Initial Owner/Lender invitation includes secure account setup, subsequent routing uses their established account.
- Owner dashboard includes project progress photos and controlled project documents; lender sees only permitted records.
- Submission can include billing explanation; PDF prints full G702/G703, not partial spreadsheet.
- Academic Orchard PA1 discrepancies requiring reconciliation before sending: $785,814 vs $830,814 contract total; $38,700 civil change order status; spreadsheet CO #REF! errors; $24,300 request needs source reconciliation.

## D. Financial and operational integrations [PARTIAL / UNVERIFIED]
- Construction financial controls: no overbilling, negative totals, excessive retainage, missing/duplicate SOV, fractional cents, prior-period mismatch, locked certified rows.
- Cost control, subcontractor buyout, committed costs, actuals, budget revisions, change orders, cash flow, lien waivers, payment tracking, audit.
- RedTeam/Buildertrend and QuickBooks workflow where applicable; accounting export/sync must be reconciled and permissioned.
- Native project messaging, correspondence, invitations, alerts and attachments; delivery failure surfaced to admin.
- Workbook imports, estimates, PDF/document import and data provenance validated before financial use.

## E. Error tracking / AI-assisted patching [FOUNDATION DEPLOYED; HARDENING OPEN]
- Browser global errors, unhandled promise rejections, HTTP 500/network capture; add explicit render boundaries and route-level context.
- Backend structured 500/timeout/database errors into authenticated central incident store (not console-only).
- Strict sensitive-data minimization, rate limits, deduplication, retention, correlation ID, no secret leakage.
- Admin-only dashboard; server-side permissions; statuses New (Logged), AI Diagnosing, Patch Ready, Deploying, Resolved.
- Outbound signed webhook with allowlisted destination, retries, delivery audit and secrets configured.
- Sanitized ChatGPT Project Markdown export; PR + CI + staging + approval + rollback. No autonomous production rewrite.

## F. Acceptance and release [BLOCKING]
- Run full GitHub CI and financial regression tests; inspect historical failing workflows, not just Vercel READY.
- Verify signed-in GC, sub, architect, engineer, Owner, Lender and unauthorized cross-tenant accounts.
- Execute real Academic Orchard PA #1 scenario end-to-end using isolated test users and reconciled data.
- Validate PDF generation, storage, retention, permissions, signatures, routing, notifications, invoice creation, backup export and disaster recovery.
- Test browser, tablet and mobile; test desktop-to-phone biometric/passkey fallback.
- Security: RLS and service-role functions, role spoofing, IDOR, replay, duplicate transfers, CSRF/XSS, secret scanning, audit.
- No release declaration without recorded evidence, defect list, rollback path and explicit GC administrator signoff.

## Evidence ledger
- 2026-10-14: tc_error_incidents / tc_error_incident_events and Edge function deployed; dashboard and frontend capture deployed, but not authenticated end-to-end tested.
- 2026-10-14: professional billing, GC mapping, unified allocation ledger and frontend modules exist; direct G703 population and role tests not complete.
- 2026-10-14: confirmed company_users and tc_owner_payapp_records schema columns exist, including payapp status/locked_at.
- Prior GitHub financial CI failed on 2026-10-14; re-run and diagnose before launch.

## October 14 additional implementation
- Added bounded sessionStorage retry queue for sanitized browser incidents (same-tab persistence only; not durable offline infrastructure).
- Database trigger rejects design invoices exceeding contract value when submitted or approved; verified trigger exists. This does not replace change-order or invoice approval testing.
- Blackridge-only private rollout; existing GoDaddy-managed domain can host a subdomain without moving website/email; independent backup and deployment required before reliance for daily operations.
