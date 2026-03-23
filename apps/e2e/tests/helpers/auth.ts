import { expect, type Page } from '@playwright/test';
import type { Labels } from './i18n';
import * as fs from 'fs';

const COGNITO_DB_PATH = process.env.COGNITO_DB_PATH ?? '/cognito-db/local_2yovNmW0.json';

export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function getConfirmationCode(email: string): Promise<string> {
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const data = JSON.parse(fs.readFileSync(COGNITO_DB_PATH, 'utf-8'));
    for (const user of Object.values(data.Users) as any[]) {
      const userEmail = user.Attributes?.find((a: any) => a.Name === 'email')?.Value;
      if (userEmail === email && user.ConfirmationCode) {
        return user.ConfirmationCode;
      }
    }
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Confirmation code not found for ${email}`);
}

export async function registerUser(
  page: Page,
  labels: Labels,
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  await page.goto('/(auth)/register');
  await expect(page.getByRole('button', { name: labels.auth.registerSubmit })).toBeVisible();

  await page.getByLabel(labels.auth.displayName).fill(displayName);
  await page.getByLabel(labels.auth.email).fill(email);
  await page.getByLabel(labels.auth.password).fill(password);
  await page.getByRole('button', { name: labels.auth.registerSubmit }).click();

  // Wait for confirmation code screen, then read the code from cognito-local DB
  await expect(page.getByLabel(labels.auth.confirmCode)).toBeVisible({ timeout: 10000 });
  const code = await getConfirmationCode(email);
  await page.getByLabel(labels.auth.confirmCode).fill(code);
  await page.getByRole('button', { name: labels.auth.confirmSubmit }).click();

  await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible({ timeout: 15000 });
}

export async function loginUser(
  page: Page,
  labels: Labels,
  email: string,
  password: string,
): Promise<void> {
  await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible();
  await page.getByLabel(labels.auth.email).fill(email);
  await page.getByLabel(labels.auth.password).fill(password);
  await page.getByRole('button', { name: labels.auth.loginSubmit }).click();
}

export async function registerAndLogin(
  page: Page,
  labels: Labels,
  email: string,
  password: string,
): Promise<void> {
  await registerUser(page, labels, email, password, 'Test User');
  await loginUser(page, labels, email, password);
  await expect(page).toHaveURL(/\/(tabs|$)/, { timeout: 15000 });
}
