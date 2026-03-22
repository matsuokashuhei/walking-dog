# Mobile Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Home tab — show today's walk summary and a list of recent walks.

**Architecture:** `useMe()` provides the user's display name. `useMyWalks()` provides recent walks. `useTodayStats()` derives today's totals from the walks list using `useMemo`. Pull-to-refresh refetches walks via TanStack Query. Tapping a walk card navigates to the walk detail screen.

**Tech Stack:** TanStack Query, Expo Router, React Native FlatList

**Prerequisite:** Increments 0, 1, 2, and 3 must be complete — walk data must exist to verify.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `apps/mobile/hooks/use-today-stats.ts` | Derive today's totals from myWalks via useMemo |
| Create | `apps/mobile/components/home/TodaySummary.tsx` | Card showing today's walk count, distance, duration |
| Create | `apps/mobile/components/home/RecentWalksList.tsx` | FlatList of WalkSummaryCards |
| Modify | `apps/mobile/app/(tabs)/index.tsx` | Replace placeholder — user greeting, TodaySummary, RecentWalksList |

---

## Task 1: useTodayStats Hook

**Files:**
- Create: `apps/mobile/hooks/use-today-stats.ts`
- Test: `apps/mobile/hooks/use-today-stats.test.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/hooks/use-today-stats.test.ts`:
```typescript
import { renderHook } from '@testing-library/react-native';
import { useTodayStats } from './use-today-stats';
import type { Walk } from '@/types/graphql';

function makeWalk(startedAt: string, distanceM: number, durationSec: number): Walk {
  return {
    id: `walk-${startedAt}`,
    dogs: [],
    status: 'FINISHED',
    distanceM,
    durationSec,
    startedAt,
    endedAt: startedAt,
  };
}

describe('useTodayStats', () => {
  it('returns zeros when walks list is empty', () => {
    const { result } = renderHook(() => useTodayStats([]));
    expect(result.current).toEqual({ totalWalks: 0, totalDistanceM: 0, totalDurationSec: 0 });
  });

  it('counts only walks that started today', () => {
    const todayStart = new Date();
    todayStart.setHours(8, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const walks = [
      makeWalk(todayStart.toISOString(), 1500, 900),
      makeWalk(todayStart.toISOString(), 2000, 1200),
      makeWalk(yesterdayStart.toISOString(), 3000, 1800),
    ];

    const { result } = renderHook(() => useTodayStats(walks));
    expect(result.current.totalWalks).toBe(2);
    expect(result.current.totalDistanceM).toBe(3500);
    expect(result.current.totalDurationSec).toBe(2100);
  });

  it('returns zeros when no walks happened today', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const walks = [makeWalk(yesterday.toISOString(), 1000, 600)];

    const { result } = renderHook(() => useTodayStats(walks));
    expect(result.current.totalWalks).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="hooks/use-today-stats"
```

Expected: FAIL — `Cannot find module './use-today-stats'`

- [ ] **Step 3: Implement useTodayStats**

Create `apps/mobile/hooks/use-today-stats.ts`:
```typescript
import { useMemo } from 'react';
import type { Walk, WalkStats } from '@/types/graphql';

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function useTodayStats(walks: Walk[]): WalkStats {
  return useMemo(() => {
    const todayWalks = walks.filter((w) => isToday(w.startedAt));
    return {
      totalWalks: todayWalks.length,
      totalDistanceM: todayWalks.reduce((sum, w) => sum + w.distanceM, 0),
      totalDurationSec: todayWalks.reduce((sum, w) => sum + w.durationSec, 0),
    };
  }, [walks]);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="hooks/use-today-stats"
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/hooks/use-today-stats.ts apps/mobile/hooks/use-today-stats.test.ts
git commit -m "feat(mobile): add useTodayStats hook"
```

---

## Task 2: TodaySummary Component

**Files:**
- Create: `apps/mobile/components/home/TodaySummary.tsx`
- Test: `apps/mobile/components/home/TodaySummary.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/mobile/components/home/TodaySummary.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react-native';
import { TodaySummary } from './TodaySummary';
import type { WalkStats } from '@/types/graphql';

describe('TodaySummary', () => {
  it('displays walk count', () => {
    const stats: WalkStats = { totalWalks: 3, totalDistanceM: 4500, totalDurationSec: 2700 };
    render(<TodaySummary stats={stats} />);
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('formats distance in km when over 1000m', () => {
    const stats: WalkStats = { totalWalks: 1, totalDistanceM: 2300, totalDurationSec: 900 };
    render(<TodaySummary stats={stats} />);
    expect(screen.getByText('2.3 km')).toBeTruthy();
  });

  it('shows 0 stats when no walks today', () => {
    const stats: WalkStats = { totalWalks: 0, totalDistanceM: 0, totalDurationSec: 0 };
    render(<TodaySummary stats={stats} />);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('0 m')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/home/TodaySummary"
```

- [ ] **Step 3: Implement TodaySummary**

Create `apps/mobile/components/home/TodaySummary.tsx`:
```typescript
import { StyleSheet, Text, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing, radius, typography } from '@/theme/tokens';
import type { WalkStats } from '@/types/graphql';

interface TodaySummaryProps {
  stats: WalkStats;
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}分`;
}

export function TodaySummary({ stats }: TodaySummaryProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={[styles.card, { backgroundColor: colors.primaryLight }]}>
      <Text style={[styles.cardTitle, { color: colors.primary }]}>今日の散歩</Text>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={[styles.value, { color: colors.primary }]}>{stats.totalWalks}</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>回</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  value: {
    ...typography.h2,
  },
  label: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  divider: {
    width: 1,
    height: 40,
    marginHorizontal: spacing.sm,
  },
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
docker compose -f apps/compose.yml run --rm mobile npm test -- --testPathPattern="components/home/TodaySummary"
```

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/home/TodaySummary.tsx apps/mobile/components/home/TodaySummary.test.tsx
git commit -m "feat(mobile): add TodaySummary component"
```

---

## Task 3: RecentWalksList Component

**Files:**
- Create: `apps/mobile/components/home/RecentWalksList.tsx`

- [ ] **Step 1: Implement RecentWalksList**

Create `apps/mobile/components/home/RecentWalksList.tsx`:
```typescript
import { FlatList, Pressable, StyleSheet } from 'react-native';
import { WalkSummaryCard } from '@/components/walk/WalkSummaryCard';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Walk } from '@/types/graphql';

interface RecentWalksListProps {
  walks: Walk[];
  onWalkPress: (id: string) => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export function RecentWalksList({
  walks,
  onWalkPress,
  onRefresh,
  refreshing,
}: RecentWalksListProps) {
  return (
    <FlatList
      data={walks}
      keyExtractor={(w) => w.id}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`散歩 ${new Date(item.startedAt).toLocaleDateString()}`}
          onPress={() => onWalkPress(item.id)}
        >
          <WalkSummaryCard walk={item} />
        </Pressable>
      )}
      onRefresh={onRefresh}
      refreshing={refreshing}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyState message="まだ散歩の記録がありません" />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/components/home/RecentWalksList.tsx
git commit -m "feat(mobile): add RecentWalksList component"
```

---

## Task 4: Home Tab Screen

**Files:**
- Modify: `apps/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Implement Home tab screen**

Replace entire content of `apps/mobile/app/(tabs)/index.tsx`:
```typescript
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMe } from '@/hooks/use-me';
import { useMyWalks } from '@/hooks/use-walks';
import { useTodayStats } from '@/hooks/use-today-stats';
import { TodaySummary } from '@/components/home/TodaySummary';
import { RecentWalksList } from '@/components/home/RecentWalksList';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { data: me, isLoading: meLoading } = useMe();
  const { data: walks = [], isLoading: walksLoading, refetch } = useMyWalks(20, 0);

  const todayStats = useTodayStats(walks);

  if (meLoading) return <LoadingScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <ThemedText type="title">
          こんにちは、{me?.displayName ?? 'ユーザー'}さん！
        </ThemedText>
      </View>

      <TodaySummary stats={todayStats} />

      <ThemedText type="subtitle" style={styles.sectionTitle}>
        最近の散歩
      </ThemedText>

      <RecentWalksList
        walks={walks}
        onWalkPress={(id) => router.push(`/walks/${id}`)}
        onRefresh={refetch}
        refreshing={walksLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  header: { marginBottom: spacing.lg },
  sectionTitle: { marginBottom: spacing.md },
});
```

- [ ] **Step 2: Verify Home tab**

Start Docker stack and log in. Navigate to Home tab. Verify:
- User greeting shows the display name
- Today's summary shows 0 for a new account
- Recent walks list shows empty state message
- After completing a walk (Increment 3), refresh home — stats and list update

```bash
docker compose -f apps/compose.yml up
```

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile): implement home screen with today summary and recent walks"
```

---

## Verification Checklist

- [ ] Home tab shows user's display name in greeting
- [ ] TodaySummary shows 0s for a new account
- [ ] After completing walks, today's stats update on pull-to-refresh
- [ ] Recent walks list shows walk cards
- [ ] Tapping a walk navigates to walk detail
- [ ] All tests pass: `docker compose -f apps/compose.yml run --rm mobile npm test`
