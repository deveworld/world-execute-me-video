// Isometric voxel island on a lavender backdrop: build waves (two diagonals every ~7 frames), water,
// decorations and a wireframe scan. Lyrics are DOM text in Nabla (colour font) so the extrusion axis
// (EDPT) can be animated.
import { clamp, lerp, ease, rgb } from './lib/util.js';
import { createCloudPaths, walkerAt } from './lib/island-motion.js';

const FPS = 60;
// ---------------------------------------------------------------- projection
const TOPX = 1250, TOPY = 329.6, AX = 38, AY = 19.04, HZ = 46;
const SX = (x, y) => TOPX + AX * (x - y);
const SY = (x, y, z) => TOPY + AY * (x + y) - HZ * z;
const WATER_Z = 0.5;

// ---------------------------------------------------------------- terrain
// The height map defines the stepped terrain before the two tower blocks are added.
const H = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 2, 3, 2, 2, 2, 1, 1, 0, 0],
  [0, 1, 2, 3, 3, 3, 2, 2, 2, 1, 1, 0],
  [0, 1, 3, 3, 3, 3, 2, 2, 2, 1, 1, 0],
  [0, 1, 3, 3, 3, 3, 2, 2, 1, 1, 0, 0],
  [0, 1, 2, 3, 3, 2, 2, 2, 1, 1, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 1, 2, 2, 2, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 2, 1, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const land = (gx, gy) => gx >= 0 && gy >= 0 && gx < 12 && gy < 12 && H[gy][gx] > 0;
// shallow water = 4-neighbour of land
const SHALLOW = H.map((row, gy) => row.map((h, gx) => !h && (land(gx - 1, gy) || land(gx + 1, gy) || land(gx, gy - 1) || land(gx, gy + 1))));

// build waves: first visible frame per wave; wave 0 = diagonals <= 5, then two diagonals per wave
const WAVE_FRAME = [678, 684, 691, 698, 705, 712, 719, 726];
const waveOf = (d) => (d <= 5 ? 0 : Math.min(7, Math.floor((d - 6) / 2) + 1));
const TOWER = [[3, 4], [4, 4]];
const TOWER_FRAME = 754;
// drop-in: offset -30 px on the first visible frame, decaying ×0.58 per frame
const dropOffset = (t, f0) => -30 * Math.pow(0.58, Math.max(0, (t - f0 / FPS) * FPS));

// ---------------------------------------------------------------- decorations
const TREES = [
  [6, 2, 12.575], [7, 2, 12.575], [8, 3, 12.575],
  [3, 9, 12.808], [4, 8, 12.808], [8, 1, 12.808],
  [6, 7, 12.92], [10, 9, 12.92],
];
const HOUSE = { gx: 7, gy: 6, f0: 760 };
const WALKERS = [
  { appear: 778 / FPS, hop: 788 / FPS, path: [[1098,448],[1136,466],[1174,485],[1136,504],[1174,523]] },
  { appear: 776 / FPS, hop: 794 / FPS, path: [[1402,447],[1364,466],[1326,485],[1288,454],[1255,471]] },
  { appear: 776 / FPS, hop: 788 / FPS, path: [[1516,512],[1478,531],[1440,550],[1402,569],[1364,588]] },
];
const CLOUDS = [
  { x0: 1249, y0: 221, w: 126, t0: 13.17 },
  { x0: 1412, y0: 285, w: 104, t0: 13.22 },
];

// ---------------------------------------------------------------- lyrics
const WORDS = [
  { text: 'Set', x: 115, y: 219, t0: 11.0, out: 12.885 },
  { text: 'up', x: 289, y: 219, t0: 11.625, out: 12.885 },
  { text: 'our', x: 414, y: 219, t0: 11.992, out: 12.885 },
  { text: 'new', x: 115, y: 324, t0: 12.175, out: 12.885 },
  { text: 'world', x: 304, y: 324, t0: 12.475, out: 12.885 },
  { text: 'And', x: 115, y: 479, t0: 12.808, scan: 480 },
  { text: 'let’s', x: 294, y: 479, t0: 13.025, scan: 480 },
  { text: 'begin', x: 115, y: 597, t0: 13.275, scan: 598 },
  { text: 'the', x: 384, y: 597, t0: 13.642, scan: 598 },
  { text: 'Simulation', x: 130, y: 810, t0: 14.025, size: 205, sx: 0.975, sy: 0.84, depth: 200, highlight: 24, steps: [842, 850, 857, 864, 871] },
];
const EDPT = 120;

// The horizontal scan moves down at a constant speed.
const SCAN_F0 = 844, SCAN_F1 = 858;
const scanY = (t) => 222 + (t * FPS - SCAN_F0) * 39.64;

// ---------------------------------------------------------------- colours
const C = {
  top: [245, 245, 245], left: [218, 220, 249], right: [180, 184, 247],
  deep: [129, 130, 230], shallow: [160, 162, 235], side: [74, 75, 215],
  gridIn: 'rgb(166,168,191)', gridOut: 'rgb(92,94,117)',
  wireGrey: 'rgb(78,80,104)', wireBlue: 'rgb(72,72,150)', wireHouse: 'rgb(200,90,50)',
};

export default {
  id: 'intro/island',
  start: 11.13,
  end: 14.98,
  fonts: ['400 100px "Nabla"'],
  async create(root, env) {
    const { W, H: HH } = env;
    const { canvas, ctx } = env.canvas(root);

    // background: lavender with a wide plateau and darker sides
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = HH;
    {
      const b = bg.getContext('2d');
      const g = b.createRadialGradient(960, 540, 540, 960, 540, 1110);
      g.addColorStop(0, 'rgb(211,213,236)');
      g.addColorStop(1, 'rgb(195,197,220)');
      b.fillStyle = g;
      b.fillRect(0, 0, W, HH);
    }

    const cloudPaths = createCloudPaths();
    const wireFill=ctx.createPattern(bg,'no-repeat');

    // ---------------------------------------------------------- lyric DOM
    const style = document.createElement('style');
    style.textContent = `
      @font-palette-values --introLav { font-family: Nabla; override-colors: 0 #5050cf, 1 #3d3dbb, 2 #5050cf, 3 #5555d3, 4 #5050cf, 5 #5b5bd7, 6 #b1b3f3, 7 #f4f3f7, 8 #5858d9, 9 #ffffff; }
      .intro-nabla { position:absolute; font-family:'Nabla'; white-space:pre; line-height:1; font-palette:--introLav; transform-origin:0 0; }
    `;
    root.appendChild(style);
    const layer = document.createElement('div');
    layer.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;';
    root.appendChild(layer);
    const els = WORDS.map((w) => {
      const el = document.createElement('div');
      el.className = 'intro-nabla';
      el.textContent = w.text;
      el.style.left = `${w.x}px`;
      el.style.top = `${w.y}px`;
      el.style.fontSize = `${w.size ?? 100}px`;
      el.style.transform = `scale(${w.sx ?? 1}, ${w.sy ?? 0.86})`;
      layer.appendChild(el);
      return el;
    });

    // ---------------------------------------------------------- drawing helpers
    const poly = (pts) => {
      ctx.beginPath();
      ctx.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
      ctx.closePath();
    };
    const facePts = {
      top: (x, y, z) => [SX(x, y), SY(x, y, z), SX(x + 1, y), SY(x + 1, y, z), SX(x + 1, y + 1), SY(x + 1, y + 1, z), SX(x, y + 1), SY(x, y + 1, z)],
      left: (x, y, z0, z1) => [SX(x, y + 1), SY(x, y + 1, z0), SX(x + 1, y + 1), SY(x + 1, y + 1, z0), SX(x + 1, y + 1), SY(x + 1, y + 1, z1), SX(x, y + 1), SY(x, y + 1, z1)],
      right: (x, y, z0, z1) => [SX(x + 1, y), SY(x + 1, y, z0), SX(x + 1, y + 1), SY(x + 1, y + 1, z0), SX(x + 1, y + 1), SY(x + 1, y + 1, z1), SX(x + 1, y), SY(x + 1, y, z1)],
    };

    // mode: 'solid' | 'wire'. In solid mode the island's silhouette and convex edges are outlined in
    // dark grey while edges between continuing faces stay faint, so edges are classified per neighbour height.
    let curT = 0;
    const hVis = (x, y) => {
      if (x < 0 || y < 0 || x > 11 || y > 11 || !H[y][x]) return 0;
      if (curT * FPS < WAVE_FRAME[waveOf(x + y)] - 0.01) return 0;
      return colTop(x, y, curT);
    };
    const EDGE_D = 'rgba(52,52,70,0.5)', EDGE_L = 'rgba(150,150,172,0.25)', EDGE_M = 'rgba(70,70,100,0.32)';
    function seg(x0, y0, x1, y1, col) { ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
    function cube(gx, gy, z0, z1, dy, mode, lineColor) {
      ctx.save();
      ctx.translate(0, dy);
      const faces = [['left', facePts.left(gx, gy, z0, z1), C.left], ['right', facePts.right(gx, gy, z0, z1), C.right], ['top', facePts.top(gx, gy, z1), C.top]];
      if (mode === 'wire') {
        for (const [, pts] of faces) { poly(pts); ctx.fillStyle = wireFill; ctx.fill(); ctx.strokeStyle = lineColor; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.restore(); return;
      }
      for (const [, pts, col] of faces) { poly(pts); ctx.fillStyle = rgb(col); ctx.fill(); }
      ctx.lineWidth = 1;
      const top = Math.max(z1, hVis(gx, gy)), hF = hVis(gx, gy + 1), hR = hVis(gx + 1, gy);
      const P = (x, y, z) => [SX(x, y), SY(x, y, z)];
      const E = (a, b, dark) => seg(a[0], a[1], b[0], b[1], dark ? EDGE_D : EDGE_L);
      const S = (a, b, dark) => seg(a[0], a[1], b[0], b[1], dark ? EDGE_D : EDGE_M);   // side-face seams stay visible
      const isTop = z1 >= top;
      // left face (towards y+1)
      S(P(gx, gy + 1, z0), P(gx + 1, gy + 1, z0), z0 <= hF);                         // bottom edge
      S(P(gx, gy + 1, z0), P(gx, gy + 1, z1), !(hVis(gx - 1, gy) >= z1 && hVis(gx - 1, gy + 1) <= z0)); // far vertical
      S(P(gx + 1, gy + 1, z0), P(gx + 1, gy + 1, z1), hR <= z0);                      // corner with the right face
      // right face (towards x+1)
      S(P(gx + 1, gy, z0), P(gx + 1, gy + 1, z0), z0 <= hR);
      S(P(gx + 1, gy, z0), P(gx + 1, gy, z1), !(hVis(gx, gy - 1) >= z1 && hVis(gx + 1, gy - 1) <= z0));
      if (isTop) {
        E(P(gx, gy + 1, z1), P(gx + 1, gy + 1, z1), hF < z1);
        E(P(gx + 1, gy, z1), P(gx + 1, gy + 1, z1), hR < z1);
        E(P(gx, gy, z1), P(gx + 1, gy, z1), hVis(gx, gy - 1) < z1);
        E(P(gx, gy, z1), P(gx, gy + 1, z1), hVis(gx - 1, gy) < z1);
      }
      ctx.restore();
    }

    function column(gx, gy, h, t, zBase, mode, lineColor) {
      const d = gx + gy;
      const f0 = WAVE_FRAME[waveOf(d)];
      if (t * FPS < f0 - 0.01) return;
      const dy = dropOffset(t, f0);
      for (let z = 0; z < h; z++) {
        const z0 = Math.max(z, zBase);
        if (z + 1 <= zBase) continue;
        cube(gx, gy, z0, z + 1, dy, mode, lineColor);
      }
      // tower blocks
      if (TOWER.some(([a, b]) => a === gx && b === gy) && t * FPS >= TOWER_FRAME - 0.01) {
        cube(gx, gy, h, h + 1, dropOffset(t, TOWER_FRAME), mode, lineColor);
      }
    }
    const colTop = (gx, gy, t) => H[gy][gx] + (TOWER.some(([a, b]) => a === gx && b === gy) && t * FPS >= TOWER_FRAME + 3 ? 1 : 0);

    function tree(gx, gy, s, mode, lineColor) {
      if (s <= 0) return;
      const h = H[gy][gx];
      const placement={ '6,2':[2,-6,16,47], '7,2':[-1,-7,16,40], '8,3':[0,-6,15,47],
        '3,9':[-1.5,-6,14,41], '4,8':[2,-5,15,47], '8,1':[-2,-4,14,41], '6,7':[-2,-3,14,46], '10,9':[0,-6,14,52] }[`${gx},${gy}`]??[0,0,14,47];
      const cx = SX(gx + 0.5, gy + 0.5)+placement[0], cy = SY(gx + 0.5, gy + 0.5, h)+placement[1];
      const R = placement[2] * s, Hh = placement[3] * s, ry = R * .35;
      ctx.save();
      if(mode!=='wire'){
        ctx.save();ctx.fillStyle='rgba(75,74,115,.15)';ctx.filter='blur(2px)';ctx.beginPath();ctx.ellipse(cx-14*s,cy+11*s,R*1.2,ry*1.35,-.1,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.beginPath();
      ctx.moveTo(cx - R, cy);
      ctx.lineTo(cx, cy - Hh);
      ctx.lineTo(cx + R, cy);
      ctx.ellipse(cx, cy, R, ry, 0, 0, Math.PI, false);
      ctx.closePath();
      if (mode === 'wire') {
        ctx.fillStyle = wireFill;
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        const g = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
        g.addColorStop(0, rgb([62,60,196]));
        g.addColorStop(.49, rgb([58,54,192]));
        g.addColorStop(.5, rgb([35,31,157]));
        g.addColorStop(1, rgb([25,22,127]));
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.restore();
    }

    function house(t, mode, lineColor) {
      const f0 = HOUSE.f0;
      if (t * FPS < f0 - 0.01) return;
      const dy = dropOffset(t, f0 + 1) * (30 / 35);
      const { gx, gy } = HOUSE;
      const h = H[gy][gx];
      // footprint 0.62 x 0.75 cells centred on the cell, gable along x
      const x0 = gx + 0.22, x1 = gx + 0.84, y0 = gy + 0.12, y1 = gy + 0.88, z0 = h, z1 = h + 0.62, zr = h + 1.02;
      const ym = (y0 + y1) / 2;
      const P = (x, y, z) => [1288-(SX(x,y)-1288)*.9, SY(x, y, z) + dy];
      const wall = [233, 166, 138], wallDark = [210, 140, 112], roof = [200, 98, 54], roofDark = [170, 80, 44];
      const shape = (pts, col) => {
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        if (mode === 'wire') {
          ctx.fillStyle = wireFill;
          ctx.fill();
          ctx.strokeStyle = C.wireHouse;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = rgb(col);
          ctx.fill();
          ctx.strokeStyle = 'rgba(90,40,30,0.8)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      };
      // left wall (y = y1 plane) with gable
      shape([P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P((x0 + x1) / 2, y1, zr), P(x0, y1, z1)], wall);
      // right wall (x = x1 plane)
      shape([P(x1, y0, z0), P(x1, y1, z0), P(x1, y1, z1), P(x1, y0, z1)], wallDark);
      // roof: right slope (towards +x) is visible
      shape([P((x0 + x1) / 2, y0 - 0.06, zr), P((x0 + x1) / 2, y1 + 0.06, zr), P(x1 + 0.08, y1 + 0.06, z1 - 0.06), P(x1 + 0.08, y0 - 0.06, z1 - 0.06)], roof);
      shape([P((x0 + x1) / 2, y1 + 0.06, zr), P(x0 - 0.08, y1 + 0.06, z1 - 0.06), P(x0 - 0.04, y1 + 0.06, z1 - 0.02), P((x0 + x1) / 2, y1 + 0.06, zr - 0.02)], roofDark);
      // chimney
      const cxp = x1 - 0.12, cyp = ym - 0.05;
      shape([P(cxp, cyp + 0.1, z1 + 0.25), P(cxp + 0.1, cyp + 0.1, z1 + 0.25), P(cxp + 0.1, cyp + 0.1, zr + 0.18), P(cxp, cyp + 0.1, zr + 0.18)], [236, 180, 150]);
      if (mode !== 'wire') {
        // Door on the long wall and a window on the gable wall.
        const d0 = y0 + 0.24, d1 = y0 + 0.38;
        shape([P(x1, d0, z0), P(x1, d1, z0), P(x1, d1, z0 + 0.36), P(x1, d0, z0 + 0.36)], [30, 22, 26]);
        const xm = (x0 + x1) / 2;
        shape([P(xm - 0.03, y1, z0 + 0.2), P(xm + 0.12, y1, z0 + 0.2), P(xm + 0.12, y1, z0 + 0.36), P(xm - 0.03, y1, z0 + 0.36)], [150, 80, 60]);
      }
    }

    function personAt(x, y, mode, lineColor) {
      ctx.save();
      if (mode === 'wire') {
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y - 13, 2.6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x, y - 5, 2.6, 5, 0, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(80,80,110,0.25)';
        ctx.beginPath(); ctx.ellipse(x, y + 1, 4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#16151c';
        ctx.beginPath(); ctx.arc(x, y - 15, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x, y - 6, 3, 6, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function cloudShape(cx, cy, w, dz) {
      ctx.beginPath();
      cloudPaths[w > 115 ? 0 : 1].forEach(([x,y],i) => i ? ctx.lineTo(cx+x,cy+y+dz) : ctx.moveTo(cx+x,cy+y+dz));
      ctx.closePath();
    }
    function cloud(c, t, mode, lineColor) {
      const k = clamp((t - c.t0) / 0.18);
      if (k <= 0) return;
      const a = ease.outCubic(k);
      const cx = c.x0 + (t - 13.6) * 31, cy = c.y0 - 18 * (1 - a);
      ctx.save();
      ctx.globalAlpha *= mode === 'wire' ? 1 : a;
      if (mode === 'wire') {
        // Paint each surface in depth order so the upper cloud hides rear extrusion edges.
        for(const dz of[16,0]){cloudShape(cx,cy,c.w,dz);ctx.fillStyle=wireFill;ctx.fill();ctx.strokeStyle=lineColor;ctx.lineWidth=1;ctx.stroke();}
      } else {
        cloudShape(cx, cy, c.w, 16);
        ctx.fillStyle = 'rgb(222,222,246)';
        ctx.fill();
        cloudShape(cx, cy, c.w, 0);
        ctx.fillStyle = 'rgb(247,247,250)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(150,150,190,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }
    function cloudShadow(c, t) {
      const k = clamp((t - c.t0) / 0.18);
      if (k <= 0) return;
      const cx = c.x0 + (t - 13.6) * 31;
      ctx.save();
      ctx.globalAlpha = 0.22 * k;
      ctx.filter = 'blur(4px)';
      ctx.fillStyle = 'rgb(110,110,140)';
      const dy = c.y0 < 250 ? 78 : 140;
      cloudShape(cx - 12, c.y0 + dy, c.w * 0.9, 0);
      ctx.fill();
      ctx.restore();
    }

    // Chimney smoke: puffs ride up a fixed column of five slots
    // (centre and radius per slot); solid mode animates them upward, wire mode shows the outlines.
    const SMOKE = [[1290, 445, 4], [1295, 421.7, 6.3], [1299.7, 398, 7.5], [1303.7, 375, 8.5], [1308, 351, 9.5]];
    const smokeAt = (u) => { const i = Math.min(3, Math.floor(u)), k = u - i, a = SMOKE[i], b = SMOKE[i + 1]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; };
    function smoke(t, mode, lineColor) {
      if (t < 13.15) return;
      ctx.save();
      if (mode === 'wire') {
        ctx.strokeStyle = lineColor; ctx.lineWidth = 1; ctx.fillStyle = wireFill;
        for (let i = 1; i < 5; i++) { const [x, y, r] = SMOKE[i]; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
      } else {
        const ph = (t - 13.15) / 0.3;
        for (let i = 0; i < 5; i++) {
          const u = ((ph + i) % 4.6);
          if (t - 13.15 < (u) * 0.3 - 1e-6 && ph < 4.6) continue; // puffs only exist once emitted
          const [x, y, r] = smokeAt(Math.min(4, u));
          ctx.globalAlpha = 0.85 * clamp(u / 0.6) * clamp((4.6 - u) / 0.6);
          ctx.fillStyle = 'rgb(236,236,250)';
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    }

    // ---------------------------------------------------------- the island
    function drawGrid(t, alpha) {
      if (alpha <= 0) return;
      const f = t * FPS;
      // Quadrants start with one closed cell per corner, then open grids whose lines all
      // extend to a common length L that eases 1 -> 6 cells
      const fr = Math.round(f);
      const L = fr <= 671 ? 1 : 1 + 5 * (1 - Math.exp(-(fr - 671) / 2.24));
      const full = L > 5.97;
      const len = full ? 6 : L;
      const n = full ? 6 : Math.floor(L + 1e-6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1;
      const quads = [[0, 0, 1, 1], [12, 0, -1, 1], [0, 12, 1, -1], [12, 12, -1, -1]];
      for (const [ox, oy, sx, sy] of quads) {
        for (let i = 0; i <= n; i++) {
          const outerA = i === 0, outerB = i === 0;
          // lines of constant x (from the corner edge inward)
          const xa = ox + sx * i;
          ctx.strokeStyle = outerA ? C.gridOut : C.gridIn;
          ctx.beginPath();
          ctx.moveTo(SX(xa, oy), SY(xa, oy, 0));
          ctx.lineTo(SX(xa, oy + sy * len), SY(xa, oy + sy * len, 0));
          ctx.stroke();
          const ya = oy + sy * i;
          ctx.strokeStyle = outerB ? C.gridOut : C.gridIn;
          ctx.beginPath();
          ctx.moveTo(SX(ox, ya), SY(ox, ya, 0));
          ctx.lineTo(SX(ox + sx * len, ya), SY(ox + sx * len, ya, 0));
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    function drawSlabSides(alpha, mode, lineColor) {
      if (alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      const L = [SX(0, 12), SY(0, 12, 0), SX(12, 12), SY(12, 12, 0), SX(12, 12), SY(12, 12, WATER_Z), SX(0, 12), SY(0, 12, WATER_Z)];
      const R = [SX(12, 0), SY(12, 0, 0), SX(12, 12), SY(12, 12, 0), SX(12, 12), SY(12, 12, WATER_Z), SX(12, 0), SY(12, 0, WATER_Z)];
      for (const pts of [L, R]) {
        poly(pts);
        if (mode === 'wire') {
          ctx.fillStyle = wireFill;
          ctx.fill();
          ctx.strokeStyle = C.wireBlue;
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.fillStyle = rgb(C.side);
          ctx.fill();
          ctx.strokeStyle = 'rgb(52,51,163)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      }
      if (mode !== 'wire') {
        // light rim along the top front edges
        ctx.strokeStyle = 'rgba(205,207,255,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(SX(0, 12), SY(0, 12, WATER_Z) + 1);
        ctx.lineTo(SX(12, 12), SY(12, 12, WATER_Z) + 1);
        ctx.lineTo(SX(12, 0), SY(12, 0, WATER_Z) + 1);
        ctx.stroke();
      }
      ctx.restore();
    }

    function waterTile(gx, gy, alpha, mode, lineColor) {
      const pts = facePts.top(gx, gy, WATER_Z);
      poly(pts);
      if (mode === 'wire') {
        ctx.fillStyle = wireFill;
        ctx.fill();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.stroke();
        return;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = rgb(SHALLOW[gy][gx] ? C.shallow : C.deep);
      ctx.fill();
      ctx.restore();
    }

    function drawIsland(t, mode, lineColor) {
      curT = t;
      const water = mode === 'wire' ? 1 : ease.outQuad(clamp((t - 12.19) / 0.14));
      const zBase = mode === 'wire' ? WATER_Z : 0;
      if (mode !== 'wire') drawGrid(t, 1 - water);
      // painter's order: diagonals back to front
      for (let d = 0; d <= 22; d++) {
        for (let gx = Math.max(0, d - 11); gx <= Math.min(11, d); gx++) {
          const gy = d - gx;
          const h = H[gy][gx];
          if (!h && water > 0) waterTile(gx, gy, water, mode, C.wireBlue);
          if (h) column(gx, gy, h, t, zBase, mode, lineColor);
          if (h && water > 0 && mode !== 'wire') {
            // water in front of this column's base is drawn by the tiles in front (painter's order)
          }
          for (const [tx, ty, t0] of TREES) {
            if (tx === gx && ty === gy) tree(gx, gy, ease.outCubic(clamp((t - t0) / 0.1167)), mode, lineColor);
          }
          if (gx === HOUSE.gx && gy === HOUSE.gy) house(t, mode, lineColor);
        }
      }
      for (const walker of WALKERS) {
        const p = walkerAt(walker, t);
        if (p) personAt(p[0], p[1], mode, lineColor);
      }
      drawSlabSides(water, mode, lineColor);
      if (mode !== 'wire') for (const c of CLOUDS) cloudShadow(c, t);
      smoke(t, mode, lineColor);
      for (const c of CLOUDS) cloud(c, t, mode, lineColor);
    }

    return {
      render(t) {
        const f = t * FPS;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.filter = 'none';
        ctx.drawImage(bg, 0, 0);

        const scanning = f >= SCAN_F0 - 0.01;
        const sy = scanning ? Math.min(scanY(t), 1100) : -1;
        if (!scanning) {
          drawIsland(t, 'solid');
        } else {
          // below the scan line: solid; above: hidden-line wireframe
          ctx.save();
          ctx.beginPath(); ctx.rect(0, sy, W, HH - sy); ctx.clip();
          drawIsland(t, 'solid');
          ctx.restore();
          ctx.save();
          ctx.beginPath(); ctx.rect(0, 0, W, sy); ctx.clip();
          drawIsland(t, 'wire', C.wireGrey);
          ctx.restore();
          if (f <= SCAN_F1 + 0.01) {
            ctx.fillStyle = 'rgba(70,72,140,0.9)';
            ctx.fillRect(120, Math.round(sy), 1680, 1);
          }
        }

        // lyrics
        WORDS.forEach((w, i) => {
          const el = els[i];
          let op = 0, depth = 0;
          const k = t - w.t0;
          if (k >= 0) {
            op = clamp(k / 0.03);
            depth = (w.depth ?? EDPT) * ease.outCubic(clamp(k / (w.grow ?? 0.085)));
            if (w.steps) {
              // "Simulation": the face is there at once; the extrusion then deepens in five
              // equal 16th-note steps, each easing in over ~6 frames.
              op = 1;
              const fr = t * FPS;
              depth = w.steps.reduce((d, f0) => d + ease.outQuad(clamp((fr - f0) / 6)) / w.steps.length, 0) * w.depth;
            }
          }
          if (w.out !== undefined && t >= w.out) {
            const o = clamp((t - w.out) / 0.1);
            depth *= 1 - ease.outCubic(clamp(o * 1.4));
            op *= 1 - o;
          }
          if (w.scan !== undefined && scanning && sy > w.scan) op = 0;
          el.style.opacity = op.toFixed(3);
          el.style.visibility = op > 0.001 ? 'visible' : 'hidden';
          el.style.fontVariationSettings = `'EDPT' ${depth.toFixed(1)}, 'EHLT' ${w.highlight??12}`;
        });
      },
    };
  },
};
