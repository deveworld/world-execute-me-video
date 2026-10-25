// math/sine — see core/renderer.js: all four math verses share one pure renderer.
import { createRenderer } from './core/renderer.js';

export default {
  id: 'math/sine',
  start: 37.063,
  end: 40.755,
  create(root, env) {
    return createRenderer(root, env);
  },
};
