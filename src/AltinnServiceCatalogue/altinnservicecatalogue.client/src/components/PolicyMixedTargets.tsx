import { Link } from 'react-router-dom';
import { getText } from '../helpers';
import type { PolicyMixedTargetResource, PolicyStatistics } from '../types';

export default function PolicyMixedTargets({ statistics, env, lang, format }: {
  statistics: PolicyStatistics; env: string; lang: string; format: (value: number) => string;
}) {
  const text = lang === 'nb' ? {
    title: 'Handling og ressurs i samme AllOf',
    description: 'Finner mønsteret fra eldre appmaler der en handling, for eksempel delete, ligger sammen med ressursattributter i samme AllOf. Dette kan gi feil når Ressursregisteret deler policyen opp i rettigheter og regler. Funnene bekrefter ikke HTTP 500.',
    guidance: 'Tjenesteeier bør gjennomgå treffene og oppdatere policyen. I den gamle appmalen skal handlingen ligge i en egen AnyOf med AllOf/Match under samme Target. Kontroller at tilsiktet tilgang beholdes før publisering.',
    scope: 'Kontrollen leser rå policy-XML for alle ressurstyper, uavhengig av algoritme. Bare blanding i samme AllOf telles. Funn beholdes selv om øvrig policytolking feiler.',
    checked: 'policyer kontrollert', resources: 'berørte tjenester', owners: 'tjenesteeiere',
    generated: 'Skannet', unknownOwner: 'Ukjent tjenesteeier',
    empty: 'Ingen treff blant de kontrollerte policyene.',
    partial: 'Skanningen har hente- eller tolkefeil. Policyer som ikke kunne hentes eller leses som XACML-XML er ikke kontrollert; se dekning og datakvalitet over.',
    rule: 'Regel', policy: 'Policyens Target', actions: 'Handlinger', attributes: 'Ressursattributter',
    source: 'Vis policy-XML', unavailable: 'Denne kontrollen er ikke tilgjengelig i analyseresultatet.',
  } : {
    title: 'Action and resource in the same AllOf',
    description: 'Finds the legacy app template pattern where an action, such as delete, shares an AllOf with resource attributes. This can cause errors when the Resource Registry splits the policy into rights and rules. Findings do not confirm HTTP 500.',
    guidance: 'The service owner should review findings and update the policy. In the legacy app template, the action belongs in a separate AnyOf with AllOf/Match under the same Target. Verify that intended access is preserved before publishing.',
    scope: 'Checks raw policy XML across all resource types, regardless of algorithm. Only mixing within the same AllOf is counted. Findings are retained even if further policy parsing fails.',
    checked: 'policies checked', resources: 'affected services', owners: 'service owners',
    generated: 'Scanned', unknownOwner: 'Unknown service owner',
    empty: 'No findings among the checked policies.',
    partial: 'The scan has fetch or parse failures. Policies that could not be fetched or read as XACML XML were not checked; see coverage and data quality above.',
    rule: 'Rule', policy: 'Policy Target', actions: 'Actions', attributes: 'Resource attributes',
    source: 'View policy XML', unavailable: 'This check is not available in the analysis result.',
  };
  if (!statistics.mixedTargetResources) return <div className="notice">{text.unavailable}</div>;

  const ownerGroups = new Map<string, PolicyMixedTargetResource[]>();
  for (const resource of statistics.mixedTargetResources) {
    const key = resource.ownerId.toLowerCase();
    const group = ownerGroups.get(key) ?? [];
    group.push(resource);
    ownerGroups.set(key, group);
  }
  const ownerName = (resources: PolicyMixedTargetResource[]) =>
    getText(resources[0].ownerName, lang) || resources[0].ownerId || text.unknownOwner;
  const groups = [...ownerGroups.entries()].sort(([, left], [, right]) => ownerName(left).localeCompare(ownerName(right), lang));

  return <section className="role-category-section mixed-target-section" aria-labelledby="mixed-target-title">
    <header className="role-category-header">
      <div><h3 id="mixed-target-title">{text.title}</h3><p>{text.description}</p></div>
      <strong>{format(statistics.mixedTargetResourceCount)}</strong>
    </header>
    <p className="statistics-description">{text.scope}</p>
    <div className="results-count">
      {format(statistics.mixedTargetPoliciesChecked)} {text.checked} · {format(statistics.mixedTargetResourceCount)} {text.resources} · {format(groups.length)} {text.owners}
      {' · '}{text.generated}: {new Date(statistics.generatedAt).toLocaleString(lang === 'nb' ? 'nb-NO' : 'en-GB')}
    </div>
    {(statistics.fetchFailures > 0 || statistics.parseFailures > 0) && <p className="notice">{text.partial}</p>}
    {groups.length === 0 ? <p>{text.empty}</p> : <>
      <p className="statistics-description">{text.guidance}</p>
      <div className="statistics-group-list">{groups.map(([ownerId, resources]) => <details key={ownerId}>
        <summary>
          <span className="statistics-group-owner"><strong>{ownerName(resources)}</strong><small>{resources[0].ownerId}</small></span>
          <strong className="statistics-group-count">{format(resources.length)}</strong>
        </summary>
        {resources.map((resource) => <article className="distribution-card" key={resource.resourceId}>
          <header>
            <Link to={'/resource/' + encodeURIComponent(resource.resourceId)}>{getText(resource.title, lang) || resource.resourceId}</Link>
            <span className={'type-chip type-' + resource.resourceType}>{resource.resourceType}</span>
          </header>
          <p>{resource.resourceId}</p>
          <ul>{resource.findings.map((finding, index) => <li key={index}>
            <strong>{finding.targetKind === 'Rule' ? `${text.rule}: ${finding.ruleId || '—'}` : text.policy}</strong>
            {' · '}AnyOf {finding.anyOfIndex} / AllOf {finding.allOfIndex}
            <p>{text.actions}: {finding.actions.join(', ')}<br />{text.attributes}: {finding.resourceAttributeIds.join(', ')}</p>
          </li>)}</ul>
          <a href={`/api/v1/${env}/resource/${encodeURIComponent(resource.resourceId)}/policy`} target="_blank" rel="noreferrer">{text.source}</a>
        </article>)}
      </details>)}</div>
    </>}
  </section>;
}
