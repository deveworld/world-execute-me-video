// Conway's Game of Life on a 96x54 dot grid: Gosper gun, pulsars, pentadecathlon, spaceships and the
// escaped particle as a highlighted glider. New-born cells are blue, survivors lavender, dying cells fade.
// A generation per 16th note; gliders are injected at the edges exactly where the original injects them.
// All generations are precomputed in create(); render(t) only looks them up.
import { SPB, clamp, resetCtx } from './lib/util.js';
import { GEN0, INJECT, SPECIAL0 } from './life/data.js';

const COLS = 96, ROWS = 54, PITCH = 20, CELL = 16, OFF = 2, RAD = 2.6;
const T_START = 144.217, T0 = 144.2070, STEP = SPB / 4, NGEN = 31;
const COL = { bg: '#07060b', empty: '#111015', live: [199, 199, 237], born: [92, 90, 225], emptyRGB: [17, 16, 21] };
const GLOW_A = 0.57, GLOW_TAU = 0.2;
const LABEL_FONT = '330 18.2px "Red Hat Mono"';

function simulate() {
  const N = COLS * ROWS;
  const gens = [];   // per generation: { alive: Uint8Array, age: Uint16Array }
  let alive = new Uint8Array(N), age = new Uint16Array(N);
  for (const [c, r] of GEN0) alive[r * COLS + c] = 1;
  // gen 0: everything already "old" except the special glider, which is new-born
  for (let i = 0; i < N; i++) age[i] = alive[i] ? 1 : 0;
  for (const [c, r] of SPECIAL0) age[r * COLS + c] = 0;
  gens.push({ alive, age });
  for (let k = 1; k < NGEN; k++) {
    const na = new Uint8Array(N), ng = new Uint16Array(N);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let n = 0;
        for (let dr = -1; dr <= 1; dr++) {
          const rr = r + dr;
          if (rr < 0 || rr >= ROWS) continue;
          for (let dc = -1; dc <= 1; dc++) {
            if (!dr && !dc) continue;
            const cc = c + dc;
            if (cc < 0 || cc >= COLS) continue;
            n += alive[rr * COLS + cc];
          }
        }
        const i = r * COLS + c;
        if (alive[i] ? n === 2 || n === 3 : n === 3) {
          na[i] = 1;
          ng[i] = alive[i] ? age[i] + 1 : 0;
        }
      }
    }
    for (const [c, r] of INJECT[k] || []) {
      const i = r * COLS + c;
      if (!na[i]) { na[i] = 1; ng[i] = 0; }
    }
    alive = na; age = ng;
    gens.push({ alive, age });
  }
  return gens;
}

export default {
  id: 'escape/life',
  start: 144.21,
  end: 147.78,
  async create(root, env) {
    await document.fonts.load(LABEL_FONT);
    const { canvas, ctx } = env.canvas(root, { context: '2d', options: { alpha: false } });
    const W = canvas.width, H = canvas.height;
    const gens = simulate();

    // static grid of empty cells
    const grid = document.createElement('canvas');
    grid.width = W; grid.height = H;
    {
      const g = grid.getContext('2d');
      g.fillStyle = COL.bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = COL.empty;
      g.beginPath();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) g.roundRect(c * PITCH + OFF, r * PITCH + OFF, CELL, CELL, RAD);
      g.fill();
    }
    // soft blue blob used for the escaped glider's haze
    const haze = document.createElement('canvas');
    haze.width = haze.height = 80;
    {
      const g = haze.getContext('2d');
      const gr = g.createRadialGradient(40, 40, 0, 40, 40, 40);
      gr.addColorStop(0, 'rgba(92,94,235,0.55)');
      gr.addColorStop(0.3, 'rgba(92,94,235,0.30)');
      gr.addColorStop(0.6, 'rgba(92,94,235,0.10)');
      gr.addColorStop(1, 'rgba(92,94,235,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 80, 80);
    }
    const rgb = (a) => `rgb(${a[0] | 0},${a[1] | 0},${a[2] | 0})`;
    // The reference has a one-pixel highlight and dark undershoot at each cell edge.
    // Generate that edge response from the rounded rectangle; no captured texture is used.
    function cellSprite(colour) {
      const c = document.createElement('canvas'); c.width = c.height = PITCH;
      const g = c.getContext('2d');
      g.fillStyle = COL.bg; g.fillRect(0, 0, PITCH, PITCH);
      g.fillStyle = rgb(colour); g.beginPath(); g.roundRect(OFF, OFF, CELL, CELL, RAD); g.fill();
      const data = g.getImageData(0, 0, PITCH, PITCH), src = new Uint8ClampedArray(data.data);
      for (let y = 1; y < PITCH - 1; y++) for (let x = 1; x < PITCH - 1; x++) {
        const i = (y * PITCH + x) * 4;
        for (let ch = 0; ch < 3; ch++) data.data[i + ch] = src[i + ch] + 0.18 *
          (4 * src[i + ch] - src[i - 4 + ch] - src[i + 4 + ch] - src[i - PITCH * 4 + ch] - src[i + PITCH * 4 + ch]);
      }
      g.putImageData(data, 0, 0);
      return c;
    }
    const cellSprites = [cellSprite(COL.live), cellSprite(COL.born)];

    const genAt = (t) => {
      let k = Math.floor((t - T0) / STEP);
      return Math.max(0, Math.min(NGEN - 1, k));
    };

    return {
      render(t) {
        resetCtx(ctx);
        const k = genAt(t);
        const tk = k === 0 ? T_START : T0 + k * STEP;      // when generation k appeared
        const cur = gens[k], prev = k > 0 ? gens[k - 1] : null;
        ctx.drawImage(grid, 0, 0);

        // The source's dying-cell RGB follows a curved decay, rather than a linear blend.
        // Fitted to cell-interior samples across all 30 generation changes at 60 fps.
        if (prev) {
          const fade = Math.pow(clamp(1 - (t - tk - 0.001) / 0.104), 1.8);
          if (fade > 0) {
            for (let i = 0; i < cur.alive.length; i++) {
              if (!prev.alive[i] || cur.alive[i]) continue;
              ctx.globalAlpha = fade;
              ctx.drawImage(cellSprites[prev.age[i] === 0 ? 1 : 0], (i % COLS) * PITCH, Math.floor(i / COLS) * PITCH);
            }
          }
          ctx.globalAlpha = 1;
        }

        // blue haze around the escaped glider (decays over ~0.6 s, measured from the gaps around it)
        const t1 = T0 + STEP;   // generation 1
        const glow = GLOW_A * (t < t1 ? 1 - 0.8 * (t - T_START) : 0.63 * Math.exp(-(t - t1) / GLOW_TAU));
        if (glow > 0.01) {
          const q = Math.floor(k / 4);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = Math.min(1, glow);
          for (let r = Math.max(0, q - 1); r <= q + 3; r++) {
            for (let c = 44 + q; c <= 48 + q; c++) {
              if (!cur.alive[r * COLS + c]) continue;
              ctx.drawImage(haze, c * PITCH + PITCH / 2 - 40, r * PITCH + PITCH / 2 - 40);
            }
          }
          ctx.restore();
        }

        for (let i = 0; i < cur.alive.length; i++) {
          if (!cur.alive[i]) continue;
          ctx.drawImage(cellSprites[cur.age[i] === 0 ? 1 : 0], (i % COLS) * PITCH, Math.floor(i / COLS) * PITCH);
        }

        // generation label
        ctx.fillStyle = '#09080d';
        ctx.beginPath();
        ctx.roundRect(96, 936, 189, 47, 6);
        ctx.fill();
        ctx.font = LABEL_FONT;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#cfcfd6';
        ctx.fillText(`generation ${k}`, 120, 965);
      },
    };
  },
};
