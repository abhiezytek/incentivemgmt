namespace Incentive.Infrastructure.Persistence.Sql;

/// <summary>
/// SQL queries for the org-domain-mapping endpoint.
/// Ported from server/src/routes/orgDomainMapping.js.
/// </summary>
public static class OrgDomainMappingSql
{
    public const string Summary = """
        SELECT
          COUNT(*)::int AS total_agents,
          COUNT(*) FILTER(WHERE status = 'ACTIVE')::int AS active_agents,
          COUNT(DISTINCT region_id)::int AS regions,
          COUNT(DISTINCT channel_id)::int AS channels,
          COUNT(DISTINCT branch_code)::int AS branches
        FROM ins_agents
        """;

    public const string ByRegion = """
        SELECT rg.id, rg.region_name, rg.region_code, rg.zone,
               COUNT(a.id)::int AS agent_count,
               COUNT(a.id) FILTER(WHERE a.status = 'ACTIVE')::int AS active_count,
               COUNT(DISTINCT a.branch_code)::int AS branch_count
        FROM ins_regions rg
        LEFT JOIN ins_agents a ON a.region_id = rg.id
        GROUP BY rg.id, rg.region_name, rg.region_code, rg.zone
        ORDER BY agent_count DESC
        """;

    public const string ByChannel = """
        SELECT c.id, c.name, c.code,
               COUNT(a.id)::int AS agent_count,
               COUNT(a.id) FILTER(WHERE a.status = 'ACTIVE')::int AS active_count,
               COUNT(DISTINCT a.region_id)::int AS region_count,
               COUNT(DISTINCT a.branch_code)::int AS branch_count
        FROM channels c
        LEFT JOIN ins_agents a ON a.channel_id = c.id
        GROUP BY c.id, c.name, c.code
        ORDER BY agent_count DESC
        """;

    public const string ByBranch = """
        SELECT a.branch_code,
               rg.region_name, c.name AS channel_name,
               COUNT(a.id)::int AS agent_count,
               COUNT(a.id) FILTER(WHERE a.status = 'ACTIVE')::int AS active_count
        FROM ins_agents a
        LEFT JOIN ins_regions rg ON rg.id = a.region_id
        LEFT JOIN channels c ON c.id = a.channel_id
        WHERE a.branch_code IS NOT NULL
        GROUP BY a.branch_code, rg.region_name, c.name
        ORDER BY agent_count DESC
        """;

    public const string ByDesignation = """
        SELECT a.hierarchy_level,
               COUNT(a.id)::int AS agent_count,
               COUNT(a.id) FILTER(WHERE a.status = 'ACTIVE')::int AS active_count,
               COUNT(DISTINCT a.channel_id)::int AS channel_count
        FROM ins_agents a
        GROUP BY a.hierarchy_level
        ORDER BY a.hierarchy_level
        """;

    public const string Products = """
        SELECT product_category, COUNT(*)::int AS count,
               COUNT(*) FILTER(WHERE is_active)::int AS active_count
        FROM ins_products
        GROUP BY product_category
        ORDER BY count DESC
        """;
}
