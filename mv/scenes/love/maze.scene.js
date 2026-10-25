// "Though we are trapped, we are trapped, ah" — a heart-shaped maze is drawn outward from two dots
// (lavender = me, orange = you); the heart's outer wall is traced last by two glowing pens.
// Wall geometry and per-wall pen timing are in maze/walls.js.
import { loadLoveFonts, clamp, prog, table } from './lib.js';
import { WALLS } from './maze/walls.js';

const X0 = 800, Y0 = 140, C = 40;
const FONT = '800 96px LoveStencil';
const TXT = '#ecebf6';
const F = 1 / 60;

// [text, ink-left x, baseline y, reveal time, mode]; mode 'wipe' = left-to-right wipe, 'pop' = appears scaled up.
const WORDS = [
  ['Though', 120, 383, -1, 'show'], ['we', 405, 383, 174.1, 'wipe'],
  ['are', 120, 488, 174.2, 'wipe'], ['trapped', 256, 488, 174.65, 'pop'],
  ['We', 121, 623, 174.95, 'wipe'],
  ['are', 120, 728, 175.317, 'wipe'], ['trapped', 256, 728, 175.533, 'pop'], ['ah', 560, 728, 176.483, 'wipe'],
];
const INK_BOXES=[[120,307,377,402],[405,325,509,384],[120,429,230,488],[256,411,531,506],
  [120,547,227,624],[120,669,230,728],[256,651,531,746],[560,651,641,728]];

const DOTS = [
  { x: 1180, y: 440, core: 'rgb(227,226,255)', glow: [190, 190, 245] },
  { x: 1260, y: 440, core: 'rgb(255,214,182)', glow: [250, 180, 150] },
];

export default {
  id: 'love/maze',
  start: 173.642,
  end: 177.325,
  async create(root, env) {
    await loadLoveFonts([FONT]);
    const { ctx } = env.canvas(root);

    // Units with their drawing direction: the end that lit up first is where the pen starts.
    const units = WALLS.map(([vert, i, j, ta, tb, boundary]) => {
      const ax = X0 + C * i + 0.5, ay = Y0 + C * j + 0.5;
      const bx = vert ? ax : ax + C, by = vert ? ay + C : ay;
      const fwd = ta <= tb;
      const t0 = Math.min(ta, tb) - F, t1 = Math.max(ta, tb);
      return { sx: fwd ? ax : bx, sy: fwd ? ay : by, ex: fwd ? bx : ax, ey: fwd ? by : ay, t0, t1, boundary: !!boundary, left: (ax + bx) / 2 < 1220 };
    });
    const inkLeft = new Map();
    ctx.font = FONT;
    for (const [w] of WORDS) inkLeft.set(w, ctx.measureText(w).actualBoundingBoxLeft);
    const wordMetrics=WORDS.map(([w])=>ctx.measureText(w));
    function fittedWord(i){
      const [w]=WORDS[i],[l,top,r,bot]=INK_BOXES[i],m=wordMetrics[i];
      ctx.save();ctx.translate(l+.05,top+.05);ctx.scale((r-l+1)/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight),(bot-top+1)/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));
      ctx.fillText(w,m.actualBoundingBoxLeft,m.actualBoundingBoxAscent);ctx.strokeStyle=TXT;ctx.lineWidth=.24;ctx.strokeText(w,m.actualBoundingBoxLeft,m.actualBoundingBoxAscent);ctx.restore();
    }

    function walls(t) {
      // Fresh walls are drawn white and settle to grey (~0.3 s); the interior dims once more while the
      // outer wall is traced (176.70–176.82).
      const plateau = table([[176.7, 202], [176.82, 162]], t);
      ctx.save();
      ctx.lineCap = 'square';
      const visible=[];
      for (const u of units) {
        if (t < u.t0) continue;
        const f = clamp((t - u.t0) / Math.max(F, u.t1 - u.t0));
        if (f * C < 1.5) continue;
        let L;
        if (u.boundary) L = 241;
        else L = plateau + (255 - plateau) * Math.exp(-Math.max(0, t - u.t1) / 0.55);
        L = Math.round(L);
        visible.push({...u,L,ex:u.sx+(u.ex-u.sx)*f,ey:u.sy+(u.ey-u.sy)*f});
      }
      // Draw fringes before the connected ink so a new unit cannot cut a dark
      // seam through the already visible perpendicular wall at a junction.
      for(let pass=0;pass<3;pass++){
        ctx.lineWidth=[5,3,1][pass];
        for(const u of visible){
          const L=pass===2?Math.round(u.L*.82):u.L;
          ctx.strokeStyle=pass===0?'rgb(1,1,5)':u.boundary?(pass===1?'rgb(240,239,255)':'rgb(201,200,218)'):`rgb(${L},${L},${Math.min(255,L+12)})`;
          ctx.beginPath();ctx.moveTo(u.sx,u.sy);ctx.lineTo(u.ex,u.ey);ctx.stroke();
        }
      }
      ctx.restore();
      // glowing pens at the tips of the outer wall while it is being traced
      if (t > 176.48 && t < 177.1) {
        for (const side of [true, false]) {
          let best = null;
          for (const u of units) {
            if (!u.boundary || u.left !== side || u.t0 > t) continue;
            if (!best || u.t1 > best.t1) best = u;
          }
          if (!best) continue;
          const f = clamp((t - best.t0) / Math.max(F, best.t1 - best.t0));
          const x = best.sx + (best.ex - best.sx) * f, y = best.sy + (best.ey - best.sy) * f;
          const a = 1 - clamp((t - best.t1 - 0.03) / 0.08);
          if (a <= 0) continue;
          glow(x, y, 16, [255, 255, 255], 0.85 * a);
        }
      }
    }

    function glow(x, y, r, [cr, cg, cb], a) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      g.addColorStop(0.35, `rgba(${cr},${cg},${cb},${a * 0.35})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      ctx.restore();
    }

    // Dot glow pulses (on "we", "We" and when the maze closes) and cell flashes (on each "trapped").
    const decay = (t, t0, tau, rise = 0.03) => (t < t0 - rise ? 0 : t < t0 ? (t - t0 + rise) / rise : Math.exp(-(t - t0) / tau));
    function dots(t) {
      DOTS.forEach((d, k) => {
        const pulse = 0.55 * (decay(t, 174.17, 0.3) + decay(t, 175.01, 0.3)) + 1.5 * decay(t, 177.017, 0.4, 0.045);
        const flash = decay(t, k === 0 ? 174.65 : 175.55, 0.4, 0.001);
        if (flash > 0.01) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(d.x - 20, d.y - 20, 40, 40);
          ctx.clip();
          glow(d.x, d.y, 30, d.glow, 0.55 * flash);
          ctx.restore();
          ctx.save();
          ctx.lineCap = 'square';
          ctx.lineWidth = 3;
          ctx.strokeStyle = k === 0 ? `rgba(255,255,255,${flash})` : `rgba(255,228,215,${flash})`;
          ctx.strokeRect(d.x - 20, d.y - 20, 40, 40);
          ctx.restore();
        }
        glow(d.x, d.y, 15 + 30 * Math.min(1.1, pulse), d.glow, Math.min(0.9, 0.22 + 0.4 * pulse));
        const corePulse=.75*(decay(t,174.17,.3)+decay(t,175.01,.3))+.5*decay(t,177.017,.4,.045);
        ctx.fillStyle = d.core;
        ctx.beginPath();
        ctx.arc(d.x+.5, d.y+.5, 7.0 + 2.8 * Math.min(1, corePulse), 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function text(t) {
      ctx.save();
      ctx.font = FONT;
      ctx.fillStyle = TXT;
      ctx.textBaseline = 'alphabetic';
      for (let wi=0;wi<WORDS.length;wi++) {
        const [w,x,y,t0,mode]=WORDS[wi];
        const xl = x + inkLeft.get(w);
        if (mode === 'show') { fittedWord(wi); continue; }
        if (mode === 'pop') {
          if (t < t0) continue;
          const s = 1 + 0.035 * Math.pow(1 - prog(t, t0, 0.06), 2);
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(s, s);
          ctx.translate(-x,-y);fittedWord(wi);
          ctx.restore();
          continue;
        }
        // Wipe front per frame (fraction of the ink width).
        const n = (t - t0) * 60;
        const p = table(t0 < 174.3 ? [[-1, 0], [0, .2], [1, .75], [2, .95], [3, 1]] : [[-1, 0], [0, .62], [1, .9], [2, 1]], n);
        if (p <= 0) continue;
        const [l, , r] = INK_BOXES[wi];
        ctx.save();
        ctx.beginPath();
        ctx.rect(l - 3, y - 110, (r - l + 6) * p, 160);
        ctx.clip();
        ctx.globalAlpha = 0.2 + 0.8 * p * p;
        fittedWord(wi);
        ctx.restore();
      }
      ctx.restore();
    }

    return {
      render(t) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgb(14,15,22)';
        ctx.fillRect(0, 0, 1920, 1080);
        walls(t);
        dots(t);
        text(t);
      },
    };
  },
};
