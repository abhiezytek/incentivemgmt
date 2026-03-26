namespace IncentiveApi.Services.Engine;

using System.Text.Json;
using Dapper;
using IncentiveApi.Data;

public class CalculateIncentiveService
{
    private readonly DbConnectionFactory _db;

    public CalculateIncentiveService(DbConnectionFactory db)
    {
        _db = db;
    }

    public async Task<dynamic> CalculateAsync(
        int userId, int programId, string periodStart, string periodEnd)
    {
        using var conn = await _db.CreateConnectionAsync();

        // Step 1: Fetch KPI definitions for this program
        var kpis = (await conn.QueryAsync(
            "SELECT * FROM kpi_definitions WHERE program_id = @programId ORDER BY sort_order",
            new { programId })).AsList();

        // Step 2 & 3: Get performance data and compute achievement_pct
        var perfRows = (await conn.QueryAsync(
            @"SELECT * FROM performance_data
              WHERE user_id = @userId AND program_id = @programId
                AND period_start >= @periodStart::date AND period_end <= @periodEnd::date",
            new { userId, programId, periodStart, periodEnd })).AsList();

        var achievements = new Dictionary<int, AchievementData>();
        foreach (var p in perfRows)
        {
            decimal target = ToDecimal(p.target_value);
            decimal achieved = ToDecimal(p.achieved_value);
            decimal pct = target > 0 ? (achieved / target) * 100m : 0m;
            achievements[(int)p.kpi_id] = new AchievementData(target, achieved, pct);
        }

        // Step 4 & 5: Match milestones per KPI
        var milestoneRows = (await conn.QueryAsync(
            @"SELECT m.* FROM kpi_milestones m
              JOIN kpi_definitions k ON k.id = m.kpi_id
              WHERE k.program_id = @programId ORDER BY m.sort_order",
            new { programId })).AsList();

        var milestonesByKpi = new Dictionary<int, List<dynamic>>();
        foreach (var m in milestoneRows)
        {
            int kpiId = (int)m.kpi_id;
            if (!milestonesByKpi.ContainsKey(kpiId))
                milestonesByKpi[kpiId] = [];
            milestonesByKpi[kpiId].Add(m);
        }

        var milestoneHits = new Dictionary<int, string?>();
        foreach (var kpi in kpis)
        {
            int kpiId = (int)kpi.id;
            if (!achievements.TryGetValue(kpiId, out var ach))
            {
                milestoneHits[kpiId] = null;
                continue;
            }
            var ms = milestonesByKpi.GetValueOrDefault(kpiId, []);
            var hit = ms.FirstOrDefault(m => MatchesMilestone((double)ach.Pct, m));
            milestoneHits[kpiId] = hit != null ? (string)hit.milestone_label : null;
        }

        // Steps 5-9: Payout rules, qualifying gates, slabs
        var rules = (await conn.QueryAsync(
            "SELECT * FROM payout_rules WHERE program_id = @programId AND is_active = true",
            new { programId })).AsList();

        decimal selfIncentive = 0;
        var breakdown = new List<Dictionary<string, object?>>();

        foreach (var rule in rules)
        {
            int ruleId = (int)rule.id;
            string ruleName = (string)rule.rule_name;

            // Step 8: Qualifying gates
            if ((bool?)rule.has_qualifying_rules == true)
            {
                var qRules = (await conn.QueryAsync(
                    "SELECT * FROM payout_qualifying_rules WHERE payout_rule_id = @ruleId",
                    new { ruleId })).AsList();

                var results = new List<bool>();
                bool isOr = false;

                foreach (var qr in qRules)
                {
                    int qrKpiId = (int)qr.kpi_id;
                    decimal val = achievements.TryGetValue(qrKpiId, out var qAch) ? qAch.Pct : 0;
                    decimal threshold = ToDecimal(qr.threshold_value);
                    string op = (string)qr.@operator;

                    bool passed = op switch
                    {
                        "GTE" => val >= threshold,
                        "LTE" => val <= threshold,
                        "EQ" => val == threshold,
                        _ => false,
                    };
                    results.Add(passed);

                    if ((string?)qr.condition_join == "OR")
                        isOr = true;
                }

                bool qualified = isOr
                    ? results.Any(r => r)
                    : results.All(r => r);

                if (!qualified)
                {
                    breakdown.Add(new Dictionary<string, object?>
                    {
                        ["rule_id"] = ruleId,
                        ["rule_name"] = ruleName,
                        ["qualified"] = false,
                        ["amount"] = 0m,
                    });
                    continue;
                }
            }

            // Steps 6-7: Evaluate slabs
            var slabs = (await conn.QueryAsync(
                "SELECT * FROM payout_slabs WHERE payout_rule_id = @ruleId ORDER BY sort_order",
                new { ruleId })).AsList();

            decimal ruleAmount = 0;
            var slabDetails = new List<Dictionary<string, object?>>();

            foreach (var slab in slabs)
            {
                int slabKpiId = (int)slab.kpi_id;
                var ach = achievements.GetValueOrDefault(slabKpiId);
                decimal val = ach?.Pct ?? 0;

                // Milestone label match
                string? slabMilestoneLabel = (string?)slab.milestone_label;
                if (slabMilestoneLabel != null && milestoneHits.GetValueOrDefault(slabKpiId) != slabMilestoneLabel)
                    continue;

                // Operator condition
                if (!MatchesSlab((double)val, slab))
                    continue;

                // Apply incentive_operator with weight_pct
                decimal amount = 0;
                decimal weight = ToDecimal(slab.weight_pct ?? 100m) / 100m;
                string incentiveOp = (string)slab.incentive_operator;

                switch (incentiveOp)
                {
                    case "MULTIPLY":
                        amount = (ach?.Achieved ?? 0) * ToDecimal(slab.value1 ?? 0m) * weight;
                        break;
                    case "FLAT":
                        amount = ToDecimal(slab.value1 ?? 0m) * weight;
                        break;
                    case "PERCENTAGE_OF":
                        amount = ((ach?.Achieved ?? 0) * ToDecimal(slab.value1 ?? 0m) / 100m) * weight;
                        break;
                }

                // Apply max_cap
                if (slab.max_cap != null)
                {
                    decimal maxCap = ToDecimal(slab.max_cap);
                    if (amount > maxCap)
                        amount = maxCap;
                }

                slabDetails.Add(new Dictionary<string, object?>
                {
                    ["slab_id"] = (int)slab.id,
                    ["label"] = (string?)slab.slab_label,
                    ["amount"] = amount,
                });

                string calcType = (string)rule.calc_type;
                string? payoutCalcType = (string?)slab.payout_calc_type;

                if (calcType == "VARIABLE" || payoutCalcType == "HIGHEST_AMOUNT")
                    ruleAmount = Math.Max(ruleAmount, amount);
                else
                    ruleAmount += amount;
            }

            selfIncentive += ruleAmount;
            breakdown.Add(new Dictionary<string, object?>
            {
                ["rule_id"] = ruleId,
                ["rule_name"] = ruleName,
                ["qualified"] = true,
                ["amount"] = ruleAmount,
                ["slabs"] = slabDetails,
            });
        }

        // Steps 11-13: Team rollup
        var reportees = (await conn.QueryAsync(
            "SELECT user_id FROM group_members WHERE reports_to_user_id = @userId",
            new { userId })).AsList();

        decimal teamIncentive = 0;
        var teamDetails = new List<Dictionary<string, object>>();

        if (reportees.Count > 0)
        {
            foreach (var rep in reportees)
            {
                int repUserId = (int)rep.user_id;
                var resultRow = await conn.QueryFirstOrDefaultAsync(
                    @"SELECT self_incentive FROM incentive_results
                      WHERE user_id = @repUserId AND program_id = @programId
                        AND period_start = @periodStart::date AND period_end = @periodEnd::date
                      ORDER BY calculated_at DESC LIMIT 1",
                    new { repUserId, programId, periodStart, periodEnd });

                decimal repSelf = resultRow != null ? ToDecimal(resultRow.self_incentive) : 0;
                teamDetails.Add(new Dictionary<string, object>
                {
                    ["user_id"] = repUserId,
                    ["self_incentive"] = repSelf,
                });
            }

            decimal totalReporteeSelf = teamDetails.Sum(r => (decimal)r["self_incentive"]);

            foreach (var rule in rules)
            {
                decimal overridePct = ToDecimal(rule.team_override_pct ?? 0m);
                if (overridePct > 0)
                    teamIncentive += (totalReporteeSelf * overridePct) / 100m;
            }
        }

        decimal totalIncentive = selfIncentive + teamIncentive;

        // Step 14: Persist to incentive_results
        var calcBreakdown = new Dictionary<string, object?>
        {
            ["rules"] = breakdown,
            ["achievements"] = achievements.ToDictionary(
                a => a.Key.ToString(),
                a => (object)new { target = a.Value.Target, achieved = a.Value.Achieved, pct = a.Value.Pct }),
            ["milestone_hits"] = milestoneHits.ToDictionary(m => m.Key.ToString(), m => (object?)m.Value),
            ["team"] = new { reportees = teamDetails, team_incentive = teamIncentive },
        };

        var result = await conn.QueryFirstAsync(
            @"INSERT INTO incentive_results
                (user_id, program_id, period_start, period_end,
                 self_incentive, team_incentive, total_incentive,
                 calc_breakdown, status)
              VALUES (@userId, @programId, @periodStart::date, @periodEnd::date,
                      @selfIncentive, @teamIncentive, @totalIncentive,
                      @calcBreakdown::jsonb, 'CALCULATED')
              RETURNING *",
            new
            {
                userId,
                programId,
                periodStart,
                periodEnd,
                selfIncentive,
                teamIncentive,
                totalIncentive,
                calcBreakdown = JsonSerializer.Serialize(calcBreakdown),
            });

        return result;
    }

    private static bool MatchesMilestone(double value, dynamic milestone)
    {
        double from = Convert.ToDouble(milestone.range_from);
        double to = Convert.ToDouble(milestone.range_to);
        string functionType = (string)milestone.function_type;

        return functionType switch
        {
            "LEFT_INCLUSIVE_BETWEEN" => value >= from && value < to,
            "BETWEEN" => value >= from && value <= to,
            "GTE" => value >= from,
            "LTE" => value <= from,
            _ => false,
        };
    }

    private static bool MatchesSlab(double value, dynamic slab)
    {
        double v1 = Convert.ToDouble(slab.value1);
        double? v2 = slab.value2 != null ? Convert.ToDouble(slab.value2) : null;
        string op = (string)slab.@operator;

        return op switch
        {
            "GTE" => value >= v1,
            "LTE" => value <= v1,
            "BETWEEN" => v2.HasValue && value >= v1 && value <= v2.Value,
            "EQ" => Math.Abs(value - v1) < 0.0001,
            _ => false,
        };
    }

    private static decimal ToDecimal(object? value)
    {
        if (value is null) return 0;
        return Convert.ToDecimal(value);
    }

    private record AchievementData(decimal Target, decimal Achieved, decimal Pct);
}
