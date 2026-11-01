'use strict';
// Isolated static + mocked-store tests; no Firebase project, credentials, or patient records.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const paths = ['checkin/index.html', 'flow-client-checkin.html'];

async function verify(path) {
  const html = fs.readFileSync(path, 'utf8');
  assert.ok(html.includes('Submitting to hospital…'), path + ' must show pending state');
  assert.ok(html.includes('__ciSubmitPromise.then('), path + ' must wait for server acknowledgement');
  assert.ok(html.includes('crypto.randomUUID()'), path + ' must use collision-resistant IDs');
  assert.ok(html.includes("trackEvent('submitted'"), path + ' must emit successful submit event');
  assert.ok(!html.includes("id:'INT-'+Date.now().toString().slice(-6)"),
    path + ' must never create predictable 6-digit Firestore IDs');

  const start = html.indexOf('var FlowIntakeStore=(function()');
  const close = html.indexOf('})();', start);
  assert.ok(start >= 0 && close > start, path + ' store closure missing');
  const storeCode = html.slice(start, close + 5);
  new Function(storeCode); // compile only; do not execute untrusted browser/page code
  const baseStart = html.indexOf('function submit(){', close);
  const baseEnd = html.indexOf('function smartTitle(', baseStart);
  assert.ok(baseStart > close && baseEnd > baseStart);
  new Function(html.slice(baseStart, baseEnd));
  
  const storage = new Map([
    ['pravix_client_intakes', JSON.stringify([{id:'OLD-PRIVATE-RECORD',name:'Old test client'}])],
    ['pravix_intake_analytics', JSON.stringify([{type:'old'}])]
  ]);
  let resolveWrite, savedEnvelope;
  const sandbox = {
    Promise, JSON, Date,
    localStorage: {
      getItem(k) { return storage.get(k) || null; },
      setItem(k,v) { storage.set(k, String(v)); },
      removeItem(k) { storage.delete(k); },
    },
    window: {
      __ciDB: {
        collection(name) {
          assert.equal(name, 'client_intakes');
          return {doc(id) {
            return {set(data) {
              assert.equal(id, data.id);
              savedEnvelope = data;
              return new Promise(resolve => {resolveWrite = resolve;});
            }};
          }};
        }
      }
    }
  };
  vm.runInNewContext(storeCode, sandbox, {filename: path, timeout: 1500});
  const store = sandbox.FlowIntakeStore;
  assert.equal(storage.has('pravix_client_intakes'), false,
    path + ' must purge legacy browser intake records at startup');
  assert.equal(storage.has('pravix_intake_analytics'), false,
    path + ' must purge legacy analytics at startup');
  assert.equal(store._all().length, 0, path + ' must not restore another client\'s intake');
  assert.ok(!html.includes("localStorage.setItem('pravix_intake_analytics'"),
    path + ' must not persist clinical analytics');
  assert.ok(html.includes('var __ciIntakeEvents=[]'),
    path + ' must hold intake analytics in page memory');
  const rec = {id:'INT-synthetic',submittedAt:new Date().toISOString(),
    status:'awaiting_csr_review', patient:{name:'Synthetic'}};
  const write = store.submitClientIntake(rec);
  assert.equal(typeof write.then, 'function', path + ' must return a promise');
  const current = store._all();
  assert.equal(current.length, 1);
  assert.equal(storage.has('pravix_client_intakes'), false,
    path + ' must not write sensitive intake to persistent storage');
  current[0].enriched = true;
  store._saveAll(current); // later wrapper enriches on the same JS turn
  await Promise.resolve(); // deferred write reads the enriched local copy
  assert.equal(savedEnvelope.record.enriched, true,
    path + ' must submit the complete enriched intake to Firestore');
  let settled = false;
  write.then(() => {settled = true;});
  await Promise.resolve();
  assert.equal(settled, false, path + ' must not claim success before server ACK');
  resolveWrite();
  await write;
  assert.equal(settled, true);
  store.removePending('INT-synthetic');
  assert.equal(store.getPending().length, 0);
  process.stdout.write('PASS check-in confirmation and record enrichment: ' + path + '\n');
}
(async () => {
  for(const path of paths) await verify(path);
})().catch(err => {console.error(err);process.exitCode = 1;});
