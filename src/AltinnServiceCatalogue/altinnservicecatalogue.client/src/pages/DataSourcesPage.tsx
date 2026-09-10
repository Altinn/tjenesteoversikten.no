import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import '../data-sources.css';

const registry = 'https://platform.altinn.no/resourceregistry/api/v1/resource';
const metadata = 'https://platform.altinn.no/accessmanagement/api/v1/meta';

export default function DataSourcesPage() {
  const { lang } = useLang();
  const text = (nb: string, en: string) => lang === 'nb' ? nb : en;
  const sections = [
    ['openness', text('Hva betyr åpen informasjon?', 'What does public information mean?')],
    ['information', text('Opplysningene vi viser', 'Information we display')],
    ['resource-types', text('Tjeneste- og ressurstyper', 'Service and resource types')],
    ['sources', text('Kontroller kildene selv', 'Check the sources yourself')],
    ['processing', text('Bearbeiding og oppdatering', 'Processing and freshness')],
    ['faq', text('Ofte stilte spørsmål', 'Frequently asked questions')],
    ['corrections', text('Feil eller bekymringer?', 'Errors or concerns?')],
  ];
  const categories = [
    [
      text('Navn, beskrivelser og klassifisering', 'Names, descriptions and classification'),
      text('Tittel, beskrivelse, rettighetsbeskrivelse, emneord, tema, geografisk dekningsområde og tilhørighet beskriver hva en tjeneste er. Tekstene kan finnes på flere språk. Dette er publiserte katalogopplysninger, ikke innhold fra skjemaer eller saker.', 'Titles, descriptions, rights descriptions, keywords, themes, geographical coverage and affiliation describe a service. Texts may be available in several languages. These are published catalogue entries, not content from forms or cases.'),
      text('Ressursregisteret: ressurslisten og den enkelte ressursen.', 'Resource Registry: the resource list and individual resources.'),
    ],
    [
      text('Tjenesteeier og kontaktinformasjon', 'Service owners and contact details'),
      text('Navn på ansvarlig virksomhet, organisasjonsnummer, tjenesteeierkode, logo og hjemmeside hentes fra ressursen og organisasjonsoversikten. Kontaktpunkter kan inneholde e-post, telefon, kategori og kontaktlenke. Dette er publiserte kontaktopplysninger; en navngitt kontakt eller personlig jobb-e-post kan likevel være en personopplysning.', 'The responsible organisation’s name, organisation number, owner code, logo and website come from the resource and organisation catalogue. Contact points may include email, phone, category and a contact link. These are published contact details; a named contact or personal work email may still be personal data.'),
      text('Ressursregisteret: hasCompetentAuthority, contactPoints og /orgs.', 'Resource Registry: hasCompetentAuthority, contactPoints and /orgs.'),
    ],
    [
      text('Identifikatorer, referanser og lenker', 'Identifiers, references and links'),
      text('Ressurs-ID, versjon, versjons-ID, appreferanse, tjeneste- og utgavekode, URN-er, autorisasjonsreferanser og Maskinporten-scope identifiserer ressurser og rettigheter. Noen lenker til apper, Altinn Studio og ressursadministrasjon bygges fra disse referansene. En ID eller et scope-navn er ikke et passord, tilgangstoken eller en API-nøkkel. Lenker kan kreve innlogging når du følger dem.', 'Resource IDs, versions, version IDs, app references, service and edition codes, URNs, authorisation references and Maskinporten scopes identify resources and rights. Some links to apps, Altinn Studio and resource administration are constructed from these references. An ID or scope name is not a password, access token or API key. Following a link may require sign-in.'),
      text('Ressursregisteret: identifier, resourceReferences og authorizationReference. Metadata-API-et for rolle- og pakke-ID-er.', 'Resource Registry: identifier, resourceReferences and authorizationReference. The metadata API for role and package IDs.'),
    ],
    [
      text('Status og innstillinger for bruk', 'Status and usage settings'),
      text('Vi viser ressurstype, status, synlighet, om rettigheter kan delegeres, tilgjengelige aktørtyper, støtte for selvregistrerte brukere og virksomhetsbrukere, tilgangslistemodus og om samtykke er engangsbasert. Feltene beskriver oppsettet. Tilgangslistemodus viser ikke medlemmene i en tilgangsliste. Samtykkeinnstillinger viser ikke hvem som har gitt samtykke.', 'We display resource type, status, visibility, whether rights can be delegated, supported actor types, support for self-identified and enterprise users, access-list mode and whether consent is one-time. These fields describe configuration. Access-list mode does not disclose list members. Consent settings do not show who has given consent.'),
      text('Ressursregisteret: blant annet visible, delegable, availableForType, accessListMode og isOneTimeConsent.', 'Resource Registry: including visible, delegable, availableForType, accessListMode and isOneTimeConsent.'),
    ],
    [
      text('Tilgangspakker, områder og grupper', 'Access packages, areas and groups'),
      text('Navn, beskrivelse, ID, URN og inndeling i områder og grupper forklarer tilgangspakkene. Vi viser tilknyttede ressurser og innstillinger for tildeling, delegering og bruk i policy. Dette er definisjonen av en pakke og dens innhold, ikke en oversikt over hvem som har fått pakken.', 'Names, descriptions, IDs, URNs and the area/group hierarchy explain access packages. We display associated resources and settings for assignment, delegation and use in policies. This is the definition and content of a package, not a list of its assignees.'),
      text('Access Management Metadata API: /info/accesspackages med eksport, områder, grupper og ressurser.', 'Access Management Metadata API: /info/accesspackages, including export, areas, groups and resources.'),
    ],
    [
      text('Roller og organisasjonsformer', 'Roles and organisation types'),
      text('Navn, beskrivelse, rollekode, eldre rollekoder, URN, rolletilbyder og markering av nøkkelrolle beskriver rolletypen. Vi viser koblinger til pakker og ressurser. Tilgangskartet skiller mellom person og organisasjonsformer. «Daglig leder» er her en rolledefinisjon, ikke navnet på en daglig leder i en bestemt virksomhet.', 'Names, descriptions, role codes, legacy codes, URNs, providers and key-role flags describe role types. We display links to packages and resources. The access map distinguishes person context from organisation types. “General manager” is a role definition here, not the name of a manager at a particular organisation.'),
      text('Metadata-API-et: /info/roles, rolle–pakke- og rolle–ressurskoblinger og /types/organization/subtypes.', 'Metadata API: /info/roles, role–package and role–resource relationships, and /types/organization/subtypes.'),
    ],
    [
      text('Tilgangsregler og mulige handlinger', 'Access rules and possible actions'),
      text('En policy er tjenestens generelle regelsett. Vi leser hvilke roller og tilgangspakker som er nevnt, og handlinger som read, write, sign eller delegate når API-et oppgir dem. Mulige rettigheter vises også per delressurs eller oppgave. Dette er en forenkling av reglene, ikke en tilgangsavgjørelse for en innlogget bruker. «Ukjente handlinger» betyr at en kobling er funnet uten tilstrekkelig informasjon om handlingene.', 'A policy is the service’s general rule set. We read the roles and packages mentioned and actions such as read, write, sign or delegate when supplied by the API. Possible rights are also shown per subresource or task. This is a simplified view of the rules, not an access decision for a signed-in user. “Unknown actions” means a relationship was found without sufficient action information.'),
      text('Ressursregisteret: /{id}/policy, /policy/subjects og /policy/rules. Mulige rettigheter: v2-endepunktet /{id}/policy/rights.', 'Resource Registry: /{id}/policy, /policy/subjects and /policy/rules. Possible rights: the v2 /{id}/policy/rights endpoint.'),
    ],
    [
      text('Sikkerhetsnivå fra policy', 'Security levels from policies'),
      text('Krav til autentiseringsnivå for bruker og virksomhet leses ut av policyens XML. Dette er publiserte krav til autentisering, ikke en sikkerhetsgradering av opplysningene tjenesten behandler. Et manglende nivå i visningen beviser ikke at tjenesten er åpen eller uten innloggingskrav.', 'Authentication level requirements for users and organisations are extracted from policy XML. These are published authentication requirements, not a security classification of data processed by the service. A missing level does not prove that a service is public or requires no sign-in.'),
      text('Ressursregisterets XACML-policy, bearbeidet av tjenesteoversiktens /policy/securitylevel.', 'Resource Registry XACML policies, processed by the catalogue’s /policy/securitylevel endpoint.'),
    ],
    [
      text('Statistikk, tilgangskart og veiledning', 'Statistics, access maps and guidance'),
      text('Antall tjenester, fordeling på eiere og typer, emneord, tilgangskart og policyanalyser beregnes fra de samme kildene. Analysene omfatter sikkerhetsnivå, tilgangspakker, eldre roller, store/små bokstaver, kombinasjonsalgoritmer, avvisningsregler og betingelser. Tallene beskriver registeret og regeloppsettet, ikke brukere, innsendingsvolum eller innlogginger. Tilgangsveiviseren gir generell veiledning og utfører ingen delegering.', 'Service counts, distributions by owner and type, keywords, access maps and policy analyses are derived from the same sources. Analyses cover security levels, access packages, legacy roles, case sensitivity, combining algorithms, deny rules and conditions. Counts describe the registry and rule configuration, not users, submission volumes or sign-ins. The access wizard provides general guidance and does not perform delegation.'),
      text('Lokale beregninger fra ressursregisteret og metadata-API-et. Veiledningstekster er skrevet i denne løsningen.', 'Local calculations from the resource registry and metadata API. Guidance text is authored in this application.'),
    ],
  ];
  const resourceTypes = [
    ['AltinnApp', text('Altinn-apper: beskrivelse og tilgangsregler for appen.', 'Altinn apps: descriptions and access rules for the app.')],
    ['Altinn2Service', text('Tjenester fra Altinn 2, med tjeneste- og utgavekoder.', 'Altinn 2 services, including service and edition codes.')],
    ['MigratedApp', text('Migrerte apper/tjenester og deres registrering.', 'Migrated apps/services and their registry entries.')],
    ['GenericAccessResource', text('Generelle tilgangsressurser, også for tjenester utenfor Altinn.', 'General access resources, including services outside Altinn.')],
    ['MaskinportenSchema', text('Ressurser knyttet til delegering av Maskinporten-scopes.', 'Resources related to delegation of Maskinporten scopes.')],
    ['Systemresource', text('Systemressurser som brukes i autorisasjonsoppsettet.', 'System resources used in authorisation configuration.')],
    ['BrokerService', text('Ressurser for formidling. Filene som formidles vises ikke.', 'Broker resources. Files being transferred are not displayed.')],
    ['CorrespondenceService', text('Ressurser for meldingstjenester. Selve meldingene vises ikke.', 'Correspondence resources. Actual messages are not displayed.')],
    ['Consent', text('Ressurser for samtykkebasert tilgang. Faktiske samtykker vises ikke.', 'Resources for consent-based access. Actual consents are not displayed.')],
    ['Default', text('Standard eller uspesifisert type. Nye typer kan forekomme i kilden.', 'Default or unspecified type. New types may appear in the source.')],
  ];
  const sourceLinks = [
    [text('Ressursliste, inkludert apper og eldre tjenester', 'Resource list, including apps and legacy services'), registry + '/resourcelist?includeApps=true&includeAltinn2=true&includeMigratedApps=true'],
    [text('Tjenesteeiere og organisasjonsmetadata', 'Service owners and organisation metadata'), registry + '/orgs'],
    [text('Eksempel på ressursmetadata', 'Example resource metadata'), registry + '/skd-maskinportenschemaid-8'],
    [text('Den samme ressursens policy (XML)', 'The same resource’s policy (XML)'), registry + '/skd-maskinportenschemaid-8/policy'],
    [text('Tilgangspakker med områder og grupper', 'Access packages with areas and groups'), metadata + '/info/accesspackages/export'],
    [text('Rolledefinisjoner', 'Role definitions'), metadata + '/info/roles'],
    [text('Organisasjonsformer', 'Organisation types'), metadata + '/types/organization/subtypes'],
  ];
  const questions = [
    [text('Viser dere hemmelig informasjon?', 'Are you displaying secret information?'), text('Katalogen henter publiserte metadata og generelle regler fra API-er som svarer uten innlogging. Den bruker ikke en privilegert konto til disse oppslagene. Et åpent API kan likevel inneholde feilpubliserte opplysninger. Hvis en konkret opplysning virker feil eller sensitiv, bør den undersøkes og meldes til ansvarlig tjenesteeier.', 'The catalogue retrieves published metadata and general rules from APIs that respond without sign-in. It does not use a privileged account for these lookups. An open API may nevertheless contain information published in error. A specific entry that appears incorrect or sensitive should be investigated and reported to the responsible service owner.')],
    [text('Betyr en åpen beskrivelse at alle kan bruke tjenesten?', 'Does a public description mean anyone can use the service?'), text('Nei. Å lese beskrivelsen og reglene gir ingen rettighet til tjenesten. Bruken kan kreve innlogging, riktig representasjon, delegering, samtykke og andre vilkår. Altinn og tjenesten kontrollerer dette når den brukes.', 'No. Reading the description and rules grants no rights to the service. Use may require sign-in, correct representation, delegation, consent and other conditions. Altinn and the service check these when the service is used.')],
    [text('Ser dere hvem som har tilgang i min virksomhet?', 'Can you see who has access in my organisation?'), text('Nei. Vi slår opp rolletyper, pakker og regler, ikke enkeltpersoners rolletildelinger, virksomhetens delegeringer eller medlemmer i tilgangslister. Kontroller konkrete tilganger i Altinns tilgangsstyring med riktig innlogging og rettighet.', 'No. We look up role types, packages and rules, not people’s role assignments, an organisation’s delegations or access-list members. Check actual access in Altinn access management with the appropriate sign-in and rights.')],
    [text('Viser dere skjemaer, meldinger eller personopplysninger?', 'Do you display forms, messages or personal data?'), text('Vi henter ikke innsendte skjemaer, vedlegg, meldingsinnhold, saksdata, fødselsnumre eller brukernes samtykker i katalogoppslagene. Publiserte kontaktfelt kan likevel inneholde navn eller personlige kontaktopplysninger. Derfor er «ingen personopplysninger overhodet» en for vid påstand.', 'Catalogue lookups do not retrieve submitted forms, attachments, message contents, case data, national identity numbers or users’ consents. Published contact fields may nevertheless contain names or personal contact details. A blanket claim of “no personal data whatsoever” would be too broad.')],
    [text('Hvorfor kan en tjeneste merket «ikke synlig» finnes her?', 'Why can a service marked “not visible” appear here?'), text('Feltet visible er metadata for visning i brukergrensesnittet, ikke tilgangskontroll for API-et. Ressursen kan fortsatt være publisert i registeret. I tjenestelistene samles skjulte og utgåtte tjenester bak et eget visningsvalg. En direkte lenke til en registrert ressurs kan fortsatt vise detaljene.', 'The visible field is metadata for presentation in a user interface, not API access control. The resource may still be published in the registry. Service lists group hidden and retired entries behind a separate display option. A direct link to a registered resource may still show its details.')],
    [text('Er en policy, en URN eller et scope en hemmelighet?', 'Is a policy, URN or scope a secret?'), text('Policyen beskriver regler. URN-er og scope-navn identifiserer roller, pakker, ressurser eller rettigheter. Å kjenne navnet er ikke nok til å oppfylle reglene. Katalogen henter publiserte definisjoner, ikke passord, klienthemmeligheter, private nøkler eller tilgangstokener.', 'A policy describes rules. URNs and scope names identify roles, packages, resources or rights. Knowing a name is not enough to satisfy the rules. The catalogue retrieves published definitions, not passwords, client secrets, private keys or access tokens.')],
    [text('Betyr «mangler tilgangspakke» at tjenesten er ubeskyttet?', 'Does “missing access package” mean a service is unprotected?'), text('Nei. Tjenesten kan bruke roller eller andre regler. Opplysninger kan også mangle fordi en policy ikke kunne hentes eller tolkes. En markering er et utgangspunkt for å undersøke oppsettet, ikke dokumentasjon på uautorisert tilgang. Det samme gjelder andre policyfunn i statistikken.', 'No. The service may use roles or other rules. Information may also be missing because a policy could not be fetched or parsed. A flag is a starting point for reviewing configuration, not evidence of unauthorised access. The same applies to other policy findings in the statistics.')],
    [text('Er dette en komplett fasit på hva en rolle kan gjøre?', 'Is this a complete answer to what a role can do?'), text('Nei. Koblinger kan avhenge av representasjon og organisasjonsform. Et forenklet regeluttrekk kan utelate betingelser. En pakkekobling sier ikke alene hvilke handlinger en konkret bruker får utføre. Les originalpolicyen ved behov; faktisk tilgang må vurderes i den aktuelle tjenesten.', 'No. Relationships can depend on representation and organisation type. A simplified rule view may omit conditions. A package relationship alone does not determine what a particular user may do. Consult the original policy when needed; actual access must be evaluated in the service concerned.')],
    [text('Hvorfor er opplysninger ulike i TT02 og PROD?', 'Why do TT02 and PROD differ?'), text('PROD er produksjonsmiljøet. TT02 er et testmiljø og kan inneholde testressurser og annet oppsett. Miljøvalget øverst styrer katalogoppslagene. Denne siden beskriver begge, men de direkte kildeeksemplene på siden bruker PROD. Testdata er ikke fasit for produksjon.', 'PROD is the production environment. TT02 is a test environment and may contain test resources and different configuration. The selector at the top controls catalogue lookups. This page describes both, but its direct source examples use PROD. Test data is not authoritative for production.')],
    [text('Er informasjonen alltid oppdatert og fullstendig?', 'Is the information always up to date and complete?'), text('Nei. Flere oppslag mellomlagres i 30 minutter, og nettleseren kan gjenbruke data gjennom sidebesøket. Manglende kildedata, forsinket publisering og hente- eller tolkningsfeil kan gi hull. Statistikk er øyeblikksbilder; sjekk tidspunkt, feilantall og eventuelle begrensninger i visningen.', 'No. Several lookups are cached for 30 minutes, and the browser may reuse data during a visit. Missing source data, delayed publication, fetch errors and parsing errors can leave gaps. Statistics are snapshots; check timestamps, error counts and any limits shown.')],
    [text('Er dette et offisielt Altinn-produkt?', 'Is this an official Altinn product?'), text('Nei. Dette er et uoffisielt hobby-/demoprosjekt laget av teamet bak Altinn Autorisasjon. Kildene er Altinns API-er, men sammenstillinger, forklaringer og veiledning her er ikke en offisiell tilgangsavgjørelse eller garanti fra Altinn.', 'No. This is an unofficial hobby/demo project built by the team behind Altinn Authorization. Its sources are Altinn APIs, but the summaries, explanations and guidance here are not official access decisions or guarantees from Altinn.')],
    [text('Kan jeg kontrollere kilden eller bruke dataene selv?', 'Can I check the source or use the data myself?'), text('Ja, kildeoversikten lenker til API-svar og dokumentasjon. Ressurssiden har også lenker til policy og rettigheter. Nettstedets API-proxy og MCP-server bruker de samme katalogkildene. At et endepunkt kan leses uten innlogging er ikke i seg selv en erklæring om lisens eller fri viderebruk; sjekk kildeeierens vilkår for din bruk.', 'Yes. The source list links to API responses and documentation. Resource pages also link to policies and rights. The site’s API proxy and MCP server use the same catalogue sources. Availability without sign-in does not itself declare a licence or unrestricted reuse; check the source owner’s terms for your intended use.')],
  ];

  return (
    <div className="data-page">
      <nav className="breadcrumbs" aria-label={text('Brødsmulesti', 'Breadcrumb')}>
        <Link to="/about">{text('Om tjenesten', 'About')}</Link><span aria-hidden="true">/</span>
        <span aria-current="page">{text('Data og åpenhet', 'Data and openness')}</span>
      </nav>
      <header className="data-hero">
        <span className="eyebrow">{text('Om datagrunnlaget', 'About the data')}</span>
        <h1>{text('Data, kilder og åpenhet', 'Data, sources and openness')}</h1>
        <p>{text('Hva viser tjenesteoversikten, hvor kommer opplysningene fra, og hva kan du egentlig lese ut av dem? Her forklarer vi datagrunnlaget og grensene for det oversikten forteller.', 'What does the catalogue display, where does the information come from, and what can you actually learn from it? Here we explain the data and the limits of what the catalogue tells you.')}</p>
        <div className="data-key-message">
          <strong>{text('Vi viser beskrivelser av tjenester og generelle tilgangsregler.', 'We display service descriptions and general access rules.')}</strong>
          <p>{text('Opplysningene hentes fra Altinns åpne metadata-API-er. Oversikten gir ikke innsyn i innsendte skjemaer eller en oversikt over hvem som faktisk har fått tilgang i en virksomhet.', 'Information is retrieved from Altinn’s public metadata APIs. The catalogue does not expose submitted forms or list who has actually been granted access in an organisation.')}</p>
        </div>
      </header>
      <div className="data-layout">
        <nav className="data-toc" aria-label={text('På denne siden', 'On this page')}>
          <strong>{text('På denne siden', 'On this page')}</strong>
          <ol>{sections.map(([id, title]) => <li key={id}><a href={'#' + id}>{title}</a></li>)}</ol>
        </nav>
        <article className="data-content">
          <section id="openness" aria-labelledby="openness-title">
            <h2 id="openness-title">{sections[0][1]}</h2>
            <p>{text('Et API er et grensesnitt der programmer kan hente opplysninger. Med «åpent» mener vi her at leseendepunktene som katalogen bruker, er tilgjengelige uten innlogging, tilgangstoken eller API-nøkkel. Serveren vår gjør oppslag i ressursregisteret og metadata-delen av Access Management, og presenterer svarene i en søkbar oversikt.', 'An API is an interface through which programs retrieve information. Here, “public” means that the read endpoints used by the catalogue are available without sign-in, access tokens or API keys. Our server queries the Resource Registry and the metadata part of Access Management, then presents the responses in a searchable catalogue.')}</p>
            <p>{text('Dette gjelder de konkrete katalogendepunktene. Altinn har også API-er for innhold, delegeringer og administrasjon som krever autorisasjon. En åpen beskrivelse av en beskyttet tjeneste gjør ikke tjenestens innhold åpent.', 'This applies to the specific catalogue endpoints. Altinn also has APIs for content, delegations and administration that require authorisation. A public description of a protected service does not make its contents public.')}</p>
            <p>{text('Åpent tilgjengelig beskriver hvordan opplysningene kan hentes. Det er ikke en garanti for at hvert felt er korrekt publisert, en sikkerhetsgradering eller en lisensvurdering. Bekymringer må vurderes ut fra den konkrete opplysningen og kilden.', 'Public availability describes how information can be retrieved. It is not a guarantee that every field was published correctly, a security classification or a licence assessment. Concerns need to be assessed against the specific information and its source.')}</p>
            <a href="https://docs.altinn.studio/en/api/resourceregistry/resource/">{text('Altinns dokumentasjon av ressurser og policyer', 'Altinn documentation on resources and policies')}</a>
          </section>
          <section id="information" aria-labelledby="information-title">
            <h2 id="information-title">{sections[1][1]}</h2>
            <p>{text('Feltene varierer mellom ressurstyper og tjenesteeiere. Et tomt felt kan bety at kilden ikke har oppgitt informasjonen. Her er opplysningstypene i katalogen, detaljsidene og analysene.', 'Fields vary between resource types and service owners. An empty field may mean the source has not supplied the information. These are the information types in the catalogue, detail pages and analyses.')}</p>
            <div className="data-categories">{categories.map(([title, body, source], index) => (
              <section className="data-category" key={title}>
                <span className="data-category-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div><h3>{title}</h3><p>{body}</p><p className="data-source-note"><strong>{text('Kilde: ', 'Source: ')}</strong>{source}</p></div>
              </section>
            ))}</div>
          </section>
          <section id="resource-types" aria-labelledby="resource-types-title">
            <h2 id="resource-types-title">{sections[2][1]}</h2>
            <p>{text('«Tjeneste» brukes som samlebetegnelse i oversikten. En ressurs kan være en app, et API eller en definisjon brukt til tilgangsstyring. Typen sier ikke at selve dataene i tjenesten er offentlige.', '“Service” is an umbrella term in the catalogue. A resource may be an app, an API or a definition used for access management. Its type does not mean that the service’s actual data is public.')}</p>
            <dl className="data-types">{resourceTypes.map(([type, description]) => <div key={type}><dt><code>{type}</code></dt><dd>{description}</dd></div>)}</dl>
          </section>
          <section id="sources" aria-labelledby="sources-title">
            <h2 id="sources-title">{sections[3][1]}</h2>
            <p>{text('Lenkene går direkte til Altinns produksjonsmiljø (PROD), uavhengig av miljøvalget øverst. Svarene er JSON eller XML og kan være store. De er kildedata, ikke en egen innlogget visning.', 'These links go directly to Altinn’s production environment (PROD), regardless of the environment selector above. Responses are JSON or XML and can be large. They are source data, not a separate signed-in view.')}</p>
            <ul className="data-source-links">{sourceLinks.map(([label, url]) => <li key={url}><a href={url}>{label}</a><small>{url.replace('https://', '')}</small></li>)}</ul>
            <p>{text('Dokumentasjon: ', 'Documentation: ')}<a href="https://docs.altinn.studio/en/api/resourceregistry/resource/">{text('Ressursregisteret', 'Resource Registry')}</a>{' · '}<a href="https://docs.altinn.studio/en/api/accessmanagement/metadata/">Access Management Metadata API</a>.</p>
            <p>{text('I TT02 brukes tilsvarende stier på platform.tt02.altinn.no. Nettstedets egne /api/v1/{miljø}/resource- og /api/v1/{miljø}/meta-endepunkter fungerer som et mellomledd. Rettighetsoppslaget under vår v1-proxy bruker v2 av ressursregisteret hos Altinn.', 'TT02 uses corresponding paths on platform.tt02.altinn.no. This site’s /api/v1/{environment}/resource and /api/v1/{environment}/meta endpoints act as an intermediary. The rights lookup under our v1 proxy uses v2 of Altinn’s Resource Registry.')}</p>
          </section>
          <section id="processing" aria-labelledby="processing-title">
            <h2 id="processing-title">{sections[4][1]}</h2>
            <ol className="data-flow">
              <li><strong>{text('Henting', 'Retrieval')}</strong><p>{text('Katalogopplysninger hentes fra valgt Altinn-miljø. Ingen brukerinnlogging til Altinn brukes i oppslagene.', 'Catalogue information is fetched from the selected Altinn environment. These lookups do not use an Altinn user sign-in.')}</p></li>
              <li><strong>{text('Sammenstilling', 'Combining data')}</strong><p>{text('ID-er kobles til navn, pakker grupperes etter områder, og roller kobles til pakker og ressurser. Søkeresultater, filtre og tellinger beregnes fra dette. Norsk tekst kan brukes når engelsk mangler.', 'IDs are resolved to names, packages are grouped by area, and roles are linked to packages and resources. Search results, filters and counts are derived from this. Norwegian text may be used when English is missing.')}</p></li>
              <li><strong>{text('Tolkning', 'Interpretation')}</strong><p>{text('Policy-XML brukes til å trekke ut nivåer og analysere regelstruktur. Tilgangskartet avhenger av valgt kontekst. Pakkesidens rolleoversikt er basert på rolleoppslag i person-kontekst, og er ikke uttømmende for alle organisasjonsformer.', 'Policy XML is used to extract levels and analyse rule structure. The access map depends on the selected context. The role list on a package page is based on role lookups in person context and is not exhaustive across all organisation types.')}</p></li>
              <li><strong>{text('Mellomlagring', 'Caching')}</strong><p>{text('Ressurslister, organisasjoner, roller, pakkeeksport og flere policyberegninger mellomlagres på serveren i 30 minutter. Nettleseren gjenbruker også enkelte oppslag. Endringer i kilden kan derfor vises senere her; dette er ikke garantert sanntid.', 'Resource lists, organisations, roles, package exports and several policy calculations are cached on the server for 30 minutes. The browser also reuses some lookups. Source changes may therefore appear here later; this is not guaranteed real-time data.')}</p></li>
            </ol>
            <p>{text('Statistikk kan være ufullstendig ved hente- eller tolkningsfeil. Policyanalysens detaljliste for avvikende regeloppsett er begrenset til 500 ressurser, selv om totaltallet kan være høyere. Manglende treff eller tomme lister er ikke alene bevis på at ingen har tilgang.', 'Statistics may be incomplete when fetching or parsing fails. The policy analysis detail list for non-default rule configurations is limited to 500 resources, even when the total is higher. Missing matches or empty lists alone are not proof that nobody has access.')}</p>
          </section>
          <section id="faq" aria-labelledby="faq-title">
            <h2 id="faq-title">{sections[5][1]}</h2>
            <div className="data-faq">{questions.map(([question, answer], index) => <details key={question} id={'faq-' + (index + 1)}><summary>{question}</summary><p>{answer}</p></details>)}</div>
          </section>
          <section id="corrections" className="data-corrections" aria-labelledby="corrections-title">
            <h2 id="corrections-title">{sections[6][1]}</h2>
            <p>{text('Sammenlign detaljsiden og originalkilden i samme miljø. Noter ressurs-ID, miljø, lenke og hvilket felt eller hvilken visning det gjelder.', 'Compare the detail page with the original source in the same environment. Note the resource ID, environment, link and the field or view concerned.')}</p>
            <ul>
              <li>{text('Feil i navn, beskrivelse, kontaktinformasjon eller policy: kontakt tjenesteeieren som er oppgitt på ressursen, via virksomhetens kontaktkanal. Rettelsen må gjøres i kildesystemet.', 'Incorrect name, description, contact details or policy: contact the service owner listed on the resource through the organisation’s contact channel. Corrections must be made in the source system.')}</li>
              <li>{text('Feil i koblinger eller presentasjon her: meld det til teamet bak tjenesteoversikten. Legg ved kildehenvisning og forklar hva som vises feil.', 'Incorrect relationships or presentation here: report it to the team behind tjenesteoversikten. Include the source reference and explain what is displayed incorrectly.')}</li>
              <li>{text('Mulig feilpublisering av sensitive opplysninger: bruk tjenesteeierens eller Altinns kanal for sikkerhetshenvendelser. Unngå å kopiere opplysningene inn i en offentlig feilrapport.', 'Possible accidental publication of sensitive information: use the service owner’s or Altinn’s security contact channel. Avoid copying the information into a public issue report.')}</li>
            </ul>
            <Link to="/about">{text('Tilbake til Om tjenesten', 'Back to About')}</Link>
          </section>
        </article>
      </div>
    </div>
  );
}
