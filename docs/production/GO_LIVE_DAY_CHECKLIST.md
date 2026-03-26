# Go-Live Day Checklist

> Step-by-step checklist for production deployment of .NET 10 Incentive Management API.
> Last updated: March 2026

---

## Pre-Deployment (T-4 hours)

### Infrastructure
- [ ] Production server provisioned with .NET 10 runtime
- [ ] PostgreSQL production database accessible
- [ ] Reverse proxy (nginx/IIS/ALB) configured
- [ ] SSL certificate installed and valid
- [ ] DNS records updated or ready to switch

### Configuration
- [ ] `ASPNETCORE_ENVIRONMENT=Production` set
- [ ] `Jwt:Secret` set to strong value (≥32 chars, NOT placeholder)
- [ ] `Jwt:SystemSecret` set to strong value (≥32 chars, NOT placeholder)
- [ ] `ConnectionStrings:DefaultConnection` set to production DB
- [ ] `Cors:AllowedOrigins` set to production frontend domain(s)
- [ ] `AllowedHosts` restricted to production hostname(s)
- [ ] Integration secrets configured (Hierarchy API, Penta API)
- [ ] Logging configured for production (log aggregation endpoint)

### Database
- [ ] Database migrations applied
- [ ] Seed data verified (system clients in `api_clients` table)
- [ ] User accounts created in `users` table
- [ ] Connection pooling configured

---

## Deployment (T-0)

### Step 1: Deploy .NET API
- [ ] Publish application: `dotnet publish -c Release -o ./publish`
- [ ] Deploy to production server
- [ ] Start application
- [ ] Verify process is running

### Step 2: Health Check
- [ ] `GET /api/health` returns `{ "status": "ok" }` (HTTP 200)
- [ ] Response time < 500ms

### Step 3: Auth Smoke Test
- [ ] `POST /api/auth/login` with valid credentials returns JWT token
- [ ] `GET /api/auth/me` with token returns user profile
- [ ] Invalid token returns 401

### Step 4: Switch Frontend
- [ ] Set `VITE_API_URL` to production .NET API URL
- [ ] Deploy frontend build
- [ ] Verify frontend loads

---

## Post-Deployment Smoke Tests (T+15 min)

### Core Screens
- [ ] Dashboard loads with data
- [ ] Programs list page loads
- [ ] KPI Config screen loads
- [ ] Notifications screen loads

### CRUD Operations
- [ ] Create a test program (then delete it)
- [ ] View existing programs
- [ ] View program summary

### Workflow
- [ ] Review adjustments list loads
- [ ] Exception log list loads

### Data
- [ ] Agent list loads
- [ ] Product list loads

---

## Post-Deployment Validation (T+1 hour)

### Functional
- [ ] Full calculation run completes without errors
- [ ] Export generates CSV file
- [ ] Upload processes CSV without errors
- [ ] Approval workflow transitions work

### Performance
- [ ] API response times within SLA (< 2s for data queries, < 30s for calculations)
- [ ] No 5xx errors in logs
- [ ] Database connection pool healthy

### Monitoring
- [ ] Error rate < 0.1%
- [ ] Memory usage stable
- [ ] CPU usage within bounds

---

## Rollback Triggers

Initiate rollback if ANY of these occur:
- [ ] Health endpoint returns non-200 for > 5 minutes
- [ ] Auth completely broken (no logins possible)
- [ ] Data corruption detected
- [ ] Error rate > 5% sustained for > 10 minutes
- [ ] Critical business flow (calculation/export) completely broken

### Rollback Steps
1. Switch `VITE_API_URL` back to Node.js backend
2. Redeploy frontend
3. Verify Node.js backend is still running and healthy
4. Investigate .NET issues
5. Fix and re-attempt deployment

---

## Sign-Off

| Role | Name | Sign-Off Time |
|------|------|--------------|
| Tech Lead | | |
| QA Lead | | |
| Product Owner | | |
| DevOps | | |
