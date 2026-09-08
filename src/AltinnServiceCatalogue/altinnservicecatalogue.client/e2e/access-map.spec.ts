import { test, expect } from '@playwright/test';
import { fixture, id, mapData } from './fixtures/access-map';
test('choose a role, explore contexts and distinguish empty results', async ({ page }) => {
  const verify = await fixture(page);
  await page.goto('/access-map');
  await expect(page.getByRole('heading', { name: 'Tilgangskart', exact: true })).toBeVisible();
  await expect(page.getByLabel('Velg rolle', { exact: true })).toHaveValue('');
  await page.getByLabel('Finn rolle').fill('alfa');
  await page.getByLabel('Velg rolle', { exact: true }).selectOption(id(1));
  await expect(page.getByRole('link', { name: /Rapportering/ })).toHaveCount(2);
  await expect(page.getByText('Uten område', { exact: true })).toBeVisible();
  await page.getByLabel('Kontekst', { exact: true }).selectOption('AS');
  await expect(page.getByRole('link', { name: /Organisasjonspakke/ })).toBeVisible();
  await page.getByLabel('Finn rolle').fill('');
  await page.getByLabel('Velg rolle', { exact: true }).selectOption(id(4));
  await expect(page.getByText('Ingen tilgangspakker i valgt kontekst', { exact: true })).toBeVisible();
  verify();
});

test('catalogue navigation retains existing sections and opens the map', async ({ page }) => {
  const verify = await fixture(page);
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Katalogseksjoner' }).getByRole('link', { name: 'Tilgangskart' }).click();
  await expect(page).toHaveURL(/access-map$/);
  await expect(page.getByRole('navigation', { name: 'Katalogseksjoner' }).getByRole('link', { name: 'Tilgangskart' })).toHaveAttribute('aria-current', 'page');
  verify();
});
test('links, all-closed history and search restore without seeding details', async ({ page }) => {
  const verify = await fixture(page);
  await page.goto(`/access-map?role=${id(1)}&variant=person&expanded=custom`);
  await expect(page.locator('.access-leaf:visible')).toHaveCount(0);
  await page.getByRole('button', { name: /Område 1/ }).click();
  await page.getByLabel('Finn pakke i kartet').fill('  RAPPORT  ');
  await expect(page.getByRole('link', { name: /Rapportering/ })).toHaveCount(2);
  await page.getByRole('link', { name: /Rapportering/ }).first().click();
  await expect(page).toHaveURL(/\/package\/pakke-[12]$/);
  await page.goBack();
  await expect(page.getByLabel('Finn pakke i kartet')).toHaveValue('  RAPPORT  ');
  await page.getByRole('button', { name: 'Tøm søk' }).click();
  await page.getByRole('link', { name: /Rolle A/ }).click();
  await expect(page).toHaveURL(new RegExp('/role/' + id(1)));
  await page.goBack();
  await expect(page.getByRole('button', { name: /Område 1/ })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: /Uten område/ }).click();
  await expect(page.locator(`a[href="/package/${id(103)}"]`)).toBeVisible();
  await page.locator(`a[href="/package/${id(103)}"]`).click();
  await expect(page).toHaveURL(new RegExp('/package/' + id(103)));
  verify();
});
test('changing environment on a detail page resets search when going back', async ({ page }) => {
  const verify = await fixture(page);
  await page.goto(`/access-map?role=${id(1)}&q=rapport&expanded=custom`);
  await page.getByRole('link', { name: /Rolle A/ }).click();
  await page.getByRole('button', { name: 'TT02', exact: true }).click();
  await page.goBack();
  await expect(page.getByLabel('Finn pakke i kartet')).toHaveValue('');
  await expect(page.getByText('Miljøet er endret. Søk og åpne områder er nullstilt.')).toBeVisible();
  await expect(page).not.toHaveURL(/expanded|q=/);
  verify();
});
test('confirmed role 404 overrides a stale successful role list', async ({ page }) => {
  const verify = await fixture(page, async route => {
    if (!route.request().url().includes('/package-map')) return false;
    await route.fulfill({ status: 404, json: { code: 'role_not_found' } }); return true;
  });
  await page.goto(`/access-map?role=${id(1)}`);
  await expect(page.getByText('Rollen finnes ikke i gjeldende miljø. Velg en annen rolle.')).toBeVisible();
  await expect(page.getByLabel('Velg rolle', { exact: true })).toHaveValue('');
  await expect(page.locator('.access-root')).toHaveCount(0);
  verify();
});
test('malformed role list is an error, not no roles', async ({ page }) => {
  await fixture(page, async route => {
    if (!route.request().url().includes('/map-options')) return false;
    await route.fulfill({ json: null }); return true;
  });
  await page.goto('/access-map');
  await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeVisible();
  await expect(page.getByText('Ingen roller finnes i katalogen.')).toHaveCount(0);
});
test('partial data keeps known packages and retry recovers', async ({ page }) => {
  let fail = true;
  await fixture(page, async route => {
    if (!route.request().url().includes('/package-map') || !fail) return false;
    const data = mapData();
    data.status = 'partial'; data.contextDiscovery.status = 'failed';
    await route.fulfill({ json: { ...data, contextDiscovery: { ...data.contextDiscovery, items: [{ code: 'person', kind: 'person' }], errorCode: 'upstream_http_error' } } }); return true;
  });
  await page.goto(`/access-map?role=${id(1)}`);
  await expect(page.getByText(/Foreløpig: 3 treff av 3/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Rapportering/ })).toHaveCount(2);
  fail = false;
  await page.getByRole('button', { name: 'Prøv igjen' }).click();
  await expect(page.getByText(/Foreløpig:/)).toHaveCount(0);
});
test('unavailable non-person context stays unresolved without a false empty result', async ({ page }) => {
  await fixture(page, async route => {
    if (!route.request().url().includes('/package-map')) return false;
    const data = mapData(id(1), 'AS');
    await route.fulfill({ json: { ...data, status: 'failed', contextDiscovery: { ...data.contextDiscovery, status: 'failed', items: [{ code: 'person', kind: 'person' }], errorCode: 'upstream_timeout' }, selection: { status: 'unavailable', packages: null, packageCount: null, errorCode: 'context_catalog_unavailable' } } }); return true;
  });
  await page.goto(`/access-map?role=${id(1)}&variant=AS`);
  await expect(page.getByRole('link', { name: /Rolle A/ })).toBeVisible();
  await expect(page.getByLabel('Kontekst', { exact: true })).toHaveValue('AS');
  await expect(page.getByText('Ingen tilgangspakker i valgt kontekst')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeVisible();
});
test('invalid context falls back only on a confirmed invalid_variant', async ({ page }) => {
  await fixture(page, async route => {
    if (!route.request().url().includes('variant=UNKNOWN')) return false;
    await route.fulfill({ status: 400, json: { code: 'invalid_variant' } }); return true;
  });
  await page.goto(`/access-map?role=${id(1)}&variant=UNKNOWN`);
  await expect(page.getByLabel('Kontekst', { exact: true })).toHaveValue('person');
  await expect(page.getByText('Konteksten finnes ikke i gjeldende miljø. Person er valgt.')).toBeVisible();
});
test('late role response cannot replace the newly selected role', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await fixture(page, async route => {
    if (!route.request().url().includes(`/${id(1)}/package-map`)) return false;
    await gate;
    await route.fulfill({ json: mapData(id(1)) }).catch(() => {});
    return true;
  });
  await page.goto('/access-map');
  await page.getByLabel('Velg rolle', { exact: true }).selectOption(id(1));
  await page.getByLabel('Velg rolle', { exact: true }).selectOption(id(2));
  await expect(page.getByRole('link', { name: /Rolle B/ })).toBeVisible();
  release();
  await expect(page.getByRole('link', { name: /Rolle A/ })).toHaveCount(0);
});
test('malformed package payload is an error rather than an empty map', async ({ page }) => {
  await fixture(page, async route => {
    if (!route.request().url().includes('/package-map')) return false;
    await route.fulfill({ json: { ...mapData(), selection: { status: 'complete', packages: null, packageCount: 0, errorCode: null } } }); return true;
  });
  await page.goto(`/access-map?role=${id(1)}`);
  await expect(page.getByRole('button', { name: 'Prøv igjen' })).toBeVisible();
  await expect(page.getByText('Ingen tilgangspakker i valgt kontekst')).toHaveCount(0);
});
for (const width of [360, 1440]) {
  test(`200 packages remain readable and search responds within a second at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await fixture(page);
    await page.goto(`/access-map?role=${id(5)}`);
    await expect(page.locator('.access-leaf')).toHaveCount(200);
    await expect(page.locator('.access-area-toggle')).toHaveCount(20);
    const boxes = await page.locator('.access-leaf').evaluateAll(nodes => nodes.map(n => {
      const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, fits: n.scrollWidth <= n.clientWidth };
    }));
    expect(boxes.every(b => b.fits && b.x >= 0 && b.right <= width)).toBe(true);
    let overlaps = false;
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (!(a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y)) overlaps = true;
    }
    expect(overlaps).toBe(false);
    await page.screenshot({ path: testInfo.outputPath('map-light.png'), fullPage: true });
    await page.getByRole('button', { name: 'Bruk mørkt tema' }).click();
    await page.screenshot({ path: testInfo.outputPath('map-dark.png'), fullPage: true });
    const start = performance.now();
    await page.getByLabel('Finn pakke i kartet').fill('pakke 199');
    await expect(page.locator('.access-leaf')).toHaveCount(1, { timeout: 950 });
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
    await testInfo.attach('search-time-ms', { body: String(elapsed), contentType: 'text/plain' });
    await page.getByLabel('Finn pakke i kartet').fill('ingen slike pakker');
    await expect(page.getByText('Ingen pakker matcher søket', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tøm søk' }).click();
    await expect(page.locator('.access-leaf')).toHaveCount(200);
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Access map', exact: true })).toBeVisible();
    await expect(page.locator('.access-leaf')).toHaveCount(200);
  });
}
test('keyboard disclosure excludes hidden links and returns focus visibly', async ({ page }) => {
  await fixture(page);
  await page.goto(`/access-map?role=${id(1)}`);
  const button = page.getByRole('button', { name: /Område 1/ });
  await button.focus();
  await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Uten område/ })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
});


test('search opens closed groups temporarily and role/context switches clear search', async ({ page }) => {
  await fixture(page);
  await page.goto(`/access-map?role=${id(1)}&expanded=custom`);
  await page.getByLabel('Finn pakke i kartet').fill('rapport');
  await expect(page.locator('.access-leaf:visible')).toHaveCount(2);
  await page.getByRole('button', { name: 'Tøm søk' }).click();
  await expect(page.locator('.access-leaf:visible')).toHaveCount(0);
  await page.getByLabel('Finn pakke i kartet').fill('rapport');
  await page.getByLabel('Kontekst', { exact: true }).selectOption('AS');
  await expect(page.getByLabel('Finn pakke i kartet')).toHaveValue('');
  await page.getByLabel('Finn pakke i kartet').fill('organisasjon');
  await page.getByLabel('Velg rolle', { exact: true }).selectOption(id(2));
  await expect(page.getByLabel('Finn pakke i kartet')).toHaveValue('');
  await expect(page.getByLabel('Kontekst', { exact: true })).toHaveValue('person');
});
test('delayed environment response and enrichment never leak into current map', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await fixture(page, async route => {
    const url = route.request().url();
    if (!url.includes('/prod/') || !url.includes('/package-map')) return false;
    await gate;
    await route.fulfill({ json: mapData(id(1), 'person', 'prod') }).catch(() => {});
    return true;
  });
  await page.goto(`/access-map?role=${id(1)}`);
  await page.getByRole('button', { name: 'TT02', exact: true }).click();
  await expect(page.getByRole('link', { name: /Rolle A/ })).toBeVisible();
  release();
  await expect(page.getByRole('button', { name: 'TT02', exact: true })).toHaveClass('active');
  await expect(page.locator('.access-summary')).toContainText('3 treff av 3');
});
test('optional localized enrichment preserves missing areas and drives English search', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await fixture(page, async route => {
    const url = new URL(route.request().url());
    if (!url.pathname.endsWith('/export')) return false;
    await gate;
    const english = url.searchParams.has('language');
    await route.fulfill({ json: [{ id: id(9000), name: 'Group', areas: [{ id: id(1001), name: english ? 'Area' : 'Område', packages: [{ id: id(101), name: english ? 'Reporting' : 'Rapportering' }, { id: id(103), name: english ? 'Fallback' : 'Reserve' }] }] }] });
    return true;
  });
  await page.goto(`/access-map?role=${id(1)}&expanded=custom&open=ungrouped`);
  await expect(page.getByRole('button', { name: /Uten område/ })).toHaveAttribute('aria-expanded', 'true');
  release();
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByLabel('Find a package in the map').fill('Reporting');
  await expect(page.locator('.access-leaf:visible')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(page.getByRole('button', { name: /Without area/ })).toHaveAttribute('aria-expanded', 'true');
});
test('mobile touch can disclose and open a package', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 900 }, hasTouch: true, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await fixture(page);
  await page.goto('https://localhost:64498/access-map?role=' + id(1) + '&expanded=custom');
  await page.getByRole('button', { name: /Område 1/ }).tap();
  await page.getByRole('link', { name: /Rapportering/ }).first().tap();
  await expect(page).toHaveURL(/\/package\/pakke-[12]/);
  await context.close();
});
test('visual preview of the root and leaf nodes', async ({ page }, testInfo) => {
  await fixture(page);
  await page.setViewportSize({ width: 1440, height: 1250 });
  await page.goto(`/access-map?role=${id(1)}`);
  await expect(page.locator('.access-leaf')).toHaveCount(3);
  await page.screenshot({ path: testInfo.outputPath('preview.png'), fullPage: false });
  await page.setViewportSize({ width: 360, height: 1500 });
  await page.screenshot({ path: testInfo.outputPath('preview-mobile.png'), fullPage: false });
});


test('environment can be changed on mobile without stale packages', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await fixture(page);
  await page.goto('/access-map?role=' + id(1) + '&q=rapport');
  await expect(page.getByRole('link', { name: /Rolle A/ })).toBeVisible();
  await page.getByRole('button', { name: 'TT02', exact: true }).filter({ visible: true }).click();
  await expect(page.getByLabel('Finn pakke i kartet')).toHaveValue('');
  await expect(page.getByText('Miljøet er endret. Søk og åpne områder er nullstilt.')).toBeVisible();
});
