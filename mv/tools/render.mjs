// Renders the stage with headless Chrome. Frame f is drawn at song time t = f / fps.
//
//   node tools/render.mjs --from 36.95 --to 42.2 --only math/ --out out/math/clip.mp4
//   node tools/render.mjs --stills 37.5,40.5 --only math/ --outdir out/math/stills
//   node tools/render.mjs --list [--only math/]
//
// Options: --workers N (4)  --gpu vulkan|gl|off (vulkan)  --fps 60  --crf 16  --preset medium
//          --scale 0.5 (quick low-res preview)  --no-audio  --chrome <path>
// Exit code 2 when any scene threw (the frame shows the error, the summary lists it).
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT, startServer } from './server.mjs';

const SONG = path.join(ROOT, 'audio/song.m4a');
const DURATION = 212.3;

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  const next = process.argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[a.slice(2)] = true;
  else (args[a.slice(2)] = next), i++;
}
const fps = Number(args.fps ?? 60);
const only = typeof args.only === 'string' ? args.only : '';
const gpu = args.gpu === 'off' ? null : typeof args.gpu === 'string' ? args.gpu : 'vulkan';
const scale = Number(args.scale ?? 1);
const chrome = args.chrome ?? '/usr/bin/google-chrome';

// sRGB screenshots → BT.709 YUV, tagged on the frames (plain -color_* output flags get dropped).
const VF = 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv';

async function openStage(server) {
  const browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: [
      '--force-color-profile=srgb', '--font-render-hinting=none', '--disable-lcd-text',
      '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
      // Headless Chrome rasterizes on SwiftShader (CPU) unless sent to the GPU through ANGLE.
      ...(gpu ? [`--use-angle=${gpu}`, '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] : []),
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push({ scene: '(page)', t: null, message: String(e?.stack || e) }));
  await page.goto(`${server.url}/engine/stage.html?only=${encodeURIComponent(only)}`);
  await page.waitForFunction(() => window.__stage);
  await page.evaluate(() => window.__stage.ready);
  const cdp = await page.context().newCDPSession(page);
  const shoot = async (t) => {
    await page.evaluate((t) => window.__stage.renderFrame(t), t);
    const { data } = await cdp.send('Page.captureScreenshot', {
      format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 },
    });
    return Buffer.from(data, 'base64');
  };
  const errors = async () => [...(await page.evaluate(() => window.__stage.errors)), ...pageErrors];
  return { browser, page, shoot, errors };
}

function report(errors) {
  const seen = new Map();
  for (const e of errors) {
    const key = `${e.scene}: ${String(e.message).split('\n')[0]}`;
    if (!seen.has(key)) seen.set(key, e);
  }
  if (!seen.size) return 0;
  console.error(`\n${seen.size} scene error(s):`);
  for (const [key, e] of seen) console.error(`  ${key}${e.t != null ? `  (first at t=${e.t.toFixed(3)})` : ''}`);
  return 2;
}

const server = await startServer();
let exitCode = 0;
try {
  if (args.list) {
    const st = await openStage(server);
    for (const s of await st.page.evaluate(() => window.__stage.list())) {
      console.log(`${s.start.toFixed(3).padStart(8)} → ${s.end.toFixed(3).padStart(8)}  z=${s.z}  ${s.id}  (${s.path})`);
    }
    exitCode = report(await st.errors());
    await st.browser.close();
  } else if (args.stills) {
    const outdir = path.resolve(args.outdir ?? path.join(ROOT, 'out/stills'));
    mkdirSync(outdir, { recursive: true });
    const st = await openStage(server);
    for (const t of String(args.stills).split(',').map(Number)) {
      const tf = Math.round(t * fps) / fps;
      writeFileSync(path.join(outdir, `${tf.toFixed(3)}.png`), await st.shoot(tf));
    }
    console.log(`stills -> ${outdir}`);
    exitCode = report(await st.errors());
    await st.browser.close();
  } else {
    const from = Number(args.from ?? 0), to = Math.min(Number(args.to ?? DURATION), DURATION);
    const out = path.resolve(args.out ?? path.join(ROOT, 'out/render.mp4'));
    mkdirSync(path.dirname(out), { recursive: true });
    const F0 = Math.round(from * fps), F1 = Math.round(to * fps), total = F1 - F0;
    const workers = Math.max(1, Math.min(Number(args.workers ?? 4), total));
    const per = Math.ceil(total / workers);
    const crf = String(args.crf ?? 16), preset = String(args.preset ?? 'medium');
    const parts = [], allErrors = [];
    let done = 0;
    const started = performance.now();
    const tick = setInterval(() => {
      const s = (performance.now() - started) / 1000;
      process.stdout.write(`\r${done}/${total} frames  ${(done / s).toFixed(1)} fps  `);
    }, 2000);

    await Promise.all(Array.from({ length: workers }, async (_, w) => {
      const a = F0 + w * per, b = Math.min(F1, a + per);
      if (a >= b) return;
      const part = `${out}.part${w}.mp4`;
      parts[w] = part;
      const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
        '-vf', VF, '-c:v', 'libx264', '-preset', preset, '-crf', crf, '-an', part], { stdio: ['pipe', 'inherit', 'inherit'] });
      const st = await openStage(server);
      for (let f = a; f < b; f++) {
        const png = await st.shoot(f / fps);
        if (!ff.stdin.write(png)) await once(ff.stdin, 'drain');
        done++;
      }
      ff.stdin.end();
      const [code] = await once(ff, 'close');
      allErrors.push(...(await st.errors()));
      await st.browser.close();
      if (code !== 0) throw new Error(`ffmpeg for worker ${w} exited with ${code}`);
    }));
    clearInterval(tick);

    const list = `${out}.parts.txt`;
    writeFileSync(list, parts.filter(Boolean).map((p) => `file '${p}'`).join('\n'));
    const full = from <= 0.001 && to >= DURATION - 0.001;
    const audio = args['no-audio'] ? [] : full ? ['-i', SONG] : ['-ss', String(from), '-t', String(to - from), '-i', SONG];
    const audioOut = args['no-audio'] ? [] : ['-map', '1:a', ...(full ? ['-c:a', 'copy'] : ['-c:a', 'aac', '-b:a', '192k'])];
    const mux = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, ...audio,
      '-map', '0:v', '-c:v', 'copy', ...audioOut, '-movflags', '+faststart', '-shortest', out], { stdio: 'inherit' });
    const [muxCode] = await once(mux, 'close');
    for (const p of [...parts.filter(Boolean), list]) rmSync(p, { force: true });
    if (muxCode !== 0) throw new Error(`ffmpeg concat/mux exited with ${muxCode}`);
    const secs = (performance.now() - started) / 1000;
    console.log(`\r${total} frames in ${secs.toFixed(1)}s (${(total / secs).toFixed(1)} fps, ${workers} workers) -> ${out}`);
    exitCode = report(allErrors);
  }
} finally {
  server.close();
}
process.exit(exitCode);
