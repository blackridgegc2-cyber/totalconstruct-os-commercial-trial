# TotalConnect one-time coding campaign — approved controls

Approval: a maximum of $200 total across a single 30-day run. This is **not** a recurring budget and no spending is authorized until an independently metered worker is provisioned.

## Configuration
Recovery workflow requires TC_TOTAL_BUDGET_USD (max 200), TC_ACTIVATED_AT and TC_HARD_STOP_AT as explicit ISO timestamps (maximum 30 days apart), and TC_VERIFIED_SPEND_USD as a verified cumulative amount, in addition to the worker HTTPS endpoint and token in Actions secrets. Missing values fail closed. The campaign clock has **not started**: do not set dates until worker is tested, authorized and ready.

## Mandatory worker enforcement
The controller checks configured cost and time before dispatch but an Actions variable is NOT an authoritative billing ledger, may become stale, and cannot by itself guarantee a $200 cap. The worker must independently enforce a transactional cumulative budget reservation for all runs, provider-level spend restrictions, per-job budget/timeout, and a hard stop at campaign expiry. Workers must not automatically renew, restart a new campaign, or incur charges after expiry. Require a confirmation of hard-stop behavior before live dispatch.

## Release protocol
Recover existing Codex work, import full ledger, record code/test evidence and run acceptance suites. Review security/accounting changes before merge. If 30 days or budget ends first, preserve checkpoints, open PRs, and unresolved issues; report incomplete rather than downgrade requirements. No blanket promise of full commercial readiness in 30 days.

## Verification
- [ ] Worker and provisioned token connected
- [ ] Independent spend ledger + actual cost reconciliation
- [ ] Enforce one-time hard spending limit and expiry
- [ ] Interruption/recovery test passes
- [ ] GitHub workflow active on default branch
- [ ] Dashboard shows status and actual spend
- [ ] Scope audit establishes feasibility before claiming release date
