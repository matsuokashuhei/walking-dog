import { test, expect } from './helpers/fixtures';
import { uniqueEmail, registerAndLogin } from './helpers/auth';
import { navigateToSettings } from './helpers/navigation';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Settings', () => {
  let email: string;
  const password = 'Password123!';

  test.beforeEach(async ({ page, labels }) => {
    test.setTimeout(90000);
    email = uniqueEmail();
    await registerAndLogin(page, labels, email, password);
  });

  test('Settings tab: shows profile section with display name', async ({ page, labels }) => {
    await navigateToSettings(page);

    await expect(page.getByText(labels.settings.title)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(labels.settings.profile)).toBeVisible();
    await expect(page.getByText(labels.settings.displayName)).toBeVisible();
    await expect(page.getByText('Test User')).toBeVisible();
    await takeScreenshot(page, 'settings-profile');
  });

  test('Settings tab: shows dog list section', async ({ page, labels }) => {
    await navigateToSettings(page);

    await expect(page.getByText(labels.settings.dogs)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(labels.settings.noDogs)).toBeVisible();
    await takeScreenshot(page, 'settings-no-dogs');
  });

  test('Settings tab: shows appearance section', async ({ page, labels }) => {
    await navigateToSettings(page);

    await expect(page.getByText(labels.settings.appearance)).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'settings-appearance');
  });

  test('Settings tab: shows sign out button', async ({ page, labels }) => {
    await navigateToSettings(page);

    const signOutButton = page.getByRole('button', { name: labels.settings.signOut });
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'settings-signout');
  });

  test('Settings tab: sign out shows confirmation dialog', async ({ page, labels }) => {
    await navigateToSettings(page);

    const signOutButton = page.getByRole('button', { name: labels.settings.signOut });
    await expect(signOutButton).toBeVisible({ timeout: 10000 });
    await signOutButton.click();

    await expect(page.getByText(labels.settings.signOutConfirm)).toBeVisible({ timeout: 5000 });
    await takeScreenshot(page, 'settings-signout-dialog');

    // Cancel — should stay on settings
    await page.getByRole('button', { name: labels.settings.cancel }).click();
    await expect(page.getByText(labels.settings.title)).toBeVisible();
  });

  test('Settings tab: shows version number', async ({ page }) => {
    await navigateToSettings(page);

    await expect(page.getByText(/[Vv]ersion|バージョン/)).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'settings-version');
  });
});
