import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AreaDto, AreaGroupDto, PackageDto } from '../types';
import { fetchPackageGroupsBilingual, packagePath } from '../helpers';
import { useEnv } from '../env'; import { useLang } from '../lang';

const WHO = ['colleague', 'accountant', 'system'] as const;
type Who = typeof WHO[number];
function initials(value: string) { return value.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase(); }

export default function DelegationWizardPage() {
  const { lang } = useLang(); const { env } = useEnv();
  const [groups, setGroups] = useState<AreaGroupDto[]>([]), [area, setArea] = useState<AreaDto | null>(null), [who, setWho] = useState<Who | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState('');
  useEffect(() => { fetchPackageGroupsBilingual(env).then(setGroups).catch((e) => setError(String(e))).finally(() => setLoading(false)); }, [env]);
  const areas = useMemo(() => groups.flatMap((g) => g.areas ?? []), [groups]);
  const step = who ? 3 : area ? 2 : 1;
  const copy = lang === 'nb' ? {
    label:'Tilgangsveiviseren', sub:'Tre steg — så vet du hvilken tilgangspakke som trengs.', questions:['Hva gjelder det?','Hvem skal ha tilgangen?','Vår anbefaling'],
    who:[['Meg selv eller en kollega','En ansatt i virksomheten skal bruke tjenesten.'],['Regnskapsfører eller revisor','En ekstern samarbeidspartner skal jobbe på vegne av dere.'],['Et fagsystem','Maskin-til-maskin-tilgang via Maskinporten.']],
    rec:'Anbefalt tilgangspakke', see:'Se pakken', restart:'Start på nytt', back:'← Tilbake', packages:'tilgangspakker', loading:'Laster områder …',
  } : {
    label:'The access wizard', sub:'Three steps — then you know which access package you need.', questions:['What is it about?','Who needs the access?','Our recommendation'],
    who:[['Myself or a colleague','An employee of the organisation will use the service.'],['Accountant or auditor','An external partner working on your behalf.'],['A software system','Machine-to-machine access via Maskinporten.']],
    rec:'Recommended access package', see:'View package', restart:'Start over', back:'← Back', packages:'access packages', loading:'Loading areas …',
  };
  const recommendation = useMemo<PackageDto | null>(() => {
    if (!area || !who) return null; const packages = area.packages ?? [];
    if (who === 'system') return packages.find((p) => /maskinporten|integrasjon|api/i.test(`${p.name} ${p.description}`)) ?? groups.flatMap((g) => g.areas ?? []).flatMap((a) => a.packages ?? []).find((p) => /maskinporten|integrasjon|api/i.test(`${p.name} ${p.description}`)) ?? packages[0] ?? null;
    if (who === 'accountant' && /skatt|avgift/i.test(area.name)) return packages.find((p) => /regnskap|signering/i.test(`${p.name} ${p.description}`)) ?? packages[0] ?? null;
    return packages[0] ?? null;
  }, [area, who, groups]);
  const note = who === 'system' ? (lang === 'nb' ? 'Opprett en Maskinporten-integrasjon og deleger scopet til systemleverandørens organisasjon.' : "Create a Maskinporten integration and delegate the scope to the system vendor's organisation.") : who === 'accountant' ? (lang === 'nb' ? 'Registrer samarbeidspartneren, eller deleger pakken som enkeltrettighet i Altinn.' : 'Register the partner, or delegate the package as a single right in Altinn.') : (lang === 'nb' ? 'Hovedadministrator eller daglig leder delegerer pakken direkte i Altinn.' : 'The main administrator or general manager delegates the package directly in Altinn.');
  const back = () => { if (step === 3) setWho(null); else setArea(null); };
  return <div className="wizard-page"><header><span className="eyebrow">{copy.label}</span><h1>{copy.questions[step - 1]}</h1><p>{copy.sub}</p><div className="wizard-progress">{[1,2,3].map((n) => <i className={n <= step ? 'active' : ''} key={n} />)}</div></header>
    {loading && <div className="detail-empty">{copy.loading}</div>}{error && <div className="detail-empty">{error}</div>}
    {!loading && !error && step === 1 && <div className="wizard-area-grid">{areas.map((item) => <button onClick={() => setArea(item)} key={item.id}><span className="initial-tile">{initials(item.name)}</span><div><strong>{item.name}</strong><small>{item.packages?.length ?? 0} {copy.packages}</small></div><span>›</span></button>)}</div>}
    {step === 2 && <div className="wizard-who-grid">{WHO.map((value, i) => <button onClick={() => setWho(value)} key={value}><strong>{copy.who[i][0]}</strong><span>{copy.who[i][1]}</span><b>›</b></button>)}</div>}
    {step === 3 && recommendation && <article className="recommendation"><span className="eyebrow">{copy.rec}</span><h2>{lang === 'en' && recommendation.nameEn ? recommendation.nameEn : recommendation.name}</h2><p>{lang === 'en' && recommendation.descriptionEn ? recommendation.descriptionEn : recommendation.description}</p><div>{note}</div><footer><Link className="primary-button" to={packagePath(recommendation)} state={{ pkg: recommendation }}>{copy.see}</Link><button onClick={() => { setArea(null); setWho(null); }}>{copy.restart}</button></footer></article>}
    {step > 1 && <button className="wizard-back" onClick={back}>{copy.back}</button>}
  </div>;
}
