# Auth Role / Policy Matrix

> Maps each endpoint group to its required authentication and authorization policies.

---

## Role Definitions

| Role | Description | Scope |
|---|---|---|
| `ADMIN` | System administrator | Full access to all endpoints and config |
| `FINANCE` | Finance team member | Payout, export, and financial review access |
| `OPS` | Operations team member | System monitoring, exception handling, config |
| `MANAGER` | Team/region manager | Config management, workflow approval |
| `AGENT` | Insurance agent | Read-only dashboard and notification access |

---

## Endpoint Authorization Matrix

| Endpoint Group | HTTP | Route Pattern | Auth Required | Allowed Roles | Policy | Notes |
|---|---|---|---|---|---|---|
| **Auth** | POST | `/api/auth/login` | No | Anonymous | AllowAnonymous | Login endpoint |
| **Auth** | GET | `/api/auth/me` | Yes | All authenticated | Authorize | Current user profile |
| **Health** | GET | `/api/health` | No | Anonymous | — | System health check |
| **Dashboard** | GET | `/api/dashboard/executive-summary` | Yes | All authenticated | Authorize | Executive KPI cards |
| **System Status** | GET | `/api/system-status/summary` | Yes | ADMIN, OPS | AdminOrOps | Operational monitoring |
| **Notifications** | GET | `/api/notifications` | Yes | All authenticated | Authorize | User notifications |
| **Notifications** | POST | `/api/notifications/:id/read` | Yes | All authenticated | Authorize | Mark notification read |
| **Notifications** | POST | `/api/notifications/mark-all-read` | Yes | All authenticated | Authorize | Mark all read |
| **Org Domain Mapping** | GET | `/api/org-domain-mapping` | Yes | ADMIN, OPS | AdminOrOps | Org structure view |
| **Programs** | GET | `/api/programs` | Yes | All authenticated | Authorize | List programs |
| **Programs** | GET | `/api/programs/:id` | Yes | All authenticated | Authorize | Program detail |
| **Programs** | GET | `/api/programs/:id/preview` | Yes | All authenticated | Authorize | Calculation preview |
| **Programs** | GET | `/api/programs/:id/summary` | Yes | All authenticated | Authorize | Program summary |
| **Programs** | POST | `/api/programs` | Yes | All authenticated | Authorize | Create program |
| **Programs** | PUT | `/api/programs/:id` | Yes | All authenticated | Authorize | Update program |
| **Programs** | PATCH | `/api/programs/:id/status` | Yes | All authenticated | Authorize | Status transition |
| **Programs** | DELETE | `/api/programs/:id` | Yes | All authenticated | Authorize | Delete (DRAFT only) |
| **KPI Config** | GET | `/api/kpi-config/registry` | Yes | ADMIN, OPS, MANAGER | ConfigManagers | KPI registry |
| **KPI Config** | POST | `/api/kpi-config/:id/validate` | Yes | ADMIN, OPS, MANAGER | ConfigManagers | Validate KPI |
| **KPI Config** | GET | `/api/kpi-config/:id/summary` | Yes | ADMIN, OPS, MANAGER | ConfigManagers | KPI summary |
| **Review Adjustments** | GET | `/api/review-adjustments` | Yes | ADMIN, OPS, FINANCE, MANAGER | WorkflowActors | List for review |
| **Review Adjustments** | GET | `/api/review-adjustments/:id` | Yes | ADMIN, OPS, FINANCE, MANAGER | WorkflowActors | Detail view |
| **Review Adjustments** | POST | `/api/review-adjustments/:id/adjust` | Yes | ADMIN, OPS, FINANCE, MANAGER | WorkflowActors | Apply adjustment |
| **Review Adjustments** | POST | `/api/review-adjustments/:id/hold` | Yes | ADMIN, OPS, FINANCE, MANAGER | WorkflowActors | Hold result |
| **Review Adjustments** | POST | `/api/review-adjustments/:id/release` | Yes | ADMIN, OPS, FINANCE, MANAGER | WorkflowActors | Release hold |
| **Review Adjustments** | POST | `/api/review-adjustments/batch-approve` | Yes | ADMIN, OPS, FINANCE, MANAGER | WorkflowActors | Batch approve |
| **Review Adjustments** | GET | `/api/review-adjustments/:id/audit` | Yes | ADMIN, OPS, FINANCE, MANAGER | WorkflowActors | Audit trail |
| **Exception Log** | GET | `/api/exception-log` | Yes | ADMIN, OPS | AdminOrOps | List exceptions |
| **Exception Log** | GET | `/api/exception-log/:id` | Yes | ADMIN, OPS | AdminOrOps | Exception detail |
| **Exception Log** | POST | `/api/exception-log/:id/resolve` | Yes | ADMIN, OPS | AdminOrOps | Resolve exception |

---

## Role Groups (Defined in `Roles.cs`)

| Group Name | Roles | Used By |
|---|---|---|
| `AdminOrOps` | ADMIN, OPS | SystemStatus, OrgDomainMapping, ExceptionLog |
| `ConfigManagers` | ADMIN, OPS, MANAGER | KpiConfig |
| `WorkflowActors` | ADMIN, OPS, FINANCE, MANAGER | ReviewAdjustments |
| `FinanceAccess` | ADMIN, FINANCE | (Reserved for payout/export endpoints) |
| `AllAuthenticated` | All 5 roles | General access |

---

## Implementation Details

- Authorization is implemented via `[Authorize]` and `[Authorize(Roles = "...")]` attributes
- Role claim is mapped from `System.Security.Claims.ClaimTypes.Role` in JWT
- JWT validation uses HS256 with configurable secret from `Jwt:Secret` in appsettings
- Anonymous endpoints use `[AllowAnonymous]` attribute
- 401 responses return `{ "error": "UNAUTHORIZED", "message": "Authentication is required" }`
- 403 responses return `{ "error": "FORBIDDEN", "message": "You do not have permission..." }`
