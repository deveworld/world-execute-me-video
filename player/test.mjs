// Functional + visual check of the floating-bar viewer at http://127.0.0.1:4173 (run `npm start` first).
// Uses playwright-core from ../mv/node_modules and /usr/bin/google-chrome. Screenshots and result.json go to output/test/.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(new URL('../mv/package.json', import.meta.url))('playwright-core');
const OUT = new URL('output/test/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const URL0 = 'http://127.0.0.1:4173/';
const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=vulkan', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const results = {};
const ok = (name, cond, info) => { results[name] = { pass: !!cond, ...(info !== undefined ? { info } : {}) }; console.log(cond ? 'PASS' : 'FAIL', name, info !== undefined ? JSON.stringify(info) : ''); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function open(ctxOpts, query = '?t=16') {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL0 + query);
  await page.evaluate(() => window.__player.ready);
  return { ctx, page, errors };
}
const st = page => page.evaluate(() => window.__player.state);
const rect = (page, sel) => page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top, r.width, r.height].map(v => Math.round(v * 100) / 100); }, sel);
const barOpacity = page => page.evaluate(() => Number(getComputedStyle(document.getElementById('bar')).opacity));

// A. desktop 1440x900
{
  const { ctx, page, errors } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.evaluate(() => localStorage.clear());
  await page.reload(); await page.evaluate(() => window.__player.ready);
  const extra = await page.evaluate(() => document.querySelectorAll('h1, h2, header, footer, nav, .bookmarks, a').length);
  ok('A.only screen and bar', extra === 0, { extra });
  ok('A.fit layout', JSON.stringify(await rect(page, '#screen')) === JSON.stringify([0, 45, 1440, 810]), await rect(page, '#screen'));
  let s = await st(page);
  ok('A.initial t=16 frame 960', s.frame === 960 && s.lastDrawnTime === 16 && s.fps === 60, { frame: s.frame, t: s.lastDrawnTime });
  ok('A.fit option label', (await page.$eval('#resolution option[value=fit]', o => o.textContent)) === '화면 맞춤 · 1440 × 810');
  ok('A.bar visible at start', (await barOpacity(page)) > 0.95 && s.barVisible);
  await page.screenshot({ path: OUT + 'a-bar-visible.png' });
  await sleep(3400);
  s = await st(page);
  ok('A.bar hides after inactivity', !s.barVisible && (await barOpacity(page)) < 0.05, { op: await barOpacity(page) });
  ok('A.cursor hidden when idle', (await page.$eval('#player', e => getComputedStyle(e).cursor)) === 'none');
  await page.screenshot({ path: OUT + 'a-bar-hidden.png' });
  await page.mouse.move(700, 400); await sleep(300);
  ok('A.mouse move reveals', (await st(page)).barVisible && (await barOpacity(page)) > 0.9);
  const bar = await rect(page, '#bar');
  await page.mouse.move(bar[0] + bar[2] / 2, bar[1] + 6); await sleep(3600);
  ok('A.hover holds bar', (await st(page)).barVisible);
  // hover tooltip
  const tl = await rect(page, '#timeline');
  await page.mouse.move(tl[0] + 6 + (tl[2] - 12) * 0.5, tl[1] + tl[3] / 2); await sleep(100);
  await page.waitForFunction(() => document.querySelectorAll('#thumb').length && fetch('/media/thumbs/index.json').then(r => r.ok));
  await page.mouse.move(tl[0] + 6 + (tl[2] - 12) * 0.5 + 1, tl[1] + tl[3] / 2); await page.mouse.move(tl[0] + 6 + (tl[2] - 12) * 0.5, tl[1] + tl[3] / 2); await sleep(300);
  const pv = await page.evaluate(() => ({ shown: !document.getElementById('preview').hidden, time: document.getElementById('hover-time').value, thumb: !document.getElementById('thumb').hidden,
    img: document.getElementById('thumb').style.backgroundImage, pos: document.getElementById('thumb').style.backgroundPosition }));
  ok('A.hover preview time + thumbnail', pv.shown && pv.time === '1:46.150' && pv.thumb && pv.img.includes('sheet-05.jpg') && pv.pos === '-960px -270px', pv);
  await page.screenshot({ path: OUT + 'a-hover.png' });
  // keyboard: frame step, 5 s, play/pause
  await page.mouse.move(700, 300);
  await page.keyboard.press('.'); await sleep(150);
  ok('A.period steps one frame', (await st(page)).frame === 961);
  await page.keyboard.press(','); await page.keyboard.press('ArrowRight'); await sleep(200);
  ok('A.arrow +5s', (await st(page)).frame === 1260, (await st(page)).frame);
  await page.keyboard.press('Space'); await sleep(1200);
  s = await st(page);
  ok('A.space plays with audio clock', s.playing && s.audioClock && s.frame > 1290, { frame: s.frame, audioClock: s.audioClock });
  await sleep(2600);
  ok('A.bar hides while playing', !(await st(page)).barVisible);
  await page.keyboard.press('Space'); await sleep(200);
  s = await st(page);
  ok('A.space pauses, bar shown', !s.playing && s.barVisible);
  // click on screen toggles play
  await page.mouse.click(700, 300); await sleep(500);
  ok('A.click screen plays', (await st(page)).playing);
  await page.mouse.click(700, 300); await sleep(200);
  ok('A.click screen pauses', !(await st(page)).playing);
  // mouse-clicked button must not swallow Space
  await page.click('#mute'); await sleep(100);
  const muted = await page.evaluate(() => document.getElementById('soundtrack').muted);
  await page.keyboard.press('Space'); await sleep(400);
  s = await st(page);
  ok('A.mute click then Space = play', muted && s.playing && (await page.evaluate(() => document.getElementById('soundtrack').muted)), { muted, playing: s.playing });
  await page.keyboard.press('Space'); await page.click('#mute');
  // scrubbing while playing: pause during drag, resume after
  await page.keyboard.press('Space'); await sleep(300);
  await page.mouse.move(tl[0] + 6 + (tl[2] - 12) * 0.25, tl[1] + tl[3] / 2); await page.mouse.down(); await sleep(100);
  const during = await st(page);
  await page.mouse.move(tl[0] + 6 + (tl[2] - 12) * 0.3, tl[1] + tl[3] / 2, { steps: 5 }); await sleep(100);
  const moved = await st(page);
  await page.mouse.up(); await sleep(600);
  const after = await st(page);
  ok('A.scrub pauses then resumes', !during.playing && Math.abs(moved.time - 212.3 * 0.3) < 1 && after.playing, { during: during.playing, moved: moved.time, after: after.playing });
  await page.keyboard.press('Space');
  // time entry
  await page.click('#time-input'); await page.keyboard.type('1:17.45'); await page.keyboard.press('Enter'); await sleep(300);
  ok('A.time entry', (await st(page)).frame === 4647, (await st(page)).frame);
  ok('A.no errors', errors.length === 0, errors.slice(0, 3));
  await ctx.close();
}

// B. resolution
{
  const { ctx, page, errors } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.selectOption('#resolution', '1280x720'); await sleep(200);
  let s = await st(page);
  ok('B.1280x720 1:1 centred', JSON.stringify(await rect(page, '#screen')) === JSON.stringify([80, 90, 1280, 720]) && s.renderSize.join() === '1280,720' && !s.downscaled, await rect(page, '#screen'));
  await page.mouse.move(10, 10); await sleep(3400);
  await page.screenshot({ path: OUT + 'b-1280x720.png' });
  await page.selectOption('#resolution', '640x360'); await sleep(200);
  ok('B.640x360 1:1', JSON.stringify(await rect(page, '#screen')) === JSON.stringify([400, 270, 640, 360]));
  await page.selectOption('#resolution', '1920x1080'); await sleep(200);
  s = await st(page);
  ok('B.1920 in 1440 window downscaled + note', s.downscaled && !(await page.$eval('#scale-note', e => e.hidden)) && (await rect(page, '#screen'))[2] === 1440, await page.$eval('#scale-note', e => e.value));
  await page.screenshot({ path: OUT + 'b-downscaled-note.png' });
  await page.setViewportSize({ width: 1920, height: 1080 }); await sleep(300);
  s = await st(page);
  ok('B.1920 window 1:1', !s.downscaled && JSON.stringify(await rect(page, '#screen')) === JSON.stringify([0, 0, 1920, 1080]) && (await page.$eval('#scale-note', e => e.hidden)));
  await page.reload(); await page.evaluate(() => window.__player.ready);
  ok('B.resolution persists', (await st(page)).resolution === '1920x1080');
  await page.goto(URL0 + '?t=16&res=854x480'); await page.evaluate(() => window.__player.ready);
  ok('B.?res= param', (await st(page)).resolution === '854x480' && (await rect(page, '#screen'))[2] === 854);
  await page.selectOption('#resolution', 'fit');
  ok('B.no errors', errors.length === 0, errors.slice(0, 3));
  await ctx.close();
  // DPR 2: 3840x2160 needs a 1920x1080 CSS window
  const two = await open({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  await two.page.selectOption('#resolution', '3840x2160'); await sleep(300);
  s = await st(two.page);
  ok('B.dpr2 3840x2160 1:1', !s.downscaled && s.renderSize.join() === '3840,2160' && (await rect(two.page, '#screen'))[2] === 1920);
  await two.page.mouse.move(5, 5); await sleep(3400);
  await two.page.screenshot({ path: OUT + 'b-dpr2-3840.png' });
  await two.page.selectOption('#resolution', '1280x720'); await sleep(200);
  ok('B.dpr2 1280x720 = 640 css px', (await rect(two.page, '#screen'))[2] === 640 && (await st(two.page)).renderSize.join() === '1280,720');
  await two.page.selectOption('#resolution', 'fit');
  await two.ctx.close();
}

// C. fps
{
  const { ctx, page, errors } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.selectOption('#fps', '30'); await sleep(200);
  let s = await st(page);
  ok('C.30fps frame grid', s.fps === 30 && s.lastFrame === 6368 && s.frame === 480 && (await page.$eval('#timeline', e => e.max)) === '6368', { lastFrame: s.lastFrame, frame: s.frame });
  await page.mouse.move(700, 300); await page.keyboard.press('.'); await sleep(150);
  s = await st(page);
  ok('C.30fps step = 1/30 s', s.frame === 481 && Math.abs(s.lastDrawnTime - 481 / 30) < 1e-12, s.lastDrawnTime);
  const drawn = await page.evaluate(async () => {
    const p = window.__player; await p.play(); const seen = new Set();
    const t0 = performance.now();
    while (performance.now() - t0 < 2000) { seen.add(p.state.lastDrawnTime); await new Promise(r => requestAnimationFrame(r)); }
    p.pause(); return [...seen];
  });
  const offGrid = drawn.filter(t => Math.abs(t * 30 - Math.round(t * 30)) > 1e-6);
  ok('C.30fps playback samples only k/30', drawn.length >= 45 && offGrid.length === 0, { distinct: drawn.length, offGrid: offGrid.length });
  await page.selectOption('#fps', '24'); await sleep(150);
  ok('C.24fps last frame', (await st(page)).lastFrame === 5095);
  await page.selectOption('#fps', '240'); await sleep(150);
  ok('C.240fps last frame', (await st(page)).lastFrame === 50951);
  await page.reload(); await page.evaluate(() => window.__player.ready);
  ok('C.fps persists', (await st(page)).fps === 240);
  await page.selectOption('#fps', '60');
  ok('C.no errors', errors.length === 0, errors.slice(0, 3));
  await ctx.close();
}

// D. mobile
{
  const { ctx, page, errors } = await open({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const sc = await rect(page, '#screen'), bar = await rect(page, '#bar');
  ok('D.mobile fit', sc[2] === 390 && Math.abs(sc[1] - (844 - 219.375) / 2) < 0.5, sc);
  ok('D.bar inside viewport', bar[0] >= 0 && bar[0] + bar[2] <= 390 && bar[1] + bar[3] <= 844, bar);
  ok('D.no horizontal overflow', (await page.evaluate(() => document.documentElement.scrollWidth)) <= 390);
  await page.screenshot({ path: OUT + 'd-mobile.png' });
  await sleep(3400);
  ok('D.hides', !(await st(page)).barVisible);
  await page.touchscreen.tap(195, 400); await sleep(300);
  ok('D.tap reveals', (await st(page)).barVisible && !(await st(page)).playing);
  await page.touchscreen.tap(195, 400); await sleep(400);
  ok('D.tap again hides', !(await st(page)).barVisible);
  ok('D.no errors', errors.length === 0, errors.slice(0, 3));
  await ctx.close();
}
// E. prewarm, seek speed in the player, cached instances draw the same pixels as fresh ones
{
  const { ctx, page, errors } = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, '?t=30');
  const t0 = Date.now();
  await page.waitForFunction(() => document.getElementById('scene-frame').contentWindow.__stage.list().every(s => s.alive), null, { timeout: 30000, polling: 200 });
  ok('E.idle prewarm creates all scenes', true, { seconds: (Date.now() - t0) / 1000 });
  const seeks = await page.evaluate(async () => {
    const p = window.__player, out = []; let seed = 99;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 60; i++) { const t = rnd() * 212; const a = performance.now(); await p.seek(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); out.push(performance.now() - a); }
    return out.sort((a, b) => a - b);
  });
  ok('E.random seeks after prewarm', seeks.at(-1) < 100, { median: Math.round(seeks[30]), max: Math.round(seeks.at(-1)) });
  ok('E.no errors', errors.length === 0, errors.slice(0, 3));
  await ctx.close();
  // playing straight after load while prewarm runs
  const fresh = await open({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, '?t=44');
  await fresh.page.evaluate(() => window.__player.play()); await sleep(9000);
  const ps = await st(fresh.page);
  ok('E.playback during prewarm', ps.playing && ps.time > 51 && fresh.errors.length === 0, { time: ps.time, errors: fresh.errors.slice(0, 2) });
  await fresh.ctx.close();
  // pixels: viewer runtime (cache warm, shuffled visits) vs engine runtime (fresh)
  const times = [3.2, 16, 29.5, 41, 49.9, 57.5, 66, 75, 84.7, 96.2, 101.5, 108.5, 120.2, 134, 142.4, 150.3, 158, 172.3, 180, 195.5, 205];
  const shots = {};
  for (const [name, url, warm] of [['engine', '/engine/stage.html', false], ['viewer', '/viewer/stage.html', true]]) {
    const c = await browser.newContext({ viewport: { width: 1920, height: 1080 } }); const pg = await c.newPage();
    await pg.goto('http://127.0.0.1:4173' + url); await pg.evaluate(() => window.__stage.ready);
    if (warm) await pg.evaluate(async times => { const st = window.__stage; for (const s of st.list()) await st.prewarm(s.start); for (const t of [...times].reverse()) await st.renderFrame(t + 0.5); }, times);
    shots[name] = [];
    for (const t of times) { await pg.evaluate(t => window.__stage.renderFrame(t), t); await pg.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))); shots[name].push(await pg.screenshot({ type: 'png' })); }
    await c.close();
  }
  const cmp = await (async () => {
    const pg = await browser.newPage();
    return pg.evaluate(async pairs => {
      const load = async b64 => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = new OffscreenCanvas(1920, 1080); const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, 1920, 1080).data; };
      const out = [];
      for (const [a, b] of pairs) { const A = await load(a), B = await load(b); let diff = 0, max = 0; for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); if (d) { diff++; max = Math.max(max, d); } } out.push([diff, max]); }
      return out;
    }, shots.engine.map((b, i) => [b.toString('base64'), shots.viewer[i].toString('base64')]));
  })();
  const identical = cmp.filter(([d]) => d === 0).length;
  ok('E.cached scenes draw the same pixels', cmp.every(([d, m]) => d === 0 || (d < 2000 && m <= 3)), { identical: `${identical}/${times.length}`, differing: cmp.map((c, i) => c[0] ? `${times[i]}:${c[0]}px/max${c[1]}` : null).filter(Boolean) });
}
await browser.close();
const failed = Object.entries(results).filter(([, r]) => !r.pass).map(([k]) => k);
console.log(`${Object.keys(results).length - failed.length}/${Object.keys(results).length} passed`, failed);
writeFileSync(OUT + 'result.json', JSON.stringify(results, null, 1));
process.exitCode = failed.length ? 1 : 0;
