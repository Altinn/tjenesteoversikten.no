namespace AltinnServiceCatalogue.PolicyStatistics;

public sealed record PolicyResourceMetadataDto(
    string ResourceId,
    IReadOnlyDictionary<string, string> Title,
    string OwnerId,
    IReadOnlyDictionary<string, string> OwnerName,
    string ResourceType);

public sealed record PolicyAlgorithmUsageDto(string Algorithm, string Kind, int Count);

public sealed record PolicyAltinn2RoleOnlyResourceDto(
    string ResourceId,
    IReadOnlyDictionary<string, string> Title,
    string OwnerId,
    IReadOnlyDictionary<string, string> OwnerName,
    string ResourceType,
    IReadOnlyList<string> Altinn2RoleCodes,
    IReadOnlyList<string> ErRoleCodes,
    IReadOnlyList<string> OtherAltinn2RoleCodes);

public sealed record PolicyAltinn2RoleOnlyGroupDto(
    string OwnerId,
    IReadOnlyDictionary<string, string> OwnerName,
    string ResourceType,
    int ResourceCount,
    IReadOnlyList<PolicyAltinn2RoleOnlyResourceDto> Resources);

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
    IReadOnlyList<PolicyResourceStatisticsDto> NonDefaultResources,
    int Altinn2RoleOnlyResourceCount,
    int Altinn2RoleOnlyWithErRolesCount,
    int Altinn2RoleOnlyWithoutErRolesCount,
    IReadOnlyList<PolicyAltinn2RoleOnlyGroupDto> Altinn2RoleOnlyGroups);
