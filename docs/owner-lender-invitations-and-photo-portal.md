# Pay application distribution: owner/lender portal invitations and progress photos
Status: implementation contract; NOT a live invitation or payment service.

## Distribution
- Invite a recipient only if they do not already have an active authenticated account with the required project access. An existing account without access to this project needs an authorized project grant (with notification), not another account registration. Recipient addresses and role grants must be approved by project financial administrator.
- For subsequent pay applications, send a normal project-scoped notification with a View Pay Application deep link; authenticate on arrival, then enforce tenant/project/role permissions server-side. Never resend onboarding invitations to active members.
- A single identity can have memberships across multiple projects and organizations, with project-scoped access determined independently for each.
- Invitation tokens: random single-use, hashed at rest, short expiry, tied to tenant/project/email/role. Require authentication and email verification before accepting; prevent role escalation and cross-project access. Resend/revoke supported.
- Owner: project status, owner-approved pay apps, owner decisions, published project photos; lender: approved lender-facing draw packages, compliance and funding status. Neither sees subcontractor agreements, confidential costs, overhead or fee/profit.
- Record invitation created, sent, accepted, expired/revoked, project access granted/revoked; pay-app delivery/open/approval/payment events in immutable project audit. Email delivery and provider confirmations must be verified before showing Sent/Paid.
- Pay-app submission must not depend on invitation acceptance; recipients may review through an authenticated one-time invite flow.

## Owner project progress photos
- GC staff upload original photos to private project storage, record EXIF capture timestamp separately from upload timestamp, SHA-256 duplicate protection, uploader and source.
- Default private. Only authorized staff can explicitly publish/unpublish individual images or approved albums to owner. Do not publish GPS, internal notes, confidential documents, or unreviewed AI tags.
- Owner gallery: chronological timeline, week/date and area filters, captions, full-resolution authorized view, optional weekly digest, before/after comparison.
- Enforce project membership and photo publication at API and signed-URL generation layers; never trust a client-side role preview as authorization.
- Audit each upload, caption edit, publication, unpublication and download where appropriate.
- No actual email invitations, live gallery, cloud upload or financial sending exists until backend, RLS, mail delivery, and tests are deployed.

## Owner-first pay application approval and full-format printing
- Once a recipient has an active account, notify them using authenticated portal deep links; do not send repeat registration invitations.
- Required status transitions: GC draft -> GC submitted to owner -> owner approved OR owner returned for correction -> owner forwarded to lender -> lender approved OR lender returned for correction -> funded/partially funded -> reconciled. Owner forwarding must be a separate explicit authorized action; GC submission must not silently submit to lender.
- Track who approved/returned/forwarded, timestamp, reason, exact immutable pay-app version and delivery status. A correction after submission creates a new version and resets approvals that no longer apply. Prevent duplicate submissions with idempotency keys.
- Owner portal actions: view/download/print full package, approve, return with comments, and after approval submit to lender. Lender portal actions: view/download/print, approve or return with comments, record funding status. GC portal sees status and feedback without being able to impersonate approvals.
- Full-print output must include complete G702 summary and every G703 continuation-sheet line, including scheduled value, prior work, this period, stored materials, total completed, percent, balance and retainage, with page numbering and legible continuation pages. Include signed approvals and attachments according to approved distribution package. Preserve source workbook and produce a server-generated PDF of the frozen approved version; browser print of the dashboard is insufficient.
- Use an appropriately licensed AIA form/template if producing an actual branded AIA G702/G703, or a clearly labeled equivalent form. Verify lender-specific signing and notarization requirements before sending.
- Owner approval is not lender approval; lender approval is not confirmation that ACH funds settled. Payment status must be reconciled from verified processor/bank data, never inferred from a click.
- Implement role- and project-scoped server authorization, invitation and notification delivery, PDF generation, immutable audit, and end-to-end tests before enabling Send.
