namespace IncentiveApi.Utils;

using IncentiveApi.Data;
using System.Text.Json;

public class DataMask
{
    private static readonly HashSet<string> PolicyKeys = new(StringComparer.OrdinalIgnoreCase)
    {
        "policy_number",
        "policy_no",
        "POLICY_NO",
        "POLICY_NUMBER",
        "policyNumber",
        "policyNo"
    };

    private readonly QueryHelper _queryHelper;
    private readonly ILogger<DataMask> _logger;

    private bool? _cachedValue;
    private DateTime _cacheExpiry = DateTime.MinValue;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public DataMask(QueryHelper queryHelper, ILogger<DataMask> logger)
    {
        _queryHelper = queryHelper;
        _logger = logger;
    }

    /// <summary>
    /// Checks if policy masking is enabled via the system_config table.
    /// Result is cached for 5 minutes. Defaults to true on error.
    /// </summary>
    public async Task<bool> ShouldMaskAsync()
    {
        if (_cachedValue.HasValue && DateTime.UtcNow < _cacheExpiry)
            return _cachedValue.Value;

        try
        {
            var row = await _queryHelper.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT config_value FROM system_config WHERE config_key = 'POLICY_MASK_ENABLED'");

            bool enabled = row is IDictionary<string, object> dict
                && dict.TryGetValue("config_value", out var val)
                && val?.ToString() == "TRUE";
            _cachedValue = enabled;
            _cacheExpiry = DateTime.UtcNow.Add(CacheTtl);
            return enabled;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to read POLICY_MASK_ENABLED from system_config");
            return true; // Default to masking on error — safer to over-mask
        }
    }

    /// <summary>
    /// Mask a single policy number string.
    /// Shows first 3 chars + asterisks + last 3 chars.
    /// Short strings (≤6 chars) are fully replaced with asterisks.
    /// </summary>
    public static string? MaskPolicyNumber(string? policyNo)
    {
        if (policyNo is null) return null;

        if (policyNo.Length <= 6)
            return new string('*', policyNo.Length);

        var first = policyNo[..3];
        var last = policyNo[^3..];
        var middle = new string('*', policyNo.Length - 6);
        return $"{first}{middle}{last}";
    }

    /// <summary>
    /// Recursively mask policy-number fields in a JSON element.
    /// Returns a new JsonElement with masked values.
    /// </summary>
    public static JsonElement MaskPolicyNumbersInJson(JsonElement element)
    {
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream))
        {
            MaskElement(writer, element);
        }
        stream.Position = 0;
        using var doc = JsonDocument.Parse(stream);
        return doc.RootElement.Clone();
    }

    private static void MaskElement(Utf8JsonWriter writer, JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartObject();
                foreach (var property in element.EnumerateObject())
                {
                    writer.WritePropertyName(property.Name);
                    if (IsPolicyKey(property.Name) &&
                        (property.Value.ValueKind == JsonValueKind.String ||
                         property.Value.ValueKind == JsonValueKind.Number))
                    {
                        var raw = property.Value.ValueKind == JsonValueKind.String
                            ? property.Value.GetString()
                            : property.Value.GetRawText();
                        writer.WriteStringValue(MaskPolicyNumber(raw));
                    }
                    else
                    {
                        MaskElement(writer, property.Value);
                    }
                }
                writer.WriteEndObject();
                break;

            case JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray())
                {
                    MaskElement(writer, item);
                }
                writer.WriteEndArray();
                break;

            default:
                element.WriteTo(writer);
                break;
        }
    }

    /// <summary>
    /// Recursively mask policy-number fields in a dictionary/object graph.
    /// </summary>
    public static object? MaskPolicyNumbersInObject(object? obj)
    {
        if (obj is null) return null;

        if (obj is IDictionary<string, object?> dict)
        {
            var result = new Dictionary<string, object?>();
            foreach (var kvp in dict)
            {
                if (IsPolicyKey(kvp.Key) && kvp.Value is string strVal)
                    result[kvp.Key] = MaskPolicyNumber(strVal);
                else
                    result[kvp.Key] = MaskPolicyNumbersInObject(kvp.Value);
            }
            return result;
        }

        if (obj is IList<object?> list)
        {
            return list.Select(MaskPolicyNumbersInObject).ToList();
        }

        return obj;
    }

    private static bool IsPolicyKey(string key) =>
        PolicyKeys.Contains(key);
}
