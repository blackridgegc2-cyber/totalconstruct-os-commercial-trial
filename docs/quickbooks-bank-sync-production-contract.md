# QuickBooks-first financial integration — production contract

## Operating rule
QuickBooks Online remains the accounting system of record until a verified cutover is approved. Do not disconnect, alter, or replace its existing bank/credit-card feeds. TotalConstruct's CSV import remains an optional fallback, never a requirement for users with a functioning QBO feed.

## Required end-to-end implementation
1. Implement Intuit OAuth 2.0 authorization-code flow with CSRF state, PKCE where supported, callback allowlist, refresh-token rotation, encryption at rest, and revocation/disconnect. Never put tokens in client-side storage or logs. Company-to-realm binding must be unique and server-authorized.
2. Pull authorized QBO account metadata and supported transaction objects through paginated, rate-limit-aware APIs. Track sync cursor/watermark per company, realm, object type, and account; use overlap windows to catch edits. Do not assume QBO exposes bank-feed reconciliation state or unmatched feed entries via API: verify each resource's actual availability before promising parity.
3. Persist raw provider identifiers and source snapshots with unique (company, provider, realm, entity type, provider id) constraints; make upserts idempotent. Capture deleted/voided/modified transactions without deleting posted GL history.
4. Map accounts, vendors, expenses, credit-card charges, payments, transfers, refunds, and splits to TotalConstruct projects and CSI codes. Flag unknown mappings, negative amounts, transfer double counts, and source conflicts for Controller review.
5. Default to read-only ingestion. No automatic QBO writeback or duplicate journal posting. Require explicit Controller authorization for write operations and keep an immutable audit trail.
6. Reconcile totals by account and period against QBO reports and separately available bank statements; never represent QBO imported transaction data alone as independently verified bank reconciliation.
7. Keep CSV statement import functional and isolate it from provider-sourced transactions using deduplication keys.

## Acceptance cases — must be evidenced before READY
- OAuth connect, refresh, expired consent, disconnect and reconnect across two companies; prove no cross-company access.
- Initial sync, incremental sync, retry, duplicate delivery, pagination, API throttling, deleted/edited source transaction.
- Bank expense, credit-card expense, split expense, refund, transfer, and reversal preserve exact cents and avoid duplicate GL posting.
- Unmapped project/CSI and inconsistent amounts enter exception review rather than silent posting.
- Source totals and posted ledger balances match a controlled fixture; bank statement closing balance ties out independently.
- Permissions: finance admin, Controller, PM, Owner, Lender, subcontractor; negative tests for unauthorized access.
- Verified deployed browser flow and documented rollback; existing QuickBooks workflow unaffected.

## Release decision
HOLD until actual OAuth connectivity, provider ingestion, controlled accounting fixtures, and multi-role browser tests pass. A connection registry or dashboard alone is not a working connector.
