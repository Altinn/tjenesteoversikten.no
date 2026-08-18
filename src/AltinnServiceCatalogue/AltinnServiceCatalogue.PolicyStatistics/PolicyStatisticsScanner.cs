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

    public static async Task<PolicyStatisticsDto> ScanAsync(
        string environment,
        IEnumerable<string> resourceIds,
        Func<string, CancellationToken, Task<Stream>> fetchPolicy,
        CancellationToken ct,
        Action<string, Exception>? onFetchFailure = null,
        Action<string, Exception>? onParseFailure = null)
    {
        var ids = resourceIds
            .Where(static id => !string.IsNullOrWhiteSpace(id))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var outcomes = new ConcurrentBag<ScanOutcome>();
        var stopwatch = Stopwatch.StartNew();

        await Parallel.ForEachAsync(
            ids,
            new ParallelOptions { MaxDegreeOfParallelism = MaxConcurrency, CancellationToken = ct },
            async (resourceId, cancellationToken) =>
            {
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

                        outcomes.Add(ScanOutcome.Policy(new PolicyResourceStatisticsDto(
                            resourceId,
                            algorithm,
                            algorithmKind,
                            rules.Count,
                            denyRuleCount,
                            hasMustBePresent,
                            hasCondition,
                            usesPolicyAlgorithm,
                            legacyIncorrect)));
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

        return new PolicyStatisticsDto(
            environment,
            DateTimeOffset.UtcNow,
            stopwatch.ElapsedMilliseconds,
            MaxConcurrency,
            NonDefaultResourceLimit,
            ids.Length,
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
            nonDefault.Take(NonDefaultResourceLimit).ToArray());
    }

    private static string ClassifyAlgorithm(string algorithm)
    {
        if (algorithm.Contains(":rule-combining-algorithm:", StringComparison.Ordinal))
            return "rule-combining";
        if (algorithm.Contains(":policy-combining-algorithm:", StringComparison.Ordinal))
            return "policy-combining";
        return "unrecognised";
    }

    private enum OutcomeKind { Policy, NoPolicy, FetchFailure, ParseFailure }

    private sealed record ScanOutcome(OutcomeKind Kind, PolicyResourceStatisticsDto? PolicyStatistics)
    {
        public static ScanOutcome Policy(PolicyResourceStatisticsDto statistics) => new(OutcomeKind.Policy, statistics);
        public static ScanOutcome NoPolicy(string _) => new(OutcomeKind.NoPolicy, null);
        public static ScanOutcome FetchFailure(string _) => new(OutcomeKind.FetchFailure, null);
        public static ScanOutcome ParseFailure(string _) => new(OutcomeKind.ParseFailure, null);
    }
}
