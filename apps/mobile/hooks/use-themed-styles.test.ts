import { renderHook } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { useThemedStyles } from './use-themed-styles';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

describe('useThemedStyles', () => {
  it('returns styles created from factory with light theme tokens', () => {
    const factory = jest.fn((theme) => ({
      container: { backgroundColor: theme.background },
    }));

    const { result } = renderHook(() => useThemedStyles(factory));

    expect(result.current.container).toBeDefined();
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({ background: '#fcf9f8' }),
    );
  });

  it('uses custom useColorScheme hook (not react-native directly)', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const factory = jest.fn((theme) => ({
      container: { backgroundColor: theme.background },
    }));

    const { result } = renderHook(() => useThemedStyles(factory));

    expect(result.current.container).toBeDefined();
    expect(factory).toHaveBeenCalledWith(
      expect.objectContaining({ background: '#111111' }),
    );
  });

  it('does not recreate styles when factory reference changes', () => {
    let callCount = 0;

    const { rerender } = renderHook(() => {
      const factory = (theme: { background: string }) => {
        callCount++;
        return { container: { backgroundColor: theme.background } };
      };
      return useThemedStyles(factory);
    });

    const initialCallCount = callCount;
    rerender({});

    // factory が deps から除外されているため、再レンダー時にスタイル再生成されない
    // (theme が変わっていないので useMemo はキャッシュを返す)
    expect(callCount).toBe(initialCallCount);
  });
});
