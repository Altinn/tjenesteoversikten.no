# Feature Specification: Tilgangskart for roller og tilgangspakker

**Feature Branch**: codex/001-role-package-map (opprettet ved publisering; planleggingen brukte eksisterende arbeidsgren).

**Feature Directory**: `specs/001-role-package-map`

**Created**: 2026-09-08

**Status**: Implementert for review; manuell akseptanse gjenstår. Se validation.md.

**Input**: User description: "Det er et ønske om en visning som visuelt viser viser hvilke roller som gir hvilke pakker. Kanskje visuelt som en tre visning eller noe? Og så kan man klikke på løvnodene for å komme til aktuell pakke, eller roten for rolle. En eller annen veldig kul og visuell måte å forstå sammenhengene. Kan gjerne legges til som egen seksjon på tjenesteoversikten"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Forstå pakkene en rolle gir (Priority: P1)

Som besøkende vil jeg åpne «Tilgangskart», velge en rolle og se forbindelsene til
rollens tilgangspakker, slik at jeg raskt forstår sammenhengen uten å lese flere
separate detaljsider. Rollen er en tydelig rot, pakkene er løv, og forbindelser
viser hva rollen gir. Områdegruppering gjør store trær lettere å lese.

**Why this priority**: Dette er funksjonens hovedverdi: gjøre en liste over koblinger forståelig som et visuelt bilde.

**Independent Test**: Åpne seksjonen og velg en rolle i et kjent datagrunnlag. Sammenlign treet og antallet pakker med forventede koblinger for valgt rollekontekst og miljø.

**Acceptance Scenarios**:

1. **Given** at jeg er på tjenesteoversikten, **When** jeg velger «Tilgangskart» i seksjonsnavigasjonen, **Then** får jeg en kort forklaring og et søkbart rollevalg, uten at jeg må kjenne en rolleidentifikator eller at en tilfeldig rolle velges for meg.
2. **Given** en rolle med kjente pakkekoblinger i valgt kontekst, **When** jeg velger rollen, **Then** vises rollen som rot, alle tilhørende unike pakker er tilgjengelige som løv, og antallet oppgis for den aktuelle konteksten.
3. **Given** en rolle med pakker i flere områder, **When** treet vises, **Then** er pakkene gruppert under navngitte områder, og det er forklart at områdene organiserer pakkene og ikke er ekstra roller eller tilgangsvilkår.
4. **Given** at en kobling avhenger av rollekontekst, for eksempel organisasjonsform, **When** jeg velger en annen tilgjengelig kontekst, **Then** vises bare koblingene som gjelder der, med konteksten tydelig angitt; dette valget er tilgjengelig også når standardkonteksten har pakker.
5. **Given** to roller som gir samme pakke, **When** jeg bytter mellom rollene i samme kontekst, **Then** kan samme pakke forekomme under begge og åpner samme pakkedetalj; visningen hevder ikke at pakken tilhører bare én rolle.
6. **Given** en rolle uten pakkekoblinger i valgt kontekst og vellykket innlasting, **When** rollen vises, **Then** beholdes rollen som rot med meldingen «Ingen tilgangspakker i valgt kontekst», og jeg kan velge en annen rolle eller kontekst.

---

### User Story 2 - Gå fra kart til detaljer og tilbake (Priority: P1)

Som besøkende vil jeg klikke på en pakke eller rollen i kartet for å lese mer,
og deretter komme tilbake til samme utsnitt av sammenhengene.

**Why this priority**: Klikkbare noder kobler den visuelle forståelsen til informasjonen som allerede finnes i tjenesteoversikten.

**Independent Test**: Åpne én rolle og én pakke fra kartet og bruk tilbakeknappen etter hvert besøk. Kontroller riktig detaljside og bevart utforskingskontekst.

**Acceptance Scenarios**:

1. **Given** et synlig pakkeløv, **When** jeg aktiverer pakkens navn/node, **Then** åpnes den eksisterende detaljsiden for riktig pakke i samme miljø.
2. **Given** en valgt rolle som rot, **When** jeg aktiverer rollens navn/node, **Then** åpnes den eksisterende detaljsiden for riktig rolle i samme miljø.
3. **Given** at jeg har åpnet en detaljside fra kartet, **When** jeg går tilbake i nettleseren, **Then** gjenopprettes valgt rolle, rollekontekst, pakkesøk og utvidede områder.
4. **Given** en områdegren, **When** jeg aktiverer dens utvid/skjul-kontroll, **Then** endres bare synligheten av grenens pakker; ingen detaljside åpnes.

---

### User Story 3 - Finne frem i store trær (Priority: P2)

Som besøkende vil jeg kunne finne en rolle og søke etter en bestemt pakke i
rollens tre, slik at også roller med mange pakker er lette å utforske.

**Why this priority**: Søk og sammenfolding gjør den samme visningen nyttig når datamengden vokser.

**Independent Test**: Bruk en rolle med 200 pakker fordelt på flere områder og finn en forhåndsbestemt pakke ved hjelp av søk og gruppeutvidelse.

**Acceptance Scenarios**:

1. **Given** rollelisten, **When** jeg søker på deler av rollenavn eller rollekode uavhengig av store/små bokstaver, **Then** vises treff som jeg kan velge, eller en tydelig melding om ingen treff.
2. **Given** en valgt rolle, **When** jeg søker på deler av et pakkenavn, **Then** vises bare matchende pakker med tilhørende område og forbindelsen tilbake til rollen; relevante områder åpnes, og antall treff vises separat fra totalt antall pakker.
3. **Given** et aktivt pakkesøk, **When** jeg tømmer søket, **Then** blir alle pakkene tilgjengelige igjen. **When** jeg bytter rolle, **Then** tømmes pakkesøket, slik at forrige søk ikke skjuler den nye rollens pakker.
4. **Given** et stort tre, **When** jeg utvider eller skjuler et område, **Then** forblir navn og kontroller lesbare uten overlapp; alle pakker kan nås, og skjulte pakker fremgår av antallet på gruppen.

---

### User Story 4 - Utforske med ulike enheter og datatilstander (Priority: P1)

Som besøkende vil jeg forstå og bruke kartet med tastatur eller berøring,
og vite om resultatet er komplett, tomt eller utilgjengelig.

**Why this priority**: Kartets budskap må være tilgjengelig og pålitelig også ved mobilbruk eller manglende data.

**Independent Test**: Gjennomfør rollevalg, utforsking og navigasjon med bare tastatur og på en smal skjerm. Gjenta med treg innlasting, full feil, delvis feil og miljøbytte.

**Acceptance Scenarios**:

1. **Given** tastaturnavigasjon, **When** jeg velger rolle, kontekst, områder og noder, **Then** er alle handlinger tilgjengelige med synlig fokus og forståelige navn; ingen nødvendig informasjon krever hover eller dra-bevegelser.
2. **Given** mobilvisning eller skjermleser, **When** jeg utforsker kartet, **Then** kan jeg lese hvilke pakker den valgte rollen gir og følge samme detaljlenker i en logisk rekkefølge.
3. **Given** pågående innlasting, **When** jeg venter på koblinger, **Then** vises lastestatus og ikke en melding om null pakker. **Given** feil, **Then** vises forklaring og mulighet til å prøve igjen; kjente delresultater merkes som ufullstendige og tallene som foreløpige.
4. **Given** et synlig tre, **When** jeg bytter mellom PROD og TT02, **Then** fjernes tidligere miljøs koblinger mens nye lastes. Sene resultater fra tidligere miljø, rolle eller kontekst må ikke erstatte det aktive valget.
5. **Given** at valgt rolle eller kontekst ikke finnes etter miljøbytte, **When** de nye valgmulighetene er lastet, **Then** får jeg beskjed og et gyldig nytt valg fremfor et tilsynelatende tomt resultat for et ugyldig valg.
6. **Given** valgt språk og lyst/mørkt tema, **When** kartet vises, **Then** følger kontroller og meldinger språkvalget, tilgjengelige oversettelser brukes, og noder, forbindelser og fokus er lesbare i begge temaer.

### Edge Cases

- Rollelisten er tom, eller ingen roller matcher søket: forklar forskjellen og tilby å tømme søket ved behov.
- En rolle har mange pakker, svært lange navn eller pakker uten områdenavn: navn må kunne leses fullt, og pakker uten område samles under «Uten område».
- Flere pakker har samme navn: de holdes adskilt og kan skilles ved en tilgjengelig identifikator. Gjentatte oppføringer med samme pakkeidentitet i samme kontekst teller bare én gang.
- En pakke gis av flere roller eller i flere kontekster: dette må ikke fremstå som eksklusivt eierskap eller tilgang i alle kontekster.
- Noen kontekster kan ikke undersøkes: «ingen pakker» eller «komplett oversikt» må ikke utledes av mislykket innlasting.
- Metadata mangler oversettelse eller beskrivelse: vis tilgjengelig navn med identifikator som siste reserve, og behold fungerende detaljlenke.
- En rolle eller pakke fjernes mellom visning og klikk: detaljvisningens eksisterende håndtering av manglende innhold brukes, og tilbake til kartet skal fungere.
- Raskt rolle-, kontekst- eller miljøbytte: bare resultatet som hører til aktive valg, vises som gjeldende.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tjenesteoversikten MUST ha en egen seksjon «Tilgangskart» tilgjengelig sammen med eksisterende katalogseksjoner og ved direkte åpning av seksjonens adresse. Eksisterende seksjoner og detaljvisninger skal fortsatt fungere. Dekkes av historie 1.1 og regresjonskontroll av navigasjonen.
- **FR-002**: Seksjonen MUST forklare at den viser sammenheng mellom katalogens roller og tilgangspakker, og tilby søk etter rolle på navn og kode. Ingen rolle velges automatisk ved første besøk. Dekkes av 1.1 og 3.1.
- **FR-003**: En valgt rolle MUST vises som visuelt fremhevet rot med navngitte pakkeløv og synlige forbindelser. Områder MUST vises som utvidbare grupperingsgrener med antall pakker. Pakker uten område samles i en egen gruppe. Dekkes av 1.2–1.3 og 3.4.
- **FR-004**: Kartet MUST gjøre det tydelig hvilken rollekontekst koblingene gjelder for, og tilby valg mellom tilgjengelige kontekster, inkludert organisasjonsformer der disse finnes. Koblinger fra ulike kontekster må ikke slås sammen til en ubetinget tildeling. Dekkes av 1.4.
- **FR-005**: Kartet MUST vise hver unike pakke én gang per valgt rolle og kontekst, med korrekt totalantall. Navnelikhet alene må ikke slå sammen ulike pakker. En pakke kan forekomme i flere rollers trær. Dekkes av 1.2, 1.5 og identitetstilfellene under Edge Cases.
- **FR-006**: Aktivering av en rollenode eller pakkenode MUST åpne riktig eksisterende detaljside i gjeldende miljø. Områdekontroller MUST utvide/skjule uten navigasjon. Dekkes av 2.1–2.4.
- **FR-007**: Tilbakenavigasjon fra detaljer MUST gjenopprette kartets rolle, rollekontekst, pakkesøk og utvidede områder. Dekkes av 2.3.
- **FR-008**: Besøkende MUST kunne søke i valgt rolles pakker, se treff med forbindelsen til rollen intakt, se treffantall adskilt fra total og tilbakestille søket. Rollebytte MUST tømme pakkesøket. Dekkes av 3.2–3.3.
- **FR-009**: Alle pakker MUST være tilgjengelige selv når områder er sammenfoldet eller treet er stort. Navn, forbindelser og betjeningskontroller må ikke overlappe slik at tolkning eller betjening hindres. Dekkes av 3.4 og SC-003.
- **FR-010**: Seksjonen MUST skille mellom innlasting, bekreftet tomt resultat, ingen søketreff, full feil og ufullstendig resultat. Feil MUST ha en prøv-igjen-handling. Manglende data må ikke presenteres som fravær av koblinger. Dekkes av 1.6, 3.1 og 4.3.
- **FR-011**: Miljøbytte MUST erstatte kartets datagrunnlag uten å blande miljøer. Ugyldige valg MUST håndteres eksplisitt, og utdaterte resultater fra tidligere valg må ikke overta visningen. Dekkes av 4.4–4.5.
- **FR-012**: Hele flyten MUST kunne brukes med tastatur, berøring og skjermleser, med synlig fokus, forståelige navn og logisk leserekkefølge. Farge alene, hover og dra-bevegelser må ikke være nødvendig for forståelse eller navigasjon. Dekkes av 4.1–4.2 og SC-005.
- **FR-013**: Kartet MUST være lesbart på små og store skjermer og følge tjenesteoversiktens språkvalg og lyst/mørkt tema. Lange navn og manglende oversettelser MUST ha lesbare reservevisninger. Dekkes av 4.2, 4.6 og SC-003.
- **FR-014**: Visningen MUST beskrive katalogkoblinger og ikke påstå hvilke rettigheter en bestemt person eller virksomhet faktisk har. Den MUST forklare at områdegrener er gruppering, og at en pakke kan gis av flere roller. Ingen delegering eller endring av tilganger inngår. Dekkes av introduksjonstekst og 1.3–1.5.

### Key Entities *(include if feature involves data)*

- **Rolle**: Navngitt katalogrolle med stabil identitet, kode og eventuell beskrivelse; valgt rolle er kartets rot.
- **Tilgangspakke**: Navngitt pakke med stabil identitet, eventuell beskrivelse og områdetilhørighet; vises som løv og lenker til pakkedetaljer.
- **Rollekontekst**: Varianten som pakkekoblingen gjelder for, med kode og tilgjengelig beskrivelse; kan blant annet avhenge av organisasjonsform.
- **Rollekobling**: Forbindelsen fra en rolle til en pakke i en bestemt kontekst og et bestemt miljø. Beskriver katalogmetadata, ikke personlig tildeling.
- **Område**: Eksisterende kategori som grupperer pakker visuelt. Representerer ikke en ny tillatelse eller et ekstra nivå med tilgangsvilkår.
- **Utforskingsvalg**: Valgt rolle, kontekst, miljø, pakkesøk og åpne områder som gjør det mulig å vende tilbake til samme kart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Minst 4 av 5 representative førstegangsbrukere skal innen 60 sekunder fra forsiden finne en oppgitt rolle, identifisere minst én pakke den gir i oppgitt kontekst og forklare hvilken vei forbindelsen går, uten veiledning.
- **SC-002**: I et kontrollert datagrunnlag med delte pakker, like navn, duplikater, tomme roller og minst to ulike rollekontekster samsvarer 100 % av viste koblinger og ferdig innlastede totaler med forventet resultat. Ingen mislykkede innlastinger presenteres som bekreftet null.
- **SC-003**: Med 200 pakker fordelt på 20 områder kan alle pakker finnes og åpnes på skjermbredder 360 og 1440 piksler uten uleselig overlapp. Fullt navn er tilgjengelig for alle noder, og pakkesøk gir synlig oppdatert resultat innen ett sekund etter inntasting når dataene er lastet.
- **SC-004**: Rolle- og pakkenavigasjon treffer riktig detaljside i samtlige definerte akseptansescenarioer; tilbakeknappen gjenoppretter alle fire utforskingsvalg angitt i FR-007.
- **SC-005**: Samtlige handlinger i rollevalg, kontekstvalg, pakkesøk, gruppeutvidelse og detaljnavigasjon kan gjennomføres uten mus og med berøring. En skjermlesergjennomgang formidler rolle, valgt kontekst, gruppetilhørighet og pakkenavn uten å kreve at brukeren ser forbindelseslinjene.
- **SC-006**: Ved simulert full feil, delvis feil og raskt bytte mellom miljøer eller roller viser samtlige scenarioer en korrekt lastestatus eller feilstatus, og ingen utdaterte koblinger presenteres som gjeldende.

## Assumptions

- Første versjon fokuserer på én valgt rolle om gangen. Brukeren kan bytte rolle for å utforske andre sammenhenger. Sammenligning av flere roller i samme graf og omvendt utforsking fra pakke til alle roller inngår ikke.
- «Tilgangskart» er foreslått seksjonsnavn. Den visuelle retningen er et tydelig, interaktivt tre med rolle, områdegrener og pakkeløv. Detaljert komposisjon, uttrykk og eventuell diskret animasjon avklares i design/planlegging; fri panorering, zoom og 3D er ikke krav.
- «Kul og visuell» tolkes som en gjennomarbeidet, lett forståelig presentasjon der rollen, pakkene og forbindelsene er tydelige og interaksjonene gir synlig tilbakemelding.
- Standard rollekontekst følger den eksisterende rollevisningens standard (`person`) og merkes eksplisitt. Tilgjengelige alternative kontekster kan velges også når standarden gir pakker; de er ikke bare en reserve ved tomt resultat.
- Datagrunnlaget er de eksisterende offentlige rolle- og pakkemetadataene for valgt miljø. Tilgang til kontekstopplysninger og pålitelig status for ufullstendige resultater er en avhengighet som må undersøkes i planleggingen. Dagens datatilgang kan kreve forbedring for å oppfylle FR-004 og FR-010.
- Visningen krever ikke innlogging og skal ikke beregne en bestemt persons eller virksomhets faktiske tilgang. Ressurser/tjenester under pakkene, delegering, redigering, eksport og egne nye detaljsider ligger utenfor første versjon.
- Bokmål og engelsk, eksisterende miljøvalg og eksisterende tema brukes. Beskrivende kildetekst beholdes der oversettelse mangler.
- 200 pakker og 20 områder er et foreslått utgangspunkt i denne spesifikasjonen for å prøve lesbarhet og søk; tallene er ikke en påstand om dagens produksjonsdata. Brukerprøven i SC-001 og øvrige mål er akseptansemål, ikke allerede målte resultater.
