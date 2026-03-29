import { GraphQLClient, ClientError } from 'graphql-request';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:3000';

export const graphqlClient = new GraphQLClient(`${API_URL}/graphql`);

export function setAuthToken(token: string | null): void {
  if (token) {
    graphqlClient.setHeader('Authorization', `Bearer ${token}`);
  } else {
    graphqlClient.setHeader('Authorization', '');
  }
}

let refreshPromise: Promise<boolean> | null = null;

export async function authenticatedRequest<T>(
  document: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  try {
    return await graphqlClient.request<T>(document, variables);
  } catch (error) {
    if (!(error instanceof ClientError) || error.response.status !== 401) {
      throw error;
    }

    const { useAuthStore } = await import('@/stores/auth-store');

    if (!refreshPromise) {
      refreshPromise = useAuthStore.getState().refreshAuth().finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (!refreshed) throw error;

    return await graphqlClient.request<T>(document, variables);
  }
}
