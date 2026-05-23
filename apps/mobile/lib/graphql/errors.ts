import { ClientError } from './client-error';

export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error instanceof ClientError && error.response.status >= 500) return true;
  if (error instanceof ClientError) {
    const code = error.response.errors?.[0]?.extensions?.code;
    if (typeof code === 'number' && code >= 500) return true;
    if (typeof code === 'string' && Number(code) >= 500) return true;
  }
  return false;
}

export function isUnauthorizedError(error: unknown): boolean {
  if (!(error instanceof ClientError)) return false;
  if (error.response.status === 401) return true;

  const firstError = error.response.errors?.[0];
  if (firstError?.message.trim().toLowerCase() === 'unauthorized') return true;

  const code = firstError?.extensions?.code;
  return code === 401 || code === '401';
}

export function extractGraphQLErrorMessage(error: unknown): string | null {
  if (error instanceof ClientError) {
    const firstError = error.response.errors?.[0];
    if (firstError?.message) return firstError.message;
  }
  if (error instanceof Error) return error.message;
  return null;
}
