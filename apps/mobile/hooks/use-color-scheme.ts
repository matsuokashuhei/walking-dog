import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settings-store';

export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = useSystemColorScheme();
  const theme = useSettingsStore((s) => s.theme);

  if (theme === 'light' || theme === 'dark') {
    return theme;
  }
  return systemScheme ?? 'light';
}
