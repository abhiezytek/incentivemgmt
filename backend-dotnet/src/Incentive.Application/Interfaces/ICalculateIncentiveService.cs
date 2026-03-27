namespace Incentive.Application.Interfaces;

/// <summary>
/// Placeholder interface for the generic incentive calculation engine.
/// Will be implemented in Wave 4 to match engine/calculateIncentive.js.
/// </summary>
public interface ICalculateIncentiveService
{
    /// <summary>
    /// Calculate incentive for a single user/program/period.
    /// </summary>
    Task<object> CalculateAsync(int userId, int programId, string periodStart, string periodEnd);
}
