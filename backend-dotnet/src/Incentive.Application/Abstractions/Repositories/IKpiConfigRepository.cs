namespace Incentive.Application.Abstractions.Repositories;

/// <summary>
/// Repository interface for KPI configuration operations.
/// Ported from server/src/routes/kpiConfig.js.
/// </summary>
public interface IKpiConfigRepository
{
    /// <summary>
    /// Get KPI registry: all KPIs with milestones, program info, and derived variables.
    /// </summary>
    Task<object> GetRegistryAsync();

    /// <summary>
    /// Validate a KPI configuration. Returns validation result with errors, warnings, counts.
    /// Returns null if KPI not found.
    /// </summary>
    Task<object?> ValidateKpiAsync(int kpiId);

    /// <summary>
    /// Get KPI summary with milestones, payout slabs, and qualifying rules.
    /// Returns null if KPI not found.
    /// </summary>
    Task<object?> GetKpiSummaryAsync(int kpiId);
}
