import { getToken, migrateLegacyTokens } from '@/lib/auth/secure-storage';
import {
  authenticatedRequest,
  setAuthToken,
  setRefreshHandler,
} from '@/lib/graphql/client';
import { isNetworkError } from '@/lib/graphql/errors';
import { ME_QUERY } from '@/lib/graphql/queries/me';

export interface BootstrapAuthResult {
  accessToken: string | null;
  isAuthenticated: boolean;
  networkError: boolean;
}

interface BootstrapAuthOptions {
  clearAuth: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

export async function bootstrapAuth({
  clearAuth,
  refreshAuth,
}: BootstrapAuthOptions): Promise<BootstrapAuthResult> {
  setRefreshHandler(() => refreshAuth());

  await migrateLegacyTokens();
  const stored = await getToken();
  if (!stored) {
    return {
      accessToken: null,
      isAuthenticated: false,
      networkError: false,
    };
  }

  setAuthToken(stored.accessToken);

  try {
    await authenticatedRequest(ME_QUERY);
    const current = await getToken();

    return {
      accessToken: current?.accessToken ?? stored.accessToken,
      isAuthenticated: true,
      networkError: false,
    };
  } catch (error) {
    if (isNetworkError(error)) {
      return {
        accessToken: null,
        isAuthenticated: false,
        networkError: true,
      };
    }

    try {
      await clearAuth();
    } catch {
      setAuthToken(null);
    }

    return {
      accessToken: null,
      isAuthenticated: false,
      networkError: false,
    };
  }
}
