using AltinnServiceCatalogue.PolicyStatistics;

namespace AltinnServiceCatalogue.Server.Services;

public interface IPolicyStatisticsService
{
    Task<PolicyStatisticsDto> GetAsync(string environment, string baseUrl, CancellationToken ct = default);
}
