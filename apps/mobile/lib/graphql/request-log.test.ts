import { logReproducibleRequest } from './request-log';

const endpoint = 'http://localhost:3000/graphql';
const document = 'query Me { me { id name } }';

const env = process.env as { NODE_ENV?: string };
const originalNodeEnv = env.NODE_ENV;

let logSpy: jest.SpyInstance;

beforeEach(() => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  env.NODE_ENV = 'development';
});

afterEach(() => {
  logSpy.mockRestore();
  env.NODE_ENV = originalNodeEnv;
});

describe('logReproducibleRequest', () => {
  it('does nothing in production builds', () => {
    env.NODE_ENV = 'production';

    logReproducibleRequest({
      endpoint,
      document,
      operationKind: 'query',
      operationName: 'Me',
    });

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs a reproducible request block in development', () => {
    logReproducibleRequest({
      endpoint,
      document,
      variables: { id: 'user-id' },
      operationKind: 'query',
      operationName: 'Me',
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain(`reproduce query Me`);
    expect(output).toContain(`POST ${endpoint}`);
    expect(output).toContain(`curl -sS '${endpoint}'`);
    expect(output).toContain(`-d '`);
    expect(output).toContain('query Me { me { id name } }');
    expect(output).toContain('"id": "user-id"');
  });

  it('renders "(none)" when there are no variables', () => {
    logReproducibleRequest({
      endpoint,
      document,
      operationKind: 'query',
      operationName: 'Me',
    });

    const output = logSpy.mock.calls[0][0] as string;
    expect(output).toContain('variables:');
    expect(output).toContain('(none)');
    // The body sent for a variable-less request has no `variables` key.
    expect(output).toContain(`-d '${JSON.stringify({ query: document })}'`);
  });

  it('never logs an actual Authorization token, only a placeholder', () => {
    logReproducibleRequest({
      endpoint,
      document,
      operationKind: 'query',
      operationName: 'Me',
    });

    const output = logSpy.mock.calls[0][0] as string;
    // The `$TOKEN` placeholder is allowed; a real bearer value would not be.
    expect(output).toContain('$TOKEN');
    expect(output).not.toMatch(/Bearer (?!\$TOKEN)\S/);
  });

  it('shell-escapes single quotes in the curl -d payload', () => {
    logReproducibleRequest({
      endpoint,
      document,
      variables: { name: "O'Brien" },
      operationKind: 'mutation',
      operationName: 'UpdateUser',
    });

    const output = logSpy.mock.calls[0][0] as string;
    // JSON body contains "name":"O'Brien"; the single quote must be escaped as '\''.
    expect(output).toContain(`'\\''`);
    expect(output).not.toContain(`"name":"O'Brien"`);
  });
});
