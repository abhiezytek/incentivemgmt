# Wave 3 Route Scope

> Documents the exact Node.js routes migrated in Wave 3.
> Wave 3 = Workflow & operational action endpoints.

## Review & Adjustments (server/src/routes/reviewAdjustments.js)

| # | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Screen | Priority |
|---|----------|------|---------|-----|---------------|-----------------|----------|
| 1 | `GET /api/review-adjustments` | GET | List results with aggregated adjustments + summary cards | READ | None | Review & Adjustments | P3 |
| 2 | `GET /api/review-adjustments/:id` | GET | Single result detail with adjustments + audit trail | READ | None | Review detail drawer | P3 |
| 3 | `POST /api/review-adjustments/:id/adjust` | POST | Apply manual adjustment (additive) | WRITE | None (additive only) | Adjustment drawer | P3 |
| 4 | `POST /api/review-adjustments/:id/hold` | POST | Place result on hold (additive HOLD record) | WRITE | None (virtual status via EXISTS) | Review list actions | P3 |
| 5 | `POST /api/review-adjustments/:id/release` | POST | Release held result (additive RELEASE record) | WRITE | None (clears virtual hold) | Review list actions | P3 |
| 6 | `POST /api/review-adjustments/batch-approve` | POST | Batch approve DRAFT results (excludes held/gate-failed) | WRITE | DRAFT → APPROVED | Batch approve button | P3 |
| 7 | `GET /api/review-adjustments/:id/audit` | GET | Get audit trail (actions + adjustments) | READ | None | Audit trail panel | P3 |

## Exception Log (server/src/routes/exceptionLog.js)

| # | Endpoint | HTTP | Purpose | R/W | Status Impact | Frontend Screen | Priority |
|---|----------|------|---------|-----|---------------|-----------------|----------|
| 8 | `GET /api/exception-log` | GET | List exceptions with summary cards | READ | None | Exception Log | P3 |
| 9 | `GET /api/exception-log/:id` | GET | Single exception detail | READ | None | Exception detail | P3 |
| 10 | `POST /api/exception-log/:id/resolve` | POST | Resolve or dismiss exception | WRITE | OPEN → RESOLVED/DISMISSED | Exception actions | P3 |

## Auth Middleware

All Wave 3 routes use `userAuth` middleware in Node.js. This middleware is currently a **placeholder** that passes all requests through without enforcement. The .NET controllers match this behavior — no auth enforcement is applied. When real auth is added, policies should be:
- **Read endpoints**: Any authenticated user
- **Adjust/hold/release**: Ops or Admin role
- **Batch approve**: Admin role
- **Resolve exception**: Ops or Admin role

## Key Design Notes

1. **HOLD is a virtual status** — Not stored in ins_incentive_results.status. Instead detected via EXISTS on un-released HOLD adjustments.
2. **Adjustments are additive** — Never modify base calculated values. Stored in separate `incentive_adjustments` table.
3. **Audit trail is additive** — All actions recorded in `incentive_review_actions` table.
4. **Exception resolution** — Only updates `operational_exceptions` table. Does NOT affect incentive result status or payout workflow.
5. **Batch approve** — Only mutation to `ins_incentive_results` (status = 'APPROVED'). Excludes held results and gate-failed results.
