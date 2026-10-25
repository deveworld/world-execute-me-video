// 152.500–153.400 · Amiga 1000: Workbench 1.x "New CLI" window (white title bar, topaz/8),
//   1> assign world: df0:   1> execute world:me   execution   1> █
// drawn flat in 640x200-ish hi-res pixels (2.405 x 4.74 px) and curved by the shared CRT pass.
import { createCRT } from './lib/crt.js';
import { TOPAZ, drawBitmapText } from './lib/glyphs.js';
import { addLabel } from './lib/label.js';
import { GLASS } from './lib/glass.js';
import { guarded } from './lib/ctx2d.js';

const F = (f) => (f - 0.5) / 60;
const BLUE = '#083e76', WHITE = '#a9a9ac', TEXT = '#a3a9b2', ORANGE = '#a66216', INK = '#19426f';
const PW = 2.405, PH = 4.74;            // one Amiga pixel
const TX = 160.5, TY = 112.2;           // text origin
const CW = 8 * PW, CH = 8 * PH;

export default {
  id: 'execution/amiga',
  start: F(9150),
  end: F(9204),
  create(root, env) {
    const crt = createCRT(root, env, {
      k: [-0.02, -0.0747], distort: 1, glass: GLASS.glass, radius: GLASS.radius, kg: GLASS.kg,
      rim: GLASS.rim, rimRadius: GLASS.rimRadius, kr: GLASS.kr, outside: GLASS.outside,
      rimTop: [13, 13.7, 16.1].map((v) => v / 255),
      // per-channel low-order shading field: the original ≈ ours × field
      shade: [[1.2953, 1.0414, 1.016], [-0.0393, -0.0532, -0.0165], [-0.3956, -0.0026, 0.0328], [-0.265, -0.248, -0.3435], [-2.6583, -0.1988, -0.0261], [-4.9997, -3.5933, -1.9305]],
      rimBot: [9.1, 9.6, 11.9].map((v) => v / 255),
      scan: [4.9205, 0.348, 1.2080], mask: [0, 3, 3], monoScan: 1,
      aperture: [8.47,9.98,13.16,-4.17,-3.34,-.16,-6.13,-5.5,-16.5,9.05,11.04,.04,-2.21,-4.37,3.48,-4.98,-7.74,.11].map(v=>v/255), apertureNorm:64.3/255,
      vign: 0.04, gain: 1.04, sheen: 0.14,
    });
    const label = addLabel(root, env, 'Amiga 1000');
    const ctx = crt.ctx;
    const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const draw = (f) => {
      rect(0, 0, 1920, 1080, BLUE);
      // window frame: white title bar, side borders, bottom border
      rect(140, 56, 1640, 48, WHITE);
      rect(140, 56, 9, 729, WHITE);
      rect(1771, 56, 9, 729, WHITE);
      rect(140, 776, 1640, 9, WHITE);
      // close gadget (left of the title)
      rect(153, 64, 33, 28, INK); rect(158, 69, 23, 18, WHITE); rect(165, 74, 9, 8, INK);
      drawBitmapText(ctx, TOPAZ, 'New CLI', 200.5, 57.2, CW, CH * 0.95, INK);
      // depth gadgets (right of the title)
      // each is a filled window behind a hollow one;
      // left gadget hollow top-left / filled bottom-right, right gadget the other way round.
      rect(1671, 74, 30, 20, INK); rect(1656, 64.4, 31, 19, INK); rect(1662.4, 69.7, 17.3, 9.4, WHITE);
      rect(1718.3, 64, 30.5, 20, INK); rect(1732, 73.5, 30.5, 20, INK); rect(1738.1, 78.8, 18.3, 9.5, WHITE);
      // sizing gadget (bottom right)
      rect(1696, 737, 84, 48, WHITE); rect(1719, 746, 30, 5, INK); rect(1745, 746, 5, 25, INK);
      // CLI text
      const prompted=f>=9179;
      const lines = ['1> assign world: df0:', '1> execute world:me', 'execution', prompted?'1> ':''];
      lines.forEach((l, i) => drawBitmapText(ctx, TOPAZ, l, TX, TY + i * CH, CW, CH, TEXT));
      rect(TX + (prompted?3*CW:0) - 2, TY + 3 * CH, CW - 1, CH, ORANGE);
    };
    return {
      ready: label.ready,
      render(t) {
        guarded(ctx, () => draw(Math.round(t*60)));
        crt.render();
      },
    };
  },
};
