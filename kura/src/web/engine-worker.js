/* Kura engine worker — Kura's own Python engine (backend/*.py) running in Pyodide, with this device's copy of the
   workspace in an in-memory SQLite database. The page talks to it with {id, op, args} messages; everything that changes
   inventory happens here, by the same code the standalone Kura server runs. Nothing here touches the network except
   loading Kura's own files from this site. */
'use strict';
const ROOT = new URL('../../', self.location.href).href;          // …/kura/
const VERSION = new URL(self.location.href).searchParams.get('v') || '';
// Published names (GitHub Pages skips files that start with "_", so __init__.py is served as init.py) → names in Python.
const FILES = [['init.py', '__init__.py'], 'core.py', 'security.py', 'workflows.py', 'connectors.py', 'server.py', 'web.py'].map(f => Array.isArray(f) ? f : [f, f]);
const SQLITE = 'sqlite3-1.0.0-cp312-cp312-pyodide_2024_0_wasm32.whl';
let py = null, kweb = null, booting = null;

async function boot() {
  importScripts(ROOT + 'pyodide/pyodide.js');
  const pyodide = await self.loadPyodide({ indexURL: ROOT + 'pyodide/', fullStdLib: false });
  await pyodide.loadPackage(ROOT + 'pyodide/' + SQLITE);
  pyodide.FS.mkdirTree('/kura/backend');
  await Promise.all(FILES.map(async ([published, f]) => {
    const r = await fetch(ROOT + 'py/backend/' + published + (VERSION ? '?v=' + VERSION : ''), { cache: 'no-cache' });
    if (!r.ok) throw new Error('Kura could not load its engine (' + f + ').');
    pyodide.FS.writeFile('/kura/backend/' + f, new Uint8Array(await r.arrayBuffer()));
  }));
  pyodide.runPython("import sys\nsys.path.insert(0,'/kura')\nfrom backend import web as kweb");
  kweb = pyodide.globals.get('kweb');
  py = pyodide;
  return { python: pyodide.runPython('import sys; sys.version.split()[0]'), engine: kweb.ENGINE_VERSION };
}

function reply(id, ok, value, transfer) { self.postMessage({ id, ok, value }, transfer || []); }

self.onmessage = async (event) => {
  const { id, op, args, bytes } = event.data || {};
  try {
    if (op === 'boot') { reply(id, true, await (booting ||= boot())); return; }
    if (!kweb) await (booting ||= boot());
    if (op === 'open') {                                   // bytes: a serialized SQLite database (checkpoint or cache), or none
      const data = bytes ? py.toPy(new Uint8Array(bytes)) : null;
      try { reply(id, true, kweb.open_db(data).toJs({ dict_converter: Object.fromEntries })); }
      finally { data && data.destroy && data.destroy(); }
      return;
    }
    if (op === 'serialize') {
      const b = kweb.serialize(); const u8 = b.toJs(); b.destroy();
      const copy = new Uint8Array(u8);                     // detach from the WebAssembly heap before transferring
      reply(id, true, copy.buffer, [copy.buffer]); return;
    }
    reply(id, true, kweb.rpc(op, args || '{}'));           // JSON text both ways
  } catch (error) {
    reply(id, false, { message: String(error && error.message || error).split('\n').slice(-3).join(' ').slice(0, 800) });
  }
};
