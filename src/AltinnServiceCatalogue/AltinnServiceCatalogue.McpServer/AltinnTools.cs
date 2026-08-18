using System.ComponentModel;
using System.Text.Json;
using Altinn.ResourceRegistry.Core.Models;
using ModelContextProtocol.Server;

namespace AltinnServiceCatalogue.McpServer;

[McpServerToolType]
public sealed class AltinnTools
{
    // Reused description for the per-call environment selector. Calls default to production;
    // tt02 (test) is only used when the user explicitly asks for it.
    private const string EnvDescription =
        "Altinn environment: 'prod' (default, production) or 'tt02' (test). Only use 'tt02' when the user explicitly asks for it.";
    private const string DefaultRoleEntityVariant = "person";

    private static string ToJson<T>(T value) => JsonSerializer.Serialize(value, AltinnApiClient.JsonOptions);

    [McpServerTool, Description("Get a specific resource from the Altinn Resource Registry by its identifier. Returns full resource details including title, description, rights, contact points, etc.")]
    public static async Task<string> GetResource(
        AltinnApiClient client,
        [Description("The resource identifier, e.g. 'skd_mva' or 'nav_dagpenger'")] string id,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetResourceAsync(id, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Search for resources in the Altinn Resource Registry. All parameters are optional and combined as filters.")]
    public static async Task<string> SearchResources(
        AltinnApiClient client,
        [Description("Filter by resource ID (partial match)")] string? id = null,
        [Description("Filter by title (partial match)")] string? title = null,
        [Description("Filter by description (partial match)")] string? description = null,
        [Description("Filter by resource type, e.g. 'GenericAccessResource', 'Systemresource', 'MaskinportenSchema', 'Altinn2Service', 'AltinnApp', 'MigratedApp', 'BrokerService', 'CorrespondenceService'")] string? resourceType = null,
        [Description("Filter by keyword")] string? keyword = null,
        [Description("Filter by reference (e.g. MaskinportenScope, ServiceCode)")] string? reference = null,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.SearchResourcesAsync(id, title, description, resourceType, keyword, reference, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get the full list of resources from the Altinn Resource Registry. Can be large - consider using SearchResources instead for targeted queries.")]
    public static async Task<string> GetResourceList(
        AltinnApiClient client,
        [Description("Include Altinn 3 app resources")] bool includeApps = false,
        [Description("Include legacy Altinn 2 resources")] bool includeAltinn2 = false,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetResourceListAsync(includeApps, includeAltinn2, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Scan every resource policy and aggregate XACML RuleCombiningAlgId usage, Deny rules, MustBePresent, conditions, legacy-PDP risk, and fetch/parse coverage.")]
    public static async Task<string> GetPolicyStatistics(
        AltinnApiClient client,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetPolicyStatisticsAsync(environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get the list of organizations registered in the Altinn Resource Registry, including their names, logos, and org numbers.")]
    public static async Task<string> GetOrganizations(
        AltinnApiClient client,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetOrgsAsync(environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get the delegable rights (actions) for a specific resource. Returns what actions can be delegated and to whom.")]
    public static async Task<string> GetResourceRights(
        AltinnApiClient client,
        [Description("The resource identifier")] string id,
        [Description("Language code for response: 'nb' (Norwegian Bokmål), 'nn' (Nynorsk), or 'en' (English)")] string language = "nb",
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        return await client.GetResourcePolicyRightsAsync(id, language, environment, ct);
    }

    [McpServerTool, Description("Get the subjects (roles and access packages) that have access to a specific resource through its policy.")]
    public static async Task<string> GetResourcePolicySubjects(
        AltinnApiClient client,
        [Description("The resource identifier, e.g. 'altinn_access_management'")] string id,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        return await client.GetResourcePolicySubjectsAsync(id, environment, ct);
    }

    [McpServerTool, Description("Get the full policy rules for a specific resource. Each rule maps a subject (role/access package) to specific actions (read, write, etc.) on the resource.")]
    public static async Task<string> GetResourcePolicyRules(
        AltinnApiClient client,
        [Description("The resource identifier, e.g. 'altinn_access_management'")] string id,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        return await client.GetResourcePolicyRulesAsync(id, environment, ct);
    }

    [McpServerTool, Description("Get all resources accessible by one or more subject URNs (roles or access packages). Useful for answering 'what can this role/package access?'")]
    public static async Task<string> GetResourcesBySubjects(
        AltinnApiClient client,
        [Description("Array of subject URNs, e.g. ['urn:altinn:rolecode:DAGL', 'urn:altinn:accesspackage:tilgangsstyrer']")] string[] subjectUrns,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        return await client.GetResourcesBySubjectsAsync(subjectUrns, environment, ct);
    }

    // Access Packages

    [McpServerTool, Description("Search access packages in the Altinn Access Management metadata API. Packages group resources for delegation.")]
    public static async Task<string> SearchPackages(
        AltinnApiClient client,
        [Description("Search term")] string? term = null,
        [Description("Filter by type name, e.g. 'Organisasjon'")] string? typeName = null,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.SearchPackagesAsync(term, typeName, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Export all access packages from the Altinn metadata API. Returns the complete list with full details.")]
    public static async Task<string> ExportPackages(
        AltinnApiClient client,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.ExportPackagesAsync(environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get all access package groups from the Altinn metadata API. Groups organize areas and packages hierarchically.")]
    public static async Task<string> GetPackageGroups(
        AltinnApiClient client,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetPackageGroupsAsync(environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get the areas within a specific access package group.")]
    public static async Task<string> GetPackageGroupAreas(
        AltinnApiClient client,
        [Description("The group ID (UUID)")] string groupId,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetPackageGroupAreasAsync(groupId, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get the access packages within a specific area.")]
    public static async Task<string> GetAreaPackages(
        AltinnApiClient client,
        [Description("The area ID (UUID)")] string areaId,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetAreaPackagesAsync(areaId, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get a specific access package by its ID.")]
    public static async Task<string> GetPackageById(
        AltinnApiClient client,
        [Description("The package ID (UUID)")] string packageId,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetPackageByIdAsync(packageId, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get a specific access package by its URN.")]
    public static async Task<string> GetPackageByUrn(
        AltinnApiClient client,
        [Description("The URN value, e.g. 'urn:altinn:accesspackage:skatt-nering'")] string urnValue,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetPackageByUrnAsync(urnValue, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get the resources included in a specific access package.")]
    public static async Task<string> GetPackageResources(
        AltinnApiClient client,
        [Description("The package ID (UUID)")] string packageId,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetPackageResourcesAsync(packageId, environment, ct);
        return ToJson(result);
    }

    // Roles

    [McpServerTool, Description("Get all roles from the Altinn Access Management metadata API.")]
    public static async Task<string> GetRoles(
        AltinnApiClient client,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetRolesAsync(environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get a specific role by its ID.")]
    public static async Task<string> GetRoleById(
        AltinnApiClient client,
        [Description("The role ID (UUID)")] string id,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetRoleByIdAsync(id, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get the access packages assigned to a specific role.")]
    public static async Task<string> GetRolePackages(
        AltinnApiClient client,
        [Description("The role code, e.g. 'DAGL' (daglig leder), 'REGN' (regnskapsfører)")] string role,
        [Description("The entity variant used for role access, normally 'person'")] string variant,
        [Description("Include resource details in each package")] bool includeResources = false,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetRolePackagesAsync(role, variant, includeResources, environment, ct);
        return ToJson(result);
    }

    [McpServerTool, Description("Get the resources accessible through a specific role.")]
    public static async Task<string> GetRoleResources(
        AltinnApiClient client,
        [Description("The role code, e.g. 'DAGL' (daglig leder), 'REGN' (regnskapsfører)")] string role,
        [Description("The entity variant used for role access, normally 'person'")] string variant,
        [Description("Include resources from packages assigned to the role")] bool includePackageResources = false,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetRoleResourcesAsync(role, variant, includePackageResources, environment, ct);
        return ToJson(result);
    }

    // Types

    [McpServerTool, Description("Get the organization sub-types defined in Altinn (e.g. AS, ENK, etc.).")]
    public static async Task<string> GetOrganizationSubTypes(
        AltinnApiClient client,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var result = await client.GetOrganizationSubTypesAsync(environment, ct);
        return ToJson(result);
    }

    // ── Convenience tools for natural-language questions ─────────────
    // These resolve human names → identifiers/URNs and return concise, enriched
    // shapes so common questions can be answered in one or two tool calls.

    [McpServerTool, Description("Find resources/services by name or title (partial match) and return a concise list (identifier, title, type, owner, status, delegable). Results are filtered to those whose title actually contains every search term and capped at 'limit'; the true match count is always reported. Use this first to turn a service name a user mentions into a resource identifier.")]
    public static async Task<string> FindResources(
        AltinnApiClient client,
        [Description("Name or title to search for, e.g. 'Samordnet registermelding'")] string name,
        [Description("Optional resource type filter, e.g. 'AltinnApp', 'GenericAccessResource', 'MaskinportenSchema'")] string? resourceType = null,
        [Description("Maximum number of results to return (default 50). The full match count is always reported via totalMatched.")] int limit = 50,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var results = await client.SearchResourcesAsync(title: name, resourceType: resourceType, environment: environment, ct: ct);

        // The upstream /Search endpoint matches loosely and can return most of the catalogue,
        // which overflows the tool-output limit. Keep only resources whose title (in any
        // language) actually contains every search term, so the response is relevant and bounded.
        var terms = (name ?? "").Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.ToLowerInvariant())
            .ToArray();
        var filtered = terms.Length == 0
            ? results
            : results.Where(r =>
            {
                var titles = r.Title?.Values;
                return titles is not null && terms.All(term =>
                    titles.Any(v => v is not null && v.ToLowerInvariant().Contains(term)));
            }).ToList();

        if (limit < 1) limit = 1;
        var concise = filtered.Take(limit).Select(r => new
        {
            identifier = r.Identifier,
            title = TitleOf(r.Title),
            resourceType = r.ResourceType.ToString(),
            owner = OwnerOf(r),
            status = r.Status,
            delegable = r.Delegable,
        });

        return ToJson(new
        {
            query = name,
            resourceType,
            environment,
            totalMatched = filtered.Count,
            returned = Math.Min(filtered.Count, limit),
            truncated = filtered.Count > limit,
            results = concise,
        });
    }

    [McpServerTool, Description("List the access packages that have access to a resource through its policy, enriched with package name, area and group. Answers 'which access packages have access to <service>?'. Resolve the service name to an identifier with FindResources first.")]
    public static async Task<string> GetResourceAccessPackages(
        AltinnApiClient client,
        [Description("The resource identifier, e.g. 'app_brg_samordnet-registermelding'")] string id,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var subjectsJson = await client.GetResourcePolicySubjectsAsync(id, environment, ct);
        var pkgs = ExtractSubjects(subjectsJson, t => t == "urn:altinn:accesspackage");

        var export = await client.ExportPackagesAsync(environment, ct);
        var byUrn = BuildPackageIndex(export);

        var result = pkgs.Select(p =>
        {
            byUrn.TryGetValue(p.urn, out var info);
            return new
            {
                urn = p.urn,
                value = p.value,
                name = info.name,
                area = info.area,
                group = info.group,
                isDelegable = info.isDelegable,
            };
        }).ToList();

        return ToJson(new { resource = id, environment, accessPackageCount = result.Count, accessPackages = result });
    }

    [McpServerTool, Description("List the roles that have access to a resource through its policy (best-effort name enrichment). Answers 'which roles have access to <service>?'.")]
    public static async Task<string> GetResourceRoles(
        AltinnApiClient client,
        [Description("The resource identifier")] string id,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var subjectsJson = await client.GetResourcePolicySubjectsAsync(id, environment, ct);
        var roleSubjects = ExtractSubjects(subjectsJson,
            t => t is "urn:altinn:rolecode" or "urn:altinn:role" or "urn:altinn:external-role");

        var roles = await client.GetRolesAsync(environment, ct);
        var byCode = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var r in roles)
        {
            if (!string.IsNullOrEmpty(r.Code)) byCode[r.Code] = r.Name;
            if (!string.IsNullOrEmpty(r.LegacyRoleCode)) byCode[r.LegacyRoleCode] = r.Name;
        }

        var result = roleSubjects.Select(s => new
        {
            type = s.type,
            value = s.value,
            urn = s.urn,
            name = byCode.TryGetValue(s.value, out var n) ? n : null,
        });

        return ToJson(new { resource = id, environment, roles = result });
    }

    [McpServerTool, Description("Find access packages by name or term (partial match), returning id, urn, name, area and group. Use this to resolve an access package name into its URN before calling GetAccessPackageResources.")]
    public static async Task<string> FindAccessPackages(
        AltinnApiClient client,
        [Description("Access package name or term, e.g. 'tilgangsstyrer' or 'skatt'")] string name,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var export = await client.ExportPackagesAsync(environment, ct);
        var term = name.Trim().ToLowerInvariant();
        var matches = new List<object>();
        foreach (var g in export)
            foreach (var a in g.Areas ?? [])
                foreach (var p in a.Packages ?? [])
                {
                    if (Contains(p.Name, term) || Contains(p.Urn, term) || Contains(p.Description, term))
                    {
                        matches.Add(new
                        {
                            id = p.Id,
                            name = p.Name,
                            urn = p.Urn,
                            area = a.Name,
                            group = g.Name,
                            isDelegable = p.IsDelegable,
                            description = p.Description,
                        });
                    }
                }
        return ToJson(matches);
    }

    [McpServerTool, Description("List the resources/services accessible via an access package. Accepts a package URN or a package name. Answers 'what services does <access package> have access to?'")]
    public static async Task<string> GetAccessPackageResources(
        AltinnApiClient client,
        [Description("Access package URN ('urn:altinn:accesspackage:tilgangsstyrer') or name ('tilgangsstyrer')")] string packageUrnOrName,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var urn = await ResolvePackageUrn(client, packageUrnOrName, environment, ct);
        if (urn is null)
            return ToJson(new { error = $"Could not resolve access package '{packageUrnOrName}'. Try FindAccessPackages to find the URN." });

        var bysubjectsJson = await client.GetResourcesBySubjectsAsync([urn], environment, ct);
        var resources = ExtractBySubjectResources(bysubjectsJson);
        return ToJson(new { accessPackage = urn, environment, resourceCount = resources.Count, resources });
    }

    [McpServerTool, Description("Find roles by name or code (partial match). Returns id, name, code, urn, the 'variant' needed for GetRolePackages/GetRoleResources, and provider. Use to resolve a role a user mentions.")]
    public static async Task<string> FindRoles(
        AltinnApiClient client,
        [Description("Role name or code, e.g. 'daglig leder', 'regnskapsfører', 'DAGL'")] string name,
        CancellationToken ct = default,
        [Description(EnvDescription)] string environment = AltinnApiClient.DefaultEnvironment)
    {
        var roles = await client.GetRolesAsync(environment, ct);
        var term = name.Trim().ToLowerInvariant();
        var matches = roles
            .Where(r => Contains(r.Name, term) || Contains(r.Code, term) || Contains(r.Urn, term)
                || Contains(r.LegacyRoleCode, term) || Contains(r.Description, term))
            .Select(r =>
            {
                var (providerVariant, code) = ParseRoleUrn(r.Urn, r.Code);
                return new
                {
                    id = r.Id,
                    name = r.Name,
                    code,
                    variant = DefaultRoleEntityVariant,
                    providerVariant,
                    urn = r.Urn,
                    legacyRoleCode = r.LegacyRoleCode,
                    provider = r.Provider?.Name,
                    isKeyRole = r.IsKeyRole,
                    isResourcePolicyAvailable = r.IsResourcePolicyAvailable,
                };
            });
        return ToJson(matches);
    }

    // ── Helpers ─────────────────────────────────────────────────────

    private static bool Contains(string? haystack, string lowerTerm)
        => haystack is not null && haystack.ToLowerInvariant().Contains(lowerTerm);

    private static string TitleOf(IReadOnlyDictionary<string, string>? title)
    {
        if (title is null || title.Count == 0) return "";
        foreach (var k in new[] { "nb", "nn", "en" })
            if (title.TryGetValue(k, out var v) && !string.IsNullOrWhiteSpace(v)) return v;
        return title.Values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v)) ?? "";
    }

    private static object? OwnerOf(ServiceResource r)
    {
        var ca = r.HasCompetentAuthority;
        if (ca is null) return null;
        return new { orgcode = ca.Orgcode, name = TitleOf(ca.Name) };
    }

    /// <summary>Parse upstream policy/subjects JSON ({ data: [{type,value,urn}] }) filtered by subject type.</summary>
    private static List<(string type, string value, string urn)> ExtractSubjects(string json, Func<string, bool> typeFilter)
    {
        var list = new List<(string, string, string)>();
        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in data.EnumerateArray())
            {
                var type = item.TryGetProperty("type", out var t) ? t.GetString() ?? "" : "";
                if (!typeFilter(type)) continue;
                var value = item.TryGetProperty("value", out var v) ? v.GetString() ?? "" : "";
                var urn = item.TryGetProperty("urn", out var u) ? u.GetString() ?? "" : "";
                list.Add((type, value, urn));
            }
        }
        return list;
    }

    /// <summary>Parse upstream bysubjects JSON ({ data: [{subject, resources:[{value,urn}]}] }) into a flat resource list.</summary>
    private static List<object> ExtractBySubjectResources(string json)
    {
        var list = new List<object>();
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        using var doc = JsonDocument.Parse(json);
        if (doc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in data.EnumerateArray())
            {
                if (!entry.TryGetProperty("resources", out var resources) || resources.ValueKind != JsonValueKind.Array)
                    continue;
                foreach (var res in resources.EnumerateArray())
                {
                    var value = res.TryGetProperty("value", out var v) ? v.GetString() ?? "" : "";
                    if (value.Length == 0 || !seen.Add(value)) continue;
                    var urn = res.TryGetProperty("urn", out var u) ? u.GetString() ?? "" : "";
                    list.Add(new { identifier = value, urn });
                }
            }
        }
        return list;
    }

    private static Dictionary<string, (string? name, string? area, string? group, bool isDelegable)> BuildPackageIndex(
        IEnumerable<Altinn.Authorization.Api.Contracts.AccessManagement.AreaGroupDto> export)
    {
        var index = new Dictionary<string, (string?, string?, string?, bool)>(StringComparer.OrdinalIgnoreCase);
        foreach (var g in export)
            foreach (var a in g.Areas ?? [])
                foreach (var p in a.Packages ?? [])
                    if (!string.IsNullOrEmpty(p.Urn))
                        index[p.Urn] = (p.Name, a.Name, g.Name, p.IsDelegable);
        return index;
    }

    private static async Task<string?> ResolvePackageUrn(AltinnApiClient client, string input, string environment, CancellationToken ct)
    {
        var trimmed = input.Trim();
        if (trimmed.StartsWith("urn:altinn:accesspackage:", StringComparison.OrdinalIgnoreCase))
            return trimmed;

        var export = await client.ExportPackagesAsync(environment, ct);
        var term = trimmed.ToLowerInvariant();

        // Exact name/slug match first, then partial
        string? partial = null;
        foreach (var g in export)
            foreach (var a in g.Areas ?? [])
                foreach (var p in a.Packages ?? [])
                {
                    if (string.IsNullOrEmpty(p.Urn)) continue;
                    var slug = p.Urn.Split(':').LastOrDefault() ?? "";
                    if (string.Equals(p.Name, trimmed, StringComparison.OrdinalIgnoreCase)
                        || string.Equals(slug, term, StringComparison.OrdinalIgnoreCase))
                        return p.Urn;
                    if (partial is null && (Contains(p.Name, term) || Contains(p.Urn, term)))
                        partial = p.Urn;
                }
        return partial;
    }

    /// <summary>Derive the provider variant and role code from a role URN.
    /// urn:altinn:role:tilgangsstyrer → (altinn, tilgangsstyrer);
    /// urn:altinn:external-role:ccr:daglig-leder → (ccr, daglig-leder).</summary>
    private static (string providerVariant, string code) ParseRoleUrn(string? urn, string? fallbackCode)
    {
        if (!string.IsNullOrEmpty(urn))
        {
            var parts = urn.Split(':');
            if (parts.Length >= 4 && parts[2] == "role")
                return ("altinn", parts[^1]);
            if (parts.Length >= 5 && parts[2] == "external-role")
                return (parts[3], parts[^1]);
        }
        return ("altinn", fallbackCode ?? "");
    }
}
