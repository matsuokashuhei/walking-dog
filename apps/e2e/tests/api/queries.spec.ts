import { test, expect } from './helpers/fixtures';

const CREATE_DOG = `
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) { id }
  }
`;

const START_WALK = `
  mutation StartWalk($dogIds: [ID!]!) {
    startWalk(dogIds: $dogIds) { id }
  }
`;

const FINISH_WALK = `
  mutation FinishWalk($walkId: ID!, $distanceM: Int) {
    finishWalk(walkId: $walkId, distanceM: $distanceM) { id }
  }
`;

const ADD_WALK_POINTS = `
  mutation AddWalkPoints($walkId: ID!, $points: [WalkPointInput!]!) {
    addWalkPoints(walkId: $walkId, points: $points)
  }
`;

const DOG_WALK_STATS = `
  query DogWalkStats($dogId: ID!, $period: String!) {
    dogWalkStats(dogId: $dogId, period: $period) {
      totalWalks totalDistanceM totalDurationSec
    }
  }
`;

const WALK_POINTS = `
  query WalkPoints($walkId: ID!) {
    walkPoints(walkId: $walkId) { lat lng recordedAt }
  }
`;

test.describe('dogWalkStats', () => {
  test('returns zero stats for new dog', async ({ authedGraphql }) => {
    const dogRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'StatsDog' },
    });
    const dogId = dogRes.data!.createDog.id;

    const res = await authedGraphql.execute(DOG_WALK_STATS, {
      dogId,
      period: 'ALL',
    });

    expect(res.errors).toBeUndefined();
    const stats = res.data!.dogWalkStats;
    expect(stats.totalWalks).toBe(0);
    expect(stats.totalDistanceM).toBe(0);
    expect(stats.totalDurationSec).toBe(0);
  });

  test('returns correct stats after walks', async ({ authedGraphql }) => {
    const dogRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'ActiveDog' },
    });
    const dogId = dogRes.data!.createDog.id;

    // Complete a walk with distance
    const walkRes = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });
    const walkId = walkRes.data!.startWalk.id;
    await authedGraphql.execute(FINISH_WALK, { walkId, distanceM: 1000 });

    const res = await authedGraphql.execute(DOG_WALK_STATS, {
      dogId,
      period: 'ALL',
    });

    expect(res.errors).toBeUndefined();
    const stats = res.data!.dogWalkStats;
    expect(stats.totalWalks).toBe(1);
    expect(stats.totalDistanceM).toBe(1000);
    expect(stats.totalDurationSec).toBeGreaterThanOrEqual(0);
  });

  test('rejects for non-existent dog', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(DOG_WALK_STATS, {
      dogId: '00000000-0000-0000-0000-000000000000',
      period: 'ALL',
    });

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toContain('Dog not found');
  });
});

test.describe('walkPoints', () => {
  test('returns empty array for walk with no points', async ({ authedGraphql }) => {
    const dogRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'NoPointsDog' },
    });
    const dogId = dogRes.data!.createDog.id;
    const walkRes = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });
    const walkId = walkRes.data!.startWalk.id;

    const res = await authedGraphql.execute(WALK_POINTS, { walkId });

    expect(res.errors).toBeUndefined();
    expect(res.data!.walkPoints).toEqual([]);
  });

  test('returns added points', async ({ authedGraphql }) => {
    const dogRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'PointsDog' },
    });
    const dogId = dogRes.data!.createDog.id;
    const walkRes = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });
    const walkId = walkRes.data!.startWalk.id;

    const points = [
      { lat: 35.6812, lng: 139.7671, recordedAt: '2026-03-24T10:00:00Z' },
      { lat: 35.6815, lng: 139.7675, recordedAt: '2026-03-24T10:01:00Z' },
      { lat: 35.6820, lng: 139.7680, recordedAt: '2026-03-24T10:02:00Z' },
    ];
    await authedGraphql.execute(ADD_WALK_POINTS, { walkId, points });

    const res = await authedGraphql.execute(WALK_POINTS, { walkId });

    expect(res.errors).toBeUndefined();
    expect(res.data!.walkPoints).toHaveLength(3);
    expect(res.data!.walkPoints[0].lat).toBeCloseTo(35.6812);
    expect(res.data!.walkPoints[0].lng).toBeCloseTo(139.7671);
    expect(res.data!.walkPoints[0].recordedAt).toBeTruthy();
  });

  test('rejects for non-existent walk', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(WALK_POINTS, {
      walkId: '00000000-0000-0000-0000-000000000000',
    });

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toContain('Walk not found');
  });
});
