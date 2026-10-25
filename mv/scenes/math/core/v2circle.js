// Verse 2 — "If I'm a circle / Then I will give you my CIRCUMFERENCE" (33.44–37.1 s).
// The hexagon left by the cube doubles its sides (n = 6 → 12 → 24 → 48 → 96 → ∞) while it slides
// to the unit-circle slot; a point then walks once around it while the circumference unrolls onto
// the x-axis (exactly 2π = 1200 px), and "Circumference" is set along the arc.
import { clamp, lerp, prog, ease, marker } from './draw.js';
import { el } from './text.js';
import { U, CIRC, SERIF, MONO } from './const.js';
import { litArc, ticks, crosshair } from './ring.js';

const T0 = 33.44, T1 = 37.2;
const STEPS = [[33.883, 12], [34.35, 24], [34.817, 48], [35.267, 96], [35.85, Infinity]];
const HEX = { x: 959.5, y: 649.5, r: 300 * Math.sqrt(2 / 3) };

export function polyState(t) {
  const mv = ease.inOutSine(prog(t, 33.6175, 1.62));
  return {
    x: lerp(HEX.x, CIRC.x, mv),
    y: lerp(HEX.y, CIRC.y, mv),
    r: lerp(HEX.r, CIRC.r, mv),
  };
}

function nAt(t) {
  let n = 6, from = 6, k = 1, tc = -1;
  for (const [ts, m] of STEPS) if (t >= ts) { from = n; n = m; tc = ts; }
  if (tc >= 0) k = ease.outCubic(prog(t, tc, 0.12));
  return { n, from, k };
}

export function createCircle({ root }) {
  // "Circumference" as per-letter spans placed on an arc
  const word = 'Circumference';
  const kw = el('div', `position:absolute;left:0;top:0;width:0;height:0;font-family:${SERIF};font-size:65.5px;` +
    'font-weight:400;color:#ffffff;line-height:1;display:none', root);
  const letters = [...word].map((ch) => {
    const s = el('span', 'position:absolute;left:0;top:0;white-space:pre;transform-origin:0 0', kw);
    s.textContent = ch;
    return s;
  });
  let widths = [], base = 0;

  function polygonPath(ctx, P, t) {
    const { n, from, k } = nAt(t);
    ctx.beginPath();
    if (n === Infinity || (n === 96 && k >= 1)) { ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2); return; }
    const m = n === Infinity ? 96 : n;
    for (let i = 0; i <= m; i++) {
      const a = (i / m) * Math.PI * 2;
      let rr = P.r;
      if (i % 2 === 1 && from < n && k < 1) rr = P.r * lerp(Math.cos(Math.PI / m), 1, k);
      const x = P.x + rr * Math.cos(a), y = P.y - rr * Math.sin(a);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
  }

  // walker angle (0…2π) during the unroll, 35.28–35.84
  const walk = (t) => Math.PI * 2 * ease.inOutSine(prog(t, 35.28, 0.56));

  function drawShape(ctx, t, P) {
    const th = walk(t);
    const glow2 = prog(t, 36.28, 0.2);
    ctx.save();
    ctx.lineJoin = 'round';
    // faint ghost of the starting hexagon, erased by the walker
    const ghost = 0.09 * prog(t, 33.95, 0.15);
    if (ghost > 0 && th < Math.PI * 2) {
      ctx.save();
      if (th > 0) {
        ctx.beginPath();
        ctx.moveTo(P.x, P.y);
        ctx.arc(P.x, P.y, P.r * 1.2, -th, -Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
      }
      ctx.globalAlpha = ghost;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = P.x + P.r * Math.cos(a), y = P.y - P.r * Math.sin(a);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }
    // base outline (white, thin) where the walker hasn't been yet
    if (th < Math.PI * 2) {
      ctx.strokeStyle = '#fafafc';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = 'rgba(195,195,245,0.7)';
      ctx.shadowBlur = 5;
      polygonPath(ctx, P, t); ctx.stroke();
    }
    ctx.restore();
    // walked part: lavender with a narrow glow, plus the inner ticks
    litArc(ctx, 0, th, 1, 1 + 0.4 * glow2, P);
    ticks(ctx, th, 1, P);
  }

  function drawReadout(ctx, t, P) {
    const a = prog(t, 33.73, 0.07) * (1 - prog(t, 36.1, 0.1));
    if (a <= 0) return;
    const { n } = nAt(t);
    const val = n === Infinity ? '2π' : (n * 2 * Math.sin(Math.PI / n)).toFixed(4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = `400 23px ${MONO}`;
    ctx.fillStyle = '#9a9ba4';
    ctx.fillText('n', P.x - 62, P.y - 8.5);
    ctx.fillText('P', P.x - 62, P.y + 24.5);
    ctx.fillStyle = '#fcfcfe';
    ctx.fillText(n === Infinity ? '∞' : String(n), P.x - 22, P.y - 8.5);
    ctx.fillText(val, P.x - 22, P.y + 24.5);
    ctx.restore();
  }

  // point walking once around while the circumference unrolls onto the axis
  function drawUnroll(ctx, t) {
    if (t < 35.28 || t > 36.6) return;
    const p = walk(t) / (Math.PI * 2);
    const head = 1 - prog(t, 35.84, 0.1);
    const line = 1 - prog(t, 36.15, 0.4);
    const th = p * Math.PI * 2;
    const hx = 600 + 1200 * p;
    ctx.save();
    // the unrolled circumference: bright lavender-white with a soft glow
    ctx.globalAlpha = line * 0.35;
    ctx.filter = 'blur(2.5px)';
    ctx.strokeStyle = '#a9a6ff';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(600, 660); ctx.lineTo(hx, 660); ctx.stroke();
    ctx.filter = 'none';
    ctx.globalAlpha = line;
    ctx.strokeStyle = '#e6e5fe';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(600, 660); ctx.lineTo(hx, 660); ctx.stroke();
    if (head > 0) {
      ctx.globalAlpha = head;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(CIRC.x + CIRC.r * Math.cos(th), CIRC.y - CIRC.r * Math.sin(th), 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(hx, 660, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawDetails(ctx, t) {
    const grow = ease.outCubic(prog(t, 36.22, 0.1));
    const ext = ease.outCubic(prog(t, 36.4, 0.15));
    crosshair(ctx, grow, ext, prog(t, 36.97, 0.08), 1);
    const rad = prog(t, 36.25, 0.12) * (1 - prog(t, 37.02, 0.12));
    const lbl = prog(t, 36.28, 0.12) * (1 - prog(t, 37.0, 0.12));
    const { x: cx, y: cy, r: R } = CIRC;
    ctx.save();
    ctx.globalAlpha = rad * 0.5;
    ctx.strokeStyle = '#f0f0f8';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
    ctx.globalAlpha = lbl;
    ctx.font = `400 18px ${MONO}`;
    ctx.fillStyle = '#a5a6ad';
    ctx.textAlign = 'center';
    ctx.fillText('1', cx + R / 2, 649);
    ctx.restore();
  }

  function drawKeyword(t) {
    const out = 1 - prog(t, 37.02, 0.083);   // full until 37.02, gone at 37.103
    if (t < 36.38 || out <= 0) { kw.style.display = 'none'; return; }
    kw.style.display = '';
    kw.style.opacity = out.toFixed(3);
    const R = CIRC.r + 9.5;               // baseline radius
    const gap = -0.5;
    const total = widths.reduce((s, w) => s + w, 0) + gap * (widths.length - 1);
    let acc = 0;
    letters.forEach((s, i) => {
      const w = widths[i];
      const mid = acc + w / 2 - total / 2;  // arc-length offset from the top
      acc += w + gap;
      const ang = Math.PI / 2 - mid / R;    // polar angle of the glyph centre
      const x = CIRC.x + R * Math.cos(ang), y = CIRC.y - R * Math.sin(ang);
      const rot = Math.PI / 2 - ang;        // glyph up = radial direction
      const k = clamp((t - (36.385 + i * 0.0167)) / 0.18);
      s.style.opacity = k.toFixed(3);
      s.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${rot}rad) translate(${(-w / 2).toFixed(2)}px,${(-base).toFixed(2)}px)`;
    });
  }

  return {
    ready: Promise.resolve(),
    layout() {
      kw.style.display = '';
      widths = letters.map((s) => s.getBoundingClientRect().width);
      const probe = el('span', 'display:inline-block;width:0;height:0;vertical-align:baseline', letters[0]);
      base = probe.offsetTop;
      probe.remove();
      kw.style.display = 'none';
    },
    draw(ctx, t) {
      if (t < T0 || t >= T1) { kw.style.display = 'none'; return; }
      const P = polyState(t);
      if (t < 36.95) {
        drawDetails(ctx, t);
        drawShape(ctx, t, P);
      } else {
        const lbl = prog(t, 36.28, 0.12) * (1 - prog(t, 37.0, 0.12));
        if (lbl > 0) {
          ctx.save();
          ctx.globalAlpha = lbl;
          ctx.font = `400 18px ${MONO}`;
          ctx.fillStyle = '#a5a6ad';
          ctx.textAlign = 'center';
          ctx.fillText('1', CIRC.x + CIRC.r / 2, 649);
          ctx.restore();
        }
      }
      drawReadout(ctx, t, P);
      drawUnroll(ctx, t);
      drawKeyword(t);
    },
    markerScale: (t) => lerp(1, 1.45, prog(t, 35.3, 0.5)),
  };
}
