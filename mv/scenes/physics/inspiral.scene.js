// Binary inspiral on a deforming space-time lattice.
import { MERGE, TAU, binary, clamp, mix, strainAt, fieldAt, meshPoint } from './inspiral/dynamics.js';
import { createLettering } from './inspiral/lettering.js';
import { drawTrails, drawWave } from './inspiral/trails.js';

const W = 1920, H = 1080, START = 55.108333333333;

export default {
  id: 'physics/inspiral', start: START, end: 59.30,
  fonts: ['400 22.5px Inter', 'italic 22.5px Inter', '400 20px Inter'],
  async create(root, env) {
    const { ctx } = env.canvas(root);
    const lettering = await createLettering(ctx);
    const bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    const bc = bg.getContext('2d');
    bc.fillStyle = '#06050a'; bc.fillRect(0, 0, W, H);
    bc.save(); bc.translate(1170, 535); bc.scale(1.4, 1);
    const haze = bc.createRadialGradient(0, 0, 30, 0, 0, 670);
    haze.addColorStop(0, '#09091b'); haze.addColorStop(0.48, '#080815');
    haze.addColorStop(1, 'rgba(6,5,10,0)');
    bc.fillStyle = haze; bc.fillRect(-850, -700, 1700, 1400); bc.restore();
    bc.fillStyle = 'rgb(1,0,5)'; bc.fillRect(120, 903, 1680, 1); bc.fillRect(120, 905, 1680, 1);
    bc.fillStyle = 'rgb(74,73,82)'; bc.fillRect(120, 904, 1680, 1);
    bc.fillStyle = '#a6a3b6'; bc.font = '400 22.5px Inter'; bc.textBaseline = 'alphabetic';
    bc.fillText('strain', 119.5, 858); bc.font = 'italic 22.5px Inter'; bc.fillText('h', 180.5, 858);
    bc.textAlign = 'center';
    for (const [x, s] of [[467, '-3 s'], [852, '-2 s'], [1237, '-1 s'], [1622, 'merger']]) {
      bc.font = s === 'merger' ? '400 22.5px Inter' : '400 20px Inter';
      bc.fillText(s, x, 977);
    }

    // Sample a regular lattice; line strength falls smoothly towards its boundary.
    const mesh = [];
    for (let axis = 0; axis < 2; axis++) {
      for (let k = -13; k <= 13; k++) {
        const row = [];
        for (let j = 0; j <= 100; j++) {
          const q = -520 + j * 10.4, u = axis ? k * 40 : q, v = axis ? q : k * 40;
          const fade = Math.exp(-Math.pow(Math.hypot(u / 1.03, v) / 410, 6));
          row.push([u, v, Math.round(fade * 31)]);
        }
        mesh.push(row);
      }
    }
    function grid(field) {
      const paths = Array.from({ length: 32 }, () => new Path2D());
      for (const row of mesh) {
        let prev;
        for (const [u, v, q] of row) {
          const p = meshPoint(u, v, field);
          if (prev && q) { paths[q].moveTo(...prev); paths[q].lineTo(...p); }
          prev = p;
        }
      }
      ctx.lineWidth = 0.75;
      for (let q = 1; q < paths.length; q++) {
        ctx.strokeStyle = `rgba(91,85,127,${0.39 * q / 31})`;
        ctx.stroke(paths[q]);
      }
    }

    function body(p, warm, merged, t) {
      const [x, y] = p;
      const col = warm ? [255, 212, 192] : merged ? [235, 213, 241] : [230, 230, 235];
      const r = merged ? 65 : 44;
      const strength = (warm ? 0.9 : 1) * (1 + (warm ? 0.4 : 0.25) * clamp((t - 55.5) / 3));
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      for (const [d, a] of [[0, .75], [4, .75], [5, .58], [6, .30], [8, .22], [12, .135],
        [18, .095], [26, .060], [34, .020], [40, .005], [44, 0]]) {
        glow.addColorStop(d / 44, `rgba(${col.join(',')},${Math.min(.95, a * strength)})`);
      }
      ctx.fillStyle = glow; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
      ctx.strokeStyle = `rgba(${col.join(',')},.06)`; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x + 24, y);
      ctx.moveTo(x, y - 24); ctx.lineTo(x, y + 24); ctx.stroke();
      ctx.fillStyle = warm ? 'rgb(246,217,213)' : merged ? 'rgb(250,235,245)' : 'rgb(235,234,251)';
      ctx.beginPath(); ctx.arc(x, y, merged ? 5.2 : 4.45, 0, TAU); ctx.fill();
    }

    // The chart is a continuous chirp followed by a damped ring-down.
    const waveform = [];
    for (let x = 119; x <= 1800; x += 0.7) waveform.push([x, strainAt(54.923 + (x - 120) / 385)]);
    function strain(t) {
      ctx.save(); ctx.translate(.5, .5);
      const head = clamp(120 + (t - 54.923) * 385 - .5, 120, 1800);
      ctx.beginPath(); ctx.moveTo(...waveform[0]);
      let last = waveform[0], hp = last;
      for (const p of waveform) {
        if (p[0] > head) {
          hp = [head, mix(last[1], p[1], (head - last[0]) / (p[0] - last[0]))];
          ctx.lineTo(...hp); break;
        }
        ctx.lineTo(...p); last = p; hp = p;
      }
      ctx.strokeStyle = 'rgb(1,0,5)'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.strokeStyle = '#eeeaf5'; ctx.lineWidth = 1.02; ctx.stroke();
      ctx.fillStyle = '#ddd9e7'; ctx.beginPath(); ctx.arc(...hp, 3.2, 0, TAU); ctx.fill();
      ctx.restore();
    }

    return {
      render(t) {
        ctx.drawImage(bg, 0, 0);
        const pair = binary(t);
        grid(fieldAt(t, pair)); drawTrails(ctx, t, pair);
        if (t < MERGE) {
          body(pair.points[0], false, false, t); body(pair.points[1], true, false, t);
        } else {
          drawWave(ctx, t); body([1180, 655], false, true, t);
        }
        strain(t); lettering.draw(t);
      },
      destroy() { lettering.destroy(); },
    };
  },
};
