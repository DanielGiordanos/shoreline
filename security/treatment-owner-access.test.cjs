'use strict';
// Isolated tests for Treatment's OWNER-ONLY UID enrollment helper.
// No Firebase credentials, live accounts, or patient records are used.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const helper=fs.readFileSync('treatment/owner-access.js','utf8');
const html=fs.readFileSync('treatment/index.html','utf8');
const store=fs.readFileSync('treatment/store.js','utf8');
const OWNER='daniel.giordano@pravix.app';
const template={active:true,tenant_id:'shoreline',role:'owner',kura_owner:true,review_manager:true};
const validRoles=['owner','admin','management','doctor','technician','liaison','intern','staff'];
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS',name)}
function fixture(options={}){
  const context={window:{},Map,Promise,Object,String};
  vm.runInNewContext(helper,context,{filename:'owner-access.js',timeout:1500});
  let doc=Object.prototype.hasOwnProperty.call(options,'doc')?options.doc:null;
  const counts={get:0,set:0,reload:0,token:0};
  const user={
    email:options.email||OWNER,uid:options.uid||'synthetic-owner-uid',
    emailVerified:options.verified!==false,
    reload:async()=>{counts.reload++},
    getIdToken:async()=>{counts.token++},
  };
  const db={
    collection(name){
      assert.equal(name,'staff_members');
      return {doc(uid){
        assert.equal(uid,user.uid);
        return {
          async get(arg){
            assert.equal(arg.source,'server');
            counts.get++;
            if(options.readError)throw {code:options.readError};
            if(doc===null)throw {code:'permission-denied'};
            return {exists:true,data:()=>doc};
          },
          async set(payload){
            counts.set++;
            if(options.writeError)throw {code:options.writeError};
            if(doc!==null)throw {code:'permission-denied'};
            doc=payload;
          }
        }
      }}
    }
  };
  return {user,db,counts,scope:context.window,get record(){return doc}};
}
async function main(){
 await check('owner access script is included before Treatment store',()=>{
   assert.ok(html.indexOf('owner-access.js?v=')>=0);
   assert.ok(html.indexOf('owner-access.js?v=') < html.indexOf('store.js?v='));
 });
 await check('Treatment waits for verified membership before subscribing',()=>{
   assert.ok(store.includes('onAuthStateChanged(async function(e)'));
   assert.ok(store.includes('await window.pvxTreatmentEnsureOwner(e,a)'));
   assert.ok(store.includes('if(!ok){showGate("owner");return;}'));
 });
 await check('both Treatment scripts have valid JavaScript syntax',()=>{
   new Function(helper);new Function(store);
 });
 await check('approved verified owner self-enrolls once by existing rules',async()=>{
   const f=fixture();
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),true);
   assert.equal(f.counts.set,1);
   assert.equal(f.counts.get,2);
   assert.equal(f.record.active,true);
   assert.equal(f.record.tenant_id,'shoreline');
   assert.equal(f.record.role,'owner');
   assert.equal(f.record.kura_owner,true);
   assert.deepEqual(Object.keys(f.record).sort(),Object.keys(template).sort());
 });
 await check('active owner membership is reused without overwrite',async()=>{
   const f=fixture({doc:{...template,extra:'preserved'}});
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),true);
   assert.equal(f.counts.set,0);
 });
 await check('active lesser-role membership is not escalated by client',async()=>{
   const f=fixture({doc:{active:true,tenant_id:'shoreline',role:'staff'}});
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),true);
   assert.equal(f.counts.set,0);
   assert.equal(f.scope.pvxTreatmentOwnerIssue,'owner-role-review');
 });
 await check('disabled account cannot self-reactivate',async()=>{
   const f=fixture({doc:{...template,active:false}});
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),false);
   assert.equal(f.counts.set,0);
 });
 await check('foreign-hospital membership cannot be overwritten',async()=>{
   const f=fixture({doc:{...template,tenant_id:'other-hospital'}});
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),false);
   assert.equal(f.counts.set,0);
 });
 await check('unverified owner does not create a membership',async()=>{
   const f=fixture({verified:false});
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),false);
   assert.equal(f.scope.pvxTreatmentOwnerIssue,'email-unverified');
   assert.equal(f.counts.set,0);
 });
 await check('other users never use owner self-enrollment',async()=>{
   const f=fixture({email:'other@example.test'});
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),true);
   assert.equal(f.counts.set,0);
   assert.equal(f.counts.get,0);
 });
 await check('offline and backend write-denial cannot grant owner access',async()=>{
   const f=fixture({writeError:'permission-denied'});
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),false);
   assert.equal(f.counts.set,1);
 });
 await check('unexpected server read failure does not overwrite account',async()=>{
   const f=fixture({readError:'unavailable'});
   assert.equal(await f.scope.pvxTreatmentEnsureOwner(f.user,f.db),false);
   assert.equal(f.counts.set,0);
 });
 await check('owner bootstrap shares concurrent attempts for same UID',async()=>{
   const f=fixture();
   const p1=f.scope.pvxTreatmentEnsureOwner(f.user,f.db);
   const p2=f.scope.pvxTreatmentEnsureOwner(f.user,f.db);
   assert.equal(p1,p2);
   assert.equal(await p1,true);
   assert.equal(f.counts.set,1);
 });
 console.log('Treatment owner access: '+passed+' checks passed.');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1});
