import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ServiceResource } from '../types';
import { getText } from '../helpers';
import { useLang } from '../lang';
import { retiredLabel, splitRetired } from '../serviceVisibility';
import RetiredServicesNotice from './RetiredServicesNotice';

function firstSentence(value: string) { const end = value.indexOf('.'); return end >= 0 ? value.slice(0, end + 1) : value; }

function ServiceRow({ resource, lang, retired }: { resource: ServiceResource; lang: string; retired?: string }) {
  return <Link key={resource.identifier} to={`/resource/${encodeURIComponent(resource.identifier)}`} className={retired ? 'is-retired' : undefined}>
    <span className={`type-chip type-${resource.resourceType}`}>{resource.resourceType}</span>
    <div><strong>{getText(resource.title, lang)}{retired && <span className="retired-chip">{retired}</span>}</strong><p>{firstSentence(getText(resource.description, lang))}</p></div>
    <span className="chevron" aria-hidden="true">›</span>
  </Link>;
}

export default function ServiceList({ resources, lang, empty }: { resources: ServiceResource[]; lang: string; empty: string }) {
  const { t } = useLang();
  const [showRetired, setShowRetired] = useState(false);
  const { active, retired } = useMemo(() => splitRetired(resources, (r) => r), [resources]);

  if (!resources.length) return <div className="detail-empty">{empty}</div>;

  return <>
    {active.length === 0
      ? <div className="detail-empty">{empty}</div>
      : <div className="detail-list">{active.map((resource) => <ServiceRow key={resource.identifier} resource={resource} lang={lang} />)}</div>}
    <RetiredServicesNotice count={retired.length} expanded={showRetired} onToggle={() => setShowRetired((on) => !on)} />
    {showRetired && retired.length > 0 && <div className="detail-list">{retired.map((resource) =>
      <ServiceRow key={resource.identifier} resource={resource} lang={lang} retired={retiredLabel(resource, t('resource.notVisible'))} />)}</div>}
  </>;
}
