# Wave 4 Parity Gaps

## Known Gaps

### 1. Background Job Scheduling
- **Gap**: Node.js runs SFTP poller and hierarchy sync as in-process background jobs. .NET has trigger endpoints but no Quartz.NET scheduler yet.
- **Impact**: Manual triggering required until Quartz integration added
- **Mitigation**: Trigger endpoints work; can be called via external scheduler (cron/Azure Timer)

### 2. Auth/JWT
- **Gap**: Node.js POST /api/auth/system-token issues JWT tokens. .NET has placeholder auth middleware.
- **Impact**: System-to-system auth not enforced in .NET
- **Mitigation**: userAuth in Node.js is also a placeholder (passes through). Low risk.

### 3. SFTP Client
- **Gap**: Node.js uses ssh2-sftp-client for Life Asia file polling. .NET needs SSH.NET or similar.
- **Impact**: Automated file ingestion paused until SFTP client added
- **Mitigation**: Manual file upload via upload endpoints still works

### 4. Floating Point Precision
- **Gap**: JavaScript uses IEEE 754 doubles; .NET uses decimal for money calculations
- **Impact**: Potential sub-cent differences in calculation results
- **Mitigation**: .NET decimal is more precise; differences should be ≤ ±0.01

## No Gaps (Confirmed Parity)
- Status pipeline: DRAFT → APPROVED → INITIATED → PAID ✅
- Additive adjustment design ✅
- Gate-failed exclusion from approval ✅
- Hold/release behavior ✅
- Export eligibility filters ✅
- Audit trail logging ✅
- Upload validation rules ✅
- CSV export formatting (Oracle AP, SAP FICO) ✅
