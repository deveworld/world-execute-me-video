"""Score a clip of our render against the original and against the full render in out/v3.

  node tools/render.mjs --from 61 --to 62.93 --only simulation/ --workers 2 --no-audio --out out/clip.mp4
  python3 -P -E tools/score.py out/clip.mp4 --from 61 [--region x0,y0,x1,y1] [--per-frame]

Clip frame i is song frame round(from*60)+i (that is how render.mjs numbers frames). Metrics are on
480x270 (region scaled accordingly): RGB mean abs error and symmetric Canny-edge chamfer distance
(px at 480 wide). "base" is the same frames of out/v3/world-execute-remake-v3.mp4,
so the delta column shows whether your change moved the frame towards the original (negative = better).
"""
import argparse, subprocess
from pathlib import Path
import cv2, numpy as np

ROOT = Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument('clip')
ap.add_argument('--from', dest='t0', type=float, required=True)
ap.add_argument('--region', default=None)
ap.add_argument('--per-frame', action='store_true')
ap.add_argument('--original', default=str(ROOT.parent / 'qV0aezH6Aj8.mp4'))
ap.add_argument('--base', default=str(ROOT / 'out/v3/world-execute-remake-v3.mp4'))
a = ap.parse_args()
W, H = 480, 270
f0 = int(round(a.t0 * 60))

def reader(path, start_frame=None):
    # seek half a frame early: concatenated renders carry pts up to ~0.7 ms before f/60
    pre = ['-ss', f'{(start_frame - 0.5) / 60:.6f}'] if start_frame is not None else []
    return subprocess.Popen(['ffmpeg', '-v', 'error', *pre, '-i', path, '-an', '-fps_mode', 'passthrough', '-vf', f'scale={W}:{H}:flags=area',
                             '-f', 'rawvideo', '-pix_fmt', 'bgr24', 'pipe:1'], stdout=subprocess.PIPE)

region = None
if a.region:
    x0, y0, x1, y1 = (int(v) for v in a.region.split(','))
    region = (slice(y0 * H // 1080, max(y0 * H // 1080 + 1, y1 * H // 1080)), slice(x0 * W // 1920, max(x0 * W // 1920 + 1, x1 * W // 1920)))

def metrics(x, y):
    if region:
        x, y = x[region], y[region]
    rgb = float(np.abs(x.astype(np.int16) - y.astype(np.int16)).mean())
    e = [cv2.Canny(cv2.cvtColor(np.ascontiguousarray(i), cv2.COLOR_BGR2GRAY), 40, 100) > 0 for i in (x, y)]
    if e[0].any() and e[1].any():
        dt = [cv2.distanceTransform((~k).astype(np.uint8), cv2.DIST_L2, 3) for k in e]
        edge = float((dt[0][e[1]].mean() + dt[1][e[0]].mean()) / 2)
    else:
        edge = 0.0 if e[0].any() == e[1].any() else 30.0
    return rgb, edge

has_base = Path(a.base).exists()
procs = [reader(a.clip), reader(a.original, f0)] + ([reader(a.base, f0)] if has_base else [])
rows = []
while True:
    raw = [p.stdout.read(W * H * 3) for p in procs]
    if any(len(r) < W * H * 3 for r in raw):
        break
    ims = [np.frombuffer(r, np.uint8).reshape(H, W, 3) for r in raw]
    cur = metrics(ims[0], ims[1])
    base = metrics(ims[2], ims[1]) if has_base else (np.nan, np.nan)
    rows.append((f0 + len(rows), *cur, *base))
for p in procs:
    p.kill()
r = np.array(rows)
if a.per_frame:
    for f, c, e, bc, be in r:
        print(f'{f / 60:8.3f}s  rgb {c:6.2f} (base {bc:6.2f})  edge {e:5.2f} (base {be:5.2f})')
print(f'{len(r)} frames from {a.t0:.3f}s{"  region " + a.region if a.region else ""}')
print(f'rgb  mean {r[:, 1].mean():6.2f}  base {r[:, 3].mean():6.2f}  delta {r[:, 1].mean() - r[:, 3].mean():+6.2f}')
print(f'edge mean {r[:, 2].mean():6.2f}  base {r[:, 4].mean():6.2f}  delta {r[:, 2].mean() - r[:, 4].mean():+6.2f}')
worse = int(((r[:, 1] > r[:, 3] + 1.0) | (r[:, 2] > r[:, 4] + 0.5)).sum())
print(f'frames clearly worse than base: {worse}/{len(r)}')
