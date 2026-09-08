# UI contract: Tilgangskart

## Inngang og navigasjon

- Ny rute `/access-map` under eksisterende Layout. Katalogens delte navigasjon
  får «Tilgangskart» / «Access map» ved siden av roller og pakker.
- Bruk NavLink/native lenker med aktiv side indikert gjennom aria-current.
  Bevar eksisterende kataloglenker, inkludert aliaset `/` for eiere.
- Egne datatilstander på AccessMapPage; ikke monter HomePage for å få navigasjonen.
- Forklaring: «Se hvilke tilgangspakker en rolle gir. Velg en rolle og en kontekst
  for å utforske sammenhengene.» Vis også at dette er katalogdata, ikke personlige
  rettigheter. Angi at en pakke kan gis av flere roller.

## Visuell retning

Et markert rollekort til venstre og en tydelig stamme med områdegrener mot høyre
på bred skjerm. Under hvert område ligger pakkene som egne, lett gjenkjennelige
løvkort. På smal skjerm stables rot, områder og løv i samme rekkefølge med en
vertikal forbindelseslinje. Normal dokumentflyt og innpakning av tekst hindrer
at posisjonerte noder kolliderer når navn blir lange.

```text
                  ┌─ Område A (3) ─┬─ Pakke A
Rolle (lenke) ─────┤                ├─ Pakke B
                  │                └─ Pakke C
                  └─ Område B (2) ─── [utvid]
```

Dette er en prinsippskisse; detaljert avstand/typografi tilpasses eksisterende
`--t-*`-tokens og Designsystemet. Rollekortet skal være visuelt tyngre enn
pakkelevene. Bruk tekstetiketter «Rolle», «Område» og «Tilgangspakke» slik at
betydningen ikke avhenger av farge eller plassering alene. En kort forklaring
angir at områdene grupperer pakker og ikke er ekstra tilgangsvilkår.

- Diskret fokus/hover og eventuell kort inn-/utvidelsesovergang; følg
  prefers-reduced-motion. Ingen nødvendig informasjon formidles bare i animasjon.
- Ingen dra-bevegelse, fri zoom, panorering, absolute nodekoordinater eller grafmotor.
- Et stort tre kan scrolle vertikalt. Hele siden skal kunne brukes ved 360 px uten
  at hovedkontroller eller navn krever horisontal scrolling.
- Fullt pakkenavn skal være synlig med linjebryting, ikke bare via tooltip.
  Dupliserte navn får synlig sekundær URN/id så brukeren kan skille dem.

## Kontroller

1. Navngitt tekstfelt «Finn rolle» filtrerer rollevalg på navn eller kode.
   Bruk filtrert native select eller native radioliste, ikke en egen combobox.
   Lås første implementering til tekstfelt + native select med «Velg rolle» som
   tomvalg; antall treff/status vises som tekst. Ingen automatisk rolle ved start.
2. Navngitt kontekstselect viser person og alle innlastede organisasjonsvarianter.
   Vis beskrivelse + kode der begge finnes. Et valg betyr «undersøk denne
   konteksten», ikke at rollen allerede er kjent å gi pakker der.
3. Navngitt pakkesøk søker i lokalisert navn for valgt rolle/kontekst. Rot og
   relevante områdegrener beholdes. Vis «N treff av M pakker» ved komplett data.
4. Hvert område har en egen button med aria-expanded og aria-controls som
   viser/skjuler gruppens liste. Dette er ikke en navigasjonslenke.
5. Rollenavnet er en vanlig lenke til `/role/{id}`. Pakkelenker bruker eksisterende
   `packagePath(pkg)` (URN-slug når tilgjengelig, ellers GUID).

## Semantikk og tilgjengelighet

- En navngitt section for kartet, overskrift for rollen og nestede lister for
  områdene og pakkene. Det visuelle treet krever ikke ARIA treeview-rollen.
- Normale lenker og knapper gir Tab/Shift+Tab, Enter og Space der det er naturlig.
  Ingen hjemmelaget piltastmodell. Synlig fokus på alle kontroller.
- Dekorative linjer er CSS eller aria-hidden; de erstatter ikke semantisk relasjon.
- Kort statusfelt med aria-live=polite annonserer lasting og resultattall uten å
  lese opp hele treet på hvert tastetrykk. Feilmelding gir synlig «Prøv igjen».
- Grupper som er lukket har ikke skjulte, fokuserbare lenker i tabrekkefølgen.
- Berøring bruker de samme kontrollene. Verifiser med faktisk skjermleser i
  tillegg til nettleserens semantiske tester.

## URL og tilbakeknapp

Eksempel på intern adresse (syntetisk identitet):

`/access-map?role=11111111-1111-4111-8111-111111111111&variant=person&q=rapport&expanded=custom&open=area-a`

| Parameter | Default/regel |
| --- | --- |
| role | Ingen. Ugyldig GUID viser forklaring og rollevalg uten map-kall. |
| variant | person når en rolle velges eller parameteren mangler |
| q | Tomt pakkesøk |
| expanded | Mangler: førstegangsvalg, alle områder åpne. custom: bruk open-listen. |
| open | Gjentatte område-id-er eller ungrouped; ingen open sammen med custom betyr alle lukket |

Ukjente parametere ignoreres. Fjern ugyldige åpningsnøkler etter at data er validert.
Utvidelse, søk og rolle-/kontekstvalg oppdaterer samme kartoppføring med én atomisk
query-oppdatering (`replace: true`). Ikke kall flere konkurrerende query-oppdateringer
for én handling. En detaljlenke legger til historikk slik at Back kommer tilbake
til kartoppføringen som inneholder siste valg.

Under aktivt pakkesøk åpnes treffområdene som en avledet visningsregel. Bevar
manuelle open-verdier, slik at de brukes igjen når søket tømmes. Rolle- og
kontekstbytte tømmer pakkesøk og åpne grupper; ny førstevisning åpner områdene.

Pass ingen `pkg` eller `role`-seedobjekter i location.state fra kartet. Detaljsidene
skal hente egne data i gjeldende miljø. Dette unngår at kartet introduserer
utdaterte metadata ved senere miljøbytte.

## Lasting, feil og miljø

- Last rollevalg fra den strenge map-options-ruten. Ugyldig respons eller HTTP-feil
  er feilstatus, ikke «ingen roller». Rollelisten har også miljønøkkelvern.
- Data/render-nøkkel: miljø + rolle + variant. En respons med annen nøkkel vises
  aldri som gjeldende, selv før oppryddingseffekten har kjørt.
- AbortController + monoton request-sekvens beskytter mot sene svar. Bruk samme
  vern for valgfri eksportberiking. Eventuell ny optional AbortSignal i helpers
  må beholde gamle kall kompatible.
- Ved miljøbytte behold role/variant midlertidig for ny validering, men fjern
  pakkesøk/åpningsvalg og gamle resultater straks. Manglende rolle gir rollevalg
  med beskjed; kjent ugyldig variant gir person med beskjed. Mislykket katalog
  gir retry og uavklart valg, ikke automatisk erklæring om ugyldig variant.
- Ingen miljøparameter overstyrer EnvProvider. Når en gammel kartadresse åpnes,
  brukes nåværende miljø og identiteter valideres der. Standard webmiljø endres ikke.
- Complete + []: «Ingen tilgangspakker i valgt kontekst».
- Complete + søk uten treff: «Ingen pakker matcher søket», med tøm-handling.
- Partial + kjente pakker: vis koblingene og «Foreløpig: N kjente pakker» med
  forklaring på hvilken datadel som feilet. Ikke presenter dette som komplett.
- Pakker failed/unavailable: ingen tall eller pakker fra foregående valg. Roten
  kan fortsatt åpnes, og rolle/kontekst kan endres eller hentes på nytt.
- En valgfri oversettelsesfeil bruker kildenavn og er ikke en manglende rollekobling.

## Språk og tema

Nye kontroller, forklaringer og feilmeldinger bruker `accessMap.*` i lang.tsx.
Gjenbruk helpers for lokalisert pakke-/områdenavn og bilingual lookup. Ikke filtrer
ut en pakke fordi oversettelse eller eksportmetadata mangler. Rollen bruker
kildenavn (dagens RoleDto har ikke flerspråklige navnefelt).

Hold gruppers identitet stabil hvis eksportberiking kommer sent; eksisterende
områdedata i map-responsen styrer gruppering. Der grunnlaget mangler område,
behold «Uten område» for den aktive visningen fremfor å flytte blader og miste
åpningsvalg mens brukeren navigerer. En ny eksplisitt lasting kan gi oppdatert område.

Implementeringspresisering: location.state.accessMapEnv er en ren historikkmarkør.
Den endrer aldri valgt miljø. Ved tilbakekomst sammenlignes markøren med EnvProvider:
likt miljø gjenoppretter alle valg; ulikt miljø tømmer pakkesøk/åpningsvalg før visning.
Bekreftet 404 role_not_found fjerner rollen også om rollelistecachen inneholder den.