import { useMemo } from 'react';
import {
  DAILY_GOAL_CYCLE_DAYS,
  DEFAULT_DAILY_GOAL_MINUTES,
  type GoalCycleDays,
  WEEKLY_GOAL_CYCLE_DAYS,
} from '@/constants/walk';
import { useMe } from './use-me';
import { useMyWalks } from './use-walks';
import type { Dog, Walk } from '@/types/graphql';

// 犬ごとの今日の距離・時間、総散歩数、継続日数を表します。
interface DogProgress {
  todayKm: number;
  todayMinutes: number;
  goalProgressMinutes: number;
  goalMinutes: number;
  goalCycleDays: GoalCycleDays;
  totalWalks: number;
  streakDays: number;
}

type DogGoal = { minutes: number; cycleDays: GoalCycleDays };

interface PackProgressAccumulator {
  dogDays: Map<string, Set<string>>;
  dogGoalProgressMinutes: Map<string, number>;
  dogGoals: Map<string, DogGoal>;
  dogTodayM: Map<string, number>;
  dogTodayMinutes: Map<string, number>;
  dogTotalWalks: Map<string, number>;
  currentDogIds: Set<string>;
  hasCurrentDogs: boolean;
  now: Date;
  packDays: Set<string>;
  packTodayM: number;
  packTodayMinutes: number;
  todayKey: string;
}

// パック全体と犬ごとの散歩進捗を、ホームや犬一覧で使う形にまとめた値です。
export interface PackProgress {
  todayKm: number;
  todayMinutes: number;
  goalProgressMinutes: number;
  goalMinutes: number;
  progressPct: number;
  packStreakDays: number;
  perDog: Record<string, DogProgress>;
  isLoading: boolean;
}

function toLocalDayKey(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDay(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
}

// ローカル日付で連続散歩日数を計算し、昨日まで継続中の場合も streak として扱います。
function computeStreak(dayKeys: Set<string>, now: Date): number {
  if (dayKeys.size === 0) return 0;
  const today = localDayKey(now);
  const yesterday = localDayKey(shiftDay(now, -1));
  let cursor: Date;
  if (dayKeys.has(today)) cursor = now;
  else if (dayKeys.has(yesterday)) cursor = shiftDay(now, -1);
  else return 0;
  let streak = 0;
  while (dayKeys.has(localDayKey(cursor))) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

// 散歩履歴から、パック全体と犬ごとの今日の進捗・連続日数を集計します。
export function aggregatePackProgress(
  walks: Walk[],
  dogs: Dog[] = [],
  now: Date = new Date(),
): Omit<PackProgress, 'isLoading'> {
  const progress = createPackProgressAccumulator(dogs, now);

  // 散歩単位の距離をパック全体へ、参加中の犬ごとには個別進捗へ積み上げます。
  for (const walk of walks) {
    applyWalkProgress(progress, walk);
  }

  return buildPackProgress(progress);
}

function createPackProgressAccumulator(
  dogs: Dog[],
  now: Date,
): PackProgressAccumulator {
  const dogGoals = new Map<string, DogGoal>();
  for (const dog of dogs) {
    dogGoals.set(dog.id, getGoal(dog));
  }
  const currentDogIds = new Set(dogGoals.keys());

  return {
    dogDays: new Map(),
    dogGoalProgressMinutes: new Map(),
    dogGoals,
    dogTodayM: new Map(),
    dogTodayMinutes: new Map(),
    dogTotalWalks: new Map(),
    currentDogIds,
    hasCurrentDogs: currentDogIds.size > 0,
    now,
    packDays: new Set(),
    packTodayM: 0,
    packTodayMinutes: 0,
    todayKey: localDayKey(now),
  };
}

function applyWalkProgress(progress: PackProgressAccumulator, walk: Walk) {
  const dogIds = currentWalkDogIds(progress, walk);
  if (dogIds.length === 0) {
    return;
  }

  const dayKey = toLocalDayKey(walk.startedAt);
  const distanceM = walk.distanceM ?? 0;
  const durationMinutes = durationSecToMinutes(walk.durationSec ?? null);

  for (const dogId of dogIds) {
    applyDogWalkProgress(progress, {
      dayKey,
      distanceM,
      dogId,
      durationMinutes,
    });
  }

  if (dayKey === progress.todayKey) {
    progress.packTodayM += distanceM;
  }
  if (dayKey) {
    progress.packDays.add(dayKey);
  }
}

function currentWalkDogIds(progress: PackProgressAccumulator, walk: Walk): string[] {
  const dogIds: string[] = [];
  for (const dog of walk.dogs ?? []) {
    if (isIncludedWalkDog(progress, dog?.id)) {
      dogIds.push(dog.id);
    }
  }
  return dogIds;
}

function isIncludedWalkDog(
  progress: PackProgressAccumulator,
  dogId: string | undefined,
) {
  if (!dogId) {
    return false;
  }
  return !progress.hasCurrentDogs || progress.currentDogIds.has(dogId);
}

function applyDogWalkProgress(
  progress: PackProgressAccumulator,
  walk: {
    dayKey: string;
    distanceM: number;
    dogId: string;
    durationMinutes: number;
  },
) {
  addDogWalkDay(progress, walk.dogId, walk.dayKey);
  incrementMap(progress.dogTotalWalks, walk.dogId, 1);
  addTodayDogProgress(progress, walk);
  addGoalProgress(progress, walk);
}

function addDogWalkDay(
  progress: PackProgressAccumulator,
  dogId: string,
  dayKey: string,
) {
  if (dayKey) {
    getDogDays(progress, dogId).add(dayKey);
  } else {
    getDogDays(progress, dogId);
  }
}

function getDogDays(progress: PackProgressAccumulator, dogId: string) {
  const existing = progress.dogDays.get(dogId);
  if (existing) {
    return existing;
  }
  const days = new Set<string>();
  progress.dogDays.set(dogId, days);
  return days;
}

function addTodayDogProgress(
  progress: PackProgressAccumulator,
  walk: {
    dayKey: string;
    distanceM: number;
    dogId: string;
    durationMinutes: number;
  },
) {
  if (walk.dayKey !== progress.todayKey) {
    return;
  }
  incrementMap(progress.dogTodayM, walk.dogId, walk.distanceM);
  incrementMap(progress.dogTodayMinutes, walk.dogId, walk.durationMinutes);
  progress.packTodayMinutes += walk.durationMinutes;
}

function addGoalProgress(
  progress: PackProgressAccumulator,
  walk: {
    dayKey: string;
    dogId: string;
    durationMinutes: number;
  },
) {
  const goal = progress.dogGoals.get(walk.dogId) ?? defaultGoal();
  if (isInGoalWindow(walk.dayKey, goal.cycleDays, progress.now)) {
    incrementMap(progress.dogGoalProgressMinutes, walk.dogId, walk.durationMinutes);
  }
}

function incrementMap(values: Map<string, number>, key: string, amount: number) {
  values.set(key, (values.get(key) ?? 0) + amount);
}

function buildPackProgress(
  progress: PackProgressAccumulator,
): Omit<PackProgress, 'isLoading'> {
  const dogIds = progressDogIds(progress);
  const perDog: Record<string, DogProgress> = {};
  for (const dogId of dogIds) {
    perDog[dogId] = buildDogProgress(progress, dogId);
  }

  const todayKm = progress.packTodayM / 1000;
  const goalProgressMinutes = sumGoalProgressMinutes(progress, dogIds);
  const goalMinutes = sumGoalMinutes(progress, dogIds);
  const progressPct = progressPercentage(goalProgressMinutes, goalMinutes);
  const packStreakDays = computeStreak(progress.packDays, progress.now);

  return {
    todayKm,
    todayMinutes: progress.packTodayMinutes,
    goalProgressMinutes,
    goalMinutes,
    progressPct,
    packStreakDays,
    perDog,
  };
}

function progressDogIds(progress: PackProgressAccumulator) {
  return new Set([...progress.dogGoals.keys(), ...progress.dogDays.keys()]);
}

function buildDogProgress(
  progress: PackProgressAccumulator,
  dogId: string,
): DogProgress {
  const days = progress.dogDays.get(dogId) ?? new Set<string>();
  const goal = progress.dogGoals.get(dogId) ?? defaultGoal();

  return {
    todayKm: (progress.dogTodayM.get(dogId) ?? 0) / 1000,
    todayMinutes: progress.dogTodayMinutes.get(dogId) ?? 0,
    goalProgressMinutes: progress.dogGoalProgressMinutes.get(dogId) ?? 0,
    goalMinutes: goal.minutes,
    goalCycleDays: goal.cycleDays,
    totalWalks: progress.dogTotalWalks.get(dogId) ?? 0,
    streakDays: computeStreak(days, progress.now),
  };
}

function sumGoalProgressMinutes(
  progress: PackProgressAccumulator,
  dogIds: Set<string>,
) {
  return Array.from(dogIds).reduce(
    (total, dogId) => total + (progress.dogGoalProgressMinutes.get(dogId) ?? 0),
    0,
  );
}

function sumGoalMinutes(progress: PackProgressAccumulator, dogIds: Set<string>) {
  return Array.from(dogIds).reduce(
    (total, dogId) =>
      total + (progress.dogGoals.get(dogId)?.minutes ?? DEFAULT_DAILY_GOAL_MINUTES),
    0,
  );
}

function progressPercentage(goalProgressMinutes: number, goalMinutes: number) {
  if (goalMinutes <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((goalProgressMinutes / goalMinutes) * 100));
}

// 最新の散歩履歴をもとに、パック進捗をメモ化して返します。
export function usePackProgress(): PackProgress {
  const { data, isLoading } = useMyWalks(100);
  const { data: me, isLoading: isMeLoading } = useMe();
  return useMemo(() => {
    const walks = data ?? [];
    return {
      ...aggregatePackProgress(walks, me?.dogs ?? []),
      isLoading: isLoading || isMeLoading,
    };
  }, [data, isLoading, isMeLoading, me?.dogs]);
}

function getGoal(dog: Dog): { minutes: number; cycleDays: GoalCycleDays } {
  const minutes = dog.walkGoal?.walkAmount.minutes;
  const cycleDays = dog.walkGoal?.walkAmount.cycleDays;
  if (
    typeof minutes === 'number' &&
    Number.isInteger(minutes) &&
    minutes > 0 &&
    (cycleDays === DAILY_GOAL_CYCLE_DAYS || cycleDays === WEEKLY_GOAL_CYCLE_DAYS)
  ) {
    return { minutes, cycleDays };
  }
  return defaultGoal();
}

function defaultGoal(): { minutes: number; cycleDays: GoalCycleDays } {
  return {
    minutes: DEFAULT_DAILY_GOAL_MINUTES,
    cycleDays: DAILY_GOAL_CYCLE_DAYS,
  };
}

function isInGoalWindow(
  dayKey: string,
  cycleDays: GoalCycleDays,
  now: Date,
): boolean {
  if (!dayKey) return false;
  const todayKey = localDayKey(now);
  const startKey =
    cycleDays === WEEKLY_GOAL_CYCLE_DAYS
      ? localDayKey(startOfMondayWeek(now))
      : todayKey;
  return dayKey >= startKey && dayKey <= todayKey;
}

function startOfMondayWeek(date: Date): Date {
  const day = date.getDay();
  const daysSinceMonday = (day + 6) % 7;
  return shiftDay(date, -daysSinceMonday);
}

function durationSecToMinutes(durationSec: number | null): number {
  if (durationSec == null || durationSec <= 0) return 0;
  return Math.round(durationSec / 60);
}
