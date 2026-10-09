# TotalConstruct electronic signing policy — implementation gate

## Default
For contracts, pay applications, change orders, subcontracts and other eligible records, use an electronic signature with explicit consent, registered-phone one-time code and device passkey/WebAuthn user verification (fingerprint, face or device-supported credential). A digital signature is not a notarization; never represent it as such.

## Required signing evidence
Freeze document bytes and SHA-256 before invitations; display the complete immutable version. Capture signer account, verified signing authority, project scope, phone OTP verification event (no raw code), fresh WebAuthn challenge and verified assertion, explicit sign action, consent, UTC timestamp, document hash, signing order, immutable audit log and tamper-evident signed copy. Do not collect or store biometric templates.

## Document exceptions
Maintain a per-document requirement flag (none / contract-required / lender-required / law-required). For a required notarization, route to compliant notarization rather than allowing the normal electronic-signature flow to bypass it. Determine exceptions by actual contract, lender and applicable law. For AIA G702/G703, do not silently remove contractual form language or misrepresent modified forms as unmodified AIA documents.

## Release controls
No placeholder signature images, typed names or client-only success flags may mark a document as signed. Server must verify authentication, authority, document hash, OTP and passkey assertion before sealing. Disable release until backend credential enrollment, verification, signing certificate, consent/retention, multi-party signing and end-to-end tests are deployed and verified.

Tracking: #18 and integrated release #16.
