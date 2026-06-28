import { runDetached } from './run-detached';

describe('runDetached', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs rejected detached promises with context', async () => {
    const error = new Error('boom');
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    runDetached(Promise.reject(error), 'walk.test');
    await Promise.resolve();

    expect(consoleError).toHaveBeenCalledWith('[walk.test] failed', error);
  });

  it('ignores missing tasks from maybe-async callbacks', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => runDetached(undefined, 'walk.test')).not.toThrow();
    await Promise.resolve();

    expect(consoleError).not.toHaveBeenCalled();
  });
});
