# GitHub Spec Kit

Dette repoet bruker [GitHub Spec Kit](https://github.com/github/spec-kit) **1.0.4**
med Codex-integrasjon og PowerShell-skript. Bruk arbeidsflyten for neste avgrensede
endring; eksisterende kode er kontekst for spesifikasjonen.

## Bruke oppsettet i Codex

Åpne en ny Codex-oppgave i repoet for å laste de nye ferdighetene fra
`.agents/skills/speckit-*/`. Skriv kommandoene i samtalen med Codex, ikke i terminalen.

1. `$speckit-specify Beskriv funksjonen du vil lage og hva brukeren skal oppnå.`
2. `$speckit-clarify` avklarer uklarheter i spesifikasjonen.
3. `$speckit-plan` lager teknisk plan med utgangspunkt i eksisterende arkitektur.
4. `$speckit-tasks` deler planen i gjennomførbare oppgaver.
5. `$speckit-analyze` sjekker sammenheng mellom spesifikasjon, plan og oppgaver.
6. `$speckit-implement` gjennomfører oppgavene.
7. `$speckit-converge` finner eventuelle gjenstående avvik mellom kode og artefakter.

Eksempel på første kommando:

```text
$speckit-specify Legg til CSV-eksport av tjenestene som vises etter filtrering.
Bevar eksisterende filtre, miljøvalg og JSON-responser fra API-et.
```

Prosjektprinsippene står i [constitution.md](../.specify/memory/constitution.md).
Bruk `$speckit-constitution` når de trenger en begrunnet oppdatering.
`AGENTS.md` inneholder fortsatt prosjektets operative instruksjoner.

## Filer og Git

- `.specify/`: delte maler, PowerShell-skript og prosjektprinsipper.
- `.agents/skills/speckit-*/`: ferdighetene som Codex bruker.
- `specs/<nummer>-<navn>/`: spesifikasjon, plan, oppgaver og andre feature-artefakter
  som opprettes når en ny endring spesifiseres.
- `.specify/feature.json`: lokalt valg av aktiv feature; ignoreres av Git.
- `.venv-speckit/`: lokalt Python-miljø for CLI-verktøyet; ignoreres av Git.

Del oppsettfiler og relevante feature-artefakter sammen med kodeendringene i Git.
Git-utvidelsen er ikke aktivert. Vanlig branching og review kan fortsette som før;
bruk repoets `codex/`-prefiks ved opprettelse av nye agentgrener.

## CLI på denne maskinen

Kjør fra reporoten i PowerShell. Aktivering av Python-miljøet er ikke nødvendig:

```powershell
.\.venv-speckit\Scripts\specify.exe version
.\.venv-speckit\Scripts\specify.exe integration status --json
```

## Gjenskape CLI-installasjonen

Krever Git og Python 3.11 eller nyere. `python` må peke på en faktisk installasjon.
Oppsettfiler og ferdigheter følger repoet; en ny klone trenger ikke initialiseres på nytt.

```powershell
python -m venv .venv-speckit
.\.venv-speckit\Scripts\python.exe -m pip install "specify-cli @ git+https://github.com/github/spec-kit.git@v1.0.4"
.\.venv-speckit\Scripts\specify.exe version
.\.venv-speckit\Scripts\specify.exe integration status --json
```

For referanse ble repoets oppsettfiler generert med:

```powershell
.\.venv-speckit\Scripts\specify.exe init --here --force --non-interactive --integration codex --script ps --ignore-agent-tools
```

`--ignore-agent-tools` lar initialisering kjøre fra Codex-appen uten en separat
Codex CLI på PATH. `--force` kan overskrive administrerte filer; ved oppgradering,
les [oppgraderingsveiledningen](https://github.github.com/spec-kit/upgrade.html),
sjekk lokale endringer og gjennomgå diffen etterpå.

## Verifisering av fremtidige kodeendringer

Velg sjekker som dekker endringen. Frontenden har `npm run lint` og `npm run build`
i `src/AltinnServiceCatalogue/altinnservicecatalogue.client/`.
Backendens eksisterende CI bruker `dotnet restore`, `dotnet build --configuration Release`
og `dotnet test --no-build` mot serverprosjektet. Repoet har per oppsettstidspunktet
ingen egne testprosjekter; en vellykket `dotnet test` er derfor ikke i seg selv bevis
på funksjonell testdekning. Bygg også MCP-/PolicyStatistics-prosjektene ved relevante
endringer, og dokumenter målrettet funksjonell verifisering.

Kilder: [installasjon](https://github.github.com/spec-kit/installation.html),
[eksisterende prosjekter](https://github.github.com/spec-kit/guides/existing-projects.html),
[integrasjoner](https://github.github.com/spec-kit/reference/integrations.html).

## Referanseforsøk

[Forsøk 01: Tilgangskart](../specs/001-role-package-map/README.md) samler den første
gjennomføringen i repoet, med krav, plan, analysefunn, kode, testresultater og
gjenstående manuell akseptanse. Issue #29 og under-issuene #30–#35 følger arbeidet.
