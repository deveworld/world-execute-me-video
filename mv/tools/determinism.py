"""Whole-project determinism check: the same song times rendered in three different orders must give
byte-identical PNGs (scenes are created fresh at arbitrary t by parallel workers).

  python3 -P -E tools/determinism.py out/determinism

Times: for every scene its second frame, its midpoint and its second-to-last frame (≈180 stills).
Orders: forward, reversed, and an interleaved shuffle (fixed seed). Prints every mismatch with the
number of differing pixels and the largest channel difference.
"""
import hashlib, json, random, re, subprocess, sys
from pathlib import Path
import cv2, numpy as np

ROOT = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
listing = subprocess.run(['node', 'tools/render.mjs', '--list'], cwd=ROOT, capture_output=True, text=True).stdout
frames = set()
for line in listing.splitlines():
    m = re.match(r'\s*([\d.]+) →\s*([\d.]+)\s+z=(\d+)\s+(\S+)', line)
    if m:
        f0, f1 = round(float(m[1]) * 60), round(float(m[2]) * 60)
        frames.update({f0 + 1, (f0 + f1) // 2, f1 - 2})
frames = sorted(f for f in frames if 0 <= f < 12738)
orders = {'forward': frames, 'reverse': frames[::-1]}
shuffled = frames[:]; random.Random(7).shuffle(shuffled); orders['shuffle'] = shuffled
for name, order in orders.items():
    d = out / name
    d.mkdir(exist_ok=True)
    rc = subprocess.run(['node', 'tools/render.mjs', '--stills', ','.join(f'{f / 60:.6f}' for f in order), '--outdir', str(d)], cwd=ROOT).returncode
    print(f'{name}: {len(order)} stills, exit {rc}', flush=True)

def h(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

bad = []
for f in frames:
    name = f'{f / 60:.3f}.png'
    paths = [out / o / name for o in orders]
    hashes = [h(p) for p in paths]
    if len(set(hashes)) > 1:
        ims = [cv2.imread(str(p)).astype(np.int16) for p in paths]
        diffs = [np.abs(ims[0] - x) for x in ims[1:]]
        px = max(int((d.max(axis=2) > 0).sum()) for d in diffs)
        mx = max(int(d.max()) for d in diffs)
        bad.append(dict(t=round(f / 60, 3), pixels=px, maxDiff=mx))
(out / 'result.json').write_text(json.dumps(dict(stills=len(frames), mismatches=bad), indent=1))
print(f'{len(frames)} times, {len(bad)} mismatching')
for b in bad:
    print(f"  t={b['t']:8.3f}  {b['pixels']:6d} px differ, max channel diff {b['maxDiff']}")
