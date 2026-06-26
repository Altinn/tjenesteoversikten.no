# Flytting til Altinn (`Altinn/tjenesteoversikten.no`)

Sjekkliste for å flytte applikasjonen fra `TheTechArch/altinnservicecatalogue` til et nytt repo i
Altinn-organisasjonen: **`Altinn/tjenesteoversikten.no`**, med **full git-historikk** (nytt repo,
ikke GitHub-transfer).

> Valgt metode: nytt repo + mirror-push av historikken. Konsekvens: git-historikk og alle brancher/tags
> følger med, men **issues, pull requests, stjerner og watchers følger _ikke_ med** (de er GitHub-metadata,
> ikke en del av git). Issue #2 (chatbot) må evt. gjenopprettes manuelt i det nye repoet.

## 1. Forberedelser i koden (gjort på branch `prep/move-to-altinn`)

- [x] Oppdatert hardkodet repo-URL i `AboutPage.tsx` → `https://github.com/Altinn/tjenesteoversikten.no/`.
- [x] Fjernet død, nestet workflow `src/AltinnServiceCatalogue/.github/workflows/ci.yml`
      (lå i en nestet `.github`-mappe som GitHub aldri kjører).
- [x] Lagt korrekt CI-workflow i repo-rot: `.github/workflows/ci.yml` (bygger .slnx + frontend, Node 20).
- [x] Parametrisert deploy-workflowen `.github/workflows/AltinnServiceCatalogue.yml`:
  - Azure-identifikatorer flyttet til generiske GitHub-variabler (se under).
  - Fikset arbeidssti: prosjektet ligger på `src/AltinnServiceCatalogue/AltinnServiceCatalogue.Server`
    (gammel verdi `AltinnServiceCatalogue.Server` var brutt etter at alt ble flyttet under `src/`).

Ting som **ikke** trenger endring (stier er relative):
- `.mcp.json` (peker på `src/AltinnServiceCatalogue/AltinnServiceCatalogue.McpServer`).
- Publish-profil `...PublishProfiles/tjenestekatalogen - Zip Deploy.pubxml.user` — men vurder å
  fjerne den / legge `*.pubxml.user` i `.gitignore` (inneholder personlige/Azure publiseringsinnstillinger;
  deploy bør uansett gå via OIDC-workflowen, ikke publish-profil).

## 2. Opprett nytt repo og push historikken

```bash
# 1) Opprett tomt repo i Altinn-orgen (uten README/lisens), f.eks. via:
gh repo create Altinn/tjenesteoversikten.no --private --confirm   # eller --public

# 2) Speil hele historikken fra det gamle repoet
git clone --mirror https://github.com/TheTechArch/altinnservicecatalogue.git
cd altinnservicecatalogue.git
git push --mirror https://github.com/Altinn/tjenesteoversikten.no.git
```

> Husk å merge/cherry-picke `prep/move-to-altinn` inn i `main` (her eller etter pushen) slик at
> kodeendringene over kommer med.

## 3. GitHub-konfigurasjon i Altinn-orgen

- [ ] **Actions Variables** (Settings → Secrets and variables → Actions → Variables):
  - `AZURE_WEBAPP_NAME` — navnet på Azure Web App i Altinns subscription
  - `AZURE_CLIENT_ID` — app registration (client) id med federated credential for dette repoet
  - `AZURE_TENANT_ID` — Azure AD tenant id
  - `AZURE_SUBSCRIPTION_ID` — subscription id
- [ ] Branch protection på `main`, CODEOWNERS, og evt. Altinns standard repo-policy/templates.
- [ ] Vurder GitHub Environments (f.eks. `production`) hvis Altinn bruker det for deploy-godkjenning.

## 4. Azure-konfigurasjon

- [ ] Opprett (eller gjenbruk) Azure Web App i Altinns subscription. Stack: .NET 10, Windows
      (deploy-workflowen kjører `windows-latest` og publiserer en self-contained/Server-publish).
- [ ] App registration med **federated credential** (OIDC) for det nye repoet. Subject:
  - `repo:Altinn/tjenesteoversikten.no:ref:refs/heads/main`
  - (+ evt. `repo:Altinn/tjenesteoversikten.no:environment:production` hvis Environments brukes)
- [ ] Gi app registrationen RBAC (Contributor/Website Contributor) på Web App-ressursen.
- [ ] App settings i Web App ved behov (prod/tt02 er allerede i `appsettings.json`; ingen hemmeligheter
      der i dag). Når chatboten (issue #2) kommer: legg `AzureOpenAI`-konfig her, helst via Key Vault /
      managed identity.

## 5. Verifisering

- [ ] CI-workflowen (`ci.yml`) kjører grønt på en PR.
- [ ] Deploy-workflowen logger inn med OIDC og deployer uten feil.
- [ ] Appen svarer, og «Om»-siden lenker til det nye repoet.

## 6. Avvikling av gammelt repo

- [ ] Oppdater eksterne lenker som peker på `TheTechArch/altinnservicecatalogue`.
- [ ] Arkiver (eller legg igjen en README med lenke til nytt repo) det gamle repoet.
- [ ] Gjenopprett issue #2 (chatbot) i nytt repo hvis det fortsatt er aktuelt.
