import { useEffect, useRef, useState } from 'react';
import type { RoleDto, RolePackageMapDto } from '../types';
import { isMapResponse, isMapRole, validId } from '../accessMap';
import { enrichPackageFromLookup, fetchPackageLookupBilingual } from '../helpers';

type Result<T> = { key: string; data?: T; error?: string };
async function readResponse(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new Error(typeof problem.code === 'string' ? problem.code : 'upstream_http_error');
  }
  return response.json();
}
export function useRolePackageMap(env: string, role: string, variant: string) {
  const [attempt, setAttempt] = useState(0);
  const [options, setOptions] = useState<Result<RoleDto[]>>();
  const [result, setResult] = useState<Result<RolePackageMapDto>>();
  const sequence = useRef(0);
  const optionsKey = JSON.stringify([env, attempt]);
  const key = JSON.stringify([env, role, variant, attempt]);
  useEffect(() => {
    const abort = new AbortController();
    readResponse(`/api/v1/${env}/meta/info/roles/map-options`, abort.signal).then(data => {
      if (!Array.isArray(data) || !data.every(isMapRole)) throw new Error('invalid_upstream_payload');
      if (!abort.signal.aborted) setOptions({ key: optionsKey, data });
    }).catch(e => { if (!abort.signal.aborted) setOptions({ key: optionsKey, error: e.message }); });
    return () => abort.abort();
  }, [env, optionsKey]);

  useEffect(() => {
    if (!validId(role)) return;
    const abort = new AbortController(), request = ++sequence.current;
    const current = () => !abort.signal.aborted && request === sequence.current;
    readResponse(`/api/v1/${env}/meta/info/roles/${role}/package-map?variant=${encodeURIComponent(variant)}`, abort.signal).then(async data => {
      if (!isMapResponse(data, env, role, variant)) throw new Error('invalid_upstream_payload');
      if (!current()) return;
      setResult({ key, data });
      if (!data.selection.packages?.length) return;
      try {
        const lookup = await fetchPackageLookupBilingual(env, abort.signal);
        if (!current()) return;
        const packages = data.selection.packages.map(p => {
          const enriched = enrichPackageFromLookup(p, lookup);
          return { ...enriched, area: p.area ? { ...p.area, nameEn: enriched.area?.nameEn } : undefined };
        });
        setResult({ key, data: { ...data, selection: { ...data.selection, packages } } });
      } catch { /* Optional text enrichment never removes known relationships. */ }
    }).catch(e => { if (current()) setResult({ key, error: e.message }); });
    return () => abort.abort();
  }, [env, role, variant, key]);
  return {
    roles: options?.key === optionsKey ? options.data : undefined,
    rolesError: options?.key === optionsKey ? options.error : undefined,
    data: result?.key === key ? result.data : undefined,
    error: result?.key === key ? result.error : undefined,
    retry: () => setAttempt(a => a + 1),
  };
}
