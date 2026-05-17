import type * as ClientModule from './client';
import { ClientError } from './client-error';

const mutation = 'mutation UpdateDog($input: UpdateDogInput!) { updateDog(input: $input) { id } }';
const successfulResponse = { data: { updateDog: { id: 'dog-1' } } };
const uploadFile = {
  uri: 'file:///avatar.jpg',
  name: 'avatar.jpg',
  type: 'image/jpeg',
};

const mockFetch = jest.fn();
const originalFetch = global.fetch;
const originalFormData = global.FormData;

beforeAll(() => {
  global.fetch = mockFetch;
  global.FormData = class TestFormData {
    _parts: MultipartPart[] = [];

    append(name: string, value: unknown) {
      this._parts.push([name, value]);
    }
  } as unknown as typeof FormData;
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const {
  authenticatedMultipartRequest,
  setAuthToken,
  setRefreshHandler,
} = require('./client') as typeof ClientModule;

type MultipartPart = [string, unknown];

function createJsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getFetchOptions(): RequestInit {
  return mockFetch.mock.calls[0][1] as RequestInit;
}

function getFormDataPart(body: BodyInit | null | undefined, name: string): unknown {
  const formData = body as FormData & {
    _parts?: MultipartPart[];
    get?: (key: string) => FormDataEntryValue | null;
  };

  if (Array.isArray(formData._parts)) {
    return formData._parts.find(([partName]) => partName === name)?.[1];
  }

  return formData.get?.(name);
}

afterEach(() => {
  setAuthToken(null);
  setRefreshHandler(() => Promise.resolve(false));
  mockFetch.mockReset();
});

afterAll(() => {
  global.fetch = originalFetch;
  global.FormData = originalFormData;
  jest.restoreAllMocks();
});

describe('authenticatedMultipartRequest', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(createJsonResponse(successfulResponse));
  });

  it('builds graphql-multipart-request-spec FormData with null-injected operations and map', async () => {
    await authenticatedMultipartRequest(
      mutation,
      {
        input: {
          id: 'dog-1',
          name: 'Buddy',
          avatar: uploadFile,
        },
      },
      { 'variables.input.avatar': uploadFile },
    );

    const body = getFetchOptions().body;
    expect(getFormDataPart(body, 'operations')).toBe(
      JSON.stringify({
        query: mutation,
        variables: {
          input: {
            id: 'dog-1',
            name: 'Buddy',
            avatar: null,
          },
        },
      }),
    );
    expect(getFormDataPart(body, 'map')).toBe(
      JSON.stringify({ '0': ['variables.input.avatar'] }),
    );
    expect(getFormDataPart(body, '0')).toEqual(uploadFile);
  });

  it('does not set Content-Type manually and keeps Authorization when authenticated', async () => {
    setAuthToken('access-token');

    await authenticatedMultipartRequest(
      mutation,
      { input: { id: 'dog-1', avatar: uploadFile } },
      { 'variables.input.avatar': uploadFile },
    );

    expect(getFetchOptions().headers).toEqual({
      Authorization: 'Bearer access-token',
    });
  });

  it('returns response data', async () => {
    await expect(
      authenticatedMultipartRequest(
        mutation,
        { input: { id: 'dog-1', avatar: uploadFile } },
        { 'variables.input.avatar': uploadFile },
      ),
    ).resolves.toEqual(successfulResponse.data);
  });

  it('keeps GraphQL error details from a successful HTTP response body', async () => {
    const result = { errors: [{ message: 'Invalid avatar' }] };
    mockFetch.mockResolvedValue(createJsonResponse(result));

    const errorPromise = authenticatedMultipartRequest(
      mutation,
      { input: { id: 'dog-1', avatar: uploadFile } },
      { 'variables.input.avatar': uploadFile },
    );

    await expect(errorPromise).rejects.toBeInstanceOf(ClientError);
    await expect(errorPromise).rejects.toMatchObject({
      response: {
        status: 200,
        body: JSON.stringify(result),
        errors: [expect.objectContaining({ message: 'Invalid avatar' })],
      },
      request: {
        query: mutation,
        variables: { input: { id: 'dog-1', avatar: uploadFile } },
      },
    });
  });

  it('keeps GraphQL error details from a failed HTTP response body', async () => {
    const result = { errors: [{ message: 'Unauthorized' }] };
    mockFetch.mockResolvedValue(createJsonResponse(result, 401));

    const errorPromise = authenticatedMultipartRequest(
      mutation,
      { input: { id: 'dog-1', avatar: uploadFile } },
      { 'variables.input.avatar': uploadFile },
    );

    await expect(errorPromise).rejects.toBeInstanceOf(ClientError);
    await expect(errorPromise).rejects.toMatchObject({
      response: {
        status: 401,
        body: JSON.stringify(result),
        errors: [expect.objectContaining({ message: 'Unauthorized' })],
      },
      request: {
        query: mutation,
        variables: { input: { id: 'dog-1', avatar: uploadFile } },
      },
    });
  });

  it('retries through the refresh middleware after a 401 refresh succeeds', async () => {
    const refresh = jest.fn().mockResolvedValue(true);
    setRefreshHandler(refresh);
    mockFetch
      .mockResolvedValueOnce(createJsonResponse({ errors: [{ message: 'Unauthorized' }] }, 401))
      .mockResolvedValueOnce(createJsonResponse(successfulResponse));

    await expect(
      authenticatedMultipartRequest(
        mutation,
        { input: { id: 'dog-1', avatar: uploadFile } },
        { 'variables.input.avatar': uploadFile },
      ),
    ).resolves.toEqual(successfulResponse.data);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
