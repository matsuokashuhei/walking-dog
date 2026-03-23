# Walk Recording (Increment 5) — Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement walk recording on the mobile app — GPS tracking, dog selection, live map, walk history, and detail screen.

**Architecture:** Zustand store manages 3-phase UI state (`ready` → `recording` → `finished`). GPS points accumulate in memory via `expo-location`, distance computed client-side with Haversine. On finish, all points sent to existing Rust API via GraphQL.

**Tech Stack:** React Native/Expo, TypeScript, Zustand, TanStack Query, expo-location, react-native-maps, expo-router

**Spec:** `docs/superpowers/specs/2026-03-23-walk-recording-mobile-design.md`

---

## Prerequisites

- PR #23 の API 側変更が main にマージ済みであること
- `npx expo run:ios` でビルドが通ること
- Docker で API + PostgreSQL + DynamoDB (LocalStack) が起動していること

## File Map

### New Files (apps/mobile/)
| File | Responsibility |
|------|----------------|
| `lib/walk/distance.ts` | Haversine 距離計算 |
| `lib/walk/gps-tracker.ts` | expo-location ラッパー |
| `lib/walk/distance.test.ts` | distance テスト |
| `lib/walk/gps-tracker.test.ts` | gps-tracker テスト |
| `stores/walk-store.ts` | Walk 状態管理 (Zustand) |
| `stores/walk-store.test.ts` | walk-store テスト |
| `hooks/use-walk-mutations.ts` | GraphQL mutation hooks |
| `hooks/use-walks.ts` | GraphQL query hooks |
| `components/walk/DogSelector.tsx` | 犬選択 UI |
| `components/walk/DogSelector.test.tsx` | DogSelector テスト |
| `components/walk/WalkMap.tsx` | 地図 + ルート表示 |
| `components/walk/WalkControls.tsx` | タイマー・距離・停止ボタン |
| `components/walk/WalkSummaryCard.tsx` | 完了サマリー |
| `components/walk/WalkHistoryItem.tsx` | 散歩履歴リストアイテム |
| `lib/walk/format.ts` | 時間・距離フォーマット共通関数 |
| `lib/walk/format.test.ts` | format テスト |

### Modified Files (apps/mobile/)
| File | Change |
|------|--------|
| `lib/graphql/keys.ts` | `walkKeys` 追加 |
| `lib/i18n/locales/en.json` | walk 関連翻訳追加 |
| `lib/i18n/locales/ja.json` | walk 関連翻訳追加 |
| `app/(tabs)/walk.tsx` | 3-phase UI 実装 |
| `app/(tabs)/index.tsx` | 散歩履歴リスト追加 |
| `app/walks/[id].tsx` | 散歩詳細画面実装 |

---

## Task 0: Fix Walk Type — Make `points` Optional

**Files:**
- Modify: `types/graphql.ts`

`MY_WALKS_QUERY` は `points` を返さないが、`Walk` 型では `points: WalkPoint[]` が必須フィールドになっている。`points` をオプショナルに変更する。

- [ ] **Step 1: Update Walk type**

In `types/graphql.ts`, change line 44:
```typescript
// Before:
  points: WalkPoint[];
// After:
  points?: WalkPoint[];
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/types/graphql.ts
git commit -m "fix(mobile): make Walk.points optional for list queries"
```

---

## Task 1: Haversine Distance Calculation

**Files:**
- Create: `lib/walk/distance.ts`
- Create: `lib/walk/distance.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/walk/distance.test.ts
import { haversineDistance } from './distance';

describe('haversineDistance', () => {
  it('returns 0 for same point', () => {
    const p = { lat: 35.6812, lng: 139.7671 };
    expect(haversineDistance(p, p)).toBe(0);
  });

  it('calculates Tokyo Station to Shibuya Station (~3.3km)', () => {
    const tokyo = { lat: 35.6812, lng: 139.7671 };
    const shibuya = { lat: 35.6580, lng: 139.7016 };
    const distance = haversineDistance(tokyo, shibuya);
    expect(distance).toBeGreaterThan(3200);
    expect(distance).toBeLessThan(3500);
  });

  it('returns distance in meters', () => {
    const p1 = { lat: 35.6812, lng: 139.7671 };
    const p2 = { lat: 35.6813, lng: 139.7672 };
    const distance = haversineDistance(p1, p2);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest lib/walk/distance.test.ts --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/walk/distance.ts
const EARTH_RADIUS_M = 6_371_000;

export function haversineDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(p2.lat - p1.lat);
  const dLng = toRad(p2.lng - p1.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1.lat)) * Math.cos(toRad(p2.lat)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest lib/walk/distance.test.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/walk/distance.ts apps/mobile/lib/walk/distance.test.ts
git commit -m "feat(mobile): add Haversine distance calculation"
```

---

## Task 1.5: Format Utilities

**Files:**
- Create: `lib/walk/format.ts`
- Create: `lib/walk/format.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/walk/format.test.ts
import { formatTime, formatDistance } from './format';

describe('formatTime', () => {
  it('formats seconds only', () => {
    expect(formatTime(45)).toBe('00:45');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(125)).toBe('02:05');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatTime(3661)).toBe('1:01:01');
  });
});

describe('formatDistance', () => {
  it('formats meters under 1km', () => {
    expect(formatDistance(500)).toBe('500 m');
  });

  it('formats km for 1000m or more', () => {
    expect(formatDistance(1500)).toBe('1.50 km');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest lib/walk/format.test.ts --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// lib/walk/format.ts
export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest lib/walk/format.test.ts --no-cache`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/walk/format.ts apps/mobile/lib/walk/format.test.ts
git commit -m "feat(mobile): add time and distance format utilities"
```

---

## Task 2: GPS Tracker

**Files:**
- Create: `lib/walk/gps-tracker.ts`
- Create: `lib/walk/gps-tracker.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/walk/gps-tracker.test.ts
import { requestPermission, startTracking } from './gps-tracker';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 4 },
}));

import * as Location from 'expo-location';

describe('requestPermission', () => {
  it('returns true when permission granted', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    const result = await requestPermission();
    expect(result).toBe(true);
  });

  it('returns false when permission denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });
    const result = await requestPermission();
    expect(result).toBe(false);
  });
});

describe('startTracking', () => {
  it('calls watchPositionAsync and returns cleanup function', async () => {
    const mockRemove = jest.fn();
    (Location.watchPositionAsync as jest.Mock).mockResolvedValue({ remove: mockRemove });

    const onPosition = jest.fn();
    const stop = await startTracking(onPosition);

    expect(Location.watchPositionAsync).toHaveBeenCalledWith(
      expect.objectContaining({ accuracy: Location.Accuracy.High }),
      expect.any(Function),
    );

    stop();
    expect(mockRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest lib/walk/gps-tracker.test.ts --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// lib/walk/gps-tracker.ts
import * as Location from 'expo-location';
import type { WalkPoint } from '@/types/graphql';

export async function requestPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function startTracking(
  onPosition: (point: WalkPoint) => void,
): Promise<() => void> {
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,
      distanceInterval: 5,
    },
    (location) => {
      onPosition({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        recordedAt: new Date(location.timestamp).toISOString(),
      });
    },
  );

  return () => subscription.remove();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest lib/walk/gps-tracker.test.ts --no-cache`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/walk/gps-tracker.ts apps/mobile/lib/walk/gps-tracker.test.ts
git commit -m "feat(mobile): add GPS tracker with expo-location"
```

---

## Task 3: Walk Store (Zustand)

**Files:**
- Create: `stores/walk-store.ts`
- Create: `stores/walk-store.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// stores/walk-store.test.ts
import { useWalkStore } from './walk-store';
import type { WalkPoint } from '@/types/graphql';

// Reset store between tests
beforeEach(() => {
  useWalkStore.getState().reset();
});

describe('walk-store', () => {
  it('initial phase is ready', () => {
    expect(useWalkStore.getState().phase).toBe('ready');
  });

  it('selectDog toggles dog selection', () => {
    const { selectDog } = useWalkStore.getState();
    selectDog('dog-1');
    expect(useWalkStore.getState().selectedDogIds).toEqual(['dog-1']);
    selectDog('dog-2');
    expect(useWalkStore.getState().selectedDogIds).toEqual(['dog-1', 'dog-2']);
    selectDog('dog-1');
    expect(useWalkStore.getState().selectedDogIds).toEqual(['dog-2']);
  });

  it('startRecording transitions to recording phase', () => {
    useWalkStore.getState().startRecording('walk-123');
    const state = useWalkStore.getState();
    expect(state.phase).toBe('recording');
    expect(state.walkId).toBe('walk-123');
    expect(state.startedAt).toBeInstanceOf(Date);
  });

  it('addPoint accumulates points and distance', () => {
    useWalkStore.getState().startRecording('walk-123');
    const p1: WalkPoint = { lat: 35.6812, lng: 139.7671, recordedAt: '2026-03-23T10:00:00Z' };
    const p2: WalkPoint = { lat: 35.6813, lng: 139.7672, recordedAt: '2026-03-23T10:00:05Z' };
    useWalkStore.getState().addPoint(p1);
    useWalkStore.getState().addPoint(p2);
    const state = useWalkStore.getState();
    expect(state.points).toHaveLength(2);
    expect(state.totalDistanceM).toBeGreaterThan(0);
  });

  it('finish transitions to finished phase', () => {
    useWalkStore.getState().startRecording('walk-123');
    useWalkStore.getState().finish();
    expect(useWalkStore.getState().phase).toBe('finished');
  });

  it('reset returns to ready phase', () => {
    useWalkStore.getState().startRecording('walk-123');
    useWalkStore.getState().finish();
    useWalkStore.getState().reset();
    const state = useWalkStore.getState();
    expect(state.phase).toBe('ready');
    expect(state.walkId).toBeNull();
    expect(state.points).toEqual([]);
    expect(state.selectedDogIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest stores/walk-store.test.ts --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// stores/walk-store.ts
import { create } from 'zustand';
import { haversineDistance } from '@/lib/walk/distance';
import type { WalkPoint } from '@/types/graphql';

type WalkPhase = 'ready' | 'recording' | 'finished';

interface WalkState {
  phase: WalkPhase;
  walkId: string | null;
  selectedDogIds: string[];
  points: WalkPoint[];
  totalDistanceM: number;
  startedAt: Date | null;
  selectDog: (dogId: string) => void;
  startRecording: (walkId: string) => void;
  addPoint: (point: WalkPoint) => void;
  finish: () => void;
  reset: () => void;
}

export const useWalkStore = create<WalkState>((set, get) => ({
  phase: 'ready',
  walkId: null,
  selectedDogIds: [],
  points: [],
  totalDistanceM: 0,
  startedAt: null,

  selectDog: (dogId) =>
    set((state) => ({
      selectedDogIds: state.selectedDogIds.includes(dogId)
        ? state.selectedDogIds.filter((id) => id !== dogId)
        : [...state.selectedDogIds, dogId],
    })),

  startRecording: (walkId) =>
    set({ phase: 'recording', walkId, startedAt: new Date() }),

  addPoint: (point) =>
    set((state) => {
      const prev = state.points[state.points.length - 1];
      const added = prev ? haversineDistance(prev, point) : 0;
      return {
        points: [...state.points, point],
        totalDistanceM: state.totalDistanceM + added,
      };
    }),

  finish: () => set({ phase: 'finished' }),

  reset: () =>
    set({
      phase: 'ready',
      walkId: null,
      selectedDogIds: [],
      points: [],
      totalDistanceM: 0,
      startedAt: null,
    }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest stores/walk-store.test.ts --no-cache`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/stores/walk-store.ts apps/mobile/stores/walk-store.test.ts
git commit -m "feat(mobile): add walk Zustand store with phase management"
```

---

## Task 4: Query Keys + Walk Hooks

**Files:**
- Modify: `lib/graphql/keys.ts`
- Create: `hooks/use-walk-mutations.ts`
- Create: `hooks/use-walks.ts`

- [ ] **Step 1: Add walkKeys to keys.ts**

Add to `lib/graphql/keys.ts`:

```typescript
export const walkKeys = {
  all: ['walks'] as const,
  detail: (id: string) => ['walks', id] as const,
  list: () => ['walks', 'list'] as const,
};
```

- [ ] **Step 2: Create use-walk-mutations.ts**

```typescript
// hooks/use-walk-mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import {
  START_WALK_MUTATION,
  FINISH_WALK_MUTATION,
  ADD_WALK_POINTS_MUTATION,
} from '@/lib/graphql/mutations';
import { walkKeys } from '@/lib/graphql/keys';
import type {
  Walk,
  WalkPointInput,
  StartWalkResponse,
  FinishWalkResponse,
  AddWalkPointsResponse,
} from '@/types/graphql';

export function useStartWalk() {
  return useMutation<Walk, Error, string[]>({
    mutationFn: async (dogIds) => {
      const data = await graphqlClient.request<StartWalkResponse>(
        START_WALK_MUTATION,
        { dogIds },
      );
      return data.startWalk;
    },
  });
}

export function useFinishWalk() {
  const queryClient = useQueryClient();
  return useMutation<Walk, Error, string>({
    mutationFn: async (walkId) => {
      const data = await graphqlClient.request<FinishWalkResponse>(
        FINISH_WALK_MUTATION,
        { walkId },
      );
      return data.finishWalk;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walkKeys.all });
    },
  });
}

export function useAddWalkPoints() {
  return useMutation<boolean, Error, { walkId: string; points: WalkPointInput[] }>({
    mutationFn: async ({ walkId, points }) => {
      const data = await graphqlClient.request<AddWalkPointsResponse>(
        ADD_WALK_POINTS_MUTATION,
        { walkId, points },
      );
      return data.addWalkPoints;
    },
  });
}
```

- [ ] **Step 3: Create use-walks.ts**

```typescript
// hooks/use-walks.ts
import { useQuery } from '@tanstack/react-query';
import { graphqlClient } from '@/lib/graphql/client';
import { WALK_QUERY, MY_WALKS_QUERY } from '@/lib/graphql/queries';
import { walkKeys } from '@/lib/graphql/keys';
import { useAuthStore } from '@/stores/auth-store';
import type { Walk, WalkResponse, MyWalksResponse } from '@/types/graphql';

export function useWalk(id: string) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Walk | null>({
    queryKey: walkKeys.detail(id),
    queryFn: async () => {
      const data = await graphqlClient.request<WalkResponse>(WALK_QUERY, { id });
      return data.walk;
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useMyWalks(limit = 20) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery<Walk[]>({
    queryKey: walkKeys.list(),
    queryFn: async () => {
      const data = await graphqlClient.request<MyWalksResponse>(MY_WALKS_QUERY, {
        limit,
        offset: 0,
      });
      return data.myWalks;
    },
    enabled: isAuthenticated,
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/lib/graphql/keys.ts apps/mobile/hooks/use-walk-mutations.ts apps/mobile/hooks/use-walks.ts
git commit -m "feat(mobile): add walk query keys and GraphQL hooks"
```

---

## Task 5: i18n — Walk Translations

**Files:**
- Modify: `lib/i18n/locales/en.json`
- Modify: `lib/i18n/locales/ja.json`

- [ ] **Step 1: Add English translations**

Add `"walk"` section to `en.json`:

```json
"walk": {
  "ready": {
    "title": "Let's go for a walk!",
    "subtitle": "Select dogs to walk with",
    "start": "Start Walk",
    "noDogs": "Register a dog first"
  },
  "recording": {
    "time": "Time",
    "distance": "Distance",
    "stop": "Stop",
    "recording": "Recording"
  },
  "finished": {
    "title": "Walk Complete!",
    "details": "View Details",
    "walkAgain": "Walk Again",
    "saving": "Saving walk data..."
  },
  "history": {
    "title": "Recent Walks",
    "empty": "No walks yet. Start your first walk!",
    "minutes": "{{count}} min",
    "km": "{{value}} km"
  },
  "detail": {
    "title": "Walk Detail",
    "route": "Route",
    "dogs": "Dogs"
  },
  "permission": {
    "title": "Location Permission Required",
    "message": "We need access to your location to track your walk route.",
    "openSettings": "Open Settings"
  },
  "error": {
    "startFailed": "Failed to start walk",
    "finishFailed": "Failed to save walk. Please try again.",
    "retry": "Retry"
  }
}
```

- [ ] **Step 2: Add Japanese translations**

Add `"walk"` section to `ja.json`:

```json
"walk": {
  "ready": {
    "title": "散歩に行こう！",
    "subtitle": "一緒に行く犬を選んでください",
    "start": "散歩を始める",
    "noDogs": "先に犬を登録してください"
  },
  "recording": {
    "time": "時間",
    "distance": "距離",
    "stop": "停止",
    "recording": "記録中"
  },
  "finished": {
    "title": "散歩完了！",
    "details": "詳細を見る",
    "walkAgain": "もう一度散歩",
    "saving": "散歩データを保存中..."
  },
  "history": {
    "title": "最近の散歩",
    "empty": "まだ散歩がありません。最初の散歩を始めましょう！",
    "minutes": "{{count}}分",
    "km": "{{value}} km"
  },
  "detail": {
    "title": "散歩詳細",
    "route": "ルート",
    "dogs": "犬"
  },
  "permission": {
    "title": "位置情報の許可が必要です",
    "message": "散歩のルートを記録するために、位置情報へのアクセスが必要です。",
    "openSettings": "設定を開く"
  },
  "error": {
    "startFailed": "散歩の開始に失敗しました",
    "finishFailed": "散歩の保存に失敗しました。もう一度お試しください。",
    "retry": "再試行"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/lib/i18n/locales/en.json apps/mobile/lib/i18n/locales/ja.json
git commit -m "feat(mobile): add walk recording i18n translations"
```

---

## Task 6: DogSelector Component

**Files:**
- Create: `components/walk/DogSelector.tsx`
- Create: `components/walk/DogSelector.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// components/walk/DogSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DogSelector } from './DogSelector';

// Mock dependencies
jest.mock('@/hooks/use-me', () => ({
  useMe: () => ({
    data: {
      dogs: [
        { id: 'dog-1', name: 'ポチ', breed: '柴犬', photoUrl: null },
        { id: 'dog-2', name: 'ハナ', breed: 'トイプードル', photoUrl: null },
      ],
    },
  }),
}));

jest.mock('@/stores/walk-store', () => ({
  useWalkStore: jest.fn((selector) =>
    selector({
      selectedDogIds: ['dog-1'],
      selectDog: jest.fn(),
    }),
  ),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('DogSelector', () => {
  it('renders dog list', () => {
    render(<DogSelector onStart={jest.fn()} isStarting={false} />);
    expect(screen.getByText('ポチ')).toBeTruthy();
    expect(screen.getByText('ハナ')).toBeTruthy();
  });

  it('shows start button', () => {
    render(<DogSelector onStart={jest.fn()} isStarting={false} />);
    expect(screen.getByAccessibilityLabel('walk.ready.start')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/mobile && npx jest components/walk/DogSelector.test.tsx --no-cache`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// components/walk/DogSelector.tsx
import { FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { useMe } from '@/hooks/use-me';
import { useWalkStore } from '@/stores/walk-store';
import type { Dog } from '@/types/graphql';

interface DogSelectorProps {
  onStart: () => void;
  isStarting: boolean;
}

export function DogSelector({ onStart, isStarting }: DogSelectorProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: me } = useMe();
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const selectDog = useWalkStore((s) => s.selectDog);
  const dogs = me?.dogs ?? [];

  const renderDog = ({ item }: { item: Dog }) => {
    const isSelected = selectedDogIds.includes(item.id);
    return (
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={item.name}
        accessibilityState={{ checked: isSelected }}
        onPress={() => selectDog(item.id)}
        style={[
          styles.dogItem,
          {
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          },
        ]}
      >
        <Image
          source={item.photoUrl ?? require('@/assets/images/icon.png')}
          style={styles.dogPhoto}
          contentFit="cover"
        />
        <View style={styles.dogInfo}>
          <Text style={[styles.dogName, { color: colors.text }]}>{item.name}</Text>
          {item.breed ? (
            <Text style={[styles.dogBreed, { color: colors.textSecondary }]}>{item.breed}</Text>
          ) : null}
        </View>
        {isSelected ? (
          <Text style={{ color: colors.primary, fontSize: 20 }}>✓</Text>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('walk.ready.title')}</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {t('walk.ready.subtitle')}
      </Text>

      {dogs.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('walk.ready.noDogs')}
        </Text>
      ) : (
        <FlatList
          data={dogs}
          keyExtractor={(item) => item.id}
          renderItem={renderDog}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.ready.start')}
        onPress={onStart}
        disabled={selectedDogIds.length === 0 || isStarting}
        style={[
          styles.startButton,
          {
            backgroundColor: selectedDogIds.length > 0 ? colors.primary : colors.border,
            opacity: isStarting ? 0.7 : 1,
          },
        ]}
      >
        {isStarting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startButtonText}>{t('walk.ready.start')}</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { ...typography.h2, textAlign: 'center', marginTop: spacing.xl },
  subtitle: { ...typography.body, textAlign: 'center', marginTop: spacing.sm },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  list: { paddingTop: spacing.lg },
  dogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  dogPhoto: { width: 48, height: 48, borderRadius: radius.full },
  dogInfo: { marginLeft: spacing.md, flex: 1 },
  dogName: { ...typography.bodyMedium },
  dogBreed: { ...typography.caption, marginTop: spacing.xs },
  startButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  startButtonText: { ...typography.button, color: '#fff' },
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/mobile && npx jest components/walk/DogSelector.test.tsx --no-cache`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/walk/DogSelector.tsx apps/mobile/components/walk/DogSelector.test.tsx
git commit -m "feat(mobile): add DogSelector component for walk start"
```

---

## Task 7: WalkControls Component

**Files:**
- Create: `components/walk/WalkControls.tsx`

- [ ] **Step 1: Write implementation**

```typescript
// components/walk/WalkControls.tsx
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatTime, formatDistance } from '@/lib/walk/format';

interface WalkControlsProps {
  onStop: () => void;
  isStopping: boolean;
}

export function WalkControls({ onStop, isStopping }: WalkControlsProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatTime(elapsedSec)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('walk.recording.time')}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatDistance(totalDistanceM)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('walk.recording.distance')}
          </Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('walk.recording.stop')}
        onPress={onStop}
        disabled={isStopping}
        style={[styles.stopButton, { opacity: isStopping ? 0.7 : 1 }]}
      >
        <View style={styles.stopIcon} />
        <Text style={styles.stopText}>{t('walk.recording.stop')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg },
  stats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '700' },
  statLabel: { ...typography.caption, marginTop: spacing.xs },
  stopButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  stopText: { color: '#fff', ...typography.caption, marginTop: spacing.xs },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/walk/WalkControls.tsx
git commit -m "feat(mobile): add WalkControls component with timer and stop button"
```

---

## Task 8: WalkMap Component

**Files:**
- Create: `components/walk/WalkMap.tsx`

- [ ] **Step 1: Write implementation**

```typescript
// components/walk/WalkMap.tsx
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';

interface WalkMapProps {
  followUser?: boolean;
}

export function WalkMap({ followUser = true }: WalkMapProps) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const points = useWalkStore((s) => s.points);

  const coordinates = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const lastPoint = coordinates[coordinates.length - 1];

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={followUser}
        followsUserLocation={followUser}
        initialRegion={
          lastPoint
            ? {
                latitude: lastPoint.latitude,
                longitude: lastPoint.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }
            : {
                latitude: 35.6812,
                longitude: 139.7671,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
        }
      >
        {coordinates.length >= 2 ? (
          <Polyline
            coordinates={coordinates}
            strokeColor={colors.primary}
            strokeWidth={4}
          />
        ) : null}
        {lastPoint ? (
          <Marker coordinate={lastPoint} />
        ) : null}
      </MapView>
      <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.9)' }]}>
        <Text style={styles.badgeText}>{t('walk.recording.recording')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  map: { flex: 1, borderRadius: radius.md },
  badge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/walk/WalkMap.tsx
git commit -m "feat(mobile): add WalkMap component with route Polyline"
```

---

## Task 9: WalkSummaryCard Component

**Files:**
- Create: `components/walk/WalkSummaryCard.tsx`

- [ ] **Step 1: Write implementation**

```typescript
// components/walk/WalkSummaryCard.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalkStore } from '@/stores/walk-store';
import { formatTime, formatDistance } from '@/lib/walk/format';

export function WalkSummaryCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const walkId = useWalkStore((s) => s.walkId);
  const startedAt = useWalkStore((s) => s.startedAt);
  const totalDistanceM = useWalkStore((s) => s.totalDistanceM);
  const reset = useWalkStore((s) => s.reset);

  const elapsedSec = startedAt
    ? Math.floor((Date.now() - startedAt.getTime()) / 1000)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('walk.finished.title')}</Text>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatTime(elapsedSec)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('walk.recording.time')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {formatDistance(totalDistanceM)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('walk.recording.distance')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.buttons}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('walk.finished.details')}
          onPress={() => {
            if (walkId) router.push(`/walks/${walkId}`);
          }}
          style={[styles.button, { backgroundColor: colors.surface }]}
        >
          <Text style={[styles.buttonText, { color: colors.text }]}>
            {t('walk.finished.details')}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('walk.finished.walkAgain')}
          onPress={reset}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: '#fff' }]}>
            {t('walk.finished.walkAgain')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { ...typography.h2, textAlign: 'center', marginBottom: spacing.lg },
  card: { borderRadius: radius.md, padding: spacing.lg },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { ...typography.caption, marginTop: spacing.xs },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonText: { ...typography.button },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/walk/WalkSummaryCard.tsx
git commit -m "feat(mobile): add WalkSummaryCard component"
```

---

## Task 10: Walk Screen — 3-Phase UI

**Files:**
- Modify: `app/(tabs)/walk.tsx`

- [ ] **Step 1: Implement the walk screen**

Replace the placeholder in `app/(tabs)/walk.tsx`:

```typescript
// app/(tabs)/walk.tsx
import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { useWalkStore } from '@/stores/walk-store';
import { useStartWalk, useFinishWalk, useAddWalkPoints } from '@/hooks/use-walk-mutations';
import { requestPermission, startTracking } from '@/lib/walk/gps-tracker';
import { DogSelector } from '@/components/walk/DogSelector';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkControls } from '@/components/walk/WalkControls';
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';
import type { WalkPoint } from '@/types/graphql';

const MAX_POINTS_PER_BATCH = 200;

export default function WalkScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const phase = useWalkStore((s) => s.phase);
  const walkId = useWalkStore((s) => s.walkId);
  const selectedDogIds = useWalkStore((s) => s.selectedDogIds);
  const points = useWalkStore((s) => s.points);
  const addPoint = useWalkStore((s) => s.addPoint);
  const startRecording = useWalkStore((s) => s.startRecording);
  const finish = useWalkStore((s) => s.finish);

  const startWalk = useStartWalk();
  const finishWalk = useFinishWalk();
  const addWalkPoints = useAddWalkPoints();
  const stopTrackingRef = useRef<(() => void) | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  const handleStart = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      Alert.alert(t('walk.permission.title'), t('walk.permission.message'));
      return;
    }

    try {
      const walk = await startWalk.mutateAsync(selectedDogIds);
      startRecording(walk.id);
      const stop = await startTracking((point: WalkPoint) => {
        addPoint(point);
      });
      stopTrackingRef.current = stop;
    } catch {
      Alert.alert(t('common.error'), t('walk.error.startFailed'));
    }
  }, [selectedDogIds, startWalk, startRecording, addPoint, t]);

  const handleStop = useCallback(async () => {
    if (!walkId) return;
    setIsStopping(true);

    // Stop GPS tracking
    stopTrackingRef.current?.();
    stopTrackingRef.current = null;

    try {
      // Send all points in batches
      const currentPoints = useWalkStore.getState().points;
      for (let i = 0; i < currentPoints.length; i += MAX_POINTS_PER_BATCH) {
        const batch = currentPoints.slice(i, i + MAX_POINTS_PER_BATCH).map((p) => ({
          lat: p.lat,
          lng: p.lng,
          recordedAt: p.recordedAt,
        }));
        await addWalkPoints.mutateAsync({ walkId, points: batch });
      }

      // Finish walk
      await finishWalk.mutateAsync(walkId);
      finish();
    } catch {
      Alert.alert(t('common.error'), t('walk.error.finishFailed'));
    } finally {
      setIsStopping(false);
    }
  }, [walkId, addWalkPoints, finishWalk, finish, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {phase === 'ready' && (
        <DogSelector onStart={handleStart} isStarting={startWalk.isPending} />
      )}
      {phase === 'recording' && (
        <>
          <WalkMap />
          <WalkControls onStop={handleStop} isStopping={isStopping} />
        </>
      )}
      {phase === 'finished' && <WalkSummaryCard />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/\(tabs\)/walk.tsx
git commit -m "feat(mobile): implement walk screen with 3-phase UI"
```

---

## Task 11: WalkHistoryItem + Home Screen

**Files:**
- Create: `components/walk/WalkHistoryItem.tsx`
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Create WalkHistoryItem**

```typescript
// components/walk/WalkHistoryItem.tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Walk } from '@/types/graphql';

interface WalkHistoryItemProps {
  walk: Walk;
}

export function WalkHistoryItem({ walk }: WalkHistoryItemProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const date = new Date(walk.startedAt);
  const dateStr = date.toLocaleDateString();
  const durationMin = walk.durationSec ? Math.round(walk.durationSec / 60) : 0;
  const distanceKm = walk.distanceM ? (walk.distanceM / 1000).toFixed(1) : '0';
  const dogNames = walk.dogs.map((d) => d.name).join(', ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${dateStr} ${dogNames}`}
      onPress={() => router.push(`/walks/${walk.id}`)}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.text }]}>{dateStr}</Text>
        <Text style={[styles.dogs, { color: colors.textSecondary }]}>{dogNames}</Text>
      </View>
      <View style={styles.stats}>
        <Text style={[styles.stat, { color: colors.text }]}>
          {t('walk.history.minutes', { count: durationMin })}
        </Text>
        <Text style={[styles.stat, { color: colors.text }]}>
          {t('walk.history.km', { value: distanceKm })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { ...typography.bodyMedium },
  dogs: { ...typography.caption },
  stats: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
  stat: { ...typography.body },
});
```

- [ ] **Step 2: Update Home Screen**

Replace the placeholder in `app/(tabs)/index.tsx`:

```typescript
// app/(tabs)/index.tsx
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { useMyWalks } from '@/hooks/use-walks';
import { WalkHistoryItem } from '@/components/walk/WalkHistoryItem';
import type { Walk } from '@/types/graphql';

export default function HomeScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: walks, isLoading } = useMyWalks();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{t('walk.history.title')}</Text>
      {!isLoading && (!walks || walks.length === 0) ? (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          {t('walk.history.empty')}
        </Text>
      ) : (
        <FlatList
          data={walks}
          keyExtractor={(item: Walk) => item.id}
          renderItem={({ item }) => <WalkHistoryItem walk={item} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.md },
  empty: { ...typography.body, textAlign: 'center', marginTop: spacing.xl },
  list: { paddingBottom: spacing.xl },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/walk/WalkHistoryItem.tsx apps/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): add walk history to home screen"
```

---

## Task 12: Walk Detail Screen

**Files:**
- Modify: `app/walks/[id].tsx`

- [ ] **Step 1: Implement walk detail screen**

Replace the placeholder in `app/walks/[id].tsx`:

```typescript
// app/walks/[id].tsx
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import MapView, { Polyline } from 'react-native-maps';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import { useWalk } from '@/hooks/use-walks';

export default function WalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: walk, isLoading } = useWalk(id ?? '');

  if (isLoading || !walk) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator />
      </View>
    );
  }

  const coordinates = walk.points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const durationMin = walk.durationSec ? Math.round(walk.durationSec / 60) : 0;
  const distanceKm = walk.distanceM ? (walk.distanceM / 1000).toFixed(2) : '0';
  const date = new Date(walk.startedAt).toLocaleDateString();
  const dogNames = walk.dogs.map((d) => d.name).join(', ');

  const midpoint = coordinates.length > 0
    ? coordinates[Math.floor(coordinates.length / 2)]
    : { latitude: 35.6812, longitude: 139.7671 };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: midpoint.latitude,
          longitude: midpoint.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {coordinates.length >= 2 ? (
          <Polyline coordinates={coordinates} strokeColor={colors.primary} strokeWidth={4} />
        ) : null}
      </MapView>

      <View style={styles.info}>
        <Text style={[styles.date, { color: colors.text }]}>{date}</Text>
        <Text style={[styles.dogs, { color: colors.textSecondary }]}>{dogNames}</Text>

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {t('walk.history.minutes', { count: durationMin })}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('walk.recording.time')}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>
              {t('walk.history.km', { value: distanceKm })}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('walk.recording.distance')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  map: { height: 300 },
  info: { padding: spacing.lg },
  date: { ...typography.h3 },
  dogs: { ...typography.body, marginTop: spacing.xs },
  stats: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.lg },
  stat: { alignItems: 'center' },
  statValue: { ...typography.h3 },
  statLabel: { ...typography.caption, marginTop: spacing.xs },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/walks/\[id\].tsx
git commit -m "feat(mobile): implement walk detail screen with route map"
```

---

## Task 13: Integration Verification

- [ ] **Step 1: Type check**

Run: `cd apps/mobile && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 2: Run unit tests**

Run: `cd apps/mobile && npx jest --passWithNoTests`
Expected: All tests pass

- [ ] **Step 3: Build for iOS Simulator**

Run: `cd apps/mobile && npx expo run:ios`
Expected: App builds and launches in Simulator

- [ ] **Step 4: Manual test — full walk flow**

1. Open the Walk tab
2. Select a dog → tap "散歩を始める"
3. Verify map appears with GPS tracking
4. Walk for 30 seconds (Simulator: Features → Location → City Run)
5. Tap stop → verify summary appears
6. Tap "詳細を見る" → verify detail screen with route map
7. Go to Home tab → verify walk appears in history list

- [ ] **Step 5: Final commit**

If any fixes were needed during verification, commit them.

---

## Verification Checklist

- [ ] `npx tsc --noEmit` passes
- [ ] Unit tests pass: `npx jest`
- [ ] App builds: `npx expo run:ios`
- [ ] Walk flow works end-to-end (start → record → stop → view detail)
- [ ] Home screen shows walk history
- [ ] Dark mode works correctly
- [ ] i18n: EN and JA translations display correctly
