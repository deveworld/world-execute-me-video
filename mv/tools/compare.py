"""Side-by-side grid: the original MV frame next to our render at the same instants.

  python3 -P -E tools/compare.py --times 37.5,38.5,40.5 --only math/ --out out/math/cmp.png
  python3 -P -E tools/compare.py --from 36 --to 42 --n 8 --only math/ --out out/math/cmp.png

Times snap to the 60 fps frame grid. For every pair it prints the mean absolute
difference (0-255, on 480x270 grayscale): layout, colour or timing errors push it up.
"""
import argparse, glob, os, subprocess, sys, tempfile
import cv2, numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FPS = 60

ap = argparse.ArgumentParser()
ap.add_argument('--times', help='comma-separated song seconds')
ap.add_argument('--from', dest='t0', type=float)
ap.add_argument('--to', dest='t1', type=float)
ap.add_argument('--n', type=int, default=6)
ap.add_argument('--only', default='', help='scene path filter, e.g. math/')
ap.add_argument('--out', required=True)
ap.add_argument('--width', type=int, default=800, help='width of each tile')
ap.add_argument('--gpu', default='vulkan')
ap.add_argument('--video', default=os.path.join(os.path.dirname(ROOT), 'qV0aezH6Aj8.mp4'))
a = ap.parse_args()

times = [float(x) for x in a.times.split(',')] if a.times else list(np.linspace(a.t0, a.t1, a.n, endpoint=False))
frames = sorted(set(int(round(t * FPS)) for t in times))

tmp = tempfile.mkdtemp(prefix='cmp-')
cmd = ['node', os.path.join(ROOT, 'tools/render.mjs'), '--stills', ','.join(f'{f / FPS:.6f}' for f in frames),
       '--outdir', tmp, '--gpu', a.gpu]
if a.only:
    cmd += ['--only', a.only]
rc = subprocess.run(cmd, cwd=ROOT).returncode

ours = {}
for p in glob.glob(os.path.join(tmp, '*.png')):
    t = float(os.path.basename(p)[:-4])
    ours[int(round(t * FPS))] = cv2.imread(p)

cap = cv2.VideoCapture(a.video)
orig, cur = {}, None
for f in frames:
    if cur is None or f < cur or f - cur > 600:
        cap.set(cv2.CAP_PROP_POS_FRAMES, f)
        cur = f
    while cur < f:
        cap.grab()
        cur += 1
    ok, img = cap.read()
    cur += 1
    if ok:
        orig[f] = img

tw = a.width
th = round(tw * 9 / 16)


def tile(img, label):
    if img is None:
        img = np.zeros((1080, 1920, 3), np.uint8)
    t = cv2.resize(img, (tw, th), interpolation=cv2.INTER_AREA)
    s = max(0.45, tw / 1100)
    (w, h), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, s, 1)
    cv2.rectangle(t, (0, 0), (w + 10, h + 12), (0, 0, 0), -1)
    cv2.putText(t, label, (5, h + 6), cv2.FONT_HERSHEY_SIMPLEX, s, (0, 255, 255), 1, cv2.LINE_AA)
    return t


def gray(img):
    return cv2.cvtColor(cv2.resize(img, (480, 270), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.int16)


rows = []
for f in frames:
    o, u = orig.get(f), ours.get(f)
    mad = float(np.abs(gray(o) - gray(u)).mean()) if o is not None and u is not None else float('nan')
    print(f't={f / FPS:8.3f}s  mean-abs-diff={mad:6.2f}')
    rows.append(np.hstack([tile(o, f'ORIGINAL {f / FPS:.2f}s'), tile(u, f'OURS {f / FPS:.2f}s')]))

os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
cv2.imwrite(a.out, np.vstack(rows))
print(f'{len(rows)} pairs -> {a.out}')
sys.exit(rc)
