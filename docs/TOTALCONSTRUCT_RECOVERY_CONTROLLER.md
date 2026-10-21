# Total Construct automated recovery — setup and safety

This is a **starter dispatch controller**, not a running autonomous coding service until a compatible external worker is configured.

## Setup
1. Protect `main`: require pull request, CI tests, security review and human approval for database migrations, finance and permissions.
2. Create GitHub issue labels: `tc-agent-task`, `tc-queued`, `tc-running`, `tc-retry`, `tc-blocked`, `tc-done`.
3. Create GitHub Actions secrets `TC_AGENT_ENDPOINT` (HTTPS worker endpoint) and `TC_AGENT_TOKEN` (worker bearer secret). Never commit keys to the repository.
4. Set repository Actions variable `TC_MONTHLY_BUDGET_USD` (default dispatch ceiling 200 USD). The worker must enforce real cumulative spend; this number alone is **not** a billing cap.
5. Provide external worker with durable persistence for run IDs, actual spend, claimed issue, heartbeat, retry-after, and callback status. Worker must honor provider rate limits, verify GitHub signatures, and create test-backed pull requests; **do not** deploy directly.
6. Create GitHub issues with label `tc-agent-task` + `tc-queued` and a single-line machine-readable marker. Example:

`<!-- TC_CONTROLLER {"scope":"Complete accounting pay-app carryover integration","acceptance":"G702/G703 reconciliation and end-to-end tests pass","attempts":0,"requiresApproval":false} -->`

7. The workflow checks hourly. Use manual workflow dispatch with dry_run=true to verify queue parsing without starting work.
8. Secure worker callback must update issue status; the worker is also responsible for timeout detection and bounded retries. This dispatch workflow **will not automatically recover stuck running issues** without that worker. Avoid automatic retry of actions with external financial consequences.

## Architecture / scope
GitHub Issues is the durable backlog, GitHub Actions checks for queued work, external cloud worker launches model/coding agents, every code change opens a PR, CI validates it, and humans approve sensitive merges. No silent auto-merge, schema migration, payment, access-control change or deployment. Lead generator remains connected but independent of Total Construct's main commercial release.

## Known limitations
GitHub scheduled Actions runs can be delayed or skipped during platform load. Codex/Work session quotas cannot be bypassed; the worker must have its own supported API/credits. This initial controller lacks spend aggregation, heartbeat recovery, callback API and comprehensive test harness. Do not call it autonomous or fully active until the required external worker is integrated and an unattended stop/retry test succeeds.
