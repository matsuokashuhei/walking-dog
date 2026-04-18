import { GraphQLClient } from 'graphql-request';
import Constants from 'expo-constants';
import {
  createRefreshMiddleware,
  type RefreshHandler,
} from './middleware/refresh-on-401';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

export const graphqlClient = new GraphQLClient(`${API_URL}/graphql`);

export function setAuthToken(token: string | null): void {
  if (token) {
    graphqlClient.setHeader('Authorization', `Bearer ${token}`);
  } else {
    graphqlClient.setHeader('Authorization', '');
  }
}

let wrap: ReturnType<typeof createRefreshMiddleware> | null = null;

export function setRefreshHandler(handler: RefreshHandler): void {
  wrap = createRefreshMiddleware(handler);
}

export async function authenticatedRequest<T>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const request = () => graphqlClient.request<T>(document, variables);
  return wrap ? wrap(request) : request();
}
