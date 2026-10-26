import { rng } from '../../../engine/lib/anim.js';

const TAU = Math.PI * 2;
const clamp = (x) => Math.max(0, Math.min(1, x));

// Every beat advances the ant by a burst of steps, then holds the resulting lattice.
export function antClock(t) {
  const beat = (t - 60.2075) / (60 / 130);
  if (beat <= 0) return 0;
  const whole = Math.floor(beat), u = clamp((beat - whole) * (60 / 130) / 0.317);
  return Math.round(1866 * (whole + 1 - Math.pow(1 - u, 3)));
}

// A bifurcating tree shortens and turns its branches recursively.
export function branchingTree() {
  const branches = [];
  const grow = (g, x, y, angle, length) => {
    const x2 = x + Math.sin(angle) * length, y2 = y - Math.cos(angle) * length;
    branches.push({ g, x, y, x2, y2 });
    if (g < 6) {
      grow(g + 1, x2, y2, angle - Math.PI / 6, length * 0.68);
      grow(g + 1, x2, y2, angle + Math.PI / 8, length * 0.72);
    }
  };
  grow(0, 108.3, 172, 0, 43);
  return branches;
}

// A mean-reverting Wiener process makes a bounded wandering particle. The coarse samples
// and the fine trail come from the same path, so their junctions stay consistent.
export function brownianPath(seed = 210) {
  const random = rng(seed), dt = 1 / 480, points = [[108.3, 90]];
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-9, random()))) * Math.cos(TAU * random());
  let x = 108.3, y = 90;
  for (let i = 0; i < 1000; i++) {
    x += 0.85 * (108.3 - x) * dt + 57 * Math.sqrt(dt) * normal();
    y += 0.85 * (90 - y) * dt + 57 * Math.sqrt(dt) * normal();
    x = Math.max(16, Math.min(200, x)); y = Math.max(16, Math.min(164, y));
    points.push([x, y]);
  }
  return points;
}
