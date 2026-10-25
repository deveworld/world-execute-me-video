// Shared helpers for the `simulation` segment (59.30–77.93).

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => { k = clamp(k); return k * k * (3 - 2 * k); };
export const easeOutCubic = (k) => 1 - Math.pow(1 - clamp(k), 3);
export const easeInOutCubic = (k) => { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };

const FONT_BASE = new URL('../fonts/', import.meta.url).href;
const loaded = new Map();
// Latin Modern optical sizes that are not in assets/fonts (lmroman12 regular and bold from CTAN, GUST font licence).
export function loadLocalFont(family, file, descriptors = {}) {
  const key = family + '|' + file;
  if (!loaded.has(key)) {
    const face = new FontFace(family, `url(${FONT_BASE}${file})`, descriptors);
    document.fonts.add(face);
    loaded.set(key, face.load());
  }
  return loaded.get(key);
}

// Smooth background: colour(u, v) = c0 + polynomial vignette in normalised coords u=(x-960)/960, v=(y-540)/540.
// coef per channel (R,G,B): [1, u², v², u⁴, v⁴, u²v², u, v]
export function vignetteCanvas(coefRGB, w = 192, h = 108) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const u = ((i + 0.5) / w) * 2 - 1, v = ((j + 0.5) / h) * 2 - 1;
      const basis = [1, u * u, v * v, u ** 4, v ** 4, u * u * v * v, u, v];
      const o = (j * w + i) * 4;
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let k = 0; k < basis.length; k++) s += (coefRGB[c][k] || 0) * basis[k];
        img.data[o + c] = clamp(Math.round(s), 0, 255);
      }
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export function drawCover(ctx, src, W = 1920, H = 1080) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, W, H);
}

// Piecewise-linear lookup in [[t, v], ...] (sorted by t).
export function pwl(points, t) {
  if (t <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (t <= points[i][0]) {
      const [t0, v0] = points[i - 1], [t1, v1] = points[i];
      return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
    }
  }
  return points[points.length - 1][1];
}
