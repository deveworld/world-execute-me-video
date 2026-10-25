// "I've studied, I've studied how to properly LO-O-OVE" — a TensorFlow-Playground-style UI that learns a
// heart, resets, and learns "Lo-o-ove". Epoch/loss ticks, lyric timing, layout and colours measured on the
// original. Neuron previews and output contours are evaluated from compact fitted scalar networks.
import { loadLoveFonts, clamp, lerp, table } from './lib.js';
import { NEURONS } from './playground/neurons.js';
import { OUTPUT_NETWORKS } from './playground/output-networks.js';

const W = 1920, H = 1080;
const FEATURES = ['x', 'y', 'sin x', 'cos x', 'sin 2x', 'cos 2x', 'sin 4x', 'cos 4x', 'sin 8x', 'cos 8x', 'sin 16x', 'cos 16x',
  'sin y', 'cos y', 'sin 2y', 'cos 2y', 'sin 4y', 'cos 4y', 'sin 8y', 'cos 8y', 'sin 16y', 'cos 16y', 'sin 24y', 'cos 24y'];
const FEAT_FN = [(x) => x / Math.PI, (x, y) => y / Math.PI, (x) => Math.sin(x), (x) => Math.cos(x), (x) => Math.sin(2 * x), (x) => Math.cos(2 * x),
  (x) => Math.sin(4 * x), (x) => Math.cos(4 * x), (x) => Math.sin(8 * x), (x) => Math.cos(8 * x), (x) => Math.sin(16 * x), (x) => Math.cos(16 * x),
  (x, y) => Math.sin(y), (x, y) => Math.cos(y), (x, y) => Math.sin(2 * y), (x, y) => Math.cos(2 * y), (x, y) => Math.sin(4 * y), (x, y) => Math.cos(4 * y),
  (x, y) => Math.sin(8 * y), (x, y) => Math.cos(8 * y), (x, y) => Math.sin(16 * y), (x, y) => Math.cos(16 * y), (x, y) => Math.sin(24 * y), (x, y) => Math.cos(24 * y)];
const OFF1 = new Set([10, 11, 20, 21, 22, 23]); // features disabled while learning the heart
const ROW = (i) => 215 + 29.17 * i;

// Measured timeline.
const EPOCH_T = [177.45, 177.567, 177.683, 177.8, 177.9, 178.017, 178.133, 178.25, 178.367, 178.483, 178.6, 178.717, 178.833,
  178.95, 179.067, 179.183, 179.3, 179.4, 179.517, 179.633, 179.75, 179.867, 179.983, 180.1, 180.217, 180.333, 180.45,
  180.567, 180.683, 180.8, 180.9, 181.017];
const RESET = 179.75, DISCRETE = 180.2083333333;
// After "Discretize" the trained links strengthen in steps (mean link ink measured per frame).
const L1_STEP = [[180.2, .94], [180.217, .97], [180.233, .99], [180.35, 1.0]];
const L2_STEP = [[180.2, .86], [180.217, .91], [180.233, .94], [180.35, .96], [180.9, .98]];
const OUT_STEPS = [[180.2, 0], [180.217, .3], [180.233, .45], [180.25, .45], [180.267, .48], [180.317, .48], [180.333, .74], [180.45, .74], [180.467, .89], [180.783, .89], [180.8, 1]];
const OUT_FINAL = [[212,210,211],[207,205,206],[194,192,193],[169,167,168],[182,180,178],[201,201,201],[206,206,206],[172,172,172],[193,193,193],[196,196,196],[210,210,210],[166,155,158],
  [214,214,214],[164,163,172],[163,162,167],[206,206,206],[179,179,179],[149,149,149],[133,131,145],[158,157,166],[203,197,202],[165,162,166],[186,184,185],[155,141,145]];
const LOSS = [[0, 0.44], [177.517, 0.433], [177.633, 0.398], [177.75, 0.298], [177.867, 0.167], [177.983, 0.095], [178.1, 0.067],
  [178.217, 0.053], [178.333, 0.044], [178.45, 0.038], [178.567, 0.034], [178.667, 0.031], [178.783, 0.028], [178.9, 0.026],
  [179.017, 0.025], [179.133, 0.024], [179.25, 0.023], [179.367, 0.022], [179.483, 0.021], [179.6, 0.021], [179.7, 0.021],
  [179.75, 0.376], [179.833, 0.363], [179.95, 0.305], [180.067, 0.258], [180.167, 0.233], [180.283, 0.138], [180.4, 0.063],
  [180.517, 0.045], [180.633, 0.038], [180.75, 0.033], [180.867, 0.03], [180.983, 0.028]];

const BLUE = [172, 176, 246], ORANGE = [253, 192, 160], WHITE = [250, 250, 250];
// Feature previews have a greyer zero than the neuron previews (measured on the original).
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
    await loadLoveFonts(['300 40px Roboto', '500 12px Roboto', '400 15px Roboto', '400 22px "Roboto Mono"']);
    const { ctx } = env.canvas(root);
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };

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

    // The output is a 100×100 scalar field on the source's [-π,π]² grid.
    const N=100;
    const gx=i=>-Math.PI+(i+.5)*2*Math.PI/N;
    const mapCanvas = (vals, binary) => {
      const [c, x] = mk(N, N);
      const img = x.createImageData(N, N);
      for (let k = 0; k < N * N; k++) {
        const v = binary ? (vals[k] > 0 ? 1 : -1) : vals[k];
        // The large output's neutral zero is darker than the tiny node maps.
        const amount=Math.min(1,Math.abs(v)),c=v>=0?BLUE:ORANGE;
        const [r,g,b]=c.map(channel=>lerp(238,channel,amount));
        img.data[4 * k] = r; img.data[4 * k + 1] = g; img.data[4 * k + 2] = b; img.data[4 * k + 3] = 255;
      }
      x.putImageData(img, 0, 0);
      return c;
    };
    // The final scalar output neuron runs on the same sinusoidal feature family.
    // Compact fitted networks reproduce the source's cloudy training contour and
    // its discrete lettering without baking any source raster into the scene.
    const inputFields=Array.from({length:N*N},(_,p)=>FEAT_FN.map(f=>f(gx(p%N),-gx(Math.floor(p/N)))));
    function outputNetwork(net){
      const basis=NEURONS[net.basis];
      const out=new Float32Array(N*N),a1=new Float64Array(24),a2=new Float64Array(24);
      for(let p=0;p<N*N;p++){
        const feat=inputFields[p];
        for(let j=0;j<24;j++){let s=basis.B1[j];for(let i=0;i<24;i++)s+=basis.W1[j][i]*feat[i];a1[j]=Math.tanh(s);}
        for(let j=0;j<24;j++){let s=net.B2[j];for(let i=0;i<24;i++)s+=net.W2[j][i]*a1[i];a2[j]=Math.tanh(s);}
        let s=net.B3;for(let j=0;j<24;j++)s+=net.W3[j]*a2[j];out[p]=Math.tanh(s);
      }return out;
    }
    const fittedOutputFields=OUTPUT_NETWORKS.map(net=>({...net,v:outputNetwork(net)}));
    // The map has its own seven-frame update clock. Its brief settling is
    // independent of the beat-timed epoch digits and occurs before thresholding.
    // Precompute every presentation frame so arbitrary seeking stays cheap.
    const MAP_FIRST=10640,MAP_LAST=10862,outputFrames=[];
    let outputIndex=0;
    for(let frame=MAP_FIRST;frame<=MAP_LAST;frame++){
      while(outputIndex+1<fittedOutputFields.length&&fittedOutputFields[outputIndex+1].frame<=frame)outputIndex++;
      const b=fittedOutputFields[outputIndex],previous=fittedOutputFields[Math.max(0,outputIndex-1)];
      const a=previous.phase===b.phase?previous:b,k=b.settle[Math.min(3,frame-b.frame)];
      const vals=k===1?b.v:Float32Array.from(a.v,(v,i)=>lerp(v,b.v[i],k));
      outputFrames.push(mapCanvas(vals,frame>=10813));
    }

    // ---------- network: weights, thumbnails
    const NN = 24;
    const W1a=NEURONS.initial.W1,W1b=NEURONS.heart.W1,W2a=NEURONS.initial.W2,W2b=NEURONS.heart.W2;
    const W1c=NEURONS.love.W1,W2c=NEURONS.love.W2;
    const T = 26; // 24 content pixels plus the source's 1px border
    // Tiny source previews retain luminance detail while their chroma is sampled
    // in 2×2 blocks. Reproducing that filter restores their fine checker texture.
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
      // ss>1 box-filters each preview pixel (the source's high-frequency features average out).
      const px=(p,f,o)=>-Math.PI+(p+(ss>1?(o+.5)/ss:.5))*2*Math.PI/24;
      const vals=Float32Array.from({length:576},(_,p)=>{let s=0;for(let a=0;a<ss;a++)for(let b=0;b<ss;b++)s+=fn(px(p%24,0,a),-px(Math.floor(p/24),0,b),p%24,Math.floor(p/24));return s/(ss*ss);});
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
    const on1=i=>!OFF1.has(i),onAll=()=>true;
    function fittedThumbs(par){
      const input=Array.from({length:576},(_,p)=>FEAT_FN.map(f=>f(-Math.PI+(p%24+.5)*2*Math.PI/24,Math.PI-(Math.floor(p/24)+.5)*2*Math.PI/24)));
      const a1=Array.from({length:NN},(_,j)=>Float32Array.from(input,f=>Math.tanh(par.B1[j]+par.W1[j].reduce((s,w,i)=>s+w*f[i],0))));
      const a2=Array.from({length:NN},(_,j)=>Float32Array.from(input,(_,p)=>Math.tanh(par.B2[j]+par.W2[j].reduce((s,w,i)=>s+w*a1[i][p],0))));
      return{l1:a1.map(v=>thumb((x,y,i,j)=>v[j*24+i])),l2:a2.map(v=>thumb((x,y,i,j)=>v[j*24+i]))};
    }
    const thumbs={p1a:fittedThumbs(NEURONS.initial),p1b:fittedThumbs(NEURONS.heart),p2a:fittedThumbs(NEURONS.reset),p2b:fittedThumbs(NEURONS.love)};

    // ---------- helpers
    // tick times are the first frame showing the new state; compare with a half-frame tolerance
    const epochIndex = (t) => { let k = 0; while (k < EPOCH_T.length && t >= EPOCH_T[k] - 0.008) k++; return k; };
    const lossAt = (t) => { let v = LOSS[0][1]; for (const [t0, l] of LOSS) if (t >= t0 - 0.008) v = l; return v; };

    function links(t) {
      const phase2 = t >= RESET;
      const k = epochIndex(t);
      const e = phase2 ? k - 20 : k;
      const s = phase2 ? 1 : 1 - Math.pow(1 - clamp(e / 9), 2); // weights settle during the first epochs
      const on = phase2 ? onAll : on1;
      ctx.save();
      ctx.lineCap = 'butt';
      // g: ink gain per layer, measured as the mean link ink of each band on the original.
      const link = (x0, y0, x1, y1, w, grey = false, g = 1) => {
        // The source draws thin (~1 px) curves; the extra ink goes into opacity, not width.
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
        const w = phase2 ? W1c[j][i] : lerp(W1a[j][i], W1b[j][i], s);
        link(209, ROW(i), 493, ROW(j), w, false, phase2 ? 2.1 * table(L1_STEP, t) : 1.4);
      }
      for (let k2 = 0; k2 < NN; k2++) for (let j = 0; j < NN; j++) {
        const w = phase2 ? W2c[k2][j] : lerp(W2a[k2][j], W2b[k2][j], s);
        link(519, ROW(j), 787, ROW(k2), w, false, phase2 ? 2.5 * table(L2_STEP, t) : 2.0);
      }
      // Output links stay neutral grey through the reset; after "Discretize" they darken
      // in epoch steps to the per-row shades measured on the original (mostly grey).
      const pOut = phase2 ? table(OUT_STEPS, t) : 0;
      for (let k2 = 0; k2 < NN; k2++) {
        if (pOut <= 0) { link(813, ROW(k2), 1100, 550, 0.6, true); continue; }
        const c = OUT_FINAL[k2].map((m) => 244 - (244 - m) / 0.9);
        ctx.strokeStyle = `rgba(${lerp(150, c[0], pOut)},${lerp(150, c[1], pOut)},${lerp(150, c[2], pOut)},${lerp(0.49, 1, pOut)})`;
        ctx.lineWidth = lerp(0.8, 1, pOut);
        const y0 = ROW(k2), xm = (813 + 1100) / 2;
        ctx.beginPath(); ctx.moveTo(813, y0); ctx.bezierCurveTo(xm, y0, xm, 550, 1100, 550); ctx.stroke();
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
      const k = epochIndex(t);
      const set = phase2 ? (t >= DISCRETE ? thumbs.p2b : thumbs.p2a) : (k >= 4 ? thumbs.p1b : thumbs.p1a);
      const mixA = phase2 ? 1 : clamp((k - 1) / 4);
      for (let j = 0; j < NN; j++) {
        ctx.drawImage(set.l1[j], 493, Math.round(ROW(j) - 13));
        if (!phase2 && k < 4) {
          ctx.globalAlpha = mixA;
          ctx.drawImage(thumbs.p1b.l1[j], 493, Math.round(ROW(j) - 13));
          ctx.globalAlpha = 1;
        }
        ctx.drawImage(set.l2[j], 787, Math.round(ROW(j) - 13));
      }
      ctx.restore();
    }

    function output(t) {
      const img=outputFrames[Math.max(0,Math.min(MAP_LAST-MAP_FIRST,Math.round(t*60)-MAP_FIRST))];
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
      ctx.fillText(lossAt(t).toFixed(3), 1801, 948);
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
      // loss sparkline: one point per loss tick of the current run, x scaled to the run's length
      const phase2 = t >= RESET;
      const ticks = LOSS.filter(([t0]) => (phase2 ? t0 >= RESET : t0 < RESET));
      const maxL = phase2 ? 0.376 : 0.44, steps = phase2 ? 11 : 20;
      const pts = [];
      ticks.forEach(([t0, l], i) => { if (t >= t0 || i === 0) pts.push([1234.5 + (472 / steps) * (phase2 ? i : i), 948 - 27 * l / maxL]); });
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

    function lyric(t) {
      ctx.save();
      ctx.translate(1097,128.2);ctx.scale(.9975,.974);ctx.translate(-1099,-127);
      ctx.font = '300 40px Roboto';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgb(20,20,22)';
      // Word onsets re-measured per frame (ink in the lyric box); each fades in over 0.04 s.
      const words = [['I’ve', 0], ['studied', 177.812], ['how', 179.152], ['to', 179.422], ['properly', 179.668]];
      let x = 1099;
      const sp = ctx.measureText(' ').width;
      for (const [w, t0] of words) {
        let a = clamp((t - t0) / (w === 'studied' ? 0.045 : 0.04));
        if (w === 'studied' && t >= 178.27 && t < 178.738) a = lerp(1, 0.18, clamp((t - 178.27) / 0.04));
        if (w === 'studied' && t >= 178.738) a = 0.18 + 0.82 * clamp((t - 178.738) / 0.025);
        if (w === 'I’ve' && t >= 178.283 && t < 178.317) a = 0.86;
        if (a > 0) { ctx.globalAlpha = a; ctx.fillText(w, x, 127); }
        x += ctx.measureText(w).width + sp;
      }
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
