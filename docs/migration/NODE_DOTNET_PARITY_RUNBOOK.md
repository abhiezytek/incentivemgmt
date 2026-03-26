# Node vs .NET Parity Runbook

## Prerequisites
- Both Node.js (port 5000) and .NET (port 5001) servers running
- Same PostgreSQL database connection
- Seed data loaded

## Side-by-Side Verification

### Step 1: Compare Read Endpoints
```bash
# Dashboard
diff <(curl -s http://localhost:5000/api/dashboard/executive-summary | jq -S) \
     <(curl -s http://localhost:5001/api/dashboard/executive-summary | jq -S)

# Incentive results
diff <(curl -s "http://localhost:5000/api/incentive-results?programId=1&periodStart=2026-01-01" | jq -S) \
     <(curl -s "http://localhost:5001/api/incentive-results?programId=1&periodStart=2026-01-01" | jq -S)

# Stage summary
diff <(curl -s "http://localhost:5000/api/incentive-results/stage-summary?programId=1" | jq -S) \
     <(curl -s "http://localhost:5001/api/incentive-results/stage-summary?programId=1" | jq -S)
```

### Step 2: Compare Calculation Totals
```bash
# Run calc on Node, capture result
NODE_RESULT=$(curl -s -X POST http://localhost:5000/api/calculate/run \
  -H 'Content-Type: application/json' \
  -d '{"programId":1,"periodStart":"2026-01-01","periodEnd":"2026-01-31"}')

# Run calc on .NET, capture result
DOTNET_RESULT=$(curl -s -X POST http://localhost:5001/api/calculate/run \
  -H 'Content-Type: application/json' \
  -d '{"programId":1,"periodStart":"2026-01-01","periodEnd":"2026-01-31"}')

# Compare key metrics
echo "Node total pool: $(echo $NODE_RESULT | jq .totalIncentivePool)"
echo ".NET total pool: $(echo $DOTNET_RESULT | jq .totalIncentivePool)"
```

### Step 3: Compare Export Outputs
```bash
# Generate Oracle export from both, diff CSV content
```

### Step 4: Compare Status Counts
```bash
# Stage summary from both servers should match exactly
```

## Pass/Fail Criteria
| Check | Pass Criteria |
|---|---|
| Read endpoints | JSON diff is empty (field order may vary) |
| Calculation totals | Total incentive pool matches within ±0.01 |
| Status counts | Exact match per status bucket |
| Export records | Same record count, same total amount |
| Approval flow | Same approved/skipped counts |
| Error responses | Same HTTP status codes and error codes |
