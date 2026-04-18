// Precise design tokens (v1.0)
// Derived from docs/design/Design System.html & docs/design/Precise Full App.html.
// Neutral-first iOS-philosophy palette; color only for meaning.

export const colors = {
  light: {
    background: '#f2f2f7', // grouped list floor
    surface: '#ffffff', // cards, rows, nav bar
    surfaceContainer: 'rgba(118,118,128,0.12)', // fill — secondary buttons, chips
    material: 'rgba(249,249,249,0.85)', // blurred tab bar / sheet material

    onSurface: '#000000',
    onSurfaceVariant: 'rgba(60,60,67,0.6)',
    textDisabled: 'rgba(60,60,67,0.3)',

    border: 'rgba(60,60,67,0.18)', // 0.5 px row separators

    interactive: '#0a84ff', // tint / primary CTA
    onInteractive: '#ffffff',
    success: '#30d158', // start / progress
    warning: '#ff9f0a', // streak / pace warning
    error: '#ff453a', // destructive / live pulse

    overlay: 'rgba(0,0,0,0.4)',

    // --- Deprecated aliases (kept for incremental migration) ---
    surfaceContainerHigh: 'rgba(118,118,128,0.18)',
    surfaceContainerLowest: '#ffffff',
    cardBorder: 'rgba(60,60,67,0.12)',
    primaryContainer: '#0a84ff',
  },
  dark: {
    background: '#000000',
    surface: '#1c1c1e',
    surfaceContainer: 'rgba(118,118,128,0.24)',
    material: 'rgba(22,22,23,0.85)',

    onSurface: '#ffffff',
    onSurfaceVariant: 'rgba(235,235,245,0.6)',
    textDisabled: 'rgba(235,235,245,0.3)',

    border: 'rgba(84,84,88,0.6)',

    interactive: '#0a84ff',
    onInteractive: '#ffffff',
    success: '#30d158',
    warning: '#ff9f0a',
    error: '#ff453a',

    overlay: 'rgba(0,0,0,0.6)',

    // --- Deprecated aliases ---
    surfaceContainerHigh: '#2c2c2e',
    surfaceContainerLowest: '#1c1c1e',
    cardBorder: 'rgba(84,84,88,0.4)',
    primaryContainer: '#0a84ff',
  },
} as const;

export type ColorScheme = keyof typeof colors;

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceContainer: string;
  material: string;
  onSurface: string;
  onSurfaceVariant: string;
  textDisabled: string;
  border: string;
  interactive: string;
  onInteractive: string;
  success: string;
  warning: string;
  error: string;
  overlay: string;

  // Deprecated aliases — kept for incremental migration.
  surfaceContainerHigh: string;
  surfaceContainerLowest: string;
  cardBorder: string;
  primaryContainer: string;
}

// 4-point grid. Legacy keys (xs/sm/md/lg/xl/xxl) keep their original values to
// preserve layout geometry across the 40+ existing call sites; Precise extras
// (step12, step20, step44, step60) are additive.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  step12: 12, // between sm and md — Precise row gap
  step20: 20, // between lg and xl — Precise screen padding
  step44: 44, // tap target minimum
  step60: 60, // Precise huge (section margin)
} as const;

// Six-step radius — chips 4 / small 8 / rows 12 / cards 16 / sheets 24 / phone 44
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  phone: 44,
  full: 9999,
} as const;

// Soft layered shadows — never hard
export const elevation = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  low: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  mid: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  accentStart: {
    shadowColor: '#30d158',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
} as const;

// iOS text styles — Precise scale
export const typography = {
  largeTitle: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: -0.6,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  title2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  headline: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  body: { fontSize: 17, fontWeight: '400' as const, lineHeight: 22 },
  subheadline: { fontSize: 15, fontWeight: '400' as const, lineHeight: 20 },
  footnote: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  // Tabular numeric display (Walk timer / metrics)
  numericBig: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -1.2,
  },

  // --- Deprecated aliases (kept for incremental migration) ---
  display: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
    letterSpacing: -0.6,
  },
  hero: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  h3: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
  bodyMedium: { fontSize: 17, fontWeight: '500' as const, lineHeight: 22 },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
  },
  button: { fontSize: 17, fontWeight: '600' as const, lineHeight: 22 },
} as const;
