// A round technical pen follows open centreline paths in writing order.
const GLYPHS = {
  S: [[36, 1, 'C', 23, -2, 6, 4, 4, 13, 'C', 3, 18, 25, 23, 35, 29, 'C', 48, 39, 13, 57, 1, 44]],
  W: [[0, 1, 'L', 18, 44, 34, 10, 54, 44, 64, 2]],
  I: [[0, 1, 'L', 0, 45]],
  T: [[0, 1, 'L', 41, 1], [18, 2, 'L', 17, 45]],
  C: [[34, 3, 'C', 18, -9, -4, 19, 1, 34, 'C', 8, 57, 28, 52, 46, 35]],
  H: [[0, 1, 'L', 1, 46], [0, 25, 'L', 29, 22], [29, 1, 'L', 29, 24, 32, 45]],
  M: [[0, 45, 'L', 8, 1, 'C', 12, 3, 21, 27, 26, 31, 'C', 31, 31, 37, 10, 44, 2, 'L', 52, 46]],
  Y: [[0, 1, 'L', 17, 21], [30, 0, 'L', 21, 20, 13, 46]],
  U: [[5, 3, 'C', 3, 14, -3, 34, 7, 42, 'C', 26, 57, 38, 29, 34, 3, 'L', 34, 46]],
  R: [[1, 2, 'C', 3, 17, 1, 30, 1, 46], [3, 3, 'C', 18, -4, 41, -2, 36, 9, 'C', 32, 15, 15, 19, 4, 21], [4, 25, 'C', 13, 27, 30, 40, 42, 47]],
  E: [[29, 1, 'L', 0, 2, 0, 30, 1, 43, 3, 45, 35, 43], [0, 26, 'L', 29, 23]],
  N: [[0, 45, 'L', 2, 3, 'C', 4, 0, 19, 23, 34, 42, 'L', 36, 0]],
  O: [[20, 0, 'C', 2, -1, -7, 29, 4, 41, 'C', 13, 53, 38, 51, 42, 36, 'C', 47, 15, 37, 1, 20, 0]],
  A: [[0, 48, 'L', 18, 2, 'C', 23, 0, 28, 28, 39, 46], [7, 31, 'L', 36, 26]],
  D: [[1, 2, 'L', 1, 43, 'C', 12, 52, 48, 30, 42, 14, 'C', 38, 2, 17, -3, 1, 2]],
};

const WORDS = [
  { text: 'SWITCH', x: [120, 171, 246, 253, 302, 360], y: 110, scale: 1, start: 44.5167, duration: .2333 },
  { text: 'MY', x: [433, 496], y: 110, scale: 1, start: 44.9, duration: .0833 },
  { text: 'CURRENT', x: [563, 618, 664, 716, 767, 813, 860], y: 110, scale: 1, start: 45.3, duration: .25 },
  { text: 'TO AC', x: [422, 449, 0, 493, 519], y: 518, scale: .53, start: 45.9333, duration: .2 },
  { text: 'TO DC', x: [892, 918, 0, 962, 989], y: 244, scale: .53, start: 46.9333, duration: .2 },
];

function flatten(data) {
  const points = [[data[0], data[1]]];
  let i = 2;
  while (i < data.length) {
    const command = data[i++];
    if (command === 'L') {
      while (i < data.length && typeof data[i] === 'number') points.push([data[i++], data[i++]]);
    } else if (command === 'C') {
      const p = points.at(-1), a = data.slice(i, i + 6); i += 6;
      for (let k = 1; k <= 20; k++) {
        const u = k / 20, v = 1 - u;
        points.push([v ** 3 * p[0] + 3 * v * v * u * a[0] + 3 * v * u * u * a[2] + u ** 3 * a[4],
          v ** 3 * p[1] + 3 * v * v * u * a[1] + 3 * v * u * u * a[3] + u ** 3 * a[5]]);
      }
    }
  }
  return points;
}

function stroke(ctx, points, length) {
  if (length <= 0) return;
  ctx.beginPath(); ctx.moveTo(...points[0]);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const u = Math.min(1, length / d);
    ctx.lineTo(a[0] + u * (b[0] - a[0]), a[1] + u * (b[1] - a[1]));
    length -= d;
    if (length <= 0) break;
  }
  ctx.stroke();
}

export function createPen() {
  const words = WORDS.map(word => {
    const paths = [];
    for (let i = 0; i < word.text.length; i++) {
      for (const data of GLYPHS[word.text[i]] || []) {
        const points = flatten(data).map(([x, y]) => [word.x[i] + x * word.scale, word.y + y * word.scale]);
        let length = 0;
        for (let k = 1; k < points.length; k++) length += Math.hypot(points[k][0] - points[k - 1][0], points[k][1] - points[k - 1][1]);
        paths.push({ points, length });
      }
    }
    return { ...word, paths, length: paths.reduce((n, p) => n + p.length + 4 * word.scale, 0) };
  });
  return (ctx, t) => {
    ctx.save();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const word of words) {
      let remaining = Math.max(0, Math.min(1, (t - word.start) / word.duration)) * word.length;
      for (const path of word.paths) {
        stroke(ctx, path.points, remaining);
        remaining -= path.length + 4 * word.scale;
      }
    }
    ctx.restore();
  };
}

export function drawTerminals(ctx, ac, dc) {
  ctx.save(); ctx.lineWidth = 2; ctx.lineCap = 'round';
  ctx.strokeStyle = ac;
  for (const x of [530, 1135]) {
    ctx.beginPath(); ctx.moveTo(x, 561);
    ctx.bezierCurveTo(x + 4, 552, x + 8, 567, x + 14, 558); ctx.stroke();
  }
  ctx.strokeStyle = dc;
  ctx.beginPath(); ctx.moveTo(855, 260); ctx.lineTo(871, 257);
  ctx.moveTo(862, 252); ctx.lineTo(863, 267);
  ctx.moveTo(855, 900); ctx.lineTo(871, 898); ctx.stroke();
  ctx.restore();
}
