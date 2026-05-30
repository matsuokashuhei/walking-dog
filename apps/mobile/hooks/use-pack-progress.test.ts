import { aggregatePackProgress } from './use-pack-progress';
import type { Dog, Walk } from '@/types/graphql';

jest.mock('./use-walks', () => ({
  useMyWalks: jest.fn(),
}));

function makeWalk(
  id: string,
  dogIds: string[],
  startedAt: string,
  distanceM: number | null,
  durationSec = 1440,
): Walk {
  return {
    id,
    dogs: dogIds.map((dogId) => ({
      id: dogId,
      name: `dog-${dogId}`,
      breed: null,
      gender: null,
      birthday: null,
      photoUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    })),
    status: 'FINISHED',
    distanceM,
    durationSec,
    startedAt,
    endedAt: null,
  };
}

function makeDog(id: string, dailyGoalMinutes: number | null = 30): Dog {
  return {
    id,
    name: `dog-${id}`,
    breed: null,
    gender: null,
    birthday: null,
    photoUrl: null,
    createdAt: '2026-01-01T00:00:00Z',
    walkGoal:
      dailyGoalMinutes === null
        ? null
        : {
            id: `goal-${id}`,
            dogId: id,
            walkAmount: { minutes: dailyGoalMinutes, cycleDays: 1 },
            effectiveFrom: '2026-01-01',
            effectiveTo: null,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
  };
}

describe('aggregatePackProgress', () => {
  const now = new Date(2026, 3, 19, 12, 0, 0); // 2026-04-19 12:00 local

  it('returns zeros when there are no walks', () => {
    const result = aggregatePackProgress([], [makeDog('coco', 30)], now);
    expect(result).toEqual({
      todayKm: 0,
      todayMinutes: 0,
      goalMinutes: 30,
      progressPct: 0,
      packStreakDays: 0,
      perDog: {
        coco: {
          todayKm: 0,
          todayMinutes: 0,
          dailyGoalMinutes: 30,
          totalWalks: 0,
          streakDays: 0,
        },
      },
    });
  });

  it('packStreakDays counts consecutive days where ANY dog walked', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8).toISOString(), 1000),
      makeWalk('w2', ['momo'], new Date(2026, 3, 18, 8).toISOString(), 800),
      makeWalk('w3', ['coco'], new Date(2026, 3, 16, 8).toISOString(), 500),
    ];
    expect(aggregatePackProgress(walks, [makeDog('coco'), makeDog('momo')], now).packStreakDays).toBe(2);
  });

  it('packStreakDays is zero if no recent pack walk', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 15, 8).toISOString(), 500),
    ];
    expect(aggregatePackProgress(walks, [makeDog('coco')], now).packStreakDays).toBe(0);
  });

  it('sums today distance across all dogs for the pack card', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8, 0).toISOString(), 1420),
      makeWalk('w2', ['momo'], new Date(2026, 3, 19, 9, 0).toISOString(), 2100),
      makeWalk('w3', ['coco'], new Date(2026, 3, 18, 18, 0).toISOString(), 3000),
    ];
    const result = aggregatePackProgress(walks, [makeDog('coco'), makeDog('momo')], now);
    expect(result.todayKm).toBeCloseTo(3.52, 2);
  });

  it('computes time-based pack progress from today walk durations and dog goals', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8, 0).toISOString(), 1420, 30 * 60),
      makeWalk('w2', ['momo'], new Date(2026, 3, 19, 9, 0).toISOString(), 2100, 15 * 60),
    ];
    const result = aggregatePackProgress(walks, [makeDog('coco', 60), makeDog('momo', 30)], now);
    expect(result.todayMinutes).toBe(45);
    expect(result.goalMinutes).toBe(90);
    expect(result.progressPct).toBe(50);
    expect(result.perDog.coco.todayMinutes).toBe(30);
    expect(result.perDog.momo.todayMinutes).toBe(15);
  });

  it('computes per-dog today km, today minutes and totals', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8, 0).toISOString(), 1420, 24 * 60),
      makeWalk('w2', ['coco'], new Date(2026, 3, 18, 18, 0).toISOString(), 2080, 40 * 60),
      makeWalk('w3', ['momo'], new Date(2026, 3, 19, 9, 0).toISOString(), 2100, 12 * 60),
    ];
    const result = aggregatePackProgress(walks, [makeDog('coco'), makeDog('momo')], now);
    expect(result.perDog.coco.todayKm).toBeCloseTo(1.42, 2);
    expect(result.perDog.coco.todayMinutes).toBe(24);
    expect(result.perDog.coco.totalWalks).toBe(2);
    expect(result.perDog.momo.todayKm).toBeCloseTo(2.1, 2);
    expect(result.perDog.momo.todayMinutes).toBe(12);
    expect(result.perDog.momo.totalWalks).toBe(1);
  });

  it('counts group walk duration once per participating dog', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco', 'momo'], new Date(2026, 3, 19, 8, 0).toISOString(), 1000, 25 * 60),
    ];
    const result = aggregatePackProgress(walks, [makeDog('coco', 50), makeDog('momo', 50)], now);
    expect(result.todayKm).toBeCloseTo(1, 5);
    expect(result.perDog.coco.todayKm).toBeCloseTo(1, 5);
    expect(result.perDog.momo.todayKm).toBeCloseTo(1, 5);
    expect(result.todayMinutes).toBe(50);
    expect(result.perDog.coco.todayMinutes).toBe(25);
    expect(result.perDog.momo.todayMinutes).toBe(25);
  });

  it('ignores dogs that are not in the current pack', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8, 0).toISOString(), 1000, 25 * 60),
      makeWalk('w2', ['old-dog'], new Date(2026, 3, 19, 9, 0).toISOString(), 2000, 45 * 60),
    ];

    const result = aggregatePackProgress(walks, [makeDog('coco', 50)], now);

    expect(result.todayKm).toBeCloseTo(1, 5);
    expect(result.todayMinutes).toBe(25);
    expect(result.goalMinutes).toBe(50);
    expect(result.perDog['old-dog']).toBeUndefined();
  });

  it('streak counts consecutive days ending today', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8).toISOString(), 500),
      makeWalk('w2', ['coco'], new Date(2026, 3, 18, 8).toISOString(), 500),
      makeWalk('w3', ['coco'], new Date(2026, 3, 17, 8).toISOString(), 500),
      makeWalk('w4', ['coco'], new Date(2026, 3, 15, 8).toISOString(), 500),
    ];
    expect(aggregatePackProgress(walks, [makeDog('coco')], now).perDog.coco.streakDays).toBe(3);
  });

  it('streak counts from yesterday when today has no walk', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 18, 8).toISOString(), 500),
      makeWalk('w2', ['coco'], new Date(2026, 3, 17, 8).toISOString(), 500),
    ];
    expect(aggregatePackProgress(walks, [makeDog('coco')], now).perDog.coco.streakDays).toBe(2);
  });

  it('streak is zero if last walk was more than one day ago', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 15, 8).toISOString(), 500),
    ];
    expect(aggregatePackProgress(walks, [makeDog('coco')], now).perDog.coco.streakDays).toBe(0);
  });

  it('caps progressPct at 100', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8).toISOString(), 20_000, 120 * 60),
    ];
    expect(aggregatePackProgress(walks, [makeDog('coco', 30)], now).progressPct).toBe(100);
  });

  it('handles null distanceM as zero', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8).toISOString(), null),
    ];
    const result = aggregatePackProgress(walks, [makeDog('coco')], now);
    expect(result.todayKm).toBe(0);
    expect(result.perDog.coco.totalWalks).toBe(1);
  });
});
