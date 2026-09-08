using System.Collections.Concurrent;
using System.Net;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
namespace AltinnServiceCatalogue.Server.Tests.Fixtures;

public sealed class MetadataTestFactory : WebApplicationFactory<Program>
{
    public TestClock Clock { get; } = new();
#pragma warning disable CS0618
    public sealed class TestClock : Microsoft.Extensions.Internal.ISystemClock
    {
        public DateTimeOffset UtcNow { get; set; } = DateTimeOffset.UtcNow;
    }
#pragma warning restore CS0618
    public const string RoleId = "11111111-1111-4111-8111-111111111111";
    public const string PackageId = "22222222-2222-4222-8222-222222222222";
    public ConcurrentDictionary<string, int> Calls { get; } = new();
    public Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>>? Respond { get; set; }
    public static HttpResponseMessage Json(string json, HttpStatusCode code = HttpStatusCode.OK) =>
        new(code) { Content = new StringContent(json, Encoding.UTF8, "application/json") };
    public static HttpResponseMessage Success(HttpRequestMessage request)
    {
        var path = request.RequestUri!.AbsolutePath;
        if (path.EndsWith("/subtypes")) return Json("""[{"name":"AS","description":"Aksjeselskap"},{"name":"as"}]""");
        if (path.EndsWith("/packages")) return Json($$"""[{"id":"{{PackageId}}","name":"Rapportering"},{"id":"{{PackageId}}"}]""");
        if (path.EndsWith("/roles") || path.EndsWith($"/roles/{RoleId}"))
            return Json($$"""[{"id":"{{RoleId}}","name":"Rolle A","code":"A"}]""");
        throw new InvalidOperationException($"Unexpected upstream request: {request.RequestUri}");
    }
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
#pragma warning disable CS0618
        builder.ConfigureServices(services => services.Configure<Microsoft.Extensions.Caching.Memory.MemoryCacheOptions>(o => o.Clock = Clock));
#pragma warning restore CS0618
        builder.ConfigureServices(services => services.AddHttpClient("Metadata")
            .ConfigurePrimaryHttpMessageHandler(() => new Handler(this)));
    }
    private sealed class Handler(MetadataTestFactory owner) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            owner.Calls.AddOrUpdate(request.RequestUri!.ToString(), 1, (_, count) => count + 1);
            ct.ThrowIfCancellationRequested();
            return owner.Respond?.Invoke(request, ct) ?? Task.FromResult(Success(request));
        }
    }
}