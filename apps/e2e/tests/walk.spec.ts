import { test, expect } from './helpers/fixtures';
import { uniqueEmail, registerAndLogin } from './helpers/auth';
import { navigateToDogs } from './helpers/navigation';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Walk Recording', () => {
  let email: string;
  const password = 'Password123!';

  test.beforeEach(async ({ page, labels }) => {
    test.setTimeout(120000);
    email = uniqueEmail();
    await registerAndLogin(page, labels, email, password);
  });

  test('Walk tab: shows dog selector when no dogs exist', async ({ page, labels }) => {
    await page.goto('/(tabs)/walk');
    await page.waitForTimeout(2000);

    await expect(page.getByText(labels.walk.noDogs)).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'walk-no-dogs');
  });

  test('Walk tab: shows dog selector with registered dog', async ({ page, labels }) => {
    // First create a dog
    await page.goto('/dogs/new');
    await expect(page.getByText(labels.dogs.newTitle)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('テスト犬');
    await page.getByLabel(labels.dogs.breed).fill('テスト犬種');
    await page.getByRole('button', { name: labels.dogs.register }).click();
    await page.waitForTimeout(3000);

    // Navigate to walk tab
    await page.goto('/(tabs)/walk');
    await page.waitForTimeout(2000);

    await expect(page.getByText(labels.walk.selectDogs)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('テスト犬')).toBeVisible();
    await takeScreenshot(page, 'walk-dog-selector');
  });

  test('Walk tab: can select a dog and see start button', async ({ page, labels }) => {
    // Create a dog
    await page.goto('/dogs/new');
    await expect(page.getByText(labels.dogs.newTitle)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('散歩犬');
    await page.getByRole('button', { name: labels.dogs.register }).click();
    await page.waitForTimeout(3000);

    // Navigate to walk tab
    await page.goto('/(tabs)/walk');
    await page.waitForTimeout(2000);

    // Select the dog
    await page.getByText('散歩犬').click();
    await page.waitForTimeout(500);

    // Start Walk button should be enabled
    const startButton = page.getByRole('button', { name: labels.walk.startWalk });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeEnabled();
    await takeScreenshot(page, 'walk-dog-selected');
  });

  test('Walk tab: start button disabled when no dog selected', async ({ page, labels }) => {
    // Create a dog
    await page.goto('/dogs/new');
    await expect(page.getByText(labels.dogs.newTitle)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('未選択犬');
    await page.getByRole('button', { name: labels.dogs.register }).click();
    await page.waitForTimeout(3000);

    // Navigate to walk tab
    await page.goto('/(tabs)/walk');
    await page.waitForTimeout(2000);

    // Start Walk button should be disabled (no dog selected)
    const startButton = page.getByRole('button', { name: labels.walk.startWalk });
    await expect(startButton).toBeVisible();
    await expect(startButton).toBeDisabled();
    await takeScreenshot(page, 'walk-start-disabled');
  });
});
