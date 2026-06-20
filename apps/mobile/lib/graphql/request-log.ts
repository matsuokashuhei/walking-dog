type Variables = Record<string, unknown>;

type ReproducibleRequest = {
  endpoint: string;
  document: string;
  variables?: Variables;
  operationKind: string;
  operationName: string;
};

// Authorization is intentionally never logged — only this placeholder is shown so the
// developer knows to add the header themselves when reproducing an authenticated request.
const AUTH_HEADER_COMMENT = '# Authorization: Bearer $TOKEN  (add manually if auth is required)';
const AUTH_CURL_COMMENT = '# add when auth is required: -H "Authorization: Bearer $TOKEN"';
const REDACTED_VALUE = '[REDACTED]';

/** Wrap a value in single quotes for a POSIX shell, escaping embedded single quotes as '\''. */
function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSensitiveVariableKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    normalizedKey.includes('password') ||
    normalizedKey.includes('onetimepassword') ||
    normalizedKey === 'session' ||
    normalizedKey === 'code' ||
    normalizedKey.endsWith('code') ||
    normalizedKey === 'accesstoken' ||
    normalizedKey === 'refreshtoken'
  );
}

function redactSensitiveVariables(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveVariables);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        isSensitiveVariableKey(key) ? REDACTED_VALUE : redactSensitiveVariables(child),
      ]),
    );
  }

  return value;
}

/** Build the JSON body shown in reproduction logs. Sensitive variables may be redacted. */
function buildRequestBody(document: string, variables?: Variables): string {
  return JSON.stringify({
    query: document,
    ...(variables ? { variables } : {}),
  });
}

function buildCurl(endpoint: string, body: string): string {
  return [
    `curl -sS ${shellSingleQuote(endpoint)} \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d ${shellSingleQuote(body)}`,
    `  ${AUTH_CURL_COMMENT}`,
  ].join('\n');
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line ? pad + line : line))
    .join('\n');
}

/**
 * In development builds, log a self-contained, copy-pasteable description of a GraphQL
 * request so a developer can reproduce it in a GraphQL client (GraphiQL / Insomnia / curl).
 *
 * Emits the endpoint, headers (Authorization intentionally omitted — only a placeholder
 * comment), the query document, redacted variables, and a ready-to-run curl command.
 * Does nothing in production builds, since variables may contain PII (e.g. location track points).
 */
export function logReproducibleRequest({
  endpoint,
  document,
  variables,
  operationKind,
  operationName,
}: ReproducibleRequest): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const redactedVariables = variables
    ? (redactSensitiveVariables(variables) as Variables)
    : undefined;
  const body = buildRequestBody(document, redactedVariables);
  const curl = buildCurl(endpoint, body);
  const variablesText = redactedVariables ? JSON.stringify(redactedVariables, null, 2) : '(none)';

  const block = [
    `[graphql] ⟲ reproduce ${operationKind} ${operationName}`,
    `  endpoint: POST ${endpoint}`,
    `  headers:`,
    `    Content-Type: application/json`,
    `    ${AUTH_HEADER_COMMENT}`,
    `  query:`,
    indent(document.trim(), 4),
    `  variables:`,
    indent(variablesText, 4),
    `  curl:`,
    indent(curl, 4),
  ].join('\n');

  console.log(block);
}
