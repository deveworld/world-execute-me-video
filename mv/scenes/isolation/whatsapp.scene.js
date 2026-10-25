// WhatsApp-style Android chat "Sunday dinner": "Though you have left" bubble and four "You have left"
// notices; the 4th slides in from the left, its "left" fills in; Tobias drops out of the subtitle.
import { build, backdrop, caretOn, wordAlpha, wipe, text, circle, clamp, titleEase, titleGlide } from './lib/chat.js';

const R = 'Roboto';
const T0 = 6906 / 60; // wipe start (115.1)
const PILL_Y = [527, 598.3, 669.6, 741];
const PILL_X = 862;

const ul = (s) => `<span style="text-decoration:underline;text-decoration-color:#a4502b;text-decoration-thickness:2px;text-underline-offset:3.5px">${s}</span>`;

const pill = (k, y) => `
  <div data-k="${k}" style="position:absolute;left:${PILL_X}px;top:${y}px;width:197px;height:55px;">
    <div style="position:absolute;inset:0;border-radius:11px;background:#e0f1f9;box-shadow:0 2px 0 #c3c1b9;"></div>
    ${text(R, 400, 26.1, 24, 36.6, '#32434b', `${ul('You')} <span data-k="${k}h">have</span> <span data-k="${k}l">left</span>`)}
  </div>`;

export default {
  id: 'isolation/whatsapp',
  start: 115.1,
  end: 116.1667,
  z: 5,
  fonts: ['400 30px Roboto', '500 30px Roboto'],
  async create(root) {
    const el = build(root, `
      ${backdrop('#6e6d70', '#767578')}
      <div style="position:absolute;left:280px;top:130px;width:1360px;height:820px;border-radius:22px;overflow:hidden;background:#eae3dc;
        box-shadow:0 22px 60px rgba(0,0,0,0.35);">
        <div style="position:absolute;left:0;top:0;width:1360px;height:51px;background:#054c45"></div>
        <div style="position:absolute;left:0;top:51px;width:1360px;height:116px;background:#065e53"></div>
        <div style="position:absolute;left:0;top:167px;width:1360px;height:2px;background:linear-gradient(#d9d2c9,#e5e3dd)"></div>
      </div>
      ${text(R, 500, 29.1, 353, 165.5, '#f1fbfc', '11:46')}
      <svg style="position:absolute;left:1458px;top:144px" width="31" height="23" viewBox="0 0 31 23"><path d="M15.5 22.5L0.5 6Q15.5 -5 30.5 6Z" fill="#fff"/></svg>
      <div style="position:absolute;left:1505px;top:159px;width:5px;height:6px;background:#fff"></div>
      <div style="position:absolute;left:1512px;top:154px;width:5px;height:11px;background:#fff"></div>
      <div style="position:absolute;left:1519px;top:149px;width:5px;height:16px;background:#fff"></div>
      <div style="position:absolute;left:1526px;top:143px;width:5px;height:22px;background:#fff"></div>
      <div style="position:absolute;left:1551px;top:137px;width:9px;height:5px;border-radius:1px;background:#f4f8f8"></div>
      <div style="position:absolute;left:1545px;top:141px;width:20px;height:33px;border-radius:3px;background:linear-gradient(180deg,#4c8a82 0,#4c8a82 9px,#fff 10px)"></div>

      <svg style="position:absolute;left:300px;top:221px" width="36" height="35" viewBox="0 0 36 35" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M34 17.5H3M17 3L2.5 17.5L17 32"/></svg>
      ${circle(388.5, 238.5, 42, '#cdd8df')}
      ${circle(380.5, 230, 8.5, '#fff')}
      ${circle(398.5, 233, 7.5, '#fff')}
      <div style="position:absolute;left:364px;top:243px;width:33px;height:16px;border-radius:16px 16px 3px 3px;background:#fff"></div>
      <div style="position:absolute;left:397px;top:245px;width:17px;height:14px;border-radius:12px 12px 3px 3px;background:#fff;box-shadow:-2px 0 0 #cdd8df"></div>
      <div data-k="title" style="position:absolute;left:0;top:0">${text(R, 500, 38.2, 450, 233.5, '#f2fcfd', 'Sunday dinner')}</div>
      ${text(R, 400, 28, 451, 276.5, '#e6f9fc', '<span data-k="sub">Mara Quinn, Tobias Lund, You</span>')}
      <svg style="position:absolute;left:1368px;top:224px" width="40" height="32" viewBox="0 0 40 32"><rect x="0" y="2" width="27" height="28" rx="4" fill="#fff"/><path d="M26 12L40 3V29L26 20Z" fill="#fff"/></svg>
      <svg style="position:absolute;left:1463.5px;top:212.5px" width="52" height="52" viewBox="0 0 24 24"><path fill="#fff" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
      ${circle(1588.5, 225.5, 4.8, '#fff')}${circle(1588.5, 239, 4.8, '#fff')}${circle(1588.5, 252.5, 4.8, '#fff')}

      <div style="position:absolute;left:894px;top:331px;width:131px;height:54px;border-radius:11px;background:#e0f1f9;box-shadow:0 2px 0 #c9cbc4;"></div>
      ${text(R, 500, 25.5, 919, 368.5, '#394b53', 'TODAY')}
      <svg style="position:absolute;left:1079.5px;top:418px" width="532" height="80" viewBox="0 0 532 80">
        <path d="M10 2H527L512 30V65Q512 75 502 75H10Q2 75 2 65V12Q2 2 10 2Z" fill="#bec1b5" transform="translate(0 1.8)"/>
        <path d="M10 2H527L512 30V65Q512 75 502 75H10Q2 75 2 65V12Q2 2 10 2Z" fill="#dbf6c4"/>
      </svg>
      ${text(R, 400, 34.4, 1100, 466, '#101b0c', `Though ${ul('you')} have left`, 'letter-spacing:-.2px')}
      ${text(R, 400, 23.2, 1437, 479.5, '#778a71', '11:46 PM')}
      <svg style="position:absolute;left:1541px;top:459px" width="34" height="22" viewBox="0 0 34 22" fill="none" stroke="#2da4db" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <path d="M2 12L8 19L22 3"/><path d="M14 18L16 19L31 3"/></svg>

      ${pill('p0', PILL_Y[0])}${pill('p1', PILL_Y[1])}${pill('p2', PILL_Y[2])}${pill('p3', PILL_Y[3])}

      <div style="position:absolute;left:292px;top:836px;width:1221px;height:102px;border-radius:51px;background:#fdfdfd;box-shadow:0 1.5px 1px #bcbab6;"></div>
      ${circle(342.5, 887, 18.5, 'transparent', 'box-shadow:inset 0 0 0 3px #8e8e8e')}
      ${circle(336, 881, 2.6, '#8e8e8e')}${circle(349, 881, 2.6, '#8e8e8e')}
      <svg style="position:absolute;left:331px;top:887px" width="24" height="12" viewBox="0 0 24 12"><path d="M3 2Q12 13 21 2" stroke="#8e8e8e" stroke-width="3" fill="none" stroke-linecap="round"/></svg>
      <div data-k="caret" style="position:absolute;left:384px;top:864px;width:3.5px;height:46px;background:#077a6b"></div>
      ${text(R, 400, 36, 392, 899.6, '#8f8f8f', 'Type a message')}
      <svg style="position:absolute;left:1354px;top:866px" width="40" height="42" viewBox="0 0 24 24" fill="none" stroke="#8e9092" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      <svg style="position:absolute;left:1428px;top:868px" width="44" height="38" viewBox="0 0 44 38"><path d="M4 9H12L16 3H28L32 9H40Q42 9 42 11V33Q42 35 40 35H4Q2 35 2 33V11Q2 9 4 9Z" fill="none" stroke="#8e9092" stroke-width="3.6"/><circle cx="22" cy="21" r="7" fill="none" stroke="#8e9092" stroke-width="3.6"/></svg>
      ${circle(1577.5, 887.5, 50, '#0e8b7d', 'box-shadow:inset 0 0 0 .8px rgba(255,255,255,.35),0 2px 2px rgba(0,0,0,0.18)')}
      <svg style="position:absolute;left:1561px;top:867px" width="33" height="42" viewBox="0 0 33 42"><rect x="10" y="1" width="13" height="25" rx="6.5" fill="#fff"/>
        <path d="M4 19Q4 32 16.5 32Q29 32 29 19" stroke="#fff" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M16.5 32V40" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/></svg>
    `);

    await document.fonts.ready;
    return {
      render(t) {
        wipe(root, t, T0, [722, 525, 330, 170]);
        // the 4th notice slides in from the left (ease-out), then its "left" fills in
        const k = clamp((t - T0) / 0.27);
        el.p3.style.transform = `translateX(${-Math.pow(1 - k, 4) * 285}px)`;
        el.p3l.style.opacity = String(wordAlpha(t, 115.433, 0.083, 0.2));
        el.sub.textContent = t + 1e-7 >= 6934 / 60 ? 'Mara Quinn, You' : 'Mara Quinn, Tobias Lund, You';
        el.caret.style.visibility = caretOn(t) ? 'visible' : 'hidden';
        // shared-element move of the title toward the centred iMessage title during the outgoing wipe
        // left edge +0, 88, 168, 235, 287, 327 px and top +0, 2, 4, 6, 7, 8 px on frames 6962-6967
        const m = titleEase(t);
        el.title.style.transform = `translate(${titleGlide(t).toFixed(2)}px, ${(10.3 * m).toFixed(2)}px)`;
      },
    };
  },
};
