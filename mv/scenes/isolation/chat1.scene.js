// "Though you have left" — a dark, rounded group-chat panel ("Sunday dinner", 6 members) in Nunito Sans.
// Words of the bubble light up one by one; "Mara is typing" appears; the input caret blinks.
// DOM mock-up; covers 110.933 until the next shot's wipe has finished (112.333).
import { build, backdrop, caretOn, wordAlpha, clamp, SPB } from './lib/chat.js';

const MEMBERS = [
  ['RH', 'Robin Hale', '#5c5ce7', '#eff3fc', 'owner'],
  ['IV', 'Ines Varga', '#8489be', '#0b122a'],
  ['MQ', 'Mara Quinn', '#fbc0a0', '#1e0c0a'],
  ['OL', 'Owen Lark', '#595a63', '#f4f4f8'],
  ['PS', 'Priya Sen', '#9695b2', '#0d0d1d'],
  ['TL', 'Tobias Lund', '#575a7e', '#f1f5f9'],
];

const N = (w, s) => `font-family:'Nunito Sans';font-weight:${w};font-size:${s}px;line-height:${s}px;letter-spacing:-0.004em;-webkit-text-stroke:0.65px rgba(0,0,0,.72);paint-order:stroke fill;`;
// place text so that its alphabetic baseline sits at y (Nunito Sans: baseline = top + 0.829 em with line-height 1)
const at = (x, base, s) => `position:absolute;left:${x}px;top:${(base - 0.829 * s).toFixed(1)}px;white-space:pre;`;

export default {
  id: 'isolation/chat1',
  start: 110.9333,
  end: 112.3333,
  z: 1,
  async create(root, env) {
    await env.loadFont('Nunito Sans', '/scenes/isolation/fonts/NunitoSans-YTLC-opsz-wdth-wght.ttf', { weight: '200 1000' });
    const avatar = (cx, cy, r, bg, fg, txt, size, w = 700) =>
      `<div style="position:absolute;left:${cx - r}px;top:${cy - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;` +
        `background:${bg};color:${fg};box-shadow:inset 0 0 0 .65px rgba(255,255,255,.45);${N(w, size)}display:flex;align-items:center;justify-content:center;">${txt}</div>`;
    const rows = MEMBERS.map(([ini, name, bg, fg, extra], i) => {
      const y = 318 + 68 * i;
      return avatar(1336, y, 24, bg, fg, ini, 19, ini === 'IV' || ini === 'MQ' || ini === 'PS' ? 500 : 700) +
        `<div style="${at(1375, y + 7.5, 20)}${N(700, 20)}color:#f2f2f7">${name}</div>` +
        (extra ? `<div style="${at(1563, y + 7.5, 15.5)}${N(600, 15.5)}color:#9a9ba4">${extra}</div>` : '');
    }).join('');
    const word = (k, txt, col) => `<span data-k="${k}" style="color:${col}">${txt}</span>`;

    const el = build(root, `
      ${backdrop('#0d0e15', '#0f1018')}
      <div style="position:absolute;left:280px;top:130px;width:1360px;height:820px;border-radius:22px;background:#23242d;
        box-shadow:0 22px 60px rgba(0,0,0,0.55);overflow:hidden;">
        <div style="position:absolute;left:1000px;top:96px;width:360px;height:724px;background:#1c1d26"></div>
        <div style="position:absolute;left:1000px;top:96px;width:1px;height:724px;background:#32333c"></div>
        <div style="position:absolute;left:0;top:96px;width:1360px;height:1px;background:#34353f"></div>
        <div style="position:absolute;left:0;top:686px;width:1000px;height:1px;background:#373841"></div>
      </div>
      <div style="position:absolute;left:280px;top:130px;width:1358px;height:818px;border-radius:22px;border:1px solid #41424b;"></div>
      ${avatar(338, 178, 26, '#5b5e72', '#f3f5fd', 'SD', 19.5, 800)}
      <div style="${at(380, 173.5, 28.5)}${N(900, 28.5)}color:#f2f2fa;letter-spacing:-0.88px">Sunday dinner</div>
      <div style="${at(380, 202, 18.5)}${N(500, 18.5)}color:#9d9da7;letter-spacing:0.45px">6 members</div>
      <div style="${at(1313, 270.5, 16)}${N(800, 15.5)}color:#a1a2ab;letter-spacing:0.55px">MEMBERS</div>
      ${rows}
      <div style="position:absolute;left:766px;top:710px;width:481px;height:87px;border-radius:22px 22px 6px 22px;background:#5a5be6;"></div>
      <div style="${at(795, 770.5, 44)}${N(600, 44)}letter-spacing:0px">${word('w0', 'Though', '#edf1fd')} ${word('w1', 'you', '#ffc4a9')} ${word('w2', 'have', '#edf1fd')} ${word('w3', 'left', '#edf1fd')}</div>
      <div data-k="typing" style="position:absolute;left:0;top:0;width:1920px;height:1080px;opacity:0">
        <div data-k="d0" style="position:absolute;left:339px;top:834px;width:9px;height:9px;border-radius:50%;background:#8a8b96"></div>
        <div data-k="d1" style="position:absolute;left:351px;top:834px;width:9px;height:9px;border-radius:50%;background:#8a8b96"></div>
        <div data-k="d2" style="position:absolute;left:363px;top:834px;width:9px;height:9px;border-radius:50%;background:#8a8b96"></div>
        <div style="${at(385, 845, 19.1)}${N(500, 19.1)}color:#9c9da6"><b style="font-weight:800;color:#e5e5fb">Mara</b> is typing</div>
      </div>
      <div style="position:absolute;left:312px;top:862px;width:934px;height:58px;border-radius:30px;background:#2f323d;border:1px solid #3f404b;"></div>
      <div style="${at(346, 897.5, 20.5)}${N(400, 20.5)}color:#a2a5b3">Message Sunday dinner</div>
      <div data-k="caret" style="position:absolute;left:340px;top:879px;width:2px;height:26px;background:#c9c5ff"></div>
    `);

    // word reveal starts (each ramps over ~5 frames)
    const words = [null, 111.385, 111.46, 111.755];
    const peach = [251, 192, 160], grey = [138, 139, 150];
    return {
      render(t) {
        words.forEach((w, i) => { el[`w${i}`].style.opacity = String(wordAlpha(t, w)); });
        el.caret.style.visibility = caretOn(t) ? 'visible' : 'hidden';
        el.typing.style.opacity = String(clamp((t - 111.55) / 0.117));   // ramp over frames 6693-6700
        // typing dots: a peach glow runs across the three dots once per beat
        for (let i = 0; i < 3; i++) {
          const ph = ((t - 111.66 - 0.06 * i) % SPB + SPB) % SPB;
          const k = t < 111.6 ? 0 : clamp(1 - Math.abs(ph - 0.06) / 0.14);
          const c = grey.map((g, j) => Math.round(g + (peach[j] - g) * k * 0.85));
          el[`d${i}`].style.background = `rgb(${c.join(',')})`;
        }
      },
    };
  },
};
