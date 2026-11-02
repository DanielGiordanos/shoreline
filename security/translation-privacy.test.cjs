'use strict';
// Clinical privacy regression: translation must NEVER transmit confidential
// client intake narratives to third-party public MT endpoints.
// Synthetic strings only. No network access and no live Firebase writes.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('index.html','utf8');
const begin = source.indexOf('const TranslationService = (function(){');
const end = source.indexOf('const _t9nPromises = {};', begin);
assert.ok(begin >= 0 && end > begin, 'TranslationService closure must exist');

const serviceCode = source.slice(begin,end);
const PRIVATE_ORIGIN = 'https://shoreline.pravix.app';
const TEST_HISTORY = 'Synthetic complaint: possible appetite change in simulated patient';
// Endpoints left in public source would be accidental future regressions.
assert.ok(!source.includes('translate.googleapis.com/translate_a/'));
assert.ok(!source.includes('api.mymemory.translated.net/get'));
assert.ok(!serviceCode.includes('_viaPublic'));
assert.ok(source.includes("status:'failed'"), 'The staff UI must preserve its translation-failure fallback');
assert.ok(source.includes('english:cur.reason||\'\''),
  'When private translation is unavailable the original complaint must remain visible');

function make(configured) {
  const requests = [];
  const window = {location:{href: PRIVATE_ORIGIN + '/',origin:PRIVATE_ORIGIN},PRAVIX_TRANSLATE_URL:configured};
  const sandbox = {
    window,URL,AbortController,
    setTimeout,clearTimeout,Promise,JSON,Object,Error,String,
    FLOW_TRANSLATE_ENDPOINT:'',
    fetch:async (url,opts) => {
      requests.push({url,opts});
      return {ok:true,status:200,json:async()=>({translations:['Translated synthetic phrase'],detected:'es',provider:'test-private'})};
    }
  };
  vm.runInNewContext(serviceCode + '\nthis.__service = TranslationService;',sandbox,{filename:'translation-privacy',timeout:1500});
  return {service:sandbox.__service,requests};
}
let passed = 0;
async function check(label,fn) {
  await fn();passed++;console.log('PASS '+label);
}
(async()=>{
  await check('No configured endpoint fails closed without transmitting clinical data',async()=>{
    const {service,requests}=make('');
    await assert.rejects(service.translateBatch([TEST_HISTORY],'es'),e=>e.code==='translation_not_configured');
    assert.equal(requests.length,0);
  });
  await check('External translation host fails closed, even if configured',async()=>{
    const {service,requests}=make('https://unapproved.example.test/translate');
    await assert.rejects(service.translateBatch([TEST_HISTORY],'es'),e=>e.code==='translation_not_configured');
    assert.equal(requests.length,0);
  });
  await check('Plain HTTP endpoint fails closed',async()=>{
    const {service,requests}=make('http://shoreline.pravix.app/translation');
    await assert.rejects(service.translateBatch([TEST_HISTORY],'es'),e=>e.code==='translation_not_configured');
    assert.equal(requests.length,0);
  });
  await check('Endpoint URL cannot contain query, hash or credentials',async()=>{
    for(const path of ['/api/translate?history=secret','/api/translate#secret','https://name:secret@shoreline.pravix.app/api/translate']){
      const {service,requests}=make(path);
      await assert.rejects(service.translateBatch([TEST_HISTORY],'es'),e=>e.code==='translation_not_configured');
      assert.equal(requests.length,0);
    }
  });
  await check('Approved first-party endpoint receives only an HTTPS POST body',async()=>{
    const {service,requests}=make('/api/translate');
    const r=await service.translateBatch([TEST_HISTORY],'es');
    assert.deepEqual(Array.from(r.translations),['Translated synthetic phrase']);
    assert.equal(requests.length,1);
    assert.equal(requests[0].url,PRIVATE_ORIGIN+'/api/translate');
    assert.equal(requests[0].opts.method,'POST');
    assert.equal(requests[0].opts.cache,'no-store');
    assert.equal(requests[0].opts.credentials,'same-origin');
    assert.ok(!requests[0].url.includes('Synthetic'));
    assert.deepEqual(JSON.parse(requests[0].opts.body).texts,[TEST_HISTORY]);
  });
  await check('Empty intake history produces no network request',async()=>{
    const {service,requests}=make('');
    const r=await service.translateBatch([],'es');
    assert.equal(r.provider,'none');
    assert.equal(requests.length,0);
  });
  await check('No clinical text is sent to translation host in source by GET',async()=>{
    assert.ok(!serviceCode.includes('client=gtx'));
    assert.ok(!serviceCode.includes('langpair='));
    assert.ok(serviceCode.includes("method:'POST'"));
  });
  console.log('Translation privacy:',passed,'checks passed.');
})().catch(e=>{console.error('FAIL',e);process.exitCode=1});
