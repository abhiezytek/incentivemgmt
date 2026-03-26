# Frontend API Switch Guide

> How to switch the React frontend from Node.js to .NET 10 backend.
> No frontend code changes required — only environment variable configuration.

---

## Current Architecture

```
[React Frontend (Vite)]
         │
         ▼
  VITE_API_URL env var
         │
    ┌────┴────┐
    │ Default │
    ▼         ▼
http://localhost:5000/api   (Node.js — DEPRECATED)
http://localhost:5001/api   (.NET 10 — CURRENT)
```

The React frontend uses Redux Toolkit Query (RTK Query) with a single configurable base URL:

**File: `client/src/store/apiSlice.js`**
```javascript
baseQuery: fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})
```

All API paths are relative (e.g., `/programs`, `/kpis`, `/payouts`). No absolute paths exist in the frontend code.

---

## What Changed

| Item | Before | After |
|------|--------|-------|
| Backend | Node.js Express (port 5000) | .NET 10 ASP.NET Core (port 5001) |
| API paths | `/api/programs`, `/api/kpis`, etc. | Same paths — no change |
| Response format | JSON (snake_case) | Same — JSON (snake_case) |
| Auth | Placeholder (pass-through) | JWT Bearer (login required) |
| Frontend code | `apiSlice.js` | **No change needed** |
| Configuration | `VITE_API_URL` env var | Set to .NET API URL |

---

## Local Development

### Option 1: Create `.env.local` (recommended)

```bash
cd client
echo "VITE_API_URL=http://localhost:5001/api" > .env.local
npm run dev
```

### Option 2: Inline environment variable

```bash
cd client
VITE_API_URL=http://localhost:5001/api npm run dev
```

### Start .NET Backend

```bash
cd backend-dotnet/src/Incentive.Api
dotnet run
# Runs on http://localhost:5001 by default
```

---

## UAT Switch

1. Set `VITE_API_URL` in the build environment to point to the UAT .NET API URL:
   ```
   VITE_API_URL=https://uat-api.incentive.yourdomain.com/api
   ```

2. Build the frontend:
   ```bash
   cd client && npm run build
   ```

3. Deploy the `client/dist/` output to the static file server.

---

## Production Switch

1. Set `VITE_API_URL` in the production build environment:
   ```
   VITE_API_URL=https://api.incentive.yourdomain.com/api
   ```

2. Build the frontend:
   ```bash
   cd client && npm run build
   ```

3. Deploy the `client/dist/` output.

---

## Rollback Approach

If issues are found after switching to .NET:

1. Set `VITE_API_URL` back to Node.js URL:
   ```
   VITE_API_URL=http://localhost:5000/api
   ```

2. Rebuild the frontend:
   ```bash
   cd client && npm run build
   ```

3. Redeploy.

**Rollback is instant** — no database changes, no schema differences, same PostgreSQL database used by both backends.

---

## Auth Considerations

After switching to .NET, the frontend will receive `401 Unauthorized` responses on protected endpoints if no JWT token is provided. The frontend should:

1. Call `POST /api/auth/login` with `{ email, password }` to get a token
2. Include `Authorization: Bearer <token>` on all subsequent requests
3. Handle 401 responses by redirecting to login

> **Note:** If the frontend doesn't have a login flow yet (because Node.js was using placeholder auth), a login page/component will need to be added to the React app. This is a frontend enhancement, not a backend blocker.

---

## Environment Files Reference

| File | Purpose |
|------|---------|
| `client/.env.example` | Template for VITE_API_URL |
| `client/.env.local` | Local dev overrides (not committed) |
| `.env.example` | Backend environment template |
