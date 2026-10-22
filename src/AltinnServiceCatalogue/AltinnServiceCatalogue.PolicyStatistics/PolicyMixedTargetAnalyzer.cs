using System.Xml.Linq;

namespace AltinnServiceCatalogue.PolicyStatistics;

/// <summary>
/// Finds the legacy template pattern where resource and action matches share an AllOf.
/// This is a compatibility finding for Altinn's rights/rules extraction, not an XACML
/// validity check or proof that a particular endpoint currently returns HTTP 500.
/// </summary>
public static class PolicyMixedTargetAnalyzer
{
    private static readonly XNamespace Xacml = "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17";
    private const string ResourceCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";
    private const string ActionCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:action";
    private const string ActionId = "urn:oasis:names:tc:xacml:1.0:action:action-id";

    public static IReadOnlyList<PolicyMixedTargetFindingDto> Analyze(XDocument document)
    {
        if (document.Root?.Name != Xacml + "Policy")
            throw new InvalidDataException("Expected a XACML 3.0 Policy document.");

        var findings = new List<PolicyMixedTargetFindingDto>();
        var targets = document.Root.Elements(Xacml + "Target")
            .Concat(document.Root.Elements(Xacml + "Rule").Elements(Xacml + "Target"));

        foreach (var target in targets)
        {
            var anyOfIndex = 0;
            foreach (var anyOf in target.Elements(Xacml + "AnyOf"))
            {
                anyOfIndex++;
                var allOfIndex = 0;
                foreach (var allOf in anyOf.Elements(Xacml + "AllOf"))
                {
                    allOfIndex++;
                    var matches = allOf.Elements(Xacml + "Match").ToArray();
                    var resourceAttributes = matches
                        .Elements(Xacml + "AttributeDesignator")
                        .Where(designator => (string?)designator.Attribute("Category") == ResourceCategory)
                        .Select(designator => (string?)designator.Attribute("AttributeId") ?? string.Empty)
                        .Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray();
                    var actionMatches = matches.Where(match => match.Elements(Xacml + "AttributeDesignator")
                        .Any(designator => (string?)designator.Attribute("Category") == ActionCategory
                            && (string?)designator.Attribute("AttributeId") == ActionId)).ToArray();
                    if (resourceAttributes.Length == 0 || actionMatches.Length == 0)
                        continue;

                    findings.Add(new PolicyMixedTargetFindingDto(
                        target.Parent!.Name.LocalName,
                        (string?)target.Parent.Attribute("RuleId"),
                        anyOfIndex,
                        allOfIndex,
                        actionMatches.Elements(Xacml + "AttributeValue").Select(value => value.Value)
                            .Distinct(StringComparer.Ordinal).Order(StringComparer.Ordinal).ToArray(),
                        resourceAttributes));
                }
            }
        }

        return findings;
    }
}
