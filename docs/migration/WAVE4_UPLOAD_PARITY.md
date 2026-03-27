# Wave 4 Upload Parity

## Accepted File Types
- CSV only (validated via content type and extension)
- Max size: 20 MB (VAL_008)

## Upload Endpoints

| Endpoint | Node Source | .NET Controller | ON CONFLICT |
|---|---|---|---|
| POST /api/upload/policy-transactions | upload.js | UploadController | DO NOTHING |
| POST /api/upload/agents | upload.js | UploadController | ON CONFLICT (agent_code) DO UPDATE |
| POST /api/upload/persistency | upload.js | UploadController | None (insert) |
| POST /api/upload/incentive-rates | upload.js | UploadController | None (insert) |
| POST /api/upload/products | products.js | UploadController | ON CONFLICT (product_code) DO UPDATE |
| POST /api/upload/performance | performance.js | UploadController | None (insert) |

## Validation Rules Preserved
- **Persistency months**: Must be 13, 25, 37, 49, or 61 (VAL_010)
- **Date format**: YYYY-MM-DD (VAL_002)
- **Channel/region codes**: Resolved to IDs via lookup maps
- **Duplicate file check**: file_processing_log filename match (INT_003)
- **Required columns**: Validated against expected headers (VAL_007)

## Transaction Boundaries
- All bulk inserts wrapped in BEGIN/COMMIT/ROLLBACK
- Partial failure rolls back entire batch (matches Node.js)

## Error Reporting
- Returns { inserted, skipped, errors[] } matching Node.js shape
- Row-level errors captured in errors array
- File log entry created on success

## Column Mapping
- channel_code → channel_id (via channels table lookup)
- region_code → region_id (via ins_regions table lookup)
- parent_agent_code → parent_agent_id (via ins_agents lookup, agents upload only)
