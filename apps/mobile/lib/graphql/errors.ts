import { ClientError } from 'graphql-request';

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ClientError && error.response.status >= 500) return true;
  return false;
}

export function extractGraphQLErrorMessage(error: unknown): string | null {
  if (error instanceof ClientError) {
    const firstError = error.response.errors?.[0];
    if (firstError?.message) return firstError.message;
  }
  if (error instanceof Error) return error.message;
  return null;
}
