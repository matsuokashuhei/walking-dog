import { GraphQLError } from 'graphql';
import { ClientError, type GraphQLResponse } from './client-error';
import {
  createRefreshMiddleware,
  type RefreshHandler,
} from './middleware/refresh-on-401';

type Variables = Record<string, unknown>;
type GraphQLResult = {
  data?: unknown;
  errors?: readonly unknown[];
  extensions?: unknown;
};

const endpoint = `${process.env.EXPO_PUBLIC_API_URL}/graphql`;

let authToken: string | null = null;

function toGraphQLError(error: unknown): GraphQLError {
  if (error instanceof GraphQLError) {
    return error;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message, extensions } = error as {
      message: unknown;
      extensions?: GraphQLError['extensions'];
    };

    return new GraphQLError(String(message), { extensions });
  }

  return new GraphQLError(String(error));
}

function parseGraphQLResult(result: Partial<GraphQLResult>): Partial<GraphQLResponse> {
  return {
    data: result.data,
    errors: Array.isArray(result.errors) ? result.errors.map(toGraphQLError) : undefined,
    extensions: result.extensions,
  };
}

function parseResponseBodySafely(body: string): Partial<GraphQLResponse> {
  if (!body) {
    return {};
  }

  try {
    return parseGraphQLResult(JSON.parse(body) as Partial<GraphQLResult>);
  } catch {
    return {};
  }
}

function createClientErrorFromBody(
  response: Response,
  query: string,
  body: string,
  variables?: Variables,
): ClientError {
  const parsedBody = parseResponseBodySafely(body);

  return new ClientError(
    {
      ...parsedBody,
      status: response.status,
      headers: response.headers,
      body,
    },
    {
      query,
      ...(variables ? { variables } : {}),
    },
  );
}

async function createClientErrorFromResponse(
  response: Response,
  query: string,
  variables?: Variables,
): Promise<ClientError> {
  const body = await response.clone().text();
  return createClientErrorFromBody(response, query, body, variables);
}

function parseOperation(document: string): { kind: string; name: string } {
  const m = document.match(/(query|mutation|subscription)\s+(\w+)/);
  return m ? { kind: m[1], name: m[2] } : { kind: 'query', name: 'anonymous' };
}

export function setAuthToken(token: string | null): void {
  authToken = token;
}

let wrap: ReturnType<typeof createRefreshMiddleware> | null = null;

export function setRefreshHandler(handler: RefreshHandler): void {
  wrap = createRefreshMiddleware(handler);
}

export async function authenticatedRequest<T>(
  document: string,
  variables?: Variables,
): Promise<T> {
  function request(): Promise<T> {
    return graphqlClient.request<T>(document, variables);
  }

  return wrap ? wrap(request) : request();
}

export const graphqlClient = {
  async request<T>(document: string, variables?: Variables): Promise<T> {
    const op = parseOperation(document);
    const startedAt = Date.now();
    console.log(
      `[graphql] → ${op.kind} ${op.name} ${endpoint}`,
      variables ? { variableKeys: Object.keys(variables) } : '',
    );

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: document,
          ...(variables ? { variables } : {}),
        }),
      });
    } catch (err) {
      console.error(
        `[graphql] ✗ ${op.kind} ${op.name} network failure after ${Date.now() - startedAt}ms`,
        err,
      );
      throw err;
    }

    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      console.warn(`[graphql] ← ${op.kind} ${op.name} ${response.status} (${elapsedMs}ms)`);
      throw await createClientErrorFromResponse(response, document, variables);
    }

    const body = await response.text();
    const parsedBody = parseResponseBodySafely(body);

    if (parsedBody.errors?.length) {
      console.warn(
        `[graphql] ← ${op.kind} ${op.name} ${response.status} with ${parsedBody.errors.length} errors (${elapsedMs}ms)`,
      );
      throw createClientErrorFromBody(response, document, body, variables);
    }

    console.log(`[graphql] ← ${op.kind} ${op.name} ${response.status} ok (${elapsedMs}ms)`);
    return parsedBody.data as T;
  },
};
