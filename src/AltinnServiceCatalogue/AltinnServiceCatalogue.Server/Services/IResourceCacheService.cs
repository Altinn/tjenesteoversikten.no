using Altinn.ResourceRegistry.Core.Models;

namespace AltinnServiceCatalogue.Server.Services;

public interface IResourceCacheService
{
    Task<List<ServiceResource>> GetResourceListAsync(string baseUrl, bool? includeApps = null, bool? includeAltinn2 = null, CancellationToken ct = default);
    Task<ServiceResource?> GetResourceByIdAsync(string baseUrl, string id, CancellationToken ct = default);
    Task<List<string>> GetKeywordsAsync(string baseUrl, bool? includeApps = null, bool? includeAltinn2 = null, CancellationToken ct = default);
    Task<List<ServiceResource>> GetResourcesByKeywordAsync(string baseUrl, string keyword, CancellationToken ct = default);
}
