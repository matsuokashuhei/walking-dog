/**
 * Photo hero text must stay legible regardless of the image palette, so these
 * overlay colors intentionally do not depend on the active theme.
 */
export const heroPhotoOverlay = {
  text: '#ffffff',
  textShadow: 'rgba(0,0,0,0.3)',
} as const;

/**
 * Apple sign-in buttons use explicit black/white brand colors rather than the
 * app surface tokens.
 */
export const appleButton = {
  background: {
    light: '#000000',
    dark: '#ffffff',
  },
  text: {
    light: '#ffffff',
    dark: '#000000',
  },
} as const;

/**
 * Native stack header options are resolved by React Navigation outside regular
 * themed StyleSheet creation, so keep their fixed native colors named here.
 */
export const nativeStackHeader = {
  tintLight: '#000000',
  tintDark: '#ffffff',
  transparentBackground: 'transparent',
  sheetCornerRadius: 24,
} as const;

/**
 * ConfirmDialog uses a stronger backdrop than the general overlay token to
 * preserve modal focus and contrast.
 */
export const confirmDialogBackdrop = 'rgba(0,0,0,0.5)';

/**
 * PhotoPicker camera affordance is sized from a single badge dimension because
 * the radius is a geometric derivative, not a reusable design token.
 */
export const cameraBadge = {
  size: 32,
  radius: 16,
} as const;
