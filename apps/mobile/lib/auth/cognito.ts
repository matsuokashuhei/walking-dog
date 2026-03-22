import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
  type IAuthenticationCallback,
} from 'amazon-cognito-identity-js';
import Constants from 'expo-constants';

function getPool(): CognitoUserPool {
  const { cognitoUserPoolId, cognitoClientId, cognitoEndpointUrl } =
    Constants.expoConfig?.extra ?? {};

  return new CognitoUserPool({
    UserPoolId: cognitoUserPoolId as string,
    ClientId: cognitoClientId as string,
    // endpoint option routes requests to cognito-local in dev
    ...(cognitoEndpointUrl ? { endpoint: cognitoEndpointUrl as string } : {}),
  });
}

export interface SignInResult {
  idToken: string;
  refreshToken: string;
}

export function signIn(email: string, password: string): Promise<SignInResult> {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const user = new CognitoUser({ Username: email, Pool: pool });
    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const callbacks: IAuthenticationCallback = {
      onSuccess: (session) => {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => reject(err),
    };

    user.authenticateUser(authDetails, callbacks);
  });
}

export function signUp(
  email: string,
  password: string,
  displayName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const attributes = [
      new CognitoUserAttribute({ Name: 'name', Value: displayName }),
    ];
    pool.signUp(email, password, attributes, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function confirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const pool = getPool();
    const user = new CognitoUser({ Username: email, Pool: pool });
    user.confirmRegistration(code, true, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

export function signOut(): void {
  const pool = getPool();
  const user = pool.getCurrentUser();
  user?.signOut();
}
