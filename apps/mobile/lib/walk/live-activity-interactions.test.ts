import { handleWalkActivityTarget } from './live-activity-interactions';

describe('walk live activity interactions', () => {
  it('records dog-specific activity events', async () => {
    const recordEvent = jest.fn().mockResolvedValue(undefined);
    const finishWalk = jest.fn();

    await handleWalkActivityTarget('walk:pee:dog-1', { recordEvent, finishWalk });
    await handleWalkActivityTarget('walk:poo:dog-2', { recordEvent, finishWalk });

    expect(recordEvent).toHaveBeenNthCalledWith(1, 'pee', 'dog-1');
    expect(recordEvent).toHaveBeenNthCalledWith(2, 'poo', 'dog-2');
    expect(finishWalk).not.toHaveBeenCalled();
  });

  it('finishes the active walk', async () => {
    const recordEvent = jest.fn();
    const finishWalk = jest.fn().mockResolvedValue(undefined);

    await handleWalkActivityTarget('walk:finish', { recordEvent, finishWalk });

    expect(finishWalk).toHaveBeenCalledTimes(1);
    expect(recordEvent).not.toHaveBeenCalled();
  });

  it('ignores malformed targets', async () => {
    const recordEvent = jest.fn();
    const finishWalk = jest.fn();

    await handleWalkActivityTarget('poop:dog-1', { recordEvent, finishWalk });
    await handleWalkActivityTarget('finish', { recordEvent, finishWalk });

    expect(recordEvent).not.toHaveBeenCalled();
    expect(finishWalk).not.toHaveBeenCalled();
  });
});
