import { test, expect } from './helpers/fixtures';
import { GraphQLClient } from './helpers/graphql-client';
import { registerAndSignIn } from './helpers/auth';

const CREATE_DOG = `
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) { id name }
  }
`;

const START_WALK = `
  mutation StartWalk($dogIds: [ID!]!) {
    startWalk(dogIds: $dogIds) {
      id status distanceM durationSec startedAt endedAt
      dogs { id name }
    }
  }
`;

const FINISH_WALK = `
  mutation FinishWalk($walkId: ID!, $distanceM: Int) {
    finishWalk(walkId: $walkId, distanceM: $distanceM) {
      id status distanceM durationSec startedAt endedAt
    }
  }
`;

const ADD_WALK_POINTS = `
  mutation AddWalkPoints($walkId: ID!, $points: [WalkPointInput!]!) {
    addWalkPoints(walkId: $walkId, points: $points)
  }
`;

const GET_WALK = `
  query Walk($id: ID!) {
    walk(id: $id) {
      id status distanceM durationSec startedAt endedAt
      dogs { id name }
      points { lat lng recordedAt }
    }
  }
`;

const MY_WALKS = `
  query MyWalks($limit: Int, $offset: Int) {
    myWalks(limit: $limit, offset: $offset) {
      id status startedAt
    }
  }
`;

async function createDog(client: any, name: string): Promise<string> {
  const res = await client.execute(CREATE_DOG, { input: { name } });
  return res.data!.createDog.id;
}

test.describe('startWalk', () => {
  test('starts a walk with one dog', async ({ authedGraphql }) => {
    const dogId = await createDog(authedGraphql, 'Walker');

    const res = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });

    expect(res.errors).toBeUndefined();
    const walk = res.data!.startWalk;
    expect(walk.id).toBeTruthy();
    expect(walk.status).toBe('active');
    expect(walk.startedAt).toBeTruthy();
    expect(walk.endedAt).toBeNull();
    expect(walk.dogs).toHaveLength(1);
    expect(walk.dogs[0].name).toBe('Walker');
  });

  test('starts a walk with multiple dogs', async ({ authedGraphql }) => {
    const dogId1 = await createDog(authedGraphql, 'Dog1');
    const dogId2 = await createDog(authedGraphql, 'Dog2');

    const res = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId1, dogId2],
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.startWalk.dogs).toHaveLength(2);
  });

  test('rejects without dog IDs', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(START_WALK, {
      dogIds: [],
    });

    expect(res.errors).toBeDefined();
  });
});

test.describe('finishWalk', () => {
  test('finishes an active walk', async ({ authedGraphql }) => {
    const dogId = await createDog(authedGraphql, 'Finisher');
    const startRes = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });
    const walkId = startRes.data!.startWalk.id;

    const res = await authedGraphql.execute(FINISH_WALK, { walkId });

    expect(res.errors).toBeUndefined();
    const walk = res.data!.finishWalk;
    expect(walk.status).toBe('finished');
    expect(walk.endedAt).toBeTruthy();
    expect(walk.durationSec).toBeGreaterThanOrEqual(0);
  });

  test('accepts optional distanceM', async ({ authedGraphql }) => {
    const dogId = await createDog(authedGraphql, 'DistDog');
    const startRes = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });
    const walkId = startRes.data!.startWalk.id;

    const res = await authedGraphql.execute(FINISH_WALK, {
      walkId,
      distanceM: 1500,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.finishWalk.distanceM).toBe(1500);
  });
});

test.describe('addWalkPoints', () => {
  test('adds GPS points to a walk', async ({ authedGraphql }) => {
    const dogId = await createDog(authedGraphql, 'GPSDog');
    const startRes = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });
    const walkId = startRes.data!.startWalk.id;

    const res = await authedGraphql.execute(ADD_WALK_POINTS, {
      walkId,
      points: [
        { lat: 35.6812, lng: 139.7671, recordedAt: '2026-03-24T10:00:00Z' },
        { lat: 35.6815, lng: 139.7675, recordedAt: '2026-03-24T10:01:00Z' },
        { lat: 35.6820, lng: 139.7680, recordedAt: '2026-03-24T10:02:00Z' },
      ],
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.addWalkPoints).toBe(true);
  });

  test('rejects for another user\'s walk', async ({ authedGraphql, request }) => {
    const dogId = await createDog(authedGraphql, 'MyDog');
    const startRes = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });
    const walkId = startRes.data!.startWalk.id;

    // Create second user
    const baseURL = process.env.API_BASE_URL ?? 'http://api:3000';
    const otherClient = new GraphQLClient(request, baseURL);
    await registerAndSignIn(otherClient);

    const res = await otherClient.execute(ADD_WALK_POINTS, {
      walkId,
      points: [
        { lat: 35.0, lng: 139.0, recordedAt: '2026-03-24T10:00:00Z' },
      ],
    });

    expect(res.errors).toBeDefined();
  });
});

test.describe('walk query', () => {
  test('returns walk by ID with dogs and points', async ({ authedGraphql }) => {
    const dogId = await createDog(authedGraphql, 'QueryDog');
    const startRes = await authedGraphql.execute(START_WALK, {
      dogIds: [dogId],
    });
    const walkId = startRes.data!.startWalk.id;

    await authedGraphql.execute(ADD_WALK_POINTS, {
      walkId,
      points: [
        { lat: 35.6812, lng: 139.7671, recordedAt: '2026-03-24T10:00:00Z' },
      ],
    });
    await authedGraphql.execute(FINISH_WALK, { walkId, distanceM: 500 });

    const res = await authedGraphql.execute(GET_WALK, { id: walkId });

    expect(res.errors).toBeUndefined();
    const walk = res.data!.walk;
    expect(walk.id).toBe(walkId);
    expect(walk.status).toBe('finished');
    expect(walk.distanceM).toBe(500);
    expect(walk.dogs).toHaveLength(1);
    expect(walk.dogs[0].name).toBe('QueryDog');
    expect(walk.points).toHaveLength(1);
    expect(walk.points[0].lat).toBeCloseTo(35.6812);
  });
});

test.describe('myWalks', () => {
  test('returns list of user\'s walks', async ({ authedGraphql }) => {
    const dogId = await createDog(authedGraphql, 'ListDog');
    await authedGraphql.execute(START_WALK, { dogIds: [dogId] });
    await authedGraphql.execute(START_WALK, { dogIds: [dogId] });

    const res = await authedGraphql.execute(MY_WALKS);

    expect(res.errors).toBeUndefined();
    expect(res.data!.myWalks.length).toBeGreaterThanOrEqual(2);
  });

  test('supports pagination with limit/offset', async ({ authedGraphql }) => {
    const dogId = await createDog(authedGraphql, 'PageDog');
    await authedGraphql.execute(START_WALK, { dogIds: [dogId] });
    await authedGraphql.execute(START_WALK, { dogIds: [dogId] });
    await authedGraphql.execute(START_WALK, { dogIds: [dogId] });

    const res = await authedGraphql.execute(MY_WALKS, {
      limit: 2,
      offset: 0,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.myWalks).toHaveLength(2);
  });
});
