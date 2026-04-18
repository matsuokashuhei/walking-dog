import { renderHook } from '@testing-library/react-native';
import { useColors } from './use-colors';

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

describe('useColors', () => {
  it('returns light color tokens when scheme is light', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { result } = renderHook(() => useColors());

    expect(result.current.background).toBe('#f2f2f7');
    expect(result.current.onSurface).toBe('#000000');
  });

  it('returns dark color tokens when scheme is dark', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { result } = renderHook(() => useColors());

    expect(result.current.background).toBe('#000000');
    expect(result.current.onSurface).toBe('#ffffff');
  });

  it('returns tokens including new surfaceContainerLowest', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { result } = renderHook(() => useColors());

    expect(result.current.surfaceContainerLowest).toBe('#ffffff');
  });

  it('returns tokens including new primaryContainer', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('light');

    const { result } = renderHook(() => useColors());

    expect(result.current.primaryContainer).toBe('#0a84ff');
  });
});
