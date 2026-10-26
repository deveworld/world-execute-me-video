// Horizontal rows and vertical columns of the authored grid. A set bit is a
// wall; passages and the exterior are derived from these two compact tables.
const HORIZONTAL = [123120, 449484, 25904, 739906, 443934, 1145133, 319640,
  216708, 1477419, 790988, 210852, 648570, 252664, 343356, 180456, 74704,
  51808, 22336, 14208, 2560, 1024];
const VERTICAL = [224, 1912, 7366, 8486, 18117, 33758, 73840, 136638, 108637,
  273124, 586218, 618422, 443596, 117213, 144266, 91776, 33630, 24931,
  11956, 7278, 2008, 224];
const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const cellKey = (x, y) => `${x},${y}`;
const edgeKey = (v, x, y) => `${v},${x},${y}`;
const edgeAt = (x, y, d) => d === 0 ? edgeKey(0, x, y) : d === 1 ? edgeKey(1, x + 1, y)
  : d === 2 ? edgeKey(0, x, y + 1) : edgeKey(1, x, y);

export function createWalls() {
  const walls = new Map();
  function add(v, i, j) {
    const x = 800 + 40 * i + 0.5, y = 140 + 40 * j + 0.5;
    walls.set(edgeKey(v, i, j), { v, i, j, sx: x, sy: y, ex: x + (v ? 0 : 40), ey: y + (v ? 40 : 0) });
  }
  HORIZONTAL.forEach((row, j) => { for (let i = 0; i < 21; i++) if (row & (1 << i)) add(0, i, j); });
  VERTICAL.forEach((column, i) => { for (let j = 0; j < 20; j++) if (column & (1 << j)) add(1, i, j); });

  const outside = new Set(), queue = [[-1, -1]];
  while (queue.length) {
    const [x, y] = queue.pop(), key = cellKey(x, y);
    if (x < -1 || x > 21 || y < -1 || y > 20 || outside.has(key)) continue;
    outside.add(key);
    DIRECTIONS.forEach(([dx, dy], d) => { if (!walls.has(edgeAt(x, y, d))) queue.push([x + dx, y + dy]); });
  }
  const graph = new Map();
  for (let y = 0; y < 20; y++) for (let x = 0; x < 21; x++) {
    if (outside.has(cellKey(x, y))) continue;
    graph.set(cellKey(x, y), DIRECTIONS.map(([dx, dy], d) => ({ x: x + dx, y: y + dy, d }))
      .filter(n => !outside.has(cellKey(n.x, n.y)) && !walls.has(edgeAt(x, y, n.d))));
  }
  for (const wall of walls.values()) {
    const { v, i, j } = wall;
    wall.boundary = outside.has(cellKey(v ? i - 1 : i, v ? j : j - 1)) !== outside.has(cellKey(i, j));
    wall.left = (wall.sx + wall.ex) / 2 < 1220;
  }

  // A depth-first pen visits passages, finishing short branches before it
  // continues along the long corridor. Its speed increases after the opening.
  function branchSize(key, parent) {
    return 1 + graph.get(key).filter(n => cellKey(n.x, n.y) !== parent)
      .reduce((sum, n) => sum + branchSize(cellKey(n.x, n.y), key), 0);
  }
  const seen = new Set();
  let step = 0;
  function visit(x, y, px = x, py = y) {
    const key = cellKey(x, y);
    if (seen.has(key)) return;
    seen.add(key);
    const arrival = 173.222 + 0.1954 * Math.sqrt(step + 0.1) + 0.5104 * Math.exp(-step / 30);
    for (let d = 0; d < 4; d++) {
      const wall = walls.get(edgeAt(x, y, d));
      if (!wall || wall.boundary || wall.t0 !== undefined) continue;
      const fromX = 820 + px * 40, fromY = 160 + py * 40;
      if (Math.hypot(wall.ex - fromX, wall.ey - fromY) < Math.hypot(wall.sx - fromX, wall.sy - fromY)) {
        [wall.sx, wall.ex] = [wall.ex, wall.sx]; [wall.sy, wall.ey] = [wall.ey, wall.sy];
      }
      wall.t0 = arrival - 1 / 60;
      wall.t1 = arrival;
    }
    step++;
    graph.get(key).filter(n => !seen.has(cellKey(n.x, n.y)))
      .sort((a, b) => branchSize(cellKey(a.x, a.y), key) - branchSize(cellKey(b.x, b.y), key))
      .forEach(n => visit(n.x, n.y, x, y));
  }
  visit(10, 7);
  for (const [key, time] of [['1,10,7', 173.7], ['0,10,7', 173.758], ['1,11,7', 173.817],
    ['0,9,7', 174.65], ['0,11,7', 175.533]]) {
    const wall = walls.get(key); wall.t0 = time - 1 / 60; wall.t1 = time;
  }

  // The heart closes with two pens following opposite directions around the
  // exterior, starting at the notch and meeting at the bottom.
  const boundary = [...walls.values()].filter(w => w.boundary);
  for (const side of [-1, 1]) {
    let x = side < 0 ? 10 : 11, y = 2, distance = 0.5;
    const used = new Set();
    while (true) {
      const wall = boundary.find(w => !used.has(w) && !(w.v === 0 && w.i === 10 && (w.j === 2 || w.j === 20)) &&
        (side < 0 ? w.i < 10.5 : w.i > 10) &&
        ((w.i === x && w.j === y) || (w.i + (w.v ? 0 : 1) === x && w.j + (w.v ? 1 : 0) === y)));
      if (!wall) break;
      used.add(wall);
      if (wall.i !== x || wall.j !== y) {
        [wall.sx, wall.ex] = [wall.ex, wall.sx]; [wall.sy, wall.ey] = [wall.ey, wall.sy];
      }
      wall.t0 = 176.524 + distance * 0.0096;
      distance += 1;
      wall.t1 = 176.524 + distance * 0.0096;
      x = Math.round((wall.ex - 800.5) / 40); y = Math.round((wall.ey - 140.5) / 40);
    }
  }
  for (const [key, time] of [['0,10,2', 176.533], ['0,10,20', 176.95]]) {
    const wall = walls.get(key); wall.t0 = time - 0.012; wall.t1 = time;
  }
  return [...walls.values()];
}
