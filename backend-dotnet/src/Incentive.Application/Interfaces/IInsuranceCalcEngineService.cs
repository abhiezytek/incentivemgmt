namespace Incentive.Application.Interfaces;

/// <summary>
/// Placeholder interface for the insurance-specific calculation engine.
/// Will be implemented in Wave 4 to match engine/insuranceCalcEngine.js.
/// </summary>
public interface IInsuranceCalcEngineService
{
    /// <summary>
    /// Calculate insurance agent incentive for a specific program/period.
    /// </summary>
    Task<object> CalculateAgentIncentiveAsync(string agentCode, int programId, string periodStart, string periodEnd);
}
