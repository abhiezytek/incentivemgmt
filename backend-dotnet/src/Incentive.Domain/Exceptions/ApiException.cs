namespace Incentive.Domain.Exceptions;

/// <summary>
/// API exception with HTTP status code and error code for consistent error responses.
/// </summary>
public class ApiException : Exception
{
    public int StatusCode { get; }
    public string ErrorCode { get; }
    public object? Details { get; }

    public ApiException(int statusCode, string errorCode, string message, object? details = null)
        : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
        Details = details;
    }

    public ApiException(Constants.ErrorDef error, object? details = null)
        : base(error.Message)
    {
        StatusCode = error.Status;
        ErrorCode = error.Code;
        Details = details;
    }
}
