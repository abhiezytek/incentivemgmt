# Wave 3 Auth Parity

> Documents auth/role behavior for Wave 3 workflow endpoints.

## Current Node.js Auth Behavior

All Wave 3 routes in Node.js use the `userAuth` middleware:

```javascript
// server/index.js
app.use('/api/v1/review-adjustments', userAuth, reviewAdjustmentsRouter);
app.use('/api/v1/exception-log',      userAuth, exceptionLogRouter);
```

**Important**: The `userAuth` middleware in Node.js is currently a **placeholder** that passes all requests through without enforcement. There is no actual authentication or authorization check happening.

## .NET Implementation

The .NET controllers match this behavior exactly — **no auth enforcement is applied**. When real authentication is implemented in a future phase, the following role policies should be considered:

### Recommended Role Matrix (for future implementation)

| Endpoint | Suggested Access | Notes |
|----------|-----------------|-------|
| `GET /api/review-adjustments` | Any authenticated user | Read-only list |
| `GET /api/review-adjustments/:id` | Any authenticated user | Read-only detail |
| `POST /api/review-adjustments/:id/adjust` | Ops, Admin | Modifies adjustments |
| `POST /api/review-adjustments/:id/hold` | Ops, Admin | Places hold on results |
| `POST /api/review-adjustments/:id/release` | Ops, Admin | Releases held results |
| `POST /api/review-adjustments/batch-approve` | Admin | Status transition (DRAFT→APPROVED) |
| `GET /api/review-adjustments/:id/audit` | Any authenticated user | Read-only audit trail |
| `GET /api/exception-log` | Any authenticated user | Read-only list |
| `GET /api/exception-log/:id` | Any authenticated user | Read-only detail |
| `POST /api/exception-log/:id/resolve` | Ops, Admin | Resolves exceptions |

### Current State

| Check | Node.js | .NET | Match |
|-------|---------|------|-------|
| Auth middleware present | userAuth (placeholder) | None (placeholder) | ✅ |
| Auth enforcement active | No | No | ✅ |
| Role-based access | No | No | ✅ |
| Token validation | No | No | ✅ |

## No Inconsistencies Found

Since both Node.js and .NET have no actual auth enforcement, there are no inconsistencies. When auth is implemented, the role matrix above should be applied consistently across both backends during the transition period.
