using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Text.Json;
using AltinnServiceCatalogue.Server.Tests.Fixtures;
namespace AltinnServiceCatalogue.Server.Tests;
public class RolePackageMapTests
{
    [Theory]
    [InlineData(false, true, "person", "partial", "failed")]
    [InlineData(true, false, "person", "partial", "complete")]
    [InlineData(true, true, "person", "failed", "failed")]
    [InlineData(true, false, "AS", "failed", "unavailable")]
    public async Task Failure_matrix(bool catalogueFails, bool packagesFail, string variant, string status, string selection)
    {
        using var host = new MetadataTestFactory { Respond = (r, _) => Task.FromResult(
            (catalogueFails && r.RequestUri!.AbsolutePath.EndsWith("/subtypes")) ||
            (packagesFail && r.RequestUri!.AbsolutePath.EndsWith("/packages"))
                ? MetadataTestFactory.Json("private upstream error", HttpStatusCode.BadGateway) : MetadataTestFactory.Success(r)) };
        var response = await host.CreateClient().GetAsync(MetadataMapEndpointTests.Map(variant: variant));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(status, doc.RootElement.GetProperty("status").GetString());
        var selected = doc.RootElement.GetProperty("selection");
        Assert.Equal(selection, selected.GetProperty("status").GetString());
        if (selection != "complete") Assert.Equal(JsonValueKind.Null, selected.GetProperty("packageCount").ValueKind);
        Assert.DoesNotContain("private upstream", await response.Content.ReadAsStringAsync());
        if (selection == "unavailable") Assert.DoesNotContain(host.Calls.Keys, k => k.Contains("/packages?"));
    }
    [Theory]
    [InlineData("null")]
    [InlineData("{}")]
    [InlineData("oops")]
    [InlineData("[null]")]
    [InlineData("[{\"id\":\"not-guid\"}]")]
    [InlineData("[{}]")]
    public async Task Malformed_packages_are_not_empty(string payload)
    {
        using var host = new MetadataTestFactory { Respond = (r, _) => Task.FromResult(r.RequestUri!.AbsolutePath.EndsWith("/packages")
            ? MetadataTestFactory.Json(payload) : MetadataTestFactory.Success(r)) };
        using var doc = JsonDocument.Parse(await host.CreateClient().GetStringAsync(MetadataMapEndpointTests.Map()));
        Assert.Equal("invalid_upstream_payload", doc.RootElement.GetProperty("selection").GetProperty("errorCode").GetString());
    }
    [Theory]
    [InlineData("[]", 404)]
    [InlineData("null", 502)]
    [InlineData("[{\"id\":\"22222222-2222-4222-8222-222222222222\"}]", 502)]
    [InlineData("[{},{}]", 502)]
    public async Task Strict_role_lookup(string payload, int code)
    {
        using var host = new MetadataTestFactory { Respond = (r, _) => Task.FromResult(r.RequestUri!.AbsolutePath.EndsWith(MetadataTestFactory.RoleId)
            ? MetadataTestFactory.Json(payload) : MetadataTestFactory.Success(r)) };
        Assert.Equal(code, (int)(await host.CreateClient().GetAsync(MetadataMapEndpointTests.Map())).StatusCode);
    }
    [Fact]
    public async Task Failed_parts_retry_successes_coalesce_and_environments_are_isolated()
    {
        var fail = true;
        using var host = new MetadataTestFactory { Respond = async (r, ct) => {
            await Task.Delay(10, ct);
            return fail && r.RequestUri!.AbsolutePath.EndsWith("/packages") ? MetadataTestFactory.Json("null") : MetadataTestFactory.Success(r);
        }};
        var client = host.CreateClient();
        await client.GetAsync(MetadataMapEndpointTests.Map());
        fail = false;
        await Task.WhenAll(Enumerable.Range(0, 8).Select(_ => client.GetAsync(MetadataMapEndpointTests.Map())));
        Assert.All(host.Calls.Where(k => !k.Key.Contains("/packages?")), k => Assert.Equal(1, k.Value));
        Assert.Equal(2, host.Calls.Single(k => k.Key.Contains("/packages?")).Value);
        await client.GetAsync(MetadataMapEndpointTests.Map("tt02"));
        Assert.Contains(host.Calls.Keys, k => k.Contains("platform.tt02.altinn.no"));
        Assert.Contains(host.Calls.Keys, k => k.Contains("platform.altinn.no"));
    }
    [Fact]
    public async Task Timeout_is_distinct_from_client_cancellation()
    {
        using var host = new MetadataTestFactory { Respond = (_, _) => throw new TaskCanceledException("timeout") };
        Assert.Equal(HttpStatusCode.GatewayTimeout, (await host.CreateClient().GetAsync(MetadataMapEndpointTests.Map())).StatusCode);
    }

    [Theory]
    [InlineData("null")]
    [InlineData("[]")]
    [InlineData("[null]")]
    [InlineData("[{\"name\":\" \"}]")]
    [InlineData("[{\"name\":\"a\\nb\"}]")]
    public async Task Context_catalogue_validation(string payload)
    {
        using var host = new MetadataTestFactory { Respond = (r, _) => Task.FromResult(r.RequestUri!.AbsolutePath.EndsWith("/subtypes")
            ? MetadataTestFactory.Json(payload) : MetadataTestFactory.Success(r)) };
        using var doc = JsonDocument.Parse(await host.CreateClient().GetStringAsync(MetadataMapEndpointTests.Map()));
        Assert.Equal(payload == "[]" ? "complete" : "partial", doc.RootElement.GetProperty("status").GetString());
        Assert.Equal(1, doc.RootElement.GetProperty("contextDiscovery").GetProperty("items").GetArrayLength());
    }
    [Theory]
    [InlineData(204, "invalid_upstream_payload")]
    [InlineData(404, "upstream_http_error")]
    [InlineData(503, "upstream_http_error")]
    public async Task Package_http_failures_are_never_zero(int code, string error)
    {
        using var host = new MetadataTestFactory { Respond = (r, _) => Task.FromResult(r.RequestUri!.AbsolutePath.EndsWith("/packages")
            ? MetadataTestFactory.Json("", (HttpStatusCode)code) : MetadataTestFactory.Success(r)) };
        using var doc = JsonDocument.Parse(await host.CreateClient().GetStringAsync(MetadataMapEndpointTests.Map()));
        var selection = doc.RootElement.GetProperty("selection");
        Assert.Equal(error, selection.GetProperty("errorCode").GetString());
        Assert.Equal(JsonValueKind.Null, selection.GetProperty("packageCount").ValueKind);
    }
    [Fact]
    public async Task Client_cancellation_releases_the_cache_lock_for_retry()
    {
        var started = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var delay = true;
        using var host = new MetadataTestFactory { Respond = async (r, ct) => {
            if (delay && r.RequestUri!.AbsolutePath.EndsWith("/packages")) {
                started.TrySetResult();
                await Task.Delay(Timeout.Infinite, ct);
            }
            return MetadataTestFactory.Success(r);
        }};
        var metadata = host.Services.GetRequiredService<AltinnServiceCatalogue.Server.Services.IMetadataClient>();
        using var cancel = new CancellationTokenSource();
        var pending = metadata.GetRolePackageMapAsync("https://platform.altinn.no", "prod", Guid.Parse(MetadataTestFactory.RoleId), "person", cancel.Token);
        await started.Task.WaitAsync(TimeSpan.FromSeconds(5));
        cancel.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => pending);
        delay = false;
        var retry = await metadata.GetRolePackageMapAsync("https://platform.altinn.no", "prod", Guid.Parse(MetadataTestFactory.RoleId), "person", default);
        Assert.Equal("complete", retry.Status);
    }
    [Fact]
    public async Task Successful_components_expire_after_thirty_minutes()
    {
        using var host = new MetadataTestFactory();
        var client = host.CreateClient();
        await client.GetAsync(MetadataMapEndpointTests.Map());
        host.Clock.UtcNow += TimeSpan.FromMinutes(29);
        await client.GetAsync(MetadataMapEndpointTests.Map());
        Assert.All(host.Calls.Values, calls => Assert.Equal(1, calls));
        host.Clock.UtcNow += TimeSpan.FromMinutes(2);
        await client.GetAsync(MetadataMapEndpointTests.Map());
        Assert.All(host.Calls.Values, calls => Assert.Equal(2, calls));
    }
    [Fact]
    public async Task Variant_cache_keys_are_separate_but_case_insensitive()
    {
        using var host = new MetadataTestFactory();
        var client = host.CreateClient();
        await client.GetAsync(MetadataMapEndpointTests.Map());
        await client.GetAsync(MetadataMapEndpointTests.Map(variant: "AS"));
        await client.GetAsync(MetadataMapEndpointTests.Map(variant: "as"));
        Assert.Equal(2, host.Calls.Keys.Count(k => k.Contains("/packages?")));
        Assert.All(host.Calls.Values, calls => Assert.Equal(1, calls));
    }
}
