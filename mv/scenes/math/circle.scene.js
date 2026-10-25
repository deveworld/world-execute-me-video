// math/circle — see core/renderer.js: all four math verses share one pure renderer.
import { createRenderer } from './core/renderer.js';

export default {
  id: 'math/circle',
  start: 33.369,
  end: 37.063,
  create(root, env) {
    return createRenderer(root, env);
  },
};
