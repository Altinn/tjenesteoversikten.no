import CatalogueNavigation from '../components/CatalogueNavigation';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AreaDto, AreaGroupDto, Org, OrgList, PackageDto, PolicyStatistics as PolicyStatisticsData, ResourceSummary, RoleDto } from '../types';
import { fetchPackageGroupsBilingual, getLocalizedAreaName, getLocalizedGroupName, getLocalizedPackageName, getText, packagePath } from '../helpers';
import { isRetiredService, retiredLabel, splitRetired } from '../serviceVisibility';
import RetiredServicesNotice from '../components/RetiredServicesNotice';
import { useEnv } from '../env';
import { useLang } from '../lang';
import { getResourceTypeColor } from '../resourceTypes';
const TAB_PATHS: Record<string, string> = { '/': 'owners', '/owners': 'owners', '/types': 'types', '/packages': 'packages', '/roles': 'roles', '/keywords': 'keywords', '/statistics': 'statistics', '/search': 'search' };
type Dataset = 'orgs' | 'resources' | 'groups' | 'roles' | 'keywords';

function SearchIcon() { return <svg className="search-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.8-3.8" /></svg>; }
function initials(value: string) { return value.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase(); }

function OwnerLogo({ org, code, lang }: { org: Org; code: string; lang: string }) {
  const [failed, setFailed] = useState(false);
  const name = getText(org.name, lang);
  if (!org.logo || failed) return <span className="initial-tile">{initials(name || code)}</span>;
  return <span className="owner-logo"><img src={org.logo} alt="" onError={() => setFailed(true)} /></span>;
}

export default function HomePage() {
  const { lang, t } = useLang();
  const { env } = useEnv();
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = TAB_PATHS[location.pathname] ?? 'owners';
  const [orgs, setOrgs] = useState<Record<string, Org>>({});
  const [resources, setResources] = useState<ResourceSummary[]>([]);
  const [groups, setGroups] = useState<AreaGroupDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loaded, setLoaded] = useState<Record<Dataset, boolean>>({ orgs: false, resources: false, groups: false, roles: false, keywords: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [heroQuery, setHeroQuery] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedPackageArea, setSelectedPackageArea] = useState<string | null>(null);
  const [showRetired, setShowRetired] = useState(false);

  const copy = lang === 'nb' ? {
    title: 'Hele det digitale tjeneste-Norge. Ett sted.',
    intro: 'Utforsk alle tjenester registrert i Altinns ressursregister — hvem som eier dem, hvilke roller og tilgangspakker som gir tilgang, og hvilke krav de stiller.',
    placeholder: 'Søk etter tjeneste, tjenesteeier eller nøkkelord …', search: 'Søk',
    stats: ['tjenester', 'tjenesteeiere', 'tilgangspakker', 'roller', 'nøkkelord'],
    tabs: { owners: 'Tjenesteeiere', types: 'Ressurstyper', packages: 'Tilgangspakker', roles: 'Roller', keywords: 'Nøkkelord', statistics: 'Statistikk', search: 'Avansert søk' },
    filters: { owners: 'Filtrer tjenesteeiere …', packages: 'Filtrer tilgangspakker …', roles: 'Filtrer roller …', keywords: 'Filtrer nøkkelord …' },
    services: 'tjenester', packages: 'pakker', results: 'treff', distribution: 'Fordeling etter ressurstype', noResults: 'Ingen treff.', loading: 'Laster …', loadError: 'Kunne ikke hente data',
  } : {
    title: 'All of digital Norway. One place.',
    intro: 'Explore every service registered in the Altinn resource registry — who owns them, which roles and access packages grant access, and what they require.',
    placeholder: 'Search for a service, owner or keyword …', search: 'Search',
    stats: ['services', 'service owners', 'access packages', 'roles', 'keywords'],
    tabs: { owners: 'Service owners', types: 'Resource types', packages: 'Access packages', roles: 'Roles', keywords: 'Keywords', statistics: 'Statistics', search: 'Advanced search' },
    filters: { owners: 'Filter service owners …', packages: 'Filter access packages …', roles: 'Filter roles …', keywords: 'Filter keywords …' },
    services: 'services', packages: 'packages', results: 'results', distribution: 'Distribution by resource type', noResults: 'No results.', loading: 'Loading …', loadError: 'Could not load data',
  };

  useEffect(() => {
    let cancelled = false;
    const apply = <T,>(dataset: Dataset, setter: (data: T) => void) => (data: T) => {
      if (cancelled) return;
      setter(data);
      setLoaded((current) => ({ ...current, [dataset]: true }));
    };

    const requests = [
      fetchJson<OrgList>(`/api/v1/${env}/resource/orgs`)
        .then((data) => apply<Record<string, Org>>('orgs', setOrgs)(data.orgs ?? {})),
      fetchJson<ResourceSummary[]>(`/api/v1/${env}/resource/resourcelist/summary?includeApps=true&includeAltinn2=true`)
        .then(apply('resources', setResources)),
      fetchPackageGroupsBilingual(env)
        .then(apply('groups', setGroups)),
      fetchJson<RoleDto[]>(`/api/v1/${env}/meta/info/roles`)
        .then(apply('roles', setRoles)),
      fetchJson<string[]>(`/api/v1/${env}/resource/keywords?includeApps=true&includeAltinn2=true`)
        .then(apply('keywords', setKeywords)),
    ];

    Promise.allSettled(requests).then((results) => {
      if (cancelled) return;
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      setError(failures.map((failure) => failure.reason instanceof Error ? failure.reason.message : String(failure.reason)).join(', '));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [env]);

  const packageCount = useMemo(() => groups.reduce((sum, g) => sum + (g.areas ?? []).reduce((n, a) => n + (a.packages?.length ?? 0), 0), 0), [groups]);
  const ownerCounts = useMemo(() => resources.reduce<Record<string, number>>((acc, r) => { const code = r.hasCompetentAuthority?.orgcode?.toLowerCase(); if (code) acc[code] = (acc[code] ?? 0) + 1; return acc; }, {}), [resources]);
  const typeStats = useMemo(() => { const counts: Record<string, number> = {}; resources.forEach((r) => { counts[r.resourceType] = (counts[r.resourceType] ?? 0) + 1; }); return Object.entries(counts).sort((a, b) => b[1] - a[1]); }, [resources]);
  const q = filterQuery.trim().toLowerCase();
  const packageAreas = useMemo(() => groups.flatMap((group) => (group.areas ?? []).map((area) => ({ area, group }))), [groups]);
  const selectedArea = packageAreas.find(({ area }) => area.id === selectedPackageArea) ?? null;
  const matchingPackages = useMemo(() => packageAreas.flatMap(({ area, group }) => (area.packages ?? [])
    .filter((pkg) => !q || `${pkg.name} ${pkg.nameEn ?? ''} ${pkg.description}`.toLowerCase().includes(q))
    .map((pkg) => ({ pkg, area, group }))), [packageAreas, q]);
  const owners = useMemo(() => Object.entries(orgs).map(([code, org]) => ({ code, org })).filter(({ code, org }) => !q || code.toLowerCase().includes(q) || getText(org.name, lang).toLowerCase().includes(q)).sort((a, b) => getText(a.org.name, lang).localeCompare(getText(b.org.name, lang))), [orgs, q, lang]);
  // Hidden and retired services rank last in the quick suggestions instead of crowding out live ones
  const heroResults = useMemo(() => { const hq = heroQuery.trim().toLowerCase(); if (hq.length < 2) return []; return resources.filter((r) => `${getText(r.title, lang)} ${getText(r.description, lang)} ${r.identifier} ${getText(r.hasCompetentAuthority?.name, lang)}`.toLowerCase().includes(hq)).sort((a, b) => Number(isRetiredService(a)) - Number(isRetiredService(b))).slice(0, 6); }, [heroQuery, resources, lang]);
  const searchResults = useMemo(() => resources.filter((r) => (!q || `${getText(r.title, lang)} ${getText(r.description, lang)} ${r.identifier}`.toLowerCase().includes(q)) && (!selectedTypes.length || selectedTypes.includes(r.resourceType))), [resources, q, selectedTypes, lang]);
  const { active: activeSearchResults, retired: retiredSearchResults } = useMemo(() => splitRetired(searchResults, (r) => r), [searchResults]);
  const shownSearchResults = showRetired ? [...activeSearchResults, ...retiredSearchResults] : activeSearchResults;
  const format = (n: number) => new Intl.NumberFormat(lang === 'nb' ? 'nb-NO' : 'en-GB').format(n);
  const statValues: (number | null)[] = [
    loaded.resources ? resources.length : null,
    loaded.orgs ? Object.keys(orgs).length : null,
    loaded.groups ? packageCount : null,
    loaded.roles ? roles.length : null,
    loaded.keywords ? keywords.length : null,
  ];
  const submitHero = () => heroQuery.trim().length >= 2 && navigate(`/results?q=${encodeURIComponent(heroQuery.trim())}`);

  return <div className="home-page fade-up">
    <section className="hero">
      <div className="hero-image-panel">
        <div className="hero-copy">
          <h1>{copy.title}</h1><p>{copy.intro}</p>
          <div className="hero-search-wrap">
            <div className="hero-search-row"><label className="hero-search"><SearchIcon /><input value={heroQuery} onChange={(e) => setHeroQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitHero()} placeholder={copy.placeholder} aria-label={copy.placeholder} /></label><button className="primary-button" onClick={submitHero}>{copy.search}</button></div>
            {heroQuery.trim().length >= 2 && <div className="search-dropdown">{heroResults.map((r) => <Link to={`/resource/${encodeURIComponent(r.identifier)}`} key={r.identifier} className={isRetiredService(r) ? 'is-retired' : undefined}><span className={`type-chip type-${r.resourceType}`}>{r.resourceType}</span><strong>{getText(r.title, lang)}{isRetiredService(r) && <span className="retired-chip">{retiredLabel(r, t('resource.notVisible'))}</span>}</strong><small>{getText(r.hasCompetentAuthority?.name, lang)}</small></Link>)}{!heroResults.length && <div className="empty-row">{copy.noResults}</div>}</div>}
          </div>
        </div>
      </div>
      <div className="hero-stats section-inner">{statValues.map((value, i) => <div className="stat-card" key={copy.stats[i]}><strong>{value === null ? '—' : format(value)}</strong><span>{copy.stats[i]}</span></div>)}</div>
    </section>

    <section className="catalogue-section">
      <CatalogueNavigation />
      <div className="tab-content section-inner">
        {error && <div className="notice">{copy.loadError} ({error}).</div>}
        {activeTab === 'owners' && <><Filter value={filterQuery} setValue={setFilterQuery} placeholder={copy.filters.owners} /><div className="owner-grid">{owners.map(({ code, org }) => <Link className="owner-card" to={`/org/${code}`} key={code}><OwnerLogo org={org} code={code} lang={lang} /><strong>{getText(org.name, lang)}</strong><span>{format(ownerCounts[code.toLowerCase()] ?? 0)} {copy.services}</span></Link>)}</div></>}
        {activeTab === 'types' && <><Distribution stats={typeStats} /><div className="type-grid">{typeStats.map(([type, count]) => <Link to={`/type/${encodeURIComponent(type)}`} className="type-card" key={type}><div><i style={{ background: getResourceTypeColor(type) }} /><strong>{type}</strong></div><b>{format(count)}</b><p>{lang === 'nb' ? `Registrerte tjenester av typen ${type}.` : `Registered services of type ${type}.`}</p></Link>)}</div></>}
        {activeTab === 'packages' && <>
          <Filter value={filterQuery} setValue={setFilterQuery} placeholder={copy.filters.packages} />
          {q ? (
            <PackageLinks items={matchingPackages} lang={lang} heading={`${format(matchingPackages.length)} ${copy.results}`} />
          ) : selectedArea ? (
            <div className="package-browser">
              <button className="package-browser-back" onClick={() => setSelectedPackageArea(null)}>← {lang === 'nb' ? 'Alle områder' : 'All areas'}</button>
              <div className="package-browser-header"><span className="initial-tile">{initials(getLocalizedAreaName(selectedArea.area, lang))}</span><div><h2>{getLocalizedAreaName(selectedArea.area, lang)}</h2><p>{getLocalizedGroupName(selectedArea.group, lang)} · {selectedArea.area.packages?.length ?? 0} {copy.packages}</p></div></div>
              <PackageLinks items={(selectedArea.area.packages ?? []).map((pkg) => ({ pkg, area: selectedArea.area, group: selectedArea.group }))} lang={lang} />
            </div>
          ) : (
            <div className="package-groups">{groups.map((group) => <section key={group.id}><h2>{getLocalizedGroupName(group, lang)}</h2><div className="area-grid">{(group.areas ?? []).map((area) => <button className="package-area-card" onClick={() => setSelectedPackageArea(area.id)} key={area.id}><span className="initial-tile">{initials(getLocalizedAreaName(area, lang))}</span><div><strong>{getLocalizedAreaName(area, lang)}</strong><small>{area.packages?.length ?? 0} {copy.packages}</small></div><span className="chevron">›</span></button>)}</div></section>)}</div>
          )}
        </>}
        {activeTab === 'roles' && <><Filter value={filterQuery} setValue={setFilterQuery} placeholder={copy.filters.roles} /><RoleGroups roles={roles.filter((r) => !q || `${r.name} ${r.code} ${r.description}`.toLowerCase().includes(q))} /></>}
        {activeTab === 'keywords' && <><Filter value={filterQuery} setValue={setFilterQuery} placeholder={copy.filters.keywords} /><div className="keyword-cloud">{keywords.filter((word) => !q || word.toLowerCase().includes(q)).map((word) => <Link to={`/keyword/${encodeURIComponent(word)}`} key={word}>{word}</Link>)}</div></>}
        {activeTab === 'statistics' && <Statistics resources={resources} typeStats={typeStats} lang={lang} format={format} distribution={copy.distribution} env={env} />}
        {activeTab === 'search' && <><Filter value={filterQuery} setValue={setFilterQuery} placeholder={copy.placeholder} wide /><div className="filter-chips">{typeStats.map(([type]) => <button className={selectedTypes.includes(type) ? 'active' : ''} onClick={() => setSelectedTypes((old) => old.includes(type) ? old.filter((x) => x !== type) : [...old, type])} key={type}>{type}</button>)}</div><div className="results-count">{format(shownSearchResults.length)} {copy.results}</div><RetiredServicesNotice count={retiredSearchResults.length} expanded={showRetired} onToggle={() => setShowRetired((on) => !on)} /><div className="result-list">{shownSearchResults.slice(0, 100).map((r) => <Link to={`/resource/${encodeURIComponent(r.identifier)}`} key={r.identifier} className={isRetiredService(r) ? 'is-retired' : undefined}><span className={`type-chip type-${r.resourceType}`}>{r.resourceType}</span><div><strong>{getText(r.title, lang)}{isRetiredService(r) && <span className="retired-chip">{retiredLabel(r, t('resource.notVisible'))}</span>}</strong><p>{getText(r.description, lang)}</p></div><small>{getText(r.hasCompetentAuthority?.name, lang)}</small><span className="chevron">›</span></Link>)}</div></>}
        {loading && <div className="loading-state" aria-live="polite">{copy.loading}</div>}
      </div>
    </section>
  </div>;
}

function Filter({ value, setValue, placeholder, wide = false }: { value: string; setValue: (value: string) => void; placeholder: string; wide?: boolean }) { return <label className={`filter-input${wide ? ' wide' : ''}`}><SearchIcon /><input value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} aria-label={placeholder} /></label>; }

async function fetchJson<T>(url: string, retries = 1): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const contentType = response.headers.get('content-type') ?? '';

    if (response.ok && contentType.includes('json'))
      return response.json() as Promise<T>;

    const transient = response.status >= 500 || (response.ok && !contentType.includes('json'));
    if (transient && attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      continue;
    }

    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText}`);

    throw new Error(`Expected JSON but received ${contentType || 'an unknown content type'}`);
  }
}

const ALGORITHM_COLORS = ['#4098E8', '#9B7BE8', '#E07732', '#37C08B', '#D96A6A', '#C25B9B'];
function getAlgorithmColor(algorithm: string) {
  const hash = [...algorithm].reduce((value, character) => value + character.charCodeAt(0), 0);
  return ALGORITHM_COLORS[hash % ALGORITHM_COLORS.length];
}
function Distribution({ stats, colorFor = getResourceTypeColor }: { stats: [string, number][]; colorFor?: (value: string) => string }) { return <div className="distribution" aria-hidden="true">{stats.map(([type, count]) => <span key={type} style={{ flex: count, background: colorFor(type) }} />)}</div>; }
function PackageLinks({ items, lang, heading }: { items: { pkg: PackageDto; area: AreaDto; group: AreaGroupDto }[]; lang: string; heading?: string }) {
  return <div className="package-links-wrap">{heading && <div className="results-count">{heading}</div>}<div className="package-link-grid">{items.map(({ pkg, area }) => <Link className="package-link-card" to={packagePath(pkg)} state={{ pkg }} key={pkg.id}><div><strong>{getLocalizedPackageName(pkg, lang)}</strong><small>{getLocalizedAreaName(area, lang)}</small></div><span className="chevron">›</span></Link>)}</div></div>;
}
function RoleGroups({ roles }: { roles: RoleDto[] }) { const groups = useMemo(() => { const map = new Map<string, RoleDto[]>(); roles.forEach((r) => { const key = r.provider?.name ?? 'Altinn'; map.set(key, [...(map.get(key) ?? []), r]); }); return [...map.entries()]; }, [roles]); return <div className="role-groups">{groups.map(([provider, items]) => <section key={provider}><h2>{provider}</h2><div className="role-list">{items.map((r) => <Link to={`/role/${r.id}`} key={r.id}><strong>{r.name}</strong><span>{r.description}</span><code>{r.code}</code></Link>)}</div></section>)}</div>; }
function Statistics({ resources, typeStats, lang, format, distribution, env }: { resources: ResourceSummary[]; typeStats: [string, number][]; lang: string; format: (n: number) => string; distribution: string; env: string }) {
  const delegable = resources.filter((r) => r.delegable).length, visible = resources.filter((r) => r.visible).length, active = resources.filter((r) => r.status?.toLowerCase() === 'active').length;
  const percent = (n: number) => resources.length ? Math.round(n / resources.length * 100) : 0;
  const cards: [string, number, string][] = lang === 'nb' ? [['Delegerbare tjenester', percent(delegable), '#9B7BE8'], ['Synlige tjenester', percent(visible), '#37C08B'], ['Aktive tjenester', percent(active), '#4098E8'], ['Totalt registrert', resources.length, '#E9A23B']] : [['Delegable services', percent(delegable), '#9B7BE8'], ['Visible services', percent(visible), '#37C08B'], ['Active services', percent(active), '#4098E8'], ['Total registered', resources.length, '#E9A23B']];
  return <>
    <div className="kpi-grid">{cards.map(([label, value, color], i) => <article key={label}><span>{label}</span><strong>{i === 3 ? format(value) : `${value} %`}</strong><div><i style={{ width: i === 3 ? '100%' : `${value}%`, background: color }} /></div></article>)}</div>
    <article className="distribution-card"><header><span>{distribution}</span><span>{format(resources.length)}</span></header><Distribution stats={typeStats} /><div className="legend">{typeStats.map(([type, count]) => <span key={type}><i style={{ background: getResourceTypeColor(type) }} />{type} {format(count)}</span>)}</div></article>
    <PolicyStatistics env={env} lang={lang} format={format} />
  </>;
}

function PolicyStatistics({ env, lang, format }: { env: string; lang: string; format: (n: number) => string }) {
  const [statistics, setStatistics] = useState<PolicyStatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const text = lang === 'nb' ? {
    title: 'XACML policyanalyse',
    loading: 'Analyserer policyer. Resten av statistikken kan brukes mens du venter …',
    error: 'Kunne ikke hente policyanalysen',
    distribution: 'RuleCombiningAlgId-fordeling',
    policyUrn: 'Policy-algoritme i rule-feltet',
    deny: 'Policyer med Deny-regler',
    mustBePresent: 'MustBePresent = true',
    conditions: 'Policyer med vilkår',
    legacy: 'Feilvurdert av eldre PDP',
    coverage: 'Dekning og datakvalitet',
    scanned: 'ressurser skannet',
    fetched: 'policyer hentet',
    parsed: 'policyer tolket',
    noPolicy: 'uten policy (404)',
    fetchFailures: 'hentefeil',
    parseFailures: 'tolkefeil',
    duration: 'skannetid',
    migrationTitle: 'Tjenester uten tilgangspakker',
    migrationDescription: 'Tjenester med legacy rollekoder i policyen, men ingen tilgangspakker. Rene Altinn 2-tjenester og tjenester som bare har PRIV/SELN er ikke med.',
    migrationResources: 'tjenester',
    migrationGroups: 'eier-/typegrupper',
    withoutErTitle: 'Bare Altinn 2-roller – uten ER-roller',
    withoutErDescription: 'Disse tjenestene har ingen ER-rolle som kan videreføre tilgangen når delegerte Altinn 2-roller slettes 1. januar 2027, og er derfor den viktigste oppfølgingslisten for tilgangspakker.',
    withErTitle: 'Altinn 2-roller med ER-roller',
    withErDescription: 'Disse tjenestene har minst én ER-rolle, for eksempel DAGL eller REGN, og trenger derfor ikke nødvendigvis tilgangspakker før 1. januar 2027. Tilganger som bare følger av øvrige Altinn 2-roller må fortsatt vurderes.',
    erRoles: 'ER-roller',
    otherAltinn2Roles: 'Andre Altinn 2-roller',
    unknownOwner: 'Ukjent tjenesteeier',
    drilldown: 'Policyer med ikke-standard algoritme',
    capped: 'Listen er begrenset',
    of: 'av',
    rules: 'regler',
    condition: 'vilkår',
    none: '(mangler)',
  } : {
    title: 'XACML policy analysis',
    loading: 'Analysing policies. The rest of the statistics remains available while you wait …',
    error: 'Could not load the policy analysis',
    distribution: 'RuleCombiningAlgId distribution',
    policyUrn: 'Policy algorithm in rule slot',
    deny: 'Policies with Deny rules',
    mustBePresent: 'MustBePresent = true',
    conditions: 'Policies with conditions',
    legacy: 'Mis-evaluated by legacy PDP',
    coverage: 'Coverage and data quality',
    scanned: 'resources scanned',
    fetched: 'policies fetched',
    parsed: 'policies parsed',
    noPolicy: 'without policy (404)',
    fetchFailures: 'fetch failures',
    parseFailures: 'parse failures',
    duration: 'scan duration',
    migrationTitle: 'Services without access packages',
    migrationDescription: 'Services with legacy role codes in the policy, but no access packages. Pure Altinn 2 services and services that only use PRIV/SELN are excluded.',
    migrationResources: 'services',
    migrationGroups: 'owner/type groups',
    withoutErTitle: 'Altinn 2 roles only – no ER roles',
    withoutErDescription: 'These services have no ER role that can retain access when delegated Altinn 2 roles are removed on 1 January 2027, making them the highest-priority list for access packages.',
    withErTitle: 'Altinn 2 roles with ER roles',
    withErDescription: 'These services have at least one ER role, such as DAGL or REGN, and therefore do not necessarily need access packages before 1 January 2027. Access granted only through other Altinn 2 roles must still be assessed.',
    erRoles: 'ER roles',
    otherAltinn2Roles: 'Other Altinn 2 roles',
    unknownOwner: 'Unknown service owner',
    drilldown: 'Policies with non-default algorithms',
    capped: 'The list is capped',
    of: 'of',
    rules: 'rules',
    condition: 'condition',
    none: '(missing)',
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setStatistics(null);
    fetch(`/api/v1/${env}/resource/policy/statistics`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return response.json() as Promise<PolicyStatisticsData>;
    }).then((data) => {
      setStatistics(data);
      setLoading(false);
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : String(reason));
      setLoading(false);
    });
    return () => controller.abort();
  }, [env]);

  const algorithmName = (algorithm: string) => algorithm ? algorithm.split(':').at(-1) ?? algorithm : text.none;
  if (loading) return <section aria-labelledby="policy-statistics-title"><h2 id="policy-statistics-title">{text.title}</h2><article className="distribution-card">{text.loading}</article></section>;
  if (error || !statistics) return <section aria-labelledby="policy-statistics-title"><h2 id="policy-statistics-title">{text.title}</h2><div className="notice">{text.error}{error ? ` (${error})` : ''}.</div></section>;

  const algorithmStats: [string, number][] = statistics.algorithmUsage.map(({ algorithm, count }) => [algorithm, count]);
  const denominator = Math.max(statistics.policiesParsed, 1);
  const flagCards: [string, number, string][] = [
    [text.policyUrn, statistics.policiesUsingPolicyCombiningAlgorithmInRuleSlot, '#E07732'],
    [text.deny, statistics.policiesWithDenyRules, '#D96A6A'],
    [text.mustBePresent, statistics.policiesWithMustBePresent, '#9B7BE8'],
    [text.conditions, statistics.policiesWithConditions, '#4098E8'],
    [text.legacy, statistics.legacyIncorrectEvaluationCount, '#C23B53'],
  ];
  const altinn2RoleOnlyGroups = [...(statistics.altinn2RoleOnlyGroups ?? [])].sort((left, right) => {
    const leftOwner = getText(left.ownerName, lang) || left.ownerId;
    const rightOwner = getText(right.ownerName, lang) || right.ownerId;
    return leftOwner.localeCompare(rightOwner, lang) || left.resourceType.localeCompare(right.resourceType, lang);
  });
  const groupsByErPresence = (hasErRoles: boolean) => altinn2RoleOnlyGroups
    .map((group) => {
      const resources = group.resources.filter((resource) => (resource.erRoleCodes.length > 0) === hasErRoles);
      return { ...group, resourceCount: resources.length, resources };
    })
    .filter((group) => group.resourceCount > 0);
  const roleCategories = [
    {
      key: 'without-er',
      title: text.withoutErTitle,
      description: text.withoutErDescription,
      count: statistics.altinn2RoleOnlyWithoutErRolesCount,
      groups: groupsByErPresence(false),
    },
    {
      key: 'with-er',
      title: text.withErTitle,
      description: text.withErDescription,
      count: statistics.altinn2RoleOnlyWithErRolesCount,
      groups: groupsByErPresence(true),
    },
  ];

  return <section aria-labelledby="policy-statistics-title">
    <h2 id="policy-statistics-title">{text.title}</h2>
    <article className="distribution-card">
      <header><span>{text.distribution}</span><span>{format(statistics.policiesParsed)}</span></header>
      <Distribution stats={algorithmStats} colorFor={getAlgorithmColor} />
      <div className="legend">{statistics.algorithmUsage.map(({ algorithm, kind, count }) => <span key={algorithm} title={algorithm}><i style={{ background: getAlgorithmColor(algorithm) }} />{algorithmName(algorithm)} · {kind} {format(count)}</span>)}</div>
    </article>
    <div className="kpi-grid">{flagCards.map(([label, value, color]) => <article key={label}><span>{label}</span><strong>{format(value)}</strong><div><i style={{ width: `${Math.round(value / denominator * 100)}%`, background: color }} /></div></article>)}</div>
    <article className="distribution-card">
      <header><span>{text.coverage}</span><span>{statistics.environment.toUpperCase()}</span></header>
      <div className="legend">
        <span>{format(statistics.resourcesScanned)} {text.scanned}</span>
        <span>{format(statistics.policiesFetched)} {text.fetched}</span>
        <span>{format(statistics.policiesParsed)} {text.parsed}</span>
        <span>{format(statistics.resourcesWithoutPolicy)} {text.noPolicy}</span>
        <span>{format(statistics.fetchFailures)} {text.fetchFailures}</span>
        <span>{format(statistics.parseFailures)} {text.parseFailures}</span>
        <span>{format(statistics.scanDurationMilliseconds)} ms {text.duration}</span>
      </div>
    </article>
    <h3 id="altinn2-role-only-title">{text.migrationTitle}</h3>
    <p className="statistics-description">{text.migrationDescription}</p>
    <div className="results-count">{format(statistics.altinn2RoleOnlyResourceCount)} {text.migrationResources}</div>
    <div className="role-category-list">{roleCategories.map((category) => <section className="role-category-section" data-category={category.key} aria-labelledby={`role-category-${category.key}`} key={category.key}>
      <header className="role-category-header">
        <div><h4 id={`role-category-${category.key}`}>{category.title}</h4><p>{category.description}</p></div>
        <strong>{format(category.count)}</strong>
      </header>
      <div className="results-count">{format(category.count)} {text.migrationResources} · {format(category.groups.length)} {text.migrationGroups}</div>
      <div className="statistics-group-list">{category.groups.map((group) => {
        const ownerName = getText(group.ownerName, lang) || group.ownerId || text.unknownOwner;
        return <details key={`${category.key}:${group.ownerId}:${group.resourceType}`}>
          <summary>
            <span className="statistics-group-owner"><strong>{ownerName}</strong>{group.ownerId && <small>{group.ownerId}</small>}</span>
            <span className={`type-chip type-${group.resourceType}`}>{group.resourceType}</span>
            <strong className="statistics-group-count">{format(group.resourceCount)}</strong>
          </summary>
          <div className="result-list">{group.resources.map((resource) => <Link to={`/resource/${encodeURIComponent(resource.resourceId)}`} key={resource.resourceId}>
            <span className="type-chip">{resource.erRoleCodes.length > 0 ? 'ER/A2' : 'A2'}</span>
            <div><strong>{getText(resource.title, lang) || resource.resourceId}</strong><p>{resource.resourceId}</p></div>
            <small className="role-breakdown">
              {resource.erRoleCodes.length > 0 && <span><b>{text.erRoles}:</b> {resource.erRoleCodes.join(', ')}</span>}
              {resource.otherAltinn2RoleCodes.length > 0 && <span><b>{text.otherAltinn2Roles}:</b> {resource.otherAltinn2RoleCodes.join(', ')}</span>}
            </small>
            <span className="chevron">›</span>
          </Link>)}</div>
        </details>;
      })}</div>
    </section>)}</div>
    <h3>{text.drilldown}</h3>
    <div className="results-count">
      {format(statistics.nonDefaultResources.length)} {text.of} {format(statistics.nonDefaultResourceCount)}
      {statistics.nonDefaultResourcesCapped && <> · {text.capped} ({format(statistics.nonDefaultResourceLimit)})</>}
    </div>
    <div className="result-list">{statistics.nonDefaultResources.map((resource) => {
      const flags = [
        resource.denyRuleCount ? `Deny × ${format(resource.denyRuleCount)}` : '',
        resource.hasMustBePresent ? 'MustBePresent' : '',
        resource.hasCondition ? text.condition : '',
        resource.usesPolicyCombiningAlgorithmInRuleSlot ? text.policyUrn : '',
        resource.wouldLegacyPdpEvaluateIncorrectly ? text.legacy : '',
      ].filter(Boolean).join(' · ');
      return <Link to={`/resource/${encodeURIComponent(resource.resourceId)}`} key={resource.resourceId}>
        <span className="type-chip">{resource.algorithmKind}</span>
        <div><strong>{resource.resourceId}</strong><p title={resource.algorithm}>{algorithmName(resource.algorithm)} · {format(resource.ruleCount)} {text.rules}</p></div>
        <small>{flags}</small><span className="chevron">›</span>
      </Link>;
    })}</div>
  </section>;
}
