// Shared helpers for the "Though you have left ... in ISOLATION" chat shots (110.93 - 118.33).
import { clamp } from '../../../engine/lib/anim.js';

export const SPB = 60 / 130;
// Every caret in these shots blinks on one shared clock (on for half a beat, off for half a beat).
export const CARET0 = 110.976;
export const caretOn = (t) => ((((t - CARET0) / SPB) % 1) + 1) % 1 < 0.5;

// Shots change with a bottom-to-top "scanline" wipe: four steps held two frames each (30 fps),
// the new shot covering everything below a horizontal edge. ys = edge rows of the four steps.
export function wipe(root, t, t0, ys) {
  const k = Math.floor((t - t0) * 30 + 0.01);
  root.style.clipPath = k >= 0 && k < ys.length ? `inset(${ys[k]}px 0 0 0)` : '';
}

const FONT_FILES = {
  'Plus Jakarta Sans': ['/scenes/isolation/fonts/PlusJakartaSans-wght.ttf', { weight: '200 800' }],
};
export async function loadFonts(env, names) {
  await Promise.all(names.map((n) => env.loadFont(n, ...FONT_FILES[n])));
}

// Build absolutely positioned HTML into root. Returns a lookup for elements tagged with data-k.
export function build(root, html) {
  root.insertAdjacentHTML('beforeend', html);
  const map = {};
  root.querySelectorAll('[data-k]').forEach((el) => { map[el.dataset.k] = el; });
  return map;
}

// Backdrop with a soft vignette (lighter in the middle) and the panel's drop shadow.
export function backdrop(edge, center) {
  return `<div style="position:absolute;inset:0;background:radial-gradient(ellipse 75% 75% at 50% 50%, ${center} 0%, ${edge} 100%)"></div>`;
}

// A word that fades from 20% to full opacity over ~5 frames at time `at`.
export const wordAlpha = (t, at, dur = 0.083, dim = 0.2) => (at == null ? 1 : dim + (1 - dim) * clamp((t - at) / dur));

export { clamp };

// Shared-element title glide from the WhatsApp header to the iMessage title (116.03 - 116.25): the title's
// left edge per frame (6962-6975), 452 -> 876 px. titleGlide(t) returns
// the x offset travelled so far, linearly interpolated between frames; titleEase is the same as a fraction.
const GLIDE_X = [0, 88, 168, 235, 287, 327, 356, 378, 394, 406, 415, 420, 423, 424];
export const titleGlide = (t) => {
  const k = t * 60 - 6962;
  if (k <= 0) return 0;
  if (k >= GLIDE_X.length - 1) return GLIDE_X[GLIDE_X.length - 1];
  const i = Math.floor(k);
  return GLIDE_X[i] + (GLIDE_X[i + 1] - GLIDE_X[i]) * (k - i);
};
export const titleEase = (t) => titleGlide(t) / 424;

// The other shots' titles start at the previous shot's title position and settle with the same power
// ease (Discord from chat1, IRC from Discord). Returns the remaining fraction of the offset.
export const titleSettle = (t, f0, frames) => Math.pow(1 - clamp((t * 60 - f0) / frames), 4.3);

// Vertical metrics (hhea/typo ascent, descent in em) used to put a text's baseline at an exact y.
const METRICS = {
  'Nunito Sans': [1.011, 0.353],
  'Plus Jakarta Sans': [1.038, 0.222],
  Roboto: [0.928, 0.244],
  'Source Code Pro': [0.984, 0.273],
  Inter: [0.969, 0.241],
  'Noto Sans': [1.069, 0.293],
  'Share Tech Mono': [0.885, 0.242],
};
// Absolutely positioned single-line text whose alphabetic baseline sits at `base`.
export function text(font, weight, size, x, base, color, content, extra = '') {
  const [a, d] = METRICS[font];
  const top = base - ((1 - (a + d)) / 2 + a) * size;
  return `<div style="position:absolute;left:${x}px;top:${top.toFixed(2)}px;font-family:'${font}';font-weight:${weight};` +
    `font-size:${size}px;line-height:${size}px;color:${color};white-space:pre;${extra}">${content}</div>`;
}

// Lucide-style outline icons (24x24 viewBox), drawn centred at (cx, cy) in a box of `size` px.
const ICONS = {
  phone: '<path d="M5.2 2.5L1.7 6.5C3.6 14.8 9 20.2 17.5 22L21.5 17.8L16.5 13.8L13.7 16.6C10.7 15.1 8.6 13 7 10L9.7 7.3Z"/>',
  video: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  pin: '<path d="M8 2.5H16L15 8.5Q15 11 18 13H6Q9 11 9 8.5ZM12 13V22"/>',
  userPlus: '<path d="M15.5 21C15.5 16 13.2 13 8.5 13S1.5 16 1.5 21"/><circle cx="8.5" cy="6.5" r="3.8"/><path d="M20 13V21M16 17H24"/>',
  users: '<path d="M15.7 21C15.7 16 13.2 13 8.7 13S1.7 16 1.7 21"/><circle cx="8.7" cy="6.8" r="4"/><path d="M22 21C22 16.7 20.4 14.3 17 13.5M16 2.8a4 4 0 0 1 0 8"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  sticky: '<path d="M15.5 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z"/><path d="M15 3v6h6"/>',
  arrowLeft: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
};
export function icon(name, cx, cy, size, color, stroke = 2, fill = 'none', extra = '') {
  return `<svg style="position:absolute;left:${cx - size / 2}px;top:${cy - size / 2}px;${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" ` +
    `fill="${fill}" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
}

export function circle(cx, cy, r, bg, extra = '') {
  return `<div style="position:absolute;left:${cx - r}px;top:${cy - r}px;width:${2 * r}px;height:${2 * r}px;border-radius:50%;background:${bg};${extra}"></div>`;
}
