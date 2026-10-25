// Shared helpers for the `love` segment (169.958333–193.600).
import { rng } from '../../engine/lib/anim.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, t0, len) => clamp((t - t0) / len);
export const smooth = (k) => k * k * (3 - 2 * k);
export const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
export const easeInOutSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2;
export { rng };

// Piecewise-linear lookup in a sorted [[t, v], ...] table (clamped at both ends).
export function table(tab, t) {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (t <= tab[i][0]) {
      const [t0, v0] = tab[i - 1];
      const [t1, v1] = tab[i];
      return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
    }
  }
  return tab[tab.length - 1][1];
}

// Scene-local fonts (OFL, copied from google/fonts into scenes/love/fonts/).
const FONT_DIR = new URL('./fonts/', import.meta.url).href;
const FONT_DEFS = [
  ['LoveK2D', 'K2D-Thin.ttf', { weight: '100' }],
  ['LoveK2D', 'K2D-ExtraLight.ttf', { weight: '200' }],
  ['LoveStencil', 'BigShouldersStencilDisplay-wght.ttf', { weight: '100 900' }],
  ['LoveSTIX', 'STIXTwoText-wght.ttf', { weight: '400 700' }],
  ['LoveSTIX', 'STIXTwoText-Italic-wght.ttf', { weight: '400 700', style: 'italic' }],
  ['LoveAlegreya', 'Alegreya-wght.ttf', { weight: '400 900' }],
  ['LoveAlegreya', 'Alegreya-Italic-wght.ttf', { weight: '400 900', style: 'italic' }],
];
let fontsPromise = null;
export function loadLoveFonts(extra = []) {
  if (!fontsPromise) {
    fontsPromise = Promise.all(FONT_DEFS.map(async ([family, file, desc]) => {
      const face = new FontFace(family, `url(${FONT_DIR}${file})`, desc);
      document.fonts.add(face);
      await face.load();
    }));
  }
  return Promise.all([fontsPromise, ...extra.map((f) => document.fonts.load(f))]);
}

// ---------- the algebraic heart (x²+y²−1)³ − x²y³ = 0 ----------
// Unit coordinates, y up. The curve is star-shaped around the origin, so r(θ) is found by bisection.
const F = (x, y) => {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y;
};
function radiusAt(th) {
  const c = Math.cos(th), s = Math.sin(th);
  let lo = 0, hi = 2;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (F(mid * c, mid * s) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Closed polyline starting at the bottom tip, going up the right side to the top cusp and down the left side.
// Returns { pts: [[x, y], ...] (unit, y up), cum: cumulative arc length, len }.
let heartCache = null;
export function heartPath(n = 1440) {
  if (heartCache && heartCache.pts.length === n + 1) return heartCache;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const th = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const r = radiusAt(th);
    pts.push([r * Math.cos(th), r * Math.sin(th)]);
  }
  pts[0] = [0, -1];
  pts[n] = [0, -1];
  const cum = [0];
  for (let i = 1; i <= n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  heartCache = { pts, cum, len: cum[n] };
  return heartCache;
}

// Point at arc-length fraction u ∈ [0, 1] (0 = bottom tip, going counter-clockwise: right side first).
export function heartAt(u) {
  const h = heartPath();
  const target = ((u % 1) + 1) % 1 * h.len;
  let lo = 0, hi = h.cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (h.cum[mid] < target) lo = mid; else hi = mid;
  }
  const k = (target - h.cum[lo]) / Math.max(1e-9, h.cum[hi] - h.cum[lo]);
  const a = h.pts[lo], b = h.pts[hi];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

// Trace the heart (or the part between arc fractions u0..u1) into ctx as a path, in screen space.
export function traceHeart(ctx, cx, cy, S, u0 = 0, u1 = 1, close = true) {
  const h = heartPath();
  const n = h.pts.length - 1;
  ctx.beginPath();
  if (u0 <= 0 && u1 >= 1) {
    for (let i = 0; i <= n; i++) {
      const [x, y] = h.pts[i];
      if (i === 0) ctx.moveTo(cx + x * S, cy - y * S); else ctx.lineTo(cx + x * S, cy - y * S);
    }
    if (close) ctx.closePath();
    return;
  }
  const steps = Math.max(2, Math.ceil((u1 - u0) * n));
  for (let i = 0; i <= steps; i++) {
    const [x, y] = heartAt(u0 + (u1 - u0) * (i / steps));
    if (i === 0) ctx.moveTo(cx + x * S, cy - y * S); else ctx.lineTo(cx + x * S, cy - y * S);
  }
}

// 1D value noise (smooth), deterministic per seed.
export function noise1(seed) {
  const r = rng(seed);
  const N = 256;
  const v = Float32Array.from({ length: N }, () => r() * 2 - 1);
  return (x) => {
    const i = Math.floor(x), f = x - i;
    const a = v[((i % N) + N) % N], b = v[(((i + 1) % N) + N) % N];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}

// Draw text with per-character typing reveal: char i appears at t0 + i/cps and fades in over `fade` s.
// Character x positions come from measuring prefixes, so kerning and ctx.letterSpacing are respected.
export function typedText(ctx, text, x, y, t, t0, cps, fade = 0.06, alpha = 1) {
  const base = ctx.globalAlpha;
  for (let i = 0; i < text.length; i++) {
    const a = clamp((t - (t0 + i / cps)) / fade);
    if (a <= 0) break;
    const ch = text[i];
    if (ch === ' ') continue;
    ctx.globalAlpha = base * a * alpha;
    ctx.fillText(ch, x + ctx.measureText(text.slice(0, i)).width, y);
  }
  ctx.globalAlpha = base;
}

// Words of one line revealed in place: words = [[text, tIn, fadeLen], ...] laid out left to right with spaces.
// Returns the x after the last word. `alphaFn(t)` multiplies everything (for line fades).
export function wordsLine(ctx, words, x, y, t, alpha = 1, styleFn = null) {
  const base = ctx.globalAlpha;
  let cx = x;
  const space = ctx.measureText(' ').width;
  for (const [w, tIn, len = 0.08, style] of words) {
    const a = clamp((t - tIn) / len);
    if (a > 0) {
      ctx.save();
      if (styleFn && style) styleFn(ctx, style);
      ctx.globalAlpha = base * a * alpha;
      ctx.fillText(w, cx, y);
      ctx.restore();
    }
    ctx.save();
    if (styleFn && style) styleFn(ctx, style);
    cx += ctx.measureText(w).width;
    ctx.restore();
    cx += space;
  }
  ctx.globalAlpha = base;
  return cx - space;
}
