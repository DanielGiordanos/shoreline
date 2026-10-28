"""Optical measurement of Pravix Symbols (Apple Icons HIG: optical sizing and centering).
Renders every symbol in Chromium and measures its ink: bounding box, coverage (layers weighted by opacity)
and centre of mass. Prints / writes the per-symbol correction table [scale, dx, dy] in 24-pt grid units.
Usage: python3 optical_measure.py SYM.json [--opt OPT.json]   (with --opt it measures the corrected symbols)"""
import sys, json, asyncio
from playwright.async_api import async_playwright

PAGE = r"""
<script>
async function measure(SYM, OPT, size){
  const out = {};
  for (const [n, d] of Object.entries(SYM)) {
    const o = (OPT && OPT[n]) || [1, 0, 0];
    const g = `<g transform="translate(12 12) scale(${o[0]}) translate(-12 -12) translate(${o[1]} ${o[2]})" stroke-width="${1.8 / o[0]}">${d}</g>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
      <style>*{fill:none;stroke:#000;stroke-linecap:round;stroke-linejoin:round}.s{opacity:.45}.bf{stroke:none}</style>${g}</svg>`;
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
    const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const a = x.getImageData(0, 0, size, size).data;
    let sum = 0, sx = 0, sy = 0, minx = size, miny = size, maxx = -1, maxy = -1;
    for (let y = 0; y < size; y++) for (let i = 0; i < size; i++) {
      const v = a[(y * size + i) * 4 + 3] / 255; if (v < .02) continue;
      sum += v; sx += v * i; sy += v * y;
      if (i < minx) minx = i; if (i > maxx) maxx = i; if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
    const k = 24 / size;
    out[n] = { cov: sum / (size * size), cx: (sx / sum) * k, cy: (sy / sum) * k,
               bx: ((minx + maxx + 1) / 2) * k, by: ((miny + maxy + 1) / 2) * k, w: (maxx - minx + 1) * k, h: (maxy - miny + 1) * k };
  }
  return out;
}
</script>"""

def perceived(m):
    # perceived size: the box the eye reads (geometric mean of width and height), nudged by how much ink fills it
    big, small = max(m['w'], m['h']), min(m['w'], m['h'])
    box = big ** .7 * small ** .3   # narrow symbols (a chevron) read by their long side
    dens = m['cov'] * 576 / max(1, m['w'] * m['h'])
    return box * (dens ** .12)

def table(meas):
    import statistics
    ps = {n: perceived(m) for n, m in meas.items()}
    target = statistics.median(ps.values())
    opt = {}
    for n, m in meas.items():
        s = max(.84, min(1.18, (target / ps[n]) ** .85))
        # optical centre: halfway between the box centre and the centre of mass, moved onto the grid centre
        ox = (m['bx'] * .5 + m['cx'] * .5); oy = (m['by'] * .5 + m['cy'] * .5)
        dx = max(-1.8, min(1.8, (12 - ox) / s)); dy = max(-1.8, min(1.8, (12 - oy) / s))
        opt[n] = [round(s, 3), round(dx, 2), round(dy, 2)]
    return opt, target, ps

async def run(sym, opt=None):
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(); await pg.set_content(PAGE)
        m = await pg.evaluate("([S,O])=>measure(S,O,480)", [sym, opt]); await b.close(); return m

if __name__ == '__main__':
    sym = json.load(open(sys.argv[1])); opt_in = None
    if '--opt' in sys.argv: opt_in = json.load(open(sys.argv[sys.argv.index('--opt') + 1]))
    meas = asyncio.run(run(sym, opt_in))
    if opt_in is None:
        opt, target, ps = table(meas)
        print(json.dumps(opt))
    else:
        import statistics
        ps = {n: perceived(m) for n, m in meas.items()}; med = statistics.median(ps.values())
        for n, m in meas.items():
            ox = m['bx'] * .5 + m['cx'] * .5; oy = m['by'] * .5 + m['cy'] * .5
            print(f"{n:10s} size {ps[n]/med:5.3f}  centre dx {ox-12:+.2f} dy {oy-12:+.2f}")
