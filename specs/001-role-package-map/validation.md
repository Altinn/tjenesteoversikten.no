# Implementeringsvalidering – issue #29

Dato: 2026-09-08. Utført lokalt på Windows. Ingen utrulling eller PR er gjennomført.

## Resultater

| Kontroll | Resultat |
| --- | --- |
| dotnet build src/AltinnServiceCatalogue/AltinnServiceCatalogue.slnx --configuration Release --no-restore | Bestått; 0 feil, 154 advarsler fra eksisterende kontrakter/generatorer og avhengighetsskanning |
| dotnet test src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server.Tests --configuration Release --no-build | 36 bestått, 0 feil |
| npm run lint (frontend) | Bestått med eksplisitt baseline for 24 eksisterende feil |
| npm run build (frontend) | Bestått; eksisterende stor bundle-advarsel |
| PW_CHANNEL=msedge npx playwright test --project=chromium --workers=2 | 20 bestått, 0 feil |
| git diff --check | Ingen innholds-/whitespacefeil etter opprydding |
| Mobil/desktop visuelt | Testskjermbilder av 360/1440 px gjennomgått; rot, grener og navn lesbare |
| SC-003 | 200 pakker / 20 områder, begge bredder: ingen overlapp eller klippede navn; søk under 1000 ms i begge tester |
| Manuell skjermleser og fysisk berøring | Ikke gjennomført; T031/T036 åpne |
| Fem representative førstegangsbrukere | Ikke gjennomført; T040 åpen |

Nettlesertester bruker Chromium-baserte Microsoft Edge lokalt fordi nedlastingen
av Playwright Chromium fikk tidsavbrudd. CI er konfigurert for Playwright Chromium
på Ubuntu; den eksterne CI-jobben er ikke kjørt som del av denne lokale økten.
Test-Vite bruker port 64498, isolert fra vanlig utviklingsport 64497.

## Kravbevis

| Krav | Implementering / bevis |
| --- | --- |
| FR-001–002 | Selvstendig /access-map, delt CatalogueNavigation, direkte rute og rolle-/kodesøk. Nettlesertest åpner fra eksisterende forside. |
| FR-003–005 | RolePackageTree, groupPackages og serverens strenge identitetsvalidering/deduplisering. Delte/like navn, kontekstvalg og tomme roller dekkes av fixtures og API-tester. |
| FR-006–007 / SC-004 | Rollelenke, URN-slug/GUID-fallback, detaljbesøk og Back. q/open/custom beholdes i samme miljø. |
| FR-008–009 / SC-003 | Lokalisert filter, automatisk åpne treffområder med bevart manuell tilstand, tøm/bytt rolle/kontekst, null treff og 200/20-fikstur på 360/1440 px. |
| FR-010–011 / SC-006 | Statusmatrise, ugyldig/null/204/404-payload, retry, bortfalt rolle, ukjent variant, cacheutløp og avbrytelse. Klienttester for sene rolle-/miljøsvar og miljøbytte på detaljside. |
| FR-012–013 / SC-005 | Semantiske lister, native kontroller, skjulte lenker uten Tab-fokus, tastaturfokus, emulert berøring, språk/tema og visuell gjennomgang. Faktisk skjermleser er fortsatt uverifisert. |
| FR-014 | UI forklarer offentlige katalogkoblinger, områdegruppering og flere roller per pakke; ingen personlige rettigheter eller delegering. |
| SC-001 | Krever fem mennesker; ikke utledet fra automatiserte tester. |
| SC-002 | Strenge backendtester av korrekte koblinger/count/status samt kontrollerte klientfixtures. Ingen levende Altinn-data brukes. |

## Testgrunnlag og begrensninger

- Backend: WebApplicationFactory med falsk Metadata-handler som avviser ukjente
  upstream-kall. En kontrollert klokke verifiserer cache før og etter 30 minutter.
  Egne prøver verifiserer avbrytelse, retry og coalescing.
- Nettleser: alle /api-kall fanges opp; uventede kall avbrytes, eksterne
  font-/nettverkskall blokkeres. Testdata er syntetiske.
- API-testene ble først kjørt uten rutene (9 forventede feil), deretter grønne.
  Den første nettleseroppstarten feilet på nedlasting/fontnettverk; browser-testene
  ble videreutviklet sammen med implementeringen. Ikke alle browser-scenarioer
  fikk en separat observert rød kjøring før kode.
- Nye kartfiler har ingen lint-unntak. eslint-suppressions.json inneholder bare
  24 feil verifisert mot HEAD: eksisterende blandede React-eksporter og synkron
  setState i effekter. Det er en eksplisitt gjeldsbaseline, ikke rettede feil;
  full lint kjøres i CI med reglene fortsatt aktivert.
- Ingen nye produksjonsavhengigheter. Playwright er låst som devDependency.
- Løsningens avhengighetsskanning rapporterer eksisterende moderate humanfs-varsel;
  denne oppgaven endrer ikke den avhengigheten.

## Analyseavklaringer og konvergens

- Bekreftet 404 role_not_found nullstiller rollen selv om cachet rolleliste
  fortsatt inneholder den (U1).
- accessMapEnv i historikkoppføringen sammenlignes med EnvProvider; det er aldri
  en miljøoverstyring eller et metadata-seed. Endret miljø nullstiller q/open
  også etter et detaljbesøk (U2).
- Konvergens vurderte 14 FR, 6 SC, 20 akseptansescenarioer, 7 designbeslutninger
  og 5 konstitusjonsprinsipper. To partial-funn: miljøvalg på mobil (MEDIUM)
  og manuell akseptanse (HIGH). Ingen identifiserte konstitusjonsbrudd.
- T041: mobilens miljøvelger er implementert og browser-testet.
- T042: samlet manuell akseptanse venter på T031/T036/T040; prøvene utføres én gang.
- Ingen før-/etter-hooks: .specify/extensions.yml finnes ikke.

## Leveransestatus

38 av 42 oppgaver utført. T031, T036, T040 og T042 står åpne fordi de krever
menneskelig verifisering. Kode og dokumentasjon publiseres på grenen
codex/001-role-package-map for review; dette er ikke en utrulling.
GitHub-avkryssing betyr utført implementeringsarbeid, ikke produksjonssatt.

Samlet referanse og prosessbegrensninger står i [README.md](README.md).
Lokal validering ovenfor er et datert resultat; GitHub Actions-status følger PR-en.