import { graphqlClient } from '../graphql/client';
import {
  SIGN_UP_MUTATION,
  CONFIRM_SIGN_UP_MUTATION,
  SIGN_IN_MUTATION,
} from '../graphql/mutations/auth';
import { toAuthError } from './errors';

export interface SignUpResult {
  success: boolean;
  userConfirmed: boolean;
}

export interface SignInResult {
  accessToken: string;
  refreshToken: string;
}

interface SignUpResponse {
  signUp: SignUpResult;
}

interface ConfirmSignUpResponse {
  confirmSignUp: { success: boolean };
}

interface SignInResponse {
  signIn: SignInResult;
}

async function mapAuthRequestError<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw toAuthError(error);
  }
}

export async function signUp(
  email: string,
  password: string,
  _displayName: string
): Promise<SignUpResult> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<SignUpResponse>(SIGN_UP_MUTATION, {
      input: { email, password },
    })
  );
  return { ...data.signUp, userConfirmed: false };
}

export async function confirmSignUp(email: string, code: string): Promise<boolean> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<ConfirmSignUpResponse>(CONFIRM_SIGN_UP_MUTATION, {
      input: { email, code },
    })
  );
  return data.confirmSignUp.success;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const data = await mapAuthRequestError(() =>
    graphqlClient.request<SignInResponse>(SIGN_IN_MUTATION, {
      input: { email, password },
    })
  );
  return data.signIn;
}

export async function signOut(_accessToken: string): Promise<boolean> {
  return true;
}

export async function refreshToken(_refreshTokenValue: string): Promise<SignInResult> {
  throw new Error('Refresh token is not supported by the current GraphQL schema.');
}
