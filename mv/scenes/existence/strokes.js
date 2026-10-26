// A round pen follows short Bezier centreline strokes. Pressure changes along
// the stroke, and the completed ribbon is cached when the scene is created.
const clamp = x => Math.min(1, Math.max(0, x));
const mix = (a, b, u) => a + (b - a) * u;

function sample(d, transform) {
  const tokens = d.match(/[MLQC]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) || [];
  const points = [];
  let i = 0, p = [0, 0], command;
  const read = () => [Number(tokens[i++]), Number(tokens[i++])];
  const add = q => points.push([transform.x + q[0] * transform.sx, transform.y + q[1] * transform.sy]);
  while (i < tokens.length) {
    if (/^[MLQC]$/i.test(tokens[i])) command = tokens[i++].toUpperCase();
    if (command === 'M') { p = read(); add(p); command = 'L'; continue; }
    const a = p;
    let b, c, end;
    if (command === 'L') end = read();
    else if (command === 'Q') { b = read(); end = read(); }
    else if (command === 'C') { b = read(); c = read(); end = read(); }
    else throw new Error(`Unsupported pen command ${command}`);
    const control = [a, ...(b ? [b] : []), ...(c ? [c] : []), end];
    let length = 0;
    for (let j = 1; j < control.length; j++) length += Math.hypot((control[j][0] - control[j - 1][0]) * transform.sx, (control[j][1] - control[j - 1][1]) * transform.sy);
    const n = Math.max(2, Math.ceil(length / 2));
    for (let j = 1; j <= n; j++) {
      const u = j / n, v = 1 - u;
      if (command === 'L') add([mix(a[0], end[0], u), mix(a[1], end[1], u)]);
      else if (command === 'Q') add([v * v * a[0] + 2 * v * u * b[0] + u * u * end[0], v * v * a[1] + 2 * v * u * b[1] + u * u * end[1]]);
      else add([v ** 3 * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u ** 3 * end[0], v ** 3 * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u ** 3 * end[1]]);
    }
    p = end;
  }
  return points;
}

function ribbon(points, lengths, total, width, pressure, fraction) {
  const stop = total * fraction, left = [], right = [];
  let tip = points[0], tipRadius = width / 2;
  for (let i = 0; i < points.length; i++) {
    let p = points[i];
    if (lengths[i] > stop) {
      const a = points[i - 1], k = (stop - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
      p = [mix(a[0], p[0], k), mix(a[1], p[1], k)];
    }
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const s = Math.min(stop, lengths[i]) / (total || 1);
    const r = width / 2 * (1 + pressure * (0.6 * Math.abs(dy / len) + 0.25 * Math.sin(s * Math.PI * 3) - 0.3));
    left.push([p[0] - dy / len * r, p[1] + dx / len * r]);
    right.push([p[0] + dy / len * r, p[1] - dx / len * r]);
    tip = p; tipRadius = r;
    if (lengths[i] >= stop) break;
  }
  const path = new Path2D();
  path.moveTo(...left[0]);
  for (let i = 1; i < left.length; i++) path.lineTo(...left[i]);
  for (let i = right.length - 1; i >= 0; i--) path.lineTo(...right[i]);
  path.closePath();
  path.moveTo(tip[0] + tipRadius, tip[1]); path.arc(...tip, tipRadius, 0, Math.PI * 2, true);
  path.moveTo(points[0][0] + width / 2, points[0][1]); path.arc(...points[0], width / 2, 0, Math.PI * 2, true);
  return path;
}

export function penStroke(d, { x = 0, y = 0, sx = 1, sy = sx, width = 3, pressure = 0.15, start = 0, duration = 1, ease = x => x } = {}) {
  const points = sample(d, { x, y, sx, sy });
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths[i] = lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  const total = lengths[lengths.length - 1], full = ribbon(points, lengths, total, width, pressure, 1);
  return {
    start, end: start + duration,
    draw(ctx, t) {
      if (t < start) return;
      const k = ease(clamp((t - start) / duration));
      ctx.fill(k >= 1 ? full : ribbon(points, lengths, total, width, pressure, k));
    },
  };
}

// Each glyph has a few pen lifts. Their durations follow their curve lengths.
export function penGlyph(paths, options) {
  const pieces = paths.split('|').map(d => d.trim()).filter(Boolean);
  const lengths = pieces.map(d => {
    const p = sample(d, { x: 0, y: 0, sx: 1, sy: 1 });
    return p.slice(1).reduce((sum, q, i) => sum + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
  });
  const total = lengths.reduce((a, b) => a + b, 0);
  let offset = 0;
  return pieces.map((d, i) => {
    const duration = options.duration * lengths[i] / total;
    const result = penStroke(d, { ...options, start: options.start + offset, duration });
    offset += duration;
    return result;
  });
}
