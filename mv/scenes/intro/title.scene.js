// A statement is tokenized, parsed into a tree, and stepped through an x86 pipeline.
import { clamp, lerp, ease } from './lib/util.js';
import { titleState, tokenState, TOKEN_ON, clockAt, clockCellOn, executionColour, registerHighlight, treeLevel } from './lib/title-motion.js';

const FONT = '"Geist Mono"';
const TITLE_FONT = '"Title Mono"';
const C = { white: '#f0effb', dim: '#85838d', purple: '#b9b0ff', blue: '#6058e4', line: '#aaa8b5' };
const TOKENS = [['world', 'w'], ['.', 'p'], ['execute', 'w'], ['(', 'p'], ['me', 'm'], [')', 'p'], [';', 'p']];
// Each font supplies real glyphs; token layout stays fixed while its weight changes.
const TOKEN_TYPE = [
  [TITLE_FONT, 130, 500, 205], [FONT, 132, 500, 204], ['"Roboto Mono"', 140, 450, 206],
  [TITLE_FONT, 130, 500, 204], [FONT, 140, 450, 206], [TITLE_FONT, 130, 500, 204], [FONT, 140, 500, 204],
];
const TOKEN_INK = [[250, 394], [685, 18], [741, 548], [1326, 29], [1384, 148], [1562, 29], [1651, 18]];
const TOKEN_BOXES = [[235, 658], [666, 716], [724, 1308], [1316, 1370], [1378, 1549], [1557, 1623], [1631, 1694]];
const LABELS = [
  ['object', 249, 645, 446, 287, 15.4333, 15.4667, 0.15],
  ['member access', 678, 710, 694, 242, 15.8833, 15.9333, 0.19],
  ['method', 741, 1292, 1016, 287, 16.15, 16.1833, 0.15],
  ['argument', 1384, 1532, 1458, 287, 16.35, 16.3833, 0.19],
  ['statement end', 1644, 1676, 1660, 242, 16.5833, 16.6333, 0.18],
];
const ASM = [
  ['0040102E', '8B 45 F8', 'mov  eax,[ebp-8]'], ['00401031', '50', 'push eax'],
  ['00401032', '8B 0D 44 9A 40 00', 'mov  ecx,[00409A44]'], ['00401038', '8B 11', 'mov  edx,[ecx]'],
  ['0040103A', 'FF 52 08', 'call dword ptr [edx+8]'], ['0040103D', '33 C0', 'xor  eax,eax'],
  ['0040103F', '8B E5', 'mov  esp,ebp'], ['00401041', '5D', 'pop  ebp'], ['004011A0', '55', 'push ebp'],
];
const PIPE = [
  [[0, 'PF'], [1, 'D1'], [2, 'D2'], [3, 'EX'], [4, 'WB']],
  [[1, 'PF'], [2, 'D1'], [3, 'D2'], [4, 'EX'], [5, 'WB']],
  [[2, 'PF'], [3, 'D1'], [4, 'D2'], [5, 'EX'], [6, 'WB']],
  [[3, 'PF'], [4, 'D1'], [5, 'AGI'], [6, 'D2'], [7, 'EX'], [8, 'WB']],
  [[4, 'PF'], [5, 'D1'], [6, 'D1'], [7, 'AGI'], [8, 'D2'], [9, 'EX']],
  [[5, 'PF'], [6, 'PF'], [7, 'D1'], [8, 'D1'], [9, '×']],
  [[7, 'PF'], [8, 'PF'], [9, '×']], [[9, '×']], [[10, 'PF']],
];
const ROW_ON = [19.10, 19.1567, 19.2133, 19.2633, 19.3267, 21.18, 21.6417, 22.105, 22.10];
const BYTE_ON = [19.5833, 19.6333, 19.70, 19.75, 19.8167];
const ADDRESS_ON = [19.8333, 19.8667, 19.90, 19.9167, 19.95];
const CURRENT = [[20.0333, 0], [20.9667, 1], [21.1833, 2], [21.4167, 3], [21.8833, 4], [22.1167, 8]];
const UNDERLINES = [[20.0333, 21.2167, 1384, 149, C.blue], [21.1833, 21.45, 249, 395, C.white], [21.4167, Infinity, 741, 550, C.white]];
const colour = (a, b, k) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',')})`;

export default {
  id: 'intro/title', start: 14.98, end: 22.3583333333,
  fonts: [`500 140px ${FONT}`, `450 140px "Roboto Mono"`, `400 26px ${FONT}`, `italic 400 24px ${FONT}`],
  async create(root, env) {
    await env.loadFont('Title Mono', '/assets/fonts/notosansmono/NotoSansMono-wdth-wght.ttf', { weight: '100 900' });
    const { ctx } = env.canvas(root);
    ctx.textRendering = 'geometricPrecision';
    const tokenLayout = TOKENS.map(([s], i) => {
      const [font, size, weight, base] = TOKEN_TYPE[i];
      ctx.font = `${weight} ${size}px ${font}`;
      const m = ctx.measureText(s), [x, width] = TOKEN_INK[i];
      return { x, left: m.actualBoundingBoxLeft, scale: width / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight), font, size, weight, base };
    });
    const bg = ctx.createRadialGradient(960, 540, 460, 960, 540, 1100);
    bg.addColorStop(0, '#08070c'); bg.addColorStop(1, '#06050a');
    const progress = (t, on, duration = 0.15) => ease.outCubic(clamp((t - on) / duration));
    const grow = (t, on, lead = 0.0125) => {
      if (t < on) return 0;
      const p = 1 - Math.exp(-(t - on + lead) / 0.02);
      return p > 0.999 ? 1 : p;
    };
    const rowY = (r) => 366 + r * 54 + (r === 8 ? 27 : 0);
    const grey = (v) => `rgb(${Math.round(v)},${Math.round(v - 1)},${Math.round(v + 4)})`;

    function line(points, col = C.line, width = 1) {
      ctx.strokeStyle = col; ctx.lineWidth = width; ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
    }
    function text(s, x, y, size = 26, col = C.white, weight = 400, italic = false, font = FONT) {
      ctx.fillStyle = col; ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${font}`; ctx.fillText(s, x, y);
    }
    function cells(s, x, y, size, col, weight = 400, advance = size * 0.6, font = FONT) {
      ctx.fillStyle = col; ctx.font = `${weight} ${size}px ${font}`;
      [...s].forEach((ch, i) => ctx.fillText(ch, x + i * advance, y));
    }
    function title(t) {
      const { zoom, y, glow } = titleState(t);
      ctx.save(); ctx.translate(960, 450); ctx.scale(zoom, zoom); ctx.translate(-960, -450);
      if (t < 15.4) {
        ctx.save(); ctx.globalAlpha = 0.8 * (1 - clamp((t - 15.16) / 0.24)); ctx.strokeStyle = '#b4b2bc'; ctx.lineWidth = 1;
        TOKEN_BOXES.forEach(([x0, x1], k) => {
          if (t < TOKEN_ON[k]) return;
          ctx.beginPath(); ctx.roundRect(x0 + 0.5, 332.5, x1 - x0, 162, 8); ctx.stroke();
        }); ctx.restore();
      }
      ctx.translate(0, y);
      TOKENS.forEach(([s, kind], i) => {
        const state = tokenState(i, kind, t); if (state.alpha <= 0) return;
        const col = kind === 'p' ? colour([180, 180, 248], [242, 241, 254], state.mix)
          : kind === 'm' ? colour([242, 241, 254], [94, 94, 230], state.mix) : '#f2f1fe';
        ctx.save(); ctx.globalAlpha = state.alpha;
        if (glow > 0 && kind !== 'p') { ctx.shadowColor = col.startsWith('rgb(') ? col.replace('rgb(', 'rgba(').replace(')', ',.4)') : 'rgba(242,241,254,.4)'; ctx.shadowBlur = glow; }
        const layout = tokenLayout[i];
        ctx.translate(layout.x, layout.base); ctx.scale(layout.scale, 1);
        text(s, layout.left, 0, layout.size, col, Math.min(900, layout.weight + state.weight - (kind === 'm' ? 380 : 400)), false, layout.font);
        ctx.restore();
      });
      ctx.restore();
      for (const [on, off, x, width, col] of UNDERLINES) {
        if (t < on || t >= off) continue;
        ctx.fillStyle = col; ctx.fillRect(x, 219, width * progress(t + 0.004, on, 0.13), 3);
      }
    }

    function segment(points, level) { line(points.map(([x, y]) => [x + 0.5, y + 0.5]), grey(level)); }
    function branch(x0, y0, xc, yc, x1, y1, level) {
      ctx.strokeStyle = grey(level); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0 + 0.5, y0 + 0.5);
      ctx.arcTo(xc + 0.5, yc + 0.5, x1 + 0.5, y1 + 0.5, 8); ctx.lineTo(x1 + 0.5, y1 + 0.5); ctx.stroke();
    }
    function astBox(name, x, top, width, e, on, t, flash = Infinity, fill = false) {
      if (e <= 0) return;
      ctx.save(); const w = width * e;
      ctx.beginPath(); ctx.roundRect(x - w / 2 + 0.5, top + 0.5, w, 45, Math.min(5, w / 2));
      if (fill) { ctx.fillStyle = '#1c1a27'; ctx.fill(); }
      ctx.strokeStyle = grey(treeLevel(t, on, 'border', flash)); ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.rect(x - w / 2 + 1, top + 1, w - 1, 44); ctx.clip();
      ctx.textAlign = 'center'; text(name, x, top + 30, 24, t >= flash ? '#fdfcff' : '#e2e0ef', t >= flash ? 500 : 400);
      ctx.restore();
    }
    function syntax(t) {
      if (t >= 18.6833) return;
      LABELS.forEach(([s, x0, x1, x, ty, on, typeOn, duration]) => {
        if (t < on) return;
        const e = grow(t, on), yy = 331;
        segment([[x - (x - x0) * e, yy + (e > 0.97 ? 6 : 0)], [x - (x - x0) * e, yy], [x + (x1 - x) * e, yy], [x + (x1 - x) * e, yy + (e > 0.97 ? 6 : 0)]], treeLevel(t, on, 'border'));
        const stem = progress(t, on + 0.017, 0.045);
        segment([[x, yy], [x, yy - (yy - ty - 3) * stem]], treeLevel(t, on, 'connector'));
        const n = Math.min(s.length, Math.floor((t - typeOn) * (s.length - 1) / duration) + 1);
        if (n > 0) {
          ctx.save(); ctx.textAlign = 'left';
          text(s.slice(0, n), x - s.length * 14.43 / 2 - 1, ty - 14, 24, grey(treeLevel(t, typeOn, 'text')), 400, true);
          ctx.restore();
        }
      });
      if (t >= 16.8167) {
        const on = 16.8167, e = grow(t, on), v = treeLevel(t, on, 'border', 18.1833);
        segment([[959 - 710 * e, 493], [959 + 712 * e, 493]], v);
        if (e > 0.97) { segment([[249, 487], [249, 493]], v); segment([[1671, 487], [1671, 493]], v); }
        segment([[959, 494], [959, 494 + 62 * e]], treeLevel(t, on, 'connector', 18.1833));
        astBox('ExpressionStatement', 959, 557, 300, e, on, t, 18.2167);
      }
      if (t >= 17.2667) {
        const on = 17.2667, e = grow(t, on, 0.0072);
        segment([[959, 603], [959, 603 + 57 * e]], treeLevel(t, on, 'connector', 18.2167));
        astBox('CallExpression', 959, 661, 228, e, on, t, 18.25);
      }
      if (t >= 17.7333) {
        const on = 17.7333, e = grow(t, on), length = Math.min(499, 14100 * (t - on + 1 / 60));
        const v = treeLevel(t, on + 0.25, 'connector', 18.25);
        segment([[959, 707], [959, 736]], v);
        if (length >= 228) branch(959, 736, 731, 736, 731, 764, v);
        else segment([[959 - length, 736], [959, 736]], v);
        if (length >= 499) branch(959, 736, 1458, 736, 1458, 764, v);
        else segment([[959, 736], [959 + length, 736]], v);
        astBox('MemberExpression', 731, 765, 256, e, on, t, 18.3167);
        astBox('Identifier', 1458, 765, 172, e, on, t, 18.3833, t >= 18.3833);
      }
      if (t >= 18.1833) {
        const on = 18.1833, e = grow(t, on), v = treeLevel(t, on, 'connector', 18.3333);
        segment([[731, 811], [731, 840]], v);
        const length = Math.min(285, 14100 * (t - on + 1 / 60));
        if (length >= 285) { branch(731, 840, 446, 840, 446, 868, v); branch(731, 840, 1016, 840, 1016, 868, v); }
        else segment([[731 - length, 840], [731 + length, 840]], v);
        astBox('Identifier', 446, 869, 172, e, on, t, 18.4167, t >= 18.4167);
        astBox('Identifier', 1016, 869, 172, e, on, t, 18.4167, t >= 18.4167);
      }
    }

    function assembly(t) {
      if (t < ROW_ON[0]) return;
      const rows = t < 21.1833 ? 5 : t < 21.65 ? 6 : t < 22.1167 ? 7 : 9;
      let current = -1; for (const [on, row] of CURRENT) if (t >= on) current = row;
      for (let r = 0; r < rows; r++) {
        const alpha = clamp((t - ROW_ON[r]) / (r < 5 ? 0.0833 : 0.0583)); if (alpha <= 0) continue;
        const y = rowY(r); ctx.save(); ctx.globalAlpha = alpha;
        const codeCol = r >= 5 && r <= 7 ? (t >= 22.1167 ? '#a9a7b1' : '#c8c6d0') : C.white;
        cells(ASM[r][2], 571, y, 26, codeCol, r === current ? 500 : 400);
        if (r === 0 || r === 1) {
          ctx.save(); ctx.beginPath();
          if (r === 0) { ctx.rect(710, y - 30, 15, 36); ctx.rect(772, y - 30, 50, 36); }
          else ctx.rect(648, y - 30, 49, 36);
          ctx.clip(); cells(ASM[r][2], 571, y, 26, C.purple, r === current ? 500 : 400); ctx.restore();
        }
        if (r >= 5 || t >= BYTE_ON[r]) {
          const count = r >= 5 ? ASM[r][1].length : Math.max(0, Math.floor((t - BYTE_ON[r]) * 60) + 1) * 3 - 1;
          cells(ASM[r][1].slice(0, count), 275, y, 26, r === current ? C.white : '#b2b0ba');
        }
        if (r >= 5 || t >= ADDRESS_ON[r]) cells(ASM[r][0], 119, y, 26, r === current ? C.white : '#93919b');
        if (r >= 5 && r <= 7 && t >= 22.10) {
          ctx.globalAlpha *= clamp((t - 22.10) / 0.05);
          line([[570, y - 9], [570 + ASM[r][2].length * 15.6, y - 9]], '#aeacb6', 2);
        }
        ctx.restore();
      }
      pipeline(t, rows);
      registers(t);
    }

    function pipeline(t, rows) {
      const clock = clockAt(t), current = Math.floor(clock + 1e-6), x0 = 959, dx = 76.4;
      ctx.save(); ctx.globalAlpha = clamp((t - 19.10) / 0.10);
      for (let r = 0; r < rows; r++) line([[959, rowY(r) - 10], [1800, rowY(r) - 10]], '#34323d', 0.8);
      text('CLK', 914, 309, 16, C.dim);
      for (let c = 0; c < 11; c++) text(String(c + 1), 992 + c * dx, 280, 16, c <= current + 1 ? C.white : C.dim);
      if (clock >= 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(x0, 280, Math.max(0, clock * dx + 2), 40); ctx.clip();
        const points = [[x0, 315]];
        for (let c = 0; c < 11; c++) points.push([x0 + c * dx, 292], [x0 + (c + 0.5) * dx, 292], [x0 + (c + 0.5) * dx, 315], [x0 + (c + 1) * dx, 315]);
        line(points, '#d0cdd9', 1.1); ctx.restore();
        const shift = progress(t, clockCellOn(current), 0.075);
        const x = x0 + dx * Math.max(0, current - 1 + shift) + 3;
        ctx.fillStyle = 'rgba(80,76,106,.12)'; ctx.fillRect(x, 287, 74, rows * 54 + 44 + (rows === 9 ? 27 : 0));
      }
      line([[959, 315], [1800, 315]], '#484550', 0.8);
      PIPE.forEach((row, r) => row.forEach(([c, s]) => {
        if (t + 0.0001 < clockCellOn(c)) return;
        const x = 964 + c * dx, y = 336 + r * 54 + (r === 8 ? 27 : 0), active = c === Math.min(current, 9);
        let fill = 'rgba(8,8,12,.65)', stroke = active ? '#ecebf2' : '#9995a2', col = active ? '#f6f5fb' : '#b4b0bc', glow = 0;
        if (s === 'EX') {
          const cc = executionColour(r, t);
          if (cc) {
            fill = `rgb(${cc.join(',')})`;
            if (cc[0] + cc[1] + cc[2] > 420) { stroke = '#fff'; col = '#16131e'; glow = 10; }
            else { stroke = cc[2] > cc[0] + 25 ? '#7e73cf' : '#aaa8b4'; col = '#eeeaf5'; }
          } else { fill = '#09090e'; stroke = '#aaa8b4'; col = '#eeeaf5'; }
        }
        const dashed = s === 'AGI' || (r === 4 && c === 6) || (r === 5 && (c === 6 || c === 8)) || (r === 6 && c === 8) || (r === 8 && c === 10);
        ctx.setLineDash(dashed ? [4, 3] : []); ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 0.9;
        ctx.beginPath(); ctx.roundRect(x, y, 68, 39, 4);
        ctx.save(); ctx.shadowColor = fill; ctx.shadowBlur = glow; ctx.fill(); ctx.restore(); ctx.stroke(); ctx.setLineDash([]);
        if (s === '×') { line([[x + 12, y + 7], [x + 56, y + 32]], '#aaa7b3'); line([[x + 56, y + 7], [x + 12, y + 32]], '#aaa7b3'); }
        else { ctx.save(); ctx.textAlign = 'center'; text(s, x + 34, y + 27, 18, s === 'AGI' ? C.purple : col); ctx.restore(); }
      }));
      for (const [on, off, r, c] of [[21.1833, 21.4333, 2, 5], [21.65, 21.90, 3, 7]]) {
        if (t >= on && t <= off) { const x = Math.round(964 + c * dx + 34) + 0.5, y = 336 + r * 54 + 39; line([[x, y], [x, y + 15]], '#e8e6f0'); }
      }
      if (t >= clockCellOn(10)) {
        line([[1719, 572], [1750, 572], [1762, 584], [1762, 789]], C.white);
        ctx.fillStyle = C.white; ctx.beginPath(); ctx.moveTo(1757, 784); ctx.lineTo(1767, 784); ctx.lineTo(1762, 792); ctx.fill();
      }
      ctx.restore();
    }

    function registers(t) {
      if (t < 19.80) return;
      line([[119, 866], [1800, 866]], '#34323b');
      const at = (events, initial) => { let v = initial; for (const [on, val] of events) if (t >= on) v = val; return v; };
      const highlight = (name, x, y, w, h) => { const c = registerHighlight(name, t); if (c) { ctx.fillStyle = `rgb(${c.join(',')})`; ctx.fillRect(x, y, w, h); } };
      const dash = 'rgb(58,56,64)', label = '#9e9da2', purple = 'rgb(160,154,236)';
      const regs = [
        ['EIP', 19.8333, at([[19.8333, '0040102E'], [20.9667, '00401031'], [21.1833, '00401032'], [21.4167, '00401038'], [21.8833, '0040103A'], [22.1167, '004011A0']], ''), C.white, t >= 22.1167 ? 'World::execute' : '', '#eeedf3'],
        ['EAX', 19.8667, t >= 20.9667 ? '005A2F10' : '--------', t >= 20.9667 ? purple : dash, t >= 20.9667 ? 'me' : '', purple],
        ['ECX', 19.90, t >= 21.4167 ? '005A1D28' : '--------', t >= 21.4167 ? C.white : dash, t >= 21.4167 ? 'world' : '', '#a9a7b6'],
        ['EDX', 19.9167, t >= 21.8833 ? '004070F8' : '--------', t >= 21.8833 ? C.white : dash, t >= 21.8833 ? "World::`vftable'" : '', '#d6d4e1'],
        ['ESP', 19.95, t >= 21.1833 ? '0012FF74' : '0012FF78', '#d6d5db', '', ''],
      ];
      regs.forEach(([s, on, value, col, sub, subcol], i) => {
        const x = 119 + i * 280; text(s, x, 898, 15, label); if (t < on) return;
        highlight(s, x - 7, 908, 160, 40); text(value, x - 1, 938, 30, col); if (sub) text(sub, x, 966, 16, subcol);
      });
      text('STACK', 1519, 898, 15, label);
      if (t >= 19.9833) {
        const top = t >= 21.1833; highlight('S1', 1634, 916, 108, 26);
        text('0012FF74', 1519, 936, 20, top ? '#fcfbfe' : '#a3a1ac'); text(top ? '005A2F10' : '--------', 1639, 936, 20, top ? 'rgb(172,167,235)' : dash);
        if (top) text('me', 1759, 936, 20, 'rgb(159,153,230)');
        ctx.fillStyle = '#f3f2f7'; const y = top ? 924 : 956; ctx.beginPath(); ctx.moveTo(1505, y); ctx.lineTo(1512, y + 4.5); ctx.lineTo(1505, y + 9); ctx.closePath(); ctx.fill();
      }
      if (t >= 20.0167) { text('0012FF78', 1519, 968, 20, t >= 21.1833 ? '#a4a3ad' : '#fdfdfe'); text('005A2F10', 1639, 968, 20, 'rgb(175,168,241)'); text('me', 1759, 968, 20, 'rgb(159,153,230)'); }
    }
    return { render(t) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 1920, 1080); title(t); syntax(t); assembly(t);
    } };
  },
};
