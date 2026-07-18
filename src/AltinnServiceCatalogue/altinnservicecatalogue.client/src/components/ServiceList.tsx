import { Link } from 'react-router-dom';
import type { ServiceResource } from '../types';
import { getText } from '../helpers';

function firstSentence(value: string) { const end = value.indexOf('.'); return end >= 0 ? value.slice(0, end + 1) : value; }

export default function ServiceList({ resources, lang, empty }: { resources: ServiceResource[]; lang: string; empty: string }) {
  if (!resources.length) return <div className="detail-empty">{empty}</div>;
  return <div className="detail-list">{resources.map((resource) => {
    return <Link key={resource.identifier} to={`/resource/${encodeURIComponent(resource.identifier)}`}>
      <span className={`type-chip type-${resource.resourceType}`}>{resource.resourceType}</span>
      <div><strong>{getText(resource.title, lang)}</strong><p>{firstSentence(getText(resource.description, lang))}</p></div>
      <span className="chevron" aria-hidden="true">›</span>
    </Link>;
  })}</div>;
}
