import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Org, OrgList, ServiceResource } from '../types';
import { getText } from '../helpers';
import { useLang } from '../lang';
import { useEnv } from '../env';
import ServiceList from '../components/ServiceList';

export default function OrgPage() {
  const { lang } = useLang(); const { env } = useEnv(); const { orgCode = '' } = useParams();
  const [org, setOrg] = useState<Org | null>(null), [resources, setResources] = useState<ServiceResource[]>([]), [query, setQuery] = useState(''), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { let cancelled = false; Promise.all([
    fetch(`/api/v1/${env}/resource/orgs`).then((r) => r.ok ? r.json() as Promise<OrgList> : Promise.reject(new Error(String(r.status)))),
    fetch(`/api/v1/${env}/resource/resourcelist`).then((r) => r.ok ? r.json() as Promise<ServiceResource[]> : Promise.reject(new Error(String(r.status)))),
  ]).then(([data, all]) => { if (!cancelled) { setOrg(data.orgs?.[orgCode] ?? data.orgs?.[orgCode.toLowerCase()] ?? null); setResources(all.filter((r) => r.hasCompetentAuthority?.orgcode?.toLowerCase() === orgCode.toLowerCase())); } }).catch((e) => !cancelled && setError(String(e))).finally(() => !cancelled && setLoading(false)); return () => { cancelled = true; }; }, [env, orgCode]);
  const shown = useMemo(() => { const q = query.toLowerCase(); return resources.filter((r) => !q || `${getText(r.title, lang)} ${getText(r.description, lang)} ${r.identifier}`.toLowerCase().includes(q)); }, [resources, query, lang]);
  if (loading) return <div className="detail-empty">{lang === 'nb' ? 'Laster …' : 'Loading …'}</div>;
  if (error || !org) return <div className="detail-empty">{error || (lang === 'nb' ? 'Fant ikke tjenesteeieren.' : 'Service owner not found.')}</div>;
  const name = getText(org.name, lang);
  return <div className="detail-page"><nav className="breadcrumbs"><Link to="/">{lang === 'nb' ? 'Hjem' : 'Home'}</Link><span>/</span><span>{name}</span></nav><header className="org-detail-header"><span className="detail-logo">{org.logo ? <img src={org.logo} alt="" /> : orgCode.slice(0, 3).toUpperCase()}</span><div><h1>{name}</h1><p>{resources.length} {lang === 'nb' ? 'tjenester' : 'services'} · {orgCode}</p></div></header><label className="detail-filter"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === 'nb' ? 'Søk i tjenester …' : 'Search services …'} /></label><h2>{lang === 'nb' ? 'Tjenester' : 'Services'}</h2><ServiceList resources={shown} lang={lang} empty={lang === 'nb' ? 'Ingen tjenester samsvarer med søket.' : 'No services match your search.'} /></div>;
}
