// 62.93–66.63 "Then I can, then I can be your only SATISFACTION"
// Vivid blue screen, a Tetris well (10×20) whose game was read off the reference move by move:
// a T drops, a J is steered in, an I hard-drops into the right column and clears four lines.
import { vignetteCanvas, clamp, pwl } from './lib/common.js';
import { layout, drawPixelText } from './lib/pixelfont.js';

const START = 62.93, END = 66.63;
const WX = 1240, WY = 140, CELL = 40;

const BG = [
  [47.34, -3.99, -0.54, -0.21, -0.29, -0.3, -0.04, -0.02],
  [52.22, -3.98, 0.26, 0.48, -0.98, -1.07, -0.06, -0.01],
  [199.8, -10.51, -0.23, -5.25, -2.23, -5.08, -0.2, -0.05],
];

const COL = {
  T: [159, 162, 241], Z: [168, 172, 226], J: [170, 174, 243], O: [197, 200, 237],
  S: [218, 220, 249], L: [142, 146, 238], I: [242, 184, 158], active: [189, 193, 247],
};

// locked stack at 62.93 (cells [row, col]) with piece type
const STACK = [
  ['J', [[6, 8], [7, 8], [8, 7], [8, 8]]], ['T', [[7, 0], [8, 0], [8, 1], [9, 0]]],
  ['Z', [[7, 1], [7, 2], [8, 2], [8, 3]]], ['S', [[8, 5], [8, 6], [9, 4], [9, 5]]],
  ['T', [[9, 1], [9, 2], [9, 3], [10, 2]]], ['J', [[9, 6], [9, 7], [9, 8], [10, 8]]],
  ['O', [[10, 0], [10, 1], [11, 0], [11, 1]]], ['S', [[10, 3], [10, 4], [11, 2], [11, 3]]],
  ['S', [[10, 5], [11, 5], [11, 6], [12, 6]]], ['Z', [[10, 6], [10, 7], [11, 7], [11, 8]]],
  ['L', [[11, 4], [12, 2], [12, 3], [12, 4]]], ['L', [[12, 0], [13, 0], [14, 0], [14, 1]]],
  ['J', [[12, 1], [13, 1], [13, 2], [13, 3]]], ['Z', [[12, 5], [13, 4], [13, 5], [14, 4]]],
  ['O', [[12, 7], [12, 8], [13, 7], [13, 8]]], ['T', [[13, 6], [14, 5], [14, 6], [15, 6]]],
  ['Z', [[14, 2], [14, 3], [15, 3], [15, 4]]], ['J', [[14, 7], [14, 8], [15, 7], [16, 7]]],
  ['O', [[15, 0], [15, 1], [16, 0], [16, 1]]], ['S', [[15, 2], [16, 2], [16, 3], [17, 3]]],
  ['T', [[15, 5], [16, 4], [16, 5], [16, 6]]], ['J', [[15, 8], [16, 8], [17, 7], [17, 8]]],
  ['L', [[17, 0], [17, 1], [17, 2], [18, 0]]], ['S', [[17, 4], [18, 4], [18, 5], [19, 5]]],
  ['L', [[17, 5], [17, 6], [18, 6], [19, 6]]], ['T', [[18, 1], [19, 0], [19, 1], [19, 2]]],
  ['Z', [[18, 2], [18, 3], [19, 3], [19, 4]]], ['O', [[18, 7], [18, 8], [19, 7], [19, 8]]],
];

// active pieces: [time, cells] keyframes (row, col); lock = when the next piece spawns
const MOVES = [
  { type: 'T', lock: 3804 / 60, flash: 3804, keys: [
    [62.0, [[5, 3], [5, 4], [5, 5], [6, 4]]], [62.967, [[6, 3], [6, 4], [6, 5], [7, 4]]], [63.2, [[7, 3], [7, 4], [7, 5], [8, 4]]]] },
  { type: 'J', spawn: 63.433, lock: 3888 / 60, flash: 3888, keys: [
    [63.433, [[1, 3], [2, 3], [2, 4], [2, 5]]], [63.633, [[1, 4], [2, 4], [2, 5], [2, 6]]],
    [63.667, [[2, 4], [3, 4], [3, 5], [3, 6]]], [63.867, [[3, 4], [4, 4], [4, 5], [4, 6]]],
    [63.9, [[3, 5], [4, 5], [5, 4], [5, 5]]], [64.1, [[4, 5], [5, 5], [6, 4], [6, 5]]],
    [64.333, [[4, 6], [5, 6], [6, 5], [6, 6]]], [64.567, [[5, 7], [6, 7], [7, 6], [7, 7]]]] },
  { type: 'I', spawn: 64.833, lock: 1e9, keys: [
    [64.833, [[0, 3], [0, 4], [0, 5], [0, 6]]], [64.9, [[0, 4], [0, 5], [0, 6], [0, 7]]],
    [64.933, [[0, 5], [0, 6], [0, 7], [0, 8]]], [64.967, [[0, 6], [0, 7], [0, 8], [0, 9]]],
    [65.033, [[1, 6], [1, 7], [1, 8], [1, 9]]], [65.267, [[1, 8], [2, 8], [3, 8], [4, 8]]],
    [65.367, [[1, 9], [2, 9], [3, 9], [4, 9]]], [65.5, [[2, 9], [3, 9], [4, 9], [5, 9]]],
    [65.733, [[16, 9], [17, 9], [18, 9], [19, 9]]]] },
];
const NEXT = [[-1, 'J'], [63.433, 'I'], [64.833, 'S']];
const SHAPES = {
  J: [[0, 0], [1, 0], [1, 1], [1, 2]], I: [[0, 0], [0, 1], [0, 2], [0, 3]], S: [[0, 1], [0, 2], [1, 0], [1, 1]],
};
const CLEAR_ROWS = [16, 17, 18, 19];
// stack collapse after the clear (px), measured frame by frame
const FALL = [[65.967, 0], [65.983, 1], [66.0, 5], [66.017, 14], [66.033, 24], [66.05, 36], [66.067, 48], [66.083, 60], [66.1, 72],
  [66.117, 83], [66.133, 93], [66.15, 102], [66.167, 110], [66.183, 118], [66.2, 124], [66.217, 130], [66.233, 135], [66.25, 139],
  [66.267, 142], [66.283, 145], [66.3, 148], [66.317, 150], [66.333, 152], [66.35, 154], [66.367, 155], [66.383, 156], [66.4, 157],
  [66.417, 158], [66.442, 158], [66.443, 159], [66.492, 159], [66.493, 160]];

const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
const HI = 'rgb(236,239,255)', OUTLINE = 'rgb(18,18,112)';
const INNER_HI = 'rgb(220,226,255)';

// Draw a group of cells (one piece) in the Tetris style: fill, top/left highlight, dark outline on the piece boundary.
function drawPiece(ctx, cells, x0, y0, size, color, alpha = 1, flash = 0, fillFlash = 0) {
  const set = new Set(cells.map(([r, c]) => r * 100 + c));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = rgb(fillFlash > 0 ? mix(color, [255, 255, 255], fillFlash) : color);
  for (const [r, c] of cells) ctx.fillRect(x0 + c * size, y0 + r * size, size, size);
  for (const [r, c] of cells) {
    const x = x0 + c * size, y = y0 + r * size;
    const top = set.has((r - 1) * 100 + c), left = set.has(r * 100 + c - 1);
    // Internal cell seams have a shadow on the preceding cell and a highlight on the grid line.
    // Piece boundaries keep their separate dark contour and inset white highlight.
    ctx.fillStyle = 'rgba(0,0,95,0.22)';
    if (set.has((r + 1) * 100 + c)) ctx.fillRect(x, y + size - 1, size, 1);
    if (set.has(r * 100 + c + 1)) ctx.fillRect(x + size - 1, y, 1, size);
    ctx.fillStyle = top ? INNER_HI : HI;
    ctx.fillRect(x + 1, y + (top ? 0 : 1), size - 1, 1);
    ctx.fillStyle = left ? INNER_HI : HI;
    ctx.fillRect(x + (left ? 0 : 1), y + 1, 1, size - 1);
  }
  ctx.fillStyle = flash > 0 ? rgb(mix([18, 18, 112], [252, 252, 255], flash)) : OUTLINE;
  for (const [r, c] of cells) {
    const x = x0 + c * size, y = y0 + r * size;
    if (!set.has((r - 1) * 100 + c)) ctx.fillRect(x, y, size, 1);
    if (!set.has((r + 1) * 100 + c)) ctx.fillRect(x, y + size - 1, size, 1);
    if (!set.has(r * 100 + c - 1)) ctx.fillRect(x, y, 1, size);
    if (!set.has(r * 100 + c + 1)) ctx.fillRect(x + size - 1, y, 1, size);
  }
  ctx.globalAlpha = 1;
}

// Key times are frames of the reference: a key at frame F is shown from frame F on.
const atFrame = (t, kt) => t * 60 >= Math.round(kt * 60) - 0.5;
function cellsAt(m, t) {
  let cur = null;
  for (const [kt, cells] of m.keys) if (atFrame(t, kt)) cur = cells;
  return cur;
}
// Lock flash: the outline of a piece turns white when it locks and fades back (measured per frame).
const FLASH = [[0, 1], [1, 0.94], [2, 0.75], [3, 0.65], [4, 0.55], [5, 0.48], [6, 0.43], [8, 0.32], [10, 0.25], [12, 0.2], [14, 0.12], [17, 0.08], [21, 0]];
const FLASH_SATIS = [[0, 1], [2, 0.92], [3, 0.84], [4, 0.71], [5, 0.65], [6, 0.57], [7, 0.49], [8, 0.42], [9, 0.37], [11, 0.33], [13, 0.23], [15, 0.2], [17, 0.155], [21, 0.13], [23, 0.09], [26, 0]];
function flashAt(table, t, frame) {
  const d = t * 60 - frame + 0.5;
  if (d < 0) return 0;
  const k = Math.floor(d);
  return pwl(table, k);
}

export default {
  id: 'simulation/tetris',
  start: START,
  end: END,
  create(root, env) {
    const { ctx } = env.canvas(root);
    const bg = vignetteCanvas(BG);
    const satis = layout('Satisfaction');
    const SATIS_COL = [[163, 167, 233], [210, 212, 240], [156, 159, 237], [197, 199, 236], [142, 146, 236], [169, 171, 226],
      [171, 175, 245], [217, 219, 248], [160, 163, 243], [198, 202, 240], [143, 147, 241], [169, 172, 227]];
    // group Satisfaction cells into 4-connected components per glyph (each gets its own outline)
    const satisGroups = [];
    {
      const key = (r, c) => (r + 10) * 1000 + c;
      const byGlyph = new Map();
      for (const [c, r, gi] of satis.cells) {
        if (!byGlyph.has(gi)) byGlyph.set(gi, new Map());
        byGlyph.get(gi).set(key(r, c), [r, c]);
      }
      for (const [gi, cells] of byGlyph) {
        const left = new Map(cells);
        while (left.size) {
          const [k0, v0] = left.entries().next().value;
          left.delete(k0);
          const comp = [v0], stack = [v0];
          while (stack.length) {
            const [r, c] = stack.pop();
            for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const k = key(r + dr, c + dc);
              if (left.has(k)) { const v = left.get(k); left.delete(k); comp.push(v); stack.push(v); }
            }
          }
          satisGroups.push({ gi, cells: comp });
        }
      }
    }

    function render(t) {
      if (ctx.reset) ctx.reset(); // pristine 2D state every frame
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(bg, 0, 0, 1920, 1080);

      // ── lyrics ──
      const DIM = [154, 158, 228], BRIGHT = [235, 241, 255];
      const words1 = [['Then', 0, -1, 63.733], ['I', 18, 63.433, 64.267], ['can', 22, 63.567, 64.5]];
      for (const [w, col, tIn, tLit] of words1) {
        if (t < tIn) continue;
        const a = tIn < 0 ? 1 : clamp((t - tIn) / 0.1);
        const c = t >= tLit ? BRIGHT : DIM;
        ctx.globalAlpha = a;
        drawPixelText(ctx, w, 120 + col * 8, 580, 8, rgb(c));
        ctx.globalAlpha = 1;
      }
      const words2 = [['be', 0, 3886 / 60, BRIGHT], ['your', 10, 3888 / 60, [255, 188, 163]], ['only', 27, 3914 / 60, BRIGHT]];
      for (const [w, col, tIn, c] of words2) {
        if (t < tIn) continue;
        const dy = -16 + 8 * Math.floor((t - tIn) * 30 + 1e-4);
        drawPixelText(ctx, w, 120 + col * 8, 700 + Math.min(0, dy), 8, rgb(c));
      }
      if (t >= 3940 / 60 - 1e-4) {
        // drops in from two block rows above, one row every other frame
        const dy = Math.min(0, -40 + 20 * Math.floor((t - 3940 / 60) * 30 + 1e-4));
        // it locks with the I piece at 3944: white outlines that fade back over ~0.4 s
        const fl = flashAt(FLASH_SATIS, t, 3944);
        satisGroups.forEach((g) => drawPiece(ctx, g.cells, 120, 840 + dy, 20, SATIS_COL[g.gi], 1, fl, 0.12 * fl));
      }

      // ── NEXT ──
      drawPixelText(ctx, 'NEXT', 1680, 140, 3, 'rgb(196,203,255)');
      let nx = 'J';
      for (const [nt, p] of NEXT) if (atFrame(t, nt)) nx = p;
      drawPiece(ctx, SHAPES[nx], 1680, 177, 24, COL[nx]);

      // ── well ──
      ctx.fillStyle = 'rgba(0,0,67,0.22)';
      ctx.fillRect(WX, WY, 400, 800);
      ctx.fillStyle = 'rgb(73,76,206)';
      for (let c = 1; c < 10; c++) ctx.fillRect(WX + c * CELL, WY, 1, 800);
      for (let r = 1; r < 20; r++) ctx.fillRect(WX, WY + r * CELL, 400, 1);
      ctx.fillStyle = 'rgb(205,212,255)';
      ctx.fillRect(WX - 2, WY, 2, 802);
      ctx.fillRect(WX + 400, WY, 2, 802);
      ctx.fillRect(WX - 2, WY + 800, 404, 2);

      ctx.save();
      ctx.beginPath();
      ctx.rect(WX, WY, 400, 800);
      ctx.clip();
      const cleared = t >= 65.875;
      const fall = cleared ? pwl(FALL, t) : 0;
      const drawLocked = (cells, color, flash = 0) => {
        let cs = cells;
        if (cleared) cs = cells.filter(([r]) => !CLEAR_ROWS.includes(r));
        if (!cs.length) return;
        // pieces above the cleared rows fall together
        drawPiece(ctx, cs, WX, WY + fall, CELL, color, 1, flash);
      };
      for (const [type, cells] of STACK) drawLocked(cells, COL[type]);
      // active / landed pieces
      for (const m of MOVES) {
        const spawn = m.spawn ?? -1;
        if (t < spawn) continue;
        const cells = cellsAt(m, t);
        if (!cells) continue;
        const final = COL[m.type];
        const base = m.type === 'I' ? [247,189,158] : COL.active;
        const k = clamp((t - m.lock) / 0.25);
        const color = mix(base, final, k);
        // ghost (landing position) while the piece is in the air
        const last = m.keys[m.keys.length - 1][1];
        if (m.type !== 'I' ? cells !== last : t < 65.733) {
          const occ = new Set();
          for (const [, cs] of STACK) for (const [r, c] of cs) occ.add(r * 100 + c);
          for (const o of MOVES) {
            if (o === m || (o.spawn ?? -1) > t) continue;
            const oc = cellsAt(o, t);
            if (oc && o.lock <= t) for (const [r, c] of oc) occ.add(r * 100 + c);
          }
          let d = 0;
          while (cells.every(([r, c]) => r + d + 1 < 20 && !occ.has((r + d + 1) * 100 + c))) d++;
          if (d > 0) drawGhost(ctx, cells.map(([r, c]) => [r + d, c]));
        }
        if (m.type === 'I' && t >= 65.733) {
          drawIClear(ctx, t, cells);
          continue;
        }
        drawLocked(cells, color, m.flash ? flashAt(FLASH, t, m.flash) : 0);
      }
      ctx.restore();
    }

    function drawGhost(ctx, cells) {
      ctx.fillStyle = 'rgba(200,205,255,0.13)';
      for (const [r, c] of cells) ctx.fillRect(WX + c * CELL, WY + r * CELL, CELL, CELL);
      const set = new Set(cells.map(([r, c]) => r * 100 + c));
      ctx.fillStyle = 'rgba(215,220,255,0.75)';
      for (const [r, c] of cells) {
        const x = WX + c * CELL, y = WY + r * CELL;
        if (!set.has((r - 1) * 100 + c)) ctx.fillRect(x, y, CELL, 1);
        if (!set.has((r + 1) * 100 + c)) ctx.fillRect(x, y + CELL - 1, CELL, 1);
        if (!set.has(r * 100 + c - 1)) ctx.fillRect(x, y, 1, CELL);
        if (!set.has(r * 100 + c + 1)) ctx.fillRect(x + CELL - 1, y, 1, CELL);
      }
    }

    function drawIClear(ctx, t, cells) {
      // hard-drop streak
      if (t < 65.75) {
        const g = ctx.createLinearGradient(0, WY + 10 * CELL, 0, WY + 16 * CELL);
        g.addColorStop(0, 'rgba(200,205,255,0)');
        g.addColorStop(1, 'rgba(200,205,255,0.55)');
        ctx.fillStyle = g;
        ctx.fillRect(WX + 9 * CELL, WY + 10 * CELL, CELL, 6 * CELL);
      }
      const h = pwl([[65.8666666667,38],[65.8833333333,34],[65.9,24],[65.9166666667,8],[65.9333333333,2],[65.95,0]],t);
      const shrinking = t >= 65.875;
      if (!shrinking) {
        drawPiece(ctx, cells, WX, WY, CELL, t < 65.75 ? [243,187,161] : [236,211,211]);
      }
      // white wipe right→left, then the bars shrink to nothing
      if (t >= 65.75 && t < 65.95) {
        const wipe = clamp((t - 65.75) / 0.085);
        const xL = WX + 360 - 360 * wipe;
        for (const r of CLEAR_ROWS) {
          const yc = WY + r * CELL + CELL / 2;
          ctx.fillStyle = shrinking ? 'rgb(230,233,250)' : 'rgba(236,239,251,0.9)';
          ctx.fillRect(xL, yc - h / 2, WX + 360 - xL, h);
          if (!shrinking) {
            ctx.fillStyle = OUTLINE;
            ctx.fillRect(xL, WY + (r+1)*CELL - 1, WX + 360 - xL, 1);
          } else {
            ctx.fillStyle = 'rgb(236,211,211)';
            ctx.fillRect(WX + 360, yc - h / 2, 40, h);
          }
        }
      }
    }

    return { render };
  },
};
