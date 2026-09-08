using AltinnServiceCatalogue.Server.Models;
using AltinnServiceCatalogue.Server.Services;
using Microsoft.AspNetCore.Mvc;
namespace AltinnServiceCatalogue.Server.Controllers;

public partial class MetadataController
{
    [HttpGet("info/roles/map-options")]
    public Task<IActionResult> GetRoleMapOptions(string environment, CancellationToken ct) =>
        MapResponse(environment, baseUrl => client.GetRoleMapOptionsAsync(baseUrl, ct));

    [HttpGet("info/roles/{id}/package-map")]
    public Task<IActionResult> GetRolePackageMap(string environment, string id, CancellationToken ct)
    {
        if (!Guid.TryParse(id, out var roleId) || roleId == Guid.Empty)
            return Task.FromResult(MapProblem("invalid_role_id", 400));
        var variant = Request.Query.ContainsKey("variant") ? Request.Query["variant"].ToString() : "person";
        if (!MetadataClient.IsMapVariant(variant) || Request.Query["variant"].Count > 1)
            return Task.FromResult(MapProblem("invalid_variant", 400));
        return MapResponse(environment, baseUrl => client.GetRolePackageMapAsync(baseUrl, environment.ToLowerInvariant(), roleId, variant.Trim(), ct));
    }
    private async Task<IActionResult> MapResponse<T>(string environment, Func<string, Task<T>> fetch)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl)) return MapProblem("invalid_environment", 400);
        try { return Ok(await fetch(baseUrl)); }
        catch (RoleMapException ex) { return MapProblem(ex.Code, ex.Status); }
    }
    private IActionResult MapProblem(string code, int status) =>
        Problem(statusCode: status, title: status < 500 ? "Map selection unavailable" : "Metadata unavailable",
            extensions: new Dictionary<string, object?> { ["code"] = code });
}