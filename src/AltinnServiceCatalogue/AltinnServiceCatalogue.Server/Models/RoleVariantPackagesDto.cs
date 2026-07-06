using Altinn.Authorization.Api.Contracts.AccessManagement;

namespace AltinnServiceCatalogue.Server.Models;

/// <summary>
/// The access packages a role grants for one specific entity variant (organization form).
/// Used when a role has no variant-independent packages and packages must be resolved per variant.
/// </summary>
public class RoleVariantPackagesDto
{
    /// <summary>Entity variant name, e.g. "NUF", "ESEK", "BRL".</summary>
    public required string VariantName { get; set; }

    /// <summary>Human-readable description of the entity variant.</summary>
    public string? VariantDescription { get; set; }

    /// <summary>Packages the role grants for this entity variant.</summary>
    public List<PackageDto> Packages { get; set; } = [];
}
