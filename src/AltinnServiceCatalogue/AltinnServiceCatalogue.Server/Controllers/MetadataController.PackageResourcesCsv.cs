using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace AltinnServiceCatalogue.Server.Controllers;

public partial class MetadataController
{
    [HttpGet("info/accesspackages/resources.csv")]
    [ProducesResponseType<FileContentResult>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ExportPackageResourcesCsv(
        [FromRoute] string environment, CancellationToken ct)
    {
        if (!TryResolveBaseUrl(environment, out var baseUrl))
            return BadRequest($"Unknown environment: {environment}");

        try
        {
            var csv = await client.ExportPackageResourcesCsvAsync(baseUrl, ct);
            return File(csv, "text/csv; charset=utf-8", $"tilgangspakker-tjenester-{environment}.csv");
        }
        catch (Exception ex) when (ex is HttpRequestException or JsonException
            || ex is OperationCanceledException && !ct.IsCancellationRequested)
        {
            logger.LogError(ex, "Upstream request failed for package resource CSV in {Environment}", environment);
            return Problem(statusCode: StatusCodes.Status502BadGateway, title: "Could not export package resources");
        }
    }
}
