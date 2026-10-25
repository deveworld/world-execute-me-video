// The "Illegal arguments" cursor becomes a particle source: a beamline with concentric hop arcs
// (world -> jvm -> kernel -> hypervisor -> machine), traceroute probes flying out and replies coming back,
// the traceroute text, ^C, a fast rewind, then the particle escapes along a curve into the footer and
// world.execute(me); swaps into me.execute(world);.
import { at, on, clamp, lerp, prog, ease, table, beatTime, baselineIn, loadVendorFonts, rgba, resetCtx } from './lib/util.js';
import { TRACE_GLYPHS } from './lib/traceroute-glyphs.js';

const SX = 210, SY = 412;                         // beam source (where the terminal cursor was)
const V = 2160;                                   // probe speed, px/s (36 px/frame)
const OUT_TRAIL = 108, REPLY_TRAIL = 105;         // comet trail lengths (px)
const NODE_X = [459.6, 709.2, 958.8, 1208.4, 1458];
const NAMES = ['world', 'jvm', 'kernel', 'hypervisor', 'machine'];
// exit curve after the last node: centre line (canvas coords)
const CURVE = [[1458, 412], [1480, 410.9], [1500, 409.5], [1520, 407.8], [1540, 405.8], [1560, 403.8], [1580, 401.8],
  [1600, 399.7], [1620, 397.6], [1640, 395.5], [1660, 392.8], [1680, 390.5], [1700, 388.3], [1720, 385.7],
  [1740, 382.8], [1760, 380.5], [1780, 377.8], [1800, 375.5], [1820, 372.6], [1840, 369.8], [1860, 367.5],
  [1880, 364.6], [1900, 361.7], [1920, 358.9], [1960, 353.0]];

const C = {
  bgIn: '#10111a', bgOut: '#06050a',
  beam: 'rgba(232,232,248,0.42)', arc: 'rgba(235,235,250,0.50)', curve: 'rgba(232,232,248,0.30)',
  label: '#dcdcee', node: '#ffffff',
  head: '#ffffff',
  tr: '#e6e5fb', you: '#fbdccb', num: '#eeedfc', name: '#ffffff', ip: '#e3e2f8', ms: '#97979f', star: '#c9c6f5', ctrlc: '#e5e4f5',
  footer: '#b4b4c7',
};
const TR_FONT = '400 36px EscIosevka';
const TR_NAME_FONT = '400 36px EscIosevka';
const LABEL_FONT = '400 18px "IBM Plex Mono"';
const FOOT_FONT = 'italic 400 25px EscVictor';
const TX0 = 201, TCW = 18, TY0 = 472, TLH = 38;

// ---------- traceroute text ----------
// each line: list of [show, segments] parts; a part's segments are [text, colour, font?]
const HOPS = [
  ['1', 'world', '10.0.0.1', ['0.043', '0.012', '0.010'], [134.267, 134.333, 134.367]],
  ['2', 'jvm', '10.0.1.1', ['0.121', '0.097', '0.094'], [134.967, 135.000, 135.067]],
  ['3', 'kernel', '172.16.0.1', ['0.408', '0.362', '0.357'], [135.667, 135.700, 135.767]],
  ['4', 'hypervisor', '10.0.2.2', ['1.296', '1.172', '1.158'], [136.333, 136.400, 136.467]],
  ['5', 'machine', '192.168.1.1', ['4.871', '4.497', '4.412'], [137.033, 137.100, 137.167]],
];
function buildLines() {
  const lines = [];
  lines.push({ hide: 139.133, parts: [[134.033, [['traceroute to ', C.tr], ['you', C.you], [' (203.0.113.1), 30 hops max, 60 byte packets', C.tr]]]] });
  const hideAt = [139.117, 139.083, 139.050, 139.017, 139.000];
  HOPS.forEach(([n, name, ip, ms, times], i) => {
    lines.push({ hide: hideAt[i], parts: [
      [times[0], [[` ${n}  `, C.num], [name, C.name, TR_NAME_FONT], [` (${ip})  `, C.ip], [ms[0], C.ip], [' ms', C.ms]]],
      [times[1], [['  ' + ms[1], C.ip], [' ms', C.ms]]],
      [times[2], [['  ' + ms[2], C.ip], [' ms', C.ms]]],
    ] });
  });
  lines.push({ hide: 138.967, parts: [[137.267, [[' 6  ', C.num], ['*', C.star]]], [137.400, [[' *', C.star]]], [137.500, [[' *', C.star]]]] });
  lines.push({ hide: 138.933, parts: [[137.733, [[' 7  ', C.num], ['*', C.star]]], [138.300, [[' *', C.star]]], [138.400, [[' *', C.star]]]] });
  lines.push({ hide: 138.900, parts: [[138.667, [['^C', C.ctrlc]]]] });
  return lines;
}
const TR_LINES = buildLines();

// ---------- probes ----------
// first-probe emission per group (≈ beat 290.14 + g); probes 1/8 beat apart
const GROUP_T = [134.046, 134.512, 134.974, 135.438, 135.903, 136.364, 136.818, 137.286, 137.756];
const emitT = (g, j) => GROUP_T[g] + j * (60 / 130) / 8;
const PROBES = [];
for (let g = 0; g < 9; g++) {
  for (let j = 0; j < 3; j++) {
    const te = emitT(g, j);
    const target = g < 5 ? NODE_X[g] - SX : null;
    PROBES.push({ g, j, te, target, ta: target != null ? te + target / V : null });
  }
}
// arcs start growing when the first probe of their group reaches the node
const ARC_T = [0, 1, 2, 3, 4].map((g) => PROBES[g * 3].ta);
const ARC_MAX = NODE_X.map((x, k) => {
  const r = x - SX;
  // angle where the arc leaves the screen (left edge for "world", top edge for the others)
  const top = Math.asin(Math.min(1, SY / r));
  const left = Math.acos(Math.max(-1, Math.min(1, (0 - SX) / r)));
  return k === 0 ? Math.min(Math.PI, left + 0.02) : top + 0.02;
});

// ---------- rewind ----------
// visible fraction of each arc while the rewind retracts it
const ARC_RETRACT = [
  table([[139.217, 1], [139.233, 0.92], [139.250, 0.33], [139.267, 0.03], [139.283, 0]]),
  table([[139.200, 1], [139.217, 0.95], [139.233, 0.39], [139.250, 0]]),
  table([[139.200, 1], [139.217, 0.71], [139.233, 0.12], [139.250, 0]]),
  table([[139.183, 1], [139.200, 0.93], [139.217, 0.31], [139.233, 0]]),
  table([[139.183, 1], [139.200, 0.60], [139.217, 0]]),
];
const RETRACT_T0 = 139.18;
const BEAM_RETRACT_T = 139.231;
const BEAM_T0 = 132.935, BEAM_DUR = 0.205, BEAM_POW = 7.25;

// arc growth: exponential approach (time constant 35 ms), reaching the full sweep after ~0.15 s
const arcGrow = (tau) => (tau <= 0 ? 0 : Math.min(1, (1 - Math.exp(-tau / 0.035)) / 0.985));
// a new arc is drawn bright (peak ~158 over the background), holds ~0.23 s, then relaxes to ~92 (τ ≈ 0.28 s)
const ARC_A_FRESH = 0.965, ARC_A_STEADY = 0.545;
const arcAlpha = (tau) => (tau < 0.23 ? ARC_A_FRESH : ARC_A_STEADY + (ARC_A_FRESH - ARC_A_STEADY) * Math.exp(-(tau - 0.23) / 0.28));

// ---------- escape streak (quadratic Bezier) ----------
const P0 = [210, 412], P1 = [1052, 412], P2 = [1052, 945];
const bez = (s) => {
  const u = 1 - s;
  return [u * u * P0[0] + 2 * s * u * P1[0] + s * s * P2[0], u * u * P0[1] + 2 * s * u * P1[1] + s * s * P2[1]];
};
const STREAK_S = table([[139.392, 0], [139.400, 0.002], [139.417, 0.008], [139.433, 0.020], [139.450, 0.040],
  [139.467, 0.070], [139.483, 0.112], [139.500, 0.169], [139.517, 0.241], [139.533, 0.333], [139.550, 0.446],
  [139.567, 0.580], [139.583, 0.739], [139.600, 0.925], [139.6125, 1.0], [200, 1.0]]);
const STREAK_T0 = 139.392, STREAK_HIT = 139.6125, TRAIL = 0.052;

// ---------- footer swap ----------
const ME_DX = table([[139.700, 0], [139.717, -1], [139.733, -3], [139.750, -7], [139.767, -14], [139.783, -24], [139.800, -40],
  [139.817, -63], [139.833, -96], [139.850, -131], [139.867, -159], [139.883, -178], [139.900, -191], [139.917, -200],
  [139.933, -205], [139.950, -208], [139.967, -210]]);
const ME_DY = table([[139.600, 0], [139.617, -1], [139.633, -6], [139.650, -15], [139.667, -25], [139.683, -36], [139.700, -47],
  [139.717, -56], [139.733, -61], [139.750, -62], [139.933, -62], [139.950, -59], [139.967, -52], [139.983, -42],
  [140.000, -31], [140.017, -20], [140.033, -10], [140.050, -3], [140.067, -1], [140.083, 0]]);
const WO_DX = table([[139.700, 0], [139.717, 1], [139.733, 2], [139.750, 6], [139.767, 11], [139.783, 19], [139.800, 32],
  [139.817, 50], [139.833, 76], [139.850, 103], [139.867, 125], [139.883, 140], [139.900, 150], [139.917, 157],
  [139.933, 161], [139.950, 164], [139.967, 165]]);
const WO_DY = table([[139.600, 0], [139.617, -1], [139.633, -3], [139.650, -7], [139.667, -12], [139.683, -18], [139.700, -23],
  [139.717, -27], [139.733, -30], [139.933, -30], [139.950, -29], [139.967, -25], [139.983, -20], [140.000, -15],
  [140.017, -10], [140.033, -5], [140.050, -2], [140.067, -1], [140.083, 0]]);
const EX_DX = table([[139.750, 0], [139.767, -1], [139.783, -3], [139.800, -6], [139.817, -11], [139.833, -20], [139.850, -30],
  [139.867, -37], [139.883, -41], [139.900, -43], [139.917, -44], [139.933, -45]]);
// tables are keyed on exact frame times (rounded to ms); render(t) is called on those times
const sample = (fn, t) => fn(t);

function makeGlow(size, stops) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return c;
}

export default {
  id: 'escape/beam',
  start: 132.75,
  end: 140.51,
  z: 1,
  fonts: [LABEL_FONT, '400 36px "Fira Code"'],
  async create(root, env) {
    await loadVendorFonts();
    const { canvas, ctx } = env.canvas(root, { context: '2d', options: { alpha: false } });
    const W = canvas.width, H = canvas.height;

    // vignette background (flat centre, darker rim)
    const vig = document.createElement('canvas');
    vig.width = W; vig.height = H;
    {
      const g = vig.getContext('2d');
      g.fillStyle = '#08090e';
      g.fillRect(0, 0, W, H);
      g.save();
      g.translate(W / 2, H / 2);
      g.scale(1, H / W);
      const R = W / 2;
      const grad = g.createRadialGradient(0, 0, 0, 0, 0, R * 1.42);
      const st = [[0, '#10111a'], [0.76, '#10111a'], [0.82, '#0f1019'], [0.9, '#0e0f16'], [1.0, '#0d0e15'], [1.04, '#0c0d14'],
        [1.21, '#0a0b12'], [1.42, '#08090e']];
      for (const [d, col] of st) grad.addColorStop(d / 1.42, col);
      g.fillStyle = grad;
      g.fillRect(-R * 1.5, -R * 1.5 * W / H, R * 3, R * 3 * W / H);
      g.restore();
    }

    const glowSrc = makeGlow(60, [[0, 'rgba(235,235,255,0.55)'], [0.15, 'rgba(220,220,255,0.30)'], [0.3, 'rgba(205,205,250,0.17)'], [0.55, 'rgba(190,190,240,0.08)'], [0.8, 'rgba(180,180,235,0.025)'], [1, 'rgba(180,180,235,0)']]);
    const glowHead = makeGlow(40, [[0, 'rgba(240,240,255,0.7)'], [0.12, 'rgba(225,225,255,0.4)'], [0.35, 'rgba(200,200,245,0.12)'], [0.7, 'rgba(200,200,245,0.03)'], [1, 'rgba(200,200,245,0)']]);
    // probe head: wide exponential glow (+108 over the background at 4 px, +65 at 8, +35 at 12, +13 at 16)
    const glowProbe = makeGlow(44, [[0, 'rgba(230,230,255,0.9)'], [0.1, 'rgba(230,230,255,0.64)'], [0.2, 'rgba(228,228,255,0.46)'], [0.3, 'rgba(225,225,255,0.31)'], [0.45, 'rgba(220,220,255,0.17)'], [0.6, 'rgba(215,215,255,0.085)'], [0.8, 'rgba(210,210,255,0.03)'], [1, 'rgba(210,210,255,0)']]);
    const halo = document.createElement('canvas');
    halo.width = W; halo.height = H;
    const hctx = halo.getContext('2d');
    const glowNode = makeGlow(40, [[0, 'rgba(240,240,255,0.8)'], [0.2, 'rgba(225,225,255,0.35)'], [0.6, 'rgba(200,200,245,0.08)'], [1, 'rgba(200,200,245,0)']]);

    // beam path: straight part then the exit curve; cumulative length table
    const PATH = [[SX, SY], ...CURVE];
    const CUM = [0];
    for (let i = 1; i < PATH.length; i++) CUM.push(CUM[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]));
    const PATH_LEN = CUM[CUM.length - 1];
    const pointAt = (s) => {
      if (s <= 0) return PATH[0];
      for (let i = 1; i < PATH.length; i++) {
        if (s <= CUM[i]) {
          const k = (s - CUM[i - 1]) / (CUM[i] - CUM[i - 1]);
          return [lerp(PATH[i - 1][0], PATH[i][0], k), lerp(PATH[i - 1][1], PATH[i][1], k)];
        }
      }
      return PATH[PATH.length - 1];
    };
    const strokePath = (s0, s1) => {
      ctx.beginPath();
      const a = pointAt(s0);
      ctx.moveTo(a[0], a[1]);
      for (let i = 1; i < PATH.length; i++) {
        if (CUM[i] <= s0) continue;
        if (CUM[i] >= s1) break;
        ctx.lineTo(PATH[i][0], PATH[i][1]);
      }
      const b = pointAt(s1);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    };

    ctx.font = TR_FONT;
    const trBase = baselineIn(ctx, TLH);
    const traceGlyphs = Object.fromEntries(Object.entries(TRACE_GLYPHS).map(([ch, path]) => [ch, new Path2D(path)]));
    ctx.font = FOOT_FONT;
    const footAdv = ctx.measureText('world.execute(me);').width / 18;
    const footLeft = 963.5 - footAdv * 9;
    const FOOT_BASE = 977;

    function drawTraceroute(t) {
      ctx.textBaseline = 'alphabetic';
      TR_LINES.forEach((line, i) => {
        if (on(t, line.hide)) return;
        let col = 0;
        const y = TY0 + i * TLH + trBase;
        for (const [show, segs] of line.parts) {
          if (!on(t, show)) break;
          for (const [s, colour, font] of segs) {
            ctx.font = font || TR_FONT;
            ctx.fillStyle = colour;
            for (let k = 0; k < s.length; k++) if (s[k] !== ' ') {
              const glyph = traceGlyphs[s[k]];
              if (glyph) {
                ctx.save(); ctx.translate(TX0 + (col + k) * TCW + 0.5, TY0 + i * TLH + 0.5);
                ctx.fill(glyph, 'evenodd'); ctx.restore();
              } else ctx.fillText(s[k], TX0 + (col + k) * TCW, y);
            }
            col += s.length;
          }
        }
      });
    }

    function drawFooter(t) {
      ctx.font = FOOT_FONT;
      ctx.textBaseline = 'alphabetic';
      const base = FOOT_BASE;
      const x = (c) => footLeft + c * footAdv;
      if (t < at(139.617)) {
        ctx.fillStyle = C.footer;
        ctx.fillText('world.execute(me);', footLeft, base);
        return;
      }
      // after the hit: four independently moving pieces
      const meHi = 1 - prog(t, 139.975, 0.075);
      const woHi = prog(t, 139.62, 0.08) * (1 - prog(t, 139.975, 0.075));
      ctx.fillStyle = C.footer;
      ctx.fillText(');', x(16), base);
      ctx.fillText('.execute(', x(5) + sample(EX_DX, t), base);
      ctx.fillStyle = woHi > 0 ? mix(C.footer, '#c9c8dc', woHi) : C.footer;
      ctx.fillText('world', x(0) + sample(WO_DX, t), base + sample(WO_DY, t));
      ctx.fillStyle = meHi > 0 ? mix(C.footer, '#ffffff', meHi) : C.footer;
      ctx.fillText('me', x(14) + sample(ME_DX, t), base + sample(ME_DY, t));
    }

    function mix(a, b, k) {
      const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      const ch = (s) => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, k));
      return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
    }

    return {
      render(t) {
        resetCtx(ctx);
        // ---- background: vignette, fading to the escape black during the rewind
        ctx.drawImage(vig, 0, 0);
        // B 23 -> 13 by 139.217, settled at (6,5,10) by 139.35: outQuad over 0.28 s
        const dark = ease.outQuad(prog(t, 139.09, 0.28));
        if (dark > 0) {
          ctx.globalAlpha = dark;
          ctx.fillStyle = C.bgOut;
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        }

        const srcOn = on(t, 132.883);
        const streaking = t >= STREAK_T0;
        // ---- beam extent (grows 132.93 -> 133.0, retracts 139.23 -> 139.33)
        // the head moves with a steep power ease
        let beamEnd = 0;
        if (t >= BEAM_T0) beamEnd = PATH_LEN * (1 - Math.pow(1 - prog(t, BEAM_T0, BEAM_DUR), BEAM_POW));
        let curveOn = true;
        if (t >= at(139.233)) {
          curveOn = false;
          beamEnd = (NODE_X[4] - SX) * (1 - ease.outCubic(prog(t, BEAM_RETRACT_T, 0.11)));
        }
        if (t >= 139.333) beamEnd = 0;
        const straightEnd = Math.min(beamEnd, NODE_X[4] - SX);
        const beamX = SX + straightEnd;

        // ---- arcs
        ctx.lineWidth = 1.25;
        for (let k = 0; k < 5; k++) {
          const t0 = ARC_T[k];
          if (t < t0) continue;
          ctx.strokeStyle = `rgba(235,235,250,${arcAlpha(t - t0).toFixed(4)})`;
          let frac = arcGrow(t - t0);
          const retracting = t >= RETRACT_T0;
          if (retracting) frac *= ARC_RETRACT[k](t);
          if (frac <= 0) continue;
          const r = NODE_X[k] - SX;
          const ang = frac >= 1 && !retracting ? Math.PI : frac * ARC_MAX[k];
          ctx.beginPath();
          ctx.arc(SX, SY, r, 0, -ang, true);
          ctx.stroke();
        }

        // ---- beam line
        if (beamEnd > 0) {
          // the straight part is an axis-aligned 2 px bar: fillRect is rasterised identically regardless of what
          // was drawn before (a stroked path differed by 1 level at its tip between render orders)
          ctx.fillStyle = C.beam;
          ctx.fillRect(SX, SY - 1, straightEnd, 2);
          if (curveOn && beamEnd > NODE_X[4] - SX) {
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = C.curve;
            strokePath(NODE_X[4] - SX, beamEnd);
          }
        }

        // ---- labels + nodes
        ctx.font = LABEL_FONT;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'alphabetic';
        for (let k = 0; k < 5; k++) {
          const ta = ARC_T[k];
          if (t < ta - 0.004) continue;
          if (beamX < NODE_X[k] - 1) continue;          // removed as the beam retracts past them
          const a = clamp((t - ta + 0.004) / 0.095);
          ctx.globalAlpha = a;
          ctx.fillStyle = C.label;
          ctx.fillText(NAMES[k], NODE_X[k] - 20.5, 396);
          ctx.globalAlpha = 1;
        }
        ctx.textAlign = 'left';

        // node dots, rings, arrival flashes
        for (let k = 0; k < 5; k++) {
          const ta = ARC_T[k];
          if (t < ta || beamX < NODE_X[k] - 1) continue;
          const nx = NODE_X[k];
          ctx.fillStyle = C.node;
          ctx.beginPath();
          ctx.arc(nx, SY, 2.6, 0, Math.PI * 2);
          ctx.fill();
          // arrival ring: radius 2 -> 13.5 px (outQuad, 0.18 s), fading out completely after 0.2 s
          for (let j = 0; j < 3; j++) {
            const tj = PROBES[k * 3 + j].ta;
            const dt = t - tj;
            if (dt < 0 || dt >= 0.2) continue;
            ctx.globalAlpha = Math.pow(1 - dt / 0.2, 1.3);
            ctx.strokeStyle = '#e6e6ff';
            ctx.lineWidth = 1.9;
            ctx.beginPath();
            ctx.arc(nx, SY, 2 + 11.5 * ease.outQuad(clamp(dt / 0.18)), 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 0.35 * Math.max(0, 1 - dt / 0.08);
            ctx.drawImage(glowNode, nx - 20, SY - 20);
            ctx.globalAlpha = 1;
          }
        }

        // ---- probes: lavender comets. Outgoing: ~108 px trail, brightest at the head (+98,+96,+122 over the beam),
        // falling off ~linearly; replies are nearly as visible (+66 trail, bright head) with the trail towards the node.
        if (t > 134.0 && t < 138.9) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.lineWidth = 2;
          for (const p of PROBES) {
            const dt = t - p.te;
            if (dt < 0) continue;
            const s = V * dt;
            const end = p.target != null ? p.target : PATH_LEN + 120;
            if (s <= end) {
              const s0 = Math.max(0, s - OUT_TRAIL);
              if (s - s0 > 0.5) {
                const a = pointAt(s0), b = pointAt(s);
                const grad = ctx.createLinearGradient(a[0], a[1], b[0], b[1]);
                const span = s - s0;
                for (let i = 0; i <= 6; i++) {
                  const off = i / 6, d = (1 - off) * span;
                  grad.addColorStop(off, `rgba(196,192,244,${(0.5 * Math.pow(Math.max(0, 1 - d / OUT_TRAIL), 0.8)).toFixed(4)})`);
                }
                ctx.strokeStyle = grad;
                strokePath(s0, s);
              }
              const b = pointAt(s);
              ctx.drawImage(glowProbe, b[0] - 22, b[1] - 22);
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(b[0], b[1], 2.1, 0, Math.PI * 2);
              ctx.fill();
            } else if (p.target != null) {
              const sr = p.target - V * (t - p.ta);
              if (sr < 0) continue;
              const s1 = Math.min(p.target, sr + REPLY_TRAIL);
              const b = pointAt(sr);
              if (s1 - sr > 0.5) {
                const a = pointAt(s1);
                const grad = ctx.createLinearGradient(b[0], b[1], a[0], a[1]);
                const span = s1 - sr;
                for (let i = 0; i <= 6; i++) {
                  const off = i / 6, d = off * span;
                  const k = clamp((d - 15) / 90);
                  grad.addColorStop(off, `rgba(200,198,222,${(0.33 * (1 - k * k * (3 - 2 * k))).toFixed(4)})`);
                }
                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.moveTo(b[0], b[1]);
                ctx.lineTo(a[0], a[1]);
                ctx.stroke();
              }
              ctx.globalAlpha = 0.55;
              ctx.drawImage(glowProbe, b[0] - 22, b[1] - 22);
              ctx.globalAlpha = 0.6;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(b[0], b[1], 1.8, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
          }
          ctx.globalCompositeOperation = 'source-over';
        }

        // ---- source dot
        if (srcOn && !streaking) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(glowSrc, SX - 30, SY - 30);
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(SX, SY, 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // ---- text
        drawTraceroute(t);
        if (on(t, 134.050)) drawFooter(t);

        // ---- escape streak: bright 2px trail covering the last 50 ms of the path, soft halo, glowing head
        if (streaking) {
          const sh = STREAK_S(t);
          const N = 30;
          const pts = [];
          for (let i = 0; i <= N; i++) {
            const tau = (i / N) * TRAIL;
            const sv = STREAK_S(t - tau);
            pts.push([bez(sv), sv, tau]);
          }
          if (pts[N][1] < 1) {
            // halo: a wide soft glow (+11..+24 over the background out to ±14 px);
            // drawn flat into an offscreen layer, then blurred once and added
            hctx.setTransform(1, 0, 0, 1, 0, 0);
            hctx.clearRect(0, 0, W, H);
            hctx.lineWidth = 16;
            hctx.lineCap = 'butt';
            for (let i = 0; i < N; i++) {
              const [a] = pts[i + 1], [b] = pts[i];
              const k = 1 - Math.pow((pts[i][2] + pts[i + 1][2]) / 2 / TRAIL, 1.5);
              hctx.strokeStyle = `rgba(205,205,255,${(0.13 * k).toFixed(4)})`;
              hctx.beginPath(); hctx.moveTo(a[0], a[1]); hctx.lineTo(b[0], b[1]); hctx.stroke();
            }
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.filter = 'blur(6px)';
            ctx.drawImage(halo, 0, 0);
            ctx.restore();
            // core
            ctx.lineWidth = 2.2;
            for (let i = 0; i < N; i++) {
              const [a] = pts[i + 1], [b] = pts[i];
              const k = 1 - Math.pow((pts[i][2] + pts[i + 1][2]) / 2 / TRAIL, 1.8);
              ctx.strokeStyle = `rgba(240,240,255,${0.9 * k})`;
              ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
            }
            if (sh < 1) {
              const h = bez(sh);
              ctx.globalCompositeOperation = 'lighter';
              ctx.drawImage(glowSrc, h[0] - 30, h[1] - 30);
              ctx.drawImage(glowHead, h[0] - 20, h[1] - 20);
              ctx.globalCompositeOperation = 'source-over';
              ctx.fillStyle = '#ffffff';
              ctx.beginPath();
              ctx.arc(h[0], h[1], 3.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      },
    };
  },
};
