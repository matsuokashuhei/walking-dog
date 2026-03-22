# Mobile Dog Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement dog profile CRUD — list, create, detail view with stats, edit, delete, and photo upload.

**Architecture:** `dogs.tsx` tab uses `useMe()` to get the dogs list. Dog screens use `useDog(id)` for detail. Mutations invalidate `meKeys.all` so the tab updates automatically. Photo upload uses a two-step presigned URL flow: call `generateDogPhotoUploadUrl` mutation → PUT binary to S3 URL → `updateDog` with the returned key.

**Tech Stack:** TanStack Query, expo-image, expo-image-picker, graphql-request

**Prerequisite:** Increment 0 (Foundation) and Increment 1 (Auth) must be complete.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/mobile/lib/upload.ts` | uploadToPresignedUrl helper (fetch PUT) |
| Create | `apps/mobile/components/dogs/DogListItem.tsx` | Pressable row: photo, name, breed |
| Create | `apps/mobile/components/dogs/DogForm.tsx` | Shared create/edit form with validation |
| Create | `apps/mobile/components/dogs/DogStatsCard.tsx` | WalkStats display card |
| Create | `apps/mobile/components/dogs/PhotoPicker.tsx` | expo-image-picker → presigned URL upload |
| Modify | `apps/mobile/app/(tabs)/dogs.tsx` | Dog list with FAB, useMe() hook |
| Modify | `apps/mobile/app/dogs/new.tsx` | Create dog screen |
| Modify | `apps/mobile/app/dogs/[id]/index.tsx` | Dog detail screen |
| Modify | `apps/mobile/app/dogs/[id]/edit.tsx` | Edit dog screen |

---

## Task 1: Upload Helper

**Files:**
- Create: `apps/mobile/lib/upload.ts`
- Test: `apps/mobile/lib/upload.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/lib/upload.test.ts`:
```typescript
import { uploadToPresignedUrl } from './upload';

global.fetch = jest.fn();

describe('uploadToPresignedUrl', () => {
  beforeEach(() => (fetch as jest.Mock).mockClear());

  it('sends PUT request with binary data to the URL', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });

    await uploadToPresignedUrl('https://s3.example.com/key', 'file:///tmp/photo.jpg', 'image/jpeg');

    expect(fetch).toHaveBeenCalledWith(
      'https://s3.example.com/key',
      expect.objectContaining({
        method: 'PUT',
        headers: { 'Content-Type': 'image/jpeg' },
      })
    );
  });

  it('throws on non-OK response', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403, statusText: 'Forbidden' });

    await expect(
      uploadToPresignedUrl('https://s3.example.com/key', 'file:///tmp/photo.jpg', 'image/jpeg')
    ).rejects.toThrow('Upload failed: 403 Forbidden');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/upload"
```

- [ ] **Step 3: Implement upload helper**

Create `apps/mobile/lib/upload.ts`:
```typescript
/**
 * Uploads a local file to an S3 presigned URL using HTTP PUT.
 * The presigned URL is obtained from the API via generateDogPhotoUploadUrl mutation.
 *
 * Local dev note: If using localstack, the presigned URL hostname may not be reachable
 * from a physical device. Replace 'localstack' with the host machine's LAN IP.
 */
export async function uploadToPresignedUrl(
  presignedUrl: string,
  fileUri: string,
  contentType: string
): Promise<void> {
  const blob = await uriToBlob(fileUri);

  const response = await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }
}

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/upload"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/upload.ts apps/mobile/lib/upload.test.ts
git commit -m "feat(mobile): add presigned URL upload helper"
```

---

## Task 2: DogListItem Component

**Files:**
- Create: `apps/mobile/components/dogs/DogListItem.tsx`
- Test: `apps/mobile/components/dogs/DogListItem.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/components/dogs/DogListItem.test.tsx`:
```typescript
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DogListItem } from './DogListItem';
import type { Dog } from '@/types/graphql';

const mockDog: Dog = {
  id: 'dog-1',
  name: 'Pochi',
  breed: 'Shiba Inu',
  gender: 'MALE',
  birthDate: null,
  photoUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
};

describe('DogListItem', () => {
  it('renders dog name and breed', () => {
    render(<DogListItem dog={mockDog} onPress={jest.fn()} />);
    expect(screen.getByText('Pochi')).toBeTruthy();
    expect(screen.getByText('Shiba Inu')).toBeTruthy();
  });

  it('calls onPress with dog id', () => {
    const onPress = jest.fn();
    render(<DogListItem dog={mockDog} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Pochi' }));
    expect(onPress).toHaveBeenCalledWith('dog-1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/dogs/DogListItem"
```

- [ ] **Step 3: Implement DogListItem**

Create `apps/mobile/components/dogs/DogListItem.tsx`:
```typescript
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface DogListItemProps {
  dog: Dog;
  onPress: (id: string) => void;
}

export function DogListItem({ dog, onPress }: DogListItemProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={dog.name}
      onPress={() => onPress(dog.id)}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Image
        source={dog.photoUrl ?? require('@/assets/images/icon.png')}
        style={styles.photo}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]}>{dog.name}</Text>
        {dog.breed ? (
          <Text style={[styles.breed, { color: colors.textSecondary }]}>{dog.breed}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
  },
  info: {
    marginLeft: spacing.md,
    flex: 1,
  },
  name: {
    ...typography.bodyMedium,
  },
  breed: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/dogs/DogListItem"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/dogs/DogListItem.tsx apps/mobile/components/dogs/DogListItem.test.tsx
git commit -m "feat(mobile): add DogListItem component"
```

---

## Task 3: DogForm Component

**Files:**
- Create: `apps/mobile/components/dogs/DogForm.tsx`
- Test: `apps/mobile/components/dogs/DogForm.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/components/dogs/DogForm.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { DogForm } from './DogForm';

describe('DogForm', () => {
  it('renders name field', () => {
    render(<DogForm onSubmit={jest.fn()} submitLabel="登録" />);
    expect(screen.getByLabelText('名前')).toBeTruthy();
  });

  it('disables submit when name is empty', () => {
    render(<DogForm onSubmit={jest.fn()} submitLabel="登録" />);
    expect(screen.getByRole('button', { name: '登録' })).toBeDisabled();
  });

  it('calls onSubmit with form values', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<DogForm onSubmit={onSubmit} submitLabel="登録" />);

    fireEvent.changeText(screen.getByLabelText('名前'), 'Hana');
    fireEvent.changeText(screen.getByLabelText('犬種'), 'Poodle');
    fireEvent.press(screen.getByRole('button', { name: '登録' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Hana', breed: 'Poodle' })
      );
    });
  });

  it('pre-fills initial values when editing', () => {
    render(
      <DogForm
        onSubmit={jest.fn()}
        submitLabel="更新"
        initialValues={{ name: 'Kuro', breed: 'Labrador' }}
      />
    );
    expect(screen.getByDisplayValue('Kuro')).toBeTruthy();
    expect(screen.getByDisplayValue('Labrador')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/dogs/DogForm"
```

- [ ] **Step 3: Implement DogForm**

Create `apps/mobile/components/dogs/DogForm.tsx`:
```typescript
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { spacing } from '@/theme/tokens';

export interface DogFormValues {
  name: string;
  breed: string;
  gender: string;
}

interface DogFormProps {
  onSubmit: (values: DogFormValues) => Promise<void>;
  submitLabel: string;
  initialValues?: Partial<DogFormValues>;
}

export function DogForm({ onSubmit, submitLabel, initialValues }: DogFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [breed, setBreed] = useState(initialValues?.breed ?? '');
  const [gender, setGender] = useState(initialValues?.gender ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isValid = name.trim().length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        breed: breed.trim(),
        gender: gender.trim(),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        label="名前"
        value={name}
        onChangeText={setName}
        placeholder="例: ポチ"
      />
      <TextInput
        label="犬種"
        value={breed}
        onChangeText={setBreed}
        placeholder="例: 柴犬"
      />
      <TextInput
        label="性別"
        value={gender}
        onChangeText={setGender}
        placeholder="例: オス"
      />
      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={loading}
        disabled={!isValid}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  button: { marginTop: spacing.sm },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/dogs/DogForm"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/dogs/DogForm.tsx apps/mobile/components/dogs/DogForm.test.tsx
git commit -m "feat(mobile): add DogForm component"
```

---

## Task 4: DogStatsCard + PhotoPicker

**Files:**
- Create: `apps/mobile/components/dogs/DogStatsCard.tsx`
- Create: `apps/mobile/components/dogs/PhotoPicker.tsx`

- [ ] **Step 1: Create DogStatsCard**

Create `apps/mobile/components/dogs/DogStatsCard.tsx`:
```typescript
import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { WalkStats } from '@/types/graphql';

interface DogStatsCardProps {
  stats: WalkStats;
}

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)} km`
    : `${meters} m`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}分`;
}

export function DogStatsCard({ stats }: DogStatsCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.primary }]}>{stats.totalWalks}</Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>散歩</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.primary }]}>
          {formatDistance(stats.totalDistanceM)}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>距離</Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <View style={styles.stat}>
        <Text style={[styles.value, { color: colors.primary }]}>
          {formatDuration(stats.totalDurationSec)}
        </Text>
        <Text style={[styles.label, { color: colors.textSecondary }]}>時間</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...typography.h3,
  },
  label: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  divider: {
    width: 1,
    marginHorizontal: spacing.sm,
  },
});
```

- [ ] **Step 2: Create PhotoPicker**

Create `apps/mobile/components/dogs/PhotoPicker.tsx`:
```typescript
import { Pressable, StyleSheet, Text } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';

interface PhotoPickerProps {
  currentPhotoUrl: string | null;
  onPick: (uri: string, contentType: string) => Promise<void>;
  loading?: boolean;
}

export function PhotoPicker({ currentPhotoUrl, onPick, loading = false }: PhotoPickerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  async function handlePress() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    const contentType = asset.mimeType ?? 'image/jpeg';
    await onPick(asset.uri, contentType);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="写真を変更"
      onPress={handlePress}
      disabled={loading}
      style={[styles.container, { borderColor: colors.border }]}
    >
      {currentPhotoUrl ? (
        <Image
          source={currentPhotoUrl}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Text style={[styles.placeholder, { color: colors.textSecondary }]}>
          📷 写真を追加
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    ...typography.caption,
    textAlign: 'center',
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/dogs/DogStatsCard.tsx apps/mobile/components/dogs/PhotoPicker.tsx
git commit -m "feat(mobile): add DogStatsCard and PhotoPicker components"
```

---

## Task 5: Dogs Tab Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/dogs.tsx`

- [ ] **Step 1: Implement dogs tab with dog list**

Replace entire content of `apps/mobile/app/(tabs)/dogs.tsx`:
```typescript
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMe } from '@/hooks/use-me';
import { DogListItem } from '@/components/dogs/DogListItem';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function DogsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: me, isLoading, error, refetch } = useMe();

  if (isLoading) return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <ThemedText type="title">愛犬</ThemedText>
        </View>

        <FlatList
          data={me?.dogs ?? []}
          keyExtractor={(dog) => dog.id}
          renderItem={({ item }) =>
            <DogListItem
              dog={item}
              onPress={(id) => router.push(`/dogs/${id}`)}
            />
          }
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <EmptyState
              message="まだ犬が登録されていません"
              ctaLabel="犬を追加"
              onCta={() => router.push('/dogs/new')}
            />
          }
        />

        {/* FAB */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="犬を追加"
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/dogs/new')}
        >
          <IconSymbol name="plus" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.sm,
  },
  list: {
    padding: spacing.md,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
```

- [ ] **Step 2: Verify dogs tab renders**

```bash
docker compose -f apps/compose.yml up
```

Log in, navigate to Dogs tab. Should show empty state with "犬を追加" button.

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/dogs.tsx
git commit -m "feat(mobile): implement dogs tab screen with dog list"
```

---

## Task 6: Dog Create Screen

**Files:**
- Modify: `apps/mobile/app/dogs/new.tsx`

- [ ] **Step 1: Implement dog create screen**

Replace entire content of `apps/mobile/app/dogs/new.tsx`:
```typescript
import { ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useCreateDog } from '@/hooks/use-dog-mutations';
import { DogForm, type DogFormValues } from '@/components/dogs/DogForm';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function NewDogScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { mutateAsync: createDog } = useCreateDog();

  async function handleSubmit(values: DogFormValues) {
    const dog = await createDog({
      name: values.name,
      breed: values.breed || undefined,
      gender: values.gender || undefined,
    });
    router.replace(`/dogs/${dog.id}`);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText type="title" style={styles.title}>新しい犬を登録</ThemedText>
      <DogForm onSubmit={handleSubmit} submitLabel="登録" />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg },
  title: { marginBottom: spacing.xl },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/dogs/new.tsx
git commit -m "feat(mobile): implement dog create screen"
```

---

## Task 7: Dog Detail Screen

**Files:**
- Modify: `apps/mobile/app/dogs/[id]/index.tsx`

- [ ] **Step 1: Implement dog detail screen**

Replace entire content of `apps/mobile/app/dogs/[id]/index.tsx`:
```typescript
import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useDog } from '@/hooks/use-dog';
import { useDeleteDog } from '@/hooks/use-dog-mutations';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius } from '@/theme/tokens';

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { mutateAsync: deleteDog } = useDeleteDog();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading || !dog) return <LoadingScreen />;

  async function handleDelete() {
    await deleteDog(id);
    router.replace('/(tabs)/dogs');
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.photoSection}>
        <Image
          source={dog.photoUrl ?? require('@/assets/images/icon.png')}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      </View>

      <View style={styles.infoSection}>
        <ThemedText type="title">{dog.name}</ThemedText>
        {dog.breed ? (
          <ThemedText style={{ color: colors.textSecondary }}>{dog.breed}</ThemedText>
        ) : null}
      </View>

      <View style={styles.statsSection}>
        <DogStatsCard stats={dog.walkStats} />
      </View>

      <View style={styles.actions}>
        <Button
          label="編集"
          variant="secondary"
          onPress={() => router.push(`/dogs/${id}/edit`)}
        />
        <View style={{ width: spacing.sm }} />
        <Button
          label="削除"
          variant="destructive"
          onPress={() => setShowDeleteConfirm(true)}
        />
      </View>

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="犬を削除"
        message={`${dog.name}を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        destructive
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  photoSection: { alignItems: 'center', paddingVertical: spacing.xl },
  photo: {
    width: 160,
    height: 160,
    borderRadius: radius.full,
  },
  infoSection: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  statsSection: { padding: spacing.md },
  actions: {
    flexDirection: 'row',
    padding: spacing.lg,
    paddingTop: 0,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/dogs/[id]/index.tsx
git commit -m "feat(mobile): implement dog detail screen with stats and delete"
```

---

## Task 8: Dog Edit Screen

**Files:**
- Modify: `apps/mobile/app/dogs/[id]/edit.tsx`

- [ ] **Step 1: Implement dog edit screen with photo upload**

Replace entire content of `apps/mobile/app/dogs/[id]/edit.tsx`:
```typescript
import { ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDog } from '@/hooks/use-dog';
import { useUpdateDog, useGeneratePhotoUploadUrl } from '@/hooks/use-dog-mutations';
import { DogForm, type DogFormValues } from '@/components/dogs/DogForm';
import { PhotoPicker } from '@/components/dogs/PhotoPicker';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ThemedText } from '@/components/themed-text';
import { uploadToPresignedUrl } from '@/lib/upload';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';
import { useState } from 'react';

export default function EditDogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { data: dog, isLoading } = useDog(id, 'ALL');
  const { mutateAsync: updateDog } = useUpdateDog();
  const { mutateAsync: generateUploadUrl } = useGeneratePhotoUploadUrl();
  const [photoLoading, setPhotoLoading] = useState(false);

  if (isLoading || !dog) return <LoadingScreen />;

  async function handlePhotoChange(uri: string, contentType: string) {
    setPhotoLoading(true);
    try {
      const { url, key } = await generateUploadUrl(id);
      await uploadToPresignedUrl(url, uri, contentType);
      // The key is the S3 object key — we need to store the final URL
      // The API returns the S3 URL pattern: update dog's photoUrl with the CDN URL
      // For now, update with the key (API will construct the URL)
      await updateDog({ id, input: { photoUrl: key } });
    } finally {
      setPhotoLoading(false);
    }
  }

  async function handleSubmit(values: DogFormValues) {
    await updateDog({
      id,
      input: {
        name: values.name,
        breed: values.breed || undefined,
        gender: values.gender || undefined,
      },
    });
    router.back();
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText type="title" style={styles.title}>犬のプロフィールを編集</ThemedText>
      <PhotoPicker
        currentPhotoUrl={dog.photoUrl}
        onPick={handlePhotoChange}
        loading={photoLoading}
      />
      <DogForm
        onSubmit={handleSubmit}
        submitLabel="更新"
        initialValues={{
          name: dog.name,
          breed: dog.breed ?? '',
          gender: dog.gender ?? '',
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg },
  title: { marginBottom: spacing.lg },
});
```

- [ ] **Step 2: End-to-end test of dog CRUD**

With Docker stack running:
1. Log in
2. Navigate to Dogs tab → empty state shown
3. Press FAB → Navigate to "新しい犬を登録"
4. Enter name "ポチ", breed "柴犬" → press 登録
5. Redirected to dog detail screen — stats show 0 walks
6. Press 編集 → Edit screen with pre-filled values
7. Change name → press 更新 → back to detail with updated name
8. Press 削除 → confirm dialog → dog removed → redirected to Dogs tab

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/dogs/[id]/edit.tsx
git commit -m "feat(mobile): implement dog edit screen with photo upload"
```

---

## Verification Checklist

- [ ] Dog list shows empty state when no dogs exist
- [ ] FAB navigates to create screen
- [ ] Create dog → appears in list
- [ ] Dog detail shows stats (0 walks)
- [ ] Edit dog name → updates in detail screen and list
- [ ] Delete dog → removed from list
- [ ] All tests pass: `docker compose -f apps/compose.yml run --rm mobile npm test`
