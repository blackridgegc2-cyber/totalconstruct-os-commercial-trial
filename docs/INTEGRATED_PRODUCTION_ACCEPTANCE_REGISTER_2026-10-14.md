# TotalConstruct Integrated Production Acceptance Register
Updated: 2026-10-14. Release decision: **HOLD**.

## Evidence baseline
- Vercel deployment READY at commit d56e662e138262ed54362e813d54957f2d3c83f2 (hosting only; not user acceptance).
- Supabase production counts: 3 owner pay apps, 1 native signature envelope, 0 signature events, 0 accounting journal batches, 0 bank statements, 0 charges.
- These are observed counts, not test results. No simulated production transactions should be created without explicit approval.

## Release work packages (group fixes across frontend, RLS/RPC, integrations, tests)
| Gate | Acceptance scenario | Required proof | Current |
|---|---|---|---|
| SEC-01 | Owner accesses assigned project, cannot read other projects, finance-only fields, internal messages, or documents | Two real test identities; API denial tests; browser screenshots | NOT TESTED |
| SEC-02 | Lender only sees assigned pay app, approved project documents, and permitted communications | API denial + UI route tests | NOT TESTED |
| SEC-03 | Architect/engineer can respond to assigned RFI/submittal but cannot approve pay apps or see internal costs | Cross-project and direct-URL tests | NOT TESTED |
| SEC-04 | Temporary elevated grant expires/revokes without altering base role; no cached privilege survives logout | DB grant expiry + session tests | NOT TESTED |
| PM-01 | RFI create/assign/notify/respond/close and preserve attachments | Two-role roundtrip | NOT TESTED |
| PM-02 | Submittal submit/review/revise/approve with correct audit and document access | Multi-role roundtrip | NOT TESTED |
| PM-03 | Daily log save/photos/visibility and message collaboration | Multi-role roundtrip | NOT TESTED |
| PAY-01 | Native G702/G703 math matches approved SOV and prior billings | Known-source Excel/PDF comparison | NOT TESTED |
| PAY-02 | GC sign, Owner sign, Lender approve, generate invoice, store immutable signed artifact | Three identities, phone/desktop, signature evidence, AR record | BLOCKED: 0 signature events |
| PAY-03 | Orchard design/precon lines appear only on correct project and permitted views | Source contract and project role checks | NOT TESTED |
| FIN-01 | Imported charge classified to project+CSI, approved, journaled, posted; GL balances | Sample bank/credit statement and double-entry reconciliation | BLOCKED: 0 charge/journal rows |
| FIN-02 | Statement CSV import, charge matching, close, immutable source, export | Known statement opening/closing balances | BLOCKED: 0 statements |
| FIN-03 | Controller P&L/BS/WIP/job-cost tie to posted journals, pay apps and commitments | Independent CPA-style reconciliation | NOT TESTED |
| OPS-01 | Errors surfaced, triaged, fixed, redeployed, verified and closed with human approval | Recorded incident-to-resolution trace | NOT TESTED |
| OPS-02 | Backup restore, secrets, rollback, release audit, monitoring | Restore drill and deployment rollback | NOT TESTED |

## Rules for release
1. No feature is labeled DONE until browser and backend tests are recorded against the same deployed commit.
2. No production invitation until SEC-01 to SEC-04 pass.
3. No production pay app until PAY-01 to PAY-03 pass.
4. No live accounting posting until FIN-01 to FIN-03 pass.
5. A READY deployment is not evidence of functional acceptance.
6. Record failure, owner, fix commit, test evidence, and retest result for each gate.

## Next grouped release
- Security and collaboration: tenant/project role negative tests; RFI, submittal, daily log multi-role workflows.
- Native pay app: end-to-end three-party signature and invoice creation, including error and retry paths.
- Finance: controlled sample data in isolated test environment; import-to-post-to-reconcile and statement/report tie-out.
- Deployment: automated smoke tests and a single release decision checklist.
