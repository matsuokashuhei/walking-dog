# Mobile Walk Recording Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement walk recording — select dogs, start walk, track GPS in real-time on a map, buffer points in SQLite for reliability, sync to API, finish walk, and view walk route in detail screen.

**Architecture:** `expo-location` watches position → `gps-tracker.ts` emits points → `walk-store.ts` (Zustand) holds active walk state + `point-buffer.ts` (SQLite) writes every point locally → `sync-service.ts` flushes unsynced points to API every 30s or 10 points. On finish, walk transitions to detail screen. `react-native-maps` requires a development build (not Expo Go).

**Tech Stack:** expo-location, expo-sqlite, react-native-maps, Zustand, TanStack Query, zustand@5

**Prerequisite:** Increments 0–2 must be complete.

> **⚠️ WIP Status (2026-03-23):** Draft PR #23 (`feat/walk-recording`) として実装中。API 修正 + モバイルコード完成済み。E2E テストが `expo-sqlite` / `react-native-maps` の Web バンドル互換性問題でブロック中。worktree: `.worktrees/feat-walk-recording`

**⚠️ Important:** `react-native-maps` does NOT work in Expo Go. Requires a development build:
```bash
docker compose -f apps/compose.yml run --rm mobile npx eas build --profile development --platform ios
```

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/mobile/lib/walk/gps-tracker.ts` | expo-location position watcher, permission handling |
| Create | `apps/mobile/lib/walk/point-buffer.ts` | SQLite offline buffer for walk points |
| Create | `apps/mobile/lib/walk/sync-service.ts` | Periodic flush of buffered points to API |
| Create | `apps/mobile/stores/walk-store.ts` | Zustand store for active walk state |
| Create | `apps/mobile/components/walk/DogSelector.tsx` | Multi-select dog list for walk start |
| Create | `apps/mobile/components/walk/WalkControls.tsx` | Start/finish button, elapsed time, distance |
| Create | `apps/mobile/components/walk/WalkMap.tsx` | MapView with current position + polyline |
| Create | `apps/mobile/components/walk/WalkDetailMap.tsx` | Static completed walk route map |
| Create | `apps/mobile/components/walk/WalkSummaryCard.tsx` | Walk card (dogs, distance, duration, date) |
| Modify | `apps/mobile/app/(tabs)/walk.tsx` | Walk tab: 3-state UI (select→recording→done) |
| Modify | `apps/mobile/app/walks/[id].tsx` | Walk detail screen with route map |

---

## Task 1: GPS Tracker

**Files:**
- Create: `apps/mobile/lib/walk/gps-tracker.ts`
- Test: `apps/mobile/lib/walk/gps-tracker.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/lib/walk/gps-tracker.test.ts`:
```typescript
import * as Location from 'expo-location';
import { startTracking, stopTracking } from './gps-tracker';

jest.mock('expo-location');
const mockLocation = Location as jest.Mocked<typeof Location>;

describe('gps-tracker', () => {
  beforeEach(() => jest.clearAllMocks());

  it('requests foreground permission before tracking', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.watchPositionAsync.mockResolvedValue({ remove: jest.fn() } as any);

    const onPoint = jest.fn();
    await startTracking(onPoint);

    expect(mockLocation.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(mockLocation.watchPositionAsync).toHaveBeenCalled();
  });

  it('throws when permission denied', async () => {
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'denied',
      granted: false,
      canAskAgain: false,
      expires: 'never',
    });

    await expect(startTracking(jest.fn())).rejects.toThrow('位置情報の許可が必要です');
  });

  it('stopTracking calls remove on subscription', async () => {
    const mockRemove = jest.fn();
    mockLocation.requestForegroundPermissionsAsync.mockResolvedValue({
      status: 'granted',
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    mockLocation.watchPositionAsync.mockResolvedValue({ remove: mockRemove } as any);

    await startTracking(jest.fn());
    stopTracking();

    expect(mockRemove).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/walk/gps-tracker"
```

- [ ] **Step 3: Implement GPS tracker**

Create `apps/mobile/lib/walk/gps-tracker.ts`:
```typescript
import * as Location from 'expo-location';

export interface GpsPoint {
  lat: number;
  lng: number;
  recordedAt: string;
}

type PointCallback = (point: GpsPoint) => void;

let subscription: Location.LocationSubscription | null = null;

export async function startTracking(onPoint: PointCallback): Promise<void> {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) {
    throw new Error('位置情報の許可が必要です');
  }

  subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 5000,   // every 5 seconds
      distanceInterval: 5,  // or every 5 meters
    },
    (location) => {
      onPoint({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        recordedAt: new Date(location.timestamp).toISOString(),
      });
    }
  );
}

export function stopTracking(): void {
  subscription?.remove();
  subscription = null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/walk/gps-tracker"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/walk/gps-tracker.ts apps/mobile/lib/walk/gps-tracker.test.ts
git commit -m "feat(mobile): add GPS tracker using expo-location"
```

---

## Task 2: Point Buffer (SQLite)

**Files:**
- Create: `apps/mobile/lib/walk/point-buffer.ts`
- Test: `apps/mobile/lib/walk/point-buffer.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/lib/walk/point-buffer.test.ts`:
```typescript
import * as SQLite from 'expo-sqlite';
import { initBuffer, bufferPoint, getUnsynced, markSynced } from './point-buffer';

jest.mock('expo-sqlite');
const mockSQLite = SQLite as jest.Mocked<typeof SQLite>;

const mockDb = {
  execAsync: jest.fn().mockResolvedValue(undefined),
  getAllAsync: jest.fn().mockResolvedValue([]),
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
};

mockSQLite.openDatabaseAsync.mockResolvedValue(mockDb as any);

describe('point-buffer', () => {
  beforeEach(() => jest.clearAllMocks());

  it('initBuffer creates the walk_points table', async () => {
    await initBuffer();
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS walk_points')
    );
  });

  it('bufferPoint inserts a row', async () => {
    await initBuffer();
    await bufferPoint('walk-1', { lat: 35.6, lng: 139.7, recordedAt: '2026-01-01T00:00:00Z' });
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO walk_points'),
      expect.arrayContaining(['walk-1', 35.6, 139.7, '2026-01-01T00:00:00Z'])
    );
  });

  it('getUnsynced returns rows with synced=0', async () => {
    mockDb.getAllAsync.mockResolvedValue([
      { id: 1, walk_id: 'walk-1', lat: 35.6, lng: 139.7, recorded_at: '2026-01-01T00:00:00Z', synced: 0 },
    ]);
    await initBuffer();
    const rows = await getUnsynced('walk-1');
    expect(rows).toHaveLength(1);
    expect(rows[0].lat).toBe(35.6);
  });

  it('markSynced updates synced=1 for given ids', async () => {
    await initBuffer();
    await markSynced([1, 2, 3]);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE walk_points'),
      expect.arrayContaining([1, 2, 3])
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/walk/point-buffer"
```

- [ ] **Step 3: Implement point buffer**

Create `apps/mobile/lib/walk/point-buffer.ts`:
```typescript
import * as SQLite from 'expo-sqlite';
import type { GpsPoint } from './gps-tracker';

interface BufferedPoint {
  id: number;
  walkId: string;
  lat: number;
  lng: number;
  recordedAt: string;
}

let db: SQLite.SQLiteDatabase | null = null;

export async function initBuffer(): Promise<void> {
  db = await SQLite.openDatabaseAsync('walk_points.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS walk_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      walk_id TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      recorded_at TEXT NOT NULL,
      synced INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_walk_points_walk_id ON walk_points(walk_id, synced);
  `);
}

function ensureDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Point buffer not initialized. Call initBuffer() first.');
  return db;
}

export async function bufferPoint(walkId: string, point: GpsPoint): Promise<void> {
  await ensureDb().runAsync(
    'INSERT INTO walk_points (walk_id, lat, lng, recorded_at) VALUES (?, ?, ?, ?)',
    [walkId, point.lat, point.lng, point.recordedAt]
  );
}

export async function getUnsynced(walkId: string): Promise<BufferedPoint[]> {
  const rows = await ensureDb().getAllAsync<{
    id: number;
    walk_id: string;
    lat: number;
    lng: number;
    recorded_at: string;
  }>(
    'SELECT id, walk_id, lat, lng, recorded_at FROM walk_points WHERE walk_id = ? AND synced = 0 LIMIT 200',
    [walkId]
  );
  return rows.map((r) => ({
    id: r.id,
    walkId: r.walk_id,
    lat: r.lat,
    lng: r.lng,
    recordedAt: r.recorded_at,
  }));
}

export async function markSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await ensureDb().runAsync(
    `UPDATE walk_points SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/walk/point-buffer"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/walk/point-buffer.ts apps/mobile/lib/walk/point-buffer.test.ts
git commit -m "feat(mobile): add SQLite point buffer for offline GPS recording"
```

---

## Task 3: Sync Service

**Files:**
- Create: `apps/mobile/lib/walk/sync-service.ts`
- Test: `apps/mobile/lib/walk/sync-service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/lib/walk/sync-service.test.ts`:
```typescript
import { SyncService } from './sync-service';
import * as buffer from './point-buffer';
import { graphqlClient } from '@/lib/graphql/client';

jest.mock('./point-buffer');
jest.mock('@/lib/graphql/client', () => ({
  graphqlClient: { request: jest.fn() },
}));

const mockBuffer = buffer as jest.Mocked<typeof buffer>;
const mockRequest = graphqlClient.request as jest.Mock;

describe('SyncService', () => {
  let service: SyncService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    service = new SyncService('walk-1');
  });

  afterEach(() => {
    service.stop();
    jest.useRealTimers();
  });

  it('flushes unsynced points on demand', async () => {
    mockBuffer.getUnsynced.mockResolvedValue([
      { id: 1, walkId: 'walk-1', lat: 35.6, lng: 139.7, recordedAt: '2026-01-01T00:00:00Z' },
    ]);
    mockRequest.mockResolvedValue({ addWalkPoints: true });

    await service.flush();

    expect(mockRequest).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        walkId: 'walk-1',
        points: [expect.objectContaining({ lat: 35.6 })],
      })
    );
    expect(mockBuffer.markSynced).toHaveBeenCalledWith([1]);
  });

  it('does nothing when no unsynced points', async () => {
    mockBuffer.getUnsynced.mockResolvedValue([]);
    await service.flush();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/walk/sync-service"
```

- [ ] **Step 3: Implement sync service**

Create `apps/mobile/lib/walk/sync-service.ts`:
```typescript
import { graphqlClient } from '@/lib/graphql/client';
import { ADD_WALK_POINTS_MUTATION } from '@/lib/graphql/mutations';
import { getUnsynced, markSynced } from './point-buffer';

const SYNC_INTERVAL_MS = 30_000; // 30 seconds
const SYNC_THRESHOLD = 10;       // or every 10 points

export class SyncService {
  private walkId: string;
  private timer: ReturnType<typeof setInterval> | null = null;
  private pendingPointCount = 0;

  constructor(walkId: string) {
    this.walkId = walkId;
  }

  start(): void {
    this.timer = setInterval(() => this.flush(), SYNC_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  notifyNewPoint(): void {
    this.pendingPointCount += 1;
    if (this.pendingPointCount >= SYNC_THRESHOLD) {
      this.pendingPointCount = 0;
      this.flush().catch(console.error);
    }
  }

  async flush(): Promise<void> {
    const points = await getUnsynced(this.walkId);
    if (points.length === 0) return;

    try {
      await graphqlClient.request(ADD_WALK_POINTS_MUTATION, {
        walkId: this.walkId,
        points: points.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          recordedAt: p.recordedAt,
        })),
      });
      await markSynced(points.map((p) => p.id));
    } catch (err) {
      // Network error: will retry on next interval
      console.error('[SyncService] flush failed, will retry:', err);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="lib/walk/sync-service"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/walk/sync-service.ts apps/mobile/lib/walk/sync-service.test.ts
git commit -m "feat(mobile): add sync service for buffered GPS point upload"
```

---

## Task 4: Walk Store (Zustand)

**Files:**
- Create: `apps/mobile/stores/walk-store.ts`
- Test: `apps/mobile/stores/walk-store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/stores/walk-store.test.ts`:
```typescript
import { act, renderHook } from '@testing-library/react-native';
import { useWalkStore } from './walk-store';

jest.mock('@/lib/walk/gps-tracker', () => ({
  startTracking: jest.fn().mockResolvedValue(undefined),
  stopTracking: jest.fn(),
}));
jest.mock('@/lib/walk/point-buffer', () => ({
  initBuffer: jest.fn().mockResolvedValue(undefined),
  bufferPoint: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/walk/sync-service', () => ({
  SyncService: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    flush: jest.fn().mockResolvedValue(undefined),
    notifyNewPoint: jest.fn(),
  })),
}));

describe('walk-store', () => {
  beforeEach(() => {
    useWalkStore.setState({
      activeWalkId: null,
      selectedDogIds: [],
      isRecording: false,
      elapsedSeconds: 0,
      distanceM: 0,
      points: [],
    });
  });

  it('startWalk sets activeWalkId and isRecording', async () => {
    const { result } = renderHook(() => useWalkStore());
    await act(async () => {
      result.current.startWalk('walk-1', ['dog-1', 'dog-2']);
    });
    expect(result.current.activeWalkId).toBe('walk-1');
    expect(result.current.isRecording).toBe(true);
    expect(result.current.selectedDogIds).toEqual(['dog-1', 'dog-2']);
  });

  it('stopWalk clears active walk state', async () => {
    const { result } = renderHook(() => useWalkStore());
    await act(async () => {
      result.current.startWalk('walk-1', ['dog-1']);
    });
    await act(async () => {
      result.current.stopWalk();
    });
    expect(result.current.activeWalkId).toBeNull();
    expect(result.current.isRecording).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="stores/walk-store"
```

- [ ] **Step 3: Implement walk store**

Create `apps/mobile/stores/walk-store.ts`:
```typescript
import { create } from 'zustand';
import { startTracking, stopTracking, type GpsPoint } from '@/lib/walk/gps-tracker';
import { initBuffer, bufferPoint } from '@/lib/walk/point-buffer';
import { SyncService } from '@/lib/walk/sync-service';

interface WalkState {
  activeWalkId: string | null;
  selectedDogIds: string[];
  isRecording: boolean;
  elapsedSeconds: number;
  distanceM: number;
  points: GpsPoint[];
  startWalk: (walkId: string, dogIds: string[]) => void;
  stopWalk: () => void;
}

let syncService: SyncService | null = null;
let elapsedTimer: ReturnType<typeof setInterval> | null = null;

export const useWalkStore = create<WalkState>((set, get) => ({
  activeWalkId: null,
  selectedDogIds: [],
  isRecording: false,
  elapsedSeconds: 0,
  distanceM: 0,
  points: [],

  startWalk: (walkId, dogIds) => {
    set({
      activeWalkId: walkId,
      selectedDogIds: dogIds,
      isRecording: true,
      elapsedSeconds: 0,
      distanceM: 0,
      points: [],
    });

    // Initialize SQLite buffer
    initBuffer().catch(console.error);

    // Start elapsed timer
    elapsedTimer = setInterval(() => {
      set((s) => ({ elapsedSeconds: s.elapsedSeconds + 1 }));
    }, 1000);

    // Start GPS tracking
    syncService = new SyncService(walkId);
    syncService.start();

    startTracking(async (point: GpsPoint) => {
      set((s) => ({ points: [...s.points, point] }));
      await bufferPoint(walkId, point);
      syncService?.notifyNewPoint();
    }).catch(console.error);
  },

  stopWalk: () => {
    stopTracking();
    syncService?.stop();
    syncService?.flush().catch(console.error);
    syncService = null;

    if (elapsedTimer) {
      clearInterval(elapsedTimer);
      elapsedTimer = null;
    }

    set({
      activeWalkId: null,
      selectedDogIds: [],
      isRecording: false,
      elapsedSeconds: 0,
      distanceM: 0,
      points: [],
    });
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="stores/walk-store"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/stores/walk-store.ts apps/mobile/stores/walk-store.test.ts
git commit -m "feat(mobile): add walk Zustand store with GPS tracking and point buffering"
```

---

## Task 5: Walk UI Components

**Files:**
- Create: `apps/mobile/components/walk/DogSelector.tsx`
- Create: `apps/mobile/components/walk/WalkControls.tsx`
- Create: `apps/mobile/components/walk/WalkSummaryCard.tsx`

- [ ] **Step 1: Create DogSelector**

Create `apps/mobile/components/walk/DogSelector.tsx`:
```typescript
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Dog } from '@/types/graphql';

interface DogSelectorProps {
  dogs: Dog[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}

export function DogSelector({ dogs, selectedIds, onToggle }: DogSelectorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <FlatList
      data={dogs}
      keyExtractor={(d) => d.id}
      renderItem={({ item }) => {
        const selected = selectedIds.includes(item.id);
        return (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={item.name}
            accessibilityState={{ checked: selected }}
            onPress={() => onToggle(item.id)}
            style={[
              styles.item,
              {
                backgroundColor: selected ? colors.primaryLight : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
              },
            ]}
          >
            <Image
              source={item.photoUrl ?? require('@/assets/images/icon.png')}
              style={styles.photo}
              contentFit="cover"
            />
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            {selected ? (
              <Text style={[styles.check, { color: colors.primary }]}>✓</Text>
            ) : null}
          </Pressable>
        );
      }}
      style={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { marginBottom: spacing.md },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  photo: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
  },
  name: {
    ...typography.bodyMedium,
    marginLeft: spacing.md,
    flex: 1,
  },
  check: {
    ...typography.h3,
  },
});
```

- [ ] **Step 2: Create WalkControls**

Create `apps/mobile/components/walk/WalkControls.tsx`:
```typescript
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';

interface WalkControlsProps {
  elapsedSeconds: number;
  distanceM: number;
  onFinish: () => void;
  loading?: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WalkControls({ elapsedSeconds, distanceM, onFinish, loading = false }: WalkControlsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const distanceText = distanceM >= 1000
    ? `${(distanceM / 1000).toFixed(2)} km`
    : `${distanceM} m`;

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatDuration(elapsedSeconds)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>経過時間</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.text }]}>{distanceText}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>距離</Text>
        </View>
      </View>
      <Button
        label="散歩を終了"
        variant="destructive"
        onPress={onFinish}
        loading={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
  },
  stat: { alignItems: 'center' },
  statValue: { ...typography.h2 },
  statLabel: { ...typography.caption, marginTop: spacing.xs },
});
```

- [ ] **Step 3: Create WalkSummaryCard**

Create `apps/mobile/components/walk/WalkSummaryCard.tsx`:
```typescript
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { Walk } from '@/types/graphql';

interface WalkSummaryCardProps {
  walk: Walk;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}時間${m % 60}分`;
  return `${m}分`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function WalkSummaryCard({ walk }: WalkSummaryCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View style={styles.dogPhotos}>
        {walk.dogs.slice(0, 3).map((dog) => (
          <Image
            key={dog.id}
            source={dog.photoUrl ?? require('@/assets/images/icon.png')}
            style={styles.dogPhoto}
            contentFit="cover"
          />
        ))}
      </View>
      <View style={styles.info}>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {formatDate(walk.startedAt)}
        </Text>
        <Text style={[styles.stats, { color: colors.text }]}>
          {formatDistance(walk.distanceM)} · {formatDuration(walk.durationSec)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  dogPhotos: {
    flexDirection: 'row',
  },
  dogPhoto: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    marginRight: -8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    marginLeft: spacing.md + 8,
    flex: 1,
  },
  date: { ...typography.caption },
  stats: { ...typography.bodyMedium, marginTop: spacing.xs },
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/components/walk/
git commit -m "feat(mobile): add DogSelector, WalkControls, WalkSummaryCard components"
```

---

## Task 6: WalkMap + WalkDetailMap

**Files:**
- Create: `apps/mobile/components/walk/WalkMap.tsx`
- Create: `apps/mobile/components/walk/WalkDetailMap.tsx`

**Note:** These components use `react-native-maps` which requires a development build.

- [ ] **Step 1: Create WalkMap (live tracking)**

Create `apps/mobile/components/walk/WalkMap.tsx`:
```typescript
import { StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import type { GpsPoint } from '@/lib/walk/gps-tracker';

interface WalkMapProps {
  points: GpsPoint[];
}

export function WalkMap({ points }: WalkMapProps) {
  const currentPoint = points[points.length - 1];

  const region = currentPoint
    ? {
        latitude: currentPoint.lat,
        longitude: currentPoint.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }
    : {
        latitude: 35.6812362,  // Tokyo default
        longitude: 139.7671248,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  const coordinates = points.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  return (
    <MapView style={styles.map} region={region} showsUserLocation>
      {coordinates.length > 1 ? (
        <Polyline
          coordinates={coordinates}
          strokeColor="#0a7ea4"
          strokeWidth={4}
        />
      ) : null}
      {currentPoint ? (
        <Marker
          coordinate={{ latitude: currentPoint.lat, longitude: currentPoint.lng }}
          title="現在地"
        />
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
```

- [ ] **Step 2: Create WalkDetailMap (completed route)**

Create `apps/mobile/components/walk/WalkDetailMap.tsx`:
```typescript
import { StyleSheet } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import type { WalkPoint } from '@/types/graphql';

interface WalkDetailMapProps {
  points: WalkPoint[];
}

export function WalkDetailMap({ points }: WalkDetailMapProps) {
  if (points.length === 0) return null;

  const coordinates = points.map((p) => ({
    latitude: p.lat,
    longitude: p.lng,
  }));

  const lats = coordinates.map((c) => c.latitude);
  const lngs = coordinates.map((c) => c.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const region = {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) * 1.4 + 0.002,
    longitudeDelta: (maxLng - minLng) * 1.4 + 0.002,
  };

  return (
    <MapView style={styles.map} region={region} scrollEnabled={false} zoomEnabled={false}>
      <Polyline coordinates={coordinates} strokeColor="#0a7ea4" strokeWidth={4} />
      <Marker coordinate={coordinates[0]} pinColor="green" title="スタート" />
      <Marker coordinate={coordinates[coordinates.length - 1]} pinColor="red" title="ゴール" />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 240 },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/components/walk/WalkMap.tsx apps/mobile/components/walk/WalkDetailMap.tsx
git commit -m "feat(mobile): add WalkMap and WalkDetailMap with react-native-maps"
```

---

## Task 7: Walk Tab Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/walk.tsx`

- [ ] **Step 1: Implement walk tab with 3-state UI**

Replace entire content of `apps/mobile/app/(tabs)/walk.tsx`:
```typescript
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMe } from '@/hooks/use-me';
import { useStartWalk, useFinishWalk } from '@/hooks/use-walk-mutations';
import { useWalkStore } from '@/stores/walk-store';
import { DogSelector } from '@/components/walk/DogSelector';
import { WalkMap } from '@/components/walk/WalkMap';
import { WalkControls } from '@/components/walk/WalkControls';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function WalkScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { data: me, isLoading } = useMe();
  const { mutateAsync: startWalkMutation } = useStartWalk();
  const { mutateAsync: finishWalkMutation } = useFinishWalk();

  const { activeWalkId, isRecording, elapsedSeconds, distanceM, points, startWalk, stopWalk } =
    useWalkStore();

  const [selectedDogIds, setSelectedDogIds] = useState<string[]>([]);
  const [startLoading, setStartLoading] = useState(false);
  const [finishLoading, setFinishLoading] = useState(false);

  if (isLoading) return <LoadingScreen />;

  function toggleDog(id: string) {
    setSelectedDogIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  }

  async function handleStart() {
    if (selectedDogIds.length === 0) return;
    setStartLoading(true);
    try {
      const walk = await startWalkMutation(selectedDogIds);
      startWalk(walk.id, selectedDogIds);
    } finally {
      setStartLoading(false);
    }
  }

  async function handleFinish() {
    if (!activeWalkId) return;
    setFinishLoading(true);
    try {
      const walk = await finishWalkMutation(activeWalkId);
      stopWalk();
      router.push(`/walks/${walk.id}`);
    } finally {
      setFinishLoading(false);
    }
  }

  // Recording state: show map + controls
  if (isRecording && activeWalkId) {
    return (
      <View style={styles.container}>
        <WalkMap points={points} />
        <WalkControls
          elapsedSeconds={elapsedSeconds}
          distanceM={distanceM}
          onFinish={handleFinish}
          loading={finishLoading}
        />
      </View>
    );
  }

  // Idle state: select dogs + start
  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { backgroundColor: colors.background }]}
    >
      <ThemedText type="title" style={styles.title}>散歩を始める</ThemedText>
      <ThemedText style={{ color: colors.textSecondary, marginBottom: spacing.md }}>
        一緒に行く犬を選んでください
      </ThemedText>

      <DogSelector
        dogs={me?.dogs ?? []}
        selectedIds={selectedDogIds}
        onToggle={toggleDog}
      />

      <Button
        label="散歩スタート"
        onPress={handleStart}
        loading={startLoading}
        disabled={selectedDogIds.length === 0}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: spacing.lg },
  title: { marginBottom: spacing.sm },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/app/(tabs)/walk.tsx
git commit -m "feat(mobile): implement walk tab screen with dog selection and GPS recording"
```

---

## Task 8: Walk Detail Screen

**Files:**
- Modify: `apps/mobile/app/walks/[id].tsx`

- [ ] **Step 1: Implement walk detail screen**

Replace entire content of `apps/mobile/app/walks/[id].tsx`:
```typescript
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useWalk } from '@/hooks/use-walks';
import { WalkDetailMap } from '@/components/walk/WalkDetailMap';
import { DogStatsCard } from '@/components/dogs/DogStatsCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, typography } from '@/theme/tokens';
import { Text } from 'react-native';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${meters} m`;
}

export default function WalkDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { data: walk, isLoading } = useWalk(id);

  if (isLoading || !walk) return <LoadingScreen />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <WalkDetailMap points={walk.points} />

      <View style={styles.statsSection}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>距離</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatDistance(walk.distanceM)}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>時間</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {formatDuration(walk.durationSec)}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>散歩した犬</Text>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {walk.dogs.map((d) => d.name).join(', ')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsSection: { padding: spacing.lg },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statLabel: { ...typography.body },
  statValue: { ...typography.bodyMedium },
});
```

- [ ] **Step 2: End-to-end walk test**

Requires a development build (not Expo Go). Build with:
```bash
docker compose -f apps/compose.yml run --rm mobile npx eas build --profile development --platform ios --local
```

Test flow:
1. Log in → navigate to Walk tab
2. Select one or more dogs → press "散歩スタート"
3. Walk tab switches to map view with polyline updating
4. Walk for 1+ minute (or simulate location in iOS Simulator: Features > Location > City Run)
5. Press "散歩を終了" → redirected to walk detail screen
6. Map shows completed route with start/end markers

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/walks/[id].tsx
git commit -m "feat(mobile): implement walk detail screen with route map"
```

---

## Verification Checklist

- [ ] Walk tab shows dog selector when not recording
- [ ] Cannot start walk with no dogs selected (button disabled)
- [ ] Walk starts → map shows live position
- [ ] GPS points appear in DynamoDB (check via AWS CLI against localstack)
- [ ] Walk finishes → detail screen shows route
- [ ] Offline test: disconnect network, record walk, reconnect — points sync to API
- [ ] All tests pass: `docker compose -f apps/compose.yml run --rm mobile npm test`
