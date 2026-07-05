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

  },
} as const;

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

}

export const materials = {
  light: 'rgba(249,249,249,0.85)',
  dark: 'rgba(22,22,23,0.85)',
  blur: 20,
} as const;

export type MaterialTokens = typeof materials;

// 4-point grid. Legacy keys (xs/sm/md/lg/xl/xxl) keep their original values to
// preserve layout geometry across the 40+ existing call sites; Precise extras
// (step6, step10, step12, step14, step20, step44, step60) are additive.
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,

  step6: 6, // compact inline gap
  step10: 10, // row/icon gap
  step12: 12, // between sm and md — Precise row gap
  step14: 14, // 02b inset-grouped row vertical padding (Edit dog rows)
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
  appMark: 22,
  phone: 44,
  pill: 100,
  full: 9999,
} as const;

export const shadow = {
  primary: colors.light.interactive,
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
    shadowColor: colors.light.success,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.35,
    shadowRadius: 60,
    elevation: 12,
  },
  accentButton: {
    shadowColor: colors.light.success,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 36,
    elevation: 8,
  },
} as const;

export const layout = {
  statusBar: 54,
  navBar: 44,
  largeTitleBlock: 52,
  tabBar: 83,
  safeTop: 54,
  safeBottom: 34,
  sidePadding: 20,
  contentPadding: 16,
  groupGap: 24,
} as const;

export type LayoutTokens = typeof layout;

export const tagColors = {
  live: { bg: 'rgba(255,59,48,0.1)', text: '#FF453A' },
  success: { bg: 'rgba(48,209,88,0.14)', text: '#1F7A38' },
  warning: { bg: 'rgba(255,159,10,0.15)', text: '#B15E00' },
  tint: { bg: 'rgba(10,132,255,0.14)', text: '#0A4FA3' },
  accent: { bg: 'rgba(191,90,242,0.14)', text: '#7A2FB0' },
} as const;

export type TagColorTokens = typeof tagColors;

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
  // Compact uppercase label for stat grids (Dog detail "WALKS / DISTANCE / STREAK").
  metricLabel: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase' as const,
  },
} as const;

export const components = {
  button: {
    height: 50,
    padding: 22,
    radius: 14,
    fontPrimary: typography.headline,
    fontGhost: { fontSize: 16, fontWeight: '500' as const, lineHeight: 22 },
  },
  buttonCircle: {
    size: 80,
    radius: 40,
    fontSize: 15,
    fontWeight: '700' as const,
    letterSpacing: 1,
  },
  row: {
    minHeight: 44,
    paddingV: 12,
    paddingH: 16,
    gap: 10,
    fontSize: 15,
  },
  groupTable: {
    radius: 14,
  },
  tag: {
    paddingV: 4,
    paddingH: 10,
    radius: radius.pill,
    gap: spacing.step6,
    dot: spacing.step6,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  iconTile: {
    size: 30,
    radius: 7,
    fillLight: 'rgba(118,118,128,0.12)',
    fillDark: 'rgba(118,118,128,0.24)',
  },
  icon: {
    strokeWidth: 1.8,
    viewBox: 26,
  },
  walkControls: {
    minimizeButtonSize: 32,
    minimizeIconSize: 18,
    panelPaddingBottom: 24,
  },
  walkMinimized: {
    avatarSize: 38,
    avatarOverlap: -12,
    avatarBorderWidth: 2.5,
    iconButtonSize: 38,
    iconSize: 16,
    pillPaddingV: 10,
    pillPaddingLeft: 10,
    pillPaddingRight: 14,
    pillGap: 12,
  },
  userAvatar: {
    cardSize: 60,
    displaySize: 88,
    editorSize: 100,
    cameraBadgeSize: 32,
    cameraBadgeBorderWidth: 3,
  },
  userWalkChart: {
    height: 100,
    maxBarHeight: 80,
    minBarHeight: 4,
    gap: 6,
  },
  progressRing: {
    strokeWidth: 10,
    lineCap: 'round' as const,
    rotation: -90,
  },
  metric: {
    gap: 2,
    labelFontWeight: '600' as const,
    value: {
      fontSize: 28,
      fontWeight: '700' as const,
      letterSpacing: -1,
      lineHeight: 32,
    },
    unitGap: 2,
    unitFontWeight: '500' as const,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    inputPadding: 0,
    inlineLabelWidth: 70,
  },
  oneTimePassword: {
    length: 8,
    cellWidth: 36,
    cellHeight: 56,
    cellBorderWidth: 1,
    focusedCellBorderWidth: 2,
    cellGap: 6,
  },
  birthdayPicker: {
    columnMaxHeight: 180,
  },
  segmentedControl: {
    height: 32,
    padding: 2,
    segmentRadius: 6,
    segmentPaddingH: 10,
  },
  dogAvatarEditor: {
    size: 100,
    radius: 50,
    placeholderFontSize: 40,
    pickerQuality: 0.8,
    pickerAspect: [1, 1] as const,
  },
} as const;

export type ComponentTokens = typeof components;

export const dogContactChrome = {
  circleSize: 52,
  circleRadius: 26,
  pillMinWidth: 75,
  pillHeight: 52,
  pillRadius: 27,
  pillPaddingH: 20,
  iconSize: 28,
  labelFont: {
    fontSize: 20,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  blurIntensity: 72,
  disabledOpacity: 0.45,
  deleteButtonMinHeight: 58,
  deleteButtonRadius: 24,
} as const;
