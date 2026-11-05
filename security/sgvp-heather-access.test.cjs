'use strict';
// Synthetic client tests for the two narrowly approved assessment identities.
// No account secrets, production writes, or clinical data.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');

const helper=fs.readFileSync('sgvp/assessment/reviewer-access.js','utf8');
const page=fs.readFileSync('sgvp/assessment/index.html','utf8');
const rules=fs.readFileSync('firestore.rules','utf8');
const flow=fs.readFileSync('index.html','utf8');
const HEATHER='heather.galano@vca.com';
const SARAH='sarah.schiff@vca.com';
const expected={
  active:true,tenant_id:'shoreline',role:'management',
  kura_owner:false,review_manager:true
};
const sarahExpected={
  active:true,tenant_id:'shoreline',role:'reviewer',
  kura_owner:false,review_manager:false
};
let passed=0;
async function check(title, fn) {
  await fn();passed++;console.log('PASS',title);
}
function make(options={}) {
  const ctx={window:{},Map,Object,Promise,String};
  vm.runInNewContext(helper,ctx,{filename:'reviewer-access.js',timeout:1500});
  let doc=Object.prototype.hasOwnProperty.call(options,'doc')?options.doc:null;
  const counters={reads:0,writes:0,reloads:0,tokens:0};
  const user={
    email:options.email||HEATHER,uid:options.uid||'synthetic-heather-uid',
    emailVerified:options.verified!==false,
    providerData: [{providerId: options.provider||'password'}],
    async reload(){counters.reload++;},
    async getIdToken(){counters.tokens++;}
  };
  const db={collection(name){
    assert.equal(name,'staff_members');
    return {doc(uid){
      assert.equal(uid,user.uid);
      return {
        async get(opts){
          assert.equal(opts.source,'server');
          counters.reads++;
          if(options.readError)throw {code:options.readError};
          if(doc===null)throw {code:'permission-denied'};
          return {exists:true,data:()=>doc};
        },
        async set(next){
          counters.writes++;
          if(options.writeError)throw {code:options.writeError};
          if(doc!==null)throw {code:'permission-denied'};
          doc=next;
        }
      };
    }};
  }};
  return {user,db,scope:ctx.window,counters,get doc(){return doc}};
}
async function main() {
  await check('page includes reviewer module and defers it until DOM is ready',async()=>{
    assert.ok(page.includes('<script defer src="reviewer-access.js?v='));
    assert.ok(page.includes('onAuthStateChanged(async u =>'));
    assert.ok(page.includes('await window.pvxAssessmentEnsureReviewer(u, db)'));
    assert.ok(page.includes('if (!S.ready) return;'));
    assert.ok(page.indexOf('await window.pvxAssessmentEnsureReviewer(u, db)') <
      page.lastIndexOf('      route();'));
    assert.ok(page.includes('reviewerAccessProblem(access.reason)'));
    assert.ok(page.includes("|| S.email === 'sarah.schiff@vca.com'"));
    assert.ok(page.includes("reviewer-access.js?v=20261104-sarah-reviewer"));
  });
  await check('helper is valid JavaScript and matches the current server-side enrollment values',async()=>{
    new Function(helper);
    assert.ok(rules.includes("heatherPasswordPilot(uid)"));
    assert.ok(rules.includes("validPilotMembership('management', false)"));
    assert.ok(rules.includes("request.auth.token.get('email', '').lower() == 'heather.galano@vca.com'"));
    assert.ok(rules.includes("get('sign_in_provider', '') == 'password'"));
    assert.ok(flow.includes("const heatherPasswordLogin = email==='heather.galano@vca.com'"));
    assert.ok(flow.includes("if(!user.emailVerified && !heatherPasswordLogin)"));
    assert.ok(rules.includes('timestamp.date(2026, 11, 16)'));
    assert.ok(rules.includes("verifiedPilot(uid, 'sarah.schiff@vca.com')"));
    assert.ok(rules.includes("validReviewerPilotMembership()"));
    assert.ok(rules.includes("request.resource.data.role == 'reviewer'"));
    assert.ok(rules.includes("request.resource.data.review_manager == false"));
  });
  await check('verified Heather can activate her missing UID membership',async()=>{
    const f=make();
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,true);
    assert.equal(r.activated,true);
    assert.equal(f.counters.writes,1);
    assert.equal(f.counters.reads,2);
    assert.deepEqual(Object.keys(f.doc).sort(),Object.keys(expected).sort());
    for(const [key,value] of Object.entries(expected))assert.equal(f.doc[key],value);
  });
  await check('already-authorized Heather can enter without overwriting membership',async()=>{
    const f=make({doc:{...expected,permittedOtherField:'preserve'}});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,true);
    assert.equal(r.alreadyActive,true);
    assert.equal(f.counters.writes,0);
  });
  await check('verified Sarah can activate reviewer-only membership',async()=>{
    const f=make({email:SARAH,uid:'synthetic-sarah-uid'});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,true);
    assert.equal(r.activated,true);
    assert.equal(f.counters.writes,1);
    assert.deepEqual(Object.keys(f.doc).sort(),Object.keys(sarahExpected).sort());
    for(const [key,value] of Object.entries(sarahExpected))assert.equal(f.doc[key],value);
  });
  await check('existing Sarah reviewer membership is not overwritten',async()=>{
    const f=make({email:SARAH,doc:{...sarahExpected}});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,true);
    assert.equal(r.alreadyActive,true);
    assert.equal(f.counters.writes,0);
  });
  await check('existing Sarah doctor membership is not demoted or elevated',async()=>{
    const f=make({email:SARAH,doc:{
      active:true,tenant_id:'shoreline',role:'doctor',
      kura_owner:false,review_manager:false
    }});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,true);
    assert.equal(r.alreadyActive,true);
    assert.equal(f.counters.writes,0);
  });
  await check('unverified Sarah cannot self-activate even with password sign-in',async()=>{
    const f=make({email:SARAH,verified:false,provider:'password'});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,false);
    assert.equal(r.reason,'email-unverified');
    assert.equal(f.counters.writes,0);
  });
  await check('inactive Sarah membership cannot be reactivated by client',async()=>{
    const f=make({email:SARAH,doc:{...sarahExpected,active:false}});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,false);
    assert.equal(r.reason,'membership-restricted');
    assert.equal(f.counters.writes,0);
  });
  await check('Sarah on another tenant is not reassigned by client',async()=>{
    const f=make({email:SARAH,doc:{...sarahExpected,tenant_id:'other'}});
    assert.equal((await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db)).ok,false);
    assert.equal(f.counters.writes,0);
  });
  await check('verified administrator Heather can use her existing review authority',async()=>{
    const f=make({doc:{...expected,role:'admin',review_manager:false}});
    assert.equal((await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db)).ok,true);
    assert.equal(f.counters.writes,0);
  });
  await check('active member without review authority cannot bypass role checks',async()=>{
    const f=make({doc:{...expected,review_manager:false}});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,false);
    assert.equal(r.reason,'review-role-missing');
    assert.equal(f.counters.writes,0);
  });
  await check('inactive Heather membership cannot be reactivated from this page',async()=>{
    const f=make({doc:{...expected,active:false}});
    assert.equal((await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db)).ok,false);
    assert.equal(f.counters.writes,0);
  });
  await check('another tenant membership cannot be reassigned',async()=>{
    const f=make({doc:{...expected,tenant_id:'other'}});
    assert.equal((await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db)).ok,false);
    assert.equal(f.counters.writes,0);
  });
  await check('unverified Heather with password login does not receive verification prompt',async()=>{
    const f=make({verified:false,provider:'password'});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,true);
    assert.equal(r.activated,true);
    assert.equal(f.counters.writes,1);
  });
  await check('unverified Heather using non-password provider still needs verification',async()=>{
    const f=make({verified:false,provider:'google.com'});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,false);
    assert.equal(r.reason,'email-unverified');
    assert.equal(f.counters.writes,0);
  });
  await check('other evaluators are never granted the review-manager membership',async()=>{
    const f=make({email:'another-evaluator@example.test'});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,true);
    assert.equal(r.unchanged,true);
    assert.equal(f.counters.writes,0);
    assert.equal(f.counters.reads,0);
  });
  await check('backend write denial cannot grant review access',async()=>{
    const f=make({writeError:'permission-denied'});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,false);
    assert.equal(r.reason,'membership-denied');
  });
  await check('unexpected backend read failure does not rewrite account',async()=>{
    const f=make({readError:'unavailable'});
    const r=await f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(r.ok,false);
    assert.equal(f.counters.writes,0);
  });
  await check('concurrent activation attempts share one authenticated UID write',async()=>{
    const f=make();
    const first=f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    const next=f.scope.pvxAssessmentEnsureReviewer(f.user,f.db);
    assert.equal(first,next);
    const results=await Promise.all([first,next]);
    assert.equal(results[0].ok,true);assert.equal(results[1].ok,true);
    assert.equal(f.counters.writes,1);
  });
  console.log('SGVP assessment reviewer access:',passed,'checks passed.');
}
main().catch(error=>{console.error('FAIL',error);process.exitCode=1});
