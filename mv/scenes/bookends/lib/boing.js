// Right panel of the intro (3.85 – 7.33): circle outline -> wireframe sphere -> grid room ->
// ball drop (r 0.45 m, g 9.81, e 0.50) -> Amiga Boing checker. Drawn per pixel in content
// coordinates (1920x1080, y down) into the CRT content buffer.
//
// Measured on the original (content space):
//  * room: pinhole camera, principal point (1333.55, 328.32), f = 1594.1 px, units = grid cells,
//    floor y = -4.013, back wall z = 14.833 (rms 0.6 px over all grid lines)
//  * sphere: orthographic, centre (1344.0, 396.4) r 355.6 -> rests at (1342.4, 601.6) r 354.8;
//    16 x 8 facets, axis tilt 25.9° az 318.4°, meridian phase 1.25°, spin -97.5°/s from the drop
//  * drop 205.2 px, g = 9.81 m/s² with r = 0.45 m, restitution 0.5, starts at t = 5.5143

const FS = `#version 300 es
precision highp float;
uniform float uAspect;     // silhouette stretch factor ...
uniform float uStretch;    // ... along this screen direction (radians, y down)
uniform float uWire;       // measured wire brightness over time
uniform vec3 uSph;         // centre x, y (content px), radius px
uniform vec4 uAnim;        // x outline arc (0..1), y reveal (bands, 0..8), z room progress, w checker wipe Y
uniform vec4 uAnim2;       // x shading, y unused, z shadow, w room fill
uniform vec3 uAxis, uE1, uE2;
out vec4 o;

const float CXP = 1333.549, CYP = 328.322, FOC = 1594.1;
const float HC = 4.013, DW = 14.833;
const float PI = 3.14159265;
const float BAND = PI / 8.0;
const vec3 WIRE = vec3(0.62, 0.66, 0.88);
const vec3 WALL_LINE = vec3(0.40, 0.41, 0.58);
const vec3 FLOOR_LINE = vec3(0.50, 0.51, 0.68);
const vec3 WALL_BG = vec3(0.056, 0.060, 0.083);
const vec3 FLOOR_BG = vec3(0.10, 0.102, 0.135);
const vec3 BG = vec3(0.016, 0.016, 0.02);
const vec3 LAV = vec3(0.353, 0.362, 0.7465);   // R,G raised to the measured facet colour
const vec3 WHITE = vec3(0.707690, 0.709329, 0.725293);

float lineCov(float v, float halfw) {
  return 1.0 - smoothstep(halfw - 0.6, halfw + 0.6, abs(v));
}
float gridDist(float v) {
  float f = v - floor(v + 0.5);
  return abs(f) / max(fwidth(v), 1e-5);
}

void main() {
  vec2 pc = gl_FragCoord.xy;                     // content px, y down (FBO row 0 = top)
  if (pc.x < 860.0) { o = vec4(0.0); return; }
  vec3 d = normalize(vec3((pc.x - CXP) / FOC, -(pc.y - CYP) / FOC, 1.0));
  vec3 col = vec3(0.0); float a = 0.0;
  float fill = uAnim2.w;

  // ---------- room (absolute timing, seconds) ----------
  float T = uAnim.z;
  if (T > 5.29) {
    float tw = DW / d.z;
    vec3 pw = d * tw;
    bool onWall = pw.y >= -HC;
    float tf = -HC / d.y;
    vec3 pf = d * tf;
    vec3 bgc = onWall ? WALL_BG : FLOOR_BG;
    if (onWall) bgc += vec3(.025,.024,.024) * exp(-(pc.x-900.0)/700.0) + vec3(.010) + vec3(.013) * uAnim2.x;
    else bgc += vec3(.008,.006,.008) * uAnim2.x;
    float cov; vec3 lc;
    float jr = mix(-6.0, 7.5, clamp((T - 5.285) / 0.045, 0.0, 1.0));     // junction draws left -> right
    float junction = lineCov(pc.y - (CYP + FOC * HC / DW), 1.0);
    if (onWall) {
      float yw = pw.y + HC, xw = pw.x;
      float idx = floor(xw + 0.5);
      float hv = fract(sin(idx * 12.9898 + 4.1) * 43758.5453);
      // verticals rise from the junction, roughly left first (measured frame by frame)
      float grow = pow(clamp((T - 5.318 - 0.006 * clamp((xw + 6.0) / 13.5, 0.0, 1.0) - 0.004 * hv) / 0.049, 0.0, 1.0), 1.6) * 7.6;
      float cv = lineCov(gridDist(xw), 0.95) * step(yw, grow);
      float jdx = floor(yw + 0.5);
      float xr = mix(-6.0, 7.5, clamp((T - 5.36 - 0.002 * jdx) / 0.05, 0.0, 1.0));
      float ch = lineCov(gridDist(yw), 0.95) * step(xw, xr) * step(0.5, yw);
      cov = max(max(cv, ch), junction * step(xw, jr));
      lc = WALL_LINE;
    } else {
      float xf = pf.x, kf = DW - pf.z;
      float grow = clamp((T - 5.324 - 0.006 * clamp((xf + 9.0) / 18.0, 0.0, 1.0)) / 0.075, 0.0, 1.0) * 12.0;
      float cv = lineCov(gridDist(xf), 0.95) * step(kf, grow);
      float kdx = floor(kf + 0.5);
      // measured: each floor row is drawn left to right across the panel in ~0.062 s, rows 0.0135 s apart
      float fr = clamp((T - 5.3495 - 0.0135 * (kdx - 1.0)) / 0.062, 0.0, 1.0);
      float ch = lineCov(gridDist(kf), 0.95) * step(pc.x, 860.0 + fr * 1045.0) * step(0.5, kf) * step(0.001, fr);
      cov = max(max(cv, ch), junction * step(xf, jr));
      lc = FLOOR_LINE;
      // soft contact shadow under the resting ball (appears with the lighting)
      vec2 sp = (pc - vec2(1345.0, 1000.0)) / vec2(215.0, 78.0);
      float sh = exp(-0.5 * dot(sp, sp) * 2.2) * uAnim2.z;
      bgc *= (1.0 - 0.55 * sh);
      lc = mix(lc, lc * 0.75, sh);
    }
    col = bgc * fill; a = fill;
    col = col * (1.0 - cov) + lc * cov;
    a = a + (1.0 - a) * cov;
  }

  // ---------- sphere (orthographic) ----------
  // Measured: the silhouette is stretched ~2% radially away from the frame centre (perspective-like).
  vec2 dq = pc - uSph.xy;
  float cst = cos(uStretch), snt = sin(uStretch);
  float su = (dq.x * cst + dq.y * snt) / uAspect, sv = -dq.x * snt + dq.y * cst;
  vec2 q = vec2(su * cst - sv * snt, su * snt + sv * cst) / uSph.z;
  q.y = -q.y;
  float rr = length(q);
  float silPx = (rr - 1.0) * uSph.z;
  if (rr < 1.0) {
    vec3 N = vec3(q, -sqrt(max(1.0 - dot(q, q), 0.0)));
    float theta = acos(clamp(dot(N, uAxis), -1.0, 1.0));
    float x1 = dot(N, uE1), x2 = dot(N, uE2);
    float phi = atan(x2, x1);
    float fb = theta / BAND;                       // band coordinate 0..8
    float reveal = uAnim.y;
    // latitude rings at band boundaries 1..7 (a ring appears with the band above it)
    float ringI = floor(fb + 0.5);
    float lat = lineCov(gridDist(fb), 0.8) * step(0.5, ringI) * step(ringI, 7.5) * step(ringI, reveal + 0.001);
    float lon = 0.0;
    for (int m = 0; m < 8; m++) {
      float pm = float(m) * BAND;
      float dm = x2 * cos(pm) - x1 * sin(pm);
      lon = max(lon, lineCov(dm / max(fwidth(dm), 1e-5), 0.8));
    }
    lon *= step(fb, reveal) * step(0.02, fb);
    float wire = max(lat, lon);
    // Boing checker, flat-shaded per facet
    float bi = floor(fb), si = floor(phi / BAND);
    vec3 chk = mod(bi + si, 2.0) < 0.5 ? WHITE : LAV;
    float tc = (bi + 0.5) * BAND, pcn = (si + 0.5) * BAND;
    vec3 Nf = cos(tc) * uAxis + sin(tc) * (cos(pcn) * uE1 + sin(pcn) * uE2);
    vec3 lightVector = vec3(-0.368764, 0.521338, -0.533605);
    float diff = max(dot(Nf, lightVector), 0.0);
    float shade = mix(1.0, 0.572464 + diff, uAnim2.x);
    chk *= shade;
    float wipe = step(pc.y, uAnim.w);
    vec3 sc = mix(BG, chk, wipe);
    float sa = max(step(5.29, uAnim.z), wipe);
    vec3 wc = sc * sa * (1.0 - wire * (1.0 - wipe)) + WIRE * uWire * wire * (1.0 - wipe);
    float wa = sa + (1.0 - sa) * wire * (1.0 - wipe);
    col = col * (1.0 - wa) + wc;
    a = a * (1.0 - wa) + wa;
  }
  // silhouette outline, drawn clockwise from the top
  float ang = atan(q.x, q.y);
  ang = ang < 0.0 ? ang + 2.0 * PI : ang;
  float outline = lineCov(silPx + 0.6, 1.0) * step(ang, uAnim.x * 2.0 * PI + 1e-4) * step(0.0001, uAnim.x);
  outline *= 1.0 - step(uAnim.w, 0.0) * 0.0;
  col = col * (1.0 - outline) + WIRE * uWire * outline;
  a = a + (1.0 - a) * outline;
  o = vec4(col, a);
}`;

// bounce: drop from rest (h0 above the floor contact) at t=0, gravity g, restitution e
export function bounceHeight(ts, h0, g, e) {
  if (ts <= 0) return h0;
  const t1 = Math.sqrt((2 * h0) / g);
  if (ts < t1) return h0 - 0.5 * g * ts * ts;
  let v = g * t1 * e;
  let t = ts - t1;
  for (let i = 0; i < 40; i++) {
    const dur = (2 * v) / g;
    if (t < dur) return v * t - 0.5 * g * t * t;
    t -= dur;
    v *= e;
    if (v < 1e-3) break;
  }
  return 0;
}

export const SIM_T0 = 5.5143;
// Wire brightness relative to WIRE, measured on the original (median wire pixel): slow fade, a flash
// when the readout lands (4.85), and a dimmer wireframe once the ball drops.
const WIRE_GAIN = [[4.0, .975], [4.3, .974], [4.5, .94], [4.7, .9], [4.833, .9], [4.85, 1.137], [4.95, 1.12], [5.0, 1.09], [5.1, 1.026], [5.2, .993], [5.3, .954], [5.5, .948], [5.55, .875], [5.6, .862], [6.0, .845], [6.4, .84]];
function wireGain(t) { const a = WIRE_GAIN; if (t <= a[0][0]) return a[0][1]; for (let i = 1; i < a.length; i++) if (t < a[i][0]) return a[i - 1][1] + (a[i][1] - a[i - 1][1]) * (t - a[i - 1][0]) / (a[i][0] - a[i - 1][0]); return a[a.length - 1][1]; }
const DEG = Math.PI / 180;

export function createBoing(crt) {
  const gl = crt.gl;
  const prog = crt.program(FS);
  const tilt = 25.89 * DEG, az = 318.35 * DEG;
  const axis = [Math.sin(tilt) * Math.cos(az), Math.cos(tilt), Math.sin(tilt) * Math.sin(az)];
  const ref = [0, 0, -1];
  const dp = dot(ref, axis);
  const e1 = norm(ref.map((v, i) => v - axis[i] * dp));
  const e2 = cross(axis, e1);

  // Bounce clock (unchanged timing) ...
  const R0 = 355.6;
  const PXM = R0 / 0.45;            // px per metre
  const G = 9.81 * PXM;             // px / s^2
  const DROP = 601.6 - 396.4;
  // ... and the geometry fitted per frame on the original's wires/facet edges (4.9-7.3 s, 17 frames):
  // centre x 1347.75, y 394.0 -> 605.6, radius 353.75, spin 97.38 deg/s, axis drifting with height.
  const SX = 1347.75, SY0 = 394.0, SY1 = 605.6, SR = 353.75;

  function state(t) {
    const arc = clamp01((t - 3.8983) / 0.0917);
    // latitude bands appear every 7 frames (16th notes), each drawn in ~2 frames
    let reveal = 0;
    for (let k = 0; k < 8; k++) reveal += clamp01((t - (4.0167 + k * 0.11667)) / 0.0333);
    const room = t;
    // measured: the room's panels light up gradually while the grid is being drawn (5.30-5.47)
    const fill = table1([[5.30, 0], [5.317, .1], [5.333, .14], [5.35, .29], [5.367, .39], [5.383, .555], [5.4, .665], [5.417, .86], [5.433, .88], [5.45, .97], [5.467, 1]], t);
    const wipeY = t < 6.396 ? -10 : 247 + (t - 6.396) * 3530;
    const shade = clamp01((t - 6.8125) / 0.1);
    const shadow = shade;
    const h = bounceHeight(t - SIM_T0, DROP, G, 0.5);
    const k = clamp01((DROP - h) / DROP);
    const solid = clamp01((t - 6.396) / 0.12);
    const cx = SX, cy = SY0 + (SY1 - SY0) * k, r = SR;
    const psi = (1.765 - 97.377 * Math.max(0, t - 5.5172)) * DEG;   // spin fitted on 15 frames (wires + facet edges)
    return { arc, reveal, room, fill, wipeY, shade, shadow, cx, cy, r, psi, solid };
  }

  return {
    ready: Promise.resolve(),
    state,
    draw(t) {
      const s = state(t);
      // phi = atan2(N.e2, N.e1) - psi  -> rotate the reference frame by +psi
      const tiltNow = (25.93 - (s.cy - 394) * 0.00352) * DEG, azNow = (316.40 + (s.cy - 394) * 0.00857) * DEG;
      const axisNow = [Math.sin(tiltNow) * Math.cos(azNow), Math.cos(tiltNow), Math.sin(tiltNow) * Math.sin(azNow)];
      const dpNow = dot(ref, axisNow), e1Now = norm(ref.map((v,i)=>v-axisNow[i]*dpNow)), e2Now = cross(axisNow,e1Now);
      const c = Math.cos(s.psi), sn = Math.sin(s.psi);
      const E1 = e1Now.map((v, i) => v * c + e2Now[i] * sn);
      const E2 = cross(axisNow, E1);
      crt.bindTarget(crt.content);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(prog.p);
      const u = prog.u;
      gl.uniform3f(u.uSph, s.cx, s.cy, s.r);
      const dist = Math.hypot(s.cx - 960, s.cy - 540);
      gl.uniform1f(u.uAspect, 1 + 0.024 * (dist / 411) ** 2);
      gl.uniform1f(u.uStretch, Math.atan2(s.cy - 540, s.cx - 960));
      gl.uniform1f(u.uWire, wireGain(t));
      gl.uniform4f(u.uAnim, s.arc, s.reveal, s.room, s.wipeY);
      gl.uniform4f(u.uAnim2, s.shade, 0, s.shadow, s.fill);
      gl.uniform3f(u.uAxis, ...axisNow);
      gl.uniform3f(u.uE1, ...E1);
      gl.uniform3f(u.uE2, ...E2);
      crt.draw();
      gl.disable(gl.BLEND);
    },
  };
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
function table1(a, t) { if (t <= a[0][0]) return a[0][1]; for (let i = 1; i < a.length; i++) if (t < a[i][0]) return a[i - 1][1] + (a[i][1] - a[i - 1][1]) * (t - a[i - 1][0]) / (a[i][0] - a[i - 1][0]); return a[a.length - 1][1]; }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
function norm(v) { const l = Math.hypot(...v); return v.map((x) => x / l); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
