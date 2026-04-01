/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#9c4600';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#2d3432',
    background: '#f9f9f7',
    tint: tintColorLight,
    icon: '#5a605e',
    tabIconDefault: '#5a605e',
    tabIconSelected: tintColorLight,
    textSecondary: '#5a605e',
    surface: '#f2f4f2',
    primary: '#9c4600',
    primaryLight: '#ffdbc9',
    error: '#9e422c',
    errorLight: '#ffdbc9',
    success: '#22C55E',
    border: '#adb3b0',
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
