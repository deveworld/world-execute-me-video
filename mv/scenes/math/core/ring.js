// The unit circle's pieces, shared by verse 2 (where it is built) and verse 3 (where it drives the sine).
import { CIRC } from './const.js';

const { x: CX, y: CY, r: RR } = CIRC;

// Lavender stroke with a narrow two-layer glow, CCW from a0 to a1 (radians, math orientation).
export function litArc(ctx, a0, a1, alpha, glowK = 1, P = CIRC) {
  if (alpha <= 0 || a1 <= a0) return;
  const arc = () => {
    ctx.beginPath();
    if (a1 - a0 >= Math.PI * 2 - 1e-6) ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2);
    else ctx.arc(P.x, P.y, P.r, -a0, -a1, true);
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#9694c8';
  ctx.globalAlpha = 0.1 * glowK * alpha; ctx.lineWidth = 8; arc(); ctx.stroke();
  ctx.globalAlpha = 0.17 * glowK * alpha; ctx.lineWidth = 4.5; arc(); ctx.stroke();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#dcdbf6';
  ctx.lineWidth = 2;
  arc(); ctx.stroke();
  ctx.restore();
}

// The resting unit circle of verse 3: a crisp 1 px line (≈ +125 over the background), no glow.
export function thinRing(ctx, alpha, P = CIRC) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(236,237,247,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(P.x, P.y, P.r, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// 12 short inner ticks (every 30°) up to angle `upTo` (faint: ≈ 0.6× the old ink, measured).
export function ticks(ctx, upTo, alpha, P = CIRC) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = 'rgba(200,200,225,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    if (a > upTo + 1e-6) break;
    ctx.moveTo(P.x + Math.cos(a) * (P.r - 12), P.y - Math.sin(a) * (P.r - 12));
    ctx.lineTo(P.x + Math.cos(a) * (P.r - 3), P.y - Math.sin(a) * (P.r - 3));
  }
  ctx.stroke();
  ctx.restore();
}

// Crosshair through the centre: `grow` (0..1 of the radius), then `ext` stretches it to the
// plot extents (left to x = 128, down to y + 215); `up` controls the extension above the circle.
// `R` (default: the unit radius) lets it follow the circle while it shrinks away in verse 4.
export function crosshair(ctx, grow, ext, up, alpha, R = RR) {
  if (alpha <= 0 || grow <= 0) return;
  const l = (a, b, k) => a + (b - a) * k;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(205,206,222,0.21)';
  ctx.beginPath();
  ctx.moveTo(CX - l(R * grow, 217, ext), CY); ctx.lineTo(CX + R * grow, CY);
  ctx.moveTo(CX + 0.5, CY - l(R * grow, l(R, 216, up), ext)); ctx.lineTo(CX + 0.5, CY + l(R * grow, 215, ext));
  ctx.stroke();
  ctx.restore();
}

export const RING = { CX, CY, R: RR };
