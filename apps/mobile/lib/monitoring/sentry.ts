import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

export interface SentryUser {
  id: string;
  username?: string;
}

const SENSITIVE_KEYS = ['accessToken', 'refreshToken', 'authorization', 'cookie'] as const;

type ExpoExtra = {
  sentryDsn?: string | null;
  appEnv?: string;
};

type MutableEvent = {
  request?: { data?: unknown };
  breadcrumbs?: Array<{ data?: Record<string, unknown> }>;
};

export function initSentry(): void {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  const dsn = extra.sentryDsn ?? null;
  if (!dsn) return;

  const version = Constants.expoConfig?.version ?? '0.0.0';
  const name = Constants.expoConfig?.name ?? 'walking-dog';

  Sentry.init({
    dsn,
    environment: extra.appEnv ?? 'local',
    release: `${name}@${version}`,
    tracesSampleRate: 0.1,
    enableAutoSessionTracking: true,
    beforeSend: (event) => redactSensitive(event as MutableEvent) as typeof event,
  });
}

export function setSentryUser(user: SentryUser | null): void {
  if (user === null) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: user.id, username: user.username });
}

export function captureGraphQLError(error: unknown, context?: Record<string, unknown>): void {
  if (!(error instanceof Error)) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}

export function redactSensitive<T extends MutableEvent>(event: T): T {
  const body = event.request?.data;
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const data = body as Record<string, unknown>;
    for (const key of SENSITIVE_KEYS) {
      if (key in data) {
        data[key] = '[Redacted]';
      }
    }
  }

  if (event.breadcrumbs) {
    for (const bc of event.breadcrumbs) {
      if (!bc.data) continue;
      for (const key of SENSITIVE_KEYS) {
        if (key in bc.data) {
          bc.data[key] = '[Redacted]';
        }
      }
    }
  }

  return event;
}
