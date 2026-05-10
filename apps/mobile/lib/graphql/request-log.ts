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

/** Wrap a value in single quotes for a POSIX shell, escaping embedded single quotes as '\''. */
function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** Build the exact JSON body that `graphqlClient.request` sends, so the curl reproduces it byte-for-byte. */
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
 * comment), the full query document, the full variables, and a ready-to-run curl command.
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

  const body = buildRequestBody(document, variables);
  const curl = buildCurl(endpoint, body);
  const variablesText = variables ? JSON.stringify(variables, null, 2) : '(none)';

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
