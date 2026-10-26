// "Fill in my data parameters / INITIALIZATION" (7.333–11.133).
// Superformula editor: six sliders drive a Gielis curve on a polar grid, with log-scale knobs, two
// morphs (radial lerp, and a "pop" through a circle when m changes), the 9.43 s rotation, the
// 1→2→4→8→16 cell division and the 4x4 shape grid.
import { clamp, lerp, ease, oexp, mix, rgb, paperBackground } from './lib/util.js';
import { N, radii, CIRCLE, blend, pop, radiusAt, tracePath } from './lib/sf.js';

const MONO = '"Roboto Mono"';
const UI_FONT = '"Geist Mono"';
const ACCENT = [93, 90, 227];
const BLACK = [0, 0, 0];

// ---------------------------------------------------------------- slider parameters
const ROW_Y = [352, 448, 544, 640, 736, 832];
const TRACK_X0 = 213.5, TRACK_LEN = 360;
const D_PARAM = 1 / 6; // outExpo transition length (10 frames)
const LOGSPAN = Math.log(20 / 0.3);
const posFor = (row, v) => {
  if (row === 0) return TRACK_X0 + (TRACK_LEN * v) / 12;
  if (row >= 4) return TRACK_X0 + (TRACK_LEN * v) / 2;
  return TRACK_X0 + (TRACK_LEN * Math.log(Math.max(v, 0.3) / 0.3)) / LOGSPAN;
};
// [t0, value] keyframes per slider (value lerped linearly with outExpo from the previous value).
// Rows switch from "–" to their value every 1/8 beat from 7.36; the knob starts moving ~8 ms later.
const ACTIVATE = [0, 1, 2, 3, 4, 5].map((i) => 7.36 + i * 0.0577);
const KEYS = [
  [[ACTIVATE[0], 0], [8.0175, 4], [8.35, 6], [9.8992, 8]],
  [[ACTIVATE[1] + 0.008, 2], [8.0175, 12], [8.35, 4.5], [8.5167, 1.0], [8.9733, 0.6]],
  [[ACTIVATE[2] + 0.008, 2], [8.0175, 15], [8.35, 10], [8.6325, 4], [8.7483, 1.7], [9.175, 0.9]],
  [[ACTIVATE[3] + 0.008, 2], [8.0175, 15], [8.35, 10], [8.6325, 4], [8.7483, 1.7], [9.175, 0.9]],
  [[ACTIVATE[4] + 0.008, 1]],
  [[ACTIVATE[5] + 0.008, 1]],
];
// Displayed value: the initial fill shows its target at once; later changes show the live value.
function displayValue(row, t) {
  const keys = KEYS[row];
  if (keys.length < 2 || t < keys[1][0]) return keys[0][1];
  return paramValue(row, t);
}
function paramValue(row, t) {
  const keys = KEYS[row];
  let v = 0;
  for (let i = 0; i < keys.length; i++) {
    const [t0, target] = keys[i];
    if (t < t0) break;
    v = lerp(v, target, oexp(t, t0, D_PARAM));
  }
  return v;
}
// Most recent "hot" change after the first fill, for the knob tint.
function hotAge(row, t) {
  const keys = KEYS[row];
  let age = Infinity;
  for (let i = 1; i < keys.length; i++) if (t >= keys[i][0]) age = t - keys[i][0];
  return age;
}

// ---------------------------------------------------------------- shape states
// Each state: radii, rotation. Transitions: 'lerp' (radial blend) or 'pop' (m changed).
const settled = (u) => 1 - (1 + u) * Math.exp(-u);
const rotation = (t) => 30 * settled(clamp(t - 9.4333, 0, 0.52) / 0.081) / settled(0.52 / 0.081);
const SHAPES = [
  { t0: -1, p: [0, 2, 2, 2], kind: 'lerp' },
  { t0: 8.0175, p: [4, 12, 15, 15], kind: 'pop' },
  { t0: 8.35, p: [6, 4.5, 10, 10], kind: 'pop' },
  { t0: 8.5167, p: [6, 1.0, 10, 10], kind: 'lerp' },
  { t0: 8.6325, p: [6, 1.0, 4, 4], kind: 'lerp' },
  { t0: 8.7483, p: [6, 1.0, 1.7, 1.7], kind: 'lerp' },
  { t0: 8.9733, p: [6, 0.6, 1.7, 1.7], kind: 'lerp' },
  { t0: 9.175, p: [6, 0.6, 0.9, 0.9], kind: 'lerp' },
  { t0: 9.8992, p: [8, 0.6, 0.9, 0.9], kind: 'pop' },
];
for (const s of SHAPES) s.r = s.p[0] === 0 ? CIRCLE : radii(s.p[0], s.p[1], s.p[2], s.p[3]);
const DEG = Math.PI / 180;
const rotOf = (i, t) => (i === 7 ? rotation(t) * DEG : 0);
const scratch = new Float32Array(N), scratch2 = new Float32Array(N);

// Rotation is baked into the radius array so pops between rotated shapes stay correct.
function rotated(r, rot, out) {
  if (!rot) return r;
  for (let i = 0; i < N; i++) out[i] = radiusAt(r, (i / N) * Math.PI * 2, rot);
  return out;
}
function bigShape(t) {
  let i = 0;
  while (i + 1 < SHAPES.length && t >= SHAPES[i + 1].t0) i++;
  const cur = SHAPES[i];
  if (i === 0) return CIRCLE;
  const prev = SHAPES[i - 1];
  const p = oexp(t, cur.t0, D_PARAM);
  const a = rotated(prev.r, rotOf(i - 1, t), scratch2);
  const b = cur.r;
  if (p >= 1) return i === 7 ? rotated(b, rotOf(7, t), scratch) : b;
  if (cur.kind === 'pop') return pop(a, b, p, scratch);
  return blend(a, b, p, scratch);
}

// ---------------------------------------------------------------- heading words
const HEAD = { x: 110.7, base: 214, size: 85 };
const ADV = 52.2;
const WORDS = [
  { text: 'Fill', col: 0, t0: 7.331 },
  { text: 'in', col: 5, t0: 7.94 },
  { text: 'my', col: 8, t0: 8.27 },
  { text: 'data', col: 11, t0: 8.455 },
  { text: 'parameters', col: 16, t0: 9.105 },
];

// ---------------------------------------------------------------- cell division
const SPLIT_T = [10.2597, 10.3751, 10.4905, 10.6059];
const SPLIT_D = 0.108;
const GX = [907.5, 1162.5, 1417.5, 1672.5], GY = [235, 405, 575, 745];
const R_GEN = [330, 204.5, 136.5, 102.5, 68.5];
const center = (gen, idx) => {
  // idx = row*4+col of the final cell; positions per generation
  const r = Math.floor(idx / 4), c = idx % 4;
  const xs = [1312, (GX[0] + GX[1]) / 2, (GX[2] + GX[3]) / 2];
  const cx = gen === 0 ? 1312 : gen < 3 ? xs[1 + (c >> 1)] : GX[c];
  const cy = gen === 0 ? 600 : gen === 1 ? 490 : gen < 4 ? (r < 2 ? 320 : 660) : GY[r];
  return [cx, cy];
};
// copy flag: does this cell become a new copy at generation g?
const isCopyAt = (gen, idx) => {
  const r = Math.floor(idx / 4), c = idx % 4;
  if (gen === 1) return c >= 2;
  if (gen === 2) return r >= 2;
  if (gen === 3) return (c & 1) === 1;
  if (gen === 4) return (r & 1) === 1;
  return false;
};

// Four shape families share the row's rotational symmetry.
const CELL_R = Array.from({ length: 16 }, (_, idx) => {
  const row = Math.floor(idx / 4), col = idx % 4, m = 4 + row * 2;
  const powers = [[1, 4], [[11, 32, 88, 148][row], [11, 16, 24, 26][row]], [0.6, 0.9], [0.6, 0.4]][col];
  const rot = col < 2 ? (row % 2 ? 0 : Math.PI / m) : (row % 2 ? Math.PI / m : 0);
  const base = radii(m, powers[0], powers[1], powers[1]), out = new Float32Array(N);
  for (let i = 0; i < N; i++) out[i] = radiusAt(base, (i / N) * Math.PI * 2, rot);
  return out;
});
const STAR8 = radii(8, 0.6, 0.9, 0.9);
// Low angular harmonics round the corners while each cell passes through a circle.
const SOFT_STAR = Float32Array.from(STAR8, (_, i) => 0.765 + 0.235 * Math.cos(8 * i / N * Math.PI * 2));
const SOFT_CELLS = CELL_R.map((shape, idx) => {
  const row = Math.floor(idx / 4), m = 4 + row * 2, phase = row % 2 ? Math.PI / m : 0;
  const low = Math.min(...shape), mid = (1 + low) / 2, amp = (1 - low) / 2;
  return Float32Array.from(shape, (_, i) => mid + amp * Math.cos(m * (i / N * Math.PI * 2 - phase)));
});
const MORPH_C0 = 10.806, MORPH_STEP = 0.028;
const MORPH_SETTLE = [0.019, 0.024, 0.029, 0.05];
const cellBuf = new Float32Array(N);
function cellShape(idx, t) {
  const r = Math.floor(idx / 4), c = idx % 4;
  const tc = MORPH_C0 + MORPH_STEP * (r + c);
  if (t < tc) {
    const p = Math.exp((t - tc) / 0.029);
    if (p < 0.025) return STAR8;
    for (let i = 0; i < N; i++) cellBuf[i] = lerp(lerp(STAR8[i], SOFT_STAR[i], Math.min(1, 2 * p)), 1, p);
    return cellBuf;
  }
  const p = 1 - Math.exp(-Math.pow((t - tc) / (c === 3 ? 0.043 : MORPH_SETTLE[c]), c === 3 ? 2 : 1));
  if (p > 0.99) return CELL_R[idx];
  for (let i = 0; i < N; i++) cellBuf[i] = lerp(1, lerp(SOFT_CELLS[idx][i], CELL_R[idx][i], p * p), p);
  return cellBuf;
}

// ---------------------------------------------------------------- "Initialization"
const INIT = { text: 'Initialization', x: 113.7, base: 971.8, size: 151.1, adv: 0.6 * 151.1 + 5.78, t0: 10.085, step: 0.05769 };

export default {
  id: 'intro/params',
  start: 7.33,
  end: 11.13,
  fonts: [`400 85px ${MONO}`, `700 85px ${MONO}`, `800 151px ${UI_FONT}`, `500 30px ${UI_FONT}`],
  async create(root, env) {
    const { W, H } = env;
    const { ctx } = env.canvas(root);
    ctx.textRendering = 'geometricPrecision';
    const bg = paperBackground(W, H, { inner: 245, outer: 222.7, r0: 562, r1: 1100, cx: 960, cy: 541 });
    // ring segments of the polar grid appear in a scattered order while the grid grows
    const segDelay = [];
    for (let ring = 0; ring < 5; ring++) {
      const r = env.rng(77 + ring);
      segDelay.push(Array.from({ length: 24 }, () => r()));
    }

    function word(w, t, extra = {}) {
      const k = t - w.t0;
      if (k < 0) return;
      const alpha = ease.outQuad(clamp(k / 0.083));
      const off = 26 * (1 - oexp(t, w.t0, 0.324));
      const clipBottom = HEAD.base + 22 * ease.outQuad(clamp(k / 0.083));
      const x = HEAD.x + w.col * ADV;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - 20, 0, 60 * w.text.length + 40, clipBottom);
      ctx.clip();
      ctx.globalAlpha *= alpha * (extra.alpha ?? 1);
      ctx.font = `${extra.weight ?? 400} ${HEAD.size}px ${MONO}`;
      ctx.fillStyle = rgb(extra.color ?? [2, 2, 4]);
      [...w.text].forEach((ch, i) => ctx.fillText(ch, x + i * ADV, HEAD.base + off));
      ctx.restore();
    }

    function drawHeading(t) {
      const fade = 1 - clamp((t - 10.147) / 0.105);
      if (fade <= 0) return;
      ctx.save();
      ctx.globalAlpha = fade;
      for (const w of WORDS) {
        if (w.text !== 'data') { word(w, t); continue; }
        // "data": regular → bold lavender (8.52–8.58) → back to near-black (9.03–9.35)
        const toBold = ease.inOutQuad(clamp((t - 8.517) / 0.066));
        const toDark = ease.inOutQuad(clamp((t - 9.03) / 0.32));
        const col = mix(mix([2, 2, 4], ACCENT, toBold), [4, 3, 11], toDark);
        word(w, t, { weight: Math.round(400 + 300 * toBold), color: col });
      }
      ctx.restore();
    }

    function rowAlpha(row, t) {
      // rows fade out bottom-up around 10.1–10.33
      const start = 10.102 + (5 - row) * 0.0285;
      return 1 - clamp((t - start) / 0.085);
    }

    function drawSliders(t) {
      for (let row = 0; row < 6; row++) {
        const a = rowAlpha(row, t);
        if (a <= 0) continue;
        const y = ROW_Y[row];
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#000';
        ctx.textAlign = 'left';
        ctx.font = `400 30px ${MONO}`;
        ctx.fillText(['m', 'n', 'n', 'n', 'a', 'b'][row], 113.5, y + 9);
        if (row > 0 && row < 4) {
          ctx.font = `400 17px ${MONO}`;
          ctx.fillText(String(row), 132, y + 15);
        }
        // track
        ctx.fillStyle = 'rgb(185,185,185)';
        ctx.fillRect(TRACK_X0, y, TRACK_LEN, 1);
        const act = ACTIVATE[row];
        const on = t >= act;
        const v = paramValue(row, t);
        const kx = posFor(row, v);
        if (t >= KEYS[row][0][0]) {
          ctx.fillStyle = '#000';
          ctx.fillRect(TRACK_X0, y - 0.45, kx - TRACK_X0, 1.9);
          // knob
          const ks = oexp(t, KEYS[row][0][0], 0.06);
          const age = hotAge(row, t);
          const hot = age === Infinity ? 0 : Math.exp(-age / 0.45);
          const ring = [66 * Math.exp(-age / 0.3), 58 * Math.exp(-age / 0.3), 140 * Math.exp(-age / 0.55)];
          ctx.beginPath();
          ctx.arc(kx, y + 0.5, 7.2 * ks, 0, Math.PI * 2);
          ctx.fillStyle = 'rgb(244,243,248)';
          ctx.fill();
          ctx.lineWidth = 1.8;
          ctx.strokeStyle = hot > 0 ? rgb(ring) : '#000';
          ctx.stroke();
        }
        // value text (right aligned at 720)
        ctx.fillStyle = '#000';
        ctx.font = `500 30px ${UI_FONT}`;
        ctx.textAlign = 'right';
        if (!on) {
          ctx.fillText('–', 720, y + 8.6);
        } else {
          ctx.globalAlpha = a * (0.55 + 0.45 * clamp((t - act) / 0.1));
          const dv = displayValue(row, t);
          const txt = row === 0 ? String(Math.round(dv)) : dv.toFixed(2);
          ctx.fillText(txt, 720, y + 8.6);
        }
        ctx.restore();
      }
    }

    function drawPolarGrid(t) {
      const grow = oexp(t, 7.597, 0.333);
      const fade = 1 - clamp((t - 10.15) / 0.13);
      if (grow <= 0 || fade <= 0) return;
      const cx = 1312, cy = 600, R = 330 * grow;
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = 'rgba(0,0,0,0.095)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy - Math.sin(a) * R);
      }
      ctx.stroke();
      // rings: arcs pop in at scattered times while the grid grows (done by ~7.82)
      for (let ring = 1; ring <= 5; ring++) {
        const rr = (R * ring) / 5;
        ctx.beginPath();
        for (let s = 0; s < 24; s++) {
          const appear = 7.6 + segDelay[ring - 1][s] * 0.2 * (0.5 + ring / 10);
          if (t < appear) continue;
          const a0 = (s / 24) * Math.PI * 2, a1 = ((s + 1) / 24) * Math.PI * 2;
          ctx.moveTo(cx + Math.cos(a0) * rr, cy - Math.sin(a0) * rr);
          ctx.arc(cx, cy, rr, -a0, -a1, true);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    function curveColor(t) {
      if (t < 8.517) return BLACK;
      const up = clamp((t - 8.517) / 0.033);
      const dt = Math.max(0, t - 8.55);
      return [42 * up * Math.exp(-dt / 0.12), 35 * up * Math.exp(-dt / 0.12), 100 * up * Math.exp(-dt / 0.2)];
    }

    const CX = 1312, CY = 600;
    function drawBigCurve(t) {
      const r = bigShape(t), rot = 0, RR = 330;
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1.7;
      ctx.strokeStyle = rgb(curveColor(t));
      ctx.beginPath();
      tracePath(ctx, r, CX, CY, RR, rot);
      ctx.stroke();
      // the travelling dot
      const dotA = 1 - clamp((t - 10.04) / 0.03);
      if (dotA > 0) {
        const th = 0.9 * (t - 7.3333);
        const rr = radiusAt(r, th, rot) * RR;
        ctx.globalAlpha = dotA;
        ctx.fillStyle = 'rgb(97,83,240)';
        ctx.beginPath();
        ctx.arc(CX + Math.cos(th) * rr, CY - Math.sin(th) * rr, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // cell division + grid
    function drawCells(t) {
      let gen = 0;
      while (gen < 4 && t >= SPLIT_T[gen]) gen++;
      // which cells exist at this generation: representative cell indices
      const reps = new Set();
      for (let idx = 0; idx < 16; idx++) {
        const r = Math.floor(idx / 4), c = idx % 4;
        // map to the representative of its group at this generation
        const rc = gen >= 4 ? r : gen >= 2 ? (r < 2 ? 0 : 2) : 0;
        const cc = gen >= 3 ? c : gen >= 1 ? (c < 2 ? 0 : 2) : 0;
        reps.add(rc * 4 + cc);
      }
      ctx.save();
      ctx.lineJoin = 'round';
      // Thin the strokes during subdivision, then restore the final grid weight.
      ctx.lineWidth = t < 10.5 ? 1.6 : t < 10.8167 ? 1.3 : 1.8;
      for (const idx of reps) {
        const p = gen > 0 ? oexp(t, SPLIT_T[gen - 1], SPLIT_D) : 1;
        // parent position: representative at gen-1
        const [x1, y1] = center(gen, idx);
        let x0 = x1, y0 = y1;
        if (gen > 0) [x0, y0] = center(gen - 1, idx);
        const cx = lerp(x0, x1, p), cy = lerp(y0, y1, p);
        const R = gen > 0 ? lerp(R_GEN[gen - 1], R_GEN[gen], p) : R_GEN[0];
        // colour: newest copies are indigo, fading to black
        let col = BLACK;
        if (gen > 0 && isCopyAt(gen, idx)) {
          const age = t - SPLIT_T[gen - 1];
          const pulse = (0.3 + 0.7 * ease.outQuad(clamp(age / 0.025))) * Math.exp(-age / (gen < 3 ? 0.35 : 0.17))
            * (gen === 4 ? 1 - ease.inOutQuad(clamp((t - 10.78) / 0.10)) : 1);
          col = [62 * pulse, 53 * pulse, 156 * pulse];
        }
        const shape = gen === 4 ? cellShape(idx, t) : STAR8;
        ctx.strokeStyle = rgb(col);
        ctx.beginPath();
        tracePath(ctx, shape, gen === 4 ? cx - .5 : cx, gen === 4 ? cy - .5 : cy, R);
        ctx.stroke();
      }
      // centre marks
      const k = t - 10.812;
      if (k > 0) {
        const rr = 4 + 10 * ease.outCubic(clamp(k / 0.15));
        const ringA = lerp(0.45, 0.1, clamp(k / 0.2));
        const dotR = 3.3 * ease.outCubic(clamp(k / 0.05));
        for (let idx = 0; idx < 16; idx++) {
          const x = GX[idx % 4] - .5, y = GY[Math.floor(idx / 4)] - .5;
          ctx.strokeStyle = `rgba(30,30,60,${ringA})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgb(92,80,218)';
          ctx.beginPath();
          ctx.arc(x, y, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    function drawInit(t) {
      ctx.save();
      ctx.font = `800 ${INIT.size}px ${UI_FONT}`;
      ctx.fillStyle = 'rgb(18,17,19)';
      for (let i = 0; i < INIT.text.length; i++) {
        const t0 = INIT.t0 + i * INIT.step;
        if (t < t0) break;
        const p = oexp(t, t0, 1 / 6);
        ctx.globalAlpha = p;
        ctx.fillText(INIT.text[i], INIT.x + i * INIT.adv, INIT.base + 15 * (1 - p));
      }
      ctx.restore();
    }

    return {
      render(t) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.drawImage(bg, 0, 0);
        drawPolarGrid(t);
        if (t < SPLIT_T[0]) drawBigCurve(t);
        else drawCells(t);
        drawSliders(t);
        drawHeading(t);
        drawInit(t);
      },
    };
  },
};
