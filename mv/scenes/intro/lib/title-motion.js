const clamp = (x) => Math.min(1, Math.max(0, x));
const SPB = 60 / 130;
const smooth = (x) => { const u = clamp(x); return u * u * (3 - 2 * u); };

// The line is entered token by token. Each token arrives heavy and relaxes to regular weight.
export const TOKEN_ON = [14.95, 14.978, 15.005, 15.04, 15.073, 15.10, 15.128];
const START_INK = [10, 11, 10, 12, 8, 11, 13];
const EMPHASIS = [
  [15.417, 0, 3.7], [16.133, 2, 3.9], [16.367, 4, 2.2], [16.583, 6, 3.7],
  [16.80, -1, 3.7], [17.267, -1, 3.7], [17.717, 0, 3.7], [17.717, 2, 3.7], [17.717, 4, 3.7],
  [18.167, 0, 3.7], [18.167, 2, 3.7], [19.267, 0, 2.4], [19.317, 2, 2.7], [20.75, 4, 2.4], [20.967, 4, 2.7],
  [21.20, 0, 3.7], [21.65, 2, 3.7], [22.10, 0, 3.8], [22.10, 2, 3.8], [22.11, 4, 2.5],
];
const decay = (t, t0, tau) => t < t0 ? 0 : Math.exp(-(t - t0) / tau);

export function titleState(t) {
  const u = clamp((t - 14.9833) / 0.25);
  const zoom = 1 + 0.106 * Math.pow(1 - u, 3.1);
  const move = clamp((t - 18.695) / 0.455);
  const lift = move < 0.5 ? 4 * move ** 3 : 1 - (-2 * move + 2) ** 3 / 2;
  const y = 245 * (1 - lift);
  const glow = 11.8 * smooth((t - 18.40) / 0.035) * (1 - smooth((t - 18.75) / 0.25))
    * Math.exp(-Math.max(0, t - 18.45) / 1.8) + 8.8 * smooth((t - 22.11) / 0.04);
  return { zoom, y, glow };
}

export function tokenState(i, kind, t) {
  const age = t - TOKEN_ON[i];
  const alpha = i === 0 ? 1 : clamp(age / 0.021);
  const floor = kind === 'm' ? (t >= 19.6 ? 0.25 : 0.5) : 1;
  let ink = floor + START_INK[i] * decay(t, TOKEN_ON[i], 0.118);
  const beat = Math.floor((t - 15.867) / SPB);
  if (beat >= 0) ink += (kind === 'm' ? 0.3 : 0.8) * decay(t, 15.867 + beat * SPB, 0.09);
  for (const [t0, token, amount] of EMPHASIS) {
    if (token === i || token === -1) {
      const amp = token === -1 && kind === 'm' ? amount * 0.75 : amount;
      ink = Math.max(ink, floor + amp * decay(t, t0, t0 >= 22.10 ? 0.25 : 0.16));
    }
  }
  if (kind !== 'p') ink += 1.6 * smooth((t - 18.43) / 0.05) * (1 - smooth((t - 18.77) / 0.22));
  let mix = 0;
  if (kind === 'p') {
    mix = 1 - smooth((t - (15.20 + i * 0.04)) / 0.22);
    const flashes = i === 1 ? [15.867, 16.80, 17.267, 17.717, 22.10]
      : i === 6 ? [16.583, 16.80, 22.10] : [16.80, 17.267, 22.10];
    for (const t0 of flashes) mix = Math.max(mix, decay(t, t0, t0 === 22.10 ? 0.95 : 0.37));
  } else if (kind === 'm') mix = 1 - Math.pow(1 - clamp((t - 19.083) / 0.18), 3);
  return { alpha, weight: (kind === 'm' ? 380 : 400) + (kind === 'm' ? 100 : kind === 'p' ? 60 : 96) * (ink - (kind === 'm' ? 0.25 : 1)), mix };
}

export const CLOCK_START = 20.0333333333;
export const CLOCK_STEP = SPB / 2;
export const clockAt = (t) => (t - CLOCK_START) / CLOCK_STEP;
export const clockCellOn = (column) => CLOCK_START + Math.min(column, 9) * CLOCK_STEP;

// Highlight fills hold for one clock cycle and then discharge exponentially.
export function executionColour(row, t) {
  const events = [[20.7333, 20.9667, [206, 208, 252], [25, 23, 58]],
    [20.9667, 21.1833, [209, 209, 255], [26, 25, 59]],
    [21.1833, 21.45, [253, 253, 253], [58, 57, 64]],
    [21.65, 21.9167, [252, 251, 251], [58, 57, 64]],
    [22.1167, Infinity, [252, 251, 254], [58, 57, 64]]];
  const [on, off, lit, dim] = events[row];
  if (t < on) return null;
  const p = t <= off ? 0 : 1 - Math.exp(-(t - off) / 0.052);
  return lit.map((v, i) => Math.round(v + (dim[i] - v) * p));
}

export function registerHighlight(name, t) {
  const events = { EIP: [20.9667, 21.1833, 21.4167, 21.8833, 22.1167],
    EAX: [20.9667], ECX: [21.4167], EDX: [21.8833], ESP: [21.1833], S1: [21.1833] };
  let on = -Infinity;
  for (const event of events[name]) if (t >= event) on = event;
  if (!Number.isFinite(on)) return null;
  const tint = name === 'EAX' ? [39, 36, 85] : name === 'S1' ? [30, 27, 59] : [38, 37, 43];
  const hold = name === 'EIP' ? 0.18 : 0.21;
  const p = Math.exp(-Math.max(0, t - on - hold) / 0.11);
  return tint.map((v, i) => Math.round([8, 7, 12][i] + (v - [8, 7, 12][i]) * p));
}

// New branches fade as parsing continues. The evaluation pulse runs down the tree once it is complete.
export function treeLevel(t, on, kind, flash = Infinity) {
  const floor = kind === 'text' ? 238 : kind === 'connector' ? 180 : 138;
  const tau = kind === 'text' ? 0.7 : 0.48;
  const settle = floor + (255 - floor) * Math.exp(-Math.max(0, t - on - 0.1) / tau);
  if (t < flash) return settle;
  return Math.max(settle, floor + (255 - floor) * Math.exp(-Math.max(0, t - flash - 0.13) / 0.47));
}
