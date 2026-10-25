// AIM-style "Sunday dinner - Chat Room" on an XP-blue desktop, with the Buddy List. The last
// "You have left" fills in word by word; at 114.667 PriyaSen leaves (door icon, counts change).
import { build, backdrop, caretOn, wordAlpha, wipe, text, circle } from './lib/chat.js';

const I = 'Inter', R = 'Nunito Sans';
const T0 = 6844 / 60; // wipe start (114.0667)

// XP "Luna" window frame: outer box, title bar, client area.
function win(x, y0, w, h0, title, titleBase, titleX) {
  const tb = 54; // title bar height incl. top edge
  // frame top edge at 548 / 154, title bar bottom at 601 / 207; the client area keeps its own top/bottom.
  const y = y0 + 2, h = h0 - 2;
  return `
  <div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:9px 9px 0 0;
    background:#0055e6;box-shadow:3px 3px 5px rgba(0,20,60,0.45), inset 0 0 0 1px #0a43b6, inset 0 0 0 2px #0756e6;"></div>
  <div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${tb}px;border-radius:9px 9px 0 0;
    background:linear-gradient(180deg,#004085 0px,#4b9cff 1px,#2f80ed 2px,#1767ec 3px,#0e5ee3 4px,#095ce8 6px,#075ae6 10px,#0457e3 15px,
    #0255e1 19px,#0255e1 25px,#0054e6 28px,#0054e6 35px,#0056e9 36px,#0056e9 43px,#0d60e8 47px,#105ae4 50px,#074ed9 51px,#0249d4 52px,#001f5c 53px);"></div>
  <div style="position:absolute;left:${x + 6}px;top:${y + tb}px;width:${w - 12}px;height:${h - tb - 8}px;background:#eae6d6;
    box-shadow:0 0 0 1px #e0ffff, 0 0 0 2px #05346c;"></div>
  <div style="position:absolute;left:${x + 12}px;top:${y + 17}px;width:16px;height:12px;border-radius:3px;background:#fff;"></div>
  <div style="position:absolute;left:${x + 14}px;top:${y + 27}px;width:0;height:0;border-left:3px solid transparent;border-right:3px solid transparent;border-top:4px solid #fff;"></div>
  <div style="position:absolute;left:${x + 26}px;top:${y + 23}px;width:13px;height:10px;border-radius:3px;background:#f5c63c;"></div>
  ${text(R, 900, 23.08, titleX - 1, titleBase - 1.5, '#f6fbff', title, 'letter-spacing:-0.4px;-webkit-text-stroke:.65px rgba(0,0,0,.75);paint-order:stroke fill;text-shadow:1.5px 1.5px 0 #0b1f63')}`;
}

function winButtons(x, y) {
  const btn = (bx, kind) => {
    const bg = kind === 'close'
      ? 'linear-gradient(180deg,#ec785a,#dd6649 30%,#d4593d 55%,#cb4728 85%,#c53f20)'
      : 'linear-gradient(180deg,#3779f2,#2b6ae7 30%,#2261de 55%,#1d57d7 85%,#154ace)';
    let glyph = '';
    if (kind === 'min') glyph = `<div style="position:absolute;left:10px;top:23px;width:15px;height:5px;background:#fff"></div>`;
    if (kind === 'max') glyph = `<div style="position:absolute;left:9px;top:9px;width:15px;height:13px;border:2.5px solid #fff;border-top-width:4px"></div>`;
    if (kind === 'close') glyph = `<svg style="position:absolute;left:9px;top:8px" width="20" height="20" viewBox="0 0 20 20"><path d="M3 3L17 17M17 3L3 17" stroke="#fff" stroke-width="3.6" stroke-linecap="round"/></svg>`;
    return `<div style="position:absolute;left:${bx}px;top:${y}px;width:38px;height:37px;border-radius:5px;border:1.6px solid #fff;
      box-sizing:border-box;background:${bg};box-shadow:0 0 0 1px rgba(0,30,110,0.6);">${glyph}</div>`;
  };
  return btn(x, 'min') + btn(x + 40, 'max') + btn(x + 80, 'close');
}

const field = (x, y, w, h) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;background:#fdfdfd;
   border:2px solid #7486a2;box-shadow:0 0 0 1px #fbf7e8;"></div>`;

const button = (x, y, w, h, label, base) =>
  `<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;box-sizing:border-box;border-radius:5px;
   border:2px solid #001448;background:linear-gradient(180deg,#fff9f7 0%,#fcfcf7 15%,#f5f5f2 40%,#efefea 65%,#e5e5de 90%,#d8d7c8 100%);
   box-shadow:inset 0 -2px 0 rgba(200,190,170,0.6);"></div>` + text(I, 400, 17.2, x, base, '#0a0a09', label, `width:${w}px;text-align:center`);

const underlineYou = (col = '#9d4a33') => `<span style="text-decoration:underline;text-decoration-color:${col};text-decoration-thickness:2px;text-underline-offset:3px">`;

export default {
  id: 'isolation/aim',
  start: 114.0666,
  end: 115.2334,
  z: 4,
  fonts: ['900 23px "Nunito Sans"', '400 20px Inter', '700 20px Inter', '800 20px Inter'],
  async create(root, env) {
    await env.loadFont('Nunito Sans', '/scenes/isolation/fonts/NunitoSans-YTLC-opsz-wdth-wght.ttf', { weight: '200 1000' });
    const msgLine = (base, html) => text(I, 400, 25.65, 601, base, '#000', html);
    const grey = (rest) => `<span style="color:#717071">${underlineYou()}You</span>${rest}</span>`;
    const el = build(root, `
      ${backdrop('#646366', '#6c6b6e')}
      <div style="position:absolute;left:280px;top:130px;width:1360px;height:820px;border-radius:22px;background:#004d97;
        box-shadow:0 22px 60px rgba(0,0,0,0.35);"></div>

      ${win(1300, 152, 316, 655, 'Buddy List', 190.5, 1348)}
      ${winButtons(1489, 163)}
      ${text(I, 400, 18.5, 1319, 231.5, '#080705', 'File')}
      ${text(I, 400, 18.5, 1373, 231.5, '#080705', 'People', 'letter-spacing:-0.45px')}
      ${text(I, 400, 18.5, 1456, 231.5, '#080705', 'Help')}
      ${text(I, 700, 21.2, 1323, 273.5, '#030302', 'RobinHale', 'letter-spacing:-0.5px')}
      <div style="position:absolute;left:1396px;top:292px;width:113px;height:34px;box-sizing:border-box;border:2px solid #84847d;border-bottom:none;
        border-radius:4px 4px 0 0;background:linear-gradient(180deg,#f6f6ed,#f1f1ea 40%,#ececE5);"></div>
      ${text(I, 400, 18.5, 1412, 315.5, '#0c0c09', 'List Setup', 'letter-spacing:-0.4px')}
      <div style="position:absolute;left:1314px;top:322px;width:290px;height:414px;box-sizing:border-box;background:#fdfdfd;border:2px solid #84877e;"></div>
      <div style="position:absolute;left:1314px;top:288px;width:83px;height:38px;box-sizing:border-box;border:2px solid #8a8a83;border-bottom:none;
        border-radius:4px 4px 0 0;background:#fdfcff;"></div>
      <div style="position:absolute;left:1316px;top:290px;width:79px;height:4px;background:linear-gradient(180deg,#ffd150,#ebb938);border-radius:2px 2px 0 0;"></div>
      ${text(I, 400, 18.5, 1329, 313.5, '#0a0a0b', 'Online', 'letter-spacing:-0.2px')}
      <svg style="position:absolute;left:1327px;top:344px" width="14" height="8" viewBox="0 0 14 8"><path d="M0 0H14L7 8Z" fill="#2d2c2f"/></svg>
      ${text(I, 700, 18.5, 1347, 352.5, '#060606', 'Sunday dinner (<span data-k="gcount">3</span>/5)')}
      ${text(I, 400, 17.8, 1368, 374.5, '#0b0b0b', 'MaraQuinn', 'letter-spacing:0.2px')}
      ${text(I, 400, 17.8, 1368, 400.5, '#0a090a', '<span data-k="priya">PriyaSen</span>', 'letter-spacing:0.1px')}
      <div data-k="door" style="position:absolute;left:1338px;top:383px;width:20px;height:24px;display:none">
        <div style="position:absolute;inset:0;background:#5a3416;border-radius:1px"></div>
        <div style="position:absolute;left:2px;top:2px;width:16px;height:22px;background:linear-gradient(90deg,#c48a52,#a5683a);"></div>
        <div style="position:absolute;left:4px;top:4px;width:12px;height:8px;border:1px solid rgba(90,50,20,0.5)"></div>
        <div style="position:absolute;left:4px;top:14px;width:12px;height:8px;border:1px solid rgba(90,50,20,0.5)"></div>
        <div style="position:absolute;left:14px;top:12px;width:3px;height:3px;border-radius:50%;background:#f3d27a"></div>
      </div>
      ${text(I, 400, 17.8, 1369, 427, '#0b0b0b', 'TobiasLund', 'letter-spacing:-0.15px')}
      <svg style="position:absolute;left:1330px;top:446px" width="8" height="14" viewBox="0 0 8 14"><path d="M0 0V14L8 7Z" fill="#2d2c2f"/></svg>
      ${text(I, 700, 18.5, 1347, 457.5, '#080708', 'Offline (<span data-k="ocount">2</span>/5)', 'letter-spacing:0.3px')}
      ${button(1319, 742, 88, 48, 'IM', 775)}
      ${button(1417, 741, 89, 48, 'Chat', 774)}
      ${button(1515, 741, 88, 49, 'Info', 774.5)}

      ${win(576, 546, 700, 388, 'Sunday dinner - Chat Room', 584.5, 623)}
      ${winButtons(1149, 557)}
      ${text(I, 400, 18.5, 594, 625.5, '#090805', 'File')}
      ${text(I, 400, 18.5, 648, 625.5, '#090805', 'Edit')}
      ${text(I, 400, 18.5, 707, 625.5, '#090805', 'Insert')}
      ${text(I, 400, 18.5, 781, 625.5, '#090805', 'People', 'letter-spacing:-0.45px')}
      ${field(594, 640, 460, 158)}
      ${text(I, 700, 25.65, 601, 672.5, '#c70304', 'RobinHale:', 'letter-spacing:.7px')}
      ${text(I, 400, 26.5, 751, 672.5, '#000', `Though ${underlineYou()}you</span> have left`, 'letter-spacing:-.5px')}
      ${msgLine(707.5, grey(' have left'))}
      ${msgLine(742.5, grey(' have left'))}
      ${msgLine(777.5, `<span style="color:#717071">${underlineYou()}You</span> <span data-k="have">have</span> <span data-k="left">left</span></span>`)}
      ${text(I, 400, 18.5, 1067, 659.5, '#0a0906', '<span data-k="ppl">4</span> people here', 'letter-spacing:-0.4px')}
      ${field(1066, 668, 193, 130)}
      <div data-k="list4">
        ${text(I, 400, 17.2, 1077, 691.5, '#0a0a0b', 'MaraQuinn', 'letter-spacing:0.4px')}
        ${text(I, 400, 17.2, 1077, 718, '#0a0a0b', 'PriyaSen', 'letter-spacing:0.4px')}
        ${text(I, 400, 17.2, 1077, 744.5, '#0a0a0b', 'RobinHale', 'letter-spacing:0.4px')}
        ${text(I, 400, 17.2, 1078, 771, '#0a0a0b', 'TobiasLund', 'letter-spacing:0.3px')}
      </div>
      <div data-k="list3" style="display:none">
        ${text(I, 400, 17.2, 1077, 691.5, '#0a0a0b', 'MaraQuinn', 'letter-spacing:0.4px')}
        ${text(I, 400, 17.2, 1077, 718, '#0a0a0b', 'RobinHale', 'letter-spacing:0.4px')}
        ${text(I, 400, 17.2, 1078, 744.5, '#0a0a0b', 'TobiasLund', 'letter-spacing:0.3px')}
      </div>
      ${text(I, 800, 26, 604, 838, '#070503', 'A')}
      <div style="position:absolute;left:604px;top:840px;width:22px;height:5px;background:#e23b2e"></div>
      ${text(I, 800, 21.5, 653, 836.5, '#030201', 'B')}
      <div style="position:absolute;left:703px;top:821px;width:6px;height:16px;"><svg width="8" height="16" viewBox="0 0 8 16"><path d="M5.5 0.5L2.5 15.5" stroke="#100e08" stroke-width="2.2"/></svg></div>
      ${text(I, 400, 22, 742, 836.5, '#050503', 'U')}
      <div style="position:absolute;left:741px;top:840px;width:19px;height:2px;background:#050503"></div>
      <svg style="position:absolute;left:785px;top:817px" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2a5aa8" stroke-width="3.2" stroke-linecap="round">
        <path d="M10 14a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 10a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>
      ${circle(841.5, 828.5, 14, 'radial-gradient(circle at 40% 35%,#ffe772,#f5c518 70%,#d9a300)', 'box-shadow:0 0 0 1.3px #8a6200 inset')}
      <div style="position:absolute;left:835px;top:821px;width:3px;height:5px;border-radius:2px;background:#2e1200"></div>
      <div style="position:absolute;left:845px;top:821px;width:3px;height:5px;border-radius:2px;background:#2e1200"></div>
      <svg style="position:absolute;left:832px;top:826px" width="20" height="10" viewBox="0 0 20 10"><path d="M3 2Q10 10 17 2" stroke="#2e1200" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
      ${field(594, 864, 515, 53)}
      <div data-k="caret" style="position:absolute;left:602px;top:872px;width:2px;height:33px;background:#000"></div>
      ${button(1120, 864, 139, 49, 'Send', 898.5)}
    `);

    return {
      render(t) {
        wipe(root, t, T0, [753, 539, 359, 212]);
        el.have.style.opacity = String(wordAlpha(t, 114.301, 0.083, 0.2));
        el.left.style.opacity = String(wordAlpha(t, 114.533, 0.083, 0.2));
        const gone = t + 1e-7 >= 6880 / 60;
        el.ppl.textContent = gone ? '3' : '4';
        el.list4.style.display = gone ? 'none' : '';
        el.list3.style.display = gone ? '' : 'none';
        el.gcount.textContent = gone ? '2' : '3';
        el.ocount.textContent = gone ? '3' : '2';
        el.priya.style.color = gone ? '#616062' : '#0a090a';
        el.door.style.display = gone ? '' : 'none';
        el.caret.style.visibility = caretOn(t) ? 'visible' : 'hidden';
      },
    };
  },
};
