import { useState } from 'react';
import type { PolicyStatistics } from '../types';

export default function PolicySubjectUsage({ statistics, env, lang, format }: {
  statistics: PolicyStatistics; env: string; lang: string; format: (value: number) => string;
}) {
  const [filter, setFilter] = useState('');
  const text = lang === 'nb' ? {
    title: 'Subjektattributter i policyer',
    description: 'Antall policyer hver subjektnøkkel og hver nøkkel/verdi brukes i, for eksempel urn:altinn:rolecode = dagl eller urn:altinn:org = skd. En policy telles én gang per verdi selv om verdien står i flere regler. Nøkler og verdier er gjort om til små bokstaver.',
    checked: 'policyer kontrollert', keys: 'nøkler', pairs: 'nøkkel/verdi-par',
    filter: 'Filtrer på nøkkel eller verdi', value: 'Verdi', policies: 'Policyer', values: 'verdier',
    download: 'Last ned CSV', empty: 'Ingen treff.',
    partial: 'Skanningen har hente- eller tolkefeil. Policyer som ikke kunne hentes eller leses som XML er ikke telt.',
    unavailable: 'Denne oversikten er ikke tilgjengelig i analyseresultatet.',
  } : {
    title: 'Subject attributes in policies',
    description: 'The number of policies each subject key and each key/value pair is used in, for example urn:altinn:rolecode = dagl or urn:altinn:org = skd. A policy counts once per value even when the value appears in several rules. Keys and values are lower-cased.',
    checked: 'policies checked', keys: 'keys', pairs: 'key/value pairs',
    filter: 'Filter by key or value', value: 'Value', policies: 'Policies', values: 'values',
    download: 'Download CSV', empty: 'No matches.',
    partial: 'The scan has fetch or parse failures. Policies that could not be fetched or read as XML are not counted.',
    unavailable: 'This overview is not available in the analysis result.',
  };
  if (!statistics.subjectAttributeUsage) return <div className="notice">{text.unavailable}</div>;

  const usage = statistics.subjectAttributeUsage;
  const query = filter.trim().toLowerCase();
  const groups = usage
    .map((attribute) => ({
      ...attribute,
      shown: !query || attribute.attributeId.includes(query) ? attribute.values
        : attribute.values.filter((entry) => entry.value.includes(query)),
    }))
    .filter((attribute) => attribute.shown.length > 0);
  const pairCount = usage.reduce((sum, attribute) => sum + attribute.values.length, 0);

  function download() {
    const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const rows = usage.flatMap((attribute) => attribute.values.map((entry) =>
      [quote(attribute.attributeId), quote(entry.value), entry.policyCount].join(',')));
    const blob = new Blob(['﻿attributeId,value,policyCount\r\n' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `policy-subjektattributter-${env}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <section className="role-category-section subject-usage-section" aria-labelledby="subject-usage-title">
    <header className="role-category-header">
      <div><h3 id="subject-usage-title">{text.title}</h3><p>{text.description}</p></div>
      <strong>{format(usage.length)}</strong>
    </header>
    <div className="results-count">
      {format(statistics.subjectAttributePoliciesChecked)} {text.checked} · {format(usage.length)} {text.keys} · {format(pairCount)} {text.pairs}
    </div>
    {(statistics.fetchFailures > 0 || statistics.parseFailures > 0) && <p className="notice">{text.partial}</p>}
    <div className="subject-usage-tools">
      <label className="filter-input">
        <input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={text.filter} aria-label={text.filter} />
      </label>
      <button type="button" className="secondary-button" onClick={download} disabled={pairCount === 0}>{text.download}</button>
    </div>
    {groups.length === 0 ? <p>{text.empty}</p> : <div className="statistics-group-list">{groups.map((attribute) => <details key={attribute.attributeId} open={!!query}>
      <summary>
        <span className="statistics-group-owner"><strong>{attribute.attributeId}</strong><small>{format(attribute.values.length)} {text.values}</small></span>
        <strong className="statistics-group-count">{format(attribute.policyCount)}</strong>
      </summary>
      <table className="subject-usage-table">
        <thead><tr><th scope="col">{text.value}</th><th scope="col">{text.policies}</th></tr></thead>
        <tbody>{attribute.shown.map((entry) => <tr key={entry.value}><td>{entry.value}</td><td>{format(entry.policyCount)}</td></tr>)}</tbody>
      </table>
    </details>)}</div>}
  </section>;
}
