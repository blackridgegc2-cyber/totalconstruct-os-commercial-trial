# User Profile — Security & Authentication

## User-facing settings
- Verified mobile number (masked), verify/change using OTP and reauthentication.
- Signing verification preference: **Phone code + device passkey** (recommended), **Authenticator app + device passkey**, or **device passkey with approved step-up** where organization policy permits.
- Device verification: platform fingerprint / face recognition / screen lock through WebAuthn with user verification required. The app cannot reliably select a particular biometric modality or receive fingerprint/face data; the operating system controls the credential unlock.
- Enrolled passkeys/devices list, nickname, enrollment date, last used and revoke option.
- Recovery codes and supported account recovery with strict verification and audit trail.
- Security event history: enrollment, device removal, phone change, failed verification, signing events.

## User workflow
1. Profile → Security & Authentication → verify phone → register device passkey.
2. User selects preferred eligible method, subject to organization minimum-security policy.
3. At signature: verify document version, perform fresh step-up (phone OTP or authenticator), perform WebAuthn challenge with user verification, review exact PDF and explicitly Sign.
4. Signing service validates project authority, OTP, challenge, document hash and consent server-side; seals and retains signed copy and audit evidence.

## Required protections
- A saved preference is not proof of authentication. No client-side flags can bypass verification.
- Changing phone, passkeys or preference requires recent strong authentication and creates an audit event; apply recovery cooldown when needed.
- No raw biometric data or OTP stored in profile or signature record.
- Enforce one-time short-lived challenges, attempt limits, device revocation, session binding, replay prevention, project-scoped authorization and immutable evidence.
- Never promise fingerprint-only verification on hardware where the operating system offers PIN fallback; report it accurately as **device verification**.
- Preserve statutory, contractual or lender notarization exceptions separately.

## Launch acceptance
Tests must cover new enrollment, failed enrollment, unverified phone, preference changes, revoked device, account recovery, unauthorized device, expired/replayed OTP, changed PDF, role revocation, cross-project access, and signed-copy download.

Implementation status: **specification only**. This file does not establish working phone delivery, passkey enrollment, server-side signing, or database persistence. Track with #18 and #19.

## Multi-method fallback and preferences
- Permit each user to enroll **two or three** verified authentication methods, choose a primary method and rank secondary/tertiary fallback methods.
- Offer fallback only for **already enrolled** methods; do not permit enrollment or changing a fallback while an active signing challenge is underway.
- Supported method bundles: (1) verified phone OTP + platform passkey with user verification, (2) authenticator-app TOTP + platform passkey with user verification, (3) independent registered device passkey with user verification plus a risk-based additional factor where policy requires it.
- If an OTP channel fails, let the user switch to another enrolled equivalent-assurance bundle; invalidate the abandoned challenge and issue a new server-bound challenge for the same signer, project, document hash and action.
- A lone SMS code, email link, password or recovery code must never silently satisfy a two-factor signing policy.
- Recovery after losing all enrolled devices is a separate audited identity-recovery workflow, not a signature-approval shortcut. Require step-up and notify existing verified channels after security changes.
- Record method identifiers and challenge outcomes in the signature evidence, never secrets, codes, fingerprint images or biometric templates.
