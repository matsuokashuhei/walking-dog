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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: document,
        ...(variables ? { variables } : {}),
      }),
    });

    if (!response.ok) {
      throw await createClientErrorFromResponse(response, document, variables);
    }

    const body = await response.text();
    const parsedBody = parseResponseBodySafely(body);

    if (parsedBody.errors?.length) {
      throw createClientErrorFromBody(response, document, body, variables);
    }

    return parsedBody.data as T;
  },
};
