// Static server for the project root (ES modules can't load from file://).
// GET /__scenes.json?only=a,b lists every scenes/**/*.scene.js whose path contains any of the patterns.
//
//   node tools/server.mjs        # prints a URL; open <url>/engine/stage.html?only=math/ to poke at it
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.txt': 'text/plain',
};

async function findScenes(dir) {
  const found = [];
  for (const ent of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) found.push(...(await findScenes(p)));
    else if (ent.name.endsWith('.scene.js')) found.push('/' + path.relative(ROOT, p).split(path.sep).join('/'));
  }
  return found.sort();
}

const WEIGHTS = { thin: 100, extralight: 200, light: 300, regular: 400, book: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };

// @font-face for every assets/fonts/<dir>/ (family name from family.txt, else the folder name), with URLs
// relative to fonts.css so the site works under any path prefix.
// Variable files (from "[wght]" names) get the full weight range; static ones are read off the file name.
async function fontsCss() {
  const base = path.join(ROOT, 'assets/fonts');
  const rules = [];
  const dirs = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory()).sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const dir of dirs) {
    const files = (await readdir(path.join(base, dir.name))).sort();
    let family = dir.name;
    try { family = (await readFile(path.join(base, dir.name, 'family.txt'), 'utf8')).trim(); } catch {}
    for (const file of files.filter((f) => /\.(ttf|otf|woff2?)$/i.test(f))) {
      const stem = file.replace(/\.[^.]+$/, '');
      const italic = /italic/i.test(stem);
      const variable = /-(wght|wdth|opsz|slnt|ital)/i.test(stem);
      const style = (stem.split('-').pop() || '').toLowerCase().replace('italic', '') || 'regular';
      const weight = variable ? '1 1000' : String(WEIGHTS[style] ?? 400);
      rules.push(`@font-face { font-family: "${family}"; src: url("${dir.name}/${encodeURIComponent(file)}"); font-weight: ${weight}; font-style: ${italic ? 'italic' : 'normal'}; font-display: block; }`);
    }
  }
  return rules.join('\n');
}

export async function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local');
    if (url.pathname === '/assets/fonts/fonts.css') {
      res.writeHead(200, { 'content-type': 'text/css', 'cache-control': 'no-store' }).end(await fontsCss());
      return;
    }
    if (url.pathname === '/__scenes.json') {
      const only = (url.searchParams.get('only') ?? '').split(',').filter(Boolean);
      const all = await findScenes(path.join(ROOT, 'scenes'));
      const list = only.length ? all.filter((p) => only.some((o) => p.includes(o))) : all;
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(list));
      return;
    }
    const file = path.join(ROOT, path.normalize(decodeURIComponent(url.pathname)));
    let body;
    try {
      body = await readFile(file);
    } catch {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }).end(body);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await startServer();
  console.log(`${url}/engine/stage.html`);
}
