// Time-stamped polylines (vectorised from the reference by out/existence/trace.py) drawn as a write-on.
// data = { w: width, c: color, s: [[x, y, t, x, y, t, ...], ...] }; a point is drawn once t >= its time.
export class TracedStrokes {
  constructor(data, { width, color, dotR = 0, dotHold = 0.02, tShift = 0, filter } = {}) {
    this.w = width ?? data.w;
    this.color = color ?? data.c;
    this.dotR = dotR;
    this.dotHold = dotHold;
    this.chains = [];
    for (const flat of data.s) {
      const n = flat.length / 3;
      const xs = new Float32Array(n), ys = new Float32Array(n), ts = new Float64Array(n);
      let m = -Infinity;
      for (let i = 0; i < n; i++) {
        xs[i] = flat[3 * i];
        ys[i] = flat[3 * i + 1];
        m = Math.max(m, flat[3 * i + 2] + tShift);
        ts[i] = m;
      }
      const c = { xs, ys, ts, t0: ts[0], t1: ts[n - 1] };
      if (!filter || filter(c)) this.chains.push(c);
    }
    this.chains.sort((a, b) => a.t0 - b.t0);
    this.tEnd = Math.max(...this.chains.map((c) => c.t1));
    this.tStart = Math.min(...this.chains.map((c) => c.t0));
  }

  // Draw the state at time t. `extra(ctx)` lets callers tweak style.
  draw(ctx, t, { color, width, alpha = 1 } = {}) {
    const eps = 1e-4;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color ?? this.color;
    ctx.lineWidth = width ?? this.w;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let hx = 0, hy = 0, hT = -Infinity;
    for (const c of this.chains) {
      if (c.t0 > t + eps) continue;
      const { xs, ys, ts } = c;
      let lo = 0, hi = ts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (ts[mid] <= t + eps) lo = mid; else hi = mid - 1;
      }
      ctx.moveTo(xs[0], ys[0]);
      if (lo === 0) ctx.lineTo(xs[0] + 0.01, ys[0]);
      for (let i = 1; i <= lo; i++) ctx.lineTo(xs[i], ys[i]);
      if (ts[lo] > hT) { hT = ts[lo]; hx = xs[lo]; hy = ys[lo]; }
    }
    ctx.stroke();
    if (this.dotR > 0 && hT > -Infinity && t - hT <= this.dotHold && t < this.tEnd + this.dotHold) {
      ctx.fillStyle = color ?? this.color;
      ctx.beginPath();
      ctx.arc(hx, hy, this.dotR, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export async function loadStrokes(name) {
  const res = await fetch(new URL(`./data/${name}.json`, import.meta.url));
  if (!res.ok) throw new Error(`strokes ${name}: HTTP ${res.status}`);
  return res.json();
}
