const clamp = x => Math.max(0, Math.min(1, x));
const mix = (a, b, k) => a + (b - a) * k;
const sine = x => (1 - Math.cos(Math.PI * clamp(x))) / 2;

// A driven pendulum gains a little amplitude before its turn holds it at the right apex.
export function swayAt(t) {
  if (t < 98.09) {
    const tau = t - 95.766666667;
    const amplitude = 1.72 + .29 * clamp((tau - .4) / 1.9) + .20 * Math.exp(-tau / .14);
    const z = amplitude * Math.cos(6.83944 * tau - 3.05389);
    const dx = 9.794 - 8.48345 * z - .01796 * z * z, k = sine((t - 98) / .09);
    return [mix(z, 2.01, k), mix(dx, -6.3, k)];
  }
  if (t <= 99) {
    const k = sine((t - 98.75) / .25);
    return [mix(2.01, 1.9, k), mix(-6.3, -6.1, k)];
  }
  const z = 1.92 * Math.cos(6.92 * (t - 98.98));
  return [z, 9.804 - 8.42755 * z];
}

// Each spin accelerates across its edge and slows as the next face comes level.
const TURNS = [
  [96.05, 96.146, 96.2667, 180],
  [96.5, 96.608, 96.7167, 180],
  [98.79, 98.835, 98.936, 360],
];
export function yawAt(t) {
  let yaw = 0;
  for (const [start, edge, end, angle] of TURNS) {
    if (t >= end) { yaw += angle;continue; }
    if (t <= start) break;
    const middle = angle === 360 ? start + .5 * (end - start) : edge;
    const u = clamp((t - start) / (end - start));
    let k;
    if (angle === 360) k = u * u * (3 - 2 * u);
    else if (t < middle) k = .5 * ((t - start) / (middle - start)) ** 1.28;
    else k = .5 + .5 * (1 - (1 - (t - middle) / (end - middle)) ** 1.32);
    yaw += angle * k;break;
  }
  return yaw;
}

export function hookAt(t, z, dx) {
  const a = yawAt(t) * Math.PI / 180, anchor = 1250 + dx;
  return [0, .25, .5, .75, 1].map(u => anchor + z * (2.4 - 1.5 * u) + 7 * Math.sin(a) * Math.sin(Math.PI * u));
}

export function revealAt(t, on, length = .065) {
  const u = clamp((t - on) / length);
  return 1 - (1 - u) ** 3;
}

export const HEADINGS = [
  ['OH', 120.875, 482.375, 61, 63.5],
  ['MY', 211.125, 483.125, 71.75, 61.75],
  ['SWITCH', 308.125, 482.375, 198, 63.5],
  ['ROLE', 535.375, 482.375, 121.25, 63.5],
  ['TO', 120.375, 840.375, 60, 63.5],
  ['TO', 285.125, 840.375, 59.75, 63.5],
];
