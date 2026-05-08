import { graphqlClient, setAuthToken } from './client';

describe('graphql client auth header', () => {
  afterEach(() => {
    graphqlClient.requestConfig.headers = undefined;
  });

  it('sets the Authorization header when a token is provided', () => {
    setAuthToken('access-token');

    expect(graphqlClient.requestConfig.headers).toEqual({
      Authorization: 'Bearer access-token',
    });
  });

  it('removes only the Authorization header when the token is cleared', () => {
    graphqlClient.requestConfig.headers = {
      Authorization: 'Bearer access-token',
      'X-Trace-Id': 'trace-id',
    };

    setAuthToken(null);

    expect(graphqlClient.requestConfig.headers).toEqual({
      'X-Trace-Id': 'trace-id',
    });
  });
});
