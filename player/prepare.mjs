import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { startServer } from '../mv/tools/server.mjs';

// node prepare.mjs [--check-thumbs]   (--check-thumbs: only check that the preview sheets are current)
const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(root, '../mv');
const dist = path.join(root, 'dist');
await mkdir(path.join(dist, 'media'), { recursive: true });
// Each copy replaces the old folder, so files deleted from ../mv disappear from dist too.
for (const dir of ['engine', 'scenes', 'assets']) {
  await rm(path.join(dist, dir), { recursive: true, force: true });
  await cp(path.join(source, dir), path.join(dist, dir), { recursive: true });
}
const server = await startServer();
try {
  for (const [route, dest] of [
    ['/__scenes.json', '__scenes.json'],
    ['/assets/fonts/fonts.css', 'assets/fonts/fonts.css'],
  ]) {
    const response = await fetch(server.url + route);
    if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
    await writeFile(path.join(dist, dest), await response.text());
  }
} finally {
  server.close();
}
// Without the original video (it isn't in the repository) the player uses Mili's official upload on YouTube.
const original = path.resolve(root, '../qV0aezH6Aj8.mp4'), soundtrack = path.join(dist, 'media/soundtrack.m4a');
if (existsSync(original)) {
  const audio = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', original, '-vn', '-c:a', 'copy', '-movflags', '+faststart', soundtrack], { stdio: 'inherit' });
  if (audio.status !== 0) throw new Error('Could not extract the original soundtrack');
} else {
  await rm(soundtrack, { force: true });
  console.log('No ../qV0aezH6Aj8.mp4: the player will use the YouTube soundtrack.');
}
const check = process.argv.includes('--check-thumbs');
const thumbs = spawnSync('node', [path.join(root, 'thumbs.mjs'), ...(check ? ['--check'] : [])], { stdio: 'inherit' });
if (thumbs.status !== 0) throw new Error(check ? 'The committed preview thumbnails are stale' : 'Could not render the seek-bar preview thumbnails');
console.log('Prepared the scene modules, fonts, scene index and preview thumbnails.');
