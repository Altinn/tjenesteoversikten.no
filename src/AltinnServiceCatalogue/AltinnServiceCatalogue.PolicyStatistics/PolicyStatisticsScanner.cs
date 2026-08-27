using System.Collections.Concurrent;
using System.Diagnostics;
using System.Net;
using System.Xml.Linq;
using Altinn.Authorization.ABAC.Utils;
using Altinn.Authorization.ABAC.Xacml;

namespace AltinnServiceCatalogue.PolicyStatistics;

public static class PolicyStatisticsScanner
{
    public const int MaxConcurrency = 8;
    public const int NonDefaultResourceLimit = 500;
    public const string DefaultRuleCombiningAlgorithm =
        "urn:oasis:names:tc:xacml:3.0:rule-combining-algorithm:deny-overrides";
    private const string AccessPackageAttributeId = "urn:altinn:accesspackage";
    private const string Altinn2RoleAttributeId = "urn:altinn:rolecode";
    private const string Altinn2ServiceResourceType = "Altinn2Service";
    private static readonly HashSet<string> PersistentSelfRepresentationRoleCodes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "PRIV",
            "SELN"
        };

    public static Task<PolicyStatisticsDto> ScanAsync(
        string environment,
        IEnumerable<string> resourceIds,
        Func<string, CancellationToken, Task<Stream>> fetchPolicy,
        CancellationToken ct,
        Action<string, Exception>? onFetchFailure = null,
        Action<string, Exception>? onParseFailure = null) =>
        ScanAsync(
            environment,
            resourceIds.Select(static resourceId => new PolicyResourceMetadataDto(
                resourceId,
                new Dictionary<string, string>(),
                string.Empty,
                new Dictionary<string, string>(),
                string.Empty)),
            fetchPolicy,
            ct,
            onFetchFailure,
            onParseFailure);

    public static async Task<PolicyStatisticsDto> ScanAsync(
        string environment,
        IEnumerable<PolicyResourceMetadataDto> resourceMetadata,
        Func<string, CancellationToken, Task<Stream>> fetchPolicy,
        CancellationToken ct,
        Action<string, Exception>? onFetchFailure = null,
        Action<string, Exception>? onParseFailure = null,
        IReadOnlySet<string>? erLegacyRoleCodes = null)
    {
        var resources = resourceMetadata
            .Where(static resource => !string.IsNullOrWhiteSpace(resource.ResourceId))
            .GroupBy(static resource => resource.ResourceId, StringComparer.OrdinalIgnoreCase)
            .Select(static group => group.First())
            .ToArray();
        var outcomes = new ConcurrentBag<ScanOutcome>();
        var stopwatch = Stopwatch.StartNew();

        await Parallel.ForEachAsync(
            resources,
            new ParallelOptions { MaxDegreeOfParallelism = MaxConcurrency, CancellationToken = ct },
            async (resource, cancellationToken) =>
            {
                var resourceId = resource.ResourceId;
                Stream stream;
                try
                {
                    stream = await fetchPolicy(resourceId, cancellationToken);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }
                catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
                {
                    outcomes.Add(ScanOutcome.NoPolicy(resourceId));
                    return;
                }
                catch (Exception ex)
                {
                    onFetchFailure?.Invoke(resourceId, ex);
                    outcomes.Add(ScanOutcome.FetchFailure(resourceId));
                    return;
                }

                await using (stream)
                {
                    try
                    {
                        var document = await XDocument.LoadAsync(stream, LoadOptions.None, cancellationToken);
                        using var reader = document.CreateReader();
                        var policy = XacmlParser.ParseXacmlPolicy(reader);
                        var rules = policy.Rules.ToList();
                        var algorithm = policy.RuleCombiningAlgId?.ToString() ?? string.Empty;
                        var algorithmKind = ClassifyAlgorithm(algorithm);
                        var denyRuleCount = rules.Count(static rule => rule.Effect == XacmlEffectType.Deny);
                        var hasMustBePresent = document
                            .Descendants()
                            .Where(static element => element.Name.LocalName == "AttributeDesignator")
                            .Select(static element => element.Attributes().FirstOrDefault(
                                attribute => attribute.Name.LocalName == "MustBePresent")?.Value)
                            .Any(static value => string.Equals(value, "true", StringComparison.OrdinalIgnoreCase) || value == "1");
                        var hasCondition = rules.Any(static rule => rule.Condition is not null);
                        var usesPolicyAlgorithm = algorithmKind == "policy-combining";
                        var legacyIncorrect = denyRuleCount > 0
                            && !string.Equals(algorithm, DefaultRuleCombiningAlgorithm, StringComparison.Ordinal);
                        var accessPackageValues = ExtractSubjectValues(document, AccessPackageAttributeId);
                        var altinn2RoleCodes = ExtractSubjectValues(document, Altinn2RoleAttributeId)
                            .Select(static code => code.ToUpperInvariant())
                            .ToArray();
                        var migrationRelevantRoleCodes = altinn2RoleCodes
                            .Where(static code => !PersistentSelfRepresentationRoleCodes.Contains(code))
                            .ToArray();
                        var erRoleCodes = migrationRelevantRoleCodes
                            .Where(code => erLegacyRoleCodes?.Contains(code) == true)
                            .ToArray();
                        var otherAltinn2RoleCodes = migrationRelevantRoleCodes
                            .Except(erRoleCodes, StringComparer.OrdinalIgnoreCase)
                            .ToArray();
                        var altinn2RoleOnlyResource = migrationRelevantRoleCodes.Length > 0
                            && accessPackageValues.Length == 0
                            && !string.Equals(resource.ResourceType, Altinn2ServiceResourceType, StringComparison.OrdinalIgnoreCase)
                                ? new PolicyAltinn2RoleOnlyResourceDto(
                                    resourceId,
                                    resource.Title,
                                    resource.OwnerId,
                                    resource.OwnerName,
                                    resource.ResourceType,
                                    migrationRelevantRoleCodes,
                                    erRoleCodes,
                                    otherAltinn2RoleCodes)
                                : null;

                        outcomes.Add(ScanOutcome.Policy(
                            new PolicyResourceStatisticsDto(
                                resourceId,
                                algorithm,
                                algorithmKind,
                                rules.Count,
                                denyRuleCount,
                                hasMustBePresent,
                                hasCondition,
                                usesPolicyAlgorithm,
                                legacyIncorrect),
                            altinn2RoleOnlyResource));
                    }
                    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        onParseFailure?.Invoke(resourceId, ex);
                        outcomes.Add(ScanOutcome.ParseFailure(resourceId));
                    }
                }
            });

        stopwatch.Stop();
        var policies = outcomes.Where(static outcome => outcome.PolicyStatistics is not null)
            .Select(static outcome => outcome.PolicyStatistics!)
            .ToArray();
        var nonDefault = policies
            .Where(static policy => !string.Equals(policy.Algorithm, DefaultRuleCombiningAlgorithm, StringComparison.Ordinal))
            .OrderBy(static policy => policy.Algorithm, StringComparer.Ordinal)
            .ThenBy(static policy => policy.ResourceId, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var algorithmUsage = policies
            .GroupBy(static policy => new { policy.Algorithm, policy.AlgorithmKind })
            .Select(static group => new PolicyAlgorithmUsageDto(group.Key.Algorithm, group.Key.AlgorithmKind, group.Count()))
            .OrderByDescending(static usage => usage.Count)
            .ThenBy(static usage => usage.Algorithm, StringComparer.Ordinal)
            .ToArray();
        var altinn2RoleOnlyResources = outcomes
            .Where(static outcome => outcome.Altinn2RoleOnlyResource is not null)
            .Select(static outcome => outcome.Altinn2RoleOnlyResource!)
            .OrderBy(static resource => resource.OwnerId, StringComparer.OrdinalIgnoreCase)
            .ThenBy(static resource => resource.ResourceType, StringComparer.OrdinalIgnoreCase)
            .ThenBy(static resource => resource.ResourceId, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var altinn2RoleOnlyGroups = altinn2RoleOnlyResources
            .GroupBy(
                static resource => $"{resource.OwnerId}\u001f{resource.ResourceType}",
                StringComparer.OrdinalIgnoreCase)
            .Select(static group =>
            {
                var first = group.First();
                var groupedResources = group.ToArray();
                return new PolicyAltinn2RoleOnlyGroupDto(
                    first.OwnerId,
                    first.OwnerName,
                    first.ResourceType,
                    groupedResources.Length,
                    groupedResources);
            })
            .OrderBy(static group => group.OwnerId, StringComparer.OrdinalIgnoreCase)
            .ThenBy(static group => group.ResourceType, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new PolicyStatisticsDto(
            environment,
            DateTimeOffset.UtcNow,
            stopwatch.ElapsedMilliseconds,
            MaxConcurrency,
            NonDefaultResourceLimit,
            resources.Length,
            outcomes.Count(static outcome => outcome.Kind is OutcomeKind.Policy or OutcomeKind.ParseFailure),
            policies.Length,
            outcomes.Count(static outcome => outcome.Kind == OutcomeKind.NoPolicy),
            outcomes.Count(static outcome => outcome.Kind == OutcomeKind.FetchFailure),
            outcomes.Count(static outcome => outcome.Kind == OutcomeKind.ParseFailure),
            policies.Count(static policy => policy.UsesPolicyCombiningAlgorithmInRuleSlot),
            policies.Count(static policy => policy.DenyRuleCount > 0),
            policies.Count(static policy => policy.HasMustBePresent),
            policies.Count(static policy => policy.HasCondition),
            policies.Count(static policy => policy.WouldLegacyPdpEvaluateIncorrectly),
            algorithmUsage,
            nonDefault.Length,
            nonDefault.Length > NonDefaultResourceLimit,
            nonDefault.Take(NonDefaultResourceLimit).ToArray(),
            altinn2RoleOnlyResources.Length,
            altinn2RoleOnlyResources.Count(static resource => resource.ErRoleCodes.Count > 0),
            altinn2RoleOnlyResources.Count(static resource => resource.ErRoleCodes.Count == 0),
            altinn2RoleOnlyGroups);
    }

    private static string[] ExtractSubjectValues(XDocument document, string attributeId) =>
        document
            .Descendants()
            .Where(static element => element.Name.LocalName == "Match")
            .Where(match => match
                .Descendants()
                .Where(static element => element.Name.LocalName == "AttributeDesignator")
                .SelectMany(static element => element.Attributes())
                .Any(attribute => attribute.Name.LocalName == "AttributeId"
                    && string.Equals(attribute.Value, attributeId, StringComparison.OrdinalIgnoreCase)))
            .Select(static match => match
                .Descendants()
                .FirstOrDefault(static element => element.Name.LocalName == "AttributeValue")?.Value.Trim())
            .Where(static value => !string.IsNullOrWhiteSpace(value))
            .Select(static value => value!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(static value => value, StringComparer.OrdinalIgnoreCase)
            .ToArray();

    private static string ClassifyAlgorithm(string algorithm)
    {
        if (algorithm.Contains(":rule-combining-algorithm:", StringComparison.Ordinal))
            return "rule-combining";
        if (algorithm.Contains(":policy-combining-algorithm:", StringComparison.Ordinal))
            return "policy-combining";
        return "unrecognised";
    }

    private enum OutcomeKind { Policy, NoPolicy, FetchFailure, ParseFailure }

    private sealed record ScanOutcome(
        OutcomeKind Kind,
        PolicyResourceStatisticsDto? PolicyStatistics,
        PolicyAltinn2RoleOnlyResourceDto? Altinn2RoleOnlyResource)
    {
        public static ScanOutcome Policy(
            PolicyResourceStatisticsDto statistics,
            PolicyAltinn2RoleOnlyResourceDto? altinn2RoleOnlyResource) =>
            new(OutcomeKind.Policy, statistics, altinn2RoleOnlyResource);
        public static ScanOutcome NoPolicy(string _) => new(OutcomeKind.NoPolicy, null, null);
        public static ScanOutcome FetchFailure(string _) => new(OutcomeKind.FetchFailure, null, null);
        public static ScanOutcome ParseFailure(string _) => new(OutcomeKind.ParseFailure, null, null);
    }
}
