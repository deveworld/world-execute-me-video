"""Every-frame fidelity scan: original vs a full render of the current source.

  python3 -P -E tools/scan_full.py out/v3/world-execute-remake-v3.mp4 out/scan

Per frame at 480x270: RGB MAE, symmetric edge chamfer distance, and frame-to-frame activity of both
videos. Per frame also a 12x6 tile grid of RGB MAE so persistent local differences (a missing or
misplaced element) stand out from global ones. Per scene: mean/p90 errors, worst frames, worst tiles,
and the activity cross-correlation lag (positive lag = ours happens later than the original).
"""
import json, re, subprocess, sys
from pathlib import Path
import cv2, numpy as np

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT.parent / 'qV0aezH6Aj8.mp4'
ours, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
W, H, TX, TY = 480, 270, 12, 6

scenes = []
listing = subprocess.run(['node', 'tools/render.mjs', '--list'], cwd=ROOT, capture_output=True, text=True).stdout
for line in listing.splitlines():
    m = re.match(r'\s*([\d.]+) →\s*([\d.]+)\s+z=(\d+)\s+(\S+)', line)
    if m:
        scenes.append(dict(start=float(m[1]), end=float(m[2]), z=int(m[3]), id=m[4]))
scenes.sort(key=lambda s: (s['start'], s['z']))

def reader(p):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(p), '-an', '-vf', f'scale={W}:{H}:flags=area',
                             '-f', 'rawvideo', '-pix_fmt', 'bgr24', 'pipe:1'], stdout=subprocess.PIPE)

procs = [reader(ORIG), reader(ours)]
n = 0
rgb, edge, act_o, act_w, tiles = [], [], [], [], []
prev = None
while True:
    raw = [p.stdout.read(W * H * 3) for p in procs]
    if len(raw[0]) < W * H * 3 or len(raw[1]) < W * H * 3:
        break
    ims = [np.frombuffer(b, np.uint8).reshape(H, W, 3) for b in raw]
    d = np.abs(ims[0].astype(np.int16) - ims[1].astype(np.int16)).mean(axis=2)
    rgb.append(float(d.mean()))
    tiles.append(d.reshape(TY, H // TY, TX, W // TX).mean(axis=(1, 3)).astype(np.float32))
    gray = [cv2.cvtColor(im, cv2.COLOR_BGR2GRAY) for im in ims]
    e = [cv2.Canny(g, 40, 100) > 0 for g in gray]
    if e[0].any() and e[1].any():
        dt = [cv2.distanceTransform((~x).astype(np.uint8), cv2.DIST_L2, 3) for x in e]
        edge.append(float((dt[0][e[1]].mean() + dt[1][e[0]].mean()) / 2))
    else:
        edge.append(0.0 if (e[0].any() == e[1].any()) else 30.0)
    if prev is None:
        act_o.append(0.0); act_w.append(0.0)
    else:
        act_o.append(float(np.abs(gray[0].astype(np.int16) - prev[0]).mean()))
        act_w.append(float(np.abs(gray[1].astype(np.int16) - prev[1]).mean()))
    prev = [g.astype(np.int16) for g in gray]
    n += 1
    if n % 1200 == 0:
        print(f'{n / 60:.0f}s', flush=True)
for p in procs:
    p.kill()

rgb, edge, act_o, act_w = map(np.array, (rgb, edge, act_o, act_w))
tiles = np.stack(tiles)
np.savez_compressed(out / 'scan.npz', rgb=rgb, edge=edge, act_o=act_o, act_w=act_w, tiles=tiles)

def lag(a, b, maxlag=12):
    """Lag (frames) maximising the correlation of the two activity signals; + = ours later."""
    if len(a) < 30 or a.std() < 1e-3 or b.std() < 1e-3:
        return 0, 0.0
    a = (a - a.mean()) / a.std(); b = (b - b.mean()) / b.std()
    best = (0, -9.0)
    for L in range(-maxlag, maxlag + 1):
        x, y = (a[:len(a) - L], b[L:]) if L >= 0 else (a[-L:], b[:len(b) + L])
        c = float((x * y).mean())
        if c > best[1]:
            best = (L, c)
    return best

rows = []
for s in scenes:
    f0, f1 = int(round(s['start'] * 60)), min(n, int(round(s['end'] * 60)))
    if f1 - f0 < 2:
        continue
    r, e = rgb[f0:f1], edge[f0:f1]
    L, c = lag(act_o[f0:f1], act_w[f0:f1])
    tmean = tiles[f0:f1].mean(axis=0)
    ty, tx = np.unravel_index(np.argsort(tmean, axis=None)[::-1][:3], tmean.shape)
    worst = (f0 + np.argsort(r + 4 * e)[::-1]).tolist()
    picks = []
    for w in worst:
        if all(abs(w - p) > 20 for p in picks):
            picks.append(w)
        if len(picks) == 4:
            break
    rows.append(dict(id=s['id'], start=s['start'], end=s['end'], z=s['z'],
                     rgbMean=round(float(r.mean()), 2), rgbP90=round(float(np.percentile(r, 90)), 2),
                     edgeMean=round(float(e.mean()), 2), edgeP90=round(float(np.percentile(e, 90)), 2),
                     activityLagFrames=int(L), activityCorr=round(c, 3),
                     activityRatio=round(float(act_w[f0:f1].sum() / max(1e-6, act_o[f0:f1].sum())), 2),
                     worstFrames=[dict(frame=int(p), t=round(p / 60, 3), rgb=round(float(rgb[p]), 2), edge=round(float(edge[p]), 2)) for p in picks],
                     worstTiles=[dict(tile=[int(x) * 160, int(y) * 180, int(x) * 160 + 160, int(y) * 180 + 180], mae=round(float(tmean[y, x]), 2)) for y, x in zip(ty, tx)]))
rows.sort(key=lambda r: -(r['rgbMean'] + 4 * r['edgeMean']))
(out / 'ranking.json').write_text(json.dumps(rows, indent=1))
print(f'{n} frames scanned')
print(f"{'scene':24s} {'rgb':>6s} {'p90':>6s} {'edge':>6s} {'p90':>6s} {'lag':>4s} {'corr':>5s} {'act':>5s}")
for r in rows:
    print(f"{r['id']:24s} {r['rgbMean']:6.2f} {r['rgbP90']:6.2f} {r['edgeMean']:6.2f} {r['edgeP90']:6.2f} {r['activityLagFrames']:4d} {r['activityCorr']:5.2f} {r['activityRatio']:5.2f}")
