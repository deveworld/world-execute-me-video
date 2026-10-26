const INK_WIDTH = {
  0: 53, 1: 31, 2: 53, 3: 50, 4: 60, 5: 51, 6: 51.5, 7: 51, 8: 52, 9: 51,
  O: 53.5, H: 52, W: 87, E: 49.5, C: 53.5, A: 60, N: 56, T: 55, R: 53,
  V: 59, L: 50, D: 52.5, B: 53.5, I: 17, G: 53, M: 60, F: 48, S: 51, U: 52,
  P: 53, Y: 55, J: 48, K: 57, Q: 55, X: 60, Z: 52, AD: 122, BC: 116.5,
};
// Optical alignment keeps narrow stems and round capitals centred on their cards.
const ALIGN = {
  0: [-.55, 32.4, 99.3], 1: [-.45, 33.1, 97.8], 2: [-.1, 32.3, 98.7], 3: [-.1, 33.4, 98.4],
  4: [-.8, 33.1, 97.8], 5: [-1.05, 33, 98.6], 6: [-.6, 32.3, 99.4], 7: [-.5, 33.2, 97.7],
  8: [0, 33.5, 97], 9: [-.5, 32.3, 99.5], O: [.45, 32.2, 99.6], H: [.6, 33.1, 97.8],
  W: [.5, 33.1, 97.7], E: [.5, 33, 97.9], C: [.45, 32.3, 99.3], A: [.1, 33.1, 97.9],
  N: [.5, 33.3, 97.6], T: [.55, 32.2, 97.7], R: [.5, 32.3, 97.6], V: [.5, 32, 97.8],
  L: [.5, 32.1, 97.8], D: [1, 33.2, 97.5], B: [.4, 32.2, 97.6], AD: [.5, 33.2, 97.6], BC: [-.4, 32.2, 99.5],
};
const CARD_WIDTH = {
  BOARDING: 275.5, 'MOON LANDING': 419, 'FIRST FLIGHT': 374.5, COLUMBUS: 293.5,
  'MARCO POLO': 348.5, VESUVIUS: 272.5, 'ANNO DOMINI': 366.5, 'GREAT PYRAMID': 439.5, NOW: 121.5,
};

export function drawType(ctx, text, width, isCard) {
  if (!text) return;
  ctx.save();
  ctx.font = `600 ${isCard ? 72 : 138}px "Barlow Condensed"`;
  if (isCard) ctx.letterSpacing = '5px';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
  const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
  const [dx, y, height] = isCard ? [0, 48.3, 52.3] : (ALIGN[text] || [0, 32, 98]);
  ctx.translate(width / 2 + dx, y);
  ctx.scale((isCard ? CARD_WIDTH[text] : INK_WIDTH[text]) / inkWidth, height / inkHeight);
  ctx.fillStyle = isCard ? 'rgb(218,216,246)' : 'rgb(252,251,255)';
  ctx.fillText(text, (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2, m.actualBoundingBoxAscent);
  ctx.restore();
}

export function drawHeader(ctx, text, x, y) {
  ctx.save(); ctx.font = '500 25px "Barlow Condensed"'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgb(145,144,160)';
  for (const ch of text) { ctx.fillText(ch, x, y); x += ctx.measureText(ch).width + 4; }
  ctx.restore();
}
