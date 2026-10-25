// Verse 4 annotations. The continuous sine-to-asymptote curve is drawn by v3sine;
// these are the limiting value, its magnified epsilon gap, and the final keyword.
import { PLOT, U, MONO, SERIF } from './const.js';
import { clamp, prog, marker, ease } from './draw.js';
import { el, baselineOf } from './text.js';

// ring sweep of the ε-lens in degrees (measured every frame, 42.70–43.035)
const SWEEP = [[42.70, 0], [42.717, 30], [42.75, 70], [42.8, 120], [42.85, 180], [42.9, 250],
  [42.95, 300], [43.0, 330], [43.035, 360]];
function tableLerp(tab, t) {
  if (t <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    if (t <= tab[i][0]) {
      const [a, va] = tab[i - 1], [b, vb] = tab[i];
      return va + (vb - va) * (t - a) / (b - a);
    }
  }
  return tab[tab.length - 1][1];
}

export function createLimit({ root }) {
  const keyword = el('div', `position:absolute;left:1222px;top:0;white-space:pre;` +
    `font-family:${SERIF};font-size:100px;letter-spacing:-0.9px;font-weight:400;line-height:1;` +
    'color:#ffffff;transform-origin:0 0;display:none', root);
  keyword.textContent = 'Limitations';

  function draw(ctx, t) {
    // labels fade in 42.215–42.44; the keyword drops ~20 px into place while fading in (43.52–43.8)
    const appear = prog(t, 42.215, 0.22);
    const word = prog(t, 43.527, 0.055);
    keyword.style.display = word > 0 ? '' : 'none';
    if (word > 0) {
      keyword.style.opacity = word.toFixed(3);
      const dy = -20.3 * (1 - ease.outCubic(prog(t, 43.52, 0.28)));
      keyword.style.transform = `translateY(${dy.toFixed(2)}px)`;
    }
    if (t < 41.88) return;
    const yLimit = PLOT.y0 - U;
    // the asymptote: the dotted +1 guide turns into a dash (10 on / 6 off) from 41.885
    const dashA = prog(t, 41.885, 0.25);
    ctx.save();
    ctx.globalAlpha = dashA;
    ctx.strokeStyle = 'rgba(200,201,212,0.32)';   // two rows (468–469) at ≈ +60, as in the source
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 6]);
    ctx.beginPath(); ctx.moveTo(600, 469); ctx.lineTo(1800, 469); ctx.stroke();
    ctx.restore();
    marker(ctx, 1800, yLimit, prog(t, 41.92, 0.045), 1.45, '#feb898');
    if (appear <= 0) return;

    ctx.save();
    ctx.globalAlpha = appear;
    ctx.fillStyle = '#a3a4b3';
    ctx.font = `400 24px ${MONO}`;
    ctx.fillText('lim f(x) = 1', 625, 424);
    ctx.font = `400 17px ${MONO}`;
    ctx.fillText('x→∞', 631, 450);
    ctx.font = `400 18px ${MONO}`;
    ctx.textAlign = 'right';
    ctx.fillText('x → ∞', 1801, 696);
    ctx.textAlign = 'left';

    // ε-lens (measured): its contents come up at 42.68, the ring is drawn anticlockwise from
    // 3 o'clock (42.70–43.035), and the asymptote (dashed) and the curve (solid) close in on the
    // lens centre symmetrically, the gap shrinking ~exponentially (67 px at 42.75 → 4 px at 44.4)
    const lens = prog(t, 42.68, 0.06);
    if (lens > 0) {
      const x = 1740, y = 300, r = 56;
      ctx.globalAlpha = appear * lens;
      ctx.strokeStyle = 'rgba(180,181,196,0.26)';
      ctx.beginPath(); ctx.moveTo(x, y + r); ctx.lineTo(x, yLimit); ctx.stroke();
      const sweep = tableLerp(SWEEP, t) * Math.PI / 180;
      if (sweep > 0) {
        ctx.strokeStyle = '#f0f0f6';
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 2 - sweep, Math.PI * 2); ctx.stroke();
      }
      ctx.save();
      ctx.beginPath(); ctx.arc(x, y, r - 1, 0, Math.PI * 2); ctx.clip();
      const gap = 2 + 65 * Math.exp(-Math.max(0, t - 42.75) / 0.55);
      const yd = y - gap / 2, ys = y + gap / 2;
      const inner = prog(t, 42.715, 0.04);
      ctx.lineWidth = 1;
      ctx.globalAlpha = appear * inner;
      ctx.strokeStyle = 'rgba(205,205,222,0.6)';
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(x - r, yd); ctx.lineTo(x + r, yd); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = appear * lens;
      ctx.strokeStyle = '#f2f2fb';
      ctx.beginPath(); ctx.moveTo(x - r - 1, ys + 1.5 + 2.1); ctx.lineTo(x + r + 1, ys + 1.5 - 2.1); ctx.stroke();
      const ex = x + 18;
      const yse = ys + 1.5 - 18 * 0.0375;
      ctx.globalAlpha = appear * inner;
      ctx.strokeStyle = '#b9b8d8';
      ctx.beginPath(); ctx.moveTo(ex, yd + 1); ctx.lineTo(ex, yse - 1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex - 3, yd + 1); ctx.lineTo(ex + 3, yd + 1);
      ctx.moveTo(ex - 3, yse - 1); ctx.lineTo(ex + 3, yse - 1); ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = appear * prog(t, 42.88, 0.12);
      ctx.fillStyle = '#a3a4b3'; ctx.font = `400 17px ${MONO}`;
      ctx.fillText('×5', x - r, y - r - 11);
      ctx.fillStyle = '#b6b4e0'; ctx.font = `400 20px ${MONO}`;
      ctx.fillText('ε', x + 14, y + r - 8);
    }
    ctx.restore();
  }

  return {
    ready: Promise.resolve(),
    layout() {
      keyword.style.display = '';
      keyword.style.top = `${461 - baselineOf(keyword)}px`;
      keyword.style.display = 'none';
    },
    draw,
  };
}
