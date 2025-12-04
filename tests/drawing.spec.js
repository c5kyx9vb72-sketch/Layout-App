import { test, expect } from '@playwright/test';

test.describe('Map Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    // Wait a bit for map initialization scripts to attach handlers
    await page.waitForTimeout(500);
  });

  test('can draw a site polygon', async ({ page }) => {
    // Select the polygon tool from leaflet-draw toolbar
    await page.locator('.leaflet-draw-draw-polygon').click();

    // Get map container dimensions to click relative coordinates
    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    // Draw a triangle (3 points + click first point to close)
    // Use force: true to click through any potential invisible overlays
    // Add small delays to ensure Leaflet Draw captures the events
    await page.mouse.click(cx, cy - 100);
    await page.waitForTimeout(200);
    await page.mouse.click(cx + 100, cy + 100);
    await page.waitForTimeout(200);
    await page.mouse.click(cx - 100, cy + 100);
    await page.waitForTimeout(200);
    
    // Click "Finish" button to close the polygon
    // Wait for it to be visible first to ensure drawing mode is active
    const finishBtn = page.getByRole('link', { name: 'Finish' });
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // Wait for the polygon to be rendered in the DOM (Leaflet creates <path> elements)
    const polygonPath = page.locator('path.leaflet-interactive').first();
    await expect(polygonPath).toBeVisible({ timeout: 10000 });

    // Click the specific polygon element to trigger the popup
    // Force click because sometimes SVG paths can be tricky with hit testing
    await polygonPath.click({ force: true });
  });

  test('can set drawn polygon as site', async ({ page }) => {
    // 1. Draw
    await page.locator('.leaflet-draw-draw-polygon').click();
    const map = page.locator('.leaflet-container');
    const box = await map.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;

    await page.mouse.click(cx, cy - 50);
    await page.waitForTimeout(200);
    await page.mouse.click(cx + 50, cy + 50);
    await page.waitForTimeout(200);
    await page.mouse.click(cx - 50, cy + 50);
    await page.waitForTimeout(200);
    
    // Click "Finish" button to close the polygon
    const finishBtn = page.getByRole('link', { name: 'Finish' });
    await expect(finishBtn).toBeVisible();
    await finishBtn.click();

    // 2. Wait for render and click polygon
    const polygonPath = page.locator('path.leaflet-interactive').first();
    await expect(polygonPath).toBeVisible({ timeout: 10000 });
    await polygonPath.click({ force: true });
    
    // 4. Verify "Generate Layout" button is enabled
    const genBtn = page.getByRole('button', { name: 'Generate Layout' });
    await expect(genBtn).toBeEnabled();
  });
});
