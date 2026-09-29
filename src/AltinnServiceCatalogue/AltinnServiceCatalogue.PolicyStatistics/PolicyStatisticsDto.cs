namespace AltinnServiceCatalogue.PolicyStatistics;

public sealed record PolicyResourceMetadataDto(
    string ResourceId,
    IReadOnlyDictionary<string, string> Title,
    string OwnerId,
    IReadOnlyDictionary<string, string> OwnerName,
    string ResourceType);

public sealed record PolicyAlgorithmUsageDto(string Algorithm, string Kind, int Count);

public sealed record PolicyAltinn2RoleResourceDto(
    string ResourceId,
    IReadOnlyDictionary<string, string> Title,
    string OwnerId,
    IReadOnlyDictionary<string, string> OwnerName,
    string ResourceType,
    IReadOnlyList<string> Altinn2RoleCodes,
    bool HasAccessPackages);

public sealed record PolicyAltinn2RoleGroupDto(
    string OwnerId,
    IReadOnlyDictionary<string, string> OwnerName,
    string ResourceType,
    int ResourceCount,
    IReadOnlyList<PolicyAltinn2RoleResourceDto> Resources);

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
    int Altinn2RoleResourceCount,
    IReadOnlyList<PolicyAltinn2RoleGroupDto> Altinn2RoleGroups,
    int Altinn2RoleOnlyResourceCount,
    int Altinn2RoleOnlyWithErRolesCount,
    int Altinn2RoleOnlyWithoutErRolesCount,
    IReadOnlyList<PolicyAltinn2RoleOnlyGroupDto> Altinn2RoleOnlyGroups);
