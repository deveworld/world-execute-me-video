// 47.725–51.425 "And then blind my vision / So dizzy, so dizzy": eye chart + drawn eye.
// Canvas 2D, vector iris intensity contours with a WebGL radial pupil morph,
// measured polyline lids and lash strands. From 49.58 the "dizzy" look:
// a peach and a blue copy (additive) drifting apart and back, pupils drawn on top as a union.
import { LASHES } from './eye/lashes.js';
import { CLOSED_LID } from './eye/closed-lid.js';
import { makeIrisModel, renderOuter, drawInner, drawPupil, PALETTES, IRIS_R, IRIS_CANVAS } from './eye/iris.js';
import {
  CORNER_L, CORNER_R, UPPER_OPEN, LOWER_OPEN, CLOSED_A, CLOSED_B, CREASE_OPEN, CREASE_CLOSED_A, CREASE_CLOSED_B,
  sampleAtX, catmull,
} from './eye/shape.js';

const W = 1920, H = 1080;
const BG = 'rgb(6,5,10)';
const PEACH = [252, 193, 167], BLUE = [91, 91, 230];
const TEXT = 'rgb(240,239,252)';
const TEXT_X = 382.75;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, k) => a + (b - a) * k;
const sstep = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
const outCubic = (k) => 1 - Math.pow(1 - clamp(k), 3);
const inQuad = (k) => clamp(k) ** 2;
const ramp = (t, t0, t1, ease = sstep) => ease((t - t0) / (t1 - t0));

// keyframe track with smooth (sine) interpolation
function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
        const k = (t - t0) / (t1 - t0);
        return v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(Math.PI * k));
      }
    }
    return keys[keys.length - 1][1];
  };
}

// ---- timeline (frame-exact on the reference) ----
const ROWS = [
  { parts: [['AND', 47.750, .44]], size: 152.5, base: 281, label: '0.4', lb: 280.5 },
  { parts: [['THEN', 47.9165, .15]], size: 122, base: 424, label: '0.5', lb: 425.5 },
  { parts: [['BLIND', 48.150, .31]], size: 101, base: 545, label: '0.6', lb: 546 },
  { parts: [['MY', 48.6165, .24]], size: 86.5, base: 646, label: '0.7', lb: 648 },
  { parts: [['VISION', 49.0665, .27]], size: 76, base: 737, label: '0.8', lb: 737.5 },
  { parts: [['SO', 49.683, .69], ['DIZZY', 50.000, .49]], size: 69.5, base: 817, label: '0.9', lb: 816.5, track: 0.101 },
  { parts: [['SO', 50.5165, .74], ['DIZZY', 50.9165, .33]], size: 62, base: 888, label: '1.0', lb: 888.5, track: 0.106 },
];
const DIZZY_T0 = 49.575;
// horizontal offset of the blue copy of "AND" (px); other rows scale with font size, the eye x2.9
const dAND = track([
  [49.575, 0], [49.600, 10], [49.633, 16], [49.70, 19], [49.85, 19], [50.025, 27], [50.117, 27], [50.475, 14],
  [50.567, 14], [50.933, 27], [51.017, 27], [51.45, 14],
]);
const rpDizzy = track([[49.58, 63], [49.75, 63], [50.0, 64], [50.25, 70], [50.5, 70.5], [50.75, 78.5], [51.0, 80.5], [51.2, 85.8], [51.45, 86]]);

// lid openness (0 closed .. 1 open), measured on the lid heights at x=1240
const linTrack = (keys) => (t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0); }
  }
  return keys[keys.length - 1][1];
};
const openUp1 = linTrack([[47.750, 0], [47.767, 0.554], [47.783, 0.753], [47.80, 0.817], [47.817, 0.859], [47.867, 0.922], [47.933, 0.967], [48.033, 1]]);
const openLo1 = linTrack([[47.750, 0], [47.767, 0.41], [47.783, 0.62], [47.80, 0.74], [47.817, 0.80], [47.867, 0.89], [47.933, 0.95], [48.033, 1]]);
const closeUp = linTrack([[49.150, 0], [49.167, 0.10], [49.183, 0.10], [49.200, 0.23], [49.217, 0.51], [49.233, 0.76], [49.250, 0.91], [49.267, 1]]);
const closeLo = linTrack([[49.150, 0], [49.183, 0.05], [49.200, 0.36], [49.217, 0.64], [49.233, 0.81], [49.250, 0.94], [49.267, 1]]);
const openUp2 = linTrack([[49.567, 0], [49.583, 0.49], [49.600, 0.82], [49.617, 0.90], [49.633, 0.947], [49.650, 0.97], [49.667, 0.987], [49.700, 0.997], [49.750, 1]]);
// reopening: the measured lashes are already up (short at 49.6, full length by 49.667)
const reopenLashLen = linTrack([[49.600, 0.55], [49.633, 0.85], [49.667, 1]]);
const closeLashLen = linTrack([[49.150, 1], [49.167, 0.7], [49.183, 0.45], [49.200, 0.15], [49.217, 0]]);
const openLo2 = linTrack([[49.567, 0], [49.583, 0.27], [49.600, 0.69], [49.617, 0.83], [49.650, 0.92], [49.750, 1]]);
function openness(t) {
  if (t < 49.10) return [openUp1(t), openLo1(t)];
  if (t < 49.40) return [1 - closeUp(t), 1 - closeLo(t)];
  return [openUp2(t), openLo2(t)];
}
function pupilR(t) {
  if (t >= DIZZY_T0) return rpDizzy(t)+1;
  let r = 98.5;
  r = lerp(r, 64.5, ramp(t, 48.217, 48.40, outCubic));
  r = lerp(r, 39.5, ramp(t, 48.667, 48.85, outCubic));
  return r;
}
function irisCenter(t) {
  if (t >= DIZZY_T0) return [1240, 540];
  const k = ramp(t, 47.95, 48.05, outCubic);
  return [lerp(1221, 1240, k), lerp(554, 540, k)];
}
const whiteness = (t) => (t >= DIZZY_T0 ? 0 : ramp(t, 48.64, 48.90));
// upper-lid descent (px at x=1240), measured frame by frame on the source: a step at 50.0-50.3, a hold, a step at 50.95-51.25
const upperDizzy=linTrack([[49.95, 0], [49.983, 1], [50.0, 3], [50.033, 8], [50.067, 12], [50.083, 18], [50.117, 26], [50.15, 32], [50.183, 38], [50.217, 42], [50.25, 46], [50.283, 48], [50.317, 49], [50.35, 49], [50.4, 47], [50.45, 46], [50.683, 46], [50.7, 49], [50.917, 49], [50.95, 51], [50.983, 54], [51.017, 57], [51.05, 61], [51.083, 65], [51.117, 68], [51.15, 72], [51.183, 76], [51.217, 78], [51.25, 79], [51.45, 79]]);
const squint = (t) => (t >= DIZZY_T0 ? upperDizzy(t)/36 : ramp(t, 48.25, 49.0));
const glow = (t) => ramp(t, 48.2, 48.34, outCubic);
// closed lid at 47.733 vs 49.4: vertical offset per column (cross-correlated on the source)
const OPEN_SHOT_SHIFT = (x) => { const k = [[720, 1], [800, 5], [880, 8], [960, 10], [1040, 11], [1120, 12], [1200, 13], [1280, 12], [1360, 11], [1440, 9], [1520, 7], [1600, 4], [1680, 2], [1760, 0]]; if (x <= k[0][0]) return k[0][1]; for (let i = 1; i < k.length; i++) if (x <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (x - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return 0; };
// Dizzy iris: per-channel levels fitted to the source (less violet, greener mid-tones), and the
// exposure ramp of the reopening eye (iris brightness measured frame by frame, 49.583-49.7).
const irisExposure = linTrack([[49.583, 0.6], [49.6, 0.68], [49.617, 0.77], [49.633, 0.82], [49.65, 0.87], [49.667, 0.92], [49.683, 0.97], [49.7, 1]]);
// Dizzy copies: the iris copies are peach and blue, but on the lid lines and lashes the source's
// left copy is a neutral grey-white and the right one a dim blue-grey (sampled on the lid lines).
const EYE_TINT_L = [207, 206, 213], EYE_TINT_R = [113, 109, 152];
const DIZZY_GAIN = [1.0, 1.32, 1.06], DIZZY_OFFSET = [-3.8, -26, -18.8];
function dizzyIris(t) {
  const k = irisExposure(t);
  return { gain: DIZZY_GAIN.map((g) => g * k), offset: DIZZY_OFFSET.map((o) => o * k) };
}

// ---- lashes ----
function makeLashes(rng) {
  const up = [];
  for (let i = 0; i < 190; i++) {
    const u = 0.055 + 0.92 * Math.pow(rng(), 0.95);
    const mid = Math.sin(Math.PI * u);
    up.push({
      u, len: (16 + 70 * Math.pow(mid, 0.9)) * (0.55 + 0.45 * rng()),
      lean: (u - 0.5) * 1.5 + (rng() - 0.5) * 0.35, bend: (0.15 + rng() * 0.25) * Math.sign(u - 0.5 || 1),
      a: 0.3 + 0.45 * rng(), w: 0.7 + rng() * 0.5,
    });
  }
  const lo = [];
  for (let i = 0; i < 46; i++) {
    const u = 0.12 + 0.8 * rng();
    lo.push({ u, len: 6 + 14 * rng() * Math.sin(Math.PI * u), lean: (u - 0.5) * 1.2 + (rng() - 0.5) * 0.4, a: 0.25 + 0.3 * rng() });
  }
  return { up, lo };
}

export default {
  id: 'physics/eye',
  start: 47.725,
  end: 51.425,
  fonts: ['500 20px Inter'],
  async create(root, env) {
    await env.loadFont('Rokkitt', '/scenes/physics/fonts/Rokkitt-wght.ttf', { weight: '100 900' });
    await document.fonts.load('720 100px Rokkitt');
    const { canvas, ctx } = env.canvas(root);
    const rng = env.rng(48151623);
    const model = makeIrisModel(rng);
    const outerLav = renderOuter(model, PALETTES.lav);
    const outerWhite = renderOuter(model, PALETTES.white);
    const lashes = makeLashes(env.rng(777));
    const closedLid = CLOSED_LID.map(([v,d])=>[v,new Path2D(d)]);

    // eye layer (transparent) and a tint buffer for the dizzy copies
    const EX = 520, EY = 160, EW = 1400, EH = 760;
    const eyeCv = document.createElement('canvas'); eyeCv.width = EW; eyeCv.height = EH;
    const ec = eyeCv.getContext('2d');
    const tintCv = document.createElement('canvas'); tintCv.width = EW; tintCv.height = EH;
    const tc = tintCv.getContext('2d');
    const irisCv = document.createElement('canvas'); irisCv.width = EW; irisCv.height = EH;
    const icx = irisCv.getContext('2d');
    const textCv = document.createElement('canvas'); textCv.width = 700; textCv.height = H;
    const xc = textCv.getContext('2d');

    const XS = [];
    for (let x = CORNER_L[0]; x <= CORNER_R[0]; x += 8) XS.push(x);
    if (XS[XS.length - 1] !== CORNER_R[0]) XS.push(CORNER_R[0]);
    const S_UP = sampleAtX(UPPER_OPEN, XS), S_LO = sampleAtX(LOWER_OPEN, XS);
    const S_CA = sampleAtX(CLOSED_A, XS), S_CB = sampleAtX(CLOSED_B, XS);
    // the dizzy squint is centred a little right of the iris (lid edge measured across x at 50.6 and 51.3)
    const squintD = (x, c = 1240) => 36 * Math.max(0, 1 - ((x - c) / 576) ** 2);
    // crease = upper lid raised by a gap that depends on openness
    const inRange = (pts, x) => x >= pts[0][0] && x <= pts[pts.length - 1][0];
    const taper = (pts, x) => {
      const a = pts[0][0], b = pts[pts.length - 1][0];
      return clamp((x - a) / 60) * clamp((b - x) / 60);
    };
    const gapOf = (lid, crease) => XS.map((x, i) => (inRange(crease, x) ? (lid[i] - sampleAtX(crease, [x])[0]) * taper(crease, x) : 0));
    const GAP_OPEN = gapOf(S_UP, CREASE_OPEN);
    const GAP_CA = gapOf(S_CA, CREASE_CLOSED_A), GAP_CB = gapOf(S_CB, CREASE_CLOSED_B);
    const creaseAlpha = (x, pts) => taper(pts, x);

    const squintLo = (x) => -8 * Math.max(0, 1 - ((x - 1240) / 560) ** 2);
    function lidCurves(t) {
      const [ou, ol] = openness(t);
      const closed = t < 48.5 ? S_CA : S_CB;
      const s = squint(t), sl=t>=DIZZY_T0?.5:s;
      const sc = t >= DIZZY_T0 ? 1290 : 1240;
      const upper = XS.map((x, i) => [x, lerp(closed[i], S_UP[i] + s * squintD(x, sc), ou)]);
      const lower = XS.map((x, i) => [x, lerp(closed[i], S_LO[i] + sl * squintLo(x), ol)]);
      return { o: ou, ol, upper, lower };
    }
    const yAt = (pts, x) => {
      const i = clamp(Math.floor((x - XS[0]) / 8), 0, pts.length - 2);
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      return y0 + (y1 - y0) * clamp((x - x0) / (x1 - x0));
    };

    // draw the whole eye into ec (eye-layer coordinates = screen - (EX, EY)); pupil optional
    function drawEye(t, withPupil, split = false) {
      if (split) { icx.setTransform(1, 0, 0, 1, 0, 0); icx.clearRect(0, 0, EW, EH); }
      ec.setTransform(1, 0, 0, 1, 0, 0);
      ec.lineCap = 'round';
      ec.clearRect(0, 0, EW, EH);
      ec.setTransform(1, 0, 0, 1, -EX, -EY);
      const { o, upper, lower } = lidCurves(t);
      const [cx, cy] = irisCenter(t);
      const rp = pupilR(t);
      const w = whiteness(t);
      if (t >= 49.267 && t <= 49.567 && o < .004) {
        for (const [v,path] of closedLid) {
          ec.fillStyle=`rgb(${v},${v},${Math.min(255,v+5)})`;
          ec.fill(path,'evenodd');
        }
        return {cx,cy,rp,w,o};
      }
      if (t < 47.76 && o < .004) {
        // first frames of the shot: the same closed lid, measured slightly higher (vertical shift by column)
        for (let x0 = 680; x0 < 1770; x0 += 60) {
          ec.save(); ec.beginPath(); ec.rect(x0, 0, 60, H); ec.clip();
          ec.translate(0, -OPEN_SHOT_SHIFT(x0 + 30));
          for (const [v,path] of closedLid) { ec.fillStyle=`rgb(${v},${v},${Math.min(255,v+5)})`; ec.fill(path,'evenodd'); }
          ec.restore();
        }
        return {cx,cy,rp,w,o};
      }
      // opening region
      if (o > 0.004) {
        ec.save();
        ec.beginPath();
        catmull(ec, upper);
        catmull(ec, [...lower].reverse(), false);
        ec.closePath();
        ec.clip();
        // sclera contour circles
        ec.strokeStyle = 'rgba(255,255,255,0.075)';
        ec.lineWidth = 1.1;
        ec.beginPath();
        for (let k = 0; k < 11; k++) { const r = 254 + 28.4 * k; ec.moveTo(cx + r, cy); ec.arc(cx, cy, r, 0, Math.PI * 2); }
        ec.stroke();
        // iris (own layer when split: the dizzy copies tint the iris and the line art differently)
        const S = IRIS_CANVAS.S, C = IRIS_CANVAS.C, ic = split ? icx : ec;
        if (split) { ic.save(); ic.setTransform(1, 0, 0, 1, -EX, -EY); ic.beginPath(); catmull(ic, upper); catmull(ic, [...lower].reverse(), false); ic.closePath(); ic.clip(); }
        drawInner(ic, model, cx, cy, rp, w, t>=DIZZY_T0?{ noPupil: true, contrast:1.3, ...dizzyIris(t) }:{ noPupil: true });
        ic.globalAlpha = 1 - w;
        if (w < 1) ic.drawImage(outerLav, cx - C, cy - C);
        ic.globalAlpha = w;
        if (w > 0) ic.drawImage(outerWhite, cx - C, cy - C);
        ic.globalAlpha = 1;
        if (withPupil) drawPupil(ic, cx, cy, rp, w > 0.5 ? PALETTES.white.ruff : PALETTES.lav.ruff);
        // specular highlight
        const g = glow(t);
        ic.save();
        if(t>=DIZZY_T0)ic.globalAlpha=.35;
        ic.translate(cx - 93, cy - 57);
        ic.rotate(lerp(-0.5, -0.15, g));
        ic.scale(1, lerp(0.8, 0.7, g));
        const rr = lerp(9, 41, g);
        const hg = ic.createRadialGradient(0, 0, 0, 0, 0, rr);
        hg.addColorStop(0, `rgba(255,255,255,${lerp(0.95, 1, g)})`);
        hg.addColorStop(lerp(0.35, 0.5, g), `rgba(255,255,255,${lerp(0.5, 0.88, g)})`);
        hg.addColorStop(1, 'rgba(255,255,255,0)');
        ic.fillStyle = hg;
        ic.beginPath(); ic.arc(0, 0, rr, 0, Math.PI * 2); ic.fill();
        ic.restore();
        if (split) ic.restore();
        ec.restore();
      }
      // crease
      {
        const gc = t < 48.5 ? GAP_CA : GAP_CB;
        const pts = [];
        XS.forEach((x, i) => {
          const gap = lerp(gc[i], GAP_OPEN[i], o);
          if (gap > 2) pts.push([x, upper[i][1] - gap]);
        });
        if (pts.length > 3) {
          ec.lineWidth = 1.2;
          ec.strokeStyle = `rgba(200,200,215,${lerp(0.3, 0.45, o)})`;
          ec.beginPath(); catmull(ec, pts); ec.stroke();
        }
      }
      // lids
      ec.lineCap = 'round';
      ec.strokeStyle = 'rgba(226,226,236,0.95)';
      ec.lineWidth = 2;
      ec.beginPath(); catmull(ec, upper); ec.stroke();
      if (o > 0.02) {
        ec.lineWidth = 1.6;
        ec.strokeStyle = `rgba(214,214,226,${0.9 * clamp(o * 3)})`;
        ec.beginPath(); catmull(ec, lower); ec.stroke();
        ec.lineWidth = 1;
        ec.strokeStyle = `rgba(200,200,215,${0.35 * o})`;
        ec.beginPath(); catmull(ec, upper.map(([x, y], i) => [x, y + 5 * Math.sin(Math.PI * i / (upper.length - 1))])); ec.stroke();
      }
      // lashes
      // blink: the measured lashes shrink away as the lid starts to fall (gone at 49.217), then hang down
      const reopen=t>=49.592&&t<49.75,closing=t>=49.15&&t<49.217;
      const preciseLashAlpha=reopen||closing?1:t>=49.15&&t<49.267?0:sstep((o-.78)/.20),lashLen=reopen?reopenLashLen(t):closing?closeLashLen(t):1;
      ec.globalAlpha=t>=49.15&&t<49.225?0:1-preciseLashAlpha;
      const flip = 1 - 2 * sstep(clamp((o - 0.15) / 0.35));     // +1 closed (hang down), -1 open (point up)
      ec.lineCap = 'round';
      for (const l of lashes.up) {
        const x = lerp(CORNER_L[0], CORNER_R[0], l.u);
        const y = yAt(upper, x);
        const dy = yAt(upper, x + 4) - yAt(upper, x - 4);
        const tang = Math.atan2(dy, 8);
        const nAng = tang + (flip < 0 ? -Math.PI / 2 : Math.PI / 2);
        const ang = nAng + l.lean * (flip < 0 ? 1 : -0.7) * Math.abs(flip) ;
        const L = l.len * (flip > 0 ? lerp(1, 0.90, flip) : 0.3 + 0.7 * sstep((o - 0.5) / 0.45)) * (0.5 + 0.5 * Math.abs(flip));
        const ex = x + Math.cos(ang) * L, ey = y + Math.sin(ang) * L;
        const mx = x + Math.cos(ang - l.bend * flip) * L * 0.55, my = y + Math.sin(ang - l.bend * flip) * L * 0.55;
        ec.strokeStyle = `rgba(232,232,242,${l.a})`;
        ec.lineWidth = l.w;
        ec.beginPath(); ec.moveTo(x, y); ec.quadraticCurveTo(mx, my, ex, ey); ec.stroke();
      }
      if (o > 0.3) {
        for (const l of lashes.lo) {
          const x = lerp(CORNER_L[0], CORNER_R[0], l.u);
          const y = yAt(lower, x);
          const dy = yAt(lower, x + 4) - yAt(lower, x - 4);
          const ang = Math.atan2(dy, 8) + Math.PI / 2 - l.lean * 0.6;
          ec.strokeStyle = `rgba(220,220,232,${l.a * o})`;
          ec.lineWidth = 0.9;
          ec.beginPath(); ec.moveTo(x, y + 1); ec.lineTo(x + Math.cos(ang) * l.len, y + 1 + Math.sin(ang) * l.len); ec.stroke();
        }
        // inner corner: caruncle and semilunar fold
        ec.globalAlpha=1;
        ec.globalAlpha = o;
        ec.strokeStyle = 'rgba(190,190,205,0.8)'; ec.lineWidth = 1.2;
        ec.beginPath(); ec.arc(707, 563, 17, -1.75, 1.75); ec.stroke();
        ec.fillStyle = 'rgba(170,170,185,0.6)';
        for (const [dx, dy] of [[-3, -6], [2, -2], [-1, 4], [4, 7], [-5, 1], [5, -8]]) { ec.fillRect(707 + dx, 563 + dy, 1.5, 1.5); }
        ec.strokeStyle = 'rgba(160,160,175,0.45)'; ec.lineWidth = 1;
        ec.beginPath(); ec.moveTo(737, 496); ec.quadraticCurveTo(725, 546, 737, 598); ec.stroke();
        ec.globalAlpha = 1;
      }
      if(preciseLashAlpha>0){
        ec.globalAlpha=preciseLashAlpha;
        const baselineUp=x=>sampleAtX(UPPER_OPEN,[x])[0]+9.33*Math.max(0,1-((x-1240)/576)**2);
        const baselineLo=x=>sampleAtX(LOWER_OPEN,[x])[0]-5.18*Math.max(0,1-((x-1240)/560)**2);
        LASHES.forEach((groups,side)=>{
          const now=side?lower:upper,base=side?baselineLo:baselineUp;
          ec.lineWidth=side?.6:.68;
          // the dizzy copies dim the line art; the source's doubled lashes stay brighter (x1.4)
          for(const [v0,paths] of groups){const v=Math.min(255,Math.round(v0*(t>=DIZZY_T0?1.4:1)));ec.strokeStyle=`rgb(${v},${v},${Math.min(255,v+8)})`;ec.beginPath();for(const p of paths){for(let j=0;j<p.length;j+=2){const x=p[j],y=yAt(now,x)+(p[j+1]-base(x))*lashLen;if(j)ec.lineTo(x,y);else ec.moveTo(x,y);}}ec.stroke();}
        });ec.globalAlpha=1;
      }
      return { cx, cy, rp, w, o };
    }

    function drawWord(g, text, size, base, x0, trackEm, col) {
      g.font = `720 ${size}px Rokkitt`;
      const tr = size * trackEm;
      let x = x0;
      for (const ch of text) { g.fillText(ch, x, base); x += g.measureText(ch).width + tr; }
    }
    function lineWidth(g, text, size, trackEm) {
      g.font = `720 ${size}px Rokkitt`;
      let w = 0;
      for (const ch of text) w += g.measureText(ch).width + size * trackEm;
      return w - size * trackEm;
    }
    // per-row layout: left x of each part (full line centred at TEXT_X)
    for (const row of ROWS) {
      const tr = row.track ?? 0.115;
      const full = row.parts.map((p) => p[0]).join(' ');
      const fw = lineWidth(xc, full, row.size, tr);
      row.x0 = TEXT_X - fw / 2;
      let off = 0;
      row.offs = row.parts.map(([p]) => {
        const o = off;
        off += lineWidth(xc, p + ' ', row.size, tr) + row.size * tr;
        return o;
      });
    }

    // text layer for one colour (white or tint), offset dx scaled by size
    function drawText(g, t, color, dxPerSize) {
      g.fillStyle = color;
      g.textBaseline = 'alphabetic';
      for (const row of ROWS) {
        const tr = row.track ?? 0.115;
        row.parts.forEach(([text, t0, firstAlpha], i) => {
          if (t < t0) return;
          const f = Math.round((t - t0) * 60);
          const dx = dxPerSize * row.size;
          const x = row.x0 + row.offs[i] + dx;
          if (f === 0) {
            // first frame: dim (measured per word), squashed from the top
            g.save();
            g.globalAlpha *= firstAlpha;
            g.translate(0, row.base);
            g.scale(1, 0.8);
            drawWord(g, text, row.size, 0, x, tr);
            g.restore();
          } else drawWord(g, text, row.size, row.base, x, tr);
        });
        // row number label
        const tl = row.parts[0][1] + 0.05;
        if (t > tl) {
          g.save();
          g.globalAlpha *= 0.78 * clamp((t - tl) / 0.183);
          g.font = '500 20.5px Inter';
          let x = 120 + dxPerSize * 20;
          for (const ch of row.label) { g.fillText(ch, x, row.lb); x += g.measureText(ch).width - 2.5; }
          g.restore();
        }
      }
    }

    const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;

    function render(t) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      const dizzy = t >= DIZZY_T0;
      if (!dizzy) {
        drawEye(t, true);
        ctx.drawImage(eyeCv, EX, EY);
        drawText(ctx, t, TEXT, 0);
        return;
      }
      // ---- dizzy: two tinted copies, additive ----
      const st = drawEye(t, false, true);
      const d = 2.9 * dAND(t);
      // [iris tint, dx, line-art tint]
      const copies = [[PEACH, -0.5 * d, EYE_TINT_L], [[91, 105, 180], 0.5 * d, EYE_TINT_R]];
      ctx.globalCompositeOperation = 'lighter';
      for (const [irisTint, dx, lineTint] of copies) {
        for (const [src, tint] of [[irisCv, irisTint], [eyeCv, lineTint]]) {
          tc.globalCompositeOperation = 'source-over';
          tc.fillStyle = '#000';
          tc.fillRect(0, 0, EW, EH);
          tc.drawImage(src, 0, 0);
          tc.globalCompositeOperation = 'multiply';
          tc.fillStyle = rgb(tint);
          tc.fillRect(0, 0, EW, EH);
          ctx.drawImage(tintCv, EX + dx, EY);
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      // pupils (union) on top
      if (st.o > 0.05) {
        ctx.save();
        ctx.beginPath();
        const { upper, lower } = lidCurves(t);
        ctx.translate(0, 0);
        for (const [, dx] of copies) {
          ctx.save();
          ctx.translate(dx, 0);
          ctx.beginPath(); catmull(ctx, upper); catmull(ctx, [...lower].reverse(), false); ctx.closePath();
          ctx.restore();
        }
        ctx.restore();
        // each copy's pupil is hidden by that copy's own lids (visible while the eye reopens)
        const { upper: lu, lower: ll } = lidCurves(t);
        const clipTo = (dx) => { ctx.beginPath(); catmull(ctx, lu.map(([x, y]) => [x + dx, y])); catmull(ctx, [...ll].reverse().map(([x, y]) => [x + dx, y]), false); ctx.closePath(); ctx.clip(); };
        for (const [, dx] of copies) { ctx.save(); clipTo(dx); drawPupil(ctx, st.cx + dx, st.cy, st.rp, [200, 200, 215]); ctx.restore(); }
        // inner dark union (ruffs of one copy shouldn't show inside the other pupil)
        ctx.fillStyle = 'rgb(8,7,12)';
        for (const [, dx] of copies) { ctx.save(); clipTo(dx); ctx.beginPath(); ctx.arc(st.cx + dx, st.cy, st.rp - 1.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
      }
      // text: peach in place + blue shifted, additive
      const dps = dAND(t) / 152.5;
      drawText(ctx, t, rgb(PEACH), 0);
      ctx.globalCompositeOperation = 'lighter';
      drawText(ctx, t, rgb(BLUE), dps);
      ctx.globalCompositeOperation = 'source-over';
    }
    return { render };
  },
};
