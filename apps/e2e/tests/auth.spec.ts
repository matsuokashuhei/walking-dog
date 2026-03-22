import { test, expect, Page } from '@playwright/test';

// ---- Shared helpers ----

function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

/**
 * Register a new user.
 * Handles two cognito-local behaviours:
 *   1. Auto-confirmed  → register screen navigates straight to login.
 *   2. Not confirmed   → confirm form appears; we enter code "999999" (6 digits).
 *
 * Note: cognito-local typically uses code "9999" but ConfirmForm requires exactly
 * 6 digits (maxLength=6), so we pad to "999999". Adjust if your cognito-local
 * config differs.
 */
async function registerUser(
  page: Page,
  email: string,
  password: string,
  displayName: string,
): Promise<void> {
  await page.goto('/(auth)/register');

  // Wait for the register form to be visible
  await expect(page.getByRole('button', { name: 'アカウントを作成' })).toBeVisible();

  // Fill in the registration fields
  await page.getByLabel('表示名').fill(displayName);
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);

  // Submit the form
  await page.getByRole('button', { name: 'アカウントを作成' }).click();

  // Wait to see if confirm step appears or we land on login
  // The register screen shows either the confirm form or navigates to login
  await Promise.race([
    // Case 1: auto-confirmed → redirect to login
    expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 15000 }),
    // Case 2: confirm form appears
    expect(page.getByLabel('確認コード')).toBeVisible({ timeout: 15000 }),
  ]).catch(() => {
    // One of the two will resolve; ignore the rejection from the other
  });

  // Check which state we landed in
  const confirmInput = page.getByLabel('確認コード');
  const isConfirmVisible = await confirmInput.isVisible();

  if (isConfirmVisible) {
    // Enter the cognito-local confirmation code (6 digits)
    await confirmInput.fill('999999');
    await page.getByRole('button', { name: '確認' }).click();

    // After confirmation we should be on the login screen
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 15000 });
  }
}

/**
 * Log in with an existing account.
 * Assumes the login screen is already shown (or will be redirected to).
 */
async function loginUser(page: Page, email: string, password: string): Promise<void> {
  // Ensure we are on the login screen
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();

  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード').fill(password);
  await page.getByRole('button', { name: 'ログイン' }).click();
}

// ---- Test suite ----

test.describe('Auth Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Unauthenticated users are redirected to login by the NavigationGuard.
    await page.goto('/');
    // Wait until the login button is visible to confirm the redirect completed.
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 15000 });
  });

  // ------------------------------------------------------------------
  // 1. Sign Up — happy path
  // ------------------------------------------------------------------
  test('Sign Up: happy path — registers a new user', async ({ page }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, email, 'Password123!', 'Test User');

    // After registration (and optional confirmation) we should be on the login screen
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 2. Sign Up — password too short (client-side validation, < 8 chars)
  // ------------------------------------------------------------------
  test('Sign Up: shows inline error when password is too short', async ({ page }) => {
    await page.getByRole('button', { name: 'アカウントを作成' }).click();
    await expect(page.getByRole('button', { name: 'アカウントを作成' })).toBeVisible();

    await page.getByLabel('表示名').fill('Test User');
    await page.getByLabel('メールアドレス').fill(uniqueEmail());

    // Type a short password — inline error should appear immediately
    await page.getByLabel('パスワード').fill('short');

    // The inline error "8文字以上で入力してください" should be visible
    await expect(page.getByText('8文字以上で入力してください')).toBeVisible();

    // The submit button should be disabled (isValid requires password.length >= 8)
    const submitButton = page.getByRole('button', { name: 'アカウントを作成' });
    await expect(submitButton).toBeDisabled();
  });

  // ------------------------------------------------------------------
  // 3. Sign Up — duplicate email
  // ------------------------------------------------------------------
  test('Sign Up: shows error for duplicate email', async ({ page }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();

    // First registration
    await registerUser(page, email, 'Password123!', 'Test User');

    // Navigate to register screen again
    await page.getByRole('button', { name: 'アカウントを作成' }).click();
    await expect(page.getByRole('button', { name: 'アカウントを作成' })).toBeVisible();

    // Try to register the same email again
    await page.getByLabel('表示名').fill('Test User 2');
    await page.getByLabel('メールアドレス').fill(email);
    await page.getByLabel('パスワード').fill('Password123!');
    await page.getByRole('button', { name: 'アカウントを作成' }).click();

    // Should show "already registered" error
    await expect(page.getByText('このメールアドレスは既に登録されています')).toBeVisible({
      timeout: 15000,
    });
  });

  // ------------------------------------------------------------------
  // 4. Confirm Sign Up — with code 999999
  // ------------------------------------------------------------------
  test('Confirm Sign Up: accepts code 999999 and redirects to login', async ({ page }) => {
    test.setTimeout(60000);

    // registerUser already handles the confirmation step internally.
    // This test verifies the full path ends up on the login screen.
    const email = uniqueEmail();
    await registerUser(page, email, 'Password123!', 'Confirm Test');

    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  // ------------------------------------------------------------------
  // 5. Confirm Sign Up — invalid code shows error
  // ------------------------------------------------------------------
  test('Confirm Sign Up: shows error for invalid code', async ({ page }) => {
    test.setTimeout(60000);

    await page.getByRole('button', { name: 'アカウントを作成' }).click();
    await expect(page.getByRole('button', { name: 'アカウントを作成' })).toBeVisible();

    const email = uniqueEmail();
    await page.getByLabel('表示名').fill('Invalid Code User');
    await page.getByLabel('メールアドレス').fill(email);
    await page.getByLabel('パスワード').fill('Password123!');
    await page.getByRole('button', { name: 'アカウントを作成' }).click();

    // Wait for either confirm form or login screen
    const confirmInput = page.getByLabel('確認コード');
    const loginButton = page.getByRole('button', { name: 'ログイン' });

    await Promise.race([
      confirmInput.waitFor({ state: 'visible', timeout: 15000 }),
      loginButton.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {});

    const isConfirmVisible = await confirmInput.isVisible();

    if (!isConfirmVisible) {
      // cognito-local auto-confirmed — skip this test scenario
      test.skip();
      return;
    }

    // Enter a wrong code
    await confirmInput.fill('000000');
    await page.getByRole('button', { name: '確認' }).click();

    // Should show an error message
    await expect(
      page.getByText('確認コードが正しくありません').or(page.getByText('確認に失敗しました')),
    ).toBeVisible({ timeout: 15000 });
  });

  // ------------------------------------------------------------------
  // 6. Sign In — happy path
  // ------------------------------------------------------------------
  test('Sign In: existing user can log in', async ({ page }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, email, 'Password123!', 'Login Test User');

    // Now log in with the same credentials
    await loginUser(page, email, 'Password123!');

    // After login the NavigationGuard redirects authenticated users to (tabs)
    // The tabs contain a "Home" tab — wait for any tab-bar element as confirmation
    await expect(page).toHaveURL(/\/(tabs|$)/, { timeout: 15000 });
  });

  // ------------------------------------------------------------------
  // 7. Sign In — wrong password
  // ------------------------------------------------------------------
  test('Sign In: shows error for wrong password', async ({ page }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, email, 'Password123!', 'Wrong Pass User');

    await loginUser(page, email, 'WrongPassword!');

    await expect(
      page.getByText('メールアドレスまたはパスワードが正しくありません').or(
        page.getByText('ログインに失敗しました'),
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  // ------------------------------------------------------------------
  // 8. Sign In — non-existent user
  // ------------------------------------------------------------------
  test('Sign In: shows error for non-existent user', async ({ page }) => {
    test.setTimeout(30000);

    await loginUser(page, 'nonexistent@example.com', 'Password123!');

    await expect(
      page.getByText('メールアドレスまたはパスワードが正しくありません').or(
        page.getByText('ログインに失敗しました'),
      ),
    ).toBeVisible({ timeout: 15000 });
  });

  // ------------------------------------------------------------------
  // 9. Sign Out — after login, sign out returns to login screen
  // ------------------------------------------------------------------
  test('Sign Out: after login, signing out returns to login screen', async ({ page }) => {
    test.setTimeout(60000);

    const email = uniqueEmail();
    await registerUser(page, email, 'Password123!', 'Sign Out User');
    await loginUser(page, email, 'Password123!');

    // Wait until we are on the tabs screen (authenticated)
    await expect(page).toHaveURL(/\/(tabs|$)/, { timeout: 15000 });

    // Navigate to settings tab which contains the sign-out control
    await page.goto('/(tabs)/settings');

    // Look for a sign-out / logout button
    const signOutButton = page.getByRole('button', { name: /サインアウト|ログアウト|Sign Out|Logout/i });
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    await signOutButton.click();

    // After sign out the NavigationGuard redirects back to login
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 15000 });
  });

  // ------------------------------------------------------------------
  // 10. Navigation guard — unauthenticated user redirected to login
  // ------------------------------------------------------------------
  test('Navigation guard: unauthenticated user is redirected to login', async ({ page }) => {
    // beforeEach already navigates to "/" and confirms we land on the login screen.
    // Directly attempt to access a protected route.
    await page.goto('/(tabs)');

    // NavigationGuard should redirect to login
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 15000 });
  });

  // ------------------------------------------------------------------
  // 11. Full flow: register → (confirm) → login → logout
  // ------------------------------------------------------------------
  test('Full flow: register, login, and logout', async ({ page }) => {
    test.setTimeout(90000);

    const email = uniqueEmail();
    const password = 'Password123!';

    // Step 1: Register (includes confirmation if required)
    await registerUser(page, email, password, 'Full Flow User');
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();

    // Step 2: Login
    await loginUser(page, email, password);
    await expect(page).toHaveURL(/\/(tabs|$)/, { timeout: 15000 });

    // Step 3: Logout via settings
    await page.goto('/(tabs)/settings');
    const signOutButton = page.getByRole('button', { name: /サインアウト|ログアウト|Sign Out|Logout/i });
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    await signOutButton.click();

    // Step 4: Verify we are back on the login screen
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible({ timeout: 15000 });
  });
});
