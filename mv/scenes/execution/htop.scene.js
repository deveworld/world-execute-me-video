// 162.683–169.9583333333 · htop (Midnight-Commander colours on blue) at the right half while the lyric
// is written at the left (lyrics.scene.js). Every number on screen was read off the original
// by OCR at each htop refresh (lib/htop_data.js); this file only re-creates the UI states:
// tagging every process (cursor climbs from `countdown` to `me`), F9 "Send signal" panel,
// SIGTERM → SIGKILL, "Sending...", zombies, everything gone but `me` + `htop`, then `me`
// spawns 7 threads and pins all 8 CPUs at 100 %.
import { Grid, drawGrid } from './lib/term.js';
import { PROCS, REFRESH } from './lib/htop_data.js';
import { guarded } from './lib/ctx2d.js';

const F = (f) => (f - 0.5) / 60; // frame number → scene boundary just before that frame

const C = {
  bg: '#2f34c7',
  white: '#d4ddff',
  bright: '#ffffff',
  cyan: '#94ddff',
  green: '#84d6bc',
  shadow: '#8e97ef',
  tag: '#fff6bf',
  bracket: '#fffbe0',
  // meter bars (V3): drawn as 3x16 px blocks like the original's '|' cells, colours measured on the
  // original's bar cores (normal / system / memory used share htop's bold green)
  barNormal: '#9aebd7',
  barPink: '#eca4c9',
  memUsed: '#9aebd7',
  memShared: '#d5bdfc',
  memBuf: '#aeeffe',
  memCache: '#f8e6b7',
  head: '#65d4e2',
  sort: '#c6c9ed',
  sel: '#c6c9ef',
  black: '#02020c',
  run: '#98e0ec',
  uptime: '#fffdbb',
  io: '#fffbe0',
  load3: '#919bf7',
};

// Cut / step times read off the original (frame-exact).
const T = {
  start: F(9761),           // 162.683
  signal: F(9885),          // 164.750 F9 panel
  sigkill: F(9899),         // 164.983 selection jumps SIGTERM → SIGKILL
  sending: F(9924),         // 165.400
  zombie: F(9954),          // 165.900
  killed: F(9982),          // 166.367
  threads: F(10155),        // 169.250
};
// Cursor steps while tagging: the bar climbs one row per step (row 32 → row 1).
const STEPS = [162.8, 162.9, 163.017, 163.133, 163.2, 163.25, 163.317, 163.367, 163.433, 163.483, 163.55,
  163.6, 163.65, 163.717, 163.767, 163.833, 163.883, 163.95, 164.0, 164.067, 164.117, 164.183, 164.233,
  164.3, 164.35, 164.4, 164.467, 164.517, 164.583, 164.633, 164.7].map((t) => t - 0.008);

const SIGNALS = [' 0 Cancel', ' 1 SIGHUP', ' 2 SIGINT', ' 3 SIGQUIT', ' 4 SIGILL', ' 5 SIGTRAP', ' 6 SIGABRT',
  ' 6 SIGIOT', ' 7 SIGBUS', ' 8 SIGFPE', ' 9 SIGKILL', '10 SIGUSR1', '11 SIGSEGV', '12 SIGUSR2', '13 SIGPIPE',
  '14 SIGALRM', '15 SIGTERM', '16 SIGSTKFLT', '17 SIGCHLD', '18 SIGCONT', '19 SIGSTOP', '20 SIGTSTP',
  '21 SIGTTIN', '22 SIGTTOU', '23 SIGURG', '24 SIGXCPU', '25 SIGXFSZ', '26 SIGVTALRM', '27 SIGPROF',
  '28 SIGWINCH', '29 SIGIO', '29 SIGPOLL', '30 SIGPWR'];

const GRID = { x: 1018, y: 22.5, cw: 11, ch: 23, base: 18.5 };
const FONT = '400 19px "Noto Sans Mono"';
const BOLD = '700 19px "Noto Sans Mono"';

// htop's coloured KiB/MiB/GiB columns, from the strings shown in the original.
function sizeSegs(s) {
  const W = C.white, M = C.cyan, G = C.green;
  if (/^\d+\.\dG$/.test(s)) { const [a, b] = s.slice(0, -1).split('.'); return [[a, G], ['.' + b, M], ['G', G]]; }
  if (/^\d{4}M$/.test(s)) return [[s[0], G], [s.slice(1), M]];
  if (/^\d{1,3}M$/.test(s)) return [[s, M]];
  if (/^\d{4,5}$/.test(s)) { const n = s.length - 3; return [[s.slice(0, n), M], [s.slice(n), W]]; }
  return [[s, W]];
}

function putSegsR(g, row, endCol, segs, override) {
  const len = segs.reduce((n, [s]) => n + s.length, 0);
  let c = endCol - len + 1;
  for (const [s, col] of segs) c = g.put(row, c, s, override || { fg: col, bold: false });
}

// Compare on the frame grid: the OCR times are rounded to 1 ms, so e.g. 164.867 (frame 9892.02) must
// already apply on frame 9892 (V3 fix: these refreshes landed one frame late).
function refreshAt(t) {
  const f = Math.round(t * 60);
  let rec = REFRESH[0];
  for (const r of REFRESH) if (Math.round(r.t * 60) <= f) rec = r; else break;
  return rec;
}

function drawHeader(g, rec) {
  // CPU meters, 2 columns of 4
  for (let i = 0; i < 8; i++) {
    const right = i >= 4;
    const row = 1 + (i % 4);
    const lc = right ? 42 : 4, b0 = right ? 44 : 6, b1 = right ? 76 : 37;
    const [n, pink, pct] = rec.cpu[i];
    g.putR(row, lc, String(i), { fg: C.cyan, bold: false });
    g.put(row, lc + 1, '[', { fg: C.bracket, bold: true });
    g.put(row, b1 + 1, ']', { fg: C.bracket, bold: true });
    const w = b1 - b0 + 1;
    const txt = `${pct}%`;
    const t0 = w - txt.length;
    // htop sizes the bar as ceil(value * width); the OCR only counted the '|' left of the percentage,
    // so a bar that runs under the text (>= ~85 %) colours those characters bold in the bar colour.
    const nEff = Math.max(n, Math.min(w, Math.ceil(parseFloat(pct) / 100 * w - 0.05)));
    for (let k = 0; k < w; k++) {
      const isBar = k < nEff;
      const col = isBar ? (k >= nEff - pink ? C.barPink : C.barNormal) : C.cyan;
      if (k >= t0) g.put(row, b0 + k, txt[k - t0], { fg: col, bold: isBar });
      else { g.put(row, b0 + k, ' ', { fg: col, bold: isBar }); if (isBar) BARS.push([row, b0 + k, col]); }
    }
  }
  // Mem / Swp
  g.put(5, 2, 'Mem', { fg: C.cyan });
  g.put(5, 5, '[', { fg: C.bracket, bold: true });
  g.put(5, 38, ']', { fg: C.bracket, bold: true });
  const n = rec.mem;
  const cache = n >= 16 ? 7 : 6;
  const used = n - 2 - cache;
  const memTxt = `${rec.memTxt}/15.5G`;
  for (let k = 0; k < 32; k++) {
    let col = C.cyan, ch = ' ';
    if (k < used) col = C.memUsed;
    else if (k === used) col = C.memShared;
    else if (k === used + 1) col = C.memBuf;
    else if (k < n) col = C.memCache;
    const inTxt = k >= 32 - memTxt.length;
    if (inTxt) { ch = memTxt[k - (32 - memTxt.length)]; if (k >= n) col = C.cyan; }
    else if (k < n) BARS.push([5, 6 + k, col]);
    g.put(5, 6 + k, ch, { fg: col, bold: k < n });
  }
  g.put(6, 2, 'Swp', { fg: C.cyan });
  g.put(6, 5, '[', { fg: C.bracket, bold: true });
  g.putR(6, 37, '0K/2.00G', { fg: C.cyan });
  g.put(6, 38, ']', { fg: C.bracket, bold: true });
  // Tasks / load / uptime
  const [nt, thr, run] = rec.tasks;
  let c = g.put(5, 40, 'Tasks: ', { fg: C.cyan });
  c = g.put(5, c, String(nt), { fg: C.bright, bold: true });
  c = g.put(5, c, ', ', { fg: C.cyan });
  c = g.put(5, c, String(thr), { fg: C.bright, bold: true });
  c = g.put(5, c, ' thr, ', { fg: C.cyan });
  c = g.put(5, c, '0', { fg: C.cyan, bold: false }); // V3: kthr count is plain cyan in the original
  c = g.put(5, c, ' kthr; ', { fg: C.cyan });
  c = g.put(5, c, String(run), { fg: C.bright, bold: true });
  g.put(5, c, ' running', { fg: C.cyan });
  c = g.put(6, 40, 'Load average: ', { fg: C.cyan });
  c = g.put(6, c, rec.load[0], { fg: C.bright, bold: true });
  c = g.put(6, c + 1, rec.load[1], { fg: C.white });
  g.put(6, c + 1, rec.load[2], { fg: C.load3 });
  c = g.put(7, 40, 'Uptime: ', { fg: C.cyan });
  g.put(7, c, rec.up, { fg: C.uptime, bold: true });
  // screen tabs
  g.put(9, 2, ' Main ', { fg: C.black, bg: C.head });
  g.put(9, 9, '[', { fg: C.io, bold: true });
  g.put(9, 10, 'I/O', { fg: C.cyan });
  g.put(9, 13, ']', { fg: C.io, bold: true });
}

const HEAD_LABELS = [[6, 'PID', 'R'], [7, 'Δ'], [8, 'USER'], [21, 'PRI', 'R'], [25, 'NI', 'R'], [31, 'VIRT', 'R'],
  [37, 'RES', 'R'], [43, 'SHR', 'R'], [45, 'S'], [51, 'CPU%', 'R'], [56, 'MEM%', 'R'], [64, 'TIME+', 'R'], [67, 'Command']];

function drawColumnHeader(g, off) {
  g.style(10, off, 79, { bg: C.head });
  g.style(10, off, off + 7, { bg: C.sort });
  for (const [col, s, al] of HEAD_LABELS) {
    if (al === 'R') g.putR(10, col + off, s, { fg: C.black });
    else g.put(10, col + off, s, { fg: C.black });
  }
}

// One process row. mode: 'normal' | 'tag' | 'sel' | 'thread'. v = { s, cpu, time, virt, res, shr, mem, name, zombie }
function drawProc(g, row, off, pid, v, mode) {
  const sel = mode === 'sel', tag = mode === 'tag';
  const over = sel ? { fg: C.black, bold: false } : tag ? { fg: C.tag, bold: true } : null;
  const st = (fg) => over || { fg, bold: false };
  if (sel) g.style(row, 0, 79, { bg: C.sel });
  g.putR(row, 6 + off, String(pid), st(C.white));
  g.put(row, 8 + off, 'me', st(C.white));
  g.putR(row, 21 + off, '20', st(C.white));
  g.putR(row, 25 + off, '0', st(C.shadow));
  if (v.zombie) {
    g.putR(row, 31 + off, '0', st(C.white));
    g.putR(row, 37 + off, '0', st(C.white));
    g.putR(row, 43 + off, '0', st(C.white));
  } else {
    putSegsR(g, row, 31 + off, sizeSegs(v.virt), over);
    putSegsR(g, row, 37 + off, sizeSegs(v.res), over);
    putSegsR(g, row, 43 + off, sizeSegs(v.shr), over);
  }
  g.put(row, 45 + off, v.s, st(v.s === 'R' ? C.run : C.shadow));
  const cpuCol = v.cpu === '0.0' ? C.shadow : parseFloat(v.cpu) >= 99.9 ? C.cyan : C.white;
  g.putR(row, 51 + off, v.cpu, st(cpuCol));
  g.putR(row, 56 + off, v.mem, st(v.mem === '0.0' ? C.shadow : C.white));
  // in the signal state the OCR only saw the 6 on-screen chars of TIME+; pad the clipped 7th
  if (v.time) g.putR(row, 65 + off, v.time.length === 6 ? v.time + '0' : v.time, st(C.white));
  g.put(row, 67 + off, v.name, st(mode === 'thread' ? C.cyan : C.white));
}

function drawFbar(g, signal) {
  if (signal) {
    g.put(44, 0, 'Enter', { fg: C.white });
    g.put(44, 5, 'Send   ', { fg: C.black, bg: C.head });
    g.put(44, 12, 'Esc', { fg: C.white });
    g.style(44, 15, 79, { bg: C.head });
    g.put(44, 15, 'Cancel', { fg: C.black });
    return;
  }
  const items = [['F1', 'Help  '], ['F2', 'Setup '], ['F3', 'Search'], ['F4', 'Filter'], ['F5', 'Tree  '],
    ['F6', 'SortBy'], ['F7', 'Nice -'], ['F8', 'Nice +'], ['F9', 'Kill  '], ['F10', 'Quit  ']];
  let c = 0;
  for (const [k, l] of items) {
    c = g.put(44, c, k, { fg: C.white });
    c = g.put(44, c, l, { fg: C.black, bg: C.head });
  }
}

// V3 OCR correction (checked against the original): at 164.983 CPU1 shows 9 green + 3 pink bars.
for (const r of REFRESH) if (r.t === 164.983) r.cpu[1] = [12, 3, '36.4'];

// Meter bar cells of the current screen: [row, col, colour]; drawn as blocks after the text grid.
const BARS = [];

function buildScreen(g, t) {
  g.clear();
  BARS.length = 0;
  const rec = refreshAt(t);
  drawHeader(g, rec);
  const signal = t >= T.signal && t < T.sending;
  const procVal = (p, zombie = false) => {
    const [pid, name, virt, res, shr, mem] = PROCS[p - 1];
    const r = rec.rows[p] || ['S', '0.0', null];
    return { s: zombie ? 'Z' : r[0], cpu: zombie ? '0.0' : r[1], time: r[2], virt, res, shr, mem: zombie ? '0.0' : mem, name, zombie };
  };
  if (t < T.signal) {
    const k = STEPS.filter((s) => s <= t).length; // steps done
    const sel = 32 - k;
    drawColumnHeader(g, 0);
    for (let p = 1; p <= 33; p++) {
      const mode = p === sel ? 'sel' : p > sel && p <= 32 ? 'tag' : 'normal';
      drawProc(g, 10 + p, 0, p, procVal(p), mode);
    }
  } else if (signal) {
    // left panel: Send signal
    g.put(10, 0, 'Send signal:  ', { fg: C.black, bg: C.head });
    drawColumnHeader(g, 15);
    const selSig = t >= T.sigkill ? 10 : 16;
    SIGNALS.forEach((s, i) => {
      const row = 11 + i;
      if (i === selSig) g.put(row, 0, s.padEnd(14), { fg: C.black, bg: C.sel });
      else g.put(row, 0, s, { fg: C.white });
    });
    for (let p = 1; p <= 33; p++) drawProc(g, 10 + p, 15, p, procVal(p), p <= 32 ? 'tag' : 'normal');
  } else if (t < T.killed) {
    if (t < T.zombie) {
      g.style(10, 0, 79, { bg: C.head });
      g.put(10, 0, 'Sending...', { fg: C.black });
    } else {
      drawColumnHeader(g, 0);
    }
    for (let p = 1; p <= 33; p++) {
      const zombie = t >= T.zombie && p >= 2 && p <= 32;
      drawProc(g, 10 + p, 0, p, procVal(p, zombie), p === 1 ? 'sel' : p <= 32 ? 'tag' : 'normal');
    }
  } else {
    drawColumnHeader(g, 0);
    const threads = t >= T.threads;
    const r1 = rec.rows[1];
    drawProc(g, 11, 0, 1, {
      s: 'R', cpu: r1[1], time: r1[2], name: 'me',
      virt: threads ? '14.8G' : '12.3G', res: threads ? '3090M' : '612M', shr: '38912', mem: threads ? '19.4' : '3.8',
    }, 'sel');
    const r33 = rec.rows[33];
    drawProc(g, 12, 0, 33, { s: 'R', cpu: r33[1], time: r33[2], name: 'htop', virt: '11272', res: '5248', shr: '3840', mem: '0.0' }, 'normal');
    if (threads) {
      const r34 = rec.rows[34] || ['R', '100.0', '0:00.11'];
      for (let i = 0; i < 7; i++) {
        drawProc(g, 13 + i, 0, 34 + i, { s: 'R', cpu: '100.0', time: r34[2], name: 'me', virt: '14.8G', res: '3090M', shr: '38912', mem: '19.4' }, 'thread');
      }
    }
  }
  drawFbar(g, signal);
}

export default {
  id: 'execution/htop',
  start: T.start,
  end: 169.9583333333,
  z: 0,
  fonts: [FONT, BOLD],
  create(root, env) {
    root.style.background = C.bg;
    const { ctx } = env.canvas(root);
    const g = new Grid(80, 45);
    ctx.font = FONT;
    const advance = ctx.measureText('0'.repeat(10)).width / 10;
    return {
      render(t) {
        guarded(ctx, () => {
        ctx.clearRect(0, 0, 1920, 1080);
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, 1920, 1080);
        // divider between lyric and htop halves
        ctx.fillStyle = '#6a71ee';
        ctx.fillRect(1012, 0, 1, 1080);
        buildScreen(g, t);
        drawGrid(ctx, g, { ...GRID, font: FONT, boldFont: BOLD, advance, defaultFg: C.white });
        for (const [row, col, colour] of BARS) {
          ctx.fillStyle = colour;
          ctx.fillRect(GRID.x + col * GRID.cw + 4, Math.round(GRID.y + row * GRID.ch + 5.5), 3, 16);
        }
        });
      },
    };
  },
};
