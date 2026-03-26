# Auth Parity and Hardening Assessment

> Compares Node.js and .NET authentication behavior to determine go-live readiness.

---

## Current State

### Node.js Authentication

| Middleware | File | Behavior |
|---|---|---|
| `userAuth` | `server/src/middleware/userAuth.js` | **Placeholder pass-through** — calls `next()` immediately with no validation |
| `systemAuth` | `server/src/middleware/systemAuth.js` | **Fully implemented** — JWT verification, api_clients lookup, endpoint authorization, last_used_at tracking |

### .NET Authentication

| Middleware | File | Behavior |
|---|---|---|
| `UserAuthMiddleware` | `backend-dotnet/src/Incentive.Api/Middleware/UserAuthMiddleware.cs` | **Placeholder pass-through** — calls `_next(context)` immediately with no validation |
| `SystemAuthMiddleware` | `backend-dotnet/src/Incentive.Api/Middleware/SystemAuthMiddleware.cs` | **Fully implemented** — JWT verification, api_clients lookup, endpoint authorization, last_used_at tracking |

---

## Parity Analysis

### userAuth: ✅ EXACT PARITY

Both Node.js and .NET have identical placeholder pass-through behavior:

**Node.js:**
```javascript
export default function userAuth(req, res, next) {
  // TODO: implement user authentication when login system is added
  next();
}
```

**C#:**
```csharp
public async Task InvokeAsync(HttpContext context)
{
    // TODO: Implement user authentication when login system is added
    await _next(context);
}
```

### systemAuth: ✅ EXACT PARITY

Both implementations follow the same 7-step flow:

| Step | Node.js | .NET | Match |
|---|---|---|---|
| 1. Extract Bearer token | `req.headers.authorization` | `context.Request.Headers.Authorization` | ✅ |
| 2. Verify JWT | `jwt.verify(token, secret)` | `JwtSecurityTokenHandler.ValidateToken()` | ✅ |
| 3. Validate payload (client_id, type=SYSTEM) | `payload.client_id`, `payload.type` | `FindFirst("client_id")`, `FindFirst("type")` | ✅ |
| 4. Lookup in api_clients | `query(SELECT ... WHERE client_id = $1)` | `conn.QueryFirstOrDefaultAsync(... WHERE client_id = @clientId)` | ✅ |
| 5. Check is_active | `client.is_active` | `(bool)client.is_active` | ✅ |
| 6. Check allowed_endpoints | `pattern.endsWith('/*')` matching | `pattern.EndsWith("/*")` matching | ✅ |
| 7. Fire-and-forget last_used_at | `pool.query(...).catch(...)` | `Task.Run(async () => { ... })` | ✅ |

Error codes match exactly:
- `MISSING_TOKEN`, `TOKEN_EXPIRED`, `INVALID_TOKEN`, `INVALID_TOKEN_PAYLOAD`, `UNKNOWN_CLIENT`, `CLIENT_DISABLED`, `ENDPOINT_NOT_ALLOWED`

---

## Auth Token Issuance (POST /api/auth/system-token)

| Aspect | Node.js | .NET |
|---|---|---|
| Endpoint exists | ✅ In `auth/systemToken.js` | ⚠️ Stub — documented as deferred |
| Token issuance needed | Only for external system clients (Penta, Life Asia) | Same |
| Current workaround | Tokens can be pre-generated and configured in external systems | Same approach works |

### Recommendation
- **Not a go-live blocker** — external system tokens can be pre-generated using any JWT tool with the configured `Jwt:SystemSecret`
- Implement token issuance endpoint post-go-live for operational convenience

---

## Hardening Decision

### Must Auth be completed before cutover?

**NO** — because:
1. userAuth is placeholder in BOTH Node.js and .NET (exact parity)
2. systemAuth is fully implemented in .NET (exact parity with Node.js)
3. Token issuance can be handled with pre-generated tokens
4. No user login system exists in either backend

### Recommended hardening sequence:
1. **Go-Live**: Current placeholder parity is acceptable
2. **Post-Go-Live Phase 1**: Implement token issuance endpoint for operational convenience
3. **Post-Go-Live Phase 2**: Design and implement user auth when login system is built
4. **Post-Go-Live Phase 3**: Add CORS restrictions and rate limiting

---

## Conclusion

| Auth Component | Parity | Blocker? |
|---|---|---|
| userAuth middleware | ✅ Exact | No |
| systemAuth middleware | ✅ Exact | No |
| System token issuance | ⚠️ Stub | No (pre-generate tokens) |
| User login/sessions | N/A | No (neither backend has it) |

**Verdict: Auth is NOT a go-live blocker. Parity is exact.**
