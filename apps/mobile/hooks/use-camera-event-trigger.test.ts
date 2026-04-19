import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useCameraEventTrigger } from './use-camera-event-trigger';

let addEventListenerSpy: jest.SpyInstance;

describe('useCameraEventTrigger', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    addEventListenerSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(() => ({ remove: jest.fn() }) as never);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('launches photo after a short delay when the app is already active', () => {
    const clearCameraRequest = jest.fn();
    const triggerPhoto = jest.fn();

    renderHook(() =>
      useCameraEventTrigger({
        cameraRequestedAt: 123,
        walkId: 'walk-1',
        dogId: 'dog-1',
        clearCameraRequest,
        triggerPhoto,
      }),
    );

    expect(clearCameraRequest).toHaveBeenCalledTimes(1);
  expect(addEventListenerSpy).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(149);
    });
    expect(triggerPhoto).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(triggerPhoto).toHaveBeenCalledWith('dog-1');
  });

  it('waits for the app to become active before launching the camera flow', () => {
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'background',
    });
    const clearCameraRequest = jest.fn();
    const triggerPhoto = jest.fn();
    const remove = jest.fn();
    let changeListener: ((nextState: string) => void) | undefined;

    addEventListenerSpy.mockImplementation(
      (_event: string, listener: (nextState: string) => void) => {
        changeListener = listener;
        return { remove } as never;
      },
    );

    renderHook(() =>
      useCameraEventTrigger({
        cameraRequestedAt: 456,
        walkId: 'walk-1',
        dogId: 'dog-2',
        clearCameraRequest,
        triggerPhoto,
      }),
    );

    expect(clearCameraRequest).toHaveBeenCalledTimes(1);
  expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));

    act(() => {
      changeListener?.('inactive');
      jest.advanceTimersByTime(200);
    });
    expect(triggerPhoto).not.toHaveBeenCalled();

    act(() => {
      changeListener?.('active');
      jest.advanceTimersByTime(150);
    });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(triggerPhoto).toHaveBeenCalledWith('dog-2');
  });

  it('cleans up a pending timer on unmount', () => {
    const clearCameraRequest = jest.fn();
    const triggerPhoto = jest.fn();

    const { unmount } = renderHook(() =>
      useCameraEventTrigger({
        cameraRequestedAt: 789,
        walkId: 'walk-1',
        dogId: 'dog-1',
        clearCameraRequest,
        triggerPhoto,
      }),
    );

    unmount();

    act(() => {
      jest.advanceTimersByTime(150);
    });
    expect(triggerPhoto).not.toHaveBeenCalled();
  });

  it('does nothing when there is no camera request or no active walk', () => {
    const clearCameraRequest = jest.fn();
    const triggerPhoto = jest.fn();

    renderHook(() =>
      useCameraEventTrigger({
        cameraRequestedAt: null,
        walkId: 'walk-1',
        dogId: 'dog-1',
        clearCameraRequest,
        triggerPhoto,
      }),
    );
    renderHook(() =>
      useCameraEventTrigger({
        cameraRequestedAt: 123,
        walkId: null,
        dogId: 'dog-1',
        clearCameraRequest,
        triggerPhoto,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(clearCameraRequest).not.toHaveBeenCalled();
    expect(addEventListenerSpy).not.toHaveBeenCalled();
    expect(triggerPhoto).not.toHaveBeenCalled();
  });
});
