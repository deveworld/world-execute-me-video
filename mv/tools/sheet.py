"""Contact sheet of a video with time labels.

  python3 -P -E tools/sheet.py --from 27.9 --to 30.3 --n 18 --cols 6 --out sheet.png
  python3 -P -E tools/sheet.py --times 37.5,40.5 --width 960 --out pair.png
  (--video defaults to the original MV)
"""
import argparse, cv2, numpy as np
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('--video', default=str(Path(__file__).resolve().parents[2] / 'qV0aezH6Aj8.mp4'))
ap.add_argument('--from', dest='t0', type=float)
ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--n', type=int, default=12)
ap.add_argument('--times', help='comma-separated seconds (overrides --from/--to)')
ap.add_argument('--cols', type=int, default=4)
ap.add_argument('--width', type=int, default=480, help='tile width in px')
ap.add_argument('--out', required=True)
a = ap.parse_args()

cap = cv2.VideoCapture(a.video)
fps = cap.get(cv2.CAP_PROP_FPS)
if a.times:
    times = [float(x) for x in a.times.split(',')]
else:
    times = list(np.linspace(a.t0, a.t1, a.n, endpoint=False))
idx = sorted(set(int(round(t * fps)) for t in times))
tw = a.width; th = round(tw * 9 / 16)
tiles = {}
cap.set(cv2.CAP_PROP_POS_FRAMES, idx[0])
cur = idx[0]
for target in idx:
    if target < cur or target - cur > 600:
        cap.set(cv2.CAP_PROP_POS_FRAMES, target); cur = target
    while cur < target:
        cap.grab(); cur += 1
    ok, f = cap.read(); cur += 1
    if not ok: break
    tile = cv2.resize(f, (tw, th), interpolation=cv2.INTER_AREA)
    label = f'{target / fps:.2f}s'
    s = max(0.45, tw / 960)
    (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, s, 1)
    cv2.rectangle(tile, (0, 0), (w + 8, h + 10), (0, 0, 0), -1)
    cv2.putText(tile, label, (4, h + 5), cv2.FONT_HERSHEY_SIMPLEX, s, (0, 255, 255), 1, cv2.LINE_AA)
    tiles[target] = tile
order = [tiles[i] for i in idx if i in tiles]
rows = (len(order) + a.cols - 1) // a.cols
canvas = np.zeros((rows * th, a.cols * tw, 3), np.uint8)
for k, t in enumerate(order):
    r, c = divmod(k, a.cols)
    canvas[r*th:(r+1)*th, c*tw:(c+1)*tw] = t
cv2.imwrite(a.out, canvas)
print(f'{len(order)} frames -> {a.out}')
