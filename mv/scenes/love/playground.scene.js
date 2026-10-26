import { loadLoveFonts, clamp, lerp } from './lib.js';
import { dataset } from './playground/training.js';
import { createLabels } from './playground/datasets.js';

// Resolves with every training snapshot and its evaluated grids (see playground/train-worker.js).
function trainInWorker(jobs) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./playground/train-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => { worker.terminate(); resolve(data); };
    worker.onerror = (e) => { worker.terminate(); reject(new Error(e.message || 'playground training failed')); };
    worker.postMessage(jobs, jobs.flatMap(job => [job.inputs.buffer, job.targets.buffer]));
  });
}

const W = 1920, H = 1080;
const FEATURES = ['x', 'y', 'sin x', 'cos x', 'sin 2x', 'cos 2x', 'sin 4x', 'cos 4x', 'sin 8x', 'cos 8x', 'sin 16x', 'cos 16x',
  'sin y', 'cos y', 'sin 2y', 'cos 2y', 'sin 4y', 'cos 4y', 'sin 8y', 'cos 8y', 'sin 16y', 'cos 16y', 'sin 24y', 'cos 24y'];
const FEAT_FN = [(x) => x / Math.PI, (x, y) => y / Math.PI, (x) => Math.sin(x), (x) => Math.cos(x), (x) => Math.sin(2 * x), (x) => Math.cos(2 * x),
  (x) => Math.sin(4 * x), (x) => Math.cos(4 * x), (x) => Math.sin(8 * x), (x) => Math.cos(8 * x), (x) => Math.sin(16 * x), (x) => Math.cos(16 * x),
  (x, y) => Math.sin(y), (x, y) => Math.cos(y), (x, y) => Math.sin(2 * y), (x, y) => Math.cos(2 * y), (x, y) => Math.sin(4 * y), (x, y) => Math.cos(4 * y),
  (x, y) => Math.sin(8 * y), (x, y) => Math.cos(8 * y), (x, y) => Math.sin(16 * y), (x, y) => Math.cos(16 * y), (x, y) => Math.sin(24 * y), (x, y) => Math.cos(24 * y)];
const OFF1 = new Set([10, 11, 20, 21, 22, 23]); // features disabled while learning the heart
const ROW = (i) => 215 + 29.17 * i;

// The display and the training preview use independent clocks.
const RESET = 179.75, DISCRETE = 180.2083333333;
const FIRST = 177.3333333333, UPDATE = 7 / 60;
const epochIndex = t => Math.max(0, Math.floor((t - 177.442) / (15 / 130)) + 1);
const runIndex = t => t >= RESET ? 1 : 0;
const stepAt = t => Math.max(0, Math.floor((t - (t >= RESET ? RESET : FIRST) + 1e-7) / UPDATE));

const BLUE = [172, 176, 246], ORANGE = [253, 192, 160], WHITE = [250, 250, 250];
// Feature previews have a greyer zero than the neuron previews.
const FEAT_WHITE = [236, 231, 232];
const col = (v, white = WHITE) => {
  const k = Math.min(1, Math.abs(v));
  const c = v >= 0 ? BLUE : ORANGE;
  return [lerp(white[0], c[0], k), lerp(white[1], c[1], k), lerp(white[2], c[2], k)];
};

export default {
  id: 'love/playground',
  start: 177.325,
  end: 181.042,
  async create(root, env) {
    await loadLoveFonts(['300 40px Roboto', '500 12px Roboto', '400 15px Roboto', '400 22px "Roboto Mono"', '800 300px Nunito']);
    const { ctx } = env.canvas(root);
    const mk = (w, h) => { const c = new OffscreenCanvas(w, h); return [c, c.getContext('2d')]; };

    // ---------- background with vignette
    const [bgC, bg] = mk(W, H);
    bg.fillStyle = 'rgb(245,245,245)';
    bg.fillRect(0, 0, W, H);
    const vig = (g2) => {
      g2.save();
      g2.translate(960, 540);
      g2.scale(1.35, 1);
      const g = g2.createRadialGradient(0, 0, 250, 0, 0, 820);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.6, 'rgba(0,0,0,0.02)');
      g.addColorStop(1, 'rgba(0,0,0,0.065)');
      g2.fillStyle = g;
      g2.fillRect(-960, -700, 1920, 1400);
      g2.restore();
    };

    const labels = createLabels();
    const jobs = [
      [dataset(labels.heart, 4096, 41, 0.002), { seed: 73, heart: true, epochs: 21, rate: 0.0125 }],
      [dataset(labels.type, 4096, 103, 0.008), { seed: 137, epochs: 11, rate: 0.065, warmup: 1.5, refine: true }],
    ].map(([data, options]) => ({
      inputs: Float64Array.from(data.flatMap(point => Array.from(point.input))),
      targets: Float64Array.from(data, point => point.target),
      options,
    }));
    const results = await trainInWorker(jobs);
    const runs = results.map(run => run.map(s => s.net));
    const NN = 24, N = 100;
    const mapCanvas = (vals, binary) => {
      const [c, x] = mk(N, N), img = x.createImageData(N, N);
      for (let p = 0; p < N * N; p++) {
        const v = binary ? (vals[p] > 0 ? 1 : -1) : vals[p];
        const amount = Math.min(1, Math.abs(v)), color = v >= 0 ? BLUE : ORANGE;
        for (let k = 0; k < 3; k++) img.data[4 * p + k] = lerp(238, color[k], amount);
        img.data[4 * p + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      return c;
    };
    // Heatmaps and neuron previews are drawn into canvases the first time a snapshot is shown.
    const cached = (cache, key, make) => cache.get(key) ?? cache.set(key, make()).get(key);
    const mapCache = new Map();
    const mapAt = (run, i, f, binary) => cached(mapCache, `${run} ${i} ${f} ${binary}`, () => {
      const amount = f === 3 ? 1 : 1 - Math.exp(-(f + 1) * 0.9);
      const previous = results[run][Math.max(0, i - 1)].field;
      return mapCanvas(Float32Array.from(results[run][i].field, (v, p) => lerp(previous[p], v, amount)), binary);
    });
    const stateAt = t => runs[runIndex(t)][Math.min(runs[runIndex(t)].length - 1, stepAt(t))];

    const T = 26; // 24 content pixels and a one-pixel border
    // Keep luminance detail while sampling chroma in 2×2 blocks, so the tiny
    // activation previews retain a fine checker texture.
    function chromaPreview(vals,white){
      const rgb=new Float32Array(24*24*3),Y=new Float32Array(576),U=new Float32Array(576),V=new Float32Array(576);
      for(let p=0;p<576;p++){const c=col(vals[p],white),y=.2126*c[0]+.7152*c[1]+.0722*c[2];Y[p]=y;U[p]=(c[2]-y)/1.8556;V[p]=(c[0]-y)/1.5748;}
      for(let j=0;j<24;j++)for(let i=0;i<24;i++){
        const x0=i-i%2,y0=2*Math.floor((j+1)/2)-1;let u=0,v=0;
        for(let y=y0;y<y0+2;y++)for(let x=x0;x<x0+2;x++){const q=Math.max(0,Math.min(23,y))*24+x;u+=U[q]*.25;v+=V[q]*.25;}
        const p=j*24+i,r=Y[p]+1.5748*v,b=Y[p]+1.8556*u,g=(Y[p]-.2126*r-.0722*b)/.7152;rgb[p*3]=r;rgb[p*3+1]=g;rgb[p*3+2]=b;
      }return rgb;
    }
    const thumb = (fn, white = WHITE, ss = 1) => {
      const [c, x] = mk(T, T);
      const img = x.createImageData(T, T);
      // Box-filter high-frequency features within each preview pixel.
      const px=(p,o)=>-Math.PI+(p+(ss>1?(o+.5)/ss:.5))*2*Math.PI/24;
      const vals=Float32Array.from({length:576},(_,p)=>{let s=0;for(let a=0;a<ss;a++)for(let b=0;b<ss;b++)s+=fn(px(p%24,a),-px(Math.floor(p/24),b),p%24,Math.floor(p/24));return s/(ss*ss);});
      const rgb=chromaPreview(vals,white);
      for (let j = 0; j < 24; j++) for (let i = 0; i < 24; i++) {
        const p=j*24+i,k=4*((j+1)*T+i+1);
        img.data[k]=rgb[p*3];img.data[k+1]=rgb[p*3+1];img.data[k+2]=rgb[p*3+2];img.data[k+3]=255;
      }
      x.putImageData(img, 0, 0);
      x.strokeStyle = 'rgba(160,160,165,0.9)';
      x.lineWidth = 1;
      x.strokeRect(0.5, 0.5, T - 1, T - 1);
      return c;
    };
    const featThumbs = FEAT_FN.map((f) => thumb((x, y) => f(x, y), FEAT_WHITE, 4));
    const thumbCache = new Map();
    const thumbsAt = (run, i) => cached(thumbCache, `${run} ${i}`, () => {
      const layer = values => Array.from({ length: NN }, (_, j) => thumb((x, y, px, py) => values[j * 576 + py * 24 + px]));
      return { l1: layer(results[run][i].l1), l2: layer(results[run][i].l2) };
    });

    function links(t) {
      const phase2 = t >= RESET;
      const net = stateAt(t);
      const on = i => phase2 || !OFF1.has(i);
      ctx.save();
      ctx.lineCap = 'butt';
      // g: ink gain per layer (mean link ink of each band).
      const link = (x0, y0, x1, y1, w, grey = false, g = 1) => {
        // Keep curves thin as weights grow by putting extra ink into opacity.
        const a = Math.min(1, Math.abs(w)), lw = 0.7 + 0.4 * a, ink = g * (0.5 + a) / lw;
        if (a < 0.04) return;
        ctx.strokeStyle = grey ? `rgba(150,150,150,${0.25 + 0.4 * a})`
          : w > 0 ? `rgba(112,112,228,${Math.min(1, (0.08 + 0.5 * a) * ink)})` : `rgba(222,138,100,${Math.min(1, (0.08 + 0.55 * a) * ink)})`;
        ctx.lineWidth = grey ? 0.8 : lw;
        const xm = (x0 + x1) / 2;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.bezierCurveTo(xm, y0, xm, y1, x1, y1);
        ctx.stroke();
      };
      for (let j = 0; j < NN; j++) for (let i = 0; i < NN; i++) {
        if (!on(i)) continue;
        const w = net.W1[j * NN + i];
        link(209, ROW(i), 493, ROW(j), w, false, phase2 ? 2.1 : 1.7);
      }
      for (let k2 = 0; k2 < NN; k2++) for (let j = 0; j < NN; j++) {
        const w = net.W2[k2 * NN + j];
        link(519, ROW(j), 787, ROW(k2), w, false, phase2 ? 2.5 : 2.4);
      }
      // Output weights use subdued ink until thresholding makes the learned
      // decision boundary visible. Their darkness follows the actual weights.
      for (let j = 0; j < NN; j++) {
        if (t < DISCRETE) { link(813, ROW(j), 1100, 550, 0.6, true); continue; }
        const amount = Math.min(1, Math.abs(net.W3[j]) * 0.7);
        const gray = 222 - 90 * amount;
        ctx.strokeStyle = `rgb(${gray + (net.W3[j] < 0 ? 4 : 0)},${gray},${gray + (net.W3[j] > 0 ? 7 : 0)})`;
        ctx.lineWidth = 1;
        const y = ROW(j), xm = (813 + 1100) / 2;
        ctx.beginPath(); ctx.moveTo(813, y); ctx.bezierCurveTo(xm, y, xm, 550, 1100, 550); ctx.stroke();
      }
      ctx.restore();
    }

    function columns(t) {
      const phase2 = t >= RESET;
      ctx.save();
      ctx.textBaseline = 'alphabetic';
      ctx.font = '500 12.5px Roboto';
      ctx.letterSpacing = '1.4px';
      ctx.fillStyle = 'rgb(88,88,90)';
      ctx.fillText('FEATURES', 120, 178);
      ctx.fillText('24 NEURONS', 463, 178);
      ctx.fillText('24 NEURONS', 757, 178);
      ctx.letterSpacing = '0px';
      ctx.font = '400 15px Roboto';
      for (let i = 0; i < NN; i++) {
        const off = !phase2 && OFF1.has(i);
        ctx.fillStyle = off ? 'rgb(178,178,180)' : 'rgb(28,28,30)';
        ctx.fillText(FEATURES[i], 120, 217 + 29.17 * i);
        ctx.globalAlpha = off ? 0.18 : 1;
        ctx.drawImage(featThumbs[i], 183, Math.round(ROW(i) - 13), 26, 26);
        ctx.globalAlpha = 1;
      }
      const set = thumbsAt(runIndex(t), Math.min(runs[runIndex(t)].length - 1, stepAt(t)));
      for (let j = 0; j < NN; j++) {
        ctx.drawImage(set.l1[j], 493, Math.round(ROW(j) - 13));
        ctx.drawImage(set.l2[j], 787, Math.round(ROW(j) - 13));
      }
      ctx.restore();
    }

    function output(t) {
      const run = runIndex(t), index = Math.min(runs[run].length - 1, stepAt(t));
      const age = t - (run ? RESET : FIRST) - index * UPDATE;
      const frame = Math.max(0, Math.min(3, Math.round(age * 60)));
      const img = mapAt(run, index, frame, t >= DISCRETE);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 1100, 200, 700, 700);
      ctx.restore();
    }

    function hud(t) {
      const k = epochIndex(t);
      const epoch = t < RESET ? k : k - 20;
      ctx.save();
      ctx.textBaseline = 'alphabetic';
      ctx.font = '500 12.5px Roboto';
      ctx.letterSpacing = '1.4px';
      ctx.fillStyle = 'rgb(88,88,90)';
      ctx.fillText('EPOCH', 1100, 177);
      ctx.fillText('TRAINING LOSS', 1099, 948);
      ctx.letterSpacing = '0px';
      ctx.font = '400 22px "Roboto Mono"';
      ctx.fillStyle = 'rgb(22,22,24)';
      ctx.fillText(`000,${String(epoch).padStart(3, '0')}`, 1155, 178);
      ctx.textAlign = 'right';
      ctx.fillText(stateAt(t).loss.toFixed(3), 1801, 948);
      ctx.textAlign = 'left';
      // discretize checkbox
      ctx.font = '400 16px Roboto';
      ctx.fillText('Discretize output', 1680, 179);
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = 'rgb(30,30,32)';
      if (t >= DISCRETE) {
        ctx.fillStyle = 'rgb(30,30,32)';
        ctx.fillRect(1655, 166, 13.5, 13.5);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(1658, 172.8); ctx.lineTo(1660.8, 175.6); ctx.lineTo(1665.5, 169.5); ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(1655.8, 166.8, 12, 12, 1.5);
        ctx.stroke();
      }
      const phase2 = t >= RESET, run = runs[runIndex(t)];
      const current = Math.min(run.length - 1, stepAt(t));
      const maxL = run[0].loss, steps = phase2 ? 11 : 20;
      const pts = run.slice(0, current + 1).map((state, i) => [1234.5 + 472 * i / steps, 948 - 27 * state.loss / maxL]);
      if (!phase2) pts[0] = [1234.5, 948 - 27];
      ctx.strokeStyle = 'rgb(205,205,207)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(1235, 948.5); ctx.lineTo(1707, 948.5); ctx.stroke();
      if (pts.length > 1) {
        ctx.strokeStyle = 'rgb(30,30,32)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      }
      const [dx, dy] = pts[pts.length - 1];
      ctx.fillStyle = 'rgb(98,98,230)';
      ctx.beginPath(); ctx.arc(dx, dy, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Fixed-resolution type keeps glyph placement identical across display scales.
    const [lyricC, lyricCtx] = mk(750, 90);
    function lyric(t) {
      const text = lyricCtx;
      text.setTransform(1, 0, 0, 1, -1070, -60);
      text.clearRect(1070, 60, 750, 90);
      text.save();
      text.translate(1097,128.2);text.scale(.9975,.974);text.translate(-1099,-127);
      text.font = '300 40px Roboto';
      text.textBaseline = 'alphabetic';
      text.fillStyle = 'rgb(20,20,22)';
      // Word onsets; each fades in over 0.04 s.
      const words = [['I’ve', 0], ['studied', 177.812], ['how', 179.152], ['to', 179.422], ['properly', 179.668]];
      let x = 1099;
      const sp = text.measureText(' ').width;
      for (const [w, t0] of words) {
        let a = clamp((t - t0) / (w === 'studied' ? 0.045 : 0.04));
        if (w === 'studied' && t >= 178.27 && t < 178.738) a = lerp(1, 0.18, clamp((t - 178.27) / 0.04));
        if (w === 'studied' && t >= 178.738) a = 0.18 + 0.82 * clamp((t - 178.738) / 0.025);
        if (w === 'I’ve' && t >= 178.283 && t < 178.317) a = 0.86;
        if (a > 0) { text.globalAlpha = a; text.fillText(w, x, 127); }
        x += text.measureText(w).width + sp;
      }
      text.restore();
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(lyricC, 1070, 60);
      ctx.restore();
    }

    return {
      render(t) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.drawImage(bgC, 0, 0);
        vig(ctx);
        links(t);
        columns(t);
        output(t);
        hud(t);
        lyric(t);
      },
    };
  },
};
