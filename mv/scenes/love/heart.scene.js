// "I know the algebraic expression of LO-O-OVE" / "Though you are free, I am trapped in LO-O-OVE".
// One continuous shot: the algebraic heart (x²+y²−1)³ − x²y³ = 0 drawn as a sparkling outline on a starfield,
// the equation typed inside, a caret that drops into the heart's origin as a lavender dot, and finally the
// heart shrinking towards (1120, 559) for the hand-off to the bookends segment at 193.60.
import { loadLoveFonts, clamp, lerp, prog, table, heartPath, traceHeart, noise1, rng } from './lib.js';
import { STARS } from './heart/stars.js';
import { SERIF_PATHS } from './heart/serif-paths.js';
import { EQUATION_PATHS } from './heart/equation-paths.js';

const W = 1920, H = 1080;
// Heart placement measured on the original: origin (between cusp and tip) and pixels per unit.
// Heart origin/scale (canvas px; curve y up). Re-fitted to the original's outline ridge at 97 points
// (186-193.6): the previous origin sat ~0.6 px left and ~1.2 px high.
const P0 = { x: 700.0, y: 586.0, S: 352 };
const P1 = { x: 1120.45, y: 559.45, S: 181.75 };
// Progress of the final move (dot x on the original, frame by frame).
const MOVE = [[192.683, 0], [192.7, 0.001], [192.717, 0.002], [192.733, 0.004], [192.75, 0.007], [192.767, 0.01],
  [192.783, 0.014], [192.8, 0.019], [192.817, 0.025], [192.833, 0.031], [192.85, 0.039], [192.867, 0.048],
  [192.883, 0.058], [192.9, 0.07], [192.917, 0.083], [192.933, 0.097], [192.95, 0.115], [192.967, 0.134],
  [192.983, 0.156], [193.0, 0.18], [193.017, 0.207], [193.033, 0.238], [193.05, 0.272], [193.067, 0.311],
  [193.083, 0.354], [193.1, 0.4], [193.117, 0.449], [193.133, 0.5], [193.15, 0.551], [193.167, 0.6],
  [193.183, 0.646], [193.2, 0.689], [193.217, 0.727], [193.233, 0.761], [193.25, 0.792], [193.267, 0.82],
  [193.283, 0.844], [193.3, 0.866], [193.317, 0.885], [193.333, 0.901], [193.35, 0.916], [193.367, 0.93],
  [193.383, 0.941], [193.4, 0.952], [193.417, 0.961], [193.433, 0.968], [193.45, 0.975], [193.467, 0.981],
  [193.483, 0.986], [193.5, 0.99], [193.517, 0.993], [193.533, 0.996], [193.55, 0.998], [193.567, 0.9995], [193.583, 1]];

// Sparkle riding up the right side of the outline (screen coords measured on the original), then drifting off.
const SPARK = [[184.6, 1066, 556], [184.867, 1073, 535], [185.017, 1079, 519], [185.167, 1084, 503], [185.317, 1089, 488],
  [185.467, 1092, 473], [185.617, 1095, 458], [185.767, 1097, 444], [185.917, 1099, 429], [186.067, 1100, 416],
  [186.217, 1101, 402], [186.367, 1101, 390], [186.517, 1100, 379], [186.667, 1100, 369], [186.817, 1099, 358],
  [186.967, 1097, 349], [187.117, 1096, 340], [187.267, 1095, 333], [187.417, 1093, 326], [187.567, 1092, 321],
  [187.717, 1091, 316], [187.867, 1090, 313], [188.017, 1089, 310], [188.167, 1089, 309], [188.65, 1090, 308],
  [188.717, 1095, 306], [188.767, 1111, 301], [188.817, 1121, 298], [188.867, 1132, 295], [188.917, 1144, 292],
  [189.0, 1165, 285], [189.05, 1178, 281], [189.1, 1191, 278], [189.15, 1204, 274], [189.2, 1216, 270], [189.25, 1228, 266], [189.3, 1238, 263], [189.35, 1248, 261]];

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
    const serifPaths=new Map(Object.entries(SERIF_PATHS).map(([w,v])=>[w,{...v,shape:new Path2D(v.path)}]));

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

    // Equation tokens: [text, style, ink-left x, reveal time]. x positions measured on the original.
    const EQ_BASE = 408;
    const EQ = [['(', 'r', 411, 185.61], ['x', 'i', 426, 185.627], ['2', 's', 457, 185.66], ['+', 'r', 494, 185.693],
      ['y', 'i', 539, 185.723], ['2', 's', 570, 185.743], ['−', 'r', 607, 185.777], ['1', 'r', 660, 185.807],
      [')', 'r', 685, 185.84], ['3', 's', 705, 185.86], ['−', 'r', 741, 186.193], ['x', 'i', 788, 186.21],
      ['2', 's', 819, 186.243], ['y', 'i', 839, 186.273], ['3', 's', 871, 186.307], ['=', 'r', 910, 186.76],
      ['0', 'r', 963, 186.793]];
    const EQ_FONT = { r: '400 58px LoveSTIX', i: 'italic 400 58px LoveSTIX', s: '400 40px LoveSTIX' };
    const eqTok = EQ.map(([txt, st, x, t0],i) => {
      ctx.font = EQ_FONT[st];
      const m = ctx.measureText(txt);
      return { txt, font: EQ_FONT[st], x: x + m.actualBoundingBoxLeft, y: st === 's' ? EQ_BASE - 22 : EQ_BASE, t0,shape:new Path2D(EQUATION_PATHS[i]) };
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
      // Static starfield (positions measured on the original).
      const sa = table([[188.4, 1], [189.0, 0.7], [189.6, 0.35], [190.1, 0]], t);
      if (sa > 0) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        for (const [x, y, v] of STARS) {
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
      // The sparkling strands stay until 186.8 and are removed in two steps (186.817, 186.917) on the
      // original; the wide bloom fades separately over the next 1.5 s (band levels measured around the outline).
      const spread = table([[184.7, 1], [186.8, 1], [186.817, .7], [186.9, .55], [186.917, .35], [187.0, .2], [187.1, .05], [187.2, 0]], t);
      const bloom = table([[184.7, .54], [186.8, .57], [186.817, .55], [186.9, .5], [186.917, .45], [187.0, .4], [187.2, .33], [187.5, .27], [187.8, .22], [188.0, .17], [188.5, .1], [189.0, .05], [189.5, 0]], t);
      // Grey rim around the thin outline (measured rim level over time): it fades out during the
      // final shrink, so the outline that hands over to the reprise at 193.6 has no rim.
      const halo = table([[187.5, 0], [187.7, .98], [188.0, .95], [188.5, .93], [189.0, .68], [190.0, .67], [191.2, .65], [191.6, .57], [192.0, .55], [192.95, .52], [193.05, .3], [193.15, .18], [193.25, .05], [193.3, 0]], t);
      const glow = table([[187.0, 1], [187.6, 0.75], [188.4, 0.5], [189.6, 0.12], [190.2, 0.08]], t);
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      // soft bloom
      if (glow > 0) {
        const wide = table([[184.7, 1], [187.0, .8], [188.0, .7], [188.5, .5], [189.0, .2], [189.5, 0]], t);
        if(wide>0){
          // Very wide, faint haze (+3..4 levels 20-60 px either side of the outline, measured).
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
      // the shrunk outline is a little finer than a scaled copy (core level measured at 193.25-193.6)
      ctx.lineWidth = (2.2 - .65 * spread) * k * (1 - .12 * table(MOVE, t));
      traceHeart(ctx, cx, cy, S);
      ctx.stroke();
      ctx.restore();
    }

    function sparkle(t) {
      // Glow amplitude and radial profile measured around the sparkle on the original
      // (excess ~240/195/108/58/37/23 at r 0/4/9/16/25/35 px while it rides the outline).
      const a = table([[184.6, .82], [186.5, .82], [187.0, 1], [187.6, 1], [188.0, .9], [188.65, .88], [188.7, .72], [188.8, .66], [188.95, .63], [189.0, .62], [189.1, .55], [189.15, .5], [189.2, .35], [189.25, .2], [189.3, .1], [189.35, .03], [189.4, 0]], t);
      if (a <= 0) return;
      const x = table(SPARK.map((s) => [s[0], s[1]]), t);
      const y = table(SPARK.map((s) => [s[0], s[2]]), t);
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

    function caretAndDot(t, ox, oy) {
      // blinking caret at the heart's centre
      const on = (t < 184.95) || (t >= 185.45 && t < 185.95) || (t >= 186.45 && t < 186.95) || (t >= 187.45 && t < 187.87);
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
      const p = table(MOVE, t);
      if (p > 0) { x = lerp(699.6, 1120.1, p); y = lerp(585.5, 559.0, p); }
      const r = table([[187.85, 2.4], [188.0, 3.4], [188.1, 4.8], [188.2, 5.8], [188.35, 6.6]], t);
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
      const out = table([[189.683, 1], [189.7, .755], [189.717, .615], [189.733, .47], [189.75, .27], [189.767, .09], [189.783, 0]], t);
      if (out <= 0) return;
      ctx.save();
      ctx.fillStyle = WHITE;
      ctx.textBaseline = 'alphabetic';
      for (const tk of eqTok) {
        const a = clamp((t - tk.t0) / 0.035);
        if (a <= 0) continue;
        ctx.font = tk.font;
        ctx.globalAlpha = a * out;
        ctx.fill(tk.shape,'evenodd');ctx.strokeStyle=WHITE;ctx.lineWidth=.25;ctx.stroke(tk.shape);
      }
      ctx.restore();
    }

    // word fade-in measured on the original: starts ~2 frames before it is legible, ~0.18 s, eased out
    const fadeIn = (t, t0) => 1 - Math.pow(1 - clamp((t - t0 + 0.03) / 0.18), 1.8);

    // Words are placed at the ink extents measured on the original: [text, inkLeft, inkRight, tIn, color, font].
    // The original italic is narrower than any free Garamond, so each word is compressed horizontally to fit.
    const fitCache = new Map();
    function fitWord(w, l, r, y, a, color = WHITE, font = ITAL) {
      if (a <= 0) return;
      const vector=serifPaths.get(font===UP_LOVE?'up:'+w:w);
      if(vector){
        ctx.save();ctx.translate(l,y);ctx.scale((r-l+1)/vector.width,1);ctx.globalAlpha=a;ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=.25;
        ctx.fill(vector.shape,'evenodd');ctx.stroke(vector.shape);ctx.restore();return;
      }
      const key = font + '|' + w;
      let f = fitCache.get(key);
      if (!f) {
        ctx.font = font;
        ctx.letterSpacing = '0px';
        const m = ctx.measureText(w);
        const ink = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        // upright "Lo-o-ove" is letter-spaced in the original; the italic words are condensed
        f = font === UP_LOVE
          ? { sx: 1, ls: (r - l + 1 - ink) / (w.length - 1), left: m.actualBoundingBoxLeft }
          : { sx: (r - l + 1) / ink, ls: 0, left: m.actualBoundingBoxLeft };
        fitCache.set(key, f);
      }
      ctx.save();
      ctx.font = font;
      ctx.letterSpacing = `${f.ls}px`;
      ctx.fillStyle = color;
      ctx.globalAlpha = a;
      ctx.translate(l, y);
      ctx.scale(f.sx, 1);
      ctx.fillText(w, f.left, 0);
      ctx.restore();
    }
    const RIGHT_A = [['I', 1199, 1221, 407.5, 184.0], ['know', 1239, 1376, 407.5, 185.117], ['the', 1394, 1469, 407.5, 185.45],
      ['algebraic', 1199, 1419, 504.5, 185.583], ['expression', 1436, 1690, 504.5, 186.733], ['of', 1199, 1252, 601.5, 187.55],
      ['Lo-o-ove', 1268, 1503, 601.5, 187.70, LAV, UP_LOVE]];
    const RIGHT_B = [['Though', 1200, 1410, 504.5, 188.517], ['you', 1425, 1517, 504.5, 188.917, ORANGE],
      ['are', 1535, 1609, 504.5, 188.967], ['free', 1618, 1714, 504.5, 189.383]];
    const INNER_A = [['I', 540, 562, 407.5, 189.817], ['am', 580, 656, 407.5, 189.883], ['trapped', 673, 859, 407.5, 190.317],
      ['Trapped', 563, 770, 504.5, 190.733], ['in', 788, 835, 504.5, 191.217]];

    function rightText(t) {
      ctx.textBaseline = 'alphabetic';
      // Fade-outs measured frame by frame on the original.
      const outA = table([[188.383, 1], [188.4, .795], [188.417, .563], [188.433, .338], [188.45, .119], [188.467, 0]], t);
      if (outA > 0) for (const [w, l, r, y, t0, col, font] of RIGHT_A) fitWord(w, l, r, y, fadeIn(t, t0) * outA, col, font);
      const outB = table([[190.2, 1], [190.217, .99], [190.233, .96], [190.25, .9], [190.267, .85], [190.283, .79], [190.3, .77], [190.317, .7], [190.333, .65],
        [190.35, .58], [190.367, .55], [190.383, .42], [190.4, .37], [190.417, .3], [190.433, .23], [190.45, .17], [190.467, .11], [190.483, .06], [190.5, 0]], t);
      if (t >= 188.5 && outB > 0) for (const [w, l, r, y, t0, col] of RIGHT_B) fitWord(w, l, r, y, fadeIn(t, t0) * outB, col);
    }

    function innerText(t, ox, oy, k) {
      if (t < 189.8 || t > 192.45) return;
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(k, k);
      ctx.translate(-P0.x, -P0.y);
      ctx.textBaseline = 'alphabetic';
      const outA = table([[191.333, 1], [191.35, .81], [191.367, .59], [191.383, .37], [191.4, .16], [191.417, 0]], t);
      if (outA > 0) for (const [w, l, r, y, t0] of INNER_A) fitWord(w, l, r, y, fadeIn(t, t0) * outA);
      const aL = Math.min(prog(t, 191.433, 0.067), table([[192.333, 1], [192.35, .88], [192.367, .68], [192.383, .48], [192.4, .29], [192.417, .11], [192.433, 0]], t));
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
        const p = table(MOVE, t);
        const cx = lerp(P0.x, P1.x, p), cy = lerp(P0.y, P1.y, p), S = lerp(P0.S, P1.S, p);
        outline(t, cx, cy, S);
        sparkle(t);
        equation(t);
        rightText(t);
        innerText(t, cx, cy, S / P0.S);
        caretAndDot(t, cx, cy);
      },
    };
  },
};
