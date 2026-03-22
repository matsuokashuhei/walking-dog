import { graphqlClient } from '../graphql/client';
import {
  SIGN_UP_MUTATION,
  CONFIRM_SIGN_UP_MUTATION,
  SIGN_IN_MUTATION,
  SIGN_OUT_MUTATION,
} from '../graphql/mutations';

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
