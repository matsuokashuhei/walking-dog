import type { Page } from '@playwright/test';

export async function navigateToDogs(page: Page): Promise<void> {
  await page.goto('/(tabs)/dogs');
  await page.waitForTimeout(1000);
}

export async function navigateToWalk(page: Page): Promise<void> {
  await page.goto('/(tabs)/walk');
  await page.waitForTimeout(1000);
}
