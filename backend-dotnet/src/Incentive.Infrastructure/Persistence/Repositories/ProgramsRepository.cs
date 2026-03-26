using System.Dynamic;
using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Features.Programs;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Sql;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper implementation of IProgramsRepository.
/// Ported from server/src/routes/programs.js (/:id/preview endpoint).
/// </summary>
public class ProgramsRepository : IProgramsRepository
{
    private readonly DbConnectionFactory _db;
    private readonly QueryHelper _queryHelper;

    public ProgramsRepository(DbConnectionFactory db, QueryHelper queryHelper)
    {
        _db = db;
        _queryHelper = queryHelper;
    }

    public async Task<object?> GetProgramPreviewAsync(int programId)
    {
        // Fetch program using the generic query helper (matches Node: findById)
        var program = await _queryHelper.FindByIdAsync("incentive_programs", programId);
        if (program == null)
            return null;

        using var conn = await _db.CreateConnectionAsync();
        var param = new { programId };

        // Channel info
        int? channelId = null;
        if (program is IDictionary<string, object> dict && dict.TryGetValue("channel_id", out var chId))
            channelId = chId as int?;

        dynamic? channel = null;
        if (channelId != null)
        {
            channel = await conn.QueryFirstOrDefaultAsync(
                ProgramsSql.ChannelById,
                new { channelId });
        }

        // KPIs with milestones (uses json_agg — returns JSON strings in milestones column)
        var kpis = await conn.QueryAsync(ProgramsSql.KpisWithMilestones, param);

        // Payout rules with slabs
        var payoutRules = await conn.QueryAsync(ProgramsSql.PayoutRulesWithSlabs, param);

        // Qualifying rules
        var qualifyingRules = await conn.QueryAsync(ProgramsSql.QualifyingRules, param);

        // Agent count
        int agentCount = 0;
        if (channelId != null)
        {
            agentCount = await conn.QueryFirstOrDefaultAsync<int>(
                ProgramsSql.ActiveAgentCount,
                new { channelId });
        }

        // Result stats
        var resultStatRows = await conn.QueryAsync(ProgramsSql.ResultStatsByProgram, param);
        var resultStats = new Dictionary<string, ProgramResultStatDto>();
        foreach (var r in resultStatRows)
        {
            resultStats[(string)r.status] = new ProgramResultStatDto
            {
                Count = (int)r.count,
                Total = (decimal)r.total,
            };
        }

        // Build response matching Node.js: { ...program, channel, kpis, payoutRules, qualifyingRules, agentCount, resultStats }
        // We return a dictionary so that program fields are spread at the top level
        var result = new Dictionary<string, object?>();

        // Spread program fields
        if (program is IDictionary<string, object> programDict)
        {
            foreach (var kv in programDict)
                result[kv.Key] = kv.Value;
        }

        result["channel"] = channel;
        result["kpis"] = kpis;
        result["payoutRules"] = payoutRules;
        result["qualifyingRules"] = qualifyingRules;
        result["agentCount"] = agentCount;
        result["resultStats"] = resultStats;

        return result;
    }
}
