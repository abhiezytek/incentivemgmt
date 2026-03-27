namespace IncentiveApi.Models;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public string? Code { get; set; }
    public object? Details { get; set; }

    public static ApiResponse<T> Ok(T data) => new()
    {
        Success = true,
        Data = data
    };

    public static ApiResponse<T> Fail(string code, string error, object? details = null) => new()
    {
        Success = false,
        Code = code,
        Error = error,
        Details = details
    };

    public static ApiResponse<T> FromError(Utils.ErrorEntry entry, object? details = null) => new()
    {
        Success = false,
        Code = entry.Code,
        Error = entry.Message,
        Details = details
    };
}
