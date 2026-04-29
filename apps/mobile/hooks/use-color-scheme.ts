import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/settings-store';

// ユーザー設定を優先し、未指定時は OS のカラースキームに追従します。
export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = useSystemColorScheme();
  const theme = useSettingsStore((s) => s.theme);

  if (theme === 'light' || theme === 'dark') {
    return theme;
  }
  return systemScheme === 'dark' ? 'dark' : 'light';
}
