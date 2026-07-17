using System.Text.Json;
using System.Xml;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.Api.Contracts.ResourceRegistry;
using Altinn.ResourceRegistry.Core.Models;
using AltinnServiceCatalogue.Server.Configuration;
using AltinnServiceCatalogue.Server.Models;
using AltinnServiceCatalogue.Server.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace AltinnServiceCatalogue.Server.Controllers;

[ApiController]
[Route("api/v1/{environment}/resource")]
public class ResourceRegistryController(
    IResourceRegistryClient client,
    IResourceCacheService cacheService,
    IMemoryCache memoryCache,
    IOptions<ResourceRegistryOptions> options,
    ILogger<ResourceRegistryController> logger) : ControllerBase
{
    private readonly ResourceRegistryOptions _options = options.Value;
    private static readonly TimeSpan PolicyCacheDuration = TimeSpan.FromMinutes(30);

    [HttpGet("resourcelist")]
    [ProducesResponseType<List<ServiceResource>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetResourceList(
        [FromRoute] string environment,
        [FromQuery] bool? includeApps,
        [FromQuery] bool? includeAltinn2,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await cacheService.GetResourceListAsync(baseUrl, includeApps, includeAltinn2, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourceList in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("resourcelist/summary")]
    [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)]
    [ProducesResponseType<List<ResourceSummaryDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetResourceListSummary(
        [FromRoute] string environment,
        [FromQuery] bool? includeApps,
        [FromQuery] bool? includeAltinn2,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var resources = await cacheService.GetResourceListAsync(baseUrl, includeApps, includeAltinn2, ct);
            var result = resources.Select(resource => new ResourceSummaryDto(
                resource.Identifier ?? string.Empty,
                resource.Title ?? new Dictionary<string, string>(),
                resource.Description ?? new Dictionary<string, string>(),
                resource.Status,
                resource.Delegable,
                resource.Visible,
                resource.ResourceType.ToString(),
                resource.HasCompetentAuthority is null
                    ? null
                    : new CompetentAuthoritySummaryDto(
                        resource.HasCompetentAuthority.Name,
                        resource.HasCompetentAuthority.Organization,
                        resource.HasCompetentAuthority.Orgcode)))
                .ToList();

            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourceListSummary in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("{id}")]
    [ProducesResponseType<ServiceResource>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetResource(
        [FromRoute] string environment,
        [FromRoute] string id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var cached = await cacheService.GetResourceByIdAsync(baseUrl, id, ct);
            if (cached is not null)
                return Ok(cached);

            var result = await client.GetResourceAsync(baseUrl, id, ct);
            if (result is null)
                return NotFound();
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResource({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("search")]
    [ProducesResponseType<List<ServiceResource>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> SearchResources(
        [FromRoute] string environment,
        [FromBody] ResourceSearch search,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.SearchResourcesAsync(baseUrl, search, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for SearchResources in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("bysubject")]
    [ProducesResponseType<List<ServiceResource>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetResourcesBySubject(
        [FromRoute] string environment,
        [FromBody] SubjectResources subject,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetResourcesBySubjectAsync(baseUrl, subject, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourcesBySubject in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpPost("bysubjects")]
    [Produces("application/json")]
    public async Task<IActionResult> GetResourcesBySubjects(
        [FromRoute] string environment,
        [FromBody] string[] subjectUrns,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var stream = await client.GetResourcesBySubjectsAsync(baseUrl, subjectUrns, ct);
            return new FileStreamResult(stream, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourcesBySubjects in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("orgs")]
    [ProducesResponseType<OrgList>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOrgList(
        [FromRoute] string environment,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await client.GetOrgListAsync(baseUrl, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetOrgList in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("{id}/policy")]
    [Produces("application/json")]
    public async Task<IActionResult> GetResourcePolicy(
        [FromRoute] string environment,
        [FromRoute] string id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var stream = await client.GetResourcePolicyAsync(baseUrl, id, ct);
            return new FileStreamResult(stream, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourcePolicy({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("{id}/policy/subjects")]
    [Produces("application/json")]
    public async Task<IActionResult> GetResourcePolicySubjects(
        [FromRoute] string environment,
        [FromRoute] string id,
        [FromQuery] bool? reloadFromXacml,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var stream = await client.GetResourcePolicySubjectsAsync(baseUrl, id, reloadFromXacml == true, ct);
            return new FileStreamResult(stream, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourcePolicySubjects({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("{id}/policy/rules")]
    [Produces("application/json")]
    public async Task<IActionResult> GetResourcePolicyRules(
        [FromRoute] string environment,
        [FromRoute] string id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var stream = await client.GetResourcePolicyRulesAsync(baseUrl, id, ct);
            return new FileStreamResult(stream, "application/json");
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourcePolicyRules({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("{id}/policy/rights")]
    [ProducesResponseType<List<RightDto>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetResourcePolicyRights(
        [FromRoute] string environment,
        [FromRoute] string id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        var acceptLanguage = string.Join(",", Request.GetTypedHeaders().AcceptLanguage);

        try
        {
            var result = await client.GetResourcePolicyRightsAsync(baseUrl, id, acceptLanguage, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourcePolicyRights({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("{id}/policy/securitylevel")]
    [Produces("application/json")]
    public async Task<IActionResult> GetResourcePolicySecurityLevel(
        [FromRoute] string environment,
        [FromRoute] string id,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            await using var stream = await client.GetResourcePolicyAsync(baseUrl, id, ct);

            using var reader = XmlReader.Create(stream, new XmlReaderSettings { Async = true });
            var policy = XacmlParser.ParseXacmlPolicy(reader);

            int? userLevel = null;
            int? orgLevel = null;

            foreach (var obligation in policy.ObligationExpressions)
            {
                foreach (var assignment in obligation.AttributeAssignmentExpressions)
                {
                    var category = assignment.Category?.ToString();
                    if (assignment.Property is XacmlAttributeValue attrValue && category is not null)
                    {
                        if (category == "urn:altinn:minimum-authenticationlevel"
                            && int.TryParse(attrValue.Value, out var uLevel))
                        {
                            userLevel = uLevel;
                        }
                        else if (category == "urn:altinn:minimum-authenticationlevel-org"
                            && int.TryParse(attrValue.Value, out var oLevel))
                        {
                            orgLevel = oLevel;
                        }
                    }
                }
            }

            return Ok(new { userLevel, orgLevel });
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Upstream request failed for GetResourcePolicySecurityLevel({Id}) in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
        catch (XmlException ex)
        {
            logger.LogError(ex, "Failed to parse XACML policy for {Id} in {Environment}", id, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Failed to parse policy XML");
        }
    }

    [HttpGet("keywords")]
    [ProducesResponseType<List<string>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetKeywords(
        [FromRoute] string environment,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await cacheService.GetKeywordsAsync(baseUrl, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Failed to fetch keywords in {Environment}", environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    [HttpGet("bykeyword/{keyword}")]
    [ProducesResponseType<List<ServiceResource>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetResourcesByKeyword(
        [FromRoute] string environment,
        [FromRoute] string keyword,
        CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var result = await cacheService.GetResourcesByKeywordAsync(baseUrl, keyword, ct);
            return Ok(result);
        }
        catch (HttpRequestException ex)
        {
            logger.LogError(ex, "Failed to fetch resources by keyword {Keyword} in {Environment}", keyword, environment);
            return StatusCode(StatusCodes.Status502BadGateway, "Upstream service unavailable");
        }
    }

    // ── Background job: start computation ──

    [HttpPost("statistics/authlevel/start")]
    [Produces("application/json")]
    public IActionResult StartAuthLevelStatistics(
        [FromRoute] string environment,
        [FromQuery] string kind = "apps")
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        var jobKey = $"stats-job-{environment}-{kind}";

        // If a completed result already exists in cache, return it immediately
        if (memoryCache.TryGetValue(jobKey, out StatsJob? existing) && existing?.Status == "done")
            return Ok(new { jobId = jobKey, status = "done" });

        // If already running, don't start another
        if (existing?.Status == "running")
            return Ok(new { jobId = jobKey, status = "running", progress = existing.Progress, total = existing.Total });

        var job = new StatsJob { Status = "running" };
        memoryCache.Set(jobKey, job, TimeSpan.FromMinutes(30));

        // Fire-and-forget background work
        _ = Task.Run(async () =>
        {
            try
            {
                var allResources = await cacheService.GetResourceListAsync(baseUrl, includeApps: true, includeAltinn2: kind == "resources", CancellationToken.None);

                List<ServiceResource> filtered;
                if (kind == "resources")
                {
                    filtered = allResources
                        .Where(r => r.ResourceType != Altinn.Authorization.Api.Contracts.ResourceType.AltinnApp
                            && r.ResourceType != Altinn.Authorization.Api.Contracts.ResourceType.MigratedApp
                            && r.Identifier is not null)
                        .ToList();
                }
                else
                {
                    filtered = allResources
                        .Where(r => r.ResourceType == Altinn.Authorization.Api.Contracts.ResourceType.AltinnApp
                            && r.Identifier is not null && !r.Identifier.Contains("_a2-"))
                        .ToList();
                }

                job.Total = filtered.Count;

                const int maxConcurrency = 20;
                using var semaphore = new SemaphoreSlim(maxConcurrency);

                var tasks = filtered.Select(async resource =>
                {
                    await semaphore.WaitAsync(CancellationToken.None);
                    try
                    {
                        var levels = await ParseSecurityLevel(baseUrl, resource.Identifier!, CancellationToken.None);
                        Interlocked.Increment(ref job.Progress);
                        return new AppAuthLevelEntry
                        {
                            Identifier = resource.Identifier!,
                            Title = resource.Title,
                            HasCompetentAuthority = resource.HasCompetentAuthority,
                            UserLevel = levels.userLevel,
                            OrgLevel = levels.orgLevel,
                        };
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to fetch policy for {Id}", resource.Identifier);
                        Interlocked.Increment(ref job.Progress);
                        return new AppAuthLevelEntry
                        {
                            Identifier = resource.Identifier!,
                            Title = resource.Title,
                            HasCompetentAuthority = resource.HasCompetentAuthority,
                            UserLevel = null,
                            OrgLevel = null,
                            Error = true,
                        };
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                });

                var entries = await Task.WhenAll(tasks);
                var entryList = entries.ToList();

                job.Result = new AuthLevelStatistics
                {
                    TotalApps = entryList.Count,
                    Level4Apps = entryList.Where(e => e.UserLevel == 4).ToList(),
                    Level3Apps = entryList.Where(e => e.UserLevel == 3).ToList(),
                    Level2Apps = entryList.Where(e => e.UserLevel == 2).ToList(),
                    OtherApps = entryList.Where(e => e.UserLevel is null or 0 or 1).ToList(),
                    ErrorCount = entryList.Count(e => e.Error),
                };
                job.Status = "done";
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background stats job failed for {Environment}/{Kind}", environment, kind);
                job.Status = "error";
                job.ErrorMessage = ex.Message;
            }
        });

        return Accepted(new { jobId = jobKey, status = "running", progress = 0, total = 0 });
    }

    // ── Background job: poll for result ──

    [HttpGet("statistics/authlevel/status")]
    [Produces("application/json")]
    public IActionResult GetAuthLevelStatisticsStatus(
        [FromRoute] string environment,
        [FromQuery] string kind = "apps")
    {
        var jobKey = $"stats-job-{environment}-{kind}";

        if (!memoryCache.TryGetValue(jobKey, out StatsJob? job) || job is null)
            return NotFound(new { status = "not_started" });

        if (job.Status == "done")
            return Ok(new { status = "done", result = job.Result });

        if (job.Status == "error")
            return Ok(new { status = "error", error = job.ErrorMessage });

        return Ok(new { status = "running", progress = job.Progress, total = job.Total });
    }

    // ── Access package statistics: policies without any access package subjects ──

    [HttpPost("statistics/accesspackages/start")]
    [Produces("application/json")]
    public IActionResult StartAccessPackageStatistics(
        [FromRoute] string environment,
        [FromQuery] bool reloadFromXacml = false)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        var jobKey = $"accesspkg-stats-job-{environment}";

        memoryCache.TryGetValue(jobKey, out AccessPackageStatsJob? existing);

        // A reload forces a fresh run from XACML; otherwise reuse a completed result.
        if (!reloadFromXacml && existing?.Status == "done")
            return Ok(new { jobId = jobKey, status = "done" });

        if (existing?.Status == "running")
            return Ok(new { jobId = jobKey, status = "running", progress = existing.Progress, total = existing.Total });

        var job = new AccessPackageStatsJob { Status = "running" };
        memoryCache.Set(jobKey, job, TimeSpan.FromMinutes(30));

        _ = Task.Run(async () =>
        {
            try
            {
                // includeApps + always-on includeMigratedApps brings in Altinn 3 apps and migrated apps
                // (MigratedApp type and _a2- AltinnApp); includeAltinn2: false excludes legacy Altinn 2 services.
                var allResources = await cacheService.GetResourceListAsync(baseUrl, includeApps: true, includeAltinn2: false, CancellationToken.None);
                var filtered = allResources
                    .Where(r => r.Identifier is not null
                        && r.ResourceType != Altinn.Authorization.Api.Contracts.ResourceType.Altinn2Service)
                    .ToList();

                job.Total = filtered.Count;

                const int maxConcurrency = 20;
                using var semaphore = new SemaphoreSlim(maxConcurrency);

                var tasks = filtered.Select(async resource =>
                {
                    await semaphore.WaitAsync(CancellationToken.None);
                    try
                    {
                        var (pkgCount, subjectCount) = await CountAccessPackageSubjects(baseUrl, resource.Identifier!, reloadFromXacml, CancellationToken.None);
                        Interlocked.Increment(ref job.Progress);
                        return new PolicyAccessPackageEntry
                        {
                            Identifier = resource.Identifier!,
                            Title = resource.Title,
                            HasCompetentAuthority = resource.HasCompetentAuthority,
                            ResourceType = resource.ResourceType.ToString(),
                            AccessPackageCount = pkgCount,
                            SubjectCount = subjectCount,
                        };
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to fetch policy subjects for {Id}", resource.Identifier);
                        Interlocked.Increment(ref job.Progress);
                        return new PolicyAccessPackageEntry
                        {
                            Identifier = resource.Identifier!,
                            Title = resource.Title,
                            HasCompetentAuthority = resource.HasCompetentAuthority,
                            ResourceType = resource.ResourceType.ToString(),
                            Error = true,
                        };
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                });

                var entries = (await Task.WhenAll(tasks)).ToList();
                var valid = entries.Where(e => !e.Error).ToList();

                job.Result = new AccessPackageStatistics
                {
                    TotalPolicies = valid.Count,
                    WithAccessPackages = valid.Count(e => e.AccessPackageCount > 0),
                    WithoutAccessPackages = valid
                        .Where(e => e.AccessPackageCount == 0)
                        .OrderBy(e => e.Identifier, StringComparer.OrdinalIgnoreCase)
                        .ToList(),
                    ErrorCount = entries.Count(e => e.Error),
                };
                job.Status = "done";
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background access package stats job failed for {Environment}", environment);
                job.Status = "error";
                job.ErrorMessage = ex.Message;
            }
        });

        return Accepted(new { jobId = jobKey, status = "running", progress = 0, total = 0 });
    }

    [HttpGet("statistics/accesspackages/status")]
    [Produces("application/json")]
    public IActionResult GetAccessPackageStatisticsStatus([FromRoute] string environment)
    {
        var jobKey = $"accesspkg-stats-job-{environment}";

        if (!memoryCache.TryGetValue(jobKey, out AccessPackageStatsJob? job) || job is null)
            return NotFound(new { status = "not_started" });

        if (job.Status == "done")
            return Ok(new { status = "done", result = job.Result });

        if (job.Status == "error")
            return Ok(new { status = "error", error = job.ErrorMessage });

        return Ok(new { status = "running", progress = job.Progress, total = job.Total });
    }

    // ── Case-sensitive policy matching: policies that match role/action/access package case-sensitively ──
    //
    // In Altinn XACML policies the resource identity (urn:altinn:org / urn:altinn:app) is matched
    // case-sensitively with `string-equal` — that is normal. But role codes, actions and access packages
    // should be matched with `string-equal-ignore-case`; using the case-sensitive `string-equal` there is a
    // bug: authorization fails when the incoming value differs only in casing (e.g. "DAGL" vs "dagl").
    // This job scans every policy and flags such case-sensitive matches on role / action / access package.

    [HttpPost("statistics/casesensitive/start")]
    [Produces("application/json")]
    public IActionResult StartCaseSensitiveStatistics(
        [FromRoute] string environment,
        [FromQuery] bool reload = false)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        var jobKey = $"casesensitive-stats-job-{environment}";

        memoryCache.TryGetValue(jobKey, out CaseSensitiveStatsJob? existing);

        if (!reload && existing?.Status == "done")
            return Ok(new { jobId = jobKey, status = "done" });

        if (existing?.Status == "running")
            return Ok(new { jobId = jobKey, status = "running", progress = existing.Progress, total = existing.Total });

        var job = new CaseSensitiveStatsJob { Status = "running" };
        memoryCache.Set(jobKey, job, TimeSpan.FromMinutes(30));

        _ = Task.Run(async () =>
        {
            try
            {
                // Apps + migrated apps + non-Altinn2 resources — same population as the access package job.
                var allResources = await cacheService.GetResourceListAsync(baseUrl, includeApps: true, includeAltinn2: false, CancellationToken.None);
                var filtered = allResources
                    .Where(r => r.Identifier is not null
                        && r.ResourceType != Altinn.Authorization.Api.Contracts.ResourceType.Altinn2Service)
                    .ToList();

                job.Total = filtered.Count;

                const int maxConcurrency = 20;
                using var semaphore = new SemaphoreSlim(maxConcurrency);

                var tasks = filtered.Select(async resource =>
                {
                    await semaphore.WaitAsync(CancellationToken.None);
                    try
                    {
                        var matches = await FindCaseSensitiveMatches(baseUrl, resource.Identifier!, reload, CancellationToken.None);
                        Interlocked.Increment(ref job.Progress);
                        return new PolicyCaseSensitiveEntry
                        {
                            Identifier = resource.Identifier!,
                            Title = resource.Title,
                            HasCompetentAuthority = resource.HasCompetentAuthority,
                            ResourceType = resource.ResourceType.ToString(),
                            HasRoleIssue = matches.Any(m => m.Category == "role"),
                            HasActionIssue = matches.Any(m => m.Category == "action"),
                            HasAccessPackageIssue = matches.Any(m => m.Category == "accesspackage"),
                            Matches = matches,
                        };
                    }
                    catch (Exception ex)
                    {
                        logger.LogWarning(ex, "Failed to scan policy for case-sensitive matches: {Id}", resource.Identifier);
                        Interlocked.Increment(ref job.Progress);
                        return new PolicyCaseSensitiveEntry
                        {
                            Identifier = resource.Identifier!,
                            Title = resource.Title,
                            HasCompetentAuthority = resource.HasCompetentAuthority,
                            ResourceType = resource.ResourceType.ToString(),
                            Error = true,
                        };
                    }
                    finally
                    {
                        semaphore.Release();
                    }
                });

                var entries = (await Task.WhenAll(tasks)).ToList();
                var valid = entries.Where(e => !e.Error).ToList();
                var affected = valid
                    .Where(e => e.Matches.Count > 0)
                    .OrderBy(e => e.Identifier, StringComparer.OrdinalIgnoreCase)
                    .ToList();

                job.Result = new CaseSensitiveStatistics
                {
                    TotalPolicies = valid.Count,
                    WithIssues = affected.Count,
                    RoleIssues = valid.Count(e => e.HasRoleIssue),
                    ActionIssues = valid.Count(e => e.HasActionIssue),
                    AccessPackageIssues = valid.Count(e => e.HasAccessPackageIssue),
                    Affected = affected,
                    ErrorCount = entries.Count(e => e.Error),
                };
                job.Status = "done";
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Background case-sensitive stats job failed for {Environment}", environment);
                job.Status = "error";
                job.ErrorMessage = ex.Message;
            }
        });

        return Accepted(new { jobId = jobKey, status = "running", progress = 0, total = 0 });
    }

    [HttpGet("statistics/casesensitive/status")]
    [Produces("application/json")]
    public IActionResult GetCaseSensitiveStatisticsStatus([FromRoute] string environment)
    {
        var jobKey = $"casesensitive-stats-job-{environment}";

        if (!memoryCache.TryGetValue(jobKey, out CaseSensitiveStatsJob? job) || job is null)
            return NotFound(new { status = "not_started" });

        if (job.Status == "done")
            return Ok(new { status = "done", result = job.Result });

        if (job.Status == "error")
            return Ok(new { status = "error", error = job.ErrorMessage });

        return Ok(new { status = "running", progress = job.Progress, total = job.Total });
    }

    /// <summary>Attribute IDs we care about; org/app/resource identity matches are intentionally ignored.</summary>
    private static string? CaseSensitiveCategoryOf(string attributeId)
    {
        if (attributeId.Equals("urn:altinn:accesspackage", StringComparison.OrdinalIgnoreCase)) return "accesspackage";
        if (attributeId.Equals("urn:oasis:names:tc:xacml:1.0:action:action-id", StringComparison.OrdinalIgnoreCase)) return "action";
        // Role attributes: urn:altinn:rolecode, urn:altinn:role, urn:altinn:external-role, ...
        if (attributeId.Contains("role", StringComparison.OrdinalIgnoreCase)) return "role";
        return null;
    }

    /// <summary>True for case-sensitive string match functions (e.g. ...:string-equal) but not ...:string-equal-ignore-case.</summary>
    private static bool IsCaseSensitiveStringMatch(string matchFunction) =>
        matchFunction.Contains("string-equal", StringComparison.OrdinalIgnoreCase)
        && !matchFunction.Contains("ignore-case", StringComparison.OrdinalIgnoreCase);

    private async Task<List<CaseSensitiveMatch>> FindCaseSensitiveMatches(string baseUrl, string id, bool reload, CancellationToken ct)
    {
        var cacheKey = $"policy-casesensitive-{baseUrl}-{id}";

        if (!reload && memoryCache.TryGetValue(cacheKey, out List<CaseSensitiveMatch>? cached) && cached is not null)
            return cached;

        await using var stream = await client.GetResourcePolicyAsync(baseUrl, id, ct);
        using var reader = XmlReader.Create(stream, new XmlReaderSettings { Async = true });
        var policy = XacmlParser.ParseXacmlPolicy(reader);

        var found = new List<CaseSensitiveMatch>();

        void ScanTarget(Altinn.Authorization.ABAC.Xacml.XacmlTarget? target)
        {
            if (target is null) return;
            foreach (var anyOf in target.AnyOf)
                foreach (var allOf in anyOf.AllOf)
                    foreach (var match in allOf.Matches)
                    {
                        var fn = match.MatchId?.ToString() ?? "";
                        if (!IsCaseSensitiveStringMatch(fn)) continue;

                        var attributeId = match.AttributeDesignator?.AttributeId?.ToString() ?? "";
                        var category = CaseSensitiveCategoryOf(attributeId);
                        if (category is null) continue;

                        found.Add(new CaseSensitiveMatch
                        {
                            Category = category,
                            AttributeId = attributeId,
                            Value = match.AttributeValue?.Value ?? "",
                            MatchFunction = fn,
                        });
                    }
        }

        // Subject/action matches can live in the policy-level target or in any rule target.
        ScanTarget(policy.Target);
        foreach (var rule in policy.Rules)
            ScanTarget(rule.Target);

        memoryCache.Set(cacheKey, found, PolicyCacheDuration);
        return found;
    }

    private async Task<(int accessPackageCount, int subjectCount)> CountAccessPackageSubjects(string baseUrl, string id, bool reloadFromXacml, CancellationToken ct)
    {
        var cacheKey = $"policy-accesspackages-{baseUrl}-{id}";

        // A reload bypasses our cache and forces the registry to re-derive subjects from the policy XACML.
        if (!reloadFromXacml && memoryCache.TryGetValue(cacheKey, out (int accessPackageCount, int subjectCount) cached))
            return cached;

        await using var stream = await client.GetResourcePolicySubjectsAsync(baseUrl, id, reloadFromXacml, ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

        int accessPackageCount = 0;
        int subjectCount = 0;

        if (doc.RootElement.TryGetProperty("data", out var data) && data.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in data.EnumerateArray())
            {
                subjectCount++;
                if (item.TryGetProperty("type", out var type)
                    && type.GetString() == "urn:altinn:accesspackage")
                {
                    accessPackageCount++;
                }
            }
        }

        var result = (accessPackageCount, subjectCount);
        memoryCache.Set(cacheKey, result, PolicyCacheDuration);
        return result;
    }

    private async Task<(int? userLevel, int? orgLevel)> ParseSecurityLevel(string baseUrl, string id, CancellationToken ct)
    {
        var cacheKey = $"policy-authlevel-{baseUrl}-{id}";

        if (memoryCache.TryGetValue(cacheKey, out (int? userLevel, int? orgLevel) cached))
            return cached;

        await using var stream = await client.GetResourcePolicyAsync(baseUrl, id, ct);
        using var reader = XmlReader.Create(stream, new XmlReaderSettings { Async = true });
        var policy = XacmlParser.ParseXacmlPolicy(reader);

        int? userLevel = null;
        int? orgLevel = null;

        foreach (var obligation in policy.ObligationExpressions)
        {
            foreach (var assignment in obligation.AttributeAssignmentExpressions)
            {
                var category = assignment.Category?.ToString();
                if (assignment.Property is XacmlAttributeValue attrValue && category is not null)
                {
                    if (category == "urn:altinn:minimum-authenticationlevel"
                        && int.TryParse(attrValue.Value, out var uLevel))
                    {
                        userLevel = uLevel;
                    }
                    else if (category == "urn:altinn:minimum-authenticationlevel-org"
                        && int.TryParse(attrValue.Value, out var oLevel))
                    {
                        orgLevel = oLevel;
                    }
                }
            }
        }

        var result = (userLevel, orgLevel);
        memoryCache.Set(cacheKey, result, PolicyCacheDuration);
        return result;
    }

    private bool TryResolveBaseUrl(string environment, out string baseUrl)
    {
        return _options.Environments.TryGetValue(environment, out baseUrl!);
    }
}

public class AppAuthLevelEntry
{
    public string Identifier { get; set; } = string.Empty;
    public Dictionary<string, string>? Title { get; set; }
    public CompetentAuthority? HasCompetentAuthority { get; set; }
    public int? UserLevel { get; set; }
    public int? OrgLevel { get; set; }
    public bool Error { get; set; }
}

public class AuthLevelStatistics
{
    public int TotalApps { get; set; }
    public List<AppAuthLevelEntry> Level4Apps { get; set; } = [];
    public List<AppAuthLevelEntry> Level3Apps { get; set; } = [];
    public List<AppAuthLevelEntry> Level2Apps { get; set; } = [];
    public List<AppAuthLevelEntry> OtherApps { get; set; } = [];
    public int ErrorCount { get; set; }
}

public class StatsJob
{
    public string Status { get; set; } = "running";
    public int Progress;
    public int Total;
    public AuthLevelStatistics? Result { get; set; }
    public string? ErrorMessage { get; set; }
}

public class PolicyAccessPackageEntry
{
    public string Identifier { get; set; } = string.Empty;
    public Dictionary<string, string>? Title { get; set; }
    public CompetentAuthority? HasCompetentAuthority { get; set; }
    public string? ResourceType { get; set; }
    public int AccessPackageCount { get; set; }
    public int SubjectCount { get; set; }
    public bool Error { get; set; }
}

public class AccessPackageStatistics
{
    public int TotalPolicies { get; set; }
    public int WithAccessPackages { get; set; }
    public List<PolicyAccessPackageEntry> WithoutAccessPackages { get; set; } = [];
    public int ErrorCount { get; set; }
}

public class AccessPackageStatsJob
{
    public string Status { get; set; } = "running";
    public int Progress;
    public int Total;
    public AccessPackageStatistics? Result { get; set; }
    public string? ErrorMessage { get; set; }
}

public class CaseSensitiveMatch
{
    /// <summary>"role", "action" or "accesspackage".</summary>
    public string Category { get; set; } = string.Empty;
    public string AttributeId { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string MatchFunction { get; set; } = string.Empty;
}

public class PolicyCaseSensitiveEntry
{
    public string Identifier { get; set; } = string.Empty;
    public Dictionary<string, string>? Title { get; set; }
    public CompetentAuthority? HasCompetentAuthority { get; set; }
    public string? ResourceType { get; set; }
    public bool HasRoleIssue { get; set; }
    public bool HasActionIssue { get; set; }
    public bool HasAccessPackageIssue { get; set; }
    public List<CaseSensitiveMatch> Matches { get; set; } = [];
    public bool Error { get; set; }
}

public class CaseSensitiveStatistics
{
    public int TotalPolicies { get; set; }
    public int WithIssues { get; set; }
    public int RoleIssues { get; set; }
    public int ActionIssues { get; set; }
    public int AccessPackageIssues { get; set; }
    public List<PolicyCaseSensitiveEntry> Affected { get; set; } = [];
    public int ErrorCount { get; set; }
}

public class CaseSensitiveStatsJob
{
    public string Status { get; set; } = "running";
    public int Progress;
    public int Total;
    public CaseSensitiveStatistics? Result { get; set; }
    public string? ErrorMessage { get; set; }
}
