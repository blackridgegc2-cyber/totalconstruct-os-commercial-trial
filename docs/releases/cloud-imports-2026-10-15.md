# Cloud imports and project context — October 15, 2026

## Result
Budget imports and contract source/review metadata now persist in canonical project-scoped cloud tables. A second authorized client can reopen saved records. Approval is a server transaction with optimistic revision checks and an append-only audit history; ordinary browser clients cannot directly edit the tables or approval events.

- Budget approval checks every line and total, preserves explicit zero forecasts, updates the project forecast atomically, and supersedes the prior approved budget. A pending replacement records the budget revision it was reviewed against, so intervening forecast edits block stale replacement.
- Management edits to imported budget forecasts save through a separate checked transaction. The underlying uploaded source remains unchanged; historical values remain in audit snapshots.
- Contract fields apply only after cloud approval succeeds. Approved terms and original sources reopen in the Contracts screen. Existing original contract value is preserved when current contract terms change.
- Budget and contract source files require the same project/role permission as their private import records. Ordinary project source replacement and deletion are blocked through existing client policies to preserve uploaded originals. Other source reads/uploads remain available to active project members and scoped company management.
- Additional project grants stay within their permission and project. Revocation and inactive profiles are checked by the database on each operation. Privileged implementations live in a private schema; public RPC wrappers use invoker security.
- The live project loader now retains company IDs needed by accounting panels. An account with no authorized projects cannot fall back to a prior local project list.
- Message and project-event requests discard responses after project/login changes; stale forms cannot submit to the previously selected project.
- Import records from the previous session are removed on logout/session change. Canonical imports take precedence over matching browser-local import copies.

## Applied migrations
1. 20261015140049_canonical_project_imports.sql
2. 20261015140401_import_forecast_revisions.sql
3. 20261015140652_import_active_profile_boundary.sql
4. 20261015141257_import_api_invoker_wrappers.sql

These migrations were applied through the connected database migration service. The local Supabase CLI was unavailable. No user credentials or provider secrets were requested or retrieved.

## Verification
- 33 Node regression tests, pay-app reconciliation, static/module checks, and Training Center isolation pass.
- 19 database acceptance checks passed using independent temporary identities and actual authenticated-role RLS. These cover reopen, authorization, source visibility, scoped grants/revocation, inactive users, revision conflicts, approval idempotence, atomic zero forecasts, forecast edits, source immutability and audit evidence. All test users, companies, projects, imports and storage metadata rolled back.
- DOM-emulation QA passed: import observer settles; late message/event responses cannot replace the newly selected project's content; help input is escaped; labelled help-library fallback works. This is not a browser login acceptance result.
- Database advisor reported no findings for the new import objects and functions. Existing unrelated findings were not changed by this release.
- Existing active finance profiles were checked for missing company finance membership: zero mismatches.

## Remaining full-product dependencies
AI model calls still require provider configuration and actual-document acceptance. QuickBooks/bank provider authorization and complete sync reconciliation are not established by this patch. Full separate-user browser acceptance across every collaboration tool and the outstanding signature/approval/invoice workflow remain necessary. This release does not certify the entire application as complete.
