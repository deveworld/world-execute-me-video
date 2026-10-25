// 150.600–151.533 · DEC VT220: VAX Pascal (TYPE / PASCAL / LINK / RUN) → execution (green phosphor).
import { createVT } from './lib/vt.js';

const F = (f) => (f - 0.5) / 60;
export default {
  id: 'execution/vt220',
  start: F(9036),
  end: F(9092),
  create(root, env) {
    return createVT(root, env, {
      label: 'DEC VT220', color: '#7ff173',
      affine: [253.0, 110.2, 17.12, 35.52, -0.86, -0.463],
      glass: [59.0, 5.5, 1856.5, 1072.0], radius: 66, k: [-0.0131, -0.0788],
      frames: { out: 9038, prompt: 9068, cursorOff: 9082 },
      before: ['$ TYPE ME.PAS', 'PROGRAM Main (OUTPUT);', "%INCLUDE 'WORLD.PAS'", 'BEGIN', '   Execute (World, Me)', 'END.',
        '$ PASCAL ME', '$ LINK ME', '$ RUN ME'],
      output: 'execution',
    });
  },
};
