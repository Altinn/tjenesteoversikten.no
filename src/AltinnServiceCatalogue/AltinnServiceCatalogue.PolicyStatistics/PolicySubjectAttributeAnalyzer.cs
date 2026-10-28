using System.Xml.Linq;

namespace AltinnServiceCatalogue.PolicyStatistics;

/// <summary>
/// Lists the distinct subject attribute key/value pairs a policy matches on, such as
/// <c>urn:altinn:rolecode</c> = <c>dagl</c> or <c>urn:altinn:org</c> = <c>skd</c>.
/// Keys and values are lower-cased so that differently cased spellings count as one subject.
/// </summary>
public static class PolicySubjectAttributeAnalyzer
{
    private const string SubjectCategoryPrefix = "urn:oasis:names:tc:xacml:1.0:subject-category:";

    public static IReadOnlyList<(string AttributeId, string Value)> Extract(XDocument document) =>
        document
            .Descendants()
            .Where(static element => element.Name.LocalName == "Match")
            .Select(static match =>
            {
                var designator = match.Elements().FirstOrDefault(static element =>
                    element.Name.LocalName == "AttributeDesignator"
                    && ((string?)element.Attribute("Category"))?.StartsWith(
                        SubjectCategoryPrefix, StringComparison.OrdinalIgnoreCase) == true);
                var value = match.Elements()
                    .FirstOrDefault(static element => element.Name.LocalName == "AttributeValue")?.Value.Trim();
                return (AttributeId: ((string?)designator?.Attribute("AttributeId"))?.Trim(), Value: value);
            })
            .Where(static pair => !string.IsNullOrEmpty(pair.AttributeId) && !string.IsNullOrEmpty(pair.Value))
            .Select(static pair => (pair.AttributeId!.ToLowerInvariant(), pair.Value!.ToLowerInvariant()))
            .Distinct()
            .ToArray();

    /// <summary>Counts, per key and per key/value pair, how many policies use it.</summary>
    public static IReadOnlyList<PolicySubjectAttributeUsageDto> Aggregate(
        IEnumerable<IReadOnlyList<(string AttributeId, string Value)>> policies)
    {
        var pairs = policies.ToArray();
        return pairs
            .SelectMany(static policy => policy)
            .GroupBy(static pair => pair.AttributeId, StringComparer.Ordinal)
            .Select(group => new PolicySubjectAttributeUsageDto(
                group.Key,
                pairs.Count(policy => policy.Any(pair => pair.AttributeId == group.Key)),
                group
                    .GroupBy(static pair => pair.Value, StringComparer.Ordinal)
                    .Select(static values => new PolicySubjectValueUsageDto(values.Key, values.Count()))
                    .OrderByDescending(static usage => usage.PolicyCount)
                    .ThenBy(static usage => usage.Value, StringComparer.Ordinal)
                    .ToArray()))
            .OrderByDescending(static usage => usage.PolicyCount)
            .ThenBy(static usage => usage.AttributeId, StringComparer.Ordinal)
            .ToArray();
    }
}
