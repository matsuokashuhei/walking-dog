import { test, expect } from './helpers/fixtures';
import { GraphQLClient } from './helpers/graphql-client';
import { registerAndSignIn } from './helpers/auth';

const CREATE_DOG = `
  mutation CreateDog($input: CreateDogInput!) {
    createDog(input: $input) {
      id name breed gender birthDate { year month day } photoUrl createdAt
    }
  }
`;

const GET_DOG = `
  query Dog($id: ID!) {
    dog(id: $id) {
      id name breed gender birthDate { year month day } photoUrl createdAt
    }
  }
`;

const UPDATE_DOG = `
  mutation UpdateDog($id: ID!, $input: UpdateDogInput!) {
    updateDog(id: $id, input: $input) {
      id name breed gender
    }
  }
`;

const DELETE_DOG = `
  mutation DeleteDog($id: ID!) {
    deleteDog(id: $id)
  }
`;

const ME_WITH_DOGS = `
  query Me {
    me { id dogs { id name } }
  }
`;

test.describe('createDog', () => {
  test('creates a dog with name only', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'Pochi' },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.createDog.id).toBeTruthy();
    expect(res.data!.createDog.name).toBe('Pochi');
    expect(res.data!.createDog.breed).toBeNull();
    expect(res.data!.createDog.createdAt).toBeTruthy();
  });

  test('creates a dog with all fields', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(CREATE_DOG, {
      input: {
        name: 'Hachi',
        breed: 'Akita',
        gender: 'male',
        birthDate: { year: 2023, month: 5, day: 15 },
      },
    });

    expect(res.errors).toBeUndefined();
    const dog = res.data!.createDog;
    expect(dog.name).toBe('Hachi');
    expect(dog.breed).toBe('Akita');
    expect(dog.gender).toBe('male');
    expect(dog.birthDate).toEqual({ year: 2023, month: 5, day: 15 });
  });

  test('rejects without authentication', async ({ graphql }) => {
    const res = await graphql.execute(CREATE_DOG, {
      input: { name: 'Unauthorized Dog' },
    });

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toContain('Unauthorized');
  });
});

test.describe('dog query', () => {
  test('returns a created dog by ID', async ({ authedGraphql }) => {
    const createRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'Shiro', breed: 'Shiba' },
    });
    const dogId = createRes.data!.createDog.id;

    const res = await authedGraphql.execute(GET_DOG, { id: dogId });

    expect(res.errors).toBeUndefined();
    expect(res.data!.dog.id).toBe(dogId);
    expect(res.data!.dog.name).toBe('Shiro');
    expect(res.data!.dog.breed).toBe('Shiba');
  });

  test('returns null for non-existent dog', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(GET_DOG, {
      id: '00000000-0000-0000-0000-000000000000',
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.dog).toBeNull();
  });
});

test.describe('updateDog', () => {
  test('updates dog name and breed', async ({ authedGraphql }) => {
    const createRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'Old Name', breed: 'Old Breed' },
    });
    const dogId = createRes.data!.createDog.id;

    const res = await authedGraphql.execute(UPDATE_DOG, {
      id: dogId,
      input: { name: 'New Name', breed: 'New Breed' },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.updateDog.name).toBe('New Name');
    expect(res.data!.updateDog.breed).toBe('New Breed');
  });

  test('rejects update for another user\'s dog', async ({ authedGraphql, request }) => {
    // Create a dog with the first user
    const createRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'My Dog' },
    });
    const dogId = createRes.data!.createDog.id;

    // Create a second user
    const baseURL = process.env.API_BASE_URL ?? 'http://api:3000';
    const otherClient = new GraphQLClient(request, baseURL);
    await registerAndSignIn(otherClient);

    const res = await otherClient.execute(UPDATE_DOG, {
      id: dogId,
      input: { name: 'Stolen Dog' },
    });

    expect(res.errors).toBeDefined();
  });
});

test.describe('deleteDog', () => {
  test('deletes a dog', async ({ authedGraphql }) => {
    const createRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'ToDelete' },
    });
    const dogId = createRes.data!.createDog.id;

    const deleteRes = await authedGraphql.execute(DELETE_DOG, { id: dogId });
    expect(deleteRes.errors).toBeUndefined();
    expect(deleteRes.data!.deleteDog).toBe(true);

    // Verify it no longer exists
    const getRes = await authedGraphql.execute(GET_DOG, { id: dogId });
    expect(getRes.data!.dog).toBeNull();
  });

  test('rejects deletion of non-existent dog', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(DELETE_DOG, {
      id: '00000000-0000-0000-0000-000000000000',
    });

    expect(res.errors).toBeDefined();
  });

  test('rejects deletion of another user\'s dog', async ({ authedGraphql, request }) => {
    // Create a dog with the first user
    const createRes = await authedGraphql.execute(CREATE_DOG, {
      input: { name: 'Protected Dog' },
    });
    const dogId = createRes.data!.createDog.id;

    // Create a second user
    const baseURL = process.env.API_BASE_URL ?? 'http://api:3000';
    const otherClient = new GraphQLClient(request, baseURL);
    await registerAndSignIn(otherClient);

    const res = await otherClient.execute(DELETE_DOG, { id: dogId });

    expect(res.errors).toBeDefined();

    // Verify the dog still exists for the original user
    const getRes = await authedGraphql.execute(GET_DOG, { id: dogId });
    expect(getRes.data!.dog).not.toBeNull();
    expect(getRes.data!.dog.name).toBe('Protected Dog');
  });
});

test.describe('me.dogs', () => {
  test('returns list of user\'s dogs', async ({ authedGraphql }) => {
    await authedGraphql.execute(CREATE_DOG, { input: { name: 'Dog A' } });
    await authedGraphql.execute(CREATE_DOG, { input: { name: 'Dog B' } });

    const res = await authedGraphql.execute(ME_WITH_DOGS);

    expect(res.errors).toBeUndefined();
    expect(res.data!.me.dogs).toHaveLength(2);
    const names = res.data!.me.dogs.map((d: any) => d.name).sort();
    expect(names).toEqual(['Dog A', 'Dog B']);
  });
});
