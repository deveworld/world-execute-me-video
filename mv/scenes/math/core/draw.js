// Canvas helpers shared by all verses: background, "+" grid, chapter icons, markers, labels.
import { W, H, COL, ICONS, ICON_STEPS, MONO } from './const.js';

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, t0, len) => clamp((t - t0) / len);
export const ease = {
  outCubic: (k) => 1 - Math.pow(1 - k, 3),
  outQuart: (k) => 1 - Math.pow(1 - k, 4),
  outQuad: (k) => 1 - (1 - k) * (1 - k),
  inQuad: (k) => k * k,
  inCubic: (k) => k * k * k,
  inOutQuad: (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
  inOutCubic: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  inOutSine: (k) => -(Math.cos(Math.PI * k) - 1) / 2,
  outExpo: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
};

// Dark navy with a soft horizontal vignette (inner #0f1017 → edges #0a0b10).
export function background(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  const [r0, g0, b0] = COL.bgOut, [r1, g1, b1] = COL.bgIn;
  ctx.fillStyle = `rgb(${r0},${g0},${b0})`;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(960, 520);
  ctx.scale(1, 1300 / 1100);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1100);
  const c = (k) => `rgb(${Math.round(lerp(r1, r0, k))},${Math.round(lerp(g1, g0, k))},${Math.round(lerp(b1, b0, k))})`;
  g.addColorStop(0, c(0));
  g.addColorStop(0.4, c(0.05));
  g.addColorStop(0.6, c(0.2));
  g.addColorStop(0.72, c(0.4));
  g.addColorStop(0.82, c(0.75));
  g.addColorStop(0.9, c(1));
  ctx.fillStyle = g;
  ctx.fillRect(-960, -700, W, 1400);
  ctx.restore();
}

// Faint "+" marks every 120 px in the lower band; revealed radially around 29.9–30.9 s.
export function grid(ctx, t, alpha = 1) {
  ctx.save();
  ctx.lineWidth = 1;
  for (let y = 480; y <= 960; y += 120) {
    for (let x = 120; x <= 1800; x += 120) {
      const d = Math.hypot(x - 1080, y - 700);
      const k = alpha * prog(t, 29.88 + d * 0.00095, 0.18);
      if (k <= 0) continue;
      ctx.strokeStyle = `rgba(185,190,220,${0.085 * k})`;
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 0.5); ctx.lineTo(x + 7, y + 0.5);
      ctx.moveTo(x + 0.5, y - 6); ctx.lineTo(x + 0.5, y + 7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Peach marker: core dot, thin pale ring and a soft glow. s scales the ring.
export function marker(ctx, x, y, alpha = 1, s = 1, core = '#ffb59a') {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  // halo: ≈ neutral beyond ~12 px
  const gr = 15 * Math.sqrt(s) + 2;
  const g = ctx.createRadialGradient(x, y, 0, x, y, gr);
  g.addColorStop(0, 'rgba(250,165,135,0.55)');
  g.addColorStop(0.45, 'rgba(225,160,155,0.2)');
  g.addColorStop(1, 'rgba(210,170,175,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,215,0.75)';
  ctx.lineWidth = 1.1;
  ctx.beginPath(); ctx.arc(x, y, 7.5 * s, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(x, y, 3 * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function monoText(ctx, s, x, y, size, color, align = 'left', weight = 400) {
  ctx.font = `${weight} ${size}px ${MONO}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}

// ---------- chapter icons ----------

function iconPath(ctx, i, x, y) {
  ctx.beginPath();
  if (i === 0) { // oblique cube: front square + receding top/right edges
    ctx.rect(x - 11, y - 8.5, 18, 19);
    ctx.moveTo(x - 11, y - 8.5); ctx.lineTo(x - 5, y - 12);
    ctx.lineTo(x + 12, y - 12); ctx.lineTo(x + 12, y + 6.5); ctx.lineTo(x + 7, y + 10.5);
    ctx.moveTo(x + 7, y - 8.5); ctx.lineTo(x + 12, y - 12);
  } else if (i === 1) {
    ctx.arc(x - 0.25, y - 0.75, 11, 0, Math.PI * 2);
  } else if (i === 2) {
    for (let k = 0; k <= 30; k++) {
      const px = x - 12.5 + (k / 30) * 24.5, py = y - 8.5 * Math.sin((k / 30) * 2 * Math.PI);
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
  } else {
    for (let k = 0; k <= 30; k++) {
      const u = k / 30, px = x - 10 + 22 * u, py = y + 10 - 19 * (1 - Math.pow(1 - u, 3.2)) ;
      if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
  }
}

export function icons(ctx, t) {
  const appear = (i) => prog(t, i === 0 ? 30.05 : 30.12 + i * 0.03, 0.18);
  // active index + dot position
  let from = 0, to = 0, k = 1, tStep = -1;
  for (const [ts, idx] of ICON_STEPS) if (t >= ts) { from = to; to = idx; tStep = ts; }
  if (tStep >= 0) k = ease.outCubic(prog(t, tStep, 0.22)); else { from = 0; to = 0; }
  const lit = (i) => {
    if (i === to) return tStep < 0 ? prog(t, 30.12, 0.2) : prog(t, tStep + 0.05, 0.12);
    if (i === from && tStep >= 0) return 1 - prog(t, tStep + 0.03, 0.12);
    return 0;
  };
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ICONS.xs.forEach((x, i) => {
    const a = appear(i);
    if (a <= 0) return;
    const on = lit(i);
    const visited = ICON_STEPS.some(([ts, idx]) => t >= ts + 0.1 && (idx - 1 === i)) ? 1 : 0;
    ctx.globalAlpha = a;
    // inactive look
    ctx.strokeStyle = visited ? '#85868f' : COL.iconOff;
    ctx.lineWidth = 1;
    if (on < 1) { iconPath(ctx, i, x, ICONS.y); ctx.stroke(); }
    if (on > 0) {
      ctx.globalAlpha = a * on;
      ctx.strokeStyle = COL.iconOn;
      ctx.lineWidth = 2;
      iconPath(ctx, i, x, ICONS.y); ctx.stroke();
    }
    if (i === 3) { // dashed asymptote over the curve icon
      ctx.globalAlpha = a * (0.55 + 0.45 * on);
      ctx.strokeStyle = on > 0.5 ? COL.iconOn : COL.iconOff;
      ctx.lineWidth = on > 0.5 ? 1.6 : 1;
      ctx.setLineDash([2.5, 2]);
      ctx.beginPath(); ctx.moveTo(x - 11, ICONS.y - 12); ctx.lineTo(x + 12, ICONS.y - 12); ctx.stroke();
      ctx.setLineDash([]);
    }
  });
  // dot under the active icon
  const da = appear(0) * prog(t, 30.1, 0.15);
  if (da > 0) {
    const dx = lerp(ICONS.xs[from], ICONS.xs[to], k);
    ctx.globalAlpha = da;
    ctx.fillStyle = '#d8d9e2';
    ctx.beginPath(); ctx.arc(dx, ICONS.dotY, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
