# Wave 4 Jobs and Integrations

## Background Jobs

### SFTP Poller (Life Asia)
- **Node.js**: server/index.js → startSftpPollers()
- **.NET**: Placeholder trigger via POST /api/integration/trigger/sftp-poll
- **Status**: Trigger endpoint implemented; full SFTP client integration deferred to post-cutover
- **Note**: Requires external SFTP library (SSH.NET or similar)

### Hierarchy Sync
- **Node.js**: server/index.js → startHierarchySync()
- **.NET**: Placeholder trigger via POST /api/integration/trigger/hierarchy-sync
- **Status**: Trigger endpoint implemented; full HTTP client integration deferred to post-cutover
- **Note**: Requires external hierarchy API configuration

## Integration Endpoints

### Penta API
| Endpoint | Purpose | Status |
|---|---|---|
| POST /api/integration/penta/heartbeat | Health check + audit log | ✅ Migrated |
| POST /api/integration/penta/policy-data | Receive policy records → staging | ✅ Migrated |

### Life Asia
| Endpoint | Purpose | Status |
|---|---|---|
| POST /api/integration/lifeasia/notify | File notification webhook | ✅ Migrated |
| GET /api/integration/lifeasia/last-file | Last processed file metadata | ✅ Migrated |

### Monitoring & Control
| Endpoint | Purpose | Status |
|---|---|---|
| GET /api/integration/status | Multi-system health dashboard | ✅ Migrated |
| GET /api/integration/file-log | File processing history | ✅ Migrated |
| GET /api/integration/audit-log | API call audit trail | ✅ Migrated |
| GET /api/integration/failed-records | Failed staging records | ✅ Migrated |
| POST /api/integration/failed-records/{id}/skip | Mark record SKIPPED | ✅ Migrated |
| POST /api/integration/trigger/reprocess | Reset failed → PENDING | ✅ Migrated |

## Post-Cutover Tasks
1. Implement SSH.NET SFTP client for Life Asia polling
2. Implement HttpClient for hierarchy API sync
3. Add Quartz.NET scheduling for periodic jobs
4. Configure connection strings for external systems
