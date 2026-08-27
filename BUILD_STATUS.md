# Full Build Status

Current phase: **R1 release acceptance / final hardening**

Production/main remains unchanged while `full-build-r1` is verified.

## Automated gates
- [x] R1 static/syntax verification
- [x] Vercel preview deployment
- [x] Responsive phone/tablet navigation hardening
- [x] Role-aware navigation and Create permissions
- [x] Direct-navigation and action-handler authorization guards
- [x] Secure employee invite backend wiring
- [x] Project-scoped cloud persistence and merge-safe reopen
- [x] Company-scoped cloud persistence
- [x] Schedule and Pay App/SOV non-array persistence
- [x] Company assets/equipment scope separation
- [x] Executive/CPA tax, liquidity, overhead and capital-plan persistence
- [x] Safe Training/Sample acceptance harness
- [x] Cross-project isolation check and failure-safe acceptance cleanup

## Hands-on acceptance gate
- [ ] Sign in with management test account on preview
- [ ] Select Training / Sample project
- [ ] Run **R1 Acceptance Test** and receive PASS
- [ ] Create/edit/reopen representative operational records
- [ ] Switch between at least two projects and confirm no cross-project rollback
- [ ] Exercise representative View As roles and confirm allowed/restricted modules
- [ ] Verify employee invite end-to-end with a test recipient
- [ ] Verify phone/tablet field navigation, photo/report workflow and wide-table behavior on-device

## Promotion gate
- [ ] Hands-on acceptance evidence recorded
- [ ] PR #3 marked Ready for Review
- [ ] GitHub merge gate re-evaluated
- [ ] Merge to `main` only after acceptance passes
- [ ] Post-merge team-trial smoke test

Primary release rule: **do not promote R1 solely because CI is green; authenticated sample-project acceptance must also pass.**
