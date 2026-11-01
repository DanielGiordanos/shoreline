import assert from 'node:assert/strict';
import worker from './worker.mjs';

const http = await worker.fetch(new Request('http://shoreline.pravix.app/checkin/?a=1#test'));
assert.equal(http.status, 308);
assert.equal(http.headers.get('location'), 'https://shoreline.pravix.app/checkin/?a=1#test');
let calls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = async request => {
  calls++;
  assert.equal(request.url, 'https://shoreline.pravix.app/');
  return new Response('<html>Test shell</html>',{
    status: 200,headers:{'Content-Type':'text/html; charset=utf-8'}
  });
};
try {
  const res = await worker.fetch(new Request('https://shoreline.pravix.app/'));
  assert.equal(res.status, 200);
  assert.equal(calls, 1);
  assert.equal(await res.text(), '<html>Test shell</html>');
  assert.equal(res.headers.get('strict-transport-security'),'max-age=300');
  assert.equal(res.headers.get('x-frame-options'),'SAMEORIGIN');
  assert.equal(res.headers.get('x-content-type-options'),'nosniff');
  assert.equal(res.headers.get('referrer-policy'),'strict-origin-when-cross-origin');
  assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'self'/);
  assert.match(res.headers.get('content-security-policy-report-only'),/object-src 'none'/);
  assert.equal(res.headers.get('content-type'),'text/html; charset=utf-8');
} finally {
  globalThis.fetch = originalFetch;
}
console.log('PASS simulated edge HTTP upgrade and security headers (not a live deployment)');
