/* Walking Dog Precise Native Rebuild
 * Run this plugin in a blank Figma design file.
 * It creates a Starter-plan-safe 3-page file:
 * Cover + Design System, Components, and Screens.
 */

const W = 390;
const H = 844;

const COLORS = {
  canvas: '#f0eee9',
  ink: '#2a2218',
  light: {
    bg: '#f2f2f7',
    surface: '#ffffff',
    surface2: '#ffffff',
    fill: 'rgba(118,118,128,0.12)',
    material: 'rgba(255,255,255,0.72)',
    materialStrong: 'rgba(255,255,255,0.88)',
    materialBorder: 'rgba(0,0,0,0.04)',
    text: '#000000',
    text2: 'rgba(60,60,67,0.6)',
    text3: 'rgba(60,60,67,0.3)',
    sep: 'rgba(60,60,67,0.18)',
    mapLand: '#efeeea',
    mapRoad: '#ffffff',
    mapPark: '#d9ecd2',
    mapWater: '#b8d8f0',
  },
  dark: {
    bg: '#000000',
    surface: '#1c1c1e',
    surface2: '#2c2c2e',
    fill: 'rgba(118,118,128,0.24)',
    material: 'rgba(28,28,30,0.72)',
    materialStrong: 'rgba(28,28,30,0.78)',
    materialBorder: 'rgba(255,255,255,0.08)',
    text: '#ffffff',
    text2: 'rgba(235,235,245,0.6)',
    text3: 'rgba(235,235,245,0.3)',
    sep: 'rgba(84,84,88,0.6)',
    mapLand: '#2c2c2e',
    mapRoad: '#3a3a3c',
    mapPark: '#1f3a2a',
    mapWater: '#0f2d4a',
  },
  tint: '#0a84ff',
  green: '#30d158',
  red: '#ff453a',
  orange: '#ff9f0a',
  purple: '#bf5af2',
  mint: '#5eddb7',
  dogCocoA: '#f6d5a7',
  dogCocoB: '#c89968',
  dogMomoA: '#ffb56b',
  dogMomoB: '#c25a1a',
  dogBiscuitA: '#fae6a6',
  dogBiscuitB: '#b88a3a',
};

const TYPE = {
  largeTitle: { size: 34, line: 41, weight: 700, letter: -0.6 },
  title1: { size: 28, line: 34, weight: 700, letter: -0.5 },
  title2: { size: 22, line: 28, weight: 700, letter: -0.4 },
  title3: { size: 20, line: 25, weight: 700, letter: -0.4 },
  headline: { size: 17, line: 22, weight: 600, letter: 0 },
  body: { size: 17, line: 22, weight: 400, letter: 0 },
  subheadline: { size: 15, line: 20, weight: 400, letter: 0 },
  footnote: { size: 13, line: 18, weight: 400, letter: 0 },
  caption: { size: 12, line: 16, weight: 400, letter: 0 },
  metric: { size: 32, line: 34, weight: 700, letter: -1.2 },
  metricSmall: { size: 26, line: 30, weight: 700, letter: -0.8 },
  label: { size: 11, line: 14, weight: 600, letter: 0.3 },
};

const SPACING = {
  0: 0,
  4: 4,
  8: 8,
  12: 12,
  16: 16,
  20: 20,
  24: 24,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  64: 64,
};

const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  card: 16,
  sheet: 32,
  phone: 44,
  pill: 100,
};

const DOGS = {
  coco: { name: 'Coco', breed: 'Toy Poodle', emoji: '🐩', grad: [COLORS.dogCocoA, COLORS.dogCocoB] },
  momo: { name: 'Momo', breed: 'Shiba Inu', emoji: '🐕', grad: [COLORS.dogMomoA, COLORS.dogMomoB] },
  biscuit: { name: 'Biscuit', breed: 'Corgi', emoji: '🐶', grad: [COLORS.dogBiscuitA, COLORS.dogBiscuitB] },
};

let FONT_REGULAR = { family: 'Inter', style: 'Regular' };
let FONT_MEDIUM = { family: 'Inter', style: 'Medium' };
let FONT_SEMIBOLD = { family: 'Inter', style: 'Semi Bold' };
let FONT_BOLD = { family: 'Inter', style: 'Bold' };
let FONT_EXTRABOLD = { family: 'Inter', style: 'Extra Bold' };

function parseColor(input) {
  if (typeof input !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  const s = input.trim();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    const full = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: full.length >= 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1,
    };
  }
  const match = s.match(/rgba?\(([^)]+)\)/);
  if (match) {
    const parts = match[1].split(',').map((p) => p.trim());
    return {
      r: Number(parts[0]),
      g: Number(parts[1]),
      b: Number(parts[2]),
      a: parts[3] == null ? 1 : Number(parts[3]),
    };
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

function solid(input, opacity = 1) {
  const c = parseColor(input);
  return { type: 'SOLID', color: { r: c.r / 255, g: c.g / 255, b: c.b / 255 }, opacity: c.a * opacity };
}

function fill(input, opacity) {
  return [solid(input, opacity)];
}

function gradient(colors) {
  return [{
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0.707, 0.707, -0.207], [-0.707, 0.707, 0.5]],
    gradientStops: colors.map((color, index) => {
      const c = parseColor(color);
      return {
        position: colors.length === 1 ? 0 : index / (colors.length - 1),
        color: { r: c.r / 255, g: c.g / 255, b: c.b / 255, a: c.a },
      };
    }),
  }];
}

function fontFor(weight) {
  if (weight >= 800) return FONT_EXTRABOLD;
  if (weight >= 700) return FONT_BOLD;
  if (weight >= 600) return FONT_SEMIBOLD;
  if (weight >= 500) return FONT_MEDIUM;
  return FONT_REGULAR;
}

async function loadPreferredFonts() {
  const attempts = [
    {
      regular: { family: 'SF Pro Text', style: 'Regular' },
      medium: { family: 'SF Pro Text', style: 'Medium' },
      semibold: { family: 'SF Pro Text', style: 'Semibold' },
      bold: { family: 'SF Pro Display', style: 'Bold' },
      extrabold: { family: 'SF Pro Display', style: 'Heavy' },
    },
    {
      regular: { family: 'Inter', style: 'Regular' },
      medium: { family: 'Inter', style: 'Medium' },
      semibold: { family: 'Inter', style: 'Semi Bold' },
      bold: { family: 'Inter', style: 'Bold' },
      extrabold: { family: 'Inter', style: 'Extra Bold' },
    },
  ];

  for (const candidate of attempts) {
    try {
      await figma.loadFontAsync(candidate.regular);
      await figma.loadFontAsync(candidate.medium);
      await figma.loadFontAsync(candidate.semibold);
      await figma.loadFontAsync(candidate.bold);
      await figma.loadFontAsync(candidate.extrabold);
      FONT_REGULAR = candidate.regular;
      FONT_MEDIUM = candidate.medium;
      FONT_SEMIBOLD = candidate.semibold;
      FONT_BOLD = candidate.bold;
      FONT_EXTRABOLD = candidate.extrabold;
      return;
    } catch (error) {
      // Try the next family.
    }
  }
}

function setXY(node, x, y) {
  node.x = x;
  node.y = y;
  return node;
}

function rect(parent, name, x, y, w, h, paints, radius = 0) {
  const n = figma.createRectangle();
  n.name = name;
  n.resize(w, h);
  n.fills = paints || [];
  n.cornerRadius = radius;
  parent.appendChild(n);
  return setXY(n, x, y);
}

function ellipse(parent, name, x, y, w, h, paints) {
  const n = figma.createEllipse();
  n.name = name;
  n.resize(w, h);
  n.fills = paints || [];
  parent.appendChild(n);
  return setXY(n, x, y);
}

function line(parent, name, x, y, w, h, color, strokeWeight = 0.5) {
  const n = rect(parent, name, x, y, w, h, fill(color), 0);
  n.opacity = Math.min(1, strokeWeight / Math.max(h, w, strokeWeight));
  return n;
}

function frame(parent, name, x, y, w, h, opts = {}) {
  const n = figma.createFrame();
  n.name = name;
  n.resize(w, h);
  n.fills = opts.fills || [];
  n.cornerRadius = opts.radius || 0;
  n.clipsContent = opts.clip === true;
  if (opts.strokes) {
    n.strokes = opts.strokes;
    n.strokeWeight = opts.strokeWeight || 1;
  }
  if (opts.effects) n.effects = opts.effects;
  parent.appendChild(n);
  return setXY(n, x, y);
}

function autoFrame(parent, name, x, y, w, h, opts = {}) {
  const n = frame(parent, name, x, y, w || 1, h || 1, opts);
  n.layoutMode = opts.direction || 'VERTICAL';
  n.itemSpacing = opts.gap || 0;
  n.paddingTop = opts.paddingTop !== undefined ? opts.paddingTop : (opts.padding !== undefined ? opts.padding : 0);
  n.paddingRight = opts.paddingRight !== undefined ? opts.paddingRight : (opts.padding !== undefined ? opts.padding : 0);
  n.paddingBottom = opts.paddingBottom !== undefined ? opts.paddingBottom : (opts.padding !== undefined ? opts.padding : 0);
  n.paddingLeft = opts.paddingLeft !== undefined ? opts.paddingLeft : (opts.padding !== undefined ? opts.padding : 0);
  n.primaryAxisSizingMode = opts.primary || (h ? 'FIXED' : 'AUTO');
  n.counterAxisSizingMode = opts.counter || (w ? 'FIXED' : 'AUTO');
  n.primaryAxisAlignItems = opts.primaryAlign || 'MIN';
  n.counterAxisAlignItems = opts.counterAlign || 'MIN';
  return n;
}

function t(parent, name, value, x, y, spec = {}) {
  const n = figma.createText();
  n.name = name;
  n.fontName = fontFor(spec.weight !== undefined ? spec.weight : 400);
  n.characters = String(value);
  n.fontSize = spec.size || TYPE.body.size;
  n.lineHeight = { unit: 'PIXELS', value: spec.line || Math.round((spec.size || TYPE.body.size) * 1.25) };
  n.letterSpacing = { unit: 'PIXELS', value: spec.letter || 0 };
  n.fills = fill(spec.color || COLORS.light.text);
  n.textAlignHorizontal = spec.align || 'LEFT';
  n.textAutoResize = spec.width ? 'HEIGHT' : 'WIDTH_AND_HEIGHT';
  if (spec.width) n.resize(spec.width, spec.height || 1);
  parent.appendChild(n);
  return setXY(n, x, y);
}

function textIn(parent, name, value, spec = {}) {
  const n = t(parent, name, value, 0, 0, spec);
  return n;
}

function svg(parent, name, svgText, x, y, w, h) {
  const n = figma.createNodeFromSvg(svgText);
  n.name = name;
  n.resize(w, h);
  parent.appendChild(n);
  return setXY(n, x, y);
}

function softShadow(strength = 'mid') {
  if (strength === 'phone') {
    return [
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.08 }, offset: { x: 0, y: 4 }, radius: 12, spread: 0, visible: true, blendMode: 'NORMAL' },
      { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 30 }, radius: 60, spread: 0, visible: true, blendMode: 'NORMAL' },
    ];
  }
  if (strength === 'glass') {
    return [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.10 }, offset: { x: 0, y: 10 }, radius: 40, spread: 0, visible: true, blendMode: 'NORMAL' }];
  }
  if (strength === 'green') {
    return [{ type: 'DROP_SHADOW', color: { r: 0.19, g: 0.82, b: 0.35, a: 0.35 }, offset: { x: 0, y: 12 }, radius: 36, spread: 0, visible: true, blendMode: 'NORMAL' }];
  }
  return [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.08 }, offset: { x: 0, y: 8 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }];
}

function blurEffect(radius = 30) {
  return { type: 'BACKGROUND_BLUR', radius, visible: true };
}

function extend(base, overrides) {
  const result = {};
  Object.keys(base || {}).forEach((key) => {
    result[key] = base[key];
  });
  Object.keys(overrides || {}).forEach((key) => {
    result[key] = overrides[key];
  });
  return result;
}

function entries(value) {
  return Object.keys(value || {}).map((key) => [key, value[key]]);
}

function createPage(name) {
  const page = figma.createPage();
  page.name = name;
  return page;
}

function resetPage(page, name) {
  page.name = name;
  for (const child of page.children.slice()) {
    child.remove();
  }
  return page;
}

function getBasePage(name) {
  const page = figma.root.children[0] || figma.createPage();
  return resetPage(page, name);
}

async function offsetNewChildren(page, dx, dy, build) {
  const existingIds = new Set(page.children.map((node) => node.id));
  await build(page);
  for (const child of page.children) {
    if (!existingIds.has(child.id)) {
      child.x += dx;
      child.y += dy;
    }
  }
}

function palette(dark) {
  return dark ? extend(COLORS.dark, { tint: COLORS.tint, green: COLORS.green, red: COLORS.red, orange: COLORS.orange, purple: COLORS.purple }) :
    extend(COLORS.light, { tint: COLORS.tint, green: COLORS.green, red: COLORS.red, orange: COLORS.orange, purple: COLORS.purple });
}

function createPaintStyles() {
  const entries = [
    ['Canvas/Warm', COLORS.canvas],
    ['Light/Background', COLORS.light.bg],
    ['Light/Surface', COLORS.light.surface],
    ['Light/Fill', COLORS.light.fill],
    ['Light/Text', COLORS.light.text],
    ['Light/Text Secondary', COLORS.light.text2],
    ['Light/Separator', COLORS.light.sep],
    ['Dark/Background', COLORS.dark.bg],
    ['Dark/Surface', COLORS.dark.surface],
    ['Dark/Fill', COLORS.dark.fill],
    ['Dark/Text', COLORS.dark.text],
    ['Semantic/Tint', COLORS.tint],
    ['Semantic/Success', COLORS.green],
    ['Semantic/Error', COLORS.red],
    ['Semantic/Warning', COLORS.orange],
    ['Semantic/Purple', COLORS.purple],
    ['Map/Park Light', COLORS.light.mapPark],
    ['Map/Water Light', COLORS.light.mapWater],
    ['Map/Park Dark', COLORS.dark.mapPark],
    ['Map/Water Dark', COLORS.dark.mapWater],
  ];
  for (const [name, color] of entries) {
    const style = figma.createPaintStyle();
    style.name = name;
    style.paints = fill(color);
  }
}

function createTextStyles() {
  for (const [key, spec] of entries(TYPE)) {
    const style = figma.createTextStyle();
    style.name = `iOS/${key}`;
    style.fontName = fontFor(spec.weight);
    style.fontSize = spec.size;
    style.lineHeight = { unit: 'PIXELS', value: spec.line };
    style.letterSpacing = { unit: 'PIXELS', value: spec.letter };
  }
}

function createVariables() {
  if (!figma.variables) return;
  try {
    const collection = figma.variables.createVariableCollection('Precise Variables');
    const modeId = collection.modes[0].modeId;
    for (const [name, value] of entries(SPACING)) {
      const variable = figma.variables.createVariable(`spacing/${name}`, collection, 'FLOAT');
      variable.setValueForMode(modeId, value);
    }
    for (const [name, value] of entries(RADIUS)) {
      const variable = figma.variables.createVariable(`radius/${name}`, collection, 'FLOAT');
      variable.setValueForMode(modeId, value);
    }
    const sizes = { phoneWidth: W, phoneHeight: H, statusBar: 54, navBar: 44, tabBar: 83, buttonHeight: 50, startButtonHeight: 56 };
    for (const [name, value] of entries(sizes)) {
      const variable = figma.variables.createVariable(`size/${name}`, collection, 'FLOAT');
      variable.setValueForMode(modeId, value);
    }
  } catch (error) {
    console.warn('Variable creation skipped:', error);
  }
}

function createScreen(parent, name, x, y, dark = false) {
  const c = palette(dark);
  const s = frame(parent, `Screen / ${name}`, x, y, W, H, {
    fills: fill(c.bg),
    radius: RADIUS.phone,
    clip: true,
    effects: softShadow('phone'),
  });
  return { s, c, dark };
}

function statusBar(parent, c, dark, colorOverride) {
  const color = colorOverride || c.text;
  const bar = autoFrame(parent, 'Component Instance / Status Bar', 0, 0, W, 54, {
    direction: 'HORIZONTAL',
    primaryAlign: 'SPACE_BETWEEN',
    counterAlign: 'MAX',
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 8,
  });
  textIn(bar, 'Text / Time', '9:41', extend(TYPE.headline, color, {  }));
  const right = autoFrame(bar, 'Signal Indicators', 0, 0, 68, 14, { direction: 'HORIZONTAL', gap: 6, counterAlign: 'CENTER' });
  for (let i = 0; i < 4; i += 1) {
    rect(right, `Cell Bar ${i + 1}`, 0, 0, 3, [8, 9.5, 11, 11][i], fill(color, i === 3 ? 0.3 : 1), 0.5);
  }
  svg(right, 'Wi-Fi Icon', `<svg width="16" height="12" viewBox="0 0 16 12" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${color}" stroke-width="1.2"><path d="M8 10 C4 6 4 6 1 8 M8 10 C12 6 12 6 15 8 M8 10 C5 4 11 4 8 10" stroke-linecap="round"/></svg>`, 0, 0, 16, 12);
  const battery = frame(right, 'Battery', 0, 0, 25, 11, { fills: [], strokes: fill(color, 0.6), strokeWeight: 1, radius: 3 });
  rect(battery, 'Battery Fill', 1.5, 1.5, 16, 8, fill(color, 0.6), 1);
  rect(battery, 'Battery Cap', 25, 3, 2, 3, fill(color, 0.6), 1);
  return bar;
}

function homeIndicator(parent, c) {
  rect(parent, 'Component Instance / Home Indicator', 128, 831, 134, 5, fill(c.text, 0.9), 3);
}

function navBar(parent, c, opts) {
  const nav = frame(parent, `Component Instance / Nav Bar / ${opts.title}`, 0, 54, W, opts.large === false ? 44 : 140, { fills: [] });
  const row = autoFrame(nav, 'Navigation Row', 16, 0, 358, 44, {
    direction: 'HORIZONTAL',
    primaryAlign: 'SPACE_BETWEEN',
    counterAlign: 'CENTER',
  });
  textIn(row, 'Text / Left Action', opts.left || '', extend(TYPE.body, { color: c.tint, width: 90 }));
  if (opts.large === false) textIn(row, 'Text / Title', opts.title, extend(TYPE.headline, { color: c.text, align: 'CENTER', width: 160 }));
  textIn(row, 'Text / Right Action', opts.right || '', extend(TYPE.body, { color: c.tint, align: 'RIGHT', width: 90, weight: opts.rightBold ? 600 : 400 }));
  if (opts.large !== false) {
    t(nav, 'Text / Large Title', opts.title, 16, 50, extend(TYPE.largeTitle, { color: c.text }));
  }
  return nav;
}

function appMark(parent, x, y) {
  const mark = frame(parent, 'Component Instance / App Mark', x, y, 68, 68, { fills: gradient([COLORS.mint, COLORS.tint]), radius: 22, effects: softShadow() });
  svg(mark, 'Paw Glyph', `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="#fff"><path d="M12 16c-2 0-3 2-3 4s1 3 2.5 3 2-1.5 2-3.5S13.5 16 12 16zm16 0c-1.5 0-2 1.5-2 3.5s.5 3.5 2 3.5 3-1.5 3-3-1.5-4-3-4zm-8 2c-2.5 0-4.5 2.5-4.5 4.5s-3 5.5-3 7.5 2.5 4 4 4 2.5-1.5 3.5-1.5 2.5 1.5 3.5 1.5 4-2 4-4-3-5.5-3-7.5-2-4.5-4.5-4.5z"/></svg>`, 14, 14, 40, 40);
  return mark;
}

function dogAvatar(parent, dogKey, x, y, size = 56, name = 'Component Instance / Dog Avatar') {
  const d = DOGS[dogKey];
  const avatar = frame(parent, `${name} / ${d.name}`, x, y, size, size, { fills: gradient(d.grad), radius: size / 2 });
  t(avatar, 'Text / Emoji', d.emoji, 0, Math.round(size * 0.16), { size: Math.round(size * 0.48), line: Math.round(size * 0.58), align: 'CENTER', width: size, color: '#000000' });
  return avatar;
}

function ownerAvatar(parent, x, y, size = 60) {
  const avatar = frame(parent, 'Component Instance / Owner Avatar', x, y, size, size, { fills: gradient([COLORS.purple, COLORS.tint]), radius: size / 2 });
  t(avatar, 'Text / Initial', 'M', 0, size * 0.25, { size: Math.round(size * 0.38), line: Math.round(size * 0.45), weight: 700, color: '#ffffff', align: 'CENTER', width: size });
  return avatar;
}

function button(parent, label, x, y, w, opts = {}) {
  const intent = opts.intent || 'primary';
  const bg = intent === 'secondary' ? opts.c.fill : intent === 'success' ? COLORS.green : intent === 'destructive' ? COLORS.red : intent === 'apple' ? (opts.dark ? '#ffffff' : '#000000') : COLORS.tint;
  const fg = intent === 'apple' ? (opts.dark ? '#000000' : '#ffffff') : intent === 'secondary' ? opts.c.text : '#ffffff';
  const btn = autoFrame(parent, `Component Instance / Button / ${label}`, x, y, w, opts.height || 50, {
    direction: 'HORIZONTAL',
    primaryAlign: 'CENTER',
    counterAlign: 'CENTER',
    gap: 8,
    fills: fill(bg),
    radius: opts.radius || 14,
    effects: intent === 'success' ? softShadow('green') : [],
  });
  if (opts.icon === 'play') svg(btn, 'Icon / Play', `<svg width="18" height="20" viewBox="0 0 18 20" xmlns="http://www.w3.org/2000/svg" fill="#fff"><path d="M2 1.5v17l14-8.5z"/></svg>`, 0, 0, 18, 20);
  if (opts.icon === 'stop') rect(btn, 'Icon / Stop', 0, 0, 14, 14, fill('#ffffff'), 2);
  if (opts.icon === 'pause') svg(btn, 'Icon / Pause', `<svg width="14" height="16" viewBox="0 0 14 16" xmlns="http://www.w3.org/2000/svg" fill="${fg}"><rect x="0" y="0" width="5" height="16" rx="1"/><rect x="9" y="0" width="5" height="16" rx="1"/></svg>`, 0, 0, 14, 16);
  textIn(btn, 'Text / Button Label', label, { size: opts.size || 17, line: 22, weight: opts.weight || 600, color: fg, letter: opts.letter || 0, align: 'CENTER' });
  return btn;
}

function groupedCard(parent, name, x, y, w, h, c, opts = {}) {
  return autoFrame(parent, `Group Card / ${name}`, x, y, w, h, {
    direction: 'VERTICAL',
    fills: fill(opts.fill || c.surface),
    radius: opts.radius || RADIUS.card,
    padding: opts.padding || 0,
    gap: opts.gap || 0,
    clip: true,
  });
}

function row(parent, c, icon, label, value, opts = {}) {
  const r = autoFrame(parent, `Row / ${label}`, 0, 0, 1, opts.height || 52, {
    direction: 'HORIZONTAL',
    primaryAlign: 'MIN',
    counterAlign: 'CENTER',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 16,
    fills: [],
    counter: 'AUTO',
  });
  if (icon) {
    const tile = frame(r, 'Icon Tile', 0, 0, opts.iconSize || 30, opts.iconSize || 30, { fills: fill(opts.iconBg || c.fill), radius: 7 });
    t(tile, 'Text / Icon', icon, 0, 6, { size: opts.iconTextSize || 16, line: 18, width: opts.iconSize || 30, align: 'CENTER', color: c.text });
  }
  textIn(r, 'Text / Label', label, { size: opts.labelSize || 16, line: 22, weight: opts.weight || 400, color: opts.destructive ? c.red : c.text, width: opts.labelWidth || 170 });
  if (value) textIn(r, 'Text / Value', value, { size: 15, line: 20, color: c.text2, align: 'RIGHT', width: opts.valueWidth || 80 });
  if (opts.chevron !== false) textIn(r, 'Icon / Chevron', '›', { size: 22, line: 22, color: c.text3, width: 16, align: 'RIGHT' });
  return r;
}

function separator(parent, c, x = 16, y = 0, w = 300) {
  rect(parent, 'Separator', x, y, w, 0.5, fill(c.sep), 0);
}

function metricGrid(parent, c, x, y, w, metrics, opts = {}) {
  const grid = autoFrame(parent, opts.name || 'Metric Grid', x, y, w, opts.height || 82, {
    direction: 'HORIZONTAL',
    fills: opts.fill ? fill(opts.fill) : [],
    radius: opts.radius || 0,
    paddingLeft: opts.paddingX || 0,
    paddingRight: opts.paddingX || 0,
    paddingTop: opts.paddingY || 0,
    paddingBottom: opts.paddingY || 0,
    primaryAlign: 'SPACE_BETWEEN',
    counterAlign: 'CENTER',
  });
  metrics.forEach((m, index) => {
    const cell = autoFrame(grid, `Metric / ${m.label}`, 0, 0, Math.floor((w - (opts.paddingX || 0) * 2) / metrics.length) - 1, opts.height || 70, {
      direction: 'VERTICAL',
      primaryAlign: 'CENTER',
      counterAlign: 'CENTER',
      gap: 3,
      fills: [],
    });
    textIn(cell, 'Text / Label', m.label.toUpperCase(), extend(TYPE.label, { color: c.text2, align: 'CENTER', width: cell.width }));
    textIn(cell, 'Text / Value', m.value, { size: m.big ? 32 : (opts.valueSize || 22), line: m.big ? 34 : 28, weight: 700, letter: m.big ? -1.2 : -0.5, color: c.text, align: 'CENTER', width: cell.width });
    if (index < metrics.length - 1 && opts.dividers) rect(grid, 'Divider', 0, 0, 0.5, 44, fill(c.sep), 0);
  });
  return grid;
}

function sectionLabel(parent, c, text, x, y, width = 350) {
  return t(parent, `Section Label / ${text}`, text.toUpperCase(), x, y, extend(TYPE.footnote, { weight: 600, letter: 0.5, color: c.text2, width }));
}

function liveTag(parent, c, x, y, dark, small = false) {
  const tag = autoFrame(parent, 'Component Instance / Tag / LIVE', x, y, small ? 58 : 66, small ? 22 : 26, {
    direction: 'HORIZONTAL',
    primaryAlign: 'CENTER',
    counterAlign: 'CENTER',
    gap: 6,
    fills: fill(dark ? 'rgba(255,69,58,0.18)' : 'rgba(255,59,48,0.1)'),
    radius: small ? 10 : 12,
  });
  ellipse(tag, 'Live Dot', 0, 0, small ? 5 : 6, small ? 5 : 6, fill(COLORS.red));
  textIn(tag, 'Text / LIVE', 'LIVE', { size: small ? 10 : 12, line: 14, weight: 700, letter: small ? 0.3 : 0, color: COLORS.red });
  return tag;
}

function tabBar(parent, c, active, dark) {
  const bar = autoFrame(parent, `Component Instance / Tab Bar / Active=${active}`, 20, 764, 350, 58, {
    direction: 'HORIZONTAL',
    fills: gradient(dark ? ['rgba(60,60,65,0.55)', 'rgba(30,30,34,0.65)'] : ['rgba(255,255,255,0.7)', 'rgba(245,245,250,0.55)']),
    radius: 29,
    paddingLeft: 8,
    paddingRight: 8,
    primaryAlign: 'SPACE_BETWEEN',
    counterAlign: 'CENTER',
    effects: [blurEffect(30)].concat(softShadow()),
    strokes: fill(dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.7)'),
    strokeWeight: 0.5,
  });
  const tabs = [
    { id: 'dogs', label: 'Dogs', icon: 'paw' },
    { id: 'walk', label: 'Walk', icon: 'check' },
    { id: 'owner', label: 'Me', icon: 'person' },
  ];
  tabs.forEach((item) => {
    const on = item.id === active;
    const cell = autoFrame(bar, `Tab Item / ${item.label}`, 0, 0, 106, 46, {
      direction: 'VERTICAL',
      primaryAlign: 'CENTER',
      counterAlign: 'CENTER',
      gap: 1,
      fills: [],
    });
    if (on) rect(cell, 'Selected Material', 14, 4, 78, 38, fill(dark ? 'rgba(10,132,255,0.18)' : 'rgba(10,132,255,0.12)'), 18);
    const color = on ? COLORS.tint : c.text2;
    if (item.icon === 'paw') {
      svg(cell, 'Icon / Paw', `<svg width="24" height="24" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" fill="${color}"><path d="M8 9c-1.5 0-2.5 1.5-2.5 3s1 2 2 2 1.5-1 1.5-2.5S9 9 8 9zm10 0c-1 0-1.5 1-1.5 2.5s.5 2.5 1.5 2.5 2-1 2-2-1-3-2-3zm-5 1c-1.5 0-3 1.5-3 3s-2 3.5-2 5 1.5 3 2.5 3 1.5-1 2.5-1 1.5 1 2.5 1 2.5-1.5 2.5-3-2-3.5-2-5-1.5-3-3-3z"/><ellipse cx="13" cy="6" rx="1.5" ry="2"/></svg>`, 0, 0, 24, 24);
    } else if (item.icon === 'check') {
      svg(cell, 'Icon / Walk', `<svg width="24" height="24" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="13" cy="13" r="10"/><path d="M9 13l2.5 2.5L17 10"/></svg>`, 0, 0, 24, 24);
    } else {
      svg(cell, 'Icon / Person', `<svg width="24" height="24" viewBox="0 0 26 26" xmlns="http://www.w3.org/2000/svg" fill="${color}"><circle cx="13" cy="9" r="4"/><path d="M5 22c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>`, 0, 0, 24, 24);
    }
    textIn(cell, `Text / ${item.label}`, item.label, { size: 10, line: 12, weight: 600, letter: 0.1, color, align: 'CENTER' });
  });
  return bar;
}

function fullMap(parent, c, opts = {}) {
  const map = frame(parent, 'Map Surface / Full Screen', 0, 0, W, H, { fills: fill(c.mapLand), clip: true });
  ellipse(map, 'Park Shape / North West', -40, 120, 240, 180, fill(c.mapPark));
  ellipse(map, 'Park Shape / East', 250, 320, 200, 240, fill(c.mapPark));
  ellipse(map, 'Water Shape', -30, 484, 180, 120, fill(c.mapWater, 0.85));
  rect(map, 'Road / Horizontal 1', 0, 260, W, 14, fill(c.mapRoad), 0);
  rect(map, 'Road / Horizontal 2', 0, 460, W, 10, fill(c.mapRoad), 0);
  rect(map, 'Road / Horizontal 3', 0, 620, W, 12, fill(c.mapRoad), 0);
  rect(map, 'Road / Vertical 1', 110, 0, 10, H, fill(c.mapRoad), 0);
  rect(map, 'Road / Vertical 2', 240, 0, 14, H, fill(c.mapRoad), 0);
  rect(map, 'Road / Vertical 3', 320, 0, 8, H, fill(c.mapRoad), 0);
  if (opts.route) {
    svg(map, 'Route / Walked Path', `<svg width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg"><path d="M 60 720 L 115 720 L 115 468 L 244 468 L 244 270 L 320 180" stroke="${COLORS.green}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="60" cy="720" r="8" fill="#fff" stroke="${COLORS.green}" stroke-width="3"/><circle cx="320" cy="180" r="22" fill="${COLORS.green}" opacity="0.18"/><circle cx="320" cy="180" r="12" fill="${COLORS.green}" opacity="0.3"/></svg>`, 0, 0, W, H);
  } else {
    svg(map, 'Current Location Marker', `<svg width="390" height="844" viewBox="0 0 390 844" xmlns="http://www.w3.org/2000/svg"><circle cx="195" cy="380" r="28" fill="${COLORS.tint}" opacity="0.12"/><circle cx="195" cy="380" r="16" fill="${COLORS.tint}" opacity="0.2"/><circle cx="195" cy="380" r="8" fill="#fff"/><circle cx="195" cy="380" r="5" fill="${COLORS.tint}"/></svg>`, 0, 0, W, H);
  }
  if (opts.dogs) {
    const stack = autoFrame(map, 'Current Dog Stack', 300, 162, 40, 22, { direction: 'HORIZONTAL', gap: -7, fills: [] });
    opts.dogs.forEach((dog, index) => {
      const av = dogAvatar(stack, dog, 0, 0, 22, 'Dog Marker');
      av.strokes = fill('#ffffff');
      av.strokeWeight = 2.5;
      av.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.3 }, offset: { x: 0, y: 2 }, radius: 6, spread: 0, visible: true, blendMode: 'NORMAL' }];
      av.name = `Dog Marker / ${DOGS[dog].name}`;
      av.x = index ? -7 : 0;
    });
  }
  return map;
}

function miniMap(parent, c, x, y, w, h, opts = {}) {
  const map = frame(parent, opts.name || 'Map Surface / Route Preview', x, y, w, h, { fills: fill(c.mapLand), radius: RADIUS.card, clip: true });
  ellipse(map, 'Park Shape', 30, Math.round(h * 0.12), w - 60, h - 36, fill(c.mapPark, 0.5));
  rect(map, 'Road / Horizontal', 0, Math.round(h * 0.42), w, 6, fill(c.mapRoad), 0);
  rect(map, 'Road / Vertical', Math.round(w * 0.52), 0, 6, h, fill(c.mapRoad), 0);
  svg(map, 'Route / Path', `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><path d="M 30 ${h - 30} L ${Math.round(w * 0.24)} ${h - 30} L ${Math.round(w * 0.24)} ${Math.round(h * 0.45)} L ${Math.round(w * 0.52)} ${Math.round(h * 0.45)} L ${Math.round(w * 0.52)} 25" stroke="${COLORS.green}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="30" cy="${h - 30}" r="5" fill="#fff" stroke="${COLORS.green}" stroke-width="2"/><circle cx="${Math.round(w * 0.52)}" cy="25" r="6" fill="${COLORS.red}"/></svg>`, 0, 0, w, h);
  if (opts.chips) {
    const chipRow = autoFrame(map, 'Map Metric Chips', 10, h - 34, 168, 24, { direction: 'HORIZONTAL', gap: 6, fills: [] });
    opts.chips.forEach((chip) => {
      const ch = autoFrame(chipRow, `Chip / ${chip}`, 0, 0, 48, 22, { direction: 'HORIZONTAL', fills: fill(c.materialStrong), radius: 8, primaryAlign: 'CENTER', counterAlign: 'CENTER', paddingLeft: 8, paddingRight: 8, effects: [blurEffect(12)] });
      textIn(ch, 'Text / Metric', chip, { size: 11, line: 14, weight: 600, color: c.text });
    });
  }
  return map;
}

function glassPill(parent, c, name, x, y, w, textValue, dark, opts = {}) {
  const pill = autoFrame(parent, `Glass Pill / ${name}`, x, y, w, 40, {
    direction: 'HORIZONTAL',
    primaryAlign: 'CENTER',
    counterAlign: 'CENTER',
    gap: 8,
    fills: fill(c.material),
    strokes: fill(c.materialBorder),
    strokeWeight: 0.5,
    radius: 20,
    paddingLeft: 14,
    paddingRight: 14,
    effects: [blurEffect(30)],
  });
  if (opts.avatarStack) {
    const stack = autoFrame(pill, 'Avatar Stack', 0, 0, 40, 22, { direction: 'HORIZONTAL', gap: -6, fills: [] });
    opts.avatarStack.forEach((dog) => {
      const av = dogAvatar(stack, dog, 0, 0, 22, 'Dog Avatar Tiny');
      av.strokes = fill(dark ? c.surface : '#ffffff');
      av.strokeWeight = 2;
    });
  }
  textIn(pill, 'Text / Label', textValue, { size: 15, line: 20, weight: 600, letter: -0.2, color: c.text });
  return pill;
}

function walkTopBar(parent, c, title, dark, dogs) {
  const close = frame(parent, 'Glass Button / Close', 16, 62, 40, 40, { fills: fill(c.material), strokes: fill(c.materialBorder), strokeWeight: 0.5, radius: 20, effects: [blurEffect(30)] });
  t(close, 'Icon / Close', '×', 0, 6, { size: 20, line: 22, weight: 500, color: c.text, align: 'CENTER', width: 40 });
  glassPill(parent, c, 'Title', dogs ? 113 : 128, 62, dogs ? 164 : 134, title, dark, { avatarStack: dogs });
  const sat = frame(parent, 'Glass Button / Satellite', 334, 62, 40, 40, { fills: fill(c.material), strokes: fill(c.materialBorder), strokeWeight: 0.5, radius: 20, effects: [blurEffect(30)] });
  svg(sat, 'Icon / Satellite', `<svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${c.text}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`, 11, 11, 18, 18);
}

function walkSheet(parent, c, dark, x, y, w, h, opts = {}) {
  const sheet = autoFrame(parent, opts.name || 'Glass Sheet / Walk Controls', x, y, w, h, {
    direction: 'VERTICAL',
    fills: fill(c.material),
    strokes: fill(c.materialBorder),
    strokeWeight: 0.5,
    radius: RADIUS.sheet,
    paddingTop: 20,
    paddingRight: 22,
    paddingBottom: 18,
    paddingLeft: 22,
    gap: 0,
    effects: [blurEffect(40)].concat(softShadow('glass')),
  });
  rect(sheet, 'Sheet Grabber', (w - 44) / 2, -6, 36, 5, fill(c.text3), 3);
  return sheet;
}

function quickStats(parent, c, dark, values, x, y, w, h = 70) {
  const bg = dark ? 'rgba(118,118,128,0.18)' : 'rgba(118,118,128,0.08)';
  const grid = metricGrid(parent, c, x, y, w, values.map(([label, value]) => ({ label, value })), {
    name: 'Quick Stats',
    height: h,
    fill: bg,
    radius: 14,
    paddingX: 8,
    paddingY: 12,
    valueSize: 20,
  });
  return grid;
}

function barChart(parent, c, x, y, w, h, data, opts = {}) {
  const card = groupedCard(parent, opts.title || 'This Week Chart', x, y, w, h, c, { padding: 16 });
  const header = autoFrame(card, 'Chart Header', 0, 0, w - 32, 22, { direction: 'HORIZONTAL', primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  textIn(header, 'Text / Chart Title', opts.title || 'This week', { size: 15, line: 20, weight: 600, color: c.text });
  textIn(header, 'Text / Chart Total', opts.total || '9.52 km total', extend(TYPE.footnote, { color: c.text2, align: 'RIGHT', width: 120 }));
  const chart = autoFrame(card, 'Bars', 0, 14, w - 32, 100, { direction: 'HORIZONTAL', gap: 6, counterAlign: 'MAX', primaryAlign: 'SPACE_BETWEEN' });
  const max = Math.max.apply(null, data.map((d) => d.value).concat([1]));
  data.forEach((d) => {
    const col = autoFrame(chart, `Bar / ${d.label}`, 0, 0, 40, 100, { direction: 'VERTICAL', gap: 4, primaryAlign: 'MAX', counterAlign: 'CENTER' });
    textIn(col, 'Text / Value', d.value > 0 ? d.value.toFixed(1) : '', { size: 10, line: 12, weight: 600, color: c.text2, align: 'CENTER', width: 34 });
    rect(col, 'Bar Fill', 0, 0, 34, Math.max(4, (d.value / max) * 80), fill(d.today ? c.green : (d.value > 0 ? c.tint : c.fill), d.today ? 1 : 0.75), 4);
    textIn(col, 'Text / Day', d.label, { size: 10, line: 12, weight: 500, color: d.today ? c.text : c.text2, align: 'CENTER', width: 34 });
  });
  return card;
}

function progressRing(parent, c, x, y, size, pct, opts = {}) {
  const ring = frame(parent, opts.name || 'Progress Ring', x, y, size, size, { fills: [] });
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const dash = Math.min(1, Math.max(0, pct)) * circumference;
  svg(ring, 'Vector / Ring', `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${c.fill}" stroke-width="10"/><circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${COLORS.green}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${dash} ${circumference - dash}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`, 0, 0, size, size);
  t(ring, 'Text / Percent', `${Math.round(pct * 100)}%`, 0, size / 2 - 22, { size: 36, line: 42, weight: 800, letter: -1, color: c.green, align: 'CENTER', width: size });
  return ring;
}

function dogListItem(parent, c, dark, dogKey, details) {
  const d = DOGS[dogKey];
  const item = autoFrame(parent, `Dog List Item / ${d.name}`, 0, 0, 358, 84, {
    direction: 'HORIZONTAL',
    gap: 14,
    padding: 14,
    fills: fill(c.surface),
    radius: RADIUS.card,
    counterAlign: 'CENTER',
  });
  dogAvatar(item, dogKey, 0, 0, 56);
  const textCol = autoFrame(item, 'Dog Details', 0, 0, 230, 48, { direction: 'VERTICAL', gap: 3, fills: [] });
  const titleRow = autoFrame(textCol, 'Dog Title Row', 0, 0, 210, 22, { direction: 'HORIZONTAL', gap: 8, counterAlign: 'CENTER' });
  textIn(titleRow, 'Text / Dog Name', d.name, extend(TYPE.headline, { color: c.text }));
  const badge = autoFrame(titleRow, 'Badge / Streak', 0, 0, 42, 18, { direction: 'HORIZONTAL', fills: fill(dark ? 'rgba(255,159,10,0.15)' : 'rgba(255,149,0,0.12)'), radius: 4, paddingLeft: 6, paddingRight: 6, primaryAlign: 'CENTER', counterAlign: 'CENTER' });
  textIn(badge, 'Text / Streak', `🔥 ${details.streak}d`, { size: 10, line: 12, weight: 700, color: c.orange });
  textIn(textCol, 'Text / Stats', details.stats, extend(TYPE.caption, { color: c.text2, width: 210 }));
  textIn(item, 'Icon / Chevron', '›', { size: 22, line: 22, color: c.text3, align: 'RIGHT', width: 18 });
  return item;
}

function fieldGroup(parent, c, x, y, fields, labelWidth = 80) {
  const group = groupedCard(parent, 'Form Fields', x, y, 358, fields.length * 51.5, c, {});
  fields.forEach((field, index) => {
    const r = autoFrame(group, `Field Row / ${field[0]}`, 0, 0, 358, 51, { direction: 'HORIZONTAL', gap: 10, paddingLeft: 16, paddingRight: 16, counterAlign: 'CENTER' });
    textIn(r, 'Text / Label', field[0], extend(TYPE.subheadline, { color: c.text2, width: labelWidth }));
    textIn(r, 'Text / Value', field[1], extend(TYPE.body, { color: c.text, width: 220, letter: field[0] === 'Password' ? 3 : 0 }));
    if (index < fields.length - 1) separator(group, c, 16, 0, 342);
  });
  return group;
}

function screenSignIn(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, 'A. Sign In', x, y, dark);
  statusBar(s, c, dark);
  appMark(s, 32, 120);
  t(s, 'Text / Welcome Back', 'Welcome back', 32, 212, extend(TYPE.largeTitle, { letter: -0.8, color: c.text }));
  t(s, 'Text / Subtitle', 'Sign in to keep walking with Coco.', 32, 258, extend(TYPE.subheadline, { line: 21, color: c.text2, width: 326 }));
  fieldGroup(s, c, 32, 312, [['Email', 'coco@walk.app'], ['Password', '••••••••']], 70);
  t(s, 'Text / Forgot Password', 'Forgot password?', 246, 430, extend(TYPE.subheadline, { color: c.tint }));
  button(s, 'Sign in', 32, 478, 326, { c, dark });
  rect(s, 'Divider / Left', 32, 548, 137, 0.5, fill(c.sep), 0);
  t(s, 'Text / Or', 'or', 185, 540, extend(TYPE.footnote, { color: c.text2, align: 'CENTER', width: 20 }));
  rect(s, 'Divider / Right', 221, 548, 137, 0.5, fill(c.sep), 0);
  button(s, 'Continue with Apple', 32, 578, 326, { c, dark, intent: 'apple' });
  t(s, 'Text / New Account Link', 'New here? Create an account', 0, 762, { size: 14, line: 18, color: c.text2, align: 'CENTER', width: W });
  homeIndicator(s, c);
  return s;
}

function screenSignUp(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, 'B. Sign Up', x, y, dark);
  statusBar(s, c, dark);
  t(s, 'Nav Action / Back', '‹ Back', 16, 68, extend(TYPE.body, { color: c.tint }));
  t(s, 'Text / Title', "Let's meet\nyour dog.", 32, 116, { size: 34, line: 36, weight: 700, letter: -0.8, color: c.text, width: 326 });
  t(s, 'Text / Subtitle', "A few quick details and you'll be walking in a minute.", 32, 198, extend(TYPE.subheadline, { line: 21, color: c.text2, width: 310 }));
  fieldGroup(s, c, 32, 254, [['Your name', 'Mio'], ['Email', 'mio@walk.app'], ['Password', '••••••••']], 96);
  t(s, 'Text / Helper', "You can add your dog's profile on the next step. We'll remember paw-size, pace, and photo.", 36, 420, extend(TYPE.footnote, { line: 18, color: c.text2, width: 318 }));
  button(s, 'Continue', 32, 488, 326, { c, dark });
  t(s, 'Text / Terms', 'By continuing you agree to the Terms and Privacy Policy.', 48, 554, extend(TYPE.caption, { line: 18, color: c.text3, align: 'CENTER', width: 294 }));
  homeIndicator(s, c);
  return s;
}

function screenDogsList(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '01. Dogs (list)', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: 'Dogs', right: '+ Add' });
  const rollup = autoFrame(s, "Card / Today's Walking Goal", 16, 194, 358, 72, { direction: 'HORIZONTAL', gap: 14, padding: 14, fills: fill(c.surface), radius: RADIUS.card, counterAlign: 'CENTER' });
  const ring = progressRing(rollup, c, 0, 0, 44, 0.7, { name: 'Progress Ring / Goal 70%' });
  ring.resize(44, 44);
  const textCol = autoFrame(rollup, 'Goal Text', 0, 0, 242, 44, { direction: 'VERTICAL', gap: 3, fills: [] });
  textIn(textCol, 'Text / Goal Title', "Today's walking goal", extend(TYPE.subheadline, { weight: 600, color: c.text }));
  textIn(textCol, 'Text / Goal Detail', '3.52 / 5.0 km across your pack', extend(TYPE.footnote, { color: c.text2 }));
  textIn(rollup, 'Icon / Chevron', '›', { size: 22, line: 22, color: c.text3, width: 16 });
  sectionLabel(s, c, 'Your pack', 20, 286);
  const list = autoFrame(s, 'Dog List', 16, 312, 358, 276, { direction: 'VERTICAL', gap: 12, fills: [] });
  dogListItem(list, c, dark, 'coco', { stats: '1.42 km today · 47 walks', streak: 12 });
  dogListItem(list, c, dark, 'momo', { stats: '0 km today · 124 walks', streak: 3 });
  dogListItem(list, c, dark, 'biscuit', { stats: '2.1 km today · 31 walks', streak: 8 });
  tabBar(s, c, 'dogs', dark);
  homeIndicator(s, c);
  return s;
}

function screenDogDetail(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '02. Dog detail', x, y, dark);
  const hero = frame(s, 'Hero / Dog Photo', 0, 0, W, 300, { fills: gradient(DOGS.coco.grad), clip: true });
  t(hero, 'Text / Dog Emoji', DOGS.coco.emoji, 0, 84, { size: 140, line: 150, align: 'CENTER', width: W, color: '#000000' });
  rect(hero, 'Gradient Fade', 0, 240, W, 60, gradient(['rgba(242,242,247,0)', c.bg]), 0);
  statusBar(s, extend(c, { text: '#ffffff' }), dark, '#ffffff');
  t(s, 'Nav Action / Back', '‹ Dogs', 16, 68, extend(TYPE.body, { weight: 500, color: '#ffffff' }));
  t(s, 'Nav Action / Edit', 'Edit', 330, 68, extend(TYPE.body, { color: '#ffffff' }));
  t(s, 'Text / Dog Name', 'Coco', 20, 250, { size: 32, line: 38, weight: 700, letter: -0.6, color: c.text });
  t(s, 'Text / Dog Meta', '3 years · 4.2 kg', 20, 290, { size: 14, line: 18, color: c.text2 });
  metricGrid(s, c, 16, 320, 358, [{ label: 'Walks', value: '47' }, { label: 'km', value: '86.3' }, { label: 'Streak', value: '12d' }], { name: 'Stats Card', fill: c.surface, radius: RADIUS.card, height: 76, dividers: true });
  t(s, 'Section Header / Walks', 'Walks', 20, 416, extend(TYPE.title3, { color: c.text }));
  t(s, 'Text / See All', 'See all', 318, 419, extend(TYPE.subheadline, { color: c.tint }));
  const list = groupedCard(s, 'Walk List', 16, 454, 358, 272, c);
  const walks = [
    ['Today · 8:30 AM', '1.42 km · 24 min · 17\'06"/km', '💧2', '💩1'],
    ['Yesterday · 6:12 PM', '2.08 km · 38 min · 18\'15"/km', '💧3', '💩1'],
    ['Yesterday · 7:45 AM', '1.10 km · 21 min · 19\'05"/km', '💧1', '💩0'],
    ['Mon · 6:40 PM', '1.85 km · 32 min · 17\'18"/km', '💧2', '💩1'],
  ];
  walks.forEach((wlk, index) => {
    const r = autoFrame(list, `Walk Row / ${wlk[0]}`, 0, 0, 358, 58, { direction: 'HORIZONTAL', gap: 12, paddingLeft: 16, paddingRight: 16, counterAlign: 'CENTER' });
    const icon = frame(r, 'Icon Tile / Route', 0, 0, 36, 36, { fills: fill(c.fill), radius: 10 });
    svg(icon, 'Vector / Route', `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="${c.tint}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 14 L7 9 L10 12 L15 5"/><circle cx="15" cy="5" r="1.5" fill="${c.tint}"/></svg>`, 9, 9, 18, 18);
    const col = autoFrame(r, 'Walk Text', 0, 0, 188, 38, { direction: 'VERTICAL', gap: 3, fills: [] });
    textIn(col, 'Text / Date', wlk[0], { size: 15, line: 20, weight: 500, color: c.text });
    textIn(col, 'Text / Metrics', wlk[1], { size: 12, line: 16, color: c.text2, width: 190 });
    textIn(r, 'Text / Events', `${wlk[2]} ${wlk[3]}`, { size: 11, line: 14, color: c.text2, width: 52 });
    textIn(r, 'Icon / Chevron', '›', { size: 20, line: 20, color: c.text3, width: 14 });
    if (index < walks.length - 1) separator(list, c, 64, 0, 294);
  });
  tabBar(s, c, 'dogs', dark);
  homeIndicator(s, c);
  return s;
}

function screenWalkingGoal(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '02c. Walking goal', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: "Today's goal", left: '‹ Dogs', right: 'Edit', large: false });
  progressRing(s, c, 125, 118, 140, 0.7, { name: 'Goal Progress Ring' });
  t(s, 'Text / Goal Total', '3.52 / 5.0 km', 0, 274, extend(TYPE.subheadline, { color: c.text2, align: 'CENTER', width: W }));
  sectionLabel(s, c, 'Per dog', 20, 326);
  const breakdown = groupedCard(s, 'Per Dog Breakdown', 16, 354, 358, 218, c);
  [['coco', '1.42 / 2.0 km', 0.71, COLORS.tint], ['momo', '0.00 / 1.5 km', 0, COLORS.tint], ['biscuit', '2.10 / 1.5 km', 1, COLORS.green]].forEach((d, index) => {
    const r = autoFrame(breakdown, `Goal Row / ${DOGS[d[0]].name}`, 0, 0, 358, 72, { direction: 'HORIZONTAL', gap: 12, paddingLeft: 16, paddingRight: 16, counterAlign: 'CENTER' });
    dogAvatar(r, d[0], 0, 0, 44);
    const col = autoFrame(r, 'Goal Text and Bar', 0, 0, 270, 46, { direction: 'VERTICAL', gap: 6, fills: [] });
    const titleRow = autoFrame(col, 'Title Row', 0, 0, 270, 20, { direction: 'HORIZONTAL', primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
    textIn(titleRow, 'Text / Name', DOGS[d[0]].name, { size: 16, line: 20, weight: 600, color: c.text });
    textIn(titleRow, 'Text / Value', d[1], extend(TYPE.footnote, { weight: 600, color: d[2] >= 1 ? c.green : c.text2, align: 'RIGHT', width: 110 }));
    const bar = frame(col, 'Progress Bar', 0, 0, 270, 6, { fills: fill(c.fill), radius: 3, clip: true });
    rect(bar, 'Progress Fill', 0, 0, 270 * d[2], 6, fill(d[3]), 3);
    if (index < 2) separator(breakdown, c, 72, 0, 286);
  });
  barChart(s, c, 16, 592, 358, 168, [
    { label: 'Mon', value: 4.2 }, { label: 'Tue', value: 5.1 }, { label: 'Wed', value: 3.8 }, { label: 'Thu', value: 5.0 }, { label: 'Fri', value: 4.6 }, { label: 'Sat', value: 2.2 }, { label: 'Sun', value: 3.52, today: true },
  ], { title: 'This week', total: '28.4 km total' });
  homeIndicator(s, c);
  return s;
}

function screenDogEdit(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '02b. Dog edit', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: 'Edit dog', left: 'Cancel', right: 'Save', rightBold: true, large: false });
  const photo = dogAvatar(s, 'coco', 145, 118, 100, 'Dog Photo Editor');
  const badge = frame(photo, 'Camera Badge', 68, 68, 32, 32, { fills: fill(c.tint), radius: 16, strokes: fill(c.bg), strokeWeight: 3 });
  svg(badge, 'Icon / Camera', `<svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`, 9, 9, 14, 14);
  t(s, 'Text / Change Photo', 'Change photo', 0, 228, extend(TYPE.footnote, { weight: 500, color: c.tint, align: 'CENTER', width: W }));
  fieldGroup(s, c, 16, 268, [['Name', 'Coco'], ['Breed', 'Toy Poodle'], ['Birthday', 'Apr 12, 2023'], ['Weight', '4.2 kg'], ['Microchip', '900 111 222 333 444']], 90);
  sectionLabel(s, c, 'Daily goal', 20, 558);
  const goal = groupedCard(s, 'Daily Goal Slider', 16, 586, 358, 86, c, { padding: 16, gap: 12 });
  const top = autoFrame(goal, 'Distance Row', 0, 0, 326, 22, { direction: 'HORIZONTAL', primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER' });
  textIn(top, 'Text / Distance', 'Distance', extend(TYPE.subheadline, { color: c.text }));
  textIn(top, 'Text / Value', '2.0 km', extend(TYPE.body, { weight: 600, color: c.text, align: 'RIGHT', width: 80 }));
  const slider = frame(goal, 'Slider', 0, 12, 326, 22, { fills: [] });
  rect(slider, 'Slider Track', 0, 8, 326, 6, fill(c.fill), 3);
  rect(slider, 'Slider Fill', 0, 8, 130, 6, fill(c.tint), 3);
  ellipse(slider, 'Slider Thumb', 119, 0, 22, 22, fill('#ffffff'));
  sectionLabel(s, c, 'Caretakers', 20, 700);
  const caretakers = groupedCard(s, 'Caretakers', 16, 728, 358, 106, c);
  row(caretakers, c, 'M', 'Mio', 'Owner', { iconBg: c.tint, chevron: true });
  separator(caretakers, c, 64, 0, 294);
  row(caretakers, c, '+', 'Invite caretaker', '', { iconBg: 'transparent', chevron: false, labelWidth: 220 });
  t(s, 'Text / Remove Dog', 'Remove Coco', 16, 776, extend(TYPE.body, { weight: 500, color: c.red, align: 'CENTER', width: 358 }));
  homeIndicator(s, c);
  return s;
}

function screenWalkDetail(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '03. Walk detail', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: '', left: '‹ Coco', right: '⋯', large: false });
  miniMap(s, c, 16, 98, 358, 260, { name: 'Map / Walk Detail' });
  t(s, 'Text / Walk Date', 'Tue, Apr 18 · 8:30 AM', 20, 376, extend(TYPE.footnote, { weight: 600, letter: 0.5, color: c.text2 }));
  t(s, 'Text / Walk Title', 'Morning walk', 20, 398, extend(TYPE.title1, { color: c.text }));
  metricGrid(s, c, 16, 448, 358, [{ label: 'Distance', value: '1.42' }, { label: 'Duration', value: '24:18' }, { label: 'Pace', value: "4'18\"" }], { name: 'Big Metrics Card', fill: c.surface, radius: RADIUS.card, height: 96, paddingX: 16, paddingY: 16, valueSize: 26 });
  const logs = groupedCard(s, 'Event Timeline', 16, 576, 358, 250, c);
  [['🏁', '8:30', 'Started at home'], ['💧', '8:37', 'Pee · corner bakery'], ['💩', '8:42', 'Poop · park entry · picked up'], ['📷', '8:49', '3 photos at fountain'], ['🏡', '8:54', 'Ended at home']].forEach((event, index) => {
    const r = autoFrame(logs, `Timeline Row / ${event[2]}`, 0, 0, 358, 49, { direction: 'HORIZONTAL', gap: 12, paddingLeft: 16, paddingRight: 16, counterAlign: 'CENTER' });
    textIn(r, 'Text / Icon', event[0], { size: 18, line: 22, align: 'CENTER', width: 22 });
    textIn(r, 'Text / Time', event[1], extend(TYPE.footnote, { color: c.text2, width: 44 }));
    textIn(r, 'Text / Note', event[2], { size: 14, line: 18, color: c.text, width: 220 });
    if (index < 4) separator(logs, c, 52, 0, 306);
  });
  homeIndicator(s, c);
  return s;
}

function screenWalkStart(parent, x, y, dark = false, multi = false) {
  const { s, c } = createScreen(parent, multi ? 'G1. Group Walk — Start' : '04b. Walk — Start', x, y, dark);
  fullMap(s, c, { route: false });
  statusBar(s, c, dark);
  glassPill(s, c, 'Walk Title', 155, 62, 80, 'Walk', dark);
  const sheet = walkSheet(s, c, dark, 10, multi ? 388 : 500, 370, multi ? 356 : 244, { name: multi ? 'Glass Sheet / Group Start' : 'Glass Sheet / Start' });
  if (multi) {
    const header = autoFrame(sheet, 'Selection Header', 0, 0, 326, 20, { direction: 'HORIZONTAL', primaryAlign: 'SPACE_BETWEEN' });
    textIn(header, 'Text / Walking With', 'WALKING WITH', extend(TYPE.footnote, { weight: 600, letter: 0.5, color: c.text2 }));
    textIn(header, 'Text / Select All', 'Select all', extend(TYPE.footnote, { weight: 500, color: c.tint, align: 'RIGHT', width: 80 }));
    const list = groupedCard(sheet, 'Dog Selector', 0, 10, 326, 164, c, { fill: dark ? 'rgba(118,118,128,0.18)' : 'rgba(118,118,128,0.08)', radius: 14 });
    [['coco', '2h ago', true], ['momo', 'yesterday', true], ['biscuit', '10 min ago', false]].forEach((d, index) => {
      const r = autoFrame(list, `Dog Selector Row / ${DOGS[d[0]].name}`, 0, 0, 326, 54, { direction: 'HORIZONTAL', gap: 10, paddingLeft: 14, paddingRight: 14, counterAlign: 'CENTER' });
      dogAvatar(r, d[0], 0, 0, 38);
      const col = autoFrame(r, 'Dog Details', 0, 0, 200, 34, { direction: 'VERTICAL', gap: 1 });
      textIn(col, 'Text / Name', DOGS[d[0]].name, extend(TYPE.subheadline, { weight: 600, color: c.text }));
      textIn(col, 'Text / Last Walk', `Last walk ${d[1]}`, { size: 11, line: 14, color: c.text2 });
      if (d[2]) {
        const check = ellipse(r, 'Selected Check', 0, 0, 24, 24, fill(c.tint));
        t(check, 'Icon / Checkmark', '✓', 0, 3, { size: 13, line: 16, weight: 700, color: '#ffffff', align: 'CENTER', width: 24 });
      } else {
        ellipse(r, 'Unselected Radio', 0, 0, 24, 24, []);
      }
      if (index < 2) separator(list, c, 62, 0, 264);
    });
    quickStats(sheet, c, dark, [['Today', '3.52 km'], ['Streak', '🔥 12d'], ['Goal', '70%']], 0, 16, 326, 70);
  } else {
    const dogRow = autoFrame(sheet, 'Dog Row', 0, 0, 326, 50, { direction: 'HORIZONTAL', gap: 12, counterAlign: 'CENTER' });
    dogAvatar(dogRow, 'coco', 0, 0, 48);
    const col = autoFrame(dogRow, 'Dog Text', 0, 0, 230, 42, { direction: 'VERTICAL', gap: 2 });
    textIn(col, 'Text / Name', 'Coco', extend(TYPE.headline, { color: c.text }));
    textIn(col, 'Text / Last Walk', 'Last walk 14 hours ago', extend(TYPE.footnote, { color: c.text2 }));
    textIn(dogRow, 'Icon / Chevron', '›', { size: 22, line: 22, color: c.text3, align: 'RIGHT', width: 16 });
    quickStats(sheet, c, dark, [['Today', '0 km'], ['Streak', '🔥 12d'], ['Goal', '70%']], 0, 18, 326, 70);
  }
  button(sheet, 'START WALK', 0, 20, 326, { c, dark, intent: 'success', height: 56, radius: 28, icon: 'play', size: 18, weight: 700, letter: 1.5 });
  tabBar(s, c, 'walk', dark);
  homeIndicator(s, c);
  return s;
}

function screenWalkNoDogs(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '04a. Walk — No Dogs', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: 'Walk', large: true });
  ellipse(s, 'Empty State Halo', 135, 290, 120, 120, fill(dark ? 'rgba(255,69,58,0.12)' : 'rgba(255,59,48,0.08)'));
  ellipse(s, 'Empty State Icon Surface', 159, 314, 72, 72, fill(dark ? 'rgba(255,69,58,0.18)' : 'rgba(255,59,48,0.12)'));
  svg(s, 'Icon / No Dog Paw', `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg" fill="${c.red}"><path d="M12 16c-2 0-3 2-3 4s1 3 2.5 3 2-1.5 2-3.5S13.5 16 12 16zm16 0c-1.5 0-2 1.5-2 3.5s.5 3.5 2 3.5 3-1.5 3-3-1.5-4-3-4zm-8 2c-2.5 0-4.5 2.5-4.5 4.5s-3 5.5-3 7.5 2.5 4 4 4 2.5-1.5 3.5-1.5 2.5 1.5 3.5 1.5 4-2 4-4-3-5.5-3-7.5-2-4.5-4.5-4.5z" opacity="0.5"/><line x1="8" y1="8" x2="32" y2="32" stroke="${c.red}" stroke-width="3" stroke-linecap="round"/></svg>`, 175, 330, 40, 40);
  t(s, 'Text / Empty Title', 'No dogs yet', 40, 434, extend(TYPE.title2, { color: c.text, align: 'CENTER', width: 310 }));
  t(s, 'Text / Empty Copy', 'Add a dog to your pack before starting a walk. It only takes a moment.', 40, 468, extend(TYPE.subheadline, { line: 22, color: c.text2, align: 'CENTER', width: 310 }));
  button(s, 'Add your first dog', 55, 548, 280, { c, dark });
  tabBar(s, c, 'walk', dark);
  homeIndicator(s, c);
  return s;
}

function screenWalkActive(parent, x, y, dark = false, multi = false, mini = false) {
  const { s, c } = createScreen(parent, mini ? 'G2b. Group Walk — Minimized' : (multi ? 'G2. Group Walk — Active' : '05. Walk — Active'), x, y, dark);
  fullMap(s, c, { route: true, dogs: multi ? ['coco', 'momo'] : undefined });
  statusBar(s, c, dark);
  walkTopBar(s, c, multi ? 'Group walk' : 'Walk with Coco', dark, multi ? ['coco', 'momo'] : undefined);
  if (mini) {
    const actions = autoFrame(s, 'Quick Log Buttons', 72, 636, 246, 44, { direction: 'HORIZONTAL', gap: 8, fills: [] });
    [['💧', 'Coco'], ['💩', 'Coco'], ['💧', 'Momo'], ['📷', '']].forEach((item) => {
      const a = autoFrame(actions, `Quick Log / ${item.join(' ')}`, 0, 0, item[1] ? 74 : 44, 44, { direction: 'HORIZONTAL', gap: 6, primaryAlign: 'CENTER', counterAlign: 'CENTER', fills: fill(c.materialStrong), strokes: fill(c.materialBorder), strokeWeight: 0.5, radius: 22, effects: [blurEffect(30)] });
      textIn(a, 'Text / Icon', item[0], { size: 16, line: 18, color: c.text });
      if (item[1]) textIn(a, 'Text / Dog', item[1], { size: 12, line: 14, color: c.text2 });
    });
    const pill = autoFrame(s, 'Minimized Walk Pill', 16, 690, 358, 58, { direction: 'HORIZONTAL', gap: 12, paddingLeft: 10, paddingRight: 14, primaryAlign: 'MIN', counterAlign: 'CENTER', fills: fill(c.materialStrong), strokes: fill(c.materialBorder), strokeWeight: 0.5, radius: RADIUS.pill, effects: [blurEffect(40)].concat(softShadow('glass')) });
    const stack = autoFrame(pill, 'Avatar Stack', 0, 0, 64, 38, { direction: 'HORIZONTAL', gap: -12, fills: [] });
    dogAvatar(stack, 'coco', 0, 0, 38);
    dogAvatar(stack, 'momo', 0, 0, 38);
    const time = autoFrame(pill, 'Time and Distance', 0, 0, 120, 36, { direction: 'VERTICAL', gap: 1 });
    textIn(time, 'Text / Time', '24:18', { size: 22, line: 24, weight: 700, letter: -0.6, color: c.text });
    textIn(time, 'Text / Distance', '· 1.42 km', extend(TYPE.caption, { color: c.text2 }));
    liveTag(pill, c, 0, 0, dark, true);
    const expand = frame(pill, 'Button / Expand', 0, 0, 38, 38, { fills: fill(dark ? 'rgba(118,118,128,0.3)' : 'rgba(118,118,128,0.18)'), radius: 19 });
    t(expand, 'Icon / Expand', '⌃', 0, 5, { size: 18, line: 22, color: c.text, align: 'CENTER', width: 38 });
    t(s, 'Text / Mini Hint', 'Tap to expand · drag up for controls', 0, 758, { size: 11, line: 14, color: c.text2, align: 'CENTER', width: W });
    homeIndicator(s, c);
    return s;
  }
  const sheet = walkSheet(s, c, dark, 10, multi ? 446 : 526, 370, multi ? 356 : 278, { name: multi ? 'Glass Sheet / Group Active' : 'Glass Sheet / Active' });
  const header = autoFrame(sheet, 'Walk Header', 0, 0, 326, 48, { direction: 'HORIZONTAL', gap: 12, counterAlign: 'CENTER' });
  if (multi) {
    const stack = autoFrame(header, 'Avatar Stack', 0, 0, 62, 36, { direction: 'HORIZONTAL', gap: -10, fills: [] });
    dogAvatar(stack, 'coco', 0, 0, 36);
    dogAvatar(stack, 'momo', 0, 0, 36);
  } else {
    dogAvatar(header, 'coco', 0, 0, 44);
  }
  const col = autoFrame(header, 'Header Text', 0, 0, 180, 42, { direction: 'VERTICAL', gap: 2 });
  textIn(col, 'Text / Name', multi ? 'Coco + Momo' : 'Coco', extend(TYPE.headline, { color: c.text }));
  textIn(col, 'Text / Subtitle', multi ? 'Group walk · together' : 'Morning walk', extend(TYPE.footnote, { color: c.text2 }));
  liveTag(header, c, 0, 0, dark);
  const metrics = metricGrid(sheet, c, 0, 18, 326, [{ label: 'Time', value: '24:18', big: !multi }, { label: 'Distance', value: '1.42', big: !multi }, { label: 'Pace', value: "4'18\"", big: !multi }], { name: 'Live Metrics', height: multi ? 74 : 76, valueSize: multi ? 28 : 32 });
  if (multi) rect(sheet, 'Divider / Metrics', 0, 0, 326, 0.5, fill(c.sep), 0);
  if (multi) {
    [['coco', '💧 2 · 💩 1'], ['momo', '💧 1 · 💩 0']].forEach((d) => {
      const r = autoFrame(sheet, `Per Dog Log / ${DOGS[d[0]].name}`, 0, 0, 326, 48, { direction: 'HORIZONTAL', gap: 10, counterAlign: 'CENTER' });
      dogAvatar(r, d[0], 0, 0, 32);
      const tcol = autoFrame(r, 'Dog Counts', 0, 0, 144, 32, { direction: 'VERTICAL', gap: 1 });
      textIn(tcol, 'Text / Name', DOGS[d[0]].name, { size: 14, line: 17, weight: 600, color: c.text });
      textIn(tcol, 'Text / Counts', d[1], { size: 11, line: 14, color: c.text2 });
      const acts = autoFrame(r, 'Event Buttons', 0, 0, 118, 34, { direction: 'HORIZONTAL', gap: 6 });
      ['💧', '💩', '📷'].forEach((icon) => {
        const b = frame(acts, `Event Button / ${icon}`, 0, 0, 34, 34, { fills: fill(c.fill), radius: 17 });
        t(b, `Text / ${icon}`, icon, 0, 8, { size: 14, line: 16, align: 'CENTER', width: 34, color: c.text });
      });
    });
  } else {
    const quick = autoFrame(sheet, 'Quick Log Row', 0, 18, 326, 40, { direction: 'HORIZONTAL', gap: 8 });
    [['💧', 'Pee', '2'], ['💩', 'Poop', '1'], ['📷', 'Photo', '4']].forEach((item) => {
      const q = autoFrame(quick, `Quick Log / ${item[1]}`, 0, 0, 103, 40, { direction: 'HORIZONTAL', gap: 6, primaryAlign: 'CENTER', counterAlign: 'CENTER', fills: fill(c.fill), radius: 12 });
      textIn(q, 'Text / Icon', item[0], { size: 15, line: 17, color: c.text });
      textIn(q, 'Text / Label', item[1], { size: 14, line: 18, weight: 500, color: c.text });
      textIn(q, 'Text / Count', item[2], { size: 13, line: 16, color: c.text2 });
    });
  }
  const actions = autoFrame(sheet, 'Pause and End Actions', 0, 18, 326, 52, { direction: 'HORIZONTAL', gap: 10 });
  button(actions, 'Pause', 0, 0, 158, { c, dark, intent: 'secondary', height: 52, radius: 16, icon: 'pause', size: 16 });
  button(actions, 'End Walk', 0, 0, 158, { c, dark, intent: 'destructive', height: 52, radius: 16, icon: 'stop', size: 16 });
  homeIndicator(s, c);
  return s;
}

function screenWalkFinish(parent, x, y, dark = false, multi = false) {
  const { s, c } = createScreen(parent, multi ? 'G3. Group Walk — Finish' : '06. Walk — Finish', x, y, dark);
  statusBar(s, c, dark);
  t(s, 'Text / Completion Label', multi ? 'GROUP WALK COMPLETE' : 'WALK COMPLETE', 20, 78, extend(TYPE.footnote, { weight: 700, letter: 1, color: c.green }));
  t(s, 'Text / Completion Title', multi ? 'Nice walk,\neveryone.' : 'Nice one,\nCoco!', 20, 100, { size: 36, line: 38, weight: 700, letter: -0.8, color: c.text, width: 280 });
  if (multi) {
    const sub = autoFrame(s, 'Subtitle with Dog Stack', 20, 184, 300, 24, { direction: 'HORIZONTAL', gap: 8, counterAlign: 'CENTER' });
    dogAvatar(sub, 'coco', 0, 0, 22);
    dogAvatar(sub, 'momo', 0, 0, 22);
    textIn(sub, 'Text / Subtitle', 'Coco and Momo · 24 min together', extend(TYPE.subheadline, { color: c.text2 }));
  } else {
    t(s, 'Text / Subtitle', "You beat yesterday's pace by 14 seconds.", 20, 184, extend(TYPE.subheadline, { color: c.text2 }));
  }
  miniMap(s, c, 20, multi ? 240 : 230, 350, multi ? 140 : 160, { chips: multi ? ['1.42 km', '24:18', "4'18\""] : null });
  if (multi) {
    t(s, 'Section Header / Per Dog', 'Per dog', 20, 398, extend(TYPE.title3, { color: c.text }));
    t(s, 'Text / View Each', 'View each', 308, 401, extend(TYPE.subheadline, { color: c.tint }));
  } else {
    sectionLabel(s, c, 'Per dog', 20, 410);
  }
  const list = groupedCard(s, 'Per Dog Summary', 16, multi ? 436 : 438, 358, multi ? 146 : 72, c);
  const rows = multi ? [['coco', '💧 2 · 💩 1 · 📷 3'], ['momo', '💧 1 · 💩 0 · 📷 1']] : [['coco', '💧 2 · 💩 1 · 📷 3']];
  rows.forEach((d, index) => {
    const r = autoFrame(list, `Per Dog Row / ${DOGS[d[0]].name}`, 0, 0, 358, 72, { direction: 'HORIZONTAL', gap: 12, paddingLeft: 16, paddingRight: 16, counterAlign: 'CENTER' });
    dogAvatar(r, d[0], 0, 0, 44);
    const col = autoFrame(r, 'Dog Summary Text', 0, 0, 238, 40, { direction: 'VERTICAL', gap: 2 });
    textIn(col, 'Text / Name', DOGS[d[0]].name, { size: 16, line: 20, weight: 600, color: c.text });
    textIn(col, 'Text / Counts', d[1], extend(TYPE.caption, { color: c.text2 }));
    textIn(r, 'Icon / Chevron', '›', { size: 22, line: 22, color: c.text3, width: 16 });
    if (index < rows.length - 1) separator(list, c, 72, 0, 286);
  });
  const actionsY = multi ? 674 : 699;
  if (multi) {
    t(s, 'Text / Save Note', "Saved to both Coco's and Momo's history", 20, 656, extend(TYPE.caption, { color: c.text2, align: 'CENTER', width: 350 }));
    const actions = autoFrame(s, 'Action Row', 20, actionsY, 350, 50, { direction: 'HORIZONTAL', gap: 10 });
    button(actions, 'Add note', 0, 0, 140, { c, dark, intent: 'secondary', height: 50 });
    button(actions, 'Save walk', 0, 0, 200, { c, dark, height: 50 });
  } else {
    button(s, 'Save walk', 20, actionsY, 350, { c, dark, height: 52 });
  }
  tabBar(s, c, 'walk', dark);
  homeIndicator(s, c);
  return s;
}

function screenWalkSaveSheet(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '06b. Walk — Save sheet', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: 'Save walk', left: '‹ Back', right: '', large: false });
  sectionLabel(s, c, 'How was the walk?', 20, 110);
  const moods = autoFrame(s, 'Mood Selector', 20, 134, 350, 82, { direction: 'HORIZONTAL', gap: 10 });
  [['😄', 'Great', true], ['🙂', 'Good'], ['😐', 'Okay'], ['😩', 'Tired']].forEach((m) => {
    const item = autoFrame(moods, `Mood / ${m[1]}`, 0, 0, 80, 82, { direction: 'VERTICAL', gap: 6, paddingTop: 14, fills: fill(m[2] ? (dark ? 'rgba(10,132,255,0.18)' : 'rgba(10,132,255,0.10)') : c.surface), strokes: m[2] ? fill(c.tint) : [], strokeWeight: 1.5, radius: RADIUS.card, primaryAlign: 'CENTER', counterAlign: 'CENTER' });
    textIn(item, 'Text / Emoji', m[0], { size: 28, line: 30, align: 'CENTER', width: 80 });
    textIn(item, 'Text / Label', m[1], extend(TYPE.caption, { weight: 600, color: m[2] ? c.tint : c.text2, align: 'CENTER', width: 80 }));
  });
  sectionLabel(s, c, 'Tags', 20, 244);
  const tags = autoFrame(s, 'Tag Cloud', 20, 268, 350, 84, { direction: 'HORIZONTAL', gap: 8, counterAlign: 'MIN' });
  [['Rainy', false], ['Sunny', true], ['Windy', false], ['Met a friend', true], ['Off-leash', false], ['Training', false]].forEach((tag) => {
    const chip = autoFrame(tags, `Tag / ${tag[0]}`, 0, 0, tag[0].length > 10 ? 112 : 78, 36, { direction: 'HORIZONTAL', primaryAlign: 'CENTER', counterAlign: 'CENTER', fills: fill(tag[1] ? (dark ? 'rgba(10,132,255,0.18)' : 'rgba(10,132,255,0.10)') : c.surface), strokes: fill(tag[1] ? c.tint : c.sep), strokeWeight: 1, radius: 20, paddingLeft: 16, paddingRight: 16 });
    textIn(chip, 'Text / Tag Label', tag[0], { size: 14, line: 18, weight: 500, color: tag[1] ? c.tint : c.text });
  });
  sectionLabel(s, c, 'Note', 20, 384);
  const note = frame(s, 'Text Area / Note', 20, 408, 350, 100, { fills: fill(c.surface), radius: 14 });
  t(note, 'Text / Note Content', 'Coco loved the park today. Met a golden retriever at the fountain…', 16, 16, extend(TYPE.subheadline, { line: 22, color: c.text3, width: 310 }));
  sectionLabel(s, c, 'Photos', 20, 536);
  const photos = autoFrame(s, 'Photo Strip', 20, 560, 350, 80, { direction: 'HORIZONTAL', gap: 8 });
  ['#d9c7a9', '#b8c9d0', '#c9d4b8'].forEach((p, index) => {
    const ph = frame(photos, `Photo Placeholder ${index + 1}`, 0, 0, 80, 80, { fills: fill(p), radius: 12 });
    t(ph, 'Icon / Camera', '📷', 0, 27, { size: 24, line: 28, align: 'CENTER', width: 80 });
  });
  const add = frame(photos, 'Photo Add Tile', 0, 0, 80, 80, { fills: fill(c.surface), strokes: fill(c.text3), strokeWeight: 1.5, radius: 12 });
  t(add, 'Icon / Plus', '+', 0, 24, { size: 28, line: 32, color: c.text3, align: 'CENTER', width: 80 });
  button(s, 'Save walk', 20, 742, 350, { c, dark, height: 52 });
  t(s, 'Text / Return Hint', 'Returns to Dogs list with updated stats', 20, 804, extend(TYPE.footnote, { color: c.text2, align: 'CENTER', width: 350 }));
  homeIndicator(s, c);
  return s;
}

function screenOwner(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '07. Owner / Settings', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: 'Me', large: true });
  const profile = autoFrame(s, 'Profile Card', 16, 194, 358, 92, { direction: 'HORIZONTAL', gap: 14, padding: 16, fills: fill(c.surface), radius: RADIUS.card, counterAlign: 'CENTER' });
  ownerAvatar(profile, 0, 0, 60);
  const ptext = autoFrame(profile, 'Profile Text', 0, 0, 240, 58, { direction: 'VERTICAL', gap: 2 });
  textIn(ptext, 'Text / Name', 'Mio Tanaka', { size: 19, line: 24, weight: 600, color: c.text });
  textIn(ptext, 'Text / Email', 'mio@walk.app', extend(TYPE.footnote, { color: c.text2 }));
  textIn(ptext, 'Text / Link', 'View profile', extend(TYPE.caption, { color: c.tint }));
  sectionLabel(s, c, 'Preferences', 20, 310);
  const prefs = groupedCard(s, 'Preferences Rows', 16, 334, 358, 208, c);
  [['🌐', 'Language', 'English'], ['📏', 'Units', 'km, min'], ['🔔', 'Notifications', 'On'], ['🌙', 'Appearance', dark ? 'Dark' : 'Light']].forEach((rdata, i) => {
    row(prefs, c, rdata[0], rdata[1], rdata[2]);
    if (i < 3) separator(prefs, c, 58, 0, 300);
  });
  sectionLabel(s, c, 'Legal', 20, 566);
  const legal = groupedCard(s, 'Legal Rows', 16, 590, 358, 156, c);
  [['📄', 'Terms of Service', ''], ['🔒', 'Privacy Policy', ''], ['ℹ︎', 'About', 'v1.2.3']].forEach((rdata, i) => {
    row(legal, c, rdata[0], rdata[1], rdata[2]);
    if (i < 2) separator(legal, c, 58, 0, 300);
  });
  const signout = groupedCard(s, 'Sign Out Card', 16, 766, 358, 48, c);
  t(signout, 'Text / Sign Out', 'Sign out', 0, 13, { size: 16, line: 22, weight: 500, color: c.red, align: 'CENTER', width: 358 });
  tabBar(s, c, 'owner', dark);
  homeIndicator(s, c);
  return s;
}

function screenOwnerProfile(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '07b. Owner — Profile', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: 'Profile', left: '‹ Me', right: 'Edit', large: false });
  ownerAvatar(s, 151, 120, 88);
  t(s, 'Text / Owner Name', 'Mio Tanaka', 0, 220, { size: 24, line: 30, weight: 700, letter: -0.4, color: c.text, align: 'CENTER', width: W });
  t(s, 'Text / Email', 'mio@walk.app', 0, 252, { size: 14, line: 18, color: c.text2, align: 'CENTER', width: W });
  t(s, 'Text / Since', 'Walking since March 2024', 0, 278, extend(TYPE.footnote, { color: c.text2, align: 'CENTER', width: W }));
  metricGrid(s, c, 16, 324, 358, [{ label: 'Walks', value: '263' }, { label: 'km', value: '412.8' }, { label: 'Total time', value: '87h' }, { label: 'Dogs', value: '3' }], { name: 'Lifetime Stats', fill: c.surface, radius: RADIUS.card, height: 72, paddingY: 16, dividers: true, valueSize: 20 });
  barChart(s, c, 16, 416, 358, 166, [
    { label: 'Mon', value: 0.8 }, { label: 'Tue', value: 1.2 }, { label: 'Wed', value: 2.1 }, { label: 'Thu', value: 0 }, { label: 'Fri', value: 1.6 }, { label: 'Sat', value: 2.4 }, { label: 'Sun', value: 1.42, today: true },
  ], { title: 'This week', total: '9.52 km total' });
  sectionLabel(s, c, 'Achievements', 20, 610);
  const ach = autoFrame(s, 'Achievements', 16, 638, 358, 86, { direction: 'HORIZONTAL', gap: 10 });
  [['🔥', '12-day streak', 'rgba(255,149,0,0.12)', c.orange], ['🏆', '100 km', 'rgba(48,209,88,0.12)', c.green], ['🌅', 'Early bird', 'rgba(10,132,255,0.12)', c.tint]].forEach((a) => {
    const card = autoFrame(ach, `Achievement / ${a[1]}`, 0, 0, 112, 86, { direction: 'VERTICAL', gap: 6, fills: fill(c.surface), radius: 14, primaryAlign: 'CENTER', counterAlign: 'CENTER' });
    const icon = ellipse(card, 'Icon Surface', 0, 0, 40, 40, fill(a[2]));
    t(icon, 'Text / Icon', a[0], 0, 9, { size: 20, line: 22, align: 'CENTER', width: 40 });
    textIn(card, 'Text / Label', a[1], { size: 11, line: 14, weight: 600, color: a[3], align: 'CENTER', width: 92 });
  });
  const account = groupedCard(s, 'Account Actions', 16, 748, 358, 126, c);
  row(account, c, '📧', 'Change email', '', { iconBg: 'transparent' });
  separator(account, c, 44, 0, 314);
  row(account, c, '🔑', 'Change password', '', { iconBg: 'transparent' });
  separator(account, c, 44, 0, 314);
  t(account, 'Text / Delete Account', 'Delete account', 0, 105, { size: 16, line: 22, weight: 500, color: c.red, align: 'CENTER', width: 358 });
  homeIndicator(s, c);
  return s;
}

function screenOwnerProfileEdit(parent, x, y, dark = false) {
  const { s, c } = createScreen(parent, '07c. Owner — Edit profile', x, y, dark);
  statusBar(s, c, dark);
  navBar(s, c, { title: 'Edit profile', left: 'Cancel', right: 'Save', rightBold: true, large: false });
  const avatar = ownerAvatar(s, 145, 118, 100);
  const badge = frame(avatar, 'Camera Badge', 68, 68, 32, 32, { fills: fill(c.tint), radius: 16, strokes: fill(c.bg), strokeWeight: 3 });
  svg(badge, 'Icon / Camera', `<svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`, 9, 9, 14, 14);
  t(s, 'Text / Change Photo', 'Change photo', 0, 228, extend(TYPE.footnote, { weight: 500, color: c.tint, align: 'CENTER', width: W }));
  fieldGroup(s, c, 16, 274, [['Name', 'Mio Tanaka'], ['Email', 'mio@walk.app'], ['Phone', '+81 90-1234-5678'], ['Location', 'Tokyo, Japan']], 80);
  sectionLabel(s, c, 'Bio', 20, 506);
  const bio = frame(s, 'Text Area / Bio', 16, 534, 358, 80, { fills: fill(c.surface), radius: 14 });
  t(bio, 'Text / Bio', 'Dog lover in Tokyo. Walking Coco, Momo & Biscuit every day rain or shine.', 16, 16, extend(TYPE.subheadline, { line: 22, color: c.text, width: 320 }));
  sectionLabel(s, c, 'Sharing', 20, 642);
  const sharing = groupedCard(s, 'Sharing Toggles', 16, 670, 358, 156, c);
  [['Walk activity', true], ['Streak badges', true], ['Profile public', false]].forEach((rdata, index) => {
    const r = autoFrame(sharing, `Toggle Row / ${rdata[0]}`, 0, 0, 358, 52, { direction: 'HORIZONTAL', primaryAlign: 'SPACE_BETWEEN', counterAlign: 'CENTER', paddingLeft: 16, paddingRight: 16 });
    textIn(r, 'Text / Label', rdata[0], { size: 16, line: 22, color: c.text });
    const toggle = frame(r, 'Toggle', 0, 0, 51, 31, { fills: fill(rdata[1] ? c.green : c.fill), radius: 15.5 });
    ellipse(toggle, 'Toggle Thumb', rdata[1] ? 22 : 2, 2, 27, 27, fill('#ffffff'));
    if (index < 2) separator(sharing, c, 16, 0, 342);
  });
  homeIndicator(s, c);
  return s;
}

async function createComponentsPage(page) {
  await figma.setCurrentPageAsync(page);
  t(page, 'Page Title / Components', 'Components', 0, 0, { size: 40, line: 48, weight: 700, color: COLORS.ink });
  t(page, 'Page Description', 'Reusable primitives rebuilt from the HTML reference as native Figma components and variants.', 0, 56, extend(TYPE.subheadline, { color: 'rgba(60,50,40,0.7)', width: 720 }));

  const buttonVariants = [
    ['Intent=Primary', { intent: 'primary', c: palette(false) }],
    ['Intent=Secondary', { intent: 'secondary', c: palette(false) }],
    ['Intent=Success', { intent: 'success', c: palette(false), icon: 'play', radius: 28, height: 56, label: 'START WALK' }],
    ['Intent=Destructive', { intent: 'destructive', c: palette(false), icon: 'stop', label: 'End Walk' }],
  ].map(([variant, opts], index) => {
    const comp = figma.createComponent();
    comp.name = `Button/${variant}`;
    page.appendChild(comp);
    setXY(comp, 0, 120 + index * 80);
    comp.resize(180, opts.height || 50);
    comp.fills = [];
    button(comp, opts.label || 'Button', 0, 0, 180, extend(opts, { dark: false }));
    return comp;
  });
  const buttonSet = figma.combineAsVariants(buttonVariants, page);
  buttonSet.name = 'Button';
  setXY(buttonSet, 0, 120);

  const tabVariants = ['dogs', 'walk', 'owner'].map((active, index) => {
    const comp = figma.createComponent();
    comp.name = `Tab Bar/Active=${active}`;
    page.appendChild(comp);
    setXY(comp, 260, 120 + index * 90);
    comp.resize(390, 100);
    comp.fills = [];
    tabBar(comp, palette(false), active, false);
    return comp;
  });
  const tabSet = figma.combineAsVariants(tabVariants, page);
  tabSet.name = 'Tab Bar';
  setXY(tabSet, 260, 120);

  const tagVariants = [['State=Live', 'LIVE', COLORS.red], ['State=Selected', 'Sunny', COLORS.tint], ['State=Default', 'Rainy', COLORS.light.text]].map((item, index) => {
    const comp = figma.createComponent();
    comp.name = `Tag/${item[0]}`;
    comp.resize(96, 32);
    comp.fills = [];
    page.appendChild(comp);
    setXY(comp, 720, 120 + index * 52);
    const bg = item[0] === 'State=Default' ? COLORS.light.surface : (item[2] === COLORS.red ? 'rgba(255,59,48,0.1)' : 'rgba(10,132,255,0.10)');
    const tag = autoFrame(comp, `Tag / ${item[1]}`, 0, 0, 96, 32, { direction: 'HORIZONTAL', primaryAlign: 'CENTER', counterAlign: 'CENTER', gap: 6, fills: fill(bg), radius: 16, strokes: item[0] === 'State=Selected' ? fill(COLORS.tint) : [], strokeWeight: 1 });
    if (item[0] === 'State=Live') ellipse(tag, 'Live Dot', 0, 0, 6, 6, fill(COLORS.red));
    textIn(tag, 'Text / Label', item[1], { size: 12, line: 16, weight: 600, color: item[2] });
    return comp;
  });
  const tagSet = figma.combineAsVariants(tagVariants, page);
  tagSet.name = 'Tag';
  setXY(tagSet, 720, 120);

  const avatars = ['coco', 'momo', 'biscuit'].map((dog, index) => {
    const comp = figma.createComponent();
    comp.name = `Dog Avatar/Dog=${DOGS[dog].name}`;
    comp.resize(80, 80);
    comp.fills = [];
    page.appendChild(comp);
    setXY(comp, 900, 120 + index * 104);
    dogAvatar(comp, dog, 12, 12, 56);
    return comp;
  });
  const avatarSet = figma.combineAsVariants(avatars, page);
  avatarSet.name = 'Dog Avatar';
  setXY(avatarSet, 900, 120);

  const chrome = figma.createComponent();
  chrome.name = 'Phone Chrome/Status Bar + Home Indicator';
  page.appendChild(chrome);
  setXY(chrome, 0, 520);
  chrome.resize(390, 844);
  chrome.fills = fill(COLORS.light.bg);
  chrome.cornerRadius = RADIUS.phone;
  statusBar(chrome, palette(false), false);
  homeIndicator(chrome, palette(false));

  const form = figma.createComponent();
  form.name = 'Grouped Form Fields';
  page.appendChild(form);
  setXY(form, 460, 520);
  form.resize(358, 156);
  form.fills = [];
  fieldGroup(form, palette(false), 0, 0, [['Label', 'Value'], ['Label', 'Value'], ['Label', 'Value']], 80);

  const map = figma.createComponent();
  map.name = 'Map Surface/Full';
  page.appendChild(map);
  setXY(map, 900, 520);
  map.resize(390, 844);
  map.fills = [];
  fullMap(map, palette(false), { route: true, dogs: ['coco', 'momo'] });
}

async function createDesignSystemPage(page) {
  await figma.setCurrentPageAsync(page);
  t(page, 'Page Title / Design System', 'Design System', 0, 0, { size: 40, line: 48, weight: 700, color: COLORS.ink });
  t(page, 'Page Description', 'Local styles and variables align the Figma file with the React Native Precise token set.', 0, 56, extend(TYPE.subheadline, { color: 'rgba(60,50,40,0.7)', width: 720 }));
  const swatches = [
    ['Canvas', COLORS.canvas], ['Light BG', COLORS.light.bg], ['Surface', COLORS.light.surface], ['Fill', COLORS.light.fill],
    ['Tint', COLORS.tint], ['Success', COLORS.green], ['Error', COLORS.red], ['Warning', COLORS.orange],
    ['Dark BG', COLORS.dark.bg], ['Dark Surface', COLORS.dark.surface], ['Map Park', COLORS.light.mapPark], ['Map Water', COLORS.light.mapWater],
  ];
  t(page, 'Section Title / Color Styles', 'Color Styles', 0, 120, extend(TYPE.title2, { color: COLORS.ink }));
  swatches.forEach((swatch, index) => {
    const x = (index % 4) * 180;
    const y = 170 + Math.floor(index / 4) * 96;
    rect(page, `Color Swatch / ${swatch[0]}`, x, y, 140, 48, fill(swatch[1]), 10);
    t(page, `Text / ${swatch[0]}`, swatch[0], x, y + 58, extend(TYPE.footnote, { weight: 600, color: COLORS.ink, width: 150 }));
  });
  t(page, 'Section Title / Text Styles', 'Text Styles', 0, 486, extend(TYPE.title2, { color: COLORS.ink }));
  const typeRows = entries(TYPE);
  typeRows.forEach(([name, spec], index) => {
    const y = 540 + index * 48;
    t(page, `Text Style Sample / ${name}`, name, 0, y, extend(TYPE.footnote, { color: 'rgba(60,50,40,0.6)', width: 140 }));
    t(page, `Text Style Preview / ${name}`, 'The quick walk with Coco', 170, y - 6, extend(spec, { color: COLORS.ink, width: 420 }));
  });
  t(page, 'Section Title / Variables', 'Variables', 720, 120, extend(TYPE.title2, { color: COLORS.ink }));
  const tokenPanel = autoFrame(page, 'Variable Summary', 720, 170, 360, 420, { direction: 'VERTICAL', gap: 16, padding: 24, fills: fill('#ffffff'), radius: 16 });
  textIn(tokenPanel, 'Text / Spacing', 'Spacing: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64', extend(TYPE.subheadline, { line: 22, color: COLORS.ink, width: 312 }));
  textIn(tokenPanel, 'Text / Radius', 'Radius: 4, 8, 12, 14, 16, 32, 44, 100', extend(TYPE.subheadline, { line: 22, color: COLORS.ink, width: 312 }));
  textIn(tokenPanel, 'Text / Sizing', 'Sizing: phone 390x844, status 54, nav 44, tab 83, buttons 50/56', extend(TYPE.subheadline, { line: 22, color: COLORS.ink, width: 312 }));
  textIn(tokenPanel, 'Text / Implementation Note', 'React Native handoff should map these styles to apps/mobile/theme/tokens.ts before implementation.', extend(TYPE.footnote, { line: 20, color: 'rgba(60,50,40,0.7)', width: 312 }));
}

async function createCoverPage(page) {
  await figma.setCurrentPageAsync(page);
  rect(page, 'Cover Background', -160, -120, 1400, 900, fill(COLORS.canvas), 0);
  t(page, 'Cover Eyebrow', 'PRECISE · WALKING DOG · FIGMA REBUILD', 0, 0, { size: 12, line: 16, weight: 700, letter: 1, color: 'rgba(60,50,40,0.6)', width: 600 });
  t(page, 'Cover Title', 'A dog-walking app,\ndesigned with restraint.', 0, 32, { size: 56, line: 62, weight: 700, letter: -1, color: COLORS.ink, width: 760 });
  t(page, 'Cover Summary', 'Native editable Figma file generator based on docs/design.html. Built for long-term product development, reusable components, tokenized styles, and React Native handoff.', 0, 176, { size: 18, line: 28, weight: 400, color: 'rgba(60,50,40,0.75)', width: 760 });
  const axes = autoFrame(page, 'Product Decision Axes', 0, 286, 760, 170, { direction: 'HORIZONTAL', gap: 16 });
  [['Dog experience', 'Deepens dog relationships through pack, per-dog, and walk-state screens.'], ['Walk data', 'Preserves route, event, duration, pace, and goal-progress surfaces.'], ['Owner contribution', 'Shows progress, streaks, achievements, and saved-walk feedback.']].forEach((axis) => {
    const card = autoFrame(axes, `Axis / ${axis[0]}`, 0, 0, 240, 170, { direction: 'VERTICAL', gap: 10, padding: 18, fills: fill('#ffffff', 0.76), radius: 16 });
    textIn(card, 'Text / Title', axis[0], extend(TYPE.headline, { color: COLORS.ink, width: 204 }));
    textIn(card, 'Text / Copy', axis[1], extend(TYPE.footnote, { line: 20, color: 'rgba(60,50,40,0.72)', width: 204 }));
  });
  const preview = autoFrame(page, 'Preview Phones', 0, 520, 980, 320, { direction: 'HORIZONTAL', gap: 40 });
  [
    ['Walk Start', COLORS.light.mapPark, COLORS.green],
    ['Active Walk', COLORS.dark.mapPark, COLORS.green],
    ['Dogs', COLORS.light.bg, COLORS.tint],
    ['Profile', COLORS.light.bg, COLORS.purple],
  ].forEach((item) => {
    const phone = frame(preview, `Preview Phone / ${item[0]}`, 0, 0, 180, 300, { fills: fill(item[1]), radius: 28, clip: true, effects: softShadow() });
    rect(phone, 'Screen Top Band', 0, 0, 180, 42, fill('rgba(255,255,255,0.55)'), 0);
    rect(phone, 'Home Indicator', 61, 284, 58, 3, fill(item[0] === 'Active Walk' ? '#ffffff' : '#000000', 0.8), 2);
    if (item[0].includes('Walk')) {
      svg(phone, 'Route Preview', `<svg width="180" height="300" viewBox="0 0 180 300" xmlns="http://www.w3.org/2000/svg"><path d="M30 250 L60 250 L60 170 L110 170 L110 90 L145 58" stroke="${item[2]}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="145" cy="58" r="10" fill="${item[2]}" opacity="0.25"/><circle cx="145" cy="58" r="5" fill="#fff"/></svg>`, 0, 0, 180, 300);
      const sheet = frame(phone, 'Preview Sheet', 8, 208, 164, 58, { fills: fill('rgba(255,255,255,0.78)'), radius: 18, effects: [blurEffect(20)] });
      rect(sheet, 'Metric Line 1', 16, 14, 58, 8, fill('rgba(0,0,0,0.28)'), 4);
      rect(sheet, 'Metric Line 2', 16, 32, 132, 8, fill('rgba(0,0,0,0.18)'), 4);
    } else if (item[0] === 'Dogs') {
      [76, 138, 200].forEach((yy, index) => {
        const card = frame(phone, `Dog Row Preview ${index + 1}`, 12, yy, 156, 44, { fills: fill('#ffffff'), radius: 12 });
        ellipse(card, 'Dog Dot', 10, 8, 28, 28, gradient([COLORS.dogCocoA, COLORS.dogCocoB]));
        rect(card, 'Title Line', 48, 12, 72, 6, fill('rgba(0,0,0,0.42)'), 3);
        rect(card, 'Meta Line', 48, 26, 94, 5, fill('rgba(0,0,0,0.18)'), 3);
      });
    } else {
      ownerAvatar(phone, 66, 70, 48);
      rect(phone, 'Name Line', 50, 132, 80, 8, fill('rgba(0,0,0,0.42)'), 4);
      rect(phone, 'Stats Card', 16, 166, 148, 44, fill('#ffffff'), 12);
      rect(phone, 'Chart Card', 16, 226, 148, 44, fill('#ffffff'), 12);
    }
  });
}

async function createScreensPage(page) {
  await figma.setCurrentPageAsync(page);
  t(page, 'Page Title / Screens', 'Screens', 0, 0, { size: 40, line: 48, weight: 700, color: COLORS.ink });
  t(page, 'Page Description', 'All artboards are native Figma layers. Maps and route lines use editable vectors; repeated UI surfaces are built from shared builders and component conventions.', 0, 56, extend(TYPE.subheadline, { color: 'rgba(60,50,40,0.7)', width: 920 }));

  const groups = [
    ['Onboarding', [screenSignIn, screenSignUp]],
    ['Tab 1 · Dogs', [screenDogsList, screenDogDetail, screenDogEdit, screenWalkingGoal, screenWalkDetail]],
    ['Tab 2 · Walk', [screenWalkNoDogs, screenWalkStart, screenWalkActive, screenWalkFinish, screenWalkSaveSheet]],
    ['Tab 2 · Walk — Group', [
      (p, x, y) => screenWalkStart(p, x, y, false, true),
      (p, x, y) => screenWalkActive(p, x, y, false, true, false),
      (p, x, y) => screenWalkActive(p, x, y, false, true, true),
      (p, x, y) => screenWalkFinish(p, x, y, false, true),
    ]],
    ['Tab 3 · Me', [screenOwner, screenOwnerProfile, screenOwnerProfileEdit]],
  ];

  let y = 140;
  for (const [label, builders] of groups) {
    t(page, `Section / ${label}`, label, 0, y, extend(TYPE.title2, { color: COLORS.ink }));
    const rowY = y + 52;
    builders.forEach((builder, index) => {
      builder(page, index * 460, rowY);
    });
    y += 960;
  }
}

async function main() {
  await loadPreferredFonts();
  createPaintStyles();
  createTextStyles();
  createVariables();

  const coverAndDesignSystem = getBasePage('Cover + Design System');
  const components = createPage('Components');
  const screens = createPage('Screens');

  await createCoverPage(coverAndDesignSystem);
  await offsetNewChildren(coverAndDesignSystem, 0, 960, createDesignSystemPage);
  await createComponentsPage(components);
  await createScreensPage(screens);

  await figma.setCurrentPageAsync(coverAndDesignSystem);
  figma.viewport.scrollAndZoomIntoView(coverAndDesignSystem.children.slice(0, 8));
  figma.closePlugin('Walking Dog Precise native Figma file generated. Cover and Design System are sections on the first page for Figma Starter compatibility.');
}

main().catch((error) => {
  console.error(error);
  figma.closePlugin(`Generation failed: ${error && error.message ? error.message : error}`);
});
