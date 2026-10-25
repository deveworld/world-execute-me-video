// WeeChat-style IRC buffer for #sunday-dinner: the whole join history, "@robin | Though you have left",
// then "<-- You have left" twice; owen drops off the nick list. Character grid in DejaVu Sans Mono.
import { build, backdrop, caretOn, wordAlpha, wipe, clamp, titleSettle } from './lib/chat.js';

const X0 = 288.05, CW = 17.4, ROW = 36; // grid origin, column width, row pitch
const SIZE = 28.9;
const baseOf = (row) => (row === 0 ? 167 : 203 + ROW * (row - 1));
// Colours re-measured on the original's glyph cores (113.6 s), compensating for the desaturation of thin
// anti-aliased strokes: the timestamp colons are a saturated gold, the nick colours are more vivid.
const C = {
  txt: '#eceff0', white: '#ffffff', time: '#f0f5f7', sep: '#d7a700', join: '#aff36a', bar: '#649a21',
  host: '#18a19c', joined: '#66a610', dash: '#6a5d71', paren: '#73a32a', quit: '#cb3e42',
  ines: '#b994b3', tobias: '#40fef9', mara: '#ffddc6', priya: '#92afd6', owen: '#d2aa10', you: '#ffd9c3',
  cyan: '#50ecf9', yellow: '#fef875', light: '#dde9ee', pcyan: '#3bfdf9', pdark: '#2ea5a3',
};

const span = (col, s) => `<span style="color:${col}">${s}</span>`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const host = (nick, h) => `${span(C.host, `(~${nick}@${h})`)}`;
const joinMsg = (nick, col, h, tail) => `${span(col, nick)} ${host(nick, h)} ${span(C.joined, 'has joined')}${tail}`;

// [time, prefix (html), prefix length, message html]
const ROWS = [
  ['18:02:11', span(C.join, '--&gt;'), 3, joinMsg('robin', C.white, '203.0.113.5', '')],
  [null, '', 0, span(C.white, '#sunday-dinner')],
  ['18:02:11', span(C.dash, '--'), 2, `Channel #sunday-dinner: 1 nick ${span(C.paren, '(')}1 op, 0 voices, 0`],
  [null, '', 0, `normals${span(C.paren, ')')}`],
  ['18:02:11', span(C.dash, '--'), 2, 'Channel created on Sun, 11 Oct 2026 18:02:11'],
  ['18:02:40', span(C.dash, '--'), 2, 'robin has changed topic for #sunday-dinner to'],
  [null, '', 0, '"Sunday dinner, 7 pm"'],
  ['18:03:40', span(C.join, '--&gt;'), 3, joinMsg('ines', C.ines, '198.51.100.4', ` ${span(C.white, '#sunday-dinner')}`)],
  ['18:04:52', span(C.join, '--&gt;'), 3, joinMsg('tobias', C.tobias, '192.0.2.33', '')],
  [null, '', 0, span(C.white, '#sunday-dinner')],
  ['18:06:15', span(C.join, '--&gt;'), 3, joinMsg('mara', C.mara, '192.0.2.80', ` ${span(C.white, '#sunday-dinner')}`)],
  ['18:11:03', span(C.join, '--&gt;'), 3, joinMsg('priya', C.priya, '198.51.100.7', '')],
  [null, '', 0, span(C.white, '#sunday-dinner')],
  ['18:19:27', span(C.join, '--&gt;'), 3, joinMsg('owen', C.owen, '203.0.113.19', ` ${span(C.white, '#sunday-dinner')}`)],
  ['23:46:06', `${span(C.join, '@')}${span(C.white, 'robin')}`, 6, `Though ${span(C.you, 'you')} have left`],
  ['23:46:07', span(C.quit, '&lt;--'), 3, `${span(C.you, 'You')} have left`],
  ['23:46:08', span(C.quit, '&lt;--'), 3, `${span(C.you, 'You')} <span data-k="have">have</span> <span data-k="left">left</span>`],
];

const cell = (col, row, html, color = C.txt) => {
  // DejaVu Sans Mono (hhea ascent 0.928, descent 0.236) in a 36 px line box: top = baseline - 28.0
  const top = baseOf(row) - (0.928 * SIZE + (ROW - 1.164 * SIZE) / 2);
  return `<div style="position:absolute;left:${(X0 + CW * col).toFixed(2)}px;top:${top.toFixed(2)}px;color:${color};">${html}</div>`;
};

export default {
  id: 'isolation/irc',
  start: 113.1,
  end: 114.2001,
  z: 3,
  async create(root, env) {
    await env.loadFont('DejaVu Sans Mono', '/scenes/isolation/fonts/DejaVuSansMono.ttf');
    const rows = ROWS.map(([time, pre, plen, msg], i) => {
      const r = i + 1;
      let h = '';
      if (time) h += cell(0, r, time.replace(/:/g, span(C.sep, ':')), C.time);
      if (pre) h += cell(15 - plen, r, pre);
      h += cell(16, r, '|', C.bar);
      h += cell(18, r, msg);
      return h;
    }).join('');
    const nicks = (list) => list.map(([pfx, n, col], i) => cell(70, i + 1, `${pfx ? span(C.join, '@') : '&nbsp;'}${span(col, n)}`)).join('');
    const nick5 = [[1, 'robin', C.white], [0, 'mara', C.mara], [0, 'owen', C.owen], [0, 'priya', C.priya], [0, 'tobias', C.tobias]];
    const status = (n) => `${span(C.cyan, '[')}${span(C.light, '23:46')}${span(C.cyan, ']')} ${span(C.cyan, '[')}${span(C.yellow, '2')}${span(C.cyan, ']')} ` +
      `${span(C.cyan, '[')}${span(C.light, 'irc/home')}${span(C.cyan, ']')} ${span(C.yellow, '2')}${span(C.light, ':')}${span('#fcfef9', '#sunday-dinner')}` +
      `${span(C.cyan, '(')}${span(C.light, '+nt')}${span(C.cyan, ')')}${span(C.cyan, '{')}${span(C.light, n)}${span(C.cyan, '}')}`;

    const el = build(root, `
      ${backdrop('#504f52', '#5a595c')}
      <div style="position:absolute;left:280px;top:130px;width:1360px;height:820px;border-radius:22px;background:#2e3436;
        box-shadow:0 22px 60px rgba(0,0,0,0.4);overflow:hidden;"></div>
      <div style="position:absolute;left:280px;top:130px;width:1358px;height:818px;border-radius:22px;border:1px solid #3f4547;"></div>
      <div style="position:absolute;left:288px;top:138px;width:1340px;height:36px;background:#3364a2"></div>
      <div style="position:absolute;left:288px;top:858px;width:1340px;height:36px;background:#3564a3"></div>
      <div style="position:absolute;left:1496px;top:174px;width:2px;height:684px;background:#3e68a5"></div>
      <div style="position:absolute;inset:0;font-family:'DejaVu Sans Mono';font-size:${SIZE}px;line-height:${ROW}px;white-space:pre;
        font-variant-ligatures:none;">
        <div data-k="title" style="position:absolute;left:0;top:0">${cell(0, 0, 'Sunday dinner, 7 pm', C.light)}</div>
        ${rows}
        <div data-k="n5">${nicks(nick5)}</div>
        <div data-k="n4" style="display:none">${nicks(nick5.filter((n) => n[1] !== 'owen'))}</div>
        <div data-k="s5">${cell(0, 20, status('5'))}</div>
        <div data-k="s4" style="display:none">${cell(0, 20, status('4'))}</div>
        ${cell(0, 21, `${span(C.pdark, '[')}${span(C.pcyan, 'robin')}${span(C.pdark, '(')}${span('#ecf6f5', 'i')}${span(C.pdark, ')]')}`)}
      </div>
      <div data-k="cursor" style="position:absolute;left:479.2px;top:895px;width:17.4px;height:36px;background:#d3d5ce"></div>
    `);
    return {
      render(t) {
        wipe(root, t, 113.1, [752, 572, 428, 212]);
        // title arrives at the Discord title's x (365) and settles in ~9 frames (measured 6794-6801)
        const back = titleSettle(t, 6794, 9.5);
        el.title.style.transform = back > 0 ? `translateX(${(75 * back).toFixed(2)}px)` : '';
        el.have.style.opacity = String(wordAlpha(t, 113.217, 0.083));
        el.left.style.opacity = String(wordAlpha(t, 113.552, 0.08));
        const gone = t >= 113.733;
        el.n5.style.display = gone ? 'none' : '';
        el.n4.style.display = gone ? '' : 'none';
        el.s5.style.display = gone ? 'none' : '';
        el.s4.style.display = gone ? '' : 'none';
        el.cursor.style.visibility = caretOn(t) ? 'visible' : 'hidden';
      },
    };
  },
};
