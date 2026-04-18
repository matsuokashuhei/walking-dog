import { ClientError } from 'graphql-request';
import { createRefreshMiddleware } from './refresh-on-401';

function makeClientError(status: number): ClientError {
  return new ClientError(
    { status, headers: new Headers(), errors: [], body: '' },
    { query: '' },
  );
}

describe('createRefreshMiddleware', () => {
  it('returns result when request succeeds', async () => {
    const request = jest.fn().mockResolvedValue('ok');
    const refresh = jest.fn();
    const wrap = createRefreshMiddleware(refresh);

    await expect(wrap(request)).resolves.toBe('ok');
    expect(refresh).not.toHaveBeenCalled();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-401 errors without refresh', async () => {
    const error = makeClientError(500);
    const request = jest.fn().mockRejectedValue(error);
    const refresh = jest.fn();
    const wrap = createRefreshMiddleware(refresh);

    await expect(wrap(request)).rejects.toBe(error);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('rethrows non-ClientError errors without refresh', async () => {
    const error = new Error('network down');
    const request = jest.fn().mockRejectedValue(error);
    const refresh = jest.fn();
    const wrap = createRefreshMiddleware(refresh);

    await expect(wrap(request)).rejects.toBe(error);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes and retries on 401', async () => {
    const error = makeClientError(401);
    const request = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('retry-ok');
    const refresh = jest.fn().mockResolvedValue(true);
    const wrap = createRefreshMiddleware(refresh);

    await expect(wrap(request)).resolves.toBe('retry-ok');
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('rethrows original 401 when refresh fails', async () => {
    const error = makeClientError(401);
    const request = jest.fn().mockRejectedValue(error);
    const refresh = jest.fn().mockResolvedValue(false);
    const wrap = createRefreshMiddleware(refresh);

    await expect(wrap(request)).rejects.toBe(error);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent 401s into single refresh', async () => {
    const error = makeClientError(401);
    const request = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('a')
      .mockResolvedValueOnce('b')
      .mockResolvedValueOnce('c');

    let resolveRefresh!: (v: boolean) => void;
    const refresh = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const wrap = createRefreshMiddleware(refresh);

    const p1 = wrap(request);
    const p2 = wrap(request);
    const p3 = wrap(request);

    await Promise.resolve();
    await Promise.resolve();

    resolveRefresh(true);

    await expect(Promise.all([p1, p2, p3])).resolves.toEqual(['a', 'b', 'c']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('allows a new refresh after previous one completed', async () => {
    const error = makeClientError(401);
    const request = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('first')
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('second');
    const refresh = jest.fn().mockResolvedValue(true);
    const wrap = createRefreshMiddleware(refresh);

    await expect(wrap(request)).resolves.toBe('first');
    await expect(wrap(request)).resolves.toBe('second');
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
