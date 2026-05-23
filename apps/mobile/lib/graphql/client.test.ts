import type * as ClientModule from './client';
import { ClientError } from './client-error';

const query = 'query Me { me { id } }';
const successfulResponse = { data: { me: { id: 'user-id' } } };

const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = mockFetch;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const { graphqlClient, setAuthToken } = require('./client') as typeof ClientModule;

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  setAuthToken(null);
  mockFetch.mockReset();
});

afterAll(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('graphql client auth header', () => {
  beforeEach(() => {
    mockFetch.mockImplementation(() => Promise.resolve(createJsonResponse(successfulResponse)));
  });

  it('sets the Authorization header when a token is provided', async () => {
    setAuthToken('access-token');

    await graphqlClient.request(query);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer access-token',
        },
      }),
    );
  });

  it('removes the Authorization header when the token is cleared', async () => {
    setAuthToken('access-token');
    await graphqlClient.request(query);

    setAuthToken(null);
    await graphqlClient.request(query);

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('omits the Authorization header when auth is disabled for a request', async () => {
    setAuthToken('expired-access-token');

    await graphqlClient.request(query, undefined, { includeAuth: false });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  it('sends variables with the GraphQL request body', async () => {
    await graphqlClient.request(query, { id: 'user-id' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          query,
          variables: { id: 'user-id' },
        }),
      }),
    );
  });

  it('returns response data', async () => {
    await expect(graphqlClient.request(query)).resolves.toEqual(successfulResponse.data);
  });
});

describe('graphql client errors', () => {
  it('keeps GraphQL error details from a successful HTTP response body', async () => {
    const variables = { id: 'user-id' };
    const result = { errors: [{ message: 'Unauthorized' }] };
    mockFetch.mockResolvedValue(createJsonResponse(result));

    const errorPromise = graphqlClient.request(query, variables);

    await expect(errorPromise).rejects.toBeInstanceOf(ClientError);
    await expect(errorPromise).rejects.toMatchObject({
      response: {
        status: 200,
        body: JSON.stringify(result),
        errors: [expect.objectContaining({ message: 'Unauthorized' })],
      },
      request: { query, variables },
    });
  });

  it('keeps GraphQL error details from a failed HTTP response body', async () => {
    const result = { errors: [{ message: 'Unauthorized' }] };
    mockFetch.mockResolvedValue(createJsonResponse(result, 401));

    const errorPromise = graphqlClient.request(query);

    await expect(errorPromise).rejects.toBeInstanceOf(ClientError);
    await expect(errorPromise).rejects.toMatchObject({
      response: {
        status: 401,
        body: JSON.stringify(result),
        errors: [expect.objectContaining({ message: 'Unauthorized' })],
      },
      request: { query },
    });
  });
});
