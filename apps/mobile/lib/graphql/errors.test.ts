import { GraphQLError } from 'graphql';
import { ClientError } from './client-error';
import {
  isNetworkError,
  extractGraphQLErrorMessage,
  isUnauthorizedError,
} from './errors';

function makeClientError(status: number): ClientError {
  return new ClientError(
    { status, headers: new Headers(), errors: [], body: '' },
    { query: '' },
  );
}

function makeClientErrorWithMessage(message: string): ClientError {
  return new ClientError(
    { status: 200, headers: new Headers(), errors: [new GraphQLError(message)], body: '' },
    { query: '' },
  );
}

function makeClientErrorWithExtensionCode(code: string | number): ClientError {
  return new ClientError(
    {
      status: 200,
      headers: new Headers(),
      errors: [new GraphQLError('Access denied', { extensions: { code } })],
      body: '',
    },
    { query: '' },
  );
}

describe('isNetworkError', () => {
  it('returns true for TypeError (DNS/connection failure)', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('returns true for ClientError with 500 status', () => {
    expect(isNetworkError(makeClientError(500))).toBe(true);
  });

  it('returns true for ClientError with 503 status', () => {
    expect(isNetworkError(makeClientError(503))).toBe(true);
  });

  it('returns true for GraphQL errors with 5xx extension code', () => {
    expect(isNetworkError(makeClientErrorWithExtensionCode(503))).toBe(true);
  });

  it('returns false for ClientError with 401 status', () => {
    expect(isNetworkError(makeClientError(401))).toBe(false);
  });

  it('returns false for ClientError with 400 status', () => {
    expect(isNetworkError(makeClientError(400))).toBe(false);
  });

  it('returns false for generic Error', () => {
    expect(isNetworkError(new Error('something'))).toBe(false);
  });

  it('returns false for non-error values', () => {
    expect(isNetworkError('string')).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});

describe('extractGraphQLErrorMessage', () => {
  it('extracts message from ClientError with GraphQL errors', () => {
    const error = makeClientErrorWithMessage('Walk has expired');
    expect(extractGraphQLErrorMessage(error)).toBe('Walk has expired');
  });

  it('returns error.message from ClientError without GraphQL errors', () => {
    const error = makeClientError(500);
    expect(extractGraphQLErrorMessage(error)).toBeTruthy();
  });

  it('returns message from standard Error', () => {
    const error = new Error('Something went wrong');
    expect(extractGraphQLErrorMessage(error)).toBe('Something went wrong');
  });

  it('returns null for non-error values', () => {
    expect(extractGraphQLErrorMessage('string')).toBeNull();
    expect(extractGraphQLErrorMessage(null)).toBeNull();
    expect(extractGraphQLErrorMessage(undefined)).toBeNull();
  });
});

describe('isUnauthorizedError', () => {
  it('returns true for ClientError with HTTP 401 status', () => {
    expect(isUnauthorizedError(makeClientError(401))).toBe(true);
  });

  it('returns true for GraphQL Unauthorized errors in HTTP 200 responses', () => {
    expect(isUnauthorizedError(makeClientErrorWithMessage('Unauthorized'))).toBe(true);
  });

  it('returns true for GraphQL errors with numeric 401 extension code', () => {
    expect(isUnauthorizedError(makeClientErrorWithExtensionCode(401))).toBe(true);
  });

  it('returns true for GraphQL errors with string 401 extension code', () => {
    expect(isUnauthorizedError(makeClientErrorWithExtensionCode('401'))).toBe(true);
  });

  it('returns false for unrelated client and network errors', () => {
    expect(isUnauthorizedError(makeClientError(400))).toBe(false);
    expect(isUnauthorizedError(makeClientError(500))).toBe(false);
    expect(isUnauthorizedError(makeClientErrorWithMessage('Forbidden'))).toBe(false);
    expect(isUnauthorizedError(new TypeError('Failed to fetch'))).toBe(false);
  });
});
