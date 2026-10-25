// me.execute(world): an orthographic globe (Natural Earth 110m land, vendored) slowly rotating east.
// Coastlines are drawn as outlines; a glowing meridian sweeps westward in 30° spring-eased steps (one per
// beat) and turns everything east of it into a dotted-land lattice. Eight cities light up with a pulse ring.
// Geometry, rotation, lattice and timings were measured on the original (see out/escape/tools/).
import { on, clamp, prog, ease, lerp, resetCtx } from './lib/util.js';

const CX = 960.5, CY = 540.5, R = 380;
const D2R = Math.PI / 180;
const lam0At = (t) => 90.1 - 7 * (t - 140.517);           // view centre longitude (deg), latitude 0

// sweep boundary: starts of the 30° steps (deg values before each step: 180,150,...)
const STEP_T = [140.965, 141.429, 141.900, 142.371, 142.827, 143.301, 143.756];
const ZETA = 0.716, OMEGA = 25.2;
const OMD = OMEGA * Math.sqrt(1 - ZETA * ZETA);
function spring(tau) {
  if (tau <= 0) return 0;
  const e = Math.exp(-ZETA * OMEGA * tau);
  return 1 - e * (Math.cos(OMD * tau) + (ZETA * OMEGA / OMD) * Math.sin(OMD * tau));
}
function boundaryLon(t) {
  let lon = 180;
  for (const s of STEP_T) lon -= 30 * spring(t - s);
  return lon;
}

const OUTLINE_LAG = 0.035, DOT_LAGS = [0.02, 0.03, 0.04, 0.05];
const WAKE_N = 5, WAKE_H = 0.01;

const CITIES = [
  ['Tokyo', 139.69, 35.69, 140.967], ['Delhi', 77.21, 28.61, 141.667], ['Shanghai', 121.47, 31.23, 142.600],
  ['Cairo', 31.24, 30.04, 142.733], ['Mumbai', 72.88, 19.08, 143.300], ['Beijing', 116.40, 39.90, 143.533],
  ['Dhaka', 90.41, 23.81, 143.650], ['Karachi', 67.01, 24.86, 143.750],
];

const FOOT_FONT = '400 22px Michroma';
const FOOT_LS = '0.9px';
const TOKENS = ['me', '.', 'execute', '(', 'world', ')', ';'];
const FOOT_Y = 977, FOOT_X0 = 824.5;

export default {
  id: 'escape/globe',
  start: 140.51,
  end: 144.21,
  fonts: [FOOT_FONT],
  async create(root, env) {
    const { canvas, ctx } = env.canvas(root, { context: '2d', options: { alpha: false } });
    const W = canvas.width, H = canvas.height;
    const geo = await env.loadJSON(new URL('./vendor/geo/land110.json', import.meta.url).href);
    // rings as Float32Arrays of radians; drop edges along the antimeridian / polar cap (topology seams)
    const rings = geo.rings.map((r) => {
      const a = new Float32Array(r.length);
      for (let i = 0; i < r.length; i++) a[i] = r[i] * D2R;
      return a;
    });
    const dots = new Float32Array(geo.dots.length);
    for (let i = 0; i < dots.length; i++) dots[i] = geo.dots[i] * D2R;

    // static layers: background + rim glow + disc
    const base = document.createElement('canvas');
    base.width = W; base.height = H;
    {
      const g = base.getContext('2d');
      // dark background with a broad soft glow around the globe (measured: 11 near the limb -> 5 in the corners)
      const bgg = g.createRadialGradient(CX, CY, R, CX, CY, 1150);
      bgg.addColorStop(0, '#0b0a10');
      bgg.addColorStop(0.09, '#09080d');
      bgg.addColorStop(0.3, '#08060b');
      bgg.addColorStop(0.62, '#06050a');
      bgg.addColorStop(1, '#050409');
      g.fillStyle = bgg;
      g.fillRect(0, 0, W, H);
      // outer halo
      const halo = g.createRadialGradient(CX, CY, R - 2, CX, CY, R + 26);
      halo.addColorStop(0, 'rgba(120,118,190,0.17)');
      halo.addColorStop(0.25, 'rgba(110,108,180,0.08)');
      halo.addColorStop(0.6, 'rgba(100,98,170,0.035)');
      halo.addColorStop(1, 'rgba(100,98,170,0)');
      g.fillStyle = halo;
      g.beginPath(); g.arc(CX, CY, R + 26, 0, Math.PI * 2); g.fill();
      // disc
      g.fillStyle = '#0a0a11';
      g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.fill();
      // inner limb glow
      const inner = g.createRadialGradient(CX, CY, R - 22, CX, CY, R);
      inner.addColorStop(0, 'rgba(120,118,200,0)');
      inner.addColorStop(0.6, 'rgba(120,118,200,0.035)');
      inner.addColorStop(1, 'rgba(130,128,210,0.12)');
      g.fillStyle = inner;
      g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.fill();
      // rim line
      g.strokeStyle = 'rgba(150,148,225,0.13)';
      g.lineWidth = 1.5;
      g.beginPath(); g.arc(CX, CY, R, 0, Math.PI * 2); g.stroke();
    }

    ctx.font = FOOT_FONT;
    ctx.letterSpacing = FOOT_LS;
    const footX = [];
    { let acc = ''; for (const tk of TOKENS) { footX.push(FOOT_X0 + ctx.measureText(acc).width); acc += tk; } }
    ctx.letterSpacing = '0px';

    const glowCity = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 48;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.12, 'rgba(240,240,255,0.55)');
      gr.addColorStop(0.35, 'rgba(210,210,245,0.18)');
      gr.addColorStop(0.7, 'rgba(190,190,235,0.05)');
      gr.addColorStop(1, 'rgba(190,190,235,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 48, 48);
      return c;
    })();

    function westClip(db) {
      // region of the visible disc with (lon - lam0) < db: left limb + the meridian half-ellipse
      ctx.beginPath();
      if (db >= Math.PI / 2) { ctx.arc(CX, CY, R + 2, 0, Math.PI * 2); return true; }
      if (db <= -Math.PI / 2) return false;
      const rx = R * Math.sin(db);
      ctx.moveTo(CX, CY - R - 2);
      ctx.arc(CX, CY, R + 2, -Math.PI / 2, Math.PI / 2, true);   // west limb, top -> bottom
      // back up along the boundary meridian (bottom -> top)
      for (let i = 0; i <= 64; i++) {
        const phi = -Math.PI / 2 + Math.PI * i / 64;
        ctx.lineTo(CX + rx * Math.cos(phi), CY - R * Math.sin(phi));
      }
      ctx.closePath();
      return true;
    }

    return {
      render(t) {
        resetCtx(ctx);
        ctx.drawImage(base, 0, 0);
        const l0 = lam0At(t) * D2R;
        // boundary (relative to the view centre) where the sweep was at time tt; before the sweep starts it is
        // still behind the east limb (all outlines)
        const dbAt = (tt) => {
          if (tt < STEP_T[0] - 0.05) return Math.PI;
          let v = boundaryLon(tt) * D2R - l0;
          while (v > Math.PI) v -= 2 * Math.PI;
          while (v < -Math.PI) v += 2 * Math.PI;
          return v;
        };
        const sweepOn = t >= STEP_T[0] - 0.05;
        const db = dbAt(t);
        // The original reveals land behind the moving line with a lag: outlines survive ~35 ms past the line,
        // dots grow in 20-50 ms after it, and a faint blue wake trails the line (traced on 142.38-142.47).
        const dbOutline = dbAt(t - OUTLINE_LAG);
        const dbDots = DOT_LAGS.map((l) => dbAt(t - l));

        // graticule
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(200,202,225,0.15)';
        ctx.beginPath();
        for (let lat = -75; lat <= 75; lat += 15) {
          // parallels are crisp one-pixel rows on the original (row = floor(y - 0.5), measured for -60..60°)
          const p = lat * D2R, y = Math.floor(CY - R * Math.sin(p) - 0.5) + 0.5, hw = R * Math.cos(p);
          ctx.moveTo(CX - hw, y); ctx.lineTo(CX + hw, y);
        }
        for (let lon = -180; lon < 180; lon += 15) {
          let d = lon * D2R - l0;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          if (Math.abs(d) >= Math.PI / 2) continue;
          const rx = R * Math.sin(d);
          // d3.geoGraticule extents: minor meridians stop at ±80°, majors (every 90°) reach the poles
          const lim = (lon % 90 === 0 ? 90 : 80) * D2R;
          for (let i = 0; i <= 48; i++) {
            const phi = -lim + 2 * lim * i / 48;
            const x = CX + rx * Math.cos(phi), y = CY - R * Math.sin(phi);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();

        // coastlines (west of the sweep)
        ctx.save();
        if (westClip(dbOutline)) {
          ctx.clip();
          ctx.strokeStyle = 'rgba(244,244,252,0.95)';
          ctx.lineWidth = 1.35;
          ctx.lineJoin = 'round';
          ctx.beginPath();
          for (const r of rings) {
            let pen = false;
            for (let i = 0; i < r.length; i += 2) {
              const lon = r[i], lat = r[i + 1];
              const d = lon - l0;
              const cp = Math.cos(lat);
              const vis = cp * Math.cos(d) > 0;
              const seam = Math.abs(Math.abs(lon) - Math.PI) < 1e-4 || lat < -85 * D2R;
              if (!vis || seam) { pen = false; continue; }
              const x = CX + R * cp * Math.sin(d), y = CY - R * Math.sin(lat);
              if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
            }
          }
          ctx.stroke();
        }
        ctx.restore();

        // wake: additive blue band from the line back to where it was 50 ms ago (only while it moves west)
        if (sweepOn) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          const lim = (v) => Math.max(-Math.PI / 2, Math.min(Math.PI / 2, v));
          for (let k = 0; k < WAKE_N; k++) {
            const a1 = lim(dbAt(t - k * WAKE_H)), a2 = lim(dbAt(t - (k + 1) * WAKE_H));
            if (a2 - a1 < 1e-4) continue;
            const w = 1 - (k + 0.5) / WAKE_N;
            const rx1 = R * Math.sin(a1), rx2 = R * Math.sin(a2);
            ctx.beginPath();
            for (let i = 0; i <= 48; i++) {
              const phi = Math.PI / 2 - Math.PI * i / 48;
              ctx.lineTo(CX + rx1 * Math.cos(phi), CY - R * Math.sin(phi));
            }
            for (let i = 48; i >= 0; i--) {
              const phi = Math.PI / 2 - Math.PI * i / 48;
              ctx.lineTo(CX + rx2 * Math.cos(phi), CY - R * Math.sin(phi));
            }
            ctx.closePath();
            ctx.fillStyle = `rgb(${Math.round(11 * w)},${Math.round(9 * w)},${Math.round(26 * w)})`;
            ctx.fill();
          }
          ctx.restore();
        }

        // dotted land (east of the sweep); dots just behind the moving line are still growing in
        if (Math.min(...dbDots) < Math.PI / 2) {
          const r0 = 1.75;
          const paths = DOT_LAGS.map(() => new Path2D());
          for (let i = 0; i < dots.length; i += 2) {
            let d = dots[i] - l0;
            if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
            const lat = dots[i + 1];
            const cp = Math.cos(lat);
            const cosc = cp * Math.cos(d);
            if (cosc <= 0.02) continue;
            let n = 0;
            for (const b of dbDots) if (d > b) n++;
            if (n === 0) continue;
            const sc = 0.55 + 0.45 * n / DOT_LAGS.length;
            const ox = R * cp * Math.sin(d), oy = -R * Math.sin(lat);
            const x = CX + ox, y = CY + oy;
            const rot = Math.atan2(oy, ox);
            const P = paths[n - 1];
            P.moveTo(x + r0 * sc * cosc * Math.cos(rot), y + r0 * sc * cosc * Math.sin(rot));
            P.ellipse(x, y, r0 * sc * cosc, r0 * sc, rot, 0, Math.PI * 2);
          }
          ctx.fillStyle = '#f2f2fb';
          for (let n = 1; n <= DOT_LAGS.length; n++) {
            ctx.globalAlpha = 0.45 + 0.55 * n / DOT_LAGS.length;
            ctx.fill(paths[n - 1]);
          }
          ctx.globalAlpha = 1;
        }

        // sweep meridian line
        if (sweepOn && Math.abs(db) < Math.PI / 2) {
          const rx = R * Math.sin(db);
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i <= 64; i++) {
            const phi = -Math.PI / 2 + Math.PI * i / 64;
            const x = CX + rx * Math.cos(phi), y = CY - R * Math.sin(phi);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = 'rgba(110,100,230,0.07)';
          ctx.lineWidth = 6;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(140,132,215,0.82)';
          ctx.lineWidth = 1.7;
          ctx.stroke();
          ctx.restore();
        }

        // cities
        for (const [, lonD, latD, t0] of CITIES) {
          if (!on(t, t0)) continue;
          const tau = t - t0;
          const lon = lonD * D2R, lat = latD * D2R;
          let d = lon - l0;
          const cp = Math.cos(lat);
          if (cp * Math.cos(d) <= 0) continue;
          const x = CX + R * cp * Math.sin(d), y = CY - R * Math.sin(lat);
          // pulse ring: a flat screen-space circle growing to ~23 px and fading out (measured on the original)
          if (tau < 0.6) {
            const rr = 4 + 19 * ease.outCubic(clamp(tau / 0.36));
            const a = 0.42 * (1 - clamp((tau - 0.06) / 0.54));
            if (a > 0) {
              ctx.strokeStyle = `rgba(225,225,240,${a})`;
              ctx.lineWidth = 1.3;
              ctx.beginPath();
              ctx.arc(x, y, rr, 0, Math.PI * 2);
              ctx.stroke();
            }
          }
          const glowA = 0.5 + 0.5 * Math.max(0, 1 - tau / 0.5);
          const gs = 0.8 + 0.25 * Math.max(0, 1 - tau / 0.25);
          ctx.globalCompositeOperation = 'lighter';
          ctx.globalAlpha = glowA;
          ctx.drawImage(glowCity, x - 24 * gs, y - 24 * gs, 48 * gs, 48 * gs);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }

        // footer: each sweep step lights up the next token ~23 ms after the step starts. Measured on "world"
        // (142.85-143.0): grey (181,180,200) jumps a quarter of the way, then brightens ~linearly over 0.15 s to
        // (245,243,255); blue leads, so the token passes through lavender.
        ctx.font = FOOT_FONT;
        ctx.letterSpacing = FOOT_LS;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        for (let i = 0; i < TOKENS.length; i++) {
          const tau = t - (STEP_T[i] + 0.023);
          const k = tau > 0 ? Math.min(1, 0.16 + 5.6 * tau) : 0;
          const kb = 1 - Math.pow(1 - k, 2.2);
          const c = [lerp(181, 245, k), lerp(180, 243, k), lerp(200, 255, kb)];
          ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
          ctx.fillText(TOKENS[i], footX[i], FOOT_Y);
          // lit tokens are set heavier on the original (~25% more ink than the grey ones): embolden with a stroke
          if (k > 0) {
            ctx.strokeStyle = ctx.fillStyle;
            ctx.lineWidth = 0.45 * k;
            ctx.lineJoin = 'round';
            ctx.strokeText(TOKENS[i], footX[i], FOOT_Y);
          }
        }
        ctx.letterSpacing = '0px';
      },
    };
  },
};
