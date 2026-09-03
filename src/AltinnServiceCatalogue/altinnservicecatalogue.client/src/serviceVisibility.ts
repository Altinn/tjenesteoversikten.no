import { useEffect, useState } from 'react';
import type { ResourceSummary } from './types';

/**
 * Registry statuses that mean the service is out of use. Note that "Active" is rare in the
 * registry — most live services are "Completed" or carry no status at all — so retirement is
 * decided from this list, never from "not Active".
 */
const RETIRED_STATUSES = new Set(['deprecated', 'withdrawn', 'discontinued']);

export interface ServiceVisibility {
  visible?: boolean;
  status?: string | null;
}

/** A service the registry has hidden (visible = false) or retired (deprecated/withdrawn/discontinued). */
export function isRetiredService(info: ServiceVisibility | undefined | null): boolean {
  if (!info) return false;
  return info.visible === false || RETIRED_STATUSES.has((info.status ?? '').toLowerCase());
}

/** Short label explaining why a service is set aside: "Ikke synlig", or the retired status itself. */
export function retiredLabel(info: ServiceVisibility | undefined | null, notVisibleText: string): string {
  if (info?.visible === false) return notVisibleText;
  return info?.status ?? notVisibleText;
}

/** Split a list into the services shown by default and the hidden/retired ones kept behind a toggle. */
export function splitRetired<T>(
  items: T[],
  lookup: (item: T) => ServiceVisibility | undefined | null,
): { active: T[]; retired: T[] } {
  const active: T[] = [];
  const retired: T[] = [];
  for (const item of items) {
    (isRetiredService(lookup(item)) ? retired : active).push(item);
  }
  return { active, retired };
}

export type VisibilityIndex = Map<string, ServiceVisibility>;

/** Look up a resource identifier in the index. Unknown identifiers are never treated as retired. */
export function lookupVisibility(index: VisibilityIndex, identifier: string): ServiceVisibility | undefined {
  return index.get(identifier.toLowerCase());
}

const indexCache = new Map<string, Promise<VisibilityIndex>>();

function loadIndex(env: string): Promise<VisibilityIndex> {
  let pending = indexCache.get(env);
  if (!pending) {
    pending = fetch(`/api/v1/${env}/resource/resourcelist/summary?includeApps=true&includeAltinn2=true`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch resource summary: ${res.status}`);
        return res.json() as Promise<ResourceSummary[]>;
      })
      .then((list) => new Map<string, ServiceVisibility>(
        list.map((r) => [r.identifier.toLowerCase(), { visible: r.visible, status: r.status }] as const),
      ))
      .catch(() => {
        // Don't cache a failure: the next page that needs the index retries.
        indexCache.delete(env);
        return new Map<string, ServiceVisibility>();
      });
    indexCache.set(env, pending);
  }
  return pending;
}

/**
 * Identifier -> visibility for every resource in the environment, for the lists that only carry
 * resource ids (access packages, roles). Empty until loaded, so nothing is hidden prematurely.
 */
export function useVisibilityIndex(env: string): VisibilityIndex {
  const [index, setIndex] = useState<VisibilityIndex>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    loadIndex(env).then((map) => {
      if (!cancelled) setIndex(map);
    });
    return () => { cancelled = true; };
  }, [env]);

  return index;
}
