// Radiation drains the orbit's energy: separation falls as the fourth root of
// the remaining time, while the integrated orbital frequency is a 5/8 power.
export const MERGE = 58.825;
export const TAU = 2 * Math.PI;
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const mix = (a, b, k) => a + (b - a) * k;
export const smooth = v => { v = clamp(v); return v * v * (3 - 2 * v); };

export function track(keys, t) {
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [a, v] = keys[i - 1], [b, w] = keys[i];
      return mix(v, w, clamp((t - a) / (b - a)));
    }
  }
  return keys.at(-1)[1];
}

// The projected centre drops in two stages as the common well deepens.
const CENTRE = [
  [55.108, 507], [57.15, 507], [57.32, 523], [57.52, 551],
  [58.12, 555], [58.32, 584], [58.52, 605], [58.72, 620], [MERGE, 655],
];
export const centreY = t => track(CENTRE, t);
export const phase = t => {
  const tau = Math.max(0.00001, 58.82363 - t);
  return -34.59361 + 14.663213 * tau ** 0.6223055 + 0.05534 * tau;
};
export const radius = t => t >= MERGE ? 0 : 185.14 * Math.max(0, 58.82273 - t) ** 0.248491;

export function binary(t) {
  const r = radius(t), a = phase(t), cy = centreY(t);
  const cx = 1179.55 + 0.00012055 * r * r * Math.sin(2 * a);
  const y = cy + 0.71 - 0.0000588 * r * r * Math.cos(2 * a);
  const u = r * Math.cos(a), v = r * Math.sin(a);
  return { r, a, cx, cy: y, points: [[cx + u, y + 0.52 * v], [cx - u, y - 0.52 * v]] };
}

// A chirp has twice the orbital phase and grows as the orbit shrinks.
export function strainAt(t) {
  const tau = Math.max(0.0025, 58.82743 - t);
  const inspiral = 20.47998 * tau ** -0.176453 *
    Math.sin(29.72990 * tau ** 0.625 - 0.171038 * tau - 1.826559);
  if (t <= 58.8243) return 903.959 + inspiral;
  const dt = t - 58.8243;
  return 904 + Math.exp(-dt / 0.052) * (1.2551 * Math.sin(129.25 * dt) - 46.454 * Math.cos(129.25 * dt));
}

// The common well approaches its final depth after the pair becomes one body.
export function fieldAt(t, pair) {
  const settle = smooth((t - 58.70) / 0.18);
  const post = smooth((t - MERGE) / 0.3);
  const cy = centreY(t);
  return {
    originY: 484 - 3 * post,
    tilt: 0.478 - 0.034 * settle,
    soft: 76 + 28 * post,
    local: 34 + 11 * settle,
    depth: Math.max(0, cy - 507) * 230 + 700,
    globalSoft: 230 - 35 * settle,
    bodies: pair.points.map(([x, y]) => {
      const v = (y - cy) / 0.49;
      return [(x - 1180) / (1 + 0.000235 * v), v];
    }),
    localGain: 0.5 + 0.5 * clamp(pair.r / 50),
  };
}

export function meshPoint(u, v, f) {
  let depth = f.depth / Math.sqrt(u * u + v * v + f.globalSoft * f.globalSoft);
  for (const [x, y] of f.bodies) {
    depth += f.local * f.localGain * f.soft /
      Math.sqrt((u - x) ** 2 + (v - y) ** 2 + f.soft * f.soft);
  }
  return [1179.5 + u * (1 + 0.00023 * v), f.originY + v * f.tilt + depth];
}
