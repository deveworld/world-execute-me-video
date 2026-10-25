// 158.933–161.667 · Counting 1–6 in six languages, one typographic card per beat-ish cut:
// 1 Ein (de, blackletter) · DOS 2 (es, slab) · 3 Trois (fr, didone) · 넷 (ko) · 5 fem (sv,
// geometric) · 六 liu (zh, brush in a tianzige box). Every card enters ~4 % zoomed in and settles
// exponentially (≈0.58 per frame), like the original. Text is fitted to the ink boxes measured on
// the original frames, so position and size match even where the font is a substitute.
import { loadExecFonts } from './lib/fonts.js';
import { guarded } from './lib/ctx2d.js';

const F = (f) => (f - 0.5) / 60;

// [text, font (at 100px), ink box x0,x1,y0,y1, colour?]
const CARDS = [
  {
    f0: 9536, bg: '#1f2105', fg: '#c6b685', zoom: 0.040,
    rules: [[120, 96, 1680, 7], [120, 108, 1680, 2], [120, 946, 788, 2], [1012, 946, 788, 2], [120, 953, 788, 7], [1012, 953, 788, 7]],
    texts: [['1', '400 100px "X Fraktur"', [865, 1054, 168, 607]], ['Ein', '400 100px "X Fraktur"', [768, 1150, 682, 882]],
      ['de', '400 100px "X Fraktur"', [939, 980, 934, 972]]],
  },
  {
    f0: 9564, bg: '#002425', fg: '#dbaf7b', zoom: 0.040,
    rules: [[120, 264, 1680, 14], [120, 802, 1680, 14], [405, 642, 740, 8]],
    texts: [['DOS', '400 100px "X AlfaSlab"', [405, 1143, 340, 605]], ['2', '400 100px "X AlfaSlab"', [1209, 1515, 340, 739]],
      ['E S', '400 100px "X AlfaSlab"', [721, 827, 686, 739]]],
  },
  {
    f0: 9590, bg: '#0d1e3f', fg: '#e1a9af', zoom: 0.040,
    rules: [[780, 128, 1020, 1, '#eadcec']],
    texts: [['3', '400 100px "X DMSerif"', [120, 658, 129, 947]], ['Trois', '400 100px "X DMSerif Italic"', [1113, 1799, 698, 933]],
      ['F R', '400 100px "X DMSerif"', [1756, 1799, 156, 175]]],
  },
  {
    f0: 9620, bg: '#30172d', fg: '#5c4461', zoom: 0.0395,
    rules: [],
    texts: [['넷', '400 100px "X BlackHan"', [652, 1266, 200, 839]], ['ko', '400 100px "X BlackHan"', [933, 985, 912, 944]]],
    bar: { x: 580, y: 474, w: 760, h: 16, color: '#c1afda', p: [0, 0, 0.2, 0.62, 0.82, 0.91, 0.96, 0.98, 0.99, 1] },
  },
  {
    f0: 9644, bg: '#172128', fg: '#9cbcca', zoom: 0.0405, cx: 130, // V3: zooms about the left margin (x≈130), 4 % (was 7.9 % about the centre)
    rules: [[120, 196, 1680, 1, '#e3eef5']],
    texts: [['5', '300 100px "X Jost"', [961, 1429, 241, 940]], ['fem', '500 100px "X Jost"', [121, 496, 733, 933]],
      ['sv', '600 100px "X Jost"', [121, 147, 158, 172]]],
  },
  {
    f0: 9664, bg: '#321a0b', fg: '#97c0a9', zoom: 0.040,
    rules: [
      // pinyin staff, both sides of the syllable
      ...[119, 167, 236, 284].flatMap((y) => [[640, y, 231, 1, '#988071'], [1049, y, 232, 1, '#988071']]),
      // tianzige box
      [640, 323, 640, 2, '#bed4bb'], [640, 963, 640, 2, '#bed4bb'], [640, 323, 2, 642, '#bed4bb'], [1278, 323, 2, 642, '#bed4bb'],
    ],
    dashes: { color: '#9d8778', v: { x: 960, y0: 325, y1: 962 }, h: { y: 644, x0: 642, x1: 1277 }, period: 22, len: [13, 11] },
    texts: [['六', '400 100px "X MaShan"', [696, 1223, 395, 891]], ['liu', '300 100px "X Jost"', [900, 1019, 118, 238]],
      ['zh', '600 100px "X Jost"', [1320, 1349, 939, 964]]],
  },
];
const END = 9700;

export default {
  id: 'execution/count',
  start: F(9536),
  end: F(END),
  create(root, env) {
    const { ctx } = env.canvas(root, { options: { willReadFrequently: true } }); // CPU raster: GPU glyph caching made text AA differ by render order
    const fits = [];
    const ready = loadExecFonts(['X Fraktur', 'X AlfaSlab', 'X DMSerif', 'X DMSerif Italic', 'X BlackHan', 'X Jost', 'X MaShan'])
      .then(() => {
        for (const card of CARDS) {
          card.fit = card.texts.map(([text, font, box]) => {
            ctx.font = font;
            const m = ctx.measureText(text);
            const inkH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
            const inkW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
            const k = (box[3] - box[2] + 1) / inkH;
            const sx = (box[1] - box[0] + 1) / (inkW * k);
            return { text, font, box, k, sx, ox: m.actualBoundingBoxLeft, oy: m.actualBoundingBoxAscent };
          });
          fits.push(card.fit);
        }
      });
    return {
      ready,
      render(t) {
        guarded(ctx, () => {
        const f = Math.round(t * 60);
        let ci = 0;
        while (ci + 1 < CARDS.length && f >= CARDS[ci + 1].f0) ci++;
        const card = CARDS[ci];
        const k = f - card.f0;
        const s = 1 + card.zoom * Math.pow(0.58, k);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = card.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.setTransform(s, 0, 0, s, (card.cx ?? 960) * (1 - s), 540 * (1 - s));
        for (const [x, y, w, h, col] of card.rules) {
          ctx.fillStyle = col || card.fg;
          ctx.fillRect(x, y, w, h);
        }
        if (card.dashes) {
          const d = card.dashes;
          ctx.fillStyle = d.color;
          for (let y = d.v.y0; y < d.v.y1; y += d.period) ctx.fillRect(d.v.x, y, 1, Math.min(d.len[0], d.v.y1 - y));
          for (let x = d.h.x0; x < d.h.x1; x += d.period) ctx.fillRect(x, d.h.y, Math.min(d.len[1], d.h.x1 - x), 1);
        }
        ctx.fillStyle = card.fg;
        for (const ft of card.fit || []) {
          ctx.save();
          ctx.font = ft.font;
          ctx.translate(ft.box[0], ft.box[2]);
          ctx.scale(ft.k * ft.sx, ft.k);
          ctx.fillText(ft.text, ft.ox, ft.oy);
          ctx.restore();
        }
        // the bar of 넷 sits on top of the glyph
        if (card.bar) {
          const b = card.bar;
          const p = b.p[Math.min(k, b.p.length - 1)];
          if (p > 0) { ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w * p, b.h); }
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        });
      },
    };
  },
};
