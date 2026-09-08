# HTTP contract: role/package map

**Status**: Implementert additiv kontrakt. Eksisterende ruter og gyldige responser
beholdes. Kontrakten kontrolleres av MetadataMapEndpointTests og RolePackageMapTests.

## 1. Rollevalg

`GET /api/v1/{environment}/meta/info/roles/map-options`

Returnerer `200 application/json` med `RoleDto[]`, strengt validert. `[]` er
et vellykket tomt katalogsvar. Ruten er skilt fra eksisterende rollelisten for
at kartet kan håndheve streng lesing uten å endre eldre klienters feilsemantikk.
Den kolliderer ikke med dagens `{id:guid}`-rute.

Ny `GetRoleMapOptionsAsync` i IMetadataClient/MetadataClient bruker samme
upstream-URL som dagens rolleliste, eksisterende Metadata-HttpClient og delte
DTO-er. Null eller malformed payload gir 502, ikke 200 med tom liste.

## 2. Kart for valgt rolle og kontekst

`GET /api/v1/{environment}/meta/info/roles/{id}/package-map?variant=person`

### Input

- `environment`: eksisterende konfigurert miljø, `prod` eller `tt02`; ugyldig gir 400.
- `id`: rolle-GUID. Den nye ruten mottar tekst og validerer med Guid.TryParse; ugyldig GUID og Guid.Empty gir 400. Bruk ikke guid-rutebegrensning her, siden SPA-fallback ellers kan fange en ugyldig API-adresse.
- `variant`: valgfri, standard `person`. Eksplisitt tom/blank, kontrolltegn eller
  over 128 tegn gir 400. Trim før katalogoppslag og bruk case-insensitiv sammenligning.
- Ingen fri base-URL, språkparameter, ressursskanning eller tilgangstildeling.

### Response example

```json
{
  "environment": "prod",
  "role": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Eksempelrolle",
    "code": "EXAMPLE",
    "urn": "urn:example:role:example",
    "description": "Syntetisk eksempel",
    "isKeyRole": false,
    "isResourcePolicyAvailable": false
  },
  "selectedVariant": "person",
  "status": "complete",
  "contextDiscovery": {
    "source": "person-and-organization-subtypes",
    "status": "complete",
    "items": [
      { "code": "person", "description": null, "kind": "person" },
      { "code": "EXAMPLE_ORG", "description": "Eksempelform", "kind": "organization" }
    ],
    "errorCode": null
  },
  "selection": {
    "status": "complete",
    "packages": [],
    "packageCount": 0,
    "errorCode": null
  }
}
```

Navn, GUID-er og organisasjonskode i eksemplet er syntetiske.
Ikke-tomme `packages` bruker eksisterende `PackageDto` uten innlastede ressurser.
Se [datamodellen](../data-model.md) for deduplisering og samtlige felt.

### Svar- og statusregler

| Situasjon | HTTP | Resultat |
| --- | --- | --- |
| Rolle og begge datadeler lastet | 200 | status complete; eksakt antall unike pakker, også 0 |
| Rolle finnes, katalog lastet, pakkehenting feilet | 200 | partial; selection failed, packages/count null |
| Katalogfeil, person valgt, pakker lastet | 200 | partial; bare person i reservekatalog, kjente pakker tilgjengelige |
| Katalogfeil, ikke-person valgt | 200 | failed; selection unavailable med context_catalog_unavailable; intet pakkeoppslag |
| Katalog- og personpakkehenting feilet | 200 | failed; rollen beholdes, begge feil eksplisitte |
| Komplett katalog inneholder ikke valgt variant | 400 | ProblemDetails med code invalid_variant; ikke tom pakkerespons |
| Miljø ikke konfigurert | 400 | ProblemDetails med code invalid_environment |
| Rolle er bekreftet borte | 404 | ProblemDetails med code role_not_found |
| Rolle-/rollelisteoppslag feiler eller er malformed | 502 | ProblemDetails; ingen fiktiv rolle eller tom rolleliste |
| Timeout før nødvendig rolle-/rolleliste er tilgjengelig | 504 | ProblemDetails med code upstream_timeout |
| Klient avbryter | avbrutt forespørsel | CancellationToken forplantes; ingen cached feil eller late writes |

HTTP 200 med failed/partial er bevisst: kartet har et gyldig rolleobjekt og en
maskinlesbar forklaring som lar UI beholde roten og tilby retry. Klienten må
inspisere status, ikke bare `response.ok`.

Tillatte datadelfeil: `upstream_http_error`, `upstream_timeout`,
`invalid_upstream_payload`, `context_catalog_unavailable` (kun unavailable).
Ingen rå upstream-payload, interne URL-er eller exception-tekster i brukerresponsen.
ProblemDetails har standard status/title og en stabil `code`-utvidelse.

### Server processing

1. Valider miljø, id og parameterformat i kontroller; oppløs konfigurert base-URL.
2. Hent rolle og organisasjonskatalog parallelt med høyst to samtidige upstream-kall
   per map-forespørsel. Behold separate utfall, slik at katalogfeil ikke kaster bort
   en gyldig rolle. Rollefeil som hindrer map returneres etter tabellen over.
3. Bygg person + organisasjonskoder, dedupliser og finn kanonisk variant. Katalogkodene må bestå samme trim-/lengde-/kontrolltegnvalidering som variant-parameteren; ugyldige katalogelementer gir katalogfeil, ikke et ubrukelig valg.
   Vellykket `[]` fra subtypekilden gir komplett person-only-katalog.
4. Med komplett katalog avvises ukjent variant. Ved katalogfeil er bare person
   et sikkert tilgjengelig valg. Andre etterspurte valg er uavklart, ikke ugyldige.
5. Hent bare valgt, validert variants pakker, alltid `includeResources=false`.
6. Godta bare et gyldig array med gyldige pakkeidentiteter. Hele malformed arrays
   feiler; null, 204, ugyldig JSON eller HTTP-feil er aldri bekreftet tomt.
   Upstream 404 for et pakkeoppslag tolkes som kildefeil, ikke «rollen borte» eller null pakker.
7. Dedupliser på pakke-id og sett status/antall. Monter envelope utenfor cache.

### Strengt rolleoppslag

Eksisterende upstream-oppslag for én rolle returnerer et array. Kartets strenge
lesing godtar nøyaktig ett element med samme gyldige GUID som etterspurt.
HTTP 404 eller et vellykket tomt array betyr role_not_found. Null, ikke-array,
flere elementer eller et annet rolle-id er invalid_upstream_payload (502).
Ikke bruk FirstOrDefault som validering av rollen som kartets rot.

### Cache, retry og tidsavbrudd

- Cache-nøkkel for strenge rollelister: `map-roles:{baseUrl}`.
- Rolle: `map-role:{baseUrl}:{roleId}`.
- Katalog: `map-contexts:{baseUrl}`.
- Pakker: `map-packages:{baseUrl}:{roleId}:{normalizedVariant}:no-resources`.
- Cache bare validerte suksesser i 30 minutter, inkludert ekte tomme lister.
  Bruk egne nøkler slik at eldre, tapsfulle cacheoppføringer ikke gjenbrukes.
- Gjenbruk GetOrCreateCoalescedAsync; en factory må kaste ved feil, ikke returnere
  et ikke-null feilobjekt som hjelpetjenesten ville ha cachet.
- Retry er samme GET. Mislykkede deler hentes på nytt; vellykkede deler kan gjenbrukes.
- Behold Metadata-klientens eksisterende 30-sekunders timeout per upstream-kall.
  Skill dette fra `ct.IsCancellationRequested`; brukers avbrytelse er ikke timeoutstatus.
- Ingen global all-variant-skanning, bakgrunnsjobb eller automatisk miljøfallback.

## 3. Øvrige grensesnitt

Kartet bruker eksisterende pakkeeksport for valgfri tekstberiking og eksisterende
rolle-/pakkedetaljruter. Eksportfeil påvirker ikke hvilke pakker rollen gir.
Eksisterende `packages/byvariant`, rollelisten og pakkelister endrer ikke format
eller feilsemantikk som del av dette arbeidet.
