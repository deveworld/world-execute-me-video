// Canvas backing stores at k device pixels per stage pixel, so canvas scenes stay sharp above 1080p.
// Scenes keep drawing in stage units: a canvas reports the width and height it was given, a 2D context
// starts scaled by k, and the canvas APIs that work in device pixels are mapped back to stage units:
// setTransform/resetTransform/getTransform, shadowBlur and shadow offsets, px lengths in `filter`,
// getImageData/putImageData, drawImage source rectangles, patterns and ImageBitmaps made from scaled
// canvases. WebGL canvases keep k = 1.
//
// install() patches the prototypes; every canvas then gets the k in effect when it is first sized or
// given a context, and keeps it. With k = 1 every patched call goes straight to the original.
let K = 1, installed = false;
const rawWidth = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width').get;
const rawHeight = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'height').get;
const canvases = new WeakMap();   // canvas → { k, w, h, ctx } (w, h in stage units; k 0 = not decided yet)
const bitmaps = new WeakMap();    // ImageBitmap → { k, w, h }
const patterns = new WeakMap();   // CanvasPattern → k

export const canvasScale = () => K;
export const backingBytes = (canvas) => rawWidth.call(canvas) * rawHeight.call(canvas) * 4;
export function setCanvasScale(k) {
  if (!(k > 0)) throw new Error(`bad canvas scale ${k}`);
  if (k !== 1) install();
  K = k;
}

export function install() {
  if (installed) return;
  installed = true;
  const C = HTMLCanvasElement.prototype, X = CanvasRenderingContext2D.prototype;
  const desc = (o, p) => Object.getOwnPropertyDescriptor(o, p);
  const width = desc(C, 'width'), height = desc(C, 'height');
  const { getContext } = C;
  const { setTransform, getTransform, resetTransform, drawImage, getImageData, putImageData, createPattern } = X;

  const state = (c) => {
    let s = canvases.get(c);
    if (!s) canvases.set(c, s = { k: 0, w: width.get.call(c), h: height.get.call(c), ctx: null });
    return s;
  };
  const resize = (c, s) => {
    width.set.call(c, Math.round(s.w * s.k));
    height.set.call(c, Math.round(s.h * s.k));
    if (s.ctx && s.k !== 1) setTransform.call(s.ctx, s.k, 0, 0, s.k, 0, 0);
  };
  const kOf = (ctx) => canvases.get(ctx.canvas)?.k || 1;
  const source = (img) => img instanceof HTMLCanvasElement ? canvases.get(img) : img instanceof ImageBitmap ? bitmaps.get(img) : null;

  for (const [prop, d] of [['width', width], ['height', height]]) {
    Object.defineProperty(C, prop, {
      configurable: true, enumerable: d.enumerable,
      get() { const s = canvases.get(this); return s?.k ? s[prop[0]] : d.get.call(this); },
      set(v) {
        const s = state(this);
        s[prop[0]] = Math.max(0, Math.trunc(Number(v)) || 0);
        if (!s.k) s.k = K;
        if (s.k === 1) { d.set.call(this, s[prop[0]]); return; }
        resize(this, s);
      },
    });
  }

  C.getContext = function (type, ...rest) {
    const s = state(this), gl = /^(experimental-)?webgl/.test(type);
    if (!s.k || (gl && s.k !== 1 && !s.ctx)) { s.k = gl ? 1 : s.k || K; resize(this, s); }
    const ctx = getContext.call(this, type, ...rest);
    if (ctx && type === '2d' && !s.ctx) { s.ctx = ctx; if (s.k !== 1) setTransform.call(ctx, s.k, 0, 0, s.k, 0, 0); }
    return ctx;
  };

  X.setTransform = function (a, b, c, d, e, f) {
    const k = kOf(this);
    if (k === 1) return setTransform.apply(this, arguments);
    if (arguments.length <= 1) ({ a, b, c, d, e, f } = DOMMatrix.fromMatrix(a ?? {}));
    return setTransform.call(this, a * k, b * k, c * k, d * k, e * k, f * k);
  };
  X.resetTransform = function () {
    const k = kOf(this);
    return k === 1 ? resetTransform.call(this) : setTransform.call(this, k, 0, 0, k, 0, 0);
  };
  if (X.reset) {
    const { reset } = X;
    X.reset = function () { reset.call(this); const k = kOf(this); if (k !== 1) setTransform.call(this, k, 0, 0, k, 0, 0); };
  }
  X.getTransform = function () {
    const k = kOf(this), m = getTransform.call(this);
    return k === 1 ? m : new DOMMatrix([m.a / k, m.b / k, m.c / k, m.d / k, m.e / k, m.f / k]);
  };

  // Shadows and filters are applied in device pixels, outside the transform.
  for (const prop of ['shadowBlur', 'shadowOffsetX', 'shadowOffsetY']) {
    const d = desc(X, prop);
    Object.defineProperty(X, prop, {
      configurable: true, enumerable: d.enumerable,
      get() { return d.get.call(this) / kOf(this); },
      set(v) { d.set.call(this, v * kOf(this)); },
    });
  }
  const filter = desc(X, 'filter');
  const scalePx = (v, k) => typeof v === 'string' && k !== 1 ? v.replace(/(-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?)px/gi, (_, n) => `${n * k}px`) : v;
  Object.defineProperty(X, 'filter', {
    configurable: true, enumerable: filter.enumerable,
    get() { return scalePx(filter.get.call(this), 1 / kOf(this)); },
    set(v) { filter.set.call(this, scalePx(v, kOf(this))); },
  });

  X.drawImage = function (img, ...a) {
    const s = source(img);
    if (!s || s.k === 1) return drawImage.call(this, img, ...a);
    if (a.length === 2) return drawImage.call(this, img, a[0], a[1], s.w, s.h);
    if (a.length === 8) return drawImage.call(this, img, a[0] * s.k, a[1] * s.k, a[2] * s.k, a[3] * s.k, a[4], a[5], a[6], a[7]);
    return drawImage.call(this, img, ...a);
  };

  X.createPattern = function (img, repetition) {
    const pattern = createPattern.call(this, img, repetition), s = source(img);
    if (pattern && s && s.k !== 1) { patterns.set(pattern, s.k); pattern.setTransform(new DOMMatrix()); }
    return pattern;
  };
  const patternTransform = CanvasPattern.prototype.setTransform;
  CanvasPattern.prototype.setTransform = function (m) {
    const k = patterns.get(this);
    return patternTransform.call(this, k ? DOMMatrix.fromMatrix(m ?? {}).scale(1 / k) : m);
  };

  // Pixel access stays in stage units: reads are box-averaged down, writes are scaled up without smoothing.
  const scratch = (willRead) => {
    const c = document.createElement('canvas');
    canvases.set(c, { k: 1, w: 0, h: 0, ctx: null });
    return c.getContext('2d', { willReadFrequently: willRead });
  };
  let reader, writer;
  const fit = (ctx, w, h) => {
    if (width.get.call(ctx.canvas) < w || height.get.call(ctx.canvas) < h) {
      width.set.call(ctx.canvas, Math.max(w, width.get.call(ctx.canvas)));
      height.set.call(ctx.canvas, Math.max(h, height.get.call(ctx.canvas)));
    }
    return ctx;
  };
  X.getImageData = function (x, y, w, h, ...rest) {
    const k = kOf(this);
    if (k === 1) return getImageData.call(this, x, y, w, h, ...rest);
    if (w < 0) { x += w; w = -w; }
    if (h < 0) { y += h; h = -h; }
    const r = fit(reader ??= scratch(true), w, h);
    r.globalCompositeOperation = 'copy';
    r.imageSmoothingEnabled = true;
    r.imageSmoothingQuality = 'low';
    drawImage.call(r, this.canvas, x * k, y * k, w * k, h * k, 0, 0, w, h);
    return getImageData.call(r, 0, 0, w, h, ...rest);
  };
  X.putImageData = function (img, dx, dy, sx = 0, sy = 0, sw = img.width, sh = img.height) {
    const k = kOf(this);
    if (k === 1) return putImageData.apply(this, arguments);
    if (sw < 0) { sx += sw; sw = -sw; }
    if (sh < 0) { sy += sh; sh = -sh; }
    sx = Math.max(0, sx); sy = Math.max(0, sy);
    sw = Math.min(img.width - sx, sw); sh = Math.min(img.height - sy, sh);
    if (sw <= 0 || sh <= 0) return;
    const p = fit(writer ??= scratch(false), img.width, img.height);
    putImageData.call(p, img, 0, 0, sx, sy, sw, sh);
    const x0 = Math.round((dx + sx) * k), y0 = Math.round((dy + sy) * k);
    const x1 = Math.round((dx + sx + sw) * k), y1 = Math.round((dy + sy + sh) * k);
    this.save();
    setTransform.call(this, 1, 0, 0, 1, 0, 0);
    this.globalAlpha = 1;
    this.globalCompositeOperation = 'source-over';
    filter.set.call(this, 'none');
    this.shadowColor = 'transparent';
    this.imageSmoothingEnabled = false;
    this.clearRect(x0, y0, x1 - x0, y1 - y0);
    drawImage.call(this, p.canvas, sx, sy, sw, sh, x0, y0, x1 - x0, y1 - y0);
    this.restore();
  };

  const makeBitmap = window.createImageBitmap;
  window.createImageBitmap = async function (img, ...a) {
    const s = source(img);
    if (!s || s.k === 1) return makeBitmap.call(this, img, ...a);
    let w = s.w, h = s.h;
    if (a.length >= 4 && typeof a[0] === 'number') { w = Math.abs(a[2]); h = Math.abs(a[3]); a = [a[0] * s.k, a[1] * s.k, a[2] * s.k, a[3] * s.k, ...a.slice(4)]; }
    const bitmap = await makeBitmap.call(this, img, ...a);
    bitmaps.set(bitmap, { k: s.k, w, h });
    return bitmap;
  };
  const B = ImageBitmap.prototype;
  for (const prop of ['width', 'height']) {
    const d = desc(B, prop);
    Object.defineProperty(B, prop, {
      configurable: true, enumerable: d.enumerable,
      get() { const s = bitmaps.get(this); return s ? s[prop[0]] : d.get.call(this); },
    });
  }
}
