// Procedural orbit rosette. One comet circles the centre on a precessing orbit, r = p / (1 - e cos psi), whose
// apoapsis moves on by ~216 deg per pass (five petals every three turns). Before the shot its petals shrink pass
// by pass; during the shot they only wobble in size. Everything it has flown stays drawn as a thin line. The
// trail is repeated by a growing set of mirror and rotated copies (1, 2, 4, then 8), the whole lattice turns
// slowly clockwise and swells a little on every beat.
import { canvasScale } from '../../../engine/hidpi.js';

const CX = 1219.5, CY = 629.5;
const D2R = Math.PI / 180;
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

// One entry per pass of the comet, oldest first: apoapsis direction (deg, unwrapped, counter-clockwise in the
// lattice frame) and apoapsis radius. PERI[i] is the periapsis radius just before pass i (one entry more).
const APO = [-3877.25, -3660.55, -3444.15, -3227.95, -3011.5, -2794.5, -2578.05, -2361.9, -2145.3, -1928.75,
  -1711.75, -1495.3, -1279.4, -1062.8, -846.25, -629, -411.3, -194.15, 21.05, 239.63, 451.24, 672.12,
  886.13, 1101.98, 1320.81, 1523.17, 1737.66, 1947.73, 2152.34, 2359];
const QA = [330, 325.5, 320, 311, 302, 296, 292.5, 287, 278.5, 270.5, 265.5, 262.5, 257.5, 250, 243, 239, 237.5,
  236, 225, 223.5, 229.5, 242.2, 233.1, 226.7, 227.3, 233.6, 228.7, 231.7, 229.5, 231];
const PERI = [82, 84, 86, 84, 81, 81, 82, 83, 82, 79, 79, 80, 79, 79, 76, 76, 80, 81, 78, 77, 81, 85, 85, 81, 80,
  81, 84, 86, 87, 85, 86];
// The last few pixels before periapsis round off a little wider than the conic: [extra radius, fall-off].
const PERI_LIFT = [5, 6];
// Song times at which the comet passes the apoapsis of pass FIRST_TIMED + i, and the periapsis that follows it;
// earlier passes repeat PERIOD.
const FIRST_TIMED = 18;
const T_APO = [99.367, 99.741, 100.089, 100.474, 100.837, 101.208, 101.587, 101.944, 102.361, 102.765, 103.124, 103.508];
const T_PERI = [99.548, 99.913, 100.286, 100.651, 101.016, 101.385, 101.768, 102.163, 102.547, 102.929, 103.318];
const PERIOD = 0.365;
// Angular speed falls off as r^-1.5: fast through periapsis, slow round the far end of each petal.
const SPEED_EXP = 1.5;

// Copies of the trail: [mirror about the lattice's vertical axis, extra rotation (deg), time it fades in].
const COPIES = [
  [false, 0, -Infinity],
  [true, 0, 99.888],
  [false, 180, 100.803], [true, 180, 100.803],
  [false, 90, 101.728], [true, 90, 101.728], [false, 270, 101.728], [true, 270, 101.728],
];
const COPY_FADE = 0.06;

// Lattice rotation rate (deg/s, counter-clockwise positive) at the knots, linear in between.
const SPIN_T = [99.775, 100.8, 103.25, 103.5], SPIN_W = [0, -7.6, -8.2, 0];
const spinAt = (t) => {
  let s = 0;
  for (let i = 0; i + 1 < SPIN_T.length; i++) {
    const a = SPIN_T[i], b = SPIN_T[i + 1];
    if (t <= a) break;
    const x = Math.min(t, b) - a, w0 = SPIN_W[i], w1 = SPIN_W[i + 1];
    s += x * (w0 + (w1 - w0) * x / (2 * (b - a)));
  }
  if (t > SPIN_T[SPIN_T.length - 1]) s += (t - SPIN_T[SPIN_T.length - 1]) * SPIN_W[SPIN_W.length - 1];
  return s;
};

// From beat 217 on, the lattice swells by 1.3% shortly after every beat and relaxes until the next one.
const PULSE = { beat0: 217, delay: 0.075, rise: 0.09, hold: 0.15, decay: 0.19, amp: 0.0134, base: 0.001 };
const SPB = 60 / 130, BEAT0 = 0.1396;
const scaleAt = (t) => {
  const b = Math.floor((t - BEAT0 - PULSE.delay) / SPB);
  if (b < PULSE.beat0) return 1;
  const tau = t - (BEAT0 + b * SPB + PULSE.delay);
  const rest = b > PULSE.beat0 ? Math.exp(-(SPB - PULSE.hold) / PULSE.decay) : 0;
  const v = tau < PULSE.rise ? rest + (1 - rest) * smooth(tau / PULSE.rise)
    : tau < PULSE.hold ? 1 : Math.exp(-(tau - PULSE.hold) / PULSE.decay);
  return 1 + PULSE.base + PULSE.amp * v;
};

// Line strength over time: each new set of copies dims every line (to roughly 1/sqrt of the number of copies),
// the lines then dim slowly, and the shot's closing fade takes the lattice out.
// [copies appear, line level afterwards, how slowly the level settles]
const STAGES = [[99.883, 0.72, 1], [100.798, 0.58, 1], [101.733, 0.42, 2.2]];
// Share of each drop reached on the following frames (at slow = 1).
const STAGE_EASE = [0, 0.35, 0.5, 0.6, 0.66, 0.7, 0.73, 0.76, 0.78, 0.8, 0.82, 0.84, 0.86, 0.87, 0.88, 0.89,
  0.9, 0.91, 0.92, 0.93, 0.94, 0.95, 0.955, 0.96, 0.965, 0.97, 0.975, 0.98, 0.985, 0.99, 1];
const DRIFT = [[102, 1], [103.27, 0.87]];
const FADE = [[103.25, 1], [103.267, 0.93], [103.3, 0.87], [103.317, 0.68], [103.35, 0.57], [103.367, 0.47],
  [103.383, 0.32], [103.4, 0.25], [103.417, 0.2], [103.433, 0.125], [103.483, 0.09], [103.55, 0.08]];
const table = (tab, x) => {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    const [x0, y0] = tab[i - 1], [x1, y1] = tab[i];
    if (x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
  }
  return tab[tab.length - 1][1];
};
const lineLevel = (t) => {
  let v = 1;
  for (const [t0, l, slow] of STAGES) {
    if (t <= t0) break;
    const f = (t - t0) * 60 / slow;
    const i = Math.floor(f);
    const k = i + 1 < STAGE_EASE.length ? STAGE_EASE[i] + (STAGE_EASE[i + 1] - STAGE_EASE[i]) * (f - i) : 1;
    v += (l - v) * k;
  }
  return v * table(DRIFT, t) * table(FADE, t);
};

// Lines are screened, so where many cross (the ring round the hole) they saturate instead of adding up.
const LINE_BLEND = 'screen';
const LINE_ALPHA = 0.72, LINE_WIDTH = 0.8;
// The stretch flown in the last 0.15 s is wider and much brighter, then fades back to a normal line. It dims
// with the line level as copies are added.
const FRESH = { frames: 36, alpha: 0.9, hold: 0.15, tau: 0.12, width: 1.6 };
const RGB = '235,234,255';
// Soft glow around the ring where every periapsis crowds together: [radius, share of peak] stops and the peak
// strength over time (it grows with the number of copies).
const GLOW_STOPS = [[72, 0], [79, 0.6], [85, 0.45], [92, 1], [100, 0.65], [112, 0.38], [128, 0.18], [150, 0]];
const GLOW = [[99.4, 0.013], [99.9, 0.02], [100.5, 0.04], [100.85, 0.06], [101.0, 0.08], [101.75, 0.085],
  [102.0, 0.11], [102.8, 0.1], [103.25, 0.08]];
// The background under dense lines is darkened (multiplied towards deep blue) in proportion to the local
// line density, measured on a quarter-resolution copy of the lattice.
const FLOOR = { x: 840, y: 280, w: 760, h: 720, s: 0.25, blur: 2, d0: 4, dk: 24, max: 0.15, blue: 178 };

const matrixOf = (ctx) => {
  const m = ctx.getTransform();
  return [m.a, m.b, m.c, m.d, m.e, m.f];
};

export function createRosette() {
  const N = APO.length;
  const peri = [APO[0] - (APO[1] - APO[0]) / 2];
  for (let j = 0; j + 1 < N; j++) peri.push((APO[j] + APO[j + 1]) / 2);
  peri.push(APO[N - 1] + (APO[N - 1] - APO[N - 2]) / 2);

  // r(phi): within pass j the radius runs from the periapsis before it, out to QA[j], and back down to the next one.
  const lobeOf = (phi) => {
    let j = 0;
    while (j + 1 < N && phi >= peri[j + 1]) j++;
    return j;
  };
  const radius = (phi, j = lobeOf(phi)) => {
    const after = phi >= APO[j];
    const span = after ? peri[j + 1] - APO[j] : APO[j] - peri[j];
    const psi = Math.PI * (phi - APO[j]) / span;
    const Q = QA[j], q = after ? PERI[j + 1] : PERI[j];
    const e = (Q - q) / (Q + q), p = 2 * Q * q / (Q + q);
    const r = p / (1 - e * Math.cos(psi));
    return r + PERI_LIFT[0] * Math.exp(-(r - q) / PERI_LIFT[1]);
  };

  // The orbit between two angles as a path in the lattice frame (y down), a point every degree or so.
  const arc = (phiA, phiB) => {
    const path = new Path2D(), n = Math.max(1, Math.ceil(phiB - phiA));
    for (let i = 0; i <= n; i++) {
      const f = phiA + (phiB - phiA) * i / n, r = radius(f);
      path[i ? 'lineTo' : 'moveTo'](r * Math.cos(f * D2R), -r * Math.sin(f * D2R));
    }
    return path;
  };
  // Each pass, periapsis to periapsis.
  const lobes = peri.slice(0, N).map((p, j) => arc(p, peri[j + 1]));

  // phi(t): the time spent per degree grows as r^1.5, normalised so the comet meets the apoapsis and periapsis
  // times of each pass.
  const tApo = APO.map((_, j) => (j < FIRST_TIMED ? T_APO[0] - PERIOD * (FIRST_TIMED - j) : T_APO[j - FIRST_TIMED]));
  const TP = [], TT = [];
  const span = (p0, p1, t0, t1) => {
    const n = 120, w = [];
    for (let i = 0; i <= n; i++) w.push(Math.pow(radius(p0 + (p1 - p0) * i / n), SPEED_EXP));
    let c = 0;
    const cum = [0];
    for (let i = 1; i <= n; i++) cum.push(c += (w[i] + w[i - 1]) / 2);
    for (let i = 0; i < n; i++) { TP.push(p0 + (p1 - p0) * i / n); TT.push(t0 + (t1 - t0) * cum[i] / c); }
  };
  for (let j = 0; j + 1 < N; j++) {
    const k = j - FIRST_TIMED;
    if (k >= 0 && k < T_PERI.length) {
      span(APO[j], peri[j + 1], tApo[j], T_PERI[k]);
      span(peri[j + 1], APO[j + 1], T_PERI[k], tApo[j + 1]);
    } else span(APO[j], APO[j + 1], tApo[j], tApo[j + 1]);
  }
  TP.push(APO[N - 1]); TT.push(tApo[N - 1]);
  const phiAt = (t) => {
    if (t <= TT[0]) return TP[0];
    if (t >= TT[TT.length - 1]) return TP[TP.length - 1];
    let lo = 0, hi = TT.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (TT[m] <= t) lo = m; else hi = m; }
    return TP[lo] + (TP[hi] - TP[lo]) * (t - TT[lo]) / (TT[hi] - TT[lo]);
  };
  // The trail starts at the periapsis before the oldest pass.
  const PHI_START = peri[0];

  // Stage transform of a copy: mirror, rotate by spin + copy rotation, move to the centre.
  const copyMatrix = (c, spin, k) => {
    const a = -(spin + c[1]) * D2R, co = k * Math.cos(a), si = k * Math.sin(a), m = c[0] ? -1 : 1;
    return [co * m, si * m, -si, co, CX, CY];
  };
  const copyAlpha = (c, t) => smooth((t - c[2]) / COPY_FADE);

  // Runs draw(alpha) once per visible copy with the context set to that copy's lattice frame.
  const forCopies = (ctx, t, base, draw) => {
    const spin = spinAt(t), k = scaleAt(t);
    for (const c of COPIES) {
      const a = copyAlpha(c, t);
      if (a <= 0) continue;
      const M = copyMatrix(c, spin, k);
      ctx.setTransform(base[0] * M[0] + base[2] * M[1], base[1] * M[0] + base[3] * M[1],
        base[0] * M[2] + base[2] * M[3], base[1] * M[2] + base[3] * M[3],
        base[0] * M[4] + base[2] * M[5] + base[4], base[1] * M[4] + base[3] * M[5] + base[5]);
      draw(a);
    }
  };

  // The passes already completed are drawn once into a canvas in the lattice frame, which every copy then
  // places with its own transform. The canvas is drawn at the line level rounded up to 1/16 (the rest is applied
  // as globalAlpha), so its content only depends on that level and on how many passes are complete. A pass that
  // completes at an unchanged level is stroked on top, which gives the same pixels as redrawing them all. The
  // canvas has two device pixels per stage pixel so the lines stay crisp after rotation.
  const R_MAX = 345;
  let cache = null, small = null, cacheLevel = -1, cacheDone = 0, SS = 1;
  const completed = (t) => {
    const phiNow = phiAt(t), last = lobeOf(phiNow);
    if (!cache) {
      SS = Math.max(1, 2 / canvasScale());
      cache = document.createElement('canvas');
      cache.width = cache.height = 2 * R_MAX * SS;
      // the same passes at the floor's quarter resolution, added up
      small = document.createElement('canvas');
      small.width = small.height = Math.ceil(2 * R_MAX * FLOOR.s);
    }
    const level = Math.ceil(lineLevel(t) * 16 - 1e-9) / 16;
    const c = cache.getContext('2d'), f = small.getContext('2d');
    if (level !== cacheLevel || last < cacheDone) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, cache.width, cache.height);
      f.setTransform(1, 0, 0, 1, 0, 0);
      f.clearRect(0, 0, small.width, small.height);
      cacheLevel = level; cacheDone = 0;
    }
    if (last > cacheDone) {
      c.setTransform(SS, 0, 0, SS, R_MAX * SS, R_MAX * SS);
      c.globalCompositeOperation = LINE_BLEND;
      c.lineWidth = LINE_WIDTH;
      c.lineJoin = 'round';
      c.strokeStyle = `rgba(${RGB},${LINE_ALPHA * level})`;
      f.setTransform(FLOOR.s, 0, 0, FLOOR.s, R_MAX * FLOOR.s, R_MAX * FLOOR.s);
      f.globalCompositeOperation = 'lighter';
      f.lineWidth = LINE_WIDTH;
      f.strokeStyle = c.strokeStyle;
      for (let j = cacheDone; j < last; j++) { c.stroke(lobes[j]); f.stroke(lobes[j]); }
      cacheDone = last;
    }
    const partial = phiNow < peri[last + 1] ? arc(peri[last], phiNow) : lobes[last];
    return { gain: level > 0 ? lineLevel(t) / level : 0, partial };
  };

  // Draws every pass flown by time t, once per visible copy.
  const drawTrail = (ctx, t, base, blend, style, img) => {
    const { gain, partial } = completed(t);
    forCopies(ctx, t, base, (a) => {
      ctx.globalCompositeOperation = blend;
      ctx.globalAlpha = a * gain;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img(), -R_MAX, -R_MAX, 2 * R_MAX, 2 * R_MAX);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = style(a);
      ctx.stroke(partial);
    });
  };

  let floorCv = null, floorBlur = null;
  const floorCanvas = () => {
    if (!floorCv) {
      const w = Math.round(FLOOR.w * FLOOR.s), h = Math.round(FLOOR.h * FLOOR.s);
      floorCv = document.createElement('canvas'); floorCv.width = w; floorCv.height = h;
      floorBlur = document.createElement('canvas'); floorBlur.width = w; floorBlur.height = h;
    }
    return [floorCv, floorBlur];
  };

  return {
    // Darken the background under the lattice (multiply, so it stays relative to the fading background).
    floor(ctx, t) {
      const [cv, bl] = floorCanvas();
      const f = cv.getContext('2d');
      f.setTransform(1, 0, 0, 1, 0, 0);
      f.clearRect(0, 0, cv.width, cv.height);
      f.lineWidth = LINE_WIDTH;
      const lvl = LINE_ALPHA * lineLevel(t);
      const toFloor = [FLOOR.s, 0, 0, FLOOR.s, -FLOOR.x * FLOOR.s, -FLOOR.y * FLOOR.s];
      drawTrail(f, t, toFloor, 'lighter', (a) => `rgba(${RGB},${lvl * a})`, () => small);
      const b = bl.getContext('2d', { willReadFrequently: true });
      b.setTransform(1, 0, 0, 1, 0, 0);
      b.clearRect(0, 0, bl.width, bl.height);
      b.filter = `blur(${FLOOR.blur}px)`;
      b.drawImage(cv, 0, 0);
      b.filter = 'none';
      const img = b.getImageData(0, 0, bl.width, bl.height), p = img.data;
      for (let i = 0; i < p.length; i += 4) {
        const dens = p[i + 3] / 255 * 235;   // blurred line brightness, grey levels
        const dark = Math.min(1, Math.max(0, (dens - FLOOR.d0) / FLOOR.dk)) * FLOOR.max;
        p[i] = 0; p[i + 1] = 0; p[i + 2] = FLOOR.blue; p[i + 3] = Math.round(dark * 255);
      }
      b.putImageData(img, 0, 0);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(bl, FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
      ctx.restore();
    },
    lines(ctx, t) {
      ctx.save();
      ctx.globalCompositeOperation = LINE_BLEND;
      ctx.lineWidth = LINE_WIDTH;
      ctx.lineJoin = 'round';
      const lvl = LINE_ALPHA * lineLevel(t), base = matrixOf(ctx);
      drawTrail(ctx, t, base, LINE_BLEND, (a) => `rgba(${RGB},${lvl * a})`, () => cache);
      const freshA = FRESH.alpha * lineLevel(t), segs = [];
      for (let i = 0; i < FRESH.frames; i++) {
        const p1 = Math.max(phiAt(t - i / 60), PHI_START), p0 = Math.max(phiAt(t - (i + 1) / 60), PHI_START);
        const age = (i + 0.5) / 60;
        if (p1 > p0) segs.push([arc(p0, p1), freshA * Math.exp(-Math.max(0, age - FRESH.hold) / FRESH.tau)]);
      }
      const glow = table(GLOW, t) * table(FADE, t);
      if (glow > 0) {
        const r0 = GLOW_STOPS[0][0], r1 = GLOW_STOPS[GLOW_STOPS.length - 1][0], k = scaleAt(t);
        const g = ctx.createRadialGradient(0, 0, r0, 0, 0, r1);
        for (const [r, s] of GLOW_STOPS) g.addColorStop((r - r0) / (r1 - r0), `rgba(${RGB},${glow * s})`);
        ctx.setTransform(base[0] * k, base[1] * k, base[2] * k, base[3] * k,
          base[0] * CX + base[2] * CY + base[4], base[1] * CX + base[3] * CY + base[5]);
        ctx.fillStyle = g;
        ctx.fillRect(-r1, -r1, 2 * r1, 2 * r1);
      }
      forCopies(ctx, t, base, (a) => {
        ctx.globalCompositeOperation = LINE_BLEND;
        ctx.lineWidth = FRESH.width;
        for (const [path, alpha] of segs) { ctx.strokeStyle = `rgba(${RGB},${alpha * a})`; ctx.stroke(path); }
      });
      ctx.restore();
    },
    // Comet heads: a small soft glow on every copy.
    heads(ctx, t) {
      if (t > 103.37) return;   // gone half way through the closing fade
      const phi = Math.max(phiAt(t), PHI_START), r = radius(phi);
      const a = table(FADE, t) * (0.55 + 0.4 * smooth((r - 90) / 110));
      const hx = r * Math.cos(phi * D2R), hy = -r * Math.sin(phi * D2R);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      forCopies(ctx, t, matrixOf(ctx), (ca) => {
        ca *= a;
        const grad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 4);
        grad.addColorStop(0, `rgba(255,255,255,${ca})`);
        grad.addColorStop(0.4, `rgba(235,235,255,${0.6 * ca})`);
        grad.addColorStop(1, 'rgba(200,200,255,0)');
        ctx.fillStyle = grad; ctx.fillRect(hx - 4, hy - 4, 8, 8);
      });
      ctx.restore();
    },
  };
}
