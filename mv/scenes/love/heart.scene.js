// "I know the algebraic expression of LO-O-OVE" / "Though you are free, I am trapped in LO-O-OVE".
// One continuous shot: the algebraic heart (x²+y²−1)³ − x²y³ = 0 drawn as a sparkling outline on a starfield,
// the equation typed inside, a caret that drops into the heart's origin as a lavender dot, and finally the
// heart shrinking towards (1120, 559) for the hand-off to the bookends segment at 193.60.
import { loadLoveFonts, clamp, lerp, prog, table, heartPath, heartAt, traceHeart, noise1, rng } from './lib.js';
import { heartMove, sparkPosition, makeStars } from './heart/motion.js';

const W = 1920, H = 1080;
// Heart origin (between cusp and tip) and pixels per unit (canvas px; curve y up).
const P0 = { x: 700.0, y: 586.0, S: 352 };
const P1 = { x: 1120.45, y: 559.45, S: 181.75 };
const ITAL = 'italic 600 85.6px "Cormorant Garamond"';
const UP_LOVE = '500 69px "Cormorant Garamond"';
const WHITE = '#f4f2fa';
const LAV = '#b9b6f4';
const ORANGE = '#f3b89c';

export default {
  id: 'love/heart',
  start: 184.708,
  end: 193.6,
  async create(root, env) {
    await loadLoveFonts([ITAL, UP_LOVE]);
    const { ctx } = env.canvas(root);
    const hp = heartPath();
    const stars = makeStars();

    // Strands of the sparkling outline: per-strand offset noise along the curve.
    const R = rng(7331);
    const strands = Array.from({ length: 28 }, (_, k) => ({
      n: noise1(100 + k), amp: 2 + R() * 6, freq: 2 + R() * 8, speed: 0.2 + R() * 0.9,
      alpha: 0.17 + R() * 0.3, width: 0.4 + R() * 0.4, bias: 2 + R() * 5, seed:R()*1000,fragment:k>=8,
    }));
    // fine dust, mostly on the outer side of the curve
    const glitter = Array.from({ length: 6500 }, () => {
      const d = -Math.log(1 - R() * 0.995) * 6.5;
      const target=R()*hp.len;let lo=0,hi=hp.cum.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(hp.cum[m]<target)lo=m;else hi=m;}
      return { i:lo, off: R() < 0.72 ? 3+d : -d * 0.6, r: R()<.92?.85:1.4, ph: R() * 10, sp: 8 + R() * 22, a: 0.25 + R() * 0.75 };
    });

    // Precompute unit normals of the heart polyline for offsets.
    const N = hp.pts.length - 1;
    const normals = hp.pts.map((p, i) => {
      const a = hp.pts[(i - 1 + N) % N], b = hp.pts[(i + 1) % N];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      return [dy / l, -dx / l];
    });

    // Equation tokens: [text, style, ink-left x, reveal time].
    const EQ_BASE = 408;
    const EQ = [['(', 'r', 411, 185.61], ['x', 'i', 426, 185.627], ['2', 's', 457, 185.66], ['+', 'r', 494, 185.693],
      ['y', 'i', 539, 185.723], ['2', 's', 570, 185.743], ['−', 'r', 607, 185.777], ['1', 'r', 660, 185.807],
      [')', 'r', 685, 185.84], ['3', 's', 705, 185.86], ['−', 'r', 741, 186.193], ['x', 'i', 788, 186.21],
      ['2', 's', 819, 186.243], ['y', 'i', 839, 186.273], ['3', 's', 871, 186.307], ['=', 'r', 910, 186.76],
      ['0', 'r', 963, 186.793]];
    const EQ_FONT = { r: '400 58px LoveSTIX', i: 'italic 400 58px LoveSTIX', s: '400 40px LoveSTIX' };
    const eqTok = EQ.map(([txt, st, x, t0]) => {
      ctx.font = EQ_FONT[st];
      const m = ctx.measureText(txt);
      return { txt, font: EQ_FONT[st], x: x + m.actualBoundingBoxLeft, y: st === 's' ? EQ_BASE - 22 : EQ_BASE, t0 };
    });

    function bg(t) {
      const k = table([[188.6, 0], [188.8, 0.3], [189.2, 0.45], [189.5, 0.62], [189.7, 0.72], [190.0, 0.92], [190.2, 1]], t);
      const c = [lerp(6, 14, k), lerp(5, 15, k), lerp(10, 22, k)].map(Math.round);
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(0, 0, W, H);
      // Deep-blue glow filling the heart (additive).
      const g = table([[187.0, 1], [187.5, 0.68], [188.0, 0.58], [188.5, 0.5], [189.2, 0.34], [189.5, 0.15], [190.0, 0]], t);
      if (g > 0) {
        const grad = ctx.createRadialGradient(700, 540, 0, 700, 540, 820);
        const stops = [[0, 16, 17, 56], [0.12, 14, 16, 50], [0.25, 6, 7, 26], [0.37, 3, 4, 14], [0.5, 2, 3, 9], [0.75, 1, 1, 4], [1, 0, 0, 0]];
        for (const [o, r, gg, b] of stops) grad.addColorStop(o, `rgb(${Math.round(r * g)},${Math.round(gg * g)},${Math.round(b * g)})`);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
      // Static starfield.
      const sa = table([[188.4, 1], [189.0, 0.7], [189.6, 0.35], [190.1, 0]], t);
      if (sa > 0) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        for (const [x, y, v] of stars) {
          ctx.globalAlpha = sa * clamp(v / 245);
          ctx.beginPath();
          ctx.arc(x + 0.5, y + 0.5, .65, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    function strandPath(cx, cy, S, st, spread, t) {
      ctx.beginPath();
      const ph = t * st.speed;
      let pen=false;
      for (let i = 0; i <= N; i += 2) {
        const u = hp.cum[i]/hp.len;
        const micro=.9*Math.sin(i*128.28+st.seed+Math.sin(i*7.4+t*40));
        const o = spread * (st.amp * st.n(u * st.freq * 6 + ph) + st.bias + micro);
        const [x, y] = hp.pts[i];
        const [nx, ny] = normals[i];
        const X = cx + x * S + nx * o, Y = cy - y * S - ny * o;
        const visible=!st.fragment||Math.sin(i*.34+st.seed+t*10)+.5*Math.sin(i*1.31-t*15)>-.4;
        if(!visible){pen=false;continue;}if(!pen)ctx.moveTo(X,Y);else ctx.lineTo(X,Y);pen=true;
      }
    }

    function outline(t, cx, cy, S) {
      const k = S / P0.S;
      // The sparkling strands stay until 186.8 and are removed in two steps (186.817, 186.917); the
      // wide bloom fades separately over the next 1.5 s.
      const spread = table([[184.7, 1], [186.8, 1], [186.817, .7], [186.9, .55], [186.917, .35], [187.0, .2], [187.1, .05], [187.2, 0]], t);
      const bloom = (.54 + .03 * prog(t, 184.7, 2.1)) * Math.exp(-Math.max(0, t - 186.8) / .85) * (1 - prog(t, 188.6, .9));
      // Grey rim around the thin outline: it fades out during the
      // final shrink, so the outline that hands over to the reprise at 193.6 has no rim.
      const halo = prog(t, 187.5, .2) * (.98 - .30 * prog(t, 188.45, .55) - .16 * prog(t, 190.7, 2.25)) * (1 - prog(t, 192.95, .35));
      const glow = table([[187.0, 1], [187.6, 0.75], [188.4, 0.5], [189.6, 0.12], [190.2, 0.08]], t);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // soft bloom
      if (glow > 0) {
        const wide = table([[184.7, 1], [187.0, .8], [188.0, .7], [188.5, .5], [189.0, .2], [189.5, 0]], t);
        if(wide>0){
          // Very wide, faint haze (+3..4 levels 20-60 px either side of the outline).
          ctx.save();ctx.globalCompositeOperation='lighter';ctx.filter=`blur(${30*k}px)`;ctx.strokeStyle=`rgba(190,195,230,${.032*wide})`;ctx.lineWidth=60*k;traceHeart(ctx,cx,cy,S);ctx.stroke();ctx.restore();
        }
        if(bloom>0){
          // Wide silver bloom around the outline.
          ctx.save();ctx.globalCompositeOperation='lighter';ctx.filter=`blur(${15*k}px)`;ctx.strokeStyle=`rgba(190,195,230,${.34*bloom})`;ctx.lineWidth=20*k;traceHeart(ctx,cx,cy,S);ctx.stroke();ctx.restore();
        }
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.filter = `blur(${Math.max(1, 6 * k)}px)`;
        ctx.strokeStyle = `rgba(150,155,230,${0.22 * glow})`;
        ctx.lineWidth = (5 + 8 * spread) * k;
        traceHeart(ctx, cx, cy, S);
        ctx.stroke();
        ctx.restore();
      }
      if (spread > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (const st of strands) {
          ctx.strokeStyle = `rgba(232,232,250,${st.alpha * Math.min(1, spread * 1.5)})`;
          ctx.lineWidth = st.width * k;
          strandPath(cx, cy, S, st, spread * k, t);
          ctx.stroke();
        }
        // dust: short tangential streaks, bucketed by alpha so each bucket is one stroke call
        const ds = (0.35 + 0.65 * spread) * k;
        ctx.strokeStyle = '#f2f2ff';
        ctx.lineWidth = .95;
        for (let b = 0; b < 4; b++) {
          ctx.globalAlpha = (0.2 + 0.25 * b) * Math.min(1, 0.3 + spread);
          ctx.beginPath();
          for (let j = b; j < glitter.length; j += 4) {
            const g = glitter[j];
            const tw = 0.55 + 0.45 * Math.sin(t * g.sp + g.ph);
            if (tw * g.a < 0.25 + 0.18 * b) continue;
            const i = g.i;
            const [x, y] = hp.pts[i];
            const [nx, ny] = normals[i];
            const o = g.off * ds;
            const X = cx + x * S + nx * o, Y = cy - y * S - ny * o;
            const L = g.r * 2.2;
            ctx.moveTo(X - ny * L, Y - nx * L);
            ctx.lineTo(X + ny * L, Y + nx * L);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      if (halo > 0) {
        ctx.globalAlpha = halo;
        ctx.strokeStyle = 'rgb(74,75,84)';
        ctx.lineWidth = 10.5 * k;
        traceHeart(ctx, cx, cy, S);
        ctx.stroke();
        ctx.strokeStyle = 'rgb(16,17,24)';
        ctx.lineWidth = 4.6 * k;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = 'rgb(250,250,255)';
      // the shrunk outline is a little finer than a scaled copy
      ctx.lineWidth = (2.2 - .65 * spread) * k * (1 - .12 * heartMove(t));
      traceHeart(ctx, cx, cy, S);
      ctx.stroke();
      ctx.restore();
    }

    function sparkle(t) {
      const a = table([[184.6, .82], [187, 1], [188.65, .88], [188.8, .66], [189.1, .55], [189.4, 0]], t) * (1 - .25 * prog(t, 189.1, .25));
      if (a <= 0) return;
      const [x, y] = sparkPosition(t, heartAt);
      const warm = prog(t, 188.6, 0.4);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r1 = 45;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r1);
      const cr = 255, cg = Math.round(lerp(226, 214, warm)), cb = Math.round(lerp(232, 206, warm));
      for (const [o, v] of [[0, 1], [.093, .8], [.2, .44], [.356, .24], [.556, .15], [.778, .095], [1, 0]]) g.addColorStop(o, `rgba(${cr},${cg},${cb},${v * a})`);
      ctx.fillStyle = g;
      ctx.fillRect(x - r1, y - r1, r1 * 2, r1 * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function caretAndDot(t) {
      // blinking caret at the heart's centre
      const on = ((t - 184.45) % 1 < .5) && t < 187.87;
      if (on) {
        const sh = t < 187.78 ? 1 : 1 - prog(t, 187.78, 0.09);
        const h = 40 * sh;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(698.5, 517 - h / 2, 2, Math.max(1, h));
      }
      if (t < 187.85) return;
      // the caret collapses into a dot that falls to the origin and turns lavender
      const tf = t - 187.9;
      let y = tf <= 0 ? 517 : Math.min(585.5, 517 + 0.5 * 2350 * tf * tf);
      let x = 699.5;
      const p = heartMove(t);
      if (p > 0) { x = lerp(699.6, 1120.1, p); y = lerp(585.5, 559.0, p); }
      const r = lerp(2.4, 6.6, Math.sin(prog(t, 187.85, .5) * Math.PI / 2) ** 1.4);
      const lav = prog(t, 188.18, 0.22);
      ctx.save();
      if (lav > 0) {
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(x, y, 0, x, y, 24);
        g.addColorStop(0, `rgba(70,70,190,${0.0 * lav})`);
        g.addColorStop(0.3, `rgba(40,42,150,${0.55 * lav})`);
        g.addColorStop(0.6, `rgba(20,20,80,${0.35 * lav})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - 24, y - 24, 48, 48);
        ctx.globalCompositeOperation = 'source-over';
      }
      const cr = Math.round(lerp(255, 104, lav)), cg = Math.round(lerp(255, 104, lav)), cb = Math.round(lerp(255, 246, lav));
      ctx.fillStyle = `rgb(${cr},${cg},${cb})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function equation(t) {
      const out = 1 - prog(t, 189.683, .1);
      if (out <= 0) return;
      ctx.save();
      ctx.fillStyle = WHITE;
      ctx.textBaseline = 'alphabetic';
      for (const tk of eqTok) {
        const a = clamp((t - tk.t0) / 0.035);
        if (a <= 0) continue;
        ctx.font = tk.font;
        ctx.globalAlpha = a * out;
        ctx.fillText(tk.txt, tk.x, tk.y);
      }
      ctx.restore();
    }

    // word fade-in: starts ~2 frames before it is legible, ~0.18 s, eased out
    const fadeIn = (t, t0) => 1 - Math.pow(1 - clamp((t - t0 + 0.03) / 0.18), 1.8);

    // Ink widths keep the narrow serif layout while the font supplies the letterforms.
    const fitCache = new Map();
    function fitWord(w, l, r, y, a, color = WHITE, font = ITAL) {
      if (a <= 0) return;
      const key = font + '|' + w + '|' + color;
      let f = fitCache.get(key);
      if (!f) {
        // Large-size metrics avoid device-pixel rounding changing the word spacing.
        ctx.font = font.replace(/([\d.]+)px/, (_, size) => `${Number(size) * 8}px`);
        ctx.letterSpacing = '0px';
        const m = ctx.measureText(w);
        const ink = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) / 8;
        // upright "Lo-o-ove" is letter-spaced in the original; the italic words are condensed
        f = font === UP_LOVE
          ? { sx: 1, ls: (r - l + 1 - ink) / (w.length - 1), left: m.actualBoundingBoxLeft / 8 }
          : { sx: (r - l + 1) / ink, ls: 0, left: m.actualBoundingBoxLeft / 8 };
        if (font === UP_LOVE) f.glyphs = Array.from(w, (ch, i) => [ch, ctx.measureText(w.slice(0, i)).width / 8 + i * f.ls]);
        // Supersampling keeps small serifs and their baselines stable across device scales.
        const raster = document.createElement('canvas');
        raster.width = Math.ceil((r - l + 17) * 3); raster.height = 128 * 3;
        const inkCtx = raster.getContext('2d', { willReadFrequently: true });
        const sy = font === ITAL ? (/[bdfhklt]/.test(w) ? .915 : w === 'I' ? 1 : /i/.test(w) ? 1.03 : .94) : 1;
        inkCtx.scale(3, 3); inkCtx.translate(8, 90); inkCtx.scale(f.sx, sy);
        inkCtx.font = font; inkCtx.textBaseline = 'alphabetic'; inkCtx.fillStyle = color;
        if (f.glyphs) for (const [ch, x] of f.glyphs) inkCtx.fillText(ch, f.left + x, 0);
        else inkCtx.fillText(w, f.left, 0);
        f.raster = raster;
        fitCache.set(key, f);
      }
      ctx.save();
      ctx.letterSpacing = '0px';
      ctx.globalAlpha = a;
      ctx.drawImage(f.raster, l - 8, y - 90, f.raster.width / 3, 128);
      ctx.restore();
    }
    const RIGHT_A = [['I', 1199, 1221, 407.5, 184.0], ['know', 1239, 1376, 407.5, 185.117], ['the', 1394, 1469, 407.5, 185.45],
      ['algebraic', 1199, 1419, 504.5, 185.583], ['expression', 1436, 1690, 504.5, 186.733], ['of', 1199, 1252, 601.5, 187.55],
      ['Lo-o-ove', 1268, 1503, 601.5, 187.70, LAV, UP_LOVE]];
    const RIGHT_B = [['Though', 1200, 1410, 504.5, 188.517], ['you', 1425, 1517, 504.5, 188.917, ORANGE],
      ['are', 1535, 1609, 504.5, 188.967], ['free', 1618, 1714, 504.5, 189.383]];
    const INNER_A = [['I', 540, 562, 407.5, 189.817], ['am', 580, 656, 407.5, 189.883], ['trapped', 673, 859, 407.5, 190.317],
      ['Trapped', 563, 770, 504.5, 190.733], ['in', 788, 835, 504.5, 191.217]];

    // Build every word with the same context state before frames can be sought in any order.
    ctx.textBaseline = 'alphabetic';
    for (const words of [RIGHT_A, RIGHT_B, INNER_A]) for (const [w, l, r, y, , color, font] of words) {
      fitWord(w, l, r, y, 1, color, font);
    }

    function rightText(t) {
      ctx.textBaseline = 'alphabetic';
      const outA = 1 - prog(t, 188.383, .077);
      if (outA > 0) for (const [w, l, r, y, t0, col, font] of RIGHT_A) fitWord(w, l, r, y, fadeIn(t, t0) * outA, col, font);
      const outB = 1 - prog(t, 190.2, .3) ** 1.2;
      if (t >= 188.5 && outB > 0) for (const [w, l, r, y, t0, col] of RIGHT_B) fitWord(w, l, r, y, fadeIn(t, t0) * outB, col);
    }

    function innerText(t, ox, oy, k) {
      if (t < 189.8 || t > 192.45) return;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(k, k);
      ctx.translate(-P0.x, -P0.y);
      ctx.textBaseline = 'alphabetic';
      const outA = 1 - prog(t, 191.333, .077);
      if (outA > 0) for (const [w, l, r, y, t0] of INNER_A) fitWord(w, l, r, y, fadeIn(t, t0) * outA);
      const aL = Math.min(prog(t, 191.433, .067), 1 - prog(t, 192.333, .093));
      fitWord('Lo-o-ove', 582, 817, 505, aL, LAV, UP_LOVE);
      ctx.restore();
    }

    return {
      render(t) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        ctx.filter = 'none';
        bg(t);
        const p = heartMove(t);
        const cx = lerp(P0.x, P1.x, p), cy = lerp(P0.y, P1.y, p), S = lerp(P0.S, P1.S, p);
        outline(t, cx, cy, S);
        sparkle(t);
        equation(t);
        rightText(t);
        innerText(t, cx, cy, S / P0.S);
        caretAndDot(t);
      },
    };
  },
};
