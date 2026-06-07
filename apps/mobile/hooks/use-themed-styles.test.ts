import { renderHook } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { colors } from '@/theme/tokens';
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
      expect.objectContaining({ background: colors.light.background }),
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
      expect.objectContaining({ background: colors.dark.background }),
    );
  });

  it('recreates styles when factory reference changes', () => {
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

    // factory が deps に含まれるため、参照が変わった場合はスタイルを再生成する。
    expect(callCount).toBe(initialCallCount + 1);
  });
});
