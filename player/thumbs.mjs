// Seek-bar preview thumbnails, rendered from the copied scene code with ../mv/tools/render.mjs
// (4 per second, drawn at 960×540 and reduced to 320×180), packed into 10×10 JPEG sprite sheets.
// Skipped when dist/scenes, dist/engine and dist/assets are unchanged since the last run; --check only reports
// whether the committed sheets still match them (the Pages build cannot render).
//   node thumbs.mjs [--force | --check]
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist'), outDir = path.join(dist, 'media/thumbs'), mv = path.resolve(root, '../mv');
const FPS = 4, W = 320, H = 180, COLS = 10, ROWS = 10;

function hashTree(dir, hash) {
  for (const name of readdirSync(dir).sort()) {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) hashTree(file, hash);
    else hash.update(path.relative(dist, file)).update(readFileSync(file));
  }
  return hash;
}
const hash = createHash('sha1');
for (const dir of ['engine', 'scenes', 'assets']) hashTree(path.join(dist, dir), hash);
hash.update(JSON.stringify({ FPS, W, H, COLS, ROWS }));
const digest = hash.digest('hex');
const indexFile = path.join(outDir, 'index.json');
if (!process.argv.includes('--force') && existsSync(indexFile) && JSON.parse(readFileSync(indexFile, 'utf8')).source === digest) {
  console.log('Preview thumbnails are up to date.');
  process.exit(0);
}
if (process.argv.includes('--check')) {
  console.error('Preview thumbnails are stale: run `npm run build` in player/ and commit dist/media/thumbs.');
  process.exit(1);
}

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} exited with ${r.status}`);
};
const tmp = path.join(root, 'output/thumbs-tmp');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const clip = path.join(tmp, 'thumbs.mp4');
// render.mjs reads ../mv/scenes; the hash above covers dist, which `npm run build` has just copied from it.
run('node', ['tools/render.mjs', '--from', '0', '--to', '212.3', '--fps', String(FPS), '--scale', '0.5', '--crf', '10', '--no-audio', '--workers', '4', '--out', clip], { cwd: mv });
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
run('ffmpeg', ['-v', 'error', '-y', '-i', clip, '-vf', `scale=${W}:${H}:flags=area,tile=${COLS}x${ROWS}`, '-q:v', '4', path.join(outDir, 'sheet-%02d.jpg')]);
const count = Number(spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', clip]).stdout.toString().trim());
const sheets = readdirSync(outDir).filter(f => f.endsWith('.jpg')).sort();
if (sheets.length !== Math.ceil(count / (COLS * ROWS))) throw new Error(`expected ${Math.ceil(count / (COLS * ROWS))} sheets for ${count} frames, got ${sheets.length}`);
writeFileSync(indexFile, JSON.stringify({ fps: FPS, count, width: W, height: H, cols: COLS, rows: ROWS, sheets, source: digest }, null, 1));
rmSync(tmp, { recursive: true, force: true });
console.log(`Rendered ${count} preview thumbnails into ${sheets.length} sheets.`);
