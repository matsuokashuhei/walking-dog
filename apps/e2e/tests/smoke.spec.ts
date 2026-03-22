import { test, expect } from '@playwright/test';
import { takeScreenshot } from './helpers/screenshot';

test('Expo web app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.*/);
  await takeScreenshot(page, 'smoke-loaded');
});
