using System.Text;
using AltinnServiceCatalogue.PolicyStatistics;

namespace AltinnServiceCatalogue.Server.Tests;

public class PolicySubjectAttributeUsageTests
{
    private const string SubjectCategory = "urn:oasis:names:tc:xacml:1.0:subject-category:access-subject";
    private const string ResourceCategory = "urn:oasis:names:tc:xacml:3.0:attribute-category:resource";

    [Fact]
    public async Task Counts_policies_per_subject_key_and_value()
    {
        var policies = new Dictionary<string, string>
        {
            // The same subject in two rules and in another casing still counts once per policy.
            ["resource-1"] = CreatePolicy(
                [("urn:altinn:rolecode", "dagl", SubjectCategory), ("urn:altinn:org", "skd", SubjectCategory)],
                [("urn:altinn:rolecode", "DAGL", SubjectCategory), ("urn:altinn:org", "ttd", ResourceCategory)]),
            ["resource-2"] = CreatePolicy(
                [("urn:altinn:rolecode", "regna", SubjectCategory), ("urn:altinn:rolecode", "dagl", SubjectCategory)]),
            ["resource-3"] = CreatePolicy([("urn:altinn:accesspackage", "regnskapsforer", SubjectCategory)]),
            ["resource-4"] = "not xml",
        };

        var result = await PolicyStatisticsScanner.ScanAsync(
            "prod",
            policies.Keys,
            (id, _) => Task.FromResult<Stream>(new MemoryStream(Encoding.UTF8.GetBytes(policies[id]))),
            CancellationToken.None);

        Assert.Equal(3, result.SubjectAttributePoliciesChecked);
        Assert.Equal(
            ["urn:altinn:rolecode", "urn:altinn:accesspackage", "urn:altinn:org"],
            result.SubjectAttributeUsage.Select(static usage => usage.AttributeId));
        var roles = result.SubjectAttributeUsage[0];
        Assert.Equal(2, roles.PolicyCount);
        Assert.Equal(
            [new PolicySubjectValueUsageDto("dagl", 2), new PolicySubjectValueUsageDto("regna", 1)],
            roles.Values);
        // The resource-category urn:altinn:org = ttd is not a subject and must not be counted.
        var org = result.SubjectAttributeUsage[2];
        Assert.Equal(1, org.PolicyCount);
        Assert.Equal([new PolicySubjectValueUsageDto("skd", 1)], org.Values);
    }

    private static string CreatePolicy(params (string AttributeId, string Value, string Category)[][] rules)
    {
        var ruleXml = string.Join(Environment.NewLine, rules.Select((matches, index) => $$"""
            <Rule RuleId="urn:altinn:rule:{{index}}" Effect="Permit">
              <Target>
                <AnyOf>{{string.Join("", matches.Select(match => $$"""
                  <AllOf><Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                    <AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">{{match.Value}}</AttributeValue>
                    <AttributeDesignator AttributeId="{{match.AttributeId}}" Category="{{match.Category}}"
                      DataType="http://www.w3.org/2001/XMLSchema#string" MustBePresent="false" />
                  </Match></AllOf>
                  """))}}</AnyOf>
              </Target>
            </Rule>
            """));

        return $$"""
            <?xml version="1.0" encoding="utf-8"?>
            <Policy xmlns="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"
              PolicyId="urn:altinn:policy:test" Version="1.0"
              RuleCombiningAlgId="{{PolicyStatisticsScanner.DefaultRuleCombiningAlgorithm}}">
              <Target />
              {{ruleXml}}
            </Policy>
            """;
    }
}
