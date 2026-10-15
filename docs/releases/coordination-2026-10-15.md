# RFI and submittal coordination release — 2026-10-15

RFIs and submittals now use saved project-scoped workflows rather than the legacy direct-insert forms. The release supports named assignment, due dates, drawing/specification references, RFI responses, submittal dispositions, resubmission revision numbers, management close/reopen, action notes, audit history, and recipient-only in-app notifications on the home dashboard. Notifications refresh when opening the dashboard or using Refresh notifications. This release does not send email.

Server-side project locks allocate numbers from the maximum existing numeric suffix, including values above 999. Client request IDs make identical retries idempotent. Record versions reject conflicting edits. Active project/company membership and record visibility determine capabilities; project owners can read and comment but cannot create/manage without a scoped permission. Ordinary authenticated clients cannot directly alter records or audit rows. Assignees must be active authorized project members. Legacy records remain readable within the new policies; legacy subcontractor portal and attachment workflows have not been certified by this release.

Applied migrations: `20261015143106_coordination_workflow_release.sql` and `20261015143658_coordination_capability_validation.sql`.

Validation:
- 38 Node regression tests pass, including four new coordination client cases.
- 27 database acceptance checks pass using separate PM, architect, subcontractor, owner, lender, and other-company admin identities. Actual authenticated database role checks verify direct-write denial, record visibility, recipient notification isolation, and audit protection. All test users and records roll back.
- DOM emulation verifies escaped record/history text, capability-driven actions, versioned response payloads, and rejection of stale detail responses after a project switch. This is not full browser acceptance.
- JavaScript/inline syntax, static release, training isolation, modern module, and pay application reconciliation gates pass.

Full commercial release remains incomplete: production AI provider configuration is absent; bank/QuickBooks provider authorization and synchronization remain incomplete; signing/session work remains deferred; full authenticated multi-role browser acceptance is still outstanding. This release covers coordination and does not certify those integrations or every module.
