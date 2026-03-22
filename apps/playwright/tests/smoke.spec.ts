import { test, expect } from '@playwright/test';

test('Expo web app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.*/);
});
