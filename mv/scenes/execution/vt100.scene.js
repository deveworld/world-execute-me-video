// 149.700–150.600 · DEC VT100: C, `cc me.c world.o`, `a.out` → execution (white phosphor).
import { createVT } from './lib/vt.js';

const F = (f) => (f - 0.5) / 60;
export default {
  id: 'execution/vt100',
  start: F(8982),
  end: F(9036),
  create(root, env) {
    return createVT(root, env, {
      label: 'DEC VT100', color: '#e5ebf8',
      affine: [259.1, 113.8, 16.79, 35.28, -0.78, -0.388],
      glass: [67.0, 8.6, 1849.6, 1067.8], radius: 55.5, k: [-0.0219, -0.085],
      frames: { out: 8984, prompt: 9013, cursorOff: 9027 },
      before: ['login: me', 'Password:', '$ cat me.c', '#include "world.h"', '', 'main()', '{', '        execute(&world, &me);', '}',
        '$ cc me.c world.o', '$ a.out'],
      output: 'execution',
    });
  },
};
