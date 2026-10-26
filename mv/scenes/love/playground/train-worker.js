// Trains the playground networks off the main thread, so creating the scene does not stall playback.
// For every training snapshot it also evaluates what the scene draws: the output on the 100×100
// heatmap grid and both hidden layers on the 24×24 neuron-preview grid.
import { WIDTH, evaluate, features, train } from './training.js';

const grid = n => Array.from({ length: n * n }, (_, p) => features(
  -Math.PI + (p % n + 0.5) * 2 * Math.PI / n,
  Math.PI - (Math.floor(p / n) + 0.5) * 2 * Math.PI / n));

self.onmessage = ({ data: jobs }) => {
  const heatmap = grid(100), preview = grid(24);
  const a1 = new Float64Array(WIDTH), a2 = new Float64Array(WIDTH);
  const transfer = [];
  const runs = jobs.map(({ inputs, targets, options }) => {
    const data = Array.from(targets, (target, i) => ({ input: inputs.subarray(i * WIDTH, (i + 1) * WIDTH), target }));
    return train(data, options).map(net => {
      const field = Float32Array.from(heatmap, input => evaluate(net, input, a1, a2));
      const l1 = new Float32Array(WIDTH * 576), l2 = new Float32Array(WIDTH * 576);
      for (let p = 0; p < 576; p++) {
        evaluate(net, preview[p], a1, a2);
        for (let j = 0; j < WIDTH; j++) { l1[j * 576 + p] = a1[j]; l2[j * 576 + p] = a2[j]; }
      }
      transfer.push(field.buffer, l1.buffer, l2.buffer);
      return { net, field, l1, l2 };
    });
  });
  self.postMessage(runs, transfer);
};
