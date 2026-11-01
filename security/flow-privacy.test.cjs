'use strict';
// No network access or real patient data: verifies logout storage hygiene with synthetic keys.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('index.html', 'utf8');
const start = html.indexOf('function pvxClearPrivateLocalState(){');
const end = html.indexOf('function logout(){', start);
assert.ok(start >= 0 && end > start, 'Privacy cleanup function must exist');
assert.ok(html.slice(end, end + 360).includes('pvxClearPrivateLocalState()'),
  'Log out must clear patient data from persistent storage');
assert.ok(html.includes('else { pvxClearPrivateLocalState(); pvxLobbyAccountCard(null); showLogin(); }'),
  'Expired/absent Firebase session must clear patient storage as well');

const keys = new Map([
  ['pravix_client_intakes', JSON.stringify([{name:'Synthetic client'}])],
  ['pravix_intake_analytics', JSON.stringify([{type:'synthetic'}])],
  ['pravix:shoreline:rounds:tomorrow:v1', '{"test":true}'],
  ['pravix:shoreline:rounds:actor:v1', 'synthetic'],
  ['pravix:shoreline:usdocstatus:v1', '{"synthetic":true}'],
  ['pvx:flow:where', '{"patient":"synthetic"}'],
  ['wd_trend_v1', '{"synthetic":true}'],
  ['pvx:kpi:v1', '{"synthetic":true}'],
  ['pvx:theme', 'dark'],
  ['pvx:sound:reminder', 'on']
]);
const storage = {
  get length(){return keys.size;},
  key(i){return [...keys.keys()][i]||null;},
  removeItem(k){keys.delete(k);},
  getItem(k){return keys.get(k)||null;}
};
const sandbox = {localStorage:storage,console:{warn(){}}};
vm.runInNewContext(html.slice(start,end),sandbox,{filename:'Flow privacy cleanup',timeout:1000});
sandbox.pvxClearPrivateLocalState();
for(const k of [
  'pravix_client_intakes','pravix_intake_analytics',
  'pravix:shoreline:rounds:tomorrow:v1',
  'pravix:shoreline:rounds:actor:v1',
  'pravix:shoreline:usdocstatus:v1','pvx:flow:where',
  'wd_trend_v1','pvx:kpi:v1'
]) assert.equal(keys.has(k),false, 'Sensitive key persisted: '+k);
assert.equal(keys.get('pvx:theme'), 'dark', 'Visual preference should survive');
assert.equal(keys.get('pvx:sound:reminder'), 'on', 'Audio preference should survive');
console.log('PASS Flow logout and expired-session storage cleanup, preferences preserved');
