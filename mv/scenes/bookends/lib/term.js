// VT323 terminal text in content coordinates (1920x1080 flat frame that the CRT shows).
// Measured on the original: advance 25.0 px (VT323 at 62.5 px), baseline of row n at 105 + 60.07·n,
// ink starts at x ≈ 62.5. Big text is 2x (125 px).

export const FONT = 'VT323';
export const SIZE = 62.5;
export const ADV = 24.96;
export const X0 = 60.5;
export const baseline = (row) => 104.5 + 60.07 * row;

// The original's visuals trail the 130 BPM grid by ~0.078 s (cursor blinks, Arecibo pulses).
export const LAG = 0.078;
export const beatPhase = (env, t) => {
  const b = env.beat.beatAt(t - LAG);
  return b - Math.floor(b);
};

// chars of `text` visible at t when typed from t0 at cps (first frame after t0 shows >= 1 char)
export function typedCount(t, t0, cps, len) {
  if (t < t0) return 0;
  return Math.min(len, Math.floor((t - t0) * cps + 1e-6));
}

// A segment list: [{ text, t0, cps }] appended in order on one line.
export function segText(segs, t) {
  let s = '';
  let typing = false;
  let last = -1;
  for (const g of segs) {
    if (t < g.t0) break;
    const n = typedCount(t, g.t0, g.cps ?? 120, g.text.length);
    s += g.text.slice(0, n);
    const end = g.t0 + g.text.length / (g.cps ?? 120);
    if (t < end + 1e-6) typing = true;
    last = Math.max(last, end);
    if (n < g.text.length) break;
  }
  return { s, typing, last };
}

export function setFont(ctx, scale = 1) {
  ctx.font = `${SIZE * scale}px "${FONT}"`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
}

// draw monospaced text char by char on the exact 25 px grid (avoids kerning/rounding drift)
export function drawMono(ctx, s, x, y, scale = 1) {
  const adv = ADV * scale;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch !== ' ') ctx.fillText(ch, x + i * adv, y);
  }
}

// block cursor at column `col` of a row with baseline y (measured: top = y-33, bottom = y+12; big: -70/+19)
export function drawCursor(ctx, x, y, col, scale = 1) {
  const adv = ADV * scale;
  const top = scale > 1 ? y - 70 : y - 33.5;
  const bot = scale > 1 ? y + 19 : y + 11.5;
  ctx.fillRect(x + col * adv + 1, top, adv - 1, bot - top);
}
