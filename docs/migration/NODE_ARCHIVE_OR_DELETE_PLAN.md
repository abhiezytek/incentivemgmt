# Node.js Archive or Delete Plan

> Phased plan for safely archiving and deleting obsolete Node.js business code.
> Execute only after .NET 10 cutover is confirmed stable.

---

## Guiding Principles

1. **Never delete before parity is confirmed** — wait for stabilization
2. **Archive before delete** — move to archive/ first
3. **Keep rollback capability** — Node code remains until .NET is proven
4. **Document what was removed** — this file serves as the record

---

## Phase 1: Disable (Day 0-7)

### Actions
- Switch frontend `VITE_API_URL` to .NET API
- Keep Node.js process running (hot standby, no traffic)
- No code deletions

### Verification
- All frontend screens work with .NET
- No traffic reaching Node.js
- .NET error rate below 0.1%

---

## Phase 2: Stop Node Process (Day 7-14)

### Actions
- Stop Node.js process
- Remove Node.js from reverse proxy / load balancer
- Keep all Node code in repository

### Verification
- Frontend still works without Node.js running
- No downstream systems depend on Node API
- .NET stable for 7+ days

---

## Phase 3: Archive Node Business Code (Day 14-30)

### Actions
- Create `archive/node-business-backend/` directory
- Move the following files/directories:

```bash
mkdir -p archive/node-business-backend

# Move business routes
mv server/src/routes/ archive/node-business-backend/routes/

# Move middleware
mv server/src/middleware/ archive/node-business-backend/middleware/

# Move engine
mv server/src/engine/ archive/node-business-backend/engine/

# Move database layer
mv server/src/db/pool.js archive/node-business-backend/db/

# Move jobs
mv server/src/jobs/ archive/node-business-backend/jobs/

# Move entry point
mv server/index.js archive/node-business-backend/

# Keep reference files
# server/package.json — keep for dependency reference
# server/src/db/migrations/ — keep for schema history
# server/src/tests/ — keep for test reference
```

### Files to Keep in `server/`
| File | Reason |
|------|--------|
| `server/package.json` | Dependency reference |
| `server/src/db/migrations/` | Schema migration history |
| `server/src/tests/` | Test reference for parity verification |
| `server/src/config/` | Configuration reference |

---

## Phase 4: Delete Archived Code (Day 30-60)

### Actions
- After 30 days of confirmed .NET stability:
- Delete `archive/node-business-backend/` directory
- Clean up unused dependencies from `server/package.json` (or delete it)
- Update `.gitignore` if needed
- Remove Node.js from CI/CD pipeline

### Pre-Delete Verification
- [ ] .NET has been stable for 30+ days
- [ ] No user-reported issues
- [ ] No rollback needed in the past 30 days
- [ ] All business workflows verified
- [ ] Team agrees to permanent removal

---

## Files Summary

| Category | Files | Action | Timeline |
|----------|-------|--------|----------|
| Route files (28) | `server/src/routes/*` | Archive → Delete | Day 14 → Day 30 |
| Middleware (4) | `server/src/middleware/*` | Archive → Delete | Day 14 → Day 30 |
| Engine (1) | `server/src/engine/*` | Archive → Delete | Day 14 → Day 30 |
| Jobs (2) | `server/src/jobs/*` | Archive → Delete | Day 14 → Day 30 |
| DB layer (1) | `server/src/db/pool.js` | Archive → Delete | Day 14 → Day 30 |
| Entry point (1) | `server/index.js` | Archive → Delete | Day 14 → Day 30 |
| Migrations | `server/src/db/migrations/` | **KEEP** | Indefinite |
| Tests | `server/src/tests/` | **KEEP** | Until no longer useful |
| Package.json | `server/package.json` | **KEEP** | Until cleanup |

---

## Rollback During Any Phase

If issues are found and rollback is needed:

1. Restore archived files from `archive/node-business-backend/` back to `server/`
2. Start Node.js process
3. Switch `VITE_API_URL` back to Node URL
4. Rebuild and redeploy frontend
5. Investigate .NET issue

**Rollback is possible until Phase 4 (permanent deletion).**
