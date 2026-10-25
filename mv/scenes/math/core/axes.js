// The shared plot: x-axis 0…2π (x 600…1800, y 660), y-axis −1…1, labels and dotted ±1 guides.
// Every part has its own visibility so verses 2–4 can build it up and strip it down.
import { PLOT, U, MONO } from './const.js';
import { clamp } from './draw.js';

const LABEL = '#a3a4ab';
const LINE = 'rgba(166,167,176,0.7)';

// opts: { xLen (0..1 of the axis drawn from the origin), xAlpha, xTicks, xLabels (alpha),
//         xLabelSet: 'pi' | 'inf', yGrow (0..1), yTicks, yLabels, zero, guides, guideMinus, origin }
export function drawAxes(ctx, o) {
  ctx.save();
  ctx.lineWidth = 1;
  const x0 = PLOT.x0, y0 = PLOT.y0;
  const xEnd = x0 + 1200 * (o.xLen ?? 1);
  // x axis
  if ((o.xAlpha ?? 0) > 0 && xEnd > x0) {
    ctx.globalAlpha = o.xAlpha;
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(x0 - 20, y0); ctx.lineTo(xEnd, y0);
    ctx.stroke();
    if ((o.xTicks ?? 0) > 0) {
      // ticks are much fainter than the axis line in the source (minor ≈ +30, major ≈ +65 over
      // the background); there is no tick at the 2π end
      for (const major of [false, true]) {
        ctx.globalAlpha = o.xAlpha * o.xTicks * (major ? 0.62 : 0.29);
        ctx.beginPath();
        for (let k = 1; k < 40; k++) {
          const x = x0 + k * 30;
          if (x > xEnd + 0.5) break;
          if ((k % 10 === 0) !== major) continue;
          const h = major ? 7.5 : 3.5;
          ctx.moveTo(x + 0.5, y0 - h); ctx.lineTo(x + 0.5, y0 + h);
        }
        ctx.stroke();
      }
    }
    if ((o.xLabels ?? 0) > 0) {
      ctx.font = `400 18px ${MONO}`;
      ctx.fillStyle = LABEL;
      ctx.textAlign = 'center';
      const set = o.xLabelSet === 'inf' ? [] : [['π/2', 900], ['π', 1200], ['3π/2', 1500], ['2π', 1800]];
      for (const [s, x] of set) {
        // each label fades in over ~0.2 s once the unrolling axis has passed it
        const a = o.xLabels * (o.labelIn ? o.labelIn(x) : clamp((xEnd - x + 8) / 40));
        if (a <= 0) continue;
        ctx.globalAlpha = a * (o.xLabelAlpha ?? 1);
        ctx.fillText(s, x, 697);
      }
      ctx.textAlign = 'left';
    }
  }
  // y axis (grows from the origin both ways)
  if ((o.yGrow ?? 0) > 0) {
    const up = 215 * o.yGrow, down = 215 * o.yGrow;
    ctx.globalAlpha = o.yAlpha ?? 1;
    ctx.strokeStyle = LINE;
    ctx.beginPath();
    ctx.moveTo(x0, y0 - up); ctx.lineTo(x0, y0 + down);
    ctx.stroke();
    if ((o.yTicks ?? 0) > 0) {
      for (const major of [false, true]) {
        ctx.globalAlpha = (o.yAlpha ?? 1) * o.yTicks * (major ? 0.55 : 0.4);
        ctx.beginPath();
        for (let k = -10; k <= 10; k++) {
          if (k === 0 || (k % 5 === 0) !== major) continue;
          const y = Math.round(y0 - k * U * 0.1) + 0.5;
          const h = major ? 6 : 3.5;
          ctx.moveTo(x0 - h, y); ctx.lineTo(x0 + h, y);
        }
        ctx.stroke();
      }
    }
  }
  ctx.font = `400 18px ${MONO}`;
  ctx.fillStyle = LABEL;
  ctx.textAlign = 'right';
  if ((o.zero ?? 0) > 0) { ctx.globalAlpha = o.zero; ctx.fillText('0', 582, 681); }
  if ((o.yLabels ?? 0) > 0) {
    ctx.globalAlpha = o.yLabels;
    ctx.fillText('1', 582, 475);
    if ((o.yLabelMinus ?? 1) > 0) { ctx.globalAlpha = o.yLabels * (o.yLabelMinus ?? 1); ctx.fillText('-1', 582, 857); }
  }
  ctx.textAlign = 'left';
  // dotted guides at ±1
  const guide = (y, a) => {
    if (a <= 0) return;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(165,168,195,0.42)';
    for (let x = 607; x <= 1800; x += 7) ctx.fillRect(x - 1, y - 0.5, 2, 1);
  };
  guide(PLOT.y0 - U, (o.guides ?? 0) * (o.guidePlus ?? 1));
  guide(PLOT.y0 + U, (o.guides ?? 0) * (o.guideMinus ?? 1));
  // brighter cross at the origin
  if ((o.origin ?? 0) > 0) {
    ctx.globalAlpha = o.origin;
    ctx.strokeStyle = 'rgba(225,226,240,0.75)';
    ctx.beginPath();
    ctx.moveTo(x0 - 7, y0); ctx.lineTo(x0 + 8, y0);
    ctx.moveTo(x0, y0 - 7); ctx.lineTo(x0, y0 + 8);
    ctx.stroke();
  }
  ctx.restore();
}

// Visibility of every axis part over the whole segment (verse 2 builds it, verse 4 strips it).
import { prog as _prog, ease as _ease } from './draw.js';
// time at which the unrolling axis end reaches x (inverse of the inOutSine unroll)
const reachT = (x) => 35.28 + 0.56 * Math.acos(1 - 2 * clamp((x - PLOT.x0) / 1200)) / Math.PI;
export function axesState(t) {
  const unroll = _ease.inOutSine(_prog(t, 35.28, 0.56));
  const out4 = _prog(t, 41.03, 0.22);           // labels/guides that leave for the limit verse
  return {
    xLen: unroll,
    xAlpha: t < 35.28 ? 0 : 1,
    xTicks: 1,
    xLabels: 1 - out4,
    labelIn: (x) => _prog(t, reachT(x) + 0.005, 0.21),
    yGrow: _ease.outCubic(_prog(t, 35.77, 0.2)),
    yTicks: 1,
    zero: _prog(t, 35.3, 0.08),
    yLabels: _prog(t, 36.3, 0.15),
    yLabelMinus: 1 - out4,
    guides: _prog(t, 36.3, 0.4),
    guidePlus: 1 - _prog(t, 41.88, 0.18),       // the +1 guide turns into the dashed asymptote
    guideMinus: 1 - out4,
    origin: t < 35.28 ? 0 : 0.6,
  };
}
