import { GraphQLError } from 'graphql';
import { File as ExpoFile } from 'expo-file-system';
import { ClientError, type GraphQLResponse } from './client-error';
import {
  createRefreshMiddleware,
  type RefreshHandler,
} from './middleware/refresh-on-401';
import { logReproducibleRequest } from './request-log';

export type Variables = Record<string, unknown>;
export type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

type GraphQLResult = {
  data?: unknown;
  errors?: readonly unknown[];
  extensions?: unknown;
};
type MultipartOperations = {
  query: string;
  variables?: Variables;
};
type MultipartUploadPart = UploadFile & {
  bytes: () => Promise<Uint8Array>;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneGraphQLValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(cloneGraphQLValue);
  }

  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, cloneGraphQLValue(child)]),
    );
  }

  return value;
}

function setPathValue(root: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  if (parts.some((part) => part.length === 0)) {
    throw new Error(`Invalid upload variable path: ${path}`);
  }

  let current = root;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
      return;
    }

    const next = current[part];
    if (next === undefined) {
      const child: Record<string, unknown> = {};
      current[part] = child;
      current = child;
      return;
    }

    if (!isRecord(next)) {
      throw new Error(`Cannot inject upload variable at ${path}`);
    }

    current = next;
  });
}

function createMultipartOperations(
  document: string,
  variables: Variables | undefined,
  fileMap: Record<string, UploadFile>,
): MultipartOperations {
  const operations: MultipartOperations = {
    query: document,
    ...(variables ? { variables: cloneGraphQLValue(variables) as Variables } : {}),
  };

  for (const variablePath of Object.keys(fileMap)) {
    setPathValue(operations as Record<string, unknown>, variablePath, null);
  }

  return operations;
}

function createMultipartBody(
  document: string,
  variables: Variables | undefined,
  fileMap: Record<string, UploadFile>,
): FormData {
  const body = new FormData();
  const operations = createMultipartOperations(document, variables, fileMap);
  const map: Record<string, string[]> = {};

  body.append('operations', JSON.stringify(operations));

  Object.entries(fileMap).forEach(([variablePath], index) => {
    const key = String(index);
    map[key] = [variablePath];
  });

  body.append('map', JSON.stringify(map));

  Object.values(fileMap).forEach((file, index) => {
    body.append(String(index), createMultipartUploadPart(file) as unknown as Blob);
  });

  return body;
}

function createMultipartUploadPart(file: UploadFile): MultipartUploadPart {
  const source = new ExpoFile(file.uri) as unknown as {
    bytes: () => Promise<Uint8Array>;
  };

  return {
    uri: file.uri,
    name: file.name,
    type: file.type,
    bytes: () => source.bytes(),
  };
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

async function readGraphQLResponse<T>(
  response: Response,
  query: string,
  variables: Variables | undefined,
  operation: { kind: string; name: string },
  startedAt: number,
): Promise<T> {
  const elapsedMs = Date.now() - startedAt;

  if (!response.ok) {
    console.warn(
      `[graphql] ← ${operation.kind} ${operation.name} ${response.status} (${elapsedMs}ms)`,
    );
    throw await createClientErrorFromResponse(response, query, variables);
  }

  const body = await response.text();
  const parsedBody = parseResponseBodySafely(body);

  if (parsedBody.errors?.length) {
    console.warn(
      `[graphql] ← ${operation.kind} ${operation.name} ${response.status} with ${parsedBody.errors.length} errors (${elapsedMs}ms)`,
    );
    throw createClientErrorFromBody(response, query, body, variables);
  }

  console.log(
    `[graphql] ← ${operation.kind} ${operation.name} ${response.status} ok (${elapsedMs}ms)`,
  );
  return parsedBody.data as T;
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

export async function authenticatedMultipartRequest<T>(
  document: string,
  variables: Variables,
  fileMap: Record<string, UploadFile>,
): Promise<T> {
  function request(): Promise<T> {
    return multipartGraphqlClient.request<T>(document, variables, fileMap);
  }

  return wrap ? wrap(request) : request();
}

export const graphqlClient = {
  async request<T>(
    document: string,
    variables?: Variables,
  ): Promise<T> {
    const op = parseOperation(document);
    const startedAt = Date.now();
    console.log(
      `[graphql] → ${op.kind} ${op.name} ${endpoint}`,
      variables ? { variableKeys: Object.keys(variables) } : '',
    );
    logReproducibleRequest({
      endpoint,
      document,
      variables,
      operationKind: op.kind,
      operationName: op.name,
    });

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

    return readGraphQLResponse<T>(response, document, variables, op, startedAt);
  },
};

export const multipartGraphqlClient = {
  async request<T>(
    document: string,
    variables: Variables,
    fileMap: Record<string, UploadFile>,
  ): Promise<T> {
    const op = parseOperation(document);
    const startedAt = Date.now();
    console.log(`[graphql] → ${op.kind} ${op.name} ${endpoint}`, {
      variableKeys: Object.keys(variables),
    });

    const headers: HeadersInit = {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    };

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: createMultipartBody(document, variables, fileMap),
      });
    } catch (err) {
      console.error(
        `[graphql] ✗ ${op.kind} ${op.name} network failure after ${Date.now() - startedAt}ms`,
        err,
      );
      throw err;
    }

    return readGraphQLResponse<T>(response, document, variables, op, startedAt);
  },
};
