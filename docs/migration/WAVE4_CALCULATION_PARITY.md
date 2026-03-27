# Wave 4 Calculation Parity

## Calculation Engines

### Insurance Calc Engine (insuranceCalcEngine.js → CalculationRepository.cs)

| Stage | Node.js Location | .NET Location | Parity |
|---|---|---|---|
| KPI Summary computation | insuranceCalcEngine.js:15-40 | CalculationSql.GetKpiSummary | ✅ |
| Product-wise NB incentive | insuranceCalcEngine.js:42-70 | CalculationSql.GetProductRates | ✅ |
| Renewal incentive | insuranceCalcEngine.js:72-85 | CalculationSql.GetRenewalRate | ✅ |
| Persistency gate check | insuranceCalcEngine.js:87-120 | CalculationSql.GetPersistencyGate | ✅ |
| MLM override calculation | insuranceCalcEngine.js:122-155 | CalculationSql.GetMlmOverrideRates | ✅ |
| Result persistence (UPSERT) | insuranceCalcEngine.js:157-177 | CalculationSql.UpsertIncentiveResult | ✅ |

### Full Incentive Engine (calculateIncentive.js → CalculationRepository.cs)

| Stage | Node.js Location | .NET Location | Parity |
|---|---|---|---|
| KPI definitions fetch | calculateIncentive.js:20-35 | CalculationSql.GetKpiDefinitions | ✅ |
| Performance data fetch | calculateIncentive.js:37-55 | CalculationSql.GetPerformanceData | ✅ |
| Achievement % computation | calculateIncentive.js:57-70 | CalculationController (in-memory) | ✅ |
| Milestone matching | calculateIncentive.js:72-95 | CalculationController (in-memory) | ✅ |
| Payout rule evaluation | calculateIncentive.js:97-130 | CalculationSql.GetPayoutRules | ✅ |
| Slab matching | calculateIncentive.js:132-165 | CalculationController (in-memory) | ✅ |
| Qualifying gate evaluation | calculateIncentive.js:167-190 | CalculationController (in-memory) | ✅ |
| Team rollup | calculateIncentive.js:210-250 | CalculationSql.GetDirectReportees | ✅ |
| Result persistence | calculateIncentive.js:252-271 | CalculationSql.UpsertCalculatedResult | ✅ |

## Gate Consequence Behavior
- **BLOCK** — Zero out incentive entirely
- **REDUCE** — Apply reduction percentage
- **CLAWBACK** — Negative adjustment

## Slab Operators
- GTE (>=), LTE (<=), BETWEEN, EQ (=) — all preserved in .NET

## Milestone Functions
- LEFT_INCLUSIVE_BETWEEN, BETWEEN, GTE, LTE — all preserved

## Status After Calculation
- New results created as DRAFT
- Existing results updated via UPSERT (preserves status if already set)

## Risks
- Floating point rounding differences between Node.js and .NET — mitigated by using decimal type
- Team rollup recursion depth — matches Node.js single-level direct reportees only
