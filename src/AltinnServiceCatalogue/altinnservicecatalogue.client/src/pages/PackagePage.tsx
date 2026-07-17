import { useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Spinner, Alert } from '@digdir/designsystemet-react';
import type { PackageDto, MetaResource, AreaGroupDto, PolicyRule, RoleDto } from '../types';
import { getPackageUrnValue } from '../helpers';
import { useLang } from '../lang';
import { useEnv } from '../env';

interface SearchResult {
  object: PackageDto;
  score: number;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export default function PackagePage() {
  const { lang, t } = useLang();
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

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

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

  // Fetch roles that grant this access package. Inverted server-side and cached for 30 min.
  useEffect(() => {
    if (!pkg) return;
    setLoadingRoles(true);

    fetch(`/api/v1/${env}/meta/info/accesspackages/${pkg.id}/roles`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch package roles: ${res.status}`);
        return res.json() as Promise<RoleDto[]>;
      })
      .then(setRoles)
      .catch(() => setRoles([]))
      .finally(() => setLoadingRoles(false));
  }, [pkg, env]);

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

  const packageName = lang === 'en' && pkg.nameEn ? pkg.nameEn : pkg.name;
  const packageDescription =
    lang === 'en' && pkg.descriptionEn ? pkg.descriptionEn : pkg.description;
  const areaName = pkg.area?.name;
  const groupName = pkg.area?.group?.name;
  const areaInitials = (areaName ?? packageName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <div className="package-detail-page">
      <nav className="breadcrumbs" aria-label={lang === 'nb' ? 'Brødsmuler' : 'Breadcrumbs'}>
        <Link to="/">{t('nav.home')}</Link>
        <span>/</span>
        <Link to="/packages">{t('home.tabs.accessPackages')}</Link>
        {groupName && (
          <>
            <span>/</span>
            <span>{groupName}</span>
          </>
        )}
        <span>/</span>
        <span className="package-breadcrumb-current">{packageName}</span>
      </nav>

      <header className="package-detail-hero">
        <div className="package-detail-heading">
          <span className="package-detail-icon" aria-hidden="true">
            {pkg.area?.iconUrl ? <img src={pkg.area.iconUrl} alt="" /> : areaInitials}
          </span>
          <div>
            <span className="eyebrow">
              {lang === 'nb' ? 'Tilgangspakke' : 'Access package'}
            </span>
            <h1>{packageName}</h1>
          </div>
        </div>

        {packageDescription && <p className="package-detail-description">{packageDescription}</p>}

        <div className="package-status-list">
          <span className="package-status" data-tone={pkg.isDelegable ? 'positive' : 'neutral'}>
            <span aria-hidden="true">{pkg.isDelegable ? '✓' : '–'}</span>
            {pkg.isDelegable ? t('packages.delegable') : t('packages.notDelegable')}
          </span>
          <span className="package-status" data-tone={pkg.isAssignable ? 'positive' : 'neutral'}>
            <span aria-hidden="true">{pkg.isAssignable ? '✓' : '–'}</span>
            {pkg.isAssignable
              ? (lang === 'nb' ? 'Kan tildeles' : 'Assignable')
              : (lang === 'nb' ? 'Kan ikke tildeles' : 'Not assignable')}
          </span>
          {pkg.area?.group?.type && (
            <span className="package-status" data-tone="neutral">
              {pkg.area.group.type}
            </span>
          )}
        </div>
      </header>

      <section
        className="package-facts"
        aria-label={lang === 'nb' ? 'Om tilgangspakken' : 'About the access package'}
      >
        <dl className="package-fact-grid">
          <div>
            <dt>{t('packages.area')}</dt>
            <dd>{areaName ?? '–'}</dd>
          </div>
          <div>
            <dt>{t('packages.group')}</dt>
            <dd>{groupName ?? '–'}</dd>
          </div>
          <div>
            <dt>{t('packages.delegable')}</dt>
            <dd>{pkg.isDelegable ? t('yes') : t('no')}</dd>
          </div>
          <div>
            <dt>{lang === 'nb' ? 'Kan tildeles' : 'Assignable'}</dt>
            <dd>{pkg.isAssignable ? t('yes') : t('no')}</dd>
          </div>
        </dl>
        <div className="package-urn">
          <span>{t('packages.urn')}</span>
          <code>{pkg.urn}</code>
        </div>
      </section>

      <div className="package-detail-layout">
        <main className="package-resource-section">
          <header className="package-section-header">
            <div>
              <h2>{t('packages.services')}</h2>
              <p>
                {lang === 'nb'
                  ? 'Tjenestene og rettighetene som inngår i tilgangspakken.'
                  : 'The services and permissions included in this access package.'}
              </p>
            </div>
            <span className="package-count">{resources.length}</span>
          </header>

          {resources.length === 0 ? (
            <div className="detail-empty">{t('packages.noServices')}</div>
          ) : (
            <div className="package-resource-list">
              {resources.map((resource) => {
                const actions = actionMap[resource.refId] ?? [];
                return (
                  <Link
                    key={resource.id}
                    to={`/resource/${encodeURIComponent(resource.refId)}`}
                    className="package-resource-row"
                  >
                    <div className="package-resource-copy">
                      <strong>{resource.name}</strong>
                      {resource.description && <p>{resource.description}</p>}
                      <div className="package-resource-meta">
                        {resource.provider?.name && <span>{resource.provider.name}</span>}
                        {resource.type?.name && <span>{resource.type.name}</span>}
                      </div>
                      {actions.length > 0 && (
                        <div className="package-action-list" aria-label={lang === 'nb' ? 'Rettigheter' : 'Permissions'}>
                          {actions.map((action) => (
                            <span
                              className="package-action"
                              data-action={action.toLowerCase()}
                              key={action}
                            >
                              {action}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="package-row-chevron" aria-hidden="true">›</span>
                  </Link>
                );
              })}
            </div>
          )}
        </main>

        <aside className="package-role-panel">
          <header className="package-section-header">
            <div>
              <h2>{t('packages.roles')}</h2>
              <p>
                {lang === 'nb'
                  ? 'Roller som automatisk gir denne pakken.'
                  : 'Roles that automatically grant this package.'}
              </p>
            </div>
            {!loadingRoles && <span className="package-count">{roles.length}</span>}
          </header>

          {loadingRoles && (
            <div className="package-role-loading">
              <Spinner aria-label={t('loading')} data-size="md" />
            </div>
          )}

          {!loadingRoles && roles.length === 0 && (
            <div className="package-role-empty">{t('packages.noRoles')}</div>
          )}

          {!loadingRoles && roles.length > 0 && (
            <div className="package-role-list">
              {roles.map((role) => (
                <Link
                  key={role.id}
                  to={`/role/${encodeURIComponent(role.id)}`}
                  state={{ role }}
                >
                  <div className="package-role-copy">
                    <strong>{role.name}</strong>
                    {role.description && <p>{role.description}</p>}
                    <span className="package-role-meta">
                      <code>{role.code}</code>
                      {role.provider?.name && <span>{role.provider.name}</span>}
                      {role.isKeyRole && <span>{t('roles.keyRole')}</span>}
                    </span>
                  </div>
                  <span className="package-row-chevron" aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

/**
 * Fetch a package by either GUID or URN suffix.
 * 1. If statePkg is passed (navigation from HomePage), search by name to get resources.
 * 2. If packageId is a GUID, fetch directly via /accesspackages/{id}.
 * 3. Fall back to the export data, matching either the GUID or the URN suffix —
 *    the upstream /{id} and /urn/ endpoints are unreliable.
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
    pkg = await findPackageInExport(env, packageId);
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

/** Find a package by GUID or URN suffix (e.g. "starte-drive-endre-avvikle-virksomhet") from the export data */
async function findPackageInExport(env: string, idOrUrnSuffix: string): Promise<PackageDto | null> {
  const res = await fetch(`/api/v1/${env}/meta/info/accesspackages/export`);
  if (!res.ok) return null;
  const groups: AreaGroupDto[] = await res.json();

  const key = idOrUrnSuffix.toLowerCase();
  for (const group of groups) {
    for (const area of group.areas ?? []) {
      const found = (area.packages ?? []).find((p) =>
        p.id.toLowerCase() === key ||
        (p.urn && getPackageUrnValue(p.urn).toLowerCase() === key),
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
