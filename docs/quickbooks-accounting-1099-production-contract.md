# QuickBooks-first accounting and eventual standalone ledger — production contract

## Accounting authority
QuickBooks is the general-ledger, AR/AP, cash reconciliation and tax accounting source of truth until explicit company-level cutover after CPA signoff. TotalConstruct is the construction operational source for projects, agreement-specific pay apps, SOV, changes, commitments, forecasts and approvals. Do not treat TotalConstruct operational totals as posted QB entries.

## Connection
- Support QuickBooks Online via Intuit OAuth 2.0 authorization code flow, tenant/company-scoped realm ID, encrypted server-only token storage, token refresh, revocation, least-privilege scopes and webhook verification. Do not place access or refresh tokens in browser, localStorage, GitHub or Supabase public tables.
- Determine whether customer uses QuickBooks Online or Desktop before choosing the connector. Desktop requires a different integration approach.
- Connection test, chart of accounts, customers/projects, vendors, tax settings and mapping review before first write.
- Start with read-only historical import and reconciliation. Enable each outbound transaction type separately only after accountant approval.

## Transaction rules
- Maintain immutable mapping `totalconstruct_entity_type/id <-> quickbooks_realm_id/entity_type/id`, version/etag and sync timestamp; enforce unique constraints and idempotent retry keys.
- Sync approved owner invoices from pay applications only once, by correct agreement and project. Owner direct prior payments before lender involvement remain credits/history; never issue new bank draw for them.
- Pull QB payments and deposits to reconcile AR, but distinguish bank deposits, payment applications certified, cash received and retainage.
- Approved AP vendor bills and credit memos sync once; subcontract/PO commitment is not a payable invoice. Never auto-pay vendors.
- Change orders and GMP SOV reallocations are project operational adjustments; do not post GL journals just because funds move between categories.
- Respect closed accounting periods; any correction is a new auditable adjustment, not silent modification of a posted transaction.
- Explicit sync states: draft, queued, pending, posted, reconciled, rejected, conflict; provide manual conflict resolution and daily exception dashboard.
- All sync operations tenant-isolated, role-authorized and logged, with redacted financial diagnostics.

## Tax reporting
- W-9 collection with encrypted sensitive fields and restricted access, taxpayer classification, legal name, address, TIN, backup withholding status, reportable payment classifications, exclusions, and validation workflow.
- Track reportable payments by calendar year and payment method; do not blindly count credit card/third-party settlement network payments as 1099-NEC payments. Track federal and state reporting rules and thresholds by filing year; no hardcoded permanent threshold.
- Generate recipient/IRS copies and filing-ready export; **electronic submission must use a verified authorized IRS filing integration or supported e-file workflow with explicit user authorization and filing acknowledgments**. Never claim IRS filing from a PDF/export alone.
- Retain filing statuses, corrections, acknowledgments, recipient delivery and audit history.

## CPA deliverables
Trial balance, GL, balance sheet, income statement, cash flow, AR/AP aging, vendor ledger, retainage, WIP percentage-of-completion and over/underbillings, budget vs actual by CSI code, agreement-specific owner billing, 1099 reconciliation and bank reconciliation exports. Tie report totals to QB as-of timestamp; show unposted TotalConstruct changes separately.

## Migration to standalone accounting
Only after double-entry journal engine, period close, reconciliation, posting locks, immutable audit trail, role separation, bank feeds, tax reporting, CPA signoff and parallel-run comparisons reconcile over multiple closes. Cutover is explicit, never automatic.

## Current schema status (October 2026)
Supabase `public.accounting_connections` exists but has 0 records. `public.financial_periods` exists but has 0 records. No verified active QuickBooks OAuth connection or 1099 filing service is present. The accounting UI must show 'Not Connected' until proven otherwise.
