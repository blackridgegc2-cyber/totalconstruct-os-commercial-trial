# Authenticated WIP Acceptance Gate

Production UAT defect observed 2026-09-15:
- Current project banner: Kingsland Commons
- WIP row: TRN-001 — TotalConstruct Training / Sample Project
- Training values contaminated company WIP: $2,500,000 contract, $2,150,000 forecast cost, $350,000 projected GP, 14.0% GP, $2,500,000 backlog.

Required retest after merge/deploy:
1. Open WIP / Contract Status as Executive.
2. Confirm no TRN-001 / TotalConstruct Training / Sample Project row is present.
3. Confirm KPI cards and company totals do not include Training contract, forecast, GP, fee, earned revenue, billings, over/under, backlog, or related financial values.
4. Training remains selectable only for Training workflows and must not contaminate executive/portfolio financial reporting.
