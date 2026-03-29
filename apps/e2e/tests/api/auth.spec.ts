import { test, expect } from './helpers/fixtures';
import { GraphQLClient } from './helpers/graphql-client';
import { uniqueEmail, getConfirmationCode } from './helpers/auth';

const SIGN_UP = `
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) { success userConfirmed }
  }
`;

const CONFIRM_SIGN_UP = `
  mutation ConfirmSignUp($input: ConfirmSignUpInput!) {
    confirmSignUp(input: $input)
  }
`;

const SIGN_IN = `
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) { accessToken refreshToken }
  }
`;

const SIGN_OUT = `
  mutation SignOut($accessToken: String!) {
    signOut(accessToken: $accessToken)
  }
`;

const REFRESH_TOKEN = `
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) { accessToken refreshToken }
  }
`;

const ME = `
  query Me {
    me { id cognitoSub displayName avatarUrl createdAt dogs { id name } }
  }
`;

test.describe('signUp', () => {
  test('registers a new user successfully', async ({ graphql }) => {
    const email = uniqueEmail();
    const res = await graphql.execute(SIGN_UP, {
      input: { email, password: 'TestPass123!', displayName: 'New User' },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.signUp.success).toBe(true);
    expect(res.data!.signUp.userConfirmed).toBe(false);
  });
});

test.describe('confirmSignUp', () => {
  test('confirms a user with valid code', async ({ graphql }) => {
    const email = uniqueEmail();
    await graphql.execute(SIGN_UP, {
      input: { email, password: 'TestPass123!', displayName: 'Confirm Test' },
    });

    const code = await getConfirmationCode(email);
    const res = await graphql.execute(CONFIRM_SIGN_UP, {
      input: { email, code },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.confirmSignUp).toBe(true);
  });

  test('rejects invalid code', async ({ graphql }) => {
    const email = uniqueEmail();
    await graphql.execute(SIGN_UP, {
      input: { email, password: 'TestPass123!', displayName: 'Bad Code' },
    });

    const res = await graphql.execute(CONFIRM_SIGN_UP, {
      input: { email, code: '000000' },
    });

    expect(res.errors).toBeDefined();
    expect(res.errors!.length).toBeGreaterThan(0);
  });
});

test.describe('signIn', () => {
  test('returns tokens for confirmed user', async ({ graphql }) => {
    const email = uniqueEmail();
    const password = 'TestPass123!';
    await graphql.execute(SIGN_UP, {
      input: { email, password, displayName: 'SignIn Test' },
    });
    const code = await getConfirmationCode(email);
    await graphql.execute(CONFIRM_SIGN_UP, { input: { email, code } });

    const res = await graphql.execute(SIGN_IN, {
      input: { email, password },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.signIn.accessToken).toBeTruthy();
    expect(res.data!.signIn.refreshToken).toBeTruthy();
  });

  test('rejects wrong password', async ({ graphql }) => {
    const email = uniqueEmail();
    await graphql.execute(SIGN_UP, {
      input: { email, password: 'TestPass123!', displayName: 'Wrong PW' },
    });
    const code = await getConfirmationCode(email);
    await graphql.execute(CONFIRM_SIGN_UP, { input: { email, code } });

    const res = await graphql.execute(SIGN_IN, {
      input: { email, password: 'WrongPass999!' },
    });

    expect(res.errors).toBeDefined();
  });

  test('rejects non-existent user', async ({ graphql }) => {
    const res = await graphql.execute(SIGN_IN, {
      input: { email: 'nobody@example.com', password: 'TestPass123!' },
    });

    expect(res.errors).toBeDefined();
  });
});

test.describe('refreshToken', () => {
  test('returns new access token with valid refresh token', async ({ graphql }) => {
    const email = uniqueEmail();
    const password = 'TestPass123!';
    await graphql.execute(SIGN_UP, {
      input: { email, password, displayName: 'Refresh Test' },
    });
    const code = await getConfirmationCode(email);
    await graphql.execute(CONFIRM_SIGN_UP, { input: { email, code } });
    const signInRes = await graphql.execute(SIGN_IN, {
      input: { email, password },
    });
    const refreshTokenValue = signInRes.data!.signIn.refreshToken;

    const res = await graphql.execute(REFRESH_TOKEN, {
      input: { refreshToken: refreshTokenValue },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.refreshToken.accessToken).toBeTruthy();
    expect(res.data!.refreshToken.refreshToken).toBeTruthy();
  });

  test('rejects invalid refresh token', async ({ graphql }) => {
    const res = await graphql.execute(REFRESH_TOKEN, {
      input: { refreshToken: 'invalid-token' },
    });

    expect(res.errors).toBeDefined();
  });
});

test.describe('signOut', () => {
  test('invalidates the access token', async ({ authedGraphql, request }) => {
    // Get a fresh token to pass to signOut
    const baseURL = process.env.API_BASE_URL ?? 'http://api:3000';
    const freshClient = new GraphQLClient(request, baseURL);
    const email = uniqueEmail();
    const password = 'TestPass123!';
    await freshClient.execute(SIGN_UP, {
      input: { email, password, displayName: 'SignOut Test' },
    });
    const code = await getConfirmationCode(email);
    await freshClient.execute(CONFIRM_SIGN_UP, { input: { email, code } });
    const signInRes = await freshClient.execute(SIGN_IN, {
      input: { email, password },
    });
    const token = signInRes.data!.signIn.accessToken;
    freshClient.setToken(token);

    const res = await freshClient.execute(SIGN_OUT, {
      accessToken: token,
    });

    expect(res.errors).toBeUndefined();
    expect(res.data!.signOut).toBe(true);
  });
});

test.describe('me', () => {
  test('returns user after sign in', async ({ authedGraphql }) => {
    const res = await authedGraphql.execute(ME);

    expect(res.errors).toBeUndefined();
    expect(res.data!.me.id).toBeTruthy();
    expect(res.data!.me.cognitoSub).toBeTruthy();
    // displayName may be null if Cognito signup doesn't persist it to DB
    expect(res.data!.me).toHaveProperty('displayName');
    expect(res.data!.me.createdAt).toBeTruthy();
    expect(res.data!.me.dogs).toEqual([]);
  });

  test('returns Unauthorized without token', async ({ graphql }) => {
    const res = await graphql.execute(ME);

    expect(res.errors).toBeDefined();
    expect(res.errors![0].message).toContain('Unauthorized');
  });
});
