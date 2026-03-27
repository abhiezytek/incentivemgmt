namespace IncentiveApi.Services.Engine;

using System.Text.Json;
using Dapper;
using IncentiveApi.Data;

public class InsuranceCalcEngineService
{
    private readonly DbConnectionFactory _db;

    public InsuranceCalcEngineService(DbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<InsuranceCalcResult> CalculateAgentIncentiveAsync(
        string agentCode, int programId, string periodStart, string periodEnd)
    {
        using var conn = await _db.CreateConnectionAsync();

        var breakdown = new Dictionary<string, object>();

        // Step 1: Compute KPI summary from transactions
        await conn.ExecuteAsync(
            "SELECT compute_agent_kpi(@agentCode, @programId, @periodStart::date, @periodEnd::date)",
            new { agentCode, programId, periodStart, periodEnd });

        var kpi = await conn.QueryFirstOrDefaultAsync(
            @"SELECT * FROM ins_agent_kpi_summary
              WHERE agent_code = @agentCode AND program_id = @programId
                AND period_start = @periodStart::date",
            new { agentCode, programId, periodStart });

        // Step 2: Product-wise NB Incentive from ins_incentive_rates
        var rates = (await conn.QueryAsync(
            @"SELECT r.*, p.product_category
              FROM ins_incentive_rates r
              JOIN ins_products p ON p.product_code = r.product_code
              WHERE r.program_id = @programId
                AND r.transaction_type = 'NEW_BUSINESS'
                AND r.policy_year = 1
                AND r.effective_from <= @periodStart::date
                AND (r.effective_to IS NULL OR r.effective_to >= @periodStart::date)
                AND r.is_active = TRUE
              ORDER BY r.product_code",
            new { programId, periodStart })).AsList();

        decimal nbIncentive = 0;
        var nbByProduct = kpi?.nb_by_product;
        var productBreakdown = nbByProduct != null
            ? DeserializeJsonb(nbByProduct)
            : new Dictionary<string, JsonElement>();

        foreach (var rate in rates)
        {
            string productCode = (string)rate.product_code;
            if (!productBreakdown.TryGetValue(productCode, out JsonElement prod))
                continue;

            decimal premium = GetJsonDecimal(prod, "premium");
            decimal minSlab = ToDecimal(rate.min_premium_slab);
            decimal maxSlab = ToDecimal(rate.max_premium_slab);
            if (premium < minSlab || premium > maxSlab) continue;

            decimal amount = 0;
            string rateType = (string)rate.rate_type;
            decimal incentiveRate = ToDecimal(rate.incentive_rate);

            if (rateType == "PERCENTAGE_OF_PREMIUM")
                amount = (premium * incentiveRate) / 100m;
            else if (rateType == "FLAT_PER_POLICY")
                amount = GetJsonDecimal(prod, "count") * incentiveRate;
            else if (rateType == "PERCENTAGE_OF_APE")
                amount = (GetJsonDecimal(prod, "ape") * incentiveRate) / 100m;

            breakdown[$"NB_{productCode}"] = new { premium, rate = incentiveRate, amount };
            nbIncentive += amount;
        }

        // Step 3: Renewal Incentive
        var renewalRates = (await conn.QueryAsync(
            @"SELECT * FROM ins_incentive_rates
              WHERE program_id = @programId AND transaction_type = 'RENEWAL'
                AND effective_from <= @periodStart::date AND is_active = TRUE",
            new { programId, periodStart })).AsList();

        decimal renewalIncentive = 0;
        decimal renewalPremiumCollected = kpi != null ? ToDecimal(kpi.renewal_premium_collected) : 0;

        foreach (var r in renewalRates)
        {
            decimal incentiveRate = ToDecimal(r.incentive_rate);
            decimal amount = (renewalPremiumCollected * incentiveRate) / 100m;
            string key = $"RENEWAL_{(string?)r.product_code ?? "ALL"}";
            breakdown[key] = new { amount };
            renewalIncentive += amount;
        }

        // Step 4: Persistency Gate Check
        var gates = (await conn.QueryAsync(
            @"SELECT * FROM ins_persistency_gates
              WHERE program_id = @programId AND gate_type = 'QUALIFYING_MINIMUM'
              ORDER BY persistency_month",
            new { programId })).AsList();

        bool persistencyGatePassed = true;
        decimal clawback = 0;
        string? disqualificationReason = null;

        foreach (var gate in gates)
        {
            int persMonth = (int)gate.persistency_month;
            string persField = $"persistency_{persMonth}m";
            decimal agentPers = GetDynamicField(kpi, persField);

            decimal thresholdPct = ToDecimal(gate.threshold_pct);
            if (agentPers < thresholdPct)
            {
                string consequence = (string)gate.consequence;
                if (consequence == "BLOCK_INCENTIVE")
                {
                    persistencyGatePassed = false;
                    disqualificationReason =
                        $"{persMonth}M persistency {agentPers:F1}% below {thresholdPct}%";
                    nbIncentive = 0;
                    renewalIncentive = 0;
                    break;
                }
                else if (consequence == "REDUCE_BY_PCT")
                {
                    decimal consequenceValue = ToDecimal(gate.consequence_value);
                    decimal reduction = (nbIncentive * consequenceValue) / 100m;
                    clawback += reduction;
                    breakdown[$"PERSISTENCY_REDUCTION_{persMonth}M"] = new { reduction };
                }
                else if (consequence == "CLAWBACK_PCT")
                {
                    decimal consequenceValue = ToDecimal(gate.consequence_value);
                    clawback += (nbIncentive * consequenceValue) / 100m;
                }
            }
        }

        decimal netSelfIncentive = nbIncentive + renewalIncentive - clawback;

        // Step 5: MLM Override Calculation
        var agentRow = await conn.QueryFirstOrDefaultAsync(
            "SELECT hierarchy_path, hierarchy_level FROM ins_agents WHERE agent_code = @agentCode",
            new { agentCode });

        string? myPath = agentRow?.hierarchy_path;
        int myLevel = agentRow != null ? (int)agentRow.hierarchy_level : 0;

        var downlines = agentRow != null
            ? (await conn.QueryAsync(
                @"SELECT a.agent_code, a.hierarchy_level,
                         (a.hierarchy_level - @myLevel) AS relative_level,
                         r.incentive_results
                  FROM ins_agents a
                  LEFT JOIN ins_incentive_results r ON r.agent_code = a.agent_code
                    AND r.program_id = @programId AND r.period_start = @periodStart::date
                  WHERE a.hierarchy_path LIKE @pathPattern
                    AND a.agent_code != @agentCode
                    AND a.status = 'ACTIVE'",
                new
                {
                    myLevel,
                    programId,
                    periodStart,
                    pathPattern = myPath + ".%",
                    agentCode,
                })).AsList()
            : [];

        var overrideRates = (await conn.QueryAsync(
            @"SELECT * FROM ins_mlm_override_rates
              WHERE program_id = @programId AND is_active = TRUE
              ORDER BY hierarchy_level",
            new { programId })).AsList();

        decimal l1Override = 0, l2Override = 0, l3Override = 0;

        foreach (var dl in downlines)
        {
            int relLevel = (int)dl.relative_level;
            decimal dlIncentive = GetNestedIncentive(dl.incentive_results);

            var rateRow = overrideRates.FirstOrDefault(r =>
                (int)r.hierarchy_level == relLevel && r.product_code == null);
            if (rateRow == null) continue;

            decimal overrideAmt = 0;
            string overrideType = (string)rateRow.override_type;
            decimal overrideRate = ToDecimal(rateRow.override_rate);

            if (overrideType == "PERCENTAGE_OF_DOWNLINE_INCENTIVE")
                overrideAmt = (dlIncentive * overrideRate) / 100m;
            else if (overrideType == "FLAT_PER_POLICY")
                overrideAmt = overrideRate;

            if (rateRow.max_cap_amount != null)
                overrideAmt = Math.Min(overrideAmt, ToDecimal(rateRow.max_cap_amount));

            if (relLevel == 1) l1Override += overrideAmt;
            else if (relLevel == 2) l2Override += overrideAmt;
            else if (relLevel == 3) l3Override += overrideAmt;

            breakdown[$"MLM_L{relLevel}_{(string)dl.agent_code}"] = new
            {
                dlIncentive,
                rate = overrideRate,
                overrideAmt,
            };
        }

        decimal totalOverride = l1Override + l2Override + l3Override;
        decimal totalIncentive = netSelfIncentive + totalOverride;

        // Step 6: Save to ins_incentive_results
        await conn.ExecuteAsync(
            @"INSERT INTO ins_incentive_results (
                agent_code, program_id, period_start, period_end,
                nb_incentive, renewal_incentive, clawback_amount, net_self_incentive,
                l1_override, l2_override, l3_override, total_override, total_incentive,
                persistency_gate_passed, disqualification_reason, calc_breakdown, status
              ) VALUES (
                @agentCode, @programId, @periodStart::date, @periodEnd::date,
                @nbIncentive, @renewalIncentive, @clawback, @netSelfIncentive,
                @l1Override, @l2Override, @l3Override, @totalOverride, @totalIncentive,
                @persistencyGatePassed, @disqualificationReason, @calcBreakdown::jsonb, 'DRAFT'
              )
              ON CONFLICT (agent_code, program_id, period_start)
              DO UPDATE SET
                nb_incentive = EXCLUDED.nb_incentive,
                renewal_incentive = EXCLUDED.renewal_incentive,
                clawback_amount = EXCLUDED.clawback_amount,
                net_self_incentive = EXCLUDED.net_self_incentive,
                l1_override = EXCLUDED.l1_override,
                l2_override = EXCLUDED.l2_override,
                l3_override = EXCLUDED.l3_override,
                total_override = EXCLUDED.total_override,
                total_incentive = EXCLUDED.total_incentive,
                persistency_gate_passed = EXCLUDED.persistency_gate_passed,
                disqualification_reason = EXCLUDED.disqualification_reason,
                calc_breakdown = EXCLUDED.calc_breakdown,
                calculated_at = NOW()",
            new
            {
                agentCode,
                programId,
                periodStart,
                periodEnd,
                nbIncentive,
                renewalIncentive,
                clawback,
                netSelfIncentive,
                l1Override,
                l2Override,
                l3Override,
                totalOverride,
                totalIncentive,
                persistencyGatePassed,
                disqualificationReason,
                calcBreakdown = JsonSerializer.Serialize(breakdown),
            });

        return new InsuranceCalcResult
        {
            AgentCode = agentCode,
            NetSelfIncentive = netSelfIncentive,
            TotalOverride = totalOverride,
            TotalIncentive = totalIncentive,
            Breakdown = breakdown,
        };
    }

    private static Dictionary<string, JsonElement> DeserializeJsonb(object? value)
    {
        if (value is null) return new Dictionary<string, JsonElement>();
        string json = value is string s ? s : JsonSerializer.Serialize(value);
        return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json)
               ?? new Dictionary<string, JsonElement>();
    }

    private static decimal GetJsonDecimal(JsonElement element, string property)
    {
        if (element.TryGetProperty(property, out var val))
        {
            if (val.ValueKind == JsonValueKind.Number)
                return val.GetDecimal();
        }
        return 0;
    }

    private static decimal GetDynamicField(dynamic? obj, string fieldName)
    {
        if (obj is null) return 0;
        var dict = (IDictionary<string, object>)obj;
        return dict.TryGetValue(fieldName, out var val) ? ToDecimal(val) : 0;
    }

    private static decimal GetNestedIncentive(object? incentiveResults)
    {
        if (incentiveResults is null) return 0;
        try
        {
            string json = incentiveResults is string s ? s : JsonSerializer.Serialize(incentiveResults);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("net_self_incentive", out var val) &&
                val.ValueKind == JsonValueKind.Number)
                return val.GetDecimal();
        }
        catch
        {
            // Gracefully handle malformed JSONB
        }
        return 0;
    }

    private static decimal ToDecimal(object? value)
    {
        if (value is null) return 0;
        return Convert.ToDecimal(value);
    }

    public class InsuranceCalcResult
    {
        public string AgentCode { get; set; } = string.Empty;
        public decimal NetSelfIncentive { get; set; }
        public decimal TotalOverride { get; set; }
        public decimal TotalIncentive { get; set; }
        public Dictionary<string, object> Breakdown { get; set; } = new();
    }
}
