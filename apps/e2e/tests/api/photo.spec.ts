import { test, expect } from './helpers/fixtures';

const CREATE_DOG = `
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) { id }
  }
`;

const GENERATE_UPLOAD_URL = `
  mutation GenerateDogPhotoUploadUrl($dogId: ID!, $contentType: String!) {
    generateDogPhotoUploadUrl(dogId: $dogId, contentType: $contentType) {
      url key expiresAt
    }
  }
`;

// Minimal 1x1 PNG bytes used to verify the presigned PUT matches the signature.
const PNG_1X1_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

test.describe('generateDogPhotoUploadUrl', () => {
  test('returns presigned URL', async ({ authedGraphql }) => {
    const dogRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'PhotoDog' },
    });
    const dogId = dogRes.data!.createDog.id;

    const res = await authedGraphql.execute(GENERATE_UPLOAD_URL, {
      dogId,
      contentType: 'image/jpeg',
    });

    expect(res.errors).toBeUndefined();
    const output = res.data!.generateDogPhotoUploadUrl;
    expect(output.url).toBeTruthy();
    expect(output.key).toBeTruthy();
    expect(output.expiresAt).toBeTruthy();
  });

  test('rejects for non-existent dog', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(GENERATE_UPLOAD_URL, {
      dogId: '00000000-0000-0000-0000-000000000000',
      contentType: 'image/jpeg',
    });

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toMatch(/not found|access denied/);
  });

  test('rejects without authentication', async ({ graphql }) => {
    const res = await graphql.execute(GENERATE_UPLOAD_URL, {
      dogId: '00000000-0000-0000-0000-000000000000',
      contentType: 'image/jpeg',
    });

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toContain('Unauthorized');
  });

  test('uploads PNG with matching signature', async ({ authedGraphql, request }) => {
    const dogRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'PngDog' },
    });
    const dogId = dogRes.data!.createDog.id;

    const res = await authedGraphql.execute(GENERATE_UPLOAD_URL, {
      dogId,
      contentType: 'image/png',
    });

    expect(res.errors).toBeUndefined();
    const { url, key } = res.data!.generateDogPhotoUploadUrl;
    expect(key).toMatch(/\.png$/);

    const putRes = await request.put(url, {
      headers: { 'Content-Type': 'image/png' },
      data: PNG_1X1_BYTES,
    });

    expect(putRes.status()).toBe(200);
  });
});
