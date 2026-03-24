import * as fs from 'fs';
import type { GraphQLClient } from './graphql-client';

const COGNITO_DB_PATH =
  process.env.COGNITO_DB_PATH ?? '/cognito-db/local_2yovNmW0.json';

const DEFAULT_PASSWORD = 'TestPass123!';

export function uniqueEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

export async function getConfirmationCode(email: string): Promise<string> {
  const maxRetries = 10;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const data = JSON.parse(fs.readFileSync(COGNITO_DB_PATH, 'utf-8'));
      for (const user of Object.values(data.Users) as any[]) {
        const userEmail = user.Attributes?.find(
          (a: any) => a.Name === 'email',
        )?.Value;
        if (userEmail === email && user.ConfirmationCode) {
          return user.ConfirmationCode;
        }
      }
    } catch {
      // JSON may be partially written by cognito-local; retry
    }
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Confirmation code not found for ${email}`);
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  email: string;
  password: string;
}

export async function registerAndSignIn(
  client: GraphQLClient,
  email?: string,
  password?: string,
): Promise<AuthResult> {
  const e = email ?? uniqueEmail();
  const p = password ?? DEFAULT_PASSWORD;

  // signUp
  await client.execute(
    `mutation SignUp($input: SignUpInput!) {
      signUp(input: $input) { success userConfirmed }
    }`,
    { input: { email: e, password: p, displayName: 'Test User' } },
  );

  // confirmSignUp
  const code = await getConfirmationCode(e);
  await client.execute(
    `mutation ConfirmSignUp($input: ConfirmSignUpInput!) {
      confirmSignUp(input: $input)
    }`,
    { input: { email: e, code } },
  );

  // signIn
  const res = await client.execute<{
    signIn: { accessToken: string; refreshToken: string };
  }>(
    `mutation SignIn($input: SignInInput!) {
      signIn(input: $input) { accessToken refreshToken }
    }`,
    { input: { email: e, password: p } },
  );

  const { accessToken, refreshToken } = res.data!.signIn;
  client.setToken(accessToken);

  return { accessToken, refreshToken, email: e, password: p };
}
