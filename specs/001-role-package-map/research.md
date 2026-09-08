# Research: Tilgangskart (issue #29)

**Date**: 2026-09-08. Research bygger på repoet og offisiell dokumentasjon.
Ingen produksjons- eller TT02-data er hentet under planleggingen.

## 1. Hent valgt kontekst ved behov

**Decision**: Ny additiv `GET .../roles/{id}/package-map?variant=person`.
Returner støttede kontekster fra `person` + organisasjonsundertypene, og bare
valgt konteksts pakker. Kontekstlisten beskriver mulige valg, ikke bekreftede
pakketildelinger i hver kontekst.

**Evidence**: `Server/Services/MetadataClient.cs` har separate metoder for rolle,
organisasjonsundertyper og pakker etter rolle-id/variant. Dagens
`GetRolePackagesByVariantAsync` undersøker alle organisasjonsformer, filtrerer
bort tomme svar og erstatter HTTP-feil med tomme lister. `RolePage.tsx` bruker
metoden bare når `person` gir null pakker.
Alle kildekodestier her er relativt til `src/AltinnServiceCatalogue/`.

**Rationale**: Velgeren trenger ikke en full skanning. Alternativ kontekst er
alltid tilgjengelig når katalogen er lastet, også ved pakker i `person`.
Vi kan holde API-belastning og responstid uavhengig av antall kontekster.

**Alternatives considered**: Gjenbruke dagens `byvariant` (mister feil/empties);
full rolle × variant-skanning (unødvendig arbeid); kalle Altinn fra nettleseren
(bryter proxygrensen). Ingen av disse velges.

**Coverage boundary**: Koden beviser tilgang til organisasjonsundertyper og den
eksisterende personstandarden, ikke alle mulige typer i Altinn. Kontrakten
angir derfor `person-and-organization-subtypes`; andre typer krever eget omfang.

## 2. Streng lesing og eksplisitt feilmodell

**Decision**: Ny map-metode får egne strenge lesesteg for de relevante oppslagene.
Et JSON-array er nødvendig for lister; `null`, feil form eller ugyldige
identiteter er datakildefeil. Gjenbruk URL-bygging og delte DTO-er der mulig,
men ikke eksisterende `ReadFromJsonAsync<...>() ?? []` som bevis for tomt resultat.
En separat additiv `info/roles/map-options`-rute gir også rollevalget streng listevalidering uten å endre eldre klienters feilsemantikk. Status-envelope ligger i `Server/Models`, med RoleDto og PackageDto fra delte
kontrakter. Eksisterende metodekontrakter beholdes.

**Rationale**: Feil må ikke se ut som at en rolle mangler tilgang. Fullt lastet
katalog som ikke inneholder varianten gir en eksplisitt ugyldig-kontekst-feil.
Mislykket kataloginnlasting gir derimot usikkerhet, ikke ugyldig valg.
Kun `person` kan undersøkes ved katalogfeil; andre valg får `unavailable`.

**Alternatives considered**: Endre alle eksisterende endepunkters feilsemantikk
(for stort regresjonsomfang); droppe ugyldige elementer lydløst (feil totaler).
Avvis et malformed array samlet, men bevar separat vellykket katalog/rolle.

## 3. Cache og avbrytelse

**Decision**: Cache bare vellykkede, validerte komponentoppslag i 30 minutter:
rolle, organisasjonskatalog og pakker for valgt rolle/variant. Monter envelope
etterpå, uten å cache `partial`/`failed`. Bruk eksisterende
`Server/Services/MemoryCacheExtensions.cs` og miljøavhengige nøkler.

**Evidence**: `GetOrCreateCoalescedAsync` låser per nøkkel, slipper låsen i finally,
overfører kallers CancellationToken og cacher hver ikke-null returverdi.
Unntak fra strenge lesesteg gjør at mislykkede resultater ikke lagres.

**Rationale**: Prøv igjen kan hente mislykkede deler på nytt uten å skanne alt.
Rolle og katalog kan hentes parallelt; valgt pakkeoppslag starter etter validering.
Maksimalt to samtidige upstream-kall per map-forespørsel, med sammenslåing av
like cache-nøkler. Ingen ny all-variant-arbeider eller bakgrunnsjobb.

**Alternatives considered**: Cache hele svaret (gjør feil langvarige); deaktivere
all cache (unødvendig last); automatisk fallback mellom miljøer (feil data).

## 4. Selvstendig side, delt navigasjon

**Decision**: `/access-map` får egen AccessMapPage. Trekk kataloglenkene ut i
CatalogueNavigation og bruk denne på HomePage og kartet. Ikke trekk inn
HomePages innlasting av ressurser, etater, nøkkelord og statistikk i kartet.

**Evidence**: `altinnservicecatalogue.client/src/App.tsx` ruter katalogseksjoner
til HomePage. HomePage har TAB_PATHS/TAB_ROUTES og flere ubetingede dataeffekter.
`components/Layout.tsx` har HOME_PATHS som styrer sidebredde og må inkludere kartet.

**Alternatives considered**: Ny tab med hele kartlogikken i HomePage (unødvendig
kobling); duplisert navigasjon (to lister å holde synkronisert).

## 5. Visuelt tre med tilgjengelig innhold

**Decision**: HTML-lister, navngitte lenker og disclosure-knapper. CSS lager
forbindelser og kort-layout; dekorative linjer har ingen egen interaksjon.
Ingen `role=tree` eller fri canvas. Skjermleser og visuell visning bruker samme
innhold og rekkefølge. Desktop får markert rot og områdegrener; mobil stabler dem.

**Rationale**: Kartet er primært navigasjon til detaljer med åpne/lukkede grupper.
[W3Cs disclosure-eksempel](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)
viser tilgjengelige lenker med utvidbare grupper og understreker at mer komplekse
ARIA-mønstre krever tilsvarende tastaturatferd. Dette støtter valget av enkle
semantiske kontroller; den konkrete trekomposisjonen er vårt designvalg.

**Alternatives considered**: React Flow/grafmotor (zoom/panorering og diagramredigering
inngår ikke); ARIA treeview (mer tastaturkode uten tilsvarende produktbehov);
kun flat liste (formidler ikke forbindelsene visuelt).

## 6. Navigasjon, miljø og språk

**Decision**: Rolle, variant, pakkesøk og åpne områder lagres i kartets URL.
Miljø følger `EnvProvider`; ingen konkurrerende global miljøverdi i URL.
Ved miljøbytte nullstilles resultatdata straks, valg valideres på nytt og
foregående respons avvises ved hjelp av både abort og forespørselsnøkkel.

**Evidence**: `env.tsx` lagrer miljø i localStorage og bruker TT02 når ingen
lagret prod-verdi finnes. Dette er webatferd, ikke MCP-standarden. `helpers.tsx`
har `packagePath`, `fetchPackageLookupBilingual` og lokaliseringshelpers.
Detaljsidene kan motta objekter via location.state, men knytter ikke disse til
miljø på en trygg måte for alle bytter.

**Decision**: Bruk `packagePath(pkg)` og `/role/{id}` uten å sende `pkg`/`role`
fra kartet som detaljdata i router state. Bevar miljø i provider og la detaljer
hente egne data. Kartet må kunne fungere uten eksportoversettelser; enrichment
kan aldri legge til eller fjerne pakkekoblinger. Manglende engelsk gir kildenavn.

**Alternatives considered**: Kun komponenttilstand (mistes på unmount);
full kartkopi i localStorage (unødig vedvarende/utdatert tilstand);
endre global miljøstandard (utenfor omfang).

## 7. Målrettet testoppsett

**Decision**: Et faktisk .NET-testprosjekt for streng parsing, cache og
HTTP-kontrakt, pluss Playwright-flyter for kartet. Ingen separat frontend
unit-testplattform kreves i denne leveransen.

**Evidence**: `.github/workflows/ci.yml` bygger solution og frontend, men kjører
ikke disse testene. Ingen testprosjekter eller `npm test` er etablert i repoet.
[Microsofts integrasjonstestveiledning](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests?view=aspnetcore-10.0)
beskriver WebApplicationFactory og er grunnlaget for testhost-valget.
[Playwrights nettverksmocking](https://playwright.dev/docs/mock) lar nettlesertester
bruke kontrollerte svar og forsinkelser; slik kan tomt/feil/race testes stabilt.

**Rationale**: Nye statuser og miljøisolasjon trenger reelle regresjonsprøver.
Testriggen bruker falske upstream-svar og ingen levende Altinn-data. Manuell
skjermleserprøve og fempersoners brukerprøve dokumenteres separat.

**Alternatives considered**: Bare bygg/lint (beviser ikke rett data); live-API som
akseptansegrunnlag (ustabile data og feil vanskelig å gjenskape); flere overlappende
testverktøy (unødvendig oppsett).

## Research outcome

Alle tekniske valg som er nødvendige for data- og interaksjonskontraktene er tatt.
Neste fase kan lage oppgaver uten åpne avklaringsmarkører. Live dataverifisering
og brukertest er senere validering, ikke påstått gjennomført research.
