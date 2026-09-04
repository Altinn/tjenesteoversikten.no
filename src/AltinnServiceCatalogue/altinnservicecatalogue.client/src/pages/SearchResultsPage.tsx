import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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
  Tag,
  Button,
  Chip,
} from '@digdir/designsystemet-react';
import type { ServiceResource, AreaGroupDto, PackageDto } from '../types';
import {
  fetchPackageGroupsBilingual,
  getLocalizedPackageDescription,
  getLocalizedPackageName,
  getPackageUrnValue,
  getText,
  packagePath,
} from '../helpers';
import { useLang } from '../lang';
import { useEnv } from '../env';
import { ResourceTypeTag, RESOURCE_TYPE_COLORS } from '../components/ResourceTypeTag';
import { isRetiredService, retiredLabel, splitRetired } from '../serviceVisibility';
import RetiredServicesNotice from '../components/RetiredServicesNotice';

interface PackageHit {
  pkg: PackageDto;
  areaName: string;
  groupName: string;
}

export default function SearchResultsPage() {
  const { lang, t } = useLang();
  const { env } = useEnv();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';

  const [resources, setResources] = useState<ServiceResource[]>([]);
  const [groups, setGroups] = useState<AreaGroupDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/v1/${env}/resource/resourcelist?includeApps=true&includeAltinn2=true`).then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch resources: ${res.status}`);
        return res.json() as Promise<ServiceResource[]>;
      }),
      fetchPackageGroupsBilingual(env),
    ])
      .then(([resourceData, groupData]) => {
        setResources(resourceData);
        setGroups(groupData);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [env]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return { services: [] as ServiceResource[], packages: [] as PackageHit[] };

    const services = resources.filter((r) => {
      const title = getText(r.title, lang).toLowerCase();
      const desc = getText(r.description, lang).toLowerCase();
      return r.identifier.toLowerCase().includes(q) || title.includes(q) || desc.includes(q);
    });

    const packages: PackageHit[] = [];
    for (const g of groups) {
      for (const a of g.areas ?? []) {
        for (const p of a.packages ?? []) {
          if (
            p.id.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.urn.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) ||
            p.nameEn?.toLowerCase().includes(q) ||
            p.descriptionEn?.toLowerCase().includes(q)
          ) {
            packages.push({ pkg: p, areaName: a.name, groupName: g.name });
          }
        }
      }
    }

    return { services, packages };
  }, [query, resources, groups, lang]);

  // Distinct resource types present in the current service results, with counts
  const availableTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of results.services) {
      if (r.resourceType) counts[r.resourceType] = (counts[r.resourceType] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  }, [results.services]);

  // Type filter: preselect ALL types present, so the user can deselect to narrow
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const availableKey = availableTypes.map((t) => t.type).join('|');
  useEffect(() => {
    setSelectedTypes(availableTypes.map((t) => t.type));
    // Re-preselect every time the set of available types changes (e.g. new query)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableKey]);

  // Distinct statuses present in the current service results, with counts
  const availableStatuses = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of results.services) {
      if (r.status) counts[r.status] = (counts[r.status] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count || a.status.localeCompare(b.status));
  }, [results.services]);

  // Status filter: preselect ALL statuses present, so the user can deselect to narrow
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const availableStatusKey = availableStatuses.map((s) => s.status).join('|');
  useEffect(() => {
    setSelectedStatuses(availableStatuses.map((s) => s.status));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableStatusKey]);

  // Distinct service owners present in the current service results, with counts
  const availableOwners = useMemo(() => {
    const map = new Map<string, { code: string; name: string; count: number }>();
    for (const r of results.services) {
      const code = r.hasCompetentAuthority?.orgcode;
      if (!code) continue;
      const existing = map.get(code);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(code, {
          code,
          name: getText(r.hasCompetentAuthority?.name, lang) || code,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [results.services, lang]);

  // Service owner filter: preselect ALL owners present, so the user can deselect to narrow
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const availableOwnerKey = availableOwners.map((o) => o.code).join('|');
  useEffect(() => {
    setSelectedOwners(availableOwners.map((o) => o.code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableOwnerKey]);

  const filteredServices = useMemo(
    () => results.services.filter(
      (r) =>
        (!r.resourceType || selectedTypes.includes(r.resourceType)) &&
        (!r.status || selectedStatuses.includes(r.status)) &&
        (!r.hasCompetentAuthority?.orgcode || selectedOwners.includes(r.hasCompetentAuthority.orgcode)),
    ),
    [results.services, selectedTypes, selectedStatuses, selectedOwners],
  );

  // Hidden and retired services stay out of the result grid until the user asks for them
  const [showRetired, setShowRetired] = useState(false);
  const { active: activeServices, retired: retiredServices } = useMemo(
    () => splitRetired(filteredServices, (r) => r),
    [filteredServices],
  );
  const shownServices = showRetired ? [...activeServices, ...retiredServices] : activeServices;

  const hasQuery = query.trim().length >= 2;
  const totalHits = results.services.length + results.packages.length;

  function updateQuery(value: string) {
    setSearchParams(value ? { q: value } : {}, { replace: true });
  }

  return (
    <>
      {/* Back */}
      <Link to="/">
        <Button variant="tertiary" data-size="sm" className="mb-4" asChild>
          <span>&larr; {t('results.back')}</span>
        </Button>
      </Link>

      {/* Header */}
      <section className="mb-8">
        <Heading level={2} data-size="lg">
          {t('results.title')}
        </Heading>
      </section>

      {/* Search */}
      <section className="max-w-lg mb-8">
        <Search>
          <SearchInput
            aria-label={t('results.search.aria')}
            placeholder={t('results.search.placeholder')}
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
          />
          <SearchClear onClick={() => updateQuery('')} />
        </Search>
      </section>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-20">
          <Spinner aria-label={t('loading')} data-size="lg" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert data-color="danger" className="mb-6">
          {t('error.loadData')}: {error}
        </Alert>
      )}

      {/* Content */}
      {!loading && !error && !hasQuery && (
        <Paragraph className="text-center py-16" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          {t('results.empty')}
        </Paragraph>
      )}

      {!loading && !error && hasQuery && totalHits === 0 && (
        <Paragraph className="text-center py-16" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
          {t('results.noResults')} &laquo;{query.trim()}&raquo;
        </Paragraph>
      )}

      {!loading && !error && hasQuery && totalHits > 0 && (
        <>
          {/* Services */}
          {results.services.length > 0 && (
            <section className="mb-10">
              <Heading level={3} data-size="sm" className="mb-4">
                {t('results.services')} ({shownServices.length}
                {shownServices.length !== results.services.length && ` / ${results.services.length}`})
              </Heading>

              {/* Service type filter — all preselected, deselect to narrow */}
              {availableTypes.length > 1 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                      {t('results.filterByType')}
                    </Paragraph>
                    {selectedTypes.length !== availableTypes.length && (
                      <Button
                        variant="tertiary"
                        data-size="sm"
                        onClick={() => setSelectedTypes(availableTypes.map((at) => at.type))}
                      >
                        {t('results.showAllTypes')}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTypes.map(({ type, count }) => (
                      <Chip.Checkbox
                        key={type}
                        data-color={RESOURCE_TYPE_COLORS[type] ?? 'neutral'}
                        data-size="sm"
                        checked={selectedTypes.includes(type)}
                        onChange={() =>
                          setSelectedTypes((prev) =>
                            prev.includes(type) ? prev.filter((x) => x !== type) : [...prev, type],
                          )
                        }
                      >
                        {t(`resourceType.${type}`)} ({count})
                      </Chip.Checkbox>
                    ))}
                  </div>
                </div>
              )}

              {/* Status filter — all preselected, deselect to narrow */}
              {availableStatuses.length > 1 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                      {t('results.filterByStatus')}
                    </Paragraph>
                    {selectedStatuses.length !== availableStatuses.length && (
                      <Button
                        variant="tertiary"
                        data-size="sm"
                        onClick={() => setSelectedStatuses(availableStatuses.map((as) => as.status))}
                      >
                        {t('results.showAllStatuses')}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableStatuses.map(({ status, count }) => (
                      <Chip.Checkbox
                        key={status}
                        data-color={status === 'Active' ? 'success' : 'neutral'}
                        data-size="sm"
                        checked={selectedStatuses.includes(status)}
                        onChange={() =>
                          setSelectedStatuses((prev) =>
                            prev.includes(status) ? prev.filter((x) => x !== status) : [...prev, status],
                          )
                        }
                      >
                        {status} ({count})
                      </Chip.Checkbox>
                    ))}
                  </div>
                </div>
              )}

              {/* Service owner filter — all preselected, deselect to narrow */}
              {availableOwners.length > 1 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <Paragraph data-size="sm" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                      {t('results.filterByOwner')}
                    </Paragraph>
                    {selectedOwners.length !== availableOwners.length && (
                      <Button
                        variant="tertiary"
                        data-size="sm"
                        onClick={() => setSelectedOwners(availableOwners.map((o) => o.code))}
                      >
                        {t('results.showAllOwners')}
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableOwners.map(({ code, name, count }) => (
                      <Chip.Checkbox
                        key={code}
                        data-color="neutral"
                        data-size="sm"
                        checked={selectedOwners.includes(code)}
                        onChange={() =>
                          setSelectedOwners((prev) =>
                            prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code],
                          )
                        }
                      >
                        {name} ({count})
                      </Chip.Checkbox>
                    ))}
                  </div>
                </div>
              )}

              <RetiredServicesNotice
                count={retiredServices.length}
                expanded={showRetired}
                onToggle={() => setShowRetired((on) => !on)}
              />

              {shownServices.length === 0 ? (
                <Paragraph className="py-8" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                  {t('results.noTypeMatch')}
                </Paragraph>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shownServices.map((resource) => (
                  <Link
                    key={resource.identifier}
                    to={`/resource/${encodeURIComponent(resource.identifier)}`}
                    className="no-underline"
                  >
                    <Card
                      className={`hover:shadow-md transition-shadow cursor-pointer h-full${isRetiredService(resource) ? ' is-retired' : ''}`}
                    >
                      <CardBlock className="p-5 flex flex-col gap-2">
                        <Heading level={4} data-size="2xs">
                          {getText(resource.title, lang)}
                          {isRetiredService(resource) && (
                            <span className="retired-chip">
                              {retiredLabel(resource, t('resource.notVisible'))}
                            </span>
                          )}
                        </Heading>
                        <Paragraph data-size="sm" className="text-gray-600 line-clamp-3">
                          {getText(resource.description, lang)}
                        </Paragraph>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {resource.resourceType && <ResourceTypeTag type={resource.resourceType} />}
                          {resource.hasCompetentAuthority?.name && (
                            <Tag data-size="sm" data-color="neutral">
                              {getText(resource.hasCompetentAuthority.name, lang)}
                            </Tag>
                          )}
                          {resource.status && (
                            <Tag
                              data-size="sm"
                              data-color={resource.status === 'Active' ? 'success' : 'neutral'}
                            >
                              {resource.status}
                            </Tag>
                          )}
                        </div>
                      </CardBlock>
                    </Card>
                  </Link>
                ))}
              </div>
              )}
            </section>
          )}

          {/* Access packages */}
          {results.packages.length > 0 && (
            <section className="mb-10">
              <Heading level={3} data-size="sm" className="mb-6">
                {t('results.packages')} ({results.packages.length})
              </Heading>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.packages.map(({ pkg, areaName, groupName }) => (
                  <Link
                    key={pkg.id}
                    to={packagePath(pkg)}
                    state={{ pkg }}
                    className="no-underline"
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                      <CardBlock className="p-5 flex flex-col gap-2">
                        <Heading level={4} data-size="2xs">
                          {getLocalizedPackageName(pkg, lang)}
                        </Heading>
                        {getLocalizedPackageDescription(pkg, lang) && (
                          <Paragraph data-size="sm" className="text-gray-600 line-clamp-2">
                            {getLocalizedPackageDescription(pkg, lang)}
                          </Paragraph>
                        )}
                        <div className="text-xs mt-2" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
                          {groupName} &rsaquo; {areaName}
                          {pkg.urn && <> &mdash; {getPackageUrnValue(pkg.urn)}</>}
                        </div>
                      </CardBlock>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
