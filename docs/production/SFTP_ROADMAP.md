# SFTP Post-Go-Live Roadmap

> Implementation plan for SSH.NET-based SFTP support.
> Current fallback: manual CSV upload via API endpoints.
> Last updated: March 2026

---

## Current State

| Item | Status |
|------|--------|
| SSH.NET NuGet package | ✅ Already referenced (v2024.2.0) |
| SFTP configuration in appsettings | ✅ Already present |
| Manual upload endpoints | ✅ Fully functional |
| SFTP service implementation | ⬜ Not yet implemented |
| SFTP integration trigger | ✅ Endpoint exists (returns stub) |

---

## Manual Fallback (Current Go-Live Pattern)

Users upload CSV files manually via:
- `POST /api/v1/upload/agents` — Agent master data
- `POST /api/v1/upload/products` — Product catalog
- `POST /api/v1/upload/incentive-rates` — Rate tables
- `POST /api/v1/upload/performance` — Agent performance
- `POST /api/v1/upload/policy-transactions` — Policy data
- `POST /api/v1/upload/persistency` — Persistency data

---

## SFTP Implementation Plan

### Phase 1: Core SFTP Service (Week 1-2 post-go-live)

1. **Create `ISftpService` interface** in `Application/Abstractions/`
   ```csharp
   public interface ISftpService
   {
       Task<IReadOnlyList<string>> ListFilesAsync(string remotePath, CancellationToken ct);
       Task<Stream> DownloadFileAsync(string remotePath, CancellationToken ct);
       Task MoveFileAsync(string source, string destination, CancellationToken ct);
   }
   ```

2. **Create `SftpService` implementation** in `Infrastructure/ExternalServices/`
   - Use SSH.NET `SftpClient`
   - Read config from `Sftp:Host`, `Sftp:Port`, `Sftp:Username`, `Sftp:Password`
   - Connection pooling / retry logic
   - Move processed files to `/processed/` subdirectory

3. **Register in DI container**
   ```csharp
   services.AddScoped<ISftpService, SftpService>();
   ```

### Phase 2: File Processing Pipeline (Week 2-3)

1. **Create `SftpFileProcessor`** service
   - Poll SFTP `/inbound/lifeasia/` directory
   - Identify file type by naming convention (e.g., `AGENTS_*.csv`, `PRODUCTS_*.csv`)
   - Route to appropriate upload handler
   - Move processed files to `/processed/`
   - Log failures to `/failed/`

2. **Wire into trigger endpoint**
   - `POST /api/v1/integration/trigger/sftp-poll` calls `SftpFileProcessor`

### Phase 3: Automated Scheduling (Week 3-4)

1. Connect to external cron (immediate) or Quartz.NET (future)
2. Add monitoring alerts for SFTP connectivity failures
3. Add retry logic for transient failures

---

## Configuration Reference

```json
{
  "Sftp": {
    "Host": "sftp.yourserver.com",
    "Port": 22,
    "Username": "incentive_sys",
    "Password": "",
    "BasePath": "/inbound/lifeasia",
    "ProcessedPath": "/inbound/lifeasia/processed",
    "FailedPath": "/inbound/lifeasia/failed",
    "PollIntervalMinutes": 15,
    "MaxRetries": 3
  }
}
```

---

## Testing Plan

| Test | Type |
|------|------|
| SFTP connection with valid credentials | Integration |
| File listing from remote directory | Integration |
| File download and CSV parsing | Integration |
| File move after processing | Integration |
| Connection failure handling | Unit |
| Invalid credentials handling | Unit |
| Timeout handling | Unit |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| SFTP server unavailable | Manual upload remains as fallback |
| Large file processing timeout | Implement streaming download, not full-file load |
| Duplicate file processing | Track processed filenames in DB |
| Credential rotation | Support key-based auth in addition to password |
