// 74.0583333333–77.93: an eggplant is drawn as a rotating wire mesh while its nutrition label types in.
// All geometry is procedural; the silhouette and camera parameters were measured from the film.
import { vignetteCanvas, clamp, lerp } from './lib/common.js';
import { AXIS, PM, PR, MESH, CALYX, CALYX_LINES } from './eggplant/geom.js';

const START = 74.0583333333, END = 77.93;
const BG = [
  [223.5, -4.89, -0.45, -8.27, -0.4, -5.52, -0.16, 0.14],
  [222.32, -3.18, 0.91, -10.39, -2.42, -7.44, -0.09, -0.02],
  [225.4, -4.01, 0.28, -9.36, -1.44, -6.55, -0.14, 0.05],
];
const PAPER = '#f4f4f4', BLACK = 'rgb(32,31,36)', PURPLE = 'rgb(68,33,64)', BLUE = 'rgb(65,52,151)';
const FONT = '"Libre Franklin"';
const poly = (p, x) => p.reduce((a, v) => a * x + v, 0);
// The surface profile is a smooth fit to the luma outline, avoiding the video's chroma blocks.
const MID = [-7.0250118795e-12, 9.9223365493e-11, 9.8573337324e-7, .0001382298105, -.04209786203, -15.3303777844];
const RAD = [3.4893153714e-13, -1.7242478841e-10, 5.1076861635e-8, .00002592647341, -.027350728659, 7.16857472169];
const POLE = -244.56;
const mid = (s) => poly(MID, s);
const radius = (s) => Math.max(0, Math.sqrt(Math.max(0, s - POLE)) * poly(RAD, s));
const xy = (s, q) => [AXIS.c[0] + AXIS.d[0] * s + AXIS.n[0] * q, AXIS.c[1] + AXIS.d[1] * s + AXIS.n[1] * q];

export default {
  id: 'simulation/eggplant', start: START, end: END,
  fonts: ['300 36px "Libre Franklin"', '400 28px "Libre Franklin"', '800 78px "Libre Franklin"', '800 120px "Libre Franklin"'],
  create(root, env) {
    const { ctx } = env.canvas(root);
    const bg = vignetteCanvas(BG);
    const outline = [[857.5,472.5],[861.2,482],[862,491],[859.8,501.5]];
    for (let s = 225; s >= POLE; s -= 1) outline.push(xy(s, mid(s) + radius(s)));
    outline.push(xy(POLE, mid(POLE)));
    for (let s = POLE; s <= 225; s += 1) outline.push(xy(s, mid(s) - radius(s)));
    outline.push([782,452]);
    // Smooth cubic leaf boundaries retain the three sharp tips and the double-edged stem.
    const cap = [[917.3,390.9]];
    const cubic = (b, c, d) => {
      const a = cap[cap.length - 1];
      for (let i = 1; i <= 24; i++) {
        const u = i / 24, v = 1 - u;
        cap.push([v*v*v*a[0] + 3*v*v*u*b[0] + 3*v*u*u*c[0] + u*u*u*d[0], v*v*v*a[1] + 3*v*v*u*b[1] + 3*v*u*u*c[1] + u*u*u*d[1]]);
      }
    };
    cubic([882,403],[848,426],[823,442.6]);
    cubic([811,433.2],[795,439.7],[782,452]);
    cubic([749,483],[703,522],[654,564.7]);
    cubic([679,555.4],[706,541.5],[726.4,527.4]);
    cubic([705,550],[699,575],[697.5,605]);
    cubic([723,594],[752,584.2],[770,566]);
    cubic([753.4,590],[748.2,622],[746.4,656.8]);
    cubic([772.2,631],[790.5,607],[807.3,576.4]);
    cubic([821.6,551.7],[839.7,526],[854.9,506.4]);
    cubic([864.6,491],[865.2,480.5],[857.7,472.4]);
    cubic([867.1,449],[891.4,430.7],[927.1,419.1]);
    cap.push([917.3,390.9]);

    function path(points, k = 1, close = false) {
      if (k <= 0 || points.length < 2) return;
      const count = (points.length - 1) * clamp(k), last = Math.floor(count);
      ctx.beginPath(); ctx.moveTo(...points[0]);
      for (let i = 1; i <= last; i++) ctx.lineTo(...points[i]);
      if (last + 1 < points.length) ctx.lineTo(lerp(points[last][0], points[last + 1][0], count - last), lerp(points[last][1], points[last + 1][1], count - last));
      if (close && k >= 1) ctx.closePath();
      ctx.stroke();
    }
    function ink(text, x, baseline, size = 28, weight = 400, color = BLACK, width) {
      if (!text) return;
      ctx.font = `${weight} ${size}px ${FONT}`;
      ctx.fillStyle = color;
      const m = ctx.measureText(text), w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      ctx.save(); ctx.translate(x, baseline);
      if (width) ctx.scale(width / w, 1);
      ctx.fillText(text, m.actualBoundingBoxLeft, 0);
      ctx.restore();
    }
    function typed(text, t, t0, cps = 85) { return text.slice(0, Math.max(0, Math.floor((t - t0) * cps) + 1)); }
    function rule(x, y, w, h = 1, k = 1, color = BLACK) {
      if (k <= 0) return;
      ctx.fillStyle = color; ctx.fillRect(x, y, w * clamp(k), h);
    }
    // Rules and label lines are revealed by a left→right wipe with a quartic ease-out (fitted per element).
    const quart = (k) => 1 - Math.pow(1 - clamp(k), 4);
    const wipe = (t, t0, dur) => (t <= t0 ? 0 : quart((t - t0) / dur));
    // draw() is clipped to [x0, x0 + (x1 - x0)·wipe]
    function wiped(t, t0, dur, x0, x1, draw) {
      const k = wipe(t, t0, dur);
      if (k <= 0) return;
      if (k >= 1) { draw(); return; }
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 4, 0, x1 - x0 + 4 - (x1 - x0) * (1 - k), 1080); ctx.clip();
      draw(); ctx.restore();
    }
    function card(t) {
      ctx.fillStyle = PAPER; ctx.fillRect(120, 118, 584, 249);
      ctx.strokeStyle = PURPLE; ctx.lineWidth = 1;
      ctx.strokeRect(120.5, 118.5, 583, 248);
      rule(134, 228, 556, 1, 1, BLACK);
      const headingFrames = [4624,4627,4631,4634,4638,4641,4644,4648,4651];
      const heading = 'Nutrients'.slice(0, headingFrames.filter(f => t >= (f - .5) / 60).length);
      ctx.font = `900 120px ${FONT}`;
      const fullHeading = ctx.measureText('Nutrients'), partHeading = ctx.measureText(heading);
      const headingWidth = heading ? 555 * (partHeading.actualBoundingBoxLeft + partHeading.actualBoundingBoxRight) / (fullHeading.actualBoundingBoxLeft + fullHeading.actualBoundingBoxRight) : 0;
      ink(heading, 134, 220, 120, 900, PURPLE, headingWidth);
      const revealEdge = (initial, words) => {
        let edge = initial;
        for (const [start,x,end] of words) if (t >= start) edge = Math.max(edge, Math.min(end, x + (t - start) * 6000));
        return edge;
      };
      const firstEdge = revealEdge(153, [[74.2945,165,210],[74.896,220,257],[74.9317,268,412]]);
      ctx.save(); ctx.beginPath(); ctx.rect(120,233,firstEdge - 120,42); ctx.clip();
      ink('If I’m an eggplant', 134, 264, 35, 400, PURPLE); ctx.restore();
      const secondEdge = revealEdge(120, [[75.6043,135,221],[75.898,230,240],[76.0938,248,307],[76.2888,313,387],[76.5326,394,414],[76.825,422,475]]);
      ctx.save(); ctx.beginPath(); ctx.rect(120,274,Math.max(0,secondEdge - 120),41); ctx.clip();
      ink('Then I will give u my', 135, 305, 35.5, 850, PURPLE, 338); ctx.restore();
      if (t >= 76.55) rule(394, 311, 18, 2, 1, '#b66d44');
      rule(134, 318, 556, 35, wipe(t, 74.515, 0.222), PURPLE);
    }
    function mixedLine(prefix, value, x, y, t, t0, dur) {
      ctx.font = `800 28px ${FONT}`;
      const adv = ctx.measureText(prefix + ' ').width;
      ctx.font = `400 28px ${FONT}`;
      const right = x + adv + ctx.measureText(value.trim()).width;
      wiped(t, t0, dur, x, right, () => {
        ink(prefix, x, y + 1, 28, 800);
        ink(value.trim(), x + adv, y + 1, 28, 400);
      });
    }
    function wipedInk(text, x, y, t, t0, dur, size = 28, weight = 400) {
      ctx.font = `${weight} ${size}px ${FONT}`;
      const w = ctx.measureText(text).width;
      wiped(t, t0, dur, x, x + w, () => ink(text, x, y, size, weight));
    }
    function nutrientSweep(t, start, y) {
      const front = 1786 - 3050 * (t - start), length = 190;
      if (t < start || front + length < 1230) return;
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.rect(1230, y - 8, 556, 17); ctx.clip();
      const gradient = ctx.createLinearGradient(front, 0, front + length, 0);
      gradient.addColorStop(0, 'rgba(90,78,208,0.98)');
      gradient.addColorStop(0.1, 'rgba(90,78,208,0.98)');
      gradient.addColorStop(0.5, 'rgba(90,78,208,0.76)');
      gradient.addColorStop(1, 'rgba(90,78,208,0)');
      ctx.strokeStyle = gradient;
      for (const [width, alpha] of [[11, 0.09], [7, 0.18], [3, 1]]) {
        ctx.globalAlpha = alpha; ctx.lineWidth = width;
        ctx.beginPath(); ctx.moveTo(front, y + 0.5); ctx.lineTo(front + length, y + 0.5); ctx.stroke();
      }
      ctx.restore();
    }
    function nutrition(t) {
      ctx.fillStyle = PAPER; ctx.fillRect(1216, 118, 584, 844);
      ctx.strokeStyle = BLACK; ctx.lineWidth = 1; ctx.strokeRect(1216.5, 118.5, 583, 843);
      ink('Nutrition Facts', 1230, 188, 76, 900, BLACK, 555);
      rule(1230, 196, 556);
      ink('Varied servings per container', 1230, 232, 35, 400);
      ink('Serving size', 1230, 273, 35.5, 825, BLACK, 210);
      ink('1 cup (82g)', 1599, 273, 35.3, 900, BLACK, 187);
      rule(1230, 286, 556, 35, wipe(t, 74.515, 0.222));
      wiped(t, 74.9818, 0.1122, 1230, 1463, () => ink('Amount per serving', 1230, 347, 24.2, 875));
      wiped(t, 75.040, 0.1613, 1230, 1455, () => ink('Calories', 1230, 420, 55.5, 900, BLACK, 225));
      if (t >= 4553.5 / 60) ink('20', 1681, 420, 76.5, 875, BLACK, 104);
      rule(1230, 429, 556, 18, wipe(t, 75.901, 0.172));
      // "% Daily Value*" sits at its final (right-aligned) place and is wiped in left→right
      ctx.font = `800 24.3px ${FONT}`;
      const m = ctx.measureText('% Daily Value*'), dvx = 1786 - m.actualBoundingBoxLeft - m.actualBoundingBoxRight;
      wiped(t, 75.442, 0.0971, dvx, 1786, () => ink('% Daily Value*', dvx, 474, 24.3, 800));
      [482,522,562,602,642,682].forEach((y, i) => rule(1230, y, 556, 1, wipe(t, 75.4677 + i * 0.0288, 0.1475)));
      rule(1230, 722, 556, 35, wipe(t, 75.6405, 0.172));
      rule(1230, 796, 556, 1, wipe(t, 75.669, 0.1475));
      rule(1230, 855, 556, 19, wipe(t, 75.756, 0.173));
      mixedLine('Total Fat', ' 0g', 1230, 511, t, 75.6637, 0.1186);
      mixedLine('Sodium', ' 0mg', 1230, 551, t, 75.8947, 0.1138);
      mixedLine('Total Carbohydrate', ' 5g', 1230, 591, t, 76.1237, 0.1268);
      wipedInk('Dietary Fiber 2g', 1256, 632, t, 76.3573, 0.1167);
      wipedInk('Total Sugars 3g', 1257, 672, t, 76.5895, 0.1073);
      mixedLine('Protein', ' 1g', 1230, 711, t, 76.8174, 0.1138);
      wipedInk('Potassium 190mg', 1230, 786, t, 77.0488, 0.1149);
      const percentRows = [[0,511,4539.5/60,800,522],[0,551,4553.5/60,800,562],[2,591,4567.5/60,800,602],[7,631,4581.5/60,800,642],[4,786,4622.5/60,400,796]];
      for (const [i, [value,y,t0,weight,underline]] of percentRows.entries()) {
        if (t < t0) continue;
        const sweepStart = 77.168 + i * (60 / 130 / 4);
        const colorK = clamp((t - sweepStart) / 0.025);
        const pctColor = `rgb(${Math.round(32 + 33 * colorK)},${Math.round(31 + 21 * colorK)},${Math.round(36 + 115 * colorK)})`;
        const v = Math.round(value * clamp((t - t0) / 0.08));
        const str = `${v}%`; ctx.font = `${weight} 28px ${FONT}`;
        const mm = ctx.measureText(str); ink(str, 1786 - mm.actualBoundingBoxLeft - mm.actualBoundingBoxRight, y + 1, 28, weight, pctColor);
        nutrientSweep(t, sweepStart, underline);
      }
      const small = (s, x, y, t0, dur) => wipedInk(s, x + 1, y, t, t0, dur, 21, 400);
      small('Not a significant source of saturated fat, trans fat,',1230,820,75.7014,0.1238);
      small('cholesterol, added sugars, vitamin D, calcium, and iron.',1230,845,75.7288,0.1331);
      small('* The % Daily Value (DV) tells you how much a nutrient in',1230,897,75.7882,0.1247);
      small('a serving of food contributes to a daily diet.',1242,922,75.8153,0.1313);
      small('2,000 calories a day is used for general nutrition advice.',1242,947,75.8443,0.1320);
    }
    function eggplant(t) {
      if (t < 74.97) return;
      const ca = Math.cos(MESH.alpha), sa = Math.sin(MESH.alpha);
      const dr = [ca * AXIS.d[0] - sa * AXIS.d[1], sa * AXIS.d[0] + ca * AXIS.d[1]], nr = [-dr[1], dr[0]];
      const point = (s, phi) => {
        const r = radius(s), c = xy(s, mid(s));
        return [c[0] + nr[0] * r * Math.cos(phi) - dr[0] * MESH.b * r * Math.sin(phi), c[1] + nr[1] * r * Math.cos(phi) - dr[1] * MESH.b * r * Math.sin(phi)];
      };
      const phase = MESH.phi0 + MESH.omega * (t - MESH.t0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // Construction (measured): front meridians grow from the cap end down to the tip, the leftmost
      // first; ring segments follow the meridians that have already passed them, sticking out as short
      // ticks towards the next meridian. The left outline acts as the first meridian.
      const TOP = 225, LEN = 225 - POLE, SP = 2 * Math.PI / MESH.N;
      // Traced frame by frame on the reference: the front meridians (ordered left→right) are drawn in
      // groups on 16th notes — the left one at frame 4507, the next two at 4514, two more at 4521 and the
      // rest at 4528 — each running from under the cap down to the tip in ~7 frames (slight ease-out).
      const RANK_START = [4506, 4507.6, 4514.5, 4514.5, 4521.4, 4521.4, 4528.4, 4528.4];
      const HIDDEN = (TOP - 121) / LEN; // the top of every meridian sits under the cap
      const grow = (start, lag = 0) => {
        const u = (t * 60 - lag - start) / 7.3;
        if (u <= 0) return 0;
        return HIDDEN + (1 - HIDDEN) * (1 - Math.pow(1 - clamp(u), 1.3));
      };
      const frontPhis = [];
      for (let k = 0; k < MESH.N; k++) { const phi = phase + 2 * Math.PI * k / MESH.N; if (Math.sin(phi) > 0) frontPhis.push(phi); }
      frontPhis.sort((a, b) => Math.cos(a) - Math.cos(b));
      const frontProg = (phi, lag) => grow(RANK_START[Math.min(RANK_START.length - 1, frontPhis.indexOf(phi))], lag);
      // ring segments trail the meridian heads by ~1.5 frames
      const edgeProg = grow(4506, 1.5);
      // Rear meridians and rings are visible faintly through the translucent body.
      // Front wires get heavier towards the right-hand silhouette (cos φ → 1), as in the reference.
      const weight = (phi) => 1.05 + 1.5 * Math.pow(clamp((Math.cos(phi) - 0.2) / 0.8), 1.5);
      const wireInk = () => 'rgba(28,12,26,0.95)'; // the reference's front wires are equally dark
      function pathW(pts, k, phiAt) {
        if (k <= 0) return;
        const count = (pts.length - 1) * clamp(k), last = Math.floor(count);
        for (let a = 0; a < Math.ceil(count); a += 4) {
          const b = Math.min(a + 4, last);
          ctx.beginPath(); ctx.moveTo(...pts[a]);
          for (let i = a + 1; i <= b; i++) ctx.lineTo(...pts[i]);
          if (b === last && last < count && last + 1 < pts.length) ctx.lineTo(lerp(pts[last][0], pts[last + 1][0], count - last), lerp(pts[last][1], pts[last + 1][1], count - last));
          ctx.lineWidth = weight(phiAt(a + 2)); ctx.strokeStyle = wireInk(phiAt(a + 2));
          ctx.stroke();
        }
      }
      for (const front of [false, true]) {
        ctx.lineWidth = front ? 1.3 : 0.8;
        ctx.strokeStyle = front ? 'rgba(28,12,26,0.95)' : 'rgba(107,91,112,0.3)';
        const reached = [];
        for (let k = 0; k < MESH.N; k++) {
          const phi = phase + 2 * Math.PI * k / MESH.N;
          if ((Math.sin(phi) > 0) !== front) continue;
          const pts = [];
          for (let s = TOP; s >= POLE; s -= 2) pts.push(point(s, phi));
          if (front) {
            const p = frontProg(phi, 0);
            ctx.lineWidth = weight(phi); ctx.strokeStyle = wireInk(phi);
            path(pts, p);
            const ph = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            reached.push([ph, frontProg(phi, 1.5)]);
          } else {
            path(pts, clamp((t - 75.55 - (Math.cos(phi) + 1) * .1) / .48));
          }
        }
        let j = 0;
        for (let s = -240 + MESH.phase; s < 226; s += MESH.spacing, j++) {
          const pts = [];
          for (let i = 0; i <= 80; i++) pts.push(point(s, Math.PI + (front ? -1 : 1) * Math.PI * i / 80));
          if (front) {
            const q = (TOP - s) / LEN;
            let phiMin = edgeProg >= q ? Math.PI : null, all = true;
            for (const [ph, p] of reached) {
              if (p >= q) phiMin = phiMin === null ? ph : Math.min(phiMin, ph);
              else all = false;
            }
            if (phiMin === null) continue;
            const end = all ? 0 : Math.max(0, phiMin - 0.25 * SP);
            pathW(pts, (Math.PI - end) / Math.PI, (i) => Math.PI - (Math.PI * i) / 80);
          } else {
            const ringGrow = clamp((t - 75.55) / .52);
            if (ringGrow > 0) path(pts, clamp(ringGrow * 2 - (10 - j) * .1));
          }
        }
      }
      ctx.strokeStyle = 'rgb(28,9,24)'; ctx.lineWidth = 1.5;
      path(outline, wipe(t, 74.973, 0.18));
      // The cap is traced after the body; the green slowly washes in on the final word.
      const ck = clamp((t - 75.2) / 0.09), fillK = clamp((t - 77.06) / 0.2);
      if (ck > 0) {
        ctx.beginPath(); cap.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.closePath();
        // Even before the green arrives the cap occludes the wire mesh beneath it.
        const c = [lerp(222,194,fillK),lerp(222,207,fillK),lerp(225,183,fillK)];
        ctx.fillStyle = `rgb(${c.map(Math.round).join(',')})`; ctx.fill();
        // The leaves are traced first (75.18–75.27), then the stem (75.265–75.30), as in the reference.
        ctx.strokeStyle = `rgba(81,105,70,0.85)`; ctx.lineWidth = 1.2;
        path(cap.slice(24, 218), clamp((t - 75.18) / 0.09));
        path([...cap.slice(217), cap[0], ...cap.slice(1, 25)], clamp((t - 75.265) / 0.035));
        ctx.strokeStyle = `rgba(81,105,70,0.75)`; ctx.lineWidth = 0.9;
        CALYX_LINES.forEach((p, i) => path(p, i < 3 ? clamp((t - 75.275 - i * 0.008) / 0.035) : clamp((t - 75.21 - (i - 3) * 0.01) / 0.1)));
      }
      // Until the stem is traced, the body is closed by a provisional rounded top (drawn over the cap fill).
      if (t < 75.29) {
        const top = cap.slice(24, 49).reverse();
        for (let i = 1; i <= 16; i++) {
          const u = i / 16, v = 1 - u, a = [823, 442.6], b = [847, 444], c = [859, 458], d = [857.5, 472.5];
          top.push([v*v*v*a[0] + 3*v*v*u*b[0] + 3*v*u*u*c[0] + u*u*u*d[0], v*v*v*a[1] + 3*v*v*u*b[1] + 3*v*u*u*c[1] + u*u*u*d[1]]);
        }
        ctx.strokeStyle = 'rgba(70,82,64,.9)'; ctx.lineWidth = 1.2;
        path(top, clamp((t - 75.10) / .08));
      }
    }
    return { render(t) {
      if (ctx.reset) ctx.reset(); // pristine 2D state every frame
      ctx.setTransform(1,0,0,1,0,0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      // Mesh strokes use round joins; restore the rectangular cards' fresh-context join each frame.
      ctx.lineJoin = 'miter';
      ctx.drawImage(bg,0,0,1920,1080); card(t); nutrition(t); eggplant(t);
    }};
  },
};
