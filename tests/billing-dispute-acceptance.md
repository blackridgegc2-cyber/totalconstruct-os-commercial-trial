# TotalConstruct billing dispute migration acceptance tests

The consolidated SQL file is a **review candidate**, not a deployed migration. Earlier draft SQL files are superseded. Run these tests against an isolated staging database and use separate test identities.

1. Apply `database/20261008_billing_dispute_consolidated.review.sql` and verify `billing_dispute_flags` has RLS enabled.
2. As unauthenticated user, verify SELECT/INSERT/UPDATE denied.
3. As an authorized PM on project A, create an unresolved flag. Confirm PM can read it and cannot change original evidence or project.
4. As a user assigned only to project B, verify project A flag cannot be read or changed.
5. As Owner, Lender, Architect and subcontractor, verify confidential flag cannot be read or changed.
6. With unresolved project A flag, attempt to insert a submitted pay app and update draft -> submitted: both must fail.
7. Verify unrelated project B can submit normally.
8. Verify PM cannot clear flag without actor identity, decision rationale and documented contract basis.
9. Verify approved PM clearance allows project A submission and audit history is captured.
10. Verify a user without permission to view the flag cannot bypass the database trigger by changing pay app status.
11. Verify actual app's status values, trigger ownership, and grants; prohibit direct bypass through privileged API service keys.
12. Validate G702/G703 prior-period carry-forward, retainage, stored materials, and the Owner/Lender approval path with real fixture records.

**Open design issues before production**: precise SOV line association, event/decision audit table, project-scoped membership for management roles, role-controlled submission RPC, and end-to-end document generation. No live financial submissions until all gates pass.
