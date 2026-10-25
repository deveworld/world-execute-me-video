// 66.63–74.0583333333 "If I can make you happy, I will run the EXECUTION / Though we are trapped in this
// strange, strange SIMULATION". Navy page: Lorenz equations typed in, an RK4 readout, a 3D axes
// view where "me" and "you" (1e-5 apart) are integrated live; a wireframe globe, then the attractor
// fills in as a glowing butterfly.
import { vignetteCanvas, clamp } from './lib/common.js';
import { integrate, youStart, camera, stepAt } from './lorenz/sim.js';
import { H } from './lorenz/data.js';
import { P0 } from './lorenz/data.js';
import { globeLines } from './lorenz/globe.js';
import { READOUT_FRAME0, SEPARATIONS } from './lorenz/readout.js';
import { COMET_FRAME0, COMETS } from './lorenz/comets.js';

const START = 66.63, END = 74.0583333333;
const BG = [
  [10.0, -3.94, 0.59, 4.33, -0.33, 0.04, -0.05, -0.01],
  [12.94, -0.99, 0.74, -0.08, -0.77, -1.42, 0.0, -0.01],
  [50.85, -0.28, 1.48, -3.16, -1.32, -3.8, -0.06, -0.02],
];
const TEXT = 'rgb(235,240,255)', PEACH = 'rgb(246,196,177)', DIM = 'rgb(165,168,204)', LAV = 'rgb(203,205,251)';
const SERIF = '"EB Garamond"', MONO = '"IBM Plex Mono"';
const NDENSE = 60000, NTOTAL = 61000;

// lyric words: [text, inkLeftX, baselineY, t50, color]
const WORDS_A = [
  ['If', 120, 620, -1], ['I', 189, 620, 67.067], ['can', 233, 620, 67.15], ['make', 354, 620, 67.433],
  ['you', 531, 620, 67.733, PEACH], ['happy', 663, 620, 68.033],
  ['I', 120, 740, 68.45], ['will', 162, 740, 68.517], ['run', 293, 740, 68.917], ['the', 421, 740, 69.167],
];
const WORDS_B = [
  ['Though', 121, 620, 70.283], ['we', 387, 620, 70.783], ['are', 490, 620, 71.05], ['trapped', 596, 620, 71.267],
  ['In', 120, 740, 71.667], ['this', 207, 740, 72.083], ['strange,', 334, 740, 72.133], ['strange', 586, 740, 72.667],
];

export default {
  id: 'simulation/lorenz',
  start: START,
  end: END,
  fonts: ['500 78px "EB Garamond"', 'italic 400 178px "EB Garamond"', 'italic 400 56px "EB Garamond"', '400 56px "EB Garamond"', '400 23px "IBM Plex Mono"'],
  create(root, env) {
    const { ctx } = env.canvas(root);
    const bg = vignetteCanvas(BG);

    // ── simulation data ──
    const me = integrate(P0, NTOTAL + 4);
    const you = integrate(youStart(), NTOTAL + 4);
    const meXY = new Float32Array(2 * (NTOTAL + 5));
    const youXY = new Float32Array(2 * (NTOTAL + 5));
    const sep = (i) => Math.hypot(me[3 * i] - you[3 * i], me[3 * i + 1] - you[3 * i + 1], me[3 * i + 2] - you[3 * i + 2]);
    const globe = globeLines();

    // ── pre-rendered equation lines (typed in with a soft left→right wipe) ──
    const S = 56;
    const it = `italic 400 ${S}px ${SERIF}`, up = `500 ${S}px ${SERIF}`, sm = `500 ${S * 0.62}px ${SERIF}`;
    const EQ = [
      { y: 176, t0: -1, dur: 0.01, toks: [['x', it, 123, 'dot'], ['=', up, 166], ['σ', it, 212], ['(', up, 242], ['y', it, 254], ['−', up, 297], ['x', it, 339], [')', up, 370]] },
      { y: 252, t0: 67.0624898364, speed: 2439.2979743, soft: 125.2804933, toks: [['y', it, 120, 'dot'], ['=', up, 166], ['x', it, 210], ['(', up, 240], ['ρ', it, 253.5], ['−', up, 303], ['z', it, 346], [')', up, 374], ['−', up, 404], ['y', it, 442]] },
      { y: 328, t0: 67.5311852057, speed: 2597.1496908, soft: 131.9532824, toks: [['z', it, 125, 'dot'], ['=', up, 166], ['x', it, 210], ['y', it, 232], ['−', up, 273], ['β', it, 313.5], ['z', it, 342]] },
      { y: 420, t0: 68.0051268574, speed: 3618.7936920, soft: 184.8122788, toks: [['σ', it, 120], ['=', up, 161], ['10,', up, 210], ['ρ', it, 315.5], ['=', up, 370], ['28,', up, 416], ['β', it, 533.5], ['=', up, 581], ['frac', up, 627]] },
    ];
    const eqImgs = EQ.map((ln) => {
      const cv = document.createElement('canvas');
      cv.width = 760; cv.height = 110;
      const c = cv.getContext('2d');
      c.fillStyle = TEXT;
      ln.w = 0;
      for (const [s, f, x, mod] of ln.toks) {
        if (s === 'frac') {
          // diagonal fraction 8⁄3 (small figures on a short slash)
          c.font = sm;
          c.fillText('8', x - 100, 55 - 15);
          c.fillText('3', x - 100 + 17, 55 + 1);
          c.strokeStyle = TEXT;
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(x - 100 + 23, 55 - 37);
          c.lineTo(x - 100 + 7, 55 + 3);
          c.stroke();
          ln.w = Math.max(ln.w, x - 100 + 32);
          continue;
        }
        c.font = f;
        const m = c.measureText(s);
        const gx = x - 100 + m.actualBoundingBoxLeft;
        c.fillText(s, gx, f === it ? 54 : 55);
        ln.w = Math.max(ln.w, gx + m.actualBoundingBoxRight);
        if (mod === 'dot') {
          c.beginPath();
          c.arc(42.5, 22.5, 2.5, 0, Math.PI * 2);
          c.fill();
        }
      }
      return cv;
    });
    const wipeCanvas = document.createElement('canvas');
    wipeCanvas.width = 760; wipeCanvas.height = 110;
    const wipeCtx = wipeCanvas.getContext('2d');
    function drawWipe(img, x, y, w, h, k, soft = 60) {
      if (k <= 0) return;
      if (k >= 1) { ctx.drawImage(img, x, y); return; }
      const edge = -soft + (w + soft) * k;
      wipeCtx.globalCompositeOperation = 'source-over';
      wipeCtx.clearRect(0, 0, 760, 110);
      wipeCtx.drawImage(img, 0, 0);
      const mask = wipeCtx.createLinearGradient(edge, 0, edge + soft, 0);
      mask.addColorStop(0, '#fff'); mask.addColorStop(1, 'rgba(255,255,255,0)');
      wipeCtx.globalCompositeOperation = 'destination-in';
      wipeCtx.fillStyle = mask; wipeCtx.fillRect(0, 0, 760, 110);
      wipeCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(wipeCanvas, x, y);
    }

    // Word entrance: it pops in at ~45 % opacity about 13 px low and settles
    // over ~6 frames. FIRST_FRAME: first visible frame per word (keyed by its 50 % time).
    const FIRST_FRAME = new Map([[67.067, 4023], [67.15, 4027], [67.433, 4044], [67.733, 4063], [68.033, 4081], [68.45, 4106],
      [68.517, 4109], [68.917, 4134], [69.167, 4148], [70.283, 4216], [70.783, 4246], [71.05, 4261], [71.267, 4274],
      [71.667, 4299], [72.083, 4323], [72.133, 4327], [72.667, 4358]]);
    const ENTER_A = [[-0.5, 0], [0, 0.47], [1, 0.72], [2, 0.88], [3, 0.97], [4, 1]];
    const ENTER_Y = [[-0.5, 14], [0, 11.5], [1, 8], [2, 5.5], [3, 3.2], [4, 1.8], [5, 1.2], [6, 1], [8.5, 1], [9, 0]];
    function word(w, x, y, t50, color, t) {
      let k = 1, dy = 0;
      if (t50 >= 0) {
        const d = t * 60 - (FIRST_FRAME.get(t50) ?? Math.round(t50 * 60) - 1.5);
        k = pwlv(ENTER_A, d); dy = pwlv(ENTER_Y, d);
      }
      if (k <= 0) return;
      ctx.globalAlpha *= k;
      ctx.fillStyle = color || TEXT;
      ctx.font = `500 78px ${SERIF}`;
      const m = ctx.measureText(w);
      ctx.fillText(w, x + m.actualBoundingBoxLeft, y + dy);
      ctx.globalAlpha /= k;
    }
    function bigWord(txt, x, y, t0, stagger, t) {
      ctx.font = `italic 400 178px ${SERIF}`;
      const m0 = ctx.measureText(txt[0]);
      let pen = x + m0.actualBoundingBoxLeft;
      for (let i = 0; i < txt.length; i++) {
        const k = clamp((t - (t0 + i * stagger)) / 0.05);
        const ch = txt[i];
        if (k > 0) {
          const a = ctx.globalAlpha;
          ctx.globalAlpha = a * k;
          ctx.fillStyle = TEXT;
          ctx.fillText(ch, pen, y);
          ctx.globalAlpha = a;
        }
        pen += ctx.measureText(txt.slice(0, i + 1)).width - ctx.measureText(txt.slice(0, i)).width;
      }
    }

    function readout(t, step) {
      const s = Math.floor(step);
      ctx.font = `400 22.58px ${MONO}`;
      const cw = 13.55, x0 = 119.5;
      const put = (str, col, color) => { ctx.fillStyle = color; ctx.fillText(str, x0 + col * cw, 486); };
      const k1 = clamp((t - 68.95) / 0.08);
      if (k1 > 0) {
        ctx.globalAlpha *= k1;
        put('RK4', 0, DIM); put('h =', 5, DIM); put(H.toFixed(3), 9, TEXT);
        put('step', 16, DIM); put(String(s), 21, TEXT); put('t =', 27, DIM); put((step * H).toFixed(3), 31, TEXT);
        ctx.globalAlpha /= k1;
      }
      const k2 = clamp((t - 67.78) / 0.08);
      if (k2 > 0) {
        ctx.globalAlpha *= k2;
        const put2 = (str, col, color) => { ctx.fillStyle = color; ctx.fillText(str, 115 + col * cw, 518); };
        put2('|me − ', 0, LAV); put2('you', 6, PEACH); put2('| =', 9, LAV);
        const fi = Math.round(t * 60) - READOUT_FRAME0;
        const ds = fi < 0 ? '1.0e-5' : SEPARATIONS[Math.min(fi, SEPARATIONS.length - 1)];
        put2(ds, 13, TEXT);
        ctx.globalAlpha /= k2;
      }
    }

    // Song time at which each integration step was first shown (inverse of stepAt), for age-based dimming.
    const stepTime = new Float32Array(NTOTAL + 2).fill(1e9);
    {
      let k = 0;
      for (let f = 69.55 * 600; f <= 73.2333 * 600 && k <= NTOTAL; f++) {
        const s = stepAt(f / 600);
        if (s === null) break;
        while (k <= NTOTAL && k <= s) stepTime[k++] = f / 600;
      }
    }
    // "me" and "you" coincide on screen until they separate; from here on both are drawn.
    let DIVERGE = NTOTAL;
    for (let i = 0; i < NTOTAL; i++) if (sep(i) > 0.05) { DIVERGE = i; break; }
    // An older path dims with age, and on "strange, / strange" every
    // earlier loop of one wing flashes bright and then fades (x < 0 at 72.183 s, x > 0 at 72.683 s).
    const pwlv = (pts, x) => {
      if (x <= pts[0][0]) return pts[0][1];
      for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
      }
      return pts[pts.length - 1][1];
    };
    const WING = [
      { t0: 4331 / 60 - 0.008, neg: true, E: [[0, 173], [0.07, 175], [0.1, 165], [0.15, 153], [0.217, 134], [0.317, 113], [0.417, 97], [0.5, 82], [0.617, 70], [0.717, 59], [0.817, 48], [0.917, 42], [1.017, 29], [1.3, 10], [1.6, 0]] },
      { t0: 4361 / 60 - 0.008, neg: false, E: [[0, 172], [0.05, 177], [0.1, 158], [0.15, 147], [0.2, 128], [0.25, 119], [0.3, 111], [0.35, 105], [0.4, 93], [0.45, 79], [0.6, 60], [1.0, 25], [1.4, 0]] },
    ];
    const PULSE_HEAD = [[0, 0.12], [1, 0.3], [2, 0.42], [3, 0.53], [4, 0.63], [5, 0.71], [6, 0.77], [7, 0.82], [8, 0.86], [9, 0.89], [10, 0.92], [11, 0.94], [12, 0.95], [13, 0.96], [14, 0.97], [15, 0.98], [22, 0.98]];
    const PULSE_LEN = [[0, 0.06], [2, 0.17], [8, 0.19], [12, 0.18], [17, 0.18], [21, 0.04]];
    const PULSE_A = [[0, 0.75], [1, 1], [17, 1], [18, 0.82], [19, 0.68], [20, 0.6], [21, 0.5], [22, 0]];
    const LABEL_Y = [[[66.65, 6.2], [66.8, 6.6], [67.0, 7.5], [67.5, 9.3], [68.0, 11.2], [68.7, 13.2], [69.5, 15.9], [70.0, 17.3], [70.43, 18.4], [70.9, 20.6]],
      [[67.5, -5], [68.0, -4.1], [68.7, -2], [69.5, -0.9], [70.0, 0.8], [70.43, 1.5], [70.9, 1.4]]];
    const LABEL_X = [[[67.5, -0.3], [68.5, -0.1], [69.5, 1.0], [70.5, 1.8], [71.0, 2.4]],
      [[67.5, -1.9], [68.5, -3.6], [69.5, -3.9], [70.5, -6.7], [71.0, -6.8]]];
    const ageB = (tau) => 33 + 137 * Math.exp(-Math.max(0, tau) / 0.435);
    function chunkAlpha(data, i, t) {
      const td = stepTime[i];
      // steps raced through by the fast-forward (from 73.1 s) are barely visible, as in the reference
      let b = td >= 73.1 ? 12 : ageB(t - td);
      for (const w of WING) {
        if (t < w.t0 || td > w.t0) continue;
        if ((data[3 * i] < 0) === w.neg) b += pwlv(w.E, t - w.t0);
      }
      return Math.min(1, b / 200);
    }

    // older path, dimmed by age and lit by the wing flashes (chunks of 6 steps)
    function drawOld(xy, data, from, to, t) {
      const CH = 6;
      ctx.lineWidth = 1.1;
      for (let a = from; a < to; a += CH) {
        const b = Math.min(to, a + CH);
        const al = chunkAlpha(data, (a + b) >> 1, t);
        ctx.beginPath();
        ctx.moveTo(xy[2 * a], xy[2 * a + 1]);
        for (let i = a + 1; i <= b; i++) ctx.lineTo(xy[2 * i], xy[2 * i + 1]);
        const w = clamp((al - 0.3) / 0.6);
        ctx.strokeStyle = `rgba(${Math.round(205 + 31 * w)},${Math.round(210 + 28 * w)},255,${al})`;
        ctx.stroke();
      }
    }

    // trajectory with a bright comet head
    function drawPath(xy, n, nf, alphaBase, data, t, from = 0) {
      if (n < 1) return;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const tail = 70;
      const solidEnd = Math.max(0, n - tail);
      if (solidEnd > from) drawOld(xy, data, from, solidEnd, t);
      if (data) {
        // the comet tail starts from the dimmed path level (tails of me/you overlap before they part)
        const ae = Math.min(0.6, chunkAlpha(data, solidEnd, t));
        alphaBase = Math.max(0.1, solidEnd < DIVERGE ? 1 - Math.sqrt(1 - ae) : ae);
      }
      const segs = 14;
      for (let s = 0; s < segs; s++) {
        const a = solidEnd + Math.floor(((n - solidEnd) * s) / segs), b = solidEnd + Math.floor(((n - solidEnd) * (s + 1)) / segs);
        if (b <= a) continue;
        const k = (s + 1) / segs;
        ctx.beginPath();
        ctx.moveTo(xy[2 * a], xy[2 * a + 1]);
        for (let i = a + 1; i <= b; i++) ctx.lineTo(xy[2 * i], xy[2 * i + 1]);
        if (b === n && nf > 0) ctx.lineTo(xy[2 * n] + (xy[2 * n + 2] - xy[2 * n]) * nf, xy[2 * n + 1] + (xy[2 * n + 3] - xy[2 * n + 1]) * nf);
        // during the fast-forward the comets lose their tails (only the heads remain)
        const tk = 1 - clamp((t - 73.11) / 0.05);
        ctx.strokeStyle = `rgba(240,242,255,${(alphaBase + (1 - alphaBase) * k * k) * tk})`;
        ctx.lineWidth = 1.1 + 1.1 * k;
        ctx.stroke();
      }
    }
    function head(x, y, a = 1) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, 11);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`);
      g.addColorStop(0.25, `rgba(225,215,255,${0.55 * a})`);
      g.addColorStop(0.6, `rgba(180,160,255,${0.12 * a})`);
      g.addColorStop(1, 'rgba(150,140,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 11, y - 11, 22, 22);
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    }
    function ring(x, y, t, t0, r0, r1, dur = 0.35) {
      const k = (t - t0) / dur;
      if (k < 0 || k > 1) return;
      const e = 1 - Math.pow(1 - k, 3);
      ctx.beginPath();
      ctx.arc(x, y, r0 + (r1 - r0) * e, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(225,225,255,${0.85 * (1 - k)})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }

    function drawGlobe(t) {
      const k = clamp((t - 71.235) / 0.10);
      if (k <= 0) return;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(175,180,240,0.2)';
      for (const m of globe.meridians) {
        const n = Math.max(1, Math.round((m.length - 1) * k));
        ctx.beginPath();
        ctx.moveTo(m[0][0], m[0][1]);
        for (let i = 1; i <= n; i++) ctx.lineTo(m[i][0], m[i][1]);
        ctx.stroke();
      }
      for (const p of globe.parallels) {
        // Meridians are written first. The three parallels light together later.
        const a = clamp((t - 71.35) / .10);
        if (a <= 0) continue;
        ctx.strokeStyle = `rgba(175,180,240,${0.2 * a})`;
        ctx.beginPath();
        p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.stroke();
      }
      ctx.strokeStyle = `rgba(185,190,245,${0.3 * clamp((t - 71.35) / .10)})`;
      ctx.beginPath();
      ctx.arc(globe.cx, globe.cy, globe.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    function drawAxes(project, t) {
      const a = 1 - clamp((t - 71.35) / 0.2);
      if (a <= 0) return;
      const o = project(0, 0, 0);
      const axes = [['x', [22.5, 0, 0], 4001], ['y', [0, 26.5, 0], 4027], ['z', [0, 0, 50.5], 4055]];
      ctx.lineWidth = 1;
      for (const [name, v, pulse] of axes) {
        const p = project(...v);
        ctx.strokeStyle = `rgba(175,180,235,${0.3 * a})`;
        ctx.beginPath();
        ctx.moveTo(o[0], o[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
        // On successive beats a bright pulse runs out along each axis and fades at its tip.
        const k = Math.max(0, t * 60 - pulse);
        if (t * 60 >= pulse - 0.5 && k < 22) {
          const h = pwlv(PULSE_HEAD, k), tl = Math.max(0, h - pwlv(PULSE_LEN, k)), al = pwlv(PULSE_A, k);
          const hx = o[0] + (p[0] - o[0]) * h, hy = o[1] + (p[1] - o[1]) * h;
          const tx = o[0] + (p[0] - o[0]) * tl, ty = o[1] + (p[1] - o[1]) * tl;
          const g = ctx.createLinearGradient(tx, ty, hx, hy);
          g.addColorStop(0, 'rgba(235,238,255,0)');
          g.addColorStop(1, `rgba(245,247,255,${al})`);
          ctx.strokeStyle = g; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
          ctx.lineWidth = 1;
        }
        ctx.font = `italic 400 30px ${SERIF}`;
        ctx.fillStyle = `rgba(200,203,240,${a})`;
        ctx.textAlign = 'center';
        // label drift relative to the axis tip while the camera turns
        const off = name === 'y' ? [pwlv(LABEL_Y[0], t), pwlv(LABEL_Y[1], t)] : name === 'x' ? [pwlv(LABEL_X[0], t), pwlv(LABEL_X[1], t)] : [0, 0];
        ctx.fillText(name, p[0] + (name === 'x' ? 2 : 0) + off[0], p[1] - 12 + off[1]);
        ctx.textAlign = 'left';
      }
    }

    function plus(x, y, a) {
      ctx.strokeStyle = `rgba(146,149,187,${a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 7, y + 0.5); ctx.lineTo(x + 7, y + 0.5);
      ctx.moveTo(x + 0.5, y - 7); ctx.lineTo(x + 0.5, y + 7);
      ctx.stroke();
    }

    function render(t) {
      // Start every frame from a pristine 2D context so no state (joins, caps, dashes, filters…)
      // can leak from whatever frame was rendered before.
      if (ctx.reset) ctx.reset();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
      ctx.drawImage(bg, 0, 0, 1920, 1080);
      const project = camera(t);

      // ── right: 3D view ──
      drawGlobe(t);
      drawAxes(project, t);
      const pk = clamp((t - 68.0) / 0.1);
      if (pk > 0) {
        const c = Math.sqrt(BETA_RHO);
        const p1 = project(-c, -c, 27), p2 = project(c, c, 27);
        plus(p1[0], p1[1], pk);
        plus(p2[0], p2[1], pk);
      }

      let step = stepAt(t);
      let dense = 0;
      if (step === null) {
        // fast-forward: the path keeps growing while the cloud brightens
        const k = clamp((t - 73.233) / 0.52);
        const e = k * k * (3 - 2 * k);
        step = 4084 + (NDENSE - 4084) * e + Math.max(0, t - 73.753) * 60 * 23;
        dense = e;
      }
      const n = Math.min(NTOTAL, Math.floor(step)), nf = step - Math.floor(step);
      if (t >= 67.06) {
        project.into(me, n + 2, meXY);
        project.into(you, n + 2, youXY);
        if (n > 4084 || dense > 0) {
          drawDense(meXY, youXY, n, t);
        } else {
          drawPath(youXY, n, nf, 0.32, you, t, DIVERGE);
          drawPath(meXY, n, nf, 0.32, me, t, 0);
        }
        const ha = t < 73.2 ? 1 : t < 73.78 ? clamp(1 - (t - 73.2) / 0.05) : clamp((t - 73.78) / 0.07);
        const appear = clamp((t - 67.06) / 0.05);
        const hx = meXY[2 * n] + (meXY[2 * n + 2] - meXY[2 * n]) * nf, hy = meXY[2 * n + 1] + (meXY[2 * n + 3] - meXY[2 * n + 1]) * nf;
        const yx = youXY[2 * n] + (youXY[2 * n + 2] - youXY[2 * n]) * nf, yy = youXY[2 * n + 1] + (youXY[2 * n + 3] - youXY[2 * n + 1]) * nf;
        if (ha > 0 && t < 73.78) {
          head(yx, yy, ha * appear);
          head(hx, hy, ha * appear);
        }
        ring(hx, hy, t, 67.075, 4, 26);
        ring(hx, hy, t, 67.65, 8, 38);
        ring(hx, hy, t, 68.475, 8, 30);
      }

      // ── left: equations, readout, lyrics ──
      const fadeAll = 1 - clamp((t - 73.128) / 0.15);
      ctx.globalAlpha = fadeAll;
      EQ.forEach((ln, i) => drawWipe(eqImgs[i], 100, ln.y - 55, ln.w + 4, 110, ln.t0 < 0 ? 1 : (t - ln.t0) * ln.speed / (ln.w + 4 + ln.soft), ln.soft));
      readout(t, Math.min(step, NTOTAL));
      const fadeA = 1 - clamp((t - 70.093) / 0.106);
      if (fadeA > 0) {
        ctx.globalAlpha = fadeAll * fadeA;
        for (const [w, x, y, t50, col] of WORDS_A) word(w, x, y, t50, col, t);
      }
      ctx.globalAlpha = fadeAll;
      for (const [w, x, y, t50, col] of WORDS_B) word(w, x, y, t50, col, t);
      const fadeE = 1 - clamp((t - 70.343) / 0.095);
      if (fadeE > 0 && t >= 69.575) {
        ctx.globalAlpha = fadeE;
        bigWord('Execution', 121, 940, 69.575, 0.0291, t);
      }
      ctx.globalAlpha = 1;
      if (t >= 73.075) bigWord('Simulation', 120, 940, 73.075, 0.0296, t);
    }

    const glow = document.createElement('canvas');
    glow.width = 480; glow.height = 270;
    const gctx = glow.getContext('2d');
    function strands(c, xy, n, from, color, width) {
      const CH = 400;
      c.lineWidth = width;
      c.strokeStyle = color;
      for (let a = from; a < n; a += CH) {
        const b = Math.min(n, a + CH);
        c.beginPath();
        c.moveTo(xy[2 * a], xy[2 * a + 1]);
        for (let i = a + 1; i <= b; i++) c.lineTo(xy[2 * i], xy[2 * i + 1]);
        c.stroke();
      }
    }
    function drawDense(meXY, youXY, n, t) {
      const nd = Math.min(n, NDENSE);
      // early part of the path (what was on screen before the fast-forward)
      // the older path keeps its age/flash brightness across the switch to the dense cloud
      drawOld(meXY, me, 0, Math.min(nd, 4084), t);
      drawOld(youXY, you, DIVERGE, Math.min(nd, 4084), t);
      ctx.globalCompositeOperation = 'lighter';
      // thin strands accumulate additively into a lavender cloud
      for (const xy of [meXY, youXY]) strands(ctx, xy, nd, 4084, `rgba(240,204,226,${.040 * (.96 + .04 * clamp((t - 73.6) / .45))})`, 1);
      // soft glow: same strands at quarter resolution, upscaled
      gctx.setTransform(1, 0, 0, 1, 0, 0);
      gctx.clearRect(0, 0, 480, 270);
      gctx.setTransform(0.25, 0, 0, 0.25, 0, 0);
      gctx.globalCompositeOperation = 'lighter';
      for (const xy of [meXY, youXY]) strands(gctx, xy, nd, 4084, 'rgba(200,160,235,0.035)', 4);
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = 0.19;
      ctx.drawImage(glow, 0, 0, 1920, 1080);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // Returning comet tips follow their tracked screen positions (lorenz/comets.js), with continuous cubic tails.
      if (t >= 73.805) {
        const a = clamp((t - 73.805) / .012);
        const sample = (track, at) => {
          const q = Math.max(0, Math.min(track.length - 1, at * 60 - COMET_FRAME0));
          const i = Math.min(track.length - 2, Math.floor(q)), u = q - i;
          const p0 = track[Math.max(0,i-1)], p1 = track[i], p2 = track[i+1], p3 = track[Math.min(track.length-1,i+2)];
          return [0,1].map(j => .5 * ((2*p1[j]) + (-p0[j]+p2[j])*u + (2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*u*u + (-p0[j]+3*p1[j]-3*p2[j]+p3[j])*u*u*u));
        };
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (const track of COMETS) {
          const count = 20;
          for (let k = 0; k < count; k++) {
            const t0 = t - .085 + .085*k/count, t1 = t - .085 + .085*(k+1)/count;
            const p0 = sample(track,t0), p1 = sample(track,t1), strength = ((k+1)/count)**1.5;
            ctx.beginPath(); ctx.moveTo(...p0); ctx.lineTo(...p1);
            ctx.strokeStyle = `rgba(210,200,255,${a*.09*strength})`; ctx.lineWidth = 5; ctx.stroke();
            ctx.strokeStyle = `rgba(245,244,255,${a*.9*strength})`; ctx.lineWidth = 1.2 + .6*strength; ctx.stroke();
          }
          const tip = sample(track,t);
          const g = ctx.createRadialGradient(tip[0],tip[1],0,tip[0],tip[1],8);
          g.addColorStop(0,`rgba(255,255,255,${.7*a})`); g.addColorStop(.4,`rgba(220,210,255,${.3*a})`); g.addColorStop(1,'rgba(180,160,255,0)');
          ctx.fillStyle = g; ctx.fillRect(tip[0]-8,tip[1]-8,16,16);
          ctx.beginPath(); ctx.arc(tip[0],tip[1],1.9,0,Math.PI*2); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
        }
      }

    }

    return { render };
  },
};

const BETA_RHO = (8 / 3) * 27;
