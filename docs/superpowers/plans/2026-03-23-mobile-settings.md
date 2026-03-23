# Mobile Settings Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Settings tab with profile edit, dog list, theme/language toggle, sign-out with confirmation, and app version display.

**Architecture:** iOS Settings-style grouped card layout. `useMe()` provides user + dogs. `useUpdateProfile()` handles name edit. `useSettingsStore()` (Zustand + AsyncStorage) manages theme/language preferences. `useAuth().signOut()` clears tokens. `ConfirmDialog` handles sign-out confirmation.

**Tech Stack:** TanStack Query, Zustand, AsyncStorage, Expo Router, i18next, expo-constants

**Prerequisite:** Increments 0 and 1 must be complete.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `apps/mobile/lib/i18n/locales/ja.json` | Add settings i18n keys |
| Modify | `apps/mobile/lib/i18n/locales/en.json` | Add settings i18n keys |
| Create | `apps/mobile/hooks/use-profile-mutation.ts` | updateProfile mutation hook |
| Create | `apps/mobile/stores/settings-store.ts` | Theme/language preferences (AsyncStorage) |
| Create | `apps/mobile/components/ui/SegmentedControl.tsx` | Generic segmented control |
| Create | `apps/mobile/components/settings/ProfileSection.tsx` | Display name + inline edit |
| Create | `apps/mobile/components/settings/DogListSection.tsx` | Dog list with navigation |
| Create | `apps/mobile/components/settings/AppearanceSection.tsx` | Theme + language settings |
| Create | `apps/mobile/components/settings/LogoutButton.tsx` | Sign-out with confirmation |
| Modify | `apps/mobile/app/(tabs)/settings.tsx` | Compose all sections |

---

## Task 1: i18n Strings

**Files:**
- Modify: `apps/mobile/lib/i18n/locales/ja.json`
- Modify: `apps/mobile/lib/i18n/locales/en.json`

- [ ] **Step 1: Add settings i18n keys to ja.json**

Replace the `"settings"` section in `ja.json`:
```json
"settings": {
  "title": "設定",
  "profile": "プロフィール",
  "displayName": "表示名",
  "edit": "編集",
  "save": "保存",
  "cancel": "キャンセル",
  "updateError": "更新に失敗しました",
  "dogs": "愛犬",
  "noDogs": "犬が登録されていません",
  "appearance": "外観",
  "theme": "テーマ",
  "themeLight": "ライト",
  "themeDark": "ダーク",
  "themeAuto": "自動",
  "language": "言語",
  "signOut": "サインアウト",
  "signOutConfirm": "サインアウトしますか？",
  "version": "バージョン {{version}}"
}
```

- [ ] **Step 2: Add settings i18n keys to en.json**

Replace the `"settings"` section in `en.json`:
```json
"settings": {
  "title": "Settings",
  "profile": "Profile",
  "displayName": "Display Name",
  "edit": "Edit",
  "save": "Save",
  "cancel": "Cancel",
  "updateError": "Failed to update",
  "dogs": "My Dogs",
  "noDogs": "No dogs registered",
  "appearance": "Appearance",
  "theme": "Theme",
  "themeLight": "Light",
  "themeDark": "Dark",
  "themeAuto": "Auto",
  "language": "Language",
  "signOut": "Sign Out",
  "signOutConfirm": "Are you sure you want to sign out?",
  "version": "Version {{version}}"
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/i18n/locales/ja.json apps/mobile/lib/i18n/locales/en.json
git commit -m "feat(mobile): add settings screen i18n keys"
```

---

## Task 2: useUpdateProfile Hook

**Files:**
- Create: `apps/mobile/hooks/use-profile-mutation.ts`

- [ ] **Step 1: Implement useUpdateProfile**

Create `apps/mobile/hooks/use-profile-mutation.ts`:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { UPDATE_PROFILE_MUTATION } from '@/lib/graphql/mutations';
import { meKeys } from '@/lib/graphql/keys';
import type { UpdateProfileInput, UpdateProfileResponse, User } from '@/types/graphql';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation<User, Error, UpdateProfileInput>({
    mutationFn: async (input) => {
      const data = await graphqlClient.request<UpdateProfileResponse>(
        UPDATE_PROFILE_MUTATION,
        { input },
      );
      return data.updateProfile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: meKeys.all });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/hooks/use-profile-mutation.ts
git commit -m "feat(mobile): add useUpdateProfile hook"
```

---

## Task 3: SettingsStore (Theme/Language)

**Files:**
- Create: `apps/mobile/stores/settings-store.ts`

- [ ] **Step 1: Implement settings store**

Create `apps/mobile/stores/settings-store.ts`:
```typescript
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/lib/i18n';

type ThemeMode = 'light' | 'dark' | 'auto';

interface SettingsState {
  theme: ThemeMode;
  language: string;
  isLoaded: boolean;
  initialize: () => Promise<void>;
  setTheme: (theme: ThemeMode) => Promise<void>;
  setLanguage: (language: string) => Promise<void>;
}

const THEME_KEY = 'settings_theme';
const LANGUAGE_KEY = 'settings_language';

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'auto',
  language: 'ja',
  isLoaded: false,

  initialize: async () => {
    const [theme, language] = await Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(LANGUAGE_KEY),
    ]);
    const lang = language ?? 'ja';
    await i18n.changeLanguage(lang);
    set({
      theme: (theme as ThemeMode) ?? 'auto',
      language: lang,
      isLoaded: true,
    });
  },

  setTheme: async (theme) => {
    await AsyncStorage.setItem(THEME_KEY, theme);
    set({ theme });
  },

  setLanguage: async (language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    await i18n.changeLanguage(language);
    set({ language });
  },
}));
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/stores/settings-store.ts
git commit -m "feat(mobile): add settings store with theme/language persistence"
```

---

## Task 4: SegmentedControl Component

**Files:**
- Create: `apps/mobile/components/ui/SegmentedControl.tsx`

- [ ] **Step 1: Implement SegmentedControl**

Create `apps/mobile/components/ui/SegmentedControl.tsx`:
```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';

interface SegmentOption {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selected: string;
  onChange: (value: string) => void;
}

export function SegmentedControl({ options, selected, onChange }: SegmentedControlProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.border }]}>
      {options.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            accessibilityRole="button"
            accessibilityLabel={opt.label}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              isSelected && [styles.selectedSegment, { backgroundColor: colors.card }],
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isSelected ? colors.text : colors.textSecondary },
                isSelected && styles.selectedLabel,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: radius.sm,
    padding: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderRadius: radius.sm - 2,
  },
  selectedSegment: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: '400',
  },
  selectedLabel: {
    fontWeight: '500',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/ui/SegmentedControl.tsx
git commit -m "feat(mobile): add SegmentedControl UI component"
```

---

## Task 5: ProfileSection Component

**Files:**
- Create: `apps/mobile/components/settings/ProfileSection.tsx`

- [ ] **Step 1: Implement ProfileSection**

Create `apps/mobile/components/settings/ProfileSection.tsx`:
```typescript
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useUpdateProfile } from '@/hooks/use-profile-mutation';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';

interface ProfileSectionProps {
  displayName: string | null;
}

export function ProfileSection({ displayName }: ProfileSectionProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayName ?? '');
  const [error, setError] = useState('');

  async function handleSave() {
    if (!editValue.trim()) return;
    setError('');
    try {
      await updateProfile({ displayName: editValue.trim() });
      setIsEditing(false);
    } catch {
      setError(t('settings.updateError'));
    }
  }

  function handleCancel() {
    setEditValue(displayName ?? '');
    setIsEditing(false);
    setError('');
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.profile')}
      </Text>
      {isEditing ? (
        <View>
          <TextInput
            label={t('settings.displayName')}
            value={editValue}
            onChangeText={setEditValue}
            error={error || undefined}
            autoFocus
          />
          <View style={styles.actions}>
            <Button
              label={t('settings.cancel')}
              variant="secondary"
              onPress={handleCancel}
              style={styles.actionButton}
            />
            <View style={{ width: spacing.sm }} />
            <Button
              label={t('settings.save')}
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
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {t('settings.displayName')}
            </Text>
            <Text style={[styles.nameText, { color: colors.text }]}>
              {displayName ?? '-'}
            </Text>
          </View>
          <Button
            label={t('settings.edit')}
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
  card: {
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
  label: { ...typography.caption },
  nameText: { ...typography.bodyMedium, marginTop: spacing.xs },
  editButton: { width: 80 },
  actions: { flexDirection: 'row' },
  actionButton: { flex: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/settings/ProfileSection.tsx
git commit -m "feat(mobile): add ProfileSection with inline edit"
```

---

## Task 6: DogListSection Component

**Files:**
- Create: `apps/mobile/components/settings/DogListSection.tsx`

- [ ] **Step 1: Implement DogListSection**

Create `apps/mobile/components/settings/DogListSection.tsx`:
```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface DogListSectionProps {
  dogs: Dog[];
}

export function DogListSection({ dogs }: DogListSectionProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.dogs')}
      </Text>
      {dogs.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {t('settings.noDogs')}
        </Text>
      ) : (
        dogs.map((dog, index) => (
          <Pressable
            key={dog.id}
            accessibilityRole="button"
            accessibilityLabel={dog.name}
            onPress={() => router.push(`/dogs/${dog.id}`)}
            style={[
              styles.dogRow,
              index < dogs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={[styles.dogIcon, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.dogEmoji}>🐕</Text>
            </View>
            <View style={styles.dogInfo}>
              <Text style={[styles.dogName, { color: colors.text }]}>{dog.name}</Text>
              {dog.breed && (
                <Text style={[styles.dogBreed, { color: colors.textSecondary }]}>{dog.breed}</Text>
              )}
            </View>
            <Text style={[styles.chevron, { color: colors.textSecondary }]}>›</Text>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  emptyText: {
    ...typography.body,
  },
  dogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  dogIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dogEmoji: { fontSize: 18 },
  dogInfo: { marginLeft: 12, flex: 1 },
  dogName: { ...typography.bodyMedium },
  dogBreed: { ...typography.caption, marginTop: 2 },
  chevron: { fontSize: 18 },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/settings/DogListSection.tsx
git commit -m "feat(mobile): add DogListSection component"
```

---

## Task 7: AppearanceSection Component

**Files:**
- Create: `apps/mobile/components/settings/AppearanceSection.tsx`

- [ ] **Step 1: Implement AppearanceSection**

Create `apps/mobile/components/settings/AppearanceSection.tsx`:
```typescript
import { ActionSheetIOS, Platform, StyleSheet, Text, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSettingsStore } from '@/stores/settings-store';

const LANGUAGES = [
  { label: '日本語', value: 'ja' },
  { label: 'English', value: 'en' },
];

export function AppearanceSection() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const theme = useSettingsStore((s) => s.theme);
  const language = useSettingsStore((s) => s.language);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);

  const themeOptions = [
    { label: t('settings.themeLight'), value: 'light' },
    { label: t('settings.themeDark'), value: 'dark' },
    { label: t('settings.themeAuto'), value: 'auto' },
  ];

  const currentLanguageLabel = LANGUAGES.find((l) => l.value === language)?.label ?? language;

  function handleLanguagePress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...LANGUAGES.map((l) => l.label), t('settings.cancel')],
          cancelButtonIndex: LANGUAGES.length,
        },
        (index) => {
          if (index < LANGUAGES.length) {
            setLanguage(LANGUAGES[index].value);
          }
        },
      );
    } else {
      // Android: cycle through languages
      const currentIndex = LANGUAGES.findIndex((l) => l.value === language);
      const nextIndex = (currentIndex + 1) % LANGUAGES.length;
      setLanguage(LANGUAGES[nextIndex].value);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
        {t('settings.appearance')}
      </Text>

      <View style={styles.row}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.theme')}</Text>
        <SegmentedControl
          options={themeOptions}
          selected={theme}
          onChange={(v) => setTheme(v as 'light' | 'dark' | 'auto')}
        />
      </View>

      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.language')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('settings.language')}: ${currentLanguageLabel}`}
          onPress={handleLanguagePress}
          style={[styles.dropdown, { borderColor: colors.border }]}
        >
          <Text style={[styles.dropdownText, { color: colors.text }]}>{currentLanguageLabel}</Text>
          <Text style={[styles.dropdownArrow, { color: colors.textSecondary }]}>▼</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: {
    ...typography.body,
    marginRight: spacing.md,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  dropdownText: {
    fontSize: 14,
  },
  dropdownArrow: {
    fontSize: 12,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/settings/AppearanceSection.tsx
git commit -m "feat(mobile): add AppearanceSection with theme and language"
```

---

## Task 8: LogoutButton Component

**Files:**
- Create: `apps/mobile/components/settings/LogoutButton.tsx`

- [ ] **Step 1: Implement LogoutButton**

Create `apps/mobile/components/settings/LogoutButton.tsx`:
```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/use-auth';

export function LogoutButton() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  }

  return (
    <>
      <Button
        label={t('settings.signOut')}
        variant="destructive"
        onPress={() => setShowConfirm(true)}
        loading={loading}
      />
      <ConfirmDialog
        visible={showConfirm}
        title={t('settings.signOut')}
        message={t('settings.signOutConfirm')}
        confirmLabel={t('settings.signOut')}
        cancelLabel={t('settings.cancel')}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
        destructive
      />
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/settings/LogoutButton.tsx
git commit -m "feat(mobile): add LogoutButton with confirmation dialog"
```

---

## Task 9: Settings Tab Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Replace settings screen with full implementation**

Replace entire content of `apps/mobile/app/(tabs)/settings.tsx`:
```typescript
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { useMe } from '@/hooks/use-me';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ThemedText } from '@/components/themed-text';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { DogListSection } from '@/components/settings/DogListSection';
import { AppearanceSection } from '@/components/settings/AppearanceSection';
import { LogoutButton } from '@/components/settings/LogoutButton';
import Constants from 'expo-constants';

export default function SettingsScreen() {
  const { t } = useTranslation();
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
      <ThemedText type="title" style={styles.title}>
        {t('settings.title')}
      </ThemedText>

      <ProfileSection displayName={me.displayName} />
      <DogListSection dogs={me.dogs} />
      <AppearanceSection />

      <LogoutButton />

      <Text style={[styles.version, { color: colors.textSecondary }]}>
        {t('settings.version', { version: appVersion })}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    marginBottom: spacing.lg,
  },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/settings.tsx
git commit -m "feat(mobile): implement settings screen with all sections"
```

---

## Verification Checklist

- [ ] Settings tab shows user's display name in profile section
- [ ] Edit button opens inline form; save updates name; cancel restores original
- [ ] Dog list shows registered dogs; tap navigates to dog detail
- [ ] Theme segmented control switches between light/dark/auto
- [ ] Language dropdown switches UI between ja and en
- [ ] Sign out button shows confirmation dialog
- [ ] Confirming sign out clears session and redirects to login
- [ ] App version displayed at bottom
- [ ] Settings persist across app restart (AsyncStorage)
