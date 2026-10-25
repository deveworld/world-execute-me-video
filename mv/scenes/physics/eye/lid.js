// Lashes from a model. Lashes grow in clumps: the roots of a clump spread along the lid and the
// tips draw together, each lash a quadratic curve. How far the lashes reach and how they lean change
// along the lid; the tables below give that for the open eye (lashes up), the closed eye (lashes
// hanging) and the lower lid, as [x, value] pairs.

// reach in px, lean in degrees (+ = tips toward the right)
const OPEN_REACH = [[700, 8], [740, 15], [820, 36], [900, 45], [1000, 55], [1100, 64], [1180, 100], [1260, 118], [1340, 122], [1420, 110], [1500, 94], [1580, 66], [1660, 52], [1700, 36], [1745, 14]];
const OPEN_LEAN = [[740, -38], [820, -30], [900, -18], [1000, -8], [1100, -3], [1200, 2], [1300, 10], [1400, 13], [1500, 13], [1580, 21], [1640, 31], [1700, 47]];
const CLOSED_REACH = [[740, 16], [820, 28], [900, 42], [1000, 50], [1100, 58], [1180, 72], [1300, 80], [1420, 72], [1540, 62], [1620, 48], [1680, 36], [1720, 22]];
const CLOSED_LEAN = [[740, -45], [820, -30], [900, -26], [980, -12], [1050, 0], [1150, 4], [1250, 10], [1350, 15], [1450, 26], [1550, 27], [1600, 33], [1650, 45], [1700, 54]];
const LOWER_REACH = [[880, 6], [1000, 10], [1250, 14], [1500, 11], [1650, 6]];
const LOWER_LEAN = [[880, -40], [1100, -15], [1300, 5], [1500, 25], [1650, 40]];

const DEG = Math.PI / 180;
const table = (k) => (x) => {
  if (x <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) if (x <= k[i][0]) return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * (x - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
  return k[k.length - 1][1];
};
// gather: how much of the root spread is left at the tips (0 = the tips meet);
// pinch > 0 bows the lashes in toward the clump's axis (concave sides),
// pinch 0 lets them leave the lid between its normal and the clump direction (soft fans)
const SHAPES = {
  open: { reach: table(OPEN_REACH), lean: table(OPEN_LEAN), gather: 0.4, pinch: 0.1 },
  closed: { reach: table(CLOSED_REACH), lean: table(CLOSED_LEAN), gather: 0.5, pinch: 0 },
  lower: { reach: table(LOWER_REACH), lean: table(LOWER_LEAN), gather: 0.3, pinch: 0 },
};

// clumps between x0 and x1: { lashes: [{ x, f, jit, a }], len, lean }
function clumps(rng, x0, x1, { size, pitch, gap, len, skew = 1, f, a = 0.55, a1 = 0.95 }) {
  const out = [];
  for (let x = x0 + rng() * gap; x < x1;) {
    const n = size[0] + Math.floor(rng() * (size[1] - size[0] + 1)), lashes = [];
    for (let i = 0; i < n && x < x1; i++, x += pitch * (0.7 + 0.6 * rng())) {
      lashes.push({ x, f: f + (1 - f) * rng(), jit: (rng() - 0.5) * 4, a: a + (a1 - a) * rng() });
    }
    out.push({ lashes, len: len + (1 - len) * rng() ** skew, lean: (rng() - 0.5) * 12 * DEG });
    x += gap * (0.3 + rng());
  }
  return out;
}

// open: a dense fringe of long fine lashes in loose groups; closed: wider fans of hanging lashes;
// lower: a few short lashes
export function makeLashes(rng) {
  return {
    open: clumps(rng, 735, 1725, { size: [2, 6], pitch: 3.6, gap: 6, len: 0.45, skew: 0.8, f: 0.55, a: 0.4, a1: 0.9 }),
    closed: clumps(rng, 735, 1725, { size: [3, 8], pitch: 4, gap: 4, len: 0.55, f: 0.5 }),
    lower: clumps(rng, 885, 1650, { size: [1, 3], pitch: 9, gap: 14, len: 0.6, f: 0.6 }),
  };
}

// Draw lash clumps on a lid. yAt(x) is the lid, dir +1 hangs the lashes below it and -1 raises them.
// shape picks the reach/lean tables, len scales the reach; ticks marks the roots across the lid line.
export function drawLashes(g, lashes, yAt, { dir, shape, len = 1, ticks = false, alpha = 1 }) {
  const { reach, lean, gather, pinch } = SHAPES[shape];
  const normal = (x) => {
    const s = (yAt(x + 4) - yAt(x - 4)) / 8, l = Math.hypot(1, s);
    return [-s / l * dir, 1 / l * dir];
  };
  g.lineCap = 'round';
  g.lineWidth = 0.75;
  for (const c of lashes[shape]) {
    const xc = (c.lashes[0].x + c.lashes[c.lashes.length - 1].x) / 2;
    const ang = lean(xc) * DEG + c.lean, vx = Math.sin(ang), vy = Math.cos(ang) * dir;
    const L = reach(xc) * c.len * len / Math.cos(ang);
    const tx = xc + vx * L, ty = yAt(xc) + vy * L;
    for (const l of c.lashes) {
      const rx = l.x, ry = yAt(rx), [nx, ny] = normal(rx);
      const ex = rx + (tx + (rx - xc) * gather + l.jit - rx) * l.f, ey = ry + (ty - ry) * l.f;
      let qx, qy;
      if (pinch) {
        qx = (rx + ex) / 2 + (xc - rx) * pinch;
        qy = (ry + ey) / 2 + (yAt(xc) - ry) * pinch;
      } else {
        const d = Math.hypot(ex - rx, ey - ry) * 0.5, ql = Math.hypot(nx + vx, ny + vy) || 1;
        qx = rx + (nx + vx) / ql * d;
        qy = ry + (ny + vy) / ql * d;
      }
      g.strokeStyle = `rgba(232,232,242,${l.a * alpha})`;
      g.beginPath();
      g.moveTo(rx, ry);
      g.quadraticCurveTo(qx, qy, ex, ey);
      if (ticks) { g.moveTo(rx - nx * 3.5, ry - ny * 3.5); g.lineTo(rx + nx * 3, ry + ny * 3); }
      g.stroke();
    }
  }
}
