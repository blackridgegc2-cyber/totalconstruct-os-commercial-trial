# Total Construct progress and release tracking

## Where to look
- [Development tasks / durable queue](https://github.com/blackridgegc2-cyber/totalconstruct-os-commercial-trial/issues?q=is%3Aissue+label%3Atc-agent-task)
- [Active and draft code changes](https://github.com/blackridgegc2-cyber/totalconstruct-os-commercial-trial/pulls)
- [Progress report workflow](https://github.com/blackridgegc2-cyber/totalconstruct-os-commercial-trial/actions/workflows/totalconstruct-progress.yml)
- [Recovery controller workflow](https://github.com/blackridgegc2-cyber/totalconstruct-os-commercial-trial/actions/workflows/totalconstruct-recovery.yml)

The progress workflow creates downloadable markdown + JSON report artifacts. Task labels: tc-queued, tc-running, tc-retry, tc-blocked, tc-done. Closing an issue is not equivalent to passing production release gates. If no tasks are labeled, counts will show zero; **this is not 100% completion**.

## Required release dashboard categories
1. PM operations and role-based authorization
2. Construction accounting and G702/G703 pay applications
3. Scheduling and critical path
4. Preconstruction, procurement, bidding, contract and drawings workflows
5. Client/lender/architect collaboration, approvals, signatures
6. AI recognition, repair, regression controls
7. External integrations, observability, backup and deployment
8. Lead Generator connection (separate service, not a primary PM release blocker)

Each release item requires owner, acceptance criteria, tests, evidence links, integration dependencies and state. A signed release checklist must be created before calling the product production-ready.

## Important limitations
The status report counts tracked GitHub issues; it cannot infer percentage of underlying software functionality. The worker still requires endpoint, credentials, persistence and an actual verified recovery test. This workflow does not auto-approve, auto-merge, or deploy.
