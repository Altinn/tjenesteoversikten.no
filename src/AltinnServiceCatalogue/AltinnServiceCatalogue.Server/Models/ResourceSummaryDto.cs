namespace AltinnServiceCatalogue.Server.Models;

public sealed record ResourceSummaryDto(
    string Identifier,
    IReadOnlyDictionary<string, string> Title,
    IReadOnlyDictionary<string, string> Description,
    string? Status,
    bool Delegable,
    bool Visible,
    string ResourceType,
    CompetentAuthoritySummaryDto? HasCompetentAuthority);

public sealed record CompetentAuthoritySummaryDto(
    IReadOnlyDictionary<string, string> Name,
    string Organization,
    string Orgcode);
