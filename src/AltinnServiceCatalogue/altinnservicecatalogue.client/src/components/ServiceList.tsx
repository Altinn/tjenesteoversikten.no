import { Link } from 'react-router-dom';
import type { ServiceResource } from '../types';
import { getText } from '../helpers';

const TYPE_KEYS = new Set(['AltinnApp', 'Altinn2Service', 'GenericAccessResource', 'MaskinportenSchema', 'CorrespondenceService']);
function firstSentence(value: string) { const end = value.indexOf('.'); return end >= 0 ? value.slice(0, end + 1) : value; }

export default function ServiceList({ resources, lang, empty }: { resources: ServiceResource[]; lang: string; empty: string }) {
  if (!resources.length) return <div className="detail-empty">{empty}</div>;
  return <div className="detail-list">{resources.map((resource) => {
    const type = TYPE_KEYS.has(resource.resourceType) ? resource.resourceType : 'Other';
    return <Link key={resource.identifier} to={`/resource/${encodeURIComponent(resource.identifier)}`}>
      <span className={`type-chip type-${type}`}>{resource.resourceType}</span>
      <div><strong>{getText(resource.title, lang)}</strong><p>{firstSentence(getText(resource.description, lang))}</p></div>
      <span className="chevron" aria-hidden="true">›</span>
    </Link>;
  })}</div>;
}
