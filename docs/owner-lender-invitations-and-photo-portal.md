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
