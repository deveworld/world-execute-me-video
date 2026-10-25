// 0 – 7.33  CRT boot ("Switch on the power line / Remember to put on PROTECTION")
//           then "Lay down your pieces / And let's begin OBJECT CREATION" with the Boing ball.
// Content is drawn flat (1920x1080) and shown through the measured CRT (lib/crt.js).
import { createCRT } from './lib/crt.js';
import { createBoing } from './lib/boing.js';
import * as T from './lib/term.js';

const F = (n) => n / 60; // frame -> seconds

// ---- typing script (measured frame-exactly on the original) ----
const LYRIC_A = [
  { text: 'Switch', t0: -1, cps: 1e9 },
  { text: ' on', t0: F(37), cps: 180 },
  { text: ' the', t0: F(56), cps: 120 },
  { text: ' power', t0: F(63), cps: 120 },
  { text: ' line', t0: F(72), cps: 120 },
];
const LYRIC_B = [
  { text: 'Remember', t0: F(103), cps: 120 },
  { text: ' to', t0: F(145), cps: 120 },
  { text: ' put', t0: F(160), cps: 120 },
  { text: ' on', t0: F(176), cps: 180 },
];
const BIOS = [
  { row: 1, text: 'WEM-486 ROM BIOS v1.07  (C) 1989', t0: F(12) },
  { row: 15, text: 'Press DEL to enter SETUP', t0: F(67.5), dim: true },
  { row: 5, text: 'Booting from Hard Disk...', t0: F(123) },
  { row: 6, text: 'A20 enabled   GDT 00007E00 limit 0017', t0: F(150.5) },
  { row: 10, text: 'CR0 60000010 -> 60000011   PE=1  protected mode', t0: F(194.5) },
];
const MEM_T0 = F(26);           // "Memory Test : "
const MEM_NUM = F(33);          // number field appears
const OK_T = F(96);             // " OK"
const PROT_T0 = F(188);         // big "Protection" wipe start (3.133)
const CLEAR_T = F(231);         // 3.85: screen cleared, object creation

const LYRIC_C = [
  { text: 'Lay', t0: 3.84, cps: 120 },
  { text: ' down', t0: 4.2817, cps: 150 },
  { text: ' your', t0: 4.578, cps: 150 },
  { text: ' pieces', t0: 4.745, cps: 150 },
];
const LYRIC_D = [
  { text: "And let's", t0: 5.44, cps: 120 },
  { text: ' begin', t0: 5.88, cps: 120 },
];
const OBJ_T0 = F(380);          // big "Object" wipe start (6.333)
const CRE_T0 = F(404);          // big " creation" wipe start (6.733)
const ROW6_T = F(408);          // cursor drops to row 6
const SIM_T0 = 5.5143;          // ball simulation clock (readout "t")
const READ = [
  { row: 8, text: 'facets  128', t0: 4.85 },
  { row: 9, text: 'r  0.45 m', t0: 4.925 },
  { row: 10, text: 'g  9.81 m/s²', t0: 5.05 },
  { row: 11, text: 'e  0.50', t0: 5.1667 },
  { row: 12, text: 't  0.000 s', t0: 5.275, sim: true },
];

const COL_LYRIC = '#f4f4f6';
const COL_BIOS = '#9c9eb3';
const COL_DIM = '#7f8399';

export default {
  id: 'bookends/intro',
  start: 0,
  end: 7.33,
  fonts: ['62.5px "VT323"', '125px "VT323"'],
  async create(root, env) {
    const crt = createCRT(root, env);
    const boing = createBoing(crt);
    const c2 = document.createElement('canvas');
    c2.width = 1920; c2.height = 1080;
    const ctx = c2.getContext('2d');
    const SPB = env.beat.SPB;
    const blinkOn = (t) => {
      const ph = (t - 0.208) / SPB;
      return ph - Math.floor(ph) < 0.5;
    };

    function background() {
      // lit-picture black level (adds to the glass): faint, brighter towards the upper left
      ctx.clearRect(0, 0, 1920, 1080);
      const g = ctx.createRadialGradient(560, 230, 0, 560, 230, 1500);
      g.addColorStop(0, 'rgba(9,9,10,1)');
      g.addColorStop(0.5, 'rgba(5,5,6,1)');
      g.addColorStop(1, 'rgba(3,3,4,1)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 1920, 1080);
    }

    // Cursor visibility measured frame by frame on the original (inclusive frame ranges): the
    // terminal's blink restarts irregularly after keystrokes, so a pure beat rule misses frames.
    const CURSOR_ON = [[13,26],[38,53],[57,81],[96,103],[105,114],[124,137],[146,168],[177,188],[192,198],[207,220],
      [231,247],[258,283],[286,303],[318,337],[345,362],[373,380],[383,389],[401,404],[407,414],[428,440]];
    function cursorVisible(t, lastEvent) {
      const f = Math.round(t * 60);
      if (f < 13) return blinkOn(t) || t - lastEvent < 0.12 || t < 0.16;
      return CURSOR_ON.some(([a, b]) => f >= a && f <= b);
    }
    function cursorAt(row, col, lastEvent, t, scale = 1, y = null) {
      const on = cursorVisible(t, lastEvent);
      if (!on) return;
      ctx.fillStyle = COL_LYRIC;
      T.drawCursor(ctx, T.X0, y ?? T.baseline(row), col, scale);
    }

    function bigWipe(text, x, y, t0, t, col) {
      // Measured raster reveal: the top ~35% band of the word is drawn left to right at 8 glyphs per
      // frame, then (two frames after the start) the lower band at the same rate.
      const fr = (t - t0) / F(1);
      if (fr <= 1e-6) return false;
      const L = text.length, lead = L - text.trimStart().length;
      const n1 = Math.min(L, lead + Math.floor(8 * fr + 1e-6));
      const n2 = Math.min(L, lead + Math.max(0, Math.floor(8 * (fr - 2) + 1e-6)));
      const top = y - 72, mid = top + 40, bottom = y + 30, adv = T.ADV * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top, x + n1 * adv, mid - top);
      if (n2 > lead) ctx.rect(0, mid, x + n2 * adv, bottom - mid);
      ctx.clip();
      T.setFont(ctx, 2);
      ctx.fillStyle = col;
      T.drawMono(ctx, text, x, y, 2);
      ctx.restore();
      return n2 >= L;
    }

    function drawBoot(t) {
      T.setFont(ctx, 1);
      // BIOS lines
      for (const b of BIOS) {
        const n = T.typedCount(t, b.t0, 120, b.text.length);
        if (!n) continue;
        ctx.fillStyle = b.dim ? COL_DIM : COL_BIOS;
        T.drawMono(ctx, b.text.slice(0, n), T.X0, T.baseline(b.row));
      }
      // memory test
      const memLabel = 'Memory Test : ';
      let mem = memLabel.slice(0, T.typedCount(t, MEM_T0, 120, memLabel.length));
      if (t >= MEM_NUM) {
        const k = Math.max(1, Math.min(64, Math.floor(1 + (t - 0.6677) * 68.17)));
        mem += String(k * 64).padStart(4, ' ') + 'K';
        if (t >= OK_T) mem += ' OK';
      }
      ctx.fillStyle = COL_BIOS;
      T.drawMono(ctx, mem, T.X0, T.baseline(2));

      // lyric rows
      ctx.fillStyle = COL_LYRIC;
      const a = T.segText(LYRIC_A, t);
      drawLyric(a.s, 0);
      const b = T.segText(LYRIC_B, t);
      if (b.s) drawLyric(b.s, 4);
      // big "Protection"
      const protDone = bigWipe('Protection', T.X0, 631, PROT_T0, t, COL_LYRIC);
      // cursor
      // (measured: the cursor stays after "line" on frame 103, is hidden on 104, then jumps to row 4)
      if (t < LYRIC_B[0].t0 + F(1)) cursorAt(0, a.s.length, lastTyped(LYRIC_A, t), t);
      else if (t < PROT_T0 + F(0.5)) cursorAt(4, b.s.length, lastTyped(LYRIC_B, t), t);
      else if (protDone) cursorAt(0, 10, PROT_T0 + F(4), t, 2, 631);
    }

    function lastTyped(segs, t) {
      let last = -10;
      for (const g of segs) {
        if (t < g.t0) break;
        const n = T.typedCount(t, g.t0, g.cps, g.text.length);
        if (n > 0) last = g.t0 + Math.min(n, g.text.length) / g.cps;
      }
      return Math.min(last, t);
    }

    function drawLyric(s, row) {
      // lyric lines are bolder than the BIOS text: double-strike 1 px apart
      T.setFont(ctx, 1);
      for (let i = 0; i < s.length; i++) {
        // The reference colours only “your” with the terminal's warm phosphor.
        ctx.fillStyle = row === 1 && i >= 9 && i < 13 ? '#f4d2b0' : COL_LYRIC;
        T.drawMono(ctx, s[i], T.X0 + i * T.ADV, T.baseline(row));
        T.drawMono(ctx, s[i], T.X0 + i * T.ADV + 1.2, T.baseline(row));
      }
    }

    function drawObject(t) {
      // divider
      ctx.fillStyle = 'rgba(150,150,170,0.55)';
      ctx.fillRect(858, 0, 2, 1080);
      const c = T.segText(LYRIC_C, t);
      drawLyric(c.s, 1);
      const d = T.segText(LYRIC_D, t);
      if (d.s) drawLyric(d.s, 2);
      // readouts
      T.setFont(ctx, 1);
      ctx.fillStyle = COL_BIOS;
      for (const r of READ) {
        let text = r.text;
        if (r.sim && t >= SIM_T0) text = `t  ${(Math.floor((t - SIM_T0) * 1000 + 1e-6) / 1000).toFixed(3)} s`;
        const n = T.typedCount(t, r.t0, 120, text.length);
        if (n) T.drawMono(ctx, text.slice(0, n), T.X0, T.baseline(r.row));
      }
      const objDone = bigWipe('Object', T.X0, 390, OBJ_T0, t, COL_LYRIC);
      const creDone = bigWipe(' creation', T.X0 + 6 * T.ADV * 2, 390, CRE_T0, t, COL_LYRIC);
      // cursor
      if (t < LYRIC_D[0].t0) cursorAt(1, c.s.length, lastTyped(LYRIC_C, t), t);
      else if (t < OBJ_T0 + F(0.5)) cursorAt(2, d.s.length, lastTyped(LYRIC_D, t), t);
      else if (t < CRE_T0 + F(0.5)) { if (objDone) cursorAt(0, 6, OBJ_T0 + F(3), t, 2, 390); }
      else if (t < ROW6_T) { if (creDone) cursorAt(0, 15, CRE_T0 + F(3), t, 2, 390); }
      else cursorAt(6, 0, ROW6_T, t);
    }

    // CRT power-on: line at 0.033, vertical opening (ease-out cubic) until ~0.25
    function power(t) {
      // (measured: the warm-up glow of frames 0-1 stays on outside the opening band until ~0.12 s)
      const resid = 0.72 * (1 - Math.min(1, Math.max(0, (t - F(6)) / F(3))));
      if (t < F(2)) return { sy: 1, lit: 0, gain: 1.3, beam: 0, resid: t < F(1) ? 0.76 : 0.72 };
      if (t < F(3)) return { sy: 0.001, lit: 0, beam: 1.0, beamHalfW: 905, beamThick: 3.5, resid };
      const x = Math.min(1, (t - 0.036) / 0.21);
      // First frames of the opening measured from the text row position on the original.
      const OPEN = [[F(3), .153], [F(4), .389], [F(5), .577], [F(6), .72], [F(7), .813], [F(8), .875], [F(9), .909], [F(10), .946]];
      let sy = Math.max(0.02, 1 - Math.pow(1 - x, 3));
      if (t < F(10)) for (let i = 1; i < OPEN.length; i++) if (t <= OPEN[i][0]) { const [a0, v0] = OPEN[i - 1], [a1, v1] = OPEN[i]; sy = v0 + (v1 - v0) * Math.max(0, (t - a0) / (a1 - a0)); break; }
      return { sy, lit: 1, gain: 1.3 * (1 + 0.35 * (1 - sy)), beam: 0, resid: resid / (1 + 0.35 * (1 - sy)) };
    }

    return {
      ready: boing.ready,
      render(t) {
        background();
        if (t < F(2)) { /* warming up: lit glass only */ }
        else if (t < CLEAR_T) {
          // Measured warm-up settling of the first terminal lines, in native output pixels.
          const settle=[[.10,0,0],[.15,6.0215,-17.5981],[.20,4.8949,-2.1854],[.25,4.1731,1.3244],[.30,3.5011,1.0888],[.35,3.0336,.8536],[.40,2.6283,.6483],[.50,1.9867,.3437],[.60,1.5571,.1370],[.80,.9284,-.2432],[1.0,.6355,-.3121],[1.5,0,0]];
          let dx=0,dy=0;for(let i=1;i<settle.length;i++)if(t>=settle[i-1][0]&&t<settle[i][0]){const[a,x0,y0]=settle[i-1],[b,x1,y1]=settle[i],k=(t-a)/(b-a);dx=x0+(x1-x0)*k;dy=y0+(y1-y0)*k;break;}
          ctx.save();ctx.translate(dx*1.10,dy*1.08/Math.max(.05,power(t).sy));drawBoot(t);ctx.restore();
        }
        else drawObject(t);
        crt.beginContent(0, 0, 0);
        crt.drawCanvas(c2);
        if (t >= CLEAR_T) boing.draw(t);
        crt.present({ bloomA: 0.16, bloomB: 0.08, bloomThresh: 0.4, aberr: 0.35, ...power(t) });
      },
    };
  },
};
