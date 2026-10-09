# Pay application automatic next-period roll-forward — mandatory acceptance

## New Pay Application
- Determine the latest **approved/finalized** pay application for the selected project **and agreement/billing stream**. Create the next sequential number transactionally; prevent duplicate numbers or parallel drafts.
- Copy the approved SOV line identities, descriptions, scheduled values, approved CO adjustments, and prior period stored-material balances.
- Set each new line's `previous_completed` to prior `total_completed` (including prior stored-material accounting as appropriate); reset current labor/work and new stored-material inputs to zero. Do not double-count stored materials later installed.
- Carry forward cumulative retainage **by line**, with any approved retainage releases accounted for; preserve previously certified amount and **actual payments received** as separate fields. Do not assume approval equals payment.
- Automatically carry forward previously owner-paid pre-lender amounts and apply them only once to cumulative payment reconciliation.
- ACP and all other sheets recalculate from CS-1; all previous applications remain immutable.

## Normal GC inputs only on CS-1
1. Current-period labor/work, materials installed, and separately identified materials suitably stored.
2. Approved change orders / scope additions (including description, approval basis, agreement, date, and value); pending changes excluded from authorized contract sum until approved.
3. Reallocation between SOV categories with paired debit/credit, explanation, authorized approver, zero-sum check and no change to total agreement value.

## Invariants
- `previous_completed(n+1) = certified_total_completed(n)`, adjusted only by separately audited corrections.
- `current_period(n+1) = 0` at creation.
- `revised_sov = original_sov + approved_additions + zero_sum_transfers`.
- `current_due = cumulative_earned_less_retainage - prior_certified_net`, reconciled separately to actual cash received and outstanding receivables.
- Never auto-roll-forward from draft, submitted, returned or rejected applications. If a submitted app is pending, block creation of another in the same billing stream unless explicitly handled as a revision.
- Prevent negative line scheduled values, cumulative completed exceeding approved line value without an exception, duplicate CO application, duplicate preconstruction fee obligation, and silent previous-period modifications.
- Export all workbook pages with formulas consistent with original lender Excel.

## Required E2E
Approved #1 -> New #2: verify previous amount/retainage and SOV lines, current zeros, CS-1 entry updates ACP, zero-sum transfer, CO change once, approval lock, and #3 carry-forward. Confirm owner-direct prior payments persist and lender view cannot see confidential contracts.
