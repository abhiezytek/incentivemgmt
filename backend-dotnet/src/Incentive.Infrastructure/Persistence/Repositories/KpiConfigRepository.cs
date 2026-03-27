using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Sql;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper implementation of IKpiConfigRepository.
/// Ported from server/src/routes/kpiConfig.js.
/// </summary>
public class KpiConfigRepository : IKpiConfigRepository
{
    private readonly DbConnectionFactory _db;

    public KpiConfigRepository(DbConnectionFactory db) => _db = db;

    public async Task<object> GetRegistryAsync()
    {
        using var conn = await _db.CreateConnectionAsync();

        // KPI definitions with program info
        var kpis = (await conn.QueryAsync(KpiConfigSql.AllKpisWithProgramInfo)).ToList();

        // All milestones
        var milestones = (await conn.QueryAsync(KpiConfigSql.AllMilestones)).ToList();

        // Derived variables
        var derivedVars = (await conn.QueryAsync(KpiConfigSql.AllDerivedVariables)).ToList();

        // Group milestones by kpi_id
        var milestoneMap = new Dictionary<int, List<dynamic>>();
        foreach (var m in milestones)
        {
            int kpiId = (int)m.kpi_id;
            if (!milestoneMap.ContainsKey(kpiId))
                milestoneMap[kpiId] = new List<dynamic>();
            milestoneMap[kpiId].Add(m);
        }

        // Attach milestones to KPIs
        var registry = new List<Dictionary<string, object?>>();
        foreach (var kpi in kpis)
        {
            var dict = new Dictionary<string, object?>();
            if (kpi is IDictionary<string, object> kpiDict)
            {
                foreach (var kv in kpiDict)
                    dict[kv.Key] = kv.Value;
            }

            int id = dict.ContainsKey("id") ? Convert.ToInt32(dict["id"]) : 0;
            dict["milestones"] = milestoneMap.GetValueOrDefault(id, new List<dynamic>());
            registry.Add(dict);
        }

        // Stats
        var programIds = new HashSet<object?>();
        int activeCount = 0;
        foreach (var kpi in kpis)
        {
            if (kpi is IDictionary<string, object> d)
            {
                if (d.TryGetValue("program_id", out var pid))
                    programIds.Add(pid);
                if (d.TryGetValue("program_status", out var ps) && ps?.ToString() == "ACTIVE")
                    activeCount++;
            }
        }

        return new
        {
            stats = new
            {
                totalKPIs = kpis.Count,
                activeKPIs = activeCount,
                programsLinked = programIds.Count,
                derivedVariables = derivedVars.Count,
            },
            kpis = registry,
            derivedVariables = derivedVars,
        };
    }

    public async Task<object?> ValidateKpiAsync(int kpiId)
    {
        using var conn = await _db.CreateConnectionAsync();
        var warnings = new List<object>();
        var errors = new List<object>();

        // Fetch KPI
        var kpi = await conn.QueryFirstOrDefaultAsync(KpiConfigSql.KpiById, new { id = kpiId });
        if (kpi == null)
            return null;

        // Check program exists and is valid
        if (kpi is IDictionary<string, object> kpiDict && kpiDict.TryGetValue("program_id", out var progId) && progId != null)
        {
            int programId = Convert.ToInt32(progId);
            var prog = await conn.QueryFirstOrDefaultAsync(KpiConfigSql.ProgramStatusById, new { id = programId });
            if (prog == null)
            {
                errors.Add(new { field = "program_id", message = "Linked program does not exist" });
            }
            else if (prog is IDictionary<string, object> progDict &&
                     progDict.TryGetValue("status", out var status) && status?.ToString() == "CLOSED")
            {
                warnings.Add(new { field = "program_id", message = "Linked program is CLOSED" });
            }
        }

        // Check milestones
        var milestones = (await conn.QueryAsync(KpiConfigSql.MilestonesByKpiId, new { kpiId })).ToList();
        if (milestones.Count == 0)
        {
            warnings.Add(new { field = "milestones", message = "No milestones defined — KPI will have no slab structure" });
        }
        else
        {
            // Check for gaps in milestone ranges
            for (int i = 0; i < milestones.Count - 1; i++)
            {
                var curr = milestones[i] as IDictionary<string, object>;
                var next = milestones[i + 1] as IDictionary<string, object>;

                if (curr != null && next != null)
                {
                    var currTo = curr.TryGetValue("range_to", out var cto) ? cto : null;
                    var nextFrom = next.TryGetValue("range_from", out var nfr) ? nfr : null;
                    var currLabel = curr.TryGetValue("milestone_label", out var cl) ? cl?.ToString() : "";
                    var nextLabel = next.TryGetValue("milestone_label", out var nl) ? nl?.ToString() : "";

                    if (currTo != null && nextFrom != null)
                    {
                        var currToNum = Convert.ToDecimal(currTo);
                        var nextFromNum = Convert.ToDecimal(nextFrom);
                        if (currToNum < nextFromNum)
                        {
                            warnings.Add(new
                            {
                                field = "milestones",
                                message = $"Gap between milestone {currLabel} (to: {currTo}) and {nextLabel} (from: {nextFrom})"
                            });
                        }
                    }
                }
            }
        }

        // Check payout slab links
        var payoutSlabCount = await conn.QueryFirstOrDefaultAsync<int>(
            KpiConfigSql.PayoutSlabCountByKpiId, new { kpiId });
        if (payoutSlabCount == 0)
        {
            warnings.Add(new { field = "payout_slabs", message = "KPI is not linked to any payout slab" });
        }

        return new
        {
            valid = errors.Count == 0,
            errors,
            warnings,
            milestoneCount = milestones.Count,
            payoutSlabLinks = payoutSlabCount,
        };
    }

    public async Task<object?> GetKpiSummaryAsync(int kpiId)
    {
        using var conn = await _db.CreateConnectionAsync();

        // KPI with program info
        var kpi = await conn.QueryFirstOrDefaultAsync(KpiConfigSql.KpiWithProgramInfo, new { id = kpiId });
        if (kpi == null)
            return null;

        // Milestones
        var milestones = await conn.QueryAsync(KpiConfigSql.MilestonesByKpiId, new { kpiId });

        // Payout slabs
        var payoutSlabs = await conn.QueryAsync(KpiConfigSql.PayoutSlabsByKpiId, new { kpiId });

        // Qualifying rules
        var qualifyingRules = await conn.QueryAsync(KpiConfigSql.QualifyingRulesByKpiId, new { kpiId });

        // Spread KPI fields + attach arrays (matching Node: { ...kpiRows[0], milestones, payoutSlabs, qualifyingRules })
        var result = new Dictionary<string, object?>();
        if (kpi is IDictionary<string, object> kpiDict)
        {
            foreach (var kv in kpiDict)
                result[kv.Key] = kv.Value;
        }

        result["milestones"] = milestones;
        result["payoutSlabs"] = payoutSlabs;
        result["qualifyingRules"] = qualifyingRules;

        return result;
    }
}
