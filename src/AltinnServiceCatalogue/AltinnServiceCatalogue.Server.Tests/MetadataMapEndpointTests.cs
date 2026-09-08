using System.Net;
using System.Text.Json;
using AltinnServiceCatalogue.Server.Tests.Fixtures;
namespace AltinnServiceCatalogue.Server.Tests;
public class MetadataMapEndpointTests
{
    internal static string Map(string env = "prod", string? id = null, string variant = "person") =>
        $"/api/v1/{env}/meta/info/roles/{id ?? MetadataTestFactory.RoleId}/package-map?variant={Uri.EscapeDataString(variant)}";
    [Theory]
    [InlineData("person")]
    [InlineData("as")]
    public async Task Returns_selected_context_and_unique_packages(string variant)
    {
        using var host = new MetadataTestFactory();
        using var client = host.CreateClient();
        var response = await client.GetAsync(Map(variant: variant));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        Assert.Equal("complete", root.GetProperty("status").GetString());
        Assert.Equal("prod", root.GetProperty("environment").GetString());
        Assert.Equal(variant == "as" ? "AS" : "person", root.GetProperty("selectedVariant").GetString());
        Assert.Equal(2, root.GetProperty("contextDiscovery").GetProperty("items").GetArrayLength());
        Assert.Equal(1, root.GetProperty("selection").GetProperty("packageCount").GetInt32());
        Assert.Single(host.Calls.Keys, k => k.Contains("/packages?"));
        Assert.Contains(host.Calls.Keys, k => k.Contains("includeResources=false"));
    }
    [Theory]
    [InlineData("bad", null, "person")]
    [InlineData("prod", "not-guid", "person")]
    [InlineData("prod", "00000000-0000-0000-0000-000000000000", "person")]
    [InlineData("prod", null, "unknown")]
    [InlineData("prod", null, "")]
    [InlineData("prod", null, "a\nb")]
    public async Task Invalid_inputs_are_problem_details_not_spa(string env, string? id, string variant)
    {
        using var host = new MetadataTestFactory();
        var response = await host.CreateClient().GetAsync(Map(env, id, variant));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }
    [Fact]
    public async Task Options_and_confirmed_empty_selection()
    {
        using var host = new MetadataTestFactory { Respond = (r, _) => Task.FromResult(
            r.RequestUri!.AbsolutePath.EndsWith("/packages") ? MetadataTestFactory.Json("[]") : MetadataTestFactory.Success(r)) };
        var client = host.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/prod/meta/info/roles/map-options")).StatusCode);
        var doc = JsonDocument.Parse(await client.GetStringAsync(Map()));
        Assert.Equal(0, doc.RootElement.GetProperty("selection").GetProperty("packageCount").GetInt32());
    }
}
