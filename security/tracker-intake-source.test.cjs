'use strict';
// Synthetic, offline checks only: no network, live patient records or credentials.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const flow=fs.readFileSync('index.html','utf8');
const track=fs.readFileSync('track.html','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');
const allowed='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
let checks=0;
function check(label,fn){fn();checks++;console.log('PASS '+label);}
check('Tracker uses revocable active-or-expiring Firestore capability rule',()=>{
 assert.match(rules,/function familyFeedReadable\(data\)/);
 assert.match(rules,/data\.get\('capability_revoked', false\) == false/);
 assert.match(rules,/data\.access_expires_at > request.time/);
 assert.match(rules,/familyFeedTokenReadable\(token\)/);
 assert.ok(!rules.includes('match /pub/{token} {\n      allow get: if true;'));
 assert.ok(!rules.includes('match /messages/{token}/items/{id} {\n      allow get, list: if true;'));
});
check('Flow projections publish bounded final-visit expiry but no revocation reset',()=>{
 const a=flow.indexOf('function safeProjection(p){');
 const b=flow.indexOf('function recToDb(',a);
 assert.ok(a>=0 && b>a);
 const code=flow.slice(a,b);
 assert.ok(code.includes('48*60*60*1000'));
 assert.ok(code.includes('access_expires_at: readExpiresAt'));
 assert.ok(!code.includes('capability_revoked: false'));
});
check('Flow tracker code and token require Web Crypto not Math.random',()=>{
 const a=flow.indexOf('function genTrackCode(){');
 const b=flow.indexOf('function fxVisitEnd(',a);
 assert.ok(a>=0 && b>a);
 const code=flow.slice(a,b);
 assert.ok(code.includes('crypto.getRandomValues(bytes)'));
 assert.ok(code.includes("crypto.randomUUID"));
 assert.ok(!code.includes('Math.random'));
 const crypto={randomUUID:()=> 'uuid-synthetic',getRandomValues(bytes){
   for(let i=0;i<bytes.length;i++)bytes[i]=(i*11+17)%256;
   return bytes;
 }};
 const sandbox={crypto,window:{crypto},Uint8Array,Array,Error};
 vm.runInNewContext(code+'\nthis.__gen={genToken,genTrackCode};',sandbox);
 const generated=sandbox.__gen.genTrackCode();
 assert.equal(generated.length,6);
 assert.ok([...generated].every(c=>allowed.includes(c)));
 assert.equal(sandbox.__gen.genToken(),'uuid-synthetic');
});
check('Absent random generator fails closed rather than issuing weak tracker tokens',()=>{
 const a=flow.indexOf('function genTrackCode(){');
 const b=flow.indexOf('function fxVisitEnd(',a);
 const sandbox={crypto:null,window:{crypto:null},Uint8Array,Array,Error};
 vm.runInNewContext(flow.slice(a,b)+'\nthis.__gen={genToken,genTrackCode};',sandbox);
 assert.throws(()=>sandbox.__gen.genToken(),/Secure tracker token generator/);
 assert.throws(()=>sandbox.__gen.genTrackCode(),/Secure random generator/);
});
check('Client tracker clears revoked or expired data after permission denial',()=>{
 assert.ok(track.includes('function trackerRevokeDisplay()'));
 assert.ok(track.includes('OV=null;MSGS=[];TOKEN=null'));
 assert.ok(track.includes("err&&err.code==='permission-denied'"));
 assert.ok(track.includes('trackerLocalExpired(OV)'));
 assert.ok(track.includes("history.replaceState(null,'',location.pathname)"));
});
check('Open visits remain writable, revoked visits deny public updates',()=>{
 assert.ok(rules.includes('request.resource.data.resus_status == \'client_selected\''));
 assert.ok(rules.includes('familyFeedReadable(resource.data)'));
});
check('Intake schema rejects fake clinical authority without changing no-login client onboarding',()=>{
 assert.ok(rules.includes("request.resource.data.record.priority == null"));
 assert.ok(rules.includes("request.resource.data.record.doctor == null"));
 assert.ok(rules.includes("request.resource.data.record.location == 'Lobby'"));
 assert.ok(rules.includes("request.resource.data.record.patient.keys().hasOnly"));
 assert.ok(rules.includes("request.resource.data.record.client.keys().hasOnly"));
 assert.ok(rules.includes("request.resource.size() < 128 * 1024"));
});
console.log('Tracker/client intake source checks:',checks,'passed.');
