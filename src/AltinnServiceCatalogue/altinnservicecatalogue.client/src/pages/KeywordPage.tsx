import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ServiceResource } from '../types';
import { useLang } from '../lang'; import { useEnv } from '../env';
import ServiceList from '../components/ServiceList';

export default function KeywordPage() {
  const { lang } = useLang(); const { env } = useEnv(); const { word = '' } = useParams();
  const [resources, setResources] = useState<ServiceResource[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { fetch(`/api/v1/${env}/resource/bykeyword/${encodeURIComponent(word)}`).then((r) => r.ok ? r.json() as Promise<ServiceResource[]> : Promise.reject(new Error(String(r.status)))).then(setResources).catch((e) => setError(String(e))).finally(() => setLoading(false)); }, [env, word]);
  return <div className="detail-page keyword-page"><nav className="breadcrumbs"><Link to="/">{lang === 'nb' ? 'Hjem' : 'Home'}</Link><span>/</span><Link to="/keywords">{lang === 'nb' ? 'Nøkkelord' : 'Keywords'}</Link><span>/</span><span>{word}</span></nav><header className="simple-detail-header"><span className="eyebrow">{lang === 'nb' ? 'Nøkkelord' : 'Keyword'}</span><h1>«{word}»</h1></header>{loading ? <div className="detail-empty">{lang === 'nb' ? 'Laster …' : 'Loading …'}</div> : error ? <div className="detail-empty">{error}</div> : <><h2>{lang === 'nb' ? 'Tjenester som gjelder' : 'Related services'} ({resources.length})</h2><ServiceList resources={resources} lang={lang} empty={lang === 'nb' ? 'Ingen tjenester er knyttet til dette nøkkelordet ennå.' : 'No services are linked to this keyword yet.'} /></>}</div>;
}
