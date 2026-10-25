// Verse 1 — "If I'm a set of points / Then I will give you my DIMENSION" (29.23–33.65 s).
// 1679 dots (the 23×73 Arecibo grid handed over by the bookends segment) contract onto a
// sphere, collapse into a ball (dim 0), stream onto a segment (dim 1), which extrudes into a
// 10×10 lattice square (dim 2) and a 10×10×10 lattice cube (dim 3). The cube then turns to the
// corner-on view whose silhouette is the regular hexagon that verse 2 starts from.
import { clamp, lerp, prog, ease, marker } from './draw.js';
import { el } from './text.js';
import { SERIF, MONO } from './const.js';
import { SPHERE_POINTS } from './sphere-points.js';

const T0 = 29.2, T1 = 33.7;
const COLS = 73, ROWS = 23, N = COLS * ROWS;
const SPH = { x: 959.5, y: 469.5, r: 352 };
const BALL = { x: 959.5, y: 643, rx: 280, ry: 237 };
const CUBE = { x: 959.5, y: 649.5, h: 150, F: 1500 };
const POSE1 = { yaw: 0.72, pitch: -0.4 };                 // fitted on the full lattice at several frames
const POSE2 = { yaw: Math.PI / 4, pitch: -Math.atan(1 / Math.SQRT2), roll: -Math.PI / 6 }; // corner-on

// grid → sphere progress, read off the source (x-extent of the field, 29.05 → 29.72)
const P1 = [[29.03, 0], [29.083, 0.035], [29.117, 0.078], [29.15, 0.134], [29.183, 0.204], [29.217, 0.29],
  [29.25, 0.385], [29.283, 0.494], [29.317, 0.606], [29.35, 0.70], [29.383, 0.767], [29.417, 0.83],
  [29.45, 0.874], [29.483, 0.908], [29.517, 0.936], [29.55, 0.958], [29.583, 0.972], [29.617, 0.986],
  [29.65, 0.993], [29.683, 0.998], [29.73, 1]];
function table(tab, t) {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (t <= tab[i][0]) {
      const [a, va] = tab[i - 1], [b, vb] = tab[i];
      const k = (t - a) / (b - a);
      return va + (vb - va) * k * k * (3 - 2 * k) * 0.5 + (vb - va) * k * 0.5;
    }
  }
  return tab[tab.length - 1][1];
}

function rot3(yaw, pitch, roll) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  // R = Rz(roll) · Rx(pitch) · Ry(yaw)
  const Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]];
  const Rz = [[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]];
  const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  return mul(Rz, mul(Rx, Ry));
}

export function createPoints({ root, env }) {
  const rnd = env.rng(20240629);
  // ---------- dots ----------
  // 1679 grid dots → 1000 targets: 679 dots pair up with their right-hand neighbour and merge
  // into it on the way to the sphere (the source shows ".." pairs closing up around 29.4 s).
  const NT = 1000;
  const G = new Float32Array(N * 2), grp = new Int32Array(N), dup = new Uint8Array(N);
  const S = new Float32Array(NT * 2), Sz = new Float32Array(NT), B = new Float32Array(NT * 2);
  const Ls = new Float32Array(NT), Lp = new Float32Array(NT), Bd = new Float32Array(NT);
  const sourceAlpha = new Float32Array(NT);
  const departure = new Float32Array(NT);
  const pairStart = new Uint8Array(N);
  let pairs = 0;
  const cand = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 1; c += 2) cand.push(r * COLS + c);
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  for (const i of cand) { if (pairs >= N - NT) break; pairStart[i] = 1; pairs++; }
  let g = 0;
  for (let i = 0; i < N; i++) {
    const r = Math.floor(i / COLS), c = i % COLS;
    G[i * 2] = 961.5 + (c - 36) * 23.1;
    G[i * 2 + 1] = 535.5 + (r - 11) * 22.8;
    if (c > 0 && pairStart[i - 1] && !dup[i - 1]) { grp[i] = grp[i - 1]; dup[i] = 1; continue; }
    grp[i] = g;
    // target on the sphere: rectangle → disk (elliptical grid map) + jitter, re-spread radially
    // so the projected density is that of a sphere surface (rim-heavy)
    let u = (c + (pairStart[i] ? 0.5 : 0) - 36) / 36.5 + (rnd() - 0.5) * 0.05, v = (r - 11) / 11.5 + (rnd() - 0.5) * 0.12;
    u = clamp(u, -1, 1); v = clamp(v, -1, 1);
    let x = u * Math.sqrt(1 - (v * v) / 2), y = v * Math.sqrt(1 - (u * u) / 2);
    const rd = Math.min(0.999, Math.hypot(x, y)) || 1e-4;
    const rs = Math.sqrt(1 - Math.pow(1 - rd * rd, 2));
    x *= rs / rd; y *= rs / rd;
    S[g * 2] = SPH.x + SPH.r * x;
    S[g * 2 + 1] = SPH.y + SPH.r * y;
    Sz[g] = (rnd() < 0.5 ? -1 : 1) * Math.sqrt(Math.max(0, 1 - rs * rs));
    // ball: an independent uniform point (so the shell fills in as it shrinks)
    let bx, by, bz;
    do { bx = rnd() * 2 - 1; by = rnd() * 2 - 1; bz = rnd() * 2 - 1; } while (bx * bx + by * by + bz * bz > 1);
    B[g * 2] = BALL.x + BALL.rx * bx;
    B[g * 2 + 1] = BALL.y + BALL.ry * by;
    Bd[g] = rnd();
    g++;
  }
  // Preserve the grid's local ordering while replacing the guessed shell with reusable
  // vector anchors. Nearest available pairs are assigned globally, once during creation.
  const pairsByDistance = new Float64Array(NT * NT);
  for (let i = 0; i < NT; i++) for (let j = 0; j < NT; j++) {
    const dx = S[i * 2] - SPHERE_POINTS[j][0], dy = S[i * 2 + 1] - SPHERE_POINTS[j][1];
    pairsByDistance[i * NT + j] = Math.round((dx * dx + dy * dy) * 100) * (NT * NT) + i * NT + j;
  }
  pairsByDistance.sort();
  const usedSource = new Uint8Array(NT), usedTarget = new Uint8Array(NT);
  let assigned = 0;
  for (const encoded of pairsByDistance) {
    const pair = encoded % (NT * NT), i = Math.floor(pair / NT), j = pair % NT;
    if (usedSource[i] || usedTarget[j]) continue;
    usedSource[i] = usedTarget[j] = 1;
    S[i * 2] = SPHERE_POINTS[j][0]; S[i * 2 + 1] = SPHERE_POINTS[j][1]; sourceAlpha[i] = SPHERE_POINTS[j][2];
    departure[i] = SPHERE_POINTS[j][3];
    if (++assigned === NT) break;
  }
  const order = [];
  for (let k = 0; k < NT; k++) order.push([B[k * 2] + (rnd() - 0.5) * 60, k]);
  order.sort((a, b) => a[0] - b[0]);
  order.forEach(([, k], rank) => { Ls[k] = (rank + 0.5) / NT * 2 - 1; Lp[k] = rnd(); });

  // ---------- lattice (10×10×10) ----------
  const LAT = [];
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) for (let k = 0; k < 10; k++) LAT.push([i, j, k, rnd()]);

  // ---------- keyword ----------
  const kw = el('div', `position:absolute;left:0;top:0;white-space:pre;font-family:${SERIF};font-size:89px;letter-spacing:-0.9px;` +
    'font-weight:400;color:#ffffff;transform-origin:0 0;line-height:1;display:none', root);
  kw.textContent = 'Dimension';
  let kwW = 0, kwBase = 0;

  // ---------- timelines ----------
  const sqK = (t) => ease.outQuart(prog(t, 31.595, 0.25));        // segment → square
  const sqP = (t) => ease.outCubic(prog(t, 31.63, 0.26));         // lattice rows follow
  const depthK = (t) => ease.outQuart(prog(t, 32.055, 0.26));     // square → cube
  const turn1 = (t) => ease.outCubic(prog(t, 32.06, 0.845));      // first turn
  const turn2 = (t) => ease.inOutSine(prog(t, 32.976, 0.46));     // to corner-on view
  const lineLen = (t) => ease.outQuart(prog(t, 30.668, 0.45));
  // the segment starts tilted ~0.21 rad and levels out over 0.5 s (measured 30.68–31.0)
  const lineAng = (t) => 0.21 * Math.pow(1 - prog(t, 30.68, 0.5), 2.5);

  function cubeProj(t) {
    const k1 = turn1(t), k2 = turn2(t);
    const yaw = lerp(POSE1.yaw * k1, POSE2.yaw, k2);
    const pitch = lerp(POSE1.pitch * k1, POSE2.pitch, k2);
    const roll = lerp(0, POSE2.roll, k2);
    const invF = lerp(1 / CUBE.F, 0, k2);
    const R = rot3(yaw, pitch, roll);
    const d = depthK(t), sy = t < 32 ? sqK(t) : 1;
    return (x, y, z) => {
      const X = x * CUBE.h, Yy = y * CUBE.h * sy, Z = z * CUBE.h * d;
      const px = R[0][0] * X + R[0][1] * Yy + R[0][2] * Z;
      const py = R[1][0] * X + R[1][1] * Yy + R[1][2] * Z;
      const pz = R[2][0] * X + R[2][1] * Yy + R[2][2] * Z;
      const s = 1 / (1 + pz * invF);
      return [CUBE.x + px * s, CUBE.y - py * s, pz];
    };
  }

  // marker (peach) position
  function markerPos(t, P) {
    if (t < 29.75) {
      const k = ease.inOutCubic(prog(t, 28.83, 0.9));
      return [lerp(1626, 845, k), lerp(536, 220.6, k)];
    }
    if (t < 30.68) {
      const k = ease.inOutQuad(prog(t, 29.77, 0.63));
      const d = prog(t, 30.4, 0.28);
      return [lerp(845, 1143.5, k) + d, lerp(220.6, 782.5, k) + 2.5 * d];
    }
    const lineEnd = () => {
      const L = 148.5 * lineLen(t), a = lineAng(t);
      return [959.5 + L * Math.cos(a), 649.6 + L * Math.sin(a)];
    };
    if (t < 31.6) {
      // darts up-left first, then rides the growing segment's right end (on it by ~30.87)
      const k = prog(t, 30.685, 0.2);
      const [ex, ey] = lineEnd();
      return [lerp(1144.5, ex, ease.outQuad(k)), lerp(785, ey, ease.outCubic(k))];
    }
    const p = P(1, 1, 1);
    return [p[0] - 0.8 * (1 - prog(t, 31.6, 0.2)) * 3, p[1]];
  }

  function drawDots(ctx, t) {
    if (t > 31.1) return;
    const p1 = table(P1, t);
    const L = 148.5 * lineLen(t), a = lineAng(t), ca = Math.cos(a), sa = Math.sin(a);
    const bright = lerp(0.44, 0.82, prog(t, 29.48, 0.25)) - 0.16 * prog(t, 29.95, 0.45);
    const rad = 1.4 - 0.15 * prog(t, 29.35, 0.35) + 0.3 * prog(t, 29.95, 0.45);
    ctx.save();
    ctx.fillStyle = '#e9eaf2';
    for (let i = 0; i < N; i++) {
      const k = grp[i];
      let x = lerp(G[i * 2], S[k * 2], p1), y = lerp(G[i * 2 + 1], S[k * 2 + 1], p1);
      let alpha = lerp(bright * (0.78 + 0.22 * Bd[k]), sourceAlpha[k], prog(t, 29.35, 0.38));
      if (dup[i]) {
        const m = ease.inOutQuad(prog(t, 29.39, 0.17));
        alpha *= 1 - m;
        if (alpha <= 0.01) continue;
        x += 7 * (1 - m) * Math.min(1, p1 * 2); y += 1.5 * (1 - m);
      }
      const k2 = ease.inOutSine(prog(t, departure[k], 0.6));
      let r = rad;
      if (k2 > 0) {
        // in the ball the dots read as a 3-D volume: crisp, bright, near ones larger (measured:
        // peak brightness rises from ~135 to ~200 over the background while total ink stays put)
        const w = Bd[k];
        x = lerp(x, B[k * 2], k2); y = lerp(y, B[k * 2 + 1], k2);
        alpha = lerp(alpha, 0.8 + 0.2 * w, k2);
        r = lerp(rad, 1.0 + 0.5 * w * w, k2);
      }
      if (t > 30.68) {
        // the cloud mostly fades where it is while drifting toward the new segment
        const f = prog(t, 30.685 + Lp[k] * 0.05, 0.13);
        if (f >= 1) continue;
        const e = 0.35 * ease.inOutQuad(f);
        x = lerp(x, 959.5 + Ls[k] * L * ca, e); y = lerp(y, 649.6 + Ls[k] * L * sa, e);
        alpha *= 1 - f;
      }
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawLine(ctx, t) {
    if (t < 30.668 || t > 31.7) return;
    const L = 148.5 * lineLen(t), a = lineAng(t);
    const al = prog(t, 30.668, 0.04) * (1 - prog(t, 31.62, 0.08));
    ctx.save();
    ctx.globalAlpha = al;
    ctx.strokeStyle = '#e4e5ee';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(959.5 - L * Math.cos(a), 649.6 - L * Math.sin(a));
    ctx.lineTo(959.5 + L * Math.cos(a), 649.6 + L * Math.sin(a));
    ctx.stroke();
    ctx.restore();
  }

  const EDGES = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    EDGES.push([[-1, a, b], [1, a, b]], [[a, -1, b], [a, 1, b]], [[a, b, -1], [a, b, 1]]);
  }

  function drawSolid(ctx, t) {
    if (t < 31.59 || t > T1) return null;
    const P = cubeProj(t);
    const cubeOn = t >= 32.05;
    const fadeLat = 1 - prog(t, 33.64, 0.06);
    const fadeIn = prog(t, 31.62, 0.15);
    ctx.save();
    // lattice
    if (fadeLat > 0) {
      ctx.globalCompositeOperation = 'lighter';
      const spread = t < 32 ? sqP(t) : 1;
      const k2 = turn2(t);
      for (const [i, j, k, r] of LAT) {
        if (!cubeOn && k !== 9) continue;
        const x = i / 4.5 - 1, y = (j / 4.5 - 1) * (t < 32 ? spread / Math.max(1e-3, sqK(t)) : 1), z = cubeOn ? k / 4.5 - 1 : 1;
        const [sx, sy, pz] = P(x, y, cubeOn ? z : 0);
        const edge = (i === 0 || i === 9) + (j === 0 || j === 9) + (k === 0 || k === 9);
        const near = clamp(0.5 - pz / 400, 0.15, 1);
        let al = (0.75 + 0.25 * near) * fadeIn * fadeLat * (edge >= 2 ? 1 : 0.9);
        if (cubeOn && t < 32.4) al *= clamp(depthK(t) * 1.25 - (9 - k) / 9 * 0.7 + 0.1, 0.12, 1);
        let px = sx, py = sy;
        let rr = cubeOn ? (1.1 + 0.4 * near) * (1 + 0.3 * k2 * k2 * k2) : 1.25;   // corner-on sites read larger
        if (t > 33.44) {
          // Measured: the lattice sites stay put; each dot leaves at its own time (33.445–33.58),
          // drops to a faint speck and darts radially out to the hexagon outline, where it lingers
          // briefly and fades: the interior empties from the middle (clear by ~33.6) while the
          // rim stays speckled until ~33.68.
          const t0 = 33.445 + r * 0.135;
          if (t >= t0) {
            const fade = prog(t, t0 + 0.03, 0.08);
            if (fade >= 1) continue;
            // outward but scattered (not along the lattice rays, which would streak)
            const dx0 = sx - CUBE.x, dy0 = sy - CUBE.y, dl = Math.hypot(dx0, dy0);
            const r2 = (r * 3301) % 1, r3 = (r * 7919) % 1;
            const ang = (dl < 2 ? r3 * 6.2832 : Math.atan2(dy0, dx0)) + (r3 - 0.5) * 1.3;
            const dx = Math.cos(ang), dy = Math.sin(ang);
            const a6 = ((Math.atan2(-dy, dx) % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3) - Math.PI / 6;
            const rb = (244.9 * Math.cos(Math.PI / 6) / Math.cos(a6) - 3) * (0.78 + 0.2 * r2);
            const e = ease.outCubic(prog(t, t0, 0.07));
            const ex = CUBE.x + dx * rb, ey = CUBE.y + dy * rb;
            px = lerp(sx, ex, e); py = lerp(sy, ey, e);
            al *= 0.38 * (1 - fade);
            rr *= 0.8;
          }
        }
        ctx.globalAlpha = al;
        ctx.fillStyle = '#f2f2f8';
        ctx.beginPath(); ctx.arc(px, py, rr, 0, 6.2832); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    // edges
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    for (const [p, q] of EDGES) {
      const isZ = p[2] !== q[2];
      if (!cubeOn && (isZ || p[2] === -1)) continue;
      if (!cubeOn && isZ) continue;
      const A = P(p[0], p[1], cubeOn ? p[2] : 0), Bq = P(q[0], q[1], cubeOn ? q[2] : 0);
      let al = 0.92;
      if (t > 33.3) {
        // inner (non-silhouette) edges fade as the cube becomes a flat hexagon
        const sil = silhouette(p, q, t);
        if (!sil) al *= 1 - prog(t, 33.40, 0.14);
        else if (t >= 33.44) al = 0; // verse 2 draws the hexagon outline from here
      }
      if (al <= 0) continue;
      ctx.globalAlpha = al;
      ctx.strokeStyle = '#e6e7f0';
      ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(Bq[0], Bq[1]); ctx.stroke();
    }
    ctx.restore();
    return P;
  }
  // silhouette edges of the corner-on view: those not touching the two axis vertices
  function silhouette(p, q) {
    const axisA = [1, 1, -1], axisB = [-1, -1, 1];
    const eq = (u, v) => u[0] === v[0] && u[1] === v[1] && u[2] === v[2];
    return !(eq(p, axisA) || eq(q, axisA) || eq(p, axisB) || eq(q, axisB));
  }

  function drawReadout(ctx, t) {
    if (t < 30.25 || t > 33.15) return;
    const a = prog(t, 30.28, 0.12) * (1 - prog(t, 32.97, 0.14));
    const steps = [[30.676, 1], [31.592, 2], [32.058, 3]];   // roll starts (measured)
    let cur = 0, next = 0, k = 1;
    for (const [ts, d] of steps) {
      if (t >= ts) { cur = d; next = d; }
      else if (t >= ts - 0.0001) { /* noop */ }
    }
    let rollK = 1, from = cur, to = cur;
    for (const [ts, d] of steps) {
      if (t >= ts && t < ts + 0.08) { from = d - 1; to = d; rollK = ease.inOutSine(prog(t, ts, 0.075)); }
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `400 18.6px ${MONO}`;
    ctx.fillStyle = '#9fa0ad';
    ctx.fillText('dim', 1291.5, 535);
    ctx.beginPath(); ctx.rect(1280, 548, 60, 56); ctx.clip();
    ctx.font = `400 57.5px ${MONO}`;
    const dimIn = prog(t, 30.28, 0.2);
    ctx.fillStyle = dimIn < 1 ? `rgba(236,236,244,${0.45 + 0.55 * dimIn})` : '#ececf4';
    if (t > 32.97) ctx.filter = `blur(${(2 * prog(t, 32.97, 0.14)).toFixed(2)}px)`;
    if (rollK < 1) {
      ctx.fillText(String(from), 1289, 597.5 - 56 * rollK);
      ctx.fillText(String(to), 1289, 597.5 + 56 * (1 - rollK));
    } else ctx.fillText(String(to), 1289, 597.5);
    ctx.restore();
  }

  function drawKeyword(ctx, t, P) {
    const a = prog(t, 32.675, 0.05) * (1 - prog(t, 33.3, 0.13));
    if (!P || a <= 0) { kw.style.display = 'none'; return; }
    const A = P(-1, 1, -1), Bq = P(-1, 1, 1);
    const ang = Math.atan2(Bq[1] - A[1], Bq[0] - A[0]);
    const mx = (A[0] + Bq[0]) / 2, my = (A[1] + Bq[1]) / 2;
    const nx = Math.sin(ang), ny = -Math.cos(ang);   // outward normal (up-left)
    // dotted guide along the edge, extended past both corners
    const ext = 110;
    ctx.save();
    ctx.globalAlpha = a * 0.7;
    ctx.strokeStyle = '#b8b9c6';
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 3.5]);
    ctx.beginPath();
    ctx.moveTo(A[0] - Math.cos(ang) * ext, A[1] - Math.sin(ang) * ext);
    ctx.lineTo(Bq[0] + Math.cos(ang) * ext, Bq[1] + Math.sin(ang) * ext);
    ctx.stroke();
    ctx.restore();
    const off = 6;
    const ox = mx + nx * off - Math.cos(ang) * kwW / 2, oy = my + ny * off - Math.sin(ang) * kwW / 2;
    kw.style.display = '';
    kw.style.opacity = a.toFixed(3);
    kw.style.filter = a < 1 ? `blur(${(2.5 * (1 - a)).toFixed(2)}px)` : 'none';
    kw.style.transform = `translate(${ox.toFixed(2)}px,${oy.toFixed(2)}px) rotate(${ang}rad) translate(0,${-kwBase}px)`;
  }

  return {
    ready: Promise.resolve(),
    layout() {
      kw.style.display = '';
      kwW = kw.getBoundingClientRect().width;
      const probe = el('span', 'display:inline-block;width:0;height:0;vertical-align:baseline', kw);
      kwBase = probe.offsetTop;
      probe.remove();
      kw.style.display = 'none';
    },
    draw(ctx, t) {
      if (t < T0 || t > T1) { kw.style.display = 'none'; return; }
      drawDots(ctx, t);
      drawLine(ctx, t);
      const P = drawSolid(ctx, t);
      drawReadout(ctx, t);
      drawKeyword(ctx, t, P);
      // marker
      const mp = markerPos(t, P || cubeProj(t));
      if (t < 33.45) drawFigureMarker(ctx, t, mp);
    },
    markerAt: (t) => markerPos(t, cubeProj(t)),
  };
}

// The Arecibo "you" figure shrinks into a white dot that turns into the peach marker.
function drawFigureMarker(ctx, t, [x, y]) {
  const ringK = prog(t, 29.43, 0.09);
  if (t < 29.43) {
    const s = 1 - prog(t, 29.233, 0.1);
    ctx.save();
    const w = lerp(2.6, 3.5 + 2 * s, s), h = lerp(2.6, 5.5 + 2 * s, s);
    ctx.fillStyle = s > 0 ? `rgb(${Math.round(lerp(232, 246, s))},${Math.round(lerp(232, 214, s))},${Math.round(lerp(236, 196, s))})` : '#e8e8ec';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  marker(ctx, x, y, ringK, 1, '#f9bcb8');
  if (ringK < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - ringK;
    ctx.fillStyle = '#e8e8ec';
    ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}
