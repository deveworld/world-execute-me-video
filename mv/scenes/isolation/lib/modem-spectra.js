// Spectrogram of the V.8 / V.34 handshake tail, drawn per pixel from a model of the signal:
// V.21 FSK lobes for CM and JM, the INFO bursts with their tone and phase-reversal marks,
// the line-probing combs (tones every 150 Hz, four left out), and the training comb and
// pink noise. Each element is a coverage field of one colour; fields are composited with
// "over" into one image of the plot's right half. Texture comes from seeded value noise.

const fy = (f) => 602 - 0.088 * f; // Hz -> y, as in the scene

// Region covered by the image (stage px).
export const REGION = { x0: 1088, y0: 258, x1: 1612, y1: 602 };

// ---------- noise ----------
function hash(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
// Smooth value noise in [0, 1].
function vnoise(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy_ = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy_ = fy_ * fy_ * (3 - 2 * fy_);
  const a = hash(ix, iy, s), b = hash(ix + 1, iy, s), c = hash(ix, iy + 1, s), d = hash(ix + 1, iy + 1, s);
  return a + (b - a) * fx + (c - a) * fy_ + (a - b - c + d) * fx * fy_;
}
// Fractal noise centred on 0, roughly in [-0.5, 0.5]; sx, sy are the feature sizes in px.
function fbm(x, y, sx, sy, s, oct = 3) {
  let v = 0, amp = 0.5, norm = 0, fx = 1 / sx, fy_ = 1 / sy;
  for (let o = 0; o < oct; o++) {
    v += amp * vnoise(x * fx, y * fy_, s + 17 * o);
    norm += amp;
    amp *= 0.5;
    fx *= 2;
    fy_ *= 2;
  }
  return v / norm - 0.5;
}

// ---------- shape helpers ----------
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// Soft step: 0 well below e, 1 well above, width ~ 2*s.
const step = (v, e, s) => 1 / (1 + Math.exp(-(v - e) / s));
// Soft box on [a, b].
const box = (v, a, b, s) => step(v, a, s) * (1 - step(v, b, s));
// Vertical lens (a phase-reversal mark): widest at its centre row, pointed above and below.
function lens(X, Y, cx, cy, hw, hh, amp) {
  const t = Math.abs(Y - cy) / hh;
  if (t >= 1) return 0;
  const w = hw * (1 - 0.55 * t) + 0.3;
  const dx = (X - cx) / w;
  return amp * (1 - t) ** 0.8 * Math.exp(-dx * dx * dx * dx);
}

// ---------- elements ----------

// Line probing: tones every 150 Hz from 150 to 3750 Hz, without 900, 1200, 1800 and 2400.
// The first half of each block is the louder probe, the second half the quieter repeat.
const PROBE_TONES = [];
for (let k = 1; k <= 25; k++) if (![6, 8, 12, 16].includes(k)) PROBE_TONES.push(fy(150 * k));

function probe(x0, xs, x1) {
  const top = 263, bot = 597;
  return {
    box: [x0 - 3, top - 4, x1 + 2, bot + 4],
    // each tone carries a dim skirt, so the omitted tones leave dark gaps
    bg(X, Y) {
      const h = box(X, x0, x1, 0.3) * box(Y, top, bot, 1.2);
      if (h < 0.003) return 0;
      let sk = 0, near = 99;
      for (const y of PROBE_TONES) {
        const d = Math.abs(Y - y);
        if (d < near) near = d;
        if (d < 12) sk += Math.exp(-(((Math.max(d, 2.5) - 2.5) / 4.2) ** 2));
      }
      const loud = 1 - step(X, xs, 0.8);
      // the quieter repeat has a dark ring around each line
      const ring = 1 - 0.75 * (1 - loud) * Math.exp(-(((near - 2.9) / 0.7) ** 2));
      return h * Math.min(1.1, sk) * (0.2 + 0.1 * loud) * ring;
    },
    line(X, Y) {
      let d = 99;
      for (const y of PROBE_TONES) { const e = Math.abs(Y - y); if (e < d) d = e; }
      if (d > 4) return 0;
      const loud = 1 - step(X, xs, 0.8);
      const w = 2.05 + 0.4 * loud;
      return box(X, x0 + 0.3, x1, 0.3) * (0.86 + 0.14 * loud) * Math.exp(-((d / w) ** 6));
    },
  };
}

// Connector between the two probes: a short tone with a phase-reversal mark at each end.
function bowtie(x0, x1, y, hh, core, lenses) {
  return (X, Y) => {
    const dy = Y - y;
    const halo = 0.13 * box(X, x0 - 1, x1 + 1, 0.8) * Math.exp(-((dy / 9) ** 2));
    const line = core * box(X, x0, x1, 0.4) * Math.exp(-((Math.abs(dy) / hh) ** 3));
    let l = 0;
    for (const [cx, hw, lh, a] of lenses) l = Math.max(l, lens(X, Y, cx, y, hw, lh, a));
    return 1 - (1 - halo) * (1 - line) * (1 - l);
  };
}

// INFO burst: a narrow column of FSK energy, about symmetric around its tone. The bit pattern cuts
// notches into it: [offset from the centre, where (0 across, 1 from the left edge, 2 in the middle,
// 3 from the right edge), depth]. The column swells to the right where its tone leaves it.
const NOTCHES_PEACH = [[20, 2, 0.75], [27, 1, 0.85], [12, 1, 0.85], [0, 1, 0.7], [12.5, 3, 0.6]];
const NOTCHES_LAV = [[27, 3, 0.6], [20.5, 3, 0.65], [11, 3, 0.75], [20, 2, 0.35]];
function infoColumn(x0, x1, yc, half, seed, notches, { level = 0.63, swell = 3, capAmp = 0.62, capIn = 2.5, round = 0, soft = 0.9 } = {}) {
  const mid = (x1 - x0) / 2;
  return (X, Y) => {
    const v = Y - yc, av = Math.abs(v);
    const right = x1 + swell * Math.exp(-((v / 8.5) ** 4));
    // the main column with rounded corners, then a gap and a narrower, dimmer cap at each end
    const corner = round * Math.abs((X - x0 - mid) / mid) ** 4;
    const main = box(X, x0, right, 0.55) * box(av, -1, half - 7.5 - corner, soft);
    const cap = capAmp * box(X, x0 + capIn, x1 - capIn, 0.7) * box(av, half - 4.3, half - 0.3, 0.7);
    const body = main + cap;
    if (body < 0.003) return 0;
    const u = X - x0;
    let notch = 0;
    for (const [c, kind, d] of notches) {
      const e = (av - c) / 1.2;
      const g = Math.exp(-e * e);
      if (g < 0.01) continue;
      // edge notches are wedges, deepest at the edge
      const reach = 3.6 * (1 - 0.6 * Math.abs(e));
      const span = kind === 0 ? 1 : kind === 1 ? 1 - step(u, reach, 0.6) : kind === 2 ? box(u, mid - 2.5, mid + 3, 0.8)
        : step(X, right - reach, 0.6);
      notch = Math.max(notch, d * g * span);
    }
    const tex = level + 0.16 * Math.exp(-((v / 10) ** 2)) + 0.5 * fbm(X, Y, 5, 2.6, seed, 2) +
      0.06 * Math.exp(-(((u - mid) / 4) ** 2));
    return body * clamp01(tex * (1 - notch));
  };
}

// A steady tone: a bright core with a darker, more saturated skirt, plus phase-reversal marks.
function toneSkirt(x0, x1, y, amp, width) {
  return (X, Y) => amp * box(X, x0 - 1, x1, 1) * Math.exp(-((Math.abs(Y - y) / width) ** 2.4));
}
function toneLine(x0, x1, y, half, lenses) {
  return (X, Y) => {
    const dy = Y - y;
    const core = 0.97 * box(X, x0, x1, 0.6) * Math.exp(-((Math.abs(dy) / half) ** 6));
    let l = 0;
    for (const [cx, hw, hh, a] of lenses) l = Math.max(l, lens(X, Y, cx, y, hw, hh, a));
    return 1 - (1 - core) * (1 - l);
  };
}

// V.21 FSK lobes (CM, JM): the spectrum of one 29 px frame of the repeating sequence. Every frame shows
// the same pattern: a flat main lobe that is brightest where the frame starts, a first side lobe
// hugging it and a second side lobe further out, both above and below.
const LOBE_P = 29;
// Brighter and darker bands inside the main lobe: [v centre, half height, u from, u to, change].
const LOBE_BANDS = [[-8.5, 2.2, 0, 14, 0.08], [-1, 2.5, 12, 26, 0.08], [-1, 2.5, 0, 9, -0.06],
  [9, 2.4, 0, 14, 0.1], [9, 2.4, 16, 23, -0.08], [4.5, 1.5, 0, 29, -0.04]];
function fskStamp(u, v, seed) {
  // main lobe; each frame starts with a darker seam
  const b = box(v, -16.4, 17.4, 0.75);
  let main = 0;
  if (b > 0.002) {
    const streak = fbm(u, v, 7, 2.6, seed, 2);
    let bands = 0;
    for (const [c, hh, a, b2, d] of LOBE_BANDS) bands += d * Math.exp(-(((v - c) / hh) ** 4)) * box(u, a, b2, 1.2);
    const su = u > LOBE_P / 2 ? u - LOBE_P : u;
    const seam = 0.3 * Math.exp(-(((su + 0.3) / 2.2) ** 2)) * (1 - step(v, 12, 1.5));
    main = b * clamp01(0.83 + bands + 0.32 * streak - seam - 0.18 * box(v, -16.4, -12.5, 0.8));
  }
  // side lobes: a dim band next to the main lobe, then a mound that narrows outwards
  let side = 0;
  for (const sgn of [-1, 1]) {
    const w = sgn * v;
    if (w < 16 || w > 34) continue;
    const bump = fbm(u, w, 3.4, 2, seed + 11 + sgn, 2);
    const band = sgn < 0
      ? (0.19 + 0.09 * box(u, 2, 15, 1.5)) * box(w, 16.8, 23.5, 0.7) * box(u, -2.5, 30, 1)
      : (0.27 - 0.02 * (w - 18)) * box(w, 17, 22.5, 0.7) * box(u, -2, 30, 1);
    const out = Math.max(0, w - (sgn < 0 ? 24 : 22));
    const mound = sgn < 0
      ? 0.4 * box(u, 7.5 + 0.45 * out, 26.5 - 0.35 * out, 1.3) * box(w, 22.3, 29.8 + 1.2 * bump, 0.8)
      : 0.47 * box(u, 5 + 0.25 * out, 23.5 - 0.55 * out, 1.3) * box(w, 22.6, 29.3 + 1.2 * bump, 0.8) *
        (1 + 0.25 * Math.exp(-(((u - 17) / 5) ** 2)));
    const halo = 0.1 * box(u, 8, 25, 1.5) * box(w, 28, 32.5, 0.8);
    side = 1 - (1 - side) * (1 - clamp01((band + mound + halo) * (1 + 0.85 * fbm(u, w, 3.2, 1.5, seed + 21, 2))));
  }
  return 1 - (1 - main) * (1 - side);
}

function fskTrain(xStart, n, xEnd, yc, seed, lead) {
  return (X, Y) => {
    const v = Y - yc;
    const k = Math.floor((X - xStart) / LOBE_P);
    const u = X - xStart - k * LOBE_P;
    let a = 0;
    if (k >= 0 && k < n) a = fskStamp(u, v, seed);
    else if (k >= n && X < xEnd + 3) {
      // the burst ends with a partial frame: main lobe only, its lower half shorter and dimmer
      const right = xEnd - 5.5 * step(v, 1.5, 1);
      const b = box(v, -15, 21.6, 1.1) * (1 - step(X, right, 0.7));
      const seam = 0.2 * Math.exp(-(((u + 1.5) / 1.6) ** 2));
      a = b * clamp01(0.94 - 0.22 * step(v, 2, 1.5) - 0.12 * step(v, 17.5, 1.5) - seam + 0.3 * fbm(u, v, 7, 2.6, seed, 2));
    }
    // the first frame's main lobe leans out to the left, most in its lower half
    if (lead && X < xStart + 2) {
      const g = Math.exp(-(((Y - yc - 8) / 7.5) ** 4));
      const edge = xStart - 1.6 - 4.2 * g, soft = 0.7 + 1.9 * g;
      const e = box(v, -15.8, 17, 0.9) * step(X, edge, soft) * (1 - step(X, xStart + 1, 0.6));
      a = Math.max(a, 0.86 * e);
    }
    return a * (1 - step(X, xEnd, 0.7));
  };
}

// Training: two blocks, each a stretch of evenly spaced lines (the scrambled ones, a line every
// 6.28 px) followed by wideband noise. The lavender block has a marker at each end of its edge.
const TRAIN_P = 6.28, TRAIN_Y = 278.8;
function slotAt(Y) {
  let ph = (((Y - TRAIN_Y) / TRAIN_P) % 1 + 1) % 1 - 0.51;   // the dark gap sits half a period off the lines
  if (ph > 0.5) ph -= 1;
  return Math.exp(-((ph / 0.19) ** 2));
}
// Mottled noise (features ~9 px long and ~4 px tall) crossed by thin, wavy dark streaks.
function streaks(X, Y, seed) {
  const n = fbm(X, Y, 9, 3.8, seed, 3);
  const r = fbm(X, Y, 20, 4.5, seed + 7, 2);
  const m = step(fbm(X, Y, 11, 7, seed + 9, 1), 0.02, 0.06);
  return 0.62 * n - 0.4 * m * Math.exp(-((r / 0.04) ** 2));
}
function lineAt(Y) {
  let ph = (((Y - TRAIN_Y) / TRAIN_P) % 1 + 1) % 1;
  if (ph > 0.5) ph -= 1;
  return Math.exp(-((ph / 0.17) ** 2));
}
// The noise fades in over the first ~10 px and out over the last; the lines of the comb part run
// a little further, and the noise is darker next to both ends.
function trainEnv(X, Y, top, bot, seed, soft = 2.2) {
  const r = 2 * fbm(X, 0, 3, 1, seed, 2);
  return step(Y, top + r, 2.2) * (1 - step(Y, bot - r, soft));
}
function trainRim(Y) {
  return 0.2 * Math.exp(-(((Y - 284) / 8) ** 2)) + 0.17 * Math.exp(-(((Y - 573) / 9) ** 2));
}
function trainingComb(X, Y) {
  const xs = box(X, 1508, 1548.5, 0.6);
  if (xs < 0.003) return 0;
  const comb = box(X, 1509, 1523.5, 1);
  const depth = 0.28 * box(X, 1508.5, 1525.5, 0.8) + 0.3 * box(X, 1513, 1521.5, 0.8);
  const env = trainEnv(X, Y, 272, 585.5, 45);
  let a = xs * env * (0.77 + 0.08 * comb - depth * slotAt(Y) - trainRim(Y) + (1.45 - 0.9 * comb) * streaks(X, Y, 41));
  a = Math.max(a, 0.4 * comb * lineAt(Y) * box(Y, 264.5, 594.5, 0.6));
  // markers at both ends of the block's left edge
  for (const yn of [279, 579.5]) {
    a = Math.max(a, 0.95 * Math.exp(-(((X - 1505.7) / 5.6) ** 4) - (((Y - yn) / 5) ** 4)));
  }
  return clamp01(a);
}

function pinkNoise(X, Y) {
  const xs = box(X, 1548.5, 1606.6, 0.6);
  if (xs < 0.003) return 0;
  const comb = box(X, 1549.5, 1562.5, 0.8);
  const env = trainEnv(X, Y, 274, 587.5, 61, 3.6);
  const a = xs * env * (0.88 + 0.03 * comb - 0.3 * comb * slotAt(Y) - trainRim(Y) + 0.95 * streaks(X, Y, 63));
  return clamp01(Math.max(a, 0.4 * comb * lineAt(Y) * box(Y, 264.5, 594.5, 0.6)));
}
// Where the two blocks meet, a peach marker at each end.
function junction(X, Y) {
  let a = 0;
  for (const yn of [278.5, 579.5]) a = Math.max(a, 0.8 * Math.exp(-(((X - 1549) / 4.5) ** 4) - (((Y - yn) / 5) ** 4)));
  return a;
}
// The noise shifts between pink, peach and lavender.
function pinkColour(X, Y) {
  const t = fbm(X, Y, 10, 5, 71, 2);
  return [212 + 18 * t, 193 + 4 * t, 212 - 20 * t];
}

// ---------- composition ----------
const PEACH = [241, 204, 176];
const LAV = [198, 195, 242];
const LAV_DEEP = [178, 178, 250];

function layers() {
  const pp = probe(1340, 1370.5, 1400.5);
  const pl = probe(1420.5, 1449.5, 1470);
  const yJM = fy(1760), yCM = fy(1090);
  const L = [];
  L.push([pp.box, [232, 150, 110], pp.bg]);
  L.push([pp.box, [195, 168, 154], pp.line]);
  L.push([pl.box, [132, 141, 214], pl.bg]);
  L.push([pl.box, [154, 155, 192], pl.line]);
  L.push([[1396, 376, 1424, 406], PEACH, bowtie(1399.8, 1421.3, 390.6, 2.9, 0.92, [[1403.8, 3.8, 11.5, 0.85], [1416.4, 3.8, 11.5, 0.85]])]);
  L.push([[1398, 481, 1424, 512], LAV, bowtie(1403.6, 1419.1, 496.6, 5.6, 0.8, [[1406.7, 2.6, 11, 0.32], [1414.6, 2.6, 11, 0.32]])]);
  // INFO bursts and their tones
  L.push([[1270, 344, 1300, 438], PEACH, infoColumn(1276.2, 1293, 390.3, 39.8, 101, NOTCHES_PEACH)]);
  L.push([[1268, 452, 1298, 542], LAV, infoColumn(1274.4, 1291.2, 496.5, 38, 103, NOTCHES_LAV)]);
  L.push([[1466, 342, 1500, 440], PEACH, infoColumn(1470.8, 1496, 390.3, 39.8, 105, NOTCHES_PEACH, { swell: 0 })]);
  L.push([[1466, 450, 1508, 542], LAV_DEEP, infoColumn(1470.5, 1487.5, 496.5, 39.5, 107, NOTCHES_LAV, { level: 0.6, swell: 0, capAmp: 0.25, capIn: 0, round: 3, soft: 1.8 })]);
  L.push([[1466, 450, 1508, 542], LAV_DEEP, infoColumn(1487, 1505.5, 496.5, 39.5, 109, NOTCHES_LAV, { level: 0.68, swell: 0, capAmp: 0.25, capIn: 0, round: 3, soft: 1.8 })]);
  L.push([[1286, 376, 1344, 406], [232, 150, 110], toneSkirt(1292, 1341, 390.95, 0.6, 7.1)]);
  L.push([[1286, 370, 1344, 412], PEACH, toneLine(1291, 1341, 390.95, 3.1, [[1317.5, 4, 19, 0.75], [1326, 4, 19, 0.75], [1335.5, 3, 11, 0.42]])]);
  L.push([[1284, 482, 1340, 512], [112, 118, 222], toneSkirt(1291, 1336, 496.5, 0.45, 7.5)]);
  L.push([[1284, 476, 1342, 518], LAV, toneLine(1290, 1336, 496.5, 2.7, [[1322, 4.6, 20, 0.8], [1332.8, 3.5, 12, 0.5]])]);
  // V.8 CM (lavender) and JM (peach)
  L.push([[1094, yCM - 36, 1272, yCM + 36], LAV, fskTrain(1105, 5, 1267.5, yCM, 201, true)]);
  L.push([[1176, yJM - 36, 1272, yJM + 36], PEACH, fskTrain(1185, 3, 1267.5, yJM, 201, true)]);
  // training
  L.push([[1498, 260, 1550, 600], [158, 160, 208], trainingComb]);
  L.push([[1546, 260, 1612, 600], pinkColour, pinkNoise]);
  L.push([[1540, 268, 1558, 590], PEACH, junction]);
  return L;
}

// Separable Gaussian blur of a premultiplied RGBA buffer, for the softness of the rest of the plot.
function blur(acc, W, H, sigma) {
  const r = Math.ceil(2.5 * sigma), wts = [];
  let sum = 0;
  for (let d = -r; d <= r; d++) { const g = Math.exp(-0.5 * (d / sigma) ** 2); wts.push(g); sum += g; }
  for (let d = 0; d < wts.length; d++) wts[d] /= sum;
  const tmp = new Float32Array(acc.length);
  for (const [n, m, sa, sb] of [[W, H, 4, 4 * W], [H, W, 4 * W, 4]]) {
    const src = sa === 4 ? acc : tmp, dst = sa === 4 ? tmp : acc;
    for (let b = 0; b < m; b++) {
      for (let a = 0; a < n; a++) {
        const p = a * sa + b * sb;
        let c0 = 0, c1 = 0, c2 = 0, c3 = 0;
        for (let d = -r; d <= r; d++) {
          const aa = a + d < 0 ? 0 : a + d >= n ? n - 1 : a + d;
          const q = aa * sa + b * sb, g = wts[d + r];
          c0 += src[q] * g; c1 += src[q + 1] * g; c2 += src[q + 2] * g; c3 += src[q + 3] * g;
        }
        dst[p] = c0; dst[p + 1] = c1; dst[p + 2] = c2; dst[p + 3] = c3;
      }
    }
  }
}

// Renders the elements at k device pixels per stage pixel. Returns straight-alpha RGBA bytes for
// the rectangle REGION, (x1 - x0) * k by (y1 - y0) * k pixels.
export function renderSpectra(k = 1) {
  const { x0, y0, x1, y1 } = REGION;
  const W = Math.round((x1 - x0) * k), H = Math.round((y1 - y0) * k);
  const acc = new Float32Array(W * H * 4);
  for (const [bx, col, alpha] of layers()) {
    const i0 = Math.max(0, Math.floor((bx[0] - x0) * k)), i1 = Math.min(W, Math.ceil((bx[2] - x0) * k));
    const j0 = Math.max(0, Math.floor((bx[1] - y0) * k)), j1 = Math.min(H, Math.ceil((bx[3] - y0) * k));
    const fixed = typeof col === 'function' ? null : col;
    for (let j = j0; j < j1; j++) {
      const Y = y0 + (j + 0.5) / k;
      for (let i = i0; i < i1; i++) {
        const X = x0 + (i + 0.5) / k;
        let a = alpha(X, Y);
        if (!(a > 0.002)) continue;
        if (a > 1) a = 1;
        const c = fixed || col(X, Y), p = (j * W + i) * 4, q = 1 - a;
        acc[p] = acc[p] * q + c[0] * a;
        acc[p + 1] = acc[p + 1] * q + c[1] * a;
        acc[p + 2] = acc[p + 2] * q + c[2] * a;
        acc[p + 3] = acc[p + 3] * q + a;
      }
    }
  }
  blur(acc, W, H, 0.55 * k);
  const out = new Uint8ClampedArray(W * H * 4);
  for (let p = 0; p < out.length; p += 4) {
    const a = acc[p + 3];
    if (a <= 0) continue;
    out[p] = acc[p] / a;
    out[p + 1] = acc[p + 1] / a;
    out[p + 2] = acc[p + 2] / a;
    out[p + 3] = a * 255;
  }
  return { ...REGION, w: W, h: H, data: out };
}
