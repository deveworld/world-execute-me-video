const clamp = x => Math.max(0, Math.min(1, x));
const smooth = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const mix = (a, b, x) => a + (b - a) * x;
// Ordered thresholds keep partial glyphs evenly interlaced rather than revealing whole rows.
const ORDER = [[12, 5, 15, 7], [2, 10, 0, 8], [14, 6, 13, 4], [1, 9, 3, 11]];
const hash = (x, y, seed = 0) => {
  let n = Math.imul(x + 11, 374761393) ^ Math.imul(y + 23, 668265263) ^ Math.imul(seed + 1, 1442695041);
  n = Math.imul(n ^ n >>> 13, 1274126177);
  return ((n ^ n >>> 16) >>> 0) / 4294967296;
};

// Rasterise real type once, then use its ink to populate the plot's regular dot grid.
function glyphDots(letter, cols, x0, threshold) {
  const ink = new OffscreenCanvas(800, 800), pen = ink.getContext('2d', { willReadFrequently: true });
  pen.font = '700 600px "Red Hat Mono"';pen.fillStyle = '#fff';pen.fillText(letter, 100, 700);
  const raw = pen.getImageData(0, 0, 800, 800).data;
  let xMin = 800, xMax = 0, yMin = 800, yMax = 0;
  for (let y = 0; y < 800; y++) for (let x = 0; x < 800; x++) if (raw[(y * 800 + x) * 4 + 3] > 80) {
    xMin = Math.min(xMin, x);xMax = Math.max(xMax, x);yMin = Math.min(yMin, y);yMax = Math.max(yMax, y);
  }
  const canvas = new OffscreenCanvas(380, 460), ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(ink, xMin, yMin, xMax - xMin + 1, yMax - yMin + 1, 10, 10, (cols - 1) * 14 + 3, 29 * 14 + 3);
  const pixels = ctx.getImageData(0, 0, 380, 460).data, dots = [];
  for (let row = 0; row < 30; row++) for (let col = 0; col < cols; col++) {
    if (pixels[((11 + row * 14) * 380 + 11 + col * 14) * 4 + 3] > threshold) {
      dots.push({ x: x0 + col * 14, y: 464.5 + row * 14, col, row });
    }
  }
  return dots;
}

export function createParticles() {
  const source = glyphDots('F', 20, 518.5, 1);
  const destination = glyphDots('M', 22, 1134.5, 160);
  const rightEdge = Array.from({ length: 30 }, (_, row) =>
    Math.max(...source.filter(p => p.row === row).map(p => p.x)));
  for (const p of source) {
    const phase = ORDER[p.row % 4][p.col % 4], group = Math.floor(phase / 4), r = hash(p.col, p.row);
    p.group = group;
    p.birth = 90.375 + phase / 16 * .205;
    p.release = 90.682 + group * (30 / 130) + .123 * r + .045 * hash(p.col, p.row, 4) ** 8;
  }
  // Spread each pulse across the waist while preserving the source's vertical order.
  for (let group = 0; group < 4; group++) {
    const pulse = source.filter(p => p.group === group).sort((a, b) => a.row - b.row || b.col - a.col);
    const lanes = Math.ceil(pulse.length / 3);
    for (let i = 0; i < pulse.length; i++) {
      const p = pulse[i], lane = Math.floor(i / 3) / (lanes - 1);
      const row = Math.round(lane * 29);
      p.flowY = mix(464.5, 870.5, lane);
      p.edge = rightEdge[row] - 42;
      p.waistY = mix(588, 742, lane);
      p.exitY = mix(464.5, 870.5, lane);
      p.speed = 2300;
      const phase = 88 * (hash(Math.floor(i / 3), group, 8) - .5);
      const front = 918 + 120 * (.5 - lane) + 88 * (i % 3 - 1) + phase + 7 * (hash(p.col, p.row, 2) - .5);
      p.launch = 90.85 + group * (30 / 130) + (p.x - front) / p.speed;
      p.duration = (1120 - p.x) / p.speed;
      p.pulseStart = 90.69 + group * (30 / 130);
    }
  }
  for (const p of destination) {
    const phase = ORDER[p.row % 4][p.col % 4];
    p.birth = phase < 13 ? 91.30 + phase * .0129 : 91.645 + (phase - 13) * .0167;
    p.birth += .020 * hash(p.col, p.row, 7);
  }

  const position = (p, age) => {
    const x = p.x + p.speed * Math.max(0, Math.min(p.duration, age));
    // Rows share a horizontal tangent at the waist, so their trails stay in lanes.
    const waist = 955;
    const y = x < waist
      ? mix(p.flowY, p.waistY, smooth((x - p.edge) / (waist - p.edge)))
      : mix(p.waistY, p.exitY, clamp((x - waist) / (1108 - waist)) ** 2);
    return [x, y];
  };
  const circle = (ctx, x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); };

  return {
    render(ctx, t) {
      if (t < 90.365) return 0;
      ctx.save();
      // The landing grid becomes visible before the dark destination dots arrive.
      ctx.fillStyle = '#a4a2ab';ctx.beginPath();
      const preview = smooth((t - 91.255) / .075);
      for (const p of destination) {
        const a = preview * (1 - smooth((t - p.birth) / .043));
        if (a > .01) circle(ctx, p.x, p.y, 1.45 * Math.sqrt(a));
      }
      ctx.fill();ctx.fillStyle = '#222124';ctx.beginPath();
      for (const p of source) {
        const a = smooth((t - p.birth) / .025) * (1 - smooth((t - p.release + .014) / .028));
        if (a > .01) circle(ctx, p.x, p.y, 3.07 * Math.sqrt(a));
      }
      for (const p of destination) {
        const a = smooth((t - p.birth) / .043);
        if (a > .01) circle(ctx, p.x, p.y, 3.07 * Math.sqrt(a));
      }
      ctx.fill();
      let flying = 0;const particles = [];
      ctx.lineCap = 'round';ctx.lineJoin = 'round';ctx.lineWidth = .8;
      for (const p of source) {
        const age = t - p.launch;
        if (age < 0 || age > p.duration + .07 || t < p.pulseStart) continue;
        if (age < p.duration) flying++;
        const at = position(p, age);
        const pulse = smooth((t - p.pulseStart) / .045);
        const a = pulse * smooth(age / .022) * (1 - smooth((at[0] - 1100) / 20));
        const radius = 4.15 * Math.sqrt(a) * mix(.38, 1, smooth((at[0] - p.edge) / 45));
        particles.push([at[0], at[1], radius]);
        const trail = pulse * smooth(age / .035) * (1 - smooth((age - p.duration) / .07));
        // Filaments follow the same flow as the heads and linger briefly after landing.
        ctx.strokeStyle = `rgba(90,86,170,${.035 * trail})`;ctx.beginPath();
        const end = Math.min(age, p.duration);
        const edgeAge = Math.max(0, (p.edge + 32 - p.x) / p.speed);
        const start = Math.max(edgeAge, end - .19);
        if (start < end) {
          for (let j = 0; j <= 20; j++) {
            const q = position(p, mix(start, end, j / 20));
            ctx[j ? 'lineTo' : 'moveTo'](...q);
          }
          ctx.stroke();
        }
        // Short, darker tail segments become progressively fainter with age.
        let prev = at;
        for (let j = 1; j <= 8; j++) {
          const q = position(p, Math.max(Math.min(edgeAge, end), end - j / 60));
          ctx.strokeStyle = `rgba(92,90,112,${.28 * trail * Math.exp(-(j - 1) / 3.2)})`;
          ctx.beginPath();ctx.moveTo(...prev);ctx.lineTo(...q);ctx.stroke();prev = q;
        }
      }
      ctx.fillStyle = '#6555f4';ctx.beginPath();
      for (const [x, y, r] of particles) if (r > .1) circle(ctx, x, y, r);
      ctx.fill();ctx.restore();return flying;
    },
  };
}

export function swapAt(t) {
  const beat = 30 / 130;
  const pulse = n => smooth((t - 90.679 - n * beat) / .135);
  const released = .1287 * (pulse(0) + pulse(3)) + .1176 * (pulse(1) + pulse(2));
  const landing = .4125 * smooth((t - 91.2636) / .25) + .0949 * smooth((t - 91.6) / .165);
  return clamp(released + landing);
}
