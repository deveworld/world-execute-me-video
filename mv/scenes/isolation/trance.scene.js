// "So we can enter / The trance, / the trance" — a hypnosis pendulum swinging on the beat above a rosette of
// precessing orbits (lib/rosette-motion.js): one comet's trail, copied by mirror and rotation as the shot goes on,
// grows denser until a dark "black hole" with concentric rings sits in the middle. Ends with a fade to dark and
// the first typed "If" of the next shot.
import { clamp, lerp, smoothstep } from '../../engine/lib/anim.js';
import { createRosette } from './lib/rosette-motion.js';

const CX = 1219.5, CY = 629.5;
const D2R = Math.PI / 180;

const RINGS = [[100.35, [31.5, 63.5]], [101.47, [15.5, 47.5]], [102.4, [7.5, 23.5, 39.5, 55.5, 71.5]]];

// Lyric reveal: soft left-to-right wipe per word: [start, x at start, end, x at end]
const LYRICS = [
  { text: 'So we can enter', y: 531, words: [[99.0, 118, 99.01, 186], [99.43, 205, 99.48, 279], [99.817, 300, 99.867, 383], [100.657, 400, 100.74, 552]] },
  { text: 'The trance,', y: 635.5, words: [[101.4, 118, 101.467, 210], [101.467, 222, 101.567, 436]] },
  { text: 'the trance', y: 740, words: [[102.367, 118, 102.43, 203], [102.43, 215, 102.517, 392]] },
];

const revealEdge = (words, t) => {
  let x = null;
  for (const [t0, x0, t1, x1] of words) if (t >= t0) x = lerp(x0, x1, clamp((t - t0) / (t1 - t0)));
  return x;
};

// Lyric opacity per frame during the final fade.
const LYRIC_FADE = [[6193, 1], [6194, .96], [6196, .94], [6197, .91], [6198, .86], [6199, .85], [6200, .79], [6201, .65], [6202, .5], [6203, .28], [6204, .1], [6205, .05], [6206, 0]];
const tableAt = (tab, x) => {
  if (x <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (x <= tab[i][0]) return lerp(tab[i - 1][1], tab[i][1], (x - tab[i - 1][0]) / (tab[i][0] - tab[i - 1][0]));
  return tab[tab.length - 1][1];
};
const IF_RISE = [8, 3, 1, 1, 0];
const IF_ALPHA = [.55, .81, .95, .97, 1];

const hex = (c) => `rgb(${c.map((v) => Math.round(v)).join(',')})`;
const mixc = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

export default {
  id: 'isolation/trance',
  start: 99.4,
  end: 103.6,
  fonts: ['400 50px "Share Tech Mono"'],
  async create(root, env) {
    await env.loadFont('IM Fell English', '/scenes/isolation/fonts/IMFeENit28P.ttf', { style: 'italic' });
    const { ctx } = env.canvas(root);

    const rosette = createRosette();

    // Lyrics as DOM lines with a moving soft mask.
    const lyricEls = LYRICS.map((L) => {
      const el = document.createElement('div');
      el.textContent = L.text;
      // ~10% more ink than the plain face, so a thin
      // same-colour stroke; "The trance," sits 0.4 px further left.
      const left = L.text === 'The trance,' ? 112.6 : 120;
      const size = L.text === 'The trance,' ? 76 : L.text === 'the trance' ? 74.5 : 74;
      const spacing = L.text === 'The trance,' ? -.5 : L.text === 'the trance' ? -.05 : .1;
      el.style.cssText = `position:absolute;left:${left}px;top:${L.y - 68}px;font:italic 400 ${size}px/96px 'IM Fell English';` +
        `color:#e8e6fd;-webkit-text-stroke:0.45px #e8e6fd;white-space:pre;letter-spacing:${spacing}px;`;
      root.appendChild(el);
      return el;
    });
    const ifEl = document.createElement('div');
    ifEl.textContent = 'If';
    ifEl.style.cssText = 'position:absolute;left:380.5px;top:684px;font:400 50.5px/50px "Share Tech Mono";color:#f2f2f8;display:none;';
    root.appendChild(ifEl);

    const NAVY0 = [11, 14, 34], NAVY1 = [18, 13, 46];
    const CEN0 = [13, 16, 40], CEN1 = [22, 16, 54];

    return {
      render(t) {
        // background: navy drifting to purple
        const k = clamp((t - 100.5) / 2.0);
        const bgE = mixc(NAVY0, NAVY1, k), bgC = mixc(CEN0, CEN1, k);
        const g = ctx.createRadialGradient(CX - 60, 560, 40, CX - 60, 560, 1150);
        g.addColorStop(0, hex(bgC));
        g.addColorStop(1, hex(bgE));
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1920, 1080);

        // concentric rings inside the hole
        ctx.lineWidth = 1;
        for (const [t0, rs] of RINGS) {
          if (t < t0) continue;
          const age = t - t0;
          const a = (.2 + .48 * Math.exp(-age / .65)) * clamp(age / .1);
          ctx.strokeStyle = `rgba(154,148,217,${a})`;
          for (const r of rs) {
            ctx.beginPath();
            ctx.arc(CX, CY, r, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // pendulum: one full swing per two beats
        const th = 15.630316 * D2R * Math.cos(6.8052 * (t - 99.4378976)) + .19247 * D2R;
        const px = 1220, py = 111, Lp = 130.9;   // bob centre / arc row
        // During the final fade the pendulum's thin lines keep only ~1/4 of their contrast (bob ~0.4),
        // more than the shared overlay alone gives: dim the strokes a little further.
        const lineA = 1 - 0.38 * smoothstep(clamp((t * 60 - 6194) / 16));
        ctx.globalAlpha = lineA;
        // top bar: a crisp one-pixel line on row 102 (peak grey 165)
        ctx.strokeStyle = '#a5a7c2';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(1199, 102.5); ctx.lineTo(1243, 102.5);
        ctx.stroke();
        ctx.strokeStyle = '#9b9fb6';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(1220, 103); ctx.lineTo(1220, 108);
        ctx.stroke();
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.stroke();
        // scale arc with ticks
        ctx.strokeStyle = '#8f93aa';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(px, py, 152, (90 - 22) * D2R, (90 + 22) * D2R);
        ctx.stroke();
        for (let i = -4; i <= 4; i++) {
          const a = (90 + i * 5.1) * D2R;
          const l = i % 2 === 0 ? 8 : 5;
          ctx.beginPath();
          ctx.moveTo(px + 152 * Math.cos(a), py + 152 * Math.sin(a));
          ctx.lineTo(px + (152 + l) * Math.cos(a), py + (152 + l) * Math.sin(a));
          ctx.stroke();
        }
        const bx = px + Lp * Math.sin(th), by = py + Lp * Math.cos(th);
        ctx.strokeStyle = 'rgba(150,154,180,0.75)';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(px + 3 * Math.sin(th), py + 3 * Math.cos(th));
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.75)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        const bg2 = ctx.createLinearGradient(bx - 11, by - 11, bx + 11, by + 11);
        bg2.addColorStop(0, '#c3b28a');
        bg2.addColorStop(0.45, '#b0996b');
        bg2.addColorStop(1, '#a8916a');
        ctx.fillStyle = bg2;
        ctx.beginPath();
        ctx.arc(bx, by, 11.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Final fade (frames 6194-6210): the whole frame dims towards a dark violet while
        // keeping the background gradient. The rosette dims itself, so it is composited after the fade.
        const fade = smoothstep(clamp((t * 60 - 6194) / 16));
        if (fade > 0) {
          ctx.fillStyle = `rgba(8,8,16,${0.64 * fade})`;
          ctx.fillRect(0, 0, 1920, 1080);
        }
        rosette.floor(ctx, t);
        rosette.lines(ctx, t);
        rosette.heads(ctx, t);
        ctx.globalCompositeOperation = 'source-over';

        const textA = tableAt(LYRIC_FADE, t * 60);
        LYRICS.forEach((L, i) => {
          const el = lyricEls[i];
          const x = revealEdge(L.words, t);
          if (x === null || textA <= 0) { el.style.display = 'none'; return; }
          el.style.display = '';
          el.style.opacity = String(textA);
          const left = L.text === 'The trance,' ? 112.6 : 120;
          const edge = x - left;
          const mask = `linear-gradient(90deg, #000 ${edge - 2}px, transparent ${edge + 12}px)`;
          el.style.webkitMaskImage = mask;
          el.style.maskImage = mask;
        });
        // "If" rises ~8 px into place while it brightens over its first four frames
        const fi = Math.round(t * 60) - 6208;
        ifEl.style.display = fi >= 0 ? '' : 'none';
        if (fi >= 0) {
          ifEl.style.transform = `translateY(${IF_RISE[Math.min(fi, IF_RISE.length - 1)]}px)`;
          ifEl.style.opacity = String(IF_ALPHA[Math.min(fi, IF_ALPHA.length - 1)]);
        }
      },
    };
  },
};
