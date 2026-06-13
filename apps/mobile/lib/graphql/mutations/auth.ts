import { gql } from '../gql';

export const SIGN_UP_MUTATION = gql`
  mutation SignUp($input: SignUpInput!) {
    signUp(input: $input) {
      success
    }
  }
`;

export const CONFIRM_SIGN_UP_MUTATION = gql`
  mutation ConfirmSignUp($input: ConfirmSignUpInput!) {
    confirmSignUp(input: $input) {
      success
    }
  }
`;

export const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input) {
      success
    }
  }
`;

export const CONFIRM_FORGOT_PASSWORD_MUTATION = gql`
  mutation ConfirmForgotPassword($input: ConfirmForgotPasswordInput!) {
    confirmForgotPassword(input: $input) {
      success
    }
  }
`;

export const SIGN_IN_MUTATION = gql`
  mutation SignIn($input: SignInInput!) {
    signIn(input: $input) {
      accessToken
      refreshToken
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($input: RefreshTokenInput!) {
    refreshToken(input: $input) {
      accessToken
      refreshToken
    }
  }
`;
