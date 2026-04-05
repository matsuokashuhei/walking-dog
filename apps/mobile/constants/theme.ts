// 後方互換シム — 新規コードは theme/tokens.ts の colors を直接使用してください
import { colors } from '@/theme/tokens';

export const Colors = {
  light: {
    text: colors.light.onSurface,
    background: colors.light.background,
    tint: colors.light.interactive,
    icon: colors.light.onSurfaceVariant,
    tabIconDefault: colors.light.onSurfaceVariant,
    tabIconSelected: colors.light.interactive,
    textSecondary: colors.light.onSurfaceVariant,
    surface: colors.light.surface,
    primary: colors.light.interactive,
    primaryLight: colors.light.surfaceContainer,
    error: colors.light.error,
    errorLight: colors.light.surfaceContainer,
    success: colors.light.onSurface,
    border: colors.light.border,
    card: colors.light.surface,
  },
  dark: {
    text: colors.dark.onSurface,
    background: colors.dark.background,
    tint: colors.dark.interactive,
    icon: colors.dark.onSurfaceVariant,
    tabIconDefault: colors.dark.onSurfaceVariant,
    tabIconSelected: colors.dark.interactive,
    textSecondary: colors.dark.onSurfaceVariant,
    surface: colors.dark.surface,
    primary: colors.dark.interactive,
    primaryLight: colors.dark.surfaceContainer,
    error: colors.dark.error,
    errorLight: colors.dark.surfaceContainer,
    success: colors.dark.onSurface,
    border: colors.dark.border,
    card: colors.dark.surface,
  },
};
