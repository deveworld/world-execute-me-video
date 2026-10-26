// Rasterize the dot font at a fixed density so its coverage stays consistent on HiDPI canvases.
import { canvasScale } from '../../../engine/hidpi.js';

export function createPixelText() {
  const scale = 2 / canvasScale(), masks = new Map();
  const tint = document.createElement('canvas');
  tint.width = Math.ceil(700 * scale); tint.height = Math.ceil(70 * scale);
  const tc = tint.getContext('2d');
  tc.setTransform(scale, 0, 0, scale, 0, 0);

  function maskOf(s, p) {
    const key = `${p}:${s}`;
    if (masks.has(key)) return masks.get(key);
    const w = s.length * 6 * p, h = 8 * p, canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * scale); canvas.height = Math.ceil(h * scale);
    const c = canvas.getContext('2d');
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.fillStyle = '#fff'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = `840 ${p * 10}px "Doto"`;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === ' ') continue;
      const tall = /[bdfhijkltA-Z0-9]/.test(ch), desc = /[gjpqy]/.test(ch);
      c.save(); c.translate(i * 6 * p, (desc ? 37 / 7 : 6) * p);
      c.scale(1, tall || desc ? 6 / 7 : 1); c.fillText(ch, 0, 0); c.restore();
    }
    const entry = { canvas, w, h };
    masks.set(key, entry);
    return entry;
  }

  return (ctx, s, x, y, p, color, alpha = 1, alphaAt = null) => {
    if (!s || alpha <= 0) return;
    const { canvas, w, h } = maskOf(s, p);
    tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, 700, 70);
    tc.drawImage(canvas, 0, 0, w * scale, h * scale, 0, 0, w, h);
    tc.globalCompositeOperation = 'source-in'; tc.fillStyle = color; tc.fillRect(0, 0, w, h);
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    if (alphaAt) {
      for (let i = 0; i < s.length; i++) {
        const a = alpha * alphaAt(x + (i * 6 + 2.5) * p);
        if (a <= 0) continue;
        ctx.globalAlpha = a;
        ctx.drawImage(tint, i * 6 * p * scale, 0, 6 * p * scale, h * scale,
          x + i * 6 * p, y, 6 * p, h);
      }
    } else {
      ctx.globalAlpha = alpha;
      ctx.drawImage(tint, 0, 0, w * scale, h * scale, x, y, w, h);
    }
    ctx.restore();
  };
}
