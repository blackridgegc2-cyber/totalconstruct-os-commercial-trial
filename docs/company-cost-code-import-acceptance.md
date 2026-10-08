# Company Cost Code Library — import and manual-entry acceptance

## Purpose
Each subscribing construction company owns its own cost-code catalog, with optional CSI MasterFormat mapping. Do not force every tenant to use Blackridge's numbering or publish one tenant's codes to another.

## Required screen: Company Settings → Cost Codes
- Search, filter by division/trade, active/inactive, sort, add code, edit code, archive code, export CSV.
- Import CSV or Excel (.xlsx/.xls) with preview, column mapping, validation, duplicate detection, dry-run and explicit Apply.
- Required: Cost Code, Description. Optional: Division, Division Name, Trade, QB Account, QB Item, Active, Sort Order.
- Preserve cost codes as **text** including leading zeros, punctuation, CSI hierarchy and custom suffixes.
- Match duplicates by company ID + normalized exact code; allow explicit skip/update, never silent overwrite.
- Reject duplicate rows, blank codes, invalid hierarchy where company validation enabled; report row-specific errors.
- Batch upsert transactionally, record importer/time/source filename/hash and per-row changes.
- Company administrators can edit the master; project staff can choose from permitted company codes.
- Imported catalog is never silently posted as a project budget or a QuickBooks GL entry.
- Maintain code snapshots on SOV, commitments and historical transactions. Archive instead of deleting a used code.
- Map to QuickBooks chart of accounts, item/product/service and class/location where applicable; QB mapping is optional until connected.
- Add Project Cost Code Assignment: choose subset, project alias/description and project-specific budget values; preserve master code.
- Distinguish CSI section number (e.g. 03 30 00) from company cost code (e.g. 03300-C); support many-to-one mapping.

## Security
Company-scoped RLS for read and company admin-only mutation; enforce server-side authorization on import, export and updates. Do not use localStorage as the source of truth. Reject unknown company IDs and cross-tenant updates. Preview uploads must not commit before confirmation.

## QA
- 1000-row CSV import with 00010 leading zeros; dry-run then apply and idempotent repeat.
- Conflicting duplicate descriptions require explicit resolution.
- Second company sees none of first company's custom codes.
- Project selection does not mutate company master.
- Existing paid SOV retains original code label after catalog rename.
- Unmapped QB codes do not silently post journal entries.
- Imported spreadsheet formulas never execute; extract displayed values safely.
