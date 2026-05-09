import type { GraphQLError } from 'graphql';

export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: GraphQLError[];
  extensions?: unknown;
  status: number;
  headers: Headers;
  body: string;
}

export interface GraphQLRequestContext {
  query: string | string[];
  variables?: Record<string, unknown>;
}

export class ClientError extends Error {
  response: GraphQLResponse;
  request: GraphQLRequestContext;

  constructor(response: GraphQLResponse, request: GraphQLRequestContext) {
    const message = `${ClientError.extractMessage(response)}: ${JSON.stringify({
      response,
      request,
    })}`;
    super(message);
    this.response = response;
    this.request = request;
    Object.setPrototypeOf(this, ClientError.prototype);
  }

  private static extractMessage(response: GraphQLResponse): string {
    return response.errors?.[0]?.message ?? `GraphQL Error (Code: ${response.status})`;
  }
}
