// 85.117-88.833  "If I'm the only God / Then you're the proof of my / Existence"
// Paper with a horizontal-hatch ground, an engraved sphere (two families of latitude circles) casting a
// cross-hatched shadow; tangent rays converge on a point that blooms into a star, the light source.
// Static engravings are pre-rendered to offscreen canvases in create(); render(t) only composites.
import { clamp, lerp, prog, ease } from './lib.js';
import { SPHERE_INK, SPHERE_DARK, GROUND_INK, SHADOW_INK } from './precision_art.js';

const T0 = 85.11, T1 = 88.825;
const SC = [1279.5, 734.5], SR = 145.5; // sphere centre / radius
const STAR = [884.5, 339.2];
const M1 = [1630, 768], M2 = [1192, 873];
const SHADOW = { cx: 1428.5, cy: 836, a: 247.5, b: 107.5, rot: -4.34 * Math.PI / 180 };
const INK = '#262020', BLUE = '#5c5ade', ORANGE = '#b95e3b';

// measured hatch rows: [y, x0, x1, strength 0..1]
const ROWS = [[703, 1167, 1606, .3], [708, 1196, 1609, .62], [714, 1141, 1667, .6], [719, 1151, 1703, .62], [725, 1108, 1742, .6],
  [731, 1115, 1691, .3], [736, 1075, 1700, .64], [742, 1028, 1725, .95], [748, 1047, 1692, .62], [754, 1004, 1726, .9],
  [760, 1044, 1718, .6], [766, 975, 1766, .95], [772, 1007, 1730, .6], [779, 990, 1766, .55], [785, 1027, 1686, .63],
  [791, 988, 1711, .55], [798, 994, 1750, .9], [805, 972, 1774, .54], [811, 1031, 1720, .58], [818, 978, 1750, .92],
  [825, 1007, 1699, .9], [832, 993, 1695, 1], [839, 940, 1781, .94], [846, 953, 1724, .85], [854, 932, 1786, .55],
  [861, 1011, 1713, .92], [869, 1031, 1695, .48], [876, 983, 1751, .95], [884, 993, 1696, .98], [892, 1037, 1706, .6],
  [900, 1029, 1742, .55], [908, 1074, 1667, .88], [916, 1052, 1687, .93], [924, 1087, 1647, .94], [933, 1091, 1639, .58],
  [941, 1178, 1574, .63], [950, 1176, 1519, .32]];

const WORDS = [
  // [text, line, t50, color]
  // 50% points measured per word from the source (frame/60); each word fades in over 5 frames.
  ['If', 0, 0], ['I’m', 0, 5130.6 / 60], ['the', 0, 5152.8 / 60], ['only', 0, 5156.3 / 60], ['God', 0, 5178.2 / 60],
  ['Then', 1, 5195.8 / 60], ['you’re', 1, 5213.8 / 60], ['the', 1, 5227.6 / 60], ['proof', 1, 5239.7 / 60], ['of', 1, 5256.9 / 60], ['my', 1, 5269.6 / 60, BLUE],
];

function axis(tiltDeg, azDeg) {
  const t = tiltDeg * Math.PI / 180, a = azDeg * Math.PI / 180;
  return [Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a), Math.cos(t)];
}
function basis(A) {
  // two unit vectors perpendicular to A
  const ref = Math.abs(A[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  let U = [A[1] * ref[2] - A[2] * ref[1], A[2] * ref[0] - A[0] * ref[2], A[0] * ref[1] - A[1] * ref[0]];
  const L = Math.hypot(...U);
  U = U.map((v) => v / L);
  const V = [A[1] * U[2] - A[2] * U[1], A[2] * U[0] - A[0] * U[2], A[0] * U[1] - A[1] * U[0]];
  return [U, V];
}

function drawSphereHatch(ctx) {
  const A1 = axis(57.5, 225), A2 = axis(50, 268);
  const fams = [
    { A: A1, step: 2.82, phase: 0.973, w: (th1) => (th1 < 30 ? 0 : 0.3 + 1.9 * Math.pow(clamp((th1 - 30) / 65), 1.15)), a: (th1) => clamp((th1 - 30) / 8) },
    { A: A2, step: 3.16, phase: 0.3, w: (th1) => 2.0 * Math.pow(clamp((th1 - 50) / 50), 1.0), a: () => 1 },
  ];
  ctx.strokeStyle = ORANGE;
  ctx.lineCap = 'butt';
  for (const F of fams) {
    const [U, V] = basis(F.A);
    for (let th = F.phase; th < 178; th += F.step) {
      const tr = th * Math.PI / 180, ct = Math.cos(tr), st = Math.sin(tr);
      const N = 360;
      let prev = null;
      for (let i = 0; i <= N; i++) {
        const ph = (i / N) * Math.PI * 2;
        const cp = Math.cos(ph), sp = Math.sin(ph);
        const P = [0, 1, 2].map((k) => ct * F.A[k] + st * (cp * U[k] + sp * V[k]));
        if (P[2] < 0) { prev = null; continue; }
        const x = SC[0] + SR * P[0], y = SC[1] + SR * P[1];
        if (prev) {
          const c1 = P[0] * A1[0] + P[1] * A1[1] + P[2] * A1[2];
          const th1 = Math.acos(clamp(c1, -1, 1)) * 180 / Math.PI;
          const w = F.w(th1);
          if (w > 0.02) {
            ctx.globalAlpha = F.a(th1) * clamp(w / 0.6, 0.35, 1);
            ctx.lineWidth = Math.max(0.5, w);
            ctx.beginPath();
            ctx.moveTo(prev[0], prev[1]);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
        }
        prev = [x, y];
      }
    }
  }
  ctx.globalAlpha = 1;
}

function shadowPath(ctx) {
  ctx.beginPath();
  ctx.ellipse(SHADOW.cx, SHADOW.cy, SHADOW.a, SHADOW.b, SHADOW.rot, 0, Math.PI * 2);
}

export default {
  id: 'existence/god',
  start: T0,
  end: T1,
  async create(root, env) {
    const BASE = new URL('./fonts/librecaslon/', import.meta.url).href;
    const faces = [new FontFace('Libre Caslon Text X', `url(${BASE}LibreCaslonText-wght.ttf)`, { weight: '400 700' }),
      new FontFace('Libre Caslon Display X', `url(${BASE}LibreCaslonDisplay-Regular.ttf)`)];
    faces.forEach((f) => document.fonts.add(f));
    await Promise.all(faces.map((f) => f.load()));

    // ---------- layers ----------
    // Everything is rasterised on CPU 2D canvases (willReadFrequently) and composited into one visible canvas:
    // GPU-composited DOM/CSS layers here produced run-to-run pixel noise and an occasional tile glitch.
    const mk = () => {
      const c = document.createElement('canvas');
      c.width = 1920;
      c.height = 1080;
      return [c, c.getContext('2d', { willReadFrequently: true })];
    };
    const { ctx: out } = env.canvas(root, { options: { willReadFrequently: true } });
    // CSS radial-gradient equivalents (ellipse/circle, stops as in the former CSS backgrounds).
    const radial = (cx, cy, rx, ry, stops) => {
      const [c, g] = mk();
      g.setTransform(rx / ry, 0, 0, 1, cx, cy);
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, ry);
      for (const [col, at] of stops) gr.addColorStop(at, col);
      g.fillStyle = gr;
      g.fillRect(-cx * ry / rx - 1, -cy - 1, 1922 * ry / rx, 1082);
      return c;
    };
    const bgC = radial(960, 540, 1104, 1080, [['#e3ded9', .4], ['#e1dcd7', .58], ['#dcd7d2', .725], ['#d6d1cc', .87], ['#d2cdc8', 1]]);
    // Translucent light layers are filled straight into the output with their opacity folded into the stops
    // (float precision, quantised once), instead of going through an 8-bit intermediate.
    const SHADE = [960, 540, 1104, 1080, [[[0, 0, 0], 0, .62], [[40, 30, 25], .015, .8], [[40, 30, 25], .025, 1]]];
    const GLOW1 = [STAR[0], STAR[1], 600, 600, [[[252, 245, 240], .45, 0], [[252, 245, 240], .45, 150 / 600], [[252, 245, 240], .31, 240 / 600], [[252, 245, 240], .23, 300 / 600], [[252, 245, 240], .19, 420 / 600], [[252, 245, 240], .06, 480 / 600], [[252, 245, 240], 0, 1]]];
    const GLOW2 = [STAR[0], STAR[1], 1000, 1000, [[[255, 250, 246], .5, 0], [[255, 250, 246], .42, .26], [[255, 250, 246], .18, .62], [[255, 250, 246], .06, 1]]];
    const lightLayer = ([cx, cy, rx, ry, stops], op) => {
      out.save(); out.setTransform(rx / ry, 0, 0, 1, cx, cy);
      const gr = out.createRadialGradient(0, 0, 0, 0, 0, ry);
      for (const [[r, g, b], a, at] of stops) gr.addColorStop(at, `rgba(${r},${g},${b},${(a * op).toFixed(5)})`);
      out.fillStyle = gr; out.fillRect(-cx * ry / rx - 1, -cy - 1, 1922 * ry / rx, 1082); out.restore();
    };
    const [canvas, ctx] = mk(); // the drawing layer (formerly the scene canvas)

    // ---------- pre-rendered layers ----------
    const rng = env.rng(85117);
    // ground hatch rows
    const [hatchC, h] = mk();
    for (const [y, x0, x1, s] of ROWS) {
      const L = x1 - x0;
      const ext = 0.08 * L;
      const xa = x0 - ext, xb = x1 + ext;
      // split into segments with varying darkness for an engraved feel
      let x = xa;
      while (x < xb) {
        const seg = 40 + rng() * 120;
        const xe = Math.min(xb, x + seg);
        const g = h.createLinearGradient(xa, 0, xb, 0);
        const v = s * (0.75 + rng() * 0.5);
        g.addColorStop(0, 'rgba(40,34,32,0)');
        g.addColorStop(0.22, `rgba(40,34,32,${(0.55 * v).toFixed(3)})`);
        g.addColorStop(0.5, `rgba(40,34,32,${(0.72 * v).toFixed(3)})`);
        g.addColorStop(0.78, `rgba(40,34,32,${(0.55 * v).toFixed(3)})`);
        g.addColorStop(1, 'rgba(40,34,32,0)');
        h.strokeStyle = g;
        h.lineWidth = 1.15;
        h.beginPath();
        h.moveTo(x, y + 0.5);
        h.lineTo(xe, y + 0.5);
        h.stroke();
        x = xe;
      }
    }
    // shadow cross-hatch (clipped to the shadow ellipse): ground rows + midpoints, and 22.5deg diagonals
    const [shadC, sh] = mk();
    sh.save();
    shadowPath(sh);
    sh.clip();
    sh.strokeStyle = 'rgba(27,24,23,0.62)';
    sh.lineWidth = 0.85;
    const ys = ROWS.map((r) => r[0]);
    const rowsAll = [];
    for (let i = 0; i < ys.length; i++) {
      rowsAll.push(ys[i]);
      if (i + 1 < ys.length) rowsAll.push((ys[i] + ys[i + 1]) / 2);
    }
    for (const y of rowsAll) {
      sh.beginPath();
      sh.moveTo(1150, y + 0.5);
      sh.lineTo(1700, y + 0.5);
      sh.stroke();
    }
    const slope = Math.tan(22.5 * Math.PI / 180);
    sh.strokeStyle = 'rgba(27,24,23,0.66)';
    sh.lineWidth = 0.8;
    for (let x = 900; x < 1900; x += 7.0) {
      sh.beginPath();
      sh.moveTo(x, 960);
      sh.lineTo(x + 300 / slope, 960 - 300);
      sh.stroke();
    }
    sh.restore();
    // the far (upper-right) end of the shadow is lighter
    sh.globalCompositeOperation = 'destination-out';
    const fade = sh.createLinearGradient(1300, 900, 1680, 760);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.55, 'rgba(0,0,0,0.05)');
    fade.addColorStop(1, 'rgba(0,0,0,0.3)');
    sh.fillStyle = fade;
    sh.fillRect(1100, 680, 700, 300);
    sh.globalCompositeOperation = 'source-over';
    // sphere engraving
    const [sphC, sp] = mk();
    sp.save();
    sp.beginPath();
    sp.arc(SC[0], SC[1], SR - 0.6, 0, Math.PI * 2);
    sp.clip();
    drawSphereHatch(sp);
    sp.restore();
    // Thin vector ribbons follow the measured engraving topology at native resolution.
    const ribbons=(c,bands,color,opacities)=>{c.clearRect(0,0,1920,1080);c.save();c.translate(.5,.5);c.fillStyle=color;bands.forEach(([level,d],i)=>{c.globalAlpha=opacities[i];c.fill(new Path2D(d),'evenodd');});c.restore();c.globalAlpha=1;};
    ribbons(h,GROUND_INK,'#000000',[.25,.50,1]);
    ribbons(sh,SHADOW_INK,'#000000',[.25,.50,1]);
    ribbons(sp,SPHERE_INK,ORANGE,[.25,.50,.66,.90]);
    sp.save();sp.translate(.5,.5);sp.fillStyle='#000000';SPHERE_DARK.forEach(([v,d],i)=>{sp.globalAlpha=[.25,.50,.66,.90][i];sp.fill(new Path2D(d),'evenodd');});sp.restore();sp.globalAlpha=1;

    // ---------- text: laid out by the DOM once (hidden), then drawn on the CPU canvas ----------
    const txt = document.createElement('div');
    txt.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;visibility:hidden;color:' + INK;
    root.appendChild(txt);
    const lines = [0, 1].map((i) => {
      const d = document.createElement('div');
      d.style.cssText = `position:absolute;left:${i ? 120.4 : 118.4}px;top:${i ? 664.4 : 579.5}px;white-space:pre;font:400 64.9px "Libre Caslon Text X";line-height:1;transform:scaleX(${i ? 0.9846 : 0.988});transform-origin:0 0`;
      txt.appendChild(d);
      return d;
    });
    const words = WORDS.map(([w, li, t50, col], i) => {
      const s = document.createElement('span');
      s.textContent = w;
      if (col) s.style.color = col;
      // Per-word x nudges (px) measured against the source; the source's word spacing is not uniform.
      const nudge = [0, -1, -2.25, -3, -0.75, 0, 2, 1, 1.25, 1.75, 1][i];
      if (nudge) s.style.cssText += `;position:relative;left:${nudge}px`;
      if (i && WORDS[i - 1][1] === li) lines[li].appendChild(document.createTextNode(' '));
      lines[li].appendChild(s);
      return { s, t: t50 };
    });
    const ex = document.createElement('div');
    ex.style.cssText = 'position:absolute;left:114.2px;top:734.4px;white-space:pre;font:400 172.5px "Libre Caslon Display X";line-height:1;transform:scaleX(0.9845);transform-origin:0 0';
    txt.appendChild(ex);
    const exLetters = [...'Existence'].map((ch, i) => {
      const s = document.createElement('span');
      s.textContent = ch;
      ex.appendChild(s);
      // Letter pop frames traced from the source (not evenly spaced: i/s and t/e land together).
      return { s, t: ([5291, 5292, 5293, 5293, 5294, 5294, 5295, 5297, 5298][i] - 0.5) / 60 };
    });
    // Fractional layout read back from the DOM (getBoundingClientRect; offsetLeft/Top would round to whole px).
    // Baselines: a zero-height inline-block sits on the baseline of each line box.
    const R0 = root.getBoundingClientRect();
    const baseOf = (d) => { const m = document.createElement('span'); m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'; d.appendChild(m); const y = m.getBoundingClientRect().bottom - R0.top; m.remove(); return y; };
    const xOf = (el) => el.getBoundingClientRect().left - R0.left;
    const LINES = lines.map((d, i) => ({ x: i ? 120.4 : 118.4, dx: i ? -0.25 : -0.5, y: baseOf(d), sx: i ? 0.9846 : 0.988 }));
    const EXL = { y: baseOf(ex), sx: 0.9845 };
    // Lyric lines: layout offsets plus small measured residuals matched best against the former DOM raster.
    const WDX = [0, 0, 0, 0.25, 0, -0.125, 0.25, 0, -0.625, 0, -0.5];
    const wordDraw = WORDS.map(([w, li, t50, col], i) => { const L = LINES[li]; return { w, li, col: col || INK, x: L.x + L.dx + WDX[i] + L.sx * words[i].s.offsetLeft, t: t50 }; });
    const exDraw = exLetters.map((L, i) => ({ ch: 'Existence'[i], x: xOf(L.s), t: L.t }));
    txt.remove();

    const tanPt = (M) => {
      // tangent point on the sphere outline of the line M->STAR (closest approach)
      const dx = STAR[0] - M[0], dy = STAR[1] - M[1];
      const L = Math.hypot(dx, dy);
      const k = ((SC[0] - M[0]) * dx + (SC[1] - M[1]) * dy) / (L * L);
      return k;
    };
    const k1 = tanPt(M1), k2 = tanPt(M2);

    const lineAt = (M, k) => [lerp(M[0], STAR[0], k), lerp(M[1], STAR[1], k)];

    return {
      render(t) {
        // background light
        const g1 = ease.outQuad(prog(t, 86.42, 0.18));
        const aShade = g1 * (1 - prog(t, 88.37, 0.26)), aGlow2 = ease.inOutQuad(prog(t, 88.37, 0.26));
        for (const c of [out, ctx]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none'; }
        ctx.clearRect(0, 0, 1920, 1080);
        ctx.drawImage(hatchC, 0, 0);

        // shadow fades in
        const ks = prog(t, 86.965, 0.075);
        if (ks > 0) {
          ctx.save();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=ks;shadowPath(ctx);ctx.fill();ctx.restore();
          ctx.globalAlpha = ks;
          ctx.drawImage(shadC, 0, 0);
          ctx.globalAlpha = 1;
        }

        // sphere: fill + outline drawn clockwise from the top, then the engraving fades in
        const ko = ease.inOutQuad(prog(t, 86.825, 0.11));
        if (ko > 0) {
          const kf = prog(t, 86.85, 0.06);
          // Disc tone: 227,222,217 while the outline is drawn (measured), lifting as the engraving fades in.
          const kt = prog(t, 86.95, 0.1);
          ctx.fillStyle = `rgba(${Math.round(lerp(227, 236, kt))},${Math.round(lerp(222, 229, kt))},${Math.round(lerp(217, 224, kt))},${kf.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(SC[0], SC[1], SR, 0, Math.PI * 2);
          ctx.fill();
          const kh = prog(t, 86.95, 0.1);
          if (kh > 0) {
            ctx.globalAlpha = kh;
            ctx.drawImage(sphC, 0, 0);
            ctx.globalAlpha = 1;
          }
          ctx.strokeStyle = ORANGE;
          ctx.lineWidth = 1.0;
          ctx.globalAlpha=1-kh;
          ctx.beginPath();
          ctx.arc(SC[0], SC[1], SR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ko);
          ctx.stroke();
          ctx.globalAlpha=1;
        }

        // tangent rays from the shadow markers to the light point; the blue sweeps down from the star
        const p1 = t < 87.70 ? k1 * ease.outQuad(prog(t, 87.38, 0.24)) : lerp(k1, 1, ease.inOutQuad(prog(t, 87.70, 0.165)));
        const p2 = t < 87.70 ? k2 * ease.outQuad(prog(t, 87.45, 0.09)) : lerp(k2, 1, ease.inOutQuad(prog(t, 87.70, 0.165)));
        const sweep = Math.max(0, (t - 88.245) * 8300);
        for (const [M, p] of [[M1, p1], [M2, p2]]) {
          if (p <= 0) continue;
          const e = lineAt(M, p);
          const L = Math.hypot(STAR[0] - M[0], STAR[1] - M[1]);
          const kb = clamp(sweep / L); // fraction (from the star) that is blue
          const split = lineAt(M, 1 - kb);
          if (kb < 1) {
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(M[0], M[1]);
            ctx.lineTo(kb > 0 ? split[0] : e[0], kb > 0 ? split[1] : e[1]);
            ctx.stroke();
          }
          if (kb > 0) {
            ctx.strokeStyle = BLUE;
            ctx.lineWidth = 1.35;
            ctx.beginPath();
            ctx.moveTo(split[0], split[1]);
            ctx.lineTo(e[0], e[1]);
            ctx.stroke();
          }
        }
        // markers
        const km = ease.outBack(prog(t, 87.15, 0.06), 2);
        if (km > 0) {
          for (const M of [M1, M2]) {
            ctx.fillStyle = '#e4dfdc';
            ctx.strokeStyle = '#1a1716';
            ctx.lineWidth = 1.7;
            ctx.beginPath();
            ctx.arc(M[0], M[1], 6.2 * km, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
        // tangent dots on the sphere, once the blue sweep has passed them
        ctx.fillStyle = BLUE;
        for (const [M, k] of [[M1, k1], [M2, k2]]) {
          const L = Math.hypot(STAR[0] - M[0], STAR[1] - M[1]);
          if (sweep < (1 - k) * L) continue;
          const p = lineAt(M, k);
          ctx.beginPath();
          ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // the star
        if (t >= 87.88) {
          const kg = starGrow(t);
          if (kg > 0) {
            // halo
            ctx.fillStyle = 'rgba(247,241,236,1)';
            ctx.beginPath();
            ctx.arc(STAR[0], STAR[1], 25 * Math.min(1, kg * 1.6), 0, Math.PI * 2);
            ctx.fill();
            drawStraightRays(ctx, kg);
          }
          const kw = wavyGrow(t);
          if (kw > 0) drawWavyRays(ctx, kw);
          // ring + dot
          const kr = ease.outBack(prog(t, 87.93, 0.06), 2);
          ctx.strokeStyle = BLUE;
          ctx.lineWidth = 1.6;
          if (kr > 0) {
            ctx.beginPath();
            ctx.arc(STAR[0], STAR[1], 11.6 * kr, 0, Math.PI * 2);
            ctx.stroke();
          }
          const kd = ease.outBack(prog(t, 87.88, 0.05), 2);
          ctx.fillStyle = BLUE;
          ctx.beginPath();
          ctx.arc(STAR[0], STAR[1], 5 * kd, 0, Math.PI * 2);
          ctx.fill();
        }

        // underline under "you're"
        const ku = ease.outQuad(prog(t, 86.9, 0.08));
        if (ku > 0) {
          ctx.fillStyle = '#b15d40';
          ctx.fillRect(300, 742.6, 186.5 * ku, 2.8);
        }

        // composite: paper, shade, glows, drawing layer, then the lyric (same stacking as the former DOM)
        out.drawImage(bgC, 0, 0);
        for (const [L, al] of [[SHADE, aShade], [GLOW1, g1], [GLOW2, aGlow2]]) if (al > 0) lightLayer(L, +al.toFixed(3));
        out.globalAlpha = 1;
        out.drawImage(canvas, 0, 0);
        out.textBaseline = 'alphabetic';
        out.font = '400 64.9px "Libre Caslon Text X"';
        for (const w of wordDraw) {
          const a = w.t ? clamp((t - (w.t - 0.0425)) / 0.085) : 1;
          if (a <= 0) continue;
          const L = LINES[w.li];
          out.save(); out.globalAlpha = a; out.fillStyle = w.col; out.setTransform(L.sx, 0, 0, 1, w.x, 0); out.fillText(w.w, 0, L.y); out.restore();
        }
        out.font = '400 172.5px "Libre Caslon Display X"'; out.fillStyle = INK;
        for (const L of exDraw) if (t >= L.t) { out.setTransform(EXL.sx, 0, 0, 1, L.x, 0); out.fillText(L.ch, 0, EXL.y); }
        out.setTransform(1, 0, 0, 1, 0, 0);
      },
    };
  },
};

// 12 straight rays of 5 parallel lines with stepped lengths (centre lengths measured per direction)
const RAY_RNG = (() => {
  let a = 1234567;
  return () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296);
})();
const CENTRE_LEN = [202, 185, 185, 172, 179, 168, 203, 174, 191, 163, 176, 160];
const STRAIGHT = CENTRE_LEN.map((L, k) => {
  const i1 = L - 30 - RAY_RNG() * 10, i2 = L - 32 - RAY_RNG() * 10;
  const o1 = L - 62 - RAY_RNG() * 14, o2 = L - 62 - RAY_RNG() * 14;
  return { ang: (k * 30) * Math.PI / 180, lens: [o1, i1, L, i2, o2] };
});
const keyed = (t, T, V) => {
  if (t <= T[0]) return V[0];
  for (let i = 1; i < T.length; i++) if (t <= T[i]) return lerp(V[i - 1], V[i], (t - T[i - 1]) / (T[i] - T[i - 1]));
  return V[V.length - 1];
};
export const starGrow = (t) => keyed(t, [88.238, 88.25, 88.267, 88.283, 88.3, 88.317, 88.333, 88.35, 88.367, 88.4, 88.433],
  [0, 0.18, 0.38, 0.64, 0.76, 0.84, 0.9, 0.93, 0.955, 0.98, 1]);
export const wavyGrow = (t) => keyed(t, [88.59, 88.6, 88.617, 88.633, 88.65, 88.667, 88.683, 88.7], [0, 0.2, 0.49, 0.8, 0.86, 0.92, 0.97, 1]);
function drawStraightRays(ctx, k) {
  ctx.strokeStyle = 'rgba(92,90,222,0.92)';
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  for (const R of STRAIGHT) {
    const c = Math.cos(R.ang), s = Math.sin(R.ang);
    R.lens.forEach((L, i) => {
      const off = (i - 2) * 2.3;
      const r0 = 26, r1 = Math.max(r0, lerp(14, L, k));
      if (r1 <= r0) return;
      ctx.moveTo(STAR[0] + c * r0 - s * off, STAR[1] + s * r0 + c * off);
      ctx.lineTo(STAR[0] + c * r1 - s * off, STAR[1] + s * r1 + c * off);
    });
  }
  ctx.stroke();
}
// 12 wavy flame-like rays of 3 lines converging to a tip, gentle S-bend (counter-clockwise bulge)
const WAVY = Array.from({ length: 12 }, (_, k) => ({ ang: (15 + k * 30) * Math.PI / 180, len: 135 + RAY_RNG() * 12 }));
function drawWavyRays(ctx, k) {
  ctx.strokeStyle = 'rgba(92,90,222,0.95)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const R of WAVY) {
    const c = Math.cos(R.ang), s = Math.sin(R.ang);
    const r0 = 30, r1 = R.len;
    const uMax = k;
    for (const i of [-1, 0, 1]) {
      for (let j = 0; j <= 40; j++) {
        const u = (j / 40) * uMax;
        const r = lerp(r0, r1, u);
        const bulge = -7 * Math.sin(Math.PI * u) + 2.5 * Math.sin(2 * Math.PI * u);
        const off = bulge + i * 2.7 * (1 - Math.pow(u, 2.6));
        const x = STAR[0] + c * r - s * off, y = STAR[1] + s * r + c * off;
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
    }
  }
  ctx.stroke();
}
