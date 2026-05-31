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
  const todayKey = localDayKey(now);

  let packTodayM = 0;
  let packTodayMinutes = 0;
  const packDays = new Set<string>();
  const dogDays = new Map<string, Set<string>>();
  const dogTodayM = new Map<string, number>();
  const dogTodayMinutes = new Map<string, number>();
  const dogGoalProgressMinutes = new Map<string, number>();
  const dogTotalWalks = new Map<string, number>();
  const dogGoals = new Map<string, { minutes: number; cycleDays: GoalCycleDays }>();

  for (const dog of dogs) {
    dogGoals.set(dog.id, getGoal(dog));
  }
  const currentDogIds = new Set(dogGoals.keys());
  const hasCurrentDogs = currentDogIds.size > 0;

  // 散歩単位の距離をパック全体へ、参加中の犬ごとには個別進捗へ積み上げます。
  for (const walk of walks) {
    const dayKey = toLocalDayKey(walk.startedAt);
    const distanceM = walk.distanceM ?? 0;
    const durationMinutes = durationSecToMinutes(walk.durationSec ?? null);
    let includesCurrentDog = false;

    for (const dog of walk.dogs ?? []) {
      if (!dog?.id) continue;
      if (hasCurrentDogs && !currentDogIds.has(dog.id)) continue;
      includesCurrentDog = true;
      let set = dogDays.get(dog.id);
      if (!set) {
        set = new Set();
        dogDays.set(dog.id, set);
      }
      if (dayKey) set.add(dayKey);

      dogTotalWalks.set(dog.id, (dogTotalWalks.get(dog.id) ?? 0) + 1);
      if (dayKey === todayKey) {
        dogTodayM.set(dog.id, (dogTodayM.get(dog.id) ?? 0) + distanceM);
        dogTodayMinutes.set(
          dog.id,
          (dogTodayMinutes.get(dog.id) ?? 0) + durationMinutes,
        );
        packTodayMinutes += durationMinutes;
      }
      const goal = dogGoals.get(dog.id) ?? defaultGoal();
      if (isInGoalWindow(dayKey, goal.cycleDays, now)) {
        dogGoalProgressMinutes.set(
          dog.id,
          (dogGoalProgressMinutes.get(dog.id) ?? 0) + durationMinutes,
        );
      }
    }

    if (includesCurrentDog) {
      if (dayKey === todayKey) packTodayM += distanceM;
      if (dayKey) packDays.add(dayKey);
    }
  }

  const perDog: Record<string, DogProgress> = {};
  const dogIds = new Set([...dogGoals.keys(), ...dogDays.keys()]);
  for (const dogId of dogIds) {
    const days = dogDays.get(dogId) ?? new Set<string>();
    const goal = dogGoals.get(dogId) ?? defaultGoal();
    perDog[dogId] = {
      todayKm: (dogTodayM.get(dogId) ?? 0) / 1000,
      todayMinutes: dogTodayMinutes.get(dogId) ?? 0,
      goalProgressMinutes: dogGoalProgressMinutes.get(dogId) ?? 0,
      goalMinutes: goal.minutes,
      goalCycleDays: goal.cycleDays,
      totalWalks: dogTotalWalks.get(dogId) ?? 0,
      streakDays: computeStreak(days, now),
    };
  }

  const todayKm = packTodayM / 1000;
  const goalProgressMinutes = Array.from(dogIds).reduce(
    (total, dogId) => total + (dogGoalProgressMinutes.get(dogId) ?? 0),
    0,
  );
  const goalMinutes = Array.from(dogIds).reduce(
    (total, dogId) => total + (dogGoals.get(dogId)?.minutes ?? DEFAULT_DAILY_GOAL_MINUTES),
    0,
  );
  const progressPct =
    goalMinutes > 0 ? Math.min(100, Math.round((goalProgressMinutes / goalMinutes) * 100)) : 0;
  const packStreakDays = computeStreak(packDays, now);

  return {
    todayKm,
    todayMinutes: packTodayMinutes,
    goalProgressMinutes,
    goalMinutes,
    progressPct,
    packStreakDays,
    perDog,
  };
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
