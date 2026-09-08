using Altinn.Authorization.Api.Contracts.AccessManagement;
namespace AltinnServiceCatalogue.Server.Models;

public record RoleMapContext(string Code, string? Description, string Kind);
public record RoleMapContexts(string Status, List<RoleMapContext> Items, string? ErrorCode)
{
    public string Source => "person-and-organization-subtypes";
}
public record RoleMapSelection(string Status, List<PackageDto>? Packages, int? PackageCount, string? ErrorCode);
public record RolePackageMapDto(string Environment, RoleDto Role, string SelectedVariant, string Status,
    RoleMapContexts ContextDiscovery, RoleMapSelection Selection);
public sealed class RoleMapException(string code, int status = 502) : Exception(code)
{
    public string Code { get; } = code;
    public int Status { get; } = status;
}