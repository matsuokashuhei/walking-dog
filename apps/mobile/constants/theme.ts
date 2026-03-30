/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    textSecondary: '#687076',
    surface: '#F9FAFB',
    primary: '#0a7ea4',
    primaryLight: '#E6F4FE',
    error: '#EF4444',
    errorLight: '#FEE2E2',
    success: '#22C55E',
    border: '#E5E7EB',
    card: '#FFFFFF',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    textSecondary: '#9BA1A6',
    surface: '#1F2937',
    primary: '#38BDF8',
    primaryLight: '#1E3A5F',
    error: '#F87171',
    errorLight: '#7F1D1D',
    success: '#4ADE80',
    border: '#374151',
    card: '#1F2937',
  },
};
