// 59.30–62.93 "If I can, if I can give you all the SIMULATIONS"
// A LaTeX-style figure: 24 captioned panels (7 columns × 4 rows) appear one per 16th note,
// each a live mini simulation; the panel frames turn dark in a diagonal wave on "Simulations".
import { PANELS, PW, PH } from './grid/panels.js';
import { vignetteCanvas, loadLocalFont, clamp } from './lib/common.js';

const START = 59.30, END = 62.93;
const COLS = 7, X0 = 120, Y0 = 96, DX = 244, DY = 224;
const STEP = 60 / 130 / 4;           // one panel per 16th note
const FIRST = 59.283;                 // frame of panel (a) starts drawing
const DRAW = 0.05;                    // border draw-on duration
const LIGHT = 'rgb(188,188,188)', DARK = 'rgb(46,36,150)', MARK = 'rgb(165,165,165)';
const CAPTION_TEXT = '#151515', TEXT = '#121212', TITLE_TEXT = '#212121';

// background: RGB polynomial vignette
const BG = [
  [245.88, -10.30, 0.21, -0.17, -1.53, -2.75, 0.01, 0.01],
  [246.34, -11.10, -0.22, 0.12, -2.06, -1.90, 0, 0.23],
  [244.87, -8.55, 1.25, -0.82, -0.55, -4.59, 0.05, -0.43],
];

const LYRIC = [ // word, left x of ink, time
  ['If', 178, 59.30], ['I', 217, 59.60], ['can', 244, 59.70],
  // reset at 60.183, then the line is sung again
  ['If', 178, 60.183], ['I', 217, 60.50], ['can', 244, 60.817], ['give', 316, 61.067], ['you', 395, 61.333],
  ['all', 470, 61.567], ['the', 523, 62.00],
];

const BORDER_ONSET = [3560, 3565, 3572, 3579, 3586, 3593, 3600, 3607, 3614, 3621, 3628, 3635, 3641, 3648, 3655, 3662, 3670, 3676, 3683, 3690, 3697, 3704, 3711, 3717];
const slots = [];
for (let r = 0; r < 4; r++) for (let c = 0; c < COLS; c++) if (r < 3 || c >= 4) slots.push({ r, c, x: X0 + DX * c, y: Y0 + DY * r });

function borderPath(ctx, x, y, p, color) {
  // two strokes from the top-left corner meeting at the bottom-right: top→right and left→bottom
  if (p <= 0) return;
  const w = PW - 1, h = PH - 1, half = w + h;
  const d = p * half;
  ctx.beginPath();
  // stroke A
  ctx.moveTo(x + 0.5, y + 0.5);
  ctx.lineTo(x + 0.5 + Math.min(d, w), y + 0.5);
  if (d > w) ctx.lineTo(x + 0.5 + w, y + 0.5 + Math.min(d - w, h));
  // stroke B
  ctx.moveTo(x + 0.5, y + 0.5);
  ctx.lineTo(x + 0.5, y + 0.5 + Math.min(d, h));
  if (d > h) ctx.lineTo(x + 0.5 + Math.min(d - h, w), y + 0.5 + h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
}

function cropMarks(ctx, x, y) {
  const w = PW - 1, h = PH - 1, a = 7;
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.moveTo(cx + 0.5 + sx * a, cy + 0.5);
    ctx.lineTo(cx + 0.5, cy + 0.5);
    ctx.lineTo(cx + 0.5, cy + 0.5 + sy * a);
  }
  ctx.strokeStyle = MARK;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export default {
  id: 'simulation/grid',
  start: START,
  end: END,
  async create(root, env) {
    await Promise.all([
      loadLocalFont('LMRoman12', 'lmroman12-regular.otf'),
      loadLocalFont('LMRoman12B', 'lmroman12-bold.otf', { weight: '700' }),
    ]);
    const { ctx } = env.canvas(root);
    const bg = vignetteCanvas(BG);
    for (const [, p] of PANELS) p.setup?.();

    function render(t) {
      if (ctx.reset) ctx.reset(); // pristine 2D state every frame
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(bg, 0, 0, 1920, 1080);

      slots.forEach((s, k) => {
        const t0 = FIRST + k * STEP;
        const [caption, panel] = PANELS[k];
        cropMarks(ctx, s.x, s.y);
        // dark border: diagonal wave (1/8 beat per diagonal step) starting at the lower left
        const td = 62.117 + (STEP / 2) * (s.c + 2 - s.r);
        const pd = clamp((t - td) / 0.055);
        // Draw each border on its sixteenth-note entrance.
        const pl = clamp((t - (k ? BORDER_ONSET[k] / 60 - 0.0225 : t0)) / DRAW);
        if (pd < 1) borderPath(ctx, s.x, s.y, pl, LIGHT);
        if (pd > 0) borderPath(ctx, s.x, s.y, pd, DARK);
        if (t >= t0 + 0.101) {
          ctx.font = '400 20px LMRoman12';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = CAPTION_TEXT;
          ctx.fillText(caption, s.x + PW / 2, s.y + 205);
        }
        const tc = t0 + 0.117;
        if (t >= tc) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(s.x + 1, s.y + 1, PW - 2, PH - 2);
          ctx.clip();
          ctx.translate(s.x, s.y);
          panel.draw(ctx, t - tc, t);
          ctx.restore();
        }
      });

      // The lower-left text follows the typeset body-text layout.
      ctx.font = '400 40.6px LMRoman12';
      ctx.textAlign = 'left';
      ctx.fillStyle = TEXT;
      const reset = 60.183;
      // Reveal each word on the nearest frame boundary.
      const on = (tw) => t * 60 >= Math.round(tw * 60) - 0.5;
      for (const [w, x, tw] of LYRIC) {
        if (!on(tw)) continue;
        if (tw < reset && on(reset)) continue;
        ctx.fillText(w, x - 1, 840);
        if (w === 'you') {
          ctx.fillStyle = 'rgb(168,70,40)';
          ctx.fillRect(400, 854, 62, 2);
          ctx.fillStyle = TEXT;
        }
      }
      if (on(62.067)) {
        ctx.font = '700 58px LMRoman12B';
        ctx.fillStyle = TITLE_TEXT;
        ctx.fillText('2', 119, 971);
        ctx.fillText('Simulations', 210, 971);
      }
    }
    return { render };
  },
};
