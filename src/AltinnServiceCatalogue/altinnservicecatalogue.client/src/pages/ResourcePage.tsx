import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Heading,
  Paragraph,
  Spinner,
  Alert,
  Tag,
  Button,
  Card,
  CardBlock,
} from '@digdir/designsystemet-react';
import type { ServiceResource, PolicyRule, PackageDto, RoleDto, ResourceRight, AttributeMatch } from '../types';
import { getText } from '../helpers';
import { useLang } from '../lang';
import { useEnv } from '../env';
import { ResourceTypeTag } from '../components/ResourceTypeTag';

/** Extracts a readable label from a scope URN, e.g. "urn:altinn:task:taskutfylling" → "Taskutfylling" */
function scopeLabel(urn: string): string {
  const last = urn.split(':').at(-1) ?? urn;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

function sortResources(resources: AttributeMatch[]): AttributeMatch[] {
  return [...resources].sort((a, b) => {
    const aIsMain = a.value.startsWith('urn:altinn:resource');
    const bIsMain = b.value.startsWith('urn:altinn:resource');
    if (aIsMain && !bIsMain) return -1;
    if (!aIsMain && bIsMain) return 1;
    return 0;
  });
}

function RightsGroups({ rights, resourceLevelLabel }: { rights: ResourceRight[]; resourceLevelLabel: string }) {
  // Sort each right's resource array so urn:altinn:resource is always first
  const sorted = rights.map((r) => ({ ...r, resource: sortResources(r.resource) }));

  // Partition into resource-level (1 resource URN) and scoped (2+ resource URNs)
  const resourceLevel = sorted.filter((r) => r.resource.length < 2);
  const scoped = sorted.filter((r) => r.resource.length >= 2);

  // Group scoped rights by the second resource's value (scope = sub-resource)
  const scopeMap = new Map<string, ResourceRight[]>();
  for (const right of scoped) {
    const scope = right.resource[1].value;
    if (!scopeMap.has(scope)) scopeMap.set(scope, []);
    scopeMap.get(scope)!.push(right);
  }

  return (
    <div className="flex flex-col gap-5">
      {resourceLevel.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
            {resourceLevelLabel}
          </p>
          <div className="flex flex-wrap gap-2">
            {resourceLevel.map((r) => (
              <Tag key={r.key} data-size="sm" data-color="info">{r.name}</Tag>
            ))}
          </div>
        </div>
      )}
      {[...scopeMap.entries()].map(([scope, scopeRights]) => (
        <div key={scope}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--ds-color-neutral-text-subtle)' }}>
            {scopeLabel(scope)}
          </p>
          <div className="flex flex-wrap gap-2">
            {scopeRights.map((r) => (
              <Tag key={r.key} data-size="sm" data-color="neutral">{r.name}</Tag>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4 border-b border-gray-100">
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  );
}

const ACTION_COLORS: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  read: 'info',
  write: 'success',
  sign: 'warning',
  confirmationrequired: 'neutral',
};

interface SubjectActions {
  type: string;
  value: string;
  actions: string[];
  /** Subject came from /policy/subjects only — the rules API did not include it, so actions are unknown */
  actionsUnknown?: boolean;
}

/** Group policy rules by subject and collect actions per subject */
function groupRulesBySubject(rules: PolicyRule[]): SubjectActions[] {
  const map = new Map<string, SubjectActions>();

  for (const rule of rules) {
    for (const subject of rule.subject) {
      const key = `${subject.type}::${subject.value}`;
      if (!map.has(key)) {
        map.set(key, { type: subject.type, value: subject.value, actions: [] });
      }
      const entry = map.get(key)!;
      if (!entry.actions.includes(rule.action.value)) {
        entry.actions.push(rule.action.value);
      }
    }
  }

  return [...map.values()];
}

export default function ResourcePage() {
  const { lang, t } = useLang();
  const { env } = useEnv();
  const { id } = useParams<{ id: string }>();

  const [resource, setResource] = useState<ServiceResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Access rights from policy rules
  const [packageSubjects, setPackageSubjects] = useState<SubjectActions[]>([]);
  const [roleSubjects, setRoleSubjects] = useState<SubjectActions[]>([]);
  const [loadingRules, setLoadingRules] = useState(false);

  // Resolved links for packages and roles
  const [packageInfo, setPackageInfo] = useState<Record<string, { id: string; name: string }>>({});
  const [roleInfo, setRoleInfo] = useState<Record<string, { id: string; name: string }>>({});

  // Security level from XACML policy obligations
  const [securityLevel, setSecurityLevel] = useState<{ userLevel: number | null; orgLevel: number | null } | null>(null);
  const [loadingSecurityLevel, setLoadingSecurityLevel] = useState(false);

  // Possible rights (v2 API)
  const [rights, setRights] = useState<ResourceRight[]>([]);
  const [loadingRights, setLoadingRights] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/${env}/resource/${encodeURIComponent(id)}`)
      .then((res) => {
        if (res.status === 404) {
          setResource(null);
          return null;
        }
        if (!res.ok) throw new Error(`Failed to fetch resource: ${res.status}`);
        return res.json() as Promise<ServiceResource>;
      })
      .then((data) => {
        if (data) setResource(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, env]);

  // Fetch policy rules for this resource, and always merge in /policy/subjects.
  // The upstream /policy/rules flattener drops subjects for some policy shapes (e.g. rules with
  // several subject AnyOf groups, or Altinn 2 migrated _a1-/_a2- apps where it errors out), so
  // subjects that only appear in /policy/subjects are shown too, with actions marked as unknown.
  useEffect(() => {
    if (!id) return;
    setLoadingRules(true);

    const rulesUrl = `/api/v1/${env}/resource/${encodeURIComponent(id)}/policy/rules`;
    const subjectsUrl = `/api/v1/${env}/resource/${encodeURIComponent(id)}/policy/subjects`;

    (async () => {
      const [rulesRes, subjectsRes] = await Promise.allSettled([fetch(rulesUrl), fetch(subjectsUrl)]);

      let subjects: SubjectActions[] = [];

      if (rulesRes.status === 'fulfilled' && rulesRes.value.ok) {
        const rules = (await rulesRes.value.json()) as PolicyRule[];
        subjects = groupRulesBySubject(rules);
      }

      if (subjectsRes.status === 'fulfilled' && subjectsRes.value.ok) {
        const body = (await subjectsRes.value.json()) as { data?: { type: string; value: string }[] };
        const known = new Set(subjects.map((s) => `${s.type}::${s.value}`.toLowerCase()));
        for (const s of body.data ?? []) {
          if (!s.value || known.has(`${s.type}::${s.value}`.toLowerCase())) continue;
          subjects.push({ type: s.type, value: s.value, actions: [], actionsUnknown: true });
        }
      }

      const packages = subjects
        .filter((s) => s.type === 'urn:altinn:accesspackage')
        .sort((a, b) => a.value.localeCompare(b.value));
      setPackageSubjects(packages);

      const roles = subjects
        .filter((s) =>
          s.type === 'urn:altinn:rolecode' ||
          s.type === 'urn:altinn:external-role' ||
          s.type === 'urn:altinn:role',
        )
        .sort((a, b) => a.value.localeCompare(b.value));
      setRoleSubjects(roles);
    })()
      .catch(() => {
        setPackageSubjects([]);
        setRoleSubjects([]);
      })
      .finally(() => {
        setLoadingRules(false);
      });
  }, [id, env]);

  // Fetch possible rights (v2 API) — not available for Altinn2Service
  useEffect(() => {
    if (!id || !resource) return;
    if (resource.resourceType === 'Altinn2Service') return;

    setLoadingRights(true);

    fetch(`/api/v1/${env}/resource/${encodeURIComponent(id)}/policy/rights`, {
      headers: { 'Accept-Language': lang },
    })
      .then((res) => {
        if (!res.ok) return [];
        return res.json() as Promise<ResourceRight[]>;
      })
      .then(setRights)
      .catch(() => setRights([]))
      .finally(() => setLoadingRights(false));
  }, [id, env, lang, resource]);

  function fetchSecurityLevel() {
    if (!id) return;
    setLoadingSecurityLevel(true);
    fetch(`/api/v1/${env}/resource/${encodeURIComponent(id)}/policy/securitylevel`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<{ userLevel: number | null; orgLevel: number | null }>;
      })
      .then(setSecurityLevel)
      .catch(() => setSecurityLevel({ userLevel: null, orgLevel: null }))
      .finally(() => setLoadingSecurityLevel(false));
  }

  // Resolve package URN values to IDs and names
  useEffect(() => {
    if (packageSubjects.length === 0) return;
    let cancelled = false;

    Promise.all(
      packageSubjects.map(async (subject) => {
        try {
          const res = await fetch(
            `/api/v1/${env}/meta/info/accesspackages/urn/${encodeURIComponent(subject.value)}`,
          );
          if (!res.ok) return null;
          const pkg: PackageDto = await res.json();
          return { urnValue: subject.value, id: pkg.id, name: pkg.name };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (cancelled) return;
      const info: Record<string, { id: string; name: string }> = {};
      for (const r of results) {
        if (r) info[r.urnValue] = { id: r.id, name: r.name };
      }
      setPackageInfo(info);
    });

    return () => { cancelled = true; };
  }, [packageSubjects, env]);

  // Resolve role subjects to IDs and names
  useEffect(() => {
    if (roleSubjects.length === 0) return;
    let cancelled = false;

    fetch(`/api/v1/${env}/meta/info/roles`)
      .then((res) => {
        if (!res.ok) return [];
        return res.json() as Promise<RoleDto[]>;
      })
      .then((roles) => {
        if (cancelled) return;
        // Build lookup by full URN (lowercase)
        const byUrn = new Map<string, RoleDto>();
        for (const role of roles) {
          byUrn.set(role.urn.toLowerCase(), role);
          if (role.legacyRoleCode) {
            byUrn.set(`urn:altinn:rolecode:${role.legacyRoleCode.toLowerCase()}`, role);
          }
        }

        const info: Record<string, { id: string; name: string }> = {};
        for (const subject of roleSubjects) {
          const fullUrn = `${subject.type}:${subject.value}`.toLowerCase();
          const matched = byUrn.get(fullUrn);
          if (matched) {
            const key = `${subject.type}::${subject.value}`;
            info[key] = { id: matched.id, name: matched.name };
          }
        }
        setRoleInfo(info);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [roleSubjects, env]);

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
        {t('error.loadResource')}: {error}
      </Alert>
    );
  }

  if (!resource) {
    return (
      <>
        <Link to="/">
          <Button variant="tertiary" data-size="sm" className="mb-4" asChild>
            <span>&larr; {t('resource.back')}</span>
          </Button>
        </Link>
        <Alert data-color="warning">{t('resource.notFound')} &laquo;{id}&raquo;.</Alert>
      </>
    );
  }

  const orgCode = resource.hasCompetentAuthority?.orgcode?.toLowerCase();
  const yesNo = (val: boolean | undefined) => (val ? t('yes') : t('no'));

  const domain = env === 'prod' ? 'altinn.no' : 'tt02.altinn.no';

  // AltinnApp migrated from Altinn 2 — either MigratedApp resource type or AltinnApp with _a2- in identifier
  const isAltinnAppMigratedFromA2 =
    resource.resourceType === 'MigratedApp' ||
    (resource.resourceType === 'AltinnApp' && resource.identifier.includes('_a2-'));

  // AltinnApp not migrated — build app URL and Studio repo URL from ApplicationId reference
  const appRef =
    resource.resourceType === 'AltinnApp' && !isAltinnAppMigratedFromA2
      ? resource.resourceReferences?.find((r) => r.referenceType === 'ApplicationId')
      : undefined;
  const appUrl = appRef?.reference
    ? (() => {
        const [org, app] = appRef.reference.split('/');
        return `https://${org}.apps.${domain}/${org}/${app}/`;
      })()
    : undefined;
  const studioRepoUrl = appRef?.reference
    ? `https://altinn.studio/repos/${appRef.reference}`
    : undefined;

  // Altinn 2 ServiceEngine — identifier starts with se_
  const isServiceEngine = resource.identifier.startsWith('se_');
  const serviceCodeRef = resource.resourceReferences?.find((r) => r.referenceType === 'ServiceCode');
  const serviceEditionRef = resource.resourceReferences?.find((r) => r.referenceType === 'ServiceEditionCode');
  const seBaseUrl = env === 'prod' ? 'https://www.altinn.no' : 'https://tt02.altinn.no';
  const serviceEngineUrl =
    isServiceEngine && serviceCodeRef?.reference && serviceEditionRef?.reference
      ? `${seBaseUrl}/Pages/ServiceEngine/Start/StartService.aspx?ServiceEditionCode=${serviceEditionRef.reference}&ServiceCode=${serviceCodeRef.reference}`
      : undefined;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:underline">
          {t('nav.home')}
        </Link>
        <span>/</span>
        {orgCode && (
          <>
            <Link to={`/org/${orgCode}`} className="hover:underline">
              {getText(resource.hasCompetentAuthority?.name, lang)}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 truncate max-w-xs">{getText(resource.title, lang)}</span>
      </nav>

      {/* Title + status tags */}
      <section className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <Heading level={2} data-size="lg">
            {getText(resource.title, lang)}
          </Heading>
          {isAltinnAppMigratedFromA2 && (
            <Button variant="secondary" data-size="sm" disabled>
              ⛔ {t('resource.goToApp')}
            </Button>
          )}
          {appUrl && (
            <div className="flex items-center gap-2">
              {studioRepoUrl && (
                <a href={studioRepoUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" data-size="sm" asChild>
                    <span>{t('resource.studioRepo')} ↗</span>
                  </Button>
                </a>
              )}
              <a href={appUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" data-size="sm" asChild>
                  <span>{t('resource.goToApp')} ↗</span>
                </Button>
              </a>
            </div>
          )}
          {serviceEngineUrl && (
            <a href={serviceEngineUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="primary" data-size="sm" asChild>
                <span>{t('resource.goToApp')} ↗</span>
              </Button>
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ResourceTypeTag type={resource.resourceType} />
          {resource.status && (
            <Tag data-size="sm" data-color={resource.status === 'Active' ? 'success' : 'neutral'}>
              {resource.status}
            </Tag>
          )}
          {resource.delegable && (
            <Tag data-size="sm" data-color="info">
              {t('resource.delegable')}
            </Tag>
          )}
          {!resource.visible && (
            <Tag data-size="sm" data-color="warning">
              {t('resource.notVisible')}
            </Tag>
          )}
        </div>
      </section>

      {/* Alerts */}
      {!loadingRules && packageSubjects.length === 0 && (
        <Alert data-color="warning" className="mb-6">
          {t('resource.alert.noPackages')}
        </Alert>
      )}

      {resource.accessListMode === 'Enabled' && (
        <Alert data-color="info" className="mb-6">
          {t('resource.alert.accessList')}
        </Alert>
      )}

      {/* Description */}
      {getText(resource.description, lang) && (
        <section className="mb-8">
          <Heading level={3} data-size="xs" className="mb-3">
            {t('resource.description')}
          </Heading>
          <Paragraph data-size="sm">{getText(resource.description, lang)}</Paragraph>
        </section>
      )}

      {/* Rights description */}
      {getText(resource.rightDescription, lang) && (
        <section className="mb-8">
          <Heading level={3} data-size="xs" className="mb-3">
            {t('resource.rightDescription')}
          </Heading>
          <Paragraph data-size="sm">{getText(resource.rightDescription, lang)}</Paragraph>
        </section>
      )}

      {/* Possible rights */}
      {(loadingRights || rights.length > 0) && (
        <Card className="mb-8">
          <CardBlock className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Heading level={3} data-size="xs">
                {t('resource.possibleRights')}
              </Heading>
              <a
                href={`/api/v1/${env}/resource/${encodeURIComponent(id!)}/policy/rights`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline font-mono"
              >
                /policy/rights ↗
              </a>
            </div>

            {loadingRights && (
              <div className="flex justify-center py-6">
                <Spinner aria-label={t('loading')} data-size="md" />
              </div>
            )}

            {!loadingRights && <RightsGroups rights={rights} resourceLevelLabel={t('resource.possibleRights.resourceLevel')} />}
          </CardBlock>
        </Card>
      )}

      {/* Security level from XACML policy */}
      <Card className="mb-8">
        <CardBlock className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Heading level={3} data-size="xs">
              {t('resource.securityLevel')}
            </Heading>
            {!securityLevel && !loadingSecurityLevel && (
              <Button variant="secondary" data-size="sm" onClick={fetchSecurityLevel}>
                {t('resource.securityLevel.fetch')}
              </Button>
            )}
          </div>

          {loadingSecurityLevel && (
            <div className="flex justify-center py-4">
              <Spinner aria-label={t('loading')} data-size="md" />
            </div>
          )}

          {securityLevel && (
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{t('resource.securityLevel.user')}:</span>
                <Tag data-size="sm" data-color={securityLevel.userLevel ? 'info' : 'neutral'}>
                  {securityLevel.userLevel ?? t('resource.securityLevel.notSet')}
                </Tag>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{t('resource.securityLevel.org')}:</span>
                <Tag data-size="sm" data-color={securityLevel.orgLevel ? 'info' : 'neutral'}>
                  {securityLevel.orgLevel ?? t('resource.securityLevel.notSet')}
                </Tag>
              </div>
            </div>
          )}
        </CardBlock>
      </Card>

      {/* Access rights: packages and roles */}
      <Card className="mb-8">
        <CardBlock className="p-5">
          <Heading level={3} data-size="xs" className="mb-4">
            {t('resource.accessRights')}
          </Heading>

          {loadingRules && (
            <div className="flex justify-center py-6">
              <Spinner aria-label={t('loading')} data-size="md" />
            </div>
          )}

          {!loadingRules && packageSubjects.length === 0 && roleSubjects.length === 0 && (
            <Paragraph data-size="sm" className="text-gray-500">
              {t('resource.noAccessRights')}
            </Paragraph>
          )}

          {!loadingRules && packageSubjects.length > 0 && (
            <div className="mb-6">
              <Heading level={4} data-size="2xs" className="mb-3">
                {t('resource.accessPackagesSection')} ({packageSubjects.length})
              </Heading>
              <div className="space-y-2">
                {packageSubjects.map((subject) => {
                  const pkg = packageInfo[subject.value];
                  return (
                    <div key={subject.value} className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/package/${encodeURIComponent(subject.value)}`}
                        className="text-sm font-medium text-blue-600 hover:underline min-w-0"
                      >
                        {pkg ? pkg.name : subject.value}
                      </Link>
                      {subject.actions.map((action) => (
                        <Tag
                          key={action}
                          data-size="sm"
                          data-color={ACTION_COLORS[action] ?? 'neutral'}
                        >
                          {action}
                        </Tag>
                      ))}
                      {subject.actionsUnknown && (
                        <Tag data-size="sm" data-color="neutral">
                          {t('resource.actionsUnknown')}
                        </Tag>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loadingRules && roleSubjects.length > 0 && (
            <div>
              <Heading level={4} data-size="2xs" className="mb-3">
                {t('resource.rolesSection')} ({roleSubjects.length})
              </Heading>
              <div className="space-y-2">
                {roleSubjects.map((subject) => {
                  const key = `${subject.type}::${subject.value}`;
                  const role = roleInfo[key];
                  return (
                    <div key={key} className="flex items-center gap-2 flex-wrap">
                      {role ? (
                        <Link
                          to={`/role/${role.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline min-w-0"
                        >
                          {role.name}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium min-w-0">{subject.value}</span>
                      )}
                      {subject.actions.map((action) => (
                        <Tag
                          key={action}
                          data-size="sm"
                          data-color={ACTION_COLORS[action] ?? 'neutral'}
                        >
                          {action}
                        </Tag>
                      ))}
                      {subject.actionsUnknown && (
                        <Tag data-size="sm" data-color="neutral">
                          {t('resource.actionsUnknown')}
                        </Tag>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardBlock>
      </Card>

      {/* Competent Authority */}
      <Card className="mb-8">
        <CardBlock className="p-5">
          <Heading level={3} data-size="xs" className="mb-3">
            {t('resource.serviceOwner')}
          </Heading>
          <dl>
            <DetailRow label={t('resource.name')}>{getText(resource.hasCompetentAuthority?.name, lang)}</DetailRow>
            <DetailRow label={t('resource.orgCode')}>
              {orgCode && (
                <Link to={`/org/${orgCode}`} className="text-blue-600 hover:underline">
                  {resource.hasCompetentAuthority?.orgcode}
                </Link>
              )}
            </DetailRow>
            <DetailRow label={t('resource.orgNumber')}>
              {resource.hasCompetentAuthority?.organization}
            </DetailRow>
          </dl>
        </CardBlock>
      </Card>

      {/* Technical details */}
      <Card className="mb-8">
        <CardBlock className="p-5">
          <Heading level={3} data-size="xs" className="mb-3">
            {t('resource.technicalDetails')}
          </Heading>
          <dl>
            <DetailRow label={t('resource.identifier')}>{resource.identifier}</DetailRow>
            <DetailRow label={t('resource.resourceType')}>{resource.resourceType}</DetailRow>
            <DetailRow label={t('resource.status')}>{resource.status}</DetailRow>
            <DetailRow label={t('resource.version')}>{resource.version}</DetailRow>
            <DetailRow label={t('resource.versionId')}>{resource.versionId}</DetailRow>
            <DetailRow label={t('resource.accessListMode')}>{resource.accessListMode}</DetailRow>
            <DetailRow label={t('resource.delegableLabel')}>{yesNo(resource.delegable)}</DetailRow>
            <DetailRow label={t('resource.visible')}>{yesNo(resource.visible)}</DetailRow>
            <DetailRow label={t('resource.selfIdentified')}>
              {yesNo(resource.selfIdentifiedUserEnabled)}
            </DetailRow>
            <DetailRow label={t('resource.enterpriseUsers')}>
              {yesNo(resource.enterpriseUserEnabled)}
            </DetailRow>
            <DetailRow label={t('resource.oneTimeConsent')}>{yesNo(resource.isOneTimeConsent)}</DetailRow>
            {resource.homepage && (
              <DetailRow label={t('resource.homepage')}>
                <a
                  href={resource.homepage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {resource.homepage}
                </a>
              </DetailRow>
            )}
            {resource.isPartOf && <DetailRow label={t('resource.partOf')}>{resource.isPartOf}</DetailRow>}
          </dl>
        </CardBlock>
      </Card>

      {/* Available for types */}
      {resource.availableForType && resource.availableForType.length > 0 && (
        <Card className="mb-8">
          <CardBlock className="p-5">
            <Heading level={3} data-size="xs" className="mb-3">
              {t('resource.availableFor')}
            </Heading>
            <div className="flex flex-wrap gap-2">
              {resource.availableForType.map((type) => (
                <Tag key={type} data-size="sm" variant="outline">
                  {type}
                </Tag>
              ))}
            </div>
          </CardBlock>
        </Card>
      )}

      {/* Resource references */}
      {resource.resourceReferences && resource.resourceReferences.length > 0 && (
        <Card className="mb-8">
          <CardBlock className="p-5">
            <Heading level={3} data-size="xs" className="mb-3">
              {t('resource.references')}
            </Heading>
            <div className="space-y-2">
              {resource.resourceReferences.map((ref, i) => (
                <div key={i} className="flex flex-wrap gap-2 items-center text-sm">
                  {ref.referenceSource && (
                    <Tag data-size="sm" variant="outline">
                      {ref.referenceSource}
                    </Tag>
                  )}
                  {ref.referenceType && (
                    <Tag data-size="sm" variant="outline">
                      {ref.referenceType}
                    </Tag>
                  )}
                  {ref.reference && <span className="font-mono text-xs">{ref.reference}</span>}
                </div>
              ))}
            </div>
          </CardBlock>
        </Card>
      )}

      {/* Authorization references */}
      {resource.authorizationReference && resource.authorizationReference.length > 0 && (
        <Card className="mb-8">
          <CardBlock className="p-5">
            <Heading level={3} data-size="xs" className="mb-3">
              {t('resource.authReferences')}
            </Heading>
            <div className="space-y-2">
              {resource.authorizationReference.map((ref, i) => (
                <div key={i} className="text-sm">
                  <span className="font-mono text-xs text-gray-500">{ref.id}</span>
                  <span className="mx-2">=</span>
                  <span className="font-mono text-xs">{ref.value}</span>
                </div>
              ))}
            </div>
          </CardBlock>
        </Card>
      )}

      {/* Contact points */}
      {resource.contactPoints && resource.contactPoints.length > 0 && (
        <Card className="mb-8">
          <CardBlock className="p-5">
            <Heading level={3} data-size="xs" className="mb-3">
              {t('resource.contactPoints')}
            </Heading>
            <div className="space-y-4">
              {resource.contactPoints.map((cp, i) => (
                <dl key={i}>
                  {cp.category && <DetailRow label={t('resource.category')}>{cp.category}</DetailRow>}
                  {cp.email && (
                    <DetailRow label={t('resource.email')}>
                      <a href={`mailto:${cp.email}`} className="text-blue-600 hover:underline">
                        {cp.email}
                      </a>
                    </DetailRow>
                  )}
                  {cp.telephone && <DetailRow label={t('resource.phone')}>{cp.telephone}</DetailRow>}
                  {cp.contactPage && (
                    <DetailRow label={t('resource.contactPage')}>
                      <a
                        href={cp.contactPage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {cp.contactPage}
                      </a>
                    </DetailRow>
                  )}
                </dl>
              ))}
            </div>
          </CardBlock>
        </Card>
      )}

      {/* Keywords */}
      {resource.keywords && resource.keywords.length > 0 && (
        <Card className="mb-8">
          <CardBlock className="p-5">
            <Heading level={3} data-size="xs" className="mb-3">
              {t('resource.keywords')}
            </Heading>
            <div className="flex flex-wrap gap-2">
              {resource.keywords.map((kw, i) => (
                <Tag key={i} data-size="sm" variant="outline">
                  {kw.word}
                </Tag>
              ))}
            </div>
          </CardBlock>
        </Card>
      )}

      {/* Spatial */}
      {resource.spatial && resource.spatial.length > 0 && (
        <Card className="mb-8">
          <CardBlock className="p-5">
            <Heading level={3} data-size="xs" className="mb-3">
              {t('resource.spatial')}
            </Heading>
            <div className="flex flex-wrap gap-2">
              {resource.spatial.map((s) => (
                <Tag key={s} data-size="sm" variant="outline">
                  {s}
                </Tag>
              ))}
            </div>
          </CardBlock>
        </Card>
      )}

      {/* Thematic areas */}
      {resource.thematicAreas && resource.thematicAreas.length > 0 && (
        <Card className="mb-8">
          <CardBlock className="p-5">
            <Heading level={3} data-size="xs" className="mb-3">
              {t('resource.thematicAreas')}
            </Heading>
            <div className="flex flex-wrap gap-2">
              {resource.thematicAreas.map((area) => (
                <Tag key={area} data-size="sm" variant="outline">
                  {area}
                </Tag>
              ))}
            </div>
          </CardBlock>
        </Card>
      )}
    </>
  );
}
