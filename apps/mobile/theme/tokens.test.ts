import { colors, radius, typography, type ColorTokens } from './tokens';

describe('colors', () => {
  describe('light theme', () => {
    it('has surfaceContainerLowest token', () => {
      expect(colors.light.surfaceContainerLowest).toBe('#ffffff');
    });

    it('has primaryContainer token', () => {
      expect(colors.light.primaryContainer).toBe('#3c3b3b');
    });
  });

  describe('dark theme', () => {
    it('has surfaceContainerLowest token', () => {
      expect(colors.dark.surfaceContainerLowest).toBe('#1a1a1a');
    });

    it('has primaryContainer token', () => {
      expect(colors.dark.primaryContainer).toBe('#d4d4d4');
    });
  });
});

describe('ColorTokens interface', () => {
  it('includes surfaceContainerLowest in light tokens', () => {
    const token: ColorTokens = colors.light;
    expect(token.surfaceContainerLowest).toBeDefined();
  });

  it('includes primaryContainer in light tokens', () => {
    const token: ColorTokens = colors.light;
    expect(token.primaryContainer).toBeDefined();
  });
});

describe('radius', () => {
  it('has sm: 4', () => {
    expect(radius.sm).toBe(4);
  });

  it('has md: 8', () => {
    expect(radius.md).toBe(8);
  });

  it('has lg: 12', () => {
    expect(radius.lg).toBe(12);
  });

  it('has full: 9999', () => {
    expect(radius.full).toBe(9999);
  });
});

describe('typography', () => {
  it('has display token with fontSize 48 and fontWeight 900', () => {
    expect(typography.display.fontSize).toBe(48);
    expect(typography.display.fontWeight).toBe('900');
    expect(typography.display.lineHeight).toBe(52);
    expect(typography.display.letterSpacing).toBe(-0.96);
  });

  it('h1 has fontWeight 900', () => {
    expect(typography.h1.fontWeight).toBe('900');
  });

  it('h1 has negative letterSpacing', () => {
    expect(typography.h1.letterSpacing).toBe(-0.64);
  });

  it('label has textTransform uppercase', () => {
    expect(typography.label.textTransform).toBe('uppercase');
  });
});
