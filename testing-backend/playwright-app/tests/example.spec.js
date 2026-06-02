const { test, expect } = require('@playwright/test');

test('example test to generate HTML report', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page).toHaveTitle(/Example Domain/);
});
