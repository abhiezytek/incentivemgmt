using Dapper;
using Incentive.Application.Abstractions.Repositories;
using Incentive.Application.Features.OrgDomainMapping;
using Incentive.Infrastructure.Data;
using Incentive.Infrastructure.Persistence.Sql;

namespace Incentive.Infrastructure.Persistence.Repositories;

/// <summary>
/// Dapper implementation of IOrgDomainMappingRepository.
/// Ported from server/src/routes/orgDomainMapping.js.
/// </summary>
public class OrgDomainMappingRepository : IOrgDomainMappingRepository
{
    private readonly DbConnectionFactory _db;

    public OrgDomainMappingRepository(DbConnectionFactory db) => _db = db;

    public async Task<OrgDomainMappingResponse> GetMappingsAsync(string view)
    {
        using var conn = await _db.CreateConnectionAsync();

        // Summary metrics
        var summaryRow = await conn.QueryFirstOrDefaultAsync(OrgDomainMappingSql.Summary);
        var summary = new OrgSummaryDto
        {
            TotalAgents = summaryRow?.total_agents != null ? (int)summaryRow.total_agents : 0,
            ActiveAgents = summaryRow?.active_agents != null ? (int)summaryRow.active_agents : 0,
            Regions = summaryRow?.regions != null ? (int)summaryRow.regions : 0,
            Channels = summaryRow?.channels != null ? (int)summaryRow.channels : 0,
            Branches = summaryRow?.branches != null ? (int)summaryRow.branches : 0,
        };

        // Grouped data based on view parameter
        var groupedSql = view switch
        {
            "channel" => OrgDomainMappingSql.ByChannel,
            "branch" => OrgDomainMappingSql.ByBranch,
            "designation" => OrgDomainMappingSql.ByDesignation,
            _ => OrgDomainMappingSql.ByRegion, // default: region
        };
        var groupedData = await conn.QueryAsync(groupedSql);

        // Products summary
        var products = await conn.QueryAsync(OrgDomainMappingSql.Products);

        return new OrgDomainMappingResponse
        {
            Summary = summary,
            View = view,
            GroupedData = groupedData,
            Products = products,
        };
    }
}
