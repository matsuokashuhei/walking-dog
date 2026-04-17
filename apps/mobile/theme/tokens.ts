export const colors = {
  light: {
    background: '#fcf9f8',
    surface: '#f6f3f2',
    surfaceContainer: '#f0edec',
    surfaceContainerHigh: '#e5e2e1',
    surfaceContainerLowest: '#ffffff',
    onSurface: '#1c1b1b',
    onSurfaceVariant: '#474747',
    textDisabled: '#adadad',
    interactive: '#000000',
    onInteractive: '#ffffff',
    border: '#c6c6c6',
    cardBorder: '#c6c6c633',
    error: '#ba1a1a',
    overlay: 'rgba(0,0,0,0.4)',
    primaryContainer: '#3c3b3b',
  },
  dark: {
    background: '#111111',
    surface: '#1e1e1e',
    surfaceContainer: '#2a2a2a',
    surfaceContainerHigh: '#333333',
    surfaceContainerLowest: '#1a1a1a',
    onSurface: '#f0f0f0',
    onSurfaceVariant: '#adadad',
    textDisabled: '#5a5a5a',
    interactive: '#f0f0f0',
    onInteractive: '#111111',
    border: '#3a3a3a',
    cardBorder: '#3a3a3a33',
    error: '#ffb4ab',
    overlay: 'rgba(0,0,0,0.6)',
    primaryContainer: '#d4d4d4',
  },
} as const;

export type ColorScheme = keyof typeof colors;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerLowest: string;
  onSurface: string;
  onSurfaceVariant: string;
  textDisabled: string;
  interactive: string;
  onInteractive: string;
  border: string;
  cardBorder: string;
  error: string;
  overlay: string;
  primaryContainer: string;
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
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 48, fontWeight: '900' as const, lineHeight: 52, letterSpacing: -0.96 },
  hero: { fontSize: 40, fontWeight: '900' as const, lineHeight: 44, letterSpacing: -0.8 },
  h1: { fontSize: 32, fontWeight: '900' as const, lineHeight: 40, letterSpacing: -0.64 },
  h2: { fontSize: 24, fontWeight: '600' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  button: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
} as const;
