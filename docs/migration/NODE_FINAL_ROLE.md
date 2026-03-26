# Node.js Final Role After Cutover

> Assessment of Node.js role after .NET 10 becomes the active business backend.

---

## Current Node.js Responsibilities

| Responsibility | Still Needed After Cutover? |
|---|---|
| Business API (75+ endpoints) | ❌ No — replaced by .NET 10 |
| System auth (JWT validation) | ❌ No — replaced by .NET auth |
| User auth (placeholder) | ❌ No — replaced by .NET JWT Bearer |
| Calculation engine | ❌ No — replaced by .NET CalculationService |
| CSV upload processing | ❌ No — replaced by .NET UploadController |
| Export generation | ❌ No — replaced by .NET ExportController |
| Background jobs (SFTP/hierarchy) | ❌ No — deferred; trigger endpoints in .NET |
| Database queries | ❌ No — replaced by Dapper repositories |
| Swagger API docs | ❌ No — replaced by Swashbuckle |
| Frontend serving (static files) | ⚠️ Depends — see below |

---

## Frontend Serving Assessment

### Option A: Vite Dev Server (Development)
The React frontend uses Vite for development:
```bash
cd client && npm run dev
```
Vite serves the frontend independently — no Node.js backend needed for dev.

### Option B: Static File Server (Production)
For production, the frontend is built as static files:
```bash
cd client && npm run build
# Output: client/dist/
```
These files can be served by:
- **nginx** (recommended for production)
- **CDN** (CloudFront, Cloudflare, etc.)
- **Azure Static Web Apps**
- **.NET static files middleware** (if desired)

### Option C: Node.js Express Static Serving
Node.js *could* serve the built frontend, but this is unnecessary overhead since:
- Vite handles development serving
- nginx/CDN handles production serving
- .NET can optionally serve static files

---

## Recommendation: **FULLY DECOMMISSION Node.js**

Node.js has **NO remaining purpose** after .NET cutover:

1. **Business API**: ✅ Replaced by .NET 10 (75+ endpoints)
2. **Auth**: ✅ Replaced by .NET JWT Bearer auth
3. **Frontend serving**: ✅ Handled by Vite (dev) and nginx/CDN (prod)
4. **Background jobs**: ⚠️ Deferred — trigger endpoints in .NET
5. **Database access**: ✅ Replaced by Dapper repositories

---

## Decommission Timeline

| Day | Action |
|-----|--------|
| 0 | Deploy .NET API, switch frontend `VITE_API_URL` |
| 0-7 | Keep Node.js running as hot standby (no traffic) |
| 7 | Confirm .NET stability, stop Node.js process |
| 14 | Remove Node.js from deployment pipeline |
| 30 | Archive Node.js business code |
| 60 | Delete archived code (optional) |

---

## What to Keep (Reference Only)

| Item | Reason |
|------|--------|
| `server/src/db/migrations/` | Database schema history |
| `server/package.json` | Dependency reference |
| `server/src/tests/` | Test reference for parity verification |

---

## Post-Decommission Architecture

```
[React Frontend]          [.NET 10 API]          [PostgreSQL]
  (Vite/nginx)      →    (ASP.NET Core)     →    (Same DB)
                          Port 5001
                          JWT Auth
                          Dapper + raw SQL
                          Swagger at /api/docs
```

Node.js is no longer part of the architecture.
