// The final chat changes to the iOS-style conversation, then all of the old
// messages fade away as the final "Isolation" bubble grows from its lower right.
import { build, backdrop, caretOn, wordAlpha, wipe, text, circle, clamp, titleGlide } from './lib/chat.js';

const R = 'Inter';
const T0 = 6962 / 60;
const fade = (t, a, b) => 1 - clamp((t - a) / (b - a));
const softFade = (t,a,b) => { const p=clamp((t-a)/(b-a));return 1-p*p*(3-2*p); };
const ul = (s) => `<span style="text-decoration:underline;text-decoration-color:#a44b2b;text-decoration-thickness:1.7px;text-underline-offset:4px">${s}</span>`;

// The tail is a separate, overlapping curved shape, as in the original bubble.
const bubble = (x, y, w, h, tail, key = '') => `<div ${key ? `data-k="${key}"` : ''} style="position:absolute;left:${x}px;top:${y}px;width:${w + tail}px;height:${h}px;">
  <svg width="${w + tail}" height="${h}" viewBox="0 0 ${w + tail} ${h}">
    <rect x="0" y="0" width="${w}" height="${h}" rx="${h / 2}" fill="#007aff"/>
    <path d="M${w - h * .10} ${h * .49}L${w - h * .014} ${h * .49}L${w - h * .014} ${h * .73}Q${w - h * .007} ${h * .91} ${w + tail} ${h * .951}Q${w + tail * .52} ${h * 1.025} ${w - h * .045} ${h * .973}Q${w - h * .15} ${h * .948} ${w - h * .20} ${h * .85}Z" fill="#007aff"/>
  </svg></div>`;

export default {
  id: 'isolation/imessage',
  start: T0,
  end: 118.33,
  z: 6,
  fonts: ['400 136px Inter', '500 36px Inter'],
  create(root) {
    const notices = [594, 640.5, 687, 733.5].map((base, i) =>
      `<div data-k="n${i}">${text(R, 400, 28.5, 877.5, base, '#808080', `${ul('You')} have left`, 'letter-spacing:-0.75px')}</div>`).join('');
    const el = build(root, `
      ${backdrop('#939295', '#9e9da0')}
      <div style="position:absolute;left:280px;top:130px;width:1360px;height:820px;border-radius:100px;background:#fdfdfd;
        box-shadow:0 24px 55px rgba(0,0,0,.26);overflow:hidden;">
        <div style="position:absolute;left:0;top:0;width:1360px;height:130px;background:#f4f4f4"></div>
        <div style="position:absolute;left:0;top:130px;width:1360px;height:1px;background:#aeaeae"></div>
      </div>
      <svg style="position:absolute;left:389px;top:167px" width="23" height="38" viewBox="0 0 23 38" fill="none" stroke="#007aff" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 2.5L2.5 18.5L18.5 34.5"/></svg>
      <div data-k="mq">${circle(960, 179, 35.5, '#fdc0a0')}${text(R, 400, 28.5, 937, 189, '#111', 'MQ', 'letter-spacing:-0.5px')}</div>
      <div data-k="anon" style="opacity:0">
        ${circle(960, 179, 35.5, 'linear-gradient(180deg,#bcc0c9,#9698a0)')}
        ${circle(960, 174, 10, '#fdfdfd')}
        <div style="position:absolute;left:942px;top:193px;width:36px;height:24px;border-radius:22px 22px 0 0;background:#fdfdfd"></div>
      </div>
      <div data-k="title" style="position:absolute;left:0;top:0">
      ${text(R, 400, 23.29, 875, 243, '#080808', 'Sunday dinner', 'letter-spacing:-0.246px')}
      <svg style="position:absolute;left:1039px;top:229px" width="10" height="18" viewBox="0 0 10 18"><path d="M1.5 1.5L8 9L1.5 16.5" fill="none" stroke="#777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </div>
      <svg style="position:absolute;left:1484px;top:171px" width="55" height="32" viewBox="0 0 55 32"><rect x="1.5" y=".5" width="37" height="29.5" rx="8" fill="none" stroke="#007aff" stroke-width="3.4"/><path d="M42 11L54 3V28L42 20Z" fill="#007aff"/></svg>

      <div data-k="today0">${text(R, 500, 24.5, 960, 326.5, '#808080', 'Today <span style="font-weight:400">6:02 PM</span>', 'transform:translateX(-50%);letter-spacing:-.2px')}</div>
      <div data-k="named">${text(R, 400, 28, 960, 368.5, '#808080', 'You named the conversation “Sunday dinner”.', 'transform:translateX(-50%);letter-spacing:-0.55px')}</div>
      <div data-k="today1">${text(R, 500, 24.5, 960, 423, '#808080', 'Today <span style="font-weight:400">11:46 PM</span>', 'transform:translateX(-50%);letter-spacing:-.2px')}</div>
      <div data-k="oldmsg">
        <div data-k="oldbub">${bubble(1132, 440, 410, 76, 12)}</div>
        <div data-k="oldtxt">${text(R, 500, 35.62, 1158, 490.5, '#fff', 'Though <span style="color:#ffddce">you</span> have left', 'letter-spacing:-0.011px')}</div>
        ${text(R, 400, 24, 1426, 545, '#808080', 'Delivered', 'letter-spacing:.15px')}
      </div>
      ${notices}
      <div data-k="last">${text(R, 400, 28.5, 839.5, 779.5, '#808080', `${ul('You')} have <span data-k="left">left</span> <span data-k="me">me</span> <span data-k="in">in</span>`, 'letter-spacing:-0.75px')}</div>

      <div data-k="iso" style="position:absolute;left:826px;top:285px;width:760px;height:287px;transform-origin:716px 287px;opacity:0">
        ${bubble(0, 0, 716, 287, 44)}
        ${text(R, 400, 135.62, 84, 194, '#fffdf9', 'Isolation', 'letter-spacing:-1.353px')}
      </div>
      ${circle(420.5, 854.5, 34, '#e6e6e6')}
      <svg style="position:absolute;left:407px;top:841px" width="27" height="28" viewBox="0 0 27 28" fill="none" stroke="#808080" stroke-width="3.8" stroke-linecap="round"><path d="M1 14H26M13.5 1V27"/></svg>
      <div style="position:absolute;left:471px;top:817px;width:1070px;height:76px;box-sizing:border-box;border:1px solid #bcbcbc;border-radius:40px;background:#fdfdfd"></div>
      <div data-k="caret" style="position:absolute;left:495px;top:832px;width:2px;height:45px;background:#007aff"></div>
      <svg style="position:absolute;left:1485px;top:831px" width="30" height="46" viewBox="0 0 30 46" fill="none" stroke="#808080" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="14" height="27" rx="7"/><path d="M3 20V23Q3 35 15 35Q27 35 27 23V20M15 35V44"/></svg>
      <div style="position:absolute;left:819px;top:923px;width:281px;height:11px;border-radius:7px;background:#000"></div>
    `);
    return {
      render(t) {
        wipe(root, t, T0, [739, 525, 391, 141]);
        // The title is a shared element: it keeps gliding from the WhatsApp title's place (measured left
        // edge per frame, see lib/chat.js; the last ~2 px of drop are proportional to the remaining x).
        const back = 424 - titleGlide(t);
        el.title.style.transform = back > 0 ? `translate(${(-back).toFixed(2)}px, ${(-back / 34).toFixed(2)}px)` : '';
        el.left.style.opacity = String(wordAlpha(t, 116.542, .083, .2));
        el.me.style.opacity = String(wordAlpha(t, 117.284, .104, .2));
        el.in.style.opacity = String(wordAlpha(t, 117.384, .076, .2));
        el.mq.style.opacity = String(fade(t, 116.933, 117.017));
        el.anon.style.opacity = String(clamp((t - 117.017) / .083));
        el.today0.style.opacity = String(softFade(t, 117.327, 117.377));
        el.named.style.opacity = String(softFade(t, 117.343, 117.407));
        el.today1.style.opacity = String(softFade(t, 117.381, 117.435));
        // the old bubble fades out while blurring; its text is gone a frame earlier (measured 7045-7048)
        el.oldmsg.style.opacity = String(softFade(t, 117.4, 117.475));
        el.oldtxt.style.opacity = String(softFade(t, 117.405, 117.45));
        el.oldbub.style.filter = t > 117.4 ? `blur(${(6 * clamp((t - 117.4) / 0.075)).toFixed(2)}px)` : '';
        for (let i = 0; i < 4; i++) el[`n${i}`].style.opacity = String(softFade(t, 117.44 + i * 0.0285, 117.5 + i * 0.0285));   // measured stagger ~1.7 frames
        el.last.style.opacity = String(softFade(t, 117.633, 117.767));
        const age = Math.max(0, t - 117.5333);
        el.iso.style.opacity = String(clamp((t - 117.539) / .05));   // measured: .22, .55, .89, 1 on frames 7053-7056
        const scale = 1 - .225 * Math.exp(-20 * age);
        el.iso.style.transform = `scale(${scale})`;
        el.caret.style.visibility = caretOn(t) ? 'visible' : 'hidden';
      },
    };
  },
};
