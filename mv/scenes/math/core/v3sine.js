// Verse 3 — "If I'm a sine wave / Then you can sit on all my TANGENTS" (36.95–41.4 s), plus the
// curve itself until the end of the segment (the sine → limit-curve morph of verse 4 happens here).
// θ(t) for the trace and the four "rides" was read frame by frame off the source (the radius angle
// in the unit circle); the jumps are exponential approaches (τ = 60 ms) that start on the beat.
import { clamp, lerp, prog, ease, marker } from './draw.js';
import { el } from './text.js';
import { U, CIRC, PLOT, SERIF, MONO } from './const.js';
import { litArc, thinRing, ticks, crosshair } from './ring.js';
import { polyState } from './v2circle.js';

const D2R = Math.PI / 180;
const X = (th) => PLOT.x0 + th * U;              // θ (rad) → px
const Y = (v) => PLOT.y0 - v * U;

function table(tab, t) {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (t <= tab[i][0]) {
      const [a, va] = tab[i - 1], [b, vb] = tab[i];
      return va + (vb - va) * (t - a) / (b - a);
    }
  }
  return tab[tab.length - 1][1];
}

// trace: radius angle (deg) per frame, 37.15 → 38.5
const TRACE = [[37.15, 0], [37.167, 1], [37.2, 1.2], [37.217, 2], [37.233, 4], [37.25, 5], [37.267, 7], [37.283, 9],
  [37.3, 11], [37.317, 13.5], [37.333, 16], [37.35, 19], [37.367, 22], [37.383, 26], [37.4, 29], [37.417, 33],
  [37.433, 37.5], [37.45, 42], [37.467, 46], [37.483, 51], [37.5, 56], [37.517, 61], [37.533, 66], [37.55, 71.5],
  [37.567, 77], [37.583, 83], [37.6, 88], [37.617, 94], [37.633, 101], [37.65, 107], [37.667, 113], [37.683, 120],
  [37.7, 126.5], [37.717, 133], [37.733, 139.5], [37.75, 146.5], [37.767, 153], [37.783, 160], [37.8, 166.5],
  [37.817, 173.5], [37.833, 180], [37.85, 187], [37.867, 194.5], [37.883, 201.5], [37.9, 208], [37.917, 214.5],
  [37.933, 221.5], [37.95, 228.5], [37.967, 234.5], [37.983, 241.5], [38.0, 247.5], [38.017, 254.5], [38.033, 260],
  [38.05, 266], [38.067, 272], [38.083, 278], [38.1, 284], [38.117, 289.5], [38.133, 295.5], [38.15, 300.5],
  [38.167, 305.5], [38.183, 310], [38.2, 315], [38.217, 319.5], [38.233, 324], [38.25, 328], [38.267, 332],
  [38.283, 335.5], [38.3, 339], [38.317, 342], [38.333, 345], [38.35, 347.5], [38.367, 350], [38.383, 352],
  [38.4, 354], [38.417, 356], [38.433, 357], [38.45, 358.3], [38.467, 359.2], [38.483, 359.8], [38.5, 360]];
// fourth ride: run-up from just below 0 to 2π/3 (deg)
const RIDE4 = [[39.886, -14.3], [39.9, -8.5], [39.917, -3], [39.933, 2.8], [39.95, 8.7], [39.967, 14.7],
  [39.983, 20.8], [40.0, 27], [40.017, 33.3], [40.033, 39.6], [40.05, 45.8], [40.067, 51.6], [40.083, 57.6],
  [40.1, 63.4], [40.117, 69.2], [40.133, 75.1], [40.15, 81], [40.167, 86.3], [40.183, 91.3], [40.2, 96],
  [40.217, 100.4], [40.233, 104.4], [40.25, 108], [40.267, 111.4], [40.283, 114.2], [40.3, 116.3],
  [40.317, 118], [40.333, 119.3], [40.35, 120]];
const JUMPS = [[38.514, 0, 120], [38.977, 120, 240], [39.438, 240, 360]];
const WRAP1 = 38.5, WRAP2 = 39.886;

const jump = (t, t0, a, b) => b - (b - a) * Math.exp(-(t - t0) / 0.06);

// the ride angle in degrees (meaningful from 38.5)
export function rideDeg(t) {
  if (t < JUMPS[0][0]) return 0;
  if (t < JUMPS[1][0]) return jump(t, ...JUMPS[0]);
  if (t < JUMPS[2][0]) return jump(t, ...JUMPS[1]);
  if (t < WRAP2) return jump(t, ...JUMPS[2]);
  return table(RIDE4, t);
}
// angle shown by the unit circle (deg)
export function circleDeg(t) {
  if (t < 38.5) return table(TRACE, t);
  return rideDeg(t);
}

// sine → limit curve (verse 4): each x starts later the further right it is (read off the source).
const LIM_C = 0.0786;
// soft floor at x→0 (≈ −10 instead of a hard −3 clamp): the dive at the y-axis reaches the bottom
// as fast as the source's (41.48–41.53) and has no flat hook at its foot
const limitV = (xn) => 1 - LIM_C / Math.sqrt(xn * xn + 0.00715 * 0.00715);
const morphK = (xn, t) => {
  const t0 = 41.415 + 0.26 * Math.max(xn, 0);   // fitted on 11 columns × 46 frames
  return ease.inOutSine(clamp((t - t0) / (0.45 - 0.05 * xn)));
};
export function curveV(th, t) {
  const s = Math.sin(th);
  if (t < 41.39) return s;
  const xn = th / (2 * Math.PI);
  const k = morphK(xn, t);
  return k <= 0 ? s : lerp(s, limitV(xn), k);
}

// unit tangent (screen px) of the sine at θ
function tangentDir(th) {
  const dx = 1, dy = -Math.cos(th);   // dv/dθ = cos θ; screen y grows downwards
  const L = Math.hypot(dx, dy);
  return [dx / L, dy / L];
}

export function createSine({ root }) {
  const kw = el('div', `position:absolute;left:0;top:0;white-space:pre;font-family:${SERIF};font-size:87px;` +
    'font-weight:400;color:#ffffff;transform-origin:0 0;line-height:1;display:none', root);
  kw.textContent = 'Tangents';
  let kwBase = 0;

  // ---------- pieces ----------
  function dotted(ctx, x0, y0, x1, y1, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(222,224,236,0.42)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }

  function curvePath(ctx, thMax, t) {
    ctx.beginPath();
    const n = Math.max(2, Math.ceil(thMax * U / 2));
    for (let i = 0; i <= n; i++) {
      const th = (thMax * i) / n;
      const x = X(th), y = Y(curveV(th, t));
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
  }

  function drawCurve(ctx, t, thMax) {
    if (thMax <= 0) return;
    ctx.save();
    // the limit curve dives to −∞ near 0: fade it out at the bottom of the y-axis
    ctx.beginPath(); ctx.rect(0, 0, 1920, 878); ctx.clip();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#dcdcf2';
    ctx.globalAlpha = 0.025; ctx.lineWidth = 12; curvePath(ctx, thMax, t); ctx.stroke();
    ctx.globalAlpha = 0.045; ctx.lineWidth = 7; curvePath(ctx, thMax, t); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowColor = 'rgba(185,185,245,0.75)';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    curvePath(ctx, thMax, t); ctx.stroke();
    ctx.restore();
    if (t > 41.4) {
      // soft fade where the curve leaves through the bottom
      ctx.save();
      const g = ctx.createLinearGradient(0, 852, 0, 878);
      g.addColorStop(0, 'rgba(15,16,23,0)');
      g.addColorStop(1, 'rgba(15,16,23,1)');
      ctx.fillStyle = g;
      ctx.fillRect(600, 852, 120, 26);
      ctx.restore();
    }
  }

  // the tangent segment through the curve point at θ: 315 px back, 465 px ahead, 60 px end fades,
  // clipped to the plot (x 600…1800). Below the plot it also fades out between y 895 and 935
  // (measured on the 240° ride, where the source's tangent stops ~215 px ahead).
  const yFade = (y) => clamp((935 - y) / 40);
  function tangentLine(ctx, th, alpha, width = 1.25, back = 315, ahead = 465) {
    if (alpha <= 0) return;
    const x = X(th), y = Y(Math.sin(th));
    const [ux, uy] = tangentDir(th);
    const x0 = x - ux * back, y0 = y - uy * back, x1 = x + ux * ahead, y1 = y + uy * ahead;
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const L = back + ahead, f = 60 / L;
    const endFade = (u) => Math.min(1, u / f, (1 - u) / f);
    if (Math.max(y0, y1) <= 895) {
      g.addColorStop(0, 'rgba(240,240,250,0)');
      g.addColorStop(f, 'rgba(240,240,250,1)');
      g.addColorStop(1 - f, 'rgba(240,240,250,1)');
      g.addColorStop(1, 'rgba(240,240,250,0)');
    } else {
      for (let i = 0; i <= 24; i++) {
        const u = i / 24;
        const a = Math.max(0, endFade(u)) * yFade(y0 + (y1 - y0) * u);
        g.addColorStop(u, `rgba(240,240,250,${a.toFixed(3)})`);
      }
    }
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = g;
    ctx.lineWidth = width;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }

  // faint tangents deposited along every angle the rider has passed (they persist)
  function drawFan(ctx, t, alpha) {
    if (t < JUMPS[0][0] || alpha <= 0) return;
    let maxDeg = 0;
    if (t < WRAP2) maxDeg = rideDeg(t); else maxDeg = 360;
    const step = 0.8;
    ctx.save();
    ctx.beginPath(); ctx.rect(600, 0, 1200, 1080); ctx.clip();
    for (let d = 0; d <= maxDeg; d += step) tangentLine(ctx, d * D2R, 0.05 * alpha, 1, 220, 220);
    ctx.restore();
  }

  function drawSlopeTriangle(ctx, th, alpha) {
    if (alpha <= 0) return;
    const x = X(th), y = Y(Math.sin(th));
    const rise = -U * Math.cos(th);           // px the tangent climbs over one unit to the left
    const ax = x - U, ay = y - rise;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(160,162,178,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax, ay + 0.5); ctx.lineTo(x + 0.5, ay + 0.5); ctx.lineTo(x + 0.5, y); ctx.stroke();
    ctx.font = `400 18px ${MONO}`;
    ctx.fillStyle = '#a3a4ad';
    ctx.textAlign = 'center';
    ctx.fillText('1', (ax + x) / 2, ay - 11);
    ctx.textAlign = 'right';
    ctx.fillText('1/2', x - 12, (ay + y) / 2 + 7);
    ctx.restore();
  }

  function drawKeyword(t, th) {
    const a = 1 - ease.outQuad(prog(t, 40.915, 0.14));   // measured fade-out
    if (t < 40.288 || a <= 0) { kw.style.display = 'none'; return; }
    const x = X(th), y = Y(Math.sin(th));
    const [ux, uy] = tangentDir(th);
    const nx = uy, ny = -ux;               // normal pointing up-right of the line
    const ox = x + ux * 36 + nx * 8, oy = y + uy * 36 + ny * 8;
    // the whole word fades in over ~4 frames (ink 0.21 / 0.53 / 0.88 / 1.0 at 40.300–40.350,
    // measured above the tangent so the moving line doesn't pollute it)
    const inK = Math.pow(clamp((t - 40.288) / 0.05), 1.2);
    kw.style.display = '';
    kw.style.opacity = (a * inK).toFixed(3);
    kw.style.transform = `translate(${ox.toFixed(2)}px,${oy.toFixed(2)}px) rotate(${Math.atan2(uy, ux)}rad) translate(0,${-kwBase}px)`;
  }

  // ---------- marker (peach) from verse 2 on ----------
  function markerState(t) {
    const g = prog(t, 35.3, 0.5);
    const s = lerp(1, 1.45, g), core = g < 0.5 ? '#f9bcb8' : '#feb898';
    if (t < 38.425) { const P = polyState(t); return { x: P.x + P.r, y: P.y, a: 1, s, core }; }
    if (t < 38.515) {
      const k = ease.outCubic(prog(t, 38.425, 0.09));
      return { x: lerp(CIRC.x + CIRC.r, PLOT.x0, k), y: PLOT.y0, a: 1, s, core };
    }
    const d = rideDeg(t);
    let a = 1;
    if (t >= 39.85 && t < WRAP2) a = 1 - prog(t, 39.85, 0.035);
    else if (t >= WRAP2) a = prog(t, 39.935, 0.02);
    a *= 1 - prog(t, 40.93, 0.17);
    return { x: X(d * D2R), y: Y(Math.sin(d * D2R)), a, s, core };
  }

  // ---------- frame ----------
  function draw(ctx, t) {
    if (t < 33.45) return;
    // circle side leaves for the limit verse (measured): the ring shrinks about its centre
    // (r 191 → 157, accelerating) and fades 41.0–41.42; the crosshair retracts onto it; the radius,
    // θ arc and point fade a little later and faster.
    // radius fitted per frame on the source (41.0–41.37, max error 0.45 px)
    const sc = 1 - 0.1633 * Math.pow(Math.max(0, t - 40.985) / 0.36, 1.4);
    const out = 1 - ease.inQuad(prog(t, 41.0, 0.42));
    const handOut = 1 - prog(t, 41.07, 0.3);
    const P = { x: CIRC.x, y: CIRC.y, r: CIRC.r * sc };

    if (t >= 36.95 && t < 41.42) {
      // unit circle: verse 2's glowing ring hands over (36.97–37.08) to a crisp 1 px ring, over
      // which the swept arc is drawn bright
      const v2k = prog(t, 36.97, 0.11);
      const cd = circleDeg(t);
      const thC = cd * D2R;
      ctx.save();
      thinRing(ctx, v2k * out * (1 - 0.12 * prog(t, 41.0, 0.15)), P);
      if (v2k < 1) litArc(ctx, 0, Math.PI * 2, 1 - v2k, 1.4, P);
      if (t >= 37.15) {
        let lit = 0, fade = 0, fadeFrom = 0;
        if (t < WRAP1) lit = Math.max(0, thC);
        else if (t < WRAP2) {
          lit = Math.max(0, thC);
          fadeFrom = lit; fade = 1 - prog(t, WRAP1 + 0.07, 0.21);
        } else {
          lit = Math.max(0, thC);
          fadeFrom = lit; fade = 1 - prog(t, WRAP2 + 0.02, 0.22);
        }
        const litOut = out * (1 - 0.45 * prog(t, 41.17, 0.15));   // the bright arc goes a bit sooner
        litArc(ctx, 0, lit, 0.92 * litOut, 1, P);
        if (fade > 0) litArc(ctx, fadeFrom, Math.PI * 2, 0.92 * fade * litOut, 1, P);
      }
      ticks(ctx, Math.PI * 2, out, P);
      crosshair(ctx, 1, 1 - prog(t, 40.99, 0.35), prog(t, 36.97, 0.08), out, P.r);
      ctx.restore();

      // verse 2's radius stays up through the hand-over until verse 3's own radius takes it
      if (t < 37.15) {
        ctx.save();
        ctx.globalAlpha = 0.5 * (1 - 0.35 * prog(t, 37.02, 0.1));
        ctx.strokeStyle = '#f0f0f8';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(CIRC.x, CIRC.y); ctx.lineTo(CIRC.x + CIRC.r, CIRC.y); ctx.stroke();
        ctx.restore();
      }

      if (t >= 37.15) {
        const ra = prog(t, 37.14, 0.02) * handOut;
        const px = P.x + P.r * Math.cos(thC), py = P.y - P.r * Math.sin(thC);
        ctx.save();
        // angle arc + θ
        const arcA = prog(t, 37.15, 0.08) * handOut;
        if (arcA > 0 && thC > 0.001) {
          ctx.globalAlpha = arcA;
          ctx.strokeStyle = 'rgba(200,200,220,0.7)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(CIRC.x, CIRC.y, 34, 0, -Math.min(thC, Math.PI * 2), true); ctx.stroke();
        }
        const lblA = prog(t, 37.225, 0.25) * (1 - prog(t, 41.05, 0.2));
        if (lblA > 0) {
          ctx.globalAlpha = lblA;
          ctx.font = `400 20px ${MONO}`;
          ctx.fillStyle = '#d2d1ea';
          ctx.fillText('θ', 388.5, 650.5);
        }
        // radius
        ctx.globalAlpha = ra;
        ctx.strokeStyle = '#f4f4fc';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(CIRC.x, CIRC.y); ctx.lineTo(px, py); ctx.stroke();
        ctx.restore();
        // projections: circle point ↓ axis and circle point → curve point; the curve point's own
        // drop to the axis only exists during the rides (the trace has none)
        const conA = prog(t, 37.2, 0.05) * (1 - prog(t, 40.95, 0.3));
        let cx, cy;
        if (t < 38.5) { cx = X(thC); cy = Y(Math.sin(thC)); }
        else { const d = rideDeg(t) * D2R; cx = X(d); cy = Y(Math.sin(d)); }
        dotted(ctx, px, py, px, CIRC.y, conA);
        if (cx >= PLOT.x0 - 1) {
          dotted(ctx, px, py, cx, cy, conA);
          if (t >= 38.5) dotted(ctx, cx, cy, cx, PLOT.y0, conA * (t < 41.1 ? 1 : 1 - prog(t, 41.1, 0.2)));
        }
        if (t < 41.4) {
          ctx.save();
          ctx.globalAlpha = ra;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
          if (t < 38.5 && cx > PLOT.x0 + 1) { ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, Math.PI * 2); ctx.fill(); }
          ctx.restore();
        }
      }
    }

    // the curve (sine, later the limit curve)
    if (t >= 37.15) {
      const thMax = t < 38.5 ? Math.max(0, circleDeg(t)) * D2R : Math.PI * 2;
      // persistent fan of tangents (fades in two steps around the morph)
      const fanA = (1 - 0.63 * prog(t, 40.95, 0.2)) * (1 - prog(t, 41.38, 0.22));
      drawFan(ctx, t, fanA);
      drawCurve(ctx, t, thMax);
    }

    // ride: tangent, slope triangle, keyword
    if (t >= 38.43 && t < 41.2) {
      const d = rideDeg(t), th = d * D2R;
      const m = markerState(t);
      const ta = prog(t, 38.43, 0.09) * m.a * (1 - ease.outQuad(prog(t, 40.915, 0.14))) / Math.max(1e-3, 1 - prog(t, 40.93, 0.17));
      ctx.save();
      ctx.beginPath(); ctx.rect(600, 0, 1200, 1080); ctx.clip();
      tangentLine(ctx, th, Math.min(1, ta));
      ctx.restore();
      drawSlopeTriangle(ctx, th, prog(t, 40.45, 0.1) * (1 - prog(t, 40.92, 0.13)));
      drawKeyword(t, th);
    } else kw.style.display = 'none';

    // marker
    if (t < 41.15) {
      const m = markerState(t);
      if (m.a > 0) {
        ctx.save();
        if (t >= 38.515) { ctx.beginPath(); ctx.rect(600, 0, 1200, 1080); ctx.clip(); }
        marker(ctx, m.x, m.y, m.a, m.s, m.core);
        ctx.restore();
      }
    }
  }

  return {
    ready: Promise.resolve(),
    layout() {
      kw.style.display = '';
      const probe = el('span', 'display:inline-block;width:0;height:0;vertical-align:baseline', kw);
      kwBase = probe.offsetTop;
      probe.remove();
      kw.style.display = 'none';
    },
    draw,
  };
}
