import { test, expect } from '@playwright/test';

test.describe('App', () => {
  test('loads and shows offline status', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('INJI Offline Verifier')).toBeVisible();
    await expect(page.getByText('Status: Offline')).toBeVisible();
  });

  test('shows camera section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Camera')).toBeVisible();
  });

  test('shows logs section', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Logs')).toBeVisible();
  });
});
