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

    expect(result.current.background).toBe('#fcf9f8');
    expect(result.current.onSurface).toBe('#1c1b1b');
  });

  it('returns dark color tokens when scheme is dark', () => {
    const { useColorScheme } = require('@/hooks/use-color-scheme');
    (useColorScheme as jest.Mock).mockReturnValue('dark');

    const { result } = renderHook(() => useColors());

    expect(result.current.background).toBe('#111111');
    expect(result.current.onSurface).toBe('#f0f0f0');
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

    expect(result.current.primaryContainer).toBe('#3c3b3b');
  });
});
