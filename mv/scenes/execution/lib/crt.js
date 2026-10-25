// CRT monitor look for the retro eras: the scene draws a flat 1920x1080 picture into `ctx`
// (an offscreen 2D canvas), `render()` pushes it through a WebGL pass that applies
//   - barrel distortion (separable: x bows with y², y bows with x²), optional for the content,
//   - the glass outline: a rounded rectangle in undistorted space, so its edges bow like the picture,
//   - scanlines (period in px, phase) and an aperture-grille style mask,
//   - a soft vignette towards the glass edge,
//   - optionally a dim bezel lip (rim) around the glass, with its own outline (V3: fitted to the original).
// Everything is a pure function of the uniforms, so frames are deterministic.

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tex;
uniform vec2 k;            // barrel coefficients (x by y², y by x²), normalized coords
uniform float distort;     // 1 = distort the content too, 0 = only the glass outline
uniform vec4 glass;        // x0, y0, x1, y1 in undistorted px
uniform float radius;      // glass corner radius px
uniform vec3 scan;         // period px, strength 0..1, phase px
uniform vec3 mask;         // strength 0..1, period x px, period y px
uniform float monoScan;    // monochrome high-frequency modulation, as after video chroma filtering
uniform vec3 aperture[6];  // six-column RGB phosphor/chroma cycle, in output RGB units
uniform float apertureNorm;
uniform float vign;        // vignette strength
uniform float gain;        // overall brightness multiplier
uniform float sheen;       // top-left to bottom-right brightness slope
uniform vec3 outside;      // colour outside the glass
uniform vec2 kg;           // barrel coefficients of the glass outline (may differ from the content's)
uniform float rimOn;       // 1 = a dim bezel lip (rim) surrounds the glass
uniform vec4 rim;          // rim rounded rect, undistorted px
uniform float rimRadius;
uniform vec2 kr;           // barrel coefficients of the rim outline
uniform vec3 rimTop;       // rim colour at the top / bottom of the frame
uniform vec3 rimBot;
uniform float shadeOn;     // 1 = multiply by a fitted low-order shading field (per channel)
uniform vec3 shade[6];     // coefficients of 1, u, v, u², v², u²v² with u, v = screen pos - 0.5
vec2 undistortK(vec2 s, vec2 kk) {   // screen px -> undistorted px (fixed-point inverse of the forward map)
  vec2 c = vec2(960.0, 540.0), h = vec2(960.0, 540.0);
  vec2 S = (s - c) / h, q = S;
  for (int i = 0; i < 3; i++) q = vec2(S.x / (1.0 + kk.x * q.y * q.y), S.y / (1.0 + kk.y * q.x * q.x));
  return q * h + c;
}
vec2 undistort(vec2 s) { return undistortK(s, k); }
float roundRect(vec2 p, vec4 r, float rad) {
  vec2 c = (r.xy + r.zw) * 0.5, hs = (r.zw - r.xy) * 0.5;
  vec2 d = abs(p - c) - hs + rad;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - rad;   // <0 inside
}
void main() {
  vec2 s = vec2(uv.x * 1920.0, (1.0 - uv.y) * 1080.0);
  vec2 g = undistort(s);
  vec2 src = mix(s, g, distort);
  float dg = roundRect(undistortK(s, kg), glass, radius);
  vec3 col = texture(tex, vec2(src.x / 1920.0, src.y / 1080.0)).rgb;
  // scanlines in source space (follow the picture's curvature); mean-preserving
  float sl = 0.5 + 0.5 * cos(6.2831853 * (src.y - scan.z) / scan.x);
  float sm = (1.0 - scan.y * (1.0 - sl)) / (1.0 - 0.5 * scan.y);
  col = mix(col * sm, col + vec3((sm - 1.0) * dot(col, vec3(0.3333333))), monoScan);
  // aperture mask in screen space (1 px dark line every period), mean-preserving
  float mx = 1.0 - step(1.0, mod(floor(s.x), mask.y));
  float my = 1.0 - step(1.0, mod(floor(s.y), mask.z));
  float mk = max(mx, my);
  float mmean = 1.0 - (1.0 - 1.0 / mask.y) * (1.0 - 1.0 / mask.z);
  float mm = (1.0 - mask.x * mk) / (1.0 - mask.x * mmean);
  col = mix(col * mm, col + vec3((mm - 1.0) * dot(col, vec3(0.3333333))), monoScan);
  if (apertureNorm > 0.0) {
    int column = int(mod(floor(s.x), 6.0));
    col += aperture[column] * dot(col, vec3(0.3333333)) / apertureNorm;
  }
  // vignette: darker towards the glass edge
  float e = clamp(-dg / 260.0, 0.0, 1.0);
  col *= mix(1.0 - vign, 1.0, smoothstep(0.0, 1.0, e));
  // broad sheen: brighter towards the top-left of the glass
  col *= 1.0 + sheen * (0.5 - (s.x / 1920.0 * 0.35 + s.y / 1080.0 * 0.65));
  col *= gain;
  if (shadeOn > 0.5) {
    float u = s.x / 1920.0 - 0.5, v = s.y / 1080.0 - 0.5;
    col *= shade[0] + shade[1] * u + shade[2] * v + shade[3] * u * u + shade[4] * v * v + shade[5] * u * u * v * v;
  }
  float inside = 1.0 - smoothstep(-1.0, 1.0, dg);
  vec3 back = outside;
  if (rimOn > 0.5) {
    float dr = roundRect(undistortK(s, kr), rim, rimRadius);
    back = mix(outside, mix(rimTop, rimBot, s.y / 1080.0), 1.0 - smoothstep(-1.0, 1.0, dr));
  }
  o = vec4(mix(back, col, inside), 1.0);
}`;

export function createCRT(root, env, opts = {}) {
  const content = document.createElement('canvas');
  content.width = 1920;
  content.height = 1080;
  const ctx = content.getContext('2d');
  const { canvas, ctx: gl } = env.canvas(root, { context: 'webgl2', options: { preserveDrawingBuffer: true, antialias: false } });
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const U = (n) => gl.getUniformLocation(prog, n);
  const o = {
    k: [-0.02, -0.075], distort: 1, glass: [72, 17, 1848, 1062], radius: 70,
    scan: [4, 0.3, 0], mask: [0.25, 3, 3], monoScan: 0, aperture: null, apertureNorm: 0,
    vign: 0.35, gain: 1, sheen: 0, outside: [0, 0, 0], kg: null,
    rim: null, rimRadius: 0, kr: null, rimTop: [0, 0, 0], rimBot: [0, 0, 0], shade: null, ...opts,
  };
  return {
    ctx,
    content,
    canvas,
    set(p) { Object.assign(o, p); },
    render() {
      gl.viewport(0, 0, 1920, 1080);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, content);
      gl.uniform1i(U('tex'), 0);
      gl.uniform2f(U('k'), o.k[0], o.k[1]);
      gl.uniform1f(U('distort'), o.distort);
      gl.uniform4f(U('glass'), ...o.glass);
      gl.uniform1f(U('radius'), o.radius);
      gl.uniform3f(U('scan'), ...o.scan);
      gl.uniform3f(U('mask'), ...o.mask);
      gl.uniform1f(U('monoScan'), o.monoScan);
      gl.uniform3fv(U('aperture[0]'), new Float32Array(o.aperture || Array(18).fill(0)));
      gl.uniform1f(U('apertureNorm'), o.apertureNorm);
      gl.uniform1f(U('vign'), o.vign);
      gl.uniform1f(U('gain'), o.gain);
      gl.uniform1f(U('sheen'), o.sheen);
      gl.uniform3f(U('outside'), ...o.outside);
      gl.uniform2f(U('kg'), ...(o.kg || o.k));
      gl.uniform1f(U('rimOn'), o.rim ? 1 : 0);
      gl.uniform4f(U('rim'), ...(o.rim || o.glass));
      gl.uniform1f(U('rimRadius'), o.rimRadius);
      gl.uniform2f(U('kr'), ...(o.kr || o.kg || o.k));
      gl.uniform3f(U('rimTop'), ...o.rimTop);
      gl.uniform3f(U('rimBot'), ...o.rimBot);
      gl.uniform1f(U('shadeOn'), o.shade ? 1 : 0);
      gl.uniform3fv(U('shade[0]'), new Float32Array(o.shade ? o.shade.flat() : Array(18).fill(0)));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
  };
}
