namespace Incentive.Domain.Constants;

/// <summary>
/// Valid persistency gate months for insurance incentive calculations.
/// </summary>
public static class PersistencyMonths
{
    public static readonly int[] ValidMonths = [13, 25, 37, 49, 61];

    public static bool IsValid(int month) => ValidMonths.Contains(month);
}
