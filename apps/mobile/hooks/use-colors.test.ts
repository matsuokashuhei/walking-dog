import { renderHook } from '@testing-library/react-native';
import { colors } from '@/theme/tokens';
import { useColors } from './use-colors';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

describe('useColors', () => {
  it('returns light color tokens when scheme is light', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { result } = renderHook(() => useColors());

    expect(result.current.background).toBe(colors.light.background);
    expect(result.current.onSurface).toBe(colors.light.onSurface);
  });

  it('returns dark color tokens when scheme is dark', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { result } = renderHook(() => useColors());

    expect(result.current.background).toBe(colors.dark.background);
    expect(result.current.onSurface).toBe(colors.dark.onSurface);
  });

  it('returns semantic surface container tokens', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { result } = renderHook(() => useColors());

    expect(result.current.surfaceContainer).toBe(colors.light.surfaceContainer);
  });

  it('returns semantic interactive tokens', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { result } = renderHook(() => useColors());

    expect(result.current.interactive).toBe(colors.light.interactive);
  });
});
