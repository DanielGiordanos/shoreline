
/* LUNA voice for Treatment Sheets — same mic, ring and confirm card as Pravix Flow.
   Chart values, mark treatments done, hold doses, add notes, ask what's due. Always confirms before saving.
   Voice commands. On for every workstation (approved by VCA IT). Click the mic in the search bar
   (stops after a pause), or hold Space when not typing, speak, release. Flow shows what it understood;
   safe changes happen at once with Undo, everything else waits for Confirm. Uses the browser's speech
   recognition (audio is processed by Google in Chrome). Never admits or discharges.
   A single screen can opt out with ?voice=off and back in with ?voice=on.
   Typed commands in the search bar always work, with or without the mic. */
(function(){
var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
var KEY='flowVoice', STATS='flowVoiceStats';
try{ var q=new URLSearchParams(location.search).get('voice');
  if(q==='on') localStorage.removeItem(KEY);
  if(q==='off') localStorage.setItem(KEY,'off');
}catch(e){}
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
/* The mic shows wherever the browser can do speech (Chrome, Edge, Safari), unless this screen opted out. */
var ENABLED=!!SR; try{ if(localStorage.getItem(KEY)==='off') ENABLED=false; }catch(e){}
if(LOBBY) return;

var talk,panel,inner,toastEl, pending=null, undoFn=null, listening=false, rec=null, finalText='', interim='', startedAt=0, waveT=null;

/* ---------- stats (counts only, no words or audio) ---------- */
function stat(k){ try{ var s=JSON.parse(localStorage.getItem(STATS)||'{}'); s[k]=(s[k]||0)+1; localStorage.setItem(STATS,JSON.stringify(s)); }catch(e){} bump(k); }
/* Shared, hospital-wide counts so we can see what voice misses and improve it. Only counters and
   command words (e.g. "unk_bump", "dest_rads_room"); never patient names, owners, or audio. */
var agg={}, aggT=null, aggOff=true; /* shared counts are Flow-only for now */
function bump(k){ if(aggOff) return; agg[k]=(agg[k]||0)+1; if(!aggT) aggT=setTimeout(flush,60000); }
function statWord(prefix,w){ w=String(w||'').toLowerCase().replace(/[^a-z ]/g,'').trim().replace(/\s+/g,'_').slice(0,24); if(w) bump(prefix+'_'+w); }
function flush(){ aggT=null; var keys=Object.keys(agg); if(!keys.length||aggOff) return;
  try{ if(typeof DB==='undefined'||!DB||typeof firebase==='undefined'||!firebase.firestore||!firebase.auth||!firebase.auth().currentUser) { aggT=setTimeout(flush,60000); return; }
    var F=firebase.firestore.FieldValue, d=new Date(), day; try{ day=String(_hospDayKey(d)); }catch(e){ day=d.toISOString().slice(0,10); }
    var c={}; keys.forEach(function(k){ c[k]=F.increment(agg[k]); }); var sent=agg; agg={};
    DB.collection('voice_stats').doc(TENANT_ID+'_'+day).set({tenant_id:TENANT_ID, day:day, updated_at:F.serverTimestamp(), counts:c},{merge:true})
      .catch(function(e){ if(e&&e.code==='permission-denied'){ aggOff=true; } else { Object.keys(sent).forEach(function(k){ agg[k]=(agg[k]||0)+sent[k]; }); } });
  }catch(e){} }
window.addEventListener('pagehide',flush); document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') flush(); });
function stats(){ try{ return JSON.parse(localStorage.getItem(STATS)||'{}'); }catch(e){ return {}; } }

/* ---------- ui ---------- */
function esc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
var MIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';
var confirmMode=false, sessionId=0, tapMode=false, silenceT=null, maxT=null, hintT=null, bar=null, wrap=null, live=null;
function build(){
  panel=document.createElement('div'); panel.id='fvPanel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-live','polite'); panel.innerHTML='<div class="fv-in"></div>';
  toastEl=document.createElement('div'); toastEl.id='fvToast'; toastEl.setAttribute('role','status');
  document.body.appendChild(panel); document.body.appendChild(toastEl);
  /* The mic lives inside Flow's search bar. If the bar is missing, fall back to a small glass circle. */
  var actions=document.querySelector('.subnav .search-bar .actions');
  bar=actions?actions.closest('.search-bar'):null;
  inner=panel.querySelector('.fv-in');
  window.addEventListener('resize',function(){ place(); if(listening) placeLive(); });
  if(!ENABLED) return;
  window.addEventListener('online',netState); window.addEventListener('offline',netState); setTimeout(netState,0);
  talk=document.createElement('button'); talk.id='fvTalk'; talk.type='button';
  talk.setAttribute('aria-label','Talk to LUNA'); talk.title='Talk to LUNA  ·  click, or hold Space';
  talk.innerHTML=MIC+'<span class="fv-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  if(actions){ actions.insertBefore(talk,actions.firstChild);
    /* Listening happens in the search bar itself: a soft color ring around it and the words as you say them. */
    wrap=bar.closest('.search-wrap')||bar.parentElement;
    var ring=document.createElement('span'); ring.className='fv-ring'; ring.setAttribute('aria-hidden','true');
    var halo=document.createElement('span'); halo.className='fv-halo'; halo.setAttribute('aria-hidden','true');
    wrap.insertBefore(halo,wrap.firstChild); wrap.insertBefore(ring,wrap.firstChild);
    live=document.createElement('span'); live.className='fv-live'; live.setAttribute('aria-live','polite'); bar.appendChild(live);
  } else { talk.classList.add('fv-float'); document.body.appendChild(talk); }
  /* Click to talk (stops by itself after a pause), or press and hold, then let go. */
  talk.addEventListener('pointerdown',function(e){ e.preventDefault(); e.stopPropagation();
    if(listening&&tapMode){ stop(); return; }
    try{ talk.setPointerCapture(e.pointerId); }catch(_){} start(false); });
  talk.addEventListener('pointerup',function(){ if(!listening||tapMode) return;
    if(Date.now()-startedAt<350){ tapMode=true; armSilence(4000); } else stop(); });
  talk.addEventListener('pointercancel',function(){ if(listening&&!tapMode) stop(); });
  talk.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); });
  talk.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); if(e.repeat) return; if(listening) stop(); else { start(true); armSilence(4000); } } });
  if(new URLSearchParams(location.search).get('voice')==='stats'){ var s=stats(); show('<div class="fv-ans">Voice on this screen: '+(s.heard||0)+' commands heard, '+(s.understood||0)+' understood first try, '+(s.confirmed||0)+' confirmed, '+(s.cancelled||0)+' cancelled.</div>'); }
}
/* The panel drops down from the search bar, right-aligned with it. */
function place(){
  if(!panel) return;
  var r=(bar&&bar.offsetParent)?bar.getBoundingClientRect():null;
  if(r&&r.width){ panel.classList.remove('fv-bottom'); panel.style.top=Math.round(r.bottom+10)+'px'; panel.style.right=Math.max(12,Math.round(window.innerWidth-r.right))+'px'; }
  else { panel.classList.add('fv-bottom'); panel.style.top=''; panel.style.right=''; }
}
function netState(){ if(!talk) return; var off=!navigator.onLine; talk.classList.toggle('fv-off',off);
  talk.title=off?'Voice needs internet. Typing commands in the search bar still works.':'Talk to LUNA  ·  click, or hold Space'; talk.setAttribute('aria-disabled',off?'true':'false');
  if(off&&listening){ sessionId++; stop(); } }
function armSilence(ms){ clearTimeout(silenceT); silenceT=setTimeout(function(){ if(listening&&tapMode) stop(); },ms); }
function setOn(on){ talk.classList.toggle('on',on); talk.setAttribute('aria-pressed',on?'true':'false'); if(on&&wrap){ wrap.classList.remove('fv-thinking'); wrap.classList.add('fv-listening'); bar.classList.add('fv-listening'); placeLive(); liveText('',true); } }
/* ring + live words */
function placeLive(){ if(!live) return; var inp=bar.querySelector('input'); if(!inp) return; live.style.left=inp.offsetLeft+'px'; live.style.width=inp.offsetWidth+'px'; }
function liveText(t,idle){ if(!live) return; clearTimeout(hintT);
  if(idle){ live.className='fv-live idle'; live.textContent=confirmMode?'Say “yes” or “no”…':'Listening…'; if(confirmMode) return;
    hintT=setTimeout(function(){ if(listening&&!(finalText+interim).trim()){ live.className='fv-live idle hint'; live.textContent='Try “Temperature 101.5”'; } },2600); return; }
  var tail=t.length>38?'…'+t.slice(-37).replace(/^\S*\s/,''):t;
  live.className='fv-live words'; live.textContent=tail; }
function endLive(){ clearTimeout(hintT); if(wrap){ wrap.classList.remove('fv-listening','fv-thinking'); bar.classList.remove('fv-listening'); } if(live){ live.className='fv-live'; live.textContent=''; } }
/* microphone level, drives the ring and the bars in the mic button */
var meter={ctx:null,stream:null,an:null,buf:null,raf:0,l:0,syn:0};
function meterStart(){ meter.l=0; meter.syn=0;
  try{ if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){ navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).then(function(st){
    if(!listening){ st.getTracks().forEach(function(t){ t.stop(); }); return; }
    meter.stream=st; var C=window.AudioContext||window.webkitAudioContext; meter.ctx=new C(); meter.an=meter.ctx.createAnalyser(); meter.an.fftSize=512; meter.buf=new Uint8Array(meter.an.fftSize);
    meter.ctx.createMediaStreamSource(st).connect(meter.an); }).catch(function(){}); } }catch(e){}
  cancelAnimationFrame(meter.raf); meter.raf=requestAnimationFrame(meterLoop); }
var BARF=[.55,1,.8,.5];
function meterLoop(){
  var target=meter.syn;
  if(meter.an){ meter.an.getByteTimeDomainData(meter.buf); var sum=0; for(var i=0;i<meter.buf.length;i++){ var v=(meter.buf[i]-128)/128; sum+=v*v; } target=Math.min(1,Math.pow(Math.sqrt(sum/meter.buf.length)*7,.8)); }
  meter.syn*=.94; meter.l+=(target-meter.l)*(target>meter.l?.45:.1);
  var l=meter.l; if(wrap) wrap.style.setProperty('--fvL',l.toFixed(3));
  var bs=talk.querySelectorAll('.fv-bars i'); for(var j=0;j<bs.length;j++){ bs[j].style.height=(3+Math.min(1,l*BARF[j]*(.75+Math.random()*.5))*11).toFixed(1)+'px'; }
  if(listening) meter.raf=requestAnimationFrame(meterLoop); else meterStop(); }
function meterStop(){ cancelAnimationFrame(meter.raf); try{ if(meter.stream) meter.stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} try{ if(meter.ctx) meter.ctx.close(); }catch(e){}
  meter.stream=meter.ctx=meter.an=null; meter.l=0; if(wrap) wrap.style.setProperty('--fvL','0'); }
function show(html){ inner.innerHTML=html; place(); panel.classList.add('show'); }
function hide(){ panel.classList.remove('show'); pending=null; if(listening&&confirmMode){ sessionId++; stop(); } }
function heard(t){ return '<div class="fv-heard">'+(via==='typed'?'':'Heard ')+'<q>'+esc(t)+'</q></div>'; }
function toast(t,withUndo,dur){
  toastEl.innerHTML='<span>'+esc(t)+'</span>'+(withUndo?'<button type="button">Undo</button>':'');
  toastEl.classList.add('show');
  var b=toastEl.querySelector('button'); if(b) b.onclick=function(){ toastEl.classList.remove('show'); if(undoFn){ undoFn(); undoFn=null; } };
  clearTimeout(toastEl._h); toastEl._h=setTimeout(function(){ toastEl.classList.remove('show'); undoFn=null; }, dur||(withUndo?7000:2200));
}
function wave(){ return '<div class="fv-wave">'+new Array(28).join('<i></i>')+'<i></i></div>'; }
function animate(){
  clearInterval(waveT);
  waveT=setInterval(function(){ var is=panel.querySelectorAll('.fv-wave i'); if(!is.length){ clearInterval(waveT); return; }
    var t=Date.now(); for(var i=0;i<is.length;i++){ is[i].style.height=(5+ (0.25+0.7*Math.abs(Math.sin(t/170+i*.55)))*26)+'px'; } },60);
}

/* ---------- treatment sheet access ---------- */
var ctx=null, via='voice';
function me(){ return (window.tsMe&&tsMe()!=='—'&&tsMe())||'DG'; }
function norm(t){ return String(t||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[!?;]/g,' ').replace(/(\d),(\d)/g,'$1$2').replace(/\.(?!\d)/g,' ').replace(/^\s*(hey |ok |okay )?luna\b\s*,?/,'').replace(/\bplease\b/g,' ').replace(/^\s*(?:(?:um|uh|so|okay|ok|alright|now|next)\s+)+/,'').replace(/\s+/g,' ').trim(); }
function flat(c){ return c.replace(/,/g,' ').replace(/\s+/g,' ').trim(); }
function jw(a,b){ if(a===b) return 1; var m=Math.max(0,Math.floor(Math.max(a.length,b.length)/2)-1), am=[], bm=[], mt=0, t=0, i, j;
  for(i=0;i<a.length;i++){ for(j=Math.max(0,i-m);j<Math.min(b.length,i+m+1);j++){ if(!bm[j]&&a[i]===b[j]){ am[i]=bm[j]=1; mt++; break; } } }
  if(!mt) return 0; var k=0; for(i=0;i<a.length;i++){ if(am[i]){ while(!bm[k]) k++; if(a[i]!==b[k]) t++; k++; } }
  var s=(mt/a.length+mt/b.length+(mt-t/2)/mt)/3, p=0; while(p<4&&a[p]&&a[p]===b[p]) p++; return s+p*0.1*(1-s); }
/* How staff actually say things on the floor */
var ALIAS={'temp':'Temperature','temperature':'Temperature','t':'Temperature','heart rate':'Heart Rate','hr':'Heart Rate','pulse':'Heart Rate','heart':'Heart Rate',
  'resp':'Respiratory Rate','respiratory rate':'Respiratory Rate','rr':'Respiratory Rate','resp rate':'Respiratory Rate','respiration':'Respiratory Rate','breathing':'Respiratory Rate','respirations':'Respiratory Rate',
  'crt':'CRT','cap refill':'CRT','capillary refill':'CRT','capillary refill time':'CRT','mm':'Mucous Membrane','mucous membrane':'Mucous Membrane','mucous membranes':'Mucous Membrane','gums':'Mucous Membrane','membranes':'Mucous Membrane',
  'mentation':'Mentation','attitude':'Mentation','pain':'Pain Score','pain score':'Pain Score','weight':'Weight','weighed':'Weight','food':'Food','ate':'Food','eating':'Food','appetite':'Food',
  'water':'Water','drinking':'Water','drank':'Water','vomiting':'Vomiting','vomit':'Vomiting','vomited':'Vomiting','urination':'Urination','urine':'Urination','urinated':'Urination','pee':'Urination','peed':'Urination',
  'defecation':'Defecation','stool':'Defecation','poop':'Defecation','bm':'Defecation','bowel movement':'Defecation',
  'cerenia':'Cerenia','maropitant':'Cerenia','unasyn':'Unasyn','ampicillin':'Unasyn','amp sulbactam':'Unasyn','methadone':'Methadone','acetazolamide':'Acetazolamide','ace':'Acepromazine','acepromazine':'Acepromazine','allopurinol':'Allopurinol',
  'walk':'Walk','walked':'Walk','walked her':'Walk','walked him':'Walk','iv catheter':'Check IV catheter','catheter':'Check IV catheter','catheter check':'Check IV catheter','iv check':'Check IV catheter','check iv catheter':'Check IV catheter',
  'e collar':'E-collar check','e-collar':'E-collar check','ecollar':'E-collar check','cone':'E-collar check','collar':'E-collar check','nursing note':'Nursing note','cage':'Cage cleaned','cage cleaned':'Cage cleaned','cleaned cage':'Cage cleaned','cage clean':'Cage cleaned',
  'glucose':'Blood glucose','blood glucose':'Blood glucose','bg':'Blood glucose','blood sugar':'Blood glucose','sugar':'Blood glucose','electrolytes':'Recheck electrolytes','lytes':'Recheck electrolytes',
  'fluids':'LRS + KCl 20 mEq/L','lrs':'LRS + KCl 20 mEq/L'};
function orders(){ try{ return ORDERS; }catch(e){ return []; } }
function tasks(){ try{ return TASKS; }catch(e){ return []; } }
function findOrder(x){ x=flat(String(x||'')).replace(/^(the|a|an|her|his|its|their|patient's|cookie's)\s+/,'').replace(/^(the)\s+/,'').trim(); if(!x||/^(her|him|it|them|she|he|this|that)$/.test(x)) return null;
  var O=orders(), byName=function(n){ return O.find(function(o){ return o.name===n; })||null; };
  if(ALIAS[x]) return {o:byName(ALIAS[x]),s:1};
  var best=null, bs=0;
  O.forEach(function(o){ var n=o.name.toLowerCase(); var s=Math.max(jw(x,n), n.indexOf(x)===0&&x.length>=3?0.93:0, x.indexOf(n)===0?0.95:0);
    n.split(/[^a-z0-9]+/).forEach(function(w){ if(w.length>=4) s=Math.max(s, jw(x,w)*0.97); }); if(s>bs){ bs=s; best=o; } });
  Object.keys(ALIAS).forEach(function(k){ if(k.length>=3){ var s=jw(x,k)*0.97; if(s>bs){ bs=s; best=byName(ALIAS[k]); } } });
  return bs>=0.86&&best?{o:best,s:bs}:null; }
function st(t){ try{ return deriveStatus(t); }catch(e){ return t.status||'scheduled'; } }
/* The task a tech means right now: overdue first, then due, then the next one within 90 minutes */
function pickTask(o){ var n=nowMin(), T=tasks().filter(function(t){ return t.orderId===o.id&&!t.status; });
  /* due now first, then the most recent missed slot (within 4 h), then the next one within 90 min */
  var du=T.filter(function(t){ return st(t)==='due'; }).sort(function(a,b){ return Math.abs(a.sched-n)-Math.abs(b.sched-n); });
  if(du.length) return du[0];
  var od=T.filter(function(t){ return st(t)==='overdue'; }).sort(function(a,b){ return b.sched-a.sched; });
  if(od.length&&n-od[0].sched<=240) return od[0];
  var nx=T.filter(function(t){ return t.sched>=n&&t.sched-n<=90; }).sort(function(a,b){ return a.sched-b.sched; });
  return nx[0]||od[0]||null; }
function unitOf(o){ return o&&o.unit?(' '+o.unit.replace(/\s*\/\s*/,'/')):''; }
function label(o){ return o?o.name:''; }
function when(t){ return fmtTime(t.sched); }
function patient(){ try{ return VISIT.patient; }catch(e){ return 'the patient'; } }

/* ---------- understanding ---------- */
var TABS={'dashboard':'dash','status board':'dash','board':'dash','dash':'dash','home':'dash','treatment sheet':'sheet','sheet':'sheet','treatment':'sheet','treatments':'sheet','flowsheet':'sheet','flow sheet':'sheet',
  'vitals':'vitals','vital signs':'vitals','rounds':'rounds','med rounds':'rounds','medication rounds':'rounds','meds':'rounds','timeline':'timeline','history':'timeline','notes':'notes','note':'notes'};
var DONE_WORDS='(?:done|given|gave|complete|completed|finished|checked|performed|ok|okay|good|fine)';
function cleanValue(v){ v=String(v||'').trim().replace(/^(?:is|was|as|of|at|to|=)\s+/,'');
  var m=v.match(/^(-?\d+(?:\.\d+)?)\s*(?:out of|over|\/)\s*(\d+)$/); if(m) return m[1]+'/'+m[2];
  v=v.replace(/\s*(?:degrees?(?: fahrenheit)?|°f?|bpm|beats(?: per minute)?|breaths(?: per minute)?|kilos?|kilograms?|kgs?|seconds?|secs?|mg\/?dl|milligrams per deciliter)$/,'');
  return v.trim(); }
function parseChart(c){ var m, rest=c.replace(/^(?:record|chart|log|enter|document|put in|put)\s+/,'');
  /* "Temperature 101.5", "HR 120", "pain score 2 out of 4", "mucous membranes pink" */
  var w=rest.split(' '), best=null;
  for(var k=Math.min(4,w.length-1);k>=1;k--){ var head=w.slice(0,k).join(' '), tail=w.slice(k).join(' ');
    if(/\d/.test(head)) continue;
    var f=findOrder(head); if(!f) continue;
    var v=cleanValue(tail); if(!v) continue;
    if(f.o.type!=='obs'&&f.o.type!=='diag'&&!/^\d/.test(v)&&!new RegExp('^'+DONE_WORDS+'$').test(v)) continue;
    if(!best||f.s>best.s) best={o:f.o,s:f.s,v:v}; }
  if(!best) return null;
  if(new RegExp('^'+DONE_WORDS+'$').test(best.v)) return {op:'done',o:best.o,s:best.s};
  return {op:'chart',o:best.o,s:best.s,value:best.v}; }
function understand(raw){
  var c=flat(norm(raw)), m;
  if(/^(yes|yeah|yep|yup|confirm|do it|correct|go ahead|sure|save( it)?)$/.test(c)) return {kind:'yes'};
  if(/^(no|nope|cancel|stop|never ?mind|forget it)$/.test(c)) return {kind:'no'};
  if(/^(undo|undo that|take (?:that|it) back|go back)$/.test(c)) return {kind:'undo'};
  if(/^(?:what can i (?:say|ask|do)|what can you do|help|voice help|commands|show (?:me )?(?:the )?commands)$/.test(c)) return {kind:'ask',q:'help'};
  /* corrections: "no, 102.1" */
  if(m=c.match(/^(?:no|nope|actually|sorry|i meant|make it|change it to)\s+(?:it's\s+|its\s+|to\s+)?(.+)$/)){ if(!/^(wait|stop|cancel)$/.test(m[1])) return {kind:'fix',value:cleanValue(m[1])}; }
  /* navigation */
  if(m=c.match(/^(?:open|show|go to|switch to|take me to|pull up)\s+(?:the\s+|my\s+)?(.+?)(?:\s+(?:tab|view|page|screen))?$/)){ if(TABS[m[1]]) return {kind:'nav',tab:TABS[m[1]]}; }
  if(TABS[c]&&c.split(' ').length<=3) return {kind:'nav',tab:TABS[c]};
  /* questions */
  if(/^(?:what(?:'s| is| are)|whats|anything|is anything|is there anything)\s+(?:due|due now|due right now)\b/.test(c)||/^what(?:'s| is)? next\b/.test(c)||c==="what's due"||c==='due') return {kind:'ask',q:'due'};
  if(/\b(overdue|late|behind|missed)\b/.test(c)&&/^(what|anything|is|are|any|show)/.test(c)) return {kind:'ask',q:'overdue'};
  if(/^(?:what(?:'s| is)? left|how many (?:tasks|treatments) (?:are )?left|what(?:'s| is) remaining)/.test(c)) return {kind:'ask',q:'left'};
  if(m=c.match(/^(?:when(?:'s| is)|when is the)\s+(?:the\s+)?(?:next\s+)?(.+?)(?:\s+due)?$/)){ var f1=findOrder(m[1]); if(f1) return {kind:'ask',q:'when',o:f1.o}; }
  if(m=c.match(/^(?:what(?:'s| was| is)|whats)\s+(?:the\s+)?(?:last|latest|most recent|current)\s+(.+?)$/)||c.match(/^(?:last|latest)\s+(.+)$/)){ var f2=findOrder(m[1]); if(f2) return {kind:'ask',q:'last',o:f2.o}; }
  /* note: "add note: ate half her food" */
  if(m=c.match(/^(?:add\s+(?:a\s+)?(?:nursing\s+|doctor\s+|communication\s+)?note|new note|note)\s*[:\-]?\s*(?:that\s+)?(.+)$/)) return {kind:'do',op:'note',text:String(raw).replace(/^[\s\S]*?\bnote\b\s*[:,\-]?\s*(?:that\s+)?/i,'').trim()||m[1]};
  /* hold / skip */
  if(m=c.match(/^(?:hold|skip|holding|skipping)\s+(?:the\s+)?(.+?)(?:\s+(?:dose|for now|this time))?$/)){ var f3=findOrder(m[1]); if(f3) return {kind:'do',op:'hold',o:f3.o,s:f3.s}; }
  /* done: "gave methadone", "cerenia given", "walked her", "mark catheter check done" */
  if(m=c.match(new RegExp('^(?:mark\\s+|complete\\s+|finished\\s+|done with\\s+)?(.+?)\\s+(?:is\\s+|was\\s+|as\\s+)?'+DONE_WORDS+'$'))){ var f4=findOrder(m[1]); if(f4) return {kind:'do',op:'done',o:f4.o,s:f4.s}; }
  if(/^walked\b/.test(c)){ var fw=findOrder('walk'); if(fw) return {kind:'do',op:'done',o:fw.o,s:1}; }
  if(/^cleaned (?:the )?cage/.test(c)){ var fc=findOrder('cage cleaned'); if(fc) return {kind:'do',op:'done',o:fc.o,s:1}; }
  if(m=c.match(/^(?:gave|give|given|administered|mark|complete|completed|did|checked|cleaned|walked)\s+(?:the\s+)?(.+?)(?:\s+(?:dose|now))?$/)){ var f5=findOrder(m[1]); if(f5) return {kind:'do',op:'done',o:f5.o,s:f5.s}; }
  /* charting a value */
  var ch=parseChart(c); if(ch) return {kind:'do',op:ch.op,o:ch.o,s:ch.s,value:ch.value};
  return {kind:'unknown'};
}

/* ---------- answers ---------- */
function ans(html){ return '<div class="fv-ans">'+html+'</div>'; }
function err(html){ return '<div class="fv-ans fv-err">'+html+'</div>'; }
var HELP='Try “Temperature 101.5”, “gave methadone”, “what’s due?”, or “add note: ate half her breakfast”.';
var HELP_SHEET='<div class="fv-help"><div><b>Chart a value</b>“Temperature 101.5” · “Heart rate 120” · “Pain score 2 out of 4” · “Mucous membranes pink”</div>'
 +'<div><b>Mark done</b>“Gave methadone” · “Cerenia given” · “Walked her” · “Catheter check done”</div>'
 +'<div><b>Hold</b>“Hold the Unasyn”</div>'
 +'<div><b>Notes</b>“Add note: ate half her breakfast”</div>'
 +'<div><b>Ask</b>“What’s due?” · “Anything overdue?” · “When is the next Unasyn?” · “Last temperature?”</div>'
 +'<div><b>Go to</b>“Open vitals” · “Show the treatment sheet” · “Open notes”</div>'
 +'<div><b>Fix it</b>“No, 102.1” · “Undo” · “Yes” to save</div></div>';
function listTasks(L){ return L.map(function(t){ return esc(label(t.order))+' <small>'+esc(when(t))+'</small>'; }).join(', '); }
function answer(q,o){
  var T=tasks().filter(function(t){ return !t.status; });
  if(q==='help') return HELP_SHEET;
  if(q==='due'){ var D=T.filter(function(t){ return st(t)==='due'; }).sort(function(a,b){ return a.sched-b.sched; });
    if(!D.length){ var nx=T.filter(function(t){ return st(t)==='scheduled'; }).sort(function(a,b){ return a.sched-b.sched; }).slice(0,3);
      return ans('Nothing due right now.'+(nx.length?' Next: '+listTasks(nx)+'.':'')); }
    return ans('<b>'+D.length+' due now:</b> '+listTasks(D)+'.'); }
  if(q==='overdue'){ var O=T.filter(function(t){ return st(t)==='overdue'; }).sort(function(a,b){ return a.sched-b.sched; });
    return O.length?ans('<b>'+O.length+' overdue:</b> '+listTasks(O)+'.'):ans('Nothing overdue. Nice work.'); }
  if(q==='left'){ var n=nowMin(), L=T.filter(function(t){ return t.sched<=n+(24*60-n%1440); });
    var od=L.filter(function(t){ return st(t)==='overdue'; }).length, du=L.filter(function(t){ return st(t)==='due'; }).length;
    return ans('<b>'+L.length+' left today</b>'+(od||du?' · '+(od?od+' overdue':'')+(od&&du?', ':'')+(du?du+' due now':''):'')+'.'); }
  if(q==='when'){ var t=pickTask(o)||T.filter(function(x){ return x.orderId===o.id; }).sort(function(a,b){ return a.sched-b.sched; })[0];
    return t?ans('<b>'+esc(o.name)+'</b> is '+(st(t)==='overdue'?'overdue since ':st(t)==='due'?'due now, ':'next due at ')+esc(when(t))+'.'):ans('No more '+esc(o.name)+' scheduled.'); }
  if(q==='last'){ var C=tasks().filter(function(x){ return x.orderId===o.id&&x.status==='completed'; }).sort(function(a,b){ return (b.completedMin||b.sched)-(a.completedMin||a.sched); });
    var c=C[0]; return c?ans('<b>'+esc(o.name)+'</b>'+(c.value?' '+esc(c.value)+esc(unitOf(o)):' done')+' at '+esc(fmtTime(c.completedMin||c.sched))+(c.by?' by '+esc(c.by):'')+'.'):ans('No '+esc(o.name)+' charted yet.'); }
  return err(HELP); }

/* ---------- actions ---------- */
function rerender(){ try{ if(currentCTab==='sheet') buildGrid(); else if(currentCTab==='vitals') renderVitals(); else if(currentCTab==='dash') renderDash(); else if(currentCTab==='timeline') renderTimeline(); else if(currentCTab==='notes') renderNotes(); }catch(e){} }
function stepTitle(s){ if(s.op==='note') return 'Add note'; if(s.op==='hold') return 'Hold '+label(s.o); return (s.op==='chart'?'Chart ':'Mark done · ')+label(s.o); }
function stepPath(s){ if(s.op==='note') return '<span class="fv-pill to">'+esc(s.text.length>90?s.text.slice(0,88)+'…':s.text)+'</span>';
  var t=s.t, from=t?(fmtTime(t.sched)+' · '+({overdue:'Overdue',due:'Due',scheduled:'Scheduled'}[st(t)]||'')):(s.o.freq==='PRN'?'PRN · now':'Extra · now');
  var to=s.op==='hold'?'Held':s.op==='chart'?(s.value+unitOf(s.o)):'Done';
  return '<span class="fv-pill">'+esc(from)+'</span> → <span class="fv-pill to">'+esc(to)+'</span>'; }
function sentence(s){ if(s.op==='note') return 'Note added'; if(s.op==='hold') return label(s.o)+' held'; return s.op==='chart'?(label(s.o)+' '+s.value+unitOf(s.o)+' charted'):(label(s.o)+' marked done'); }
function resolve(u,raw){
  if(u.op==='note'){ if(!u.text) return show(heard(raw)+err('What should the note say?')); return propose({op:'note',text:u.text},raw); }
  var o=u.o; if(!o) return show(heard(raw)+err(HELP));
  if(o.cont) return show(heard(raw)+err(esc(o.name)+' is a continuous infusion. Adjust it on the treatment sheet.'));
  var t=pickTask(o);
  if(!t&&o.freq!=='PRN'&&o.type==='med'){ var nx=tasks().filter(function(x){ return x.orderId===o.id&&!x.status; }).sort(function(a,b){ return a.sched-b.sched; })[0];
    return show(heard(raw)+err('Nothing open for '+esc(o.name)+' right now.'+(nx?' Next at '+esc(when(nx))+'.':''))); }
  if(u.op==='chart'&&o.type==='obs'&&o.unit&&isNaN(parseFloat(u.value))) return show(heard(raw)+err(esc(o.name)+' needs a number, like “'+esc(o.name)+' 101.5”.'));
  propose({op:u.op==='hold'?'hold':u.value?'chart':'done',o:o,t:t,value:u.value||null},raw);
}
function propose(s,raw){
  pending={steps:[s],raw:raw}; ctx={step:s,at:Date.now(),done:false};
  var ic=s.op==='note'?'N':(s.o&&s.o.name||'?')[0];
  show(heard(raw)+'<div class="fv-act"><div class="fv-med" style="--c:#38BDD2">'+esc(ic)+'</div><div class="fv-t"><b>'+esc(stepTitle(s))+'</b><div class="fv-path">'+stepPath(s)+'</div></div><div class="fv-btns"><button class="fv-no" type="button">Cancel</button><button class="fv-ok" type="button">Save</button></div></div>'
    +'<div class="fv-sub">'+(via==='typed'?'Press Return to save.':'Say “yes” or press Enter to save.')+(s.op==='chart'?(via==='typed'?' Type':' Say')+' “no, '+(s.o.unit?'102.1':'…')+'” to change it.':'')+' · '+esc(patient())+' · by '+esc(me())+'</div>');
  inner.querySelector('.fv-ok').onclick=confirm; inner.querySelector('.fv-no').onclick=function(){ stat('cancelled'); hide(); };
  if(via==='voice'&&ENABLED&&navigator.onLine&&!listening) setTimeout(function(){ if(pending&&pending.steps&&!listening) start(true,true); },350);
}
function confirm(){ var a=pending; if(!a||!a.steps) return; apply(a.steps[0]); }
function apply(s){
  if(listening){ sessionId++; stop(); }
  var by=me(), n=nowMin(), undo;
  try{
    if(s.op==='note'){ NOTES.push({min:n,type:'nursing',author:by,role:(typeof currentRole!=='undefined'?currentRole.charAt(0).toUpperCase()+currentRole.slice(1):'Technician'),body:s.text});
      logEvent('note','nursing note added',by); var nn=NOTES[NOTES.length-1], ai=AUDIT.length-1;
      undo=function(){ if(window.__tsStore&&__tsStore.removeNote) __tsStore.removeNote(nn.body,nn.min); else { var i=NOTES.indexOf(nn); if(i>-1) NOTES.splice(i,1); } try{ logEvent('note','nursing note removed (undo)',by); }catch(e){} }; }
    else{
      var t=s.t, adhoc=false;
      if(!t){ t={id:'t'+(TASK_SEQ++),orderId:s.o.id,order:s.o,sched:n,status:null,by:null,completedMin:null,value:null,notes:null,severity:0}; TASKS.push(t); adhoc=true; }
      var snap={status:t.status,by:t.by,completedMin:t.completedMin,value:t.value,notes:t.notes};
      if(s.op==='hold'){ t.status='held'; t.by=by; logEvent('doctor','<b>'+esc(s.o.name)+'</b> held (voice)',by); }
      else { t.status='completed'; t.completedMin=n; t.by=by; if(s.value) t.value=s.value; t.notes=(t.notes?t.notes+' · ':'')+(via==='typed'?'typed command':'voice');
        logEvent(s.o.type==='obs'?'vital':s.o.type,'<b>'+esc(s.o.name)+'</b> '+(s.value?('— '+esc(s.value)+esc(unitOf(s.o))):'')+' completed ('+(via==='typed'?'typed':'voice')+')',by); }
      undo=function(){ var cur=(t.key&&TASKS.find(function(x){ return x.key===t.key; }))||t; Object.assign(cur,snap); if(adhoc){ var i=TASKS.indexOf(cur); if(i>-1) TASKS.splice(i,1); }
        try{ logEvent('doctor','<b>'+esc(s.o.name)+'</b> entry undone',by); }catch(e){} };
    }
  }catch(e){ return show(err('That didn’t save. Try again or use the sheet.')); }
  stat('confirmed'); hide(); rerender();
  ctx={step:s,at:Date.now(),done:true,undo:undo};
  undoFn=function(){ try{ undo(); }catch(e){} rerender(); ctx=null; stat('undone'); toast('Undone'); };
  toast(sentence(s),true,7000);
}
function applyFix(u,raw){
  var s=(pending&&pending.steps)?pending.steps[0]:(ctx&&Date.now()-ctx.at<60000?ctx.step:null);
  if(!s||s.op==='note'||!u.value) return show(heard(raw)+err('Nothing to change right now.'));
  if(ctx&&ctx.done&&ctx.undo){ try{ ctx.undo(); }catch(e){} undoFn=null; rerender(); }
  var n={op:s.op==='done'?'chart':s.op,o:s.o,t:pickTask(s.o)||s.t,value:u.value}; if(n.op==='hold') n.op='chart';
  pending=null; stat('corrected'); propose(n,raw);
}
function handle(raw,opts){
  via=(opts&&opts.typed)?'typed':'voice'; stat(via==='typed'?'typed':'heard');
  var u=understand(raw);
  if(u.kind==='yes'){ if(pending&&pending.steps) confirm(); return; }
  if(u.kind==='no'){ if(pending&&pending.steps) stat('cancelled'); hide(); return; }
  if(u.kind==='undo'){ if(undoFn){ var f=undoFn; undoFn=null; f(); hide(); } else show(heard(raw)+err('Nothing to undo.')); return; }
  if(u.kind==='fix') return applyFix(u,raw);
  if(u.kind==='nav'){ stat('understood'); hide(); try{ selectCTab(u.tab); }catch(e){} toast('Opened '+({dash:'Dashboard',sheet:'Treatment Sheet',vitals:'Vitals',rounds:'Med Rounds',timeline:'Timeline',notes:'Notes'}[u.tab]||'view')); return; }
  if(u.kind==='ask'){ stat('understood'); pending=null; return show(heard(raw)+answer(u.q,u.o)); }
  if(u.kind==='unknown'){ stat('unknown'); return show(heard(raw)+err(HELP)); }
  stat('understood'); resolve(u,raw);
}

/* ---------- typed commands in the search bar ---------- */
function typedCommand(q){ var t=flat(norm(q)); if(!t) return null; var u=understand(q);
  if(u.kind==='unknown'||u.kind==='yes'||u.kind==='no') return null;
  if(u.kind==='fix'&&!((pending&&pending.steps)||(ctx&&Date.now()-ctx.at<60000))) return null;
  if(u.kind==='nav'&&t.split(' ').length<2) return null;
  return u; }
function describe(u,q){
  if(u.kind==='undo') return 'Undo the last change';
  if(u.kind==='fix') return 'Change it to '+u.value;
  if(u.kind==='nav') return 'Open '+({dash:'Dashboard',sheet:'Treatment Sheet',vitals:'Vitals',rounds:'Med Rounds',timeline:'Timeline',notes:'Notes'}[u.tab]);
  if(u.kind==='ask') return u.q==='help'?'Show what I can say':q.trim().replace(/\?*$/,'?');
  if(u.op==='note') return 'Add note: '+u.text;
  if(u.op==='hold') return 'Hold '+label(u.o);
  return u.value?('Chart '+label(u.o)+' '+u.value+unitOf(u.o)):('Mark '+label(u.o)+' done'); }
var hintEl=null;
function cmdHint(q){ var s=document.querySelector('.subnav .search'); if(!s) return;
  if(!hintEl){ hintEl=document.createElement('div'); hintEl.className='ts-cmd-hint'; s.appendChild(hintEl); hintEl.addEventListener('mousedown',function(e){ e.preventDefault(); runTyped(); }); }
  var u=q.trim()?typedCommand(q):null;
  if(!u){ hintEl.classList.remove('show'); return; }
  hintEl.innerHTML='<span class="ic">↵</span><span class="tx">'+esc(describe(u,q))+'</span><kbd>return</kbd>'; hintEl.classList.add('show'); }
function runTyped(){ var el=document.getElementById('globalSearch'); if(!el) return false; var q=el.value; if(!typedCommand(q)) return false;
  el.value=''; if(hintEl) hintEl.classList.remove('show'); el.blur(); handle(q,{typed:true}); return true; }
document.addEventListener('input',function(e){ if(e.target&&e.target.id==='globalSearch') cmdHint(e.target.value); });
document.addEventListener('focusout',function(e){ if(e.target&&e.target.id==='globalSearch'&&hintEl) setTimeout(function(){ hintEl.classList.remove('show'); },150); });
document.addEventListener('keydown',function(e){ if(e.key!=='Enter'||!e.target||e.target.id!=='globalSearch'||e.isComposing) return;
  if(typedCommand(e.target.value)){ e.preventDefault(); e.stopImmediatePropagation(); runTyped(); } },true);

/* ---------- microphone ---------- */
var TIP_KEY='tsVoiceTip';
function start(tap,cm){
  if(!ENABLED||listening) return; tapMode=!!tap; confirmMode=!!cm;
  if(!SR){ show('<div class="fv-ans fv-err">Voice needs Chrome or Safari on this computer.</div>'); return; }
  if(!navigator.onLine){ if(!cm) show('<div class="fv-ans fv-err">Voice needs internet. You can still type commands in the search bar.</div>'); return; }
  listening=true; finalText=''; interim=''; startedAt=Date.now();
  setOn(true); clearTimeout(maxT); maxT=setTimeout(function(){ if(listening) stop(); },cm?5000:15000);
  if(live){ if(!cm){ hide();
      /* first time on this computer: a one-time tip with three things to try */
      var seen=true; try{ seen=!!localStorage.getItem(TIP_KEY); if(!seen) localStorage.setItem(TIP_KEY,'1'); }catch(e){}
      if(!seen) show('<div class="fv-tip"><b>Try saying</b><span>“Temperature 101.5”</span><span>“Gave methadone”</span><span>“What’s due?”</span><small>Say “what can I say?” anytime for the full list.</small></div>'); } }
  else { show('<div class="fv-heard" id="fvLive">Listening…</div>'+wave()); animate(); }
  if(cm) armSilence(4000);
  meterStart();
  rec=new SR(); rec._id=++sessionId; rec.lang='en-US'; rec.interimResults=true; rec.continuous=true;
  rec.onresult=function(e){ interim=''; for(var i=e.resultIndex;i<e.results.length;i++){ var r=e.results[i]; if(r.isFinal) finalText+=r[0].transcript+' '; else interim+=r[0].transcript; }
    var said=(finalText+interim).trim(); meter.syn=.7; if(live) liveText(said); var l=document.getElementById('fvLive'); if(l) l.innerHTML='<q>'+esc(said)+'</q>'; if(tapMode) armSilence(1400); };
  rec.onerror=function(e){ var m=e&&e.error; if(m==='not-allowed'||m==='service-not-allowed'){ listening=false; setOn(false); endLive(); meterStop(); show('<div class="fv-ans fv-err">The microphone is blocked. Click the icon in the address bar and allow the microphone for Flow.</div>'); } };
  try{ rec.start(); }catch(e){}
}
function stop(){
  if(!listening) return; listening=false; clearInterval(waveT);
  setOn(false); clearTimeout(silenceT); clearTimeout(maxT); meterStop();
  var r=rec; rec=null; if(!r){ endLive(); return; }
  if(wrap) wrap.classList.add('fv-thinking');
  var quick=!tapMode&&Date.now()-startedAt<350, cm=confirmMode; tapMode=false; confirmMode=false;
  var done=false;
  function finish(){ if(done) return; done=true; if(listening) return; endLive(); if(r._id!==sessionId) return; var t=(finalText+interim).trim(); if(cm&&!t) return; if(quick&&!t){ hide(); return; } if(t) handle(t); else show('<div class="fv-ans fv-err">Didn\'t catch that. Try again.</div>'); }
  r.onend=finish; setTimeout(finish,4000);
  try{ r.stop(); }catch(e){ finish(); }
}
function typing(){ var a=document.activeElement, t=a&&a.tagName; return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(a&&a.isContentEditable); }
document.addEventListener('keydown',function(e){
  if(document.body.classList.contains('client-mode')) return;
  if(ENABLED&&e.code==='Space'&&!typing()&&!e.metaKey&&!e.ctrlKey&&!e.altKey){ e.preventDefault(); e.stopPropagation(); if(e.repeat) return;
    if(listening&&tapMode){ stop(); return; }
    /* on the Status Board a quick tap of space is Quick Look (store/boardview.js); holding it still talks */
    if(window.tsBoardSpaceTap&&tsBoardSpaceTap('can')){ clearTimeout(spaceT); spaceT=setTimeout(function(){ spaceT=null; start(false); },230); return; }
    start(false); return; }
  if(e.key==='Enter'&&panel&&panel.classList.contains('show')&&pending&&pending.steps&&!typing()){ e.preventDefault(); confirm(); return; }
  if(e.key==='Escape'&&panel&&panel.classList.contains('show')){ hide(); }
},true);
var spaceT=null;
document.addEventListener('keyup',function(e){ if(e.code!=='Space') return;
  if(spaceT){ clearTimeout(spaceT); spaceT=null; e.preventDefault(); try{ tsBoardSpaceTap('tap'); }catch(err){} return; }
  if(listening&&!tapMode){ e.preventDefault(); stop(); } },true);
document.addEventListener('pointerdown',function(e){ if(panel&&panel.classList.contains('show')&&!panel.contains(e.target)&&(!talk||(e.target!==talk&&!talk.contains(e.target)))&&!(pending&&pending.steps)) hide(); },true);

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
window.__tsVoice={understand:understand, handle:handle, confirm:confirm, stats:stats};
})();
