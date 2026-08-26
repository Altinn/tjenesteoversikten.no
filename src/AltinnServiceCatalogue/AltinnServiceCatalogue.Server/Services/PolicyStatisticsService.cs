using AltinnServiceCatalogue.PolicyStatistics;
using Microsoft.Extensions.Caching.Memory;

namespace AltinnServiceCatalogue.Server.Services;

public sealed class PolicyStatisticsService(
    IResourceRegistryClient client,
    IResourceCacheService resourceCache,
    IMetadataClient metadataClient,
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
                var roles = await metadataClient.GetRolesAsync(baseUrl, cancellationToken);
                var erLegacyRoleCodes = roles
                    .Where(static role => !string.IsNullOrWhiteSpace(role.LegacyRoleCode)
                        && (string.Equals(role.Provider?.Code, "sys-ccr", StringComparison.OrdinalIgnoreCase)
                            || role.Urn?.StartsWith(
                                "urn:altinn:external-role:ccr:",
                                StringComparison.OrdinalIgnoreCase) == true))
                    .Select(static role => role.LegacyRoleCode)
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);
                var resourceMetadata = resources.Select(static resource => new PolicyResourceMetadataDto(
                    resource.Identifier ?? string.Empty,
                    resource.Title ?? new Dictionary<string, string>(),
                    resource.HasCompetentAuthority?.Orgcode
                        ?? resource.HasCompetentAuthority?.Organization
                        ?? string.Empty,
                    resource.HasCompetentAuthority?.Name ?? new Dictionary<string, string>(),
                    resource.ResourceType.ToString()));

                logger.LogInformation(
                    "Starting policy statistics scan for {Environment} with concurrency {Concurrency}",
                    environment, PolicyStatisticsScanner.MaxConcurrency);

                var result = await PolicyStatisticsScanner.ScanAsync(
                    environment,
                    resourceMetadata,
                    (id, token) => client.GetResourcePolicyAsync(baseUrl, id, token),
                    cancellationToken,
                    (id, exception) => logger.LogWarning(exception,
                        "Failed to fetch policy for {ResourceId} in {Environment}", id, environment),
                    (id, exception) => logger.LogWarning(exception,
                        "Failed to parse policy for {ResourceId} in {Environment}", id, environment),
                    erLegacyRoleCodes);

                logger.LogInformation(
                    "Completed policy statistics scan for {Environment}: {Resources} resources in {ElapsedMs} ms",
                    environment, result.ResourcesScanned, result.ScanDurationMilliseconds);
                return result;
            },
            ct) ?? throw new InvalidOperationException("Policy statistics scan returned no result.");
    }
}
