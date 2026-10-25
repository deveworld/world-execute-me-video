// "Challenging your God / You have made some ILLEGAL ARGUMENTS" — a terminal typed in sync with the lyric,
// a Java stack trace + figlet banner, then everything collapses onto the "Illegal arguments" line, whose
// cursor turns into the beam source of escape/beam (drawn underneath, z=1).
// Every event time below is the first frame where it is visible in the original (read with lines.py).
import { at, on, clamp, prog, baselineIn, resetCtx } from './lib/util.js';

const X0 = 201, CW = 18, Y0 = 94, LH = 38;          // character grid measured from the original
const FONT = '440 30px "Fira Code"';
const C = {
  bg: '#090a11',
  prompt: '#cfccfb',
  text: '#ffffff',
  peach: '#fde0cc',
  pass: '#e9e8fc',
  err: '#c47b62',
  trace: '#9c6556',
  art: '#bd7660',
  cursor: '#ededff',
};

const PROMPT = 'me@world:~$ ';
const ART = [
  ' _____' + ' '.repeat(20) + '_   _',
  '| ____|_  _____ ___ _ __ | |_(_) ___  _ __',
  '|  _| \\ \\/ / __/ _ \\ \'_ \\| __| |/ _ \\| \'_ \\',
  '| |___ >  < (_|  __/ |_) | |_| | (_) | | | |',
  '|_____/_/\\_\\___\\___| .__/ \\__|_|\\___/|_| |_|',
  '                   |_|',
];

// Lines: 1-based line index -> { segs: [[text, colour]], show, hide, typed? }
// typed: [visibleCharsAtShow, [time, ...per further char]]
const LINES = {
  1: { segs: [[PROMPT, C.prompt], ['sudo Challenging ', C.text], ['your', C.peach], [' God', C.text]], show: 125.733, hide: 132.667,
    typed: [18, [125.833, 125.967, 126.067, 126.200, 126.300, 126.433, 126.533, 126.667, 126.767, 126.867, 127.000,
      127.167, 127.300, 127.400, 127.533, 127.567, 127.567, 127.600, 127.633]] },
  2: { segs: [['[sudo] password for me:', C.pass]], show: 127.700, hide: 132.700 },
  3: { segs: [['Sorry, try again.', C.err]], show: 128.500, hide: 132.767 },
  4: { segs: [['[sudo] password for me:', C.pass]], show: 128.500, hide: 132.833 },
  5: { segs: [['sudo: 1 incorrect password attempt', C.err]], show: 128.533, hide: 132.867 },
  6: { segs: [[PROMPT, C.prompt], ['You', C.peach], [' have made some', C.text]], show: 128.533, hide: 132.933,
    typed: [12, [128.567, 128.667, 128.800, 128.900, 128.967, 129.067, 129.200, 129.300, 129.400, 129.400, 129.633,
      129.867, 130.100, 130.300, 130.367, 130.500, 130.600, 130.733]] },
  7: { segs: [['Exception in thread "main" java.lang.IllegalArgumentException:', C.err]], show: 131.267, hide: 133.000 },
  8: { segs: [['Illegal arguments', C.text]], show: 131.267, hide: 133.767,
    typed: [1, [131.367, 131.500, 131.600, 131.733, 131.833, 131.967, 132.433, 132.433, 132.467, 132.533, 132.600,
      132.667, 132.700, 132.767, 132.833, 132.867]] },
  9: { segs: [['        at world.execute(World.java:120)', C.trace]], show: 131.967, hide: 132.867 },
  10: { segs: [['        at world.sudo(World.java:88)', C.trace]], show: 132.000, hide: 132.833 },
  11: { segs: [['        at world.run(World.java:42)', C.trace]], show: 132.067, hide: 132.767 },
  12: { segs: [['        at world.main(World.java:12)', C.trace]], show: 132.133, hide: 132.700 },
  19: { segs: [[PROMPT, C.prompt]], show: 132.300, hide: 132.667 },
};
ART.forEach((s, i) => { LINES[13 + i] = { segs: [[s, C.art]], show: 132.200, hide: 132.667 }; });

// Cursor: [from, line, col] (col 'typed' = after the typed text of that line); null line = hidden.
const CURSOR = [
  [125.733, 1, 'typed'], [127.700, 2, 24], [128.033, 3, 0], [128.300, null], [128.500, 4, 24],
  [128.533, 6, 'typed'], [130.800, 7, 0], [131.067, null], [131.267, 8, 'typed'], [131.967, 10, 0],
  [132.000, 11, 0], [132.067, 12, 0], [132.133, 13, 0], [132.200, 19, 0], [132.300, 19, 12], [132.533, null],
  [132.667, 12, 0], [132.700, 11, 0], [132.767, 10, 0], [132.833, 9, 0], [132.883, null],
];

function typedCount(line, t) {
  const [n0, times] = line.typed;
  let n = n0;
  for (const ts of times) if (on(t, ts)) n++;
  return n;
}

export default {
  id: 'escape/terminal',
  start: 125.73,
  end: 133.8,
  z: 2,
  fonts: [FONT],
  create(root, env) {
    const { canvas, ctx } = env.canvas(root, { context: '2d' });
    ctx.font = FONT;
    const base = baselineIn(ctx, LH);

    function drawLine(idx, line, t) {
      const y = Y0 + (idx - 1) * LH + base;
      let budget = line.typed ? typedCount(line, t) : Infinity;
      let col = 0;
      for (const [s, colour] of line.segs) {
        if (budget <= 0) break;
        const part = s.slice(0, Math.min(s.length, budget));
        budget -= part.length;
        ctx.fillStyle = colour;
        // draw char-by-char on the grid so the column alignment never drifts from the original
        for (let i = 0; i < part.length; i++) {
          if (part[i] !== ' ') ctx.fillText(part[i], X0 + (col + i) * CW, y);
        }
        col += part.length;
      }
    }

    return {
      render(t) {
        resetCtx(ctx);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // terminal background: cross-fades into escape/beam's vignette (132.76 -> 132.91; first lift on 132.750 orig)
        const bgA = 1 - prog(t, 132.762, 0.15);
        if (bgA > 0) {
          ctx.globalAlpha = bgA;
          ctx.fillStyle = C.bg;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
        }
        ctx.font = FONT;
        ctx.textBaseline = 'alphabetic';
        for (const [k, line] of Object.entries(LINES)) {
          if (on(t, line.show) && !on(t, line.hide)) drawLine(+k, line, t);
        }
        // cursor
        let cur = null;
        for (const c of CURSOR) if (on(t, c[0])) cur = c;
        if (cur && cur[1] != null) {
          const line = LINES[cur[1]];
          const col = cur[2] === 'typed' ? typedCount(line, t) : cur[2];
          ctx.fillStyle = C.cursor;
          ctx.fillRect(X0 + col * CW, Y0 + (cur[1] - 1) * LH, CW, LH);
        }
      },
    };
  },
};
