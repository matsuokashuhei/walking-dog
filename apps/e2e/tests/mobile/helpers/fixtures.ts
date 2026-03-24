import { test as base } from '@playwright/test';
import { type Labels, getLabels } from './i18n';

export { expect } from '@playwright/test';

export const test = base.extend<{ labels: Labels }>({
  labels: async ({}, use, testInfo) => {
    const locale = (testInfo.project.use as { locale?: string }).locale ?? 'ja-JP';
    await use(getLabels(locale));
  },
});
