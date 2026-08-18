namespace AltinnServiceCatalogue.PolicyStatistics;

public sealed record PolicyAlgorithmUsageDto(string Algorithm, string Kind, int Count);

public sealed record PolicyResourceStatisticsDto(
    string ResourceId,
    string Algorithm,
    string AlgorithmKind,
    int RuleCount,
    int DenyRuleCount,
    bool HasMustBePresent,
    bool HasCondition,
    bool UsesPolicyCombiningAlgorithmInRuleSlot,
    bool WouldLegacyPdpEvaluateIncorrectly);

public sealed record PolicyStatisticsDto(
    string Environment,
    DateTimeOffset GeneratedAt,
    long ScanDurationMilliseconds,
    int MaxConcurrency,
    int NonDefaultResourceLimit,
    int ResourcesScanned,
    int PoliciesFetched,
    int PoliciesParsed,
    int ResourcesWithoutPolicy,
    int FetchFailures,
    int ParseFailures,
    int PoliciesUsingPolicyCombiningAlgorithmInRuleSlot,
    int PoliciesWithDenyRules,
    int PoliciesWithMustBePresent,
    int PoliciesWithConditions,
    int LegacyIncorrectEvaluationCount,
    IReadOnlyList<PolicyAlgorithmUsageDto> AlgorithmUsage,
    int NonDefaultResourceCount,
    bool NonDefaultResourcesCapped,
    IReadOnlyList<PolicyResourceStatisticsDto> NonDefaultResources);
