# Handling og ressurs i samme AllOf

Statistikk-siden har en kontroll for mønsteret fra gamle appmaler som ble meldt i
CAS-116576-G5S0W2. Kontrollen er del av den eksisterende policy-skanningen og er
tilgjengelig både i `GET /api/v1/{environment}/resource/policy/statistics` og
MCP-verktøyet `get_policy_statistics`.

## Hva som undersøkes

Skanneren leser rå XACML 3.0-policyer. Et treff krever at samme `AllOf` under et
policy- eller regel-`Target` har både en ressurskategori og handlingens
`action-id` i handlingskategorien. Den bruker kategorien, ikke bare attributtnavnet:
`urn:altinn:org` kan også være et subjektattributt.

Alle ressurstyper og algoritmer undersøkes. Kontrollen er ikke begrenset til
`delete`, `ruleid:3` eller policyer med en ikke-standard algoritme. Andre former
for blanding, for eksempel kategorier i forskjellige `AllOf`, omfattes ikke.
Dette er en kontroll av et kjent kompatibilitetsproblem ved oppdeling i
rettigheter/regler, ikke en generell XACML-validator eller en bekreftelse av HTTP 500.

Responsen har `mixedTargetPoliciesChecked`, `mixedTargetResourceCount` og en
ubegrenset `mixedTargetResources`-liste. Hvert treff inneholder tjenesteeier,
tjeneste, regel-ID (null for policyens eget Target), handlinger, ressursattributter
og posisjoner for AnyOf/AllOf, nummerert fra 1. Nettsiden grupperer etter eier.

Funn registreres før ABAC-tolkingen og beholdes ved senere tolkefeil. Policyer
som ikke kan hentes eller leses som XACML-policy-XML er ikke kontrollert. De
eksisterende tallene for hentefeil, tolkefeil og 404 rapporteres fortsatt.
Skanningen beholder maks åtte parallelle forespørsler og 30 minutters cache.

## Verifisert eksempel og oppfølging

Den 22. oktober 2026 kunne
[Brregs policy](https://platform.altinn.no/resourceregistry/api/v1/resource/app_brg_anonym-oppstartsveilederen/policy)
hentes, mens `/policy/rights` svarte HTTP 500. Testfixturen er et øyeblikksbilde av
den offentlige policyen. Kontrollen finner ett treff: `urn:altinn:example:ruleid:3`,
AnyOf 2 / AllOf 1, med `delete`, `urn:altinn:org` og `urn:altinn:app`.

For dette gamle malmønsteret må tjenesteeier flytte handlingens Match til en egen
AnyOf/AllOf under samme Target. Tilsiktet tilgang og uthenting av rettigheter må
verifiseres etter rettingen. Skanneren endrer ingen policyer. Testene kontrollerer
at denne oppdelingen fjerner treffet og at andre regler i eksemplet ikke flagges.

Start/koble til MCP-serveren på nytt etter oppdatering for å få de nye feltene.
