export interface SentryUser {
  id: string;
  username?: string;
}

const SENSITIVE_KEYS = ['accessToken', 'refreshToken', 'authorization', 'cookie'] as const;

type MutableEvent = {
  request?: { data?: unknown };
  breadcrumbs?: Array<{ data?: Record<string, unknown> }>;
};

export function initSentry(): void {
  // Sentry integration is intentionally disabled in the mobile app.
}

export function setSentryUser(user: SentryUser | null): void {
  void user;
}

export function captureGraphQLError(error: unknown, context?: Record<string, unknown>): void {
  void error;
  void context;
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
