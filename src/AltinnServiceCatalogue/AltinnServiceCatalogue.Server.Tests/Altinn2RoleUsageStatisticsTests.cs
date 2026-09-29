using System.Text;
using AltinnServiceCatalogue.PolicyStatistics;

namespace AltinnServiceCatalogue.Server.Tests;

public class Altinn2RoleUsageStatisticsTests
{
    [Theory]
    [InlineData("UTIN", "UTIN")]
    [InlineData("PRIV,UTIN", "UTIN")]
    [InlineData("SELN,UTIN", "UTIN")]
    [InlineData("DAGL,UTIN", "UTIN")]
    [InlineData("PRIV,DAGL,UTIN", "UTIN")]
    public async Task Includes_resources_with_at_least_one_role_being_phased_out(
        string roleList,
        string expectedRoleList)
    {
        var result = await ScanAsync(CreatePolicy(roleList.Split(',')));

        Assert.Equal(1, result.Altinn2RoleResourceCount);
        var resource = Assert.Single(Assert.Single(result.Altinn2RoleGroups).Resources);
        Assert.Equal(
            expectedRoleList.Split(',').OrderBy(static code => code, StringComparer.OrdinalIgnoreCase),
            resource.Altinn2RoleCodes);
        Assert.False(resource.HasAccessPackages);
    }

    [Theory]
    [InlineData("PRIV")]
    [InlineData("SELN")]
    [InlineData("DAGL")]
    [InlineData("PRIV,DAGL")]
    [InlineData("SELN,DAGL")]
    public async Task Excludes_resources_with_only_persistent_or_er_roles(string roleList)
    {
        var result = await ScanAsync(CreatePolicy(roleList.Split(',')));

        Assert.Equal(0, result.Altinn2RoleResourceCount);
        Assert.Empty(result.Altinn2RoleGroups);
    }

    [Fact]
    public async Task Excludes_migrated_apps_even_with_roles_being_phased_out()
    {
        var result = await ScanAsync(CreatePolicy(["UTIN"]), "MigratedApp");

        Assert.Equal(0, result.Altinn2RoleResourceCount);
        Assert.Empty(result.Altinn2RoleGroups);
    }

    [Fact]
    public async Task Includes_resources_that_also_have_access_packages()
    {
        var result = await ScanAsync(CreatePolicy(["UTIN"], ["skattegrunnlag"]));

        Assert.Equal(1, result.Altinn2RoleResourceCount);
        Assert.Equal(0, result.Altinn2RoleOnlyResourceCount);
        var resource = Assert.Single(Assert.Single(result.Altinn2RoleGroups).Resources);
        Assert.True(resource.HasAccessPackages);
        Assert.Equal(["UTIN"], resource.Altinn2RoleCodes);
    }

    private static Task<PolicyStatisticsDto> ScanAsync(string policyXml, string resourceType = "AltinnApp")
    {
        var metadata = new[]
        {
            new PolicyResourceMetadataDto(
                "resource-1",
                new Dictionary<string, string> { ["nb"] = "Test" },
                "owner",
                new Dictionary<string, string> { ["nb"] = "Owner" },
                resourceType)
        };

        return PolicyStatisticsScanner.ScanAsync(
            "prod",
            metadata,
            (_, _) => Task.FromResult<Stream>(
                new MemoryStream(Encoding.UTF8.GetBytes(policyXml))),
            CancellationToken.None,
            erLegacyRoleCodes: new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "DAGL" });
    }

    private static string CreatePolicy(
        IEnumerable<string> roles,
        IEnumerable<string>? accessPackages = null)
    {
        var matches = string.Join(
            Environment.NewLine,
            roles.Select(role => CreateMatch(role, "urn:altinn:rolecode"))
                .Concat((accessPackages ?? []).Select(package =>
                    CreateMatch(package, "urn:altinn:accesspackage"))));

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

    private static string CreateMatch(string value, string attributeId) =>
        $$"""
          <Match MatchId="urn:oasis:names:tc:xacml:1.0:function:string-equal">
            <AttributeValue DataType="http://www.w3.org/2001/XMLSchema#string">{{value}}</AttributeValue>
            <AttributeDesignator
              AttributeId="{{attributeId}}"
              Category="urn:oasis:names:tc:xacml:1.0:subject-category:access-subject"
              DataType="http://www.w3.org/2001/XMLSchema#string"
              MustBePresent="false" />
          </Match>
          """;
}
