import { createContext, useContext, useState, type ReactNode } from 'react';

export type Lang = 'nb' | 'en';

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // Layout
  'nav.home': { nb: 'Hjem', en: 'Home' },
  'nav.about': { nb: 'Om', en: 'About' },
  'app.title': { nb: 'tjenesteoversikten.no', en: 'tjenesteoversikten.no' },

  // HomePage
  'home.hero.title': { nb: 'Finn offentlige digitale tjenester', en: 'Find public digital services' },
  'home.hero.subtitle': {
    nb: 'En digital tjenestekatalog som viser oversikt over digitale tjenester tilgjengelig i Norge.',
    en: 'A digital service catalogue showing an overview of digital services available in Norway.',
  },
  'home.hero.source': { nb: 'Kilden er ', en: 'Source: ' },
  'home.hero.sourceText': { nb: 'Altinn sitt Ressursregister', en: "Altinn's Resource Registry" },
  'home.hero.disclaimer': {
    nb: 'Dette er ikke et offisielt produkt fra Altinn, men er laget av teamet bak Altinn autorisasjon for å vise mulighetene med våre åpne API.',
    en: 'This is not an official product from Altinn, but is created by the team behind Altinn Authorization to showcase the possibilities of our open APIs.',
  },
  'home.search.placeholder': { nb: 'Søk etter etat...', en: 'Search for agency...' },
  'home.search.aria': { nb: 'Søk etter etat', en: 'Search for agency' },
  'home.serviceOwners': { nb: 'Tjenesteeiere', en: 'Service owners' },
  'home.noMatch': { nb: 'Ingen etater samsvarer med søket ditt.', en: 'No agencies match your search.' },
  'home.tabs.serviceOwner': { nb: 'Tjenesteeier', en: 'Service owner' },
  'home.tabs.resourceType': { nb: 'Tjenestetype', en: 'Resource type' },
  'home.tabs.accessPackages': { nb: 'Tilgangspakker', en: 'Access packages' },
  'home.tabs.roles': { nb: 'Roller', en: 'Roles' },
  'home.tabs.comingSoon': { nb: 'Kommer snart...', en: 'Coming soon...' },
  'home.resourceTypes': { nb: 'Tjenestetyper', en: 'Resource types' },

  // ResourceTypePage
  'type.back': { nb: 'Tilbake til alle tjenestetyper', en: 'Back to all resource types' },
  'type.notFound': { nb: 'Fant ikke tjenestetype', en: 'Resource type not found' },
  'type.services': { nb: 'Tjenester', en: 'Services' },
  'type.search.placeholder': { nb: 'Søk i tjenester...', en: 'Search services...' },
  'type.search.aria': { nb: 'Søk i tjenester', en: 'Search services' },
  'type.noServices': { nb: 'Ingen tjenester av denne typen.', en: 'No services of this type.' },
  'type.noMatch': { nb: 'Ingen tjenester samsvarer med søket ditt.', en: 'No services match your search.' },

  // OrgPage
  'org.back': { nb: 'Tilbake til alle etater', en: 'Back to all agencies' },
  'org.notFound': { nb: 'Fant ikke etat med kode', en: 'Agency not found with code' },
  'org.services': { nb: 'Tjenester', en: 'Services' },
  'org.search.placeholder': { nb: 'Søk i tjenester...', en: 'Search services...' },
  'org.search.aria': { nb: 'Søk i tjenester', en: 'Search services' },
  'org.noServices': { nb: 'Denne etaten har ingen registrerte tjenester.', en: 'This agency has no registered services.' },
  'org.noMatch': { nb: 'Ingen tjenester samsvarer med søket ditt.', en: 'No services match your search.' },

  // ResourcePage
  'resource.back': { nb: 'Tilbake', en: 'Back' },
  'resource.notFound': { nb: 'Fant ikke ressurs med id', en: 'Resource not found with id' },
  'resource.delegable': { nb: 'Delegerbar', en: 'Delegable' },
  'resource.notVisible': { nb: 'Ikke synlig', en: 'Not visible' },
  'resource.description': { nb: 'Beskrivelse', en: 'Description' },
  'resource.rightDescription': { nb: 'Rettighetsbeskrivelse', en: 'Rights description' },
  'resource.serviceOwner': { nb: 'Tjenesteeier', en: 'Service owner' },
  'resource.name': { nb: 'Navn', en: 'Name' },
  'resource.orgCode': { nb: 'Orgkode', en: 'Org code' },
  'resource.orgNumber': { nb: 'Organisasjonsnummer', en: 'Organization number' },
  'resource.technicalDetails': { nb: 'Tekniske detaljer', en: 'Technical details' },
  'resource.identifier': { nb: 'Identifikator', en: 'Identifier' },
  'resource.resourceType': { nb: 'Ressurstype', en: 'Resource type' },
  'resource.status': { nb: 'Status', en: 'Status' },
  'resource.version': { nb: 'Versjon', en: 'Version' },
  'resource.versionId': { nb: 'Versjon-ID', en: 'Version ID' },
  'resource.accessListMode': { nb: 'Tilgangsliste-modus', en: 'Access list mode' },
  'resource.delegableLabel': { nb: 'Delegerbar', en: 'Delegable' },
  'resource.visible': { nb: 'Synlig', en: 'Visible' },
  'resource.selfIdentified': { nb: 'Selvidentifiserte brukere', en: 'Self-identified users' },
  'resource.enterpriseUsers': { nb: 'Virksomhetsbrukere', en: 'Enterprise users' },
  'resource.oneTimeConsent': { nb: 'Engangssamtykke', en: 'One-time consent' },
  'resource.homepage': { nb: 'Hjemmeside', en: 'Homepage' },
  'resource.partOf': { nb: 'Del av', en: 'Part of' },
  'resource.availableFor': { nb: 'Tilgjengelig for', en: 'Available for' },
  'resource.references': { nb: 'Ressursreferanser', en: 'Resource references' },
  'resource.authReferences': { nb: 'Autorisasjonsreferanser', en: 'Authorization references' },
  'resource.contactPoints': { nb: 'Kontaktpunkter', en: 'Contact points' },
  'resource.category': { nb: 'Kategori', en: 'Category' },
  'resource.email': { nb: 'E-post', en: 'Email' },
  'resource.phone': { nb: 'Telefon', en: 'Phone' },
  'resource.contactPage': { nb: 'Kontaktside', en: 'Contact page' },
  'resource.keywords': { nb: 'Nøkkelord', en: 'Keywords' },
  'resource.spatial': { nb: 'Geografisk dekning', en: 'Spatial coverage' },
  'resource.thematicAreas': { nb: 'Tematiske områder', en: 'Thematic areas' },
  'resource.possibleRights': { nb: 'Mulige rettigheter', en: 'Possible rights' },
  'resource.possibleRights.resourceLevel': { nb: 'Ressursnivå', en: 'Resource level' },
  'resource.possibleRights.noRights': { nb: 'Ingen rettigheter funnet.', en: 'No rights found.' },
  'resource.accessRights': { nb: 'Tilgangsrettigheter', en: 'Access rights' },
  'resource.accessPackagesSection': { nb: 'Tilgangspakker', en: 'Access packages' },
  'resource.rolesSection': { nb: 'Roller', en: 'Roles' },
  'resource.noAccessRights': { nb: 'Ingen tilgangsrettigheter funnet.', en: 'No access rights found.' },
  'resource.goToApp': { nb: 'Gå til app', en: 'Go to app' },
  'resource.studioRepo': { nb: 'Kildekode i Altinn Studio', en: 'Source in Altinn Studio' },

  // Alerts
  'resource.alert.noPackages': {
    nb: 'Tjenesten er ikke definert med tilgangspakker. Dette gjør at systembrukere har begrenset tilgang til disse tjenestene. Det betyr også at vanlige brukere med roller vil miste tilgang etter 01.01.2027 når rollene fjernes fra Altinn.',
    en: 'This service is not defined with access packages. This means system users have limited access to these services. It also means that regular users with roles will lose access after 01.01.2027 when the roles are removed from Altinn.',
  },
  'resource.alert.accessList': {
    nb: 'Tjenesten har aktivert tilgangsliste. Dette betyr at tjenesteeier har definert et begrenset sett med virksomheter som har tilgang.',
    en: 'This service has access list enabled. This means the service owner has defined a limited set of organizations that have access.',
  },

  // Security level
  'resource.securityLevel': { nb: 'Sikkerhetsnivå', en: 'Security level' },
  'resource.securityLevel.user': { nb: 'Bruker', en: 'User' },
  'resource.securityLevel.org': { nb: 'Tjenesteeier', en: 'Service owner' },
  'resource.securityLevel.fetch': { nb: 'Hent sikkerhetsnivå', en: 'Get security level' },
  'resource.securityLevel.notSet': { nb: 'Ikke satt', en: 'Not set' },

  // AccessPackages (HomePage tab + PackagePage)
  'packages.search.placeholder': { nb: 'Søk i tilgangspakker...', en: 'Search access packages...' },
  'packages.search.aria': { nb: 'Søk i tilgangspakker', en: 'Search access packages' },
  'packages.noMatch': { nb: 'Ingen tilgangspakker samsvarer med søket ditt.', en: 'No access packages match your search.' },
  'packages.packages': { nb: 'tilgangspakker', en: 'access packages' },
  'packages.back': { nb: 'Tilbake til tilgangspakker', en: 'Back to access packages' },
  'packages.notFound': { nb: 'Fant ikke tilgangspakke', en: 'Access package not found' },
  'packages.delegable': { nb: 'Delegerbar', en: 'Delegable' },
  'packages.notDelegable': { nb: 'Ikke delegerbar', en: 'Not delegable' },
  'packages.services': { nb: 'Tjenester i denne pakken', en: 'Services in this package' },
  'packages.noServices': { nb: 'Ingen tjenester i denne pakken.', en: 'No services in this package.' },
  'packages.roles': { nb: 'Roller som gir denne pakken', en: 'Roles that grant this package' },
  'packages.noRoles': { nb: 'Ingen roller gir denne pakken.', en: 'No roles grant this package.' },
  'packages.area': { nb: 'Område', en: 'Area' },
  'packages.group': { nb: 'Kategori', en: 'Category' },
  'packages.urn': { nb: 'URN', en: 'URN' },

  // Roles (HomePage tab + RolePage)
  'roles.search.placeholder': { nb: 'Søk i roller...', en: 'Search roles...' },
  'roles.search.aria': { nb: 'Søk i roller', en: 'Search roles' },
  'roles.noMatch': { nb: 'Ingen roller samsvarer med søket ditt.', en: 'No roles match your search.' },
  'roles.roles': { nb: 'roller', en: 'roles' },
  'roles.back': { nb: 'Tilbake til roller', en: 'Back to roles' },
  'roles.notFound': { nb: 'Fant ikke rolle', en: 'Role not found' },
  'roles.keyRole': { nb: 'Nøkkelrolle', en: 'Key role' },
  'roles.provider': { nb: 'Leverandør', en: 'Provider' },
  'roles.code': { nb: 'Kode', en: 'Code' },
  'roles.urn': { nb: 'URN', en: 'URN' },
  'roles.legacyRoleCode': { nb: 'Eldre rollekode', en: 'Legacy role code' },
  'roles.legacyUrn': { nb: 'Eldre URN', en: 'Legacy URN' },
  'roles.policyAvailable': { nb: 'Ressurspolicy tilgjengelig', en: 'Resource policy available' },
  'roles.allRoles': { nb: 'Alle roller', en: 'All roles' },
  'roles.keyRoles': { nb: 'Nøkkelroller', en: 'Key roles' },
  'roles.services': { nb: 'Tjenester med denne rollen', en: 'Services with this role' },
  'roles.noServices': { nb: 'Ingen tjenester knyttet til denne rollen.', en: 'No services associated with this role.' },
  'roles.packages': { nb: 'Tilgangspakker rollen gir', en: 'Access packages granted by this role' },
  'roles.noPackages': { nb: 'Denne rollen gir ingen tilgangspakker.', en: 'This role does not grant any access packages.' },

  // Keywords
  'home.tabs.keywords': { nb: 'Nøkkelord', en: 'Keywords' },
  'keywords.search.placeholder': { nb: 'Søk i nøkkelord...', en: 'Search keywords...' },
  'keywords.search.aria': { nb: 'Søk i nøkkelord', en: 'Search keywords' },
  'keywords.noMatch': { nb: 'Ingen nøkkelord samsvarer med søket ditt.', en: 'No keywords match your search.' },
  'keywords.total': { nb: 'Nøkkelord', en: 'Keywords' },
  'keyword.back': { nb: 'Tilbake til nøkkelord', en: 'Back to keywords' },
  'keyword.services': { nb: 'Tjenester', en: 'Services' },
  'keyword.noServices': { nb: 'Ingen tjenester med dette nøkkelordet.', en: 'No services with this keyword.' },
  'keyword.search.placeholder': { nb: 'Søk i tjenester...', en: 'Search services...' },
  'keyword.search.aria': { nb: 'Søk i tjenester', en: 'Search services' },
  'keyword.noMatch': { nb: 'Ingen tjenester samsvarer med søket ditt.', en: 'No services match your search.' },

  // Quick search (hero)
  'quicksearch.placeholder': { nb: 'Søk etter tjeneste eller tilgangspakke (navn eller ID)...', en: 'Search for service or access package (name or ID)...' },
  'quicksearch.aria': { nb: 'Hurtigsøk etter tjeneste eller tilgangspakke', en: 'Quick search for service or access package' },
  'quicksearch.services': { nb: 'Tjenester', en: 'Services' },
  'quicksearch.packages': { nb: 'Tilgangspakker', en: 'Access packages' },
  'quicksearch.noResults': { nb: 'Ingen treff', en: 'No results' },
  'quicksearch.showAll': { nb: 'Vis alle treff', en: 'Show all results' },

  // Search results page
  'results.title': { nb: 'Søkeresultater', en: 'Search results' },
  'results.back': { nb: 'Tilbake til forsiden', en: 'Back to home' },
  'results.search.placeholder': { nb: 'Søk etter tjenester og tilgangspakker...', en: 'Search for services and access packages...' },
  'results.search.aria': { nb: 'Søk etter tjenester og tilgangspakker', en: 'Search for services and access packages' },
  'results.services': { nb: 'Tjenester', en: 'Services' },
  'results.packages': { nb: 'Tilgangspakker', en: 'Access packages' },
  'results.noResults': { nb: 'Ingen treff for', en: 'No results for' },
  'results.empty': { nb: 'Skriv inn minst to tegn for å søke.', en: 'Enter at least two characters to search.' },
  'results.filterByType': { nb: 'Filtrer på tjenestetype', en: 'Filter by service type' },
  'results.showAllTypes': { nb: 'Vis alle typer', en: 'Show all types' },
  'results.noTypeMatch': { nb: 'Ingen tjenester samsvarer med valgte filtre.', en: 'No services match the selected filters.' },
  'results.filterByStatus': { nb: 'Filtrer på status', en: 'Filter by status' },
  'results.showAllStatuses': { nb: 'Vis alle statuser', en: 'Show all statuses' },
  'results.filterByOwner': { nb: 'Filtrer på tjenesteeier', en: 'Filter by service owner' },
  'results.showAllOwners': { nb: 'Vis alle tjenesteeiere', en: 'Show all service owners' },

  // Advanced Search tab
  'home.tabs.search': { nb: 'Avansert søk', en: 'Advanced search' },
  'search.placeholder': { nb: 'Søk i tittel, beskrivelse, identifikator...', en: 'Search title, description, identifier...' },
  'search.aria': { nb: 'Søk i tjenester', en: 'Search services' },
  'search.filters': { nb: 'Filtre', en: 'Filters' },
  'search.resourceType': { nb: 'Tjenestetype', en: 'Resource type' },
  'search.status': { nb: 'Status', en: 'Status' },
  'search.allStatuses': { nb: 'Alle statuser', en: 'All statuses' },
  'search.availableFor': { nb: 'Tilgjengelig for', en: 'Available for' },
  'search.properties': { nb: 'Egenskaper', en: 'Properties' },
  'search.onlyDelegable': { nb: 'Kun delegerbare', en: 'Delegable only' },
  'search.onlyVisible': { nb: 'Kun synlige', en: 'Visible only' },
  'search.selfIdentified': { nb: 'Selvidentifiserte brukere', en: 'Self-identified users' },
  'search.enterpriseUsers': { nb: 'Virksomhetsbrukere', en: 'Enterprise users' },
  'search.accessListEnabled': { nb: 'Tilgangsliste aktivert', en: 'Access list enabled' },
  'search.migratedFromAltinn2': { nb: 'Migrert fra Altinn 2', en: 'Migrated from Altinn 2' },
  'search.altinnStudioApps': { nb: 'Kun Altinn Studio-apper', en: 'Only Altinn Studio apps' },
  'search.migratedApps': { nb: 'Kun migrerte apper', en: 'Only migrated apps' },
  'search.serviceOwner': { nb: 'Tjenesteeier', en: 'Service owner' },
  'search.allOwners': { nb: 'Alle tjenesteeiere', en: 'All service owners' },
  'search.clearFilters': { nb: 'Nullstill filtre', en: 'Clear filters' },
  'search.results': { nb: 'tjenester', en: 'services' },
  'search.noResults': { nb: 'Ingen tjenester samsvarer med filtrene dine.', en: 'No services match your filters.' },
  'search.showing': { nb: 'Viser', en: 'Showing' },
  'search.of': { nb: 'av', en: 'of' },
  // Resource type labels
  'resourceType.Default': { nb: 'Standard', en: 'Default' },
  'resourceType.Systemresource': { nb: 'Systemressurs', en: 'System resource' },
  'resourceType.MaskinportenSchema': { nb: 'Maskinporten-skjema', en: 'Maskinporten schema' },
  'resourceType.Altinn2Service': { nb: 'Altinn 2-tjeneste', en: 'Altinn 2 service' },
  'resourceType.AltinnApp': { nb: 'Altinn-app', en: 'Altinn app' },
  'resourceType.MigratedApp': { nb: 'Migrert Arkiv App', en: 'Migrated Archive App' },
  'resourceType.GenericAccessResource': { nb: 'Generell tilgangsressurs', en: 'Generic access resource' },
  'resourceType.BrokerService': { nb: 'Meldingsformidler', en: 'Broker service' },
  'resourceType.CorrespondenceService': { nb: 'Korrespondansetjeneste', en: 'Correspondence service' },
  'resourceType.Consent': { nb: 'Samtykke', en: 'Consent' },

  // Resource type descriptions
  'resourceType.description.Default': {
    nb: 'Standard ressurstype i Altinn. Brukes for generelle tilganger som ikke faller inn under en mer spesifikk kategori.',
    en: 'Standard resource type in Altinn. Used for general access rights that do not fit into a more specific category.',
  },
  'resourceType.description.Systemresource': {
    nb: 'Representerer tilganger for tekniske systemer og integrasjoner. Brukes typisk ved maskin-til-maskin-kommunikasjon der et system handler på vegne av en virksomhet.',
    en: 'Represents access rights for technical systems and integrations. Typically used for machine-to-machine communication where a system acts on behalf of an organisation.',
  },
  'resourceType.description.MaskinportenSchema': {
    nb: 'Et Maskinporten-skjema gir virksomheter tilgang til API-er basert på virksomhetssertifikater via Maskinporten. Benyttes for sikker og standardisert maskin-til-maskin-kommunikasjon.',
    en: 'A Maskinporten schema grants organisations access to APIs based on business certificates via Maskinporten. Used for secure, standardised machine-to-machine communication.',
  },
  'resourceType.description.Altinn2Service': {
    nb: 'En tjeneste opprinnelig utviklet i Altinn 2-plattformen. Disse tjenestene er registrert i ressursregisteret og kan fortsatt være i aktiv bruk.',
    en: 'A service originally developed in the Altinn 2 platform. These services are registered in the resource registry and may still be in active use.',
  },
  'resourceType.description.AltinnApp': {
    nb: 'En applikasjon bygget i Altinn Studio – den moderne plattformen for utvikling av offentlige digitale tjenester. Altinn-apper håndterer skjema, innsending og saksbehandling.',
    en: 'An application built in Altinn Studio – the modern platform for developing public digital services. Altinn apps handle forms, submissions and case processing.',
  },
  'resourceType.description.MigratedApp': {
    nb: 'Brukes for å gi tilgang til arkiverte data fra Altinn 2-plattformen. Tjenesten er ikke lenger aktiv, men dataene er flyttet over til Altinn-plattformen og kan fortsatt hentes ut.',
    en: 'Used to grant access to archived data from the Altinn 2 platform. The service is no longer active, but the data has been moved to the Altinn platform and can still be retrieved.',
  },
  'resourceType.description.GenericAccessResource': {
    nb: 'En generell tilgangsressurs som styrer hvem som har rett til å utføre bestemte handlinger, uten å være knyttet til en spesifikk tjenestetype.',
    en: 'A generic access resource that controls who is authorised to perform specific actions, without being tied to a specific service type.',
  },
  'resourceType.description.BrokerService': {
    nb: 'En meldingsformidlingstjeneste som lar virksomheter utveksle filer og meldinger sikkert via Altinn Formidling.',
    en: 'A message broker service that allows organisations to securely exchange files and messages via Altinn Broker.',
  },
  'resourceType.description.CorrespondenceService': {
    nb: 'En korrespondansetjeneste for sikker digital kommunikasjon mellom det offentlige og innbyggere eller virksomheter, for eksempel varsler og meldinger i innboksen.',
    en: 'A correspondence service for secure digital communication between public bodies and citizens or organisations, such as notifications and messages in the inbox.',
  },
  'resourceType.description.Consent': {
    nb: 'En samtykkeressurs der brukeren aktivt gir tillatelse til at en tredjepart kan hente informasjon eller utføre handlinger på brukerens vegne.',
    en: 'A consent resource where the user actively grants permission for a third party to retrieve information or perform actions on their behalf.',
  },
  // Party type labels
  'partyType.PrivatePerson': { nb: 'Privatperson', en: 'Private person' },
  'partyType.LegalEntityEnterprise': { nb: 'Juridisk enhet/Foretak', en: 'Legal entity/Enterprise' },
  'partyType.Company': { nb: 'Virksomhet', en: 'Company' },
  'partyType.BankruptcyEstate': { nb: 'Konkursbo', en: 'Bankruptcy estate' },
  'partyType.SelfRegisteredUser': { nb: 'Selvregistrert bruker', en: 'Self-registered user' },

  // AboutPage
  'about.title': { nb: 'Om tjenesteoversikten.no', en: 'About tjenesteoversikten.no' },
  'about.welcome': { nb: 'Velkommen til tjenesteoversikten.no', en: 'Welcome to tjenesteoversikten.no' },
  'about.description': {
    nb: 'Tjenesteoversikten.no gir deg en samlet oversikt over både digitale og analoge tjenester som er registrert i Altinn Ressursregister. Her kan du enkelt finne nøkkelinformasjon om hver tjeneste – blant annet beskrivelse, kontaktinformasjon og hvilke rettighetskrav som gjelder.',
    en: 'Tjenesteoversikten.no gives you a comprehensive overview of both digital and analogue services registered in the Altinn Resource Registry. Here you can easily find key information about each service – including description, contact information and applicable authorisation requirements.',
  },
  'about.openApi': {
    nb: 'Løsningen er bygget utelukkende på åpne API-er som Altinn tilbyr.',
    en: 'The solution is built exclusively on open APIs provided by Altinn.',
  },
  'about.sourceCode': { nb: 'Kildekoden er tilgjengelig på GitHub:', en: 'The source code is available on GitHub:' },
  'about.purpose': {
    nb: 'Denne siden er laget for å demonstrere mulighetene med Altinn sine åpne API-er.',
    en: 'This site is created to demonstrate the possibilities with Altinn\'s open APIs.',
  },
  'about.team': {
    nb: 'Den er utviklet av teamet bak Altinn Ressursregister, men er ikke et offisielt støttet produkt.',
    en: 'It is developed by the team behind Altinn Resource Registry, but is not an officially supported product.',
  },

  // Theme
  'theme.light': { nb: 'Lys', en: 'Light' },
  'theme.dark': { nb: 'Mørk', en: 'Dark' },
  'theme.auto': { nb: 'Auto', en: 'Auto' },

  // Common
  'yes': { nb: 'Ja', en: 'Yes' },
  'no': { nb: 'Nei', en: 'No' },
  'loading': { nb: 'Laster...', en: 'Loading...' },
  'error.loadOrgs': { nb: 'Kunne ikke laste etater', en: 'Could not load agencies' },
  'error.loadData': { nb: 'Kunne ikke laste data', en: 'Could not load data' },
  'error.loadResource': { nb: 'Kunne ikke laste ressurs', en: 'Could not load resource' },

  // Statistics tab
  'home.tabs.statistics': { nb: 'Statistikk', en: 'Statistics' },
  'stats.title': { nb: 'Sikkerhetsnivå for Altinn Studio-apper', en: 'Security level for Altinn Studio apps' },
  'stats.description': { nb: 'Henter sikkerhetsnivå fra XACML-policy for alle Altinn Studio-apper (ekskluderer migrerte Altinn 2-apper).', en: 'Fetches security level from XACML policy for all Altinn Studio apps (excludes migrated Altinn 2 apps).' },
  'stats.calculate': { nb: 'Beregn statistikk', en: 'Calculate statistics' },
  'stats.calculating': { nb: 'Henter policyer og beregner...', en: 'Fetching policies and calculating...' },
  'stats.progress': { nb: 'Behandlet {progress} av {total}...', en: 'Processed {progress} of {total}...' },
  'stats.totalApps': { nb: 'Totalt Altinn Studio-apper', en: 'Total Altinn Studio apps' },
  'stats.level4': { nb: 'Sikkerhetsnivå 4', en: 'Security level 4' },
  'stats.level3': { nb: 'Sikkerhetsnivå 3', en: 'Security level 3' },
  'stats.level2': { nb: 'Sikkerhetsnivå 2', en: 'Security level 2' },
  'stats.other': { nb: 'Annet / ikke satt', en: 'Other / not set' },
  'stats.errors': { nb: 'Feil ved henting', en: 'Errors fetching' },
  'stats.apps': { nb: 'apper', en: 'apps' },
  'stats.showList': { nb: 'Vis liste', en: 'Show list' },
  'stats.hideList': { nb: 'Skjul liste', en: 'Hide list' },

  // Delegation wizard
  'wizard.cta.title': { nb: 'Finn riktig tilgangspakke å delegere', en: 'Find the right access package to delegate' },
  'wizard.cta.description': {
    nb: 'Usikker på hvilken tilgangspakke du må delegere? Start med tjenesten brukeren trenger tilgang til, så viser vi pakkene som gir tilgang.',
    en: 'Not sure which access package to delegate? Start with the service the user needs access to, and we\'ll show you the packages that grant it.',
  },
  'wizard.cta.button': { nb: 'Start veiviseren', en: 'Start the wizard' },
  'wizard.title': { nb: 'Tilgangspakke-veiviser', en: 'Access package wizard' },
  'wizard.intro': {
    nb: 'Denne veiviseren hjelper deg å finne hvilken tilgangspakke du må delegere for at noen skal få tilgang til en bestemt tjeneste.',
    en: 'This wizard helps you find which access package to delegate so someone can access a specific service.',
  },
  'wizard.step1.label': { nb: 'Steg 1', en: 'Step 1' },
  'wizard.step1.title': { nb: 'Velg tjenesten det skal gis tilgang til', en: 'Choose the service to grant access to' },
  'wizard.step1.placeholder': { nb: 'Søk etter tjenestenavn eller identifikator...', en: 'Search by service name or identifier...' },
  'wizard.step1.aria': { nb: 'Søk etter tjeneste', en: 'Search for service' },
  'wizard.step1.hint': { nb: 'Skriv minst 2 tegn for å søke.', en: 'Type at least 2 characters to search.' },
  'wizard.step1.hideOld': { nb: 'Skjul tjenester fra gammel Altinn', en: 'Hide services from old Altinn' },
  'wizard.step1.noResults': { nb: 'Ingen tjenester samsvarer med søket ditt.', en: 'No services match your search.' },
  'wizard.step1.showingOf': { nb: 'Viser {shown} av {total} treff', en: 'Showing {shown} of {total} matches' },
  'wizard.step2.label': { nb: 'Steg 2', en: 'Step 2' },
  'wizard.step2.title': { nb: 'Tilgangspakker som gir tilgang', en: 'Access packages that grant access' },
  'wizard.selectedService': { nb: 'Valgt tjeneste', en: 'Selected service' },
  'wizard.changeService': { nb: 'Bytt tjeneste', en: 'Change service' },
  'wizard.loadingPackages': { nb: 'Henter tilgangspakker...', en: 'Fetching access packages...' },
  'wizard.resultCount': { nb: 'Fant {count} tilgangspakke(r) som gir tilgang til denne tjenesten.', en: 'Found {count} access package(s) that grant access to this service.' },
  'wizard.delegateThis': { nb: 'Deleger denne pakken for å gi tilgang til tjenesten.', en: 'Delegate this package to grant access to the service.' },
  'wizard.viewPackage': { nb: 'Se detaljer om pakken', en: 'View package details' },
  'wizard.viewService': { nb: 'Se detaljer om tjenesten', en: 'View service details' },
  'wizard.actions': { nb: 'Handlinger', en: 'Actions' },
  'wizard.notDelegableAlert': {
    nb: 'Denne tjenesten er merket som ikke delegerbar. Tilgangspakker kan likevel være knyttet til tjenesten, men selve tjenesten kan ikke delegeres av sluttbruker.',
    en: 'This service is marked as not delegable. Access packages may still be associated with it, but the service itself cannot be delegated by end users.',
  },
  'wizard.noPackagesTitle': { nb: 'Ingen tilgangspakker tilknyttet', en: 'No access packages assigned' },
  'wizard.noPackagesBody': {
    nb: 'Denne tjenesten har ingen tilgangspakker knyttet til seg ennå. Det betyr at du ikke kan delegere tilgang til den via en tilgangspakke. Kontakt tjenesteeier for å be om at en egnet tilgangspakke blir lagt til, eller se om tjenesten kan nås via en rolle.',
    en: 'This service does not yet have any access packages assigned. That means you cannot delegate access to it via an access package. Contact the service owner to request a suitable access package be added, or check whether the service can be reached via a role.',
  },
  'wizard.noPackagesSeeRoles': { nb: 'Se tjenestens rolletildelinger', en: 'View the service\'s role assignments' },
  'wizard.tryAnother': { nb: 'Prøv en annen tjeneste', en: 'Try another service' },
  'wizard.error.loadRules': { nb: 'Kunne ikke hente tilgangspakker for tjenesten', en: 'Could not load access packages for the service' },
  'wizard.resourceNotFound': { nb: 'Fant ikke tjenesten.', en: 'Service not found.' },

  // Resource statistics (non-app)
  'stats.res.title': { nb: 'Sikkerhetsnivå for andre ressurser', en: 'Security level for other resources' },
  'stats.res.description': { nb: 'Henter sikkerhetsnivå fra XACML-policy for alle ressurser som ikke er Altinn-apper.', en: 'Fetches security level from XACML policy for all resources that are not Altinn apps.' },
  'stats.res.calculate': { nb: 'Beregn statistikk for ressurser', en: 'Calculate statistics for resources' },
  'stats.res.calculating': { nb: 'Henter policyer for ressurser og beregner...', en: 'Fetching policies for resources and calculating...' },
  'stats.res.total': { nb: 'Totalt ressurser', en: 'Total resources' },
  'stats.res.errors': { nb: 'Feil ved henting', en: 'Errors fetching' },
  'stats.res.resources': { nb: 'ressurser', en: 'resources' },
  'stats.ap.title': { nb: 'Policyer uten tilgangspakker', en: 'Policies without access packages' },
  'stats.ap.description': { nb: 'Identifiserer ressurser hvis policy ikke har noen tilgangspakker som subjekt (kun roller, eller ingen subjekter).', en: 'Identifies resources whose policy has no access packages as subject (roles only, or no subjects at all).' },
  'stats.ap.calculate': { nb: 'Beregn statistikk for tilgangspakker', en: 'Calculate access package statistics' },
  'stats.ap.calculating': { nb: 'Henter policy-subjekter og beregner...', en: 'Fetching policy subjects and calculating...' },
  'stats.ap.total': { nb: 'Totalt policyer', en: 'Total policies' },
  'stats.ap.with': { nb: 'Med tilgangspakker', en: 'With access packages' },
  'stats.ap.without': { nb: 'Uten tilgangspakker', en: 'Without access packages' },
  'stats.ap.errors': { nb: 'Feil ved henting', en: 'Errors fetching' },
  'stats.ap.resources': { nb: 'ressurser', en: 'resources' },
  'stats.ap.noSubjects': { nb: 'Ingen subjekter', en: 'No subjects' },
  'stats.ap.onlyRoles': { nb: 'Kun roller', en: 'Roles only' },
  'stats.ap.downloadCsv': { nb: 'Last ned CSV', en: 'Download CSV' },
  'stats.ap.reloadXacml': { nb: 'Last på nytt fra XACML', en: 'Reload from XACML' },
  // Case-sensitive policy matching
  'stats.cs.title': { nb: 'Case-sensitiv policy-matching', en: 'Case-sensitive policy matching' },
  'stats.cs.description': { nb: 'Finner policyer som matcher rolle, handling eller tilgangspakke case-sensitivt (string-equal) i stedet for case-insensitivt (string-equal-ignore-case). Slik matching kan feile når verdien kommer inn med annen bokstavstørrelse. Ressurs-identitet (org/app) matches alltid case-sensitivt og regnes ikke som feil.', en: 'Finds policies that match role, action or access package case-sensitively (string-equal) instead of case-insensitively (string-equal-ignore-case). Such matching can fail when the value arrives with different casing. Resource identity (org/app) is always matched case-sensitively and is not counted as an issue.' },
  'stats.cs.calculate': { nb: 'Beregn statistikk for case-sensitivitet', en: 'Calculate case-sensitivity statistics' },
  'stats.cs.calculating': { nb: 'Henter og analyserer XACML-policyer...', en: 'Fetching and analysing XACML policies...' },
  'stats.cs.total': { nb: 'Totalt policyer', en: 'Total policies' },
  'stats.cs.withIssues': { nb: 'Med case-sensitiv matching', en: 'With case-sensitive matching' },
  'stats.cs.roleIssues': { nb: 'Rolle', en: 'Role' },
  'stats.cs.actionIssues': { nb: 'Handling', en: 'Action' },
  'stats.cs.apIssues': { nb: 'Tilgangspakke', en: 'Access package' },
  'stats.cs.errors': { nb: 'Feil ved henting', en: 'Errors fetching' },
  'stats.cs.affected': { nb: 'Berørte ressurser/apper', en: 'Affected resources/apps' },
  'stats.cs.downloadCsv': { nb: 'Last ned CSV', en: 'Download CSV' },
  'stats.cs.reloadXacml': { nb: 'Last på nytt fra XACML', en: 'Reload from XACML' },
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('lang');
    return saved === 'en' ? 'en' : 'nb';
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key: string): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['nb'] || key;
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
