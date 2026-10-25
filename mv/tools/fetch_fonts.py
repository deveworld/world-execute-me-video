"""Download font families from github.com/google/fonts into assets/fonts/<dir>/.

  python3 -P -E tools/fetch_fonts.py ofl/vt323 ofl/pressstart2p apache/homemadeapple

Each family lands in its own folder with a family.txt holding the CSS family name.
The dev server turns every folder into @font-face rules on the fly (/assets/fonts/fonts.css),
so a family is usable by name from any scene as soon as this finishes.
"""
import json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEST = os.path.join(ROOT, 'assets', 'fonts')
API = 'https://api.github.com/repos/google/fonts/contents/'
RAW = 'https://raw.githubusercontent.com/google/fonts/main/'


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'fetch-fonts'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def write_atomic(path, data):
    tmp = f'{path}.tmp{os.getpid()}'
    with open(tmp, 'wb') as f:
        f.write(data)
    os.replace(tmp, path)


failed = []
for spec in sys.argv[1:]:
    folder = spec.split('/')[-1]
    try:
        meta = get(RAW + spec + '/METADATA.pb').decode()
        family = re.search(r'^name:\s*"([^"]+)"', meta, re.M).group(1)
        files = [e for e in json.loads(get(API + spec)) if e['name'].endswith(('.ttf', '.otf'))]
    except Exception as err:
        failed.append(spec)
        print(f'{spec}: {err}', file=sys.stderr)
        continue
    out = os.path.join(DEST, folder)
    os.makedirs(out, exist_ok=True)
    for e in files:
        safe = e['name'].replace('[', '-').replace(']', '').replace(',', '-')
        write_atomic(os.path.join(out, safe), get(e['download_url']))
    write_atomic(os.path.join(out, 'family.txt'), family.encode())
    print(f'{family:28s} {len(files)} file(s) -> assets/fonts/{folder}/')
sys.exit(1 if failed else 0)
