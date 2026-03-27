# Security Hardening Checklist

> Production security hardening for the .NET 10 Incentive Management API.
> Last updated: March 2026

---

## 1. JWT Secret Strength

| Item | Status | Notes |
|------|--------|-------|
| `Jwt:Secret` ≥ 32 characters | ✅ Enforced at startup | App refuses to start in non-Development if secret is placeholder or < 32 chars |
| `Jwt:SystemSecret` ≥ 32 characters | ✅ Enforced at startup | Same validation |
| Secrets stored in environment variables or vault | ⬜ Required | Use `DOTNET_Jwt__Secret` env var or Azure Key Vault / AWS Secrets Manager |
| Secrets NOT committed to source control | ✅ Enforced | appsettings.json has placeholder values only |
| Token expiry reduced for production | ✅ Template | appsettings.Production.json sets `ExpiryHours: 8` |

### Startup Guard
Program.cs now validates at startup (non-Development environments):
```csharp
if (jwtSecret.Length < 32 || jwtSecret == "your_jwt_secret_here")
    throw new InvalidOperationException("PRODUCTION SAFETY: Jwt:Secret must be set...");
```

---

## 2. CORS Policy

| Item | Status | Notes |
|------|--------|-------|
| Development: AllowAnyOrigin | ✅ | Matches Node.js behavior for local dev |
| Production: Restricted origins | ✅ Implemented | Reads `Cors:AllowedOrigins` array from config |
| AllowCredentials with specific origins | ✅ | Enabled when origins are specified |
| Warning logged if no origins configured | ✅ | Startup log warning in non-dev |

### Configuration
```json
// appsettings.Production.json
{
  "Cors": {
    "AllowedOrigins": ["https://incentive.yourdomain.com"]
  }
}
```

---

## 3. Swagger / API Docs

| Item | Status | Notes |
|------|--------|-------|
| Swagger disabled in Production | ✅ Implemented | Only enabled when `IsDevelopment()` |
| API docs not publicly accessible | ✅ | Swagger UI not mounted in prod pipeline |

---

## 4. Rate Limiting

| Item | Status | Notes |
|------|--------|-------|
| Auth endpoints rate-limited | ✅ | 10 req/min per IP (`auth` policy) |
| Heavy endpoints rate-limited | ✅ | 5 req/min per IP (`heavy` policy) |
| Upload endpoints rate-limited | ✅ | 10 req/min per IP (`upload` policy) |
| 429 response with JSON body | ✅ | Returns structured error JSON |

---

## 5. Database Connection

| Item | Status | Notes |
|------|--------|-------|
| SSL/TLS required in production | ⬜ Required | Set `SslMode=Require` in connection string |
| Connection pooling configured | ⬜ Recommended | Add `Maximum Pool Size=20;Minimum Pool Size=5` |
| Password not in source control | ✅ | Use environment variable override |

---

## 6. HTTPS / Transport

| Item | Status | Notes |
|------|--------|-------|
| HTTPS enforced in production | ⬜ Required | Configure via reverse proxy (nginx/Kestrel HTTPS) |
| HSTS headers | ⬜ Recommended | Add `app.UseHsts()` behind `!IsDevelopment()` check |
| AllowedHosts restricted | ✅ Template | appsettings.Production.json restricts hosts |

---

## 7. Logging

| Item | Status | Notes |
|------|--------|-------|
| Structured logging in production | ✅ | Uses built-in ASP.NET Core logging |
| Log level reduced for production | ✅ Template | Default=Warning, Incentive=Information |
| Sensitive data not logged | ✅ | JWT tokens/passwords not logged in middleware |

---

## 8. Error Handling

| Item | Status | Notes |
|------|--------|-------|
| Stack traces hidden in production | ✅ | ExceptionHandlerMiddleware returns generic message for unhandled errors |
| Error codes returned (not internal details) | ✅ | ApiException returns error code only |

---

## Pre-Deployment Checklist

- [ ] Set `Jwt:Secret` to a cryptographically strong value (≥32 characters)
- [ ] Set `Jwt:SystemSecret` to a different strong value (≥32 characters)
- [ ] Configure `Cors:AllowedOrigins` with actual production domain(s)
- [ ] Set `ConnectionStrings:DefaultConnection` with production DB credentials
- [ ] Enable SSL on database connection (`SslMode=Require`)
- [ ] Configure HTTPS termination (reverse proxy or Kestrel)
- [ ] Set `ASPNETCORE_ENVIRONMENT=Production`
- [ ] Verify Swagger is NOT accessible in production
- [ ] Verify health endpoint returns 200 at `/api/health`
- [ ] Run smoke tests against production endpoint
