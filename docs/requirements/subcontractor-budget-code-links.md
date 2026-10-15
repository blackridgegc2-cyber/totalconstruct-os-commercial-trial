# Subcontractor scope and project budget assignment requirement

Billy Brown, 2026-10-15: when subcontracts and scopes are uploaded for AI reading, assign cost codes to subcontractor scopes and link the relevant available project budget codes for later billing. When several codes could fit, the user selects the category/scope that fits best.

The shared CSI catalog and durable manual budget lines are implemented in the current release. The subcontract import-to-billing assignment workflow below is required future work; it is not yet implemented or certified.

- Keep the subcontractor, project, subcontract, source document, extracted scope item, CSI code, cost type and specific budget line reference together. Codes alone are not unique budget-line identities: the same code may have separate labor/material/subcontract rows.
- Support multiple scope/budget assignments per subcontractor. AI can propose existing relevant project budget lines, but ambiguous or unmatched scopes require user review. No invented codes, cross-project links, or automatic commitment/billing from unreviewed suggestions.
- Store manual budget line UUIDs directly. Imported budget lines need stable identities or an import ID plus immutable line reference; never link by description, current array position alone, or code alone. Superseding an imported budget requires explicit mapping review while preserving historical billing links.
- Present scope text, budget line description, code, cost type, current budget and remaining availability during review. An unmatched scope can lead an authorized user to add a code/budget line, then return to assignment.
- Approval produces audited scope assignments. Subcontractor billing and invoices select from approved assignments; exceptions require authorized review. A budget link does not itself approve a contract, create a commitment, or authorize payment.
- Enforce project/company boundaries on the server and restrict subcontractors to their own assigned scopes; internal budgets must not leak through portal views.
- Acceptance must cover multiple scopes, repeated codes with different types, ambiguous/unmatched cases, superseded budgets, revoked access, bill-to-assignment consistency, and immutable historical billing.
