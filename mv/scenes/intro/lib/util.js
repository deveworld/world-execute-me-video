// Small shared helpers for the intro segment scenes (pure functions only).

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, t0, len) => clamp((t - t0) / len);
export const smooth = (k) => k * k * (3 - 2 * k);

export const ease = {
  linear: (k) => k,
  inQuad: (k) => k * k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inCubic: (k) => k * k * k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outSine: (k) => Math.sin((k * Math.PI) / 2),
  outExpo: (k) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inExpo: (k) => (k <= 0 ? 0 : k >= 1 ? 1 : Math.pow(2, 10 * k - 10)),
  outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
};

// outExpo progress of a transition that starts at t0 and lasts len seconds.
export const oexp = (t, t0, len) => ease.outExpo((t - t0) / len);

// Piecewise-linear lookup in a sorted [[t, v], ...] table (clamped at both ends).
export function table(tab, t) {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (t <= tab[i][0]) {
      const [t0, v0] = tab[i - 1], [t1, v1] = tab[i];
      return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
    }
  }
  return tab[tab.length - 1][1];
}

// Colours as [r, g, b] arrays.
export const mix = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const rgb = (c, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Deterministic PRNG (mulberry32).
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Off-screen canvas helper.
export function offscreen(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Grey "paper" background with a soft radial falloff
// (centre plateau ~245, corners ~223). Returns a canvas to blit each frame.
export function paperBackground(W, H, { inner = 245, outer = 223, r0 = 470, r1 = 1100, cx = 990, cy = 540 } = {}) {
  const c = offscreen(W, H);
  const x = c.getContext('2d');
  const g = x.createRadialGradient(cx, cy, r0, cx, cy, r1);
  g.addColorStop(0, `rgb(${inner},${inner},${inner})`);
  g.addColorStop(1, `rgb(${outer},${outer},${outer})`);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return c;
}
