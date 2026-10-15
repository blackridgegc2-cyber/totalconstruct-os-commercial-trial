# Shared CSI cost catalog, budget entry and accounting coding — 2026-10-15

The supplied 58-page CSI Codes Reference Sheet provides 2,724 unique eight-digit codes/descriptions. All are imported verbatim as text, including leading zeros. `data/csi-cost-codes.json` records the source SHA-256. No separate cost-type column exists in the PDF; application defaults are suggestions and remain editable.

Accounting and Budget / Cost Controls now share a searchable catalog. Company admins/accounting users can add company-specific codes; authorized project budget users can select them. Company additions are isolated, audited by creator/time, and do not replace supplied codes. Broad/ambiguous scope searches show candidates and require user selection. Only an unambiguous exact description/code auto-fills. Explicit labor/material wording informs the editable suggested type.

The Cost Line action now uses a saved cloud form rather than local prompts. New lines store project, scope, CSI code, type, budget, record revision and audit history. Manual forecasts and approved imported forecasts coexist in project totals; source actuals/commitments are not user-editable. Idempotent creation and versioned forecast edits protect retries and conflicts.

Journal composer and charge split review have scope matching and editable cost types. Selected scope/type survive storage and charge-to-journal preparation. New journal and allocation coding validates against the shared/company catalog. Existing posted rows are not rewritten. Older catalog-unmatched codes must be added as company codes before new use; source PDF numbering is preserved rather than converted into another CSI edition.

Future subcontractor-scope-to-budget assignments are specified in `docs/requirements/subcontractor-budget-code-links.md`. This release does not claim that AI import or subcontractor billing assignment is complete. Production AI provider configuration remains absent.

Validation: 46 Node regression tests; 23 CSI database acceptance checks, plus 19 import and 10 accounting regressions (all rolled back), for catalog permissions, custom-code isolation, typed journal persistence, saved budgets, audit/version protection and combined import/manual forecasts; DOM emulation for ambiguous selection, editable suggested type, leading zeros, cents and changed-session rejection; release gates and syntax checks. Full authenticated browser acceptance remains outstanding.
