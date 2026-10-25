// "Question me, question me, I can answer all LO-O-OVE" — an OMR answer sheet whose pencilled bubbles
// form a heart; the sheet then fades away, a red-brown heart outline is drawn around the bubbles and
// "Lo-o-ove" is hand-lettered in pencil.
import { loadLoveFonts, clamp, prog, table, traceHeart, rng } from './lib.js';
import { FILLS } from './omr/fills.js';
import { HANDWRITING } from './omr/handwriting.js';

const W = 1920, H = 1080;
const LAV = 'rgb(150,142,228)';
const LAV_TXT = 'rgb(140,134,226)';
const MONO = '"Courier Prime"';
const BX = (c, k) => 271.5 + 53.5 * k + 321 * c; // bubble centre x
const BY = (r) => 123.5 + 44 * (r - 1); // bubble centre y (rows 1..20)
const SHEET_FADE = [184.183, 0.084];

// Lyric typing: [text, x of first char, baseline, start, chars/s] (first char shows at start + 1/cps)
const LYRIC = [
  ['Question', 1200, 568, 180.99, 120], [' me', 1200 + 8 * 32.4, 568, 181.358, 60],
  ['Question', 1200, 656, 181.93, 120], [' me', 1200 + 8 * 32.4, 656, 182.284, 60],
  ['I', 1200, 744, 182.888, 60], [' can', 1200 + 32.4, 744, 183.06, 60],
  [' answer', 1200 + 5 * 32.4, 744, 183.225, 110], [' all', 1200 + 12 * 32.4, 744, 183.56, 100],
];
// Handwritten "Lo-o-ove": glyph ink boxes, revealed left to right.
const HAND = [['L', 1201, 1271, 179], ['o', 1285, 1337, 137], ['-', 1359, 1400, 137], ['o', 1420, 1473, 137],
  ['-', 1495, 1536, 137], ['o', 1556, 1609, 137], ['v', 1623, 1672, 137], ['e', 1680, 1729, 137]];
const HAND_REVEAL = [[184.03, 1195], [184.05, 1222], [184.067, 1247], [184.083, 1271], [184.117, 1327], [184.133, 1337],
  [184.167, 1375], [184.183, 1398], [184.217, 1442], [184.233, 1471], [184.283, 1520], [184.3, 1535], [184.333, 1592],
  [184.35, 1609], [184.383, 1634], [184.4, 1672], [184.45, 1720], [184.467, 1732]];

export default {
  id: 'love/omr',
  start: 181.042,
  end: 184.708,
  async create(root, env) {
    await loadLoveFonts([`400 54px ${MONO}`, `700 36px ${MONO}`]);
    const { ctx } = env.canvas(root);
    const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

    // ---- background (cream paper with a soft vignette)
    const [bgC, b] = mk();
    {
      b.fillStyle = 'rgb(224,220,213)';
      b.fillRect(0, 0, W, H);
      b.save();
      b.translate(1000, 560);
      b.scale(1.25, 1);
      const g = b.createRadialGradient(0, 0, 0, 0, 0, 900);
      g.addColorStop(0, 'rgb(244,239,232)');
      g.addColorStop(0.5, 'rgb(243,238,231)');
      g.addColorStop(0.78, 'rgb(236,231,224)');
      g.addColorStop(1, 'rgb(224,220,213)');
      b.fillStyle = g;
      b.fillRect(-900, -900, 1800, 1800);
      b.restore();
      // timing marks stay when the sheet fades
      b.fillStyle = 'rgb(6,3,5)';
      for (let k = 0; k < 20; k++) b.fillRect(120, 118 + 44 * k, 44, 12);
    }

    // ---- the printed sheet (fades out at the end)
    const [shC, s] = mk();
    {
      s.fillStyle = 'rgba(140,140,232,0.09)';
      for (let c = 0; c < 3; c++) {
        s.fillRect(218 + 321 * c, 322, 294, 220);
        s.fillRect(218 + 321 * c, 762, 294, 220);
      }
      s.lineWidth = 1.3;
      s.strokeStyle = LAV;
      s.textAlign = 'center';
      s.textBaseline = 'alphabetic';
      for (let c = 0; c < 3; c++) {
        for (let r = 1; r <= 20; r++) {
          for (let k = 0; k < 5; k++) {
            s.beginPath();
            s.arc(BX(c, k), BY(r), 16.5, 0, Math.PI * 2);
            s.stroke();
            s.font = `400 15px ${MONO}`;
            s.fillStyle = 'rgb(146,142,192)';
            s.fillText('ABCDE'[k], BX(c, k), BY(r) + 5);
          }
        }
      }
      s.textAlign = 'left';
      // header block
      s.fillStyle = LAV_TXT;
      s.font = `700 35.6px ${MONO}`;
      s.fillText('ANSWER SHEET', 1200, 128);
      s.font = `700 13.7px ${MONO}`;
      s.textAlign = 'right';
      s.fillText('FORM NO. 60-E', 1800, 128);
      s.textAlign = 'left';
      s.strokeStyle = LAV;
      s.lineWidth = 1.2;
      s.strokeRect(1200.5, 150.5, 599, 79);
      s.strokeRect(1200.5, 238.5, 391, 79);
      s.strokeRect(1612.5, 238.5, 187, 79);
      s.beginPath();
      s.moveTo(1200, 270.5); s.lineTo(1591, 270.5);
      for (const x of [1249, 1298, 1347, 1396, 1445, 1494, 1543]) { s.moveTo(x + 0.5, 270); s.lineTo(x + 0.5, 317); }
      s.stroke();
      s.font = `700 11.4px ${MONO}`;
      s.fillText('NAME', 1212, 169);
      s.fillText('ID NUMBER', 1213, 257);
      s.fillText('DATE', 1624, 257);
      s.fillText('CORRECT', 1605, 348);
      s.fillText('INCORRECT', 1605, 397);
      s.font = `700 13.9px ${MONO}`;
      s.fillText('USE NO. 2 PENCIL ONLY', 1200, 348);
      s.font = `400 13.8px ${MONO}`;
      s.fillText('Fill each circle completely.', 1200, 375);
      s.fillText('Erase cleanly any answer you wish to change.', 1200, 397);
      s.fillText('Make no stray marks on this sheet.', 1200, 419);
      s.fillStyle = 'rgb(175,175,244)';
      s.beginPath(); s.arc(1613, 367, 9, 0, Math.PI * 2); s.fill();
      // incorrect marks
      s.lineWidth = 1.1;
      const ic = [1613, 1641, 1669, 1697];
      for (const x of ic) { s.beginPath(); s.arc(x, 415, 8.5, 0, Math.PI * 2); s.stroke(); }
      s.beginPath(); s.moveTo(1608, 410); s.lineTo(1618, 420); s.moveTo(1618, 410); s.lineTo(1608, 420); s.stroke();
      s.beginPath(); s.moveTo(1636, 415); s.lineTo(1640, 419); s.lineTo(1647, 410); s.stroke();
      s.fillStyle = 'rgb(175,175,244)';
      s.beginPath(); s.arc(1669, 415, 8.5, Math.PI / 2, Math.PI * 1.5); s.fill();
      s.beginPath(); s.arc(1697, 415, 2.2, 0, Math.PI * 2); s.fill();
    }

    // ---- question numbers, regular and bold: the rows of the heart turn bold in three
    // cascades on the lyric, before any pencil mark.
    const BOLD_AT = [
      [, , , 181.117, 181.133, 181.167, 181.633, 181.65, 181.683, 181.717, 181.75, 182.083, 182.1, 182.133, 182.167],
      [, , , 181.117, 181.15, 181.167, 181.617, 181.65, 181.683, 181.717, 181.75, 182.083, 182.1, 182.133, 182.167, 182.2, 182.55, 182.567, 182.6],
      [, , , 181.117, 181.133, 181.167, 181.617, 181.65, 181.7, 181.717, 181.75, 182.083, 182.1, 182.133, 182.167],
    ];
    function numbers(t, alpha) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = 'right';
      for (let c = 0; c < 3; c++) {
        for (let r = 1; r <= 20; r++) {
          const t0 = BOLD_AT[c][r];
          const bold = t0 !== undefined && t >= t0 - 0.008;
          ctx.font = `${bold ? 700 : 400} 17px ${MONO}`;
          ctx.fillStyle = bold ? 'rgb(96,86,196)' : 'rgb(140,133,196)';
          ctx.fillText(String(r + 20 * c), 249 + 321 * c, BY(r) + 5);
        }
      }
      ctx.restore();
    }

    // ---- pencil fills: dark graphite with lighter diagonal strokes, a few variants
    const R = rng(4242);
    const fillTex = Array.from({ length: 64 }, () => {
      const [c, x] = mk(40, 40);
      x.save();
      x.beginPath();
      x.arc(20, 20, 16.8, 0, Math.PI * 2);
      x.clip();
      x.fillStyle = 'rgb(66,64,70)';
      x.fillRect(0, 0, 40, 40);
      x.translate(20, 20);
      x.rotate(-0.95);
      for (let i = 0; i < 55; i++) {
        x.strokeStyle = `rgba(${200 + R() * 40},${200 + R() * 40},${205 + R() * 40},${0.10 + R() * 0.17})`;
        x.lineWidth = 0.35 + R() * .7;
        const off = -22 + R() * 44;
        x.beginPath();x.moveTo(-24,off);
        for(let q=-20;q<=24;q+=4)x.lineTo(q,off+(R()-.5)*2.7);
        x.stroke();
      }
      for (let i = 0; i < 14; i++) {
        x.strokeStyle = `rgba(40,38,44,${0.2 + R() * 0.3})`;
        x.lineWidth = 0.8 + R();
        const off = -22 + R() * 44;
        x.beginPath(); x.moveTo(-24, off); x.lineTo(24, off); x.stroke();
      }
      x.restore();
      // Fine graphite granules break up the long strokes without repeating a stamp.
      const im=x.getImageData(0,0,40,40);
      for(let p=0;p<im.data.length;p+=4){const n=(R()-.5)*29;for(let k=0;k<3;k++)im.data[p+k]=Math.max(0,Math.min(255,im.data[p+k]+n));}
      x.putImageData(im,0,0);
      return c;
    });

    // first pass of the pencil: dark diagonal stripes
    const stripeTex = (() => {
      const [c, x] = mk(40, 40);
      x.save();
      x.beginPath();
      x.arc(20, 20, 16.8, 0, Math.PI * 2);
      x.clip();
      x.translate(20, 20);
      x.rotate(-1.05);
      x.strokeStyle = 'rgba(62,60,68,0.92)';
      x.lineWidth = 3.4;
      for (let off = -24; off <= 24; off += 6.6) { x.beginPath(); x.moveTo(-26, off); x.lineTo(26, off); x.stroke(); }
      x.restore();
      return c;
    })();

    // ---- handwriting: monoline strokes, with the pencil grain applied once
    const [hwC, hw] = mk();
    {
      hw.fillStyle='rgb(38,33,31)';hw.strokeStyle=hw.fillStyle;hw.lineWidth=.25;
      const lettering=new Path2D(HANDWRITING);hw.fill(lettering,'evenodd');hw.stroke(lettering);
      const img = hw.getImageData(1150, 760, 640, 200);
      const G = rng(99);
      for (let i = 3; i < img.data.length; i += 4) img.data[i] = Math.round(img.data[i] * (0.55 + 0.45 * G()));
      hw.putImageData(img, 1150, 760);
    }

    function lyric(t) {
      ctx.save();
      ctx.font = `400 54px ${MONO}`;
      ctx.fillStyle = 'rgb(18,18,18)';
      for (const [txt, x, y, t0, cps] of LYRIC) {
        const k = Math.floor((t - t0) * cps + 1e-6);
        if (k <= 0) continue;
        ctx.fillText(txt.slice(0, Math.min(txt.length, k)), x-2, y+1);
      }
      ctx.restore();
    }

    return {
      render(t) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.drawImage(bgC, 0, 0);
        const sheetA = 1 - prog(t, SHEET_FADE[0], SHEET_FADE[1]);
        if (sheetA > 0) {
          ctx.globalAlpha = sheetA;
          ctx.drawImage(shC, 0, 0);
          numbers(t, sheetA);
          ctx.globalAlpha = 1;
        }
        // pencil fills
        FILLS.forEach(([r, c, k, t0], i) => {
          // Pencil progress: the stripes start a frame before t0, the graphite fills in from t0+2 frames
          // and the stripes keep showing through the final fill. The dark stripes are drawn in by the
          // pencil (left to right), then graphite covers them part-way so the stripe texture stays visible.
          const n = (t - t0) * 60;
          if (n <= -1.6) return;
          const x = BX(c, k) - 20, y = BY(r) - 20;
          const sw = table([[-1.6, 0], [-1, .22], [0, .6], [1, .82], [2, 1]], n);
          if (sw > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x + 3, y, 34 * sw, 40); ctx.clip(); ctx.globalAlpha = 1; ctx.drawImage(stripeTex, x, y); ctx.restore(); }
          const fa = table([[1, 0], [2, .05], [3, .42], [4, .65]], n);
          if (fa > 0) { ctx.globalAlpha = fa; ctx.drawImage(fillTex[i % fillTex.length], x, y); }
        });
        ctx.globalAlpha = 1;
        // heart outline drawn up both sides from the tip
        const hp = table([[184.338, 0], [184.35, 0.111], [184.367, 0.259], [184.383, 0.397], [184.4, 0.515], [184.417, 0.615],
          [184.433, 0.699], [184.45, 0.767], [184.467, 0.821], [184.483, 0.864], [184.5, 0.899], [184.517, 0.927],
          [184.533, 0.951], [184.55, 0.967], [184.567, 0.983], [184.583, 0.991], [184.6, 1]], t);
        if (hp > 0) {
          ctx.save();
          ctx.strokeStyle = 'rgb(176,92,52)';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';
          traceHeart(ctx, 699.5, 584.75, 352, 0, 0.5 * hp, false);
          ctx.stroke();
          traceHeart(ctx, 699.5, 584.75, 352, 1 - 0.5 * hp, 1, false);
          ctx.stroke();
          ctx.restore();
        }
        lyric(t);
        // handwriting reveal
        const hx = table(HAND_REVEAL, t);
        if (t >= HAND_REVEAL[0][0]) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(1150, 760, hx - 1150, 200);
          ctx.clip();
          ctx.drawImage(hwC, 0, 0);
          ctx.restore();
        }
      },
    };
  },
};
