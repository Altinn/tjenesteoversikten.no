using System.Net.Http.Json;
using System.Text.Json;
using Altinn.Authorization.Api.Contracts.AccessManagement;
using AltinnServiceCatalogue.Server.Models;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.Extensions.Caching.Memory;

namespace AltinnServiceCatalogue.Server.Services;

public class MetadataClient(
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache,
    ILogger<MetadataClient> logger) : IMetadataClient
{
    private const string BasePath = "/accessmanagement/api/v1/meta";

    /// <summary>Variant used when inverting role->packages to a package->roles map.</summary>
    private const string DefaultRoleVariant = "person";

    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    // Packages

    public async Task<List<SearchObjectOfPackageDto>> SearchPackagesAsync(string baseUrl, string? term, string[]? resourceProviderCode, bool? searchInResources, string? typeName, CancellationToken ct)
    {
        var client = CreateClient();
        var query = new QueryBuilder();
        if (!string.IsNullOrEmpty(term))
            query.Add("term", term);
        if (resourceProviderCode is { Length: > 0 })
            foreach (var code in resourceProviderCode)
                query.Add("resourceProviderCode", code);
        if (searchInResources.HasValue)
            query.Add("searchInResources", searchInResources.Value.ToString().ToLowerInvariant());
        if (!string.IsNullOrEmpty(typeName))
            query.Add("typeName", typeName);

        var url = $"{baseUrl}{BasePath}/info/accesspackages/search{query}";
        logger.LogInformation("Fetching package search from {Url}", url);

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<SearchObjectOfPackageDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<AreaGroupDto>> ExportPackagesAsync(string baseUrl, string? language, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/export";
        logger.LogInformation("Fetching package export from {Url} (language: {Language})", url, language ?? "default");

        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (!string.IsNullOrEmpty(language))
            request.Headers.Add("Accept-Language", language);

        var response = await client.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<AreaGroupDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<AreaGroupDto>> GetGroupsAsync(string baseUrl, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/group";
        logger.LogInformation("Fetching groups from {Url}", url);

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<AreaGroupDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<AreaGroupDto?> GetGroupAsync(string baseUrl, Guid id, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/group/{id}";

        var response = await client.GetAsync(url, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AreaGroupDto>(JsonOptions, ct);
    }

    public async Task<List<AreaDto>> GetGroupAreasAsync(string baseUrl, Guid id, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/group/{id}/area";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<AreaDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<AreaDto?> GetAreaAsync(string baseUrl, Guid id, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/area/{id}";

        var response = await client.GetAsync(url, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AreaDto>(JsonOptions, ct);
    }

    public async Task<List<PackageDto>> GetAreaPackagesAsync(string baseUrl, Guid id, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/area/{id}/package";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<PackageDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<PackageDto?> GetPackageAsync(string baseUrl, Guid id, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/{id}";

        var response = await client.GetAsync(url, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PackageDto>(JsonOptions, ct);
    }

    public async Task<PackageDto?> GetPackageByUrnAsync(string baseUrl, string urnValue, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/urn/{Uri.EscapeDataString(urnValue)}";

        var response = await client.GetAsync(url, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PackageDto>(JsonOptions, ct);
    }

    public async Task<List<ResourceDto>> GetPackageResourcesAsync(string baseUrl, Guid id, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/{id}/resource";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<ResourceDto>>(JsonOptions, ct) ?? [];
    }

    // Roles

    public async Task<List<RoleDto>> GetRolesAsync(string baseUrl, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/roles";
        logger.LogInformation("Fetching roles from {Url}", url);

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<RoleDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<RoleDto?> GetRoleAsync(string baseUrl, Guid id, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/roles/{id}";

        var response = await client.GetAsync(url, ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return null;
        response.EnsureSuccessStatusCode();
        // Upstream returns an array even for a single role lookup
        var roles = await response.Content.ReadFromJsonAsync<List<RoleDto>>(JsonOptions, ct);
        return roles?.FirstOrDefault();
    }

    public async Task<List<PackageDto>> GetRolePackagesAsync(string baseUrl, string role, string variant, bool? includeResources, CancellationToken ct)
    {
        var client = CreateClient();
        var query = new QueryBuilder
        {
            { "role", role },
            { "variant", variant },
        };
        if (includeResources.HasValue)
            query.Add("includeResources", includeResources.Value.ToString().ToLowerInvariant());

        var url = $"{baseUrl}{BasePath}/info/roles/packages{query}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<PackageDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<ResourceDto>> GetRoleResourcesAsync(string baseUrl, string role, string variant, bool? includePackageResources, CancellationToken ct)
    {
        var client = CreateClient();
        var query = new QueryBuilder
        {
            { "role", role },
            { "variant", variant },
        };
        if (includePackageResources.HasValue)
            query.Add("includePackageResources", includePackageResources.Value.ToString().ToLowerInvariant());

        var url = $"{baseUrl}{BasePath}/info/roles/resources{query}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<ResourceDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<PackageDto>> GetRolePackagesByIdAsync(string baseUrl, Guid id, string variant, bool? includeResources, CancellationToken ct)
    {
        var client = CreateClient();
        var query = new QueryBuilder
        {
            { "variant", variant },
        };
        if (includeResources.HasValue)
            query.Add("includeResources", includeResources.Value.ToString().ToLowerInvariant());

        var url = $"{baseUrl}{BasePath}/info/roles/{id}/packages{query}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<PackageDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<ResourceDto>> GetRoleResourcesByIdAsync(string baseUrl, Guid id, string variant, bool? includePackageResources, CancellationToken ct)
    {
        var client = CreateClient();
        var query = new QueryBuilder
        {
            { "variant", variant },
        };
        if (includePackageResources.HasValue)
            query.Add("includePackageResources", includePackageResources.Value.ToString().ToLowerInvariant());

        var url = $"{baseUrl}{BasePath}/info/roles/{id}/resources{query}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<ResourceDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<RoleVariantPackagesDto>> GetRolePackagesByVariantAsync(string baseUrl, Guid id, CancellationToken ct = default)
    {
        var cacheKey = $"role-packages-by-variant-{baseUrl}-{id}";
        if (cache.TryGetValue(cacheKey, out List<RoleVariantPackagesDto>? cached) && cached is not null)
            return cached;

        logger.LogInformation("Probing role {RoleId} packages across entity variants for {BaseUrl}", id, baseUrl);

        // The upstream API has no endpoint exposing which entity variants a role->package
        // relation is gated to, so probe every organization variant and keep the ones that hit.
        var variants = await GetOrganizationSubTypesAsync(baseUrl, ct);

        // Limit upstream concurrency so we don't hammer the metadata service.
        using var gate = new SemaphoreSlim(10);
        var tasks = variants.Select(async variant =>
        {
            await gate.WaitAsync(ct);
            try
            {
                var pkgs = await GetRolePackagesByIdAsync(baseUrl, id, variant.Name, includeResources: false, ct);
                return (variant, pkgs);
            }
            catch (HttpRequestException ex)
            {
                logger.LogWarning(ex, "Failed to fetch packages for role {RoleId} with variant {Variant}; skipping", id, variant.Name);
                return (variant, pkgs: new List<PackageDto>());
            }
            finally
            {
                gate.Release();
            }
        });

        var results = await Task.WhenAll(tasks);
        var byVariant = results
            .Where(r => r.pkgs.Count > 0)
            .OrderBy(r => r.variant.Name, StringComparer.OrdinalIgnoreCase)
            .Select(r => new RoleVariantPackagesDto
            {
                VariantName = r.variant.Name,
                VariantDescription = r.variant.Description,
                Packages = [.. r.pkgs.OrderBy(p => p.Name, StringComparer.OrdinalIgnoreCase)],
            })
            .ToList();

        cache.Set(cacheKey, byVariant, CacheDuration);
        logger.LogInformation("Role {RoleId} grants packages for {Variants} of {Probed} entity variants", id, byVariant.Count, variants.Count);
        return byVariant;
    }

    public async Task<List<RoleDto>> GetPackageRolesAsync(string baseUrl, Guid packageId, CancellationToken ct)
    {
        var map = await GetPackageRolesMapAsync(baseUrl, ct);
        return map.TryGetValue(packageId, out var roles) ? roles : [];
    }

    /// <summary>
    /// Builds (and caches) a map of access-package-id -> roles that grant the package.
    /// Upstream has no direct package->roles endpoint, so we invert role->packages across all roles.
    /// </summary>
    private async Task<Dictionary<Guid, List<RoleDto>>> GetPackageRolesMapAsync(string baseUrl, CancellationToken ct)
    {
        var cacheKey = $"package-roles-map-{baseUrl}";
        if (cache.TryGetValue(cacheKey, out Dictionary<Guid, List<RoleDto>>? cached) && cached is not null)
            return cached;

        logger.LogInformation("Building package->roles inverted map for {BaseUrl}", baseUrl);

        var roles = await GetRolesAsync(baseUrl, ct);
        var map = new Dictionary<Guid, List<RoleDto>>();

        // Limit upstream concurrency so we don't hammer the metadata service.
        using var gate = new SemaphoreSlim(10);
        var tasks = roles.Select(async role =>
        {
            await gate.WaitAsync(ct);
            try
            {
                var pkgs = await GetRolePackagesByIdAsync(baseUrl, role.Id, DefaultRoleVariant, includeResources: false, ct);
                return (role, pkgs);
            }
            catch (HttpRequestException ex)
            {
                logger.LogWarning(ex, "Failed to fetch packages for role {RoleId} ({RoleCode}); skipping", role.Id, role.Code);
                return (role, new List<PackageDto>());
            }
            finally
            {
                gate.Release();
            }
        });

        var results = await Task.WhenAll(tasks);
        foreach (var (role, pkgs) in results)
        {
            foreach (var pkg in pkgs)
            {
                if (!map.TryGetValue(pkg.Id, out var list))
                {
                    list = [];
                    map[pkg.Id] = list;
                }
                list.Add(role);
            }
        }

        // Sort each role list by name for stable output.
        foreach (var key in map.Keys.ToList())
            map[key] = [.. map[key].OrderBy(r => r.Name, StringComparer.OrdinalIgnoreCase)];

        cache.Set(cacheKey, map, CacheDuration);
        logger.LogInformation("Built package->roles map with {Packages} packages from {Roles} roles", map.Count, roles.Count);
        return map;
    }

    // Types

    public async Task<List<SubTypeDto>> GetOrganizationSubTypesAsync(string baseUrl, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/types/organization/subtypes";
        logger.LogInformation("Fetching organization subtypes from {Url}", url);

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<SubTypeDto>>(JsonOptions, ct) ?? [];
    }

    private HttpClient CreateClient() => httpClientFactory.CreateClient("Metadata");
}
