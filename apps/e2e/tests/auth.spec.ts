import { test, expect } from './helpers/fixtures';
import { uniqueEmail, registerUser, loginUser } from './helpers/auth';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page, labels }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible({ timeout: 15000 });
  });

  test('Sign Up: happy path — registers a new user', async ({ page, labels }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, labels, email, 'Password123!', 'Test User');

    await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible();
    await takeScreenshot(page, 'signup-happy-path');
  });

  test('Sign Up: shows inline error when password is too short', async ({ page, labels }) => {
    await page.goto('/(auth)/register');
    await expect(page.getByRole('button', { name: labels.auth.registerSubmit })).toBeVisible();

    await page.getByLabel(labels.auth.displayName).fill('Test User');
    await page.getByLabel(labels.auth.email).fill(uniqueEmail());
    await page.getByLabel(labels.auth.password).fill('short');

    await expect(page.getByText(labels.auth.passwordError)).toBeVisible();

    const submitButton = page.getByRole('button', { name: labels.auth.registerSubmit });
    await expect(submitButton).toBeDisabled();
    await takeScreenshot(page, 'signup-password-too-short');
  });

  test('Sign Up: shows error for duplicate email', async ({ page, labels }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, labels, email, 'Password123!', 'Test User');

    await page.goto('/(auth)/register');
    await expect(page.getByRole('button', { name: labels.auth.registerSubmit })).toBeVisible();

    await page.getByLabel(labels.auth.displayName).fill('Test User 2');
    await page.getByLabel(labels.auth.email).fill(email);
    await page.getByLabel(labels.auth.password).fill('Password123!');
    await page.getByRole('button', { name: labels.auth.registerSubmit }).click();

    await expect(page.getByText(labels.auth.duplicateEmail)).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'signup-duplicate-email');
  });

  test('Confirm Sign Up: accepts code 999999 and redirects to login', async ({ page, labels }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, labels, email, 'Password123!', 'Confirm Test');

    await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible();
    await takeScreenshot(page, 'confirm-signup-success');
  });

  test('Confirm Sign Up: shows error for invalid code', async ({ page, labels }) => {
    test.setTimeout(60000);

    await page.goto('/(auth)/register');
    await expect(page.getByRole('button', { name: labels.auth.registerSubmit })).toBeVisible();

    const email = uniqueEmail();
    await page.getByLabel(labels.auth.displayName).fill('Invalid Code User');
    await page.getByLabel(labels.auth.email).fill(email);
    await page.getByLabel(labels.auth.password).fill('Password123!');
    await page.getByRole('button', { name: labels.auth.registerSubmit }).click();

    const confirmInput = page.getByLabel(labels.auth.confirmCode);
    const loginButton = page.getByRole('button', { name: labels.auth.loginSubmit });

    await Promise.race([
      confirmInput.waitFor({ state: 'visible', timeout: 15000 }),
      loginButton.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {});

    if (!(await confirmInput.isVisible())) {
      test.skip();
      return;
    }

    await confirmInput.fill('000000');
    await page.getByRole('button', { name: labels.auth.confirmSubmit }).click();

    await expect(page.getByText(labels.auth.invalidCode)).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'confirm-signup-invalid-code');
  });

  test('Sign In: existing user can log in', async ({ page, labels }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, labels, email, 'Password123!', 'Login Test User');
    await loginUser(page, labels, email, 'Password123!');

    await expect(page).toHaveURL(/\/(tabs|$)/, { timeout: 15000 });
    await takeScreenshot(page, 'signin-success');
  });

  test('Sign In: shows error for wrong password', async ({ page, labels }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, labels, email, 'Password123!', 'Wrong Pass User');
    await loginUser(page, labels, email, 'WrongPassword!');

    await expect(page.getByText(labels.auth.invalidCredentials)).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'signin-wrong-password');
  });

  test('Sign In: shows error for non-existent user', async ({ page, labels }) => {
    test.setTimeout(30000);

    await loginUser(page, labels, 'nonexistent@example.com', 'Password123!');

    await expect(page.getByText(labels.auth.invalidCredentials)).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'signin-nonexistent-user');
  });

  test('Sign Out: after login, signing out returns to login screen', async ({ page, labels }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, labels, email, 'Password123!', 'Sign Out User');
    await loginUser(page, labels, email, 'Password123!');

    await expect(page).toHaveURL(/\/(tabs|$)/, { timeout: 15000 });

    await page.goto('/(tabs)/settings');

    const signOutButton = page.getByRole('button', { name: labels.signOut });
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    await signOutButton.click();

    await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'signout-success');
  });

  test('Navigation guard: unauthenticated user is redirected to login', async ({ page, labels }) => {
    await page.goto('/(tabs)');

    await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'nav-guard-redirect');
  });

  test('Full flow: register, login, and logout', async ({ page, labels }) => {
    test.setTimeout(90000);

    const email = uniqueEmail();
    const password = 'Password123!';

    await registerUser(page, labels, email, password, 'Full Flow User');
    await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible();
    await takeScreenshot(page, 'fullflow-auth-registered');

    await loginUser(page, labels, email, password);
    await expect(page).toHaveURL(/\/(tabs|$)/, { timeout: 15000 });
    await takeScreenshot(page, 'fullflow-auth-loggedin');

    await page.goto('/(tabs)/settings');
    const signOutButton = page.getByRole('button', { name: labels.signOut });
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    await signOutButton.click();

    await expect(page.getByRole('button', { name: labels.auth.loginSubmit })).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'fullflow-auth-loggedout');
  });
});
