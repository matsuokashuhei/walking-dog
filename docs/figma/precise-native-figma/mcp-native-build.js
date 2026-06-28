const W = 390;
const H = 844;

const C = {
  canvas: '#f0eee9',
  ink: '#2a2218',
  tint: '#0a84ff',
  green: '#30d158',
  red: '#ff453a',
  orange: '#ff9f0a',
  purple: '#bf5af2',
  mint: '#5eddb7',
  light: {
    bg: '#f2f2f7',
    surface: '#ffffff',
    fill: 'rgba(118,118,128,0.12)',
    text: '#000000',
    text2: 'rgba(60,60,67,0.6)',
    text3: 'rgba(60,60,67,0.32)',
    sep: 'rgba(60,60,67,0.18)',
    map: '#efeeea',
    road: '#ffffff',
    park: '#d9ecd2',
    water: '#b8d8f0',
    glass: 'rgba(255,255,255,0.78)',
  },
  dark: {
    bg: '#000000',
    surface: '#1c1c1e',
    fill: 'rgba(118,118,128,0.24)',
    text: '#ffffff',
    text2: 'rgba(235,235,245,0.62)',
    text3: 'rgba(235,235,245,0.32)',
    sep: 'rgba(84,84,88,0.62)',
    map: '#2c2c2e',
    road: '#3a3a3c',
    park: '#1f3a2a',
    water: '#0f2d4a',
    glass: 'rgba(28,28,30,0.78)',
  },
  dog: {
    coco: ['#f6d5a7', '#c89968'],
    momo: ['#ffb56b', '#c25a1a'],
    biscuit: ['#fae6a6', '#b88a3a'],
  },
};

const T = {
  largeTitle: [34, 41, 700, -0.6],
  title1: [28, 34, 700, -0.5],
  title2: [22, 28, 700, -0.4],
  title3: [20, 25, 700, -0.3],
  headline: [17, 22, 600, 0],
  body: [17, 22, 400, 0],
  subheadline: [15, 20, 400, 0],
  footnote: [13, 18, 400, 0],
  caption: [12, 16, 400, 0],
  label: [11, 14, 600, 0.4],
};

const DOGS = {
  coco: ['Coco', 'Toy Poodle', 'C'],
  momo: ['Momo', 'Shiba Inu', 'M'],
  biscuit: ['Biscuit', 'Corgi', 'B'],
};

const R = { sm: 8, md: 12, card: 16, sheet: 32, phone: 44, pill: 100 };
let FONT = {
  regular: { family: 'Inter', style: 'Regular' },
  medium: { family: 'Inter', style: 'Medium' },
  semibold: { family: 'Inter', style: 'Semi Bold' },
  bold: { family: 'Inter', style: 'Bold' },
};

function parseColor(input) {
  const s = String(input || '#000000').trim();
  if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
  if (s[0] === '#') {
    const h = s.slice(1);
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: 1,
    };
  }
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (!m) return { r: 0, g: 0, b: 0, a: 1 };
  const p = m[1].split(',').map((v) => v.trim());
  return { r: +p[0], g: +p[1], b: +p[2], a: p[3] == null ? 1 : +p[3] };
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
    gradientStops: colors.map((color, i) => {
      const c = parseColor(color);
      return { position: i / Math.max(1, colors.length - 1), color: { r: c.r / 255, g: c.g / 255, b: c.b / 255, a: c.a } };
    }),
  }];
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

function palette(dark) {
  return dark ? extend(C.dark, { tint: C.tint, green: C.green, red: C.red, orange: C.orange, purple: C.purple }) :
    extend(C.light, { tint: C.tint, green: C.green, red: C.red, orange: C.orange, purple: C.purple });
}

function font(weight) {
  if (weight >= 700) return FONT.bold;
  if (weight >= 600) return FONT.semibold;
  if (weight >= 500) return FONT.medium;
  return FONT.regular;
}

async function loadFonts() {
  const candidates = [
    {
      regular: { family: 'SF Pro Text', style: 'Regular' },
      medium: { family: 'SF Pro Text', style: 'Medium' },
      semibold: { family: 'SF Pro Text', style: 'Semibold' },
      bold: { family: 'SF Pro Display', style: 'Bold' },
    },
    FONT,
  ];
  for (const candidate of candidates) {
    try {
      await figma.loadFontAsync(candidate.regular);
      await figma.loadFontAsync(candidate.medium);
      await figma.loadFontAsync(candidate.semibold);
      await figma.loadFontAsync(candidate.bold);
      FONT = candidate;
      return;
    } catch (error) {}
  }
}

function xy(node, x, y) {
  node.x = x;
  node.y = y;
  return node;
}

function frame(parent, name, x, y, w, h, opts = {}) {
  const node = figma.createFrame();
  node.name = name;
  node.resize(w, h);
  node.fills = opts.fills || [];
  node.cornerRadius = opts.radius || 0;
  node.clipsContent = !!opts.clip;
  if (opts.strokes) {
    node.strokes = opts.strokes;
    node.strokeWeight = opts.strokeWeight || 1;
  }
  if (opts.effects) node.effects = opts.effects;
  parent.appendChild(node);
  return xy(node, x, y);
}

function auto(parent, name, x, y, w, h, opts = {}) {
  const node = frame(parent, name, x, y, w || 1, h || 1, opts);
  node.layoutMode = opts.direction || 'VERTICAL';
  node.itemSpacing = opts.gap || 0;
  node.paddingTop = opts.pt !== undefined ? opts.pt : (opts.p !== undefined ? opts.p : 0);
  node.paddingRight = opts.pr !== undefined ? opts.pr : (opts.p !== undefined ? opts.p : 0);
  node.paddingBottom = opts.pb !== undefined ? opts.pb : (opts.p !== undefined ? opts.p : 0);
  node.paddingLeft = opts.pl !== undefined ? opts.pl : (opts.p !== undefined ? opts.p : 0);
  node.primaryAxisAlignItems = opts.primary || 'MIN';
  node.counterAxisAlignItems = opts.counter || 'MIN';
  node.primaryAxisSizingMode = opts.primarySize || (h ? 'FIXED' : 'AUTO');
  node.counterAxisSizingMode = opts.counterSize || (w ? 'FIXED' : 'AUTO');
  return node;
}

function rect(parent, name, x, y, w, h, paints, radius = 0) {
  const node = figma.createRectangle();
  node.name = name;
  node.resize(w, h);
  node.fills = paints || [];
  node.cornerRadius = radius;
  parent.appendChild(node);
  return xy(node, x, y);
}

function ellipse(parent, name, x, y, w, h, paints) {
  const node = figma.createEllipse();
  node.name = name;
  node.resize(w, h);
  node.fills = paints || [];
  parent.appendChild(node);
  return xy(node, x, y);
}

function text(parent, name, value, x, y, spec = {}) {
  const preset = spec.preset ? T[spec.preset] : null;
  const size = spec.size || (preset ? preset[0] : T.body[0]);
  const line = spec.line || (preset ? preset[1] : Math.round(size * 1.25));
  const weight = spec.weight || (preset ? preset[2] : 400);
  const node = figma.createText();
  node.name = name;
  node.fontName = font(weight);
  node.characters = String(value);
  node.fontSize = size;
  node.lineHeight = { unit: 'PIXELS', value: line };
  node.letterSpacing = { unit: 'PIXELS', value: spec.letter !== undefined ? spec.letter : (preset ? preset[3] : 0) };
  node.fills = fill(spec.color || C.light.text);
  node.textAlignHorizontal = spec.align || 'LEFT';
  node.textAutoResize = spec.width ? 'HEIGHT' : 'WIDTH_AND_HEIGHT';
  if (spec.width) node.resize(spec.width, spec.height || 1);
  parent.appendChild(node);
  return xy(node, x, y);
}

function textIn(parent, name, value, spec = {}) {
  return text(parent, name, value, 0, 0, spec);
}

function shadow(kind = 'soft') {
  if (kind === 'phone') return [
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.10 }, offset: { x: 0, y: 18 }, radius: 48, spread: 0, visible: true, blendMode: 'NORMAL' },
    { type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.07 }, offset: { x: 0, y: 3 }, radius: 12, spread: 0, visible: true, blendMode: 'NORMAL' },
  ];
  return [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.10 }, offset: { x: 0, y: 8 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }];
}

function blur(radius = 28) {
  return { type: 'BACKGROUND_BLUR', radius, visible: true };
}

function createStyles() {
  const paints = [
    ['Canvas/Warm', C.canvas], ['Light/Background', C.light.bg], ['Light/Surface', C.light.surface],
    ['Light/Text', C.light.text], ['Dark/Background', C.dark.bg], ['Dark/Surface', C.dark.surface],
    ['Semantic/Tint', C.tint], ['Semantic/Success', C.green], ['Semantic/Error', C.red],
    ['Semantic/Warning', C.orange], ['Map/Park', C.light.park], ['Map/Water', C.light.water],
  ];
  paints.forEach(([name, value]) => {
    const s = figma.createPaintStyle();
    s.name = name;
    s.paints = fill(value);
  });
  entries(T).forEach(([name, v]) => {
    const s = figma.createTextStyle();
    s.name = `iOS/${name}`;
    s.fontName = font(v[2]);
    s.fontSize = v[0];
    s.lineHeight = { unit: 'PIXELS', value: v[1] };
    s.letterSpacing = { unit: 'PIXELS', value: v[3] };
  });
}

function createVariables() {
  if (!figma.variables) return;
  try {
    const collection = figma.variables.createVariableCollection('Walking Dog Variables');
    const mode = collection.modes[0].modeId;
    const tokens = {
      'spacing/0': 0, 'spacing/4': 4, 'spacing/8': 8, 'spacing/12': 12, 'spacing/16': 16, 'spacing/24': 24, 'spacing/32': 32,
      'radius/sm': 8, 'radius/md': 12, 'radius/card': 16, 'radius/sheet': 32, 'radius/phone': 44, 'radius/pill': 100,
      'size/phoneWidth': W, 'size/phoneHeight': H, 'size/statusBar': 54, 'size/tabBar': 83, 'size/buttonHeight': 50,
    };
    entries(tokens).forEach(([name, value]) => {
      const v = figma.variables.createVariable(name, collection, 'FLOAT');
      v.scopes = name.startsWith('spacing/')
        ? ['GAP']
        : name.startsWith('radius/')
          ? ['CORNER_RADIUS']
          : ['WIDTH_HEIGHT'];
      v.setVariableCodeSyntax('WEB', `var(--${name.replace(/\//g, '-')})`);
      v.setVariableCodeSyntax('iOS', name.replace(/\//g, '.'));
      v.setValueForMode(mode, value);
    });
  } catch (error) {}
}

function status(parent, c) {
  const bar = auto(parent, 'Component Instance / Status Bar', 0, 0, W, 54, { direction: 'HORIZONTAL', primary: 'SPACE_BETWEEN', counter: 'MAX', pl: 30, pr: 30, pb: 8 });
  textIn(bar, 'Text / Time', '9:41', { preset: 'headline', color: c.text });
  const icons = auto(bar, 'Signal Indicators', 0, 0, 72, 14, { direction: 'HORIZONTAL', gap: 6, counter: 'CENTER' });
  [8, 10, 12, 10].forEach((h, i) => rect(icons, `Cellular Bar ${i + 1}`, 0, 0, 3, h, fill(c.text, i === 3 ? 0.35 : 1), 1));
  rect(icons, 'Wi-Fi Mark', 0, 0, 16, 10, fill(c.text), 3);
  const battery = frame(icons, 'Battery', 0, 0, 25, 11, { fills: [], strokes: fill(c.text, 0.6), strokeWeight: 1, radius: 3 });
  rect(battery, 'Battery Fill', 2, 2, 16, 7, fill(c.text, 0.65), 1);
  return bar;
}

function home(parent, c) {
  rect(parent, 'Component Instance / Home Indicator', 128, 831, 134, 5, fill(c.text, 0.9), 3);
}

function nav(parent, c, title, opts = {}) {
  const h = opts.large === false ? 44 : 140;
  const n = frame(parent, `Component Instance / Nav Bar / ${title}`, 0, 54, W, h, { fills: [] });
  const row = auto(n, 'Navigation Row', 16, 0, 358, 44, { direction: 'HORIZONTAL', primary: 'SPACE_BETWEEN', counter: 'CENTER' });
  textIn(row, 'Text / Left Action', opts.left || '', { preset: 'body', color: c.tint, width: 90 });
  if (opts.large === false) textIn(row, 'Text / Title', title, { preset: 'headline', color: c.text, width: 160, align: 'CENTER' });
  textIn(row, 'Text / Right Action', opts.right || '', { preset: 'body', weight: opts.rightBold ? 600 : 400, color: c.tint, width: 90, align: 'RIGHT' });
  if (opts.large !== false) text(n, 'Text / Large Title', title, 16, 50, { preset: 'largeTitle', color: c.text });
  return n;
}

function avatar(parent, dog, x, y, size = 56, name = 'Component Instance / Dog Avatar') {
  const d = DOGS[dog];
  const node = frame(parent, `${name} / ${d[0]}`, x, y, size, size, { fills: gradient(C.dog[dog]), radius: size / 2 });
  text(node, 'Text / Initial', d[2], 0, size * 0.23, { size: Math.round(size * 0.42), line: Math.round(size * 0.5), weight: 700, color: '#3a2410', align: 'CENTER', width: size });
  return node;
}

function ownerAvatar(parent, x, y, size = 60) {
  const node = frame(parent, 'Component Instance / Owner Avatar', x, y, size, size, { fills: gradient([C.purple, C.tint]), radius: size / 2 });
  text(node, 'Text / Initial', 'M', 0, size * 0.25, { size: Math.round(size * 0.38), line: Math.round(size * 0.45), weight: 700, color: '#ffffff', align: 'CENTER', width: size });
  return node;
}

function button(parent, label, x, y, w, c, opts = {}) {
  const bg = opts.kind === 'secondary' ? c.fill : opts.kind === 'success' ? c.green : opts.kind === 'danger' ? c.red : opts.kind === 'apple' ? c.text : c.tint;
  const fg = opts.kind === 'secondary' ? c.text : opts.kind === 'apple' ? c.bg : '#ffffff';
  const b = auto(parent, `Component Instance / Button / ${label}`, x, y, w, opts.h || 50, { direction: 'HORIZONTAL', primary: 'CENTER', counter: 'CENTER', gap: 8, fills: fill(bg), radius: opts.radius || 14, effects: opts.kind === 'success' ? shadow() : [] });
  if (opts.icon) rect(b, `Icon / ${opts.icon}`, 0, 0, 14, 14, fill(fg), opts.icon === 'Pause' ? 2 : 7);
  textIn(b, 'Text / Button Label', label, { preset: 'body', weight: 600, color: fg, align: 'CENTER' });
  return b;
}

function card(parent, name, x, y, w, h, c, opts = {}) {
  return auto(parent, `Group Card / ${name}`, x, y, w, h, { direction: 'VERTICAL', fills: fill(opts.fill || c.surface), radius: opts.radius || R.card, p: opts.p || 0, gap: opts.gap || 0, clip: true });
}

function row(parent, c, icon, label, value = '', opts = {}) {
  const r = auto(parent, `Row / ${label}`, 0, 0, 1, opts.h || 52, { direction: 'HORIZONTAL', gap: 12, pl: 16, pr: 16, counter: 'CENTER', counterSize: 'AUTO' });
  if (icon) {
    const tile = frame(r, 'Icon Tile', 0, 0, 30, 30, { fills: fill(opts.iconBg || c.fill), radius: 7 });
    text(tile, 'Text / Icon', icon, 0, 6, { size: 15, line: 18, color: c.text, width: 30, align: 'CENTER' });
  }
  textIn(r, 'Text / Label', label, { preset: 'body', color: opts.danger ? c.red : c.text, width: opts.labelWidth || 170 });
  if (value) textIn(r, 'Text / Value', value, { preset: 'subheadline', color: c.text2, width: opts.valueWidth || 86, align: 'RIGHT' });
  if (opts.chevron !== false) textIn(r, 'Icon / Chevron', '›', { size: 22, line: 22, color: c.text3, width: 16, align: 'RIGHT' });
  return r;
}

function sep(parent, c, x = 16, w = 320) {
  rect(parent, 'Separator', x, 0, w, 0.5, fill(c.sep), 0);
}

function section(parent, c, label, x, y) {
  text(parent, `Section Label / ${label}`, label.toUpperCase(), x, y, { preset: 'footnote', weight: 600, letter: 0.5, color: c.text2, width: 350 });
}

function metrics(parent, c, x, y, w, data, opts = {}) {
  const g = auto(parent, opts.name || 'Metric Grid', x, y, w, opts.h || 76, { direction: 'HORIZONTAL', primary: 'SPACE_BETWEEN', counter: 'CENTER', fills: opts.fill ? fill(opts.fill) : [], radius: opts.radius || 0, pl: opts.px || 0, pr: opts.px || 0, pt: opts.py || 0, pb: opts.py || 0 });
  data.forEach((m, i) => {
    const cell = auto(g, `Metric / ${m[0]}`, 0, 0, Math.floor(w / data.length) - 4, opts.h || 70, { direction: 'VERTICAL', primary: 'CENTER', counter: 'CENTER', gap: 3 });
    textIn(cell, 'Text / Label', m[0].toUpperCase(), { preset: 'label', color: c.text2, width: cell.width, align: 'CENTER' });
    textIn(cell, 'Text / Value', m[1], { size: opts.big ? 30 : 22, line: opts.big ? 34 : 28, weight: 700, color: c.text, width: cell.width, align: 'CENTER' });
    if (opts.dividers && i < data.length - 1) rect(g, 'Divider', 0, 0, 0.5, 44, fill(c.sep), 0);
  });
  return g;
}

function progress(parent, c, x, y, size, pct) {
  const f = frame(parent, 'Progress Ring', x, y, size, size, { fills: [] });
  ellipse(f, 'Track', 6, 6, size - 12, size - 12, []);
  f.children[0].strokes = fill(c.fill);
  f.children[0].strokeWeight = 8;
  const arc = ellipse(f, 'Progress Approximation', 6, 6, size - 12, size - 12, []);
  arc.strokes = fill(c.green);
  arc.strokeWeight = 8;
  arc.strokeAlign = 'CENTER';
  arc.dashPattern = [Math.round(size * pct), Math.round(size * (1 - pct + 0.3))];
  text(f, 'Text / Percent', `${Math.round(pct * 100)}%`, 0, size / 2 - 16, { size: 24, line: 28, weight: 700, color: c.green, width: size, align: 'CENTER' });
  return f;
}

function map(parent, c, route = false, dogs = []) {
  const m = frame(parent, 'Map Surface / Full Screen', 0, 0, W, H, { fills: fill(c.map), clip: true });
  ellipse(m, 'Park Shape / North West', -40, 120, 240, 180, fill(c.park));
  ellipse(m, 'Park Shape / East', 250, 320, 210, 240, fill(c.park));
  ellipse(m, 'Water Shape', -30, 484, 180, 120, fill(c.water, 0.85));
  [260, 460, 620].forEach((yy, i) => rect(m, `Road / Horizontal ${i + 1}`, 0, yy, W, i === 1 ? 10 : 12, fill(c.road), 0));
  [110, 240, 320].forEach((xx, i) => rect(m, `Road / Vertical ${i + 1}`, xx, 0, i === 1 ? 14 : 10, H, fill(c.road), 0));
  if (route) {
    const routeFrame = frame(m, 'Route / Walked Path', 0, 0, W, H, { fills: [] });
    rect(routeFrame, 'Route Segment 1', 58, 718, 58, 6, fill(c.green), 3);
    rect(routeFrame, 'Route Segment 2', 112, 468, 6, 256, fill(c.green), 3);
    rect(routeFrame, 'Route Segment 3', 112, 466, 136, 6, fill(c.green), 3);
    rect(routeFrame, 'Route Segment 4', 242, 270, 6, 202, fill(c.green), 3);
    rect(routeFrame, 'Route Segment 5', 242, 178, 82, 6, fill(c.green), 3);
    ellipse(routeFrame, 'Start Marker', 52, 712, 18, 18, fill('#ffffff'));
    ellipse(routeFrame, 'Current Location Pulse', 300, 160, 44, 44, fill(c.green, 0.18));
  } else {
    ellipse(m, 'Current Location Pulse', 167, 352, 56, 56, fill(c.tint, 0.12));
    ellipse(m, 'Current Location Dot', 187, 372, 16, 16, fill(c.tint));
  }
  dogs.forEach((dog, i) => avatar(m, dog, 300 + i * 18, 162, 24, 'Dog Marker'));
  return m;
}

function miniMap(parent, c, x, y, w, h, name = 'Map Surface / Route Preview') {
  const m = frame(parent, name, x, y, w, h, { fills: fill(c.map), radius: R.card, clip: true });
  ellipse(m, 'Park Shape', 28, 24, w - 56, h - 52, fill(c.park, 0.6));
  rect(m, 'Road / Horizontal', 0, Math.round(h * 0.48), w, 8, fill(c.road), 0);
  rect(m, 'Road / Vertical', Math.round(w * 0.52), 0, 8, h, fill(c.road), 0);
  rect(m, 'Route Segment 1', 30, h - 32, 62, 5, fill(c.green), 3);
  rect(m, 'Route Segment 2', 88, Math.round(h * 0.48), 5, h * 0.36, fill(c.green), 3);
  rect(m, 'Route Segment 3', 88, Math.round(h * 0.48), w * 0.34, 5, fill(c.green), 3);
  ellipse(m, 'End Marker', Math.round(w * 0.52) - 6, 24, 12, 12, fill(c.red));
  return m;
}

function tab(parent, c, active) {
  const bar = auto(parent, `Component Instance / Tab Bar / Active=${active}`, 20, 764, 350, 58, { direction: 'HORIZONTAL', primary: 'SPACE_BETWEEN', counter: 'CENTER', pl: 8, pr: 8, fills: fill(c.glass), radius: 29, effects: [blur(30)].concat(shadow()) });
  [['dogs', 'Dogs', '●'], ['walk', 'Walk', '✓'], ['owner', 'Me', '◐']].forEach(([id, label, icon]) => {
    const on = id === active;
    const cell = auto(bar, `Tab Item / ${label}`, 0, 0, 106, 46, { direction: 'VERTICAL', primary: 'CENTER', counter: 'CENTER', gap: 1 });
    if (on) rect(cell, 'Selected Material', 14, 4, 78, 38, fill(c.tint, 0.13), 18);
    textIn(cell, `Icon / ${label}`, icon, { size: 18, line: 20, weight: 700, color: on ? c.tint : c.text2, align: 'CENTER' });
    textIn(cell, `Text / ${label}`, label, { size: 10, line: 12, weight: 600, color: on ? c.tint : c.text2, align: 'CENTER' });
  });
  return bar;
}

function screen(parent, name, x, y, dark = false) {
  const c = palette(dark);
  const s = frame(parent, `Screen / ${name}`, x, y, W, H, { fills: fill(c.bg), radius: R.phone, clip: true, effects: shadow('phone') });
  return { s, c, dark };
}

function fields(parent, c, x, y, rows, labelW = 80) {
  const g = card(parent, 'Form Fields', x, y, 358, rows.length * 51.5, c);
  rows.forEach((r, i) => {
    const rowFrame = auto(g, `Field Row / ${r[0]}`, 0, 0, 358, 51, { direction: 'HORIZONTAL', gap: 10, pl: 16, pr: 16, counter: 'CENTER' });
    textIn(rowFrame, 'Text / Label', r[0], { preset: 'subheadline', color: c.text2, width: labelW });
    textIn(rowFrame, 'Text / Value', r[1], { preset: 'body', color: c.text, width: 224 });
    if (i < rows.length - 1) sep(g, c, 16, 342);
  });
}

function chart(parent, c, x, y, title) {
  const g = card(parent, title, x, y, 358, 166, c, { p: 16, gap: 12 });
  const h = auto(g, 'Chart Header', 0, 0, 326, 22, { direction: 'HORIZONTAL', primary: 'SPACE_BETWEEN', counter: 'CENTER' });
  textIn(h, 'Text / Chart Title', title, { preset: 'subheadline', weight: 600, color: c.text });
  textIn(h, 'Text / Chart Total', '9.52 km total', { preset: 'footnote', color: c.text2, width: 120, align: 'RIGHT' });
  const bars = auto(g, 'Bars', 0, 0, 326, 98, { direction: 'HORIZONTAL', primary: 'SPACE_BETWEEN', counter: 'MAX' });
  [0.35, 0.55, 0.8, 0.15, 0.65, 0.92, 0.58].forEach((v, i) => {
    const col = auto(bars, `Bar / ${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}`, 0, 0, 38, 96, { direction: 'VERTICAL', primary: 'MAX', counter: 'CENTER', gap: 4 });
    rect(col, 'Bar Fill', 0, 0, 30, Math.max(5, 70 * v), fill(i === 6 ? c.green : c.tint, i === 6 ? 1 : 0.75), 5);
    textIn(col, 'Text / Day', ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], { size: 10, line: 12, weight: 600, color: i === 6 ? c.text : c.text2, width: 30, align: 'CENTER' });
  });
}

function signIn(p, x, y) {
  const { s, c } = screen(p, 'A. Sign In', x, y);
  status(s, c);
  const mark = frame(s, 'Component Instance / App Mark', 32, 120, 68, 68, { fills: gradient([C.mint, C.tint]), radius: 22, effects: shadow() });
  text(mark, 'Icon / Paw', '●', 0, 16, { size: 32, line: 36, color: '#ffffff', width: 68, align: 'CENTER' });
  text(s, 'Text / Welcome Back', 'Welcome back', 32, 212, { preset: 'largeTitle', color: c.text });
  text(s, 'Text / Subtitle', 'Sign in to keep walking with Coco.', 32, 258, { preset: 'subheadline', color: c.text2, width: 326 });
  fields(s, c, 32, 312, [['Email', 'coco@walk.app'], ['Password', '••••••••']], 70);
  text(s, 'Text / Forgot Password', 'Forgot password?', 246, 430, { preset: 'subheadline', color: c.tint });
  button(s, 'Sign in', 32, 478, 326, c);
  button(s, 'Continue with Apple', 32, 578, 326, c, { kind: 'apple' });
  text(s, 'Text / New Account Link', 'New here? Create an account', 0, 762, { size: 14, line: 18, color: c.text2, align: 'CENTER', width: W });
  home(s, c);
}

function signUp(p, x, y) {
  const { s, c } = screen(p, 'B. Sign Up', x, y);
  status(s, c);
  text(s, 'Nav Action / Back', '‹ Back', 16, 68, { preset: 'body', color: c.tint });
  text(s, 'Text / Title', 'Let us meet your dog.', 32, 116, { size: 34, line: 38, weight: 700, color: c.text, width: 326 });
  text(s, 'Text / Subtitle', 'A few quick details and you will be walking in a minute.', 32, 198, { preset: 'subheadline', color: c.text2, width: 310 });
  fields(s, c, 32, 254, [['Your name', 'Mio'], ['Email', 'mio@walk.app'], ['Password', '••••••••']], 96);
  text(s, 'Text / Helper', 'Add your dog profile on the next step. We remember paw-size, pace, and photo.', 36, 420, { preset: 'footnote', color: c.text2, width: 318 });
  button(s, 'Continue', 32, 488, 326, c);
  text(s, 'Text / Terms', 'By continuing you agree to the Terms and Privacy Policy.', 48, 554, { preset: 'caption', color: c.text3, align: 'CENTER', width: 294 });
  home(s, c);
}

function dogsList(p, x, y) {
  const { s, c } = screen(p, '01. Dogs (list)', x, y);
  status(s, c);
  nav(s, c, 'Dogs', { right: '+ Add' });
  const roll = auto(s, 'Card / Today Walking Goal', 16, 194, 358, 72, { direction: 'HORIZONTAL', gap: 14, p: 14, fills: fill(c.surface), radius: R.card, counter: 'CENTER' });
  progress(roll, c, 0, 0, 44, 0.7);
  const col = auto(roll, 'Goal Text', 0, 0, 242, 44, { direction: 'VERTICAL', gap: 3 });
  textIn(col, 'Text / Goal Title', 'Today walking goal', { preset: 'subheadline', weight: 600, color: c.text });
  textIn(col, 'Text / Goal Detail', '3.52 / 5.0 km across your pack', { preset: 'footnote', color: c.text2 });
  section(s, c, 'Your pack', 20, 286);
  const list = auto(s, 'Dog List', 16, 312, 358, 276, { direction: 'VERTICAL', gap: 12 });
  [['coco', '1.42 km today · 47 walks', '12d'], ['momo', '0 km today · 124 walks', '3d'], ['biscuit', '2.1 km today · 31 walks', '8d']].forEach((d) => {
    const item = auto(list, `Dog List Item / ${DOGS[d[0]][0]}`, 0, 0, 358, 84, { direction: 'HORIZONTAL', gap: 14, p: 14, fills: fill(c.surface), radius: R.card, counter: 'CENTER' });
    avatar(item, d[0], 0, 0, 56);
    const tc = auto(item, 'Dog Details', 0, 0, 230, 48, { direction: 'VERTICAL', gap: 3 });
    textIn(tc, 'Text / Dog Name', DOGS[d[0]][0], { preset: 'headline', color: c.text });
    textIn(tc, 'Text / Stats', d[1], { preset: 'caption', color: c.text2, width: 210 });
    textIn(item, 'Badge / Streak', d[2], { preset: 'caption', weight: 700, color: c.orange, width: 38 });
  });
  tab(s, c, 'dogs');
  home(s, c);
}

function dogDetail(p, x, y) {
  const { s, c } = screen(p, '02. Dog detail', x, y);
  const hero = frame(s, 'Hero / Dog Photo', 0, 0, W, 300, { fills: gradient(C.dog.coco), clip: true });
  avatar(hero, 'coco', 125, 76, 140, 'Dog Photo');
  status(s, extend(c, { text: '#ffffff' }));
  text(s, 'Nav Action / Back', '‹ Dogs', 16, 68, { preset: 'body', weight: 500, color: '#ffffff' });
  text(s, 'Nav Action / Edit', 'Edit', 330, 68, { preset: 'body', color: '#ffffff' });
  text(s, 'Text / Dog Name', 'Coco', 20, 250, { size: 32, line: 38, weight: 700, color: c.text });
  text(s, 'Text / Dog Meta', '3 years · 4.2 kg', 20, 290, { preset: 'footnote', color: c.text2 });
  metrics(s, c, 16, 320, 358, [['Walks', '47'], ['km', '86.3'], ['Streak', '12d']], { fill: c.surface, radius: R.card, dividers: true });
  text(s, 'Section Header / Walks', 'Walks', 20, 416, { preset: 'title3', color: c.text });
  text(s, 'Text / See All', 'See all', 318, 419, { preset: 'subheadline', color: c.tint });
  const list = card(s, 'Walk List', 16, 454, 358, 272, c);
  ['Today · 8:30 AM', 'Yesterday · 6:12 PM', 'Yesterday · 7:45 AM', 'Mon · 6:40 PM'].forEach((label, i) => {
    row(list, c, '⌁', label, i === 0 ? '💧2 💩1' : '💧1 💩0', { h: 58, labelWidth: 188, valueWidth: 70 });
    if (i < 3) sep(list, c, 58, 300);
  });
  tab(s, c, 'dogs');
  home(s, c);
}

function dogEdit(p, x, y) {
  const { s, c } = screen(p, '02b. Dog edit', x, y);
  status(s, c);
  nav(s, c, 'Edit dog', { left: 'Cancel', right: 'Save', rightBold: true, large: false });
  avatar(s, 'coco', 145, 118, 100, 'Dog Photo Editor');
  text(s, 'Text / Change Photo', 'Change photo', 0, 228, { preset: 'footnote', weight: 500, color: c.tint, align: 'CENTER', width: W });
  fields(s, c, 16, 268, [['Name', 'Coco'], ['Breed', 'Toy Poodle'], ['Birthday', 'Apr 12, 2023'], ['Weight', '4.2 kg'], ['Microchip', '900 111 222 333 444']], 90);
  section(s, c, 'Daily goal', 20, 558);
  const goal = card(s, 'Daily Goal Slider', 16, 586, 358, 86, c, { p: 16, gap: 12 });
  const top = auto(goal, 'Distance Row', 0, 0, 326, 22, { direction: 'HORIZONTAL', primary: 'SPACE_BETWEEN', counter: 'CENTER' });
  textIn(top, 'Text / Distance', 'Distance', { preset: 'subheadline', color: c.text });
  textIn(top, 'Text / Value', '2.0 km', { preset: 'body', weight: 600, color: c.text, width: 80, align: 'RIGHT' });
  const slider = frame(goal, 'Slider', 0, 12, 326, 22, { fills: [] });
  rect(slider, 'Slider Track', 0, 8, 326, 6, fill(c.fill), 3);
  rect(slider, 'Slider Fill', 0, 8, 130, 6, fill(c.tint), 3);
  ellipse(slider, 'Slider Thumb', 119, 0, 22, 22, fill('#ffffff'));
  text(s, 'Text / Remove Dog', 'Remove Coco', 16, 776, { preset: 'body', weight: 500, color: c.red, align: 'CENTER', width: 358 });
  home(s, c);
}

function walkingGoal(p, x, y) {
  const { s, c } = screen(p, '02c. Walking goal', x, y);
  status(s, c);
  nav(s, c, 'Today goal', { left: '‹ Dogs', right: 'Edit', large: false });
  progress(s, c, 125, 118, 140, 0.7);
  text(s, 'Text / Goal Total', '3.52 / 5.0 km', 0, 274, { preset: 'subheadline', color: c.text2, align: 'CENTER', width: W });
  section(s, c, 'Per dog', 20, 326);
  const list = card(s, 'Per Dog Breakdown', 16, 354, 358, 218, c);
  [['coco', '1.42 / 2.0 km', 0.71], ['momo', '0.00 / 1.5 km', 0], ['biscuit', '2.10 / 1.5 km', 1]].forEach((d, i) => {
    const r = auto(list, `Goal Row / ${DOGS[d[0]][0]}`, 0, 0, 358, 72, { direction: 'HORIZONTAL', gap: 12, pl: 16, pr: 16, counter: 'CENTER' });
    avatar(r, d[0], 0, 0, 44);
    const col = auto(r, 'Goal Text and Bar', 0, 0, 270, 46, { direction: 'VERTICAL', gap: 6 });
    textIn(col, 'Text / Value', `${DOGS[d[0]][0]} · ${d[1]}`, { preset: 'subheadline', weight: 600, color: d[2] >= 1 ? c.green : c.text, width: 270 });
    const bar = frame(col, 'Progress Bar', 0, 0, 270, 6, { fills: fill(c.fill), radius: 3, clip: true });
    rect(bar, 'Progress Fill', 0, 0, 270 * d[2], 6, fill(d[2] >= 1 ? c.green : c.tint), 3);
    if (i < 2) sep(list, c, 72, 286);
  });
  chart(s, c, 16, 592, 'This week');
  home(s, c);
}

function walkDetail(p, x, y) {
  const { s, c } = screen(p, '03. Walk detail', x, y);
  status(s, c);
  nav(s, c, '', { left: '‹ Coco', right: '⋯', large: false });
  miniMap(s, c, 16, 98, 358, 260, 'Map / Walk Detail');
  text(s, 'Text / Walk Date', 'Tue, Apr 18 · 8:30 AM', 20, 376, { preset: 'footnote', weight: 600, color: c.text2 });
  text(s, 'Text / Walk Title', 'Morning walk', 20, 398, { preset: 'title1', color: c.text });
  metrics(s, c, 16, 448, 358, [['Distance', '1.42'], ['Duration', '24:18'], ['Pace', "4'18"]], { fill: c.surface, radius: R.card, h: 96, px: 16, py: 16, big: true });
  const logs = card(s, 'Event Timeline', 16, 576, 358, 250, c);
  [['🏁', '8:30', 'Started at home'], ['💧', '8:37', 'Pee · corner bakery'], ['💩', '8:42', 'Poop · park entry'], ['📷', '8:49', '3 photos at fountain'], ['🏡', '8:54', 'Ended at home']].forEach((e, i) => {
    row(logs, c, e[0], `${e[1]}  ${e[2]}`, '', { h: 49, labelWidth: 245, chevron: false });
    if (i < 4) sep(logs, c, 52, 306);
  });
  home(s, c);
}

function walkNoDogs(p, x, y) {
  const { s, c } = screen(p, '04a. Walk — No Dogs', x, y);
  status(s, c);
  nav(s, c, 'Walk');
  ellipse(s, 'Empty State Halo', 135, 290, 120, 120, fill(c.red, 0.08));
  text(s, 'Icon / Empty Paw', '●', 0, 330, { size: 48, line: 52, color: c.red, width: W, align: 'CENTER' });
  text(s, 'Text / Empty Title', 'No dogs yet', 40, 434, { preset: 'title2', color: c.text, width: 310, align: 'CENTER' });
  text(s, 'Text / Empty Copy', 'Add a dog to your pack before starting a walk. It only takes a moment.', 40, 468, { preset: 'subheadline', color: c.text2, width: 310, align: 'CENTER' });
  button(s, 'Add your first dog', 55, 548, 280, c);
  tab(s, c, 'walk');
  home(s, c);
}

function walkStart(p, x, y, multi = false) {
  const { s, c } = screen(p, multi ? 'G1. Group Walk — Start' : '04b. Walk — Start', x, y);
  map(s, c, false);
  status(s, c);
  const sheet = auto(s, multi ? 'Glass Sheet / Group Start' : 'Glass Sheet / Start', 10, multi ? 388 : 500, 370, multi ? 356 : 244, { direction: 'VERTICAL', fills: fill(c.glass), radius: R.sheet, p: 22, gap: 16, effects: [blur(40)].concat(shadow()) });
  if (multi) {
    textIn(sheet, 'Text / Walking With', 'WALKING WITH', { preset: 'footnote', weight: 600, color: c.text2 });
    ['coco', 'momo', 'biscuit'].forEach((dog, i) => row(sheet, c, DOGS[dog][2], DOGS[dog][0], i < 2 ? 'Selected' : 'Available', { h: 48, iconBg: C.dog[dog][0], chevron: false }));
  } else {
    const dogRow = auto(sheet, 'Dog Row', 0, 0, 326, 50, { direction: 'HORIZONTAL', gap: 12, counter: 'CENTER' });
    avatar(dogRow, 'coco', 0, 0, 48);
    const col = auto(dogRow, 'Dog Text', 0, 0, 230, 42, { direction: 'VERTICAL', gap: 2 });
    textIn(col, 'Text / Name', 'Coco', { preset: 'headline', color: c.text });
    textIn(col, 'Text / Last Walk', 'Last walk 14 hours ago', { preset: 'footnote', color: c.text2 });
    metrics(sheet, c, 0, 0, 326, [['Today', '0 km'], ['Streak', '12d'], ['Goal', '70%']], { fill: c.fill, radius: 14, h: 70 });
  }
  button(sheet, 'START WALK', 0, 0, 326, c, { kind: 'success', h: 56, radius: 28, icon: 'Play' });
  tab(s, c, 'walk');
  home(s, c);
}

function walkActive(p, x, y, multi = false, mini = false) {
  const { s, c } = screen(p, mini ? 'G2b. Group Walk — Minimized' : multi ? 'G2. Group Walk — Active' : '05. Walk — Active', x, y, mini || multi);
  map(s, c, true, multi ? ['coco', 'momo'] : []);
  status(s, c);
  text(s, 'Glass Pill / Title', multi ? 'Group walk' : 'Walk with Coco', 113, 68, { preset: 'headline', color: c.text, width: 164, align: 'CENTER' });
  if (mini) {
    const pill = auto(s, 'Minimized Walk Pill', 16, 690, 358, 58, { direction: 'HORIZONTAL', gap: 12, pl: 12, pr: 14, counter: 'CENTER', fills: fill(c.glass), radius: R.pill, effects: [blur(40)].concat(shadow()) });
    avatar(pill, 'coco', 0, 0, 38);
    avatar(pill, 'momo', 0, 0, 38);
    textIn(pill, 'Text / Time and Distance', '24:18 · 1.42 km', { preset: 'headline', color: c.text, width: 158 });
    textIn(pill, 'Tag / LIVE', 'LIVE', { preset: 'caption', weight: 700, color: c.red, width: 48 });
    home(s, c);
    return;
  }
  const sheet = auto(s, multi ? 'Glass Sheet / Group Active' : 'Glass Sheet / Active', 10, multi ? 446 : 526, 370, multi ? 356 : 278, { direction: 'VERTICAL', fills: fill(c.glass), radius: R.sheet, p: 22, gap: 16, effects: [blur(40)].concat(shadow()) });
  const header = auto(sheet, 'Walk Header', 0, 0, 326, 48, { direction: 'HORIZONTAL', gap: 12, counter: 'CENTER' });
  avatar(header, 'coco', 0, 0, 44);
  if (multi) avatar(header, 'momo', 0, 0, 44);
  textIn(header, 'Text / Name', multi ? 'Coco + Momo' : 'Coco', { preset: 'headline', color: c.text, width: 160 });
  textIn(header, 'Tag / LIVE', 'LIVE', { preset: 'caption', weight: 700, color: c.red, width: 50 });
  metrics(sheet, c, 0, 0, 326, [['Time', '24:18'], ['Distance', '1.42'], ['Pace', "4'18"]], { big: !multi, h: 76 });
  if (multi) {
    ['Coco · 💧2 · 💩1', 'Momo · 💧1 · 💩0'].forEach((label) => row(sheet, c, '●', label, '', { h: 44, chevron: false, labelWidth: 240 }));
  } else {
    const quick = auto(sheet, 'Quick Log Row', 0, 0, 326, 40, { direction: 'HORIZONTAL', gap: 8 });
    [['💧', 'Pee 2'], ['💩', 'Poop 1'], ['📷', 'Photo 4']].forEach((q) => row(quick, c, q[0], q[1], '', { h: 40, labelWidth: 56, chevron: false }));
  }
  const actions = auto(sheet, 'Pause and End Actions', 0, 0, 326, 52, { direction: 'HORIZONTAL', gap: 10 });
  button(actions, 'Pause', 0, 0, 158, c, { kind: 'secondary', h: 52 });
  button(actions, 'End Walk', 0, 0, 158, c, { kind: 'danger', h: 52 });
  home(s, c);
}

function walkFinish(p, x, y, multi = false) {
  const { s, c } = screen(p, multi ? 'G3. Group Walk — Finish' : '06. Walk — Finish', x, y);
  status(s, c);
  text(s, 'Text / Completion Label', multi ? 'GROUP WALK COMPLETE' : 'WALK COMPLETE', 20, 78, { preset: 'footnote', weight: 700, letter: 1, color: c.green });
  text(s, 'Text / Completion Title', multi ? 'Nice walk, everyone.' : 'Nice one, Coco!', 20, 108, { size: 36, line: 40, weight: 700, color: c.text, width: 310 });
  text(s, 'Text / Subtitle', multi ? 'Coco and Momo · 24 min together' : 'You beat yesterday pace by 14 seconds.', 20, 184, { preset: 'subheadline', color: c.text2 });
  miniMap(s, c, 20, multi ? 240 : 230, 350, multi ? 140 : 160);
  section(s, c, 'Per dog', 20, multi ? 398 : 410);
  const list = card(s, 'Per Dog Summary', 16, multi ? 436 : 438, 358, multi ? 146 : 72, c);
  (multi ? ['coco', 'momo'] : ['coco']).forEach((dog, i) => {
    row(list, c, DOGS[dog][2], `${DOGS[dog][0]} · 💧 ${dog === 'momo' ? 1 : 2} · 💩 ${dog === 'momo' ? 0 : 1}`, '', { h: 72, labelWidth: 230 });
    if (i === 0 && multi) sep(list, c, 72, 286);
  });
  button(s, 'Save walk', 20, multi ? 690 : 699, 350, c, { h: 52 });
  tab(s, c, 'walk');
  home(s, c);
}

function saveSheet(p, x, y) {
  const { s, c } = screen(p, '06b. Walk — Save sheet', x, y);
  status(s, c);
  nav(s, c, 'Save walk', { left: '‹ Back', large: false });
  section(s, c, 'How was the walk?', 20, 110);
  const moods = auto(s, 'Mood Selector', 20, 134, 350, 82, { direction: 'HORIZONTAL', gap: 10 });
  ['Great', 'Good', 'Okay', 'Tired'].forEach((m, i) => {
    const item = auto(moods, `Mood / ${m}`, 0, 0, 80, 82, { direction: 'VERTICAL', gap: 6, pt: 14, fills: fill(i === 0 ? C.tint : c.surface, i === 0 ? 0.10 : 1), strokes: i === 0 ? fill(c.tint) : [], strokeWeight: 1.5, radius: R.card, primary: 'CENTER', counter: 'CENTER' });
    textIn(item, 'Text / Emoji', ['😄', '🙂', '😐', '😩'][i], { size: 28, line: 30, align: 'CENTER', width: 80 });
    textIn(item, 'Text / Label', m, { preset: 'caption', weight: 600, color: i === 0 ? c.tint : c.text2, align: 'CENTER', width: 80 });
  });
  section(s, c, 'Tags', 20, 244);
  const tags = auto(s, 'Tag Cloud', 20, 268, 350, 84, { direction: 'HORIZONTAL', gap: 8 });
  ['Rainy', 'Sunny', 'Windy', 'Met a friend'].forEach((tagName, i) => {
    const t = auto(tags, `Tag / ${tagName}`, 0, 0, tagName.length > 10 ? 112 : 78, 36, { direction: 'HORIZONTAL', primary: 'CENTER', counter: 'CENTER', fills: fill(i === 1 || i === 3 ? C.tint : c.surface, i === 1 || i === 3 ? 0.10 : 1), strokes: fill(i === 1 || i === 3 ? c.tint : c.sep), strokeWeight: 1, radius: 20 });
    textIn(t, 'Text / Tag Label', tagName, { preset: 'footnote', weight: 500, color: i === 1 || i === 3 ? c.tint : c.text });
  });
  section(s, c, 'Note', 20, 384);
  const note = frame(s, 'Text Area / Note', 20, 408, 350, 100, { fills: fill(c.surface), radius: 14 });
  text(note, 'Text / Note Content', 'Coco loved the park today. Met a golden retriever at the fountain...', 16, 16, { preset: 'subheadline', color: c.text3, width: 310 });
  section(s, c, 'Photos', 20, 536);
  const photos = auto(s, 'Photo Strip', 20, 560, 350, 80, { direction: 'HORIZONTAL', gap: 8 });
  ['#d9c7a9', '#b8c9d0', '#c9d4b8', c.surface].forEach((color, i) => {
    const ph = frame(photos, i === 3 ? 'Photo Add Tile' : `Photo Placeholder ${i + 1}`, 0, 0, 80, 80, { fills: fill(color), radius: 12, strokes: i === 3 ? fill(c.text3) : [], strokeWeight: 1.5 });
    text(ph, i === 3 ? 'Icon / Plus' : 'Icon / Camera', i === 3 ? '+' : '📷', 0, 26, { size: 24, line: 28, align: 'CENTER', width: 80, color: c.text3 });
  });
  button(s, 'Save walk', 20, 742, 350, c, { h: 52 });
  home(s, c);
}

function owner(p, x, y) {
  const { s, c } = screen(p, '07. Owner / Settings', x, y);
  status(s, c);
  nav(s, c, 'Me');
  const profile = auto(s, 'Profile Card', 16, 194, 358, 92, { direction: 'HORIZONTAL', gap: 14, p: 16, fills: fill(c.surface), radius: R.card, counter: 'CENTER' });
  ownerAvatar(profile, 0, 0, 60);
  const pt = auto(profile, 'Profile Text', 0, 0, 240, 58, { direction: 'VERTICAL', gap: 2 });
  textIn(pt, 'Text / Name', 'Mio Tanaka', { size: 19, line: 24, weight: 600, color: c.text });
  textIn(pt, 'Text / Email', 'mio@walk.app', { preset: 'footnote', color: c.text2 });
  textIn(pt, 'Text / Link', 'View profile', { preset: 'caption', color: c.tint });
  section(s, c, 'Preferences', 20, 310);
  const prefs = card(s, 'Preferences Rows', 16, 334, 358, 208, c);
  [['🌐', 'Language', 'English'], ['📏', 'Units', 'km, min'], ['🔔', 'Notifications', 'On'], ['🌙', 'Appearance', 'Light']].forEach((r, i) => { row(prefs, c, r[0], r[1], r[2]); if (i < 3) sep(prefs, c, 58, 300); });
  section(s, c, 'Legal', 20, 566);
  const legal = card(s, 'Legal Rows', 16, 590, 358, 156, c);
  [['📄', 'Terms of Service', ''], ['🔒', 'Privacy Policy', ''], ['ℹ', 'About', 'v1.2.3']].forEach((r, i) => { row(legal, c, r[0], r[1], r[2]); if (i < 2) sep(legal, c, 58, 300); });
  tab(s, c, 'owner');
  home(s, c);
}

function ownerProfile(p, x, y) {
  const { s, c } = screen(p, '07b. Owner — Profile', x, y);
  status(s, c);
  nav(s, c, 'Profile', { left: '‹ Me', right: 'Edit', large: false });
  ownerAvatar(s, 151, 120, 88);
  text(s, 'Text / Owner Name', 'Mio Tanaka', 0, 220, { preset: 'title2', color: c.text, align: 'CENTER', width: W });
  text(s, 'Text / Email', 'mio@walk.app', 0, 252, { preset: 'footnote', color: c.text2, align: 'CENTER', width: W });
  metrics(s, c, 16, 324, 358, [['Walks', '263'], ['km', '412.8'], ['Total time', '87h'], ['Dogs', '3']], { fill: c.surface, radius: R.card, h: 72, dividers: true });
  chart(s, c, 16, 416, 'This week');
  section(s, c, 'Achievements', 20, 610);
  const ach = auto(s, 'Achievements', 16, 638, 358, 86, { direction: 'HORIZONTAL', gap: 10 });
  [['🔥', '12-day streak', c.orange], ['🏆', '100 km', c.green], ['🌅', 'Early bird', c.tint]].forEach((a) => {
    const item = auto(ach, `Achievement / ${a[1]}`, 0, 0, 112, 86, { direction: 'VERTICAL', gap: 6, fills: fill(c.surface), radius: 14, primary: 'CENTER', counter: 'CENTER' });
    textIn(item, 'Text / Icon', a[0], { size: 22, line: 24, align: 'CENTER' });
    textIn(item, 'Text / Label', a[1], { size: 11, line: 14, weight: 600, color: a[2], align: 'CENTER', width: 92 });
  });
  home(s, c);
}

function ownerEdit(p, x, y) {
  const { s, c } = screen(p, '07c. Owner — Edit profile', x, y);
  status(s, c);
  nav(s, c, 'Edit profile', { left: 'Cancel', right: 'Save', rightBold: true, large: false });
  ownerAvatar(s, 145, 118, 100);
  text(s, 'Text / Change Photo', 'Change photo', 0, 228, { preset: 'footnote', weight: 500, color: c.tint, align: 'CENTER', width: W });
  fields(s, c, 16, 274, [['Name', 'Mio Tanaka'], ['Email', 'mio@walk.app'], ['Phone', '+81 90-1234-5678'], ['Location', 'Tokyo, Japan']], 80);
  section(s, c, 'Bio', 20, 506);
  const bio = frame(s, 'Text Area / Bio', 16, 534, 358, 80, { fills: fill(c.surface), radius: 14 });
  text(bio, 'Text / Bio', 'Dog lover in Tokyo. Walking Coco, Momo and Biscuit every day rain or shine.', 16, 16, { preset: 'subheadline', color: c.text, width: 320 });
  section(s, c, 'Sharing', 20, 642);
  const share = card(s, 'Sharing Toggles', 16, 670, 358, 156, c);
  [['Walk activity', true], ['Streak badges', true], ['Profile public', false]].forEach((r, i) => {
    const line = auto(share, `Toggle Row / ${r[0]}`, 0, 0, 358, 52, { direction: 'HORIZONTAL', primary: 'SPACE_BETWEEN', counter: 'CENTER', pl: 16, pr: 16 });
    textIn(line, 'Text / Label', r[0], { preset: 'body', color: c.text });
    const t = frame(line, 'Toggle', 0, 0, 51, 31, { fills: fill(r[1] ? c.green : c.fill), radius: 15.5 });
    ellipse(t, 'Toggle Thumb', r[1] ? 22 : 2, 2, 27, 27, fill('#ffffff'));
    if (i < 2) sep(share, c, 16, 342);
  });
  home(s, c);
}

function createCover(page) {
  rect(page, 'Cover Background', -160, -120, 1400, 900, fill(C.canvas), 0);
  text(page, 'Cover Eyebrow', 'PRECISE · WALKING DOG · FIGMA REBUILD', 0, 0, { size: 12, line: 16, weight: 700, letter: 1, color: 'rgba(60,50,40,0.6)', width: 600 });
  text(page, 'Cover Title', 'A dog-walking app, designed with restraint.', 0, 32, { size: 56, line: 62, weight: 700, color: C.ink, width: 760 });
  text(page, 'Cover Summary', 'Native editable Figma file based on docs/design.html. Built for long-term product development, reusable components, tokenized styles, and React Native handoff.', 0, 176, { size: 18, line: 28, color: 'rgba(60,50,40,0.75)', width: 760 });
  const axes = auto(page, 'Product Decision Axes', 0, 286, 760, 170, { direction: 'HORIZONTAL', gap: 16 });
  [['Dog experience', 'Pack, per-dog, and live walk surfaces support deeper dog relationships.'], ['Walk data', 'Routes, events, pace, distance, and goal progress are visible and reusable.'], ['Owner contribution', 'Progress, streaks, achievements, and save feedback encourage care.']].forEach((a) => {
    const c = auto(axes, `Axis / ${a[0]}`, 0, 0, 240, 170, { direction: 'VERTICAL', gap: 10, p: 18, fills: fill('#ffffff', 0.76), radius: R.card });
    textIn(c, 'Text / Title', a[0], { preset: 'headline', color: C.ink, width: 204 });
    textIn(c, 'Text / Copy', a[1], { preset: 'footnote', color: 'rgba(60,50,40,0.72)', width: 204 });
  });
}

function createDesignSystem(page) {
  text(page, 'Page Title / Design System', 'Design System', 0, 0, { size: 40, line: 48, weight: 700, color: C.ink });
  text(page, 'Page Description', 'Local styles, variables, and component foundations for React Native implementation.', 0, 56, { preset: 'subheadline', color: 'rgba(60,50,40,0.7)', width: 720 });
  text(page, 'Section Title / Color Styles', 'Color Styles', 0, 120, { preset: 'title2', color: C.ink });
  [['Canvas', C.canvas], ['Light BG', C.light.bg], ['Surface', C.light.surface], ['Tint', C.tint], ['Success', C.green], ['Error', C.red], ['Dark BG', C.dark.bg], ['Map Park', C.light.park]].forEach((sw, i) => {
    const x = (i % 4) * 180;
    const y = 170 + Math.floor(i / 4) * 96;
    rect(page, `Color Swatch / ${sw[0]}`, x, y, 140, 48, fill(sw[1]), 10);
    text(page, `Text / ${sw[0]}`, sw[0], x, y + 58, { preset: 'footnote', weight: 600, color: C.ink, width: 150 });
  });
  text(page, 'Section Title / Text Styles', 'Text Styles', 0, 390, { preset: 'title2', color: C.ink });
  entries(T).forEach(([name, spec], i) => {
    text(page, `Text Style Sample / ${name}`, name, 0, 440 + i * 48, { preset: 'footnote', color: 'rgba(60,50,40,0.6)', width: 140 });
    text(page, `Text Style Preview / ${name}`, 'The quick walk with Coco', 170, 434 + i * 48, { size: spec[0], line: spec[1], weight: spec[2], letter: spec[3], color: C.ink, width: 420 });
  });
  const token = auto(page, 'Variable Summary', 720, 170, 360, 300, { direction: 'VERTICAL', gap: 16, p: 24, fills: fill('#ffffff'), radius: R.card });
  ['Spacing: 0, 4, 8, 12, 16, 24, 32', 'Radius: 8, 12, 16, 32, 44, 100', 'Sizing: phone 390x844, status 54, buttons 50/56'].forEach((line) => textIn(token, `Text / ${line}`, line, { preset: 'subheadline', color: C.ink, width: 312 }));
}

function createComponents(page) {
  const c = palette(false);
  text(page, 'Page Title / Components', 'Components', 0, 0, { size: 40, line: 48, weight: 700, color: C.ink });
  const buttons = [['Intent=Primary', 'Button', {}], ['Intent=Secondary', 'Button', { kind: 'secondary' }], ['Intent=Success', 'START WALK', { kind: 'success', h: 56, radius: 28 }], ['Intent=Destructive', 'End Walk', { kind: 'danger' }]].map((b, i) => {
    const comp = figma.createComponent();
    comp.name = b[0];
    page.appendChild(comp);
    xy(comp, 0, 120 + i * 80);
    comp.resize(180, b[2].h || 50);
    comp.fills = [];
    button(comp, b[1], 0, 0, 180, c, b[2]);
    return comp;
  });
  xy(figma.combineAsVariants(buttons, page), 0, 120).name = 'Button';
  const tabs = ['dogs', 'walk', 'owner'].map((active, i) => {
    const comp = figma.createComponent();
    comp.name = `Active=${active}`;
    page.appendChild(comp);
    xy(comp, 260, 120 + i * 90);
    comp.resize(390, 100);
    comp.fills = [];
    tab(comp, c, active);
    return comp;
  });
  xy(figma.combineAsVariants(tabs, page), 260, 120).name = 'Tab Bar';
  const tags = [['State=Default', 'Rainy'], ['State=Selected', 'Sunny'], ['State=Live', 'LIVE']].map((t, i) => {
    const comp = figma.createComponent();
    comp.name = t[0];
    page.appendChild(comp);
    xy(comp, 720, 120 + i * 52);
    comp.resize(96, 32);
    const chip = auto(comp, `Tag / ${t[1]}`, 0, 0, 96, 32, { direction: 'HORIZONTAL', primary: 'CENTER', counter: 'CENTER', fills: fill(i ? C.tint : C.light.surface, i ? 0.10 : 1), strokes: i === 1 ? fill(C.tint) : [], strokeWeight: 1, radius: 16 });
    textIn(chip, 'Text / Label', t[1], { preset: 'caption', weight: 600, color: i ? C.tint : C.light.text });
    return comp;
  });
  xy(figma.combineAsVariants(tags, page), 720, 120).name = 'Tag';
  const avatars = ['coco', 'momo', 'biscuit'].map((dog, i) => {
    const comp = figma.createComponent();
    comp.name = `Dog=${DOGS[dog][0]}`;
    page.appendChild(comp);
    xy(comp, 900, 120 + i * 104);
    comp.resize(80, 80);
    comp.fills = [];
    avatar(comp, dog, 12, 12, 56);
    return comp;
  });
  xy(figma.combineAsVariants(avatars, page), 900, 120).name = 'Dog Avatar';
}

function createScreens(page) {
  text(page, 'Page Title / Screens', 'Screens', 0, 0, { size: 40, line: 48, weight: 700, color: C.ink });
  text(page, 'Page Description', 'All screens are native editable Figma layers with reusable naming and component conventions.', 0, 56, { preset: 'subheadline', color: 'rgba(60,50,40,0.7)', width: 920 });
  const groups = [
    ['Onboarding', [signIn, signUp]],
    ['Tab 1 · Dogs', [dogsList, dogDetail, dogEdit, walkingGoal, walkDetail]],
    ['Tab 2 · Walk', [walkNoDogs, (p, x, y) => walkStart(p, x, y), (p, x, y) => walkActive(p, x, y), (p, x, y) => walkFinish(p, x, y), saveSheet]],
    ['Tab 2 · Walk — Group', [(p, x, y) => walkStart(p, x, y, true), (p, x, y) => walkActive(p, x, y, true), (p, x, y) => walkActive(p, x, y, true, true), (p, x, y) => walkFinish(p, x, y, true)]],
    ['Tab 3 · Me', [owner, ownerProfile, ownerEdit]],
  ];
  let y = 140;
  groups.forEach(([label, builders]) => {
    text(page, `Section / ${label}`, label, 0, y, { preset: 'title2', color: C.ink });
    builders.forEach((builder, i) => builder(page, i * 460, y + 52));
    y += 960;
  });
}

function page(name) {
  const p = figma.createPage();
  p.name = name;
  return p;
}

async function main() {
  await loadFonts();
  createStyles();
  createVariables();
  const cover = page('Cover');
  const designSystem = page('Design System');
  const components = page('Components');
  const screens = page('Screens');
  for (const p of figma.root.children.slice()) {
    if (p.name === 'Page 1' && p.children.length === 0 && figma.root.children.length > 1) p.remove();
  }
  createCover(cover);
  createDesignSystem(designSystem);
  createComponents(components);
  createScreens(screens);
  await figma.setCurrentPageAsync(cover);
  try { figma.viewport.scrollAndZoomIntoView(cover.children.slice(0, 8)); } catch (error) {}
  return {
    pages: [cover, designSystem, components, screens].map((p) => ({ id: p.id, name: p.name, childCount: p.children.length })),
    screenCount: screens.findAll((n) => n.name && n.name.startsWith('Screen /')).length,
    componentCount: components.findAll((n) => n.type === 'COMPONENT' || n.type === 'COMPONENT_SET').length,
    styles: { paint: figma.getLocalPaintStyles().length, text: figma.getLocalTextStyles().length },
  };
}

return await main();
