import { ClientError } from '../graphql/client-error';
import { extractGraphQLErrorMessage, isNetworkError } from '../graphql/errors';

type AuthErrorKind =
  | 'invalid-credentials'
  | 'user-exists'
  | 'invalid-password'
  | 'code-mismatch'
  | 'network'
  | 'unknown';

export type AuthError =
  | { kind: 'invalid-credentials'; message?: string }
  | { kind: 'user-exists'; message?: string }
  | { kind: 'invalid-password'; message?: string }
  | { kind: 'code-mismatch'; reason: 'invalid' | 'expired'; message?: string }
  | { kind: 'network'; message?: string }
  | { kind: 'unknown'; message?: string };

const AUTH_ERROR_KINDS: AuthErrorKind[] = [
  'invalid-credentials',
  'user-exists',
  'invalid-password',
  'code-mismatch',
  'network',
  'unknown',
];

function includesAny(message: string, patterns: string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

export function isAuthError(error: unknown): error is AuthError {
  if (!error || typeof error !== 'object' || !('kind' in error)) return false;

  const kind = (error as { kind?: unknown }).kind;
  if (typeof kind !== 'string' || !AUTH_ERROR_KINDS.includes(kind as AuthErrorKind)) {
    return false;
  }

  if (kind !== 'code-mismatch') return true;

  const reason = (error as { reason?: unknown }).reason;
  return reason === 'invalid' || reason === 'expired';
}

export function toAuthError(error: unknown): AuthError {
  if (isAuthError(error)) return error;

  const message = extractGraphQLErrorMessage(error) ?? undefined;
  const normalizedMessage = message?.toUpperCase() ?? '';

  if (isNetworkError(error)) {
    return { kind: 'network', message };
  }

  if (error instanceof ClientError && error.response.status === 401) {
    return { kind: 'invalid-credentials', message };
  }

  if (
    includesAny(normalizedMessage, [
      'INVALID_CREDENTIALS',
      'AUTH_ERROR',
      'USERNOTFOUNDEXCEPTION',
      'USER_NOT_FOUND',
      'NOTAUTHORIZEDEXCEPTION',
      'NOT_AUTHORIZED',
    ])
  ) {
    return { kind: 'invalid-credentials', message };
  }

  if (includesAny(normalizedMessage, ['USER_EXISTS', 'USERNAMEEXISTSEXCEPTION'])) {
    return { kind: 'user-exists', message };
  }

  if (
    includesAny(normalizedMessage, [
      'INVALID_PASSWORD',
      'INVALIDPASSWORDEXCEPTION',
      'PASSWORDHISTORYPOLICYVIOLATIONEXCEPTION',
    ])
  ) {
    return { kind: 'invalid-password', message };
  }

  if (includesAny(normalizedMessage, ['EXPIRED_CODE', 'EXPIREDCODEEXCEPTION'])) {
    return { kind: 'code-mismatch', reason: 'expired', message };
  }

  if (includesAny(normalizedMessage, ['INVALID_CODE', 'CODE_MISMATCH', 'CODEMISMATCHEXCEPTION'])) {
    return { kind: 'code-mismatch', reason: 'invalid', message };
  }

  return { kind: 'unknown', message };
}
