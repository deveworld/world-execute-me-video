import { rng } from '../../../engine/lib/anim.js';

// Off-lattice diffusion-limited aggregation. Walkers start outside the cluster and stick
// to the first particle they touch; a spatial hash keeps the random walks inexpensive.
export function growDLA(seed = 9, count = 300) {
  const random = rng(seed), cell = 3, step = 1.6, reach = 2.35;
  const points = [[0, 0]], edges = [], bins = new Map();
  const key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  const add = (i) => {
    const p = points[i], k = key(...p);
    if (!bins.has(k)) bins.set(k, []);
    bins.get(k).push(i);
  };
  add(0);
  let radius = 2;
  for (let n = 1; n <= count; n++) {
    let attached = false;
    while (!attached) {
      const launch = radius + 9, angle = random() * Math.PI * 2;
      let x = launch * Math.cos(angle), y = launch * Math.sin(angle);
      for (let walk = 0; walk < 40000; walk++) {
        const a = random() * Math.PI * 2;
        x += step * Math.cos(a); y += step * Math.sin(a);
        if (Math.hypot(x, y) > launch + 25) break;
        const bx = Math.floor(x / cell), by = Math.floor(y / cell);
        let near = -1, best = reach * reach;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          for (const i of bins.get(`${bx + dx},${by + dy}`) || []) {
            const p = points[i], d = (x - p[0]) ** 2 + (y - p[1]) ** 2;
            if (d < best) { near = i; best = d; }
          }
        }
        if (near < 0) continue;
        const p = points[near], d = Math.hypot(x - p[0], y - p[1]);
        x = p[0] + reach * (x - p[0]) / d; y = p[1] + reach * (y - p[1]) / d;
        const born = 60.688 + 2.08 * n / count;
        const project = (a, b) => [108 + 1.3 * (0.8660254 * a - 0.5 * b),
          90 + 1.3 * (0.5 * a + 0.8660254 * b)];
        edges.push([...project(x, y), ...project(p[0], p[1]), born]);
        points.push([x, y]); add(points.length - 1);
        radius = Math.max(radius, Math.hypot(x, y));
        attached = true; break;
      }
    }
  }
  return edges;
}
