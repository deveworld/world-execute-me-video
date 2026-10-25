// Determinism guard: every render(t) draws inside save()/restore() after resetting the 2D context
// to defaults, so no state (transform, alpha, compositing, filter, shadow, line/text settings) can
// leak from one render(t) into the next, whatever order frames are visited in.
export function fresh(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.shadowBlur = 0; ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.lineWidth = 1; ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.miterLimit = 10; ctx.setLineDash([]); ctx.lineDashOffset = 0;
  ctx.font = '10px sans-serif'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'start'; ctx.direction = 'ltr';
  ctx.letterSpacing = '0px'; ctx.wordSpacing = '0px';
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#000';
  return ctx;
}
// Run fn(ctx) on a freshly reset context and restore afterwards.
export function guarded(ctx, fn) {
  ctx.save();
  fresh(ctx);
  try { return fn(ctx); } finally { ctx.restore(); }
}
