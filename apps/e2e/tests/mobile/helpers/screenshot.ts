import type { Page } from '@playwright/test';

function timestamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `${y}${mo}${d}${h}${mi}${s}`;
}

export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `/logs/${timestamp()}-${name}.png`, fullPage: true });
}
