# Auth Current State Analysis

> Detailed analysis of authentication behavior in both Node.js and .NET backends.

---

## 1. Login Flow

### Node.js
- **No user login endpoint exists** — `userAuth` middleware is a placeholder that calls `next()` without validation
- System-to-system auth is available via `POST /api/auth/system-token` (issues JWT for API clients)
- System auth middleware (`systemAuth.js`) validates JWT Bearer tokens against `SYSTEM_JWT_SECRET`

### .NET (After Hardening)
- **User login implemented**: `POST /api/auth/login` — validates email/password against `users` table, returns JWT
- **Current user endpoint**: `GET /api/auth/me` — returns authenticated user's profile
- System auth middleware (`SystemAuthMiddleware.cs`) preserved as-is (exact parity with Node.js)
- JWT Bearer authentication enabled globally with configurable issuer/audience/signing key

---

## 2. Token Source

| Token Type | Node.js | .NET |
|---|---|---|
| User JWT | ❌ Not implemented | ✅ Issued by `POST /api/auth/login` |
| System JWT | Issued by `POST /api/auth/system-token` | Preserved (system auth middleware) |
| Token Validation | `jsonwebtoken` library | `Microsoft.AspNetCore.Authentication.JwtBearer` |
| Signing Algorithm | HS256 | HS256 |
| Token Lifetime | 24 hours (system) | Configurable via `Jwt:ExpiryHours` (default 24h) |

---

## 3. Claims / Roles Used

### User Schema (PostgreSQL `users` table)
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(30) DEFAULT 'AGENT',  -- ADMIN, MANAGER, AGENT, FINANCE, OPS
  channel_id INT REFERENCES channels(id),
  is_active BOOLEAN DEFAULT TRUE
);
```

### JWT Claims (User Token)
| Claim | Type | Source |
|---|---|---|
| `user_id` | Custom | `users.id` |
| `email` | Custom | `users.email` |
| `name` | Custom | `users.name` |
| `role` | Custom | `users.role` |
| `http://schemas.microsoft.com/ws/2008/06/identity/claims/role` | Standard | `users.role` (for `[Authorize(Roles=...)]`) |
| `channel_id` | Custom (optional) | `users.channel_id` |

### Defined Roles
| Role | Seed Users | Access Level |
|---|---|---|
| `ADMIN` | Rajesh Kumar, Priya Nair | Full access to all endpoints |
| `FINANCE` | Suresh Finance | Finance-sensitive endpoints (payouts, exports) |
| `OPS` | Meena Ops | Operational monitoring, exception management |
| `MANAGER` | Arjun Manager | Config management, workflow actions |
| `AGENT` | (default role) | Read-only dashboard and notifications |

---

## 4. Protected Route Groups

| Endpoint Group | Controller | Required Role(s) | Notes |
|---|---|---|---|
| Dashboard | DashboardController | Any authenticated | `[Authorize]` |
| System Status | SystemStatusController | ADMIN, OPS | `[Authorize(Roles = "ADMIN,OPS")]` |
| Notifications | NotificationsController | Any authenticated | `[Authorize]` |
| Org Domain Mapping | OrgDomainMappingController | ADMIN, OPS | `[Authorize(Roles = "ADMIN,OPS")]` |
| Programs | ProgramsController | Any authenticated | `[Authorize]` |
| KPI Config | KpiConfigController | ADMIN, OPS, MANAGER | `[Authorize(Roles = "ADMIN,OPS,MANAGER")]` |
| Review Adjustments | ReviewAdjustmentsController | ADMIN, OPS, FINANCE, MANAGER | `[Authorize(Roles = "ADMIN,OPS,FINANCE,MANAGER")]` |
| Exception Log | ExceptionLogController | ADMIN, OPS | `[Authorize(Roles = "ADMIN,OPS")]` |
| Auth (login) | AuthController | Anonymous | `[AllowAnonymous]` |
| Auth (me) | AuthController | Any authenticated | `[Authorize]` |
| Health | Minimal API | Anonymous | No auth required |

---

## 5. Differences Between Node.js and .NET

| Aspect | Node.js | .NET | Gap |
|---|---|---|---|
| User auth middleware | Placeholder (pass-through) | JWT Bearer with role-based authorization | **Enhancement** — .NET is now ahead |
| User login endpoint | None | `POST /api/auth/login` | **Enhancement** — .NET adds this |
| Current user endpoint | None | `GET /api/auth/me` | **Enhancement** — .NET adds this |
| System auth | Fully implemented | Fully implemented (exact parity) | None |
| System token issuance | `POST /api/auth/system-token` | Preserved as stub | Deferred |
| Password hashing | bcryptjs | BCrypt.Net-Next | Compatible (same algorithm) |
| Token validation | jsonwebtoken | JwtBearer middleware | Equivalent |
| Role enforcement | None (userAuth is placeholder) | `[Authorize(Roles=...)]` | **Enhancement** |

---

## 6. Missing Pieces in .NET (Post-Hardening)

1. **System token issuance endpoint** — can be pre-generated; not blocking
2. **Refresh token flow** — not needed currently (24h tokens are sufficient)
3. **Password reset flow** — not part of current application
4. **Session management** — `user_sessions` table exists but is unused by either backend
5. **Rate limiting on login** — recommended for production but not blocking
6. **CORS restriction** — currently open (matches Node.js); should be tightened for production
