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
    startWalk(dogIds: $dogIds) { id status }
  }
`;

const RECORD_WALK_EVENT = `
  mutation RecordWalkEvent($input: RecordWalkEventInput!) {
    recordWalkEvent(input: $input) {
      id
      eventType
      occurredAt
      lat
      lng
      photoUrl
      dogId
    }
  }
`;

const GENERATE_WALK_EVENT_PHOTO_UPLOAD_URL = `
  mutation GenerateWalkEventPhotoUploadUrl($walkId: ID!, $contentType: String!) {
    generateWalkEventPhotoUploadUrl(walkId: $walkId, contentType: $contentType) {
      url key expiresAt
    }
  }
`;

const GET_WALK_WITH_EVENTS = `
  query Walk($id: ID!) {
    walk(id: $id) {
      id status
      events {
        id
        eventType
        occurredAt
        lat
        lng
        photoUrl
        dogId
      }
    }
  }
`;

// Minimal 1x1 PNG bytes (same as photo.spec.ts)
const PNG_1X1_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

async function createDog(client: any, name: string): Promise<string> {
  const res = await client.execute(CREATE_DOG, { input: { name } });
  return res.data!.createDog.id;
}

async function startWalk(client: any, dogId: string): Promise<string> {
  const res = await client.execute(START_WALK, { dogIds: [dogId] });
  return res.data!.startWalk.id;
}

// AC-1, AC-2, AC-4: pee and poo events recorded during walk, retrieved in occurredAt ASC order
test.describe('recordWalkEvent — pee and poo', () => {
  test('records pee and poo, walk query returns events in occurredAt ASC order', async ({
    authedGraphql,
  }) => {
    const dogId = await createDog(authedGraphql, 'PeePooTestDog');
    const walkId = await startWalk(authedGraphql, dogId);

    // Record poo first with a later occurredAt, then pee with an earlier time
    const pooRes = await authedGraphql.execute(RECORD_WALK_EVENT, {
      input: {
        walkId,
        eventType: 'poo',
        occurredAt: '2026-04-12T10:05:00Z',
        lat: 35.682,
        lng: 139.768,
      },
    });
    expect(pooRes.errors).toBeUndefined();
    expect(pooRes.data!.recordWalkEvent.eventType).toBe('poo');
    expect(pooRes.data!.recordWalkEvent.lat).toBeCloseTo(35.682);
    expect(pooRes.data!.recordWalkEvent.lng).toBeCloseTo(139.768);
    expect(pooRes.data!.recordWalkEvent.photoUrl).toBeNull();

    const peeRes = await authedGraphql.execute(RECORD_WALK_EVENT, {
      input: {
        walkId,
        eventType: 'pee',
        occurredAt: '2026-04-12T10:00:00Z',
        lat: 35.681,
        lng: 139.767,
      },
    });
    expect(peeRes.errors).toBeUndefined();
    expect(peeRes.data!.recordWalkEvent.eventType).toBe('pee');

    // Query walk — events should be sorted by occurredAt ASC (pee before poo)
    const walkRes = await authedGraphql.execute(GET_WALK_WITH_EVENTS, {
      id: walkId,
    });
    expect(walkRes.errors).toBeUndefined();
    const events = walkRes.data!.walk.events;
    expect(events).toHaveLength(2);
    expect(events[0].eventType).toBe('pee');
    expect(events[1].eventType).toBe('poo');
  });
});

// AC-3: photo event — presigned URL → S3 PUT → recordWalkEvent → walk query shows CloudFront URL
test.describe('recordWalkEvent — photo', () => {
  test('generates presigned URL, uploads PNG, records photo event with CloudFront URL', async ({
    authedGraphql,
    request,
  }) => {
    const dogId = await createDog(authedGraphql, 'PhotoEventTestDog');
    const walkId = await startWalk(authedGraphql, dogId);

    // Step 1: get presigned upload URL
    const presignedRes = await authedGraphql.execute(
      GENERATE_WALK_EVENT_PHOTO_UPLOAD_URL,
      { walkId, contentType: 'image/png' },
    );
    expect(presignedRes.errors).toBeUndefined();
    const { url, key } = presignedRes.data!.generateWalkEventPhotoUploadUrl;
    expect(url).toBeTruthy();
    expect(key).toMatch(/^walks\/.+\.png$/);

    // Step 2: PUT to S3 presigned URL
    const putRes = await request.put(url, {
      headers: { 'Content-Type': 'image/png' },
      data: PNG_1X1_BYTES,
    });
    expect(putRes.status()).toBe(200);

    // Step 3: record photo event with the returned key
    const eventRes = await authedGraphql.execute(RECORD_WALK_EVENT, {
      input: {
        walkId,
        eventType: 'photo',
        occurredAt: '2026-04-12T10:10:00Z',
        photoKey: key,
      },
    });
    expect(eventRes.errors).toBeUndefined();
    expect(eventRes.data!.recordWalkEvent.eventType).toBe('photo');
    const photoUrl = eventRes.data!.recordWalkEvent.photoUrl;
    expect(photoUrl).toBeTruthy();
    expect(photoUrl).toMatch(/^http/);
    expect(photoUrl).toContain(key);

    // Step 4: walk query returns the photo event with CloudFront URL
    const walkRes = await authedGraphql.execute(GET_WALK_WITH_EVENTS, {
      id: walkId,
    });
    expect(walkRes.errors).toBeUndefined();
    const events = walkRes.data!.walk.events;
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('photo');
    expect(events[0].photoUrl).toMatch(/^http/);
    expect(events[0].photoUrl).toContain(key);
  });
});

// AC-6: other user cannot record event on a walk they do not own
test.describe('recordWalkEvent — authorization', () => {
  test('returns UNAUTHORIZED error when another user tries to record event', async ({
    authedGraphql,
    request,
  }) => {
    const dogId = await createDog(authedGraphql, 'OwnerDog');
    const walkId = await startWalk(authedGraphql, dogId);

    // Create second user
    const baseURL = process.env.API_BASE_URL ?? 'http://api:3000';
    const otherClient = new GraphQLClient(request, baseURL);
    await registerAndSignIn(otherClient);

    const res = await otherClient.execute(RECORD_WALK_EVENT, {
      input: {
        walkId,
        eventType: 'pee',
        occurredAt: '2026-04-12T10:00:00Z',
      },
    });

    expect(res.errors).toBeDefined();
  });
});

// AC-7: recording pee/poo without GPS succeeds; lat/lng are null in response
test.describe('recordWalkEvent — no GPS', () => {
  test('records event without lat/lng and returns null for both fields', async ({
    authedGraphql,
  }) => {
    const dogId = await createDog(authedGraphql, 'NoGpsEventDog');
    const walkId = await startWalk(authedGraphql, dogId);

    const res = await authedGraphql.execute(RECORD_WALK_EVENT, {
      input: {
        walkId,
        eventType: 'pee',
        occurredAt: '2026-04-12T10:00:00Z',
        // lat and lng intentionally omitted
      },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.recordWalkEvent.eventType).toBe('pee');
    expect(res.data!.recordWalkEvent.lat).toBeNull();
    expect(res.data!.recordWalkEvent.lng).toBeNull();

    // Walk query also shows null lat/lng
    const walkRes = await authedGraphql.execute(GET_WALK_WITH_EVENTS, {
      id: walkId,
    });
    expect(walkRes.errors).toBeUndefined();
    const events = walkRes.data!.walk.events;
    expect(events).toHaveLength(1);
    expect(events[0].lat).toBeNull();
    expect(events[0].lng).toBeNull();
  });
});
