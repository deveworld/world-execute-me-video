import { penGlyph, penStroke } from '../strokes.js';

import { LETTERS } from './letters.js';

// A letter is placed once; the same pen shape serves every repeated letter.
const LINES = [
  { text: 'And then do', glyphs: [
    ['A',696,620,1,92.031,.018],['n',767,611,1,92.083,.042],['d',836,617,1,92.133,.050],
    ['t',924,620,1,92.217,.042],['h',992,626,1,92.267,.050],['e',1054,612,1,92.317,.050],['n',1103,612,1,92.367,.067],
    ['d',1213,614,1,92.467,.067],['o',1272,615,1.04,92.534,.067],
  ] },
  { text: 'whatever', glyphs: [
    ['w',696,732,1.13,93.267,.067],['h',786,742,1.02,93.334,.050],['a',846,738,1.04,93.400,.050],
    ['t',895,741,1.12,93.450,.041],['e',964,732,1.04,93.492,.042],['v',1012,724,1.05,93.534,.042],
    ['e',1077,733,1.02,93.576,.041],['r',1128,733,.95,93.634,.050],
  ] },
  { text: 'From AM to PM', glyphs: [
    ['F',695,900,1,93.934,.067],['r',760,897,1.02,94.017,.034],['o',827,896,1.02,94.051,.050],['m',877,892,1.15,94.101,.083],
    ['A',1007,904,1.02,94.217,.100],['M',1081,899,1.03,94.317,.084],
    ['t',1210,900,1.09,94.984,.050],['o',1286,897,1.04,95.067,.034],
    ['P',1383,902,1.04,95.200,.067],['M',1439,900,1.03,95.267,.084],
  ] },
];

export function createCalendarWriting() {
  const strokes = LINES.flatMap(line => line.glyphs.flatMap(([letter,x,y,scale,start,duration]) =>
    penGlyph(LETTERS[letter], { x, y, sx: scale, width: 9.3, pressure: 0.22, start, duration })));
  strokes.push(penStroke('M687 767 Q940 768 1180 760', { width: 8.1, pressure: .08, start: 93.734, duration: .167 }));
  // The margin arrow accelerates through its middle, then slows at the tip.
  const start = 95.425;
  const arrow = [
    penStroke('M1693 267 L1720 265', { width: 8.7, start: start - .008, duration: .008 }),
    penStroke('M1720 265 Q1727 581 1720 884', { width: 8.7, start, duration: .208, ease: k => k * k * (3 - 2 * k) }),
    penStroke('M1720 884 L1705 861', { width: 8.7, start: 95.625, duration: .025 }),
  ];
  return {
    draw(ctx, t, dark) {
      ctx.save(); ctx.fillStyle = dark ? '#aaa6ff' : '#514fdf';
      for (const stroke of strokes) stroke.draw(ctx, t);
      ctx.fillStyle = dark ? '#aeaef4' : '#514fdf';
      for (const stroke of arrow) stroke.draw(ctx, t);
      ctx.restore();
    },
  };
}
