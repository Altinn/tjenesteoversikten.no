import { test, expect } from '@playwright/test';

for (const failFirst of [false, true]) {
  test(`package CSV download${failFirst ? ' can retry after failure' : ' ignores list filters'}`, async ({ page }) => {
    let calls = 0;
    await page.route('**/api/**', async (route) => {
      if (route.request().url().endsWith('/resources.csv')) {
        calls++;
        if (failFirst && calls === 1) {
          await route.fulfill({ status: 502, json: { title: 'Unavailable' } });
        } else {
          await route.fulfill({ contentType: 'text/csv; charset=utf-8', body: '\uFEFFpakkeurn,ressursid,ressurs_org,ressursnavn_nb\r\n' });
        }
      } else {
        await route.fulfill({ json: route.request().url().endsWith('/orgs') ? { orgs: {} } : [] });
      }
    });
    await page.goto('/packages');
    await page.getByRole('button', { name: 'PROD', exact: true }).click();
    await page.getByPlaceholder('Filtrer tilgangspakker …').fill('Ingen treff');
    const button = page.getByRole('button', { name: 'Last ned alle pakkers tjenester (CSV)' });
    if (failFirst) {
      await button.click();
      await expect(page.getByRole('alert')).toHaveText('Kunne ikke laste ned CSV. Prøv igjen.');
    }
    const downloaded = page.waitForEvent('download');
    await button.click();
    expect((await downloaded).suggestedFilename()).toBe('tilgangspakker-tjenester-prod.csv');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(button).toBeEnabled();
    expect(calls).toBe(failFirst ? 2 : 1);
  });
}
