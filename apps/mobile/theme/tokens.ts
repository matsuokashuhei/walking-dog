export const colors = {
  light: {
    background: '#fcf9f8',
    surface: '#f6f3f2',
    surfaceContainer: '#f0edec',
    surfaceContainerHigh: '#e5e2e1',
    onSurface: '#1c1b1b',
    onSurfaceVariant: '#474747',
    textDisabled: '#adadad',
    interactive: '#000000',
    onInteractive: '#ffffff',
    border: '#c6c6c6',
    error: '#ba1a1a',
    overlay: 'rgba(0,0,0,0.4)',
  },
  dark: {
    background: '#111111',
    surface: '#1e1e1e',
    surfaceContainer: '#2a2a2a',
    surfaceContainerHigh: '#333333',
    onSurface: '#f0f0f0',
    onSurfaceVariant: '#adadad',
    textDisabled: '#5a5a5a',
    interactive: '#f0f0f0',
    onInteractive: '#111111',
    border: '#3a3a3a',
    error: '#ffb4ab',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ColorScheme = keyof typeof colors;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  onSurface: string;
  onSurfaceVariant: string;
  textDisabled: string;
  interactive: string;
  onInteractive: string;
  border: string;
  error: string;
  overlay: string;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radius = {
  sm: 6,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.8 },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
} as const;
