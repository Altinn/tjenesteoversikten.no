import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Heading,
  Paragraph,
  Search,
  SearchInput,
  SearchClear,
  Card,
  CardBlock,
  Spinner,
  Alert,
  Tabs,
  Tag,
  Button,
  Checkbox,
  Fieldset,
  Select,
} from '@digdir/designsystemet-react';

const RESOURCE_TYPES = [
  'Default', 'Systemresource', 'MaskinportenSchema', 'Altinn2Service',
  'AltinnApp', 'MigratedApp', 'GenericAccessResource', 'BrokerService', 'CorrespondenceService', 'Consent',
];
const AVAILABLE_FOR_TYPES = [
  'PrivatePerson', 'LegalEntityEnterprise', 'Company', 'BankruptcyEstate', 'SelfRegisteredUser',
];
const SEARCH_DISPLAY_LIMIT = 100;

function toggleArrayItem(arr: string[], item: string): string[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
}
import type { Org, OrgList, ServiceResource, AreaGroupDto, RoleDto, PackageDto, AuthLevelStatistics, StatsJobStatus, AccessPackageStatistics, AccessPackageStatsJobStatus, CaseSensitiveStatistics, CaseSensitiveStatsJobStatus } from '../types';
import { getText, OrgLogo, packagePath, getPackageUrnValue, fetchPackageGroupsBilingual } from '../helpers';
import { useLang } from '../lang';
import { useEnv } from '../env';
import { ResourceTypeTag, RESOURCE_TYPE_COLORS } from '../components/ResourceTypeTag';

const TAB_PATHS: Record<string, string> = {
  '/': 'serviceOwner',
  '/owners': 'serviceOwner',
  '/types': 'resourceType',
  '/packages': 'accessPackages',
  '/roles': 'roles',
  '/keywords': 'keywords',
  '/search': 'search',
  '/statistics': 'statistics',
};

const PATH_FOR_TAB: Record<string, string> = {
  serviceOwner: '/owners',
  search: '/search',
  resourceType: '/types',
  accessPackages: '/packages',
  roles: '/roles',
  keywords: '/keywords',
  statistics: '/statistics',
};

export default function HomePage() {
  const { lang, t } = useLang();
  const { env } = useEnv();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = TAB_PATHS[location.pathname] ?? 'serviceOwner';

  // Org tab state
  const [orgs, setOrgs] = useState<Record<string, Org>>({});
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [errorOrgs, setErrorOrgs] = useState<string | null>(null);
  const [orgSearch, setOrgSearch] = useState('');

  // Resource type tab state
  const [resources, setResources] = useState<ServiceResource[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [errorTypes, setErrorTypes] = useState<string | null>(null);

  // Access packages tab state
  const [groups, setGroups] = useState<AreaGroupDto[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [errorPackages, setErrorPackages] = useState<string | null>(null);
  const [packageSearch, setPackageSearch] = useState('');

  // Roles tab state
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState('');

  // Keywords tab state
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const [errorKeywords, setErrorKeywords] = useState<string | null>(null);
  const [keywordSearch, setKeywordSearch] = useState('');

  // Statistics tab state (apps)
  const [statsData, setStatsData] = useState<AuthLevelStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [errorStats, setErrorStats] = useState<string | null>(null);
  const [statsProgress, setStatsProgress] = useState<{ progress: number; total: number } | null>(null);
  const [showLevel4List, setShowLevel4List] = useState(false);
  const [showLevel3List, setShowLevel3List] = useState(false);
  const [showLevel2List, setShowLevel2List] = useState(false);
  const [showOtherList, setShowOtherList] = useState(false);

  // Resource statistics state (non-app)
  const [resStatsData, setResStatsData] = useState<AuthLevelStatistics | null>(null);
  const [loadingResStats, setLoadingResStats] = useState(false);
  const [errorResStats, setErrorResStats] = useState<string | null>(null);
  const [resStatsProgress, setResStatsProgress] = useState<{ progress: number; total: number } | null>(null);
  const [showResLevel4List, setShowResLevel4List] = useState(false);
  const [showResLevel3List, setShowResLevel3List] = useState(false);
  const [showResLevel2List, setShowResLevel2List] = useState(false);
  const [showResOtherList, setShowResOtherList] = useState(false);

  // Access package statistics state (policies without access package subjects)
  const [apStatsData, setApStatsData] = useState<AccessPackageStatistics | null>(null);
  const [loadingApStats, setLoadingApStats] = useState(false);
  const [errorApStats, setErrorApStats] = useState<string | null>(null);
  const [apStatsProgress, setApStatsProgress] = useState<{ progress: number; total: number } | null>(null);
  const [showApWithoutList, setShowApWithoutList] = useState(false);

  // Case-sensitive policy matching state
  const [csStatsData, setCsStatsData] = useState<CaseSensitiveStatistics | null>(null);
  const [loadingCsStats, setLoadingCsStats] = useState(false);
  const [errorCsStats, setErrorCsStats] = useState<string | null>(null);
  const [csStatsProgress, setCsStatsProgress] = useState<{ progress: number; total: number } | null>(null);
  const [showCsAffectedList, setShowCsAffectedList] = useState(false);

  // Quick search state (hero)
  const [quickSearch, setQuickSearch] = useState('');
  const [quickSearchFocused, setQuickSearchFocused] = useState(false);

  // Advanced search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTypes, setSearchTypes] = useState<string[]>([]);
  const [searchStatus, setSearchStatus] = useState('');
  const [searchAvailableFor, setSearchAvailableFor] = useState<string[]>([]);
  const [searchDelegable, setSearchDelegable] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchSelfIdentified, setSearchSelfIdentified] = useState(false);
  const [searchEnterprise, setSearchEnterprise] = useState(false);
  const [searchAccessList, setSearchAccessList] = useState(false);
  const [searchMigratedAltinn2, setSearchMigratedAltinn2] = useState(false);
  const [searchAltinnStudioApps, setSearchAltinnStudioApps] = useState(false);
  const [searchMigratedApps, setSearchMigratedApps] = useState(false);
  const [searchOwner, setSearchOwner] = useState('');

  // Fetch orgs
  useEffect(() => {
    setLoadingOrgs(true);
    setErrorOrgs(null);
    fetch(`/api/v1/${env}/resource/orgs`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch orgs: ${res.status}`);
        return res.json() as Promise<OrgList>;
      })
      .then((data) => {
        setOrgs(data.orgs ?? {});
      })
      .catch((err) => {
        setErrorOrgs(err.message);
      })
      .finally(() => {
        setLoadingOrgs(false);
      });
  }, [env]);

  // Fetch resource list (for type grouping)
  useEffect(() => {
    setLoadingTypes(true);
    setErrorTypes(null);
    fetch(`/api/v1/${env}/resource/resourcelist?includeApps=true&includeAltinn2=true`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch resources: ${res.status}`);
        return res.json() as Promise<ServiceResource[]>;
      })
      .then((data) => {
        setResources(data);
      })
      .catch((err) => {
        setErrorTypes(err.message);
      })
      .finally(() => {
        setLoadingTypes(false);
      });
  }, [env]);

  // Fetch access packages export
  useEffect(() => {
    setLoadingPackages(true);
    setErrorPackages(null);
    fetchPackageGroupsBilingual(env)
      .then((data) => {
        setGroups(data);
      })
      .catch((err) => {
        setErrorPackages(err.message);
      })
      .finally(() => {
        setLoadingPackages(false);
      });
  }, [env]);

  // Fetch roles
  useEffect(() => {
    setLoadingRoles(true);
    setErrorRoles(null);
    fetch(`/api/v1/${env}/meta/info/roles`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch roles: ${res.status}`);
        return res.json() as Promise<RoleDto[]>;
      })
      .then((data) => {
        setRoles(data);
      })
      .catch((err) => {
        setErrorRoles(err.message);
      })
      .finally(() => {
        setLoadingRoles(false);
      });
  }, [env]);

  // Fetch keywords
  useEffect(() => {
    setLoadingKeywords(true);
    setErrorKeywords(null);
    fetch(`/api/v1/${env}/resource/keywords`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch keywords: ${res.status}`);
        return res.json() as Promise<string[]>;
      })
      .then((data) => {
        setKeywords(data);
      })
      .catch((err) => {
        setErrorKeywords(err.message);
      })
      .finally(() => {
        setLoadingKeywords(false);
      });
  }, [env]);

  const filteredKeywords = useMemo(() => {
    if (!keywordSearch) return keywords;
    const q = keywordSearch.toLowerCase();
    return keywords.filter((kw) => kw.toLowerCase().includes(q));
  }, [keywords, keywordSearch]);

  // Filter groups/areas/packages by search
  const filteredGroups = useMemo(() => {
    if (!packageSearch) return groups;
    const q = packageSearch.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        areas: (g.areas ?? [])
          .map((a) => ({
            ...a,
            packages: (a.packages ?? []).filter(
              (p) =>
                p.name.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.nameEn?.toLowerCase().includes(q) ||
                p.descriptionEn?.toLowerCase().includes(q),
            ),
          }))
          .filter((a) => a.packages.length > 0 || a.name.toLowerCase().includes(q)),
      }))
      .filter((g) => g.areas.length > 0);
  }, [groups, packageSearch]);

  const sortedOrgs = useMemo(() => {
    return Object.entries(orgs)
      .map(([code, org]) => ({ code, ...org }))
      .filter((org) => {
        if (!orgSearch) return true;
        const q = orgSearch.toLowerCase();
        const name = getText(org.name, lang).toLowerCase();
        return name.includes(q) || org.code.toLowerCase().includes(q);
      })
      .sort((a, b) => getText(a.name, lang).localeCompare(getText(b.name, lang), lang === 'nb' ? 'nb' : 'en'));
  }, [orgs, orgSearch, lang]);

  // Group roles by provider, with search filter
  const rolesByProvider = useMemo(() => {
    const q = roleSearch.toLowerCase();
    const filtered = roles.filter((r) => {
      if (!roleSearch) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    });

    const map = new Map<string, { provider: string; roles: RoleDto[] }>();
    for (const role of filtered) {
      const providerName = role.provider?.name ?? 'Ukjent';
      if (!map.has(providerName)) {
        map.set(providerName, { provider: providerName, roles: [] });
      }
      map.get(providerName)!.roles.push(role);
    }

    // Sort: key roles first within each group, then alphabetically
    for (const group of map.values()) {
      group.roles.sort((a, b) => {
        if (a.isKeyRole !== b.isKeyRole) return a.isKeyRole ? -1 : 1;
        return a.name.localeCompare(b.name, lang === 'nb' ? 'nb' : 'en');
      });
    }

    return [...map.values()].sort((a, b) => a.provider.localeCompare(b.provider));
  }, [roles, roleSearch, lang]);

  const resourceTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of resources) {
      if (r.resourceType) {
        counts[r.resourceType] = (counts[r.resourceType] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }, [resources]);

  // Advanced search computed values
  const distinctStatuses = useMemo(() => {
    const s = new Set<string>();
    for (const r of resources) { if (r.status) s.add(r.status); }
    return [...s].sort();
  }, [resources]);

  const availableResourceTypes = useMemo(() =>
    RESOURCE_TYPES.filter((t) => t === 'MigratedApp' || resources.some((r) => r.resourceType === t)),
    [resources],
  );

  const distinctOwners = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of resources) {
      const code = r.hasCompetentAuthority?.orgcode?.toLowerCase();
      if (!code) continue;
      if (!seen.has(code)) {
        seen.set(code, getText(r.hasCompetentAuthority?.name, lang) || code);
      }
    }
    return [...seen.entries()]
      .map(([code, name]) => ({ code, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [resources, lang]);

  const filteredSearchResults = useMemo(() => {
    return resources.filter((r) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const title = getText(r.title, lang).toLowerCase();
        const desc = getText(r.description, lang).toLowerCase();
        if (!title.includes(q) && !desc.includes(q) && !r.identifier.toLowerCase().includes(q)) return false;
      }
      if (searchTypes.length > 0 && !searchTypes.includes(r.resourceType)) return false;
      if (searchStatus && r.status !== searchStatus) return false;
      if (searchAvailableFor.length > 0) {
        if (!r.availableForType || !searchAvailableFor.some((t) => r.availableForType!.includes(t))) return false;
      }
      if (searchDelegable && !r.delegable) return false;
      if (searchVisible && !r.visible) return false;
      if (searchSelfIdentified && !r.selfIdentifiedUserEnabled) return false;
      if (searchEnterprise && !r.enterpriseUserEnabled) return false;
      if (searchAccessList && r.accessListMode !== 'Enabled') return false;
      if (searchMigratedAltinn2 && !r.resourceReferences?.some((ref) => ref.referenceType === 'ServiceCode')) return false;
      if (searchAltinnStudioApps && !(r.resourceType === 'AltinnApp' && !r.identifier.includes('_a2-'))) return false;
      if (searchMigratedApps && !(r.resourceType === 'MigratedApp' || (r.resourceType === 'AltinnApp' && r.identifier.includes('_a2-')))) return false;
      if (searchOwner && r.hasCompetentAuthority?.orgcode?.toLowerCase() !== searchOwner) return false;
      return true;
    });
  }, [resources, searchQuery, searchTypes, searchStatus, searchAvailableFor,
    searchDelegable, searchVisible, searchSelfIdentified, searchEnterprise, searchAccessList,
    searchMigratedAltinn2, searchAltinnStudioApps, searchMigratedApps, searchOwner, lang]);

  const hasActiveFilters = !!(searchQuery || searchTypes.length > 0 || searchStatus ||
    searchAvailableFor.length > 0 || searchDelegable || searchVisible ||
    searchSelfIdentified || searchEnterprise || searchAccessList || searchMigratedAltinn2 || searchAltinnStudioApps ||
    searchMigratedApps || searchOwner);

  // Quick search results
  const QUICK_SEARCH_LIMIT = 8;
  const quickSearchResults = useMemo(() => {
    if (!quickSearch || quickSearch.length < 2) return { services: [] as ServiceResource[], packages: [] as { pkg: PackageDto; areaName: string; groupName: string }[] };
    const q = quickSearch.toLowerCase();

    const services = resources
      .filter((r) => r.identifier.toLowerCase().includes(q) || getText(r.title, lang).toLowerCase().includes(q))
      .slice(0, QUICK_SEARCH_LIMIT);

    const packages: { pkg: PackageDto; areaName: string; groupName: string }[] = [];
    for (const g of groups) {
      for (const a of g.areas ?? []) {
        for (const p of a.packages ?? []) {
          if (p.id.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.urn.toLowerCase().includes(q) || p.nameEn?.toLowerCase().includes(q)) {
            packages.push({ pkg: p, areaName: a.name, groupName: g.name });
            if (packages.length >= QUICK_SEARCH_LIMIT) break;
          }
        }
        if (packages.length >= QUICK_SEARCH_LIMIT) break;
      }
      if (packages.length >= QUICK_SEARCH_LIMIT) break;
    }

    return { services, packages };
  }, [quickSearch, resources, groups, lang]);

  const hasQuickResults = quickSearchResults.services.length > 0 || quickSearchResults.packages.length > 0;

  function submitQuickSearch() {
    const q = quickSearch.trim();
    if (q.length < 2) return;
    setQuickSearch('');
    navigate(`/results?q=${encodeURIComponent(q)}`);
  }

  function clearSearchFilters() {
    setSearchQuery(''); setSearchTypes([]); setSearchStatus('');
    setSearchAvailableFor([]); setSearchDelegable(false); setSearchVisible(false);
    setSearchSelfIdentified(false); setSearchEnterprise(false); setSearchAccessList(false);
    setSearchMigratedAltinn2(false);
    setSearchAltinnStudioApps(false);
    setSearchMigratedApps(false);
    setSearchOwner('');
  }

  function pollStatsJob(
    kind: 'apps' | 'resources',
    setData: (d: AuthLevelStatistics) => void,
    setLoading: (b: boolean) => void,
    setError: (e: string | null) => void,
    setProgress: (p: { progress: number; total: number } | null) => void,
  ) {
    const poll = () => {
      fetch(`/api/v1/${env}/resource/statistics/authlevel/status?kind=${kind}`)
        .then((res) => res.json() as Promise<StatsJobStatus>)
        .then((job) => {
          if (job.status === 'done' && job.result) {
            setData(job.result);
            setLoading(false);
            setProgress(null);
          } else if (job.status === 'error') {
            setError(job.error ?? 'Unknown error');
            setLoading(false);
            setProgress(null);
          } else {
            setProgress({ progress: job.progress ?? 0, total: job.total ?? 0 });
            setTimeout(poll, 2000);
          }
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
          setProgress(null);
        });
    };
    return poll;
  }

  function fetchAuthLevelStats() {
    setLoadingStats(true);
    setErrorStats(null);
    setStatsData(null);
    setStatsProgress(null);
    fetch(`/api/v1/${env}/resource/statistics/authlevel/start?kind=apps`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json() as Promise<StatsJobStatus>;
      })
      .then((job) => {
        if (job.status === 'done' && job.result) {
          setStatsData(job.result);
          setLoadingStats(false);
        } else {
          pollStatsJob('apps', setStatsData, setLoadingStats, setErrorStats, setStatsProgress)();
        }
      })
      .catch((err) => {
        setErrorStats(err.message);
        setLoadingStats(false);
      });
  }

  function fetchResourceAuthLevelStats() {
    setLoadingResStats(true);
    setErrorResStats(null);
    setResStatsData(null);
    setResStatsProgress(null);
    fetch(`/api/v1/${env}/resource/statistics/authlevel/start?kind=resources`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json() as Promise<StatsJobStatus>;
      })
      .then((job) => {
        if (job.status === 'done' && job.result) {
          setResStatsData(job.result);
          setLoadingResStats(false);
        } else {
          pollStatsJob('resources', setResStatsData, setLoadingResStats, setErrorResStats, setResStatsProgress)();
        }
      })
      .catch((err) => {
        setErrorResStats(err.message);
        setLoadingResStats(false);
      });
  }

  function pollApStatsJob() {
    const poll = () => {
      fetch(`/api/v1/${env}/resource/statistics/accesspackages/status`)
        .then((res) => res.json() as Promise<AccessPackageStatsJobStatus>)
        .then((job) => {
          if (job.status === 'done' && job.result) {
            setApStatsData(job.result);
            setLoadingApStats(false);
            setApStatsProgress(null);
          } else if (job.status === 'error') {
            setErrorApStats(job.error ?? 'Unknown error');
            setLoadingApStats(false);
            setApStatsProgress(null);
          } else {
            setApStatsProgress({ progress: job.progress ?? 0, total: job.total ?? 0 });
            setTimeout(poll, 2000);
          }
        })
        .catch((err) => {
          setErrorApStats(err.message);
          setLoadingApStats(false);
          setApStatsProgress(null);
        });
    };
    poll();
  }

  function fetchAccessPackageStats(reloadFromXacml = false) {
    setLoadingApStats(true);
    setErrorApStats(null);
    setApStatsData(null);
    setApStatsProgress(null);
    fetch(`/api/v1/${env}/resource/statistics/accesspackages/start${reloadFromXacml ? '?reloadFromXacml=true' : ''}`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json() as Promise<AccessPackageStatsJobStatus>;
      })
      .then((job) => {
        if (job.status === 'done' && job.result) {
          setApStatsData(job.result);
          setLoadingApStats(false);
        } else {
          pollApStatsJob();
        }
      })
      .catch((err) => {
        setErrorApStats(err.message);
        setLoadingApStats(false);
      });
  }

  function downloadMissingPackagesCsv() {
    if (!apStatsData) return;
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const header = ['org', 'resourceid', 'name'];
    const rows = apStatsData.withoutAccessPackages.map((r) => [
      r.hasCompetentAuthority?.orgcode ?? '',
      r.identifier,
      getText(r.title, lang) || r.identifier,
    ]);
    const csv = [header, ...rows].map((cols) => cols.map(escape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policies-without-access-packages-${env}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function pollCsStatsJob() {
    const poll = () => {
      fetch(`/api/v1/${env}/resource/statistics/casesensitive/status`)
        .then((res) => res.json() as Promise<CaseSensitiveStatsJobStatus>)
        .then((job) => {
          if (job.status === 'done' && job.result) {
            setCsStatsData(job.result);
            setLoadingCsStats(false);
            setCsStatsProgress(null);
          } else if (job.status === 'error') {
            setErrorCsStats(job.error ?? 'Unknown error');
            setLoadingCsStats(false);
            setCsStatsProgress(null);
          } else {
            setCsStatsProgress({ progress: job.progress ?? 0, total: job.total ?? 0 });
            setTimeout(poll, 2000);
          }
        })
        .catch((err) => {
          setErrorCsStats(err.message);
          setLoadingCsStats(false);
          setCsStatsProgress(null);
        });
    };
    poll();
  }

  function fetchCaseSensitiveStats(reload = false) {
    setLoadingCsStats(true);
    setErrorCsStats(null);
    setCsStatsData(null);
    setCsStatsProgress(null);
    fetch(`/api/v1/${env}/resource/statistics/casesensitive/start${reload ? '?reload=true' : ''}`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        return res.json() as Promise<CaseSensitiveStatsJobStatus>;
      })
      .then((job) => {
        if (job.status === 'done' && job.result) {
          setCsStatsData(job.result);
          setLoadingCsStats(false);
        } else {
          pollCsStatsJob();
        }
      })
      .catch((err) => {
        setErrorCsStats(err.message);
        setLoadingCsStats(false);
      });
  }

  function downloadCaseSensitiveCsv() {
    if (!csStatsData) return;
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const header = ['org', 'resourceid', 'name', 'resourceType', 'roleIssue', 'actionIssue', 'accessPackageIssue', 'details'];
    const rows = csStatsData.affected.map((r) => [
      r.hasCompetentAuthority?.orgcode ?? '',
      r.identifier,
      getText(r.title, lang) || r.identifier,
      r.resourceType ?? '',
      r.hasRoleIssue ? 'yes' : '',
      r.hasActionIssue ? 'yes' : '',
      r.hasAccessPackageIssue ? 'yes' : '',
      r.matches.map((m) => `${m.category}=${m.value}`).join('; '),
    ]);
    const csv = [header, ...rows].map((cols) => cols.map(escape).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `policies-case-sensitive-matching-${env}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {/* Hero */}
      <section className="text-center mb-10">
        <img src="/tjenesteoversikten_logo.png" alt="tjenesteoversikten.no" className="h-20 mx-auto mb-6" />
        <Heading level={2} data-size="xl" className="mb-3">
          {t('home.hero.title')}
        </Heading>
        <Paragraph data-size="lg">
          {t('home.hero.subtitle')}{' '}
          {t('home.hero.source')}
          <a
            href="https://docs.altinn.studio/nb/"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('home.hero.sourceText')}
          </a>
          .
        </Paragraph>
        <Paragraph data-size="sm" className="mt-2 opacity-60">
          {t('home.hero.disclaimer')}
        </Paragraph>

        {/* Quick search by ID */}
        <div className="relative max-w-xl mx-auto mt-6">
          <Search>
            <SearchInput
              aria-label={t('quicksearch.aria')}
              placeholder={t('quicksearch.placeholder')}
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              onFocus={() => setQuickSearchFocused(true)}
              onBlur={() => setTimeout(() => setQuickSearchFocused(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitQuickSearch();
              }}
            />
            <SearchClear onClick={() => setQuickSearch('')} />
          </Search>

          {quickSearch.length >= 2 && quickSearchFocused && (
            <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg shadow-lg max-h-96 overflow-y-auto" style={{ backgroundColor: 'var(--ds-color-neutral-background-default)', border: '1px solid var(--ds-color-neutral-border-default)' }}>
              {!hasQuickResults && (
                <div className="p-4 text-center" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>{t('quicksearch.noResults')}</div>
              )}

              {quickSearchResults.services.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-color-neutral-text-subtle)', backgroundColor: 'var(--ds-color-neutral-surface-default)' }}>
                    {t('quicksearch.services')}
                  </div>
                  {quickSearchResults.services.map((r) => (
                    <Link
                      key={r.identifier}
                      to={`/resource/${encodeURIComponent(r.identifier)}`}
                      className="block px-4 py-2 no-underline"
                      style={{ color: 'var(--ds-color-neutral-text-default)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ds-color-neutral-surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setQuickSearch('')}
                    >
                      <div className="font-medium text-sm">{getText(r.title, lang)}</div>
                      <div className="text-xs" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>{r.identifier}</div>
                    </Link>
                  ))}
                </div>
              )}

              {quickSearchResults.packages.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--ds-color-neutral-text-subtle)', backgroundColor: 'var(--ds-color-neutral-surface-default)' }}>
                    {t('quicksearch.packages')}
                  </div>
                  {quickSearchResults.packages.map(({ pkg, areaName, groupName }) => (
                    <Link
                      key={pkg.id}
                      to={packagePath(pkg)}
                      state={{ pkg }}
                      className="block px-4 py-2 no-underline"
                      style={{ color: 'var(--ds-color-neutral-text-default)' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ds-color-neutral-surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      onClick={() => setQuickSearch('')}
                    >
                      <div className="font-medium text-sm">
                        {pkg.name}
                        {pkg.nameEn && pkg.nameEn !== pkg.name && (
                          <span className="font-normal" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}> / {pkg.nameEn}</span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>{groupName} &rsaquo; {areaName} &mdash; {pkg.urn ? getPackageUrnValue(pkg.urn) : pkg.id}</div>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                to={`/results?q=${encodeURIComponent(quickSearch.trim())}`}
                className="block px-4 py-3 no-underline text-center text-sm font-medium"
                style={{ color: 'var(--ds-color-base-default)', borderTop: '1px solid var(--ds-color-neutral-border-subtle)' }}
                onClick={() => setQuickSearch('')}
              >
                {t('quicksearch.showAll')} &rarr;
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Delegation wizard CTA */}
      <section className="mb-10">
        <Link to="/wizard" className="no-underline block">
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            style={{ overflow: 'hidden' }}
          >
            <div className="flex">
              <div
                data-color="info"
                style={{ width: '6px', flexShrink: 0, background: 'var(--ds-color-base-default)' }}
              />
              <CardBlock className="p-5 flex items-center gap-5 flex-1 flex-wrap">
                <div
                  data-color="info"
                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--ds-color-surface-default)', color: 'var(--ds-color-base-default)' }}
                  aria-hidden="true"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.663 17h4.673M12 3v1M6.343 6.343l.707.707M3 12h1M20 12h1M17.657 6.343l-.707.707M12 18a5 5 0 1 0-5-5c0 1.933 1.5 3.5 2.5 4.5V19a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1.5c1-1 2.5-2.567 2.5-4.5z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-[16rem]">
                  <Heading level={3} data-size="xs" className="mb-1">
                    {t('wizard.cta.title')}
                  </Heading>
                  <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                    {t('wizard.cta.description')}
                  </Paragraph>
                </div>
                <Button variant="primary" data-size="sm" asChild>
                  <span>{t('wizard.cta.button')} &rarr;</span>
                </Button>
              </CardBlock>
            </div>
          </Card>
        </Link>
      </section>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(val) => navigate(PATH_FOR_TAB[val] ?? '/')}>
        <Tabs.List>
          <Tabs.Tab value="serviceOwner">{t('home.tabs.serviceOwner')}</Tabs.Tab>
          <Tabs.Tab value="resourceType">{t('home.tabs.resourceType')}</Tabs.Tab>
          <Tabs.Tab value="accessPackages">{t('home.tabs.accessPackages')}</Tabs.Tab>
          <Tabs.Tab value="roles">{t('home.tabs.roles')}</Tabs.Tab>
          <Tabs.Tab value="keywords">{t('home.tabs.keywords')}</Tabs.Tab>
          <Tabs.Tab value="search">{t('home.tabs.search')}</Tabs.Tab>
          <Tabs.Tab value="statistics">{t('home.tabs.statistics')}</Tabs.Tab>
        </Tabs.List>

        {/* Tab: Service owner */}
        <Tabs.Panel value="serviceOwner">
          <div className="pt-6">
            {/* Search */}
            <section className="max-w-lg mx-auto mb-8">
              <Search>
                <SearchInput
                  aria-label={t('home.search.aria')}
                  placeholder={t('home.search.placeholder')}
                  value={orgSearch}
                  onChange={(e) => setOrgSearch(e.target.value)}
                />
                <SearchClear onClick={() => setOrgSearch('')} />
              </Search>
            </section>

            {loadingOrgs && (
              <div className="flex justify-center py-20">
                <Spinner aria-label={t('loading')} data-size="lg" />
              </div>
            )}

            {errorOrgs && (
              <Alert data-color="danger" className="mb-6">
                {t('error.loadOrgs')}: {errorOrgs}
              </Alert>
            )}

            {!loadingOrgs && !errorOrgs && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <Heading level={3} data-size="sm">
                    {t('home.serviceOwners')} ({sortedOrgs.length})
                  </Heading>
                </div>

                {sortedOrgs.length === 0 ? (
                  <Paragraph className="text-center py-16 text-gray-500">
                    {t('home.noMatch')}
                  </Paragraph>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {sortedOrgs.map((org) => (
                      <Link key={org.code} to={`/org/${org.code}`} className="no-underline">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                          <CardBlock className="flex flex-col items-center text-center p-4 gap-3">
                            <div className="w-16 h-16 flex items-center justify-center rounded-full overflow-hidden flex-shrink-0" style={{ backgroundColor: 'var(--ds-color-neutral-surface-default)' }}>
                              {org.logo ? (
                                <OrgLogo src={org.logo} alt={getText(org.name, lang)} fallback={org.code} />
                              ) : (
                                <span className="text-lg font-semibold text-gray-400">
                                  {org.code.substring(0, 3).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <Heading level={4} data-size="2xs">
                              {getText(org.name, lang)}
                            </Heading>
                          </CardBlock>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Tabs.Panel>

        {/* Tab: Resource type */}
        <Tabs.Panel value="resourceType">
          <div className="pt-6">
            {loadingTypes && (
              <div className="flex justify-center py-20">
                <Spinner aria-label={t('loading')} data-size="lg" />
              </div>
            )}

            {errorTypes && (
              <Alert data-color="danger" className="mb-6">
                {t('error.loadData')}: {errorTypes}
              </Alert>
            )}

            {!loadingTypes && !errorTypes && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <Heading level={3} data-size="sm">
                    {t('home.resourceTypes')} ({resourceTypes.length})
                  </Heading>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {resourceTypes.map(({ type, count }) => {
                    const color = RESOURCE_TYPE_COLORS[type] ?? 'neutral';
                    return (
                      <Link key={type} to={`/type/${encodeURIComponent(type)}`} className="no-underline">
                        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full" style={{ overflow: 'hidden' }}>
                          <div className="flex h-full">
                            <div
                              data-color={color}
                              style={{ width: '4px', flexShrink: 0, background: 'var(--ds-color-base-default)' }}
                            />
                            <div className="p-5 flex flex-col gap-3 flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <Heading level={4} data-size="xs">
                                  {t(`resourceType.${type}`)}
                                </Heading>
                                <Tag data-size="sm" data-color={color} className="flex-shrink-0">
                                  {count} {t('type.services').toLowerCase()}
                                </Tag>
                              </div>
                              <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                {t(`resourceType.description.${type}`)}
                              </Paragraph>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Tabs.Panel>

        {/* Tab: Access packages */}
        <Tabs.Panel value="accessPackages">
          <div className="pt-6">
            {/* Search */}
            <section className="max-w-lg mx-auto mb-8">
              <Search>
                <SearchInput
                  aria-label={t('packages.search.aria')}
                  placeholder={t('packages.search.placeholder')}
                  value={packageSearch}
                  onChange={(e) => setPackageSearch(e.target.value)}
                />
                <SearchClear onClick={() => setPackageSearch('')} />
              </Search>
            </section>

            {loadingPackages && (
              <div className="flex justify-center py-20">
                <Spinner aria-label={t('loading')} data-size="lg" />
              </div>
            )}

            {errorPackages && (
              <Alert data-color="danger" className="mb-6">
                {t('error.loadData')}: {errorPackages}
              </Alert>
            )}

            {!loadingPackages && !errorPackages && filteredGroups.length === 0 && packageSearch && (
              <Paragraph className="text-center py-16 text-gray-500">
                {t('packages.noMatch')}
              </Paragraph>
            )}

            {!loadingPackages && !errorPackages && filteredGroups.map((group) => (
              <section key={group.id} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <Heading level={3} data-size="sm">
                    {group.name}
                  </Heading>
                  <Tag data-size="sm" data-color="neutral">{group.type}</Tag>
                </div>

                {(group.areas ?? []).map((area) => (
                  <div key={area.id} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      {area.iconUrl && (
                        <img src={area.iconUrl} alt="" className="w-6 h-6" />
                      )}
                      <Heading level={4} data-size="xs">
                        {area.name}
                      </Heading>
                      <Tag data-size="sm" data-color="neutral">
                        {(area.packages ?? []).length} {t('packages.packages')}
                      </Tag>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 ml-8">
                      {(area.packages ?? []).map((pkg) => (
                        <Link
                          key={pkg.id}
                          to={packagePath(pkg)}
                          state={{ pkg }}
                          className="no-underline"
                        >
                          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                            <CardBlock className="p-4 flex flex-col gap-2">
                              <Heading level={5} data-size="2xs">
                                {pkg.name}
                              </Heading>
                              {pkg.nameEn && pkg.nameEn !== pkg.name && (
                                <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                  {pkg.nameEn}
                                </Paragraph>
                              )}
                              {pkg.description && (
                                <Paragraph data-size="sm" className="text-gray-600 line-clamp-2">
                                  {pkg.description}
                                </Paragraph>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                <Tag
                                  data-size="sm"
                                  data-color={pkg.isDelegable ? 'success' : 'neutral'}
                                >
                                  {pkg.isDelegable ? t('packages.delegable') : t('packages.notDelegable')}
                                </Tag>
                              </div>
                            </CardBlock>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </Tabs.Panel>

        {/* Tab: Roles */}
        <Tabs.Panel value="roles">
          <div className="pt-6">
            {/* Search */}
            <section className="max-w-lg mx-auto mb-8">
              <Search>
                <SearchInput
                  aria-label={t('roles.search.aria')}
                  placeholder={t('roles.search.placeholder')}
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                />
                <SearchClear onClick={() => setRoleSearch('')} />
              </Search>
            </section>

            {loadingRoles && (
              <div className="flex justify-center py-20">
                <Spinner aria-label={t('loading')} data-size="lg" />
              </div>
            )}

            {errorRoles && (
              <Alert data-color="danger" className="mb-6">
                {t('error.loadData')}: {errorRoles}
              </Alert>
            )}

            {!loadingRoles && !errorRoles && rolesByProvider.length === 0 && roleSearch && (
              <Paragraph className="text-center py-16 text-gray-500">
                {t('roles.noMatch')}
              </Paragraph>
            )}

            {!loadingRoles && !errorRoles && rolesByProvider.map((group) => (
              <section key={group.provider} className="mb-10">
                <div className="flex items-center gap-3 mb-4">
                  <Heading level={3} data-size="sm">
                    {group.provider}
                  </Heading>
                  <Tag data-size="sm" data-color="neutral">
                    {group.roles.length} {t('roles.roles')}
                  </Tag>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {group.roles.map((role) => (
                    <Link
                      key={role.id}
                      to={`/role/${role.id}`}
                      state={{ role }}
                      className="no-underline"
                    >
                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardBlock className="p-4 flex flex-col gap-2">
                          <Heading level={5} data-size="2xs">
                            {role.name}
                          </Heading>
                          {role.description && (
                            <Paragraph data-size="sm" className="text-gray-600 line-clamp-2">
                              {role.description}
                            </Paragraph>
                          )}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {role.isKeyRole && (
                              <Tag data-size="sm" data-color="info">
                                {t('roles.keyRole')}
                              </Tag>
                            )}
                            <Tag data-size="sm" data-color="neutral">
                              {role.code}
                            </Tag>
                          </div>
                        </CardBlock>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </Tabs.Panel>

        {/* Tab: Advanced Search */}
        <Tabs.Panel value="search">
          <div className="pt-6">
            {/* Text search */}
            <section className="mb-6">
              <Search>
                <SearchInput
                  aria-label={t('search.aria')}
                  placeholder={t('search.placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <SearchClear onClick={() => setSearchQuery('')} />
              </Search>
            </section>

            {loadingTypes && (
              <div className="flex justify-center py-20">
                <Spinner aria-label={t('loading')} data-size="lg" />
              </div>
            )}
            {errorTypes && (
              <Alert data-color="danger" className="mb-6">
                {t('error.loadData')}: {errorTypes}
              </Alert>
            )}

            {!loadingTypes && !errorTypes && (
              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Filter sidebar */}
                <aside
                  className="w-full md:w-64 flex-shrink-0 rounded-xl p-5 flex flex-col gap-5"
                  style={{ backgroundColor: 'var(--ds-color-neutral-surface-default)' }}
                >
                  <div className="flex items-center justify-between">
                    <Heading level={3} data-size="xs">
                      {t('search.filters')}
                    </Heading>
                    {hasActiveFilters && (
                      <Button variant="tertiary" data-size="sm" onClick={clearSearchFilters}>
                        {t('search.clearFilters')}
                      </Button>
                    )}
                  </div>

                  {/* Resource type */}
                  {availableResourceTypes.length > 0 && (
                    <Fieldset>
                      <Fieldset.Legend data-size="sm">{t('search.resourceType')}</Fieldset.Legend>
                      {availableResourceTypes.map((type) => (
                        <Checkbox
                          key={type}
                          label={t(`resourceType.${type}`)}
                          data-size="sm"
                          checked={searchTypes.includes(type)}
                          onChange={() => setSearchTypes(toggleArrayItem(searchTypes, type))}
                        />
                      ))}
                    </Fieldset>
                  )}

                  {/* Service owner */}
                  {distinctOwners.length > 0 && (
                    <Fieldset>
                      <Fieldset.Legend data-size="sm">{t('search.serviceOwner')}</Fieldset.Legend>
                      <Select
                        aria-label={t('search.serviceOwner')}
                        data-size="sm"
                        value={searchOwner}
                        onChange={(e) => setSearchOwner((e.target as HTMLSelectElement).value)}
                      >
                        <Select.Option value="">{t('search.allOwners')}</Select.Option>
                        {distinctOwners.map((o) => (
                          <Select.Option key={o.code} value={o.code}>{o.name}</Select.Option>
                        ))}
                      </Select>
                    </Fieldset>
                  )}

                  {/* Status */}
                  {distinctStatuses.length > 0 && (
                    <Fieldset>
                      <Fieldset.Legend data-size="sm">{t('search.status')}</Fieldset.Legend>
                      <Select
                        aria-label={t('search.status')}
                        data-size="sm"
                        value={searchStatus}
                        onChange={(e) => setSearchStatus((e.target as HTMLSelectElement).value)}
                      >
                        <Select.Option value="">{t('search.allStatuses')}</Select.Option>
                        {distinctStatuses.map((s) => (
                          <Select.Option key={s} value={s}>{s}</Select.Option>
                        ))}
                      </Select>
                    </Fieldset>
                  )}

                  {/* Available for */}
                  <Fieldset>
                    <Fieldset.Legend data-size="sm">{t('search.availableFor')}</Fieldset.Legend>
                    {AVAILABLE_FOR_TYPES.map((type) => (
                      <Checkbox
                        key={type}
                        label={t(`partyType.${type}`)}
                        data-size="sm"
                        checked={searchAvailableFor.includes(type)}
                        onChange={() => setSearchAvailableFor(toggleArrayItem(searchAvailableFor, type))}
                      />
                    ))}
                  </Fieldset>

                  {/* Boolean properties */}
                  <Fieldset>
                    <Fieldset.Legend data-size="sm">{t('search.properties')}</Fieldset.Legend>
                    <Checkbox
                      label={t('search.onlyDelegable')}
                      data-size="sm"
                      checked={searchDelegable}
                      onChange={(e) => setSearchDelegable((e.target as HTMLInputElement).checked)}
                    />
                    <Checkbox
                      label={t('search.onlyVisible')}
                      data-size="sm"
                      checked={searchVisible}
                      onChange={(e) => setSearchVisible((e.target as HTMLInputElement).checked)}
                    />
                    <Checkbox
                      label={t('search.selfIdentified')}
                      data-size="sm"
                      checked={searchSelfIdentified}
                      onChange={(e) => setSearchSelfIdentified((e.target as HTMLInputElement).checked)}
                    />
                    <Checkbox
                      label={t('search.enterpriseUsers')}
                      data-size="sm"
                      checked={searchEnterprise}
                      onChange={(e) => setSearchEnterprise((e.target as HTMLInputElement).checked)}
                    />
                    <Checkbox
                      label={t('search.accessListEnabled')}
                      data-size="sm"
                      checked={searchAccessList}
                      onChange={(e) => setSearchAccessList((e.target as HTMLInputElement).checked)}
                    />
                    <Checkbox
                      label={t('search.migratedFromAltinn2')}
                      data-size="sm"
                      checked={searchMigratedAltinn2}
                      onChange={(e) => setSearchMigratedAltinn2((e.target as HTMLInputElement).checked)}
                    />
                    <Checkbox
                      label={t('search.altinnStudioApps')}
                      data-size="sm"
                      checked={searchAltinnStudioApps}
                      onChange={(e) => setSearchAltinnStudioApps((e.target as HTMLInputElement).checked)}
                    />
                    <Checkbox
                      label={t('search.migratedApps')}
                      data-size="sm"
                      checked={searchMigratedApps}
                      onChange={(e) => setSearchMigratedApps((e.target as HTMLInputElement).checked)}
                    />
                  </Fieldset>
                </aside>

                {/* Results */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-4">
                    <Heading level={3} data-size="sm">
                      {filteredSearchResults.length > SEARCH_DISPLAY_LIMIT
                        ? `${t('search.showing')} ${SEARCH_DISPLAY_LIMIT} ${t('search.of')} ${filteredSearchResults.length} ${t('search.results')}`
                        : `${filteredSearchResults.length} ${t('search.results')}`}
                    </Heading>
                  </div>

                  {filteredSearchResults.length === 0 ? (
                    <Paragraph className="text-center py-16" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                      {t('search.noResults')}
                    </Paragraph>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {filteredSearchResults.slice(0, SEARCH_DISPLAY_LIMIT).map((r) => (
                        <Link key={r.identifier} to={`/resource/${encodeURIComponent(r.identifier)}`} className="no-underline">
                          <Card className="hover:shadow-md transition-shadow cursor-pointer">
                            <CardBlock className="p-4 flex flex-col gap-2">
                              <div className="flex items-start justify-between gap-3">
                                <Heading level={4} data-size="2xs">
                                  {getText(r.title, lang)}
                                </Heading>
                                <div className="flex flex-wrap gap-1 flex-shrink-0">
                                  <ResourceTypeTag type={r.resourceType} />
                                  {r.status && (
                                    <Tag data-size="sm" data-color="neutral">{r.status}</Tag>
                                  )}
                                </div>
                              </div>
                              {getText(r.description, lang) && (
                                <Paragraph data-size="sm" className="line-clamp-2" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                  {getText(r.description, lang)}
                                </Paragraph>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs font-mono" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                  {r.identifier}
                                </span>
                                {r.hasCompetentAuthority?.name && (
                                  <span className="text-xs" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                    · {getText(r.hasCompetentAuthority.name, lang)}
                                  </span>
                                )}
                              </div>
                            </CardBlock>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Tabs.Panel>

        {/* Tab: Keywords */}
        <Tabs.Panel value="keywords">
          <div className="pt-6">
            <section className="max-w-lg mx-auto mb-8">
              <Search>
                <SearchInput
                  aria-label={t('keywords.search.aria')}
                  placeholder={t('keywords.search.placeholder')}
                  value={keywordSearch}
                  onChange={(e) => setKeywordSearch(e.target.value)}
                />
                <SearchClear onClick={() => setKeywordSearch('')} />
              </Search>
            </section>

            {loadingKeywords && (
              <div className="flex justify-center py-20">
                <Spinner aria-label={t('loading')} data-size="lg" />
              </div>
            )}

            {errorKeywords && (
              <Alert data-color="danger" className="mb-6">
                {t('error.loadData')}: {errorKeywords}
              </Alert>
            )}

            {!loadingKeywords && !errorKeywords && filteredKeywords.length === 0 && keywordSearch && (
              <Paragraph className="text-center py-16 text-gray-500">
                {t('keywords.noMatch')}
              </Paragraph>
            )}

            {!loadingKeywords && !errorKeywords && filteredKeywords.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-6">
                  <Heading level={3} data-size="sm">
                    {t('keywords.total')} ({filteredKeywords.length})
                  </Heading>
                </div>
                <div className="flex flex-wrap gap-2">
                  {filteredKeywords.map((kw) => (
                    <Link key={kw} to={`/keyword/${encodeURIComponent(kw)}`} className="no-underline">
                      <Tag
                        data-size="md"
                        data-color="neutral"
                        className="cursor-pointer hover:shadow-sm transition-shadow"
                      >
                        {kw}
                      </Tag>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        </Tabs.Panel>

        {/* Tab: Statistics */}
        <Tabs.Panel value="statistics">
          <div className="pt-6 max-w-4xl mx-auto">
            <Heading level={2} data-size="md" className="mb-2">{t('stats.title')}</Heading>
            <Paragraph className="mb-6" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
              {t('stats.description')}
            </Paragraph>

            {!statsData && !loadingStats && (
              <Button data-size="md" onClick={fetchAuthLevelStats}>
                {t('stats.calculate')}
              </Button>
            )}

            {loadingStats && (
              <div className="flex flex-col items-center gap-4 py-20">
                <Spinner aria-label={t('stats.calculating')} data-size="lg" />
                <Paragraph>{t('stats.calculating')}</Paragraph>
                {statsProgress && statsProgress.total > 0 && (
                  <Paragraph data-size="sm">{t('stats.progress').replace('{progress}', String(statsProgress.progress)).replace('{total}', String(statsProgress.total))}</Paragraph>
                )}
              </div>
            )}

            {errorStats && (
              <Alert data-color="danger" className="mb-6">
                {t('error.loadData')}: {errorStats}
              </Alert>
            )}

            {statsData && !loadingStats && (
              <div className="space-y-6">
                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <Card data-color="neutral">
                    <CardBlock>
                      <Heading level={3} data-size="2xl" className="text-center">{statsData.totalApps}</Heading>
                      <Paragraph data-size="sm" className="text-center">{t('stats.totalApps')}</Paragraph>
                    </CardBlock>
                  </Card>
                  <Card data-color="danger">
                    <CardBlock>
                      <Heading level={3} data-size="2xl" className="text-center">{statsData.level4Apps.length}</Heading>
                      <Paragraph data-size="sm" className="text-center">{t('stats.level4')}</Paragraph>
                    </CardBlock>
                  </Card>
                  <Card data-color="warning">
                    <CardBlock>
                      <Heading level={3} data-size="2xl" className="text-center">{statsData.level3Apps.length}</Heading>
                      <Paragraph data-size="sm" className="text-center">{t('stats.level3')}</Paragraph>
                    </CardBlock>
                  </Card>
                  <Card data-color="info">
                    <CardBlock>
                      <Heading level={3} data-size="2xl" className="text-center">{statsData.level2Apps.length}</Heading>
                      <Paragraph data-size="sm" className="text-center">{t('stats.level2')}</Paragraph>
                    </CardBlock>
                  </Card>
                  <Card data-color="neutral">
                    <CardBlock>
                      <Heading level={3} data-size="2xl" className="text-center">{statsData.otherApps.length}</Heading>
                      <Paragraph data-size="sm" className="text-center">{t('stats.other')}</Paragraph>
                    </CardBlock>
                  </Card>
                </div>

                {statsData.errorCount > 0 && (
                  <Alert data-color="warning">
                    {t('stats.errors')}: {statsData.errorCount} {t('stats.apps')}
                  </Alert>
                )}

                {/* Level 4 list */}
                {statsData.level4Apps.length > 0 && (
                  <div>
                    <Button variant="secondary" data-size="sm" onClick={() => setShowLevel4List(!showLevel4List)} className="mb-3">
                      {showLevel4List ? t('stats.hideList') : t('stats.showList')}: {t('stats.level4')} ({statsData.level4Apps.length})
                    </Button>
                    {showLevel4List && (
                      <div className="grid gap-2">
                        {statsData.level4Apps.map((app) => (
                          <Card key={app.identifier} data-color="danger" className="p-0">
                            <CardBlock>
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <Link to={`/resource/${app.identifier}`} className="font-semibold">
                                    {getText(app.title, lang) || app.identifier}
                                  </Link>
                                  <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                    {app.identifier} — {app.hasCompetentAuthority?.orgcode}
                                  </Paragraph>
                                </div>
                                <Tag data-size="sm" data-color="danger">Nivå 4</Tag>
                              </div>
                            </CardBlock>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Level 3 list */}
                {statsData.level3Apps.length > 0 && (
                  <div>
                    <Button variant="secondary" data-size="sm" onClick={() => setShowLevel3List(!showLevel3List)} className="mb-3">
                      {showLevel3List ? t('stats.hideList') : t('stats.showList')}: {t('stats.level3')} ({statsData.level3Apps.length})
                    </Button>
                    {showLevel3List && (
                      <div className="grid gap-2">
                        {statsData.level3Apps.map((app) => (
                          <Card key={app.identifier} data-color="warning" className="p-0">
                            <CardBlock>
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <Link to={`/resource/${app.identifier}`} className="font-semibold">
                                    {getText(app.title, lang) || app.identifier}
                                  </Link>
                                  <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                    {app.identifier} — {app.hasCompetentAuthority?.orgcode}
                                  </Paragraph>
                                </div>
                                <Tag data-size="sm" data-color="warning">Nivå 3</Tag>
                              </div>
                            </CardBlock>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Level 2 list */}
                {statsData.level2Apps.length > 0 && (
                  <div>
                    <Button variant="secondary" data-size="sm" onClick={() => setShowLevel2List(!showLevel2List)} className="mb-3">
                      {showLevel2List ? t('stats.hideList') : t('stats.showList')}: {t('stats.level2')} ({statsData.level2Apps.length})
                    </Button>
                    {showLevel2List && (
                      <div className="grid gap-2">
                        {statsData.level2Apps.map((app) => (
                          <Card key={app.identifier} data-color="info" className="p-0">
                            <CardBlock>
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <Link to={`/resource/${app.identifier}`} className="font-semibold">
                                    {getText(app.title, lang) || app.identifier}
                                  </Link>
                                  <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                    {app.identifier} — {app.hasCompetentAuthority?.orgcode}
                                  </Paragraph>
                                </div>
                                <Tag data-size="sm" data-color="info">Nivå 2</Tag>
                              </div>
                            </CardBlock>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Other / not set list */}
                {statsData.otherApps.length > 0 && (
                  <div>
                    <Button variant="secondary" data-size="sm" onClick={() => setShowOtherList(!showOtherList)} className="mb-3">
                      {showOtherList ? t('stats.hideList') : t('stats.showList')}: {t('stats.other')} ({statsData.otherApps.length})
                    </Button>
                    {showOtherList && (
                      <div className="grid gap-2">
                        {statsData.otherApps.map((app) => (
                          <Card key={app.identifier} data-color="neutral" className="p-0">
                            <CardBlock>
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <Link to={`/resource/${app.identifier}`} className="font-semibold">
                                    {getText(app.title, lang) || app.identifier}
                                  </Link>
                                  <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                    {app.identifier} — {app.hasCompetentAuthority?.orgcode}
                                  </Paragraph>
                                </div>
                                <Tag data-size="sm" data-color="neutral">
                                  {app.userLevel !== null ? `Nivå ${app.userLevel}` : '—'}
                                </Tag>
                              </div>
                            </CardBlock>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Recalculate button */}
                <Button variant="secondary" data-size="sm" onClick={fetchAuthLevelStats}>
                  {t('stats.calculate')}
                </Button>
              </div>
            )}

            {/* Resource statistics (non-app) */}
            <div className="mt-12 pt-8 border-t border-neutral-300">
              <Heading level={2} data-size="md" className="mb-2">{t('stats.res.title')}</Heading>
              <Paragraph className="mb-6" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                {t('stats.res.description')}
              </Paragraph>

              {!resStatsData && !loadingResStats && (
                <Button data-size="md" onClick={fetchResourceAuthLevelStats}>
                  {t('stats.res.calculate')}
                </Button>
              )}

              {loadingResStats && (
                <div className="flex flex-col items-center gap-4 py-20">
                  <Spinner aria-label={t('stats.res.calculating')} data-size="lg" />
                  <Paragraph>{t('stats.res.calculating')}</Paragraph>
                  {resStatsProgress && resStatsProgress.total > 0 && (
                    <Paragraph data-size="sm">{t('stats.progress').replace('{progress}', String(resStatsProgress.progress)).replace('{total}', String(resStatsProgress.total))}</Paragraph>
                  )}
                </div>
              )}

              {errorResStats && (
                <Alert data-color="danger" className="mb-6">
                  {t('error.loadData')}: {errorResStats}
                </Alert>
              )}

              {resStatsData && !loadingResStats && (
                <div className="space-y-6">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{resStatsData.totalApps}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.res.total')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="danger">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{resStatsData.level4Apps.length}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.level4')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="warning">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{resStatsData.level3Apps.length}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.level3')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="info">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{resStatsData.level2Apps.length}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.level2')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{resStatsData.otherApps.length}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.other')}</Paragraph>
                      </CardBlock>
                    </Card>
                  </div>

                  {resStatsData.errorCount > 0 && (
                    <Alert data-color="warning">
                      {t('stats.res.errors')}: {resStatsData.errorCount} {t('stats.res.resources')}
                    </Alert>
                  )}

                  {/* Level 4 list */}
                  {resStatsData.level4Apps.length > 0 && (
                    <div>
                      <Button variant="secondary" data-size="sm" onClick={() => setShowResLevel4List(!showResLevel4List)} className="mb-3">
                        {showResLevel4List ? t('stats.hideList') : t('stats.showList')}: {t('stats.level4')} ({resStatsData.level4Apps.length})
                      </Button>
                      {showResLevel4List && (
                        <div className="grid gap-2">
                          {resStatsData.level4Apps.map((r) => (
                            <Card key={r.identifier} data-color="danger" className="p-0">
                              <CardBlock>
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <Link to={`/resource/${r.identifier}`} className="font-semibold">
                                      {getText(r.title, lang) || r.identifier}
                                    </Link>
                                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                      {r.identifier} — {r.hasCompetentAuthority?.orgcode}
                                    </Paragraph>
                                  </div>
                                  <Tag data-size="sm" data-color="danger">Nivå 4</Tag>
                                </div>
                              </CardBlock>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Level 3 list */}
                  {resStatsData.level3Apps.length > 0 && (
                    <div>
                      <Button variant="secondary" data-size="sm" onClick={() => setShowResLevel3List(!showResLevel3List)} className="mb-3">
                        {showResLevel3List ? t('stats.hideList') : t('stats.showList')}: {t('stats.level3')} ({resStatsData.level3Apps.length})
                      </Button>
                      {showResLevel3List && (
                        <div className="grid gap-2">
                          {resStatsData.level3Apps.map((r) => (
                            <Card key={r.identifier} data-color="warning" className="p-0">
                              <CardBlock>
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <Link to={`/resource/${r.identifier}`} className="font-semibold">
                                      {getText(r.title, lang) || r.identifier}
                                    </Link>
                                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                      {r.identifier} — {r.hasCompetentAuthority?.orgcode}
                                    </Paragraph>
                                  </div>
                                  <Tag data-size="sm" data-color="warning">Nivå 3</Tag>
                                </div>
                              </CardBlock>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Level 2 list */}
                  {resStatsData.level2Apps.length > 0 && (
                    <div>
                      <Button variant="secondary" data-size="sm" onClick={() => setShowResLevel2List(!showResLevel2List)} className="mb-3">
                        {showResLevel2List ? t('stats.hideList') : t('stats.showList')}: {t('stats.level2')} ({resStatsData.level2Apps.length})
                      </Button>
                      {showResLevel2List && (
                        <div className="grid gap-2">
                          {resStatsData.level2Apps.map((r) => (
                            <Card key={r.identifier} data-color="info" className="p-0">
                              <CardBlock>
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <Link to={`/resource/${r.identifier}`} className="font-semibold">
                                      {getText(r.title, lang) || r.identifier}
                                    </Link>
                                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                      {r.identifier} — {r.hasCompetentAuthority?.orgcode}
                                    </Paragraph>
                                  </div>
                                  <Tag data-size="sm" data-color="info">Nivå 2</Tag>
                                </div>
                              </CardBlock>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Other / not set list */}
                  {resStatsData.otherApps.length > 0 && (
                    <div>
                      <Button variant="secondary" data-size="sm" onClick={() => setShowResOtherList(!showResOtherList)} className="mb-3">
                        {showResOtherList ? t('stats.hideList') : t('stats.showList')}: {t('stats.other')} ({resStatsData.otherApps.length})
                      </Button>
                      {showResOtherList && (
                        <div className="grid gap-2">
                          {resStatsData.otherApps.map((r) => (
                            <Card key={r.identifier} data-color="neutral" className="p-0">
                              <CardBlock>
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <Link to={`/resource/${r.identifier}`} className="font-semibold">
                                      {getText(r.title, lang) || r.identifier}
                                    </Link>
                                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                      {r.identifier} — {r.hasCompetentAuthority?.orgcode}
                                    </Paragraph>
                                  </div>
                                  <Tag data-size="sm" data-color="neutral">
                                    {r.userLevel !== null ? `Nivå ${r.userLevel}` : '—'}
                                  </Tag>
                                </div>
                              </CardBlock>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recalculate button */}
                  <Button variant="secondary" data-size="sm" onClick={fetchResourceAuthLevelStats}>
                    {t('stats.res.calculate')}
                  </Button>
                </div>
              )}
            </div>

            {/* Access package statistics (policies without access packages) */}
            <div className="mt-12 pt-8 border-t border-neutral-300">
              <Heading level={2} data-size="md" className="mb-2">{t('stats.ap.title')}</Heading>
              <Paragraph className="mb-6" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                {t('stats.ap.description')}
              </Paragraph>

              {!apStatsData && !loadingApStats && (
                <div className="flex flex-wrap gap-2">
                  <Button data-size="md" onClick={() => fetchAccessPackageStats()}>
                    {t('stats.ap.calculate')}
                  </Button>
                  <Button variant="secondary" data-size="md" onClick={() => fetchAccessPackageStats(true)}>
                    {t('stats.ap.reloadXacml')}
                  </Button>
                </div>
              )}

              {loadingApStats && (
                <div className="flex flex-col items-center gap-4 py-20">
                  <Spinner aria-label={t('stats.ap.calculating')} data-size="lg" />
                  <Paragraph>{t('stats.ap.calculating')}</Paragraph>
                  {apStatsProgress && apStatsProgress.total > 0 && (
                    <Paragraph data-size="sm">{t('stats.progress').replace('{progress}', String(apStatsProgress.progress)).replace('{total}', String(apStatsProgress.total))}</Paragraph>
                  )}
                </div>
              )}

              {errorApStats && (
                <Alert data-color="danger" className="mb-6">
                  {t('error.loadData')}: {errorApStats}
                </Alert>
              )}

              {apStatsData && !loadingApStats && (
                <div className="space-y-6">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{apStatsData.totalPolicies}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.ap.total')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="success">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{apStatsData.withAccessPackages}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.ap.with')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="warning">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{apStatsData.withoutAccessPackages.length}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.ap.without')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{apStatsData.errorCount}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.ap.errors')}</Paragraph>
                      </CardBlock>
                    </Card>
                  </div>

                  {/* Without access packages list */}
                  {apStatsData.withoutAccessPackages.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Button variant="secondary" data-size="sm" onClick={() => setShowApWithoutList(!showApWithoutList)}>
                          {showApWithoutList ? t('stats.hideList') : t('stats.showList')}: {t('stats.ap.without')} ({apStatsData.withoutAccessPackages.length})
                        </Button>
                        <Button variant="secondary" data-size="sm" onClick={downloadMissingPackagesCsv}>
                          {t('stats.ap.downloadCsv')}
                        </Button>
                      </div>
                      {showApWithoutList && (
                        <div className="grid gap-2">
                          {apStatsData.withoutAccessPackages.map((r) => (
                            <Card key={r.identifier} data-color="warning" className="p-0">
                              <CardBlock>
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <Link to={`/resource/${r.identifier}`} className="font-semibold">
                                      {getText(r.title, lang) || r.identifier}
                                    </Link>
                                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                      {r.identifier} — {r.hasCompetentAuthority?.orgcode}
                                    </Paragraph>
                                  </div>
                                  <Tag data-size="sm" data-color={r.subjectCount > 0 ? 'info' : 'neutral'}>
                                    {r.subjectCount > 0 ? t('stats.ap.onlyRoles') : t('stats.ap.noSubjects')}
                                  </Tag>
                                </div>
                              </CardBlock>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recalculate buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" data-size="sm" onClick={() => fetchAccessPackageStats()}>
                      {t('stats.ap.calculate')}
                    </Button>
                    <Button variant="secondary" data-size="sm" onClick={() => fetchAccessPackageStats(true)}>
                      {t('stats.ap.reloadXacml')}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Case-sensitive policy matching */}
            <div className="mt-12 pt-8 border-t border-neutral-300">
              <Heading level={2} data-size="md" className="mb-2">{t('stats.cs.title')}</Heading>
              <Paragraph className="mb-6" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                {t('stats.cs.description')}
              </Paragraph>

              {!csStatsData && !loadingCsStats && (
                <div className="flex flex-wrap gap-2">
                  <Button data-size="md" onClick={() => fetchCaseSensitiveStats()}>
                    {t('stats.cs.calculate')}
                  </Button>
                  <Button variant="secondary" data-size="md" onClick={() => fetchCaseSensitiveStats(true)}>
                    {t('stats.cs.reloadXacml')}
                  </Button>
                </div>
              )}

              {loadingCsStats && (
                <div className="flex flex-col items-center gap-4 py-20">
                  <Spinner aria-label={t('stats.cs.calculating')} data-size="lg" />
                  <Paragraph>{t('stats.cs.calculating')}</Paragraph>
                  {csStatsProgress && csStatsProgress.total > 0 && (
                    <Paragraph data-size="sm">{t('stats.progress').replace('{progress}', String(csStatsProgress.progress)).replace('{total}', String(csStatsProgress.total))}</Paragraph>
                  )}
                </div>
              )}

              {errorCsStats && (
                <Alert data-color="danger" className="mb-6">
                  {t('error.loadData')}: {errorCsStats}
                </Alert>
              )}

              {csStatsData && !loadingCsStats && (
                <div className="space-y-6">
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{csStatsData.totalPolicies}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.cs.total')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color={csStatsData.withIssues > 0 ? 'warning' : 'success'}>
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{csStatsData.withIssues}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.cs.withIssues')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{csStatsData.roleIssues}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.cs.roleIssues')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{csStatsData.actionIssues}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.cs.actionIssues')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{csStatsData.accessPackageIssues}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.cs.apIssues')}</Paragraph>
                      </CardBlock>
                    </Card>
                    <Card data-color="neutral">
                      <CardBlock>
                        <Heading level={3} data-size="2xl" className="text-center">{csStatsData.errorCount}</Heading>
                        <Paragraph data-size="sm" className="text-center">{t('stats.cs.errors')}</Paragraph>
                      </CardBlock>
                    </Card>
                  </div>

                  {/* Affected list */}
                  {csStatsData.affected.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Button variant="secondary" data-size="sm" onClick={() => setShowCsAffectedList(!showCsAffectedList)}>
                          {showCsAffectedList ? t('stats.hideList') : t('stats.showList')}: {t('stats.cs.affected')} ({csStatsData.affected.length})
                        </Button>
                        <Button variant="secondary" data-size="sm" onClick={downloadCaseSensitiveCsv}>
                          {t('stats.cs.downloadCsv')}
                        </Button>
                      </div>
                      {showCsAffectedList && (
                        <div className="grid gap-2">
                          {csStatsData.affected.map((r) => (
                            <Card key={r.identifier} data-color="warning" className="p-0">
                              <CardBlock>
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <Link to={`/resource/${r.identifier}`} className="font-semibold">
                                      {getText(r.title, lang) || r.identifier}
                                    </Link>
                                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                                      {r.identifier} — {r.hasCompetentAuthority?.orgcode}
                                    </Paragraph>
                                  </div>
                                  <div className="flex flex-wrap gap-1 justify-end">
                                    {r.hasRoleIssue && <Tag data-size="sm" data-color="danger">{t('stats.cs.roleIssues')}</Tag>}
                                    {r.hasActionIssue && <Tag data-size="sm" data-color="danger">{t('stats.cs.actionIssues')}</Tag>}
                                    {r.hasAccessPackageIssue && <Tag data-size="sm" data-color="danger">{t('stats.cs.apIssues')}</Tag>}
                                  </div>
                                </div>
                              </CardBlock>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recalculate buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" data-size="sm" onClick={() => fetchCaseSensitiveStats()}>
                      {t('stats.cs.calculate')}
                    </Button>
                    <Button variant="secondary" data-size="sm" onClick={() => fetchCaseSensitiveStats(true)}>
                      {t('stats.cs.reloadXacml')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
