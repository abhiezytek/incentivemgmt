# Node.js Decommission Checklist

## Pre-Decommission Verification

### Routes Fully Migrated
- [x] Wave 1: Dashboard, SystemStatus, Notifications, OrgDomainMapping, Programs/preview (7 endpoints)
- [x] Wave 2: Programs CRUD + KPI Config (8 endpoints)
- [x] Wave 3: ReviewAdjustments + ExceptionLog (10 endpoints)
- [x] Wave 4: Uploads, Calculation, IncentiveResults, Export, Payouts, Integration, Data (50+ endpoints)

### Parity Tests
- [ ] All integration tests passing on .NET
- [ ] All regression tests passing on .NET
- [ ] Side-by-side parity runbook completed
- [ ] Calculation totals match within tolerance
- [ ] Export outputs match
- [ ] Status pipeline verified end-to-end

### UAT Signoff
- [ ] Business users verified review & adjustments workflow
- [ ] Business users verified calculation results
- [ ] Business users verified export outputs
- [ ] Business users verified approval workflow
- [ ] Formal UAT signoff document

### Frontend Verification
- [ ] React frontend pointing to .NET API
- [ ] All screens loading correctly
- [ ] All CRUD operations working
- [ ] All workflow actions working
- [ ] No console errors related to API responses

### Background Jobs
- [ ] SFTP poller running in .NET (or scheduled externally)
- [ ] Hierarchy sync running in .NET (or scheduled externally)

### Monitoring
- [ ] .NET API metrics stable for 1+ week
- [ ] Error rates below threshold
- [ ] Response times acceptable
- [ ] No data integrity issues detected

## Decommission Steps
1. [ ] Remove Node.js business routes from reverse proxy
2. [ ] Keep Node.js health check for 1 week
3. [ ] Stop Node.js process
4. [ ] Archive Node.js codebase
5. [ ] Update documentation
6. [ ] Remove Node.js from CI/CD pipeline
