namespace Incentive.Domain.Constants;

/// <summary>
/// Application role constants matching the 'role' column in the users table.
/// Seed data: ADMIN, FINANCE, OPS, MANAGER, AGENT
/// </summary>
public static class Roles
{
    public const string Admin = "ADMIN";
    public const string Finance = "FINANCE";
    public const string Ops = "OPS";
    public const string Manager = "MANAGER";
    public const string Agent = "AGENT";

    /// <summary>All roles that can access admin/config endpoints.</summary>
    public const string AdminOrOps = $"{Admin},{Ops}";

    /// <summary>All roles that can manage programs and KPI config.</summary>
    public const string ConfigManagers = $"{Admin},{Ops},{Manager}";

    /// <summary>All roles that can perform workflow actions (approve, hold, etc.).</summary>
    public const string WorkflowActors = $"{Admin},{Ops},{Finance},{Manager}";

    /// <summary>All roles that can access finance-sensitive endpoints (payouts, exports).</summary>
    public const string FinanceAccess = $"{Admin},{Finance}";

    /// <summary>All roles — broadest access.</summary>
    public const string AllAuthenticated = $"{Admin},{Finance},{Ops},{Manager},{Agent}";
}
