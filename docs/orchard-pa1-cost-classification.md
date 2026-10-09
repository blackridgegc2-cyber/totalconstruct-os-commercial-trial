# Orchard Academy PA1 — contract basis and cost classification

User-confirmed accounting treatment (October 8, 2026). Do not infer approval or execute a pay application from these notes.

| SOV cost | Phase/category | Budget action | Contractual control |
|---|---|---|---|
| Blackridge preconstruction services ($45,000) | Preconstruction / GC services | Separate from construction estimate; reconcile agreement language and prior invoices | Engagement letter and modified A133; prevent duplicate entitlement |
| Architectural/MEP design | Preconstruction / design | **Reclassification** from construction budget, not new cost | Executed architect agreement, confirm actual fee and billed-to-date |
| Quatro Engineering ($38,700) | Preconstruction / civil engineering | **Added scope/cost**, full engineered plan set required instead of originally anticipated site plan | Executed Quatro agreement and written owner authorization / change basis |
| Construction-phase GC fee | Construction / GC fee | Keep separate from preconstruction fee | A133 cost-plus fee provisions |

## Excel import acceptance
- Preserve exact source cells and formulas for the lender's ACP, CS and CHANGES sheets.
- Maintain `original construction estimate`, `reclassified costs`, `authorized added scope`, and `combined billing basis` as distinct fields.
- Reclassification: equal-and-opposite category transfers; project total unchanged.
- Quatro: increment forecast/authorized scope only after verifying agreement and owner authorization; don't assume a lender workbook change is itself contractual approval.
- Prevent duplication: a single obligation ID for the $45,000 preconstruction fee even when two agreements mention it.
- Expose G702/ACP contract basis vs expanded G703/CS basis reconciliation as a **documented scope-basis adjustment**, not a silent arithmetic override.
- Draft -> GC review -> owner/lender submission; no automatic finalization.
