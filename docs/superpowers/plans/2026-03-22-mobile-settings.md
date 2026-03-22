# Mobile Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Settings tab — display user profile, allow editing display name, and provide sign-out functionality.

**Architecture:** `useMe()` provides current user data. `useUpdateProfile()` mutation handles name editing. `useAuth().signOut()` clears tokens and the navigation guard in `_layout.tsx` redirects to login. Settings screen uses a simple list layout with a profile section at the top.

**Tech Stack:** TanStack Query, Zustand (auth-store), Expo Router navigation

**Prerequisite:** Increments 0 and 1 must be complete — `useMe`, `useUpdateProfile`, `useAuth`, `Button`, `TextInput` must exist.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/mobile/components/settings/ProfileSection.tsx` | Shows display name + inline edit form |
| Create | `apps/mobile/components/settings/LogoutButton.tsx` | Sign-out button with ConfirmDialog |
| Modify | `apps/mobile/app/(tabs)/settings.tsx` | Replace placeholder with ProfileSection + LogoutButton |

---

## Task 1: ProfileSection Component

**Files:**
- Create: `apps/mobile/components/settings/ProfileSection.tsx`
- Test: `apps/mobile/components/settings/ProfileSection.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/components/settings/ProfileSection.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileSection } from './ProfileSection';

const mockUpdateProfile = jest.fn();

jest.mock('@/hooks/use-profile-mutation', () => ({
  useUpdateProfile: () => ({
    mutateAsync: mockUpdateProfile,
    isPending: false,
  }),
}));

describe('ProfileSection', () => {
  beforeEach(() => jest.clearAllMocks());

  it('displays current display name', () => {
    render(<ProfileSection displayName="Taro" />);
    expect(screen.getByText('Taro')).toBeTruthy();
  });

  it('shows edit form when edit button pressed', () => {
    render(<ProfileSection displayName="Taro" />);
    fireEvent.press(screen.getByRole('button', { name: '編集' }));
    expect(screen.getByLabelText('表示名')).toBeTruthy();
  });

  it('calls updateProfile with new display name on save', async () => {
    mockUpdateProfile.mockResolvedValue({ id: '1', displayName: 'Jiro' });
    render(<ProfileSection displayName="Taro" />);

    fireEvent.press(screen.getByRole('button', { name: '編集' }));
    fireEvent.changeText(screen.getByLabelText('表示名'), 'Jiro');
    fireEvent.press(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ displayName: 'Jiro' });
    });
  });

  it('cancels edit and restores original name', () => {
    render(<ProfileSection displayName="Taro" />);
    fireEvent.press(screen.getByRole('button', { name: '編集' }));
    fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
    expect(screen.getByText('Taro')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/settings/ProfileSection"
```

Expected: FAIL — `Cannot find module './ProfileSection'`

- [ ] **Step 3: Implement ProfileSection**

Create `apps/mobile/components/settings/ProfileSection.tsx`:
```typescript
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useUpdateProfile } from '@/hooks/use-profile-mutation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';

interface ProfileSectionProps {
  displayName: string;
}

export function ProfileSection({ displayName }: ProfileSectionProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!editValue.trim()) return;
    setError('');
    try {
      await updateProfile({ displayName: editValue.trim() });
      setIsEditing(false);
    } catch {
      setError('更新に失敗しました');
    }
  }

  function handleCancel() {
    setEditValue(displayName);
    setIsEditing(false);
    setError('');
  }

  return (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>プロフィール</Text>

      {isEditing ? (
        <View style={styles.editForm}>
          <TextInput
            label="表示名"
            value={editValue}
            onChangeText={setEditValue}
            error={error || undefined}
            autoFocus
          />
          <View style={styles.editActions}>
            <Button
              label="キャンセル"
              variant="secondary"
              onPress={handleCancel}
              style={styles.actionButton}
            />
            <View style={{ width: spacing.sm }} />
            <Button
              label="保存"
              onPress={handleSave}
              loading={isPending}
              disabled={!editValue.trim()}
              style={styles.actionButton}
            />
          </View>
        </View>
      ) : (
        <View style={styles.displayRow}>
          <View style={styles.nameSection}>
            <Text style={[styles.labelText, { color: colors.textSecondary }]}>表示名</Text>
            <Text style={[styles.nameText, { color: colors.text }]}>{displayName}</Text>
          </View>
          <Button
            label="編集"
            variant="secondary"
            onPress={() => setIsEditing(true)}
            style={styles.editButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  displayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameSection: { flex: 1 },
  labelText: { ...typography.caption },
  nameText: { ...typography.bodyMedium, marginTop: spacing.xs },
  editButton: { width: 80 },
  editForm: {},
  editActions: { flexDirection: 'row' },
  actionButton: { flex: 1 },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/settings/ProfileSection"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/settings/ProfileSection.tsx apps/mobile/components/settings/ProfileSection.test.tsx
git commit -m "feat(mobile): add ProfileSection component with inline edit"
```

---

## Task 2: LogoutButton Component

**Files:**
- Create: `apps/mobile/components/settings/LogoutButton.tsx`
- Test: `apps/mobile/components/settings/LogoutButton.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/components/settings/LogoutButton.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { LogoutButton } from './LogoutButton';

const mockSignOut = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({ signOut: mockSignOut }),
}));

describe('LogoutButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows confirm dialog when button pressed', () => {
    render(<LogoutButton />);
    fireEvent.press(screen.getByRole('button', { name: 'ログアウト' }));
    expect(screen.getByText('ログアウトしますか？')).toBeTruthy();
  });

  it('calls signOut when confirmed', async () => {
    mockSignOut.mockResolvedValue(undefined);
    render(<LogoutButton />);

    fireEvent.press(screen.getByRole('button', { name: 'ログアウト' }));
    fireEvent.press(screen.getByRole('button', { name: 'ログアウト', hidden: true }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it('does not call signOut when cancelled', () => {
    render(<LogoutButton />);

    fireEvent.press(screen.getByRole('button', { name: 'ログアウト' }));
    fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/settings/LogoutButton"
```

- [ ] **Step 3: Implement LogoutButton**

Create `apps/mobile/components/settings/LogoutButton.tsx`:
```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/use-auth';

export function LogoutButton() {
  const { signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await signOut();
      // Navigation guard in _layout.tsx will redirect to (auth)/login
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <Button
        label="ログアウト"
        variant="destructive"
        onPress={() => setShowConfirm(true)}
        loading={loading}
      />
      <ConfirmDialog
        visible={showConfirm}
        title="ログアウト"
        message="ログアウトしますか？"
        confirmLabel="ログアウト"
        cancelLabel="キャンセル"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        destructive
      />
    </>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/settings/LogoutButton"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/settings/LogoutButton.tsx apps/mobile/components/settings/LogoutButton.test.tsx
git commit -m "feat(mobile): add LogoutButton component with confirmation dialog"
```

---

## Task 3: Settings Tab Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Implement Settings tab screen**

Replace entire content of `apps/mobile/app/(tabs)/settings.tsx`:
```typescript
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMe } from '@/hooks/use-me';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { LogoutButton } from '@/components/settings/LogoutButton';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: me, isLoading } = useMe();

  if (isLoading || !me) return <LoadingScreen />;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <ThemedText type="title" style={styles.title}>設定</ThemedText>

      <ProfileSection displayName={me.displayName} />

      <View style={styles.logoutSection}>
        <LogoutButton />
      </View>

      <Text style={[styles.version, { color: colors.textSecondary }]}>
        バージョン {appVersion}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  title: {
    marginBottom: spacing.xl,
  },
  logoutSection: {
    marginTop: spacing.lg,
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
```

- [ ] **Step 2: End-to-end test of Settings screen**

With Docker stack running, log in and navigate to Settings tab.

Verify:
1. Display name shows the logged-in user's name
2. Press 編集 → inline form appears with current name pre-filled
3. Change name → press 保存 → form closes, new name shown
4. Press ログアウト → confirm dialog appears
5. Press キャンセル → dialog closes, still logged in
6. Press ログアウト → confirm → redirected to Login screen
7. App version displayed at bottom

```bash
docker compose -f apps/compose.yml up
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/settings.tsx
git commit -m "feat(mobile): implement settings screen with profile edit and logout"
```

---

## Verification Checklist

- [ ] Settings tab shows current user's display name
- [ ] Edit display name → saved → name updates in settings and home screen greeting
- [ ] Logout with cancel → stays logged in
- [ ] Logout with confirm → redirected to login screen
- [ ] App restart after logout → stays on login screen (token cleared)
- [ ] All tests pass: `docker compose -f apps/compose.yml run --rm mobile npm test`
