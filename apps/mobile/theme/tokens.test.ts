import {
  colors,
  components,
  elevation,
  layout,
  materials,
  radius,
  shadow,
  spacing,
  tagColors,
  typography,
  type ColorTokens,
  type ComponentTokens,
  type LayoutTokens,
  type MaterialTokens,
  type TagColorTokens,
} from './tokens';
import {
  appleButton,
  cameraBadge,
  confirmDialogBackdrop,
  heroPhotoOverlay,
  nativeStackHeader,
} from './overrides';

describe('colors (Precise palette)', () => {
  describe('light theme', () => {
    it('uses the grouped-list floor for background', () => {
      expect(colors.light.background).toBe('#f2f2f7');
    });

    it('uses pure white for surface', () => {
      expect(colors.light.surface).toBe('#ffffff');
    });

    it('uses the iOS system fill for surfaceContainer', () => {
      expect(colors.light.surfaceContainer).toBe('rgba(118,118,128,0.12)');
    });

    it('uses the iOS blue tint for interactive', () => {
      expect(colors.light.interactive).toBe('#0a84ff');
    });

    it('exposes semantic success/warning/error accents', () => {
      expect(colors.light.success).toBe('#30d158');
      expect(colors.light.warning).toBe('#ff9f0a');
      expect(colors.light.error).toBe('#ff453a');
    });

    it('uses a 0.5 px separator-safe border alpha', () => {
      expect(colors.light.border).toBe('rgba(60,60,67,0.18)');
    });

    it('keeps deprecated surfaceContainerLowest alias for migration', () => {
      expect(colors.light.surfaceContainerLowest).toBe('#ffffff');
    });
  });

  describe('dark theme', () => {
    it('uses true black background', () => {
      expect(colors.dark.background).toBe('#000000');
    });

    it('uses iOS dark surface for cards', () => {
      expect(colors.dark.surface).toBe('#1c1c1e');
    });

    it('mirrors semantic accents across themes', () => {
      expect(colors.dark.interactive).toBe('#0a84ff');
      expect(colors.dark.success).toBe('#30d158');
      expect(colors.dark.error).toBe('#ff453a');
    });
  });
});

describe('ColorTokens interface', () => {
  it('includes the new material token', () => {
    const token: ColorTokens = colors.light;
    expect(token.material).toBeDefined();
  });

  it('includes success and warning semantic tokens', () => {
    const token: ColorTokens = colors.light;
    expect(token.success).toBeDefined();
    expect(token.warning).toBeDefined();
  });

  it('keeps deprecated aliases for migration', () => {
    const token: ColorTokens = colors.light;
    expect(token.surfaceContainerLowest).toBeDefined();
    expect(token.primaryContainer).toBeDefined();
    expect(token.cardBorder).toBeDefined();
  });
});

describe('spacing (4-point grid)', () => {
  it('preserves legacy keys for existing layouts', () => {
    expect(spacing.xs).toBe(4);
    expect(spacing.sm).toBe(8);
    expect(spacing.md).toBe(16);
    expect(spacing.lg).toBe(24);
    expect(spacing.xl).toBe(32);
    expect(spacing.xxl).toBe(48);
  });

  it('exposes Precise step values for new designs', () => {
    expect(spacing.step6).toBe(6);
    expect(spacing.step10).toBe(10);
    expect(spacing.step12).toBe(12);
    expect(spacing.step14).toBe(14);
    expect(spacing.step20).toBe(20);
    expect(spacing.step44).toBe(44);
    expect(spacing.step60).toBe(60);
  });
});

describe('radius', () => {
  it('has the six-step Precise scale', () => {
    expect(radius.sm).toBe(4);
    expect(radius.md).toBe(8);
    expect(radius.lg).toBe(12);
    expect(radius.xl).toBe(16);
    expect(radius.xxl).toBe(24);
    expect(radius.phone).toBe(44);
  });

  it('adds named tokens for the app mark and pill shapes', () => {
    expect(radius.appMark).toBe(22);
    expect(radius.pill).toBe(100);
  });

  it('keeps full: 9999 for boundless corners', () => {
    expect(radius.full).toBe(9999);
  });
});

describe('shadow', () => {
  it('exposes the interactive blue glow used by branded surfaces', () => {
    expect(shadow.primary).toBe(colors.light.interactive);
  });
});

describe('elevation', () => {
  it('has low card shadow', () => {
    expect(elevation.low.shadowRadius).toBeGreaterThan(0);
    expect(elevation.low.shadowOpacity).toBeLessThan(0.2);
  });

  it('has an accent-green shadow for the Start button', () => {
    expect(elevation.accentStart.shadowColor).toBe('#30d158');
    expect(elevation.accentStart.shadowOpacity).toBe(0.35);
    expect(elevation.accentStart.shadowRadius).toBe(60);
  });

  it('separates the circular button accent shadow from the sheet shadow', () => {
    expect(elevation.accentButton.shadowColor).toBe('#30d158');
    expect(elevation.accentButton.shadowOpacity).toBe(0.35);
    expect(elevation.accentButton.shadowRadius).toBe(36);
  });
});

describe('materials', () => {
  it('exposes light/dark material and blur tokens', () => {
    const token: MaterialTokens = materials;
    expect(token.light).toBe('rgba(249,249,249,0.85)');
    expect(token.dark).toBe('rgba(22,22,23,0.85)');
    expect(token.blur).toBe(20);
  });
});

describe('layout', () => {
  it('exposes iOS layout dimensions from the design system', () => {
    const token: LayoutTokens = layout;
    expect(token.statusBar).toBe(54);
    expect(token.navBar).toBe(44);
    expect(token.tabBar).toBe(83);
    expect(token.sidePadding).toBe(20);
    expect(token.groupGap).toBe(24);
  });
});

describe('tagColors', () => {
  it('exposes semantic tag palettes', () => {
    const token: TagColorTokens = tagColors;
    expect(token.live).toEqual({ bg: 'rgba(255,59,48,0.1)', text: '#FF453A' });
    expect(token.success).toEqual({ bg: 'rgba(48,209,88,0.14)', text: '#1F7A38' });
    expect(token.warning).toEqual({ bg: 'rgba(255,159,10,0.15)', text: '#B15E00' });
    expect(token.tint).toEqual({ bg: 'rgba(10,132,255,0.14)', text: '#0A4FA3' });
  });
});

describe('typography (iOS text styles)', () => {
  it('largeTitle is 34/41 · 700 · -0.6', () => {
    expect(typography.largeTitle.fontSize).toBe(34);
    expect(typography.largeTitle.fontWeight).toBe('700');
    expect(typography.largeTitle.lineHeight).toBe(41);
    expect(typography.largeTitle.letterSpacing).toBe(-0.6);
  });

  it('title1 is 28/34 · 700 · -0.5', () => {
    expect(typography.title1.fontSize).toBe(28);
    expect(typography.title1.letterSpacing).toBe(-0.5);
  });

  it('title2 is 22/28 · 700 · -0.4', () => {
    expect(typography.title2.fontSize).toBe(22);
    expect(typography.title2.letterSpacing).toBe(-0.4);
  });

  it('headline is 17 · 600', () => {
    expect(typography.headline.fontSize).toBe(17);
    expect(typography.headline.fontWeight).toBe('600');
  });

  it('body is 17 · 400', () => {
    expect(typography.body.fontSize).toBe(17);
    expect(typography.body.fontWeight).toBe('400');
  });

  it('footnote is 13 · 400', () => {
    expect(typography.footnote.fontSize).toBe(13);
  });

  it('numericBig is 32 · 700 · -1.2 (tabular display)', () => {
    expect(typography.numericBig.fontSize).toBe(32);
    expect(typography.numericBig.fontWeight).toBe('700');
    expect(typography.numericBig.letterSpacing).toBe(-1.2);
  });

  it('label keeps textTransform uppercase for caption chrome', () => {
    expect(typography.label.textTransform).toBe('uppercase');
  });

  it('metricLabel is 11 · 400 · uppercase (stat grid labels)', () => {
    expect(typography.metricLabel.fontSize).toBe(11);
    expect(typography.metricLabel.fontWeight).toBe('400');
    expect(typography.metricLabel.textTransform).toBe('uppercase');
  });

  it('keeps deprecated display/hero/h1 aliases pointing to Precise sizes', () => {
    expect(typography.display.fontSize).toBe(34);
    expect(typography.hero.fontSize).toBe(28);
    expect(typography.h1.fontSize).toBe(28);
  });
});

describe('components', () => {
  it('exposes button and circular button tokens', () => {
    const token: ComponentTokens = components;
    expect(token.button.height).toBe(50);
    expect(token.button.padding).toBe(22);
    expect(token.button.radius).toBe(14);
    expect(token.button.fontPrimary).toBe(typography.headline);
    expect(token.buttonCircle.size).toBe(80);
    expect(token.buttonCircle.radius).toBe(40);
    expect(token.buttonCircle.letterSpacing).toBe(1);
  });

  it('exposes row, group table, tag, icon, and progress-ring tokens', () => {
    expect(components.row).toMatchObject({
      minHeight: 44,
      paddingV: 12,
      paddingH: 16,
      gap: 10,
      fontSize: 15,
    });
    expect(components.groupTable.radius).toBe(14);
    expect(components.tag.radius).toBe(radius.pill);
    expect(components.iconTile.fillLight).toBe('rgba(118,118,128,0.12)');
    expect(components.icon.strokeWidth).toBe(1.8);
    expect(components.progressRing).toMatchObject({
      strokeWidth: 10,
      lineCap: 'round',
      rotation: -90,
    });
  });
});

describe('intentional overrides', () => {
  it('collects non-theme values with names and rationale', () => {
    expect(heroPhotoOverlay.text).toBe('#ffffff');
    expect(heroPhotoOverlay.textShadow).toBe('rgba(0,0,0,0.3)');
    expect(appleButton.background.light).toBe('#000000');
    expect(appleButton.text.dark).toBe('#000000');
    expect(nativeStackHeader.transparentBackground).toBe('transparent');
    expect(confirmDialogBackdrop).toBe('rgba(0,0,0,0.5)');
    expect(cameraBadge.radius).toBe(cameraBadge.size / 2);
  });
});
