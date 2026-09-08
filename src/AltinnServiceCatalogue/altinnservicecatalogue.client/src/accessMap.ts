import type { PackageDto, RoleDto, RolePackageMapDto } from './types';
import { getLocalizedAreaName, getLocalizedPackageName } from './helpers';
export interface AccessMapViewState { role: string; variant: string; q: string; open: string[]; custom: boolean }
export interface AreaBranch { id: string; name: string; packages: PackageDto[]; total: number }
export const validId = (id: unknown): id is string => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) && id !== '00000000-0000-0000-0000-000000000000';
export const roleName = (r: RoleDto) => r.name || r.code || r.urn || r.id;
export const packageName = (p: PackageDto, lang: string) => getLocalizedPackageName(p, lang) || p.urn || p.id;
export function readMapState(search: string): AccessMapViewState {
  const p = new URLSearchParams(search);
  return { role: (p.get('role') ?? '').toLowerCase(), variant: p.get('variant') ?? 'person', q: p.get('q') ?? '', open: p.getAll('open'), custom: p.get('expanded') === 'custom' };
}
export function writeMapState(state: AccessMapViewState): string {
  const p = new URLSearchParams();
  if (state.role) { p.set('role', state.role); p.set('variant', state.variant); }
  if (state.q) p.set('q', state.q);
  if (state.custom) { p.set('expanded', 'custom'); state.open.forEach(id => p.append('open', id)); }
  return p.toString();
}
export function groupPackages(packages: PackageDto[], lang: string, ungrouped: string): AreaBranch[] {
  const seen = new Set<string>(), groups = new Map<string, AreaBranch>();
  for (const pkg of packages) {
    const identity = pkg.id.toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    const key = validId(pkg.area?.id) ? pkg.area.id.toLowerCase() : 'ungrouped';
    const group = groups.get(key) ?? { id: key, name: key === 'ungrouped' ? ungrouped : getLocalizedAreaName(pkg.area!, lang) || key, packages: [], total: 0 };
    group.packages.push(pkg); group.total++; groups.set(key, group);
  }
  const sort = (a: string, b: string) => a.localeCompare(b, lang);
  return [...groups.values()].map(g => ({ ...g, packages: g.packages.sort((a, b) => sort(packageName(a, lang), packageName(b, lang)) || a.id.localeCompare(b.id)) }))
    .sort((a, b) => sort(a.name, b.name) || a.id.localeCompare(b.id));
}
export function filterGroups(groups: AreaBranch[], q: string, lang: string) {
  const term = q.trim().toLocaleLowerCase(lang);
  return groups.map(g => ({ ...g, packages: g.packages.filter(p => packageName(p, lang).toLocaleLowerCase(lang).includes(term)) })).filter(g => g.packages.length);
}
const object = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const optionalTexts = (x: Record<string, unknown>, keys: string[]) => keys.every(k => x[k] == null || typeof x[k] === 'string');
export function isMapRole(x: unknown): x is RoleDto {
  return object(x) && validId(x.id) && optionalTexts(x, ['name', 'code', 'urn', 'description']);
}
export function isMapResponse(x: unknown, env: string, role: string, variant: string): x is RolePackageMapDto {
  if (!object(x) || x.environment !== env || !isMapRole(x.role) || x.role.id.toLowerCase() !== role.toLowerCase() || typeof x.selectedVariant !== 'string' || x.selectedVariant.toLowerCase() !== variant.trim().toLowerCase()) return false;
  const c = x.contextDiscovery, s = x.selection;
  if (!object(c) || !object(s) || c.source !== 'person-and-organization-subtypes' || !['complete', 'failed'].includes(String(c.status)) || !Array.isArray(c.items)) return false;
  if (!c.items.every(v => object(v) && typeof v.code === 'string' && v.code.trim().length > 0 && v.code.length <= 128 && ![...v.code].some(ch => ch.charCodeAt(0) < 32 || (ch.charCodeAt(0) >= 127 && ch.charCodeAt(0) <= 159)) && ['person', 'organization'].includes(String(v.kind)) && optionalTexts(v, ['description']))) return false;
  const codes = c.items.map(v => (v as {code: string}).code.toLowerCase());
  if (!codes.includes('person') || new Set(codes).size !== codes.length) return false;
  if (c.status === 'complete' && !codes.includes(x.selectedVariant.toLowerCase())) return false;
  if (!['complete', 'failed', 'unavailable'].includes(String(s.status))) return false;
  if (s.status === 'complete') {
    if (!Array.isArray(s.packages) || !s.packages.every(p => object(p) && validId(p.id) && optionalTexts(p, ['name', 'nameEn', 'urn', 'description']) && (p.area == null || (object(p.area) && optionalTexts(p.area, ['name', 'nameEn']))))) return false;
    if (s.packageCount !== new Set(s.packages.map(p => p.id.toLowerCase())).size || s.errorCode !== null) return false;
  } else if (s.packages !== null || s.packageCount !== null || typeof s.errorCode !== 'string') return false;
  if (c.status === 'complete' ? c.errorCode !== null : typeof c.errorCode !== 'string') return false;
  if (s.status === 'unavailable' && (c.status !== 'failed' || x.selectedVariant.toLowerCase() === 'person')) return false;
  if (c.status === 'failed' && s.status !== 'unavailable' && x.selectedVariant.toLowerCase() !== 'person') return false;
  const status = c.status === 'complete' ? (s.status === 'complete' ? 'complete' : 'partial') : (s.status === 'complete' ? 'partial' : 'failed');
  return x.status === status;
}
