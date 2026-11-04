"""treatment/src/build.py — rebuilds treatment/layers.js from treatment/src/layers.js (terser) and refreshes the ?v= hashes
in treatment/index.html for layers.js, layers.css and app.css. Run from anywhere: python3 treatment/src/build.py [--no-minify]
Needs terser (npm i -g terser). Without it, layers.js is a copy of the source and a note is printed."""
import os, sys, re, hashlib, shutil, subprocess
T = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h10 = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()[:10]
src, out = os.path.join(T, 'src', 'layers.js'), os.path.join(T, 'layers.js')
if '--no-minify' in sys.argv or not shutil.which('terser'):
    shutil.copyfile(src, out); print('layers.js: copied (no terser)' if '--no-minify' not in sys.argv else 'layers.js: copied')
else:
    subprocess.run(['terser', src, '-o', out, '--compress', '--mangle', '--keep-fnames', '--keep-classnames', '--comments', 'false'], check=True)
    print('layers.js: minified', os.path.getsize(src), '->', os.path.getsize(out))
fsrc, fout = os.path.join(T, 'src', 'firebase-lite.mjs'), os.path.join(T, 'firebase-lite.js')
if os.path.exists(fsrc) and '--firebase' in sys.argv:   # n302: needs `npm i firebase@10.12.5 esbuild` beside the source (see n302/fb); the built file is committed
    subprocess.run(['npx', 'esbuild', fsrc, '--bundle', '--minify', '--format=iife', '--target=es2019', '--outfile=' + fout], check=True); print('firebase-lite.js: rebuilt', os.path.getsize(fout))
ip = os.path.join(T, 'index.html'); I = open(ip, encoding='utf-8').read(); n = 0
for f in ('layers.js', 'layers.css', 'app.css', 'firebase-lite.js'):
    v = h10(os.path.join(T, f)); I, k = re.subn(re.escape(f) + r'\?v=[0-9a-f]{10}', f + '?v=' + v, I); n += k; print(f, v, 'x%d' % k)
open(ip, 'w', encoding='utf-8').write(I); print('index.html', h10(ip), 'hash refs updated:', n)
