"""Per-tile event timing audit: where does something change in the original, and does ours change
at the same frame, with the same strength?

  python3 -P -E tools/event_lags.py out/v3/world-execute-remake-v3.mp4 out/events

Per 160x180 tile (12x6 grid, measured at 480x270) it builds the frame-to-frame activity of both videos.
An "event" is a local activity peak in the original (or in ours, for extra events). For each event the
best-matching lag of ours within ±12 frames is found by cross-correlating a ±10 frame window.
Reported: |lag| >= 2 frames (early/late), strength ratio < 0.4 (missing/too weak) or > 2.5 (too strong),
and strong events in ours with no counterpart in the original (extra). Cuts (whole-frame events) are
reported separately so a global offset is visible.
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ours, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
W, H, TX, TY = 480, 270, 12, 6

def reader(p):
    return subprocess.Popen(['ffmpeg', '-v', 'error', '-i', str(p), '-an', '-fps_mode', 'passthrough', '-vf', f'scale={W}:{H}:flags=area,format=gray',
                             '-f', 'rawvideo', 'pipe:1'], stdout=subprocess.PIPE)

procs = [reader(ROOT.parent / 'qV0aezH6Aj8.mp4'), reader(ours)]
acts, prev = [[], []], [None, None]
while True:
    raw = [p.stdout.read(W * H) for p in procs]
    if len(raw[0]) < W * H or len(raw[1]) < W * H:
        break
    for k in range(2):
        g = np.frombuffer(raw[k], np.uint8).reshape(H, W).astype(np.int16)
        a = np.zeros((TY, TX), np.float32) if prev[k] is None else np.abs(g - prev[k]).reshape(TY, H // TY, TX, W // TX).mean(axis=(1, 3))
        acts[k].append(a); prev[k] = g
for p in procs:
    p.kill()
A = [np.stack(x) for x in acts]          # frames x TY x TX
n = len(A[0])
np.savez_compressed(out / 'tile_activity.npz', orig=A[0], ours=A[1])

scenes = []
for line in subprocess.run(['node', 'tools/render.mjs', '--list'], cwd=ROOT, capture_output=True, text=True).stdout.splitlines():
    m = re.match(r'\s*([\d.]+) →\s*([\d.]+)\s+z=(\d+)\s+(\S+)', line)
    if m:
        scenes.append((float(m[1]), float(m[2]), int(m[3]), m[4]))
def scene_at(t):
    live = [s for s in scenes if s[0] <= t < s[1]]
    return max(live, key=lambda s: s[2])[3] if live else '?'

def peaks(x, thr):
    return [i for i in range(1, len(x) - 1) if x[i] >= thr and x[i] >= x[i - 1] and x[i] > x[i + 1]]

def best_lag(o, w, i, R=10, L=12):
    lo, hi = max(0, i - R - L), min(len(o), i + R + L + 1)
    seg_o = o[max(0, i - R):i + R + 1]
    best = (0, -1.0)
    for lag in range(-L, L + 1):
        a, b = max(0, i - R), i + R + 1
        if a + lag < 0 or b + lag > len(w):
            continue
        so, sw = seg_o, w[a + lag:b + lag]
        if so.std() < 1e-6 or sw.std() < 1e-6:
            continue
        c = float(np.corrcoef(so, sw)[0, 1])
        if c > best[1] + 1e-9 or (abs(c - best[1]) < 1e-9 and abs(lag) < abs(best[0])):
            best = (lag, c)
    return best

findings = []
whole = [a.mean(axis=(1, 2)) for a in A]
cuts = [i for i in peaks(whole[0], 8.0)]
cut_rows = []
for i in cuts:
    lag, c = best_lag(whole[0], whole[1], i, R=6, L=6)
    cut_rows.append(dict(t=round(i / 60, 3), lag=lag, corr=round(c, 2), scene=scene_at(i / 60)))
for ty in range(TY):
    for tx in range(TX):
        o, w = A[0][:, ty, tx], A[1][:, ty, tx]
        thr_o = max(2.0, 5 * float(np.median(o)) + 0.5)
        for i in peaks(o, thr_o):
            if whole[0][i] > 8.0:      # part of a cut, handled above
                continue
            lag, c = best_lag(o, w, i)
            j = min(n - 1, max(0, i + lag))
            ratio = float(w[max(0, j - 2):j + 3].max() / max(1e-3, o[max(0, i - 2):i + 3].max()))
            kind = None
            if ratio < 0.4:
                kind = 'weak/missing'
            elif ratio > 2.5:
                kind = 'too strong'
            elif abs(lag) >= 2 and c > 0.5:
                kind = 'late' if lag > 0 else 'early'
            if kind:
                findings.append(dict(t=round(i / 60, 3), tile=[tx * 160, ty * 180, tx * 160 + 160, ty * 180 + 180], kind=kind, lag=lag,
                                     corr=round(c, 2), ratio=round(ratio, 2), strength=round(float(o[i]), 2), scene=scene_at(i / 60)))
        thr_w = max(2.0, 5 * float(np.median(w)) + 0.5)
        for i in peaks(w, thr_w):
            if whole[1][i] > 8.0:
                continue
            win = o[max(0, i - 12):i + 13]
            if win.max() < 0.3 * w[i]:
                findings.append(dict(t=round(i / 60, 3), tile=[tx * 160, ty * 180, tx * 160 + 160, ty * 180 + 180], kind='extra', lag=0, corr=0,
                                     ratio=round(float(w[i] / max(1e-3, win.max())), 2), strength=round(float(w[i]), 2), scene=scene_at(i / 60)))
findings.sort(key=lambda f: (f['scene'], f['t']))
(out / 'events.json').write_text(json.dumps(dict(cuts=cut_rows, findings=findings), indent=1))
print(f'{n} frames; {len(cut_rows)} cuts, off-grid cuts: {[c for c in cut_rows if c["lag"] != 0]}')
by = {}
for f in findings:
    by.setdefault(f['scene'], []).append(f)
for s, fs in sorted(by.items(), key=lambda kv: -sum(x['strength'] for x in kv[1])):
    kinds = {}
    for f in fs:
        kinds[f['kind']] = kinds.get(f['kind'], 0) + 1
    print(f'{s:22s} {len(fs):3d}  ' + ', '.join(f'{k} {v}' for k, v in kinds.items()))
    for f in sorted(fs, key=lambda f: -f['strength'])[:6]:
        print(f"    {f['t']:8.3f}  {f['kind']:12s} lag {f['lag']:+3d} corr {f['corr']:4.2f} ratio {f['ratio']:5.2f} str {f['strength']:5.1f} tile {f['tile']}")
