# Training Financial Isolation Fix

Authenticated production UAT showed `TRN-001 — TotalConstruct Training / Sample Project` contributing $2.5M to company WIP while Kingsland Commons was the selected production project.

Root causes addressed:
- Training classifier did not explicitly recognize the live `TRN-` job-number convention.
- Portfolio render wrappers were installed only once and could miss render functions declared after the isolation module loaded.

Fix:
- Treat `TRN-*` jobs as Training.
- Re-apply isolation wrappers after application boot so WIP, executive dashboard, opportunity board, OH recovery, fee reporting, and resource planning always receive production-only projects.
- Add a CI regression gate for these safeguards.

Acceptance requirement: authenticated WIP must not display TRN-001 or include its contract/forecast/GP/backlog values in company totals.
