using System.Net.Http.Json;
using System.Text.Json;
using Altinn.ResourceRegistry.Core.Models;
using Microsoft.Extensions.Caching.Memory;

namespace AltinnServiceCatalogue.Server.Services;

public class ResourceCacheService(
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache,
    ILogger<ResourceCacheService> logger) : IResourceCacheService
{
    private const string BasePath = "/resourceregistry/api/v1/resource";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public async Task<List<ServiceResource>> GetResourceListAsync(string baseUrl, bool? includeApps = null, bool? includeAltinn2 = null, CancellationToken ct = default)
    {
        var cacheKey = $"resource-list-{baseUrl}-{includeApps}-{includeAltinn2}";
        return await cache.GetOrCreateCoalescedAsync<List<ServiceResource>>(
            cacheKey,
            CacheDuration,
            async cancellationToken =>
            {
                var client = httpClientFactory.CreateClient("ResourceRegistry");
                var url = $"{baseUrl}{BasePath}/resourcelist";

                var queryParams = new List<string> { "includeMigratedApps=true" };
                if (includeApps.HasValue)
                    queryParams.Add($"includeApps={includeApps.Value.ToString().ToLower()}");
                if (includeAltinn2.HasValue)
                    queryParams.Add($"includeAltinn2={includeAltinn2.Value.ToString().ToLower()}");
                url += "?" + string.Join("&", queryParams);

                logger.LogInformation("Fetching and caching resource list from {Url}", url);

                var response = await client.GetAsync(url, cancellationToken);
                response.EnsureSuccessStatusCode();
                var resources = await response.Content.ReadFromJsonAsync<List<ServiceResource>>(JsonOptions, cancellationToken) ?? [];

                var dict = resources
                    .Where(r => !string.IsNullOrEmpty(r.Identifier))
                    .DistinctBy(r => r.Identifier!, StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(r => r.Identifier!, StringComparer.OrdinalIgnoreCase);
                cache.Set($"resource-dict-{baseUrl}-{includeApps}-{includeAltinn2}", dict, CacheDuration);

                return resources;
            },
            ct) ?? [];
    }

    public async Task<ServiceResource?> GetResourceByIdAsync(string baseUrl, string id, CancellationToken ct)
    {
        var dictKey = $"resource-dict-{baseUrl}-{(bool?)null}-{(bool?)null}";

        if (!cache.TryGetValue(dictKey, out Dictionary<string, ServiceResource>? dict) || dict is null)
        {
            await GetResourceListAsync(baseUrl, ct: ct);
            cache.TryGetValue(dictKey, out dict);
        }

        return dict is not null && dict.TryGetValue(id, out var resource) ? resource : null;
    }

    public async Task<List<string>> GetKeywordsAsync(string baseUrl, bool? includeApps, bool? includeAltinn2, CancellationToken ct)
    {
        var resources = await GetResourceListAsync(baseUrl, includeApps, includeAltinn2, ct);

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var keywords = new List<string>();

        foreach (var resource in resources)
        {
            if (resource.Keywords is null) continue;
            foreach (var kw in resource.Keywords)
            {
                if (!string.IsNullOrWhiteSpace(kw.Word) && seen.Add(kw.Word))
                {
                    keywords.Add(kw.Word);
                }
            }
        }

        keywords.Sort(StringComparer.OrdinalIgnoreCase);
        return keywords;
    }

    public async Task<List<ServiceResource>> GetResourcesByKeywordAsync(string baseUrl, string keyword, CancellationToken ct)
    {
        var resources = await GetResourceListAsync(baseUrl, ct: ct);

        return resources
            .Where(r => r.Keywords?.Any(kw =>
                string.Equals(kw.Word, keyword, StringComparison.OrdinalIgnoreCase)) == true)
            .ToList();
    }
}
