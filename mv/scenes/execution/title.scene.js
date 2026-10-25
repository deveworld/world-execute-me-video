// 161.667–162.683 · "Execution" title card. A ghost of the word (white at ~12 %) on blue; the
// syllables Ex·e·cu·tion light up one by one, each opening as a band from the split line
// (y = 540) outwards; at "cu" a hairline appears across the screen and the word splits along
// it, upper half rising and lower half dropping by 8 px. Each outline is scaled to
// the original's letter box; mixed heavy faces keep the rounded dot and angled terminals.
import { loadExecFonts } from './lib/fonts.js';
import { guarded } from './lib/ctx2d.js';

const F = (f) => (f - 0.5) / 60;
const BG = '#2f34c7';
const WHITE = '#ebeefd';
const SPLIT_Y = 540;
// syllables: [first reveal frame, first glyph, exclusive final glyph]
const SYL = [[9702,0,2], [9717,2,3], [9731,3,5], [9745,5,9]];
const GLYPHS = [
 ['E','400 100px "X Archivo Black"',[211,411,412,596]],
 ['x','900 100px "X Poppins Black"',[423,595,458,596]],
 ['e','400 100px "X Archivo Black"',[599,768,455,598]],
 ['c','900 100px "X Montserrat Black"',[784,947,455,598]],
 ['u','900 100px "X Poppins Black"',[967,1123,458,598]],
 ['t','900 100px "X Montserrat Black"',[1137,1259,430,598]],
 ['i','900 100px "X Poppins Black"',[1278,1340,385,596]],
 ['o','900 100px "X Archivo"',[1362,1533,455,598]],
 ['n','900 100px "X Montserrat Black"',[1552,1708,455,596]],
];
// Band extent [above, below] the split line on the frames after each syllable's reveal starts; the last
// entry holds.
const FULL = [999, 999];
const REVEAL = [
  [[73, 28], [120, 46], FULL],
  [[21, 7], [85, 34], [999, 50], FULL],
  [[33, 12], [999, 38], [999, 52], FULL],
  [[45, 17], [104, 40], [137, 53], [152, 999], FULL],
];
const SPLIT_F = 9732; // 162.200: hairline + split
const SPLIT = [0, 3, 5, 6, 7, 7.3, 7.6, 7.8, 8]; // px per frame after SPLIT_F

export default {
  id: 'execution/title',
  start: F(9700),
  end: F(9761),
  z: 1,
  create(root, env) {
    const { ctx } = env.canvas(root, { options: { willReadFrequently: true } }); // CPU raster: GPU glyph caching made text AA differ by render order
    const fits=[];
    const ready = loadExecFonts(['X Archivo','X Archivo Black','X Montserrat Black','X Poppins Black']).then(() => {
      for(const[ch,font,box]of GLYPHS){ctx.font=font;const m=ctx.measureText(ch);fits.push({ch,font,box,m,sx:(box[1]-box[0]+1)/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight),sy:(box[3]-box[2]+1)/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent)});}
    });
    const word = (first,last,color,alpha) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      for(let i=first;i<last;i++){const g=fits[i];if(!g)continue;ctx.save();ctx.font=g.font;ctx.translate(g.box[0],g.box[2]);ctx.scale(g.sx,g.sy);ctx.fillText(g.ch,g.m.actualBoundingBoxLeft,g.m.actualBoundingBoxAscent);ctx.restore();}
      ctx.globalAlpha = 1;
    };
    return {
      ready,
      render(t) {
        guarded(ctx, () => {
        const f = Math.round(t * 60);
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.textBaseline = 'alphabetic';
        const k = f - SPLIT_F;
        const d = k < 0 ? 0 : SPLIT[Math.min(k, SPLIT.length - 1)];
        const halves = k < 0 ? [[0, 1080, 0]] : [[0, SPLIT_Y, -d], [SPLIT_Y, 1080, d]];
        for (const [y0, y1, dy] of halves) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, y0 + dy, 1920, y1 - y0);
          ctx.clip();
          ctx.translate(0, dy);
          word(0,9,'#ffffff',0.115);
          SYL.forEach(([sf,first,last], si) => {
            const j = f - sf;
            if (j < 0) return;
            const rv = REVEAL[si], [up, down] = rv[Math.min(j, rv.length - 1)];
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, SPLIT_Y - up, 1920, up + down);
            ctx.clip();
            word(first,last,WHITE,1);
            ctx.restore();
          });
          ctx.restore();
        }
        if (k >= 0) {
          // hairline, white at first then settling to a pale blue
          const a = Math.min(1, k / 13);
          const c = [255 - 52 * a, 255 - 44 * a, 255];
          ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
          ctx.fillRect(120, SPLIT_Y, 1680, 1);
        }
        });
      },
    };
  },
};
