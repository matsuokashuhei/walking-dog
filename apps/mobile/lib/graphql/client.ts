import { GraphQLClient } from 'graphql-request';
import {
  createRefreshMiddleware,
  type RefreshHandler,
} from './middleware/refresh-on-401';

export const graphqlClient = new GraphQLClient(`${process.env.EXPO_PUBLIC_API_URL}/graphql`);

function removeAuthorizationHeader(headers: HeadersInit): HeadersInit {
  if (headers instanceof Headers) {
    const nextHeaders = new Headers(headers);
    nextHeaders.delete('Authorization');
    return nextHeaders;
  }

  if (Array.isArray(headers)) {
    return headers.filter(([key]) => key.toLowerCase() !== 'authorization');
  }

  return Object.fromEntries(
    Object.entries(headers).filter(([key]) => key.toLowerCase() !== 'authorization')
  );
}

export function setAuthToken(token: string | null): void {
  if (token) {
    graphqlClient.setHeader('Authorization', `Bearer ${token}`);
    return;
  }

  const { headers } = graphqlClient.requestConfig;
  if (!headers) return;

  if (typeof headers === 'function') {
    graphqlClient.requestConfig.headers = () => removeAuthorizationHeader(headers());
    return;
  }

  graphqlClient.requestConfig.headers = removeAuthorizationHeader(headers);
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
