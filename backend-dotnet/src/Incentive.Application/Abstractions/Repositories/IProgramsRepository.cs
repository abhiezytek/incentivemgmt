namespace Incentive.Application.Abstractions.Repositories;

/// <summary>
/// Repository interface for program-related operations.
/// Wave 1: preview. Wave 2: summary, status validation.
/// </summary>
public interface IProgramsRepository
{
    /// <summary>
    /// Get full program preview including KPIs, payout rules, qualifying rules, and stats.
    /// Returns null if program not found.
    /// </summary>
    Task<object?> GetProgramPreviewAsync(int programId);

    /// <summary>
    /// Get program summary with KPI count, payout rule count, agent count, and results existence.
    /// Returns null if program not found.
    /// </summary>
    Task<object?> GetProgramSummaryAsync(int programId);

    /// <summary>
    /// Validate whether a program can be activated.
    /// Returns list of conflicting program IDs if overlapping active programs exist.
    /// </summary>
    Task<IEnumerable<int>> GetOverlappingActiveProgramsAsync(int programId, int channelId, DateTime startDate, DateTime endDate);

    /// <summary>
    /// Get KPI definition count for a program.
    /// </summary>
    Task<int> GetKpiCountAsync(int programId);

    /// <summary>
    /// Get payout rule count for a program.
    /// </summary>
    Task<int> GetPayoutRuleCountAsync(int programId);
}
