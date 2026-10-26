// An airport board with independently driven split-flap wheels.
import { createBoardWheels } from './board/flaps.js';
import { drawHeader, drawType } from './board/typography.js';

const W = 1920, H = 1080;
const roundRect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

export default {
  id: 'physics/board', start: 51.425, end: 55.108333333333,
  fonts: ['600 138px "Barlow Condensed"', '600 72px "Barlow Condensed"', '500 25px "Barlow Condensed"'],
  async create(root, env) {
    const { ctx } = env.canvas(root);
    const wheels = createBoardWheels();
    const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
    const bc = bg.getContext('2d');
    const g = bc.createLinearGradient(0, 0, 0, H);
    for (const [u, color] of [[0, '#141318'], [.48, '#0c0c13'], [.84, '#09090e'], [.86, '#07060b'], [1, '#07060b']]) g.addColorStop(u, color);
    bc.fillStyle = g; bc.fillRect(0, 0, W, H);
    const haze = bc.createRadialGradient(980, 100, 0, 980, 100, 1300);
    haze.addColorStop(0, 'rgba(15,17,24,.28)'); haze.addColorStop(1, 'rgba(0,0,0,0)');
    bc.fillStyle = haze; bc.fillRect(0, 0, W, 920);
    bc.fillStyle = 'rgba(2,3,6,.55)'; bc.fillRect(0, 520, W, 4); bc.fillRect(0, 903, W, 5);
    bc.fillStyle = 'rgba(75,77,90,.17)'; bc.fillRect(0, 520, W, 1); bc.fillRect(0, 903, W, 1);
    drawHeader(bc, 'TIME', 126.5, 140);
    drawHeader(bc, 'DESTINATION', 776.5, 140);

    function cell(x, y, w = 107, h = 164) {
      bc.save(); bc.shadowColor = 'rgba(0,0,0,.95)'; bc.shadowBlur = 5;
      roundRect(bc, x - 3, y - 3, w + 6, h + 6, 4); bc.fillStyle = '#05070b'; bc.fill(); bc.restore();
      const gr = bc.createLinearGradient(0, y, 0, y + h);
      for (const [u, color] of [[0, '#201f24'], [.48, '#1c1c21'], [.5, '#15151b'], [1, '#1b1b20']]) gr.addColorStop(u, color);
      roundRect(bc, x, y, w, h, 3); bc.fillStyle = gr; bc.fill();
      bc.lineWidth = 1; bc.strokeStyle = w > 600 ? '#35343b' : '#05060b'; bc.stroke();
      bc.fillStyle = 'rgba(0,0,0,.25)'; bc.fillRect(x, y + h / 2, w, 3);
      const hingeY = y + (w > 600 ? 80 : 81);
      bc.fillStyle = '#57555e'; bc.fillRect(x - 2, hingeY - 1, 2, 4); bc.fillRect(x + w, hingeY - 1, 2, 4);
      return { x, y, w, h, hinge: w > 600 ? 80.5 : 81.5 };
    }
    const dates = [], cards = [], destinations = [];
    for (const y of [167, 541]) {
      const row = Array.from({ length: 4 }, (_, i) => cell(126 + 114 * i, y));
      row.push(cell(589, y, 158)); dates.push(row);
      cards.push(cell(126, y + 173, 621));
    }
    for (const y of [167, 340, 541, 714]) destinations.push(Array.from({ length: 9 }, (_, i) => cell(775 + 114 * i, y)));

    const faces = new Map();
    function face(text, c) {
      const key = `${c.w}|${text}`;
      if (faces.has(key)) return faces.get(key).raw;
      const canvas = document.createElement('canvas'); canvas.width = c.w; canvas.height = c.h;
      const fc = canvas.getContext('2d'), mid = c.w > 600 ? 80 : 81;
      const gr = fc.createLinearGradient(0, 0, 0, c.h);
      const stops = [[0, [4, 3, 8]], [1, [48, 47, 54]], [2, [30, 29, 36]], [20, [29, 28, 35]],
        [mid - 3, [28, 27, 34]], [mid - 1, [44, 43, 50]], [mid, [3, 2, 7]], [mid + 1, [9, 8, 14]],
        [mid + 4, [20, 19, 25]], [mid + 9, [26, 25, 32]], [c.h - 3, [27, 26, 33]], [c.h - 1, [5, 4, 9]]];
      for (const [y, rgb] of stops) gr.addColorStop(y / c.h, `rgb(${rgb.join(',')})`);
      fc.fillStyle = gr; fc.fillRect(0, 0, c.w, c.h);
      drawType(fc, text, c.w, c.w > 600);
      const still = document.createElement('canvas'); still.width = c.w; still.height = c.h;
      const sc = still.getContext('2d');
      sc.save(); roundRect(sc, 1, 1, c.w - 2, c.h - 2, 4); sc.clip(); sc.drawImage(canvas, 0, 0); sc.restore();
      sc.fillStyle = 'rgba(0,0,0,.92)'; sc.fillRect(0, mid, c.w, 1);
      sc.fillStyle = 'rgba(10,9,15,.72)'; sc.fillRect(0, mid + 1, c.w, 1);
      faces.set(key, { raw: canvas, still }); return canvas;
    }
    for (const ch of ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') face(ch.trim(), dates[0][0]);
    for (const era of ['', 'AD', 'BC']) face(era, dates[0][4]);
    for (const text of ['NOW', 'BOARDING', 'MOON LANDING', 'FIRST FLIGHT', 'COLUMBUS', 'MARCO POLO', 'VESUVIUS', 'ANNO DOMINI', 'GREAT PYRAMID']) face(text, cards[0]);

    function seam(c) {
      const y = c.y + Math.floor(c.hinge);
      ctx.fillStyle = 'rgba(0,0,0,.92)'; ctx.fillRect(c.x, y, c.w, 1);
      ctx.fillStyle = 'rgba(10,9,15,.72)'; ctx.fillRect(c.x, y + 1, c.w, 1);
    }
    function fixed(c, text) {
      ctx.drawImage(faces.get(`${c.w}|${text}`).still, c.x, c.y);
    }
    function moving(c, wheel, t) {
      const { top, bottom, moving: leaves } = wheel.at(t);
      if (!leaves.length) { fixed(c, top); return; }
      const h = c.hinge, bh = c.h - h;
      ctx.save(); roundRect(ctx, c.x + 1, c.y + 1, c.w - 2, c.h - 2, 4); ctx.clip();
      ctx.drawImage(face(top, c), 0, 0, c.w, h, c.x, c.y, c.w, h);
      ctx.drawImage(face(bottom, c), 0, h, c.w, bh, c.x, c.y + h, c.w, bh);
      for (const leaf of leaves) {
        const k = -Math.cos(Math.PI * leaf.p);
        if (k <= 0) continue;
        ctx.drawImage(face(leaf.to, c), 0, h, c.w, bh, c.x, c.y + h, c.w, bh * k);
        ctx.fillStyle = `rgba(0,0,0,${.25 * (1 - k)})`; ctx.fillRect(c.x, c.y + h, c.w, bh * k);
      }
      for (let i = leaves.length - 1; i >= 0; i--) {
        const leaf = leaves[i], k = Math.cos(Math.PI * leaf.p);
        if (k <= 0) continue;
        ctx.drawImage(face(leaf.from, c), 0, 0, c.w, h, c.x, c.y + h - h * k, c.w, h * k);
        ctx.fillStyle = `rgba(0,0,0,${.35 * (1 - k)})`; ctx.fillRect(c.x, c.y + h - h * k, c.w, h * k);
      }
      ctx.restore(); seam(c);
    }

    const vignette = document.createElement('canvas'); vignette.width = W; vignette.height = H;
    const vc = vignette.getContext('2d'), vg = vc.createRadialGradient(960, 540, 0, 960, 540, 1120);
    for (const [r, a] of [[0, 0], [560, 0], [640, .025], [750, .075], [850, .12], [1000, .23], [1120, .29]]) vg.addColorStop(r / 1120, `rgba(6,5,10,${a})`);
    vc.fillStyle = vg; vc.fillRect(0, 0, W, H);
    return {
      render(t) {
        ctx.drawImage(bg, 0, 0);
        for (let i = 0; i < 4; i++) fixed(dates[0][i], '2026'[i]);
        fixed(dates[0][4], ''); fixed(cards[0], 'NOW');
        for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) moving(destinations[r][c], wheels.destinations[r][c], t);
        for (let i = 0; i < 4; i++) moving(dates[1][i], wheels.dates[i], t);
        moving(dates[1][4], wheels.era, t); moving(cards[1], wheels.card, t);
        ctx.drawImage(vignette, 0, 0);
      },
    };
  },
};
