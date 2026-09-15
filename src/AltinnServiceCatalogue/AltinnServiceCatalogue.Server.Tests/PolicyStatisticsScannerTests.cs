using System.Text;
using AltinnServiceCatalogue.PolicyStatistics;

namespace AltinnServiceCatalogue.Server.Tests;

public class PolicyStatisticsScannerTests
{
    [Theory]
    [InlineData("UTIN", 1, 1, 0)]
    [InlineData("PRIV,UTIN", 0, 0, 0)]
    [InlineData("SELN,UTIN", 1, 1, 0)]
    [InlineData("PRIV,DAGL", 1, 0, 1)]
    public async Task Altinn2_role_only_statistics_handle_persistent_roles(
        string roleList,
        int expectedTotal,
        int expectedWithoutEr,
        int expectedWithEr)
    {
        var policyXml = CreatePolicy(roleList.Split(','));
        var metadata = new[]
        {
            new PolicyResourceMetadataDto(
                "resource-1",
                new Dictionary<string, string> { ["nb"] = "Test" },
                "owner",
                new Dictionary<string, string> { ["nb"] = "Owner" },
                "AltinnApp")
        };

        var result = await PolicyStatisticsScanner.ScanAsync(
            "prod",
            metadata,
            (_, _) => Task.FromResult<Stream>(
                new MemoryStream(Encoding.UTF8.GetBytes(policyXml))),
            CancellationToken.None,
            erLegacyRoleCodes: new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "DAGL" });

        Assert.Equal(expectedTotal, result.Altinn2RoleOnlyResourceCount);
        Assert.Equal(expectedWithoutEr, result.Altinn2RoleOnlyWithoutErRolesCount);
        Assert.Equal(expectedWithEr, result.Altinn2RoleOnlyWithErRolesCount);
    }

    private static string CreatePolicy(IEnumerable<string> roles)
    {
        var matches = string.Join(
            Environment.NewLine,
            roles.Select(role => $$"""
                <Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
                  <AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">{{role}}</AttributeValue>
                  <AttributeDesignator
                    AttributeId="urn:altinn:rolecode"
                    Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject"
                    DataType="http://www.w3.org/2001/XMLSchema#string"
                    MustBePresent="false" />
                </Match>
                """));

        return $$"""
            <?xml version="1.0" encoding="utf-8"?>
            <Policy xmlns="urn:oasis:names:tc:xacml:3.0:core:schema:wd-17"
              PolicyId="urn:altinn:policy:test"
              Version="1.0"
              RuleCombiningAlgId="{{PolicyStatisticsScanner.DefaultRuleCombiningAlgorithm}}">
              <Target />
              <Rule RuleId="urn:altinn:rule:test" Effect="Permit">
                <Target>
                  <AnyOf><AllOf>{{matches}}</AllOf></AnyOf>
                </Target>
              </Rule>
            </Policy>
            """;
    }
}
