// A seeded surface cloud, paired with the rectangular message grid. Each shell particle
// has its own brightness and launch delay before falling into the filled ball.
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const COLS = 73, ROWS = 23, N = COLS * ROWS, NT = 1000;

// Cubic timing curve for the grid's contraction, with zero velocity at either end.
export function sphereProgress(t) {
  if (t <= 29.03) return 0;
  const x = clamp((t - 28.9734) / 0.7318);
  let lo = 0, hi = 1, u = x;
  for (let i = 0; i < 16; i++) {
    u = (lo + hi) / 2;
    const bx = 3 * (1 - u) ** 2 * u * 0.4769 + 3 * (1 - u) * u * u * 0.3169 + u ** 3;
    if (bx < x) lo = u; else hi = u;
  }
  return u * u * (3 - 2 * u);
}

export function createParticleField(env) {
  const rnd = env.rng(20240629), shellRnd = env.rng(917503);
  const G = new Float32Array(N * 2), grp = new Int32Array(N), dup = new Uint8Array(N);
  const S = new Float32Array(NT * 2), Sz = new Float32Array(NT);
  const B = new Float32Array(NT * 2), Bd = new Float32Array(NT);
  const sourceAlpha = new Float32Array(NT), departure = new Float32Array(NT);
  const pairStart = new Uint8Array(N), cand = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 1; c += 2) cand.push(r * COLS + c);
  for (let i = cand.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]];
  }
  for (const i of cand.slice(0, N - NT)) pairStart[i] = 1;
  let g = 0;
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / COLS), c = i % COLS;
    G[i * 2] = 961.5 + (c - 36) * 23.1; G[i * 2 + 1] = 535.5 + (r - 11) * 22.8;
    if (c > 0 && pairStart[i - 1] && !dup[i - 1]) { grp[i] = grp[i - 1]; dup[i] = 1; continue; }
    grp[i] = g;
    const u = clamp((c + (pairStart[i] ? 0.5 : 0) - 36) / 36.5 + (rnd() - 0.5) * 0.05, -1, 1);
    const v = clamp((r - 11) / 11.5 + (rnd() - 0.5) * 0.12, -1, 1);
    let x = u * Math.sqrt(1 - v * v / 2), y = v * Math.sqrt(1 - u * u / 2);
    const rd = Math.min(0.999, Math.hypot(x, y)) || 1e-4;
    const rs = Math.sqrt(1 - (1 - rd * rd) ** 2);
    x *= rs / rd; y *= rs / rd;
    S[g * 2] = 959.5 + 352 * x; S[g * 2 + 1] = 469.5 + 352 * y;
    Sz[g] = (rnd() < 0.5 ? -1 : 1) * Math.sqrt(Math.max(0, 1 - rs * rs));
    let bx, by, bz;
    do { bx = rnd() * 2 - 1; by = rnd() * 2 - 1; bz = rnd() * 2 - 1; } while (bx * bx + by * by + bz * bz > 1);
    B[g * 2] = 959.5 + 280 * bx; B[g * 2 + 1] = 643 + 237 * by; Bd[g] = rnd();
    g++;
  }
  const shell = Array.from({ length: NT }, () => {
    const z = (shellRnd() < 0.5 ? -1 : 1) * shellRnd() ** 0.91;
    const angle = shellRnd() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    const a = clamp(0.6 + (shellRnd() + shellRnd() + shellRnd() - 1.5) * 0.073, 0.46, 0.75);
    const glint = shellRnd() < 0.022;
    return [959.5 + 352 * r * Math.cos(angle), 469.5 + 352 * r * Math.sin(angle), glint ? 1 : a,
      29.75 + shellRnd() * 0.37, z];
  });
  // Assign nearby shell targets to grid neighbours so the contraction keeps its local flow.
  const distances = new Float64Array(NT * NT);
  for (let i = 0; i < NT; i++) for (let j = 0; j < NT; j++) {
    const dx = S[i * 2] - shell[j][0], dy = S[i * 2 + 1] - shell[j][1];
    distances[i * NT + j] = Math.round((dx * dx + dy * dy) * 100) * NT * NT + i * NT + j;
  }
  distances.sort();
  const usedSource = new Uint8Array(NT), usedTarget = new Uint8Array(NT);
  let assigned = 0;
  for (const encoded of distances) {
    const pair = encoded % (NT * NT), i = Math.floor(pair / NT), j = pair % NT;
    if (usedSource[i] || usedTarget[j]) continue;
    usedSource[i] = usedTarget[j] = 1;
    S[i * 2] = shell[j][0]; S[i * 2 + 1] = shell[j][1]; Sz[i] = shell[j][4];
    sourceAlpha[i] = shell[j][2]; departure[i] = shell[j][3];
    if (++assigned === NT) break;
  }
  return { G, grp, dup, S, Sz, B, Bd, sourceAlpha, departure, rnd };
}
