# Native Tabs Nested Stacks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the native tab bar as the app shell and make pushed detail/settings screens belong to the active tab's native Stack instead of the root Stack.

**Architecture:** Continue using `expo-router/unstable-native-tabs` for the bottom tab bar. Convert each tab from a single route file into a folder with its own nested `Stack`, then move dog, walk-detail, user-edit, and settings routes under the relevant tab folder. Do not replace routed tabs with `@expo/ui/swift-ui` `TabView`; the Expo UI docs position `TabView` as content-level tabs and direct full-screen routed bottom tabs to `NativeTabs`.

**Tech Stack:** Expo Router, `expo-router/unstable-native-tabs`, React Native, TypeScript, Jest, React Native Testing Library.

---

## Context

Docs and local rules already checked:

- `apps/mobile/CLAUDE.md`: prefer Expo official native surfaces such as `expo-router/unstable-native-tabs`; keep Expo Router file-based routing; do not directly import `@react-navigation/*`.
- `docs/product/principles.md`: product work must name Dog experience, Walk data, and Owner contribution impact.
- Expo UI SwiftUI `TabView` docs for SDK 56: `TabView` supports page-style and automatic tab content, but says routed bottom-tab navigation across full-screen routes should use `expo-router/unstable-native-tabs`.
- Expo Router Native tabs docs: native tabs use the platform tab bar; native tabs are alpha; for pushing screens inside native tabs, use nested `Stack` layouts inside tabs.

Product impact:

- Dog experience: dog detail/edit flows stay anchored in the Dogs tab, reducing route jumps while preserving relationship context.
- Walk data: saved walk detail review stays anchored in the Walk tab, making recorded route/event data easier to inspect after saving.
- Owner contribution: native-feeling back gestures and stable tabs reduce navigation friction after common owner actions.

## Target Route Shape

Create this route tree:

```text
apps/mobile/app/
  _layout.tsx
  index.tsx
  walk-recording.tsx
  (auth)/
  (tabs)/
    _layout.tsx
    dogs/
      _layout.tsx
      index.tsx
      new.tsx
      [id]/
        _layout.tsx
        index.tsx
        edit.tsx
    walk/
      _layout.tsx
      index.tsx
      walks/
        _layout.tsx
        [id].tsx
    user/
      _layout.tsx
      index.tsx
      edit.tsx
      settings/
        _layout.tsx
        index.tsx
        email.tsx
```

Remove these root feature route directories after moving their real screens:

```text
apps/mobile/app/dogs/
apps/mobile/app/walks/
apps/mobile/app/user/
apps/mobile/app/settings/
```

Keep `apps/mobile/app/walk-recording.tsx` as the documented compatibility bridge for Live Activity / old recording links.

Do not add root redirect wrappers in the first implementation. Internal app navigation should stop using the old root paths. If product requirements later need stable external deep links like `/walks/:id`, add that as a separate compatibility task because root wrappers briefly enter the root Stack.

## Task 1: Rehome Dogs Routes Under The Dogs Tab

**Files:**

- Modify: `apps/mobile/__tests__/app/tabs/dogs.test.tsx`
- Modify: `apps/mobile/__tests__/app/dogs/dog-detail-layout.test.tsx`
- Modify: `apps/mobile/__tests__/app/dogs/dog-detail.test.tsx`
- Modify: `apps/mobile/__tests__/app/dogs/edit.test.tsx`
- Modify: `apps/mobile/__tests__/app/dogs/new.test.tsx`
- Modify: `apps/mobile/hooks/use-dogs-screen-view-model.test.ts`
- Modify: `apps/mobile/components/walk/NoDogsBody.test.tsx`
- Move: `apps/mobile/app/(tabs)/dogs.tsx` to `apps/mobile/app/(tabs)/dogs/index.tsx`
- Move: `apps/mobile/app/dogs/_layout.tsx` to `apps/mobile/app/(tabs)/dogs/_layout.tsx`
- Move: `apps/mobile/app/dogs/new.tsx` to `apps/mobile/app/(tabs)/dogs/new.tsx`
- Move: `apps/mobile/app/dogs/[id]/_layout.tsx` to `apps/mobile/app/(tabs)/dogs/[id]/_layout.tsx`
- Move: `apps/mobile/app/dogs/[id]/index.tsx` to `apps/mobile/app/(tabs)/dogs/[id]/index.tsx`
- Move: `apps/mobile/app/dogs/[id]/edit.tsx` to `apps/mobile/app/(tabs)/dogs/[id]/edit.tsx`
- Modify: `apps/mobile/hooks/use-dogs-screen-view-model.ts`
- Modify: `apps/mobile/components/walk/NoDogsBody.tsx`

- [ ] **Step 1: Update tests to describe the target file locations and routes**

Change imports:

```tsx
// apps/mobile/__tests__/app/tabs/dogs.test.tsx
import DogsScreen from '../../../app/(tabs)/dogs/index';

// apps/mobile/__tests__/app/dogs/dog-detail-layout.test.tsx
import DogDetailLayout from '../../../app/(tabs)/dogs/[id]/_layout';

// apps/mobile/__tests__/app/dogs/new.test.tsx
import NewDogScreen from '../../../app/(tabs)/dogs/new';

// apps/mobile/__tests__/app/dogs/dog-detail.test.tsx
import DogDetailScreen from '../../../app/(tabs)/dogs/[id]/index';

// apps/mobile/__tests__/app/dogs/edit.test.tsx
import EditDogScreen from '../../../app/(tabs)/dogs/[id]/edit';
```

Change route expectations:

```tsx
// apps/mobile/hooks/use-dogs-screen-view-model.test.ts
expect(mockPush).toHaveBeenNthCalledWith(1, '/(tabs)/dogs/new');
expect(mockPush).toHaveBeenNthCalledWith(2, '/(tabs)/dogs/dog-9');

// apps/mobile/components/walk/NoDogsBody.test.tsx
expect(mockPush).toHaveBeenCalledWith('/(tabs)/dogs/new');

// apps/mobile/__tests__/app/dogs/dog-detail.test.tsx
expect(mockPush).toHaveBeenCalledWith({
  pathname: '/(tabs)/dogs/[id]/edit',
  params: { id: 'dog-1' },
});
expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dogs');

// apps/mobile/__tests__/app/dogs/edit.test.tsx
expect(mockReplace).toHaveBeenCalledWith('/(tabs)/dogs');
```

- [ ] **Step 2: Run tests and verify they fail for the expected reason**

Run from `apps/mobile`:

```bash
npm test -- __tests__/app/tabs/dogs.test.tsx __tests__/app/dogs/dog-detail-layout.test.tsx __tests__/app/dogs/new.test.tsx __tests__/app/dogs/dog-detail.test.tsx __tests__/app/dogs/edit.test.tsx hooks/use-dogs-screen-view-model.test.ts components/walk/NoDogsBody.test.tsx --runInBand
```

Expected: FAIL because the new `app/(tabs)/dogs/...` route files do not exist yet and route strings still point at `/dogs/...`.

- [ ] **Step 3: Move the Dogs route files**

Run from repo root:

```bash
mkdir -p 'apps/mobile/app/(tabs)/dogs/[id]'
git mv 'apps/mobile/app/(tabs)/dogs.tsx' 'apps/mobile/app/(tabs)/dogs/index.tsx'
git mv 'apps/mobile/app/dogs/_layout.tsx' 'apps/mobile/app/(tabs)/dogs/_layout.tsx'
git mv 'apps/mobile/app/dogs/new.tsx' 'apps/mobile/app/(tabs)/dogs/new.tsx'
git mv 'apps/mobile/app/dogs/[id]/_layout.tsx' 'apps/mobile/app/(tabs)/dogs/[id]/_layout.tsx'
git mv 'apps/mobile/app/dogs/[id]/index.tsx' 'apps/mobile/app/(tabs)/dogs/[id]/index.tsx'
git mv 'apps/mobile/app/dogs/[id]/edit.tsx' 'apps/mobile/app/(tabs)/dogs/[id]/edit.tsx'
```

- [ ] **Step 4: Make the Dogs tab folder own a Stack**

Use this shape in `apps/mobile/app/(tabs)/dogs/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

// Dogs tab owns list, create, detail, and edit screens so native back gestures
// stay inside the tab instead of pushing onto the root Stack.
export default function DogsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="new" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
```

Keep `apps/mobile/app/(tabs)/dogs/[id]/_layout.tsx` as a nested Stack with:

```tsx
import { Stack } from 'expo-router';

// Dog detail owns its edit child while each screen draws its own inline chrome.
export default function DogDetailLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="edit" options={{ headerShown: false, animation: 'none' }} />
    </Stack>
  );
}
```

- [ ] **Step 5: Update Dogs navigation calls**

Change `apps/mobile/hooks/use-dogs-screen-view-model.ts`:

```ts
const handleAddDog = useCallback(() => {
  router.push('/(tabs)/dogs/new');
}, [router]);

const handleOpenDog = useCallback(
  (dogId: string) => {
    router.push(`/(tabs)/dogs/${dogId}`);
  },
  [router],
);
```

Change `apps/mobile/components/walk/NoDogsBody.tsx`:

```ts
const handleAdd = () => router.push('/(tabs)/dogs/new');
```

Change `apps/mobile/app/(tabs)/dogs/[id]/index.tsx` edit navigation:

```ts
router.push({
  pathname: '/(tabs)/dogs/[id]/edit',
  params: { id: dog.id },
});
```

Keep the deep-link fallback and edit save fallback pointed at the Dogs tab root:

```ts
router.replace('/(tabs)/dogs');
```

- [ ] **Step 6: Run Dogs-focused tests**

Run from `apps/mobile`:

```bash
npm test -- __tests__/app/tabs/dogs.test.tsx __tests__/app/dogs/dog-detail-layout.test.tsx __tests__/app/dogs/new.test.tsx __tests__/app/dogs/dog-detail.test.tsx __tests__/app/dogs/edit.test.tsx hooks/use-dogs-screen-view-model.test.ts components/walk/NoDogsBody.test.tsx --runInBand
```

Expected: PASS.

## Task 2: Rehome User And Settings Routes Under The Me Tab

**Files:**

- Modify: `apps/mobile/__tests__/app/tabs/user.test.tsx`
- Modify: `apps/mobile/__tests__/app/user/edit.test.tsx`
- Modify: `apps/mobile/__tests__/app/settings/index.test.tsx`
- Modify: `apps/mobile/__tests__/app/settings/email.test.tsx`
- Move: `apps/mobile/app/(tabs)/user.tsx` to `apps/mobile/app/(tabs)/user/index.tsx`
- Move: `apps/mobile/app/user/_layout.tsx` to `apps/mobile/app/(tabs)/user/_layout.tsx`
- Move: `apps/mobile/app/user/edit.tsx` to `apps/mobile/app/(tabs)/user/edit.tsx`
- Move: `apps/mobile/app/settings/_layout.tsx` to `apps/mobile/app/(tabs)/user/settings/_layout.tsx`
- Move: `apps/mobile/app/settings/index.tsx` to `apps/mobile/app/(tabs)/user/settings/index.tsx`
- Move: `apps/mobile/app/settings/email.tsx` to `apps/mobile/app/(tabs)/user/settings/email.tsx`

- [ ] **Step 1: Update tests to describe the target file locations and routes**

Change imports:

```tsx
// apps/mobile/__tests__/app/tabs/user.test.tsx
import UserScreen from '../../../app/(tabs)/user/index';

// apps/mobile/__tests__/app/user/edit.test.tsx
import UserEditScreen from '../../../app/(tabs)/user/edit';

// apps/mobile/__tests__/app/settings/index.test.tsx
import SettingsScreen from '../../../app/(tabs)/user/settings/index';

// apps/mobile/__tests__/app/settings/email.test.tsx
import EmailSettingsScreen from '../../../app/(tabs)/user/settings/email';
```

Change route expectations in `apps/mobile/__tests__/app/tabs/user.test.tsx`:

```tsx
expect(mockPush).toHaveBeenCalledWith('/(tabs)/user/edit');
expect(mockPush).toHaveBeenCalledWith('/(tabs)/user/settings');
expect(mockPush).toHaveBeenCalledWith('/(tabs)/user/settings/email');
```

- [ ] **Step 2: Run tests and verify they fail for the expected reason**

Run from `apps/mobile`:

```bash
npm test -- __tests__/app/tabs/user.test.tsx __tests__/app/user/edit.test.tsx __tests__/app/settings/index.test.tsx __tests__/app/settings/email.test.tsx --runInBand
```

Expected: FAIL because the target route files do not exist yet and the Me tab still pushes root `/user` and `/settings` routes.

- [ ] **Step 3: Move User and Settings route files**

Run from repo root:

```bash
mkdir -p 'apps/mobile/app/(tabs)/user/settings'
git mv 'apps/mobile/app/(tabs)/user.tsx' 'apps/mobile/app/(tabs)/user/index.tsx'
git mv 'apps/mobile/app/user/_layout.tsx' 'apps/mobile/app/(tabs)/user/_layout.tsx'
git mv 'apps/mobile/app/user/edit.tsx' 'apps/mobile/app/(tabs)/user/edit.tsx'
git mv 'apps/mobile/app/settings/_layout.tsx' 'apps/mobile/app/(tabs)/user/settings/_layout.tsx'
git mv 'apps/mobile/app/settings/index.tsx' 'apps/mobile/app/(tabs)/user/settings/index.tsx'
git mv 'apps/mobile/app/settings/email.tsx' 'apps/mobile/app/(tabs)/user/settings/email.tsx'
```

- [ ] **Step 4: Make the Me tab folder own a Stack**

Use this shape in `apps/mobile/app/(tabs)/user/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

// Me tab owns profile edit and settings so native back gestures stay inside the tab.
export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="settings" />
    </Stack>
  );
}
```

Keep `apps/mobile/app/(tabs)/user/settings/_layout.tsx` as:

```tsx
import { Stack } from 'expo-router';

// Settings screens draw inline chrome, not the default Stack header.
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="email" />
    </Stack>
  );
}
```

- [ ] **Step 5: Update Me tab navigation calls**

Change `apps/mobile/app/(tabs)/user/index.tsx`:

```tsx
rightAction={{
  label: t('user.edit'),
  onPress: () => router.push('/(tabs)/user/edit'),
}}
```

And update the settings rows:

```tsx
onPress={() => router.push('/(tabs)/user/settings/email')}
onPress={() => router.push('/(tabs)/user/settings')}
```

- [ ] **Step 6: Run User/Settings-focused tests**

Run from `apps/mobile`:

```bash
npm test -- __tests__/app/tabs/user.test.tsx __tests__/app/user/edit.test.tsx __tests__/app/settings/index.test.tsx __tests__/app/settings/email.test.tsx --runInBand
```

Expected: PASS.

## Task 3: Rehome Walk Detail Under The Walk Tab

**Files:**

- Modify: `apps/mobile/__tests__/app/tabs/walk.test.tsx`
- Modify: `apps/mobile/__tests__/app/walks/[id].test.tsx`
- Modify: `apps/mobile/__tests__/app/walks/walk-detail.test.tsx`
- Modify: `apps/mobile/hooks/use-dog-detail-view-model.test.ts`
- Modify: `apps/mobile/components/walk/WalkSummaryCard.test.tsx`
- Move: `apps/mobile/app/(tabs)/walk.tsx` to `apps/mobile/app/(tabs)/walk/index.tsx`
- Create: `apps/mobile/app/(tabs)/walk/_layout.tsx`
- Move: `apps/mobile/app/walks/_layout.tsx` to `apps/mobile/app/(tabs)/walk/walks/_layout.tsx`
- Move: `apps/mobile/app/walks/[id].tsx` to `apps/mobile/app/(tabs)/walk/walks/[id].tsx`
- Modify: `apps/mobile/hooks/use-dog-detail-view-model.ts`
- Modify: `apps/mobile/components/walk/WalkHistoryItem.tsx`
- Modify: `apps/mobile/components/walk/WalkSummaryCard.tsx`

- [ ] **Step 1: Update tests to describe the target file locations and routes**

Change imports:

```tsx
// apps/mobile/__tests__/app/tabs/walk.test.tsx
import WalkScreen from '../../../app/(tabs)/walk/index';

// apps/mobile/__tests__/app/walks/[id].test.tsx
import WalkDetailScreen from '../../../app/(tabs)/walk/walks/[id]';

// apps/mobile/__tests__/app/walks/walk-detail.test.tsx
import WalkDetailScreen from '../../../app/(tabs)/walk/walks/[id]';
```

Change route expectations:

```tsx
// apps/mobile/hooks/use-dog-detail-view-model.test.ts
expect(mockPush).toHaveBeenNthCalledWith(1, '/(tabs)/walk/walks/walk-8');

// apps/mobile/components/walk/WalkSummaryCard.test.tsx
expect(mockPush).toHaveBeenCalledWith('/(tabs)/walk/walks/walk-1');

// apps/mobile/__tests__/app/walks/[id].test.tsx
expect(mockReplace).toHaveBeenCalledWith({
  pathname: '/(tabs)/walk',
  params: { walkId: 'active-walk' },
});
```

- [ ] **Step 2: Run tests and verify they fail for the expected reason**

Run from `apps/mobile`:

```bash
npm test -- __tests__/app/tabs/walk.test.tsx __tests__/app/walks/[id].test.tsx __tests__/app/walks/walk-detail.test.tsx hooks/use-dog-detail-view-model.test.ts components/walk/WalkSummaryCard.test.tsx --runInBand
```

Expected: FAIL because the target route files do not exist yet and walk detail navigation still points at `/walks/...`.

- [ ] **Step 3: Move Walk route files**

Run from repo root:

```bash
mkdir -p 'apps/mobile/app/(tabs)/walk/walks'
git mv 'apps/mobile/app/(tabs)/walk.tsx' 'apps/mobile/app/(tabs)/walk/index.tsx'
git mv 'apps/mobile/app/walks/_layout.tsx' 'apps/mobile/app/(tabs)/walk/walks/_layout.tsx'
git mv 'apps/mobile/app/walks/[id].tsx' 'apps/mobile/app/(tabs)/walk/walks/[id].tsx'
```

- [ ] **Step 4: Make the Walk tab folder own a Stack**

Create `apps/mobile/app/(tabs)/walk/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';

// Walk tab owns the recording shell and saved walk detail screens.
export default function WalkLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="walks" />
    </Stack>
  );
}
```

Keep `apps/mobile/app/(tabs)/walk/walks/_layout.tsx` as the walk-detail Stack with its native header:

```tsx
import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BackButton } from '@/components/ui/BackButton';
import { useColors } from '@/hooks/use-colors';

// Saved walk detail belongs to the Walk tab stack.
export default function WalksLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const theme = useColors();

  return (
    <Stack>
      <Stack.Screen
        name="[id]"
        options={{
          title: t('walk.detail.title'),
          headerStyle: { backgroundColor: theme.background },
          headerLeft: () => (
            <BackButton
              onPress={() => router.back()}
              color={theme.interactive}
            />
          ),
        }}
      />
    </Stack>
  );
}
```

- [ ] **Step 5: Update walk detail navigation calls**

Change `apps/mobile/hooks/use-dog-detail-view-model.ts`:

```ts
const handleOpenWalk = useCallback(
  (walkId: string) => {
    router.push(`/(tabs)/walk/walks/${walkId}`);
  },
  [router],
);
```

Change `apps/mobile/components/walk/WalkHistoryItem.tsx`:

```tsx
onPress={() => router.push(`/(tabs)/walk/walks/${walk.id}`)}
```

Change `apps/mobile/components/walk/WalkSummaryCard.tsx`:

```ts
const handleSave = () => {
  const id = walkId;
  reset();
  if (id) router.push(`/(tabs)/walk/walks/${id}`);
};

const handleViewEach = walkId
  ? () => router.push(`/(tabs)/walk/walks/${walkId}`)
  : undefined;
```

Change the active-recording guard in `apps/mobile/app/(tabs)/walk/walks/[id].tsx`:

```ts
router.replace({
  pathname: '/(tabs)/walk',
  params: { walkId: activeWalkId },
});
```

Leave `apps/mobile/app/walk-recording.tsx` unchanged unless tests show a regression; it already bridges old recording links back to `/(tabs)/walk`.

- [ ] **Step 6: Run Walk-focused tests**

Run from `apps/mobile`:

```bash
npm test -- __tests__/app/tabs/walk.test.tsx __tests__/app/walks/[id].test.tsx __tests__/app/walks/walk-detail.test.tsx hooks/use-dog-detail-view-model.test.ts components/walk/WalkSummaryCard.test.tsx components/walk/WalkHistoryItem.test.tsx --runInBand
```

Expected: PASS.

## Task 4: Clean The Root Stack

**Files:**

- Modify: `apps/mobile/app/_layout.tsx`
- Verify/delete empty directories under `apps/mobile/app/dogs`, `apps/mobile/app/walks`, `apps/mobile/app/user`, and `apps/mobile/app/settings`

- [ ] **Step 1: Remove feature routes from the root Stack**

Change the root Stack in `apps/mobile/app/_layout.tsx` from:

```tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
  <Stack.Screen name="dogs" options={{ headerShown: false }} />
  <Stack.Screen name="settings" options={{ headerShown: false }} />
  <Stack.Screen name="user" options={{ headerShown: false }} />
  <Stack.Screen name="walks" options={{ headerShown: false }} />
  <Stack.Screen
    name="walk-recording"
    options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
  />
</Stack>
```

To:

```tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
  <Stack.Screen
    name="walk-recording"
    options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
  />
</Stack>
```

- [ ] **Step 2: Verify no internal navigation uses old root paths**

Run from repo root:

```bash
rg -n "router\\.(push|replace)\\('/dogs|router\\.(push|replace)\\('/settings|router\\.(push|replace)\\('/user|router\\.(push|replace)\\('/walks|pathname: '/dogs|pathname: '/settings|pathname: '/user|pathname: '/walks|href=\"/dogs|href=\"/settings|href=\"/user|href=\"/walks" apps/mobile
```

Expected: no results.

Also run:

```bash
find apps/mobile/app -maxdepth 4 -type f | sort
```

Expected: no real screen files remain under root `apps/mobile/app/dogs`, `apps/mobile/app/walks`, `apps/mobile/app/user`, or `apps/mobile/app/settings`.

- [ ] **Step 3: Run route-focused test set**

Run from `apps/mobile`:

```bash
npm test -- __tests__/app/tabs/dogs.test.tsx __tests__/app/tabs/user.test.tsx __tests__/app/tabs/walk.test.tsx __tests__/app/dogs/dog-detail.test.tsx __tests__/app/dogs/edit.test.tsx __tests__/app/settings/index.test.tsx __tests__/app/settings/email.test.tsx __tests__/app/user/edit.test.tsx __tests__/app/walks/[id].test.tsx __tests__/app/walks/walk-detail.test.tsx hooks/use-dogs-screen-view-model.test.ts hooks/use-dog-detail-view-model.test.ts components/walk/NoDogsBody.test.tsx components/walk/WalkSummaryCard.test.tsx --runInBand
```

Expected: PASS.

## Task 5: Full Verification

**Files:**

- Verify all modified mobile code and harness checks.

- [ ] **Step 1: Run mobile test suite**

Run from `apps/mobile`:

```bash
npm test -- --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run mobile static checks**

Run from `apps/mobile`:

```bash
npm run typecheck
npm run lint
npm run knip
```

Expected: all PASS.

- [ ] **Step 3: Run repository harness gate**

Run from repo root:

```bash
scripts/harness/validate-all.sh
```

Expected: PASS.

- [ ] **Step 4: Manual iOS navigation proof**

Run the app using the repo's iOS simulator sequence:

```bash
cd apps/mobile
npm run metro:kill
npm run ios:clean
npm run ios:sim:local
```

Manually verify:

- Dogs tab: open a dog detail, swipe from the left edge, and confirm it returns to the Dogs list with the tab bar still present.
- Dogs tab: open dog edit from detail, use native back or inline cancel/save, and confirm it stays in the Dogs tab stack.
- Me tab: open Settings, swipe back, and confirm it returns to Me with the tab bar stable.
- Me tab: open Change email, swipe back, and confirm it returns to Settings/Me through the Me tab stack.
- Walk tab: save or open a saved walk detail, swipe back, and confirm it returns through the Walk tab stack.
- Active recording guard: while recording, opening a stale saved walk detail should replace to `/(tabs)/walk` with the active `walkId` and should not route through `/walk-recording` internally.

Record the result in the PR or completion note with the three product axes:

```text
Dog experience: Dogs detail/edit navigation stays inside Dogs tab.
Walk data: Saved walk detail review stays inside Walk tab after recording/history entry.
Owner contribution: Native back gestures keep owners oriented in the current tab.
```

## Self-Review Notes

- Scope is limited to navigation ownership and route path updates. No data model, GraphQL, auth, or UI restyling is included.
- `@expo/ui/swift-ui` `TabView` is intentionally not used because the official docs direct routed full-screen bottom tabs to `NativeTabs`.
- The plan keeps `walk-recording` as the only root feature bridge because the file already documents Live Activity / old deep link compatibility.
- If stable external links for `/dogs/...`, `/settings`, `/user/edit`, or `/walks/...` are required, implement that as a separate redirect-compatibility plan after deciding whether the temporary root Stack entry is acceptable.
