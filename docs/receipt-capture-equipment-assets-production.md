# Receipt Capture → Equipment/Asset Register — production acceptance

## Receipt capture
Mobile camera capture, multi-page PDF, image uploads and receipt email intake. Preserve original evidence, hash, uploader and timestamps. AI extraction proposes merchant, transaction date, currency, subtotal, tax, shipping, total, payment method, and **line items** with confidence and image/page references. Every uncertain field is reviewed; never fabricate serial numbers, tax treatment, project or cost codes.

## Classification and prompt
Classify receipt lines as consumable, material, subcontract service, small tool, tracked equipment, vehicle, fixed asset or unknown. If likely a tool or equipment, prompt immediately after extraction:
- 'Add this purchase to Equipment / Asset Inventory?' with Register, Expense Only, Not an Asset and Review Later.
- Manufacturer, product name, model, serial number, asset tag (auto-generated unique company-wide), category, photo of item, optional serial plate photo, condition, location, custodian, assigned project, purchase date, vendor, receipt, purchase amount, warranty expiration and service interval.
- Serial numbers may be unavailable; permit Pending Serial Number with follow-up task, never auto-fill an invented value.
- Existing asset match by company + serial/model/receipt line before insert; offer link to existing record and warn about duplicates.
- Batch receipt may contain multiple assets, each requiring its own asset record, serial and photo.
- Check-in/check-out, transfers, maintenance, calibration, depreciation category, disposal, loss, insurance and audit log.

## Financial integration
Expense receipt → approved expense or AP bill → QuickBooks, with idempotency. An asset registration does **not** create a second expense. CPA policy controls expense versus capitalization, depreciation and project chargeback. A receipt may have multiple cost codes, agreements and projects; require allocation review. Sync transaction IDs and status, no auto-posting or double reimbursement. Taxable purchase totals reconcile to original receipt.

## Security and retention
Company-scoped access, project membership and asset custody controls; signed/private object storage; immutable originals; role-based view/export. No public image URLs for receipts or serial plates. Maintain retention according to company policy and applicable tax requirements.

## Acceptance tests
1. Photograph receipt with a drill plus consumables → drill prompts asset details, consumables do not.
2. Two identical drills → two records with distinct serials and one receipt, no duplicate financial posting.
3. Receipt image with unreadable serial → prompt for serial plate photo, pending serial allowed.
4. Expense-only classification does not register an asset.
5. Same receipt re-upload → detect duplicate and request confirmation.
6. QuickBooks bill linked once, and project costs reconcile to receipt.
7. User from another company cannot view receipt or equipment.
8. Mobile offline draft may be saved locally encrypted only where supported; no claim of cloud save until confirmed.
9. Retired asset preserves purchase history, receipts and audit records.
10. Equipment transfer records from/to employee, project, timestamp and approval.

## Status
This is an implementation and test contract. The connected Supabase schema currently has no verified receipts or equipment-assets tables. No receipt capture or AI asset-registration service is verified deployed.
