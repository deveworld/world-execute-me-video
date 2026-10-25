// Viewer stage runtime: engine/runtime.js plus a scene cache for seeking. Only the live viewer loads
// this file.
//
// A scene that goes out of range stays mounted but hidden, so jumping back to it is one render(t) call,
// and prewarm(t) creates scenes ahead of time while the viewer is idle. render(t) is a pure function of t
// (see mv/AGENTS.md), so a cached instance draws the same frame as a new one.
// Creates run one at a time. WebGL contexts are counted per scene so the cache stays under Chrome's context limit.
import * as beat from '../engine/beat.js';
import * as anim from '../engine/lib/anim.js';
import { install, setCanvasScale, canvasScale, backingBytes } from '../engine/hidpi.js';

const W = 1920, H = 1080, MAX_WEBGL = 12;
// Canvas memory kept by hidden scenes. Above it the scenes farthest from the playhead are dropped and
// prewarm stops; at stage scale 2 every canvas takes four times the memory.
const MAX_CANVAS_BYTES = 2.5e9;
const stage = document.getElementById('stage');
// "/scenes/..." style URLs (scene index, env loaders) resolve against the project root, so the
// stage also works under a path prefix such as a GitHub Pages project site.
const ROOT = new URL('../', import.meta.url);
const fromRoot = (url) => typeof url === 'string' && url.startsWith('/') && !url.startsWith('//') ? new URL(url.slice(1), ROOT).href : url;
const only = new URLSearchParams(location.search).get('only') ?? '';
const errors = [];
let scenes = [], queue = Promise.resolve(), creating = null, useClock = 0, prewarming = Promise.resolve();

// Canvases follow the stage scale set by setScale() (hidpi.js). Installed before any scene module loads,
// so canvases made at import time are tracked too (they keep k = 1).
install();

const getContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
  const ctx = getContext.call(this, type, ...rest);
  if (creating && ctx && !this.__counted) {
    this.__counted = true;
    if (/^webgl/.test(type)) creating.webgl++;
    creating.canvases.push(this);
  }
  return ctx;
};

const env = {
  W, H, beat, anim,
  rng: anim.rng,
  canvas(root, { width = W, height = H, context = '2d', options } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
    root.appendChild(canvas);
    return { canvas, ctx: context ? canvas.getContext(context, options) : null };
  },
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

// Errors raised while prewarming stay with the scene until it is shown, so a failure in a hidden scene doesn't stop playback.
function showError(s, t, err, quiet = false) {
  s.failed = true;
  if (quiet) s.deferred = { t, err };
  else record(s.def?.id ?? s.path, t, err);
  if (!s.root) return;
  const pre = document.createElement('pre');
  pre.className = 'scene-error';
  pre.textContent = `scene ${s.def?.id ?? s.path} failed at t=${t}\n\n${err?.stack || err}`;
  s.root.replaceChildren(pre);
}

async function loadIndex() {
  const paths = await (await fetch(new URL(`__scenes.json?only=${encodeURIComponent(only)}`, ROOT))).json();
  // All scene modules load at once; index order is kept for the sort below.
  const loaded = await Promise.all(paths.map(async (path) => {
    try {
      const def = (await import(fromRoot(path))).default;
      if (!def || typeof def.create !== 'function' || !(def.end > def.start)) {
        throw new Error('default export must be { id, start, end, create(root, env) }');
      }
      return { path, def, root: null, inst: null, mounting: null, shown: false, failed: false, deferred: null, webgl: 0, canvases: [], lastUsed: 0, createMs: 0 };
    } catch (err) {
      record(path, null, err);
      return null;
    }
  }));
  scenes = loaded.filter(Boolean).sort((a, b) => (a.def.z ?? 0) - (b.def.z ?? 0) || a.def.start - b.def.start);
}

const activeAt = (s, t) => t >= s.def.start && t < s.def.end;

// Created hidden (visibility keeps layout measurable during create and the first render).
function mount(s, t, quiet = false) {
  if (!s.mounting) {
    s.mounting = queue = queue.then(async () => {
      s.root = document.createElement('div');
      s.root.className = 'scene';
      s.root.dataset.scene = s.def.id;
      s.root.style.zIndex = String(s.def.z ?? 0);
      s.root.style.visibility = 'hidden';
      stage.appendChild(s.root);
      const started = performance.now();
      creating = s;
      try {
        if (s.def.fonts?.length) await Promise.all(s.def.fonts.map((f) => document.fonts.load(f)));
        s.inst = await s.def.create(s.root, env);
        if (s.inst?.ready) await s.inst.ready;
        if (typeof s.inst?.render !== 'function') throw new Error('create() must return { render(t) }');
      } catch (err) {
        showError(s, t, err, quiet);
      } finally {
        creating = null;
        s.createMs = performance.now() - started;
      }
    });
  }
  return s.mounting;
}

function unmount(s) {
  try { s.inst?.destroy?.(); } catch (err) { record(s.def.id, null, err); }
  s.root?.remove();
  Object.assign(s, { root: null, inst: null, mounting: null, shown: false, failed: false, deferred: null, webgl: 0, canvases: [] });
}

function hide(s) {
  if (s.failed && !s.deferred) { unmount(s); return; }      // retried on the next visit, like the engine
  s.root.style.display = 'none';
  s.root.style.visibility = '';
  s.shown = false;
}

const sceneBytes = (s) => s.canvases.reduce((n, c) => n + backingBytes(c), 0);
const aliveBytes = () => scenes.reduce((n, s) => n + (s.root ? sceneBytes(s) : 0), 0);
let playhead = 0;
const distance = (s) => playhead < s.def.start ? s.def.start - playhead : playhead >= s.def.end ? playhead - s.def.end + 1e-3 : 0;
const evictable = () => scenes.filter((s) => s.root && !s.shown && s.mounting && s !== creating);

function evict() {
  let webgl = scenes.reduce((n, s) => n + (s.root ? s.webgl : 0), 0);
  for (const s of evictable().filter((s) => s.webgl).sort((a, b) => a.lastUsed - b.lastUsed)) {
    if (webgl <= MAX_WEBGL) break;
    webgl -= s.webgl;
    unmount(s);
  }
  let bytes = aliveBytes();
  for (const s of evictable().sort((a, b) => distance(b) - distance(a))) {
    if (bytes <= MAX_CANVAS_BYTES) break;
    bytes -= sceneBytes(s);
    unmount(s);
  }
}
// Over 85% of the budget, prewarm only creates a scene nearer the playhead than the farthest one kept,
// so evict() never drops what prewarm just made.
function roomFor(s) {
  if (aliveBytes() <= MAX_CANVAS_BYTES * 0.85) return true;
  const far = evictable().sort((a, b) => distance(b) - distance(a))[0];
  return !!far && distance(far) > distance(s);
}

const ready = loadIndex();

window.__stage = {
  ready,
  errors,
  async renderFrame(t) {
    await ready;
    playhead = t;
    const active = scenes.filter((s) => activeAt(s, t));
    for (const s of active) await mount(s, t);
    for (const s of scenes) if (s.shown && !activeAt(s, t)) hide(s);
    for (const s of active) {
      if (!s.root) await mount(s, t);           // evicted while we waited
      s.lastUsed = ++useClock;
      if (!s.shown) { s.root.style.display = ''; s.root.style.visibility = ''; s.shown = true; }
      if (s.deferred) { record(s.def.id, s.deferred.t, s.deferred.err); s.deferred = null; }
      if (s.failed) continue;
      try {
        s.inst.render(t);
      } catch (err) {
        showError(s, t, err);
      }
    }
    evict();
  },
  // Create (and draw once, hidden) every scene active at t that is not alive yet. Returns how many were created.
  prewarm(t) {
    const run = prewarming.then(() => prewarmAt(t));
    prewarming = run.catch(() => {});
    return run;
  },
  // Draw canvases at k device pixels per stage pixel. Every scene is dropped and made again at the new
  // scale (the visible ones on the next renderFrame, the rest by prewarm). Call it between renderFrame calls.
  async setScale(k) {
    if (k === canvasScale()) return false;
    await prewarming;
    await queue;
    setCanvasScale(k);
    for (const s of scenes) if (s.root) unmount(s);
    return true;
  },
  scale: () => canvasScale(),
  list: () => scenes.map((s) => ({ id: s.def.id, path: s.path, start: s.def.start, end: s.def.end, z: s.def.z ?? 0, alive: !!s.root, shown: s.shown, webgl: s.webgl, bytes: s.root ? sceneBytes(s) : 0, createMs: Math.round(s.createMs) })),
};

async function prewarmAt(t) {
  await ready;
  let created = 0;
  for (const s of scenes.filter((s) => activeAt(s, t) && !s.root)) {
    if (!roomFor(s)) break;
    await mount(s, t, true);
    created++;
    if (!s.root || s.shown) continue;
    if (!s.failed) { try { s.inst.render(t); } catch (err) { showError(s, t, err, true); } }
    if (!s.shown) hide(s);
    s.lastUsed = ++useClock;
  }
  evict();
  return created;
}
