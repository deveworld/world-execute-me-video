// Character-grid terminal model + Canvas2D renderer, shared by every screen of the
// `execution` segment (htop, the CRT eras, the modern terminals).
//
//   const g = new Grid(80, 45);
//   g.put(row, col, 'text', { fg: '#fff', bg: '#00f', bold: true });
//   drawGrid(ctx, g, { x: 1018, y: 22.5, cw: 11, ch: 23, base: 18.5, font: '19px "Noto Sans Mono"' });
//
// Text is drawn in runs of equal style; ctx.letterSpacing forces the font's advance onto the
// cell width, so runs stay locked to the grid whatever the font's natural advance is.

export class Grid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    const n = cols * rows;
    this.ch = new Array(n);
    this.fg = new Array(n);
    this.bg = new Array(n);
    this.bold = new Uint8Array(n);
    this.clear();
  }

  clear(fg = null, bg = null) {
    this.ch.fill(' ');
    this.fg.fill(fg);
    this.bg.fill(bg);
    this.bold.fill(0);
    return this;
  }

  // Write `text` at (row, col). style: { fg, bg, bold }. Undefined style keys keep the cell's value.
  put(row, col, text, style = {}) {
    if (row < 0 || row >= this.rows) return col + text.length;
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
      const c = col + i;
      if (c < 0 || c >= this.cols) continue;
      const k = row * this.cols + c;
      this.ch[k] = chars[i];
      if (style.fg !== undefined) this.fg[k] = style.fg;
      if (style.bg !== undefined) this.bg[k] = style.bg;
      if (style.bold !== undefined) this.bold[k] = style.bold ? 1 : 0;
    }
    return col + chars.length;
  }

  // Right-align `text` so that its last character lands on column `endCol`.
  putR(row, endCol, text, style) {
    return this.put(row, endCol - Array.from(text).length + 1, text, style);
  }

  // Set style (not characters) over [c0, c1].
  style(row, c0, c1, style) {
    for (let c = Math.max(0, c0); c <= Math.min(this.cols - 1, c1); c++) {
      const k = row * this.cols + c;
      if (style.fg !== undefined) this.fg[k] = style.fg;
      if (style.bg !== undefined) this.bg[k] = style.bg;
      if (style.bold !== undefined) this.bold[k] = style.bold ? 1 : 0;
    }
  }
}

// opts: x, y (top-left of cell 0,0), cw, ch (cell size), base (baseline offset inside a cell),
// font (CSS font for normal text), boldFont, advance (natural advance of the font in px; when
// given, letterSpacing = cw - advance), defaultFg, rows (optional [r0, r1] subset).
export function drawGrid(ctx, g, opts) {
  const { x, y, cw, ch, base, font, boldFont = font, advance = cw, defaultFg = '#fff' } = opts;
  const r0 = opts.rows ? opts.rows[0] : 0;
  const r1 = opts.rows ? opts.rows[1] : g.rows - 1;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.letterSpacing = `${(cw - advance).toFixed(3)}px`;
  for (let r = r0; r <= r1; r++) {
    const rowOff = r * g.cols;
    // backgrounds
    let c = 0;
    while (c < g.cols) {
      const bg = g.bg[rowOff + c];
      let e = c + 1;
      while (e < g.cols && g.bg[rowOff + e] === bg) e++;
      if (bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(x + c * cw, y + r * ch, (e - c) * cw, ch);
      }
      c = e;
    }
    // text runs
    c = 0;
    while (c < g.cols) {
      const k = rowOff + c;
      const fg = g.fg[k] || defaultFg;
      const b = g.bold[k];
      let e = c + 1;
      while (e < g.cols && (g.fg[rowOff + e] || defaultFg) === fg && g.bold[rowOff + e] === b) e++;
      let s = '';
      for (let i = c; i < e; i++) s += g.ch[rowOff + i];
      if (s.trim()) {
        ctx.font = b ? boldFont : font;
        ctx.fillStyle = fg;
        ctx.fillText(s, x + c * cw, y + r * ch + base);
      }
      c = e;
    }
  }
  ctx.restore();
}

// Visible part of a typed/printed transcript: lines revealed by time.
// events: [{ t, lines: [...] }] cumulative; returns the lines visible at time t.
export function linesAt(events, t) {
  let out = [];
  for (const ev of events) if (t >= ev.t) out = ev.lines;
  return out;
}
