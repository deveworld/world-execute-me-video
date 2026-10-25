// 81.55-85.11  "If I'm a tabby cat / Then I will purr for your / Enjoyment"
// Beige paper; a cat drawn as one continuous line and a handwritten lyric written on stroke by stroke.
// The line and the lyric are polylines vectorised from the reference and drawn
// with a pen dot; face, tabby marks and underline are procedural. Canvas 2D.
import { clamp, lerp, prog, ease } from './lib.js';
import { TracedStrokes, loadStrokes } from './strokes.js';
import { CAT_INK } from './precision_art.js';
import { createCatTailMotion } from './cat-tail-motion.js';

const T0 = 81.545, T1 = 85.11;
const INK = '#16110f';
const TEXT_INK = '#211c19';
const TABBY = '#b17c45';

// tapered orange marks: a -> b drawn on, bending through mid; [t0, dur, maxWidth]
const MARKS = [
  { a: [1240, 368], m: [1251.1, 370.3], b: [1261, 375], t: 83.04, w: 3.8 },
  { a: [1096, 402], m: [1103, 405.4], b: [1111, 409], t: 83.04, w: 3.8 },
  { a: [1303, 400], m: [1289.5, 401.9], b: [1276, 407], t: 83.045, w: 4.2 },
  { a: [1333, 510], m: [1319, 526.2], b: [1305, 547], t: 83.252, w: 4.6 },
  { a: [1369, 552], m: [1349.6, 571], b: [1332, 599], t: 83.255, w: 4.8 },
  { a: [1403, 594], m: [1381, 617.1], b: [1362, 651], t: 83.258, w: 4.8 },
  { a: [1431, 648], m: [1409, 675], b: [1392, 715], t: 83.262, w: 4.8 },
  { a: [1455, 758], m: [1435.2, 763.2], b: [1416, 775], t: 83.5, w: 4.4 },
  { a: [1451, 798], m: [1432.4, 802.1], b: [1414, 811], t: 83.503, w: 4.2 },
  { a: [1104, 710], m: [1114.9, 715.4], b: [1127, 719], t: 83.618, w: 4.0 },
  { a: [1106, 750], m: [1117.1, 755.5], b: [1131, 759], t: 83.62, w: 3.8 },
];

function quad(a, m, b, s) {
  // quadratic through a (s=0), m (s=.5), b (s=1)
  const c = [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2];
  const u = 1 - s;
  return [u * u * a[0] + 2 * u * s * c[0] + s * s * b[0], u * u * a[1] + 2 * u * s * c[1] + s * s * b[1]];
}

function taper(ctx, a, m, b, wmax, upto) {
  const N = 24;
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const s = (i / N) * upto;
    const p = quad(a, m, b, s);
    const q = quad(a, m, b, Math.min(1, s + 0.01));
    const p0 = quad(a, m, b, Math.max(0, s - 0.01));
    let dx = q[0] - p0[0], dy = q[1] - p0[1];
    const L = Math.hypot(dx, dy) || 1;
    dx /= L; dy /= L;
    const w = (wmax / 2) * Math.pow(Math.sin(Math.PI * clamp(s, 0.02, 0.98)), 0.75);
    left.push([p[0] - dy * w, p[1] + dx * w]);
    right.push([p[0] + dy * w, p[1] - dx * w]);
  }
  ctx.beginPath();
  left.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
}

function polyPrefix(ctx, pts, k) {
  // draw the first fraction k of a polyline (by length)
  let L = 0;
  const seg = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(d);
    L += d;
  }
  let rem = L * k;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && rem > 0; i++) {
    const d = seg[i - 1];
    if (rem >= d) ctx.lineTo(pts[i][0], pts[i][1]);
    else ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], rem / d), lerp(pts[i - 1][1], pts[i][1], rem / d));
    rem -= d;
  }
  ctx.stroke();
}

function sampleQuadPath(list, n = 12) {
  // list of [a, ctrl, b] quadratic pieces -> points
  const out = [];
  list.forEach(([a, c, b], j) => {
    for (let i = j ? 1 : 0; i <= n; i++) {
      const s = i / n, u = 1 - s;
      out.push([u * u * a[0] + 2 * u * s * c[0] + s * s * b[0], u * u * a[1] + 2 * u * s * c[1] + s * s * b[1]]);
    }
  });
  return out;
}

// M on the forehead: two rounded arches
const M_PTS = sampleQuadPath([
  [[1150.7, 341.7], [1153.5, 318], [1157.5, 310.5]],
  [[1157.5, 310.5], [1162.5, 305], [1166, 318]],
  [[1166, 318], [1168.5, 327], [1170.5, 333]],
  [[1170.5, 333], [1178, 318], [1184, 308.5]],
  [[1184, 308.5], [1189.5, 302], [1192.5, 314]],
  [[1192.5, 314], [1195.5, 328], [1196.7, 341.7]],
]);
const MOUTH_L = sampleQuadPath([[[1160.2, 409.5], [1160.2, 412], [1160.2, 414.5]], [[1160.2, 414.5], [1155.5, 424], [1148, 416.8]]]);
const MOUTH_R = sampleQuadPath([[[1160.2, 414.5], [1165, 424], [1174.6, 416.8]]]);

function eye(ctx, c, hw, hh, ang, open, pupil) {
  ctx.save();
  ctx.translate(c[0], c[1]);
  ctx.rotate(ang);
  const h = Math.max(0.6, hh * open);
  ctx.lineWidth = 2.3;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(-hw, 0);
  ctx.quadraticCurveTo(0, -2 * h, hw, 0);
  ctx.quadraticCurveTo(0, 2 * h, -hw, 0);
  ctx.closePath();
  ctx.stroke();
  // pupil clipped to the almond
  ctx.clip();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(pupil[0], pupil[1], pupil[2], pupil[3], 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function closedEye(ctx, a, b, sag, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 2 * sag, b[0], b[1]);
  ctx.stroke();
  ctx.restore();
}

export default {
  id: 'existence/cat',
  start: T0,
  end: T1,
  async create(root, env) {
    root.style.background = 'radial-gradient(ellipse 1104px 1080px at 960px 540px, #e3ded9 40%, #e1dcd7 58%, #dcd7d2 72.5%, #d6d1cc 87%, #d2cdc8 100%)';
    const { canvas, ctx } = env.canvas(root);
    const [lineData, textData] = await Promise.all([loadStrokes('cat_line'), loadStrokes('cat_text')]);
    const line = new TracedStrokes(lineData, { width: 3.1, color: INK, dotR: 3.6, dotHold: 0.018 });
    const poseTail = createCatTailMotion(line.chains);
    const text = new TracedStrokes(textData, { width: 3.0, color: TEXT_INK, dotR: 3.4, dotHold: 0.018 });
    const lettering=CAT_INK.map(d=>new Path2D(d));
    const tC=document.createElement('canvas');tC.width=1920;tC.height=1080;const tctx=tC.getContext('2d');
    const textRows=[[100,550,870,663,82.80],[100,663,870,769,84.37],[100,770,870,970,85.0]];

    return {
      render(t) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        poseTail(t);
        line.draw(ctx, t);
        // The finished lettering is revealed through a wide mask of the traced pen path, so the ink keeps
        // its shape when a row completes.
        textRows.forEach(([x,y,X,Y,done],i)=>{
          if(t>=done){ctx.save();ctx.beginPath();ctx.rect(x,y,X-x,Y-y);ctx.clip();ctx.fillStyle=TEXT_INK;ctx.translate(.5,.5);ctx.fill(lettering[i],'evenodd');ctx.restore();return;}
          tctx.clearRect(x,y,X-x,Y-y);tctx.save();tctx.beginPath();tctx.rect(x,y,X-x,Y-y);tctx.clip();
          text.draw(tctx,t,{width:10,color:'#fff'});
          tctx.globalCompositeOperation='source-in';tctx.fillStyle=TEXT_INK;tctx.translate(.5,.5);tctx.fill(lettering[i],'evenodd');tctx.restore();
          ctx.drawImage(tC,x,y,X-x,Y-y,x,y,X-x,Y-y);
        });

        // forehead M
        ctx.save();
        ctx.strokeStyle = TABBY;
        ctx.lineWidth = 3.3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        const km = prog(t, 82.666, 0.028); // the source draws the M within two frames
        if (km > 0) polyPrefix(ctx, M_PTS, km);
        ctx.restore();

        // eyes: open 82.68-82.76, squint shut 84.55-84.65, then closed arcs
        const open = ease.outQuad(prog(t, 82.68, 0.08)) * (1 - ease.inOutQuad(prog(t, 84.55, 0.1)));
        if (t >= 82.68 && open > 0.02) {
          eye(ctx, [1128.3, 368.4], 15.2, 6.6, 0.09, open, [1.2, 0.6, 2.3, 6.2]);
          eye(ctx, [1215, 370], 19.6, 7.2, -0.18, open, [-4.3, 0.9, 2.6, 6.8]);
        }
        const kc = prog(t, 84.63, 0.05);
        if (kc > 0) {
          closedEye(ctx, [1114.2, 373], [1142.6, 373.2], 3.3, kc);
          closedEye(ctx, [1197.2, 375.4], [1233.6, 375.2], 3.9, kc);
        }
        // nose (pops in) and mouth (drawn)
        const kn = prog(t, 82.685, 0.05);
        if (kn > 0) {
          const s = ease.outBack(kn, 2.2);
          ctx.save();
          ctx.translate(1160.3, 403);
          ctx.scale(s, s);
          ctx.fillStyle = INK;
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(-10.2, -3.4);
          ctx.quadraticCurveTo(0, -5.2, 10.6, -3.4);
          ctx.lineTo(0, 6.4);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        const kmo = ease.outQuad(prog(t, 82.748, 0.05));
        if (kmo > 0) {
          ctx.save();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 2.2;
          ctx.lineCap = 'round';
          polyPrefix(ctx, MOUTH_L, kmo);
          polyPrefix(ctx, MOUTH_R, kmo);
          ctx.restore();
        }

        // tabby marks
        ctx.fillStyle = TABBY;
        for (const mk of MARKS) {
          const k = ease.outQuad(prog(t, mk.t, 0.04));
          if (k > 0) taper(ctx, mk.a, mk.m, mk.b, mk.w, k);
        }

        // underline under "your"
        const ku = ease.outQuad(prog(t, 84.35, 0.067));
        if (ku > 0) {
          ctx.save();
          ctx.strokeStyle = '#b9592f';
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.moveTo(704, 757.2);
          ctx.lineTo(lerp(704, 837.5, ku), 757.2);
          ctx.stroke();
          ctx.restore();
        }
      },
    };
  },
};
