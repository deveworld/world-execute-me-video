// math/limit — see core/renderer.js: all four math verses share one pure renderer.
import { createRenderer } from './core/renderer.js';

export default {
  id: 'math/limit',
  start: 40.755,
  end: 44.5083333333,
  create(root, env) {
    return createRenderer(root, env);
  },
};
