import { expect, type Page, request as apiRequest } from '@playwright/test';
import type { Labels } from './i18n';

const COGNITO_ENDPOINT = process.env.COGNITO_ENDPOINT ?? 'http://cognito-local:9229';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? 'local_2yovNmW0';

export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function adminConfirmSignUp(email: string): Promise<void> {
  const context = await apiRequest.newContext();
  const maxRetries = 5;
  for (let i = 0; i < maxRetries; i++) {
    const response = await context.post(COGNITO_ENDPOINT, {
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.AdminConfirmSignUp',
      },
      data: {
        UserPoolId: COGNITO_USER_POOL_ID,
        Username: email,
      },
    });
    if (response.ok()) {
      await context.dispose();
      return;
    }
    const body = await response.text();
    if (i < maxRetries - 1 && body.includes('NotAuthorizedException')) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }
    await context.dispose();
    throw new Error(`AdminConfirmSignUp failed: ${response.status()} ${body}`);
  }
  await context.dispose();
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

  // cognito-local generates random confirmation codes, so we bypass via AdminConfirmSignUp API
  await adminConfirmSignUp(email);

  // Wait briefly then navigate to login page
  await page.waitForTimeout(1000);
  await page.goto('/');
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
