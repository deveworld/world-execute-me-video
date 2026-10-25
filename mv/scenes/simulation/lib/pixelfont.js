// Tiny bitmap font read off the reference frames (3-wide glyphs, 5-row caps, 4-row x-height,
// 1-row descender, 'i' dot one row above cap height). Rows are listed from row -1 (i-dot row)
// to row 5 (descender row); '#' = lit pixel.
const G = {
  T: ['...', '###', '.#.', '.#.', '.#.', '.#.', '...'],
  h: ['...', '#..', '##.', '#.#', '#.#', '#.#', '...'],
  e: ['...', '...', '.#.', '###', '#..', '.##', '...'],
  n: ['...', '...', '##.', '#.#', '#.#', '#.#', '...'],
  I: ['.', '#', '#', '#', '#', '#', '.'],
  c: ['...', '...', '.##', '#..', '#..', '.##', '...'],
  a: ['...', '...', '.##', '#.#', '#.#', '.##', '...'],
  b: ['...', '#..', '##.', '#.#', '#.#', '##.', '...'],
  y: ['...', '...', '#.#', '#.#', '#.#', '.#.', '#..'],
  o: ['...', '...', '.#.', '#.#', '#.#', '.#.', '...'],
  u: ['...', '...', '#.#', '#.#', '#.#', '.##', '...'],
  r: ['..', '..', '##', '#.', '#.', '#.', '..'],
  l: ['.', '#', '#', '#', '#', '#', '.'],
  S: ['....', '.###', '#...', '.##.', '...#', '###.', '....'],
  t: ['..', '#.', '##', '#.', '#.', '.#', '..'],
  i: ['#', '.', '#', '#', '#', '#', '.'],
  s: ['...', '...', '.##', '##.', '..#', '##.', '...'],
  f: ['..', '.#', '#.', '##', '#.', '#.', '..'],
  N: ['....', '#..#', '##.#', '#.##', '#..#', '#..#', '....'],
  E: ['....', '####', '#...', '###.', '#...', '####', '....'],
  X: ['...', '#.#', '#.#', '.#.', '#.#', '#.#', '...'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

// Lit cells of `text` as [col, row] (row 0 = cap height, -1 = i-dot row), plus the glyph index of each cell.
export function layout(text) {
  const cells = [];
  let x = 0;
  [...text].forEach((ch, gi) => {
    const g = G[ch];
    if (!g) throw new Error(`pixelfont: no glyph for "${ch}"`);
    const w = g[0].length;
    g.forEach((row, r) => {
      for (let c = 0; c < w; c++) if (row[c] === '#') cells.push([x + c, r - 1, gi]);
    });
    x += w + 1;
  });
  return { cells, width: x - 1 };
}

export function drawPixelText(ctx, text, x0, y0, unit, color) {
  ctx.fillStyle = color;
  for (const [c, r] of layout(text).cells) ctx.fillRect(x0 + c * unit, y0 + r * unit, unit, unit);
}
