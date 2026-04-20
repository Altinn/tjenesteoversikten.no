# Altinn Service Catalogue

En full-stack webapplikasjon som lar deg bla, søke og utforske offentlige digitale tjenester
registrert i Altinn-plattformen. Applikasjonen fungerer som en tynn proxy og visningslag over
Altinns offentlige metadata-API-er, og gjør det enkelt å se hvilke tjenester som finnes,
hvem som eier dem, hvilke roller og tilgangspakker som gir tilgang, og hvilke
autentiseringsnivåer de krever.

> Dette er et uoffisielt, hobby-/demo-prosjekt og er ikke et offisielt Altinn-produkt.

## Innhold

- [Arkitektur](#arkitektur)
- [Altinn-API-er som brukes](#altinn-api-er-som-brukes)
  - [Resource Registry API](#resource-registry-api)
  - [Access Management Metadata API](#access-management-metadata-api)
- [Miljøer](#miljøer)
- [Proxy-endepunkter i denne applikasjonen](#proxy-endepunkter-i-denne-applikasjonen)
- [MCP-server](#mcp-server)
- [Teknologi](#teknologi)
- [Kjøre lokalt](#kjøre-lokalt)

## Arkitektur

```
┌─────────────────┐        ┌─────────────────────┐        ┌──────────────────────────┐
│  React SPA      │ ─────▶ │  ASP.NET Core API   │ ─────▶ │  Altinn-plattformen      │
│  (Vite + TS)    │  /api  │  (proxy + caching)  │  HTTPS │  platform.altinn.no      │
└─────────────────┘        └─────────────────────┘        │  platform.tt02.altinn.no │
                                    │                     └──────────────────────────┘
                                    │                                  ▲
                                    │         ┌────────────────────────┘
                                    ▼         │
                           ┌──────────────────┴──┐
                           │  MCP-server (stdio) │
                           │  AltinnTools        │
                           └─────────────────────┘
```

Backenden gjør all kommunikasjon mot Altinn-API-ene serverside. Frontenden snakker kun med
vår egen `/api/v1/{environment}/...`-overflate. Et miljø (`tt02` eller `prod`) velges per
forespørsel og brukes til å slå opp riktig Altinn-basis-URL.

## Altinn-API-er som brukes

Applikasjonen konsumerer to hoved-API-familier fra Altinn-plattformen. Alle kall er
uautentiserte GET-kall mot offentlig tilgjengelige metadata-endepunkter.

### Resource Registry API

Base-sti: `/resourceregistry/api/v1/resource` (samt noen v2-endepunkter).
Kilde: [Altinn Resource Registry](https://docs.altinn.studio/authorization/what-do-you-get/resourceregistry/).

| Metode | Endepunkt                                    | Formål                                                                |
|--------|----------------------------------------------|-----------------------------------------------------------------------|
| GET    | `/resourcelist`                              | Hele katalogen av tjenester (Altinn 3-apper, Altinn 2, ressurser …).  |
| GET    | `/{id}`                                      | Én tjeneste med fulle metadata.                                       |
| GET    | `/search`                                    | Søk etter tjenester basert på id, tittel, beskrivelse, type, nøkkelord. |
| GET    | `/bysubject`                                 | Ressurser som er knyttet til et subjekt.                              |
| POST   | `/bysubjects`                                | Ressurser for et sett med subjekt-URN-er (strøm-pass-through).        |
| GET    | `/orgs`                                      | Registrerte tjenesteeiere (organisasjoner).                           |
| GET    | `/{id}/policy`                               | XACML-policy for en ressurs (XML, pass-through).                      |
| GET    | `/{id}/policy/subjects`                      | Subjekter (roller, tilgangspakker) som har tilgang.                   |
| GET    | `/{id}/policy/rules`                         | Policy-regler i JSON.                                                 |
| GET    | `v2/resource/{id}/policy/rights`             | Delegerbare rettigheter (handlinger) for en ressurs.                  |

XACML-policyen tolkes også serverside for å hente ut `minimum-authenticationlevel` og
`minimum-authenticationlevel-org`, som brukes i statistikk-fanen.

### Access Management Metadata API

Base-sti: `/accessmanagement/api/v1/meta`.
Kilde: Altinn Access Management (tilgangspakker og roller).

**Tilgangspakker (access packages):**

| Metode | Endepunkt                                              | Formål                                         |
|--------|--------------------------------------------------------|------------------------------------------------|
| GET    | `/info/accesspackages/search`                          | Søk etter tilgangspakker.                      |
| GET    | `/info/accesspackages/export`                          | Full eksport av grupper/områder/pakker.        |
| GET    | `/info/accesspackages/group`                           | Liste over områdegrupper.                      |
| GET    | `/info/accesspackages/group/{id}`                      | Én områdegruppe.                               |
| GET    | `/info/accesspackages/group/{id}/area`                 | Områder i en gruppe.                           |
| GET    | `/info/accesspackages/area/{id}`                       | Ett område.                                    |
| GET    | `/info/accesspackages/area/{id}/package`               | Pakker i et område.                            |
| GET    | `/info/accesspackages/{id}`                            | Én tilgangspakke.                              |
| GET    | `/info/accesspackages/urn/{urn}`                       | Oppslag på tilgangspakke via URN.              |
| GET    | `/info/accesspackages/{id}/resource`                   | Ressurser knyttet til en tilgangspakke.        |

**Roller:**

| Metode | Endepunkt                                              | Formål                                         |
|--------|--------------------------------------------------------|------------------------------------------------|
| GET    | `/info/roles`                                          | Alle roller.                                   |
| GET    | `/info/roles/{id}`                                     | Én rolle.                                      |
| GET    | `/info/roles/{role}/{variant}/package`                 | Pakker knyttet til rolle (navn).               |
| GET    | `/info/roles/{role}/{variant}/resource`                | Ressurser knyttet til rolle (navn).            |
| GET    | `/info/roles/id/{id}/{variant}/package`                | Pakker knyttet til rolle (id).                 |
| GET    | `/info/roles/id/{id}/{variant}/resource`               | Ressurser knyttet til rolle (id).              |

**Typer:**

| Metode | Endepunkt                              | Formål                                  |
|--------|----------------------------------------|-----------------------------------------|
| GET    | `/types/organization/subtypes`         | Under-typer for organisasjoner.         |

## Miljøer

Begge API-familiene konfigureres per miljø i [appsettings.json](src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server/appsettings.json):

| Nøkkel | Base-URL                          |
|--------|-----------------------------------|
| `tt02` | `https://platform.tt02.altinn.no` |
| `prod` | `https://platform.altinn.no`      |

Alle proxy-endepunkter har `{environment}` i stien, så frontenden kan veksle mellom test og
produksjon uten kodeendringer.

## Proxy-endepunkter i denne applikasjonen

Backenden eksponerer to kontrollere som speiler Altinn-API-ene over egne ruter:

- [ResourceRegistryController.cs](src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server/Controllers/ResourceRegistryController.cs)
  under `api/v1/{environment}/resource/...`
- [MetadataController.cs](src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server/Controllers/MetadataController.cs)
  under `api/v1/{environment}/meta/...`

I tillegg legger vi på noen ting som ikke finnes direkte hos Altinn:

- **Caching** av ressurs-lister og policy-er via [ResourceCacheService.cs](src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server/Services/ResourceCacheService.cs)
  og `IMemoryCache`.
- **Avledet sikkerhetsnivå** fra XACML-policy (`/{id}/policy/securitylevel`).
- **Bakgrunnsjobber** for autentiseringsnivå-statistikk på tvers av hele katalogen
  (`/statistics/authlevel/start` + `/statistics/authlevel/status`).
- **Nøkkelord-indeks** bygget opp fra ressurs-listen (`/keywords`, `/bykeyword/{keyword}`).

## MCP-server

Prosjektet inneholder også en [MCP-server](src/AltinnServiceCatalogue/AltinnServiceCatalogue.McpServer/)
(Model Context Protocol) som eksponerer Altinn-metadata som verktøy til AI-agenter. Den
kaller de samme Altinn-API-ene direkte (produksjonsmiljøet) og tilbyr bl.a.:

- `GetResource`, `SearchResources`, `GetResourceList`, `GetOrganizations`
- `GetResourceRights`, `GetResourcePolicySubjects`, `GetResourcePolicyRules`
- Tilgangspakke- og rolle-oppslag tilsvarende Metadata-API-ene over

Se [AltinnTools.cs](src/AltinnServiceCatalogue/AltinnServiceCatalogue.McpServer/AltinnTools.cs)
og [AltinnApiClient.cs](src/AltinnServiceCatalogue/AltinnServiceCatalogue.McpServer/AltinnApiClient.cs).

## Teknologi

- **Backend:** ASP.NET Core (.NET 10), C# 13, OpenAPI, SPA-proxy
- **Frontend:** React 19 + TypeScript 5.9 + Vite 7, Tailwind CSS 3.4, `@digdir/designsystemet-react`
- **Kontrakter:** `Altinn.Authorization.Api.Contracts` (delte DTO-er)
- **Deploy:** GitHub Actions → Azure Web App

## Kjøre lokalt

```bash
# Backend (ASP.NET Core)
dotnet run --project src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server

# Frontend (Vite dev server)
cd src/AltinnServiceCatalogue/altinnservicecatalogue.client
npm install
npm run dev
```

Dev-porter:

- Backend: `http://localhost:5016` / `https://localhost:7013`
- Frontend: `https://localhost:64497`

Vite proxyer `/api` til backend, som igjen proxyer mot Altinn.
