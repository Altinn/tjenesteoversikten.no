import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ServiceResource } from '../types';
import { getText } from '../helpers';
import { useLang } from '../lang'; import { useEnv } from '../env';
import ServiceList from '../components/ServiceList';

export default function ResourceTypePage() {
  const { lang } = useLang(); const { env } = useEnv(); const { resourceType = '' } = useParams();
  const [resources, setResources] = useState<ServiceResource[]>([]), [query, setQuery] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { fetch(`/api/v1/${env}/resource/resourcelist`).then((r) => r.ok ? r.json() as Promise<ServiceResource[]> : Promise.reject(new Error(String(r.status)))).then((all) => setResources(all.filter((r) => r.resourceType === resourceType))).catch((e) => setError(String(e))).finally(() => setLoading(false)); }, [env, resourceType]);
  const shown = useMemo(() => { const q = query.toLowerCase(); return resources.filter((r) => !q || `${getText(r.title, lang)} ${getText(r.description, lang)}`.toLowerCase().includes(q)); }, [resources, query, lang]);
  return <div className="detail-page"><nav className="breadcrumbs"><Link to="/types">{lang === 'nb' ? 'Ressurstyper' : 'Resource types'}</Link><span>/</span><span>{resourceType}</span></nav><header className="simple-detail-header"><span className={`type-chip type-${resourceType}`}>{lang === 'nb' ? 'Ressurstype' : 'Resource type'}</span><h1>{resourceType}</h1><p>{resources.length} {lang === 'nb' ? 'tjenester' : 'services'}</p></header>{loading ? <div className="detail-empty">{lang === 'nb' ? 'Laster …' : 'Loading …'}</div> : error ? <div className="detail-empty">{error}</div> : <><label className="detail-filter"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === 'nb' ? 'Søk i tjenester …' : 'Search services …'} /></label><h2>{lang === 'nb' ? 'Tjenester' : 'Services'}</h2><ServiceList resources={shown} lang={lang} empty={lang === 'nb' ? 'Ingen tjenester funnet.' : 'No services found.'} /></>}</div>;
}
