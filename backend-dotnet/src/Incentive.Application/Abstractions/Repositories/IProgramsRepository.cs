namespace Incentive.Application.Abstractions.Repositories;

/// <summary>
/// Repository interface for program-related read operations.
/// Wave 1 scope: preview endpoint only.
/// </summary>
public interface IProgramsRepository
{
    /// <summary>
    /// Get full program preview including KPIs, payout rules, qualifying rules, and stats.
    /// Returns null if program not found.
    /// </summary>
    Task<object?> GetProgramPreviewAsync(int programId);
}
