// Shared layout, palette, fonts and timing for the four math verses (song 29.23–44.52 s).
// All coordinates are 1920×1080 px, measured on the original frames.

export const W = 1920, H = 1080;

// One math unit in px: the axis 0…2π spans x 600…1800, so the unit circle's
// circumference unrolls exactly onto it.
export const U = 600 / Math.PI;
export const PLOT = { x0: 600, x1: 1800, y0: 660 };
export const X = (v) => PLOT.x0 + v * U;
export const Y = (v) => PLOT.y0 - v * U;
export const CIRC = { x: 345, y: 660, r: U };

export const COL = {
  bgIn: [15, 16, 23], bgOut: [10, 11, 16],
  lav: '#b0aff1',
  peach: '#fcc19c',
  white: '#ecedf8',
  monoGray: '#a3a3b3',
  monoDim: '#5b5c68',
  label: '#8d8f9e',
  axis: 'rgba(160,162,185,0.32)',
  iconOff: '#6b6c75',
  iconOn: '#ffffff',
};

export const MONO = '"JetBrains Mono", monospace';
export const SERIF = '"MathSTIX", serif';
export const FONT_LOADS = [
  `400 40px ${MONO}`, `400 20px ${MONO}`,
  `400 92px ${SERIF}`, `italic 400 92px ${SERIF}`,
];

// Typography (fitted against the source with IoU on glyph masks).
export const TYPE = {
  mono: { x: 120, base: 188, size: 39.4, weight: 400 },
  serif: { x: 116, base: 279, size: 92, weight: 400, opsz: 32, itWeight: 400, itOpsz: 24, spacing: -1.12 },
};

// Lyrics: [word, onset seconds]. Onsets are the first frame the word shows in the source.
// `out` = when the whole lyric block fades (0.1 s).
export const VERSES = [
  {
    mono: [['If', 29.505], ['I’m', 29.905], ['a', 30.355], ['set', 30.42], ['of', 30.655], ['points', 30.87]],
    serif: [['Then', 31.195, 0.18], ['I', 31.469, 0.18], ['will', 31.649, 0.18], ['give', 31.883, 0.18], ['you', 32.116, 0.2], ['my', 32.317, 0.18]],
    out: 33.217,
  },
  {
    mono: [['If', 33.352], ['I’m', 33.62], ['a', 34.07], ['circle', 34.27]],
    serif: [['Then', 34.896, 0.2], ['I', 35.151, 0.18], ['will', 35.336, 0.2], ['give', 35.580, 0.18], ['you', 35.816, 0.2], ['my', 36.084, 0.2]],
    out: 36.885,
  },
  {
    mono: [['If', 37.02], ['I’m', 37.355], ['a', 37.805], ['sine', 37.905], ['wave', 38.27]],
    serif: [['Then', 38.580, 0.18], ['you', 38.847, 0.18], ['can', 39.025, 0.2], ['sit', 39.283, 0.2], ['on', 39.514, 0.2], ['all', 39.718, 0.18], ['my', 40.007, 0.18]],
    out: 40.768,
  },
  {
    mono: [['If', 40.92], ['I', 40.99], ['approach', 41.105], ['infinity', 41.305]],
    serif: [['Then', 42.277, 0.18], ['you', 42.532, 0.18], ['can', 42.693, 0.2], ['be', 42.978, 0.2], ['my', 43.047, 0.18]],
    out: 99,
  },
];

// Chapter icons (top right): centre x, shared centre y; the active one is white with a dot below.
export const ICONS = { xs: [1649, 1696, 1742, 1788], y: 174, dotY: 193.5 };
// [time, active index] — the dot slides between icons over ~0.22 s from each time.
export const ICON_STEPS = [[33.42, 1], [37.083, 2], [40.983, 3]];
