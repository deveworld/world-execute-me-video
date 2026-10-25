// Lorenz system integration + camera, shared by the "Execution" / "Simulation" shots.
import { CAM, P0, U, H, STEP_T0, STEPS } from './data.js';
import { READOUT_FRAME0, SIM_TIMES } from './readout.js';

export const SIGMA = 10, RHO = 28, BETA = 8 / 3;

function deriv(x, y, z) {
  return [SIGMA * (y - x), x * (RHO - z) - y, x * y - BETA * z];
}

// RK4 with step H from p, n steps → Float64Array(3·(n+1))
export function integrate(p, n) {
  const out = new Float64Array(3 * (n + 1));
  let x = p[0], y = p[1], z = p[2];
  out[0] = x; out[1] = y; out[2] = z;
  for (let i = 1; i <= n; i++) {
    const k1 = deriv(x, y, z);
    const k2 = deriv(x + (H / 2) * k1[0], y + (H / 2) * k1[1], z + (H / 2) * k1[2]);
    const k3 = deriv(x + (H / 2) * k2[0], y + (H / 2) * k2[1], z + (H / 2) * k2[2]);
    const k4 = deriv(x + H * k3[0], y + H * k3[1], z + H * k3[2]);
    x += (H / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
    y += (H / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    z += (H / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
    out[3 * i] = x; out[3 * i + 1] = y; out[3 * i + 2] = z;
  }
  return out;
}

export const youStart = () => [P0[0] + 1e-5 * U[0], P0[1] + 1e-5 * U[1], P0[2] + 1e-5 * U[2]];

// Camera at song time t: returns project(x, y, z) → [sx, sy] (screen px).
export function camera(t) {
  const dt = t - 68.7;
  const th = CAM.th0 + CAM.om * dt + CAM.om2 * dt * dt;
  const ce = Math.cos(CAM.e), se = Math.sin(CAM.e), ct = Math.cos(th), st = Math.sin(th);
  const d = [ce * ct, ce * st, se];
  const R = [-st, ct, 0];
  const Uv = [-se * ct, -se * st, ce];
  const { D, f, zT, ox, oy } = CAM;
  const p2 = (x, y, z) => {
    const vz = z - zT;
    const depth = D - (x * d[0] + y * d[1] + vz * d[2]);
    return [(f * (x * R[0] + y * R[1])) / depth, (f * (x * Uv[0] + y * Uv[1] + vz * Uv[2])) / depth];
  };
  const o = p2(0, 0, 0);
  const project = (x, y, z) => {
    const q = p2(x, y, z);
    return [ox + (q[0] - o[0]), oy - (q[1] - o[1])];
  };
  project.into = (src, n, dst) => {
    for (let i = 0; i < n; i++) {
      const q = p2(src[3 * i], src[3 * i + 1], src[3 * i + 2]);
      dst[2 * i] = ox + (q[0] - o[0]);
      dst[2 * i + 1] = oy - (q[1] - o[1]);
    }
  };
  return project;
}

// Integration step shown at song time t (fractional, for smooth motion).
const FAST = [[73.1,1276.6],[73.1166666667,1289.2],[73.1333333333,1342.2],[73.15,1470],
  [73.1666666667,1702.4],[73.1833333333,2063.2],[73.2,2571.6],[73.2166666667,3242],[73.2333333333,4084.8]];
export function stepAt(t) {
  if (t <= STEP_T0) return 0;
  const k = t * 60 - READOUT_FRAME0;
  if (k < SIM_TIMES.length - 1) {
    const i = Math.floor(k), fr = k - i;
    return (SIM_TIMES[i] + (SIM_TIMES[i + 1] - SIM_TIMES[i]) * fr) / H;
  }
  for (let i = 1; i < FAST.length; i++) {
    if (t <= FAST[i][0]) {
      const [t0, s0] = FAST[i - 1], [t1, s1] = FAST[i];
      return s0 + ((s1 - s0) * (t - t0)) / (t1 - t0);
    }
  }
  return null; // beyond: dense phase, handled by the scene
}
