const FAMILY = '"Architects Daughter"';

function penText(ctx, text, x, y, size, spacing = -.6) {
  ctx.font = `${size}px ${FAMILY}`;
  for (const ch of text) {
    ctx.fillText(ch, x, y);
    x += ctx.measureText(ch).width + spacing;
  }
}

export function drawComponentLabels(ctx, labels) {
  ctx.save(); ctx.fillStyle = 'rgb(200,208,255)'; ctx.textBaseline = 'alphabetic';
  for (const [text, x, y, size] of labels) penText(ctx, text, text === '4700 µF' ? 1315 : x, y, size);
  ctx.restore();
}

export function drawScopeLabel(ctx, scope) {
  ctx.save(); ctx.fillStyle = 'rgb(200,208,255)'; ctx.textBaseline = 'alphabetic';
  ctx.font = '700 27px "Liberation Mono"';
  ctx.fillText(scope.label, scope.lx, scope.ly);
  ctx.restore();
}
