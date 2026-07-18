import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AreaDto, AreaGroupDto, Org, OrgList, PackageDto, ResourceSummary, RoleDto } from '../types';
import { fetchPackageGroupsBilingual, getText, packagePath } from '../helpers';
import { useEnv } from '../env';
import { useLang } from '../lang';
import { getResourceTypeColor } from '../resourceTypes';
const TAB_PATHS: Record<string, string> = { '/': 'owners', '/owners': 'owners', '/types': 'types', '/packages': 'packages', '/roles': 'roles', '/keywords': 'keywords', '/statistics': 'statistics', '/search': 'search' };
const TAB_ROUTES: Record<string, string> = { owners: '/owners', types: '/types', packages: '/packages', roles: '/roles', keywords: '/keywords', statistics: '/statistics', search: '/search' };
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
  const { lang } = useLang();
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
  const heroResults = useMemo(() => { const hq = heroQuery.trim().toLowerCase(); if (hq.length < 2) return []; return resources.filter((r) => `${getText(r.title, lang)} ${getText(r.description, lang)} ${r.identifier} ${getText(r.hasCompetentAuthority?.name, lang)}`.toLowerCase().includes(hq)).slice(0, 6); }, [heroQuery, resources, lang]);
  const searchResults = useMemo(() => resources.filter((r) => (!q || `${getText(r.title, lang)} ${getText(r.description, lang)} ${r.identifier}`.toLowerCase().includes(q)) && (!selectedTypes.length || selectedTypes.includes(r.resourceType))), [resources, q, selectedTypes, lang]);
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
            {heroQuery.trim().length >= 2 && <div className="search-dropdown">{heroResults.map((r) => <Link to={`/resource/${encodeURIComponent(r.identifier)}`} key={r.identifier}><span className={`type-chip type-${r.resourceType}`}>{r.resourceType}</span><strong>{getText(r.title, lang)}</strong><small>{getText(r.hasCompetentAuthority?.name, lang)}</small></Link>)}{!heroResults.length && <div className="empty-row">{copy.noResults}</div>}</div>}
          </div>
        </div>
      </div>
      <div className="hero-stats section-inner">{statValues.map((value, i) => <div className="stat-card" key={copy.stats[i]}><strong>{value === null ? '—' : format(value)}</strong><span>{copy.stats[i]}</span></div>)}</div>
    </section>

    <section className="catalogue-section">
      <div className="tabs-scroll section-inner"><nav className="catalogue-tabs">{Object.entries(copy.tabs).map(([key, label]) => <button key={key} className={activeTab === key ? 'active' : ''} onClick={() => navigate(TAB_ROUTES[key])}>{label}</button>)}</nav></div>
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
              <div className="package-browser-header"><span className="initial-tile">{initials(selectedArea.area.name)}</span><div><h2>{selectedArea.area.name}</h2><p>{selectedArea.group.name} · {selectedArea.area.packages?.length ?? 0} {copy.packages}</p></div></div>
              <PackageLinks items={(selectedArea.area.packages ?? []).map((pkg) => ({ pkg, area: selectedArea.area, group: selectedArea.group }))} lang={lang} />
            </div>
          ) : (
            <div className="package-groups">{groups.map((group) => <section key={group.id}><h2>{group.name}</h2><div className="area-grid">{(group.areas ?? []).map((area) => <button className="package-area-card" onClick={() => setSelectedPackageArea(area.id)} key={area.id}><span className="initial-tile">{initials(area.name)}</span><div><strong>{area.name}</strong><small>{area.packages?.length ?? 0} {copy.packages}</small></div><span className="chevron">›</span></button>)}</div></section>)}</div>
          )}
        </>}
        {activeTab === 'roles' && <><Filter value={filterQuery} setValue={setFilterQuery} placeholder={copy.filters.roles} /><RoleGroups roles={roles.filter((r) => !q || `${r.name} ${r.code} ${r.description}`.toLowerCase().includes(q))} /></>}
        {activeTab === 'keywords' && <><Filter value={filterQuery} setValue={setFilterQuery} placeholder={copy.filters.keywords} /><div className="keyword-cloud">{keywords.filter((word) => !q || word.toLowerCase().includes(q)).map((word) => <Link to={`/keyword/${encodeURIComponent(word)}`} key={word}>{word}</Link>)}</div></>}
        {activeTab === 'statistics' && <Statistics resources={resources} typeStats={typeStats} lang={lang} format={format} distribution={copy.distribution} />}
        {activeTab === 'search' && <><Filter value={filterQuery} setValue={setFilterQuery} placeholder={copy.placeholder} wide /><div className="filter-chips">{typeStats.map(([type]) => <button className={selectedTypes.includes(type) ? 'active' : ''} onClick={() => setSelectedTypes((old) => old.includes(type) ? old.filter((x) => x !== type) : [...old, type])} key={type}>{type}</button>)}</div><div className="results-count">{format(searchResults.length)} {copy.results}</div><div className="result-list">{searchResults.slice(0, 100).map((r) => <Link to={`/resource/${encodeURIComponent(r.identifier)}`} key={r.identifier}><span className={`type-chip type-${r.resourceType}`}>{r.resourceType}</span><div><strong>{getText(r.title, lang)}</strong><p>{getText(r.description, lang)}</p></div><small>{getText(r.hasCompetentAuthority?.name, lang)}</small><span className="chevron">›</span></Link>)}</div></>}
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

function Distribution({ stats }: { stats: [string, number][] }) { return <div className="distribution" aria-hidden="true">{stats.map(([type, count]) => <span key={type} style={{ flex: count, background: getResourceTypeColor(type) }} />)}</div>; }
function PackageLinks({ items, lang, heading }: { items: { pkg: PackageDto; area: AreaDto; group: AreaGroupDto }[]; lang: string; heading?: string }) {
  return <div className="package-links-wrap">{heading && <div className="results-count">{heading}</div>}<div className="package-link-grid">{items.map(({ pkg, area }) => <Link className="package-link-card" to={packagePath(pkg)} state={{ pkg }} key={pkg.id}><div><strong>{lang === 'en' && pkg.nameEn ? pkg.nameEn : pkg.name}</strong><small>{area.name}</small></div><span className="chevron">›</span></Link>)}</div></div>;
}
function RoleGroups({ roles }: { roles: RoleDto[] }) { const groups = useMemo(() => { const map = new Map<string, RoleDto[]>(); roles.forEach((r) => { const key = r.provider?.name ?? 'Altinn'; map.set(key, [...(map.get(key) ?? []), r]); }); return [...map.entries()]; }, [roles]); return <div className="role-groups">{groups.map(([provider, items]) => <section key={provider}><h2>{provider}</h2><div className="role-list">{items.map((r) => <Link to={`/role/${r.id}`} key={r.id}><strong>{r.name}</strong><span>{r.description}</span><code>{r.code}</code></Link>)}</div></section>)}</div>; }
function Statistics({ resources, typeStats, lang, format, distribution }: { resources: ResourceSummary[]; typeStats: [string, number][]; lang: string; format: (n: number) => string; distribution: string }) {
  const delegable = resources.filter((r) => r.delegable).length, visible = resources.filter((r) => r.visible).length, active = resources.filter((r) => r.status?.toLowerCase() === 'active').length;
  const percent = (n: number) => resources.length ? Math.round(n / resources.length * 100) : 0;
  const cards: [string, number, string][] = lang === 'nb' ? [['Delegerbare tjenester', percent(delegable), '#9B7BE8'], ['Synlige tjenester', percent(visible), '#37C08B'], ['Aktive tjenester', percent(active), '#4098E8'], ['Totalt registrert', resources.length, '#E9A23B']] : [['Delegable services', percent(delegable), '#9B7BE8'], ['Visible services', percent(visible), '#37C08B'], ['Active services', percent(active), '#4098E8'], ['Total registered', resources.length, '#E9A23B']];
  return <><div className="kpi-grid">{cards.map(([label, value, color], i) => <article key={label}><span>{label}</span><strong>{i === 3 ? format(value) : `${value} %`}</strong><div><i style={{ width: i === 3 ? '100%' : `${value}%`, background: color }} /></div></article>)}</div><article className="distribution-card"><header><span>{distribution}</span><span>{format(resources.length)}</span></header><Distribution stats={typeStats} /><div className="legend">{typeStats.map(([type, count]) => <span key={type}><i style={{ background: getResourceTypeColor(type) }} />{type} {format(count)}</span>)}</div></article></>;
}
