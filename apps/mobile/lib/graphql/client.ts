import { GraphQLClient } from 'graphql-request';
import {
  createRefreshMiddleware,
  type RefreshHandler,
} from './middleware/refresh-on-401';

export const graphqlClient = new GraphQLClient(`${process.env.EXPO_PUBLIC_API_URL}/graphql`);

export function setAuthToken(token: string | null): void {
  if (token) {
    graphqlClient.setHeader('Authorization', `Bearer ${token}`);
  } else {
    graphqlClient.setHeaders({});
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
