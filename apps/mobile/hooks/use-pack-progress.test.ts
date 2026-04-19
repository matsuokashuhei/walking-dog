import { aggregatePackProgress } from './use-pack-progress';
import type { Walk } from '@/types/graphql';

function makeWalk(
  id: string,
  dogIds: string[],
  startedAt: string,
  distanceM: number | null,
): Walk {
  return {
    id,
    dogs: dogIds.map((dogId) => ({
      id: dogId,
      name: `dog-${dogId}`,
      breed: null,
      gender: null,
      birthDate: null,
      photoUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    })),
    status: 'FINISHED',
    distanceM,
    durationSec: 1440,
    startedAt,
    endedAt: null,
  };
}

describe('aggregatePackProgress', () => {
  const now = new Date(2026, 3, 19, 12, 0, 0); // 2026-04-19 12:00 local

  it('returns zeros when there are no walks', () => {
    const result = aggregatePackProgress([], 5, now);
    expect(result).toEqual({ todayKm: 0, goalKm: 5, progressPct: 0, perDog: {} });
  });

  it('sums today distance across all dogs for the pack card', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8, 0).toISOString(), 1420),
      makeWalk('w2', ['momo'], new Date(2026, 3, 19, 9, 0).toISOString(), 2100),
      makeWalk('w3', ['coco'], new Date(2026, 3, 18, 18, 0).toISOString(), 3000),
    ];
    const result = aggregatePackProgress(walks, 5, now);
    expect(result.todayKm).toBeCloseTo(3.52, 2);
    expect(result.progressPct).toBe(70);
  });

  it('computes per-dog today km and totals', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8, 0).toISOString(), 1420),
      makeWalk('w2', ['coco'], new Date(2026, 3, 18, 18, 0).toISOString(), 2080),
      makeWalk('w3', ['momo'], new Date(2026, 3, 19, 9, 0).toISOString(), 2100),
    ];
    const result = aggregatePackProgress(walks, 5, now);
    expect(result.perDog.coco.todayKm).toBeCloseTo(1.42, 2);
    expect(result.perDog.coco.totalWalks).toBe(2);
    expect(result.perDog.momo.todayKm).toBeCloseTo(2.1, 2);
    expect(result.perDog.momo.totalWalks).toBe(1);
  });

  it('counts walk that includes multiple dogs once per dog', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco', 'momo'], new Date(2026, 3, 19, 8, 0).toISOString(), 1000),
    ];
    const result = aggregatePackProgress(walks, 5, now);
    expect(result.todayKm).toBeCloseTo(1, 5);
    expect(result.perDog.coco.todayKm).toBeCloseTo(1, 5);
    expect(result.perDog.momo.todayKm).toBeCloseTo(1, 5);
  });

  it('streak counts consecutive days ending today', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8).toISOString(), 500),
      makeWalk('w2', ['coco'], new Date(2026, 3, 18, 8).toISOString(), 500),
      makeWalk('w3', ['coco'], new Date(2026, 3, 17, 8).toISOString(), 500),
      makeWalk('w4', ['coco'], new Date(2026, 3, 15, 8).toISOString(), 500),
    ];
    expect(aggregatePackProgress(walks, 5, now).perDog.coco.streakDays).toBe(3);
  });

  it('streak counts from yesterday when today has no walk', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 18, 8).toISOString(), 500),
      makeWalk('w2', ['coco'], new Date(2026, 3, 17, 8).toISOString(), 500),
    ];
    expect(aggregatePackProgress(walks, 5, now).perDog.coco.streakDays).toBe(2);
  });

  it('streak is zero if last walk was more than one day ago', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 15, 8).toISOString(), 500),
    ];
    expect(aggregatePackProgress(walks, 5, now).perDog.coco.streakDays).toBe(0);
  });

  it('caps progressPct at 100', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8).toISOString(), 20_000),
    ];
    expect(aggregatePackProgress(walks, 5, now).progressPct).toBe(100);
  });

  it('handles null distanceM as zero', () => {
    const walks: Walk[] = [
      makeWalk('w1', ['coco'], new Date(2026, 3, 19, 8).toISOString(), null),
    ];
    const result = aggregatePackProgress(walks, 5, now);
    expect(result.todayKm).toBe(0);
    expect(result.perDog.coco.totalWalks).toBe(1);
  });
});
