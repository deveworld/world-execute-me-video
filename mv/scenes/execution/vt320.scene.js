// 153.400–154.300 · DEC VT320: C++, `g++ me.cc world.o`, `a.out` → execution (amber phosphor).
import { createVT } from './lib/vt.js';

const F = (f) => (f - 0.5) / 60;
export default {
  id: 'execution/vt320',
  start: F(9204),
  end: F(9258),
  create(root, env) {
    return createVT(root, env, {
      label: 'DEC VT320', color: '#efb853',
      affine: [247.8, 107.5, 17.38, 35.75, -0.74, -0.344],
      glass: [49.2, 3.0, 1872.0, 1072.9], radius: 49.8, k: [-0.02, -0.0688],
      frames: { out: 9206, prompt: 9234, cursorOff: 9248 },
      before: ['$ cat me.cc', '#include "world.h"', '', 'main()', '{', '        world.execute(me);', '}', '$ g++ me.cc world.o', '$ a.out'],
      output: 'execution',
    });
  },
};
