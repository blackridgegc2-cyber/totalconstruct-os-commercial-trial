# TotalConstruct OS Commercial — Full Scope Build Baseline

This document is the implementation baseline for the current wholesale build/hardening pass. It consolidates all agreed requirements so the platform is implemented and verified as one coherent operating system rather than as isolated UI patches.

## Release principles
- Current production/main remains the protected baseline until the full build branch passes holistic verification.
- No active-looking dead controls. Every visible action must either work, be intentionally disabled with a clear explanation, or be hidden until available.
- Enter data once; reuse it everywhere. Forms/templates must prepopulate project/company data already known to TotalConstruct.
- Project names/cards/rows and KPI values should drill down to the underlying project/module/record where practical.
- Web, tablet, and phone all use the same live backend/project data. Mobile/field interfaces are optimized views, not duplicate systems.
- External collaborators (subs, owners, design team, lenders, CPA) are not extra paid seats when invited into a subscribing contractor's environment.
- Disabled workspace modules remain licensed and retain all data; disabling only removes clutter/visibility.

## Core functional repair gate
- Sweep and repair all buttons, cards, links, dropdown actions, tabs, upload controls, Add New actions, approvals, forms, reports and drilldowns.
- Create/fill workflows for RFI, Submittal, Meeting, Daily Report, Field Report, A/E Observation, Inspection, Punch, Safety, Change Event/COP/CO, Pay App, Contract/Subcontract, Purchase/Receipt, Asset, Schedule Item, Correspondence and similar records.
- Each workflow opens the correct form/template and prepopulates project number/name, dates, team/recipient data, related drawing/spec/cost/schedule references, contract/vendor/sub data and other reusable information.
- Meeting flow: choose meeting type first, then open the appropriate template. Support OAC/Progress, Preconstruction, Sub Coordination, Safety, Pre-installation, Owner, Design/A&E Coordination, Closeout and Custom; carry prior action items and relevant live project data.

## Executive and project navigation
- Rich Blackridge dashboard layout with current color scheme.
- Project image controls sized/positioned so they do not obscure the project image.
- Executive/WIP/portfolio project cards, rows and project names drill into project dashboards.
- KPIs/log counts/financial values drill into relevant filtered logs and supporting records.
- Executive view provides actual and projected company financial health before and after tax.

## Employees, users and permissions
- Add Employee workflow.
- Secure email invitation workflow with role assignment.
- Admin-visible invitation status including not invited, pending/sent, viewed, accepted/active, expired/resend, failed and inactive/disabled states.
- Invite/resend/revoke actions and dates/audit history.
- Role-based permissions for internal and external roles.
- Super Admin View As/Test Role mode for testing internal and external portal experiences without changing the real account.

## Training and help
- Permanent Sample/Training project isolated from production reporting, WIP, company financials and overhead.
- Employees may use training project at any time within their role permissions.
- Super Admin can View As roles inside training.
- Training Center with role-specific guided workflows.
- Hover/tap contextual help throughout the platform with Learn More links into training.
- Persistent Help/Training access.

## Responsive web + mobile architecture
- Desktop: full navigation rail.
- Tablet: recognizable collapsible icon rail/menu; landscape may retain compact rail.
- Phone web: hamburger/slide-out menu.
- Full web site remains usable at mobile/tablet widths.
- Native/companion mobile UX prioritizes field functions while retaining Open Full TotalConstruct access.
- Field app/tablet/phone writes directly to the same live company/project backend.
- Offline field capture/sync queue and conflict handling architecture.

## Field photos, reports and A/E observations
- Take photos directly in app/site or upload existing images.
- Automatic timestamp, user, project and optional GPS/location metadata.
- Description/caption, tags, trade/area, drawing reference and linked record support.
- Photos can be saved to Project Photos, Daily Report, Field Report, A/E Observation, Inspection, Punch, Safety, T&M, Warranty or multiple destinations without duplicate upload.
- Preserve originals; annotations/markups stored non-destructively.
- Multiple-photo sessions and before/after grouping.
- A/E Site Visit / Field Observation module with photos, annotations, observations, responsible party, status and formal report output.
- A/E report upload as indexed/searchable PDF or AI-imported reusable project template.
- AI extraction proposes observations/actions/links but does not autonomously create contractual directives or scope changes without authorized approval.

## Scheduling and project controls
- Native schedule builder, Gantt, predecessor logic and P6/MS Project import.
- Superintendent schedule updates with PM access.
- RFI/Submittal/CO/inspection/delay linkage to schedule activities.
- Project status reporting with drilldowns and role-specific dashboards.

## Purchasing, receipts and vendor feeds
- Purchase Feed / Receipt Inbox for connected vendors, beginning with practical high-value integrations as available.
- Home Depot-style vendor purchase/receipt capture with vendor/date/purchaser/amount/receipt/payment source.
- Code every purchase to Company OH or Project > CSI/cost code > scope/work package > cost type.
- Split one purchase/receipt across multiple projects/cost codes.
- Manual receipt capture from field; AI reads vendor/items/amount and suggests project/cost code for confirmation.
- Missing receipt, unassigned charge, duplicate and review queues.
- Approved allocations flow to actual job cost, WIP, accounting sync and bank reconciliation.

## QuickBooks and bank connectivity
- QuickBooks two-way integration architecture with explicit source-of-truth rules and reconciliation status.
- Vendors/subs, COA/cost codes, bills/AP, payments, invoices/AR and project/job mapping as applicable.
- Plaid-based bank/credit-union connectivity; Austin Telco FCU is a known target connection.
- Bank transaction reconciliation states: Matched, Suggested Match, Unmatched, Needs Review.
- No storage of customer bank usernames/passwords in TotalConstruct.

## Assets, fleet, tools and IT inventory
- Company Asset Management covering vehicles/fleet, heavy equipment, attachments/implements, power/hand tools, survey/layout, trailers, computers/laptops, tablets, phones, printers/scanners, hotspots, cameras, radios, monitors and office equipment.
- Asset record: category, make/model, serial/VIN/IMEI/MAC where appropriate/restricted, asset tag/QR, purchase date/vendor/purchaser/receipt, original cost, project charged, current project/location, assigned employee, ownership/rental, condition, warranty, insurance, financing/lien, service/inspection history, meter/hours/fuel where applicable.
- Tool/equipment checkout, return and project-to-project transfer with custody history.
- QR/barcode scan workflow and inventory audit mode.
- Lost/Damaged/Stolen workflow.
- Employee offboarding Asset Return Checklist.
- Purchase/receipt intelligence can propose Add to Asset Inventory for durable purchases.
- Asset schedule supports book value, tax basis/book value, estimated market value and replacement value as separate concepts.
- Loan/insurance-ready asset schedule and supporting document storage.

## Stand-alone ledger, fixed assets and depreciation
- Full stand-alone company/project ledger architecture with cash/accrual/completed-jobs reporting views as applicable.
- Fixed Asset subledger with placed-in-service date, basis, class, useful life, book depreciation, tax depreciation, accumulated depreciation, disposal/proceeds and gain/loss.
- Separate book and tax depreciation views.
- Tax methods/elections version-controlled and subject to CPA/accounting approval; support common U.S. concepts such as MACRS, Section 179 and bonus depreciation as configured.
- Immutable audit trail for reclassifications and adjusting entries.

## Controller / CPA workspace
- Dedicated Controller/CPA workspace and permissions model.
- Outside CPA defaults to restricted read-only financial/tax access with view/filter/print/export/upload capabilities.
- CSV, Excel and PDF/print reporting.
- CPA/Tax Documents upload area.
- Reports include P&L, balance sheet, trial balance, GL, WIP, completed jobs, project profitability, backlog/contracts, AP/AR aging, retainage, committed costs, vendor/sub payments/1099 support, bank/card reconciliations, fixed assets, book/tax depreciation, tax forecast/reconciliation, estimated payments and payroll summaries when available.
- CPA Request List workflow.
- Generate CPA Package workflow with indexed outputs.

## Completed-jobs tax reporting and tax forecast
- Construction-specific Completed Jobs / Completed Contract reporting option configured and approved by CPA/accounting based on applicable tax treatment.
- Maintain operational/WIP reporting and separate tax-recognition view.
- Project tax-recognition statuses and completion assumptions.
- Completed Jobs Tax Schedule with contract, COs, recognized revenue, total cost, profit, completion/acceptance date, recognition year and underlying support.
- Executive tax KPI drills into Controller/CPA details.
- Live estimated tax-liability tracking monthly/quarterly/annual as configured.
- Forecast from book income through additions/deductions/timing differences to estimated taxable income and liability.
- Every tax assumption/adjustment is visible, source-linked and reviewable; not a black box.
- Assumption statuses: System Calculated, Accounting Entered, CPA Approved, CPA Adjusted, Needs Review, Expired/Annual Confirmation.
- CPA locks/approval and audit trail.
- Actual forecast vs final return variance retained for future forecasting improvement.
- Clearly framed as estimates/decision support, not CPA/tax advice or filing authority.

## Executive financial intelligence
- Actual and forecast project/company profitability.
- Financial waterfall: revenue, actual costs, remaining forecast cost, projected gross profit, overhead, financing/other company expense, pre-tax profit, projected tax liability, after-tax profit.
- Project level: original/current contract, actual, committed, forecast-at-completion, gross profit, OH/fee recovery, variance and project contribution to company profit.
- Company level includes payroll, office, insurance, fleet, equipment, software, BD/precon, financing, depreciation and corporate OH.
- Selectable horizon: Today, Month, Quarter, Year-End, Next 12 Months.
- Ask-AI can analyze company/project drivers and cite underlying records.

## Profit Allocation / Capital Deployment & Company Health
- Dedicated Executive page calculating Safe Deployable Capital.
- Inputs include unrestricted cash, restricted/committed cash, project working capital, AP, retainage, payroll, corporate OH, taxes, debt/loans/LOCs, mortgages/leases, equipment/vehicle loans, insurance, recurring costs, warranty exposure, planned capex, contingency and configured reserves.
- User-configurable minimum company health policies such as minimum unrestricted cash and minimum months of overhead carry.
- Allocation buckets: cash reserve/carry, equipment/fleet/tools, inventory, bonuses, pay raises, hires, benefits/insurance, facilities/yard, expansion, BD/marketing, debt reduction, technology, real estate/development, investments, retirement/benefit contributions where appropriate, owner distributions and opportunity reserve.
- Model recurring burden correctly for raises/hires/benefits, financing/maintenance/insurance for equipment and carrying costs for real estate.
- AI health classifications and warnings when allocations threaten viability; authorized override with audit history.
- Scenario comparison: Conservative, Growth, Debt Reduction, Investment, Bonus/Distribution and custom.
- Q4/fiscal-year-end 90/60/30-day review alerts to review projected revenue recognition, completed jobs, tax assumptions and proposed capital allocations before reporting deadlines.

## Bid/pipeline sensitivity
- Capital/health engine includes Bid/Opportunity/Awarded/Pending/Backlog tracking log.
- Pipeline records carry expected start, duration, value, projected margin/fee, staffing, working capital, insurance/bond, equipment needs and expected cash-flow/payment lag.
- Probability/confidence assumptions are configurable.
- Views: Contracted Only, High Confidence, Probability Weighted, Full Pipeline.
- Primary Safe Deployable Capital calculation remains conservative and does not treat speculative pipeline as cash already earned.

## Payroll and benefits architecture
- Future full-service payroll layer integrated with accounting, scheduling and timekeeping.
- Payroll data flows to project cost and corporate OH.
- Benefits architecture includes health/dental/vision, HSA/FSA, life/disability, PTO liability, workers comp, retirement and other employer benefits.
- 401(k): employee contribution, Roth/traditional where applicable, employer match/contribution, eligible comp, YTD amounts, limits/catch-up treatment, vesting, payroll deductions, remittances and reconciliation.
- Plan provider remains custodian/recordkeeper; TotalConstruct integrates/reconciles and may display provider balance only when the provider exposes it.
- Total Compensation / Employee Burden calculations feed forecasts.

## Workspace configuration and packaging
- Package determines entitled functionality and price.
- Company Workspace Configuration allows entitled modules to be turned on/off for simplicity without changing price or deleting data.
- Role permissions determine who may see/use enabled modules.
- Individual workspace preferences allow permitted users to reorder/hide dashboard cards/shortcuts where appropriate.
- Presets for Small GC, Mid-Tier GC, Large/Enterprise GC, Trade Contractor and Residential variants.
- Dependencies are protected and explained if a required module cannot be disabled.

## Commercial storage baseline
- Pooled per subscribing company, not per user.
- Small/Entry: 2 TB active storage.
- Mid-Tier: 5 TB active storage.
- Large/Enterprise: 10 TB active storage.
- All packages: 10 TB Company Vault baseline.
- Additional active and Vault storage purchasable in blocks; high-capacity enterprise arrangements available rather than promising literal unlimited storage.
- External collaborators use company storage; no separate external-seat quota.
- Platform disaster-recovery backups do not count against the customer's active storage entitlement.
- Storage warnings around 75%, 85%, 95% and capacity reached; show consumption by project/file type/largest files.
- Never automatically delete customer records merely because quota is reached.

## Backup, retention and Company Vault
- 7 nightly rolling operational restore points.
- Separate protected 30-day catastrophic recovery snapshot.
- Customer-controlled backup destination architecture (cloud destinations and/or secure local/NAS connector/sync mechanism).
- Backup health dashboard and failure alerts.
- Periodic restore/integrity testing, not merely backup creation.
- Completed project retention configurable, with 7–10+ year construction-record retention supported.
- Project lifecycle: Active > Completed > Warranty > Archived.
- Company Vault is the searchable long-term archive/system of record, separate from disaster-recovery backups.
- Archived projects open in a read-only dashboard preserving relationships/index/search/Ask-AI without needing full reactivation.
- Authorized Restore/Reopen Project workflow preserves original archive snapshot/audit history.
- Vault categories may include Archived Projects, Corporate Records, CPA/Tax, Insurance, Assets, Legal/Contracts, Historical Financials and appropriately protected employee records.

## Legal/Audit mode
- Temporary read-only scoped access for counsel, auditors, insurers, lenders/regulators as authorized.
- Preserve timestamps, versions, authorship, approval and distribution/transmittal history.
- Legal Hold suspends ordinary purge/retention deletion until formally released.
- Audit/Discovery Package with selected records and manifest/index while original Vault remains untouched.
- Audit access history: who viewed/downloaded/exported, when granted/expired and who authorized it.

## Pricing assumptions for planning
- Small GC: roughly $5K–$10K annually.
- Mid-Tier: roughly $12K–$20K annually.
- Large/Enterprise: roughly $18K–$50K+ annually depending on scale/requirements.
- External collaborators included.
- Storage allowances above are incorporated into package value, with paid expansion available.

## Deployment/operations
- Planned maintenance/system shutdowns for full deployment should occur overnight between 11 PM and 5 AM in the user's timezone where practicable.
- Notify users at least one day ahead of scheduled shutdowns.
- Autonomous AI may assist with onboarding, training, monitoring, diagnostics, QA and repair, but high-risk production changes involving auth, permissions, databases, finance, payroll, tax or security require appropriate human review/approval.
- Release requires holistic regression/acceptance verification across auth, roles, navigation, project controls, forms, financials, field workflows, mobile/responsive behavior and data isolation.

## Product-family constraint
- TotalConstruct OS Commercial, Trade Contractor, Small GC, Mid-Tier/Large GC and Residential/Fix-Flip editions may share platform architecture but are distinct configurations/builds with different complexity and workflows.
- REDAP remains a separate product and is not to be merged into TotalConstruct.
