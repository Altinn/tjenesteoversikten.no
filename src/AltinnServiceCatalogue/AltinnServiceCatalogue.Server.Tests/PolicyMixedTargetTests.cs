using System.Net;
using System.Text;
using System.Xml.Linq;
using AltinnServiceCatalogue.PolicyStatistics;

namespace AltinnServiceCatalogue.Server.Tests;

public class PolicyMixedTargetTests
{
    private static readonly XNamespace Ns = "urn:oasis:names:tc:xacml:3.0:core:schema:wd-17";
    private const string RuleId = "urn:altinn:example:ruleid:3";
    private const string ActionId = "urn:oasis:names:tc:xacml:1.0:action:action-id";

    // Public production snapshot retrieved 2026-10-22 from
    // https://platform.altinn.no/resourceregistry/api/v1/resource/app_brg_anonym-oppstartsveilederen/policy
    // The corresponding /policy/rights endpoint returned HTTP 500 on that date.
    private static XDocument LoadPolicy() => XDocument.Load(
        Path.Combine(AppContext.BaseDirectory, "Fixtures", "brg-anonym-oppstartsveilederen.xml"));

    private static XElement DeleteRule(XDocument policy) => policy.Root!.Elements(Ns + "Rule")
        .Single(rule => (string?)rule.Attribute("RuleId") == RuleId);

    private static XElement DeleteMatch(XDocument policy) => DeleteRule(policy).Descendants(Ns + "Match")
        .Single(match => (string?)match.Element(Ns + "AttributeDesignator")?.Attribute("AttributeId") == ActionId);

    [Fact]
    public async Task Production_example_identifies_rule_three_with_default_algorithm()
    {
        var metadata = new PolicyResourceMetadataDto("app_brg_anonym-oppstartsveilederen",
            new Dictionary<string, string> { ["nb"] = "Oppstartsveilederen" }, "brg",
            new Dictionary<string, string> { ["nb"] = "Brønnøysundregistrene" }, "AltinnApp");
        var result = await PolicyStatisticsScanner.ScanAsync("prod", new[] { metadata, metadata },
            (_, _) => Task.FromResult<Stream>(new MemoryStream(Encoding.UTF8.GetBytes(LoadPolicy().ToString()))),
            CancellationToken.None);

        Assert.Equal(1, result.ResourcesScanned);
        Assert.Equal(1, result.PoliciesParsed);
        Assert.Equal(1, result.MixedTargetPoliciesChecked);
        Assert.Equal(1, result.MixedTargetResourceCount);
        Assert.Empty(result.NonDefaultResources);
        var resource = Assert.Single(result.MixedTargetResources);
        Assert.Equal(metadata.Title, resource.Title);
        Assert.Equal(metadata.OwnerName, resource.OwnerName);
        Assert.Equal("brg", resource.OwnerId);
        var finding = Assert.Single(resource.Findings);
        Assert.Equal("Rule", finding.TargetKind);
        Assert.Equal(RuleId, finding.RuleId);
        Assert.Equal(2, finding.AnyOfIndex);
        Assert.Equal(1, finding.AllOfIndex);
        Assert.Equal(new[] { "delete" }, finding.Actions);
        Assert.Equal(new[] { "urn:altinn:app", "urn:altinn:org" }, finding.ResourceAttributeIds);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void Separate_groups_do_not_match_same_AllOf_pattern(bool separateAnyOf)
    {
        var policy = LoadPolicy();
        var action = DeleteMatch(policy);
        var anyOf = action.Parent!.Parent!;
        action.Remove();
        var actionAllOf = new XElement(Ns + "AllOf", action);
        if (separateAnyOf)
            anyOf.Parent!.Add(new XElement(Ns + "AnyOf", actionAllOf));
        else
            anyOf.Add(actionAllOf);

        Assert.Empty(PolicyMixedTargetAnalyzer.Analyze(policy));
    }

    [Fact]
    public void Detects_other_actions_rule_ids_and_multiple_findings()
    {
        var policy = LoadPolicy();
        var rule = DeleteRule(policy);
        var copy = new XElement(rule);
        copy.SetAttributeValue("RuleId", "custom-rule");
        var allOf = copy.Descendants(Ns + "AllOf").Last();
        allOf.Elements(Ns + "Match").Last().Element(Ns + "AttributeValue")!.Value = "write";
        policy.Root!.Add(copy);

        var findings = PolicyMixedTargetAnalyzer.Analyze(policy);
        Assert.Equal(2, findings.Count);
        Assert.Equal("custom-rule", findings[1].RuleId);
        Assert.Equal(new[] { "write" }, findings[1].Actions);
    }

    [Fact]
    public void Subject_attributes_with_resource_like_ids_are_not_resource_matches()
    {
        var policy = LoadPolicy();
        foreach (var designator in DeleteMatch(policy).Parent!.Elements(Ns + "Match")
            .Elements(Ns + "AttributeDesignator")
            .Where(element => (string?)element.Attribute("AttributeId") != ActionId))
            designator.SetAttributeValue("Category", "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject");

        Assert.Empty(PolicyMixedTargetAnalyzer.Analyze(policy));
    }

    [Fact]
    public void Policy_target_is_reported_without_inventing_a_rule_id()
    {
        var policy = LoadPolicy();
        var allOf = DeleteMatch(policy).Parent!;
        allOf.Remove();
        policy.Root!.Element(Ns + "Target")!.Add(new XElement(Ns + "AnyOf", allOf));

        var finding = Assert.Single(PolicyMixedTargetAnalyzer.Analyze(policy));
        Assert.Equal("Policy", finding.TargetKind);
        Assert.Null(finding.RuleId);
    }

    [Fact]
    public void Xml_namespace_prefix_does_not_affect_detection()
    {
        var policy = LoadPolicy();
        policy.Root!.Attribute(XNamespace.Xmlns + "xacml")!.Remove();
        policy.Root.SetAttributeValue("xmlns", Ns.NamespaceName);
        Assert.Single(PolicyMixedTargetAnalyzer.Analyze(XDocument.Parse(policy.ToString())));
    }

    [Fact]
    public async Task Findings_survive_abac_parse_errors_and_coverage_excludes_unreadable_policies()
    {
        var invalidPolicy = LoadPolicy();
        DeleteRule(invalidPolicy).SetAttributeValue("Effect", "UnsupportedEffect");
        var result = await PolicyStatisticsScanner.ScanAsync("prod",
            new[] { "found", "invalid-xml", "missing", "unavailable" },
            (id, _) => id switch
            {
                "missing" => throw new HttpRequestException("Not found", null, HttpStatusCode.NotFound),
                "unavailable" => throw new HttpRequestException("Failure", null, HttpStatusCode.InternalServerError),
                _ => Task.FromResult<Stream>(new MemoryStream(Encoding.UTF8.GetBytes(
                    id == "found" ? invalidPolicy.ToString() : "<Policy")))
            }, CancellationToken.None);

        Assert.Equal(1, result.MixedTargetPoliciesChecked);
        Assert.Equal(1, result.MixedTargetResourceCount);
        Assert.Equal("found", Assert.Single(result.MixedTargetResources).ResourceId);
        Assert.Equal(2, result.ParseFailures);
        Assert.Equal(1, result.FetchFailures);
        Assert.Equal(1, result.ResourcesWithoutPolicy);
        Assert.Equal(0, result.PoliciesParsed);
    }
}
