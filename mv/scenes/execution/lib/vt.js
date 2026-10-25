// DEC VT terminal on a dark CRT (VT100 / VT220 / VT320 / VT420 screens of the segment).
// Layers, drawn flat into the CRT content canvas:
//   1. the glass background: near-black with two soft reflections (fitted to the original:
//      base 4.4 + 12.4·G(467,212; 824x286) + 5.0·G(1484,885; 540x200), grey levels),
//   2. text glow (blurred copy of the text layer),
//   3. the text: VT323 (substitute for the DEC VT2xx/3xx ROM font) on an affine grid fitted to
//      the original (the screen is filmed slightly rotated), with scanline modulation.
// The shared CRT pass then cuts the curved glass outline.
import { createCRT } from './crt.js';
import { addLabel } from './label.js';
import { guarded } from './ctx2d.js';

const FONT = '50px VT323';   // template: 20 px advance, 44 px line pitch, baseline at +39
const ADV = 20, PITCH = 44, BASE = 39;

let bgCache = null;
function background() {
  if (bgCache) return bgCache;
  const w = 480, h = 270, s = 4;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const X = (x + 0.5) * s, Y = (y + 0.5) * s;
      const v = 4.4 + 12.4 * Math.exp(-(((X - 467) / 824) ** 2) - (((Y - 212) / 286) ** 2))
        + 5.0 * Math.exp(-(((X - 1484) / 540) ** 2) - (((Y - 885) / 200) ** 2));
      const k = (y * w + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.round(v);
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  bgCache = c;
  return c;
}

// spec: { label, color, glowColor, affine: [x0, y0, adv, pitch, shx, shy], glass, radius, k,
//         frames: { cut, out, prompt, cursorOff }, before: [...lines], after: [...lines] }
export function createVT(root, env, spec) {
  const crt = createCRT(root, env, {
    k: spec.k, distort: 0, glass: spec.glass, radius: spec.radius,
    scan: [4, 0, 0], mask: [0, 3, 3], vign: 0, gain: 1, sheen: 0, outside: [0.008, 0.008, 0.008],
  });
  const label = addLabel(root, env, spec.label);
  const txt = document.createElement('canvas');
  txt.width = 1920; txt.height = 1080;
  const tctx = txt.getContext('2d');
  const [x0, y0, adv, pitch, shx, shy] = spec.affine;
  const T = [adv / ADV, shy / ADV, shx / PITCH, pitch / PITCH, x0, y0];
  let key = null;

  // visible transcript + cursor for frame f
  const state = (f) => {
    const fr = spec.frames;
    const lines = [...spec.before];
    let cursor;
    if (f < fr.out) {
      cursor = [lines.length - 1, lines[lines.length - 1].length];
    } else {
      lines.push(spec.output);
      if (f < fr.prompt) cursor = [lines.length, 0];
      else {
        lines.push('$');
        cursor = f < fr.cursorOff ? [lines.length - 1, 2] : null;
      }
    }
    return { lines, cursor };
  };

  const drawText = (st) => guarded(tctx, () => {
    tctx.setTransform(1, 0, 0, 1, 0, 0);
    tctx.clearRect(0, 0, 1920, 1080);
    tctx.setTransform(...T);
    tctx.font = FONT;
    tctx.fillStyle = spec.color;
    tctx.textBaseline = 'alphabetic';
    st.lines.forEach((l, r) => tctx.fillText(l, 0, r * PITCH + BASE));
    if (st.cursor) {
      const [r, c] = st.cursor;
      tctx.fillRect(c * ADV + 1, r * PITCH + 3, ADV - 2, 38);
    }
    // scanlines: darken thin bands between the glyph rows
    tctx.globalCompositeOperation = 'destination-out';
    tctx.fillStyle = `rgba(0,0,0,${spec.scan ?? 0.3})`;
    const n = Math.ceil((st.lines.length + 1) * PITCH / 4.4) + 2;
    for (let i = 0; i < n; i++) tctx.fillRect(-20, i * 4.4 + (spec.scanPhase ?? 3.0), 1700, 1.6);
    tctx.globalCompositeOperation = 'source-over';
  });

  return {
    ready: Promise.all([label.ready, document.fonts.load(FONT, 'abc')]),
    render(t) {
      const f = Math.round(t * 60);
      const st = state(f);
      const k = JSON.stringify(st);
      if (k !== key) { drawText(st); key = k; }
      guarded(crt.ctx, (ctx) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(background(), 0, 0, 1920, 1080);
      ctx.globalCompositeOperation = 'lighter';
      ctx.filter = `blur(${spec.glowBlur ?? 4}px)`;
      ctx.globalAlpha = spec.glow ?? 0.26;
      ctx.drawImage(txt, 0, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
      ctx.drawImage(txt, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      });
      crt.render();
    },
  };
}
