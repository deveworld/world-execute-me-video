const TAU = Math.PI * 2, DEG = Math.PI / 180;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => { const n = Math.hypot(...v); return v.map((x) => x / n); };
const axis = (tilt, azimuth) => [Math.sin(tilt) * Math.cos(azimuth), Math.sin(tilt) * Math.sin(azimuth), Math.cos(tilt)];

// The horizontal engraving opens out toward the viewer, with irregular ends left by the pen.
function groundRows(rng) {
  return Array.from({ length: 37 }, (_, i) => {
    const y = Math.round((702.86 + 1.101 * i) / (1 - .00607 * i)) + .5;
    const u = (y - 829) / 137;
    const half = 407 * Math.sqrt(Math.max(0, 1 - .87 * u * u));
    const cx = 1372 - .15 * (y - 829);
    const variation = .81 + .22 * rng();
    return { y, left: cx - half * variation - 22 * rng(), right: cx + half * (.82 + .24 * rng()),
      strength: i === 0 || i === 36 ? .35 : rng() < .4 ? .62 : .96 };
  });
}

function drawGround(g, rows, rng) {
  g.lineCap = 'butt';
  for (const row of rows) {
    const { y, left, right, strength } = row, span = right - left;
    const path = new Path2D();
    path.moveTo(left - 30, y); path.lineTo(right + 30, y);
    const width = .8 + .25 * rng();
    // Pale paper edges give the ground cuts the same contrast as the shadow hatch.
    for (const [color, weight] of [[255, 3.0], [0, width]]) {
      const grad = g.createLinearGradient(left - 30, y, right + 30, y);
      for (const [u, a] of [[0, 0], [.13, .38], [.32, .8], [.5, 1], [.7, .83], [.9, .32], [1, 0]]) {
        grad.addColorStop(u, `rgba(${color},${color},${color},${a * strength * (color ? .5 : 1)})`);
      }
      g.strokeStyle = grad; g.lineWidth = weight; g.stroke(path);
    }
    // A few shallow dry-ink breaks keep the long strokes from looking machine-perfect.
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (let j = 0; j < 8; j++) g.fillRect(left + span * rng(), y - .6, .4 + 1.7 * rng(), 1.2);
    g.restore();
  }
}

function ellipsePath(g, shadow) {
  g.beginPath();
  g.ellipse(shadow.cx, shadow.cy, shadow.a, shadow.b, shadow.rot, 0, TAU);
}

function drawShadow(g, rows, shadow, rng) {
  g.save();
  ellipsePath(g, shadow);
  g.clip();
  const hatch = new Path2D();
  for (let i = 0; i < rows.length - 1; i++) {
    for (const y of [rows[i].y, (rows[i].y + rows[i + 1].y) / 2]) {
      hatch.moveTo(1100, y); hatch.lineTo(1740, y);
    }
  }
  const vanishX = 2908, horizonY = -181.38;
  for (let x = 898.71; x < 1900; x += 9.1522) {
    hatch.moveTo(x, 960);
    hatch.lineTo(vanishX + (x - vanishX) * (660 - horizonY) / (960 - horizonY), 660);
  }
  // Light paper beside the cuts keeps the black hatching crisp at its intersections.
  g.strokeStyle = '#fff';
  g.lineWidth = 3.4;
  g.stroke(hatch);
  g.strokeStyle = '#000';
  g.lineWidth = .98;
  g.stroke(hatch);
  // The far end loses a little ink without turning the black strokes grey.
  g.globalCompositeOperation = 'destination-out';
  const fade = g.createLinearGradient(1300, 900, 1680, 760);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(.55, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,.06)');
  g.fillStyle = fade;
  g.fillRect(1100, 680, 700, 300);
  g.fillStyle = 'rgba(0,0,0,.12)';
  for (let i = 0; i < 900; i++) g.fillRect(1160 + rng() * 540, 720 + rng() * 230, .5 + rng(), .4);
  g.restore();
}

// The pen has a darker edge and a warm core. Width changes along each generated centreline.
function penRibbon(g, points, color, opacity, spread = 1, margin = 0) {
  if (points.length < 2) return;
  const edge = points.map((p, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, n = Math.hypot(dx, dy) || 1;
    const width = p.w * spread + margin * clamp(p.w);
    return { x: -dy / n * width * .5, y: dx / n * width * .5 };
  });
  g.beginPath();
  for (let i = 0; i < points.length; i++) {
    const p = points[i], e = edge[i];
    if (i === 0) g.moveTo(p.x + e.x, p.y + e.y);
    else g.lineTo(p.x + e.x, p.y + e.y);
  }
  for (let i = points.length - 1; i >= 0; i--) {
    const p = points[i], e = edge[i];
    g.lineTo(p.x - e.x, p.y - e.y);
  }
  g.closePath(); g.fillStyle = color; g.globalAlpha = opacity; g.fill();
}

function drawSphere(g, center, radius, light) {
  const azimuth = Math.atan2(light[1] - center[1], light[0] - center[0]);
  const lightAxis = axis(55.316 * DEG, azimuth);
  const perspective = .0916, focal = radius * Math.sqrt(1 - perspective * perspective);
  const project = (p) => [center[0] + focal * p[0] / (1 - perspective * p[2]),
    center[1] + focal * p[1] / (1 - perspective * p[2])];
  const derivative = (p, v) => {
    const d = 1 - perspective * p[2];
    return [focal * (v[0] * d + perspective * p[0] * v[2]) / (d * d),
      focal * (v[1] * d + perspective * p[1] * v[2]) / (d * d)];
  };
  const smooth = (v) => { const t = clamp(v); return t * t * (3 - 2 * t); };
  const families = [
    { normal: axis(55.46 * DEG, azimuth - .003 * DEG), spacing: .04412, phase: .012956, width: 2.2, start: 28, fade: 45 },
    { normal: axis(55.93 * DEG, azimuth + 41.856 * DEG), spacing: .05012, phase: .022361, width: 1.85, start: 50, fade: 40 },
  ];
  const ribbons = [];
  for (const family of families) {
    const A = family.normal;
    // Each level h is an equally spaced plane A dot p = h through the unit sphere.
    const B = unit([0, 0, 1].map((v, i) => v - A[2] * A[i]));
    const C = cross(A, B);
    for (let j = Math.ceil((-1 - family.phase) / family.spacing); j * family.spacing + family.phase < 1; j++) {
      const h = j * family.spacing + family.phase, r = Math.sqrt(1 - h * h);
      // The visible arc is one interval centred on the point nearest the camera.
      const visible = (perspective - h * A[2]) / (r * B[2]);
      if (visible >= 1) continue;
      const limit = Math.acos(clamp(visible, -1, 1));
      const segments = Math.max(32, Math.ceil(2 * limit * r * radius / .6));
      const points = [];
      for (let i = 0; i <= segments; i++) {
        const phi = -limit + 2 * limit * i / segments;
        const p = A.map((a, k) => h * a + r * (Math.cos(phi) * B[k] + Math.sin(phi) * C[k]));
        const angle = Math.acos(clamp(dot(p, lightAxis), -1, 1)) / DEG;
        const dh = derivative(p, A.map((a, k) => a - h / r * (Math.cos(phi) * B[k] + Math.sin(phi) * C[k])));
        const dp = derivative(p, B.map((b, k) => r * (-Math.sin(phi) * b + Math.cos(phi) * C[k])));
        const spacing = family.spacing * Math.abs(dh[0] * dp[1] - dh[1] * dp[0]) / Math.max(.01, Math.hypot(...dp));
        // Foreshortening narrows the pen, with finite coverage where the planes meet the silhouette.
        const width = family.width * smooth((angle - family.start) / family.fade) * (.08 + .92 * clamp(spacing / 7));
        const [x, y] = project(p);
        points.push({ x, y, w: width });
      }
      ribbons.push(points);
    }
  }
  g.save();
  g.beginPath(); g.arc(center[0], center[1], radius, 0, TAU); g.clip();
  // Draw every paper shoulder before the ink so neither family cuts the other at crossings.
  for (const points of ribbons) penRibbon(g, points, '#fff5e8', 1, 1, 1.5);
  // The lit silhouette keeps a hairline contour where the hatch fades into the paper.
  g.beginPath();
  g.arc(center[0], center[1], radius - .3, azimuth - Math.PI / 2, azimuth + Math.PI / 2);
  g.strokeStyle = '#a95534'; g.lineWidth = .55; g.stroke();
  for (const points of ribbons) penRibbon(g, points, '#8f4b2d', 1, 1);
  for (const points of ribbons) penRibbon(g, points, '#c26a40', 1, .7);
  g.restore();
}

export function createEngraving({ mk, rng, center, radius, light, shadow }) {
  const rows = groundRows(rng);
  const [ground, g] = mk(), [castShadow, sh] = mk(), [sphere, sp] = mk();
  drawGround(g, rows, rng);
  drawShadow(sh, rows, shadow, rng);
  drawSphere(sp, center, radius, light);
  return { ground, castShadow, sphere };
}
