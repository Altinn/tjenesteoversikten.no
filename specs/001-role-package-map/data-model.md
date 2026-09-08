# Data model: Tilgangskart

Alle transportnavn følger camelCase. Dette er design, ikke genererte DTO-er.
Se [HTTP-kontrakten](contracts/role-package-map-api.md) for wire-eksempler.

## Gjenbrukte domeneentiteter

| Entitet | Identitet/felt som kartet bruker | Regler |
| --- | --- | --- |
| Rolle / RoleDto | id (GUID), name, code, urn, description | GUID må være gyldig og ikke tom. Navn faller tilbake til code, urn, id. |
| Pakke / PackageDto | id (GUID), urn, name, description, area | Dedupliser på id, aldri navn. Lik URN med ulike id-er slås ikke automatisk sammen. |
| Område / AreaDto | id, name, nameEn etter enrichment | Grupper på id; manglende/ugyldig område gir syntetisk `ungrouped`. |
| Organisasjonsundertype / SubTypeDto | name, description | name blir variantkode; tom kode gjør katalogsvaret ugyldig. |

Delte DTO-er endres ikke. Nye transportstatuser legges i serverens egen modell
og speiles i klientens `types.ts`. Manglende navn/beskrivelse er tillatt;
manglende rolle-/pakkeidentitet eller null-listeelement er kildefeil.

Ved gjentatt samme pakke-id med motstridende områdemetadata velges første gyldige
oppføring deterministisk og avviket logges; én pakke telles én gang. Kildens
rekkefølge beholdes ved deduplisering før lokaliseringsbasert visningssortering.
Metadata fra eksport brukes bare til tekster/områdeberiking, aldri til å opprette
nye rollekoblinger eller endre identiteten.

## RoleContext

- `code`: `person` eller en kode fra organisasjonsundertypene; trimmet, 1–128 tegn og uten kontrolltegn. En kode som ikke oppfyller kravene gir katalogfeil.
- `description`: valgfri kildetekst; UI har oversatt navn på personstandarden.
- `kind`: `person` eller `organization`.
- Identitet: miljø + normalisert kode (trim, sammenligning uten skille på store/små
  bokstaver). Upstream-kall bruker katalogens kanoniske kode.
- Dedupliser koder; `person` finnes nøyaktig én gang og står først.
- Katalogmedlemskap betyr at konteksten kan undersøkes, ikke at rollen gir pakker der.

## RolePackageMapDto

| Felt | Type | Betydning |
| --- | --- | --- |
| environment | `prod` eller `tt02` | Oppløst miljø |
| role | RoleDto | Bekreftet eksisterende rolle |
| selectedVariant | string | Kanonisk kode når validert, ellers sanitert forespurt kode |
| status | `complete`, `partial`, `failed` | Samlet lastestatus, ikke tilgangsvurdering |
| contextDiscovery | objekt | source, status, items, errorCode |
| selection | objekt | status, packages, packageCount, errorCode |

`contextDiscovery.source` er alltid `person-and-organization-subtypes`.
`status` er `complete` eller `failed`. `items` er en liste som alltid inneholder
person; ved failed er dette bare et kjent reservevalg, ikke en komplett katalog.
`errorCode` er null ved suksess, ellers en kode definert i API-kontrakten.

`selection.status` er `complete`, `failed` eller `unavailable`.
`packages` og `packageCount` er bare ikke-null ved complete; gyldig tomt svar er
`packages: []`, `packageCount: 0`. `unavailable` betyr at valgt ikke-person-kontekst
ikke kunne valideres fordi kataloginnlasting feilet. Dette er ikke et ugyldig valg.

Samlet status beregnes:

| Katalog | Pakker | Samlet status |
| --- | --- | --- |
| complete | complete | complete |
| complete | failed | partial |
| failed | complete (person) | partial |
| failed | failed eller unavailable | failed |

Rolleobjektet beholdes også ved failed, slik at rollen kan åpnes og innlasting
prøves igjen. Verdier gjelder kun responsens miljø/rolle/variant.

## Avledet visningsmodell

- `AreaBranch`: nøkkel, lokalisert navn, pakkeliste, totalt antall og treffantall.
- `PackageLeaf`: pakke-id, lokalisert fullt navn, tilgjengelig sekundær identifikator,
  beskrivelse og `packagePath(pkg)`.
- `visiblePackages`: filtre på valgt språks pakkenavn med dokumentert fallback,
  ikke på rollekode eller pakke-id. Søk er trimmet og uten skille på store/små bokstaver.
- Sorter område- og pakkenavn med valgt språk; bruk id som stabil tie-breaker.
- `complete` data + ingen pakker gir bekreftet tomtilstand. `partial` data med
  pakker vises som kjente koblinger med ufullstendighetsmelding; tall merkes
  foreløpige. `partial` med null pakker blir aldri en ubetinget «ingen pakker».
- Filtrering påvirker synlig treffantall, ikke totalen for valgt kontekst.

## AccessMapViewState

URL-kodede felt: `role`, `variant`, `q`, `open` (gjentatt områdenøkkel), `expanded`.
`expanded=custom` skiller et bevisst helt lukket tre fra første visning uten
lagrede åpningsvalg. Uten custom åpnes alle områder ved første visning.

Miljø kommer fra EnvProvider og inngår i alle datanøkler. Rollesøk er lokal
kontrolltilstand; FR-007 gjelder pakkesøk, ikke søket som fant rollen.
Et lokalt cache-resultat må alltid være knyttet til `(env, roleId, variant)`.

| Hendelse | Tilstandsovergang |
| --- | --- |
| Første besøk uten role | Last rollevalg; ingen automatisk valgt rolle |
| Velg rolle | Erstatt URL atomisk: role, variant=person; tøm q/open/expanded |
| Velg variant | Behold role, oppdater variant; tøm q/open/expanded |
| Pakkesøk | Oppdater q med replace; vis treffområder åpne uten å endre manuelt open-valg |
| Utvid/skjul område | Oppdater open + expanded=custom med replace |
| Åpne detalj | Vanlig lenkenavigasjon legger til historikkoppføring |
| Tilbake | Samme miljø: gjenopprett kart-URL. Endret accessMapEnv-markør: tøm q/open/expanded og valider i gjeldende EnvProvider-miljø |
| Miljøbytte | Avbryt/avvis gamle svar umiddelbart, nullstill pakkesøk/åpningsvalg og valider role/variant på nytt |
| Rollen mangler i ny komplett rolleliste, eller package-map gir bekreftet role_not_found | Fjern role, vis beskjed og rollevalg |
| Varianten mangler i ny komplett katalog | Behold role, velg eksplisitt person med beskjed og ny forespørsel |
| Katalogfeil | Behold forespurt variant som uavklart; vis retry, ikke ugyldig-valg-melding |

Transporttilstand: `idle → loading → complete | partial | failed`.
En respons må samsvare med både gjeldende nøkkel og request-sekvens før den blir
synlig. Rendering bruker nøkkelen som vern allerede før effekter kjører, slik
at gamle miljødata aldri vises ett mellomliggende bilde som aktuelle.
