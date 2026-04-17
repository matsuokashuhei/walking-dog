import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useBleSession } from './use-ble-session';
import * as scanner from '@/lib/ble/scanner';

jest.mock('@/lib/ble/scanner', () => ({
  startScanning: jest.fn(),
  startAdvertising: jest.fn(),
}));

const mockScannerStop = jest.fn();
const mockAdvertiserStop = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (scanner.startScanning as jest.Mock).mockResolvedValue({ stop: mockScannerStop });
  (scanner.startAdvertising as jest.Mock).mockResolvedValue({ stop: mockAdvertiserStop });
});

describe('useBleSession', () => {
  it('start() calls startScanning with onDetected and startAdvertising with walkId', async () => {
    const onDetected = jest.fn();
    const { result } = renderHook(() => useBleSession());

    await act(async () => {
      await result.current.start('walk-1', onDetected);
    });

    expect(scanner.startScanning).toHaveBeenCalledWith(onDetected);
    expect(scanner.startAdvertising).toHaveBeenCalledWith('walk-1');
  });

  it('stop() calls scanner.stop and advertiser.stop after start', async () => {
    const { result } = renderHook(() => useBleSession());

    await act(async () => {
      await result.current.start('walk-1', jest.fn());
    });
    await waitFor(() => {
      expect(scanner.startAdvertising).toHaveBeenCalled();
    });

    act(() => {
      result.current.stop();
    });

    expect(mockScannerStop).toHaveBeenCalledTimes(1);
    expect(mockAdvertiserStop).toHaveBeenCalledTimes(1);
  });

  it('stop() is safe to call when never started', () => {
    const { result } = renderHook(() => useBleSession());
    expect(() => {
      act(() => {
        result.current.stop();
      });
    }).not.toThrow();
    expect(mockScannerStop).not.toHaveBeenCalled();
    expect(mockAdvertiserStop).not.toHaveBeenCalled();
  });

  it('stop() clears refs so calling twice does not re-stop', async () => {
    const { result } = renderHook(() => useBleSession());
    await act(async () => {
      await result.current.start('walk-1', jest.fn());
    });
    act(() => {
      result.current.stop();
    });
    act(() => {
      result.current.stop();
    });
    expect(mockScannerStop).toHaveBeenCalledTimes(1);
    expect(mockAdvertiserStop).toHaveBeenCalledTimes(1);
  });
});
