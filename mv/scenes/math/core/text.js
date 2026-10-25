// DOM typography preserves the serif's per-letter reveal timing and baseline metrics.
import { TYPE, MONO, SERIF, COL } from './const.js';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (k) => 1 - Math.pow(1 - k, 3);

export function el(tag, css, parent) {
  const e = document.createElement(tag);
  if (css) e.style.cssText = css;
  if (parent) parent.appendChild(e);
  return e;
}

// Baseline offset (px from the element's top) of a single-line block, measured with a probe.
export function baselineOf(block) {
  const probe = el('span', 'display:inline-block;width:0;height:0;vertical-align:baseline');
  block.appendChild(probe);
  const y = probe.offsetTop;
  probe.remove();
  return y;
}

const mixHex = (a, b, k) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
};

// Small mono line: each word blurs/fades in rising ~6 px; the first word then turns lavender.
export function monoLine(root, words) {
  const { x, base, size, weight } = TYPE.mono;
  const block = el('div', `position:absolute;left:${x}px;top:0;white-space:pre;line-height:1;` +
    `font:${weight} ${size}px ${MONO};color:${COL.monoGray};font-kerning:none`, root);
  const spans = words.map(([w], i) => {
    const s = el('span', 'display:inline-block', block);   // no will-change: own layers rasterised nondeterministically
    s.textContent = w;
    if (i < words.length - 1) block.appendChild(document.createTextNode(' '));
    return s;
  });
  let top = 0;
  return {
    layout() { top = base - baselineOf(block); block.style.top = `${top}px`; },
    render(t, alpha) {
      block.style.display = alpha > 0 ? '' : 'none';
      if (alpha <= 0) return;
      block.style.opacity = alpha;
      words.forEach(([, t0], i) => {
        const s = spans[i];
        const k = clamp((t - t0) / 0.2);
        if (k <= 0) { s.style.opacity = 0; return; }
        const e = easeOut(k);
        s.style.opacity = Math.min(1, k * 1.6) * (0.35 + 0.65 * e);
        s.style.transform = k < 1 ? `translateY(${(6 * (1 - e)).toFixed(2)}px)` : 'none';
        s.style.filter = k < 1 ? `blur(${(2.2 * (1 - e)).toFixed(2)}px)` : 'none';
        if (i === 0) s.style.color = mixHex(COL.monoGray, COL.lav, clamp((t - t0 - 0.05) / 0.12));
      });
    },
  };
}

// Big serif line: letters fade in with a 1-frame stagger (a soft left-to-right wipe).
// "Then" is italic lavender, "you" peach, everything else near-white.
export function serifLine(root, words) {
  const S = TYPE.serif;
  const block = el('div', `position:absolute;left:${S.x}px;top:0;white-space:pre;line-height:1;` +
    `font-size:${S.size}px;font-family:${SERIF};font-weight:${S.weight};` +
    `font-variation-settings:"opsz" ${S.opsz};letter-spacing:${S.spacing ?? 0}px;color:${COL.white}`, root);
  const letters = [];
  words.forEach(([w, t0, duration = 0.18], i) => {
    const ws = el('span', '', block);
    if (w === 'Then') {
      ws.style.cssText = `font-style:italic;font-weight:${S.itWeight};font-variation-settings:"opsz" ${S.itOpsz};color:${COL.lav}`;
    } else if (w === 'you') ws.style.color = COL.peach;
    [...w].forEach((ch, j) => {
      const ls = el('span', '', ws);
      ls.textContent = ch;
      letters.push([ls, t0 + j * 0.0167, duration]);
    });
    if (i < words.length - 1) block.appendChild(document.createTextNode(' '));
  });
  return {
    layout() { block.style.top = `${S.base - baselineOf(block)}px`; },
    render(t, alpha) {
      block.style.display = alpha > 0 ? '' : 'none';
      if (alpha <= 0) return;
      block.style.opacity = alpha;
      for (const [s, t0, duration] of letters) s.style.opacity = clamp((t - t0) / duration).toFixed(3);
    },
  };
}
