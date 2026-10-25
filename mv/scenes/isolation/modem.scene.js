// "If I can, if I can feel your VIBRATIONS / Then I can, then I can finally be COMPLETION"
// A modem dialer panel (ATDT9W5550130): spectrogram of the dial/handshake tones written by a playhead,
// the lyric typed in Share Tech Mono below, a peach / lavender highlight bar on the key word.
// Everything is drawn on one Canvas2D; the spectrogram content is pre-rendered once in create().
import { clamp } from '../../engine/lib/anim.js';
import { HANDSHAKE_CONTOURS } from './lib/handshake-contours.js';
import { TRAINING_CONTOURS } from './lib/training-contours.js';

const T0 = 103.6;
const SPB = 60 / 130;
const FONT = '"Share Tech Mono"';
const frameTime = (t) => Math.round(t * 60) / 60;

// Geometry measured on the original frames.
const PANEL = { x: 280, y: 130, w: 1360, h: 820, r: 22 };
const PLOT = { x0: 380, y0: 250, x1: 1607, y1: 601 };
const fy = (f) => 602 - 0.088 * f; // Hz -> y
const playX = (t) => 461 + 174 * (t - T0);
const timeAtX = (x) => T0 + (x - 461) / 174;

const C = {
  backdrop: '#0d0e15',
  panel: '#23242d',
  border: '#41424b',
  sep: '#34353f',
  plot: '#1b1c25',
  grid: '#3a3b45',
  axis: '#a5a6af',
  white: '#f2f2f8',
  dim: '#a9aab4',
  lav: '#adb0f6',
  peach: '#fdc0a0',
  your: '#f9c8b3',
  barText: '#22192a',
};

// Lyric typing schedule: [time, number of visible characters]
const LINES = [
  { text: 'If I can', y: 725, from: 103.4, to: 107.2,
    keys: [[103.467, 2], [103.817, 4], [104.183, 6], [104.2, 7], [104.217, 8]] },
  { text: 'If I can feel your', y: 785, from: 104.4, to: 107.2, peach: [14, 18],
    keys: [[104.417, 1], [104.433, 2], [104.733, 4], [105.117, 6], [105.133, 7], [105.15, 8], [105.367, 10],
      [105.383, 11], [105.4, 12], [105.417, 13], [105.833, 15], [105.85, 16], [105.867, 17], [105.883, 18]] },
  { text: 'Then I can', y: 725, from: 107.2, to: 999,
    keys: [[107.2, 1], [107.217, 2], [107.233, 3], [107.25, 4], [107.7, 6], [107.867, 8], [107.883, 9], [107.9, 10]] },
  { text: 'Then I can finally be', y: 785, from: 108.1, to: 999,
    keys: [[108.167, 1], [108.183, 2], [108.2, 3], [108.217, 4], [108.483, 6], [108.833, 8], [108.85, 9], [108.867, 10],
      [109.033, 12], [109.05, 14], [109.067, 15], [109.083, 16], [109.1, 18], [109.983, 20], [110.0, 21]] },
];
const ALL_KEYS = LINES.flatMap((l, i) => l.keys.map(([t]) => [t, i])).sort((a, b) => a[0] - b[0]);

// Dial string: each character lights up when the playhead reaches its tone.
const TITLE = 'ATDT9W5550130';
const TITLE_ON = [0, 0, 0, 0, 103.59, 103.917, 104.05, 104.283, 104.517, 104.75, 104.983, 105.217, 105.42];

const DIGITS = [ // label, x, low Hz, high Hz
  ['9', 470, 852, 1477], ['W', 517, 0, 0], ['5', 550, 770, 1336], ['5', 590, 770, 1336], ['5', 630, 770, 1336],
  ['0', 670, 941, 1336], ['1', 710, 697, 1209], ['3', 750, 697, 1477], ['0', 790, 941, 1336],
];
const LABELS = [ // text, x, colour, appears when the playhead reaches x
  ['DTMF', 460, '#c3c5f2'], ['ANSam 2100 Hz', 941, '#f6d2c0'], ['CM', 1101, '#c8c6f2'], ['JM', 1182, '#efd3c6'],
  ['V.34 probing', 1342, '#e1e1ef'], ['training', 1502, '#e1e1ef'],
];
const LEDS = ['HS', 'AA', 'CD', 'OH', 'RD', 'SD', 'TR', 'MR'];

// Tones currently sounding under the playhead (for the bright write-head dots).
const ACTIVE = [
  [380, 467, [350, 440], '#d8daea', 'early'], [493, 547, [350, 440], '#d8daea', 'early'],
  ...DIGITS.filter((d) => d[2]).map(([, x, lo, hi]) => [x - 13, x + 13, [lo, hi], '#ffffff', 'early']),
  [860, 932, [440, 480], '#d8daea', 'early'], [941, 1185, [2100], '#fff1e8'],
  [1097, 1267, [1090], '#e9eaff'], [1179, 1267, [1760], '#fff0e6'],
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- static layer: backdrop, panel, axes ----------
function drawStatic(ctx) {
  const g = ctx.createRadialGradient(960, 540, 100, 960, 540, 1100);
  g.addColorStop(0, '#0f1018');
  g.addColorStop(1, C.backdrop);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1920, 1080);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 22;
  roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r);
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, PANEL.x + 0.5, PANEL.y + 0.5, PANEL.w - 1, PANEL.h - 1, PANEL.r);
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = C.sep;
  ctx.fillRect(PANEL.x + 1, 226, PANEL.w - 2, 1);

  roundRect(ctx, PLOT.x0, PLOT.y0, PLOT.x1 - PLOT.x0, PLOT.y1 - PLOT.y0, 6);
  ctx.fillStyle = C.plot;
  ctx.fill();
  ctx.fillStyle = C.grid;
  for (const y of [338, 426, 514]) ctx.fillRect(PLOT.x0, y, PLOT.x1 - PLOT.x0, 1);

  ctx.font = `14px ${FONT}`;
  ctx.fillStyle = C.axis;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText('4000 Hz', 312, 255);
  ctx.fillText('3000', 312, 343);
  ctx.fillText('2000', 312, 431);
  ctx.fillText('1000', 312, 519);
  ctx.textAlign = 'center';
  LEDS.forEach((l, i) => ctx.fillText(l, 1279 + 46 * i, 202));

  ctx.fillStyle = '#5c5d68';
  for (let k = 0; k < 16; k++) {
    const x = Math.round(380 + 80.2 * k);
    ctx.fillRect(x, 608, 1, k % 4 === 1 ? 10 : 5);
  }
}

// ---------- spectrogram content (drawn once) ----------
function drawContent(ctx, rng) {
  const lav = [173, 176, 246];
  const pch = [253, 192, 160];
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

  const hline = (x0, x1, y, h, col, blur = 1) => {
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = col;
    ctx.fillRect(x0, y - h / 2, x1 - x0, h);
    ctx.filter = 'none';
  };
  const capsule = (x0, x1, y, h, col, blur) => {
    ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = col;
    roundRect(ctx, x0, y - h / 2, x1 - x0, h, h / 2);
    ctx.fill();
    ctx.filter = 'none';
  };

  // Dial/ringback tones have broad dim skirts and a thicker, grey core.
  // A hard time-window cuts their ends rather than adding rounded horizontal glow.
  for (const [x0, x1, fs] of [[380, 467, [350, 440]], [493, 547, [350, 440]], [860, 932, [440, 480]]]) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0 - .7, 545, x1 - x0 + 1.5, 45);
    ctx.clip();
    const tone = ctx.createLinearGradient(x0 - .7, 0, x1 + .8, 0);
    tone.addColorStop(0, `rgba(162,165,187,${x0 === 380 ? 1 : .65})`);
    tone.addColorStop(Math.min(.2, 9 / (x1 - x0)), '#a2a5bb');
    tone.addColorStop(1 - Math.min(.2, 7 / (x1 - x0)), '#a2a5bb');
    tone.addColorStop(1, 'rgba(162,165,187,.65)');
    for (const f of fs) {
      hline(x0 - .7, x1 + .8, fy(f), 10.5, 'rgba(170,172,200,0.25)', 3);
      hline(x0 - .7, x1 + .8, fy(f), 4.5, tone, 1);
    }
    ctx.restore();
  }

  // DTMF FFT bins: flat cut-off at each end, thick lobes and a narrow dark neck.
  // The shared analytic field is fitted to native tone widths; its fine variation
  // is deterministic and does not consume the later handshake texture's RNG.
  for (const [, x, lo, hi] of DIGITS) {
    if (!lo) continue;
    for (const f of [lo, hi]) {
      const cx = x + .29 + (x - 470) * .00239;
      const cy = fy(f);
      const left = Math.floor(cx - 21), top = Math.floor(cy - 19);
      const mark = makeCanvas(43, 39), mc = mark.getContext('2d');
      const pixels = mc.createImageData(43, 39);
      const phase = x * .17 + f * .013;
      for (let j = 0; j < 39; j++) for (let i = 0; i < 43; i++) {
        const dx = left + i + .5 - cx, dy = top + j + .5 - cy;
        const ends = Math.exp(-Math.pow((Math.abs(dx) - 8.7) / 3.6, 4));
        const rough = .16 * Math.sin(dy * 2.3 + phase) + .1 * Math.sin(dy * .8 - phase);
        const window = 1 / (1 + Math.exp((Math.abs(dx) - 12.55 - rough) / .654));
        const core = 110.22 * (1 - .199 * ends) *
          Math.exp(-.5 * Math.pow(Math.abs(dy) / (2.292 + 1.763 * ends), 2.897));
        const haze = 78.7 * Math.exp(-.5 * Math.pow(dy / 4.721, 2));
        const grain = 1 + .018 * Math.sin(dx * 1.7 + dy * .8 + phase) +
          .013 * Math.sin(dx * .47 - dy * 2.1 - phase);
        const v = window * (core + haze) * grain;
        const alpha = Math.min(1, v / 150);
        if (alpha < 1 / 255) continue;
        const k = v / alpha, n = (j * 43 + i) * 4;
        pixels.data[n] = 27 + .9 * k;
        pixels.data[n + 1] = 28 + .89 * k;
        pixels.data[n + 2] = 37 + (1.42 - .002 * v) * k;
        pixels.data[n + 3] = alpha * 255;
      }
      mc.putImageData(pixels, 0, 0);
      ctx.drawImage(mark, left, top);
    }
  }

  // ANSam 2100 Hz with 15 Hz AM beads and two phase reversals
  const ya = fy(2100);
  hline(939, 1186, ya, 16, 'rgba(150,110,95,0.45)', 3);
  capsule(939, 1187, ya, 8, '#e8b79c', 1.2);
  hline(942, 1184, ya, 3.4, '#fbe2d8', 0.7);
  for (let x = 943; x < 1184; x += 4.2) {
    ctx.fillStyle = 'rgba(255,240,232,0.35)';
    ctx.fillRect(x, ya - 2.5, 2, 5);
  }
  for (const xr of [941, 1021, 1101]) {
    const hh = xr === 941 ? 14 : 23;
    ctx.filter = 'blur(1.5px)';
    ctx.fillStyle = '#efbb9c';
    ctx.beginPath();
    ctx.moveTo(xr, ya - hh);
    ctx.quadraticCurveTo(xr + 5, ya, xr, ya + hh);
    ctx.quadraticCurveTo(xr - 5, ya, xr, ya - hh);
    ctx.fill();
    ctx.filter = 'none';
  }

  const mix = (c, k, add = 0) => c.map((v) => Math.round(Math.min(255, v * k + add)));
  // FSK "puff" clouds (V.8 CM / JM): dim bumpy caps above/below a light body, horizontally smeared
  const puffs = (x0, x1, yc, col, n) => {
    const w = (x1 - x0) / n;
    ctx.filter = 'blur(5px)';
    ctx.fillStyle = rgba(mix(col, 0.5), 0.22);
    ctx.fillRect(x0, yc - 30, x1 - x0, 60);
    for (let i = 0; i < n; i++) {
      const cx = x0 + w * (i + 0.5);
      ctx.filter = 'blur(1.3px)';
      ctx.fillStyle = rgba(mix(col, 0.62), 0.55);
      roundRect(ctx, cx - w * 0.36, yc - 31, w * 0.72, 17, 6);
      ctx.fill();
      roundRect(ctx, cx - w * 0.36, yc + 14, w * 0.72, 17, 6);
      ctx.fill();
      ctx.fillStyle = rgba(mix(col, 0.35), 0.8);
      for (const dy of [-26, -21, 19, 24]) ctx.fillRect(cx - w * 0.3 + rng() * 4, yc + dy, w * 0.5, 1.6);
      ctx.fillStyle = rgba(mix(col, 1.0, 12), .82);
      roundRect(ctx, cx - w * 0.52, yc - 16, w * 1.04, 32, 7);
      ctx.fill();
      ctx.fillStyle = rgba(mix(col, 0.8), 0.45);
      for (let k = 0; k < 34; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + (rng() - 0.5) * w * 1.0, yc + (rng() - 0.5) * 31, 2.5 + rng() * 3, .7 + rng() * 1.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = rgba(mix(col, 1.0, 25), 0.62);
      ctx.beginPath();
      ctx.ellipse(cx, yc + 26, w * 0.26, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.filter = 'none';
    }
  };
  puffs(1097, 1255, fy(1090), lav, 5);
  hline(1255, 1267, fy(1090), 46, rgba(lav, 0.5), 2);
  puffs(1179, 1267, fy(1760), pch, 3);

  // INFO / probing preamble blobs: narrow bumpy columns
  const tallBlob = (x0, x1, y0, y1, col) => {
    ctx.filter = 'blur(1.4px)';
    ctx.fillStyle = rgba(mix(col, 0.92), .78);
    roundRect(ctx, x0 + 2, y0, x1 - x0 - 4, y1 - y0, 7);
    ctx.fill();
    ctx.fillStyle = rgba(mix(col, 0.7), 0.7);
    for (let y = y0 + 4; y < y1 - 3; y += 6.5) {
      ctx.fillRect(x0 + 1, y, 3, 2);
      ctx.fillRect(x1 - 4, y + 3, 3, 2);
      ctx.fillRect(x0 + 4 + rng() * (x1 - x0 - 10), y + 1, 4, 1.5);
    }
    ctx.filter = 'none';
  };
  tallBlob(1274, 1295, 350, 430, pch);
  tallBlob(1274, 1293, 457, 535, lav);
  hline(1295, 1340, 387, 6, rgba(pch, 0.95), 1.2);
  hline(1293, 1335, 496, 5, rgba(lav, 0.95), 1.2);
  for (const [x, y, col] of [[1318, 387, pch], [1330, 387, pch], [1322, 496, lav]]) {
    ctx.filter = 'blur(1.5px)';
    ctx.fillStyle = rgba(col, 1);
    ctx.beginPath();
    ctx.ellipse(x, y, 4, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.filter = 'none';
  }
  // (the two bow-tie connectors at x 1400-1421 are measured contours, see TRAINING_CONTOURS)

  // V.34 line probing: tones every 150 Hz, 900/1200/1800/2400 omitted
  const probe = (x0, x1, col, strength) => {
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.filter = 'blur(2px)';
    ctx.fillStyle = rgba(mix(col, 0.42), 0.55);
    ctx.fillRect(x0, fy(3790), x1 - x0, fy(110) - fy(3790));
    ctx.filter = 'blur(0.8px)';
    for (let k = 1; k <= 25; k++) {
      const f = 150 * k;
      if ([900, 1200, 1800, 2400].includes(f)) continue;
      ctx.fillStyle = rgba(mix(col, 0.98), 1);
      ctx.fillRect(x0, fy(f) - 2, x1 - x0, 4);
      ctx.fillStyle = rgba(mix(col, 1, 30), 0.8);
      ctx.fillRect(x0 + 2, fy(f) - 0.8, (x1 - x0) * 0.55, 1.6);
    }
    ctx.filter = 'none';
    ctx.restore();
  };
  probe(1340, 1400, pch, .75);
  probe(1420, 1470, lav, .85);
  tallBlob(1471, 1495, 350, 430, pch);
  ctx.filter = 'blur(2px)';
  ctx.fillStyle = rgba(mix(lav, 0.85), 1);
  roundRect(ctx, 1471, 457, 34, 78, 8);
  ctx.fill();
  ctx.filter = 'none';
  puffs(1471, 1505, 496, mix(lav, 0.95), 1);

  // (training blocks: drawn from measured contours below, after the handshake lobes)

  // The handshake is a spectral density field, with uneven lobes and ridges.
  // Replace the regular capsule approximation with its measured vector contours.
  // Training blocks: a lavender comb of horizontal lines then pink noise. Their measured contours
  // replace the earlier procedural sine-ridge texture, which read as a regular herringbone.
  for(const [box,layers] of [...HANDSHAKE_CONTOURS, ...TRAINING_CONTOURS]){
    ctx.clearRect(...box);
    for(const [color,alpha,d] of layers){
      ctx.fillStyle=`rgba(${color.join(',')},${alpha})`;
      ctx.fill(new Path2D(d),'evenodd');
    }
  }
}

export default {
  id: 'isolation/modem',
  start: 103.6,
  end: 110.9333,
  fonts: [`400 50px ${FONT}`],
  create(root, env) {
    const { ctx } = env.canvas(root);
    const stat = makeCanvas(1920, 1080);
    drawStatic(stat.getContext('2d'));
    const content = makeCanvas(1920, 1080);
    drawContent(content.getContext('2d'), env.rng(7));
    const scratch = makeCanvas(64, 400);
    const sctx = scratch.getContext('2d');

    const typedCount = (keys, t) => {
      let n = 0;
      for (const [kt, c] of keys) if (t + 1e-7 >= frameTime(kt)) n = c;
      return n;
    };

    return {
      render(t) {
        ctx.drawImage(stat, 0, 0);
        const px = Math.min(Math.round(playX(t)), PLOT.x1);

        // spectrogram content written up to the playhead
        if (px > PLOT.x0) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(PLOT.x0, PLOT.y0, px - PLOT.x0, PLOT.y1 - PLOT.y0);
          ctx.clip();
          ctx.drawImage(content, 0, 0);
          ctx.restore();
          // freshly written ink is brighter; once the playhead has reached the end (110.2) this glow
          // decays linearly over 0.27 s (measured on the last 28 px of the training block)
          const inkA = t >= 110.2 ? clamp(1 - (t - 110.2) / 0.27) : 1;
          const w = 28;
          sctx.clearRect(0, 0, 64, 400);
          sctx.globalCompositeOperation = 'source-over';
          sctx.drawImage(content, px - w, PLOT.y0, w, 351, 0, 0, w, 351);
          sctx.globalCompositeOperation = 'source-in';
          const gr = sctx.createLinearGradient(0, 0, w, 0);
          gr.addColorStop(0, 'rgba(255,255,255,0)');
          gr.addColorStop(1, `rgba(255,255,255,${0.75 * inkA})`);
          sctx.fillStyle = gr;
          sctx.fillRect(0, 0, w, 351);
          ctx.drawImage(scratch, 0, 0, w, 351, px - w, PLOT.y0, w, 351);
        }

        // playhead with a glow that flashes at the start and pulses on the scene's beat
        const done = t >= 110.2;
        const headA = done ? clamp(1 - (t - 110.2) / 0.15) : 1;
        if (headA > 0) {
          const sb = (t - T0) / SPB;
          // start flash, then a beat pulse measured on the original: rises over ~2 frames, decays in ~0.15 s,
          // brightens the few px right of the head rather than widening the glow
          const db = ((((t - T0 + 0.017) / SPB) % 1) + 1) % 1 * SPB;   // original's pulse leads the grid by ~1 frame
          const pulse = 0.5 * clamp(db / 0.033) * Math.exp(-db / 0.15);
          const start = Math.exp(-(t - T0) / 0.22);
          const glow = start + pulse;
          const gw = 6 + 26 * Math.min(1, start) + 6 * pulse;
          const g = ctx.createLinearGradient(px - gw * 0.6, 0, px + gw, 0);
          g.addColorStop(0, 'rgba(225,228,255,0)');
          g.addColorStop(0.38, `rgba(225,228,255,${0.55 * Math.min(1, glow) * headA})`);
          g.addColorStop(1, 'rgba(225,228,255,0)');
          ctx.fillStyle = g;
          ctx.fillRect(px - gw * 0.6, PLOT.y0, gw * 1.6, PLOT.y1 - PLOT.y0);
          ctx.fillStyle = `rgba(255,255,255,${0.95 * headA})`;
          ctx.fillRect(px - 1, PLOT.y0, 2, PLOT.y1 - PLOT.y0);
          // write-head dots on the tones currently sounding
          for (const [x0, x1, fs, col, kind] of ACTIVE) {
            if (px < x0 || px > x1 + 2) continue;
            for (const f of fs) {
              const y = fy(f);
              ctx.save();
              if (kind === 'early') {
                ctx.beginPath();
                ctx.rect(PLOT.x0, PLOT.y0, px - PLOT.x0, PLOT.y1 - PLOT.y0);
                ctx.clip();
              }
              ctx.shadowColor = col;
              ctx.shadowBlur = kind === 'early' ? 6 : 10;
              ctx.fillStyle = col;
              ctx.beginPath();
              ctx.ellipse(px - (kind === 'early' ? 3 : 2), y,
                kind === 'early' ? 3.9 : 4, kind === 'early' ? 4.1 : 4.5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }
          }
        }

        // title: dial string lights up digit by digit
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `28px ${FONT}`;
        for (let i = 0; i < TITLE.length; i++) {
          const k = clamp((t - frameTime(TITLE_ON[i])) / 0.05);
          const v = Math.round(168 + (243 - 168) * k);
          ctx.fillStyle = `rgb(${v},${v},${Math.min(255, v + 6)})`;
          ctx.fillText(TITLE[i], 311 + 15.12 * i, 173);
        }
        if (done) {
          ctx.font = `19px ${FONT}`;
          ctx.fillStyle = C.white;
          ctx.fillText('CONNECT 33600', 311, 202);
        }

        // modem status LEDs
        const rdOn = [[110.2, 110.267], [110.3, 110.35], [110.517, 110.583], [110.75, 110.817]].some(([a, b]) => t >= a && t < b);
        LEDS.forEach((l, i) => {
          let on = l === 'OH' || l === 'TR' || l === 'MR';
          let col = '#f4f4f8';
          if (done && l === 'HS') on = true;
          if (done && l === 'CD') { on = true; col = '#fdc0a0'; }
          if (l === 'RD' && rdOn) on = true;
          const x = 1279 + 46 * i;
          ctx.save();
          if (on) { ctx.shadowColor = col; ctx.shadowBlur = 8; }
          ctx.fillStyle = on ? col : '#55565f';
          ctx.beginPath();
          ctx.arc(x, 166, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // digit labels and band labels
        ctx.font = `15.5px ${FONT}`;
        ctx.textAlign = 'center';
        for (const [d, x] of DIGITS) {
          const a = clamp((playX(t) - (x + 12)) / 8);
          if (a <= 0) continue;
          ctx.fillStyle = `rgba(215,213,246,${a})`;
          ctx.fillText(d, x, 451);
        }
        ctx.textAlign = 'left';
        for (const [txt, x, col] of LABELS) {
          const a = x <= 461 ? 1 : clamp((t - timeAtX(x)) / 0.1);
          if (a <= 0) continue;
          ctx.globalAlpha = a;
          ctx.fillStyle = col;
          ctx.font = `${txt.length > 2 && x > 900 ? 15 : 15.5}px ${FONT}`;
          ctx.fillText(txt, x, 640);
          ctx.globalAlpha = 1;
        }

        // typed lyric
        ctx.font = `50.5px ${FONT}`;
        const adv = 27.27;
        let lastKey = -1;
        for (const [kt] of ALL_KEYS) if (frameTime(kt) <= t + 1e-7) lastKey = frameTime(kt);
        let cursor = null;
        for (const L of LINES) {
          if (t < L.from || t >= L.to) continue;
          const n = typedCount(L.keys, t);
          if (n <= 0) continue;
          for (let i = 0; i < n; i++) {
            const ch = L.text[i];
            if (ch === ' ') continue;
            ctx.fillStyle = L.peach && i >= L.peach[0] && i < L.peach[1] ? C.your : C.white;
            ctx.fillText(ch, 380.5 + adv * i, L.y);
          }
          cursor = { x: 380.5 + 27.3 * n, y: L.y };
        }
        // caret blink phase measured on the original's toggles (frames 6299, 6368, 6382, ..., 6645): 0.4 frame before T0
        const blinkOn = ((((t - 103.5925) / SPB) % 1) + 1) % 1 < 0.5;
        if (cursor && (t - lastKey < 0.2 || blinkOn)) {
          ctx.fillStyle = C.lav;
          ctx.fillRect(Math.round(cursor.x), cursor.y - 34, 26, 35);
        }

        // highlight bar
        const bar = t + 1e-7 >= 6379 / 60 && t < 107.2 ? ['Vibrations', C.peach] : t >= 110.2 ? ['Completion', C.lav] : null;
        if (bar) {
          ctx.fillStyle = bar[1];
          ctx.fillRect(380, 858, 1227, 59);
          ctx.fillStyle = C.barText;
          ctx.fillText(bar[0], 407, 905);
        }
      },
    };
  },
};
