// 77.93-81.55  "If I'm a tomato / Then I will give u / Antioxidants"
// Cream paper, engraving-style tomato cross-section (Fig. 1) and the lycopene skeletal formula (Fig. 2)
// whose conjugated chain turns red as •OH radicals are quenched. SVG, everything precomputed in create().
import { svg, rootSvg, clamp, lerp, prog, ease, loadFamilies } from './lib.js';
import SEEDS from './tomato_seeds.js';

const T0 = 77.93, T1 = 81.545;
const CX = 317.5, CY = 540.5;
const DEG = Math.PI / 180;

// outline radius (screen angle, deg -> px), slightly irregular
const RAD_TABLE = [[0, 195], [15, 195.5], [30, 195], [45, 195], [60, 193.5], [75, 194], [90, 194.5], [105, 196], [120, 197],
  [135, 196.5], [150, 193.5], [165, 192.5], [180, 192.5], [195, 196.5], [210, 197], [225, 197.5], [240, 196], [255, 194.5],
  [270, 193.5], [285, 194.5], [300, 195], [315, 197.5], [330, 197.5], [345, 195.5], [360, 195]];
function outerR(phiDeg) {
  let a = ((phiDeg % 360) + 360) % 360;
  for (let i = 1; i < RAD_TABLE.length; i++) {
    if (a <= RAD_TABLE[i][0]) {
      const [a0, r0] = RAD_TABLE[i - 1], [a1, r1] = RAD_TABLE[i];
      const k = (a - a0) / (a1 - a0);
      return lerp(r0, r1, (1 - Math.cos(k * Math.PI)) / 2) - 1;
    }
  }
  return 194;
}
const P = (r, phiDeg) => [CX + r * Math.cos(phiDeg * DEG), CY + r * Math.sin(phiDeg * DEG)];

// septa directions (screen angles, clockwise from +x) and lobe radii of the columella per locule
const SEPTA = [-96.8, -10.2, 85.0, 176.3];
const HALF = 6, RO = 163;

// columella: quatrefoil = soft union of four circles, one bulging into the middle of each locule
const MIDS = SEPTA.map((a, k) => (a + (k < 3 ? SEPTA[k + 1] : SEPTA[0] + 360)) / 2);
function columellaR(phi) {
  let acc = 0;
  for (const m of MIDS) {
    const d = (phi - m) * DEG;
    const p = 33 * Math.cos(d), h = 33 * Math.abs(Math.sin(d));
    const r = h < 25.5 ? p + Math.sqrt(25.5 * 25.5 - h * h) : 0;
    acc += Math.exp(0.45 * r);
  }
  return Math.log(acc) / 0.45;
}

function trimPoly(pts, d0, d1) {
  // remove length d0 from the start and d1 from the end of a polyline
  const cut = (arr, d) => {
    let acc = 0;
    for (let i = 1; i < arr.length; i++) {
      const seg = Math.hypot(arr[i][0] - arr[i - 1][0], arr[i][1] - arr[i - 1][1]);
      if (acc + seg >= d) {
        const k = (d - acc) / seg;
        return [[lerp(arr[i - 1][0], arr[i][0], k), lerp(arr[i - 1][1], arr[i][1], k)], ...arr.slice(i)];
      }
      acc += seg;
    }
    return arr.slice(-1);
  };
  let out = cut(pts, d0);
  out = cut(out.slice().reverse(), d1).reverse();
  return out;
}

function loculePath(k) {
  const a = SEPTA[k], b = k < 3 ? SEPTA[k + 1] : SEPTA[0] + 360;
  const dA = [Math.cos(a * DEG), Math.sin(a * DEG)], nA = [Math.cos((a + 90) * DEG), Math.sin((a + 90) * DEG)];
  const dB = [Math.cos(b * DEG), Math.sin(b * DEG)], nB = [Math.cos((b - 90) * DEG), Math.sin((b - 90) * DEG)];
  // inner curve sampled from the columella; find where side lines meet it (approx: radius at the side angle)
  const inner = [];
  const aIn = a + Math.asin(HALF / 40) / DEG, bIn = b - Math.asin(HALF / 40) / DEG;
  for (let i = 0; i <= 60; i++) {
    const p = lerp(bIn, aIn, i / 60);
    inner.push(P(columellaR(p) + 2, p));
  }
  const rA0 = Math.hypot(inner[inner.length - 1][0] - CX, inner[inner.length - 1][1] - CY);
  const rB0 = Math.hypot(inner[0][0] - CX, inner[0][1] - CY);
  const sideA = [], sideB = [], arc = [];
  for (let i = 0; i <= 20; i++) {
    const r = lerp(rA0, RO, i / 20);
    sideA.push([CX + dA[0] * r + nA[0] * HALF, CY + dA[1] * r + nA[1] * HALF]);
  }
  const arcA = a + Math.asin(HALF / RO) / DEG, arcB = b - Math.asin(HALF / RO) / DEG;
  for (let i = 0; i <= 60; i++) arc.push(P(RO, lerp(arcA, arcB, i / 60)));
  for (let i = 0; i <= 20; i++) {
    const r = lerp(RO, rB0, i / 20);
    sideB.push([CX + dB[0] * r + nB[0] * HALF, CY + dB[1] * r + nB[1] * HALF]);
  }
  const RC = 9, RI = 5;
  const segs = [trimPoly(sideA, RI, RC), trimPoly(arc, RC, RC), trimPoly(sideB, RC, RI), trimPoly(inner, RI, RI)];
  const corners = [sideA[sideA.length - 1], arc[arc.length - 1], sideB[sideB.length - 1], inner[inner.length - 1]];
  let d = '';
  segs.forEach((s, i) => {
    d += (i === 0 ? 'M' : 'L') + s.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('L');
    const c = corners[i], nxt = segs[(i + 1) % 4][0];
    d += `Q${c[0].toFixed(2)},${c[1].toFixed(2)} ${nxt[0].toFixed(2)},${nxt[1].toFixed(2)}`;
  });
  return { d: d + 'Z', a, b };
}

// --- lycopene ---------------------------------------------------------------------------------------
const MX0 = 600, MDX = 38, YU = 529, YD = 550;
const vx = (i) => [MX0 + MDX * i, i % 2 === 0 ? YU : YD];
const DOUBLE = new Set([1, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 29]); // bond i joins vertex i and i+1
const METHYL = { 1: 1, 5: 1, 9: 1, 13: 1, 18: -1, 22: -1, 26: -1, 30: -1 }; // +1 down, -1 up
const BOND_T0 = 79.60, BOND_DT = 0.0578, BOND_LEN = 0.05;
const bondTime = (i) => BOND_T0 + Math.abs(i - 15) * BOND_DT;

// red conjugation: half-width grows from the chain centre in steps
const MID = (vx(15)[0] + vx(16)[0]) / 2;
const RED_STEPS = [[80.50, 0, 19, 0.05], [80.60, 19, 95, 0.067], [80.717, 95, 171, 0.067], [80.833, 171, 247, 0.067],
  [80.95, 247, 323, 0.067], [81.067, 323, 400, 0.067]];
function redHalf(t) {
  let hw = 0;
  for (const [s, a, b, d] of RED_STEPS) if (t >= s) hw = lerp(a, b, clamp((t - s) / d));
  return hw;
}

// •OH radicals: keyframes [t, x, y] (text centre), quench point, ring size
const RADICALS = [
  { appear: 79.40, keys: [[79.40, 963, 344], [79.67, 971, 368], [80.0, 980, 413], [80.2, 993, 439], [80.4, 1007, 467], [80.5, 1020, 478], [80.66, 1034, 506]], end: 80.70, hit: [1037, 539], rmax: 24 },
  { appear: 79.50, keys: [[79.50, 1598, 762], [79.8, 1576, 733], [80.2, 1545, 683], [80.4, 1533, 656], [80.75, 1509, 606], [80.9, 1497, 577], [80.98, 1495, 562]], end: 81.0, hit: [1494, 537], rmax: 24 },
  { appear: 79.63, keys: [[79.63, 1263, 779], [80.0, 1256, 741], [80.4, 1238, 686], [80.75, 1222, 637], [81.0, 1208, 604], [81.05, 1204, 592], [81.2, 1191, 566]], end: 81.215, hit: [1189, 537], rmax: 64, big: true },
  { appear: 79.73, keys: [[79.73, 737, 361], [80.0, 750, 384], [80.4, 775, 420], [80.75, 793, 464], [80.85, 798, 474], [81.05, 808, 507], [81.12, 809, 520]], end: 81.13, hit: [808, 537], rmax: 24 },
];
function keyAt(keys, t) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const k = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
      return [lerp(keys[i - 1][1], keys[i][1], k), lerp(keys[i - 1][2], keys[i][2], k)];
    }
  }
  const l = keys[keys.length - 1];
  return [l[1], l[2]];
}

export default {
  id: 'existence/tomato',
  start: T0,
  end: T1,
  fonts: ['400 24px "Latin Modern Roman"', 'italic 400 24px "Latin Modern Roman"'],
  async create(root, env) {
    await loadFamilies('Old Standard TT');
    await Promise.all(['400 70px "Old Standard TT"', 'italic 400 150px "Old Standard TT"'].map((f) => document.fonts.load(f)));
    root.style.background = '#f3eddf';
    const s = rootSvg(root);
    const defs = svg('defs', {}, s);
    const rng = env.rng(4242);

    // gradients
    const discGrad = svg('radialGradient', { id: 'ex-tom-disc', gradientUnits: 'userSpaceOnUse', cx: CX, cy: CY, r: 197 }, defs);
    [[0, '#e3452f'], [0.9, '#e3452f'], [0.97, '#dc432f'], [1, '#cf3e2c']].forEach(([o, c]) => svg('stop', { offset: o, 'stop-color': c }, discGrad));
    const locGrad = svg('radialGradient', { id: 'ex-tom-loc', gradientUnits: 'userSpaceOnUse', cx: CX, cy: CY, r: 165 }, defs);
    [[0, '#f1cbbe'], [0.36, '#eec1b4'], [0.55, '#ebb2a6'], [0.67, '#eaa79a'], [0.79, '#ea9e91'], [0.91, '#e99588'], [1, '#e78f82']]
      .forEach(([o, c]) => svg('stop', { offset: o, 'stop-color': c }, locGrad));
    const glowGrad = svg('radialGradient', { id: 'ex-tom-glow', gradientUnits: 'userSpaceOnUse', cx: CX, cy: CY, r: 82 }, defs);
    [[0, '#eec6b8', 1], [0.48, '#eec6b8', 1], [0.72, '#eec6b8', 0.35], [1, '#eec6b8', 0]]
      .forEach(([o, c, a]) => svg('stop', { offset: o, 'stop-color': c, 'stop-opacity': a }, glowGrad));
    const blur = svg('filter', { id: 'ex-tom-blur', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    svg('feGaussianBlur', { stdDeviation: 4 }, blur);

    // ---------- tomato ----------
    const outlinePts = [];
    for (let i = 0; i <= 360; i++) {
      const phi = -90 + i;
      outlinePts.push(P(outerR(phi), phi));
    }
    const outlineD = outlinePts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('');
    const discD = outlineD + 'Z';

    const gTom = svg('g', {}, s);
    const gDisc = svg('g', {}, gTom);
    svg('path', { d: discD, fill: 'url(#ex-tom-disc)' }, gDisc);
    // pericarp dots
    const gDots = svg('g', { fill: '#f6a58f', opacity: 0.9 }, gDisc);
    for (let a = 0; a < 360; a += 7.5 + rng() * 2) {
      const r = 176 + rng() * 5;
      const [x, y] = P(r * (outerR(a) / 195), a);
      svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: (1.1 + rng() * 0.5).toFixed(2) }, gDots);
    }
    for (const a of SEPTA) {
      for (let r = 81; r < 160; r += 27) {
        const [x, y] = P(r, a);
        svg('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 1.4 }, gDots);
      }
    }
    // columella + soft glow
    const colPts = [];
    for (let i = 0; i < 180; i++) {
      const phi = i * 2;
      colPts.push(P(columellaR(phi) + 2, phi));
    }
    const colD = colPts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('') + 'Z';
    svg('path', { d: discD, fill: 'none', stroke: '#4a2a1e', 'stroke-width': 1.0, 'stroke-opacity': 0.85 }, gDisc);
    const gCol = svg('g', {}, gTom);
    const glowBlob = svg('path', { d: colD, fill: '#eec6b8', filter: 'url(#ex-tom-blur)' }, gCol);
    svg('circle', { cx: CX, cy: CY, r: 80, fill: 'url(#ex-tom-glow)' }, gCol);
    svg('path', { d: colD, fill: '#eec6b8' }, gCol);

    // locules
    const locules = [];
    for (let k = 0; k < 4; k++) {
      const { d, a, b } = loculePath(k);
      const g = svg('g', {}, gTom);
      svg('path', { d, fill: 'url(#ex-tom-loc)', stroke: '#4a2318', 'stroke-width': 1.3, 'stroke-opacity': 0.85, 'stroke-linejoin': 'round' }, g);
      // faint inner highlight along the outer edge
      const h0 = lerp(a, b, 0.18), h1 = lerp(a, b, 0.86);
      const hp = [];
      for (let i = 0; i <= 30; i++) hp.push(P(RO - 5, lerp(h0, h1, i / 30)));
      if(k===1||k===2)svg('path', { d: hp.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(''), fill: 'none', stroke: '#fff2ec', 'stroke-width': 1.4, 'stroke-opacity': 0.55, 'stroke-linecap': 'round' }, g);
      locules.push({ g, a, b, t: 78.317 + k * 0.1167 });
    }
    // seeds, revealed in batches sweeping clockwise through each locule
    const seeds = [];
    const gHalo = svg('g', {}, gTom);
    const gSeed = svg('g', {}, gTom);
    const BATCH0 = 78.683, BATCH = 0.0583;
    for (const [x, y, rot] of SEEDS) {
      const phi = Math.atan2(y - CY, x - CX) / DEG;
      let u = 0;
      for (let k = 0; k < 4; k++) {
        const a = SEPTA[k], b = k < 3 ? SEPTA[k + 1] : SEPTA[0] + 360;
        const p = ((phi - a) % 360 + 360) % 360;
        if (p <= b - a) u = p / (b - a);
      }
      const tc = Math.max(BATCH0, 78.578 + 0.488 * u);
      const tb = BATCH0 + Math.floor((tc - BATCH0 + 0.01) / BATCH) * BATCH;
      const halo = svg('ellipse', { cx: 0, cy: 0, rx: 10.2, ry: 7.6, fill: '#fbe0d6', 'fill-opacity': 0.92 }, gHalo);
      const seed = svg('ellipse', { cx: 0, cy: 0, rx: 7.0, ry: 4.6, fill: '#faf3e7', stroke: '#4f3d32', 'stroke-width': .72 }, gSeed);
      seeds.push({ x, y, rot, halo, seed, t: tb - 0.012 });
    }
    // outline drawn on first
    const outline = svg('path', { d: outlineD, fill: 'none', stroke: '#3a2418', 'stroke-width': 1.0, 'stroke-linecap': 'round' }, gTom);
    const outLen = outline.getTotalLength();
    outline.setAttribute('stroke-dasharray', `${outLen} ${outLen + 10}`);

    // ---------- captions (Latin Modern Roman) ----------
    const cap1 = svg('text', { x: 318, y: 772, 'text-anchor': 'middle', 'font-family': 'Latin Modern Roman', 'font-size': 24, fill: '#1c1a17' }, s);
    cap1.innerHTML = 'Fig. 1.— <tspan font-style="italic">Solanum lycopersicum</tspan> L.';
    const cap2 = svg('text', { x: 599.5, y: 632.5, transform:'translate(599.5 0) scale(1.01 1) translate(-599.5 0)', 'font-family': 'Latin Modern Roman', 'font-size': 24, fill: '#1c1a17' }, s);
    cap2.innerHTML = 'Fig. 2.—Lycopene, C<tspan font-size="16" dy="4">40</tspan><tspan dy="-4">H</tspan><tspan font-size="16" dy="4">56</tspan><tspan dy="-4">.</tspan>';

    // ---------- molecule ----------
    const gMol = svg('g', { stroke: '#151312', 'stroke-width': 2, 'stroke-linecap': 'butt', fill: 'none' }, s);
    const gRed = svg('g', { stroke: '#c63a2c', 'stroke-width': 2.1, 'stroke-linecap': 'butt', fill: 'none' }, s);
    const clip = svg('clipPath', { id: 'ex-tom-redclip' }, defs);
    const clipRect = svg('rect', { x: MID, y: 400, width: 0, height: 300 }, clip);
    gRed.setAttribute('clip-path', 'url(#ex-tom-redclip)');
    const bonds = [];
    const mkBond = (i, parent) => {
      const inward = i < 15; // left half draws right->left (from the centre outward)
      const [ax, ay] = vx(i), [bx, by] = vx(i + 1);
      const from = inward ? [bx, by] : [ax, ay], to = inward ? [ax, ay] : [bx, by];
      const ln = svg('line', {}, parent);
      const out = { i, from, to, ln, dbl: null };
      if (DOUBLE.has(i)) {
        const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
        const side = i < 16 ? 1 : -1; // left half: second line below, right half: above
        const off = 6.5, sh = 7;
        let px = -dy / L, py = dx / L; // normal
        if (py < 0) { px = -px; py = -py; } // pointing down
        if (side < 0) { px = -px; py = -py; }
        const s0 = [ax + (dx / L) * sh + px * off, ay + (dy / L) * sh + py * off];
        const s1 = [bx - (dx / L) * sh + px * off, by - (dy / L) * sh + py * off];
        out.dbl = { ln: svg('line', {}, parent), from: inward ? s1 : s0, to: inward ? s0 : s1 };
      }
      return out;
    };
    for (let i = 0; i < 31; i++) bonds.push(mkBond(i, gMol));
    const redBonds = [];
    for (let i = 5; i <= 25; i++) redBonds.push(mkBond(i, gRed));
    const methyls = [];
    for (const [vi, dir] of Object.entries(METHYL)) {
      const [x, y] = vx(+vi);
      const ln = svg('line', { x1: x, y1: y, x2: x, y2: y }, gMol);
      const bi = +vi < 16 ? +vi : +vi - 1; // bond that reaches this vertex from the centre side
      methyls.push({ ln, x, y, y2: y + dir * 45.5, t: bondTime(bi) + BOND_LEN });
    }
    const setLine = (ln, from, to, k) => {
      ln.setAttribute('x1', from[0].toFixed(2));
      ln.setAttribute('y1', from[1].toFixed(2));
      ln.setAttribute('x2', lerp(from[0], to[0], k).toFixed(2));
      ln.setAttribute('y2', lerp(from[1], to[1], k).toFixed(2));
      ln.setAttribute('visibility', k > 0 ? 'visible' : 'hidden');
    };

    // radicals and rings
    const gRad = svg('g', { 'font-family': 'Latin Modern Roman', 'font-size': 20, fill: '#1c1a17' }, s);
    const radicals = RADICALS.map((r) => {
      const tx = svg('text', { 'text-anchor': 'middle' }, gRad);
      tx.textContent = '•OH';
      const ring = svg('circle', { r: 0, fill: 'none', stroke: '#b04a3c', 'stroke-width': 1.3 }, s);
      return { ...r, tx, ring };
    });

    // ---------- lyric (Old Standard TT) ----------
    const gLyr = svg('g', { transform: 'translate(960 0) scale(0.981 1) translate(-960 0)', 'font-family': 'Old Standard TT', 'font-size': 70, fill: '#1c1a17' }, s);
    const l1 = svg('text', { x: 959.5, y: 148.5, 'text-anchor': 'middle' }, gLyr);
    const l2 = svg('text', { x: 958.5, y: 240.5, 'text-anchor': 'middle' }, gLyr);
    const words = [];
    const addWords = (txt, list) => list.forEach(([w, t50], i) => {
      const sp = svg('tspan', {}, txt);
      sp.textContent = (i ? ' ' : '') + w;
      words.push({ sp, t: t50 - 0.025 });
    });
    addWords(l1, [['If', 0], ['I’m', 0], ['a', 78.483], ['tomato', 78.583]]);
    addWords(l2, [['Then', 79.283], ['I', 79.55], ['will', 79.767], ['give', 80.0], ['u', 80.233]]);
    const uline = svg('line', { x1: 1184, y1: 250, x2: 1184, y2: 250, stroke: '#c2553b', 'stroke-width': 2.6 }, s);

    const anti = svg('text', { x: 964, y: 982, 'text-anchor': 'middle', 'font-family': 'Old Standard TT', 'font-style': 'italic', 'font-size': 149.7, fill: '#e2432f' }, s);
    const letters = [...'Antioxidants'].map((ch, i) => {
      const sp = svg('tspan', {}, anti);
      sp.textContent = ch;
      return { sp, t: 80.458 + i * 0.0591 };
    });

    const fadeIn = (t, t0, d) => clamp((t - t0) / d);

    return {
      render(t) {
        // outline draw (outCubic from 77.92 over 0.265 s)
        const po = ease.outCubic(prog(t, 77.92, 0.265));
        outline.setAttribute('stroke-dashoffset', (outLen * (1 - po)).toFixed(2));
        outline.setAttribute('stroke-opacity', String(1 - 0.35 * prog(t, 78.27, 0.1)));
        // disc grows from the centre
        const sd = ease.outQuad(prog(t, 78.2, 0.075));
        gDisc.setAttribute('visibility', sd > 0 ? 'visible' : 'hidden');
        gDisc.setAttribute('transform', `translate(${CX} ${CY}) scale(${Math.max(0.001, sd)}) translate(${-CX} ${-CY})`);
        const sc0 = ease.outCubic(prog(t, 78.2, 0.05));
        gCol.setAttribute('visibility', sc0 > 0 ? 'visible' : 'hidden');
        gCol.setAttribute('transform', `translate(${CX} ${CY}) scale(${Math.max(0.001, sc0)}) translate(${-CX} ${-CY})`);
        glowBlob.setAttribute('opacity', String(1 - prog(t, 78.32, 0.4)));
        // locules fade in clockwise with a slight shrink
        for (const L of locules) {
          const k = prog(t, L.t, 0.05);
          const sc = 1 + 0.14 * (1 - k) * (1 - k);
          L.g.setAttribute('opacity', String(k));
          L.g.setAttribute('visibility', k > 0 ? 'visible' : 'hidden');
          L.g.setAttribute('transform', `translate(${CX} ${CY}) scale(${sc}) translate(${-CX} ${-CY})`);
        }
        for (const sd2 of seeds) {
          const k = prog(t, sd2.t, 0.035);
          const vis = k > 0 ? 'visible' : 'hidden';
          const sc = 0.75 + 0.25 * ease.outCubic(k);
          const tr = `translate(${sd2.x.toFixed(2)} ${sd2.y.toFixed(2)}) rotate(${sd2.rot.toFixed(1)}) scale(${sc.toFixed(3)})`;
          sd2.seed.setAttribute('transform', tr);
          sd2.halo.setAttribute('transform', tr);
          sd2.seed.setAttribute('visibility', vis);
          sd2.halo.setAttribute('visibility', vis);
          sd2.seed.setAttribute('opacity', k.toFixed(3));
          sd2.halo.setAttribute('opacity', k.toFixed(3));
        }
        cap1.setAttribute('opacity', String(fadeIn(t, 78.958, 0.05)));
        cap2.setAttribute('opacity', String(fadeIn(t, 79.542, 0.05)));

        // molecule bonds grow outward from the centre
        for (const b of bonds) {
          const k = ease.outQuad(prog(t, bondTime(b.i), BOND_LEN));
          setLine(b.ln, b.from, b.to, k);
          if (b.dbl) setLine(b.dbl.ln, b.dbl.from, b.dbl.to, ease.outQuad(prog(t, bondTime(b.i) + 0.01, BOND_LEN)));
        }
        for (const b of redBonds) {
          setLine(b.ln, b.from, b.to, 1);
          if (b.dbl) setLine(b.dbl.ln, b.dbl.from, b.dbl.to, 1);
        }
        for (const m of methyls) {
          const k = ease.outQuad(prog(t, m.t, 0.04));
          m.ln.setAttribute('y2', lerp(m.y, m.y2, k).toFixed(2));
          m.ln.setAttribute('visibility', k > 0 ? 'visible' : 'hidden');
        }
        const hw = redHalf(t);
        clipRect.setAttribute('x', (MID - hw).toFixed(2));
        clipRect.setAttribute('width', (2 * hw).toFixed(2));
        const flash = t >= 81.21 ? 1 - prog(t, 81.21, 0.3) : 0;
        gRed.setAttribute('stroke-width', (2.1 + 1.0 * flash).toFixed(2));

        // radicals
        for (const r of radicals) {
          const a = fadeIn(t, r.appear, 0.2) * (1 - fadeIn(t, r.end - 0.03, 0.08));
          const [x, y] = keyAt(r.keys, t);
          r.tx.setAttribute('x', x.toFixed(1));
          r.tx.setAttribute('y', (y + 6).toFixed(1));
          r.tx.setAttribute('opacity', a.toFixed(3));
          r.tx.setAttribute('visibility', a > 0.001 ? 'visible' : 'hidden');
          const rk = (t - r.end) / (r.big ? 0.28 : 0.3);
          if (rk >= 0 && rk <= 1) {
            const rad = r.big ? lerp(18, r.rmax, ease.outCubic(Math.min(1, rk * 1.25))) : lerp(9, r.rmax, ease.outCubic(rk));
            r.ring.setAttribute('cx', r.hit[0]);
            r.ring.setAttribute('cy', r.hit[1]);
            r.ring.setAttribute('r', rad.toFixed(2));
            r.ring.setAttribute('stroke-opacity', ((r.big ? 0.75 : 0.55) * (1 - ease.inQuad(rk))).toFixed(3));
            r.ring.setAttribute('visibility', 'visible');
          } else r.ring.setAttribute('visibility', 'hidden');
        }

        // lyric words
        for (const w of words) w.sp.setAttribute('fill-opacity', String(w.t <= 0 ? 1 : fadeIn(t, w.t, 0.05)));
        const ku = ease.outQuad(prog(t, 80.267, 0.11));
        uline.setAttribute('x2', lerp(1184, 1219, ku).toFixed(2));
        uline.setAttribute('visibility', ku > 0 ? 'visible' : 'hidden');
        for (const L of letters) L.sp.setAttribute('fill-opacity', String(fadeIn(t, L.t, 0.05)));
      },
    };
  },
};
