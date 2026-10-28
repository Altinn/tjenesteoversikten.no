import { test, expect } from '@playwright/test';
import type { PolicyStatistics } from '../src/types';

const statistics: PolicyStatistics = {
  environment: 'prod', generatedAt: '2026-10-28T12:00:00Z', scanDurationMilliseconds: 20,
  maxConcurrency: 8, nonDefaultResourceLimit: 500, resourcesScanned: 3,
  policiesFetched: 3, policiesParsed: 3, resourcesWithoutPolicy: 0, fetchFailures: 0, parseFailures: 0,
  policiesUsingPolicyCombiningAlgorithmInRuleSlot: 0, policiesWithDenyRules: 0,
  policiesWithMustBePresent: 0, policiesWithConditions: 0, legacyIncorrectEvaluationCount: 0,
  algorithmUsage: [], nonDefaultResourceCount: 0, nonDefaultResourcesCapped: false, nonDefaultResources: [],
  altinn2RoleResourceCount: 0, altinn2RoleGroups: [], altinn2RoleOnlyResourceCount: 0,
  altinn2RoleOnlyWithErRolesCount: 0, altinn2RoleOnlyWithoutErRolesCount: 0, altinn2RoleOnlyGroups: [],
  mixedTargetPoliciesChecked: 3, mixedTargetResourceCount: 0, mixedTargetResources: [],
  subjectAttributePoliciesChecked: 3,
  subjectAttributeUsage: [
    { attributeId: 'urn:altinn:rolecode', policyCount: 3, values: [{ value: 'dagl', policyCount: 3 }, { value: 'regna', policyCount: 1 }] },
    { attributeId: 'urn:altinn:org', policyCount: 1, values: [{ value: 'skd', policyCount: 1 }] },
  ],
};

test('subject attribute usage lists policy counts per key and value', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    await route.fulfill({ json: path.endsWith('/policy/statistics') ? statistics
      : path.endsWith('/orgs') ? { orgs: {} } : [] });
  });
  await page.goto('/statistics');
  const section = page.getByRole('region', { name: 'Subjektattributter i policyer' });
  await expect(section).toContainText('3 policyer kontrollert · 2 nøkler · 3 nøkkel/verdi-par');
  await expect(section.locator('details')).toHaveCount(2);

  await section.getByRole('searchbox').fill('skd');
  await expect(section.locator('details')).toHaveCount(1);
  await expect(section.locator('details')).toHaveAttribute('open', '');
  await expect(section.getByRole('row', { name: 'skd 1' })).toBeVisible();

  await section.getByRole('searchbox').fill('rolecode');
  await expect(section.getByRole('row', { name: 'dagl 3' })).toBeVisible();
  await expect(section.getByRole('row', { name: 'regna 1' })).toBeVisible();

  const download = page.waitForEvent('download');
  await section.getByRole('button', { name: 'Last ned CSV' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('policy-subjektattributter-prod.csv');
  const csv = await (await file.createReadStream()).toArray();
  expect(Buffer.concat(csv).toString('utf-8')).toContain('"urn:altinn:org","skd",1');

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await section.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});
