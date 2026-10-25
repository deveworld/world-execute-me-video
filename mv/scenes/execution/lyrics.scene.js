// 162.600–169.9583333333 · "If I can, if I can give them all the EXECUTION / Then I can, then I can be
// your only EXECUTION" written word by word at the left of the htop screen. Words pop in on
// the frames read off the original (no fade). The first "If" appears over the title card.
import { guarded } from './lib/ctx2d.js';
const F = (f) => (f - 0.5) / 60;

const SMALL = '400 60px "Fira Code"';
const BIG = '600 115px "Fira Code"';
const WHITE = '#f2f6ff'; // V3: measured — the lyric white is slightly blue

// [frame the word appears, text, column, baseline line index]
const LINES = [
  { y: 263, font: SMALL, x: 113, words: [[9756, 'If', 0], [9775, 'I', 3], [9783, 'can', 5]] },
  { y: 355, font: SMALL, x: 113, words: [[9814, 'If', 0], [9830, 'I', 3], [9851, 'can', 5], [9867, 'give', 9],
    [9881, 'them', 14], [9897, 'all', 19], [9909, 'the', 23]] },
  { y: 504, font: BIG, x: 110, ls: -2.5, color: '#f9eb9d', words: [[9931, 'Execution', 0]] },
  { y: 631, font: SMALL, x: 117, words: [[9979, 'Then', 0], [10006, 'I', 5], [10010, 'can', 7]] },
  { y: 723, font: SMALL, x: 117, words: [[10035, 'Then', 0], [10064, 'I', 5], [10073, 'can', 7], [10091, 'be', 11],
    [10104, 'your', 14, '#ffc9b0'], [10128, 'only', 19]] },
  { y: 872, font: BIG, x: 110, ls: -2.5, color: '#98f2ca', words: [[10147, 'Execution', 0]] },
];

export default {
  id: 'execution/lyrics',
  start: F(9756),
  end: 169.9583333333,
  z: 5,
  fonts: [SMALL, BIG],
  create(root, env) {
    const { ctx } = env.canvas(root);
    const cell = { [SMALL]: 33, [BIG]: 66 };
    return {
      render(t) {
        guarded(ctx, () => {
        ctx.clearRect(0, 0, 1920, 1080);
        ctx.textBaseline = 'alphabetic';
        for (const line of LINES) {
          ctx.font = line.font;
          ctx.letterSpacing = `${line.ls ?? -3}px`;
          for (const [f, word, col, color] of line.words) {
            if (t < F(f)) continue;
            ctx.fillStyle = color || line.color || WHITE;
            const x = line.x + col * cell[line.font];
            if (line.font === SMALL && word.includes('l')) {
              // V3: the original's 'l' has a slab foot (Fira Code's default has a curved tail); traced at 1:1
              ctx.fillText(word.replaceAll('l', ' '), x, line.y);
              [...word].forEach((ch, i) => {
                if (ch !== 'l') return;
                const cx = x + i * cell[SMALL];
                ctx.fillRect(cx + 15.5, line.y - 43.4, 6, 39);
                ctx.fillRect(cx + 7, line.y - 43.4, 14.5, 3);
                ctx.fillRect(cx + 6.3, line.y - 4.5, 24.4, 4);
              });
            } else ctx.fillText(word, x, line.y);
          }
        }
        });
      },
    };
  },
};
