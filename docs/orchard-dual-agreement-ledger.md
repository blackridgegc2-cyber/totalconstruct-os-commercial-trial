# Orchard Academy — dual owner agreement ledger and change register

## Two owner-facing agreement accounts
1. **Preconstruction / Engagement Agreement**: fee and design consultants, including Blackridge preconstruction services, Architectural/MEP design, and separately identified Quatro civil engineering scope.
2. **Cost-Plus Construction Agreement (modified A133)**: construction estimate/budget, reimbursable cost of work, construction GC fee, approved construction changes, owner billing and payment history.

Every charge, invoice, pay application line and payment allocation requires `agreement_id` (not only project ID). A project dashboard shows agreement-level values first, consolidated totals second, and does not add the same obligation twice.

## Change classification — separate registers per agreement
- `budget_reclassification`: architect fee moved from construction to preconstruction; zero net increase.
- `previously_disclosed_extra`: civil engineering identified in earlier owner correspondence as extra if required; attach source email, subsequent scope/price proposal and written authorization evidence. **Disclosure alone does not prove acceptance of a specific price.**
- `authorized_scope_addition`: signed CO, signed proposal, written directive, or other authorization supported by contract requirements.
- `pending_authorization`: disclosed or proposed scope without confirmed authority for price/scope.
- `formal_change_order`: only if actual CO issued/approved. Do not fabricate a CO number or signed status.
- `credit` and `allowance_adjustment` tracked separately.

## Owner dashboard columns
Agreement | Base amount | Approved scope additions | Pending changes | Reclassifications | Revised authorized value | Previously billed | This period | Total billed | Paid | Balance | Source agreement

Change register:
Agreement | Description | Reason/trigger | Cost | Status | Owner notification date | Authorization basis | Evidence link | Included in pay app?

Quatro entry: Full engineered civil plan set required by City/County instead of initial site-plan assumption; $38,700; `previously_disclosed_extra`; evidence is earlier GC email and Quatro proposal; final authorization status requires owner approval verification.

## Controls
- GC controls document category access. Owner dashboard reveals only explicitly authorized categories; summary numbers must not expose confidential subcontractor records.
- Distinguish budget forecast from owner-authorized contract value. No pending extra is automatically an approved CO.
- Imported Excel SOV entries must map to the correct agreement and single obligation ID, including Blackridge $45k fee.
- Audit reclassifications, scope changes, approvals, billing and payments; no silent history edits.
