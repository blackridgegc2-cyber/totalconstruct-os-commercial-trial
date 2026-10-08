# Workbook-native GC pay application editor — acceptance specification

Orchard Academy source template: `BRC Payment Application Orchard Academy PA 1(2).xlsx` (private user upload; DO NOT commit the file).

## User-visible behavior
- Clicking a pay app in ANY state (new, draft, submitted, returned, approved, finalized) opens a workbook-like page viewer at `ACP`.
- Next/Previous traverse the original Excel worksheet order (including all CS continuation pages, change orders, payee lists, lender/owner forms, lien waivers). Sheet picker and current-page indicator.
- Layout must preserve template labels, cells, merged regions, column sizing, print boundaries and recognizable Excel appearance, with horizontal/vertical scrolling and zoom.
- **CS-1 is the primary editable SOV input.** Inputs and authorized additions to CS-1 drive formula-linked ACP and other forms, with recalculation and warnings; allow edits on other designated input cells when needed.
- Auto-save versioned drafts; explicit Save, export .xlsx and print/PDF with same template. Source workbook retained immutably. Maintain cell-level provenance, edit actor and timestamp.
- State controls: draft edit/submit/delete; submitted read-only/return; returned edit/resubmit; approved/finalized read-only except authorized revision workflow. Never silently finalize or roll forward.
- Preserve previously owner-paid amounts on CS-1 as prior payments before lender involvement; current lender request excludes those payments.
- Separate preconstruction and construction owner agreements and obligation IDs, with no duplicate fee billing.
- Lender receives only GC-authorized exported pay app and support; no access to GC subcontractor, designer or vendor agreements.

## Architecture / acceptance
- Parse workbook on server with full formula graph or trusted spreadsheet engine; never treat cached Excel values as authoritative after edits.
- Sheet mapping must be discovered from actual template and support continuation sheets, not a hard-coded four-sheet approximation.
- Calculations must match original Excel within cent rounding across 15+ test cases including previous payment, retainage, additions, and returned revisions.
- Require authenticated project membership, GC role, category ACL and row-level agreement permissions for save/submit.
- Render workbook editor for ALL statuses, not just imported draft.
- Automated browser tests: create from template, import existing, edit CS-1, verify ACP updates, navigate all pages, refresh/persist, submit, return, resubmit, export and confirm Excel formula fidelity.
- Production HOLD until real backend, database RLS, rendering, formula recalculation and E2E tests pass.
