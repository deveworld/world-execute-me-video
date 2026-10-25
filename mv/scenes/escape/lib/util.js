// Shared helpers for the escape segment. Everything here is pure (no time sources, no randomness).
export const W = 1920, H = 1080;
export const FPS = 60;
export const SPB = 60 / 130;
export const BEAT0 = 0.1396;
export const beatTime = (b) => BEAT0 + b * SPB;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, t0, len) => clamp((t - t0) / len);

export const ease = {
  linear: (k) => k,
  inQuad: (k) => k * k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  inCubic: (k) => k * k * k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
};

// Times measured off the original are "first frame where X is visible". A frame index f is shown
// at t = f/60, so an event recorded at frame f is active for t >= (f - 0.5)/60 — robust to float noise.
export const at = (sec) => Math.round(sec * FPS) / FPS - 0.5 / FPS;
export const on = (t, sec) => t >= at(sec);

// Piecewise-linear lookup in a sorted [[x, y], ...] table (clamped at both ends).
export function table(pairs) {
  return (x) => {
    if (x <= pairs[0][0]) return pairs[0][1];
    for (let i = 1; i < pairs.length; i++) {
      if (x <= pairs[i][0]) {
        const [x0, y0] = pairs[i - 1], [x1, y1] = pairs[i];
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
    }
    return pairs[pairs.length - 1][1];
  };
}

export const rgba = (hex, a = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

// Fonts that are not in assets/fonts (Iosevka is not a Google font; Victor Mono is vendored because the
// GitHub API used by tools/fetch_fonts.py was rate-limited). Registered under segment-private names.
const FONT_FILES = [
  ['EscIosevka', 'iosevka-200.woff2', { weight: '200' }],
  ['EscIosevka', 'iosevka-300.woff2', { weight: '300' }],
  ['EscIosevka', 'iosevka-400.woff2', { weight: '400' }],
  ['EscIosevka', 'iosevka-500.woff2', { weight: '500' }],
  ['EscVictor', 'victormono-300-italic.woff2', { weight: '300', style: 'italic' }],
  ['EscVictor', 'victormono-400-italic.woff2', { weight: '400', style: 'italic' }],
];
let fontsPromise = null;
export function loadVendorFonts() {
  if (!fontsPromise) {
    const base = new URL('../vendor/fonts/', import.meta.url).href;
    fontsPromise = Promise.all(FONT_FILES.map(async ([family, file, desc]) => {
      const face = new FontFace(family, `url(${base}${file})`, desc);
      document.fonts.add(face);
      await face.load();
    }));
  }
  return fontsPromise;
}

export function makeCanvas(root, env) {
  const { canvas, ctx } = env.canvas(root, { context: '2d', options: { alpha: false } });
  return { canvas, ctx };
}

// Baseline offset (from the top of a CSS line box of height lh) for the current ctx.font —
// matches how the DOM centres the font's ascent+descent inside the line box.
export function baselineIn(ctx, lh) {
  const m = ctx.measureText('Hg');
  const a = m.fontBoundingBoxAscent, d = m.fontBoundingBoxDescent;
  return (lh - (a + d)) / 2 + a;
}

// Put a 2D context back into its default drawing state. Called at the top of render(t) so that nothing set
// while drawing one frame (lineJoin, alpha, composite, filter, ...) can leak into the next: frames are rendered
// in arbitrary order, so render(t) must not depend on what was drawn before.
export function resetCtx(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.shadowColor = 'rgba(0,0,0,0)';
  ctx.lineWidth = 1; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.miterLimit = 10;
  ctx.setLineDash([]); ctx.lineDashOffset = 0;
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
  ctx.textAlign = 'start'; ctx.textBaseline = 'alphabetic'; ctx.direction = 'inherit';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  if ('wordSpacing' in ctx) ctx.wordSpacing = '0px';
  ctx.imageSmoothingEnabled = true;
}
