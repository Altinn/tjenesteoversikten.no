import { expect, type Page, type Route } from '@playwright/test';
export const id = (n: number) => `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`;
export const roles = ['Rolle A', 'Rolle B', 'Rolle C', 'Rolle D', 'Stor rolle'].map((name, i) => ({ id: id(i + 1), name, code: ['ALFA', 'BETA', 'GAMMA', 'DELTA', 'STOR'][i] }));
export const pkg = (n: number, name = 'Rapportering', area = 1) => ({ id: id(n + 100), name, urn: n === 3 ? null : `urn:altinn:accesspackage:pakke-${n}`, area: area ? { id: id(area + 1000), name: `Område ${area}` } : null });
export function mapData(roleId = id(1), variant = 'person', environment = 'prod') {
  const role = roles.find(r => r.id === roleId)!;
  const packages = roleId === id(5) ? Array.from({ length: 200 }, (_, i) => pkg(i + 10, `Pakke ${String(i).padStart(3, '0')} med et svært langt beskrivende navn for offentlig rapportering`, Math.floor(i / 10) + 1))
    : roleId === id(4) || (roleId === id(3) && variant === 'person') ? []
    : variant !== 'person' ? [pkg(5, 'Organisasjonspakke'), pkg(6, 'Årsoppgjør')]
    : roleId === id(2) ? [pkg(1), pkg(4)] : [pkg(1), pkg(2), pkg(3, '', 0)];
  return { environment, role, selectedVariant: variant, status: 'complete', contextDiscovery: { source: 'person-and-organization-subtypes', status: 'complete', items: [{ code: 'person', kind: 'person' }, { code: 'AS', description: 'Aksjeselskap', kind: 'organization' }], errorCode: null }, selection: { status: 'complete', packages, packageCount: packages.length, errorCode: null } };
}
export async function fixture(page: Page, override?: (route: Route) => Promise<boolean>) {
  const unexpected: string[] = [];
  await page.addInitScript(() => { localStorage.setItem('env', 'prod'); localStorage.setItem('lang', 'nb'); });
  await page.route(/^https:\/\/(?!localhost[:/])/, route => route.abort());
  await page.route('**/api/**', async route => {
    if (override && await override(route)) return;
    const url = new URL(route.request().url());
    const path = url.pathname;
    let data: unknown;
    if (path.endsWith('/map-options')) data = roles;
    else if (path.endsWith('/package-map')) data = mapData(path.split('/').at(-2), url.searchParams.get('variant') ?? 'person', path.split('/')[3]);
    else if (path.endsWith('/export')) data = [];
    else if (/\/info\/roles\/[^/]+$/.test(path)) data = roles.find(r => r.id === path.split('/').at(-1)) ?? null;
    else if (path.endsWith('/info/roles')) data = roles;
    else if (path.endsWith('/resource/orgs')) data = { orgs: {} };
    else if (path.endsWith('/resource/resourcelist') || path.endsWith('/resource/resourcelist/summary') || path.endsWith('/resource/keywords') || path.endsWith('/resource/bysubjects') || /\/roles\/[^/]+\/(packages|resources)$/.test(path) || path.endsWith('/packages/byvariant')) data = [];
    else if (/\/info\/accesspackages\//.test(path)) data = null;
    else { unexpected.push(path); await route.abort(); return; }
    await route.fulfill({ json: data });
  });
  return () => expect(unexpected, 'Unexpected API requests').toEqual([]);
}
