using Altinn.Authorization.Api.Contracts.AccessManagement;
using AltinnServiceCatalogue.Server.Models;

namespace AltinnServiceCatalogue.Server.Services;

/// <summary>
/// Client interface for calling the Altinn Access Management Metadata API.
/// </summary>
public interface IMetadataClient
{
    // Packages
    Task<List<SearchObjectOfPackageDto>> SearchPackagesAsync(string baseUrl, string? term, string[]? resourceProviderCode, bool? searchInResources, string? typeName, CancellationToken ct = default);
    Task<List<AreaGroupDto>> ExportPackagesAsync(string baseUrl, string? language = null, CancellationToken ct = default);
    Task<List<AreaGroupDto>> GetGroupsAsync(string baseUrl, CancellationToken ct = default);
    Task<AreaGroupDto?> GetGroupAsync(string baseUrl, Guid id, CancellationToken ct = default);
    Task<List<AreaDto>> GetGroupAreasAsync(string baseUrl, Guid id, CancellationToken ct = default);
    Task<AreaDto?> GetAreaAsync(string baseUrl, Guid id, CancellationToken ct = default);
    Task<List<PackageDto>> GetAreaPackagesAsync(string baseUrl, Guid id, CancellationToken ct = default);
    Task<PackageDto?> GetPackageAsync(string baseUrl, Guid id, CancellationToken ct = default);
    Task<PackageDto?> GetPackageByUrnAsync(string baseUrl, string urnValue, CancellationToken ct = default);
    Task<List<ResourceDto>> GetPackageResourcesAsync(string baseUrl, Guid id, CancellationToken ct = default);

    // Roles
    Task<List<RoleDto>> GetRolesAsync(string baseUrl, CancellationToken ct = default);
    Task<RoleDto?> GetRoleAsync(string baseUrl, Guid id, CancellationToken ct = default);
    Task<List<PackageDto>> GetRolePackagesAsync(string baseUrl, string role, string variant, bool? includeResources, CancellationToken ct = default);
    Task<List<ResourceDto>> GetRoleResourcesAsync(string baseUrl, string role, string variant, bool? includePackageResources, CancellationToken ct = default);
    Task<List<PackageDto>> GetRolePackagesByIdAsync(string baseUrl, Guid id, string variant, bool? includeResources, CancellationToken ct = default);

    /// <summary>
    /// Probes every organization entity variant for packages the role grants, returning only variants
    /// with at least one package. Used as a fallback when the default variant yields no packages
    /// (some role->package relations only apply to specific enterprise types, e.g. Forretningsfører
    /// grants packages only for NUF/ESEK/BRL). The result is cached in memory.
    /// </summary>
    Task<List<RoleVariantPackagesDto>> GetRolePackagesByVariantAsync(string baseUrl, Guid id, CancellationToken ct = default);
    Task<List<ResourceDto>> GetRoleResourcesByIdAsync(string baseUrl, Guid id, string variant, bool? includePackageResources, CancellationToken ct = default);

    /// <summary>
    /// Returns roles that grant the specified access package. Built by inverting the role->packages
    /// mapping across all roles, with the inverted map cached in memory.
    /// </summary>
    Task<List<RoleDto>> GetPackageRolesAsync(string baseUrl, Guid packageId, CancellationToken ct = default);

    // Types
    Task<List<SubTypeDto>> GetOrganizationSubTypesAsync(string baseUrl, CancellationToken ct = default);
}
