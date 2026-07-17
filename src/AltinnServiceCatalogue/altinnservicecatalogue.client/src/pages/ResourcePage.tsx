import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spinner, Alert } from '@digdir/designsystemet-react';
import type { ServiceResource, PolicyRule, PackageDto, RoleDto, ResourceRight, AttributeMatch } from '../types';
import { getText } from '../helpers';
import { useLang } from '../lang';
import { useEnv } from '../env';

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
  const sorted = rights.map((right) => ({
    ...right,
    resource: sortResources(right.resource),
  }));
  const resourceLevel = sorted.filter((right) => right.resource.length < 2);
  const scoped = sorted.filter((right) => right.resource.length >= 2);
  const scopeMap = new Map<string, ResourceRight[]>();

  for (const right of scoped) {
    const scope = right.resource[1].value;
    scopeMap.set(scope, [...(scopeMap.get(scope) ?? []), right]);
  }

  return (
    <div className="resource-right-groups">
      {resourceLevel.length > 0 && (
        <section>
          <span className="resource-right-label">{resourceLevelLabel}</span>
          <div className="resource-right-pills">
            {resourceLevel.map((right) => <span key={right.key}>{right.name}</span>)}
          </div>
        </section>
      )}
      {[...scopeMap.entries()].map(([scope, scopeRights]) => (
        <section key={scope}>
          <span className="resource-right-label">{scopeLabel(scope)}</span>
          <div className="resource-right-pills">
            {scopeRights.map((right) => <span key={right.key}>{right.name}</span>)}
          </div>
        </section>
      ))}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="resource-detail-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function ActionList({
  actions,
  unknown,
  unknownLabel,
}: {
  actions: string[];
  unknown?: boolean;
  unknownLabel: string;
}) {
  if (actions.length === 0 && !unknown) return null;
  return (
    <span className="resource-action-list">
      {actions.map((action) => (
        <span className="resource-action" data-action={action.toLowerCase()} key={action}>
          {action}
        </span>
      ))}
      {unknown && <span className="resource-action" data-action="unknown">{unknownLabel}</span>}
    </span>
  );
}
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
        <Link to="/" className="resource-back-link">&larr; {t('resource.back')}</Link>
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

  const resourceTitle = getText(resource.title, lang);
  const resourceDescription = getText(resource.description, lang);
  const ownerName = getText(resource.hasCompetentAuthority?.name, lang);
  const hasExtraMetadata = Boolean(
    resource.availableForType?.length ||
    resource.resourceReferences?.length ||
    resource.authorizationReference?.length ||
    resource.contactPoints?.length ||
    resource.keywords?.length ||
    resource.spatial?.length ||
    resource.thematicAreas?.length,
  );

  return (
    <div className="resource-detail-page">
      <nav className="breadcrumbs" aria-label={lang === 'nb' ? 'Brødsmuler' : 'Breadcrumbs'}>
        <Link to="/">{t('nav.home')}</Link>
        <span>/</span>
        {orgCode && (
          <>
            <Link to={'/org/' + orgCode}>{ownerName}</Link>
            <span>/</span>
          </>
        )}
        <span className="resource-breadcrumb-current">{resourceTitle}</span>
      </nav>

      <header className="resource-detail-hero">
        <div className="resource-heading-row">
          <span className="resource-detail-icon" aria-hidden="true">
            {resource.resourceType.slice(0, 2).toUpperCase()}
          </span>
          <div className="resource-title-copy">
            <span className="eyebrow">{resource.resourceType}</span>
            <h1>{resourceTitle}</h1>
            {ownerName && (
              orgCode ? (
                <Link className="resource-owner-link" to={'/org/' + orgCode}>{ownerName}</Link>
              ) : (
                <span className="resource-owner-link">{ownerName}</span>
              )
            )}
          </div>

          <div className="resource-header-actions">
            {isAltinnAppMigratedFromA2 && (
              <span className="resource-link-button disabled">⛔ {t('resource.goToApp')}</span>
            )}
            {studioRepoUrl && (
              <a className="resource-link-button secondary" href={studioRepoUrl} target="_blank" rel="noopener noreferrer">
                {t('resource.studioRepo')} <span aria-hidden="true">↗</span>
              </a>
            )}
            {appUrl && (
              <a className="resource-link-button primary" href={appUrl} target="_blank" rel="noopener noreferrer">
                {t('resource.goToApp')} <span aria-hidden="true">↗</span>
              </a>
            )}
            {serviceEngineUrl && (
              <a className="resource-link-button primary" href={serviceEngineUrl} target="_blank" rel="noopener noreferrer">
                {t('resource.goToApp')} <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </div>

        {resourceDescription && <p className="resource-description">{resourceDescription}</p>}

        <div className="resource-status-list">
          {resource.status && (
            <span className="resource-status" data-tone={resource.status === 'Active' ? 'positive' : 'neutral'}>
              <span aria-hidden="true">{resource.status === 'Active' ? '●' : '○'}</span>
              {resource.status}
            </span>
          )}
          <span className="resource-status" data-tone={resource.delegable ? 'positive' : 'neutral'}>
            <span aria-hidden="true">{resource.delegable ? '✓' : '–'}</span>
            {resource.delegable ? t('resource.delegable') : t('packages.notDelegable')}
          </span>
          <span className="resource-status" data-tone={resource.visible ? 'positive' : 'warning'}>
            <span aria-hidden="true">{resource.visible ? '✓' : '!'}</span>
            {resource.visible ? t('resource.visible') : t('resource.notVisible')}
          </span>
        </div>
      </header>

      <section className="resource-facts" aria-label={lang === 'nb' ? 'Ressursfakta' : 'Resource facts'}>
        <dl className="resource-fact-grid">
          <div><dt>{t('resource.serviceOwner')}</dt><dd>{ownerName || '–'}</dd></div>
          <div><dt>{t('resource.status')}</dt><dd>{resource.status || '–'}</dd></div>
          <div><dt>{t('resource.delegableLabel')}</dt><dd>{yesNo(resource.delegable)}</dd></div>
          <div><dt>{t('resource.visible')}</dt><dd>{yesNo(resource.visible)}</dd></div>
        </dl>
        <div className="resource-identifier">
          <span>{t('resource.identifier')}</span>
          <code>{resource.identifier}</code>
        </div>
      </section>

      <div className="resource-alerts">
        {!loadingRules && packageSubjects.length === 0 && (
          <Alert data-color="warning">{t('resource.alert.noPackages')}</Alert>
        )}
        {resource.accessListMode === 'Enabled' && (
          <Alert data-color="info">{t('resource.alert.accessList')}</Alert>
        )}
      </div>

      <div className="resource-detail-layout">
        <main className="resource-main-column">
          {getText(resource.rightDescription, lang) && (
            <section className="resource-right-description">
              <span>{t('resource.rightDescription')}</span>
              <p>{getText(resource.rightDescription, lang)}</p>
            </section>
          )}

          <section className="resource-panel resource-access-panel">
            <header className="resource-panel-header">
              <div>
                <h2>{t('resource.accessRights')}</h2>
                <p>{lang === 'nb' ? 'Tilgangspakker og roller som gir tilgang til tjenesten.' : 'Access packages and roles that grant access to the service.'}</p>
              </div>
              {!loadingRules && <span className="resource-count">{packageSubjects.length + roleSubjects.length}</span>}
            </header>

            {loadingRules && <div className="resource-loading"><Spinner aria-label={t('loading')} data-size="md" /></div>}
            {!loadingRules && packageSubjects.length === 0 && roleSubjects.length === 0 && (
              <div className="resource-empty">{t('resource.noAccessRights')}</div>
            )}

            {!loadingRules && packageSubjects.length > 0 && (
              <section className="resource-access-group">
                <header><h3>{t('resource.accessPackagesSection')}</h3><span>{packageSubjects.length}</span></header>
                <div className="resource-access-list">
                  {packageSubjects.map((subject) => {
                    const pkg = packageInfo[subject.value];
                    return (
                      <Link className="resource-access-row" key={subject.value} to={'/package/' + encodeURIComponent(subject.value)}>
                        <span className="resource-access-copy">
                          <strong>{pkg ? pkg.name : subject.value}</strong>
                          {pkg && <code>{subject.value}</code>}
                          <ActionList actions={subject.actions} unknown={subject.actionsUnknown} unknownLabel={t('resource.actionsUnknown')} />
                        </span>
                        <span className="resource-row-chevron" aria-hidden="true">›</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {!loadingRules && roleSubjects.length > 0 && (
              <section className="resource-access-group">
                <header><h3>{t('resource.rolesSection')}</h3><span>{roleSubjects.length}</span></header>
                <div className="resource-access-list">
                  {roleSubjects.map((subject) => {
                    const key = subject.type + '::' + subject.value;
                    const role = roleInfo[key];
                    const content = (
                      <>
                        <span className="resource-access-copy">
                          <strong>{role ? role.name : subject.value}</strong>
                          {role && <code>{subject.value}</code>}
                          <ActionList actions={subject.actions} unknown={subject.actionsUnknown} unknownLabel={t('resource.actionsUnknown')} />
                        </span>
                        {role && <span className="resource-row-chevron" aria-hidden="true">›</span>}
                      </>
                    );
                    return role ? (
                      <Link className="resource-access-row" key={key} to={'/role/' + role.id}>{content}</Link>
                    ) : (
                      <div className="resource-access-row" key={key}>{content}</div>
                    );
                  })}
                </div>
              </section>
            )}
          </section>

          {(loadingRights || rights.length > 0) && (
            <section className="resource-panel">
              <header className="resource-panel-header">
                <div>
                  <h2>{t('resource.possibleRights')}</h2>
                  <p>{lang === 'nb' ? 'Handlingene tjenesten støtter, gruppert etter ressursnivå.' : 'Actions supported by the service, grouped by resource level.'}</p>
                </div>
                <a className="resource-api-link" href={'/api/v1/' + env + '/resource/' + encodeURIComponent(id!) + '/policy/rights'} target="_blank" rel="noopener noreferrer">
                  /policy/rights ↗
                </a>
              </header>
              {loadingRights ? (
                <div className="resource-loading"><Spinner aria-label={t('loading')} data-size="md" /></div>
              ) : (
                <RightsGroups rights={rights} resourceLevelLabel={t('resource.possibleRights.resourceLevel')} />
              )}
            </section>
          )}
        </main>

        <aside className="resource-side-column">
          <section className="resource-side-panel resource-owner-panel">
            <span className="resource-side-label">{t('resource.serviceOwner')}</span>
            {orgCode ? (
              <Link to={'/org/' + orgCode}>
                <strong>{ownerName}</strong>
                <span>{resource.hasCompetentAuthority?.orgcode}</span>
                <span>{resource.hasCompetentAuthority?.organization}</span>
                <b aria-hidden="true">›</b>
              </Link>
            ) : (
              <div><strong>{ownerName}</strong><span>{resource.hasCompetentAuthority?.organization}</span></div>
            )}
          </section>

          <section className="resource-side-panel">
            <header className="resource-side-header">
              <div>
                <span className="resource-side-label">{t('resource.securityLevel')}</span>
                <p>{lang === 'nb' ? 'Krav fra tjenestens policy.' : 'Requirements from the service policy.'}</p>
              </div>
              {!securityLevel && !loadingSecurityLevel && (
                <button className="resource-small-button" onClick={fetchSecurityLevel}>{t('resource.securityLevel.fetch')}</button>
              )}
            </header>
            {loadingSecurityLevel && <div className="resource-loading compact"><Spinner aria-label={t('loading')} data-size="sm" /></div>}
            {securityLevel && (
              <dl className="resource-security-grid">
                <div><dt>{t('resource.securityLevel.user')}</dt><dd>{securityLevel.userLevel ?? t('resource.securityLevel.notSet')}</dd></div>
                <div><dt>{t('resource.securityLevel.org')}</dt><dd>{securityLevel.orgLevel ?? t('resource.securityLevel.notSet')}</dd></div>
              </dl>
            )}
          </section>

          <section className="resource-side-panel">
            <span className="resource-side-label">{t('resource.technicalDetails')}</span>
            <dl className="resource-technical-list">
              <DetailRow label={t('resource.resourceType')}>{resource.resourceType}</DetailRow>
              <DetailRow label={t('resource.version')}>{resource.version}</DetailRow>
              <DetailRow label={t('resource.versionId')}>{resource.versionId}</DetailRow>
              <DetailRow label={t('resource.accessListMode')}>{resource.accessListMode}</DetailRow>
              <DetailRow label={t('resource.selfIdentified')}>{yesNo(resource.selfIdentifiedUserEnabled)}</DetailRow>
              <DetailRow label={t('resource.enterpriseUsers')}>{yesNo(resource.enterpriseUserEnabled)}</DetailRow>
              <DetailRow label={t('resource.oneTimeConsent')}>{yesNo(resource.isOneTimeConsent)}</DetailRow>
              {resource.homepage && (
                <DetailRow label={t('resource.homepage')}>
                  <a href={resource.homepage} target="_blank" rel="noopener noreferrer">{lang === 'nb' ? 'Åpne nettside ↗' : 'Open website ↗'}</a>
                </DetailRow>
              )}
              {resource.isPartOf && <DetailRow label={t('resource.partOf')}>{resource.isPartOf}</DetailRow>}
            </dl>
          </section>
        </aside>
      </div>

      {hasExtraMetadata && (
        <details className="resource-extra-panel">
          <summary>
            <span>
              <strong>{lang === 'nb' ? 'Flere metadata' : 'More metadata'}</strong>
              <small>{lang === 'nb' ? 'Referanser, kontaktinformasjon og klassifisering.' : 'References, contact information and classification.'}</small>
            </span>
            <b aria-hidden="true">⌄</b>
          </summary>
          <div className="resource-extra-grid">
            {resource.availableForType && resource.availableForType.length > 0 && (
              <section><h3>{t('resource.availableFor')}</h3><div className="resource-meta-pills">{resource.availableForType.map((type) => <span key={type}>{type}</span>)}</div></section>
            )}
            {resource.resourceReferences && resource.resourceReferences.length > 0 && (
              <section>
                <h3>{t('resource.references')}</h3>
                <div className="resource-reference-list">
                  {resource.resourceReferences.map((ref, index) => (
                    <div key={index}><span>{[ref.referenceSource, ref.referenceType].filter(Boolean).join(' · ')}</span>{ref.reference && <code>{ref.reference}</code>}</div>
                  ))}
                </div>
              </section>
            )}
            {resource.authorizationReference && resource.authorizationReference.length > 0 && (
              <section>
                <h3>{t('resource.authReferences')}</h3>
                <div className="resource-reference-list">{resource.authorizationReference.map((ref, index) => <div key={index}><code>{ref.id} = {ref.value}</code></div>)}</div>
              </section>
            )}
            {resource.contactPoints && resource.contactPoints.length > 0 && (
              <section>
                <h3>{t('resource.contactPoints')}</h3>
                <div className="resource-contact-list">
                  {resource.contactPoints.map((contact, index) => (
                    <div key={index}>
                      {contact.category && <strong>{contact.category}</strong>}
                      {contact.email && <a href={'mailto:' + contact.email}>{contact.email}</a>}
                      {contact.telephone && <span>{contact.telephone}</span>}
                      {contact.contactPage && <a href={contact.contactPage} target="_blank" rel="noopener noreferrer">{t('resource.contactPage')} ↗</a>}
                    </div>
                  ))}
                </div>
              </section>
            )}
            {resource.keywords && resource.keywords.length > 0 && (
              <section><h3>{t('resource.keywords')}</h3><div className="resource-meta-pills">{resource.keywords.map((keyword, index) => <span key={index}>{keyword.word}</span>)}</div></section>
            )}
            {resource.spatial && resource.spatial.length > 0 && (
              <section><h3>{t('resource.spatial')}</h3><div className="resource-meta-pills">{resource.spatial.map((item) => <span key={item}>{item}</span>)}</div></section>
            )}
            {resource.thematicAreas && resource.thematicAreas.length > 0 && (
              <section><h3>{t('resource.thematicAreas')}</h3><div className="resource-meta-pills">{resource.thematicAreas.map((area) => <span key={area}>{area}</span>)}</div></section>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
