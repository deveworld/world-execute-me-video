import { MERGE, TAU, binary, phase, radius, clamp, mix, smooth } from './dynamics.js';

// Invert the integrated orbital frequency to find when a trail point was emitted.
function timeAtPhase(a) {
  let tau = Math.max(0.00001, (a + 34.59361) / 14.663213) ** (1 / 0.6223055);
  for (let i = 0; i < 2; i++) {
    const error = 14.663213 * tau ** 0.6223055 + 0.05534 * tau - 34.59361 - a;
    tau = Math.max(0.00001, tau - error / (9.12524 * tau ** -0.3776945 + 0.05534));
  }
  return 58.82363 - tau;
}

export function drawTrails(ctx, t, pair) {
  const post = t >= MERGE;
  const clock = post ? MERGE - 0.003 : t;
  const head = post ? binary(clock) : pair;
  const growth = smooth((clock - 56.38) / 0.57);
  const span = mix(2.05, 8.5, growth);
  const steps = Math.ceil(span / 0.025);
  const bins = Array.from({ length: 32 }, () => new Path2D());
  for (let arm = 0; arm < 2; arm++) {
    let prev = null;
    for (let j = 0; j <= steps; j++) {
      const lag = j / steps * span;
      const emitted = timeAtPhase(phase(clock) + lag);
      const a = head.a + arm * Math.PI + lag;
      let r = radius(emitted);
      // The older, wider orbit is sheared by the rotating near-field well.
      r -= 0.12 * head.r * Math.sin(head.a + arm * Math.PI) *
        Math.sin(2.5 * lag) * Math.exp(-lag / 3);
      const old = binary(emitted);
      let x = head.cx + r * Math.cos(a);
      let y = head.cy + 0.52 * r * Math.sin(a);
      const history = 0.5 * growth;
      y += (old.cy - head.cy) * history;
      if (post) {
        const plunge = Math.exp(-lag / 0.35);
        x = mix(x, 1180, plunge);
        y = mix(y, 655, plunge);
      }
      const longFade = Math.exp(-0.22 * Math.max(0, lag - 1.6)) *
        (1 - smooth((lag - span + 1.7) / 1.7));
      const fade = mix(Math.max(0, 1 - lag / span), longFade, growth);
      const settle = post ? Math.exp(-(t - MERGE) * (0.9 + 0.8 * Math.exp(-lag))) : 1;
      const alpha = fade * settle;
      const q = clamp(Math.round(alpha * 31), 0, 31);
      if (prev && q) { bins[q].moveTo(...prev); bins[q].lineTo(x, y); }
      prev = [x, y];
    }
  }
  ctx.lineWidth = 1.25;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  for (let q = 1; q < bins.length; q++) {
    ctx.strokeStyle = `rgba(240,238,252,${q / 31})`;
    ctx.stroke(bins[q]);
  }
}

export function drawWave(ctx, t) {
  const dt = t - MERGE;
  if (dt <= 0) return;
  const r = 1150 * dt;
  // The radiation front rises out of the well with a critically damped response.
  const u = Math.max(0, dt - 0.00475) / 0.095;
  const y = 655 - 122.17 * (1 - (1 + u) * Math.exp(-u));
  const fade = clamp((dt - 0.258) / 0.15);
  const alpha = (1 - fade ** 1.4) * (0.82 + 0.18 * Math.exp(-fade / 0.08));
  if (alpha <= 0) return;
  ctx.strokeStyle = `rgba(244,239,253,${alpha})`;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.ellipse(1180, y, r, r * 0.525, 0, 0, TAU);
  ctx.stroke();
}
