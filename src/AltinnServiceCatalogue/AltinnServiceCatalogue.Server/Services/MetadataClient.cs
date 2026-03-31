using System.Net.Http.Json;
using System.Text.Json;
using Altinn.Authorization.Api.Contracts.AccessManagement;
using Microsoft.AspNetCore.Http.Extensions;

namespace AltinnServiceCatalogue.Server.Services;

public class MetadataClient(IHttpClientFactory httpClientFactory, ILogger<MetadataClient> logger) : IMetadataClient
{
    private const string BasePath = "/accessmanagement/api/v1/meta";

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

    public async Task<List<AreaGroupDto>> ExportPackagesAsync(string baseUrl, CancellationToken ct)
    {
        var client = CreateClient();
        var url = $"{baseUrl}{BasePath}/info/accesspackages/export";
        logger.LogInformation("Fetching package export from {Url}", url);

        var response = await client.GetAsync(url, ct);
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
        var query = new QueryBuilder();
        if (includeResources.HasValue)
            query.Add("includeResources", includeResources.Value.ToString().ToLowerInvariant());

        var url = $"{baseUrl}{BasePath}/info/roles/{Uri.EscapeDataString(role)}/{Uri.EscapeDataString(variant)}/package{query}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<PackageDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<ResourceDto>> GetRoleResourcesAsync(string baseUrl, string role, string variant, bool? includePackageResources, CancellationToken ct)
    {
        var client = CreateClient();
        var query = new QueryBuilder();
        if (includePackageResources.HasValue)
            query.Add("includePackageResources", includePackageResources.Value.ToString().ToLowerInvariant());

        var url = $"{baseUrl}{BasePath}/info/roles/{Uri.EscapeDataString(role)}/{Uri.EscapeDataString(variant)}/resource{query}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<ResourceDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<PackageDto>> GetRolePackagesByIdAsync(string baseUrl, Guid id, string variant, bool? includeResources, CancellationToken ct)
    {
        var client = CreateClient();
        var query = new QueryBuilder();
        if (includeResources.HasValue)
            query.Add("includeResources", includeResources.Value.ToString().ToLowerInvariant());

        var url = $"{baseUrl}{BasePath}/info/roles/id/{id}/{Uri.EscapeDataString(variant)}/package{query}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<PackageDto>>(JsonOptions, ct) ?? [];
    }

    public async Task<List<ResourceDto>> GetRoleResourcesByIdAsync(string baseUrl, Guid id, string variant, bool? includePackageResources, CancellationToken ct)
    {
        var client = CreateClient();
        var query = new QueryBuilder();
        if (includePackageResources.HasValue)
            query.Add("includePackageResources", includePackageResources.Value.ToString().ToLowerInvariant());

        var url = $"{baseUrl}{BasePath}/info/roles/id/{id}/{Uri.EscapeDataString(variant)}/resource{query}";

        var response = await client.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<ResourceDto>>(JsonOptions, ct) ?? [];
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
