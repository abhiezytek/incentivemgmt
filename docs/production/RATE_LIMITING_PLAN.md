# Rate Limiting Plan

> Rate limiting configuration for the .NET 10 Incentive Management API.
> Last updated: March 2026

---

## Overview

Rate limiting is implemented using ASP.NET Core's built-in `RateLimiter` middleware (no external packages required). Limits are applied per-IP using fixed window partitioning.

---

## Rate Limit Policies

### 1. `auth` — Authentication Endpoints

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Limit** | 10 requests/minute | Prevents brute-force login attempts |
| **Window** | 1 minute (fixed) | Standard auth protection window |
| **Partition** | Per remote IP | Isolates abuse to offending IP |
| **Queue** | 0 (no queueing) | Immediately reject excess requests |

**Applies to:**
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/system-token`

### 2. `heavy` — Calculation & Export Triggers

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Limit** | 5 requests/minute | These trigger expensive DB operations |
| **Window** | 1 minute (fixed) | Prevents accidental repeated triggers |
| **Partition** | Per remote IP | Isolates abuse |
| **Queue** | 0 | Immediately reject |

**Applies to:**
- `POST /api/v1/calculation/run`
- `POST /api/v1/calculation/run-single`
- `POST /api/v1/export/oracle-ap`
- `POST /api/v1/export/sap-fico`

### 3. `upload` — File Upload Endpoints

| Setting | Value | Rationale |
|---------|-------|-----------|
| **Limit** | 10 requests/minute | CSV uploads are resource-intensive |
| **Window** | 1 minute (fixed) | Allows reasonable batch processing |
| **Partition** | Per remote IP | Isolates abuse |
| **Queue** | 0 | Immediately reject |

**Applies to:**
- All `POST /api/v1/upload/*` endpoints

---

## How to Apply Rate Limits to Controllers

Add `[EnableRateLimiting("policy")]` attribute to controllers or individual actions:

```csharp
using Microsoft.AspNetCore.RateLimiting;

[ApiController]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase { ... }
```

Or per-action:
```csharp
[HttpPost("run")]
[EnableRateLimiting("heavy")]
public async Task<IActionResult> RunCalculation(...) { ... }
```

---

## Response on Rate Limit Exceeded

```json
HTTP 429 Too Many Requests
Content-Type: application/json

{
  "error": "RATE_LIMITED",
  "message": "Too many requests. Please try again later."
}
```

---

## Tuning Guidance

| Scenario | Adjustment |
|----------|-----------|
| High-traffic production | Increase `auth` to 20/min, `heavy` to 10/min |
| Under attack | Decrease `auth` to 5/min temporarily |
| Batch upload day | Increase `upload` to 30/min temporarily |
| Internal-only API | Consider removing rate limiting entirely |

---

## Monitoring

Monitor rate limiting via:
- HTTP 429 response count in access logs
- Application Insights / structured logging for `RATE_LIMITED` error code
- Reverse proxy logs (nginx 429 count)

---

## Future Enhancements

- [ ] Add sliding window or token bucket for smoother rate control
- [ ] Add per-user rate limiting (by JWT claim) instead of per-IP
- [ ] Add configurable limits via appsettings instead of hardcoded values
- [ ] Add rate limit headers (`X-RateLimit-Remaining`, `Retry-After`)
