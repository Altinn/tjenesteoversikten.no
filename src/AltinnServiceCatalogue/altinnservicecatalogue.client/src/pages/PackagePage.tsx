import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import {
  Heading,
  Paragraph,
  Spinner,
  Alert,
  Tag,
  Card,
  CardBlock,
} from '@digdir/designsystemet-react';
import type { PackageDto, MetaResource, AreaGroupDto, PolicyRule } from '../types';
import { useLang } from '../lang';
import { useEnv } from '../env';

interface SearchResult {
  object: PackageDto;
  score: number;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Extract the short accesspackage value from a URN like "urn:altinn:accesspackage:motorvognavgift" */
function getPackageUrnValue(urn: string): string {
  const parts = urn.split(':');
  return parts[parts.length - 1];
}

/** Fetch policy rules for a resource and extract actions granted to a specific access package */
async function fetchActionsForPackage(
  env: string,
  resourceRefId: string,
  packageUrnValue: string,
): Promise<string[]> {
  try {
    const res = await fetch(`/api/v1/${env}/resource/${encodeURIComponent(resourceRefId)}/policy/rules`);
    if (!res.ok) return [];
    const rules: PolicyRule[] = await res.json();
    const actions = rules
      .filter((rule) =>
        rule.subject.some(
          (s) => s.type === 'urn:altinn:accesspackage' && s.value === packageUrnValue,
        ),
      )
      .map((rule) => rule.action.value);
    return [...new Set(actions)];
  } catch {
    return [];
  }
}

const ACTION_COLORS: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  read: 'info',
  write: 'success',
  sign: 'warning',
  confirmationrequired: 'neutral',
};

export default function PackagePage() {
  const { t } = useLang();
  const { env } = useEnv();
  const { packageId } = useParams<{ packageId: string }>();
  const location = useLocation();

  const statePkg = (location.state as { pkg?: PackageDto } | null)?.pkg ?? null;

  const [pkg, setPkg] = useState<PackageDto | null>(statePkg);
  const [resources, setResources] = useState<MetaResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Map of resourceRefId -> actions granted by this package
  const [actionMap, setActionMap] = useState<Record<string, string[]>>({});

  // Fetch package data
  useEffect(() => {
    if (!packageId) return;
    setLoading(true);
    setError(null);

    fetchPackage(env, packageId, statePkg)
      .then((found) => {
        if (found) {
          setPkg(found);
          setResources(found.resources ?? []);
        } else if (statePkg) {
          setPkg(statePkg);
          setResources([]);
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [packageId, env]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch policy rules for each resource once we have them
  useEffect(() => {
    if (!pkg || resources.length === 0) return;
    const packageUrnValue = getPackageUrnValue(pkg.urn);

    // Fetch rules for all resources in parallel
    Promise.all(
      resources.map(async (r) => {
        const actions = await fetchActionsForPackage(env, r.refId, packageUrnValue);
        return [r.refId, actions] as const;
      }),
    ).then((entries) => {
      const map: Record<string, string[]> = {};
      for (const [refId, actions] of entries) {
        map[refId] = actions;
      }
      setActionMap(map);
    });
  }, [pkg, resources, env]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner aria-label={t('loading')} data-size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert data-color="danger" className="mb-6">
        {t('error.loadData')}: {error}
      </Alert>
    );
  }

  if (!pkg) {
    return (
      <>
        <Link to="/">
          <span className="text-sm text-blue-600 hover:underline">&larr; {t('packages.back')}</span>
        </Link>
        <Alert data-color="warning" className="mt-4">{t('packages.notFound')}</Alert>
      </>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:underline">
          {t('nav.home')}
        </Link>
        <span>/</span>
        <Link to="/packages" className="hover:underline">
          {t('home.tabs.accessPackages')}
        </Link>
        {pkg.area?.group && (
          <>
            <span>/</span>
            <span>{pkg.area.group.name}</span>
          </>
        )}
        {pkg.area && (
          <>
            <span>/</span>
            <span>{pkg.area.name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 truncate max-w-xs">{pkg.name}</span>
      </nav>

      {/* Package header */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          {pkg.area?.iconUrl && (
            <img src={pkg.area.iconUrl} alt="" className="w-8 h-8" />
          )}
          <Heading level={2} data-size="lg">
            {pkg.name}
          </Heading>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          <Tag
            data-size="sm"
            data-color={pkg.isDelegable ? 'success' : 'neutral'}
          >
            {pkg.isDelegable ? t('packages.delegable') : t('packages.notDelegable')}
          </Tag>
          {pkg.area?.group && (
            <Tag data-size="sm" data-color="neutral">{pkg.area.group.type}</Tag>
          )}
        </div>
        {pkg.description && (
          <Paragraph data-size="md" className="mb-4">
            {pkg.description}
          </Paragraph>
        )}
      </section>

      {/* Package details */}
      <Card className="mb-8">
        <CardBlock className="p-5">
          <dl>
            {pkg.area && (
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-500">{t('packages.area')}</dt>
                <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{pkg.area.name}</dd>
              </div>
            )}
            {pkg.area?.group && (
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-500">{t('packages.group')}</dt>
                <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{pkg.area.group.name}</dd>
              </div>
            )}
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-500">{t('packages.urn')}</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0 font-mono text-xs">{pkg.urn}</dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-500">{t('packages.delegable')}</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{pkg.isDelegable ? t('yes') : t('no')}</dd>
            </div>
          </dl>
        </CardBlock>
      </Card>

      {/* Services in this package */}
      <section>
        <Heading level={3} data-size="sm" className="mb-4">
          {t('packages.services')} ({resources.length})
        </Heading>

        {resources.length === 0 ? (
          <Paragraph className="text-center py-16 text-gray-500">
            {t('packages.noServices')}
          </Paragraph>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => {
              const actions = actionMap[resource.refId] ?? [];
              return (
                <Link
                  key={resource.id}
                  to={`/resource/${encodeURIComponent(resource.refId)}`}
                  className="no-underline"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardBlock className="p-5 flex flex-col gap-2">
                      <Heading level={4} data-size="2xs">
                        {resource.name}
                      </Heading>
                      {resource.description && (
                        <Paragraph data-size="sm" className="text-gray-600 line-clamp-3">
                          {resource.description}
                        </Paragraph>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {actions.map((action) => (
                          <Tag
                            key={action}
                            data-size="sm"
                            data-color={ACTION_COLORS[action] ?? 'neutral'}
                          >
                            {action}
                          </Tag>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {resource.provider && (
                          <Tag data-size="sm" data-color="neutral">
                            {resource.provider.name}
                          </Tag>
                        )}
                        {resource.type && (
                          <Tag data-size="sm" variant="outline">
                            {resource.type.name}
                          </Tag>
                        )}
                      </div>
                    </CardBlock>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

/**
 * Fetch a package by either GUID or URN suffix.
 * 1. If statePkg is passed (navigation from HomePage), search by name to get resources.
 * 2. If packageId is a GUID, fetch directly via /accesspackages/{id}.
 * 3. Otherwise treat it as a URN suffix and fetch via /accesspackages/urn/{value}.
 * 4. Once we have the package, enrich with area/group info from the export if needed.
 */
async function fetchPackage(env: string, packageId: string, statePkg: PackageDto | null): Promise<PackageDto | null> {
  // If we have state from navigation, search by name to get the version with resources
  if (statePkg) {
    const withResources = await searchForPackage(env, statePkg.name, statePkg.id);
    if (withResources) {
      return enrichWithAreaInfo(env, withResources);
    }
  }

  // Direct API lookup
  let pkg: PackageDto | null = null;

  if (GUID_RE.test(packageId)) {
    // Lookup by GUID
    const res = await fetch(`/api/v1/${env}/meta/info/accesspackages/${packageId}`);
    if (res.ok) {
      pkg = await res.json();
    } else if (res.status !== 404) {
      throw new Error(`Failed to fetch package: ${res.status}`);
    }
  }

  if (!pkg) {
    // Lookup by URN suffix via export data — the upstream /urn/ endpoint is unreliable,
    // so we search the full export matching the URN suffix against the package URN.
    pkg = await findPackageByUrnSuffix(env, packageId);
  }

  if (!pkg) return null;

  // Search by name to get the version with resources included
  const withResources = await searchForPackage(env, pkg.name, pkg.id);
  if (withResources) {
    return enrichWithAreaInfo(env, withResources);
  }

  return enrichWithAreaInfo(env, pkg);
}

/** Search for a package by name and match by ID to get the version with resources */
async function searchForPackage(env: string, name: string, id: string): Promise<PackageDto | null> {
  const res = await fetch(`/api/v1/${env}/meta/info/accesspackages/search?term=${encodeURIComponent(name)}`);
  if (!res.ok) return null;
  const results: SearchResult[] = await res.json();
  const match = results.find((r) => r.object.id === id);
  return match?.object ?? null;
}

/** Find a package by URN suffix (e.g. "starte-drive-endre-avvikle-virksomhet") from the export data */
async function findPackageByUrnSuffix(env: string, urnSuffix: string): Promise<PackageDto | null> {
  const res = await fetch(`/api/v1/${env}/meta/info/accesspackages/export`);
  if (!res.ok) return null;
  const groups: AreaGroupDto[] = await res.json();

  const suffix = urnSuffix.toLowerCase();
  for (const group of groups) {
    for (const area of group.areas ?? []) {
      const found = (area.packages ?? []).find((p) =>
        p.urn && getPackageUrnValue(p.urn).toLowerCase() === suffix,
      );
      if (found) {
        found.area = { ...area, packages: undefined, group: { ...group, areas: undefined } } as PackageDto['area'];
        return found;
      }
    }
  }
  return null;
}

/** Enrich a package with area/group info from the export data if it's missing */
async function enrichWithAreaInfo(env: string, pkg: PackageDto): Promise<PackageDto> {
  if (pkg.area?.group) return pkg;

  try {
    const res = await fetch(`/api/v1/${env}/meta/info/accesspackages/export`);
    if (!res.ok) return pkg;
    const groups: AreaGroupDto[] = await res.json();

    for (const group of groups) {
      for (const area of group.areas ?? []) {
        const found = (area.packages ?? []).find((p) => p.id === pkg.id);
        if (found) {
          pkg.area = { ...area, packages: undefined, group: { ...group, areas: undefined } } as PackageDto['area'];
          return pkg;
        }
      }
    }
  } catch {
    // Area info is nice-to-have, don't fail
  }

  return pkg;
}
