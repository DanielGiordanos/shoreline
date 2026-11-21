'use strict';
// Flow's page and every first-party script it loads, as one text.
// Since Flow's reorganisation (n383–n389) its code lives in assets/flow/*.js, not inline in index.html. The source
// checks read all of it through this helper, so a "must contain" finds the code where it lives now, and a
// "must never contain" covers every file Flow runs, not only the page.
// Offline: reads files from the checkout only.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

function flowSource(root = '.') {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const files = [];
  const tag = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  const live = html.replace(/<!--[\s\S]*?-->/g, '');            // a script tag inside a comment isn't loaded
  let m;
  while ((m = tag.exec(live))) {
    const src = m[1];
    if (/^(https?:)?\/\//i.test(src)) continue;                 // another origin: not Flow's own code
    const file = src.split(/[?#]/)[0].replace(/^\//, '');
    if (file.startsWith('assets/vendor/')) continue;            // third-party libraries kept on this site
    if (!files.includes(file)) files.push(file);
  }
  assert.ok(files.includes('assets/flow/app.js'), "Flow's page must load assets/flow/app.js");
  const parts = [html];
  for (const file of files) parts.push(fs.readFileSync(path.join(root, file), 'utf8'));  // a missing file fails loudly
  return { html, files, text: parts.join('\n') };
}

module.exports = { flowSource };
