# Error Code Reference

> Complete error code reference for the **Insurance Incentive Management System** API.

Every error response follows this shape:

```json
{
  "success": false,
  "error": "Human-readable message",
  "code": "AUTH_001",
  "details": null
}
```

---

## Authentication Errors (AUTH_xxx)

| Code | HTTP | Message | Description | Resolution |
|------|------|---------|-------------|------------|
| AUTH_001 | 401 | Authentication token is required | No `Authorization` header or `Bearer` token was provided in the request. | Include `Authorization: Bearer <token>` in the request header. Obtain a token from `POST /api/auth/system-token` or the user-login endpoint. |
| AUTH_002 | 401 | Token has expired | The JWT `exp` claim is in the past. System tokens expire after 24 h by default. | Request a new token from the appropriate auth endpoint. |
| AUTH_003 | 401 | Token is invalid | The JWT signature verification failed or the token is malformed. | Ensure the token was issued by this server and has not been tampered with. Check for copy-paste errors. |
| AUTH_004 | 403 | Insufficient permissions | The authenticated principal does not have the required role for this action. | Verify the user/client has the correct role. Contact an administrator to update permissions. |
| AUTH_005 | 401 | System client not found | The `client_id` in the token request does not match any row in `api_clients`. | Check the `client_id` value. Register the client in the `api_clients` table if it is a new integration. |
| AUTH_006 | 403 | System client is inactive | The `api_clients` row exists but `is_active = false`. | Activate the client in the `api_clients` table (`UPDATE api_clients SET is_active = true WHERE client_id = '...'`). |
| AUTH_007 | 403 | Endpoint not permitted for this client | The requested endpoint is not listed in `allowed_endpoints` for this system client. | Add the endpoint pattern to the client's `allowed_endpoints` array in the `api_clients` table. |

---

## Validation Errors (VAL_xxx)

| Code | HTTP | Message | Description | Resolution |
|------|------|---------|-------------|------------|
| VAL_001 | 400 | Required field missing | A mandatory field was not supplied or was `null`/empty. The `details` property names the missing field. | Include the required field in the request body or query string. Refer to the OpenAPI spec for required fields. |
| VAL_002 | 400 | Invalid date format (expected YYYY-MM-DD) | A date value could not be parsed. The system expects ISO 8601 date strings. | Send dates as `YYYY-MM-DD` (e.g. `2026-01-01`). |
| VAL_003 | 400 | Invalid enum value | A field value is not in the set of allowed values. The `details` property lists accepted values. | Use one of the values listed in the OpenAPI spec `enum` definition for that field. |
| VAL_004 | 400 | Value out of allowed range | A numeric value is below the minimum or above the maximum. | Check the allowed range for the field in the API documentation and correct the value. |
| VAL_005 | 409 | Duplicate record | A unique constraint would be violated (e.g. duplicate agent code, duplicate KPI name for the same program). | Check for existing records before inserting. Use the appropriate GET endpoint to verify uniqueness. |
| VAL_006 | 400 | Referenced record not found | A foreign-key reference points to a row that does not exist (e.g. `program_id` not in `ins_programs`). | Verify the referenced ID exists by calling the corresponding GET endpoint first. |
| VAL_007 | 400 | CSV missing required columns | An uploaded CSV file does not contain one or more required header columns. The `details` property lists the missing columns. | Compare your CSV headers with the expected template. See `POST /api/upload/*` documentation. |
| VAL_008 | 413 | File too large (max 20 MB) | The uploaded file exceeds the 20 MB size limit enforced by Multer. | Reduce the file size or split the data into multiple uploads. |
| VAL_009 | 400 | Invalid file type (CSV only) | The uploaded file does not have a `.csv` extension or MIME type. | Ensure the file is saved as `.csv` with the correct content type (`text/csv`). |
| VAL_010 | 400 | Persistency month must be 13, 25, 37, 49, or 61 | The `persistency_month` value is not one of the standard policy-year checkpoints. | Use one of the accepted values: 13 (Year 1), 25 (Year 2), 37 (Year 3), 49 (Year 4), 61 (Year 5). |

---

## Business Rule Errors (BUS_xxx)

| Code | HTTP | Message | Description | Resolution |
|------|------|---------|-------------|------------|
| BUS_001 | 422 | Program is not in ACTIVE status | The operation requires the program to be in `ACTIVE` status, but the current status is `DRAFT`, `CLOSED`, or `ARCHIVED`. | Activate the program first via `PUT /api/programs/:id` with `status: 'ACTIVE'`. |
| BUS_002 | 409 | Overlapping program date range for this channel | A program with the same channel already covers part of the requested date range. | Adjust the start/end dates so they do not overlap with existing programs for the same channel. |
| BUS_003 | 422 | Cannot modify APPROVED or PAID incentive result | Incentive results that have been approved or marked as paid are immutable. | If a correction is needed, reverse the approval first (if permitted) or create an adjustment entry. |
| BUS_004 | 404 | Agent not found in hierarchy system | The agent code does not exist in `ins_agents` or the agent hierarchy. | Upload the agent via CSV or wait for the next hierarchy-sync job. Verify the agent code is correct. |
| BUS_005 | 409 | Incentive already calculated for this period | A calculation run has already been completed for this program + period combination. | Use the recalculate endpoint (`POST /api/calculate/recalculate`) if results need to be regenerated. |
| BUS_006 | 422 | No payout rules defined for program | The program has no rows in `ins_payout_rules`, so the calculation cannot determine commission amounts. | Create payout rules via `POST /api/payouts/rules` before running calculations. |
| BUS_007 | 422 | No KPI rules defined for program | The program has no rows in `ins_kpi_rules`, so there are no targets to evaluate. | Create KPI rules via `POST /api/kpis` before running calculations. |
| BUS_008 | 422 | Agent license has expired | The agent's license expiry date is in the past. Regulations may prohibit incentive payments. | Update the agent's license information or exclude the agent from the calculation. |
| BUS_009 | 422 | Product is not active | The product referenced in the transaction is inactive and cannot be used for incentive calculation. | Activate the product or remove transactions referencing it before calculating. |
| BUS_010 | 422 | Cannot approve — persistency gate failed | The agent did not meet the minimum persistency threshold required for payout approval. | Review the agent's persistency data. The agent must meet the gate before approval can proceed. |

---

## Integration Errors (INT_xxx)

| Code | HTTP | Message | Description | Resolution |
|------|------|---------|-------------|------------|
| INT_001 | 502 | SFTP connection failed | The server could not establish an SSH/SFTP connection to the Life Asia AS400 host. | Verify `SFTP_HOST`, `SFTP_PORT`, `SFTP_USER`, and `SFTP_PRIVATE_KEY` in `.env`. Check network/firewall rules. |
| INT_002 | 404 | SFTP file not found | The expected file was not present on the SFTP server at the configured path. | Confirm the source system has generated the file. Check the remote directory path in the SFTP poller configuration. |
| INT_003 | 409 | File already processed (duplicate filename) | A file with the same name already exists in `file_processing_log` with status `COMPLETED`. | If the file truly contains new data, rename it with a unique suffix (e.g. timestamp) before re-uploading. |
| INT_004 | 422 | Staging validation failed | One or more rows in the staging table (`stg_policy_transactions` or `stg_agent_master`) failed validation. | Query the staging table for rows with `stg_status = 'ERROR'` and review the `stg_error` column for details. |
| INT_005 | 502 | Hierarchy API unreachable | The external Hierarchy API (`HIERARCHY_API_BASE`) did not respond or returned a non-2xx status. | Verify `HIERARCHY_API_BASE` in `.env`. Check the external service status and network connectivity. |
| INT_006 | 504 | Penta API request timed out | An inbound call to the Penta integration endpoint did not complete within the timeout window. | Retry the request. If the problem persists, check server load and database connection pool availability. |
| INT_007 | 500 | Export file generation failed | An error occurred while generating the outbound file (SAP FICO or Oracle AP). | Check server logs for the specific error. Common causes: missing data, disk space, or template issues. |
| INT_008 | 422 | SAP FICO format error | The data does not conform to the SAP FICO flat-file format specification. | Review the field mappings and data types. See [Outbound SAP FICO](./OUTBOUND_SAP_FICO.md) for the format spec. |
| INT_009 | 422 | Oracle AP format error | The data does not conform to the Oracle Financials AP interface format. | Review the field mappings and data types. See [Outbound Oracle Financials](./OUTBOUND_ORACLE_FINANCIALS.md) for the format spec. |

---

## Calculation Errors (CALC_xxx)

| Code | HTTP | Message | Description | Resolution |
|------|------|---------|-------------|------------|
| CALC_001 | 422 | No performance data found for agent and period | There are no policy transactions for the given agent code in the requested period. | Upload performance data via CSV or wait for the SFTP poller to ingest transactions. |
| CALC_002 | 422 | No incentive rate defined for product and channel | The `ins_incentive_rates` table has no matching row for the transaction's product + channel combination. | Upload incentive rates via `POST /api/upload/incentive-rates` before running calculations. |
| CALC_003 | 409 | Calculation already in progress for this program | A concurrent calculation run is active for the same program. Only one run is allowed at a time. | Wait for the current calculation to finish. Check status via `GET /api/calculate/status/:programId`. |
| CALC_004 | 422 | Target value is zero (division error) | A KPI rule has a `target_value` of 0, which would cause a division-by-zero in achievement calculation. | Update the KPI rule to set a non-zero `target_value`. |
| CALC_005 | 500 | Agent hierarchy path is corrupted | The `hierarchy_path` for an agent contains invalid data (e.g. circular reference or missing nodes). | Re-run the hierarchy sync job (`POST /api/integration/trigger/hierarchy-sync`) to rebuild hierarchy paths. |

---

## Error Response Examples

### Single error

```json
{
  "success": false,
  "error": "Required field missing",
  "code": "VAL_001",
  "details": "program_id is required"
}
```

### Validation error with multiple details

```json
{
  "success": false,
  "error": "CSV missing required columns",
  "code": "VAL_007",
  "details": ["agent_code", "premium_amount"]
}
```

### Integration error

```json
{
  "success": false,
  "error": "SFTP connection failed",
  "code": "INT_001",
  "details": "ECONNREFUSED 10.0.1.50:22"
}
```

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) — Full endpoint documentation
- [OpenAPI Spec](./openapi.yaml) — Machine-readable spec (Swagger UI at `/api/docs`)
- [Postman Guide](./POSTMAN_GUIDE.md) — Collection usage guide
- [Inbound Penta API](./INBOUND_PENTA_API.md) — Penta integration details
- [Outbound SAP FICO](./OUTBOUND_SAP_FICO.md) — SAP export format
- [Outbound Oracle Financials](./OUTBOUND_ORACLE_FINANCIALS.md) — Oracle AP export format
