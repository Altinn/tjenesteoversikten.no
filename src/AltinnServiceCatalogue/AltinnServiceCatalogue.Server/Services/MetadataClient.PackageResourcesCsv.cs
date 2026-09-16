using System.Text;
using System.Net.Http.Json;
using Altinn.Authorization.Api.Contracts.AccessManagement;

namespace AltinnServiceCatalogue.Server.Services;

public partial class MetadataClient
{
    public async Task<byte[]> ExportPackageResourcesCsvAsync(string baseUrl, CancellationToken ct = default)
    {
        return await cache.GetOrCreateCoalescedAsync(
            $"metadata-package-resources-csv-{baseUrl}-nb",
            CacheDuration,
            async cancellationToken =>
            {
                // The hierarchy export omits resources. An unfiltered search includes all
                // packages and their resources in one request, including retired services.
                using var request = new HttpRequestMessage(HttpMethod.Get,
                    $"{baseUrl}{BasePath}/info/accesspackages/search");
                request.Headers.AcceptLanguage.ParseAdd("nb");
                using var response = await CreateClient().SendAsync(request, cancellationToken);
                response.EnsureSuccessStatusCode();
                var results = await response.Content.ReadFromJsonAsync<List<SearchObjectOfPackageDto>>(
                    JsonOptions, cancellationToken)
                    ?? throw new System.Text.Json.JsonException("Missing package search results");

                var rows = results.SelectMany(result => (result.Object.Resources ?? [])
                    .Select(resource => (PackageUrn: result.Object.Urn, Resource: resource)))
                    .DistinctBy(row => (row.PackageUrn, row.Resource.RefId))
                    .OrderBy(row => row.PackageUrn, StringComparer.Ordinal)
                    .ThenBy(row => row.Resource.RefId, StringComparer.Ordinal);

                var csv = new StringBuilder("pakkeurn,ressursid,ressurs_org,ressursnavn_nb\r\n");
                foreach (var (packageUrn, resource) in rows)
                {
                    csv.AppendJoin(',', new[] { packageUrn, resource.RefId, resource.Provider?.Code, resource.Name }
                        .Select(EscapeCsvField));
                    csv.Append("\r\n");
                }

                // A BOM lets spreadsheet applications recognize Norwegian characters as UTF-8.
                return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
            }, ct) ?? throw new InvalidOperationException("Missing CSV export");
    }

    private static string EscapeCsvField(string? value)
    {
        value ??= "";
        // Keep externally supplied names from being evaluated as spreadsheet formulas.
        var trimmed = value.TrimStart();
        if (trimmed.Length > 0 && "=+-@".Contains(trimmed[0])
            || value.StartsWith('\t') || value.StartsWith('\r') || value.StartsWith('\n'))
            value = "'" + value;
        return "\"" + value.Replace("\"", "\"\"") + "\"";
    }
}
