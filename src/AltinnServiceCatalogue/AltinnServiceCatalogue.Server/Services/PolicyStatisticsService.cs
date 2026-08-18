using AltinnServiceCatalogue.PolicyStatistics;
using Microsoft.Extensions.Caching.Memory;

namespace AltinnServiceCatalogue.Server.Services;

public sealed class PolicyStatisticsService(
    IResourceRegistryClient client,
    IResourceCacheService resourceCache,
    IMemoryCache memoryCache,
    ILogger<PolicyStatisticsService> logger) : IPolicyStatisticsService
{
    private static readonly TimeSpan PolicyCacheDuration = TimeSpan.FromMinutes(30);

    public async Task<PolicyStatisticsDto> GetAsync(string environment, string baseUrl, CancellationToken ct = default)
    {
        var cacheKey = $"policy-statistics-{baseUrl}";
        return await memoryCache.GetOrCreateCoalescedAsync(
            cacheKey,
            PolicyCacheDuration,
            async cancellationToken =>
            {
                var resources = await resourceCache.GetResourceListAsync(
                    baseUrl, includeApps: true, includeAltinn2: true, cancellationToken);
                var ids = resources.Select(static resource => resource.Identifier ?? string.Empty);

                logger.LogInformation(
                    "Starting policy statistics scan for {Environment} with concurrency {Concurrency}",
                    environment, PolicyStatisticsScanner.MaxConcurrency);

                var result = await PolicyStatisticsScanner.ScanAsync(
                    environment,
                    ids,
                    (id, token) => client.GetResourcePolicyAsync(baseUrl, id, token),
                    cancellationToken,
                    (id, exception) => logger.LogWarning(exception,
                        "Failed to fetch policy for {ResourceId} in {Environment}", id, environment),
                    (id, exception) => logger.LogWarning(exception,
                        "Failed to parse policy for {ResourceId} in {Environment}", id, environment));

                logger.LogInformation(
                    "Completed policy statistics scan for {Environment}: {Resources} resources in {ElapsedMs} ms",
                    environment, result.ResourcesScanned, result.ScanDurationMilliseconds);
                return result;
            },
            ct) ?? throw new InvalidOperationException("Policy statistics scan returned no result.");
    }
}
