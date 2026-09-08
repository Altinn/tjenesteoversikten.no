# Quickstart og verifisering: Tilgangskart

Denne guiden beskriver den implementerte funksjonen. Se validation.md for faktiske resultater.
Se [API-kontrakten](contracts/role-package-map-api.md),
[UI-kontrakten](contracts/access-map-ui.md) og [datamodellen](data-model.md).

## Forutsetninger

- .NET SDK 10, Node.js som støttes av Vite 7 (bruk Node 22.12+), npm og Git.
- Installer repoets låste avhengigheter med kommandoene nedenfor.
- Kjør PowerShell-eksemplene fra reporoten med mindre annet er angitt.
- Automatiske tester skal bruke syntetiske data. De skal ikke sende kall til
  verken PROD eller TT02. Nettleserfixtures må avvise uventede `/api`-kall og
  mocke eventuelle detaljside-/HomePage-avhengigheter som scenarioet åpner.

## Bygg og automatiske tester

```powershell
npm --prefix src/AltinnServiceCatalogue/altinnservicecatalogue.client ci
dotnet restore src/AltinnServiceCatalogue/AltinnServiceCatalogue.slnx
dotnet build src/AltinnServiceCatalogue/AltinnServiceCatalogue.slnx --configuration Release --no-restore
npm --prefix src/AltinnServiceCatalogue/altinnservicecatalogue.client run lint
npm --prefix src/AltinnServiceCatalogue/altinnservicecatalogue.client run build
dotnet test src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server.Tests/AltinnServiceCatalogue.Server.Tests.csproj --configuration Release --no-build
```

Fra frontendmappen:

```powershell
npx playwright install chromium
npx playwright test e2e/access-map.spec.ts --project=chromium
```

Planlagt Playwright-konfigurasjon starter Vite lokalt hvis en testserver ikke
kjører, bruker riktig lokal URL og aksepterer utviklingssertifikatet kun for
testsesjonen. Alle metadata-responser blir intercepted; ekte backend trengs ikke
for disse nettlesertestene. Testfeil skal gi trace/skjermbilde til CI-artefakter.
Backend-kontrakttestene bruker WebApplicationFactory med falsk Metadata HTTP-handler,
slik at rute, JSON-serialisering, statuser og cache kontrolleres gjennom faktisk serverkode.
Eksponer Program for testhost ved en minimal partial-deklarasjon dersom nødvendig.

I `.github/workflows/ci.yml`: bygg det nye testprosjektet via solution, kjør
dotnet test, lint og Playwright etter dependency/build-steg. På Ubuntu brukes
`npx playwright install --with-deps chromium`. CI må beholde eksisterende bygg og
artefakter; ingen endring av produksjonsdeploy er nødvendig.

## Lokal manuell gjennomgang

Backend, terminal 1:

```powershell
dotnet run --project src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server --launch-profile https
```

Frontend, terminal 2 hvis SPA-proxyen ikke allerede har startet den:

```powershell
npm --prefix src/AltinnServiceCatalogue/altinnservicecatalogue.client run dev
```

Åpne `https://localhost:64497/access-map`. Ved sertifikatfeil, fullfør normal lokal
utviklingssertifikat-oppsett før prøven; ingen TLS-omgåelse mot upstream.
Velg miljø eksplisitt i UI ved manuell datakontroll og noter hvilket miljø som
ble brukt. Standardvalg skal ikke endres av funksjonen. Ingen live-kontroll er
utført som del av denne planen.

## Kontrollert fixturegrunnlag

Implementeringen lager navngitte fixtures, ikke hardkodede produksjonsroller:

- Rolle A: person med 3 unike pakker, hvor én kommer to ganger i kildelisten;
  alternativ organisasjonskontekst med 2 andre pakker.
- Rolle B: deler én pakke-id med A; en annen pakke har samme navn som en A-pakke,
  men annen id. Navigasjon må skille identitet fra visningsnavn.
- Rolle C: gyldig rolle uten pakker i person, med pakker i en organisasjonskontekst.
- Rolle D: gyldig komplett tomt resultat i alle undersøkte kontekster.
- Stor rolle: 200 unike pakker i 20 områder, inkludert svært lange navn.
- Varianter av data med manglende område og oversettelser; en pakke med bare id
  som siste navnereserve og GUID-basert detaljlenke.
- Kontrollerte feil: null/204/malformed JSON/ugyldig id, feil rolle-id eller flere roller i et enkeltrolleoppslag, ugyldige subtypekoder, HTTP-feil, timeout,
  katalogfeil uavhengig av pakker, og svar som leveres i motsatt rekkefølge.

## Akseptansescenarioer og forventet resultat

| Scenario | Utførelse | Forventet resultat |
| --- | --- | --- |
| Inngang | Åpne fra katalog og direkte adresse | Egen aktiv seksjon; tomt rollevalg, resten av kataloglenkene fungerer |
| Rollevalg | Søk på deler av navn/kode, også store/små bokstaver | Treff eller tydelig ingen-treff; ingen automatisk rolle ved førstegangsbesøk |
| Rolle/kontekst | Velg A/person, deretter A/organisasjonskontekst | Alternativet er tilgjengelig selv med person-treff; bare riktig koblingssett vises |
| Identitet | Dedupliser A, bytt til B | Eksakte unike totaler; samme id gir samme detalj, like navn holdes adskilt |
| Tomt vs feil | Velg D, deretter null/feil-fixture | Bare vellykket tomt svar viser ingen pakker; feil gir retry og null count |
| Delvis | Feil i katalog + vellykket person, eller omvendt | Gyldige deler bevares, ufullstendighet oppgis og antall er ikke presentert som endelig |
| Uavklart variant | Katalogfeil med ikke-person valgt | unavailable og retry; ingen falsk invalid_variant eller bekreftet tomt |
| Ugyldige valg | Fjern rolle/variant fra komplett katalog ved miljøbytte | Beskjed og rollevalg/person etter UI-kontrakt |
| Søk/grupper | Finn pakke i lukket område; tøm søk | Treffområde åpnes; manuelle åpningsvalg gjenopprettes når søket tømmes |
| Navigasjon | Klikk rolle og pakke, Back etter hvert besøk | Riktig detalj og miljø; rolle, variant, q og open gjenopprettes, også alle-lukket |
| Raskt bytte | Forsink svar A/prod, gå til B/TT02, la A svare sist | Bare B/TT02 blir gjeldende, uten ett synlig mellomsteg med A-data |
| Cache/retry | Samtidige like kall; feil så suksess; bytt miljø | Ett fetch per identisk suksessnøkkel, ingen cachede feil, ingen blanding av miljøer |
| Avbrytelse | Avbryt map og cacheventer | Token forplantes, cachelås slippes, senere retry kan lykkes |
| Malformed lister | Lever null, feil form eller ugyldig pakkeidentitet | 502 eller eksplisitt failed datadel; aldri gyldig tom liste |
| Mobil/stort tre | 360/1440 px, 200 pakker / 20 områder | Alle noder kan finnes/åpnes, hele navn tilgjengelige, ingen uleselig overlapp |
| Tastatur/berøring | Gjennomfør alle kontroller og lenker | Synlig fokus, naturlig rekkefølge, ingen hover-/dra-avhengighet |
| Tema/språk | Bytt nb/en og lyst/mørkt | Lokalisert UI, lesbare forbindelser, sikker navnefallback |

## Målinger og manuelle bevis

- SC-003: Mål fra ferdig inntasting til oppdatert resultat med innlastede 200
  pakker. Krav: under ett sekund. Kontroller full navnetilgang og skjermbilder på
  360 og 1440 px i begge temaer; lagre resultatene med PR-verifiseringen.
- SC-005: Kjør en faktisk skjermleserprøve. Bekreft rolle, kontekst, område,
  pakkenavn, knappestatus og detaljlenker. Nettlesersemantikk alene er ikke bevis.
- SC-001: Fem representative førstegangsbrukere får samme oppgave fra forsiden.
  Mål tid uten veiledning og om de kan forklare retningen på koblingen. Minst
  fire må lykkes innen 60 sekunder. Manglende deltakere rapporteres som ikke
  gjennomført; ikke merk dette kriteriet bestått basert på antakelser.
- Noter kommandoer/resultater, fixtureversjon, viewport/språk/tema, feil og eventuelle
  gjenstående begrensninger i PR. En grønn build alene oppfyller ikke akseptansemålene.

## Faktisk testmiljø

Playwright starter en separat Vite på https://localhost:64498. Vanlig manuell
utvikling bruker fortsatt 64497. Windows-alternativ dersom Chromium-nedlasting
ikke er tilgjengelig: sett $env:PW_CHANNEL='msedge' og kjør samme Playwright-kommando.
Dette bruker installert Chromium-basert Edge; CI bruker standard Chromium.
Backendtester bruker kontrollert klokke for 30-minutters cache og falsk HTTP-handler.

Se validation.md for resultater og avgrensning: emulert berøring og browser-semantikk
beviser ikke at den faktiske skjermleser-/brukerprøven er gjennomført.