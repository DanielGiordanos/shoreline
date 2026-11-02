'use strict';
// Regression for safe, in-page privacy controls and the staged edge policy.
// Passing these tests DOES NOT mean response headers are deployed to the domain.
const fs=require('node:fs'),assert=require('node:assert/strict');
const paths=[
 'index.html','treatment/index.html','sgvp/assessment/index.html',
 'forms/index.html','checkin/index.html','flow-client-checkin.html',
 'or/index.html','track.html'
];
for(const path of paths){
 const body=fs.readFileSync(path,'utf8');
 assert.ok(/<meta\s+name=["']referrer["']\s+content=["']no-referrer["']\s*>/i.test(body),
   path+' must suppress referrer to outside links');
 console.log('PASS no-referrer on',path);
}
const worker=fs.readFileSync('security/edge/worker.mjs','utf8');
assert.match(worker,/frame-ancestors 'self'/);
assert.match(worker,/Content-Security-Policy/);
assert.match(worker,/Strict-Transport-Security/);
assert.match(worker,/url\.protocol = 'https:'/);
assert.match(worker,/return Response\.redirect\(url\.toString\(\), 308\)/);
console.log('PASS staged edge Worker contains anti-frame, HSTS, CSP and HTTPS redirect (not live)');
