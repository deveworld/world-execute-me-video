import { rng, clamp, lerp } from '../lib.js';

const D = Math.PI / 180;
const gaussian = (x, c, s) => Math.exp(-.5 * ((x - c) / s) ** 2);
export const JET_AXES = [[61.5, 7], [137, 11], [308.5, 17]];

// Angular shower profiles combine a broad cone with fine subjets. The outer part
// scatters more strongly, leaving bright ribs between the charged-particle tracks.
export function jetEnergy(deg, radius) {
  const outer = clamp((radius - 55) / 60);
  let light = 0;
  for (let j = 0; j < JET_AXES.length; j++) {
    const [axis, width] = JET_AXES[j], d = deg - axis;
    if (Math.abs(d) > width * 1.6) continue;
    const envelope = Math.exp(-Math.pow(Math.abs(d) / (width * .72), 4));
    const ribs = .50 + .24 * Math.sin(d * 1.7 + j) ** 2 + .26 * Math.sin(d * 3.6 - j * 2) ** 2;
    const inner = 218 * envelope * (.93 + .07 * Math.cos(d * .9));
    const far = 220 * envelope * ribs * (j === 0 ? .76 : 1);
    light = Math.max(light, lerp(inner, far, outer * outer * (3 - 2 * outer)));
  }
  return light;
}

export function inJet(angle) {
  const deg = (angle / D + 360) % 360;
  return JET_AXES.some(([axis, width]) => Math.abs(deg - axis) < width * 1.5);
}

export function makeDetector() {
  const random = rng(34001);
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(.0001, random()))) * Math.cos(2 * Math.PI * random());
  // Sparse energy deposits drive tower heights; the material response supplies colour.
  const deposits = [[10, 5], [23, 64], [24, 76], [25, 21], [53, 13], [54, 89], [55, 58], [56, 3]];
  const cells = Array.from({ length: 64 }, (_, i) => {
    const angle = (i + .5) * 360 / 64;
    const e = Math.max(.37 * gaussian(angle, 59, 4.4), .81 * gaussian(angle, 136, 6.2), gaussian(angle, 306.5, 4.8));
    const outer = Math.max(.34 * gaussian(angle, 59, 4.8), .82 * gaussian(angle, 137, 6.5), gaussian(angle, 311, 6.3));
    const band = Math.max(.67 * gaussian(angle, 60, 7.2), gaussian(angle, 137, 7.4), gaussian(angle, 309, 7.9));
    const base = i % 3 === 0 ? 6 : 8;
    const height = deposits.find(([cell]) => cell === i)?.[1];
    const color = (lo, hi, a) => lo.map((v, k) => Math.round(lerp(v, hi[k], a)));
    return {
      inner: color([base, base - 1, base + 4], [211, 213, 248], e),
      outer: color([8, 7, 12], [132, 136, 236], outer),
      bar: color([24, 23, 51], [223, 226, 254], clamp(band * 1.8)),
      height: height ? 280 + height : 0,
      ramp: height > 40 ? [[230, 233, 254], [150, 151, 255], [143, 144, 237]]
        : [[149, 146, 246], [220, 222, 255], [246, 247, 255]],
    };
  });
  const tracks = Array.from({ length: 75 }, (_, i) => {
    const jet = i < 36 ? i % 3 : -1;
    const angle = jet >= 0 ? (JET_AXES[jet][0] + normal() * JET_AXES[jet][1] * .42) * D : random() * Math.PI * 2;
    const curvature = (random() < .5 ? -1 : 1) * (.0002 + .009 * random() ** 2);
    return { angle, curvature };
  });
  const loops = Array.from({ length: 45 }, () => {
    const a = random() * Math.PI * 2, radius = 28 + 100 * random(), distance = radius * (.9 + .35 * random());
    return [distance * Math.cos(a), distance * Math.sin(a), radius];
  });
  return { cells, tracks, loops };
}
