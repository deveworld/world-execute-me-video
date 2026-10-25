// Gielis superformula helpers. Shapes are sampled at N polar angles and normalised so max r = 1.
export const N = 1440;
const TAU = Math.PI * 2;

const cache = new Map();

// Normalised radii r[i] at phi_i = TAU * i / N (Float32Array, cached by parameters).
export function radii(m, n1, n2, n3) {
  const key = `${m.toFixed(4)}|${n1.toFixed(4)}|${n2.toFixed(4)}|${n3.toFixed(4)}`;
  let r = cache.get(key);
  if (r) return r;
  r = new Float32Array(N);
  let max = 0;
  for (let i = 0; i < N; i++) {
    const phi = (i / N) * TAU;
    const a = Math.abs(Math.cos((m * phi) / 4));
    const b = Math.abs(Math.sin((m * phi) / 4));
    const s = Math.pow(a, n2) + Math.pow(b, n3);
    const v = s > 0 ? Math.pow(s, -1 / n1) : 0;
    r[i] = v;
    if (v > max) max = v;
  }
  for (let i = 0; i < N; i++) r[i] /= max;
  if (cache.size > 4000) cache.clear();
  cache.set(key, r);
  return r;
}

export const CIRCLE = new Float32Array(N).fill(1);

// Radial blend between two radius arrays.
export function blend(a, b, k, out = new Float32Array(N)) {
  for (let i = 0; i < N; i++) out[i] = a[i] + (b[i] - a[i]) * k;
  return out;
}

// "Pop" morph used when the symmetry m changes: old → circle → new.
export function pop(a, b, p, out = new Float32Array(N), expo = 1.25) {
  if (p < 0.5) {
    const k = p * 2;
    for (let i = 0; i < N; i++) out[i] = a[i] + (1 - a[i]) * k;
  } else {
    const s = 1 - Math.pow(2 * (1 - p), expo);
    for (let i = 0; i < N; i++) out[i] = 1 + (b[i] - 1) * s;
  }
  return out;
}

// Radius at screen angle theta (radians, CCW) for radii r rotated by rot (radians).
export function radiusAt(r, theta, rot = 0) {
  let u = ((theta - rot) / TAU) % 1;
  if (u < 0) u += 1;
  const f = u * N;
  const i = Math.floor(f) % N, j = (i + 1) % N, k = f - Math.floor(f);
  return r[i] + (r[j] - r[i]) * k;
}

// Trace the closed polar curve into the current path (screen y grows downward).
export function tracePath(ctx, r, cx, cy, R, rot = 0, step = 1) {
  for (let i = 0; i < N; i += step) {
    const phi = (i / N) * TAU + rot;
    const x = cx + Math.cos(phi) * r[i] * R, y = cy - Math.sin(phi) * r[i] * R;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}
