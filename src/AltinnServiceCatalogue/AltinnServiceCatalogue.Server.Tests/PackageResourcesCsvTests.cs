using System.Net;
using System.Text;
using System.Text.Json;
using AltinnServiceCatalogue.Server.Tests.Fixtures;
using Microsoft.VisualBasic.FileIO;

namespace AltinnServiceCatalogue.Server.Tests;

public class PackageResourcesCsvTests
{
    private const string Path = "/api/v1/prod/meta/info/accesspackages/resources.csv";

    [Fact]
    public async Task Exports_unique_links_with_bokmal_names_org_codes_and_valid_csv()
    {
        const string name = "Årsoppgjør, \"lønn\"\r\nog skatt";
        var resource = new { refId = "resource-a", name, provider = new { code = "skd" } };
        var data = new object[]
        {
            new { @object = new { urn = "urn:altinn:accesspackage:z", resources = new[] { resource } } },
            new { @object = new { urn = "urn:altinn:accesspackage:a", resources = new[] { resource, resource } } },
            new { @object = new { urn = "urn:altinn:accesspackage:empty", resources = Array.Empty<object>() } },
        };
        using var host = new MetadataTestFactory
        {
            Respond = (r, _) =>
            {
                Assert.Equal("/accessmanagement/api/v1/meta/info/accesspackages/search", r.RequestUri!.AbsolutePath);
                Assert.Equal("", r.RequestUri.Query);
                Assert.Equal("nb", r.Headers.AcceptLanguage.ToString());
                return Task.FromResult(MetadataTestFactory.Json(JsonSerializer.Serialize(data)));
            },
        };
        var client = host.CreateClient();
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("en");
        var response = await client.GetAsync(Path);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal("utf-8", response.Content.Headers.ContentType?.CharSet);
        Assert.Contains("tilgangspakker-tjenester-prod.csv", response.Content.Headers.ContentDisposition!.ToString());
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.AsSpan().StartsWith(Encoding.UTF8.GetPreamble()));
        var rows = Parse(bytes);
        Assert.Equal(3, rows.Count);
        Assert.Equal(new[] { "pakkeurn", "ressursid", "ressurs_org", "ressursnavn_nb" }, rows[0]);
        Assert.Equal(new[] { "urn:altinn:accesspackage:a", "resource-a", "skd", name }, rows[1]);
        Assert.Equal("urn:altinn:accesspackage:z", rows[2][0]);
        await client.GetAsync(Path);
        Assert.Equal(1, host.Calls.Values.Single());
    }

    [Fact]
    public async Task Empty_result_has_only_headers_and_invalid_environment_makes_no_request()
    {
        using var host = new MetadataTestFactory { Respond = (_, _) => Task.FromResult(MetadataTestFactory.Json("[]")) };
        var client = host.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync(Path.Replace("/prod/", "/bad/"))).StatusCode);
        Assert.Empty(host.Calls);
        Assert.Single(Parse(await client.GetByteArrayAsync(Path)));
    }

    [Theory]
    [InlineData("=1+1")]
    [InlineData("  @SUM(A1)")]
    [InlineData("+1")]
    [InlineData("-1")]
    [InlineData("\ttext")]
    public async Task Formula_like_names_are_text_and_missing_org_is_empty(string name)
    {
        var json = JsonSerializer.Serialize(new[] { new { @object = new {
            urn = "urn:altinn:accesspackage:a", resources = new[] { new { refId = "r", name } },
        } } });
        using var host = new MetadataTestFactory { Respond = (_, _) => Task.FromResult(MetadataTestFactory.Json(json)) };
        var rows = Parse(await host.CreateClient().GetByteArrayAsync(Path));
        Assert.Equal("", rows[1][2]);
        Assert.Equal("'" + name, rows[1][3]);
    }

    [Theory]
    [InlineData("{}", HttpStatusCode.OK)]
    [InlineData("null", HttpStatusCode.OK)]
    [InlineData("[]", HttpStatusCode.ServiceUnavailable)]
    public async Task Upstream_failure_is_not_downloaded_or_cached(string body, HttpStatusCode status)
    {
        using var host = new MetadataTestFactory { Respond = (_, _) => Task.FromResult(MetadataTestFactory.Json(body, status)) };
        var client = host.CreateClient();
        var response = await client.GetAsync(Path);
        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
        Assert.Null(response.Content.Headers.ContentDisposition);
        host.Respond = (_, _) => Task.FromResult(MetadataTestFactory.Json("[]"));
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(Path)).StatusCode);
    }

    private static List<string[]> Parse(byte[] bytes)
    {
        using var parser = new TextFieldParser(new MemoryStream(bytes), Encoding.UTF8);
        parser.SetDelimiters(",");
        parser.HasFieldsEnclosedInQuotes = true;
        parser.TrimWhiteSpace = false;
        var rows = new List<string[]>();
        while (!parser.EndOfData) rows.Add(parser.ReadFields()!);
        return rows;
    }
}
