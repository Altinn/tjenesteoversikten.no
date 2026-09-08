using System.Net;
using System.Text.Json;
using Altinn.Authorization.Api.Contracts.AccessManagement;
using AltinnServiceCatalogue.Server.Models;
namespace AltinnServiceCatalogue.Server.Services;

public partial class MetadataClient
{
    public static bool IsMapVariant(string? value) =>
        !string.IsNullOrWhiteSpace(value) && value.Trim().Length <= 128 && !value.Any(char.IsControl);

    private async Task<List<T>> ReadMapArray<T>(string url, CancellationToken ct, bool roleLookup = false) where T : class
    {
        try
        {
            using var response = await CreateClient().GetAsync(url, ct);
            if (roleLookup && response.StatusCode == HttpStatusCode.NotFound) throw new RoleMapException("role_not_found", 404);
            if (!response.IsSuccessStatusCode) throw new RoleMapException("upstream_http_error");
            var items = await response.Content.ReadFromJsonAsync<List<T>>(JsonOptions, ct);
            if (items is null || items.Any(x => x is null)) throw new RoleMapException("invalid_upstream_payload");
            return items;
        }
        catch (JsonException) { throw new RoleMapException("invalid_upstream_payload"); }
        catch (HttpRequestException) { throw new RoleMapException("upstream_http_error"); }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested) { throw new RoleMapException("upstream_timeout", 504); }
    }

    public async Task<List<RoleDto>> GetRoleMapOptionsAsync(string baseUrl, CancellationToken ct) =>
        (await cache.GetOrCreateCoalescedAsync<List<RoleDto>>($"map-roles:{baseUrl}", CacheDuration, async token =>
        {
            var roles = await ReadMapArray<RoleDto>($"{baseUrl}{BasePath}/info/roles", token);
            if (roles.Any(r => r.Id == Guid.Empty)) throw new RoleMapException("invalid_upstream_payload");
            return roles.DistinctBy(r => r.Id).ToList();
        }, ct))!;

    private async Task<RoleDto> MapRole(string baseUrl, Guid id, CancellationToken ct) =>
        (await cache.GetOrCreateCoalescedAsync<RoleDto>($"map-role:{baseUrl}:{id}", CacheDuration, async token =>
        {
            var roles = await ReadMapArray<RoleDto>($"{baseUrl}{BasePath}/info/roles/{id}", token, true);
            if (roles.Count == 0) throw new RoleMapException("role_not_found", 404);
            if (roles.Count != 1 || roles[0].Id != id || id == Guid.Empty) throw new RoleMapException("invalid_upstream_payload");
            return roles[0];
        }, ct))!;

    private async Task<List<RoleMapContext>> MapContexts(string baseUrl, CancellationToken ct) =>
        (await cache.GetOrCreateCoalescedAsync<List<RoleMapContext>>($"map-contexts:{baseUrl}", CacheDuration, async token =>
        {
            var subtypes = await ReadMapArray<SubTypeDto>($"{baseUrl}{BasePath}/types/organization/subtypes", token);
            if (subtypes.Any(s => !IsMapVariant(s.Name))) throw new RoleMapException("invalid_upstream_payload");
            return new[] { new RoleMapContext("person", null, "person") }
                .Concat(subtypes.Select(s => new RoleMapContext(s.Name.Trim(), s.Description, "organization")))
                .DistinctBy(s => s.Code, StringComparer.OrdinalIgnoreCase).ToList();
        }, ct))!;

    private async Task<List<PackageDto>> MapPackages(string baseUrl, Guid id, string variant, CancellationToken ct) =>
        (await cache.GetOrCreateCoalescedAsync<List<PackageDto>>($"map-packages:{baseUrl}:{id}:{variant.ToLowerInvariant()}:no-resources", CacheDuration, async token =>
        {
            var packages = await ReadMapArray<PackageDto>($"{baseUrl}{BasePath}/info/roles/{id}/packages?variant={Uri.EscapeDataString(variant)}&includeResources=false", token);
            if (packages.Any(p => p.Id == Guid.Empty)) throw new RoleMapException("invalid_upstream_payload");
            if (packages.GroupBy(p => p.Id).Any(g => g.Select(p => p.Area?.Id).Distinct().Count() > 1))
                logger.LogWarning("Conflicting area metadata for duplicate package IDs in role {RoleId}", id);
            return packages.DistinctBy(p => p.Id).ToList();
        }, ct))!;

    private static async Task<(T? Value, string? Error)> MapOutcome<T>(Func<Task<T>> action) where T : class
    {
        try { return (await action(), null); }
        catch (RoleMapException ex) { return (null, ex.Code); }
    }

    public async Task<RolePackageMapDto> GetRolePackageMapAsync(string baseUrl, string environment, Guid id, string variant, CancellationToken ct)
    {
        var roleTask = MapRole(baseUrl, id, ct);
        var contextsTask = MapOutcome(() => MapContexts(baseUrl, ct));
        // Observe both outcomes, including when the required role fails.
        await Task.WhenAll(roleTask, contextsTask);
        var role = await roleTask;
        var (contexts, contextError) = await contextsTask;
        contexts ??= [new("person", null, "person")];
        var selected = contexts.FirstOrDefault(c => c.Code.Equals(variant, StringComparison.OrdinalIgnoreCase));
        if (selected is null && contextError is null) throw new RoleMapException("invalid_variant", 400);
        RoleMapSelection selection;
        if (selected is null)
            selection = new("unavailable", null, null, "context_catalog_unavailable");
        else
        {
            var (packages, packageError) = await MapOutcome(() => MapPackages(baseUrl, id, selected.Code, ct));
            selection = packages is null ? new("failed", null, null, packageError) : new("complete", packages, packages.Count, null);
        }
        ct.ThrowIfCancellationRequested();
        var status = contextError is null ? (selection.Status == "complete" ? "complete" : "partial")
            : (selection.Status == "complete" ? "partial" : "failed");
        return new(environment, role, selected?.Code ?? variant, status,
            new(contextError is null ? "complete" : "failed", contexts, contextError), selection);
    }
}