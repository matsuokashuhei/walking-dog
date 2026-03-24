import { test, expect } from './helpers/fixtures';

const CREATE_DOG = `
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) { id }
  }
`;

const GENERATE_UPLOAD_URL = `
  mutation GenerateDogPhotoUploadUrl($dogId: ID!) {
    generateDogPhotoUploadUrl(dogId: $dogId) {
      url key expiresAt
    }
  }
`;

test.describe('generateDogPhotoUploadUrl', () => {
  test('returns presigned URL', async ({ authedGraphql }) => {
    const dogRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'PhotoDog' },
    });
    const dogId = dogRes.data!.createDog.id;

    const res = await authedGraphql.execute(GENERATE_UPLOAD_URL, { dogId });

    expect(res.errors).toBeUndefined();
    const output = res.data!.generateDogPhotoUploadUrl;
    expect(output.url).toBeTruthy();
    expect(output.key).toBeTruthy();
    expect(output.expiresAt).toBeTruthy();
  });

  test('rejects for non-existent dog', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(GENERATE_UPLOAD_URL, {
      dogId: '00000000-0000-0000-0000-000000000000',
    });

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toContain('Dog not found');
  });

  test('rejects without authentication', async ({ graphql }) => {
    const res = await graphql.execute(GENERATE_UPLOAD_URL, {
      dogId: '00000000-0000-0000-0000-000000000000',
    });

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toContain('Unauthorized');
  });
});
