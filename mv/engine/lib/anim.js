// Small deterministic animation helpers shared by all scenes.

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const invLerp = (a, b, v) => (v - a) / (b - a);
// 0..1 progress of t over the window [t0, t0 + len]
export const prog = (t, t0, len) => clamp((t - t0) / len);
export const smoothstep = (k) => k * k * (3 - 2 * k);

export const ease = {
  linear: (k) => k,
  inQuad: (k) => k * k,
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  inCubic: (k) => k * k * k,
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  inOutQuart: (k) => (k < 0.5 ? 8 * k ** 4 : 1 - Math.pow(-2 * k + 2, 4) / 2),
  inSine: (k) => 1 - Math.cos((k * Math.PI) / 2),
  outSine: (k) => Math.sin((k * Math.PI) / 2),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outExpo: (k) => (k === 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inOutExpo: (k) => (k === 0 ? 0 : k === 1 ? 1 : k < 0.5 ? Math.pow(2, 20 * k - 10) / 2 : (2 - Math.pow(2, -20 * k + 10)) / 2),
  outBack: (k, s = 1.70158) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
};

// Seeded PRNG (mulberry32). Never use Math.random() in a scene.
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

// Characters of `text` visible at time t when typed from t0 at `cps` characters per second.
export const typed = (text, t, t0, cps) => text.slice(0, Math.max(0, Math.floor((t - t0) * cps)));
