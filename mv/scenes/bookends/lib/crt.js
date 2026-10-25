// CRT tube compositor shared by the intro (0–7.33) and the ending (206.98–212.3).
//
// Tube model:
//  * The tube is the whole 1920x1080 "source" frame seen through a radial warp
//    (output px -> source px):  s = c + 960·u·(1 + k·r²), r² = u² + (q·v)², u,v = (p - c)/960.
//    The glass edge is the source frame border (rounded corners r≈66).
//  * The lit picture is the flat content frame scaled by 0.9507 into the source frame
//    at (47.64, 26.89) -> content coords = (s - T) / S.
//  * Scanlines: period 5.0 content px (bright rows at y ≈ 2.60 + 5n); aperture mask: 3 output px.
//  * Unlit glass: 9.5 + two soft reflections (upper-left, lower-right), slightly blue.
//
// Usage: const crt = createCRT(root, env);
//   crt.beginContent();  ... draw into the content framebuffer (1920x1080, y down) ...
//   crt.drawCanvas(canvas2d)         // composite a 2D canvas (premultiplied alpha) over the content
//   crt.present({ sx, sy, gain, beam, beamHalfW, beamThick, lit })

const VS = `#version 300 es
in vec2 aPos;
out vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

// Draw a texture over the current target (premultiplied alpha). Texture rows are top-first.
const FS_BLIT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform float uFlip;
uniform float uInkGain;
out vec4 o;
void main() {
  vec2 uv = vec2(vUv.x, mix(vUv.y, 1.0 - vUv.y, uFlip));
  vec4 c = texture(uTex, uv);
  float ink = smoothstep(0.1, 0.32, max(c.r,max(c.g,c.b)));
  o = vec4(c.rgb * mix(1.0,uInkGain,ink),c.a);
}`;

// 1/4 downsample with a 4x4 box (4 bilinear taps)
const FS_DOWN = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;   // source texel size
uniform float uThresh; // soft bloom threshold (first level only)
out vec4 o;
vec4 th(vec4 c) {
  float m = max(c.r, max(c.g, c.b));
  float k = max(m - uThresh, 0.0) / max(m, 1e-4) / (1.0 - uThresh);
  return vec4(c.rgb * k, 1.0);
}
void main() {
  vec4 a = th(texture(uTex, vUv + uTexel * vec2(-1.0, -1.0)));
  vec4 b = th(texture(uTex, vUv + uTexel * vec2( 1.0, -1.0)));
  vec4 c = th(texture(uTex, vUv + uTexel * vec2(-1.0,  1.0)));
  vec4 d = th(texture(uTex, vUv + uTexel * vec2( 1.0,  1.0)));
  o = (a + b + c + d) * 0.25;
}`;

// separable gaussian
const FS_BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;     // texel step * direction
uniform float uSigma;  // in texels
out vec4 o;
void main() {
  vec4 acc = vec4(0.0); float wsum = 0.0;
  for (int i = -12; i <= 12; i++) {
    float x = float(i);
    float w = exp(-0.5 * x * x / (uSigma * uSigma));
    acc += texture(uTex, vUv + uDir * x) * w; wsum += w;
  }
  o = acc / wsum;
}`;

const FS_CRT = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uContent;   // full-res content, rows top-first (FBO rendered y-down)
uniform sampler2D uBloomA;    // 1/4 res blur (tight)
uniform sampler2D uBloomB;    // 1/8 res blur (wide)
uniform vec2 uSquash;         // image scale about the centre (power on/off)
uniform float uGain;          // picture gain
uniform float uLit;           // 0..1 picture visible
uniform vec4 uBeam;           // x intensity, y half width (content px), z thickness (content px), w glow
uniform float uNativeBeam;
uniform vec4 uPointShape;      // native centre x, width, height, emission; emission < 0 disables it
uniform vec2 uPointHalo;       // dark reconstruction ring, phosphor halo
uniform vec2 uBloomAmt;       // tight, wide
uniform float uScanDepth;
uniform float uMaskDepth;
uniform float uAberr;         // horizontal RGB offset in content px
uniform vec3 uBlackLift;     // additive lift of the lit picture
uniform float uResid;        // power-on: the warm-up glow that stays outside the opening band
out vec4 o;

const float KX = 0.0792, KY = 0.0852, Q = 0.9934, CX = 955.204, CY = 528.221;
const float SC = 0.9507;
const vec2 TC = vec2(47.64, 26.89);
const vec2 RES = vec2(1920.0, 1080.0);

vec2 toSource(vec2 p) {
  float u = (p.x - CX) / 960.0, v = (p.y - CY) / 960.0;
  float r2 = u * u + (Q * v) * (Q * v);
  return vec2(CX + 960.0 * u * (1.0 + KX * r2), CY + 960.0 * v * (1.0 + KY * r2));
}
float sdRoundRect(vec2 p, vec2 b0, vec2 b1, float r) {
  vec2 c = (b0 + b1) * 0.5, h = (b1 - b0) * 0.5 - vec2(r);
  vec2 d = abs(p - c) - h;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}
vec3 glassColor(vec2 p) {
  vec2 a = (p - vec2(520.9, 217.5)) / vec2(550.9, 202.6);
  vec2 b = (p - vec2(1440.5, 874.8)) / vec2(430.2, 146.2);
  float L = 9.5 + 15.6 * exp(-0.5 * dot(a, a)) + 5.2 * exp(-0.5 * dot(b, b));
  return vec3(L - 0.3, L - 1.3, L + 1.6) / 255.0;
}
vec3 sampleContent(vec2 cc) {
  vec2 uv = cc / RES;
  vec3 col;
  col.r = texture(uContent, uv + vec2(uAberr / RES.x, 0.0)).r;
  col.g = texture(uContent, uv).g;
  col.b = texture(uContent, uv - vec2(uAberr / RES.x, 0.0)).b;
  return col;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, RES.y - gl_FragCoord.y);   // output px, y down
  vec2 s = toSource(p);
  float dg = sdRoundRect(s, vec2(0.0), RES, 66.0);
  float glassMask = 1.0 - smoothstep(-0.8, 0.8, dg);
  vec3 bezel = vec3(2.5 / 255.0);
  vec3 glass = glassColor(p);

  vec2 c = (s - TC) / SC;                                   // content coords (unsquashed)
  vec2 cc = vec2(960.0, 540.0) + (c - vec2(960.0, 540.0)) / uSquash;
  // picture area (soft 0.7px edge in content px)
  vec2 e = min(cc, RES - cc) * uSquash;
  float inImg = clamp(min(e.x, e.y) / 0.7 + 0.5, 0.0, 1.0) * uLit;

  vec3 col = sampleContent(clamp(cc, vec2(0.5), RES - 0.5));
  vec3 bl = texture(uBloomA, clamp(cc, vec2(0.5), RES - 0.5) / RES).rgb * uBloomAmt.x
          + texture(uBloomB, clamp(cc, vec2(0.5), RES - 0.5) / RES).rgb * uBloomAmt.y;

  // scanlines (content space, fixed on the tube) and aperture mask (output space)
  float ph = (c.y - 2.60) / 5.0;
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  float depth = uScanDepth * mix(1.0, 0.55, clamp(lum, 0.0, 1.0));
  float scan = 1.0 - depth * (0.5 - 0.5 * cos(6.2831853 * ph));
  float mask = 1.0 + uMaskDepth * cos(6.2831853 * (p.x - 0.38) / 3.0);

  vec3 pic = (col * scan * mask + uBlackLift) * uGain + bl * uGain;

  // beam line / dot (power on/off), content space centred at (960,540)
  float bx = abs(c.x - 960.0) - uBeam.y;
  float by = abs(c.y - 540.0);
  float beamCore = (1.0 - smoothstep(-0.5, 0.8, bx)) * (1.0 - smoothstep(uBeam.z * 0.5 - 0.5, uBeam.z * 0.5 + 0.8, by));
  float beamGlow = exp(-0.5 * pow(max(bx, 0.0) / 6.0, 2.0)) * exp(-0.5 * pow(by / 5.0, 2.0)) * uBeam.w;
  vec3 beam = vec3(1.0) * uBeam.x * (beamCore + beamGlow);
  if (uNativeBeam > 0.5) {
    // The source shutdown beam is raster-horizontal: four bright rows, an undershoot
    // at either edge, then the phosphor/reconstruction halo.
    float yy = abs(p.y - 540.0);
    float span = 1.0 - smoothstep(-0.5, 0.8, bx);
    float core = (1.0 - smoothstep(1.9,2.1,yy)) * span;
    float halo = (0.03 * exp(-0.5*pow(yy/8.0,2.0))
                + 0.06 * exp(-0.5*pow((yy-3.5)/1.0,2.0)))
                * exp(-0.5*pow(max(bx,0.0)/6.0,2.0));
    float ring = 0.12 * exp(-0.5*pow((yy-2.5)/0.22,2.0)) * span;
    beam = vec3(uBeam.x * (core + halo - ring));
  }
  if (uPointShape.w >= 0.0) {
    // Retained native 6x4 point. Geometry and emission are continuous scalar curves.
    vec2 d = abs(p-vec2(uPointShape.x,540.0));
    vec2 coverage = clamp(uPointShape.yz*.5+.5-d,0.0,1.0);
    vec2 outer = clamp(uPointShape.yz*.5+1.5-d,0.0,1.0);
    float core = coverage.x*coverage.y;
    float ring = outer.x*outer.y-core;
    float halo = exp(-.5*dot(d,d)/16.0);
    beam = vec3(uPointShape.w*core-uPointHalo.x*ring+uPointHalo.y*halo);
  }

  // (intro only) residual warm-up glow outside the opening picture: the intro's background gradient
  float rg = length(c - vec2(560.0, 230.0)) / 1500.0;
  float bgl = (rg < 0.5 ? mix(9.0, 5.0, rg / 0.5) : mix(5.0, 3.0, clamp((rg - 0.5) / 0.5, 0.0, 1.0))) / 255.0;
  float scan0 = 1.0 - uScanDepth * (0.5 - 0.5 * cos(6.2831853 * ph));
  vec2 e0 = min(c, RES - c);
  float inPic = clamp(min(e0.x, e0.y) / 0.7 + 0.5, 0.0, 1.0);
  vec3 resid = vec3(uResid * bgl * exp(-max(0.0, c.y - 90.0) / 700.0) * uGain * scan0 * mask) * inPic * (1.0 - inImg);
  vec3 inside = glass + pic * inImg + resid + beam;
  vec3 outc = mix(bezel, inside, glassMask);
  o = vec4(clamp(outc, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'));
  return sh;
}
export function program(gl, fs, vs = VS) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(p, i);
    u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  return { p, u };
}
export function target(gl, w, h, filter = gl.LINEAR) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { tex, fb, w, h };
}

export function createCRT(root, env) {
  const { canvas } = env.canvas(root, { context: null });
  const gl = canvas.getContext('webgl2', { antialias: false, premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: false });
  if (!gl) throw new Error('WebGL2 unavailable');
  const W = 1920, H = 1080;
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const P = {
    blit: program(gl, FS_BLIT), down: program(gl, FS_DOWN), blur: program(gl, FS_BLUR), crt: program(gl, FS_CRT),
  };
  // content is rendered y-down: we render with a flipped viewport convention by drawing
  // quads whose texcoords put row 0 at the top. FBO textures therefore store row 0 = top.
  const content = target(gl, W, H);
  const q4a = target(gl, W / 4, H / 4), q4b = target(gl, W / 4, H / 4);
  const q8a = target(gl, W / 8, H / 8), q8b = target(gl, W / 8, H / 8);
  const upload = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, upload);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const draw = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  function bindTarget(t) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, t ? t.fb : null);
    gl.viewport(0, 0, t ? t.w : W, t ? t.h : H);
  }
  function tex(unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }

  // In every FBO we keep "row 0 = top of the picture". A full-screen pass writes gl_FragCoord.y=0
  // at the texture's row 0, so a pass that samples a top-first texture at vUv (y up) must flip.
  function blitTex(t, flip, inkGain=1) {
    gl.useProgram(P.blit.p);
    tex(0, t);
    gl.uniform1i(P.blit.u.uTex, 0);
    gl.uniform1f(P.blit.u.uFlip, flip ? 1 : 0);
    gl.uniform1f(P.blit.u.uInkGain, inkGain);
    draw();
  }

  return {
    gl, canvas, W, H, content, draw, bindTarget, tex, program: (fs) => program(gl, fs),
    beginContent(r = 0, g = 0, b = 0) {
      bindTarget(content);
      gl.disable(gl.BLEND);
      gl.clearColor(r, g, b, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    // Composite a 2D canvas (top-first rows) over the content FBO with premultiplied alpha.
    drawCanvas(c2d, options = {}) {
      gl.bindTexture(gl.TEXTURE_2D, upload);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c2d);
      bindTarget(content);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      // canvas row 0 (top) is texture row 0; FBO row 0 must be the top too -> no flip
      blitTex(upload, false, options.inkGain ?? 1);
      gl.disable(gl.BLEND);
    },
    present(o = {}) {
      const sx = o.sx ?? 1, sy = o.sy ?? 1;
      gl.disable(gl.BLEND);
      // bloom chain on the content
      gl.useProgram(P.down.p);
      bindTarget(q4a); tex(0, content.tex); gl.uniform1i(P.down.u.uTex, 0); gl.uniform2f(P.down.u.uTexel, 1 / W, 1 / H);
      gl.uniform1f(P.down.u.uThresh, o.bloomThresh ?? 0.45); draw();
      gl.useProgram(P.blur.p); gl.uniform1i(P.blur.u.uTex, 0);
      const sigA = o.bloomSigmaA ?? 1.2, sigB = o.bloomSigmaB ?? 2.2;
      bindTarget(q4b); tex(0, q4a.tex); gl.uniform2f(P.blur.u.uDir, 4 / W, 0); gl.uniform1f(P.blur.u.uSigma, sigA); draw();
      bindTarget(q4a); tex(0, q4b.tex); gl.uniform2f(P.blur.u.uDir, 0, 4 / H); draw();
      gl.useProgram(P.down.p);
      bindTarget(q8a); tex(0, q4a.tex); gl.uniform1i(P.down.u.uTex, 0); gl.uniform2f(P.down.u.uTexel, 4 / W * 0.5, 4 / H * 0.5);
      gl.uniform1f(P.down.u.uThresh, 0.0); draw();
      gl.useProgram(P.blur.p);
      bindTarget(q8b); tex(0, q8a.tex); gl.uniform2f(P.blur.u.uDir, 8 / W, 0); gl.uniform1f(P.blur.u.uSigma, sigB); draw();
      bindTarget(q8a); tex(0, q8b.tex); gl.uniform2f(P.blur.u.uDir, 0, 8 / H); draw();

      bindTarget(null);
      gl.useProgram(P.crt.p);
      const u = P.crt.u;
      tex(0, content.tex); gl.uniform1i(u.uContent, 0);
      tex(1, q4a.tex); gl.uniform1i(u.uBloomA, 1);
      tex(2, q8a.tex); gl.uniform1i(u.uBloomB, 2);
      gl.uniform2f(u.uSquash, Math.max(sx, 1e-4), Math.max(sy, 1e-4));
      gl.uniform1f(u.uGain, o.gain ?? 1.3);
      gl.uniform1f(u.uLit, o.lit ?? 1);
      gl.uniform4f(u.uBeam, o.beam ?? 0, o.beamHalfW ?? 0, o.beamThick ?? 4, o.beamGlow ?? 0.25);
      gl.uniform1f(u.uNativeBeam, o.nativeBeam ? 1 : 0);
      const point=o.nativePoint;
      gl.uniform4f(u.uPointShape,point?.[0]??960,point?.[1]??0,point?.[2]??0,point?.[3]??-1);
      gl.uniform2f(u.uPointHalo,point?.[4]??0,point?.[5]??0);
      gl.uniform2f(u.uBloomAmt, o.bloomA ?? 0.35, o.bloomB ?? 0.25);
      gl.uniform1f(u.uScanDepth, o.scanDepth ?? 0.42825);
      gl.uniform1f(u.uMaskDepth, o.maskDepth ?? 0.11175);
      gl.uniform1f(u.uAberr, o.aberr ?? 0.6);
      gl.uniform1f(u.uResid, o.resid ?? 0);
      const blackLift=o.blackLift??0,blackTint=o.blackTint??[1,1,1];
      gl.uniform3f(u.uBlackLift,blackLift*blackTint[0],blackLift*blackTint[1],blackLift*blackTint[2]);
      draw();
      tex(0, null); tex(1, null); tex(2, null);
      gl.activeTexture(gl.TEXTURE0);
    },
  };
}
