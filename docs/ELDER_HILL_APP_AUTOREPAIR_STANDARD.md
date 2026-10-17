# Elder Hill Apps · AI self-repair acceptance standard (2026-10-17)

## Mandatory for every application and release
A user should be able to continue working whenever a safe recovery is possible. Every application must detect, diagnose, record, route, verify and close software incidents. **Not every defect can be safely repaired in place.** The AI may diagnose and draft a patch, but may not execute untrusted code or overwrite production source/data.

### Contract
1. Capture uncaught browser/runtime failures, promise rejections, API 5xx, failed jobs, unsuccessful transactions, validation mismatches, and direct user reports; attach only a redacted message, component, app version, route, user/account-scoped identifier, and correlation ID. Never collect passwords, tokens, documents, credit cards, unredacted PII, or financial transaction bodies in telemetry.
2. Save incidents to durable, access-controlled storage with organization/user boundaries, deduplication, rate limits, severity, status, timeline and retention. Client queues must not count as durable incident storage.
3. Classify user/business impact and diagnose using a server-side configured model. Treat model output as untrusted advice with a strict action allowlist. AI outage must not break the app or erase the incident.
4. **Immediate self-healing:** allow one bounded retry ONLY for idempotent reads (GET/HEAD) on transient statuses 408, 502, 503, 504, from the same application origin, or a known validated recovery handler. Verify the action actually succeeded before telling the user it is repaired. Never auto-replay writes, permission changes, pay apps, signatures, invoices, emails, reservations or payments.
5. **Code defects:** prepare a sanitized repair brief linked to the code/build, propose a scoped change on a protected branch, run unit/integration/security/regression tests, and verify in staging. The AI may open a pull request if the code-agent integration is explicitly configured; it must not merge or deploy itself to live environments. Risky changes require a human administrator.
6. A release only moves an incident to `verified` after CI evidence, authenticated end-to-end acceptance, deployed commit identification, and post-release smoke tests. A failed patch must roll back safely, leave an audit record, and reopen the incident.
7. Admin dashboard must offer incident queue, severity, affected app/build, AI diagnosis confidence, user-facing status, patch link, tests, audit, resolved date, and duplicate frequency. Users may submit/report problems and see acknowledgment; they must not access other users' incident details.

### Required lifecycle
New → AI Diagnosing → Recovery Attempted (if allowlisted) **or** Needs Admin / Patch Ready → Testing → Verified. Failure returns to Needs Admin or Patch Ready. Closed-unreproduced requires evidence and does not count as verified repair.

### Production acceptance evidence (per app)
- [ ] Browser exception, rejected promise, 500/timeout and background job failure each create an authenticated incident.
- [ ] Authentication/role isolation tests: user cannot read another organization's incidents or mark a repair verified.
- [ ] Recovered GET test and tests proving POST/PATCH/PUT/DELETE never auto-replay.
- [ ] AI redaction and adversarial-input test; model cannot issue shell commands, SQL or production deployments.
- [ ] Incident queue survives refresh and network interruption.
- [ ] A real application defect produces a traceable patch PR with CI, staging and rollback.
- [ ] Build/release monitoring confirms actual deployed version and defect closure.
- [ ] Recheck financial, permission, signature, billing, accounting and notification flows after every relevant repair.
- [ ] Admin approval is recorded where required; public impact/risk assessed.
- [ ] Data retention job, monitoring alerts and alert-delivery audits are verified.

## Rollout status at standard adoption
**TotalConstruct OS:** existing incident capture/dashboards; safe same-origin GET transient retry on review branch. Automatic AI code generation/PR dispatch, production evidence-gated closeout and complete end-to-end acceptance still open.

**Blackridge Intelligence:** authenticated incident API, bounded AI triage, manual report widget, read-recovery, admin dashboard and protected SQL schema proposed on review branch. Migration, secrets, real-user acceptance, CI, deployment, code-agent PR dispatch and verified closeout still open.

**Other Vercel or external products:** not implemented merely by adding this document. Separate integration/release evidence required for each codebase, including FocusStreak, ShiftIQ and any other Elder Hill Apps property. Never label an application protected until it passes the above acceptance tests.

## Ownership & release policy
Elder Hill Apps is the portfolio owner; individual products enforce their own identity/organization rules. No cross-tenant incident disclosure. Code corrections to live applications require standard release authorization; emergency rollback is separate from AI patch deployment. Database schema changes must be reviewed and backed up before applying.
