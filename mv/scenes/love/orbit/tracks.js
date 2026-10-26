import { rng } from '../lib.js';

// A fast excitation followed by a stretched exponential models phosphor persistence.
export function trackFade(age) {
  if (age < 0 || age > 42) return 0;
  const tail = Math.max(0, Math.min(1, (42 - age) / 12));
  return (.90 + .07 * (1 - Math.exp(-2 * age))) * Math.exp(-Math.pow(Math.max(0, age - 2) / 12.5, 1.25)) * tail;
}

// Bursts increase in multiplicity as the beams approach. Each particle travels on
// a circular trajectory in the magnetic field, with a small displaced vertex.
const EMISSIONS = [[10202, 11, 21], [10230, 5, 23], [10258, 9, 21], [10286, 15, 19],
  [10312, 70, 22], [10340, 50, 29], [10368, 40, 40]];

export function makeBurstTracks() {
  return EMISSIONS.map(([frame, count, intensity]) => {
    const random = rng(frame * 71);
    const tracks = Array.from({ length: count }, (_, index) => {
      const heading = random() * Math.PI * 2, sign = random() < .5 ? -1 : 1;
      const radius = 28 + 78 * random(), a0 = heading - sign * Math.PI / 2;
      const length = radius * (1 + 5.0 * random() ** 1.5), step = 2;
      const dx = (random() - .5) * 16, dy = (random() - .5) * 16;
      const displacement = radius + 10 + 12 * random();
      const cx = -sign * displacement * Math.sin(heading) + dx, cy = sign * displacement * Math.cos(heading) + dy;
      const points = [], brightness = intensity * (.6 + .8 * random()) / 255;
      for (let s = 0; s <= length; s += step) {
        const a = a0 + sign * s / radius;
        const x = cx + radius * Math.cos(a), y = cy + radius * Math.sin(a);
        const modulation = .82 + .18 * Math.sin(s * .31 + index) ** 2;
        points.push(x, y, .4 + s / 75, brightness * modulation);
      }
      return Float32Array.from(points);
    });
    return { frame, tracks };
  });
}
