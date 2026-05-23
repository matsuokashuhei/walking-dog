import { isUnauthorizedError } from '../errors';

export type RefreshHandler = () => Promise<boolean>;

export function createRefreshMiddleware(refresh: RefreshHandler) {
  let refreshPromise: Promise<boolean> | null = null;

  return async function wrap<T>(request: () => Promise<T>): Promise<T> {
    try {
      return await request();
    } catch (error) {
      if (!isUnauthorizedError(error)) {
        throw error;
      }
      if (!refreshPromise) {
        refreshPromise = refresh().finally(() => {
          refreshPromise = null;
        });
      }
      const refreshed = await refreshPromise;
      if (!refreshed) {
        throw error;
      }
      return await request();
    }
  };
}
