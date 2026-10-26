import { clamp, mix, smooth } from './dynamics.js';

const LINES = [
  { words: ['And', 'we', 'can', 'unite'], x: [120, 416, 642, 926],
    y: [114, 133, 133, 117], w: [246, 179, 232, 331], h: [77, 58, 58, 74],
    on: [55.10, 55.50, 55.89, 56.35] },
  { words: ['So', 'deeply', 'so', 'deeply'], x: [120, 285, 666, 827],
    y: [124, 114, 132, 114], w: [127, 346, 123, 345], h: [67, 98, 59, 98],
    on: [56.99, 57.142, 57.611, 58.058] },
];
// Word advances change with the width axis; the short word has less side bearing
// than the longer words. The final condensed setting settles exponentially.
const ADVANCE = [[120, 0, 0], [102.793, 186.932, -5.335],
  [72.678, 631.175, -38.089], [64.420, 798.480, -36.913]];
const WIDTH = [[-.10365, 1.19188, -.08539], [-.05090, 1.12834, -.07871],
  [-.03208, 1.07766, -.04652], [-.04646, 1.11663, -.06797]];
const FINAL_X = [120, 155, 243, 280], FINAL_WIDTH = [.2047, .2341, .2276, .2319];
const curve = (p, u) => p[0] + p[1] * u + p[2] * u * u;

function widthAt(t, line) {
  if (!line) {
    const u = t - 55.1;
    return 1.11 - 0.069 * u - 0.003 * u * u;
  }
  const tau = 58.82163 - t;
  return tau > 0 ? 0.42626 + 0.65652 * tau ** 0.27889
    : 0.232 + 0.19426 * Math.exp(tau / 0.047);
}

export async function createLettering(ctx) {
  const url = new URL('../../../assets/fonts/anybody/Anybody-wdth-wght.ttf', import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Inspiral font: HTTP ${response.status}`);
  const bytes = await response.arrayBuffer();
  const fonts = await Promise.all(Array.from({ length: 41 }, async (_, i) => {
    const width = 50 + i * 2.5, family = `Inspiral Width ${i}`;
    const scale = (width - 26) / 90;
    const taper = clamp((0.5 - scale) / 0.25);
    const weight = Math.round(370 + 120 * Math.exp(-(((scale - 0.71) / 0.25) ** 2)) - 50 * taper * taper * (3 - 2 * taper));
    const face = new FontFace(family, bytes, { weight: String(weight), variationSettings: `"wdth" ${width}, "wght" ${weight}` });
    await face.load();
    document.fonts.add(face);
    ctx.font = `${weight} 98px "${family}"`;
    const metrics = LINES.map(line => line.words.map(word => ctx.measureText(word)));
    return { face, family, weight, metrics };
  }));

  return {
    draw(t) {
      const line = t < 57 ? 0 : 1, spec = LINES[line], scale = widthAt(t, line);
      // Width changes the counters and curves inside each letter while keeping
      // the vertical strokes substantial as the line condenses.
      const axis = clamp(line ? 26 + 90 * scale : 136 + 90 * (scale - 1), 50, 150);
      const font = fonts[Math.round((axis - 50) / 2.5)];
      ctx.font = `${font.weight} 98px "${font.family}"`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#fff';
      spec.words.forEach((word, i) => {
        const dt = t - spec.on[i], p = clamp(dt / 0.15), rising = line && i % 2;
        const reveal = !line && !i ? 1 : dt < 0 ? 0 : rising
          ? smooth((dt + 0.03) / 0.15) : 1 - (1 - p) ** 3;
        if (!reveal) return;
        const m = font.metrics[line][i], w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
        const h = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
        const bob = rising ? -15 * Math.exp(-((dt / 0.09) ** 1.4)) : 23 * (1 - reveal);
        const post = t >= 58.82163, relax = Math.exp(Math.min(0, 58.82163 - t) / 0.047);
        let x = 120 + (spec.x[i] - 120) * scale, wordScale = scale;
        if (line) {
          x = post ? mix(FINAL_X[i], curve(ADVANCE[i], .42626), relax) : curve(ADVANCE[i], scale);
          wordScale = post ? mix(FINAL_WIDTH[i], curve(WIDTH[i], .42626), relax) : curve(WIDTH[i], scale);
        }
        const top = spec.y[i] + (line && !i && post ? 1 - relax : 0);
        const height = (spec.h[i] - (line && !i && post ? 1 - relax : 0)) *
          (rising ? 1 - 0.12 * Math.exp(-dt / 0.015) : 1);
        ctx.save();
        ctx.globalAlpha = reveal;
        ctx.translate(x, top + bob);
        ctx.scale(spec.w[i] * wordScale / w, height / h);
        ctx.fillText(word, m.actualBoundingBoxLeft, m.actualBoundingBoxAscent);
        ctx.restore();
      });
    },
    destroy() { for (const { face } of fonts) document.fonts.delete(face); },
  };
}
