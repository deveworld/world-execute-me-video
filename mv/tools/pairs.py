"""Paired contact sheet: original frame above our frame, for a run of times. No rendering needed.

  python3 -P -E tools/pairs.py --from 85 --to 89 --step 0.25 --out out/pairs.jpg
  python3 -P -E tools/pairs.py --times 85.9,86.3 --width 640 --video out/clip.mp4 --clip-from 85 --out x.jpg

By default "ours" is out/v3/world-execute-remake-v3.mp4 (the V3 render).
With --video CLIP --clip-from A it reads a clip rendered by render.mjs --from A instead (frame i = song frame round(A*60)+i).
Each cell: ORIGINAL on top, OURS below, |diff|x3 strip optional with --diff.
"""
import argparse
from pathlib import Path
import cv2, numpy as np

ROOT = Path(__file__).resolve().parents[1]
ap = argparse.ArgumentParser()
ap.add_argument('--from', dest='t0', type=float)
ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--step', type=float, default=0.25)
ap.add_argument('--times')
ap.add_argument('--width', type=int, default=360)
ap.add_argument('--cols', type=int, default=5)
ap.add_argument('--diff', action='store_true')
ap.add_argument('--crop', help='x0,y0,x1,y1 in 1920x1080 before scaling')
ap.add_argument('--video', default=str(ROOT / 'out/v3/world-execute-remake-v3.mp4'))
ap.add_argument('--clip-from', type=float, default=None)
ap.add_argument('--out', required=True)
a = ap.parse_args()

times = [float(x) for x in a.times.split(',')] if a.times else list(np.arange(a.t0, a.t1 + 1e-9, a.step))
orig = cv2.VideoCapture(str(ROOT.parent / 'qV0aezH6Aj8.mp4'))
ours = cv2.VideoCapture(a.video)
off = int(round(a.clip_from * 60)) if a.clip_from is not None else 0

def grab(cap, f):
    cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, f))
    ok, im = cap.read()
    return im if ok else np.zeros((1080, 1920, 3), np.uint8)

def prep(im, label, w):
    if a.crop:
        x0, y0, x1, y1 = (int(v) for v in a.crop.split(','))
        im = im[y0:y1, x0:x1]
    h = round(w * im.shape[0] / im.shape[1])
    im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA if w < im.shape[1] else cv2.INTER_NEAREST)
    cv2.rectangle(im, (0, 0), (min(w, 8 + 8 * len(label)), 17), (0, 0, 0), -1)
    cv2.putText(im, label, (4, 13), cv2.FONT_HERSHEY_SIMPLEX, .42, (0, 255, 255), 1, cv2.LINE_AA)
    return im

cells = []
for t in times:
    f = int(round(t * 60))
    o, u = grab(orig, f), grab(ours, f - off)
    parts = [prep(o, f'{t:.3f} ORIG', a.width), prep(u, f'{t:.3f} OURS', a.width)]
    if a.diff:
        d = np.clip(np.abs(o.astype(np.int16) - u.astype(np.int16)) * 3, 0, 255).astype(np.uint8)
        parts.append(prep(d, 'DIFF x3', a.width))
    cells.append(cv2.copyMakeBorder(np.vstack(parts), 0, 6, 0, 6, cv2.BORDER_CONSTANT, value=(40, 40, 40)))
while len(cells) % a.cols:
    cells.append(np.zeros_like(cells[0]))
sheet = np.vstack([np.hstack(cells[i:i + a.cols]) for i in range(0, len(cells), a.cols)])
Path(a.out).parent.mkdir(parents=True, exist_ok=True)
cv2.imwrite(a.out, sheet, [cv2.IMWRITE_JPEG_QUALITY, 88])
print(f'{len(times)} pairs -> {a.out} ({sheet.shape[1]}x{sheet.shape[0]})')
