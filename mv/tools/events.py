"""When does something change inside a region of the original? (text reveals, cuts, flashes)

  python3 -P -E tools/events.py --from 36.5 --to 42.5 --region 100,140,1200,310 --region 130,440,560,880

Regions are x0,y0,x1,y1 in 1920x1080 pixels. For each region it prints the frame times where the
mean absolute difference to the previous frame spikes (> mean + k*std, at least --min), plus the
per-frame trace with --trace. Use it to read lyric/word timings off the original frame-exactly.
"""
import argparse
from pathlib import Path
import cv2, numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--video', default=str(Path(__file__).resolve().parents[2] / 'qV0aezH6Aj8.mp4'))
ap.add_argument('--from', dest='t0', type=float, required=True)
ap.add_argument('--to', dest='t1', type=float, required=True)
ap.add_argument('--region', action='append', required=True)
ap.add_argument('--k', type=float, default=2.5)
ap.add_argument('--min', type=float, default=0.15)
ap.add_argument('--gap', type=float, default=0.1, help='merge spikes closer than this (s)')
ap.add_argument('--trace', action='store_true')
a = ap.parse_args()

regions = [tuple(int(v) for v in r.split(',')) for r in a.region]
cap = cv2.VideoCapture(a.video)
fps = cap.get(cv2.CAP_PROP_FPS)
f0, f1 = int(round(a.t0 * fps)), int(round(a.t1 * fps))
cap.set(cv2.CAP_PROP_POS_FRAMES, f0)
prev, rows = None, []
for f in range(f0, f1):
    ok, img = cap.read()
    if not ok:
        break
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.int16)
    if prev is not None:
        rows.append([f / fps] + [float(np.abs(g[y0:y1, x0:x1] - prev[y0:y1, x0:x1]).mean()) for x0, y0, x1, y1 in regions])
    prev = g
rows = np.array(rows)
for j, r in enumerate(regions):
    v = rows[:, j + 1]
    thr = max(a.min, v.mean() + a.k * v.std())
    events, last = [], -1e9
    for i in np.where(v > thr)[0]:
        if rows[i, 0] - last > a.gap:
            events.append(f'{rows[i, 0]:.3f}')
        last = rows[i, 0]
    print(f'region {",".join(map(str, r))}  thr={thr:.2f}  events: {" ".join(events)}')
    if a.trace:
        for t, d in zip(rows[:, 0], v):
            print(f'  {t:8.3f}  {d:6.2f}  {"#" * min(60, int(d * 4))}')
