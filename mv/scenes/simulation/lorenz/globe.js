// Static wireframe globe of the "Simulation" shot (fitted to the reference: perspective view from
// 6.69 R at 12.1° elevation, 8 great circles every 22.5° starting at 11.25°, parallels at 0° and ±30°).
const D = 6.6875, E = 0.21162, PHI0 = 11.25, MSTEP = 22.5, LATS = [30, 0, -30];
const CX = 1355.5, CY = 539.5, LIMB = 443.5;

export function globeLines() {
  const cam = [D * Math.cos(E), 0, D * Math.sin(E)];
  const n = Math.hypot(...cam);
  const fwd = cam.map((v) => -v / n);
  const right = [0, 1, 0];
  let up = [right[1] * fwd[2] - right[2] * fwd[1], right[2] * fwd[0] - right[0] * fwd[2], right[0] * fwd[1] - right[1] * fwd[0]];
  const un = Math.hypot(...up);
  up = up.map((v) => v / un);
  if (up[2] < 0) up = up.map((v) => -v);
  const k = LIMB * Math.sqrt(D * D - 1);
  const proj = (p) => {
    const v = [p[0] - cam[0], p[1] - cam[1], p[2] - cam[2]];
    const z = v[0] * fwd[0] + v[1] * fwd[1] + v[2] * fwd[2];
    return [CX + ((v[0] * right[0] + v[1] * right[1] + v[2] * right[2]) / z) * k, CY - ((v[0] * up[0] + v[1] * up[1] + v[2] * up[2]) / z) * k];
  };
  const meridians = [];
  for (let m = 0; m < 360 / MSTEP; m++) {
    const ph = ((PHI0 + m * MSTEP) * Math.PI) / 180;
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const th = Math.PI / 2 - (Math.PI * i) / 120; // north → south
      pts.push(proj([Math.cos(th) * Math.cos(ph), Math.cos(th) * Math.sin(ph), Math.sin(th)]));
    }
    meridians.push(pts);
  }
  const parallels = LATS.map((lat) => {
    const la = (lat * Math.PI) / 180, pts = [];
    for (let i = 0; i <= 240; i++) {
      const ph = (2 * Math.PI * i) / 240;
      pts.push(proj([Math.cos(la) * Math.cos(ph), Math.cos(la) * Math.sin(ph), Math.sin(la)]));
    }
    return { lat, pts };
  });
  return { meridians, parallels, cx: CX, cy: CY, r: LIMB };
}
