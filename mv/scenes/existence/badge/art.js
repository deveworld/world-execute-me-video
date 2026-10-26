// The card's printed layout is real type, with a geometric portrait and barcode.
export function inkText(ctx, text, x, y, w, h, color = '#f4f1fb', family = 'League Gothic X', tracking = 0) {
  ctx.save();ctx.font = `100px "${family}"`;ctx.textAlign = 'left';ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = `${tracking}px`;
  const m = ctx.measureText(text), mw = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const mh = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  ctx.translate(x, y);ctx.scale(w / mw, h / mh);ctx.fillStyle = color;
  ctx.fillText(text, m.actualBoundingBoxLeft, m.actualBoundingBoxAscent);ctx.restore();
}

export function globe(ctx, x, y, r, color, width = 1.5) {
  ctx.strokeStyle = color;ctx.lineWidth = width;ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);ctx.ellipse(x, y, r * .42, r, 0, 0, Math.PI * 2);
  ctx.moveTo(x - r, y);ctx.lineTo(x + r, y);ctx.stroke();
}

export function portrait(ctx) {
  ctx.save();ctx.beginPath();ctx.roundRect(36, 147, 170, 211, 7);ctx.clip();
  const g = ctx.createRadialGradient(117, 244, 15, 117, 244, 150);
  g.addColorStop(0, '#d4d7fb');g.addColorStop(.68, '#c3c6f3');g.addColorStop(1, '#a6a9e4');
  ctx.fillStyle = g;ctx.fillRect(36, 147, 170, 211);
  ctx.filter = 'blur(3.5px)';ctx.fillStyle = '#1f2290';ctx.beginPath();
  ctx.ellipse(124, 227, 30, 41, .025, 0, Math.PI * 2);ctx.fill();ctx.beginPath();
  ctx.moveTo(111, 252);ctx.bezierCurveTo(114, 273, 108, 286, 87, 294);
  ctx.bezierCurveTo(54, 304, 38, 325, 34, 365);ctx.lineTo(214, 365);
  ctx.bezierCurveTo(207, 324, 194, 305, 159, 293);ctx.bezierCurveTo(139, 285, 131, 275, 135, 252);
  ctx.closePath();ctx.fill();ctx.filter = 'none';ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.33)';ctx.lineWidth = .7;ctx.beginPath();ctx.roundRect(36.5, 147.5, 169, 210, 7);ctx.stroke();
}

export function frontPrint(ctx) {
  globe(ctx, 49, 90.6, 11.7, '#f4f1fb', 1.25);
  inkText(ctx, 'world', 67, 78.1, 44.7, 25.1);
  inkText(ctx, 'A C C E S S', 408.8, 86.9, 52.7, 14.5, '#c4bee9');
  inkText(ctx, 'N A M E', 231, 275.2, 37.3, 14.3, '#c4bee9');
  inkText(ctx, 'me', 231.1, 312.4, 62, 47.8);
  inkText(ctx, 'R O L E', 39, 421.1, 32.4, 14.5, '#c4bee9');
}

export function role(ctx, letter) {
  if (letter === 'S') inkText(ctx, 'S', 216.3, 482.7, 64.5, 237, '#f0edff', 'League Gothic Narrow');
  else if (letter === 'M') inkText(ctx, 'M', 206.4, 484.9, 84.6, 232.7, '#f0edff', 'League Gothic Narrow');
}

export function backPrint(ctx) {
  const lines = [
    ['This card is the property of the issuer', 195.7],
    ['and identifies the holder named overleaf.', 199.3],
    ['Not transferable. If found, please return it.', 199.3],
  ];
  lines.forEach(([s, w], i) => inkText(ctx, s, 39.9, 88.7 + i * 24.7, w, 17.5));
  globe(ctx, 49.5, 188, 9.2, '#f4f1fb', 1.25);
  inkText(ctx, 'world', 65, 177, 32.2, 23);
  globe(ctx, 250, 391, 118, 'rgba(150,150,230,.10)', 1.5);
  ctx.fillStyle = '#f5f4f7';ctx.beginPath();ctx.roundRect(40.4, 565.8, 421.7, 186.4, 8.5);ctx.fill();
  // Code 39 encodes the holder identifier with a 3:1 wide-to-narrow ratio.
  const patterns = { '*': '131131311', M: '313111131', E: '311133111' };
  const runs = [];
  for (const char of '*ME*') {
    if (runs.length) runs.push(1);
    for (const n of patterns[char]) runs.push(Number(n));
  }
  const unit = 281.8 / runs.reduce((a, b) => a + b, 0);
  ctx.fillStyle = '#171718';let x = 108.1;
  for (let i = 0; i < runs.length; i++) { const w = runs[i] * unit;if (i % 2 === 0) ctx.fillRect(x, 591.8, w, 89);x += w; }
  inkText(ctx, 'M', 200, 697, 26, 32, '#171718', 'Roboto Mono');
  inkText(ctx, 'E', 274, 697, 23, 32, '#171718', 'Roboto Mono');
}
