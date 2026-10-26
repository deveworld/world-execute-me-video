import { clamp, prog, rng } from '../lib.js';

// Symmetric cubic easing brings the outline and its dot to the same resting point.
export function heartMove(t) {
  const x = prog(t, 192.683, .9), a = .632;
  let u = x;
  for (let i = 0; i < 8; i++) {
    const v = 1 - u;
    const px = 3 * a * v * v * u + 3 * (1 - a) * v * u * u + u * u * u;
    const dx = 3 * a * v * v + 6 * (1 - 2 * a) * v * u + 3 * a * u * u;
    u = clamp(u - (px - x) / dx);
  }
  return u * u * (3 - 2 * u);
}

// The light slows along the heart's arc, then leaves on a straight tangent.
export function sparkPosition(t, heartAt) {
  const d = clamp(t - 184.6, 0, 3.7);
  const u = .2086 + .04294 * d - .001144 * d * d - .000834 * d * d * d;
  const [hx, hy] = heartAt(Math.min(.30905, u));
  const off = Math.max(0, t - 188.7);
  const travel = 253 * off * (1 - Math.exp(-off / .035));
  return [700 + 352 * hx + travel, 586 - 352 * hy - .30 * travel];
}

export function makeStars() {
  const random = rng(184708);
  return Array.from({ length: 173 }, () => [
    random() * 1920, random() * 1080, 18 + 162 * random() ** .8,
  ]);
}
