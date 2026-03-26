namespace IncentiveApi.Utils;

using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using System.Text.RegularExpressions;

public static partial class CsvParserUtil
{
    private static readonly Regex DatePattern = GenerateDatePatternRegex();

    /// <summary>
    /// Parse a CSV file buffer into a list of dictionaries.
    /// Headers are lower-cased, trimmed, and spaces replaced with underscores.
    /// Columns matching a date-like pattern are converted to ISO-8601 (yyyy-MM-dd).
    /// Empty rows (all values blank) are skipped.
    /// </summary>
    public static List<Dictionary<string, object?>> ParseCsv(byte[] fileBuffer)
    {
        var rows = new List<Dictionary<string, object?>>();
        using var reader = new StreamReader(new MemoryStream(fileBuffer), detectEncodingFromByteOrderMarks: true);

        var config = new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            TrimOptions = TrimOptions.Trim,
            MissingFieldFound = null,
            BadDataFound = null,
        };

        using var csv = new CsvReader(reader, config);
        csv.Read();
        csv.ReadHeader();

        var rawHeaders = csv.HeaderRecord ?? [];
        var headers = rawHeaders
            .Select(h => Regex.Replace(h.Trim().ToLowerInvariant(), @"\s+", "_"))
            .ToArray();

        while (csv.Read())
        {
            var allEmpty = true;
            var row = new Dictionary<string, object?>();

            for (var i = 0; i < headers.Length; i++)
            {
                var header = headers[i];
                var value = i < csv.Parser.Count ? csv.GetField(i)?.Trim() : null;

                if (!string.IsNullOrEmpty(value))
                    allEmpty = false;

                if (!string.IsNullOrEmpty(value) && DatePattern.IsMatch(header))
                {
                    if (DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
                    {
                        row[header] = d.ToString("yyyy-MM-dd");
                        continue;
                    }
                }

                row[header] = string.IsNullOrEmpty(value) ? null : value;
            }

            if (!allEmpty)
                rows.Add(row);
        }

        return rows;
    }

    /// <summary>
    /// Parse CSV from a stream (e.g., an uploaded file).
    /// </summary>
    public static async Task<List<Dictionary<string, object?>>> ParseCsvAsync(Stream stream)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms);
        return ParseCsv(ms.ToArray());
    }

    [GeneratedRegex(@"date|_at$|_from$|_to$|period_start|period_end|effective", RegexOptions.IgnoreCase)]
    private static partial Regex GenerateDatePatternRegex();
}
