// One renderer for the whole math segment (29.23–44.52 s). The four scene files mount it for
// their own time ranges; since render(t) is a pure function of t, scene switches are seamless.
import { W, H, VERSES, FONT_LOADS } from './const.js';
import { background, grid, icons } from './draw.js';
import { drawAxes, axesState } from './axes.js';
import { el, monoLine, serifLine } from './text.js';
import { createPoints } from './v1points.js';
import { createCircle } from './v2circle.js';
import { createSine } from './v3sine.js';
import { createLimit } from './v4limit.js';
import { loadMathFonts } from './fonts.js';

export function createRenderer(root, env) {
  const { canvas } = env.canvas(root, { context: null });
  const ctx = canvas.getContext('2d');
  const textLayer = el('div', `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden`, root);
  const lines = VERSES.map((v) => ({ v, mono: monoLine(textLayer, v.mono), serif: serifLine(textLayer, v.serif) }));
  const verses = [createPoints, createCircle, createSine, createLimit].map((f) => f({ root: textLayer, env }));

  const ready = (async () => {
    await loadMathFonts();
    await Promise.all(FONT_LOADS.map((f) => document.fonts.load(f)));
    await Promise.all(verses.map((v) => v.ready));
    await document.fonts.ready;
    for (const l of lines) { l.mono.layout(); l.serif.layout(); }
    for (const v of verses) v.layout?.();
  })();

  function render(t) {
    background(ctx);
    grid(ctx, t);
    if (t >= 35.2) drawAxes(ctx, axesState(t));
    for (const v of verses) v.draw(ctx, t);
    icons(ctx, t);
    lines.forEach(({ v, mono, serif }, i) => {
      const start = v.mono[0][1] - 0.05;
      const alpha = t < start ? 0 : 1 - Math.min(1, Math.max(0, (t - v.out) / 0.1));
      mono.render(t, alpha);
      serif.render(t, alpha);
    });
  }
  return { ready, render };
}
