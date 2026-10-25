// math/points — see core/renderer.js: all four math verses share one pure renderer.
import { createRenderer } from './core/renderer.js';

export default {
  id: 'math/points',
  start: 29.23,
  end: 33.369,
  create(root, env) {
    return createRenderer(root, env);
  },
};
