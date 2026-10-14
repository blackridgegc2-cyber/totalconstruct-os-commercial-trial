# Academic Orchard — preconstruction operational release

## Release scope
Priority: Academic Orchard school preconstruction, approximately six weeks before construction mobilization. Preserve existing QuickBooks Online accounting operations; QuickBooks replacement is not a gate for this release.

## P0 workflows (must be tested end-to-end)
1. **Project onboarding:** project and company association, Blackridge administrator, Owner, architect, civil, MEP, lender (read-only until explicitly invited), and other consultants. Separate accounts and invitation acceptance. Prevent cross-project or cross-company access.
2. **Design coordination:** drawing/specification upload, discipline tagging, revision/superseded handling, transmittals, comment threads, assigned action items, due dates, email/in-app notifications, and complete activity history.
3. **Preconstruction log:** meeting minutes, decisions, RFIs, submittals, permit milestones, consultant deliverables, design status, responsible party, overdue escalation, and exports.
4. **Financial baseline:** distinguish preconstruction/design fees from estimated construction budget. Seed test fixture with architect/MEP $25,000, civil $38,700, and preconstruction fee $45,000; verify contract authorization and whether each item is billable before issuing an actual pay app.
5. **Pay applications:** G702/G703 schedule of values, prior Owner payments made before bank involvement, current period, retainage, change orders, supporting invoices, draft/edit/submit/delete controls, approval sequence, lender read-only/approval as configured, audit trail and downloadable output. Never count prior Owner payments twice.
6. **Signature security:** verify signer identity, consent, source document hash, final signed artifact, sequential GC → Owner → Lender route where applicable, and denial of access to unauthorized signers.

## Acceptance walkthrough
- Admin invites architect and civil engineer; each independently accepts invitation and sees only Academic Orchard permitted files.
- Architect publishes revision B, civil comments, PM responds, decision is logged, and prior revision remains available.
- PM issues RFI and submittal, consultant responds, notification arrives, and status changes are preserved.
- Controller drafts G702/G703 with preconstruction costs and prior payments, edits, exports, routes for signatures and lender review; verify line arithmetic against independent worksheet.
- Denied-role tests, mobile login, file persistence after refresh, notification delivery, and deployment rollback all pass.

## Release rule
Mark each workflow DONE only after authenticated browser execution with separate identities and persisted evidence. Until then label it IMPLEMENTED or UNVERIFIED. No production go-live based only on successful code commits.
