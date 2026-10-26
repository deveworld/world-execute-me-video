import { penStroke } from '../strokes.js';

// The tip curls toward the body in one soft flick. The root stays at the body
// join, and each control handle follows a smaller, delayed displacement.
export function createTail() {
  const written = penStroke('M1059 812 C1018 820 1019 857 1043 869 C1055 878 1072 881 1087 879.8', {
    width: 3.1, pressure: .05, start: 81.5833, duration: .1167,
  });
  return (ctx, t) => {
    if (t < 84.4) { written.draw(ctx, t); return; }
    const rise = u => 1 - Math.exp(-((Math.max(0, u) / .108) ** 2));
    const curl = rise(t - 84.406) * Math.exp(-((Math.max(0, t - 84.755) / .126) ** 2));
    ctx.save(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 3.1; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1059 + 11 * curl, 812 + 32 * curl);
    ctx.bezierCurveTo(1018 + 47 * curl, 820 + 5 * curl, 1019 + 23 * curl, 857 - 39 * curl, 1043 - 7 * curl, 869 - 36 * curl);
    ctx.bezierCurveTo(1055 - 40 * curl, 878 - 21 * curl, 1072 - 22 * curl, 881 - 3 * curl, 1087, 879.8);
    ctx.stroke(); ctx.restore();
  };
}
