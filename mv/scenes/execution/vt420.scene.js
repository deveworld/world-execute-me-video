// 154.300–155.233 · DEC VT420: Python, `python me.py` → execution (white phosphor).
import { createVT } from './lib/vt.js';

const F = (f) => (f - 0.5) / 60;
export default {
  id: 'execution/vt420',
  start: F(9258),
  end: F(9314),
  create(root, env) {
    return createVT(root, env, {
      label: 'DEC VT420', color: '#f6f6f2',
      affine: [245.1, 105.9, 17.47, 35.84, -0.94, -0.381],
      glass: [48.4, 2.5, 1872.5, 1073.5], radius: 49.5, k: [-0.0112, -0.0688],
      frames: { out: 9260, prompt: 9290, cursorOff: 9304 },
      before: ['$ cat me.py', 'from world import world, me', '', 'world.execute(me)', '$ python me.py'],
      output: 'execution',
    });
  },
};
