"""Review sheets from ranking.json: for each scene, its worst frames as original | ours | |diff|x3.

  python3 -P -E tools/sheets.py out/v3/world-execute-remake-v3.mp4 out/scan out/sheets [--top 60]
"""
import json, sys
from pathlib import Path
import cv2, numpy as np

ROOT = Path(__file__).resolve().parents[1]
ORIG = ROOT.parent / 'qV0aezH6Aj8.mp4'
ours, scan, dest = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
top = int(sys.argv[sys.argv.index('--top') + 1]) if '--top' in sys.argv else 999
dest.mkdir(parents=True, exist_ok=True)
rows = json.loads((scan / 'ranking.json').read_text())[:top]
caps = [cv2.VideoCapture(str(ORIG)), cv2.VideoCapture(str(ours))]

def grab(cap, f):
    cap.set(cv2.CAP_PROP_POS_FRAMES, f)
    ok, im = cap.read()
    return im if ok else np.zeros((1080, 1920, 3), np.uint8)

CW = 640
for r in rows:
    lines = []
    for w in r['worstFrames']:
        a, b = grab(caps[0], w['frame']), grab(caps[1], w['frame'])
        d = np.clip(np.abs(a.astype(np.int16) - b.astype(np.int16)) * 3, 0, 255).astype(np.uint8)
        cells = [cv2.resize(x, (CW, CW * 9 // 16), interpolation=cv2.INTER_AREA) for x in (a, b, d)]
        for c, label in zip(cells, ('ORIGINAL', 'OURS', '|DIFF| x3')):
            cv2.rectangle(c, (0, 0), (CW, 22), (24, 24, 24), -1)
            cv2.putText(c, f"{w['t']:.3f}s  {label}", (6, 16), cv2.FONT_HERSHEY_SIMPLEX, .5, (240, 240, 240), 1, cv2.LINE_AA)
        lines.append(np.hstack(cells))
    name = r['id'].replace('/', '__')
    cv2.imwrite(str(dest / f'{name}.jpg'), np.vstack(lines), [cv2.IMWRITE_JPEG_QUALITY, 88])
print(f'{len(rows)} sheets -> {dest}')
