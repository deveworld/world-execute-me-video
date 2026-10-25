// 151.533–152.500 · Commodore 64: LOAD"WORLD",8 … RUN → EXECUTION, READY. Flat 40x25 text screen
// drawn with the C64 character ROM, then curved/scanlined by the shared CRT pass.
import { createCRT } from './lib/crt.js';
import { C64, drawBitmapText } from './lib/glyphs.js';
import { addLabel } from './lib/label.js';
import { GLASS } from './lib/glass.js';
import { guarded } from './lib/ctx2d.js';

const F = (f) => (f - 0.5) / 60;
const T0 = 9092;                 // cut (151.533)
const OUT = 9094, PROMPT = 9124, CURSOR_OFF = 9138;   // the cursor is still on at 9137
const X0 = 349, X1 = 1571, Y0 = 151, Y1 = 929;   // inner raster (undistorted px)
const CW = (X1 - X0) / 40, CH = (Y1 - Y0) / 25;
const BORDER = '#53498a', SCREEN = '#322868', INK = '#5f579b';

export default {
  id: 'execution/c64',
  start: F(T0),
  end: F(9150),
  create(root, env) {
    const crt = createCRT(root, env, {
      k: [-0.02, -0.0737], distort: 1, glass: GLASS.glass, radius: GLASS.radius, kg: GLASS.kg,
      rim: GLASS.rim, rimRadius: GLASS.rimRadius, kr: GLASS.kr, outside: GLASS.outside,
      rimTop: [15.6, 14, 17.1].map((v) => v / 255),
      // per-channel low-order shading field: the original ≈ ours × field
      shade: [[0.9904, 0.9927, 0.9874], [0.0044, 0, 0.0253], [0.0178, 0.0099, 0.0531], [0.3335, 0.3872, 0.2376], [0.7127, 0.7532, 0.5248], [-6.1678, -6.3234, -5.2068]],
      rimBot: [11.1, 9.9, 12.8].map((v) => v / 255),
      scan: [3.876, 0.354, 1.8967], mask: [0, 3, 3], monoScan: 1,
      aperture: [-.36,4.8,7.58,-6.3,-1.13,1.65,-1.09,-1.25,-11.19,4.4,4.25,-5.69,1.46,-3.53,3.59,1.88,-3.11,4.01].map(v=>v/255), apertureNorm:68.5/255,
      vign: 0.04, gain: 1.05, sheen: 0.16,
    });
    const label = addLabel(root, env, 'Commodore 64');
    const rows = (f) => {
      const r = {
        1: '    **** COMMODORE 64 BASIC V2 ****', 3: ' 64K RAM SYSTEM  38911 BASIC BYTES FREE', 5: 'READY.', 6: 'LOAD"WORLD",8',
        8: 'SEARCHING FOR WORLD', 9: 'LOADING', 10: 'READY.', 11: '10 ME=1:GOSUB 1000:END', 12: 'RUN',
      };
      if (f >= OUT) r[13] = 'EXECUTION';
      else r[12] = 'RUN█';
      if (f >= PROMPT) { r[15] = 'READY.'; if (f < CURSOR_OFF) r[16] = '█'; }
      return r;
    };
    return {
      ready: label.ready,
      render(t) {
        const f = Math.round(t * 60);
        guarded(crt.ctx, (ctx) => {
        ctx.fillStyle = BORDER;
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.fillStyle = SCREEN;
        ctx.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
        for (const [r, text] of Object.entries(rows(f))) drawBitmapText(ctx, C64, text, X0, Y0 + r * CH, CW, CH, INK);
        });
        crt.render();
      },
    };
  },
};
