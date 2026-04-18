import { graphqlClient } from '../graphql/client';
import {
  SIGN_UP_MUTATION,
  CONFIRM_SIGN_UP_MUTATION,
  SIGN_IN_MUTATION,
  SIGN_OUT_MUTATION,
  REFRESH_TOKEN_MUTATION,
} from '../graphql/mutations/auth';

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
  confirmSignUp: boolean;
}

interface SignInResponse {
  signIn: SignInResult;
}

interface SignOutResponse {
  signOut: boolean;
}

export async function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<SignUpResult> {
  const data = await graphqlClient.request<SignUpResponse>(SIGN_UP_MUTATION, {
    input: { email, password, displayName },
  });
  return data.signUp;
}

export async function confirmSignUp(email: string, code: string): Promise<boolean> {
  const data = await graphqlClient.request<ConfirmSignUpResponse>(CONFIRM_SIGN_UP_MUTATION, {
    input: { email, code },
  });
  return data.confirmSignUp;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const data = await graphqlClient.request<SignInResponse>(SIGN_IN_MUTATION, {
    input: { email, password },
  });
  return data.signIn;
}

export async function signOut(accessToken: string): Promise<boolean> {
  const data = await graphqlClient.request<SignOutResponse>(SIGN_OUT_MUTATION, {
    accessToken,
  });
  return data.signOut;
}

interface RefreshTokenResponse {
  refreshToken: SignInResult;
}

// graphqlClient.request を直接使用する（authenticatedRequest ではなく）。
// authenticatedRequest は 401 時にこの関数を呼ぶため、使うと無限再帰になる。
export async function refreshToken(refreshTokenValue: string): Promise<SignInResult> {
  const data = await graphqlClient.request<RefreshTokenResponse>(REFRESH_TOKEN_MUTATION, {
    input: { refreshToken: refreshTokenValue },
  });
  return data.refreshToken;
}
