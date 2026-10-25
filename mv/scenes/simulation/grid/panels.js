// The 24 mini simulations of the "2 Simulations" figure (59.30–62.93).
// Every panel works in local coordinates (0..216 × 0..180) and is a pure function of time:
// heavy state (fractals, cellular automata, particle systems) is precomputed in setup().
import { rng as makeRng } from '../../../engine/lib/anim.js';
import { ANT_FRAME0, ANT_STEPS, ANT_HEADS } from './ant.js';
import { LLOYD_SITES } from './lloyd.js';
import { BROWNIAN_FRAME0, BROWNIAN_HEADS, BROWNIAN_ANCHORS } from './brownian.js';
import { DLA_EDGES } from './dla.js';
import { PANEL_PHASES } from './phase-observations.js';
import { TREE } from './tree.js';

export const PW = 216, PH = 180;
export const ACCENT = 'rgb(98,86,232)';
export const INK = '#1e1e1e';
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const phaseAt=t=>PANEL_PHASES[clamp(Math.round(t*60)-PANEL_PHASES[0][0],0,PANEL_PHASES.length-1)];

// "beat events": level changes, ring emissions, tree generations…
export const BEATS = [59.755, 60.217, 60.683, 61.133, 61.600, 62.067, 62.517, 62.978];

function dot(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}
function hatch(ctx, x0, x1, y, dir = 1, len = 5, step = 6, color = 'rgba(120,120,120,0.9)') {
  ctx.beginPath();
  for (let x = x0; x <= x1; x += step) {
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.9, y + dir * len);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}
function line(ctx, x0, y0, x1, y1, color = INK, w = 1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}
// Polyline with alpha fading from the tail (alpha a0) to the head (alpha a1).
function fadingTrail(ctx, pts, rgb, a0, a1, w = 1, segs = 12) {
  const n = pts.length;
  if (n < 2) return;
  ctx.lineWidth = w;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (let s = 0; s < segs; s++) {
    const i0 = Math.floor((s * (n - 1)) / segs), i1 = Math.floor(((s + 1) * (n - 1)) / segs);
    if (i1 <= i0) continue;
    const a = a0 + (a1 - a0) * ((s + 0.5) / segs);
    ctx.beginPath();
    ctx.moveTo(pts[i0][0], pts[i0][1]);
    for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = `rgba(${rgb},${a})`;
    ctx.stroke();
  }
}

// Marching squares: segments where field f crosses 0 on a (w+1)×(h+1) corner grid with spacing `s`.
function marching(f, w, h, s) {
  const segs = [];
  const at = (i, j) => f[j * (w + 1) + i];
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
      const idx = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (d > 0 ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const x = i * s, y = j * s;
      const top = [x + s * (a / (a - b)), y];
      const right = [x + s, y + s * (b / (b - c))];
      const bottom = [x + s * (d / (d - c)), y + s];
      const left = [x, y + s * (a / (a - d))];
      const add = (p, q) => segs.push(p[0], p[1], q[0], q[1]);
      switch (idx) {
        case 1: case 14: add(left, bottom); break;
        case 2: case 13: add(bottom, right); break;
        case 3: case 12: add(left, right); break;
        case 4: case 11: add(top, right); break;
        case 6: case 9: add(top, bottom); break;
        case 7: case 8: add(left, top); break;
        case 5: add(left, top); add(bottom, right); break;
        case 10: add(top, right); add(left, bottom); break;
      }
    }
  }
  return new Float32Array(segs);
}
function strokeSegs(ctx, segs, color, w) {
  ctx.beginPath();
  for (let k = 0; k < segs.length; k += 4) {
    ctx.moveTo(segs[k], segs[k + 1]);
    ctx.lineTo(segs[k + 2], segs[k + 3]);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

// ───────────────────────────── (a) Mandelbrot set ─────────────────────────────
const mandelbrot = {
  setup() {
    const S = 2, w = PW * S, h = PH * S;
    const scale = 72.4, ox = 15, oy = 90;
    const LEVELS = [1, 2, 3, 4, 6, 9, 13, 19];
    const maxN = 19;
    const fields = LEVELS.map(() => new Float32Array((w + 1) * (h + 1)));
    for (let j = 0; j <= h; j++) {
      for (let i = 0; i <= w; i++) {
        const cr = (i / S - ox) / scale - 2, ci = (j / S - oy) / scale;
        let zr = 0, zi = 0, li = 0;
        for (let n = 1; n <= maxN; n++) {
          const t = zr * zr - zi * zi + cr;
          zi = 2 * zr * zi + ci;
          zr = t;
          let m2 = zr * zr + zi * zi;
          if (m2 > 1e20) { zr = 1e10; zi = 0; m2 = 1e20; }
          if (n === LEVELS[li]) {
            fields[li][j * (w + 1) + i] = Math.log(m2) * 0.5 - Math.LN2; // >0 outside the level set
            li++;
          }
        }
      }
    }
    this.levels = LEVELS;
    this.segs = fields.map((f) => marching(f, w, h, 1 / S));
    // fill: points of the Mandelbrot set (96 iterations, 4×4 supersampled coverage)
    const cv = document.createElement('canvas');
    cv.width = PW; cv.height = PH;
    const cx = cv.getContext('2d');
    const img = cx.createImageData(PW, PH);
    const SS = 4;
    for (let y = 0; y < PH; y++) {
      for (let x = 0; x < PW; x++) {
        let inside = 0;
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const cr = (x + (sx + 0.5) / SS - ox) / scale - 2, ci = (y + (sy + 0.5) / SS - oy) / scale;
            let zr = 0, zi = 0, k = 0;
            // fill the set itself (cardioid, bulbs, mini-brots)
            for (; k < 96; k++) {
              const t = zr * zr - zi * zi + cr;
              zi = 2 * zr * zi + ci;
              zr = t;
              if (zr * zr + zi * zi > 4) break;
            }
            if (k === 96) inside++;
          }
        }
        const o = (y * PW + x) * 4;
        img.data[o] = img.data[o + 1] = img.data[o + 2] = 222;
        img.data[o + 3] = Math.round((inside / (SS * SS)) * 255);
      }
    }
    cx.putImageData(img, 0, 0);
    this.fill = cv;
    // first frame of each new level in the reference; the new contour fades in over ~5 frames
    this.times = [3566, 3585, 3613, 3641, 3668, 3695.5, 3723.5, 3751].map((f) => (f - 0.5) / 60);
  },
  draw(ctx, tau, t) {
    ctx.drawImage(this.fill, 0, 0);
    let cur = -1;
    for (let k = 0; k < this.times.length; k++) if (t >= this.times[k]) cur = k;
    for (let k = 0; k < cur; k++) {
      const age = cur - k; // 1 = most recent
      const a = Math.max(0.28, 0.85 - 0.09 * (age - 1));
      if (age === 1 && t - this.times[cur] < 0.035) {
        // the previous level turns from blue to grey over two frames
        const m = clamp((t - this.times[cur]) / 0.035);
        strokeSegs(ctx, this.segs[k], `rgba(${Math.round(98 - 28 * m)},${Math.round(86 - 16 * m)},${Math.round(232 - 162 * m)},${1 + (a - 1) * m})`, 1.1 - 0.2 * m);
      } else strokeSegs(ctx, this.segs[k], `rgba(70,70,70,${a})`, 0.9);
    }
    if (cur >= 0) {
      const fa = clamp((t - this.times[cur]) / 0.075 + 0.35);
      strokeSegs(ctx, this.segs[cur], `rgba(98,86,232,${fa})`, 1.1);
    }
  },
};

// ───────────────────────────── (b) Bouncing ball ─────────────────────────────
const bouncing = {
  t0: 59.5148, period: 0.461538, apexY: 29.5, g: 4500, vx: 104.06, x0: 51.4, xl: 12, xr: 204.1,
  pos(t) {
    // horizontal: triangle wave between xl and xr
    const span = this.xr - this.xl;
    let d = this.x0 - this.xl + this.vx * (t - this.t0);
    d = ((d % (2 * span)) + 2 * span) % (2 * span);
    const x = d <= span ? this.xl + d : this.xr - (d - span);
    const ph = ((t - this.t0) % this.period + this.period) % this.period;
    const dt = Math.min(ph, this.period - ph);
    const y = this.apexY + 0.5 * this.g * dt * dt;
    return [x, y];
  },
  draw(ctx, tau, t) {
    line(ctx, 0, 158.5, PW, 158.5, INK, 1);
    hatch(ctx, 4, PW + 6, 160, 1, 5, 6.2, 'rgba(110,110,110,0.75)');
    const pts = [];
    const tail = Math.min(0.75, Math.max(0, t - this.t0));
    for (let k = 0; k <= 60; k++) pts.push(this.pos(t - tail + (tail * k) / 60));
    fadingTrail(ctx, pts, '120,120,120', 0.0, 0.9, 0.9);
    const [x, y] = this.pos(t);
    dot(ctx, x, y, 8, ACCENT);
  },
};

// ───────────────────────────── (c) Ripple interference ─────────────────────────────
const ripple = {
  s1: [83.7, 91], s2: [132, 91], v: 42.8, T: 0.4615, first: 59.748,
  draw(ctx, tau, t) {
    const emits = [];
    for (let k = 0; k < 12; k++) {
      const te = this.first + k * this.T;
      if (te <= t) emits.push(te);
    }
    ctx.lineWidth = 0.9;
    for (const te of emits) {
      const r = this.v * (t - te);
      if (r < 0.5) continue;
      const a = clamp(0.92 * Math.exp(-r / 95)); // young rings are dark, older ones fade
      ctx.strokeStyle = `rgba(95,95,95,${a})`;
      for (const s of [this.s1, this.s2]) {
        ctx.beginPath();
        ctx.arc(s[0], s[1], r, 0, TAU);
        ctx.stroke();
      }
    }
    // nodal lines |r1-r2| = (m+1/2)λ, drawn where both fronts have arrived
    const R = emits.length ? this.v * (t - this.first) : 0;
    if (R > 0) {
      const lam = this.v * this.T;
      const cx = (this.s1[0] + this.s2[0]) / 2, cy = this.s1[1];
      const c = (this.s2[0] - this.s1[0]) / 2;
      ctx.strokeStyle = 'rgba(70,58,200,0.95)';
      ctx.lineWidth = 1.1;
      for (const m of [0, 1]) {
        const a = ((m + 0.5) * lam) / 2;
        if (a >= c) continue;
        const b = Math.sqrt(c * c - a * a);
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          let started = false;
          for (let k = -60; k <= 60; k++) {
            const u = (k / 60) * 3.2;
            const x = cx + sx * a * Math.cosh(u), y = cy + b * Math.sinh(u);
            const r1 = Math.hypot(x - this.s1[0], y - this.s1[1]);
            const r2 = Math.hypot(x - this.s2[0], y - this.s2[1]);
            if (r1 <= R && r2 <= R) {
              if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            } else started = false;
          }
          ctx.stroke();
        }
      }
    }
    dot(ctx, this.s1[0], this.s1[1], 2.6, INK);
    dot(ctx, this.s2[0], this.s2[1], 2.6, INK);
  },
};

// ───────────────────────────── (d) Simple pendulum ─────────────────────────────
const pendulum = {
  px: 108.3, py: 19, L: 119, P: 0.92308, tExt: 59.746,
  draw(ctx, tau, t) {
    const th0 = Math.asin(79 / this.L);
    const th = th0 * Math.cos((TAU * (t - this.tExt)) / this.P);
    // dotted guides
    ctx.setLineDash([2, 3]);
    line(ctx, this.px, this.py, this.px, 150, 'rgba(120,120,120,0.7)', 0.8);
    ctx.beginPath();
    ctx.arc(this.px, this.py, this.L, Math.PI / 2 - th0, Math.PI / 2 + th0);
    ctx.strokeStyle = 'rgba(120,120,120,0.7)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.setLineDash([]);
    for (const s of [-1, 1]) {
      const a = s * th0, dx = Math.sin(a), dy = Math.cos(a);
      line(ctx, this.px + dx * (this.L - 5), this.py + dy * (this.L - 5), this.px + dx * (this.L + 5), this.py + dy * (this.L + 5), 'rgba(60,60,60,0.85)', 0.9);
    }
    line(ctx, 86, this.py, 130, this.py, INK, 1.4);
    hatch(ctx, 92, 132, this.py - 1, -1, 5, 5.5, 'rgba(90,90,90,0.8)');
    const bx = this.px + this.L * Math.sin(th), by = this.py + this.L * Math.cos(th);
    line(ctx, this.px, this.py, bx, by, INK, 1.4);
    ctx.beginPath();
    ctx.arc(this.px, this.py, 2.6, 0, TAU);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    dot(ctx, bx, by, 8, ACCENT);
  },
};

// ───────────────────────────── (e) L-system tree ─────────────────────────────
const tree = {
  setup() {
    this.branches = TREE.map(([g, x, y, x2, y2]) => ({ g, x, y, x2, y2 }));
    // generation onsets (each new generation is drawn in blue)
    this.gens = [3592, 3613, 3641, 3668, 3696, 3724, 3751, 3779].map((f) => (f - 0.5) / 60);
    this.widths = [2.4, 2.1, 1.9, 1.6, 1.35, 1.15, 1.0];
  },
  draw(ctx, tau, t) {
    line(ctx, 70, 172.5, 146, 172.5, 'rgba(120,120,120,0.8)', 0.9);
    let cur = -1;
    for (let g = 0; g < this.gens.length; g++) if (t >= this.gens[g]) cur = g;
    ctx.lineCap = 'round';
    for (const b of this.branches) {
      if (b.g > cur) continue;
      let k = 1;
      // each generation grows out with an ease-out over ~8 frames
      if (b.g === cur) { const u = clamp((t - this.gens[cur]) / 0.14); k = 1 - (1 - u) * (1 - u); }
      const x2 = b.x + (b.x2 - b.x) * k, y2 = b.y + (b.y2 - b.y) * k;
      line(ctx, b.x, b.y, x2, y2, b.g === cur ? 'rgba(98,86,232,0.95)' : '#151515', this.widths[b.g] ?? 1);
    }
    ctx.lineCap = 'butt';
  },
};

// ───────────────────────────── (f) Newton's cradle ─────────────────────────────
const cradle = {
  bar: 22, L: 98, r: 9.5, xs: [68, 88, 108, 128, 148], P: 0.9223, t0: 59.983,
  draw(ctx, tau, t) {
    line(ctx, 30, this.bar, 186, this.bar, INK, 2);
    line(ctx, 22, 161.5, 194, 161.5, 'rgba(130,130,130,0.8)', 0.8);
    hatch(ctx, 26, 196, 162, 1, 4.5, 6, 'rgba(130,130,130,0.7)');
    const th0 = (27.2 * Math.PI) / 180, P = this.P;
    const ph = (((t - this.t0) % P) + P) % P;
    let a1 = 0, a5 = 0;
    if (ph < P / 4) a1 = -th0 * Math.cos((TAU * ph) / P);
    else if (ph < (3 * P) / 4) a5 = th0 * Math.sin((TAU * (ph - P / 4)) / P);
    else a1 = -th0 * Math.sin((TAU * (ph - (3 * P) / 4)) / P);
    this.xs.forEach((x0, i) => {
      const a = i === 0 ? a1 : i === 4 ? a5 : 0;
      const observed=phaseAt(t);
      const bx = i===0?observed[1]+.5:i===4?observed[3]+.5:x0;
      const by = i===0?observed[2]+.5:i===4?observed[4]+.5:this.bar+this.L;
      line(ctx, x0, this.bar, bx, by, 'rgba(120,120,120,0.85)', 1);
      ctx.beginPath();
      ctx.arc(bx, by, this.r, 0, TAU);
      if (i === 0) {
        ctx.fillStyle = ACCENT;
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(250,250,250,1)';
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    });
  },
};

// ───────────────────────────── (g) Langton's ant ─────────────────────────────
const langton = {
  setup() {
    const N = 14000, G = 400, C = G / 2;
    const grid = new Uint8Array(G * G);
    let x = C, y = C, d = 0; // d: 0 up, 1 right, 2 down, 3 left
    const visits = new Map();
    const steps = new Int32Array(N + 1 > 0 ? (N + 1) * 2 : 2);
    steps[0] = x; steps[1] = y;
    const flips = []; // [step, cellIndex]
    for (let s = 1; s <= N; s++) {
      const idx = y * G + x;
      if (grid[idx] === 0) d = (d + 1) & 3; else d = (d + 3) & 3;
      grid[idx] ^= 1;
      flips.push(idx);
      if (d === 0) y--; else if (d === 1) x++; else if (d === 2) y++; else x--;
      steps[s * 2] = x; steps[s * 2 + 1] = y;
    }
    this.G = G; this.C = C; this.N = N; this.flips = flips; this.steps = steps;
    this.cache = { n: 0, grid: new Uint8Array(G * G) };
    // Matplotlib's tiny circular markers resolve to this sampled Gaussian coverage kernel.
    const sprite = document.createElement('canvas'); sprite.width = sprite.height = 3;
    const sc = sprite.getContext('2d'), im = sc.createImageData(3,3);
    [38,101,38,101,255,101,38,101,38].forEach((a,i) => im.data[4*i+3] = a);
    sc.putImageData(im,0,0); this.sprite = sprite;
  },
  clock(t) {
    const f = Math.max(0, Math.min(ANT_STEPS.length - 1, t * 60 - ANT_FRAME0));
    const i = Math.floor(f + 1e-7), j = Math.min(i + 1, ANT_STEPS.length - 1), k = f - i;
    return { n: Math.round(ANT_STEPS[i] + (ANT_STEPS[j] - ANT_STEPS[i]) * k),
      x: ANT_HEADS[i][0] + (ANT_HEADS[j][0] - ANT_HEADS[i][0]) * k,
      y: ANT_HEADS[i][1] + (ANT_HEADS[j][1] - ANT_HEADS[i][1]) * k };
  },
  draw(ctx, tau, t) {
    const clock = this.clock(t), n = clock.n;
    const c = this.cache;
    if (n < c.n) { c.grid.fill(0); c.n = 0; }
    for (let s = c.n; s < n; s++) c.grid[this.flips[s]] ^= 1;
    c.n = n;
    const G = this.G, cell = 3;
    // The lattice is 3 px; the initial state is held before the first speed pulse.
    const ox = 122.5, oy = 83.5;
    for (let i = 0; i < G * G; i++) {
      if (!c.grid[i]) continue;
      const gx = i % G, gy = (i / G) | 0;
      const px = ox + (gx - this.C) * cell, py = oy + (gy - this.C) * cell;
      if (px < -4 || px > PW + 4 || py < -4 || py > PH + 4) continue;
      ctx.drawImage(this.sprite, px - 1.5, py - 1.5);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(clock.x - 3, clock.y - 3, 6, 6);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(clock.x - 2.2, clock.y - 2.2, 4.4, 4.4);
  },
};

// ───────────────────────────── (h) Spring–mass ─────────────────────────────
const spring = {
  t0: 60.217, c: 96.5, A: 26.8, gamma: 0.25, P: 0.4615, vp: 66,
  y(t) {
    const dt = t - this.t0;
    return this.c + this.A * Math.exp(-this.gamma * dt) * Math.cos((TAU * dt) / this.P);
  },
  draw(ctx, tau, t) {
    line(ctx, 23, 16, 68, 16, INK, 1.3);
    hatch(ctx, 28, 70, 15, -1, 5, 5.5, 'rgba(90,90,90,0.8)');
    const yb = this.y(t);
    const top = yb - 11;
    // spring zigzag
    ctx.beginPath();
    ctx.moveTo(45.7, 16);
    ctx.lineTo(45.7, 20);
    const nz = 22, y0 = 20, y1 = top - 4;
    for (let k = 1; k <= nz; k++) {
      const yy = y0 + ((y1 - y0) * k) / (nz + 1);
      ctx.lineTo(45.7 + (k % 2 ? -8.5 : 8.5), yy);
    }
    ctx.lineTo(45.7, y1);
    ctx.lineTo(45.7, top);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.fillStyle = ACCENT;
    ctx.fillRect(31.3, top, 29.4, 22);
    // pen + recorder
    line(ctx, 60.7, yb, 71.7, yb, INK, 1);
    dot(ctx, 71.7, yb, 1.7, INK);
    line(ctx, 72, 51, PW, 51, 'rgba(140,140,140,0.8)', 0.8);
    line(ctx, 72, 143, PW, 143, 'rgba(140,140,140,0.8)', 0.8);
    const el = t - this.t0;
    // ticks scroll with the paper (one every 0.4615 s)
    for (let k = 0; k < 10; k++) {
      const x = 72 + this.vp * (el - k * 0.47) + 6;
      if (x < 72 || x > PW) continue;
      line(ctx, x, 143, x, 148, 'rgba(110,110,110,0.9)', 0.9);
    }
    ctx.beginPath();
    const len = Math.min(el, (PW - 72) / this.vp);
    for (let k = 0; k <= 160; k++) {
      const back = (len * k) / 160;
      const x = 71.7 + this.vp * back, y = this.y(t - back);
      if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.stroke();
  },
};

// ───────────────────────────── (i) DLA cluster ─────────────────────────────
const dla = {
  draw(ctx, tau, t) {
    const frame = t * 60;
    ctx.lineWidth = .8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [x0,y0,x1,y1,born] of DLA_EDGES) {
      const age = frame - born;
      if (age < 0) continue;
      const a = 1 - clamp((age - 1) / 7);
      ctx.strokeStyle = `rgb(${Math.round(98*a)},${Math.round(86*a)},${Math.round(232*a)})`;
      const k = clamp(age + 1);
      ctx.beginPath(); ctx.moveTo(x0,y0); ctx.lineTo(x0 + (x1-x0)*k,y0 + (y1-y0)*k); ctx.stroke();
    }
    dot(ctx,108,90,2.1,'#000');
  },
};

// ───────────────────────────── (j) Double pendulum ─────────────────────────────
const dpend = {
  // Unit masses and arms, g = 9.81, 0.0470 simulated seconds per frame, state at frame 3627. On every
  // beat a small blue marker is left where the outer bob is.
  F0: 3627, S0: [2.04405, 2.75102, -0.35040, 0.14083], TAU: 0.047000, SUB: 10,
  px: 107.504, py: 89.488, L1: 39.979, L2: 39.964,
  MARKS: [3641, 3669, 3696, 3724, 3752],
  setup() {
    const g = 9.81;
    const f = ([a1, a2, w1, w2]) => {
      const d = a1 - a2, den = 3 - Math.cos(2 * d);
      const dw1 = (-g * 3 * Math.sin(a1) - g * Math.sin(a1 - 2 * a2) - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / den;
      const dw2 = (2 * Math.sin(d) * (w1 * w1 * 2 + g * 2 * Math.cos(a1) + w2 * w2 * Math.cos(d))) / den;
      return [w1, w2, dw1, dw2];
    };
    const h = this.TAU / this.SUB, n = (3790 - this.F0) * this.SUB;
    let s = this.S0.slice();
    this.hist = [];
    for (let i = 0; i <= n; i++) {
      this.hist.push([s[0], s[1]]);
      const k1 = f(s), k2 = f(s.map((v, j) => v + (h / 2) * k1[j])), k3 = f(s.map((v, j) => v + (h / 2) * k2[j])), k4 = f(s.map((v, j) => v + h * k3[j]));
      s = s.map((v, j) => v + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
    }
  },
  pt(k) {
    const i = Math.max(0, Math.min(this.hist.length - 2, Math.floor(k))), u = Math.max(0, Math.min(1, k - i));
    const a = this.hist[i], b = this.hist[i + 1];
    const a1 = a[0] + (b[0] - a[0]) * u, a2 = a[1] + (b[1] - a[1]) * u;
    const x1 = this.px + this.L1 * Math.sin(a1), y1 = this.py + this.L1 * Math.cos(a1);
    return [x1, y1, x1 + this.L2 * Math.sin(a2), y1 + this.L2 * Math.cos(a2)];
  },
  draw(ctx, tau, t) {
    const k = Math.max(0, (t * 60 - this.F0) * this.SUB);
    const pts = [];
    for (let j = 0; j < k; j += 2) { const p = this.pt(j); pts.push([p[2], p[3]]); }
    const [x1, y1, x2, y2] = this.pt(k);
    pts.push([x2, y2]);
    if (pts.length > 1) fadingTrail(ctx, pts, '90,90,90', 0.12, 0.85, 0.9, 24);
    for (const m of this.MARKS) {
      if (t * 60 < m - 0.5) continue;
      const p = this.pt((m - this.F0) * this.SUB);
      dot(ctx, p[2], p[3], 2, ACCENT);
    }
    line(ctx, this.px, this.py, x1, y1, INK, 1.4);
    line(ctx, x1, y1, x2, y2, INK, 1.4);
    dot(ctx, x1, y1, 4.4, INK);
    dot(ctx, x2, y2, 5.2, INK);
    ctx.beginPath();
    ctx.arc(this.px, this.py, 2.6, 0, TAU);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
  },
};

// ───────────────────────────── (k) Abelian sandpile ─────────────────────────────
const sandpile = {
  // ~600 grains are dropped on the centre on each beat; the avalanche spreads over ~8 frames
  // with the cells that just toppled tinted blue, and the tint clears ~17 frames after the beat.
  // 3 px cells; levels 0..3 drawn white / light grey / grey / dark grey.
  setup() {
    const G = 61, c = 30;
    this.G = G;
    this.beats = [3641, 3669, 3697, 3724, 3752];
    this.clear = [3659, 3686, 3714, 3742, 3769];
    const grains = [725, 650, 785, 640, 790]; // grains dropped on each beat
    const grid = new Int32Array(G * G);
    this.av = [];
    for (let b = 0; b < this.beats.length; b++) {
      grid[c * G + c] += grains[b];
      const last = new Int32Array(G * G).fill(-1);
      const snaps = [Uint8Array.from(grid.map((v) => Math.min(v, 255)))];
      const lasts = [];
      let round = 0;
      const states = [], lastStates = [];
      for (;;) {
        const next = Int32Array.from(grid);
        let any = false;
        for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) {
          const i = y * G + x, v = grid[i];
          if (v < 4) continue;
          const q = v >> 2;
          next[i] -= 4 * q; next[i + 1] += q; next[i - 1] += q; next[i + G] += q; next[i - G] += q;
          last[i] = round; any = true;
        }
        if (!any) break;
        grid.set(next); round++;
        states.push(Uint8Array.from(grid.map((v) => Math.min(v, 255))));
        lastStates.push(Int32Array.from(last));
      }
      // nine displayed sub-steps cover the first ~60 % of the parallel toppling rounds (the active
      // region shows the toppling parity checkerboard in blue); the relaxed pile appears at the clear frame
      const R = Math.max(1, round), steps = [];
      for (let i = 0; i < 9; i++) {
        const r = Math.min(R, Math.max(1, Math.round((0.6 * R * (i + 1)) / 9)));
        steps.push({ g: states[r - 1] || snaps[0], last: lastStates[r - 1] || last, lo: r - 2 });
      }
      steps.push({ g: Uint8Array.from(grid.map((v) => Math.min(v, 255))), last, lo: 1e9 });
      this.av.push(steps);
    }
  },
  draw(ctx, tau, t) {
    const F = t * 60 + 0.5, G = this.G, cell = 3;
    const ox = Math.round(108.3 - (G / 2) * cell), oy = Math.round(91 - (G / 2) * cell);
    const marker = () => {
      ctx.strokeStyle = 'rgba(110,110,110,0.9)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(105.3, 91.5); ctx.lineTo(111.3, 91.5); ctx.moveTo(108.8, 88); ctx.lineTo(108.8, 94); ctx.stroke();
    };
    let b = -1;
    for (let k = 0; k < this.beats.length; k++) if (F >= this.beats[k]) b = k;
    if (b < 0) { marker(); return; }
    const blue = F < this.clear[b];
    const st = this.av[b][blue ? Math.min(8, Math.floor(F - this.beats[b])) : 9];
    const cols = [null, 'rgb(214,214,214)', 'rgb(184,184,184)', 'rgb(84,84,86)'];
    const bcols = [null, 'rgb(133,124,226)', 'rgb(120,110,218)', 'rgb(88,78,182)'];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const k = y * G + x, v = Math.min(3, st.g[k]);
      if (!v) continue;
      const tinted = blue && st.last[k] >= st.lo;
      ctx.fillStyle = tinted ? bcols[v] : cols[v];
      ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
    }
    marker();
  },
};

// ───────────────────────────── (l) Kuramoto model ─────────────────────────────
const kuramoto = {
  setup() {
    const R = makeRng(5), N = 24;
    let th = Array.from({ length: N }, () => R() * TAU);
    const w0 = -TAU / 0.4615; // clockwise, one turn per beat
    const om = Array.from({ length: N }, () => w0 + (R() - 0.5) * 6);
    const K = 9, dt = 1 / 600;
    this.hist = [];
    for (let i = 0; i <= 2.4 * 600; i++) {
      if (i % 5 === 0) this.hist.push(th.slice());
      const dth = th.map((a, j) => {
        let s = 0;
        for (const b of th) s += Math.sin(b - a);
        return om[j] + (K / N) * s;
      });
      th = th.map((a, j) => a + dt * dth[j]);
    }
    this.rate = 120;
  },
  draw(ctx, tau, t) {
    const cx = 108.3, cy = 91.7, r = 61.7;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.strokeStyle = 'rgba(120,120,120,0.85)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    line(ctx, cx, 18.5, cx, 24, 'rgba(60,60,60,0.9)', 1);
    const observed=phaseAt(t),th=observed[5];
    let sx = 0, sy = 0;
    for (const a of th) {
      const x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
      dot(ctx, x, y, 2.8, INK);
      sx += Math.sin(a); sy += Math.cos(a);
    }
    // Merged oscillators show as fewer blobs: fill the gaps inside a cluster so it reads as one
    // continuous thick arc.
    const sorted = th.slice().sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      const a0 = sorted[i - 1], a1 = sorted[i];
      if (a1 - a0 > 0.16) continue;
      for (let k = 1; k < 4; k++) { const a = a0 + ((a1 - a0) * k) / 4; dot(ctx, cx + r * Math.sin(a), cy - r * Math.cos(a), 2.8, INK); }
    }
    sx /= th.length; sy /= th.length;
    const R = Math.hypot(sx, sy), L = R * (r - 8);
    let ex = observed[6][0]+.5, ey = observed[6][1]+.5;
    if (t * 60 >= 3749.5 && R > 0) {
      // the tracked arrow angle ends when the frame turns blue: point it at the cluster
      ex = cx + (L * sx) / R; ey = cy - (L * sy) / R;
    }
    line(ctx, cx, cy, ex, ey, ACCENT, 1.3);
    if (L > 6) {
      const ang = Math.atan2(ey - cy, ex - cx);
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(ang) * 2, ey + Math.sin(ang) * 2);
      ctx.lineTo(ex - Math.cos(ang - 0.45) * 8, ey - Math.sin(ang - 0.45) * 8);
      ctx.lineTo(ex - Math.cos(ang + 0.45) * 8, ey - Math.sin(ang + 0.45) * 8);
      ctx.closePath();
      ctx.fillStyle = ACCENT;
      ctx.fill();
    }
    dot(ctx, cx, cy, 2, INK);
  },
};

// ───────────────────────────── (m) Chladni plate ─────────────────────────────
const chladni = {
  setup() {
    const R = makeRng(3), N = 1300;
    const f = (u, v) => {
      const dmd = Math.abs(u) + Math.abs(v) - 0.97;
      const circ = Math.hypot(u, v) - 0.345;
      const corner = Math.hypot(1 - Math.abs(u), 1 - Math.abs(v)) - 0.31;
      return Math.tanh(dmd * 3) * Math.tanh(circ * 4) * Math.tanh(corner * 4);
    };
    let P = Array.from({ length: N }, () => [R() * 2 - 1, R() * 2 - 1]);
    this.hist = [];
    for (let s = 0; s <= 360; s++) {
      if (s % 4 === 0) this.hist.push(P.map((p) => [p[0], p[1]]));
      P = P.map(([u, v]) => {
        const a = Math.abs(f(u, v));
        const g1 = R() + R() + R() - 1.5, g2 = R() + R() + R() - 1.5;
        let nu = u + g1 * a * 0.09, nv = v + g2 * a * 0.09;
        nu = Math.max(-0.99, Math.min(0.99, nu));
        nv = Math.max(-0.99, Math.min(0.99, nv));
        return [nu, nv];
      });
    }
  },
  draw(ctx, tau, t) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(33.5, 16.5, 150.5, 150);
    // The plate is driven in bursts on the beats (~8 frames each); the sand holds still between.
    const F = t * 60, B = [3668, 3696, 3724, 3751], I = [0, 10, 22, 45, 90];
    let idx = 0;
    for (let b = 0; b < B.length; b++) {
      if (F < B[b] - 0.5) break;
      const u = clamp((F - B[b] + 1) / 8);
      idx = I[b] + (I[b + 1] - I[b]) * (1 - (1 - u) * (1 - u));
    }
    const k = Math.min(this.hist.length - 1, Math.round(idx));
    const P = this.hist[k];
    ctx.fillStyle = 'rgba(35,35,35,0.9)';
    for (const [u, v] of P) ctx.fillRect(108.7 + u * 74.5 - 0.6, 91.5 + v * 74.5 - 0.6, 1.2, 1.2);
    dot(ctx, 108.7, 91.3, 3.4, ACCENT);
  },
};

// ───────────────────────────── (n) Galton board ─────────────────────────────
const galton = {
  setup() {
    const R = makeRng(21);
    this.balls = [];
    const counts = new Array(9).fill(0);
    for (let b = 0; b < 40; b++) {
      const path = [];
      let pos = 0;
      for (let row = 0; row < 8; row++) { const right = R() < 0.5 ? 1 : 0; path.push(right); pos += right; }
      const bin = pos;
      this.balls.push({ t0: 61.10 + b * 0.075 + (R() - 0.5) * 0.02, path, bin, stack: counts[bin]++ });
    }
  },
  pegX(row, j) { return 108.3 + 15 * (j - row / 2); },
  ballPos(b, t) {
    const dtRow = 0.05;
    const el = t - b.t0;
    if (el < 0) return null;
    // funnel -> pegs
    let x = 108.3, y = 14 + el * 140;
    if (y < 23) return [x, y];
    const k = (y - 23) / 10;
    if (k < 8) {
      const row = Math.floor(k), f = k - row;
      let j = 0;
      for (let r = 0; r < row; r++) j += b.path[r];
      const xa = this.pegX(row, j) + 0, xb = this.pegX(row + 1, j + b.path[row]);
      x = xa + (xb - xa) * f;
      const yy = 23 + row * 10 + f * 10 - Math.sin(Math.PI * f) * 3.5;
      return [x, yy];
    }
    void dtRow;
    // fall into the bin
    x = 48.5 + 15 * b.bin;
    const floor = 171 - 2.3 - b.stack * 5.1;
    const yb = 103 + (k - 8) * 10 * 1.6;
    return [x, Math.min(floor, yb)];
  },
  draw(ctx, tau, t) {
    line(ctx, 90.3, 4.3, 103.3, 13.3, INK, 1.1);
    line(ctx, 126.3, 4.3, 113.3, 13.3, INK, 1.1);
    ctx.fillStyle = INK;
    for (let row = 0; row < 8; row++) for (let j = 0; j <= row; j++) ctx.fillRect(this.pegX(row, j) - 0.9, 27.3 + row * 10 - 0.9, 1.8, 1.8);
    for (let k = 0; k < 10; k++) line(ctx, 41.3 + 15 * k, 110, 41.3 + 15 * k, 171, 'rgba(70,70,70,0.9)', 0.9);
    let landed = 0;
    for (const b of this.balls) {
      const p = this.ballPos(b, t);
      if (!p) continue;
      if (p[1] >= 171 - 2.3 - b.stack * 5.1 - 0.01) landed++;
      dot(ctx, p[0], p[1], 2.1, INK);
    }
    void landed;
    // the fitted normal curve rises steadily as the bins fill
    const H = 3 + 30 * clamp((t - 61.15) / 1.75);
    ctx.beginPath();
    for (let x = 40; x <= 177; x += 1) {
      const y = 171 - H * Math.exp(-((x - 108.3) ** 2) / (2 * 22 * 22));
      if (x === 40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(70,58,200,0.95)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  },
};

// ───────────────────────────── (o) Lloyd's algorithm ─────────────────────────────
function voronoiCells(sites) {
  const cells = [];
  for (let i = 0; i < sites.length; i++) {
    let poly = [[0, 0], [PW, 0], [PW, PH], [0, PH]];
    const [xi, yi] = sites[i];
    for (let j = 0; j < sites.length; j++) {
      if (i === j) continue;
      const [xj, yj] = sites[j];
      const nx = xj - xi, ny = yj - yi, mx = (xi + xj) / 2, my = (yi + yj) / 2;
      const out = [];
      for (let k = 0; k < poly.length; k++) {
        const p = poly[k], q = poly[(k + 1) % poly.length];
        const dp = (p[0] - mx) * nx + (p[1] - my) * ny, dq = (q[0] - mx) * nx + (q[1] - my) * ny;
        if (dp <= 0) out.push(p);
        if ((dp <= 0) !== (dq <= 0)) {
          const s = dp / (dp - dq);
          out.push([p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s]);
        }
      }
      poly = out;
    }
    cells.push(poly);
  }
  return cells;
}
function centroid(poly) {
  let a = 0, cx = 0, cy = 0;
  for (let k = 0; k < poly.length; k++) {
    const [x0, y0] = poly[k], [x1, y1] = poly[(k + 1) % poly.length];
    const c = x0 * y1 - x1 * y0;
    a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  a *= 0.5;
  return [cx / (6 * a), cy / (6 * a)];
}
const lloyd = {
  setup() {
    let s = LLOYD_SITES.map(p => p.slice());
    this.iters = [s];
    for (let k = 0; k < 8; k++) {
      s = voronoiCells(s).map(centroid);
      this.iters.push(s);
    }
  },
  draw(ctx, tau, t) {
    // Four visible Lloyd iterations, one pulse per beat; each move uses a quartic ease.
    const starts = [61.09332,61.55435,62.01581,62.47478];
    let k = 0, e = 0;
    for (let j = 0; j < starts.length; j++) {
      if (t < starts[j]) break;
      k = j;
      const u = clamp((t - starts[j]) / 0.3135);
      e = u < 0.5 ? 8 * u ** 4 : 1 - 8 * (1 - u) ** 4;
    }
    const sites = this.iters[k].map((p, i) => [p[0] + (this.iters[k + 1][i][0] - p[0]) * e, p[1] + (this.iters[k + 1][i][1] - p[1]) * e]);
    const cells = voronoiCells(sites);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (const poly of cells) {
      poly.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
    }
    ctx.stroke();
    ctx.fillStyle = 'rgb(28,24,70)';
    for (const [x, y] of sites) {
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, TAU);
      ctx.fill();
    }
    const ca = 1 - clamp((t - 62.62) / 0.15);
    if (ca > 0) {
      ctx.strokeStyle = `rgba(98,86,232,${0.95 * ca})`;
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      for (const poly of cells) {
        const [x, y] = centroid(poly);
        ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3);
      }
      ctx.stroke();
    }
  },
};

// ───────────────────────────── (p) Lorenz attractor ─────────────────────────────
function lorenzPath(n, dt, start = [1, 1, 1], skip = 0) {
  let [x, y, z] = start;
  const out = [];
  const f = (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];
  for (let i = 0; i < n + skip; i++) {
    const k1 = f(x, y, z);
    const k2 = f(x + (dt / 2) * k1[0], y + (dt / 2) * k1[1], z + (dt / 2) * k1[2]);
    const k3 = f(x + (dt / 2) * k2[0], y + (dt / 2) * k2[1], z + (dt / 2) * k2[2]);
    const k4 = f(x + dt * k3[0], y + dt * k3[1], z + dt * k3[2]);
    x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    if (i >= skip) out.push([x, y, z]);
  }
  return out;
}
const lorenz2d = {
  // State at frame 3668, Lorenz time per frame and an x–z projection. The grey attractor is the same orbit run ahead.
  F0: 3668, S0: [0.17258, 1.68945, 21.58063], TPF: 0.028144, SUB: 8,
  PRJ: { cx: 107.479, kx: 3.1590, my: -0.0081, cy: 168.731, kz: 3.1528 },
  setup() {
    const h = this.TPF / this.SUB, n = Math.ceil(20 / h);
    const f = (x, y, z) => [10 * (y - x), x * (28 - z) - y, x * y - (8 / 3) * z];
    let [x, y, z] = this.S0;
    const P = this.PRJ, out = [];
    for (let i = 0; i <= n; i++) {
      out.push([P.cx + P.kx * x + P.my * y, P.cy - P.kz * z]);
      const k1 = f(x, y, z);
      const k2 = f(x + (h / 2) * k1[0], y + (h / 2) * k1[1], z + (h / 2) * k1[2]);
      const k3 = f(x + (h / 2) * k2[0], y + (h / 2) * k2[1], z + (h / 2) * k2[2]);
      const k4 = f(x + h * k3[0], y + h * k3[1], z + h * k3[2]);
      x += (h / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      y += (h / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      z += (h / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    }
    this.proj = out;
  },
  draw(ctx, tau, t) {
    const P = this.proj;
    ctx.beginPath();
    for (let i = 0; i < P.length; i++) (i ? ctx.lineTo(P[i][0], P[i][1]) : ctx.moveTo(P[i][0], P[i][1]));
    ctx.strokeStyle = 'rgba(120,120,120,0.45)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    const fh = Math.max(0, (t * 60 - this.F0) * this.SUB);
    const head = Math.min(P.length - 2, Math.floor(fh)), fr = fh - head;
    const tail = Math.round(0.75 / (this.TPF / this.SUB));
    const pts = P.slice(Math.max(0, head - tail), head + 1);
    const hp = [P[head][0] + (P[head + 1][0] - P[head][0]) * fr, P[head][1] + (P[head + 1][1] - P[head][1]) * fr];
    pts.push(hp);
    if (pts.length > 1) fadingTrail(ctx, pts, '20,20,20', 0.15, 1, 1.4, 10);
    dot(ctx, hp[0], hp[1], 3, ACCENT);
  },
};

// ───────────────────────────── (q) Brownian motion ─────────────────────────────
const brownian = {
  setup() {
    const R = makeRng(13);
    const pts = [BROWNIAN_ANCHORS[0].slice(1)];
    const SUB = 8;
    // A fine Brownian bridge joins the 60 Hz cursor positions; the coarse samples form a separate
    // half-beat polyline.
    const heads = [pts[0], ...BROWNIAN_HEADS];
    for (let i = 0; i < heads.length - 1; i++) {
      const a = heads[i], b = heads[i + 1], walk = [[0,0]];
      for (let j = 1; j <= SUB; j++) walk.push([walk[j-1][0] + (R() - .5) * 6, walk[j-1][1] + (R() - .5) * 6]);
      for (let j = 1; j <= SUB; j++) {
        const u = j / SUB;
        pts.push([a[0] + (b[0] - a[0]) * u + walk[j][0] - walk[SUB][0] * u,
          a[1] + (b[1] - a[1]) * u + walk[j][1] - walk[SUB][1] * u]);
      }
    }
    this.pts = pts; this.sub = SUB;
  },
  draw(ctx, tau, t) {
    const f = clamp(t * 60 - BROWNIAN_FRAME0, 0, BROWNIAN_HEADS.length - 1);
    const i = Math.floor(f + 1e-7), j = Math.min(i + 1, BROWNIAN_HEADS.length - 1), k = f - i;
    const h = [BROWNIAN_HEADS[i][0] + (BROWNIAN_HEADS[j][0] - BROWNIAN_HEADS[i][0]) * k,
      BROWNIAN_HEADS[i][1] + (BROWNIAN_HEADS[j][1] - BROWNIAN_HEADS[i][1]) * k];
    const n = Math.min(this.pts.length - 1, Math.floor((f + 1) * this.sub));
    const from = Math.max(0, n - 36 * this.sub);
    fadingTrail(ctx, this.pts.slice(from, n + 1), '100,100,100', 0.06, 0.62, 0.65, 16);
    const anchors = BROWNIAN_ANCHORS.filter(p => p[0] <= t * 60 + 1e-5);
    ctx.beginPath();
    anchors.forEach((p,i) => i ? ctx.lineTo(p[1],p[2]) : ctx.moveTo(p[1],p[2]));
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.05;
    ctx.stroke();
    for (const p of anchors) dot(ctx, p[1], p[2], 1.65, INK);
    dot(ctx, h[0], h[1], 3.4, ACCENT);
  },
};

// ───────────────────────────── (r) Kepler orbit ─────────────────────────────
const kepler = {
  // period and perihelion time
  cx: 99.8, cy: 90, a: 82.5, b: 60, T: 3.22497, tPeri: 62.51367,
  pos(t) {
    const e = Math.sqrt(1 - (this.b * this.b) / (this.a * this.a));
    const M = (TAU * (t - this.tPeri)) / this.T;
    let E = M;
    for (let k = 0; k < 12; k++) E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    // perihelion on the right (focus at +c); motion counter-clockwise on screen (y up = negative)
    return [this.cx + this.a * Math.cos(E), this.cy - this.b * Math.sin(E)];
  },
  draw(ctx, tau, t) {
    const fx = this.cx + Math.sqrt(this.a * this.a - this.b * this.b), fy = this.cy;
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, this.a, this.b, 0, 0, TAU);
    ctx.strokeStyle = 'rgba(110,110,110,0.85)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    // equal-area sectors swept between beats, alternately shaded; a dark radius marks each beat
    const B = [3696, 3724, 3751, 3779].map((f) => (f - 0.5) / 60), shade = [0.22, 0.07, 0.15];
    for (let k = 0; k < 3; k++) {
      const a = B[k];
      if (t < a) continue;
      const b = Math.min(t, B[k + 1]);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      for (let s = 0; s <= 30; s++) { const p = this.pos(a + ((b - a) * s) / 30); ctx.lineTo(p[0], p[1]); }
      ctx.closePath();
      ctx.fillStyle = `rgba(150,150,150,${shade[k]})`;
      ctx.fill();
    }
    for (let k = 0; k < 3; k++) {
      if (t < B[k]) continue;
      const pa = this.pos(B[k]);
      line(ctx, fx, fy, pa[0], pa[1], 'rgba(60,60,60,0.85)', 0.9);
    }
    const p = this.pos(t);
    dot(ctx, fx, fy, 4.7, INK);
    dot(ctx, p[0], p[1], 3.4, ACCENT);
  },
};

// ───────────────────────────── (s) Figure-eight orbit ─────────────────────────────
const figure8 = {
  setup() {
    // Chenciner–Montgomery choreography, G = m = 1
    let s = [[0.97000436, -0.24308753], [-0.97000436, 0.24308753], [0, 0]];
    let v = [[0.466203685, 0.43236573], [0.466203685, 0.43236573], [-0.93240737, -0.86473146]];
    const T = 6.32591398, n = 4000, dt = T / n;
    const acc = (s) => s.map((p, i) => {
      let ax = 0, ay = 0;
      for (let j = 0; j < 3; j++) {
        if (i === j) continue;
        const dx = s[j][0] - p[0], dy = s[j][1] - p[1], r3 = Math.pow(dx * dx + dy * dy, 1.5);
        ax += dx / r3; ay += dy / r3;
      }
      return [ax, ay];
    });
    this.orbit = [];
    let a = acc(s);
    for (let k = 0; k <= n; k++) {
      this.orbit.push(s[0].slice());
      // velocity Verlet
      s = s.map((p, i) => [p[0] + v[i][0] * dt + 0.5 * a[i][0] * dt * dt, p[1] + v[i][1] * dt + 0.5 * a[i][1] * dt * dt]);
      const a2 = acc(s);
      v = v.map((w, i) => [w[0] + 0.5 * (a[i][0] + a2[i][0]) * dt, w[1] + 0.5 * (a[i][1] + a2[i][1]) * dt]);
      a = a2;
    }
    this.n = n;
  },
  at(u) {
    const n = this.n;
    let f = (((u % 1) + 1) % 1) * n;
    const i = Math.floor(f);
    f -= i;
    const p = this.orbit[i], q = this.orbit[Math.min(n, i + 1)];
    return [108.3 + (p[0] + (q[0] - p[0]) * f) * 88, 90 - (p[1] + (q[1] - p[1]) * f) * 88];
  },
  draw(ctx, tau, t) {
    // phase and period of the blue body
    const Tp = 2.78619, u0 = 0.29631;
    const u = u0 + (t - 61.483) / Tp;
    for (let b = 0; b < 3; b++) {
      const ub = u + b / 3;
      const pts = [];
      const tail = Math.min(0.32, (t - 61.48) / Tp);
      for (let k = 0; k <= 40; k++) pts.push(this.at(ub - tail + (tail * k) / 40));
      fadingTrail(ctx, pts, '30,30,30', 0.0, 0.85, 1, 10);
    }
    line(ctx, 104.8, 90, 111.8, 90, INK, 1);
    line(ctx, 108.3, 86.5, 108.3, 93.5, INK, 1);
    for (let b = 0; b < 3; b++) {
      const p = this.at(u + b / 3);
      dot(ctx, p[0], p[1], b === 0 ? 4.4 : 4, b === 0 ? ACCENT : INK);
    }
  },
};

// ───────────────────────────── (t) Lotka–Volterra ─────────────────────────────
const lotka = {
  setup() {
    // dx = a x - b x y, dy = d x y - c y ; closed orbits around (c/d, a/b)
    const orbit = (x0, y0) => {
      let x = x0, y = y0;
      const pts = [];
      const dt = 0.002;
      for (let i = 0; i < 6000; i++) {
        const fx = (x, y) => [1.0 * x - 1.0 * x * y, 1.0 * x * y - 1.0 * y];
        const k1 = fx(x, y), k2 = fx(x + dt / 2 * k1[0], y + dt / 2 * k1[1]);
        const k3 = fx(x + dt / 2 * k2[0], y + dt / 2 * k2[1]), k4 = fx(x + dt * k3[0], y + dt * k3[1]);
        x += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
        y += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
        pts.push([x, y]);
        if (i > 100 && Math.hypot(x - x0, y - y0) < 0.004) break;
      }
      return pts;
    };
    const map = ([x, y]) => [28.5 + x * 52, 160 - y * 52];
    this.orbits = [0.42, 0.3, 0.22, 0.16].map((s) => orbit(1, s).map(map));
    this.main = this.orbits[2]; // the tracked dot rides the second-largest orbit
  },
  draw(ctx, tau, t) {
    line(ctx, 28.5, 12, 28.5, 160.5, 'rgba(70,70,70,0.9)', 1);
    line(ctx, 28.5, 160.5, 206, 160.5, 'rgba(70,70,70,0.9)', 1);
    this.orbits.forEach((o, k) => {
      if (k === 2) return;
      ctx.beginPath();
      o.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
      ctx.closePath();
      ctx.strokeStyle = 'rgba(140,140,140,0.6)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    });
    const m = this.main, n = m.length;
    // one lap per beat
    const per = 0.46155;
    const u = ((t - 61.60) / per + 0.25354) % 1;
    const head = Math.floor((((u % 1) + 1) % 1) * n);
    const pts = [];
    for (let k = 0; k <= 80; k++) pts.push(m[(head - Math.floor(n * 0.85) + Math.floor((n * 0.85 * k) / 80) + n) % n]);
    fadingTrail(ctx, pts, '20,20,20', 0.25, 1, 1.4, 10);
    line(ctx, 77.5, 107.7, 82.5, 107.7, 'rgba(120,120,120,0.9)', 0.8);
    line(ctx, 80, 105.2, 80, 110.2, 'rgba(120,120,120,0.9)', 0.8);
    dot(ctx, m[head][0], m[head][1], 3.2, ACCENT);
  },
};

// ───────────────────────────── (u) Lissajous figures ─────────────────────────────
const lissajous = {
  // One turn per 16th note, the frequency
  // ratio steps 1:1 → 2:1 → 3:2 on the beat and every new figure starts its trace afresh.
  // s = 2π·frame/T;  x = cx + A sin(a s + px),  y = cy + B sin(b s + py)
  phases: [
    { f0: 3703, T: 6.897, a: 1, b: 1, cx: 107.70, A: 82.39, px: 1.9626, cy: 89.64, B: 65.93, py: -2.0260 },
    { f0: 3724, T: 6.902, a: 2, b: 1, cx: 107.52, A: 81.95, px: 1.7030, cy: 89.31, B: 66.22, py: 0.3618 },
    { f0: 3751, T: 6.914, a: 3, b: 2, cx: 107.14, A: 82.20, px: -2.1595, cy: 89.69, B: 66.26, py: 3.0381 },
  ],
  draw(ctx, tau, t) {
    ctx.strokeStyle = 'rgba(160,160,160,0.55)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    for (let k = 0; k <= 10; k++) { const x = 18.3 + k * 18; ctx.moveTo(x, 18.3); ctx.lineTo(x, 162.3); }
    for (let k = 0; k <= 8; k++) { const y = 18.3 + k * 18; ctx.moveTo(18.3, y); ctx.lineTo(198.3, y); }
    ctx.stroke();
    const F = t * 60;
    let P = this.phases[0];
    for (const q of this.phases) if (F >= q.f0 - 0.5) P = q;
    const f = (fr) => {
      const s = (2 * Math.PI * fr) / P.T;
      return [P.cx + P.A * Math.sin(P.a * s + P.px), P.cy + P.B * Math.sin(P.b * s + P.py)];
    };
    // trace since the figure started (at most one full turn), fading towards its tail
    const from = Math.max(P.f0 - 0.45, F - P.T * 0.98);
    const pts = [];
    for (let k = 0; k <= 160; k++) pts.push(f(from + ((F - from) * k) / 160));
    fadingTrail(ctx, pts, '20,20,20', 0.3, 1, 1.3, 14);
    const p = f(F);
    dot(ctx, p[0], p[1], 2.6, ACCENT);
  },
};

// ───────────────────────────── (v) Wave on a string ─────────────────────────────
const wave = {
  // Pulse centre, spatial width and damping, including both fixed-end reflections.
  c: 532.148653, x0: 17.4, x1: 201.3, y0: 95.987283,
  width: 18.119587, amplitude: 29.834358, reflection: 0.713526,
  pulses: [62.054163, 62.516271],
  y(x, t) {
    let y = 0;
    const L = this.x1 - this.x0, d = x - this.x0;
    for (const p of this.pulses) {
      const u = this.c * (t - p);
      for (let k = 0; k < 4; k++) {
        const offset = 2 * k * L;
        y -= this.amplitude * this.reflection ** (2 * k) * Math.exp(-(((offset + d - u) / this.width) ** 2));
        y += this.amplitude * this.reflection ** (2 * k + 1) * Math.exp(-(((offset + 2 * L - d - u) / this.width) ** 2));
      }
    }
    return y;
  },
  draw(ctx, tau, t) {
    line(ctx, this.x0, 56.7, this.x0, 135, 'rgba(140,140,140,0.7)', 0.8);
    ctx.setLineDash([2, 3]);
    line(ctx, this.x0, this.y0, this.x1, this.y0, 'rgba(120,120,120,0.6)', 0.8);
    ctx.setLineDash([]);
    line(ctx, this.x1, 66.7, this.x1, 125, INK, 1.6);
    hatch(ctx, this.x1 + 6, this.x1 + 6, 66, 1, 0, 6, 'rgba(0,0,0,0)');
    ctx.beginPath();
    for (let y = 70; y <= 126; y += 6) { ctx.moveTo(this.x1 + 1, y + 4); ctx.lineTo(this.x1 + 6, y - 1); }
    ctx.strokeStyle = 'rgba(120,120,120,0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.beginPath();
    for (let x = this.x0; x <= this.x1; x += 1) {
      const y = this.y0 + this.y(x, t);
      if (x === this.x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    dot(ctx, this.x0, this.y0 + this.y(this.x0, t), 3.7, ACCENT);
  },
};

// ───────────────────────────── (w) Projectile motion ─────────────────────────────
const projectile = {
  shots: [
    { t0: 62.067, x0: 20.96403, y0: 154.23749, vx: 390.22717, vy: 366.03014, g: 1694.90154 },
    { t0: 62.528538, x0: 22.28929, y0: 155.94644, vx: 477.54471, vy: 253.19071, g: 1702.68390 },
  ],
  draw(ctx, tau, t) {
    line(ctx, 0, 160.5, PW, 160.5, INK, 1);
    hatch(ctx, 4, PW + 6, 162, 1, 4.5, 6.2, 'rgba(120,120,120,0.75)');
    for (const s of this.shots) {
      const el = t - s.t0;
      if (el < 0) continue;
      const T = (s.vy + Math.sqrt(s.vy ** 2 + 2 * s.g * (157 - s.y0))) / s.g;
      const tEnd = Math.min(el, T);
      ctx.fillStyle = 'rgba(70,70,70,0.85)';
      for (let k = 0; k * 0.008 <= tEnd; k++) {
        const tt = k * 0.008;
        const x = 0.5 + s.x0 + s.vx * tt, y = 0.5 + s.y0 - s.vy * tt + 0.5 * s.g * tt * tt;
        ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
      if (el < T) {
        // The tracked centroids are pixel indices; pixel centres sit at +0.5 in canvas space.
        const x = 0.5 + s.x0 + s.vx * el, y = 0.5 + s.y0 - s.vy * el + 0.5 * s.g * el * el;
        dot(ctx, x, y, 3.5, INK);
      } else {
        const land = s.x0 + s.vx * T;
        line(ctx, land, 157, land, 164, INK, 1);
      }
    }
    // cannon
    ctx.save();
    ctx.translate(15, 159.5);
    ctx.fillStyle = ACCENT;
    ctx.beginPath();
    ctx.arc(0, 0, 6, Math.PI, 0);
    ctx.fill();
    const aim = Math.max(0, Math.min(1, (t - 62.35) / 0.067));
    ctx.rotate(-0.8 + 0.32 * aim);
    ctx.fillRect(0, -2.6, 18 + aim, 5.2);
    ctx.restore();
  },
};

// ───────────────────────────── (x) Ideal gas ─────────────────────────────
const gas = {
  // Fast molecules (10–25 px per frame): each frame shows a small dot and a grey streak
  // back to where it was a frame earlier, folded at the walls.
  setup() {
    const R = makeRng(17), N = 56;
    this.parts = Array.from({ length: N }, () => ({ x: 14 + R() * 130, y: 25 + R() * 128, a: R() * TAU, s: 600 + R() * 900 }));
  },
  piston(t) { return 152 + 18 * Math.cos((TAU * (t - 62.067)) / 0.4615 + Math.PI); },
  pos(p, t) {
    const xl = 13, xr = 148, yt = 23, yb = 156;
    const fold = (v, a, b) => { const L = b - a; let d = (((v - a) % (2 * L)) + 2 * L) % (2 * L); return d <= L ? a + d : b - (d - L); };
    const el = t - 62.0;
    return [fold(p.x + Math.cos(p.a) * p.s * el, xl, xr), fold(p.y + Math.sin(p.a) * p.s * el, yt, yb)];
  },
  draw(ctx, tau, t) {
    const px = this.piston(t);
    line(ctx, 10.7, 21, PW, 21, INK, 1.3);
    line(ctx, 10.7, 158, PW, 158, INK, 1.3);
    line(ctx, 10.7, 21, 10.7, 158, INK, 1.3);
    ctx.fillStyle = ACCENT;
    ctx.fillRect(px - 2.5, 21, 5, 137);
    line(ctx, px, 89.3, PW, 89.3, ACCENT, 1.3);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const p of this.parts) {
      const [x, y] = this.pos(p, t);
      if (x > px - 3) continue;
      ctx.beginPath();
      for (let k = 0; k <= 6; k++) {
        const q = this.pos(p, t - (k / 6) / 60);
        if (k === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(Math.min(q[0], px - 3), q[1]);
      }
      ctx.strokeStyle = 'rgba(120,120,120,0.65)'; ctx.lineWidth = 0.8; ctx.stroke();
      dot(ctx, x, y, 1.6, INK);
    }
    ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
  },
};

export const PANELS = [
  ['(a) Mandelbrot set', mandelbrot],
  ['(b) Bouncing ball', bouncing],
  ['(c) Ripple interference', ripple],
  ['(d) Simple pendulum', pendulum],
  ['(e) L-system tree', tree],
  ['(f) Newton’s cradle', cradle],
  ['(g) Langton’s ant', langton],
  ['(h) Spring–mass', spring],
  ['(i) DLA cluster', dla],
  ['(j) Double pendulum', dpend],
  ['(k) Abelian sandpile', sandpile],
  ['(l) Kuramoto model', kuramoto],
  ['(m) Chladni plate', chladni],
  ['(n) Galton board', galton],
  ['(o) Lloyd’s algorithm', lloyd],
  ['(p) Lorenz attractor', lorenz2d],
  ['(q) Brownian motion', brownian],
  ['(r) Kepler orbit', kepler],
  ['(s) Figure-eight orbit', figure8],
  ['(t) Lotka–Volterra', lotka],
  ['(u) Lissajous figures', lissajous],
  ['(v) Wave on a string', wave],
  ['(w) Projectile motion', projectile],
  ['(x) Ideal gas', gas],
];
