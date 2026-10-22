import { test, expect } from '@playwright/test';
import type { PolicyStatistics } from '../src/types';

function statistics(withFinding: boolean): PolicyStatistics {
  return {
    environment: 'prod', generatedAt: '2026-10-22T12:00:00Z', scanDurationMilliseconds: 20,
    maxConcurrency: 8, nonDefaultResourceLimit: 500, resourcesScanned: 3,
    policiesFetched: 1, policiesParsed: 1, resourcesWithoutPolicy: 1, fetchFailures: 1, parseFailures: 0,
    policiesUsingPolicyCombiningAlgorithmInRuleSlot: 0, policiesWithDenyRules: 0,
    policiesWithMustBePresent: 0, policiesWithConditions: 0, legacyIncorrectEvaluationCount: 0,
    algorithmUsage: [], nonDefaultResourceCount: 0, nonDefaultResourcesCapped: false, nonDefaultResources: [],
    altinn2RoleResourceCount: 0, altinn2RoleGroups: [], altinn2RoleOnlyResourceCount: 0,
    altinn2RoleOnlyWithErRolesCount: 0, altinn2RoleOnlyWithoutErRolesCount: 0, altinn2RoleOnlyGroups: [],
    mixedTargetPoliciesChecked: 1, mixedTargetResourceCount: withFinding ? 1 : 0,
    mixedTargetResources: withFinding ? [{
      resourceId: 'app_brg_anonym-oppstartsveilederen', title: { nb: 'Oppstartsveilederen' },
      ownerId: 'brg', ownerName: { nb: 'Brønnøysundregistrene' }, resourceType: 'AltinnApp',
      findings: [{ targetKind: 'Rule', ruleId: 'urn:altinn:example:ruleid:3', anyOfIndex: 2,
        allOfIndex: 1, actions: ['delete'], resourceAttributeIds: ['urn:altinn:app', 'urn:altinn:org'] }],
    }] : [],
  };
}

for (const withFinding of [true, false]) {
  test(`mixed target analysis ${withFinding ? 'shows owner and rule evidence' : 'qualifies empty results when coverage is partial'}`, async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      await route.fulfill({ json: path.endsWith('/policy/statistics') ? statistics(withFinding)
        : path.endsWith('/orgs') ? { orgs: {} } : [] });
    });
    await page.goto('/statistics');
    const section = page.getByRole('region', { name: 'Handling og ressurs i samme AllOf' });
    await expect(section).toContainText('1 policyer kontrollert');
    await expect(section).toContainText('Skanningen har hente- eller tolkefeil');
    if (withFinding) {
      await section.locator('summary').click();
      await expect(section).toContainText('Brønnøysundregistrene');
      await expect(section).toContainText('urn:altinn:example:ruleid:3');
      await expect(section).toContainText('Handlinger: delete');
      await expect(section.getByRole('link', { name: 'Oppstartsveilederen', exact: true }))
        .toHaveAttribute('href', '/resource/app_brg_anonym-oppstartsveilederen');
      await expect(section.getByRole('link', { name: 'Vis policy-XML' }))
        .toHaveAttribute('href', '/api/v1/prod/resource/app_brg_anonym-oppstartsveilederen/policy');
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(section.getByRole('link', { name: 'Vis policy-XML' })).toBeVisible();
      expect(await section.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    } else {
      await expect(section).toContainText('Ingen treff blant de kontrollerte policyene.');
      await expect(section.locator('details')).toHaveCount(0);
    }
  });
}
