// The target fields are drawn with geometry and type before sampling training
// points. A fixed-size offscreen surface keeps the datasets independent of DPR.
export function createLabels() {
  const size = 700;
  const heart = new OffscreenCanvas(size, size), hc = heart.getContext('2d');
  hc.beginPath();
  hc.moveTo(350, 124);
  hc.bezierCurveTo(418, 104, 491, 105, 540, 139);
  hc.bezierCurveTo(597, 178, 601, 284, 570, 348);
  hc.bezierCurveTo(527, 434, 405, 522, 350, 557);
  hc.bezierCurveTo(295, 522, 173, 434, 130, 348);
  hc.bezierCurveTo(99, 284, 103, 178, 160, 139);
  hc.bezierCurveTo(209, 105, 282, 104, 350, 124);
  hc.closePath();
  hc.fill();

  const type = new OffscreenCanvas(size, size), tc = type.getContext('2d');
  tc.font = '800 300px Nunito';
  tc.textBaseline = 'alphabetic';
  tc.lineJoin = 'round';
  // Each glyph uses real font ink fitted to its layout box. Independent boxes
  // preserve the narrow gaps as the network learns neighboring letters.
  const glyphs = [['L', 105, 42, 280, 259], ['o', 287, 104, 442, 259], ['-', 471, 119, 588, 175],
    ['o', 195, 308, 350, 462], ['-', 385, 328, 497, 380],
    ['o', 119, 511, 274, 665], ['v', 281, 509, 443, 665], ['e', 450, 511, 590, 665]];
  for (const [text, left, top, right, bottom] of glyphs) {
    const m = tc.measureText(text);
    const spread = text === 'L' ? 16 : text === '-' ? 10 : text === 'e' ? 14 : 34;
    const sy = (bottom - top - spread) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent);
    tc.save(); tc.translate(left, top);
    tc.scale((right - left) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight), sy);
    for (let offset = 0; offset <= spread; offset += 2) {
      tc.fillText(text, m.actualBoundingBoxLeft, m.actualBoundingBoxAscent + offset / sy);
    }
    tc.restore();
  }
  function read(canvas) {
    const pixels = canvas.getContext('2d').getImageData(0, 0, size, size).data;
    return (u, v) => pixels[4 * (Math.min(size - 1, Math.floor(v * size)) * size + Math.min(size - 1, Math.floor(u * size))) + 3] > 127;
  }
  return { heart: read(heart), type: read(type) };
}
