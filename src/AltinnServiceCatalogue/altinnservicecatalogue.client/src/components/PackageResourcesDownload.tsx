import { useEffect, useRef, useState } from 'react';
import { useLang } from '../lang';

export default function PackageResourcesDownload({ env }: { env: string }) {
  const { lang } = useLang();
  const [downloading, setDownloading] = useState(false);
  const [failed, setFailed] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function download() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setDownloading(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/v1/${env}/meta/info/accesspackages/resources.csv`, {
        signal: controller.signal,
      });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('text/csv')) {
        throw new Error('CSV export failed');
      }
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tilgangspakker-tjenester-${env}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      if (!controller.signal.aborted) setFailed(true);
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setDownloading(false);
    }
  }

  return <div className="mb-6">
    <button type="button" className="primary-button" disabled={downloading} onClick={download} aria-busy={downloading}>
      {downloading
        ? (lang === 'nb' ? 'Lager CSV …' : 'Preparing CSV …')
        : (lang === 'nb' ? 'Last ned alle pakkers tjenester (CSV)' : 'Download services for all packages (CSV)')}
    </button>
    <p className="mt-2 text-sm">
      {lang === 'nb'
        ? 'Alle koblinger, uavhengig av filter: pakke-URN, ressurs-ID, eierens organisasjonskode og ressursnavn på bokmål. Inkluderer skjulte og utgåtte tjenester.'
        : 'All links, regardless of filters: package URN, resource ID, owner organisation code and resource name in Norwegian Bokmål. Includes hidden and retired services.'}
    </p>
    {failed && <p className="notice mt-2" role="alert">
      {lang === 'nb' ? 'Kunne ikke laste ned CSV. Prøv igjen.' : 'Could not download CSV. Please try again.'}
    </p>}
  </div>;
}
