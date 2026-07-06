using Altinn.Authorization.Api.Contracts.AccessManagement;
using AltinnServiceCatalogue.Server.Configuration;
using AltinnServiceCatalogue.Server.Models;
using AltinnServiceCatalogue.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace AltinnServiceCatalogue.Server.Controllers;

[ApiController]
[Route("api/v1/{environment}/meta")]
public class MetadataController(
    IMetadataClient client,
    IOptions<MetadataOptions> options,
    ILogger<MetadataController> logger) : ControllerBase
{
    private readonly MetadataOptions _options = options.Value;

    // ── Packages ────────────────────────────────────────────────────

    [HttpGet("info/accesspackages/search")]
    [ProducesResponseType<List<SearchObjectOfPackageDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchPackages(
        [FromRoute] string environment,
        [FromQuery] string? term,
        [FromQuery] string[]? resourceProviderCode,
        [FromQuery] bool? searchInResources,
        [FromQuery] string? typeName,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.SearchPackagesAsync(baseUrl, term, resourceProviderCode, searchInResources, typeName, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for SearchPackages in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/export")]
    [ProducesResponseType<List<AreaGroupDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportPackages(
        [FromRoute] string environment,
        [FromQuery] string? language,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.ExportPackagesAsync(baseUrl, language, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for ExportPackages in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/group")]
    [ProducesResponseType<List<AreaGroupDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGroups(
        [FromRoute] string environment,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetGroupsAsync(baseUrl, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetGroups in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/group/{id:guid}")]
    [ProducesResponseType<AreaGroupDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGroup(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetGroupAsync(baseUrl, id, ct);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetGroup({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/group/{id:guid}/area")]
    [ProducesResponseType<List<AreaDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetGroupAreas(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetGroupAreasAsync(baseUrl, id, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetGroupAreas({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/area/{id:guid}")]
    [ProducesResponseType<AreaDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetArea(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetAreaAsync(baseUrl, id, ct);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetArea({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/area/{id:guid}/package")]
    [ProducesResponseType<List<PackageDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAreaPackages(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetAreaPackagesAsync(baseUrl, id, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetAreaPackages({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/{id:guid}")]
    [ProducesResponseType<PackageDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPackage(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetPackageAsync(baseUrl, id, ct);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetPackage({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/urn/{urnValue}")]
    [ProducesResponseType<PackageDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPackageByUrn(
        [FromRoute] string environment,
        [FromRoute] string urnValue,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetPackageByUrnAsync(baseUrl, urnValue, ct);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetPackageByUrn({Urn}) in {Environment}", urnValue, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/{id:guid}/resource")]
    [ProducesResponseType<List<ResourceDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPackageResources(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetPackageResourcesAsync(baseUrl, id, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetPackageResources({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    // ── Roles ───────────────────────────────────────────────────────

    [HttpGet("info/roles")]
    [ProducesResponseType<List<RoleDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRoles(
        [FromRoute] string environment,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetRolesAsync(baseUrl, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetRoles in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/roles/{id:guid}")]
    [ProducesResponseType<RoleDto>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRole(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetRoleAsync(baseUrl, id, ct);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetRole({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/roles/packages")]
    [ProducesResponseType<List<PackageDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRolePackages(
        [FromRoute] string environment,
        [FromQuery] string role,
        [FromQuery] string variant,
        [FromQuery] bool? includeResources,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetRolePackagesAsync(baseUrl, role, variant, includeResources, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetRolePackages({Role}/{Variant}) in {Environment}", role, variant, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/roles/resources")]
    [ProducesResponseType<List<ResourceDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRoleResources(
        [FromRoute] string environment,
        [FromQuery] string role,
        [FromQuery] string variant,
        [FromQuery] bool? includePackageResources,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetRoleResourcesAsync(baseUrl, role, variant, includePackageResources, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetRoleResources({Role}/{Variant}) in {Environment}", role, variant, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/roles/{id:guid}/packages")]
    [ProducesResponseType<List<PackageDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRolePackagesById(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        [FromQuery] string variant,
        [FromQuery] bool? includeResources,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetRolePackagesByIdAsync(baseUrl, id, variant, includeResources, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetRolePackagesById({Id}/{Variant}) in {Environment}", id, variant, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/roles/{id:guid}/packages/byvariant")]
    [ProducesResponseType<List<RoleVariantPackagesDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRolePackagesByVariant(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetRolePackagesByVariantAsync(baseUrl, id, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetRolePackagesByVariant({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/roles/{id:guid}/resources")]
    [ProducesResponseType<List<ResourceDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetRoleResourcesById(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        [FromQuery] string variant,
        [FromQuery] bool? includePackageResources,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetRoleResourcesByIdAsync(baseUrl, id, variant, includePackageResources, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetRoleResourcesById({Id}/{Variant}) in {Environment}", id, variant, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("info/accesspackages/{id:guid}/roles")]
    [ProducesResponseType<List<RoleDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPackageRoles(
        [FromRoute] string environment,
        [FromRoute] Guid id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetPackageRolesAsync(baseUrl, id, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetPackageRoles({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    // ── Types ───────────────────────────────────────────────────────

    [HttpGet("types/organization/subtypes")]
    [ProducesResponseType<List<SubTypeDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrganizationSubTypes(
        [FromRoute] string environment,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetOrganizationSubTypesAsync(baseUrl, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetOrganizationSubTypes in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    private bool TryResolveBaseUrl(string environment, out string baseUrl)
    {
        return _options.Environments.TryGetValue(environment, out baseUrl!);
    }
}
