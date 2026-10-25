// Iris drawn from a model: narrow bundles of thin radial fibres running out from a wavy collarette,
// parting around small crypts, fine pupillary fibres inside the collarette, beaded concentric furrows
// and a darkening limbus. The texture is drawn once with Canvas 2D at the reference pupil size; a WebGL
// pass colours it (lavender, white or a mix) and stretches it radially for the current pupil.
const IRIS_R = 246;
export const PALETTES = { lav: { ruff: [205, 203, 228] }, white: { ruff: [240, 240, 250] } };

const TEX = 500, C = 250, PUPIL0 = 64.5;
// the texture is drawn at about 2x and mipmapped, so fibres near a pixel wide stay smooth
const TEX_RES = 1024;
const DEG = Math.PI / 180, TAU = 2 * Math.PI;

// collarette radius: mean, then [harmonic, amplitude px, phase]
const COLLARETTE = [130.8, [1, 0.9, 2.85], [2, 4.3, -0.76], [3, 1.4, 1.08], [4, 1.55, -0.86], [30, 4.5, -0.04]];
// crypts: [angle°, inner r, outer r, half width px]; angles run clockwise from 3 o'clock
const CRYPTS = [
  [28.2, 140, 180, 16.5], [67.1, 131, 164, 11.3], [169.4, 134, 180, 14.8], [178.7, 138, 171, 15.9],
  [207.9, 131, 184, 15.5], [264.3, 130, 164, 10.4], [318.3, 130, 156, 13.2], [342.4, 130, 173, 9.6],
  [146.7, 130, 151, 5.6], [200.0, 132, 151, 7.6], [226.8, 136, 154, 7.1], [296.7, 131, 155, 7.2],
  [53.2, 165, 192, 8.2], [273.1, 163, 196, 7.5], [295.8, 182, 214, 10.5], [326.4, 149, 173, 6.3],
  [341.3, 187, 215, 9.1], [21.3, 178, 204, 6.5], [302.5, 181, 198, 6.3], [250.2, 162, 232, 9.3], [287.0, 191, 219, 7.2],
];
// concentric furrows: [r, from°, to°]
const FURROWS = [
  [199, 0, 36], [218, 0, 39], [234, 3, 34], [199, 50, 83], [233, 69, 106], [199.5, 101, 135], [217.5, 110, 161],
  [232, 166, 205], [199, 185, 205], [216, 207, 232], [197, 251, 262], [217, 291, 299], [234, 350, 360],
];
// pupil rim: the number of ticks stays the same whatever the pupil size
const RUFF_TICKS = 86;

const wrap = (a) => a - TAU * Math.round(a / TAU);
const collarette = (a) => COLLARETTE.slice(1).reduce((r, [k, amp, ph]) => r + amp * Math.cos(k * a + ph), COLLARETTE[0]);

// periodic value noise around the circle (n cells), smooth between cells
function ringNoise(rng, n) {
  const v = Array.from({ length: n }, rng);
  return (a) => {
    const x = ((a / TAU) % 1 + 1) % 1 * n, i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f);
    return v[i % n] * (1 - s) + v[(i + 1) % n] * s;
  };
}

// Red holds the level, green the level without its violet part (the shader recovers the tint).
function irisTexture(rng) {
  // An OffscreenCanvas keeps this size whatever device-pixel scale the stage canvases use.
  // willReadFrequently keeps it on the CPU rasterizer, which gives the same pixels in every session.
  const cv = new OffscreenCanvas(TEX_RES, TEX_RES);
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.scale(TEX_RES / TEX, TEX_RES / TEX);
  g.fillStyle = '#000';
  g.fillRect(0, 0, TEX, TEX);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const at = (r, a) => [C + r * Math.cos(a), C + r * Math.sin(a)];
  const shade = (level, violet = 0) => {
    const v = Math.round(255 * Math.min(1, level)), gr = Math.round(v * (1 - violet));
    return `rgb(${v},${gr},${gr})`;
  };
  const stroke = (pts, level, width, violet = 0) => {
    g.strokeStyle = shade(level, violet);
    g.lineWidth = width;
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
  };

  // pupillary zone: dim band by the pupil, then fine, nearly radial fibres whose brightness varies
  // fibre to fibre and in broad sectors
  g.fillStyle = shade(0.15);
  g.beginPath();
  g.arc(C, C, 74, 0, TAU);
  g.fill();
  const sector = ringNoise(rng, 62);
  for (let i = 0, n = 560; i < n; i++) {
    const a0 = (i + 0.6 * rng()) / n * TAU, twist = (rng() - 0.5) * 0.0015;
    const r0 = 73 + 3 * rng(), r1 = collarette(a0) - 2, pts = [];
    for (let r = r0; r < r1; r += 4) pts.push(at(r, a0 + twist * (r - r0)));
    pts.push(at(r1, a0 + twist * (r1 - r0)));
    const level = (0.25 + 0.75 * sector(a0)) * (0.4 + 0.75 * rng());
    stroke(pts.slice(0, 2), level * 0.4, 0.7);
    stroke(pts.slice(1), level, 0.7);
  }

  // ciliary zone: narrow bundles of thin fibres from the collarette to the limbus, parted by dark gaps.
  // Each fibre is a bright core over a dim sheath, so the fibres of a bundle stay distinct.
  const crypts = CRYPTS.map(([deg, r0, r1, hw]) => ({ a: deg * DEG, r0, r1, hw: hw * 0.8 }));
  // shared flow: neighbouring bundles sway together, so the gaps between them stay open
  const waves = [[7, 160, 0.6], [13, 90, 0.35], [23, 60, 0.25]].map(([k, l, amp]) => [k, TAU / l, amp * DEG, rng() * TAU]);
  const flow = (a, r) => waves.reduce((s, [k, w, amp, ph]) => s + amp * Math.sin(k * a + w * r + ph), 0);
  const R0 = 180, start = rng() * TAU;
  for (let a = start; a < start + TAU - 0.01;) {
    // gap and fibre spacing in px at radius R0
    const gap = (1.5 + 4 * rng() ** 1.5) / R0, n = 1 + Math.floor(rng() * 3), pitch = (1.8 + 0.5 * rng()) / R0;
    const lo = a + gap;
    a = lo + (n - 1) * pitch + 1.2 / R0;
    if (a > start + TAU) break;
    const m = (0.08 + 0.2 * rng()) * DEG, l = 50 + 70 * rng(), ph = rng() * TAU;
    const light = (0.55 + 0.7 * rng()) * (1 + 0.15 * Math.cos(lo - 40 * DEG));
    const violet = rng() < 0.15 ? 0.15 + 0.2 * rng() : 0;
    for (let j = 0; j < n; j++) {
      const base = lo + j * pitch;
      const sides = crypts.map((c) => { const d = wrap(base - c.a); return [d < 0 ? -1 : 1, Math.abs(d)]; });
      const pts = [], rEnd = 238 + 7 * rng();
      for (let r = collarette(base) + 2.5; r <= rEnd; r += 2.5) {
        let b = base + flow(base, r) + m * Math.sin(TAU * r / l + ph);
        // each crypt pushes the fibre to the side it starts on; zero at the crypt's ends
        crypts.forEach((c, i) => {
          if (r <= c.r0 || r >= c.r1) return;
          const w = c.hw * Math.sin(Math.PI * ((r - c.r0) / (c.r1 - c.r0)) ** 0.75) / r, [side, d] = sides[i];
          b += side * (Math.sqrt(d * d + w * w) - d);
        });
        pts.push(at(r, b));
      }
      const level = light * (0.75 + 0.25 * rng());
      stroke(pts, level * 0.15, 2);
      // fibres are dimmer where they leave the collarette
      stroke(pts.slice(0, 4), level * 0.5, 1.25, violet);
      stroke(pts.slice(3), level, 1.25, violet);
    }
  }

  // collarette: a tube, two pale walls round a dimmer core, cutting the fibres it crosses
  const ring = (dr) => Array.from({ length: 721 }, (_, i) => at(collarette(i / 720 * TAU) + dr, i / 720 * TAU));
  stroke(ring(0), 0.04, 4.6);
  stroke(ring(0), 0.22, 2.2);
  stroke(ring(-1.5), 0.7, 1);
  stroke(ring(1.5), 0.7, 1);

  // furrows: dark concentric arcs with dark beads along them
  g.fillStyle = g.strokeStyle = 'rgba(0,0,0,0.85)';
  for (const [r, d0, d1] of FURROWS) {
    g.lineWidth = 1.4;
    g.beginPath();
    g.arc(C, C, r, d0 * DEG, d1 * DEG);
    g.stroke();
    g.beginPath();
    for (let a = d0 * DEG + 3 * rng() / r; a < d1 * DEG; a += (4 + 5 * rng()) / r) {
      const [x, y] = at(r, a);
      g.moveTo(x + 1.3, y);
      g.arc(x, y, 1.3, 0, TAU);
    }
    g.fill();
  }

  // limbus: the fibres fade into the dark rim
  const limb = g.createRadialGradient(C, C, 232, C, C, IRIS_R);
  limb.addColorStop(0, 'rgba(0,0,0,0)');
  limb.addColorStop(0.5, 'rgba(0,0,0,0.15)');
  limb.addColorStop(0.85, 'rgba(0,0,0,0.45)');
  limb.addColorStop(1, 'rgba(0,0,0,0.85)');
  g.fillStyle = limb;
  g.fillRect(0, 0, TEX, TEX);
  return cv;
}

export function makeIrisModel(rng) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = TEX;
  const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
  const program = gl.createProgram();
  const compile = (type, code) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, code);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p,0.,1.);}'));
  // Radial morph: the reference pupil edge moves to `pupil`, the iris rim stays put. The level is
  // coloured lavender (with the violet tint of some bundles) or white; white saturates the mid-tones,
  // so the fibres of a bundle merge while the gaps stay dark. Then the optional level adjustment.
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `precision highp float;
varying vec2 uv;
uniform sampler2D tex;
uniform float pupil, whiteness, contrast;
uniform vec3 gain, offs;
void main(){
  vec2 p=(uv-.5)*${TEX}.;
  float r=length(p);
  float ref=${PUPIL0}+(r-pupil)*(${IRIS_R}.-${PUPIL0})/(${IRIS_R}.-pupil);
  vec2 st=.5+p/max(r,.001)*ref/${TEX}.;
  vec4 tx=texture2D(tex,st);
  float v=tx.r, violet=tx.r-tx.g;
  vec3 lav=v+smoothstep(0.,.15,v)*vec3(-4.,-7.,21.)/255.+violet*vec3(-.35,-.4,.45);
  vec3 white=.08+.87*(1.-exp(-4.6*v))+vec3(-3.,-4.,7.)/255.;
  vec3 color=max(mix(lav,white,whiteness),vec3(8.,7.,14.)/255.);
  color=max(vec3(0.),(color-vec3(.25))*contrast+vec3(.25));
  color=clamp(color*gain+offs,0.,1.);
  gl_FragColor=r>${IRIS_R}.?vec4(0.):vec4(color,1.);
}`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, irisTexture(rng));
  gl.generateMipmap(gl.TEXTURE_2D);
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.uniform1i(gl.getUniformLocation(program, 'tex'), 0);
  const u = (name) => gl.getUniformLocation(program, name);
  return { cv, gl, gain: u('gain'), offs: u('offs'), pupil: u('pupil'), whiteness: u('whiteness'), contrast: u('contrast') };
}

// Iris at (cx, cy) with pupil radius rp and whiteness w (0 lavender .. 1 white).
export function drawInner(g, model, cx, cy, rp, w, opts = {}) {
  const { gl } = model;
  gl.uniform1f(model.pupil, rp);
  gl.uniform1f(model.whiteness, w);
  gl.uniform1f(model.contrast, opts.contrast ?? 1);
  const gn = opts.gain ?? [1, 1, 1], of = opts.offset ?? [0, 0, 0];
  gl.uniform3f(model.gain, gn[0], gn[1], gn[2]);
  gl.uniform3f(model.offs, of[0] / 255, of[1] / 255, of[2] / 255);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  g.drawImage(model.cv, cx - C, cy - C);
  if (!opts.noPupil) drawPupil(g, cx, cy, rp, w > 0.5 ? PALETTES.white.ruff : PALETTES.lav.ruff);
}

// Pupil: a ring of short ticks with beads at their tips, the dark pupil and a bright rim.
export function drawPupil(g, cx, cy, rp, ruff = PALETTES.lav.ruff) {
  g.strokeStyle = g.fillStyle = `rgba(${ruff.join(',')},.85)`;
  g.lineWidth = 1.3;
  g.beginPath();
  for (let i = 0; i < RUFF_TICKS; i++) {
    const a = i / RUFF_TICKS * TAU, c = Math.cos(a), s = Math.sin(a);
    g.moveTo(cx + (rp - 0.3) * c, cy + (rp - 0.3) * s);
    g.lineTo(cx + (rp + 4.6) * c, cy + (rp + 4.6) * s);
  }
  g.stroke();
  g.beginPath();
  for (let i = 0; i < RUFF_TICKS; i++) {
    const a = i / RUFF_TICKS * TAU, x = cx + (rp + 5) * Math.cos(a), y = cy + (rp + 5) * Math.sin(a);
    g.moveTo(x + 1.1, y);
    g.arc(x, y, 1.1, 0, TAU);
  }
  g.fill();
  g.fillStyle = 'rgb(8,7,12)';
  g.beginPath();
  g.arc(cx, cy, rp, 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(238,234,255,.85)';
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(cx, cy, rp + 0.4, 0, TAU);
  g.stroke();
}
