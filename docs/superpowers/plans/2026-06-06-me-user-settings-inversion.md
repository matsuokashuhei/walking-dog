# Me User Settings Inversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Me tab render the user screen first, with a settings link at the bottom that opens the settings list.

**Architecture:** Reuse the existing user screen view-model and user UI as the Me tab root so user metrics stay single-sourced. Move the existing settings list into `/settings` and keep user editing at `/user/edit`.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, React Native Testing Library, existing theme tokens and grouped settings components.

---

### Task 1: Me Tab Becomes User Screen

**Files:**
- Modify: `apps/mobile/__tests__/app/tabs/user.test.tsx`
- Modify: `apps/mobile/app/(tabs)/user.tsx`
- Modify: `apps/mobile/lib/i18n/locales/en.json`
- Modify: `apps/mobile/lib/i18n/locales/ja.json`

- [x] **Step 1: Write the failing test**

Update the tab test so `UserScreen` mocks `useUserScreenViewModel`, expects user content on the tab, presses `Edit`, and presses the bottom settings row to navigate to `/settings`.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/app/tabs/user.test.tsx --runInBand`
Expected: FAIL because the tab still renders the settings list and imports `useSettingsScreenViewModel`.

- [x] **Step 3: Write minimal implementation**

Replace `app/(tabs)/user.tsx` with the existing user layout pattern: large Me header, identity block, metrics card, weekly chart, and a bottom grouped row labeled `settings.openSettings` that pushes `/settings`. Keep the Edit action as the large-title right action and route it to `/user/edit`.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/app/tabs/user.test.tsx --runInBand`
Expected: PASS.

### Task 2: Settings Route Owns Settings List

**Files:**
- Modify: `apps/mobile/__tests__/app/settings/index.test.tsx`
- Modify: `apps/mobile/app/settings/index.tsx`
- Modify: `docs/mobile/architecture-overview.md`

- [x] **Step 1: Write the failing test**

Update the `/settings` test so the route expects a settings header, preferences/legal/sign-out sections, and a back action; no user metrics should be asserted here.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/app/settings/index.test.tsx --runInBand`
Expected: FAIL because `/settings` does not yet render the settings list screen.

- [x] **Step 3: Write minimal implementation**

Replace `app/settings/index.tsx` with the settings list screen using `useSettingsScreenViewModel`, `PreferencesSection`, `LegalSection`, and `SignOutRow`. Use an inline `ScreenHeader` titled `settings.settingsTitle` with a back action.

- [x] **Step 4: Run focused tests**

Run: `npm test -- __tests__/app/tabs/user.test.tsx __tests__/app/settings/index.test.tsx --runInBand`
Expected: PASS.

### Task 3: Verification

**Files:**
- Verify all modified TypeScript and docs.

- [x] **Step 1: Run related tests**

Run: `npm test -- __tests__/app/tabs/user.test.tsx __tests__/app/settings/index.test.tsx __tests__/app/user/edit.test.tsx components/user/UserAvatarEditor.test.tsx lib/i18n/__tests__/translations.test.ts hooks/use-user-screen-view-model.test.ts --runInBand`
Expected: PASS.

- [x] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.
