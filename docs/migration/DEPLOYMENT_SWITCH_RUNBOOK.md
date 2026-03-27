# Deployment Switch Runbook

> Deployment configuration and procedures for the .NET 10 backend.

---

## Build & Publish

### Development
```bash
cd backend-dotnet
dotnet build
dotnet run --project src/Incentive.Api
# Runs on http://localhost:5001
```

### Production Publish
```bash
cd backend-dotnet
dotnet publish -c Release -o publish/
# Output: backend-dotnet/publish/
```

---

## Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string | `Host=db.prod;Port=5432;Database=incentivemgmt;Username=app;Password=xxx` |
| `Jwt__Secret` | JWT signing secret (min 32 chars) | `your-production-jwt-secret-at-least-32-characters` |
| `Jwt__SystemSecret` | System-to-system JWT secret | `your-system-jwt-secret-at-least-32-characters` |

### Optional (with defaults)

| Variable | Description | Default |
|----------|-------------|---------|
| `Jwt__Issuer` | JWT issuer claim | `IncentiveApi` |
| `Jwt__ExpiryHours` | Token lifetime in hours | `24` |
| `ASPNETCORE_URLS` | Listen URLs | `http://+:5001` |
| `ASPNETCORE_ENVIRONMENT` | Environment name | `Production` |

### Integration (if needed)

| Variable | Description |
|----------|-------------|
| `Sftp__Host` | SFTP server hostname |
| `Sftp__Port` | SFTP port (default 22) |
| `Sftp__Username` | SFTP username |
| `Sftp__Password` | SFTP password |
| `Integration__Hierarchy__ApiBase` | Hierarchy API URL |
| `Integration__Penta__ApiBase` | Penta API URL |
| `Integration__Export__SapCompanyCode` | SAP company code |
| `Integration__Export__OracleOperatingUnit` | Oracle operating unit |

---

## Health Check

```
GET /api/health
Response: { "status": "ok" }
Expected: HTTP 200
```

Use this for load balancer health checks and monitoring.

---

## Swagger/API Docs

Available only in Development environment:
```
GET /api/docs
```

In production, Swagger is disabled by default.

---

## Database

- **Same PostgreSQL database** as Node.js — no migration needed
- Connection string format: `Host=xxx;Port=5432;Database=incentivemgmt;Username=xxx;Password=xxx`
- Dapper is used for all data access (raw SQL, no ORM)

---

## Reverse Proxy (nginx example)

```nginx
server {
    listen 80;
    server_name api.incentive.yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Frontend Deployment

```bash
cd client
VITE_API_URL=https://api.incentive.yourdomain.com/api npm run build
# Deploy client/dist/ to static file server or CDN
```

---

## Monitoring Endpoints

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /api/health` | Health check | `200 { status: "ok" }` |
| `GET /api/system-status/summary` | System health (auth required) | `200` with status data |
| `GET /api/integration/status` | Integration health (auth required) | `200` with connection statuses |

---

## Rollback

1. Switch `VITE_API_URL` back to Node.js URL
2. Rebuild frontend: `cd client && npm run build`
3. Redeploy frontend
4. Restart Node.js if stopped

No database changes needed — both backends use the same schema.

---

## Startup Dependencies

| Dependency | Required | Notes |
|-----------|----------|-------|
| PostgreSQL | Yes | Must be running and accessible |
| JWT secrets configured | Yes | Will fail to start auth without secrets |
| Network access to DB | Yes | Connection string must be valid |
| SFTP server | No | Deferred — manual upload available |
| External APIs (Penta/Hierarchy) | No | Integration endpoints return stubs if unavailable |
