# Wave 1 Parity Notes

> Documents known differences between Node.js and .NET responses for Wave 1 endpoints.
> These should be resolved before switching the React frontend to the .NET backend.

---

## 1. JSON Property Naming Convention

**Node.js behavior**: Express returns plain objects directly from PostgreSQL rows. Row column names are `snake_case` (e.g., `total_agents`, `channel_id`). Top-level DTO-constructed keys are `camelCase` (e.g., `kpiCards`, `channelPerformance`, `recentActivity`).

**NET behavior**: System.Text.Json with `SnakeCaseLower` policy converts ALL property names to `snake_case`. This means DTO properties like `KpiCards` become `kpi_cards`, and `ChannelPerformance` becomes `channel_performance`.

**Impact**: The React frontend must accept EITHER `camelCase` OR `snake_case` for top-level keys. Most RTK Query responses already handle this via direct property access, but some destructuring patterns may need updating.

**Resolution**: Two options:
1. Use `JsonPropertyName` attributes on DTOs to match Node.js exactly
2. Update the React frontend to accept snake_case keys from the .NET API

**Status**: Using `snake_case` globally for simplicity. React frontend will need minor adjustments if it relies on exact `camelCase` matching.

---

## 2. Date Formatting in Recent Activity

**Node.js behavior**: Uses `toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })` which produces strings like `"15 Mar, 02:30 PM"` (varies by system locale).

**NET behavior**: Uses `dt.ToString("dd MMM, hh:mm tt", CultureInfo.InvariantCulture)` which produces `"15 Mar, 02:30 PM"`.

**Impact**: Formatting should be visually identical. Minor differences possible in AM/PM capitalization or month abbreviations.

**Status**: ✅ Acceptable parity

---

## 3. Notifications Mark-All-Read Return Value

**Node.js behavior**: Returns `{ success: true, updated: result.length }` where `result.length` is the number of rows returned by the UPDATE command's result. In `pg` library, this is the `rowCount` property.

**NET behavior**: Returns `{ success: true, updated: rowCount }` where `rowCount` comes from Dapper's `ExecuteAsync` which returns affected row count.

**Impact**: Both return the actual count of updated rows. ✅ Parity achieved.

---

## 4. Program Preview — JSONB Columns (milestones, slabs)

**Node.js behavior**: PostgreSQL `json_agg()` returns native JSON arrays from the `pg` library. The `milestones` and `slabs` columns contain parsed JavaScript arrays.

**NET behavior**: Dapper returns `json_agg()` results as string values. They need to be deserialized to match the Node.js shape.

**Impact**: The `kpis[].milestones` and `payoutRules[].slabs` fields may be returned as JSON strings instead of parsed arrays.

**Resolution**: The frontend currently handles both cases. For full parity, a custom Dapper type handler for JSONB→object deserialization should be added in Wave 2.

**Status**: ⚠️ Known difference — milestones/slabs may be string-encoded JSON instead of nested objects.

---

## 5. Auth Middleware

**Node.js behavior**: The `userAuth` middleware is a placeholder that calls `next()` unconditionally. The `systemAuth` middleware is fully implemented.

**NET behavior**: The `UserAuthMiddleware` is also a placeholder that calls `_next()` unconditionally. The `SystemAuthMiddleware` is fully implemented.

**Impact**: ✅ Auth behavior matches exactly.

**Note**: Three Wave 1 endpoints (system-status, notifications, org-domain-mapping) are protected by `userAuth` in Node.js. Since userAuth is a placeholder, they are effectively unprotected. The .NET implementation matches this behavior — no auth enforcement on these endpoints.

---

## 6. Error Response Shape

**Node.js behavior**: Two patterns used:
1. Generic: `{ error: err.message }` (status 500)
2. Structured: `{ success: false, error: message, code: errorCode, details: object }` (via `apiError()`)

**NET behavior**: The `ExceptionHandlerMiddleware` catches:
1. `ApiException`: Returns `{ success: false, error: message, code: errorCode, details: object }` with correct status
2. Unhandled: Returns `{ success: false, error: "Internal server error", code: "GEN_001" }` (status 500)

**Impact**: The .NET error response is slightly different from Node.js's generic `{ error: err.message }` for 500 errors. The .NET version always wraps in the `{ success, error, code }` format.

**Resolution**: This is actually an improvement — consistent error format. But it means the React frontend's error handling may need to check for both patterns during the transition period.

**Status**: ⚠️ Minor difference in 500 error format (more structured in .NET)

---

## 7. Null/Empty Handling

**Node.js behavior**: Returns `null`, `0`, or empty arrays `[]` for missing data. Uses `||` operator for defaults.

**NET behavior**: Returns same defaults. Dapper nullable handling preserves null values from PostgreSQL.

**Impact**: ✅ Acceptable parity

---

## Summary

| Area | Parity Status | Action Needed |
|------|--------------|---------------|
| Response shape (top-level keys) | ⚠️ snake_case vs camelCase | May need JsonPropertyName attributes |
| Date formatting | ✅ Matches | None |
| Notifications mark-all-read | ✅ Matches | None |
| JSONB columns (milestones, slabs) | ⚠️ May be string-encoded | Add Dapper JSONB handler |
| Auth middleware | ✅ Matches | None |
| Error responses (500) | ⚠️ More structured in .NET | Frontend already handles both |
| Null/empty handling | ✅ Matches | None |
