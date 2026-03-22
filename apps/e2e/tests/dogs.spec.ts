import { test, expect } from './helpers/fixtures';
import { uniqueEmail, registerAndLogin } from './helpers/auth';
import { navigateToDogs } from './helpers/navigation';
import { takeScreenshot } from './helpers/screenshot';

test.describe('Dog Profiles', () => {
  let email: string;
  const password = 'Password123!';

  test.beforeEach(async ({ page, labels }) => {
    test.setTimeout(90000);
    email = uniqueEmail();
    await registerAndLogin(page, labels, email, password);
  });

  test('Dogs tab: shows empty state when no dogs exist', async ({ page, labels }) => {
    await navigateToDogs(page);

    await expect(page.getByText(labels.dogs.empty)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: labels.dogs.addDog }).first()).toBeVisible();
    await takeScreenshot(page, 'dogs-empty-state');
  });

  test('Dogs tab: FAB navigates to create screen', async ({ page, labels }) => {
    await navigateToDogs(page);

    await page.getByRole('button', { name: labels.dogs.addDog }).first().click();
    await expect(page.getByText(labels.dogs.newTitle)).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'dogs-create-screen');
  });

  test('Create dog: registers a new dog and redirects to detail', async ({ page, labels }) => {
    await page.goto('/dogs/new');
    await expect(page.getByText(labels.dogs.newTitle)).toBeVisible({ timeout: 10000 });

    await page.getByLabel(labels.dogs.name).fill('ポチ');
    await page.getByLabel(labels.dogs.breed).fill('柴犬');

    await page.getByRole('button', { name: labels.dogs.register }).click();

    await expect(page.getByText('ポチ')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('柴犬')).toBeVisible();
    await takeScreenshot(page, 'dogs-created-detail');
  });

  test('Create dog: submit is disabled when name is empty', async ({ page, labels }) => {
    await page.goto('/dogs/new');
    await expect(page.getByText(labels.dogs.newTitle)).toBeVisible({ timeout: 10000 });

    const submitButton = page.getByRole('button', { name: labels.dogs.register });
    await expect(submitButton).toBeDisabled();

    await page.getByLabel(labels.dogs.breed).fill('柴犬');
    await expect(submitButton).toBeDisabled();
    await takeScreenshot(page, 'dogs-submit-disabled');

    await page.getByLabel(labels.dogs.name).fill('ポチ');
    await expect(submitButton).toBeEnabled();
    await takeScreenshot(page, 'dogs-submit-enabled');
  });

  test('Dog list: created dog appears in the list', async ({ page, labels }) => {
    await page.goto('/dogs/new');
    await expect(page.getByLabel(labels.dogs.name)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('ハナ');
    await page.getByLabel(labels.dogs.breed).fill('プードル');
    await page.getByRole('button', { name: labels.dogs.register }).click();

    await expect(page.getByText('ハナ')).toBeVisible({ timeout: 15000 });

    await navigateToDogs(page);

    await expect(page.getByText('ハナ')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('プードル')).toBeVisible();
    await takeScreenshot(page, 'dogs-list-after-create');
  });

  test('Dog detail: shows name, breed, and stats (0 walks)', async ({ page, labels }) => {
    await page.goto('/dogs/new');
    await expect(page.getByLabel(labels.dogs.name)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('クロ');
    await page.getByLabel(labels.dogs.breed).fill('ラブラドール');
    await page.getByRole('button', { name: labels.dogs.register }).click();

    await expect(page.getByText('クロ')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('ラブラドール')).toBeVisible();

    await expect(page.getByText(labels.dogs.walks)).toBeVisible();
    await expect(page.getByText(labels.dogs.distance)).toBeVisible();
    await expect(page.getByText(labels.dogs.duration)).toBeVisible();

    await expect(page.getByRole('button', { name: labels.dogs.edit })).toBeVisible();
    await expect(page.getByRole('button', { name: labels.dogs.delete })).toBeVisible();
    await takeScreenshot(page, 'dogs-detail-stats');
  });

  test('Edit dog: updates dog name and breed', async ({ page, labels }) => {
    await page.goto('/dogs/new');
    await expect(page.getByLabel(labels.dogs.name)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('シロ');
    await page.getByRole('button', { name: labels.dogs.register }).click();

    await expect(page.getByRole('button', { name: labels.dogs.edit })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: labels.dogs.edit }).click();

    await expect(page.getByText(labels.dogs.editTitle)).toBeVisible({ timeout: 10000 });
    await takeScreenshot(page, 'dogs-edit-form');

    await expect(page.getByLabel(labels.dogs.name)).toHaveValue('シロ');

    await page.getByLabel(labels.dogs.name).clear();
    await page.getByLabel(labels.dogs.name).fill('シロ改');
    await page.getByLabel(labels.dogs.breed).fill('秋田犬');
    await page.getByRole('button', { name: labels.dogs.update }).click();

    await expect(page.getByText('シロ改')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('秋田犬')).toBeVisible();
    await takeScreenshot(page, 'dogs-edit-updated');
  });

  test('Delete dog: removes dog and redirects to list', async ({ page, labels }) => {
    await page.goto('/dogs/new');
    await expect(page.getByLabel(labels.dogs.name)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('タロウ');
    await page.getByRole('button', { name: labels.dogs.register }).click();

    await expect(page.getByRole('button', { name: labels.dogs.delete })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: labels.dogs.delete }).click();

    await expect(page.getByText(labels.dogs.deleteTitle)).toBeVisible({ timeout: 5000 });
    await takeScreenshot(page, 'dogs-delete-confirm-dialog');

    await page.getByRole('button', { name: labels.dogs.delete }).last().click();

    await expect(page.getByText(labels.dogs.empty)).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'dogs-delete-empty-list');
  });

  test('Delete dog: cancelling keeps the dog', async ({ page, labels }) => {
    await page.goto('/dogs/new');
    await expect(page.getByLabel(labels.dogs.name)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('モモ');
    await page.getByRole('button', { name: labels.dogs.register }).click();

    await expect(page.getByRole('button', { name: labels.dogs.delete })).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: labels.dogs.delete }).click();

    await expect(page.getByText(labels.dogs.deleteTitle)).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: labels.dogs.cancel }).click();

    await expect(page.getByText('モモ', { exact: true }).first()).toBeVisible({ timeout: 5000 });
    await takeScreenshot(page, 'dogs-delete-cancelled');
  });

  test('Full flow: create, view, edit, delete a dog', async ({ page, labels }) => {
    test.setTimeout(120000);

    // Create
    await page.goto('/dogs/new');
    await expect(page.getByLabel(labels.dogs.name)).toBeVisible({ timeout: 10000 });
    await page.getByLabel(labels.dogs.name).fill('フルフロー犬');
    await page.getByLabel(labels.dogs.breed).fill('雑種');
    await page.getByRole('button', { name: labels.dogs.register }).click();
    await expect(page.getByText('フルフロー犬')).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'fullflow-dogs-created');

    // View
    await expect(page.getByText('雑種')).toBeVisible();
    await expect(page.getByText(labels.dogs.walks)).toBeVisible();

    // Edit
    await page.getByRole('button', { name: labels.dogs.edit }).click();
    await expect(page.getByLabel(labels.dogs.name)).toHaveValue('フルフロー犬', { timeout: 10000 });
    await page.getByLabel(labels.dogs.name).clear();
    await page.getByLabel(labels.dogs.name).fill('フルフロー犬（更新）');
    await page.getByRole('button', { name: labels.dogs.update }).click();
    await expect(page.getByText('フルフロー犬（更新）')).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'fullflow-dogs-edited');

    // Delete
    await page.getByRole('button', { name: labels.dogs.delete }).click();
    await expect(page.getByText(labels.dogs.deleteTitle)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: labels.dogs.delete }).last().click();
    await expect(page.getByText(labels.dogs.empty)).toBeVisible({ timeout: 15000 });
    await takeScreenshot(page, 'fullflow-dogs-deleted');
  });
});
