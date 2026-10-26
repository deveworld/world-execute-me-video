// A two-hidden-layer tanh network. Training snapshots are built once, in a
// deterministic order, so seeking never advances or rewinds an optimizer.
export const WIDTH = 24;
export const HEART_FEATURES = new Set([10, 11, 20, 21, 22, 23]);

export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function features(x, y, out = new Float64Array(WIDTH)) {
  out[0] = x / Math.PI;
  out[1] = y / Math.PI;
  let i = 2;
  for (const [v, frequencies] of [[x, [1, 2, 4, 8, 16]], [y, [1, 2, 4, 8, 16, 24]]]) {
    for (const f of frequencies) {
      out[i++] = Math.sin(f * v);
      out[i++] = Math.cos(f * v);
    }
  }
  return out;
}

const matrix = () => new Float64Array(WIDTH * WIDTH);
const vector = () => new Float64Array(WIDTH);
export function initialize(seed, heart) {
  const rng = random(seed), W1 = matrix(), W2 = matrix(), W3 = vector();
  for (let j = 0; j < WIDTH; j++) {
    for (let i = 0; i < WIDTH; i++) {
      const w = (rng() * 2 - 1) * (i < 2 ? 1.4 : heart ? 0.56 : 0.5);
      W1[j * WIDTH + i] = heart && HEART_FEATURES.has(i) ? 0 : w;
    }
  }
  for (let i = 0; i < W2.length; i++) W2[i] = rng() - 0.5;
  for (let i = 0; i < WIDTH; i++) W3[i] = (rng() - 0.5) * 0.012;
  return { W1, W2, W3, B1: vector().fill(0.1), B2: vector().fill(0.1), B3: heart ? 0.35 : 0.52 };
}

export function evaluate(net, input, a1 = vector(), a2 = vector()) {
  for (let j = 0; j < WIDTH; j++) {
    let s = net.B1[j];
    const base = j * WIDTH;
    for (let i = 0; i < WIDTH; i++) s += net.W1[base + i] * input[i];
    a1[j] = Math.tanh(s);
  }
  for (let j = 0; j < WIDTH; j++) {
    let s = net.B2[j];
    const base = j * WIDTH;
    for (let i = 0; i < WIDTH; i++) s += net.W2[base + i] * a1[i];
    a2[j] = Math.tanh(s);
  }
  let s = net.B3;
  for (let i = 0; i < WIDTH; i++) s += net.W3[i] * a2[i];
  return Math.tanh(s);
}

const copy = net => Object.fromEntries(Object.entries(net).map(([k, v]) => [k, typeof v === 'number' ? v : v.slice()]));

// Stratified points cover both datasets, including the small counters in the
// type. Label polarity matches the playground's orange foreground.
export function dataset(label, count, seed, noise = 0) {
  const rng = random(seed), labelRng = random(seed ^ 0x9e3779b9);
  const side = Math.ceil(Math.sqrt(count)), data = [];
  for (let i = 0; i < count; i++) {
    const u = ((i % side) + rng()) / side, v = (Math.floor(i / side) + rng()) / side;
    const target = label(u, v) ? -1 : 1;
    data.push({ input: features((u * 2 - 1) * Math.PI, (1 - v * 2) * Math.PI),
      target: labelRng() < noise ? -target : target });
  }
  return data;
}

export function train(data, { seed, heart = false, epochs, rate = 0.05, passes = 1, warmup = 3, refine = false }) {
  const net = initialize(seed, heart), rng = random(seed + 401), snapshots = [];
  const a1 = vector(), a2 = vector(), d1 = vector(), d2 = vector();
  const g1 = matrix(), g2 = matrix(), g3 = vector(), gb1 = vector(), gb2 = vector();
  const order = Array.from({ length: data.length }, (_, i) => i), batchSize = 10;
  function snapshot() {
    let loss = 0;
    for (const point of data) {
      const d = evaluate(net, point.input, a1, a2) - point.target;
      loss += d * d * 0.5;
    }
    snapshots.push({ ...copy(net), loss: loss / data.length });
  }
  snapshot();
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Thresholding starts a longer refinement pass; subsequent epochs maintain
    // the boundary with fewer updates.
    const epochPasses = passes + (refine ? (epoch === 3 ? 14 : epoch >= 4 ? 4 : 0) : 0);
    for (let pass = 0; pass < epochPasses; pass++) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1)), a = order[i];
        order[i] = order[j]; order[j] = a;
      }
      for (let start = 0; start < order.length; start += batchSize) {
        g1.fill(0); g2.fill(0); g3.fill(0); gb1.fill(0); gb2.fill(0);
        let gb3 = 0;
        const end = Math.min(order.length, start + batchSize);
        for (let n = start; n < end; n++) {
          const point = data[order[n]], y = evaluate(net, point.input, a1, a2);
          const d3 = (y - point.target) * (1 - y * y);
          gb3 += d3;
          for (let j = 0; j < WIDTH; j++) {
            g3[j] += d3 * a2[j];
            d2[j] = d3 * net.W3[j] * (1 - a2[j] * a2[j]);
            gb2[j] += d2[j];
          }
          for (let i = 0; i < WIDTH; i++) {
            let sum = 0;
            for (let j = 0; j < WIDTH; j++) {
              const k = j * WIDTH + i;
              sum += net.W2[k] * d2[j];
              g2[k] += d2[j] * a1[i];
            }
            d1[i] = sum * (1 - a1[i] * a1[i]);
            gb1[i] += d1[i];
            for (let j = 0; j < WIDTH; j++) g1[i * WIDTH + j] += d1[i] * point.input[j];
          }
        }
        const learningRate = 0.001 + rate / (1 + Math.exp(-(epoch - warmup) * 1.8));
        const step = learningRate / (end - start);
        for (let i = 0; i < g1.length; i++) {
          // Disabled inputs stay disconnected throughout the first run.
          if (!heart || !HEART_FEATURES.has(i % WIDTH)) net.W1[i] -= step * g1[i];
          net.W2[i] -= step * g2[i];
        }
        for (let i = 0; i < WIDTH; i++) {
          net.W3[i] -= step * g3[i]; net.B1[i] -= step * gb1[i]; net.B2[i] -= step * gb2[i];
        }
        net.B3 -= step * gb3;
      }
    }
    snapshot();
  }
  return snapshots;
}
