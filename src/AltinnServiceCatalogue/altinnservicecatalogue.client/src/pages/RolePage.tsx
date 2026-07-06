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
  Tabs,
} from '@digdir/designsystemet-react';
import type { RoleDto, SubjectResourcesResponse, PolicyRule, PackageDto, RoleVariantPackagesDto } from '../types';
import { packagePath } from '../helpers';
import { useLang } from '../lang';
import { useEnv } from '../env';

interface ResourceInfo {
  refId: string;
  name: string;
}

/** Parse a URN like "urn:altinn:rolecode:dagl" into { type, value } */
function parseUrn(urn: string): { type: string; value: string } {
  const parts = urn.split(':');
  return {
    type: parts.slice(0, 3).join(':'),
    value: parts.slice(3).join(':'),
  };
}

/** Build all {type, value} matchers for a role's subjects in policy rules */
function getRoleSubjectMatchers(role: RoleDto): { type: string; value: string }[] {
  const matchers = [parseUrn(role.urn)];
  if (role.legacyRoleCode) {
    const legacyMatcher = { type: 'urn:altinn:rolecode', value: role.legacyRoleCode.toLowerCase() };
    if (legacyMatcher.type !== matchers[0].type || legacyMatcher.value !== matchers[0].value) {
      matchers.push(legacyMatcher);
    }
  }
  return matchers;
}

/** Build the set of URNs to query bysubjects for a role */
function getSubjectUrns(role: RoleDto): string[] {
  const urns = [role.urn];
  if (role.legacyRoleCode) {
    const legacyUrn = `urn:altinn:rolecode:${role.legacyRoleCode.toLowerCase()}`;
    if (legacyUrn !== role.urn) {
      urns.push(legacyUrn);
    }
  }
  return urns;
}

/** Fetch policy rules for a resource and extract actions granted by a role */
async function fetchActionsForRole(
  env: string,
  resourceRefId: string,
  matchers: { type: string; value: string }[],
): Promise<string[]> {
  try {
    const res = await fetch(`/api/v1/${env}/resource/${encodeURIComponent(resourceRefId)}/policy/rules`);
    if (!res.ok) return [];
    const rules: PolicyRule[] = await res.json();
    const actions = rules
      .filter((rule) =>
        rule.subject.some((s) =>
          matchers.some((m) => s.type === m.type && s.value === m.value),
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

const BATCH_SIZE = 20;

/** Grid of access package cards, shared between the default list and the per-variant tabs */
function PackageGrid({ packages }: { packages: PackageDto[] }) {
  const { t } = useLang();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {packages.map((pkg) => (
        <Link
          key={pkg.id}
          to={packagePath(pkg)}
          state={{ pkg }}
          className="no-underline"
        >
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardBlock className="p-5 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {pkg.area?.iconUrl && (
                  <img src={pkg.area.iconUrl} alt="" className="w-5 h-5 flex-shrink-0" />
                )}
                <Heading level={4} data-size="2xs">
                  {pkg.name}
                </Heading>
              </div>
              {pkg.description && (
                <Paragraph data-size="sm" className="text-gray-600 line-clamp-3">
                  {pkg.description}
                </Paragraph>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {pkg.area && (
                  <Tag data-size="sm" data-color="neutral">
                    {pkg.area.name}
                  </Tag>
                )}
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
  );
}

export default function RolePage() {
  const { t } = useLang();
  const { env } = useEnv();
  const { roleId } = useParams<{ roleId: string }>();
  const location = useLocation();

  const stateRole = (location.state as { role?: RoleDto } | null)?.role ?? null;

  const [role, setRole] = useState<RoleDto | null>(stateRole);
  const [loading, setLoading] = useState(!stateRole);
  const [error, setError] = useState<string | null>(null);

  const [resources, setResources] = useState<ResourceInfo[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);

  // Map of resourceRefId -> actions granted by this role
  const [actionMap, setActionMap] = useState<Record<string, string[]>>({});

  const [packages, setPackages] = useState<PackageDto[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);

  // Fallback when the default variant grants no packages: some role->package relations only
  // apply to specific enterprise types (e.g. Forretningsfører only grants packages for NUF/ESEK/BRL)
  const [variantPackages, setVariantPackages] = useState<RoleVariantPackagesDto[]>([]);
  const [activeVariant, setActiveVariant] = useState('');

  // Fetch role data if not passed via router state
  useEffect(() => {
    if (!roleId) return;
    if (stateRole) return;

    setLoading(true);
    setError(null);

    fetch(`/api/v1/${env}/meta/info/roles/${roleId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch role: ${res.status}`);
        return res.json() as Promise<RoleDto>;
      })
      .then((data) => {
        setRole(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [roleId, env]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch access packages granted by this role. Falls back to probing entity variants when the
  // default variant grants nothing (variant-gated relations, e.g. Forretningsfører).
  useEffect(() => {
    if (!role) return;
    setLoadingPackages(true);
    setPackages([]);
    setVariantPackages([]);

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/v1/${env}/meta/info/roles/${role.id}/packages?variant=person`);
        if (!res.ok) throw new Error(`Failed to fetch role packages: ${res.status}`);
        const data: PackageDto[] = await res.json();
        const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name));
        if (cancelled) return;
        setPackages(sorted);

        if (sorted.length === 0) {
          const vRes = await fetch(`/api/v1/${env}/meta/info/roles/${role.id}/packages/byvariant`);
          if (vRes.ok) {
            const variants: RoleVariantPackagesDto[] = await vRes.json();
            if (cancelled) return;
            setVariantPackages(variants);
            setActiveVariant(variants[0]?.variantName ?? '');
          }
        }
      } catch {
        if (!cancelled) {
          setPackages([]);
          setVariantPackages([]);
        }
      } finally {
        if (!cancelled) setLoadingPackages(false);
      }
    })();

    return () => { cancelled = true; };
  }, [role, env]);

  // Fetch resources for this role via bysubjects
  useEffect(() => {
    if (!role) return;

    const urns = getSubjectUrns(role);
    setLoadingResources(true);

    fetch(`/api/v1/${env}/resource/bysubjects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(urns),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch subject resources: ${res.status}`);
        return res.json() as Promise<SubjectResourcesResponse>;
      })
      .then((data) => {
        const seen = new Set<string>();
        const merged: ResourceInfo[] = [];
        for (const entry of data.data) {
          for (const r of entry.resources) {
            if (!seen.has(r.value)) {
              seen.add(r.value);
              merged.push({ refId: r.value, name: r.value });
            }
          }
        }
        merged.sort((a, b) => a.refId.localeCompare(b.refId));
        setResources(merged);
      })
      .catch(() => {
        setResources([]);
      })
      .finally(() => {
        setLoadingResources(false);
      });
  }, [role, env]);

  // Fetch policy rules for each resource in batches, updating progressively
  useEffect(() => {
    if (!role || resources.length === 0) return;

    const matchers = getRoleSubjectMatchers(role);
    let cancelled = false;

    (async () => {
      for (let i = 0; i < resources.length; i += BATCH_SIZE) {
        if (cancelled) break;
        const batch = resources.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(async (r) => {
            const actions = await fetchActionsForRole(env, r.refId, matchers);
            return [r.refId, actions] as const;
          }),
        );
        if (cancelled) break;
        setActionMap((prev) => {
          const next = { ...prev };
          for (const [refId, actions] of results) {
            next[refId] = actions;
          }
          return next;
        });
      }
    })();

    return () => { cancelled = true; };
  }, [role, resources, env]);

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

  if (!role) {
    return (
      <>
        <Link to="/roles">
          <span className="text-sm text-blue-600 hover:underline">&larr; {t('roles.back')}</span>
        </Link>
        <Alert data-color="warning" className="mt-4">{t('roles.notFound')}</Alert>
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
        <Link to="/roles" className="hover:underline">
          {t('home.tabs.roles')}
        </Link>
        {role.provider && (
          <>
            <span>/</span>
            <span>{role.provider.name}</span>
          </>
        )}
        <span>/</span>
        <span className="text-gray-900 truncate max-w-xs">{role.name}</span>
      </nav>

      {/* Role header */}
      <section className="mb-8">
        <Heading level={2} data-size="lg" className="mb-3">
          {role.name}
        </Heading>
        <div className="flex flex-wrap gap-2 mb-4">
          {role.isKeyRole && (
            <Tag data-size="sm" data-color="info">
              {t('roles.keyRole')}
            </Tag>
          )}
          <Tag data-size="sm" data-color="neutral">
            {role.code}
          </Tag>
          {role.provider && (
            <Tag data-size="sm" data-color="neutral">
              {role.provider.name}
            </Tag>
          )}
        </div>
        {role.description && (
          <Paragraph data-size="md" className="mb-4">
            {role.description}
          </Paragraph>
        )}
      </section>

      {/* Role details */}
      <Card className="mb-8">
        <CardBlock className="p-5">
          <dl>
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-500">{t('roles.code')}</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0 font-mono text-xs">{role.code}</dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-500">{t('roles.urn')}</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0 font-mono text-xs">{role.urn}</dd>
            </div>
            {role.provider && (
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-500">{t('roles.provider')}</dt>
                <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{role.provider.name}</dd>
              </div>
            )}
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-500">{t('roles.keyRole')}</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{role.isKeyRole ? t('yes') : t('no')}</dd>
            </div>
            <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
              <dt className="text-sm font-medium text-gray-500">{t('roles.policyAvailable')}</dt>
              <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{role.isResourcePolicyAvailable ? t('yes') : t('no')}</dd>
            </div>
            {role.legacyRoleCode && (
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-500">{t('roles.legacyRoleCode')}</dt>
                <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0 font-mono text-xs">{role.legacyRoleCode}</dd>
              </div>
            )}
            {role.legacyUrn && (
              <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
                <dt className="text-sm font-medium text-gray-500">{t('roles.legacyUrn')}</dt>
                <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0 font-mono text-xs">{role.legacyUrn}</dd>
              </div>
            )}
          </dl>
        </CardBlock>
      </Card>

      {/* Access packages granted by this role */}
      <section className="mb-10">
        <Heading level={3} data-size="sm" className="mb-4">
          {t('roles.packages')}
          {variantPackages.length === 0 ? ` (${packages.length})` : ''}
        </Heading>

        {loadingPackages && (
          <div className="flex justify-center py-10">
            <Spinner aria-label={t('loading')} data-size="md" />
          </div>
        )}

        {!loadingPackages && packages.length === 0 && variantPackages.length === 0 && (
          <Paragraph className="text-center py-10 text-gray-500">
            {t('roles.noPackages')}
          </Paragraph>
        )}

        {!loadingPackages && packages.length > 0 && <PackageGrid packages={packages} />}

        {/* Variant-gated packages: one tab per enterprise type with relations */}
        {!loadingPackages && packages.length === 0 && variantPackages.length > 0 && (
          <>
            <Paragraph data-size="sm" className="text-gray-600 mb-4">
              {t('roles.packagesByVariant')}
            </Paragraph>
            <Tabs value={activeVariant} onChange={(val) => setActiveVariant(val)}>
              <Tabs.List>
                {variantPackages.map((v) => (
                  <Tabs.Tab key={v.variantName} value={v.variantName}>
                    {v.variantName} ({v.packages.length})
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              {variantPackages.map((v) => (
                <Tabs.Panel key={v.variantName} value={v.variantName}>
                  <div className="pt-4">
                    {v.variantDescription && (
                      <Paragraph data-size="sm" className="text-gray-500 mb-4">
                        {v.variantDescription}
                      </Paragraph>
                    )}
                    <PackageGrid packages={v.packages} />
                  </div>
                </Tabs.Panel>
              ))}
            </Tabs>
          </>
        )}
      </section>

      {/* Services this role has access to */}
      <section>
        <Heading level={3} data-size="sm" className="mb-4">
          {t('roles.services')} ({resources.length})
        </Heading>

        {loadingResources && (
          <div className="flex justify-center py-10">
            <Spinner aria-label={t('loading')} data-size="md" />
          </div>
        )}

        {!loadingResources && resources.length === 0 && (
          <Paragraph className="text-center py-16 text-gray-500">
            {t('roles.noServices')}
          </Paragraph>
        )}

        {!loadingResources && resources.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {resources.map((resource) => {
              const actions = actionMap[resource.refId] ?? [];
              return (
                <Link
                  key={resource.refId}
                  to={`/resource/${encodeURIComponent(resource.refId)}`}
                  className="no-underline"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                    <CardBlock className="p-5 flex flex-col gap-2">
                      <Heading level={4} data-size="2xs">
                        {resource.name}
                      </Heading>
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
