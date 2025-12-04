import { test, expect } from '@playwright/test';

test.describe('Core Application Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for map to be visible
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  test('loads the application and controls', async ({ page }) => {
    await expect(page).toHaveTitle(/Layout App/);
    await expect(page.getByText('F&B Plant Layout')).toBeVisible();
    // Fix: use exact match to avoid matching the "Toggle process types..." help text
    await expect(page.getByText('Process Types', { exact: true })).toBeVisible();
  });

  test('shows process types configuration', async ({ page }) => {
    await expect(page.getByText('Receiving')).toBeVisible();
    await expect(page.getByText('Processing')).toBeVisible();
    await expect(page.getByText('Packaging')).toBeVisible();
  });

  test('shows heatmap controls', async ({ page }) => {
    await expect(page.getByText('Heatmaps')).toBeVisible();
    const select = page.getByRole('combobox').first();
    await expect(select).toHaveValue('flow');
  });
});
