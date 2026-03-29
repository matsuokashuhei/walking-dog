import { ClientError } from 'graphql-request';

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ClientError && error.response.status >= 500) return true;
  return false;
}
