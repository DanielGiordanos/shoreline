



const FLOW_TRANSLATE_ENDPOINT = (typeof window!=='undefined'&& window.PRAVIX_TRANSLATE_URL) ||'';
const LANG_EN_NAME = {en:'English',fr:'French',es:'Spanish',zh:'Chinese',pt:'Portuguese',ja:'Japanese',ru:'Russian',ko:'Korean',ar:'Arabic'};
function langEnglishName(code){ return LANG_EN_NAME[String(code||'').toLowerCase().slice(0,2)] || (code||'their language'); }



const SPECIES_EN = {canine:'Canine', feline:'Feline', other:'Other'};
function speciesEnglish(v){ if(v==null||v==='') return''; const k=String(v).toLowerCase().trim();
if(SPECIES_EN[k]) return SPECIES_EN[k];
const legacy={canino:'Canine',perro:'Canine',dog:'Canine','cão':'Canine',chien:'Canine',
felino:'Feline',gato:'Feline',cat:'Feline',chat:'Feline', otro:'Other',outro:'Other',autre:'Other',other:'Other'};
return legacy[k] || v; }


const SEX_CANON_LABEL = { male_neutered:'Male (Neutered)', female_spayed:'Female (Spayed)',
male_intact:'Male (Intact)', female_intact:'Female (Intact)', unknown:'Unknown', male:'Male', female:'Female'};
function normalizeSexValue(v){
if(v==null) return'';
let s=String(v).toLowerCase().trim(); if(!s) return'';
s=s.replace(/[—–\-]/g,' ').replace(/[()]/g,' ').replace(/\s+/g,' ').trim();
const map={
'mn':'male_neutered','fs':'female_spayed','mi':'male_intact','fi':'female_intact','unknown':'unknown','unk':'unknown','u':'unknown',
'male neutered':'male_neutered','neutered male':'male_neutered','castrated male':'male_neutered','male castrated':'male_neutered','male castrado':'male_neutered',
'female spayed':'female_spayed','spayed female':'female_spayed',
'male intact':'male_intact','intact male':'male_intact','male entire':'male_intact','entire male':'male_intact',
'female intact':'female_intact','intact female':'female_intact','female entire':'female_intact','entire female':'female_intact',
'male':'male','female':'female','m':'male','f':'female',
'macho castrado':'male_neutered','hembra esterilizada':'female_spayed','macho entero':'male_intact','hembra entera':'female_intact',
'macho':'male','hembra':'female','desconocido':'unknown'
};
if(map[s]) return map[s];
if(SEX_CANON_LABEL[s.replace(/ /g,'_')]) return s.replace(/ /g,'_');
return s;
}
 
function getSexDisplayLabel(v){ const c=normalizeSexValue(v); return SEX_CANON_LABEL[c] || (v==null?'':String(v)); }
function sexEnglish(v){ return getSexDisplayLabel(v); }



const TranslationService = (function(){
// Clinical intake narratives are confidential. A public machine translation
// endpoint MUST NOT receive a pet's symptoms, complaint or medical history.
// The only permitted integration is an explicitly configured HTTPS endpoint
// on the SAME Pravix origin, where approved server controls can enforce
// authentication, audit and data-processing restrictions.
function endpoint(){
  const configured=(typeof window!=='undefined'&&window.PRAVIX_TRANSLATE_URL) || FLOW_TRANSLATE_ENDPOINT || '';
  if(!configured) return '';
  try{
    const base=new URL(window.location.href);
    const target=new URL(configured,base);
    if(base.protocol!=='https:' || target.protocol!=='https:' || target.origin!==base.origin)
      return '';
    if(target.username || target.password || target.search || target.hash) return '';
    return target.href;
  }catch(_){return '';}
}
async function _fetchT(url, opts){
const ctrl=(typeof AbortController!=='undefined')?new AbortController():null;
const timer=ctrl?setTimeout(()=>ctrl.abort(),12000):null;
try{ return await fetch(url, Object.assign({}, opts, ctrl?{signal:ctrl.signal}:{}, {cache:'no-store',credentials:'same-origin'})); }
finally{ if(timer) clearTimeout(timer); }
}
async function _viaEndpoint(url, list, source){
const resp=await _fetchT(url,{ method:'POST', headers:{'Content-Type':'application/json'},
body:JSON.stringify({ texts:list, source:source||null, target:'en'}) });
if(!resp.ok){ const err=new Error('translation http '+resp.status);err.code='http_'+resp.status;throw err; }
const data=await resp.json();
const out=data.translations||data.data||[];
if(!Array.isArray(out) || out.length!==list.length){ const err=new Error('translation shape mismatch');err.code='bad_response';throw err; }
return { translations:out.map(x=>String(x==null?'':x)),
detectedSourceLanguage:data.detectedSourceLanguage||data.detected||source||null,
provider:data.provider||'private-translation',model:data.model||null };
}
async function translateBatch(texts, source){
const list=(texts||[]).map(t=>t==null?'':String(t));
if(!list.length) return {translations:[],detectedSourceLanguage:source||null,provider:'none',model:null};
const url=endpoint();
if(!url){
  // The existing intake UI displays the unchanged original and a warning.
  // It must NOT silently retry through public Google/MyMemory endpoints.
  const err=new Error('Approved private translation is not configured');
  err.code='translation_not_configured';throw err;
}
return _viaEndpoint(url,list,source);
}
async function translateToEnglish(text,source){
const r=await translateBatch([text],source);
return { translatedText:r.translations[0]||'',sourceLanguage:r.detectedSourceLanguage||source||null,provider:r.provider,model:r.model };
}
return {translateBatch,translateToEnglish,endpoint};
})();

const _t9nPromises = {};
function intakeSourceLang(r){ return String((r&&r.sourceLanguage)||'en').toLowerCase().slice(0,2)||'en'; }
function intakeNeedsT9n(r){ return r && intakeSourceLang(r)!=='en'&& !(r.t9n && r.t9n.status); }


function intakeEnglishReason(r){
if(r && r.t9n && (r.t9n.status==='translated'||r.t9n.status==='failed')){
const parts=[]; if(r.t9n.reason && r.t9n.reason.english) parts.push(r.t9n.reason.english);
(r.t9n.additional||[]).forEach(a=>{ if(a && a.english) parts.push(a.english); });
if(parts.length) return parts.join('. ');
}
return [ (r&&r.reason)||''].concat((r&&r.additionalProblems)||[]).filter(Boolean).join('. ');
}
function intakeOriginalReason(r){
return [ (r&&r.reason)||''].concat((r&&r.additionalProblems)||[]).filter(Boolean).join('. ');
}


function ensureIntakeTranslated(id){
const cur=FlowIntakeStore.getIntake(id);
if(!cur) return Promise.resolve(null);
if(cur.t9n && cur.t9n.status) return Promise.resolve(cur);
if(_t9nPromises[id]) return _t9nPromises[id];
const src=intakeSourceLang(cur);
const stamp=new Date().toISOString();
if(src==='en'){
FlowIntakeStore.updateIntake(id,{ t9n:{ status:'not_needed', sourceLanguage:'en', at:stamp } });
return Promise.resolve(FlowIntakeStore.getIntake(id));
}
const texts=[ cur.reason||''].concat(cur.additionalProblems||[]);
const p=(async()=>{
try{
const res=await TranslationService.translateBatch(texts, src);
const eng=res.translations||[];
FlowIntakeStore.updateIntake(id,{ t9n:{
status:'translated', sourceLanguage:res.detectedSourceLanguage||src,
provider:res.provider||'public', model:res.model||null, at:stamp,
reason:{ original:cur.reason||'', english:eng[0]||''},
additional:(cur.additionalProblems||[]).map((o,i)=>({ original:o, english:eng[i+1]||''}))
}});
}catch(e){
const code=(e&&e.code)||'error';
FlowIntakeStore.updateIntake(id,{ t9n:{
status:'failed', reasonCode:code, sourceLanguage:src, at:stamp,
reason:{ original:cur.reason||'', english:cur.reason||''},
additional:(cur.additionalProblems||[]).map(o=>({ original:o, english:o }))
}});
}
return FlowIntakeStore.getIntake(id);
})();
_t9nPromises[id]=p;
if(p.finally) p.finally(()=>{ delete _t9nPromises[id]; }); else p.then(()=>{ delete _t9nPromises[id]; },()=>{ delete _t9nPromises[id]; });
return p;
}


function translatePendingIntakes(){
try{ FlowIntakeStore.getPendingIntakes().forEach(r=>{ if(intakeNeedsT9n(r) && !_t9nPromises[r.id]) ensureIntakeTranslated(r.id); }); }catch(e){}
}


function t9nEnglishText(t){ if(!t) return''; const parts=[]; if(t.reason&&t.reason.english) parts.push(t.reason.english); (t.additional||[]).forEach(a=>{ if(a&&a.english) parts.push(a.english); }); return parts.join('. '); }
function t9nOriginalText(t){ if(!t) return''; const parts=[]; if(t.reason&&t.reason.original) parts.push(t.reason.original); (t.additional||[]).forEach(a=>{ if(a&&a.original) parts.push(a.original); }); return parts.join('. '); }
function patientIntakeT9n(p){ return (p && (p.reasonTranslation || (p.clientIntake && p.clientIntake.t9n))) || null; }
function ownerHistoryCellHtml(p){
const t=patientIntakeT9n(p); if(!t || !t.status) return'';
if(t.status!=='translated'&& t.status!=='failed') return'';
const eng=t9nEnglishText(t), orig=t9nOriginalText(t); if(!orig) return'';
const note = t.status==='translated'
?'Translated from '+langEnglishName(t.sourceLanguage)+' · <button type="button" class="t9n-link" id="dOwnerHistToggle">View original</button>'
:'Translation unavailable — showing original text';
const body = t.status==='translated'? (eng||orig) : orig;
return'<div class="d-cell" style="grid-column:1/3"><div class="k">Owner History</div>'
+'<div class="v" style="font-size:0.8125rem;font-weight:600;line-height:1.5;white-space:pre-line">'+pvxEscQ(body)+'</div>'
+'<div class="t9n-note" id="dOwnerHistNote">'+note+'</div>'
+'<div class="v t9n-orig" id="dOwnerHistOrig" style="display:none;margin-top:4px;white-space:pre-line">'+pvxEscQ(orig)+'</div></div>';
}
function wireOwnerHistoryToggle(p){
const tog=document.getElementById('dOwnerHistToggle'), orig=document.getElementById('dOwnerHistOrig');
if(tog && orig){ tog.onclick=()=>{ const show=orig.style.display==='none'; orig.style.display=show?'':'none'; tog.textContent=show?'Hide original':'View original'; }; }
}
