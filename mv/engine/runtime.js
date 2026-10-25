// Stage runtime: finds every *.scene.js, mounts the scenes active at song time t and
// asks each to draw itself. One scene failing never stops the others; failures are
// recorded in __stage.errors and drawn over that scene so they can't go unnoticed.
import * as beat from './beat.js';
import * as anim from './lib/anim.js';

const W = 1920, H = 1080;
const stage = document.getElementById('stage');
// "/scenes/..." style URLs (scene index, env loaders) are relative to the project root, not the host, so the
// stage also works under a path prefix such as a GitHub Pages project site.
const ROOT = new URL('../', import.meta.url);
const fromRoot = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? new URL(url.slice(1), ROOT).href : url;
const only = new URLSearchParams(location.search).get('only') ?? '';
const errors = [];
let scenes = [];

const env = {
  W, H, beat, anim,
  rng: anim.rng,
  // Full-stage canvas inside `root`. context: '2d' | 'webgl' | 'webgl2' | null.
  canvas(root, { width = W, height = H, context = '2d', options } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    root.appendChild(canvas);
    return { canvas, ctx: context ? canvas.getContext(context, options) : null };
  },
  // Scene-local font: env.loadFont('VT323', '/assets/fonts/x/VT323-Regular.ttf') (a leading / is the project root)
  async loadFont(family, url, descriptors = {}) {
    const face = new FontFace(family, `url(${fromRoot(url)})`, descriptors);
    document.fonts.add(face);
    await face.load();
    return face;
  },
  async loadImage(url) {
    const img = new Image();
    img.src = fromRoot(url);
    await img.decode();
    return img;
  },
  async loadJSON(url) {
    const res = await fetch(fromRoot(url));
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    return res.json();
  },
};

const record = (scene, t, err) => {
  const message = String(err?.stack || err);
  errors.push({ scene, t, message });
  console.error(`[scene ${scene}] t=${t}: ${message}`);
};

function showError(s, t, err) {
  s.failed = true;
  record(s.def?.id ?? s.path, t, err);
  if (!s.root) return;
  s.root.style.display = '';
  const pre = document.createElement('pre');
  pre.className = 'scene-error';
  pre.textContent = `scene ${s.def?.id ?? s.path} failed at t=${t}\n\n${err?.stack || err}`;
  s.root.replaceChildren(pre);
}

async function loadIndex() {
  const paths = await (await fetch(new URL(`__scenes.json?only=${encodeURIComponent(only)}`, ROOT))).json();
  const loaded = [];
  for (const path of paths) {
    try {
      const def = (await import(fromRoot(path))).default;
      if (!def || typeof def.create !== 'function' || !(def.end > def.start)) {
        throw new Error('default export must be { id, start, end, create(root, env) }');
      }
      loaded.push({ path, def });
    } catch (err) {
      record(path, null, err);
    }
  }
  scenes = loaded.sort((a, b) => (a.def.z ?? 0) - (b.def.z ?? 0) || a.def.start - b.def.start);
}

async function mount(s, t) {
  s.root = document.createElement('div');
  s.root.className = 'scene';
  s.root.dataset.scene = s.def.id;
  s.root.style.zIndex = String(s.def.z ?? 0);
  stage.appendChild(s.root);
  try {
    if (s.def.fonts?.length) await Promise.all(s.def.fonts.map((f) => document.fonts.load(f)));
    s.inst = await s.def.create(s.root, env);
    if (s.inst?.ready) await s.inst.ready;
    if (typeof s.inst?.render !== 'function') throw new Error('create() must return { render(t) }');
  } catch (err) {
    showError(s, t, err);
  }
}

function unmount(s) {
  try { s.inst?.destroy?.(); } catch (err) { record(s.def.id, null, err); }
  s.root?.remove();
  s.root = s.inst = null;
  s.failed = false;
}

const ready = loadIndex();

window.__stage = {
  ready,
  errors,
  async renderFrame(t) {
    await ready;
    for (const s of scenes) {
      const isActive = t >= s.def.start && t < s.def.end;
      if (!isActive && s.root) unmount(s);
    }
    for (const s of scenes) {
      if (!(t >= s.def.start && t < s.def.end)) continue;
      if (!s.root) await mount(s, t);
      if (s.failed) continue;
      try {
        s.inst.render(t);
      } catch (err) {
        showError(s, t, err);
      }
    }
  },
  list: () => scenes.map((s) => ({ id: s.def.id, path: s.path, start: s.def.start, end: s.def.end, z: s.def.z ?? 0 })),
};
