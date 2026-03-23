import type { Page } from '@playwright/test';

export async function navigateToDogs(page: Page): Promise<void> {
  await page.goto('/(tabs)/dogs');
  await page.waitForTimeout(1000);
}

export async function navigateToSettings(page: Page): Promise<void> {
  await page.goto('/(tabs)/settings');
  await page.waitForTimeout(1000);
}
