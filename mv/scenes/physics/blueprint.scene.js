// 44.508333–47.725 "Switch my current / To AC, to DC": blueprint of a full-bridge rectifier.
// Canvas 2D. Everything is a pure function of t: the power-on wavefront, flow dots (integrated
// branch currents), scope traces with phosphor fade, diode conduction and the pen-drawn lettering.
import { STROKES } from './blueprint/strokes.js';
import { BLUEPRINT_LABELS, SCOPE_LABELS } from './blueprint/labels.js';
import {
  T_SCENE, P, K, vSrc, clamp, sstep, TL, currents, N, EDGES, DOT_PATHS, DOT_SPACING, DOT_HIDE,
  DIODES, LABELS, SCOPES,
} from './blueprint/circuit.js';

const W = 1920, H = 1080;
const BG = [33, 37, 164];
const COL = {
  unp: 'rgb(136,142,237)',      // circuit before the power-on wave
  pwr: 'rgb(184,191,255)',      // powered wires / components
  head: 'rgb(248,252,255)',     // wavefront head
  label: 'rgb(200,208,255)',
  dot: 'rgb(236,241,255)',
  ink: '#ffffff',
};
const AD = '"Architects Daughter"';

function drawVectorLabel(ctx, groups) {
  for (const [color, paths] of groups) {
    ctx.fillStyle = `rgb(${color.join(',')})`;
    ctx.beginPath();
    for (const path of paths) {
      ctx.moveTo(path[0], path[1]);
      for (let j = 2; j < path.length; j += 2) ctx.lineTo(path[j], path[j + 1]);
      ctx.closePath();
    }
    ctx.fill('evenodd');
  }
}

// ---------------------------------------------------------------- helpers
const lerp = (a, b, k) => a + (b - a) * k;
const mix = (c1, c2, k) => `rgb(${Math.round(lerp(c1[0], c2[0], k))},${Math.round(lerp(c1[1], c2[1], k))},${Math.round(lerp(c1[2], c2[2], k))})`;
const UNP = [136, 142, 237], PWR = [184, 191, 255], HEAD = [248, 252, 255], MIDC = [221, 228, 255];

function polyLen(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}
function pointAt(pts, s) {
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const l = Math.hypot(x1 - x0, y1 - y0);
    if (s <= l || i === pts.length - 1) {
      const u = l > 0 ? clamp(s / l) : 0;
      return [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
    }
    s -= l;
  }
  return pts[pts.length - 1];
}

// ---------------------------------------------------------------- static layers
function drawBackground(ctx) {
  // radial falloff measured on the reference: flat to r=560, then ~-3.3 (blue) per 60 px
  const g = ctx.createRadialGradient(960, 540, 0, 960, 540, 1100);
  g.addColorStop(0, 'rgb(33,37,164)');
  g.addColorStop(0.509, 'rgb(33,37,164)');
  g.addColorStop(0.6, 'rgb(32,36,160.5)');
  g.addColorStop(0.709, 'rgb(32.5,35,157)');
  g.addColorStop(0.818, 'rgb(32,34.5,152.3)');
  g.addColorStop(0.927, 'rgb(30.5,33.5,148)');
  g.addColorStop(1, 'rgb(30,33,146.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Stroke a single grid layer before adding it to the blue paper: crossings have
  // the brighter line's intensity, rather than the sum of two independent strokes.
  const grid = document.createElement('canvas');
  grid.width = W; grid.height = H;
  const gc = grid.getContext('2d');
  gc.lineWidth = 1;
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,66,.06)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 40) { ctx.moveTo(x + .5, 0); ctx.lineTo(x + .5, H); }
  for (let y = 20; y <= H; y += 40) { ctx.moveTo(0, y + .5); ctx.lineTo(W, y + .5); }
  ctx.stroke();
  ctx.restore();
  for (const major of [false, true]) {
    gc.strokeStyle = major ? 'rgb(30,30,34)' : 'rgb(16,16,19)';
    gc.beginPath();
    for (let x = 0; x <= W; x += 40) {
      if (((x - 160) % 200 === 0) !== major) continue;
      gc.moveTo(x + 0.5, 0); gc.lineTo(x + 0.5, H);
    }
    for (let y = 20; y <= H; y += 40) {
      if (((y - 140) % 200 === 0) !== major) continue;
      gc.moveTo(0, y + 0.5); gc.lineTo(W, y + 0.5);
    }
    gc.stroke();
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(grid, 0, 0);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawScopeBox(ctx, s) {
  ctx.save();
  roundRect(ctx, s.x, s.y, s.w, s.h, 6);
  ctx.fillStyle = 'rgb(22,24,110)';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(180,185,255,0.2)';
  ctx.beginPath();
  for (let i = 1; i < 10; i++) { const x = s.x + i * 25 + 0.5; ctx.moveTo(x, s.y); ctx.lineTo(x, s.y + s.h); }
  for (let j = 1; j < 8; j++) { const y = s.y + j * 25 + 0.5; ctx.moveTo(s.x, y); ctx.lineTo(s.x + s.w, y); }
  ctx.stroke();
  const cx = s.x + s.w / 2, cy = s.y + s.h / 2;
  ctx.strokeStyle = 'rgba(180,185,255,0.55)';
  ctx.beginPath(); ctx.moveTo(cx + 0.5, s.y); ctx.lineTo(cx + 0.5, s.y + s.h); ctx.moveTo(s.x, cy + 0.5); ctx.lineTo(s.x + s.w, cy + 0.5); ctx.stroke();
  ctx.strokeStyle = 'rgba(180,185,255,0.32)';
  ctx.beginPath();
  for (let x = s.x + 5; x < s.x + s.w; x += 5) {
    if ((x - s.x) % 25 === 0) continue;
    ctx.moveTo(x + 0.5, cy - 3); ctx.lineTo(x + 0.5, cy + 4);
  }
  for (let y = s.y + 5; y < s.y + s.h; y += 5) {
    if ((y - s.y) % 25 === 0) continue;
    ctx.moveTo(cx - 3, y + 0.5); ctx.lineTo(cx + 4, y + 0.5);
  }
  ctx.stroke();
  ctx.restore();
  roundRect(ctx, s.x, s.y, s.w, s.h, 6);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgb(170,174,250)';
  ctx.stroke();
  drawVectorLabel(ctx, SCOPE_LABELS[s.label]);
  ctx.restore();
}

function drawLabels(ctx) {
  ctx.save();
  ctx.fillStyle = COL.label;
  ctx.textBaseline = 'alphabetic';
  for (const [text, x, y, size] of LABELS) {
    if (BLUEPRINT_LABELS[text]) { drawVectorLabel(ctx, BLUEPRINT_LABELS[text]); continue; }
    ctx.fillStyle = COL.label;
    ctx.font = `${size}px ${AD}`;
    let cx = x;
    for (const ch of text) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width - 0.6; }
  }
  // generator symbol: one period of a sine inside G1
  ctx.strokeStyle = COL.label;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 44; i++) {
    const x = 818 + i, y = 580 - 10.5 * Math.sin((2 * Math.PI * i) / 44);
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function strokePaths(ctx, list, tFrame) {
  // stroke data are skeleton pixel indices: pixel centres sit at +0.5 in canvas space
  ctx.save();
  ctx.translate(0.5, 0.5);
  for (const arr of list) {
    let started = false;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i += 3) {
      const f = arr[i + 2];
      if (f >= 0 && f > tFrame) break;
      if (!started) { ctx.moveTo(arr[i], arr[i + 1]); started = true; } else ctx.lineTo(arr[i], arr[i + 1]);
    }
    if (started) {
      if (arr.length === 3) ctx.lineTo(arr[0] + 0.01, arr[1]);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- scene
export default {
  id: 'physics/blueprint',
  start: 44.5083333333,
  end: 47.725,
  fonts: ['800 26px "JetBrains Mono"'],
  async create(root, env) {
    await env.loadFont('Architects Daughter', '/scenes/physics/fonts/ArchitectsDaughter-Regular.ttf');
    await document.fonts.load(`26px ${AD}`);
    const { canvas, ctx } = env.canvas(root);

    // static layer: background, grid, scopes, labels, white terminal marks
    const stat = document.createElement('canvas');
    stat.width = W; stat.height = H;
    const sctx = stat.getContext('2d');
    drawBackground(sctx);
    drawScopeBox(sctx, SCOPES.in);
    drawScopeBox(sctx, SCOPES.out);
    drawLabels(sctx);

    // ---- power-on wave: Dijkstra arrival times from S1's right contact
    const len = (a, b) => Math.hypot(N[a][0] - N[b][0], N[a][1] - N[b][1]);
    const arrive = { S1R: TL.pulse0 };
    const pending = new Set(Object.keys(N));
    while (true) {
      let best = null;
      for (const k of pending) if (arrive[k] !== undefined && (best === null || arrive[k] < arrive[best])) best = k;
      if (best === null) break;
      pending.delete(best);
      for (const [a, b] of EDGES) {
        const o = a === best ? b : b === best ? a : null;
        if (!o || !pending.has(o)) continue;
        const tt = arrive[best] + len(a, b) / TL.pulseV;
        if (arrive[o] === undefined || tt < arrive[o]) arrive[o] = tt;
      }
    }
    // second wave when S2 closes: S2t -> arm -> S2b -> C1 top plate
    const arriveS2b = TL.s2Close + 80 / TL.pulseV;
    const arriveCt = arriveS2b + 192 / TL.pulseV;
    const wireEdges = EDGES.filter(([a, b]) => !(a === 'S1R' && b === 'S1L') && !(a === 'G1L' && b === 'G1R') && !(a === 'R1t' && b === 'R1b'))
      .map(([a, b]) => ({ a: N[a], b: N[b], ta: arrive[a], tb: arrive[b], L: len(a, b) }));
    const extraEdges = [{ a: N.S2b, b: N.Ct, ta: arriveS2b, tb: arriveCt + 10, L: 192 }];
    const powerAt = (x, y) => {   // arrival time of the wave at an arbitrary point on a wire edge
      let best = Infinity;
      for (const e of wireEdges) {
        const dx = e.b[0] - e.a[0], dy = e.b[1] - e.a[1];
        const u = ((x - e.a[0]) * dx + (y - e.a[1]) * dy) / (e.L * e.L);
        if (u < -0.001 || u > 1.001) continue;
        const px = e.a[0] + dx * u, py = e.a[1] + dy * u;
        if (Math.hypot(px - x, py - y) > 1) continue;
        best = Math.min(best, e.ta + (u * e.L) / TL.pulseV, e.tb + ((1 - u) * e.L) / TL.pulseV);
      }
      return best;
    };
    const tG1 = TL.pulse0 + 120 / TL.pulseV;
    const tR1 = arrive.R1t;
    const diodeT = Object.fromEntries(DIODES.map((d) => {
      const m = [(N[d.a][0] + N[d.b][0]) / 2, (N[d.a][1] + N[d.b][1]) / 2];
      return [d.id, powerAt(m[0], m[1])];
    }));

    // ---- integrated currents (dot displacement), trapezoid at 1/1200 s from 44.5
    const T0 = 44.5, DT = 1 / 1200, NS = Math.ceil((47.8 - T0) / DT) + 1;
    const CUM = { Ib: new Float64Array(NS), Ir: new Float64Array(NS), I14: new Float64Array(NS), I23: new Float64Array(NS), Im: new Float64Array(NS), Ic: new Float64Array(NS) };
    let prev = currents(T0);
    for (let i = 1; i < NS; i++) {
      const c = currents(T0 + i * DT);
      for (const k in CUM) CUM[k][i] = CUM[k][i - 1] + ((c[k] + prev[k]) / 2) * DT * K;
      prev = c;
    }
    const disp = (k, t) => {
      const x = clamp((t - T0) / DT, 0, NS - 1.001), i = Math.floor(x), f = x - i;
      return CUM[k][i] * (1 - f) + CUM[k][i + 1] * f;
    };
    const dotPaths = DOT_PATHS.map((p) => ({ ...p, L: polyLen(p.pts) }));

    // ---- scope helpers
    const vOut = (ts) => (ts < TL.peak ? Math.abs(vSrc(ts)) : 1.0);
    const scopeIn = { s: SCOPES.in, start: TL.inSweep, y: (ts) => 580 - 75 * vSrc(ts), clear: null };
    const scopeOut = { s: SCOPES.out, start: TL.outSweep, y: (ts) => 654 - 137 * vOut(ts), clear: [TL.peak, TL.outClear0, TL.outClear1] };

    // phosphor: fresh beam is white and fades over ~0.35 s onto a dim persistent trace
    const glow = (age) => clamp(1 - Math.pow(Math.max(0, age) / 0.35, 1.3));
    function drawTrace(sc, t) {
      if (t < sc.start) return;
      const { s } = sc;
      const head = (t - sc.start) / P;         // sweeps done
      const hx = (head % 1) * s.w;
      const runs = [[]];
      const oldRuns = [[]];
      const stops = [];
      for (let i = 0; i <= s.w; i++) {
        const u = i / s.w;
        const n = Math.floor(head - u);
        const ts = sc.start + (n + u) * P;
        const valid = ts >= sc.start - 1e-9;
        const old = sc.clear && ts < sc.clear[0];
        const cut = i > 0 && u > hx / s.w && (i - 1) / s.w <= hx / s.w;   // beam wraps here
        if (cut) { runs.push([]); oldRuns.push([]); }
        if (!valid) { runs.push([]); oldRuns.push([]); continue; }
        const p = [s.x + i, sc.y(ts)];
        (old ? oldRuns : runs)[(old ? oldRuns : runs).length - 1].push(p);
        if (old) runs.push([]); else oldRuns.push([]);
        if (i % 5 === 0 || i === s.w) {
          let a = glow(t - ts);
          if (old) a *= 1 - clamp((t - sc.clear[1]) / (sc.clear[2] - sc.clear[1]));
          stops.push([i / s.w, a]);
        }
      }
      const pathOf = (rs) => {
        ctx.beginPath();
        for (const r of rs) {
          if (r.length < 2) continue;
          ctx.moveTo(r[0][0], r[0][1]);
          for (let k = 1; k < r.length; k++) ctx.lineTo(r[k][0], r[k][1]);
        }
      };
      ctx.save();
      ctx.beginPath(); ctx.rect(s.x, s.y, s.w, s.h); ctx.clip();
      ctx.lineCap = 'butt'; ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      // dim persistent trace (single path -> no alpha build-up)
      ctx.strokeStyle = 'rgba(150,156,232,0.82)';
      pathOf(runs); ctx.stroke();
      if (sc.clear) {
        const k = 1 - clamp((t - sc.clear[1]) / (sc.clear[2] - sc.clear[1]));
        if (k > 0) { ctx.strokeStyle = `rgba(150,156,232,${0.82 * k})`; pathOf(oldRuns); ctx.stroke(); }
      }
      // fresh beam: alpha by age via a horizontal gradient
      const g = ctx.createLinearGradient(s.x, 0, s.x + s.w, 0);
      for (const [u, a] of stops) g.addColorStop(u, `rgba(255,255,255,${a})`);
      ctx.strokeStyle = g;
      pathOf(runs); ctx.stroke();
      if (sc.clear) { pathOf(oldRuns); ctx.stroke(); }
      // beam head
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s.x + hx, sc.y(t), 2.7, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // ---- wires with power state, wavefront heads
    function strokeSeg(ax, ay, bx, by, s0, s1, L, color, width = 2) {
      if (s1 <= s0) return;
      const u0 = s0 / L, u1 = s1 / L;
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(ax + (bx - ax) * u0, ay + (by - ay) * u0);
      ctx.lineTo(ax + (bx - ax) * u1, ay + (by - ay) * u1);
      ctx.stroke();
    }
    function drawEdge(e, t) {
      const [ax, ay] = e.a, [bx, by] = e.b, L = e.L;
      ctx.lineCap = 'butt';
      const pa = clamp((t - e.ta) * TL.pulseV, 0, L);         // powered from a
      const pb = clamp((t - e.tb) * TL.pulseV, 0, L);         // powered from b
      // unpowered base
      strokeSeg(ax, ay, bx, by, 0, L, L, COL.unp);
      strokeSeg(ax, ay, bx, by, 0, pa, L, COL.pwr);
      strokeSeg(ax, ay, bx, by, L - pb, L, L, COL.pwr);
      // wave heads from both ends
      for (const [t0, fromA] of [[e.ta, true], [e.tb, false]]) {
        const d = (t - t0) * TL.pulseV;
        if (d <= 0 || d > L + 125) continue;
        const seg = (s0, s1, col) => {
          const lo = clamp(s0, 0, L), hi = clamp(s1, 0, L);
          if (hi <= lo) return;
          if (fromA) strokeSeg(ax, ay, bx, by, lo, hi, L, col, 2.2);
          else strokeSeg(ax, ay, bx, by, L - hi, L - lo, L, col, 2.2);
        };
        // mid zone: fades from MIDC to powered over 70 px
        for (let k = 0; k < 7; k++) {
          const s0 = d - 125 + k * 10, s1 = s0 + 10.5;
          seg(s0, s1, mix(PWR, MIDC, (k + 1) / 7));
        }
        seg(d - 55, d, COL.head);
      }
    }

    function poweredColor(tOn, t) {
      return t >= tOn ? COL.pwr : COL.unp;
    }

    function drawCircuit(t) {
      ctx.save();
      ctx.lineJoin = 'miter';
      for (const e of wireEdges) drawEdge(e, t);
      for (const e of extraEdges) drawEdge(e, t);

      // S1: arm pivots on the left contact, closes with an ease-in at 44.630
      const k1 = clamp((t - T_SCENE) / (TL.s1Close - T_SCENE));
      const a1 = (-TL.s1Angle * (1 - k1 * k1) * Math.PI) / 180;
      ctx.lineCap = 'round';
      ctx.strokeStyle = poweredColor(arrive.S1L, t);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(640, 580); ctx.lineTo(640 + 76 * Math.cos(a1), 580 + 76 * Math.sin(a1)); ctx.stroke();
      // S2: arm pivots on its top contact
      const k2 = clamp((t - TL.s2Start) / (TL.s2Close - TL.s2Start));
      const a2 = (TL.s2Angle * (1 - k2 * k2) * Math.PI) / 180;
      ctx.strokeStyle = poweredColor(arrive.S2t, t);
      ctx.beginPath(); ctx.moveTo(1280, 300); ctx.lineTo(1280 + 76 * Math.sin(a2), 300 + 76 * Math.cos(a2)); ctx.stroke();

      // contacts (open circles)
      const contact = (x, y, tOn) => {
        ctx.fillStyle = `rgb(${BG[0]},${BG[1]},${BG[2]})`;
        ctx.strokeStyle = poweredColor(tOn, t);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      };
      contact(640, 580, arrive.S1L); contact(720, 580, arrive.S1R);
      contact(1280, 300, arrive.S2t); contact(1280, 380, arriveS2b);

      // generator circle
      ctx.strokeStyle = poweredColor(tG1, t);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(840, 580, 40, 0, Math.PI * 2); ctx.stroke();
      // resistor body
      ctx.strokeStyle = poweredColor(tR1, t);
      ctx.strokeRect(1428, 540, 24, 80);
      // capacitor plates (brighten while charging)
      const q = clamp((t - 47.185) / 0.065);
      const plate = (y, tOn) => {
        const base = t >= tOn ? PWR : UNP;
        ctx.strokeStyle = mix(base, [232, 238, 255], q);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(1258, y); ctx.lineTo(1302, y); ctx.stroke();
      };
      plate(572, arriveCt); plate(588, arrive.Cb);

      // nodes
      const node = (k, r) => {
        ctx.fillStyle = poweredColor(arrive[k], t);
        ctx.beginPath(); ctx.arc(N[k][0], N[k][1], r, 0, Math.PI * 2); ctx.fill();
      };
      for (const k of ['L', 'T', 'R', 'B']) node(k, 4.6);
      node('J1', 4); node('J2', 4);

      // diodes
      const v = vSrc(t);
      const en = clamp((t - TL.diodeOn0) / (TL.diodeOn1 - TL.diodeOn0));
      const f = (x) => clamp((x - 0.17) / 0.28);
      let a14, a23;
      if (t < TL.ch0) { a14 = f(v); a23 = f(-v); }
      else if (t < TL.dc) { const up = sstep((t - TL.ch0) / 0.012); a14 = Math.max(f(v), up); a23 = f(-v) * (1 - up); }
      else {
        a14 = Math.exp(-(t - 47.295) / 0.058);
        a23 = t < 47.497 ? 0 : clamp((t - 47.497) / 0.012) * Math.exp(-Math.max(0, t - 47.512) / 0.06);
      }
      for (const d of DIODES) {
        const A = N[d.a], B = N[d.b];
        const ux = (B[0] - A[0]) / 396, uy = (B[1] - A[1]) / 396;
        const nx = -uy, ny = ux;
        const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
        const bx = mx - ux * 15, by = my - uy * 15, px = mx + ux * 15, py = my + uy * 15;
        const fill = en * (d.grp === 14 ? a14 : a23);
        const col = poweredColor(diodeT[d.id], t);
        ctx.beginPath();
        ctx.moveTo(bx + nx * 17.5, by + ny * 17.5); ctx.lineTo(px, py); ctx.lineTo(bx - nx * 17.5, by - ny * 17.5); ctx.closePath();
        if (fill > 0.01) {
          ctx.fillStyle = `rgba(212,220,246,${fill})`;
          ctx.fill();
        }
        ctx.strokeStyle = fill > 0.01 ? mix(t >= diodeT[d.id] ? PWR : UNP, [250, 253, 255], fill) : col;
        ctx.lineWidth = 2;
        ctx.lineJoin = 'miter';
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(px + nx * 17.5, py + ny * 17.5); ctx.lineTo(px - nx * 17.5, py - ny * 17.5); ctx.stroke();
        if (fill > 0.01) {   // wire visible through the fill
          ctx.strokeStyle = `rgba(240,245,255,${0.55 * fill})`;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawDots(t) {
      const vis = clamp((t - TL.dotsOn0) / (TL.dotsOn1 - TL.dotsOn0));
      if (vis <= 0) return;
      ctx.save();
      ctx.fillStyle = COL.dot;
      for (const p of dotPaths) {
        let a = vis;
        if (p.c1) a = clamp((t - (TL.s2Close - 0.002)) / 0.017);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        const off = p.s0 + disp(p.cur, t);
        let s = ((off % DOT_SPACING) + DOT_SPACING) % DOT_SPACING;
        ctx.beginPath();
        for (; s <= p.L; s += DOT_SPACING) {
          const [x, y] = pointAt(p.pts, s);
          if (DOT_HIDE.some(([x0, y0, x1, y1]) => x > x0 && x < x1 && y > y0 && y < y1)) continue;
          ctx.moveTo(x + 2, y); ctx.arc(x, y, 2, 0, Math.PI * 2);
        }
        ctx.fill();
      }
      ctx.restore();
    }

    function drawSpark(t) {
      const age = t - TL.pulse0;
      if (age < 0 || age > 0.1) return;
      const a = 1 - age / 0.1;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 4, r = i % 2 ? 7 : 9.5;
        ctx.moveTo(720 - Math.cos(ang) * r, 580 - Math.sin(ang) * r);
        ctx.lineTo(720 + Math.cos(ang) * r, 580 + Math.sin(ang) * r);
      }
      ctx.stroke();
      ctx.restore();
    }

    function render(t) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(stat, 0, 0);
      drawCircuit(t);
      drawDots(t);
      drawSpark(t);
      drawTrace(scopeIn, t);
      drawTrace(scopeOut, t);
      // terminal marks: lavender labels that light up white when their lyric is written
      ctx.save();
      ctx.lineWidth = 2.0; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const LAV = [200, 208, 255], WHITE = [255, 255, 255];
      ctx.strokeStyle = mix(LAV, WHITE, clamp((t - 46.025) / 0.11));
      strokePaths(ctx, [...STROKES.tildeL, ...STROKES.tildeR], 1e9);
      ctx.strokeStyle = mix(LAV, WHITE, clamp((t - 47.035) / 0.11));
      strokePaths(ctx, [...STROKES.plus, ...STROKES.minus], 1e9);
      ctx.fillStyle = mix(LAV, [242, 246, 255], clamp((t - 47.2) / 0.05));
      ctx.font = `22px ${AD}`;
      ctx.fillText('+', 1238, 568);
      ctx.restore();
      // pen lettering
      const fr = Math.round(t * 60);
      ctx.save();
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 2.0; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      strokePaths(ctx, STROKES.title, fr);
      strokePaths(ctx, STROKES.toac, fr);
      strokePaths(ctx, STROKES.todc, fr);
      ctx.restore();
    }

    return { render };
  },
};
