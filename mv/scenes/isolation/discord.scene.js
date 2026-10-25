// Discord-like group DM "Sunday dinner": Robin Hale's message "Though you have left", the system line
// "You have left", the member list losing Ines Varga. Wipes in from the bottom at 112.2.
import { build, backdrop, caretOn, loadFonts, wordAlpha, wipe, text, icon, circle, titleSettle } from './lib/chat.js';

const P = 'Plus Jakarta Sans';
const MEMBERS = [
  ['IV', 'Ines Varga', '#8489be', '#0b122a'],
  ['MQ', 'Mara Quinn', '#f9c1a2', '#24140d'],
  ['OL', 'Owen Lark', '#5d5d63', '#f4f4f8'],
  ['PS', 'Priya Sen', '#9695b2', '#0d0d1d'],
  ['RH', 'Robin Hale', '#5c5ce7', '#eff3fc', true],
  ['TL', 'Tobias Lund', '#575a7e', '#f1f5f9'],
];

const avatarHtml = (cx, cy, r, bg, fg, ini, size) =>
  circle(cx, cy, r, bg, `color:${fg};font-family:'${P}';font-weight:700;font-size:${size}px;display:flex;align-items:center;justify-content:center;letter-spacing:-0.5px`).replace('></div>', `>${ini}</div>`);

function memberList(list) {
  return list.map(([ini, name, bg, fg, crown], i) => {
    const y = 318 + 76 * i;
    return avatarHtml(1282, y, 27, bg, fg, ini, 17) +
      circle(1300, y + 19, 10.5, '#2b2c31') + circle(1300, y + 19, 7.5, '#22a358') +
      text(P, 400, 26.75, 1328, y + 11, '#c2c3c8', name, 'letter-spacing:0.8px') +
      (crown ? icon('crown', 1490.5, y - 0.5, 24, '#eeae42', 1, '#eeae42') : '');
  }).join('');
}

export default {
  id: 'isolation/discord',
  start: 112.2,
  end: 113.2334,
  z: 2,
  async create(root, env) {
    await loadFonts(env, [P]);
    const grey = '#b5b6bb';
    const el = build(root, `
      ${backdrop('#252429', '#29282d')}
      <div style="position:absolute;left:280px;top:130px;width:1360px;height:820px;border-radius:22px;background:#323338;
        box-shadow:0 22px 60px rgba(0,0,0,0.45);overflow:hidden;">
        <div style="position:absolute;left:947px;top:85px;width:413px;height:735px;background:linear-gradient(90deg,#2e2f34 0px,#2b2c31 6px)"></div>
        <div style="position:absolute;left:0;top:82px;width:1360px;height:1px;background:#34353a"></div>
        <div style="position:absolute;left:0;top:83px;width:1360px;height:2px;background:#24252a"></div>
      </div>
      <div style="position:absolute;left:280px;top:130px;width:1358px;height:818px;border-radius:22px;border:1px solid #46474c;"></div>
      ${avatarHtml(327.5, 170.5, 21.5, '#696b7c', '#f3f5fc', 'SD', 16)}
      <div data-k="title" style="position:absolute;left:0;top:0">${text(P, 700, 26.53, 363, 181, '#f2f2f6', 'Sunday dinner', 'letter-spacing:0.647px')}</div>
      ${icon('phone', 929.5, 169.5, 35, grey, 2)}
      ${icon('video', 999.5, 171, 42, grey, 2)}
      ${icon('pin', 1068, 171, 38, grey, 2)}
      ${icon('userPlus', 1138.5, 172.5, 40, grey, 2)}
      ${icon('users', 1205.5, 171, 42, '#f4f4f6', 2)}
      <div style="position:absolute;left:1255px;top:152px;width:247px;height:39px;border-radius:7px;background:#1e1f24"></div>
      ${text(P, 400, 27, 1267, 182, '#abacb1', 'Search', 'letter-spacing:-1.6px')}
      ${icon('search', 1480.5, 170.5, 32, grey, 2.4)}
      ${icon('inbox', 1536, 171, 39, grey, 2)}
      ${icon('help', 1591, 171.5, 41, grey, 2)}

      ${avatarHtml(375.5, 365, 70.5, '#696b7c', '#f3f5fc', 'SD', 52)}
      ${text(P, 800, 54.08, 308, 500, '#f1f2f6', 'Sunday dinner', 'letter-spacing:-0.522px')}
      ${text(P, 400, 28, 308, 544, '#c5c6cc', 'Welcome to the beginning of the <b style="font-weight:700;color:#f2f3f6">Sunday dinner</b> group.', 'letter-spacing:-0.05px')}
      <div style="position:absolute;left:307px;top:620px;width:353px;height:1px;background:#434449"></div>
      <div style="position:absolute;left:850px;top:620px;width:350px;height:1px;background:#434449"></div>
      ${text(P, 600, 23, 669, 627.5, '#a4a5aa', 'October 11, 2026', 'letter-spacing:-0.2px')}
      ${avatarHtml(342, 683.5, 36, '#5c5ce7', '#eff3fc', 'RH', 26)}
      ${text(P, 500, 27.27, 402, 673, '#f2f3f6', 'Robin Hale', 'letter-spacing:0.323px')}
      ${text(P, 400, 20.408, 559, 672, '#aaacb1', 'Today at 11:46 PM', 'letter-spacing:0.161px')}
      ${text(P, 400, 26.53, 404, 711, '#e6e7ec', 'Though <span style="color:#ffe0cd">you</span> have left', 'letter-spacing:0.736px')}
      ${icon('arrowLeft', 341, 769, 34, '#fa3d4b', 2.6)}
      ${text(P, 400, 27.27, 404, 778, '#a3a4aa', '<span style="color:#ffdbc9">You</span> <span data-k="w1">have</span> <span data-k="w2">left</span>', 'letter-spacing:0.204px')}
      ${text(P, 400, 20.408, 583, 777, '#adaeb3', 'Today at 11:46 PM', 'letter-spacing:0.161px')}

      <div style="position:absolute;left:308px;top:833px;width:891px;height:76px;border-radius:14px;background:#393a41"></div>
      ${circle(355, 869.5, 18, '#c8c9ce')}
      ${icon('plus', 355, 869.5, 30, '#393a41', 3)}
      <div data-k="caret" style="position:absolute;left:397px;top:851px;width:3px;height:39px;background:#f6f6f8"></div>
      ${text(P, 400, 31, 402, 880, '#76777e', 'Message @Sunday dinner', 'letter-spacing:-1.63px')}
      <div style="position:absolute;left:1002px;top:855px;width:37px;height:28px;border:2.3px solid ${grey};border-radius:6px;"></div>
      ${text(P, 800, 13.5, 1009.5, 875, grey, 'GIF')}
      ${icon('sticky', 1089, 868.5, 35, grey, 2, 'none', 'transform:scaleY(-1)')}
      ${icon('smile', 1158, 869.5, 41, grey, 2)}

      ${text(P, 600, 22, 1254, 268.5, '#a2a3a9', '<span data-k="mcount">MEMBERS—6</span>', 'letter-spacing:-0.35px')}
      <div data-k="m6">${memberList(MEMBERS)}</div>
      <div data-k="m5" style="display:none">${memberList(MEMBERS.slice(1))}</div>
    `);

    return {
      render(t) {
        wipe(root, t, 112.2, [737, 564, 344, 208]);
        // title appears at chat1's title position and settles in ~10 frames (measured 6740-6747)
        const back = titleSettle(t, 6740, 10.5);
        el.title.style.transform = back > 0 ? `translate(${(16.5 * back).toFixed(2)}px, ${(-9 * back).toFixed(2)}px)` : '';
        el.w1.style.opacity = String(wordAlpha(t, 112.287, 0.075));
        el.w2.style.opacity = String(wordAlpha(t, 112.684, 0.083));
        const gone = t >= 112.8;
        el.m6.style.display = gone ? 'none' : '';
        el.m5.style.display = gone ? '' : 'none';
        el.mcount.textContent = gone ? 'MEMBERS—5' : 'MEMBERS—6';
        el.caret.style.visibility = caretOn(t) ? 'visible' : 'hidden';
      },
    };
  },
};
