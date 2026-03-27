namespace IncentiveApi.Utils;

public record ErrorEntry(string Code, int Status, string Message);

public static class ErrorCodes
{
    // ── Authentication ───────────────────────────
    public static readonly ErrorEntry AUTH_001 = new("AUTH_001", 401, "Authentication token is required");
    public static readonly ErrorEntry AUTH_002 = new("AUTH_002", 401, "Token has expired");
    public static readonly ErrorEntry AUTH_003 = new("AUTH_003", 401, "Token is invalid");
    public static readonly ErrorEntry AUTH_004 = new("AUTH_004", 403, "Insufficient permissions");
    public static readonly ErrorEntry AUTH_005 = new("AUTH_005", 401, "System client not found");
    public static readonly ErrorEntry AUTH_006 = new("AUTH_006", 403, "System client is inactive");
    public static readonly ErrorEntry AUTH_007 = new("AUTH_007", 403, "Endpoint not permitted for this client");

    // ── Validation ───────────────────────────────
    public static readonly ErrorEntry VAL_001 = new("VAL_001", 400, "Required field missing");
    public static readonly ErrorEntry VAL_002 = new("VAL_002", 400, "Invalid date format (expected YYYY-MM-DD)");
    public static readonly ErrorEntry VAL_003 = new("VAL_003", 400, "Invalid enum value");
    public static readonly ErrorEntry VAL_004 = new("VAL_004", 400, "Value out of allowed range");
    public static readonly ErrorEntry VAL_005 = new("VAL_005", 409, "Duplicate record");
    public static readonly ErrorEntry VAL_006 = new("VAL_006", 400, "Referenced record not found");
    public static readonly ErrorEntry VAL_007 = new("VAL_007", 400, "CSV missing required columns");
    public static readonly ErrorEntry VAL_008 = new("VAL_008", 413, "File too large (max 20 MB)");
    public static readonly ErrorEntry VAL_009 = new("VAL_009", 400, "Invalid file type (CSV only)");
    public static readonly ErrorEntry VAL_010 = new("VAL_010", 400, "Persistency month must be 13, 25, 37, 49, or 61");

    // ── Business Rules ───────────────────────────
    public static readonly ErrorEntry BUS_001 = new("BUS_001", 422, "Program is not in ACTIVE status");
    public static readonly ErrorEntry BUS_002 = new("BUS_002", 409, "Overlapping program date range for this channel");
    public static readonly ErrorEntry BUS_003 = new("BUS_003", 422, "Cannot modify APPROVED or PAID incentive result");
    public static readonly ErrorEntry BUS_004 = new("BUS_004", 404, "Agent not found in hierarchy system");
    public static readonly ErrorEntry BUS_005 = new("BUS_005", 409, "Incentive already calculated for this period");
    public static readonly ErrorEntry BUS_006 = new("BUS_006", 422, "No payout rules defined for program");
    public static readonly ErrorEntry BUS_007 = new("BUS_007", 422, "No KPI rules defined for program");
    public static readonly ErrorEntry BUS_008 = new("BUS_008", 422, "Agent license has expired");
    public static readonly ErrorEntry BUS_009 = new("BUS_009", 422, "Product is not active");
    public static readonly ErrorEntry BUS_010 = new("BUS_010", 422, "Cannot approve — persistency gate failed");

    // ── Integration ──────────────────────────────
    public static readonly ErrorEntry INT_001 = new("INT_001", 502, "SFTP connection failed");
    public static readonly ErrorEntry INT_002 = new("INT_002", 404, "SFTP file not found");
    public static readonly ErrorEntry INT_003 = new("INT_003", 409, "File already processed (duplicate filename)");
    public static readonly ErrorEntry INT_004 = new("INT_004", 422, "Staging validation failed");
    public static readonly ErrorEntry INT_005 = new("INT_005", 502, "Hierarchy API unreachable");
    public static readonly ErrorEntry INT_006 = new("INT_006", 504, "Penta API request timed out");
    public static readonly ErrorEntry INT_007 = new("INT_007", 500, "Export file generation failed");
    public static readonly ErrorEntry INT_008 = new("INT_008", 422, "SAP FICO format error");
    public static readonly ErrorEntry INT_009 = new("INT_009", 422, "Oracle AP format error");

    // ── Calculation ──────────────────────────────
    public static readonly ErrorEntry CALC_001 = new("CALC_001", 422, "No performance data found for agent and period");
    public static readonly ErrorEntry CALC_002 = new("CALC_002", 422, "No incentive rate defined for product and channel");
    public static readonly ErrorEntry CALC_003 = new("CALC_003", 409, "Calculation already in progress for this program");
    public static readonly ErrorEntry CALC_004 = new("CALC_004", 422, "Target value is zero (division error)");
    public static readonly ErrorEntry CALC_005 = new("CALC_005", 500, "Agent hierarchy path is corrupted");
}

public class ApiException : Exception
{
    public ErrorEntry ErrorEntry { get; }
    public object? Details { get; }

    public ApiException(ErrorEntry errorEntry, object? details = null)
        : base(errorEntry.Message)
    {
        ErrorEntry = errorEntry;
        Details = details;
    }

    public static ApiException From(ErrorEntry entry, object? details = null) => new(entry, details);
}
