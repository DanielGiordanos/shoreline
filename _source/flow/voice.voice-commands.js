/* Voice commands. On for every workstation (approved by VCA IT). Click the mic in the search bar
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
var agg={}, aggT=null, aggOff=false;
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
var MIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';
var confirmMode=false, sessionId=0, tapMode=false, silenceT=null, maxT=null, hintT=null, bar=null, wrap=null, live=null;
function build(){
  panel=document.createElement('div'); panel.id='fvPanel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-live','polite'); panel.innerHTML='<div class="fv-in"></div>';
  toastEl=document.createElement('div'); toastEl.id='fvToast'; toastEl.setAttribute('role','status');
  document.body.appendChild(panel); document.body.appendChild(toastEl);
  /* The mic lives inside Flow's search bar. If the bar is missing, fall back to a small glass circle. */
  var actions=document.querySelector('#subnavFlow .search-bar .actions');
  bar=actions?actions.closest('.search-bar'):null;
  inner=panel.querySelector('.fv-in');
  window.addEventListener('resize',function(){ place(); if(listening) placeLive(); });
  if(!SR) return;
  window.addEventListener('online',netState); window.addEventListener('offline',netState); setTimeout(netState,0);
  talk=document.createElement('button'); talk.id='fvTalk'; talk.type='button';
  talk.setAttribute('aria-label','Talk to Flow'); talk.title='Click, or hold Space, to talk';
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
  if(r&&r.width){ panel.classList.remove('fv-bottom'); panel.style.top=Math.round(r.bottom+10)+'px'; panel.style.right=Math.max(12,Math.round(window.innerWidth-r.right))+'px';
    try{ var pw=panel.offsetWidth||Math.min(460,window.innerWidth-24); if(window.innerWidth-parseFloat(panel.style.right)-pw<12) panel.style.right=Math.max(12,window.innerWidth-12-pw)+'px'; }catch(e){}   /* PVX-N376: on iPhone the card ran off the left edge */
    try{ var ci=document.getElementById('critIsland'); if(ci&&ci.classList.contains('on')){ var q=ci.getBoundingClientRect(), pr=window.innerWidth-parseFloat(panel.style.right), pl=pr-(panel.offsetWidth||Math.min(460,window.innerWidth-24));
      if(q.right>pl&&q.left<pr&&q.bottom>r.bottom) panel.style.top=Math.round(q.bottom+10)+'px'; } }catch(e){}   /* PVX-N376: the card sits below the critical banner, never under it */ }
  else { panel.classList.add('fv-bottom'); panel.style.top=''; panel.style.right=''; }
}
function netState(){ if(!talk) return; var off=!navigator.onLine; talk.classList.toggle('fv-off',off);
  talk.title=off?'Voice needs internet. Typing commands in the search bar still works.':'Click, or hold Space, to talk'; talk.setAttribute('aria-disabled',off?'true':'false');
  if(off&&listening){ sessionId++; stop(); } }
function armSilence(ms){ clearTimeout(silenceT); silenceT=setTimeout(function(){ if(listening&&tapMode) stop(); },ms); }
function setOn(on){ talk.classList.toggle('on',on); talk.setAttribute('aria-pressed',on?'true':'false'); if(on&&wrap){ wrap.classList.remove('fv-thinking'); wrap.classList.add('fv-listening'); bar.classList.add('fv-listening'); placeLive(); liveText('',true); } }
/* ring + live words */
function placeLive(){ if(!live) return; var inp=bar.querySelector('input'); if(!inp) return; live.style.left=inp.offsetLeft+'px'; live.style.width=inp.offsetWidth+'px'; }
function liveText(t,idle){ if(!live) return; clearTimeout(hintT);
  if(idle){ live.className='fv-live idle'; live.textContent=confirmMode?'Say “yes” or “no”…':'Listening…'; if(confirmMode) return;
    hintT=setTimeout(function(){ if(listening&&!(finalText+interim).trim()){ live.className='fv-live idle hint'; live.textContent='Try “Move Bella to Exam”'; } },2600); return; }
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
function heard(t){ return '<div class="fv-heard">'+(via==='typed'?'':'Heard ')+'<q>'+pvxEsc(t)+'</q></div>'; }
function toast(t,withUndo,dur){
  toastEl.innerHTML='<span>'+pvxEsc(t)+'</span>'+(withUndo?'<button type="button">Undo</button>':'');
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

/* ---------- board access ---------- */
function active(){ try{ return PATIENTS.filter(function(p){ return isActive(p)&&!p._voiceHidden; }); }catch(e){ return []; } }
function roomList(){ try{ return ROOMS.filter(function(r){ return r!=='Lobby'; }); }catch(e){ return []; } }
function docs(){ try{ return DOCTORS; }catch(e){ return []; } }
function occupant(room){ return active().find(function(p){ return p.room===room; }); }
function pName(p){ return ((p.name||'')+' '+(p.last||'')).trim(); }
function color(p){ try{ return STATUSES[p.status].color; }catch(e){ return '#6FD3E6'; } }
function where(p){ return (p.room&&p.room!=='Lobby')?p.room:(p.status==='Waiting'?'Lobby':p.status); }

/* ---------- understanding ----------
   One command engine for voice and typing. Handles chains ("… and give her to Dr. Lee"),
   corrections ("no, Room 4"), questions, and decides what is safe to do without a Confirm. */
var NUM={one:'1',won:'1',two:'2',to:'2',too:'2',three:'3',tree:'3',four:'4',for:'4',five:'5',six:'6',sex:'6',seven:'7',eight:'8',nine:'9'};
var STAGES=[
  {kind:'status', v:'Waiting', words:['waiting','lobby','the lobby','waiting room']},
  {kind:'status', v:'Exam', words:['exam','exams','exam room']},
  {kind:'status', v:'Diagnostics', words:['diagnostics','diagnostic','lab','labs','radiology','imaging','x-ray','xray','x ray','rads']},
  {kind:'status', v:'Ultrasound', words:['ultrasound','ultra sound','us']},
  {kind:'status', v:'Procedure', words:['procedure','procedures','surgery','or']},
  {kind:'room', v:'Treatment', words:['treatment','treatments','icu','the back','back','ward','wards']}
];
var PRONOUN=/^(her|him|it|them|she|he|that one|this one|the same one|same one)$/;
var HELP='Try “move Bella to Exam”, “move Max to Room 3 and give him to Dr. Meyer”, “how long has Oscar been waiting?” or “what rooms are open?”';
var ctx=null, via='voice';
function norm(t){ return String(t||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?;:]/g,' ').replace(/^\s*(hey |ok |okay )?flow\b\s*,?/,'').replace(/\bplease\b/g,' ').replace(/^\s*(?:(?:um|uh|so|okay|ok|alright|now|and now|next|then)\s+)+/,'').replace(/\s+/g,' ').trim(); }
function flat(c){ return c.replace(/,/g,' ').replace(/\s+/g,' ').trim(); }
function splitClauses(t){ return t.split(/\s*,\s*(?:and\s+then\s+|and\s+|then\s+)?|\s+(?:and then|and also|then|and|also)\s+/).map(flat).filter(Boolean); }
function roomFrom(w){ w=(w||'').trim().replace(/^the\s+/,''); if(/^comfort/.test(w)) return 'Comfort Room';
  var m=w.match(/^(?:exam room|room|rm)\s*(\w+)$/)||w.match(/^(\w+)$/); if(!m) return null; var n=NUM[m[1]]||(/^\d+$/.test(m[1])?m[1]:''); return n?'Room '+n:null; }
function stageFrom(t){ t=(t||'').replace(/^the\s+/,''); for(var i=0;i<STAGES.length;i++){ if(STAGES[i].words.indexOf(t)>-1) return STAGES[i]; } return null; }
function jw(a,b){ if(a===b) return 1; var m=Math.max(0,Math.floor(Math.max(a.length,b.length)/2)-1), am=[], bm=[], mt=0, t=0, i, j;
  for(i=0;i<a.length;i++){ for(j=Math.max(0,i-m);j<Math.min(b.length,i+m+1);j++){ if(!bm[j]&&a[i]===b[j]){ am[i]=bm[j]=1; mt++; break; } } }
  if(!mt) return 0; var k=0; for(i=0;i<a.length;i++){ if(am[i]){ while(!bm[k]) k++; if(a[i]!==b[k]) t++; k++; } }
  var s=(mt/a.length+mt/b.length+(mt-t/2)/mt)/3, p=0; while(p<4&&a[p]&&a[p]===b[p]) p++; return s+p*0.1*(1-s); }
/* returns [{p,s}]: the best matches (ties within 0.03) */
/* How a name sounds, so "Kaiser" finds "Keyser" and "Bayer" finds "Bear" (a small Metaphone). */
function phon(w){ w=String(w||'').toLowerCase().replace(/[^a-z]/g,''); if(!w) return '';
  w=w.replace(/^(kn|gn|pn|wr|ps)/,function(m){ return m.charAt(1); }).replace(/^wh/,'w').replace(/^x/,'s');
  w=w.replace(/x/g,'ks').replace(/ph/g,'f').replace(/gh(?![aeiou])/g,'').replace(/ck/g,'k').replace(/(sch|sh|ch|tio|tia)/g,'X').replace(/th/g,'0')
     .replace(/c(?=[iey])/g,'s').replace(/[cq]/g,'k').replace(/dg(?=[iey])/g,'j').replace(/d/g,'t').replace(/g(?=[iey])/g,'j').replace(/z/g,'s').replace(/v/g,'f')
     .replace(/y(?![aeiou])/g,'').replace(/w(?![aeiou])/g,'').replace(/h(?![aeiou])/g,'');
  var f=w.charAt(0); if(/[aeiouy]/.test(f)) f='a'; return (f+w.slice(1).replace(/[aeiouy]/g,'')).replace(/(.)\1+/g,'$1'); }
function nameScore(a,b){ if(!a||!b) return 0; var s=jw(a,b); if(s<0.9){ var pa=phon(a), pb=phon(b); if(pa.length>1&&pa===pb) s=0.9; } return s; }
var SPECIES={cat:'feline',kitty:'feline',kitten:'feline',feline:'feline',dog:'canine',puppy:'canine',pup:'canine',doggy:'canine',canine:'canine',bunny:'rabbit',rabbit:'rabbit',bird:'avian',parrot:'avian',ferret:'ferret'};
function findPatients(q){
  q=(q||'').replace(/^(the|a)\s+/,'').trim(); var m, loc=null, sp=null;
  /* "the Bella in Room 4", "Max in Exam" */
  if(m=q.match(/^(.+?)\s+(?:in|from|at)\s+(?:the\s+)?(.+)$/)){ var st=stageFrom(m[2]), rm=/^treatment/.test(m[2])?'Treatment':roomFrom(m[2]);
    if(st&&st.kind==='status'){ loc={status:st.v}; q=m[1]; } else if(st||rm){ loc={room:(st&&st.v)||rm}; q=m[1]; } }
  /* "Bella the cat" */
  if((m=q.match(/^(.+?)\s+the\s+(\w+)$/))&&SPECIES[m[2]]){ sp=SPECIES[m[2]]; q=m[1]; }
  var w=q.replace(/^(the|a)\s+/,'').replace(/'s$/,'').split(' ').filter(Boolean); if(!w.length) return [];
  var pool=active().filter(function(p){ if(loc){ if(loc.status&&p.status!==loc.status) return false; if(loc.room&&(p.room||'Lobby')!==loc.room) return false; }
    if(sp&&String(p.species||'').toLowerCase().indexOf(sp)<0) return false; return true; });
  var sc=pool.map(function(p){ var nm=String(p.name||'').toLowerCase(), ln=String(p.last||'').toLowerCase(), ow=String(p.owner||'').toLowerCase().split(/\s+/).pop(), s;
      if(w.length===1) s=Math.max(nameScore(w[0],nm), 0.95*Math.max(nameScore(w[0],ln),nameScore(w[0],ow)));
      else { var a=w[0], b=w[w.length-1], o=a.replace(/'?s$/,'');
        /* "Bella Smith" or "Smith's Bella" */
        s=Math.max((nameScore(a,nm)+nameScore(b,ln))/2, Math.min(Math.max(nameScore(o,ln),nameScore(o,ow),nameScore(a,ln),nameScore(a,ow)), nameScore(b,nm))); }
      return {p:p,s:s}; })
    .filter(function(x){ return x.s>0.82; }).sort(function(a,b){ return b.s-a.s; });
  if(!sc.length) return []; var top=sc[0].s; return sc.filter(function(x){ return top-x.s<0.03; });
}
function findDoctor(t){ t=(t||'').replace(/^(dr|doctor)\s+/,'').replace(/'s$/,''); if(!t) return null; var best=null, bs=0;
  docs().forEach(function(d){ var n=String(d.name||'').toLowerCase().replace(/\./g,''), parts=n.split(' ').filter(function(x){ return x&&x!=='dr'; }); var s=Math.max.apply(null,[jw(t,n),jw(t,n.replace(/^dr\s+/,''))].concat(parts.map(function(x){ return nameScore(t,x); }))); if(s>bs){ bs=s; best=d; } });
  return bs>0.84?{d:best,s:bs}:null; }
function destFrom(x){ x=(x||'').replace(/^(the|a)\s+/,'').trim(); if(!x) return null;
  if(/^(?:least busy|next available|next|free|available|open)\s+(?:doctor|dr|vet)$|^whoever(?:'s| is)?\s+(?:free|available|least busy)$/.test(x)){ var lb=(typeof fvLeastBusy==='function')?fvLeastBusy():null; return lb?{doc:lb,ds:1}:{badDoc:x}; }
  if(/^(dr|doctor)\s/.test(x)){ var d=findDoctor(x); return d?{doc:d.d,ds:d.s}:{badDoc:x}; }
  var st=stageFrom(x); if(st) return {dest:{type:st.kind,v:st.v}};
  var r=roomFrom(x); if(r) return {dest:{type:'room',v:r}};
  var d2=findDoctor(x); if(d2&&d2.s>=0.9) return {doc:d2.d,ds:d2.s};
  return {unknown:x}; }
function withDest(o,x){ var d=destFrom(x)||{unknown:x};
  if(d.doc){ o.op='assign'; o.doc=d.doc; o.ds=d.ds; o.said=x; } else if(d.badDoc){ o.op='assign'; o.doc=null; o.said=x; } else if(d.dest){ o.dest=d.dest; } else { o.badDest=x; }
  return o; }
var PRI={critical:1,urgent:2,stable:3,'non urgent':3,'priority one':1,'priority two':2,'priority three':3};
function prioFrom(x){ x=String(x||'').replace(/^(a|an)\s+/,'').trim(); if(PRI[x]) return PRI[x]; var m=x.match(/^(?:p|priority)\s*([123]|one|two|three)$/); if(!m) return 0; return {'1':1,'2':2,'3':3,one:1,two:2,three:3}[m[1]]||0; }
var PRIO_WORDS='(critical|urgent|stable|non urgent|p\\s?[123]|priority\\s+(?:[123]|one|two|three))';
function parseClause(c,idx){ var m;
  c=c.replace(/^(and|then|also)\s+/,'');
  if(m=c.match(new RegExp('^(?:make|mark|set|bump|change|upgrade|downgrade|move)\\s+(.+?)(?:\'s priority)?\\s+(?:to\\s+|as\\s+|up to\\s+|down to\\s+)?'+PRIO_WORDS+'$'))) return {op:'prio',who:m[1],level:prioFrom(m[2])};
  if(m=c.match(new RegExp('^(.+?)\\s+is\\s+(?:now\\s+)?'+PRIO_WORDS+'$'))) return {op:'prio',who:m[1],level:prioFrom(m[2])};
  if(m=c.match(/^(?:flag\s+)?(.+?)(?:'s)?\s+(?:is\s+|are\s+)?(?:still\s+)?waiting\s+(?:on|for)\s+(.+)$/)) return {op:'wait',who:m[1],text:m[2].slice(0,40)};
  if(m=c.match(/^(?:clear|remove|drop)\s+(.+?)(?:'s)?\s+(?:flag|waiting|wait|waiting on)$/)) return {op:'wait',who:m[1],text:''};
  if(m=c.match(/^(.+?)(?:'s)\s+[a-z ]+?\s+(?:is|are)\s+(?:back|done|in|ready|finished)$/)) return {op:'wait',who:m[1],text:''};
  if(m=c.match(/^((?:dr|doctor)\s+.+?)\s+(?:is\s+)?(?:taking|takes|take|has|gets|got|will take|is seeing|sees|is on)\s+(.+)$/)){ var d=findDoctor(m[1]); return {op:'assign',who:m[2],doc:d&&d.d,ds:d&&d.s,said:m[1]}; }
  if(m=c.match(/^(?:assign|give|hand)\s+(.+?)\s+(?:over\s+)?to\s+(.+)$/)){
    if(/busy|available|free|next|whoever/.test(m[2])){ var lbx=destFrom(m[2]); if(lbx&&lbx.doc) return {op:'assign',who:m[1],doc:lbx.doc,ds:1,said:m[2]}; }
    var d1=findDoctor(m[2]); if(d1) return {op:'assign',who:m[1],doc:d1.d,ds:d1.s,said:m[2]};
    var d0=/^(dr|doctor)\s/.test(m[1])?findDoctor(m[1]):null; if(d0) return {op:'assign',who:m[2],doc:d0.d,ds:d0.s,said:m[1]};
    return {op:'assign',who:m[1],doc:null,said:m[2]}; }
  if(m=c.match(/^(?:move|send|take|bring|put|room|walk)\s+(.+)\s+(?:to|into|over to)\s+(.+)$/)) return withDest({op:'dest',who:m[1].replace(/\s+back$/,'')},m[2]);
  if(m=c.match(/^(?:move|send|take|bring|put|room|walk)\s+(.+?)\s+(?:back\s+)?(?:to|into|in to|in|over to)\s+(.+)$/)) return withDest({op:'dest',who:m[1]},m[2]);
  if(m=c.match(/^(?:move|send|take|bring|put|walk)\s+(.+)$/)) return {op:'dest',who:m[1],noDest:true};
  if(idx>0&&(m=c.match(/^(.+?)\s+(?:back\s+)?(?:to|into|in to|in|goes to|with)\s+(.+)$/))) return withDest({op:'dest',who:m[1]},m[2]);
  return null; }
function question(c){ var m; c=c.replace(/^(and|also)\s+/,'');
  if(/^(?:what can i (?:say|ask|do)|what can you do|help|voice help|show (?:me )?(?:the )?commands|commands|what do i say)$/.test(c)) return {q:'help'};
  if(/^(what|who)(?:'s| is|s| are)?\s*(?:waiting|in the lobby)/.test(c)||/^who(?:'s| is|s)? waiting/.test(c)) return {q:'waiting'};
  if(/^(?:who(?:'s| is|s| are)?\s+)?critical/.test(c)||/^(?:any|what|which)\s+critical/.test(c)) return {q:'critical'};
  if(m=c.match(/^who(?:'s| is|s| are)?\s+in\s+(.+)$/)) return {q:'who',room:/^(the\s+)?treatment/.test(m[1])?'Treatment':roomFrom(m[1])};
  if(m=c.match(/^how long (?:has|have|is|was|did)\s+(.+?)\s+(?:been\s+)?(?:waiting|here|in|there|been|wait)\b/)) return {q:'howlong',who:m[1]};
  if(/\b(?:open|free|available|empty|clean)\s+rooms?\b/.test(c)||/^(?:what|which|any)\s+rooms?\s+(?:are\s+|is\s+)?(?:open|free|available|empty)/.test(c)||/^rooms?\s+(?:open|free|available)/.test(c)||/^(?:is there|are there)\s+(?:a|an|any)\s+(?:open|free|empty)\s+room/.test(c)) return {q:'open'};
  if(m=c.match(/^(?:who|what patients?|which patients?)(?:'s| is|s| does| are| do)?\s+((?:dr|doctor)\s+.+?)\s+(?:seeing|have|has|got|with|working on|on)$/)) return {q:'doctor',said:m[1]};
  if(m=c.match(/^((?:dr|doctor)\s+.+?)(?:'s| s)\s+patients$/)) return {q:'doctor',said:m[1]};
  if(m=c.match(/^who(?:'s| is|s| are)\s+with\s+((?:dr|doctor)\s+.+)$/)) return {q:'doctor',said:m[1]};
  if(m=c.match(/^where(?:'s| is|s| are)\s+(.+)$/)) return {q:'where',who:m[1]};
  if(/^how many\b/.test(c)) return {q:'count'};
  return null; }
function correction(c){
  var m=c.match(/^(?:no|nope|nah|actually|sorry|oops|wait)\s+(?:no\s+)?(?:i meant\s+|i said\s+|make (?:it|that)\s+|it's\s+|its\s+|to\s+|in\s+|into\s+)?(.+)$/)||c.match(/^(?:i meant|i said|make (?:it|that)|change (?:it|that) to)\s+(.+)$/)||c.match(/^not\s+.+?\s+(?:but\s+)?(?:to\s+|in\s+)?((?:room|dr|doctor|comfort|treatment)\b.*|exam|diagnostics|ultrasound|procedure|lobby)$/);
  if(!m) return null; var x=m[1].trim(); if(!x||/^(wait|stop|cancel)$/.test(x)) return null;
  var d=destFrom(x); if(d&&(d.dest||d.doc)) return d;
  if(findPatients(x).length) return {who:x};
  return null; }
function understand(raw){
  var t=norm(raw), c=flat(t);
  if(/^(yes|yeah|yep|yup|confirm|do it|correct|go ahead|sure)$/.test(c)) return {kind:'yes'};
  if(/^(no|nope|cancel|stop|never ?mind|forget it)$/.test(c)) return {kind:'no'};
  if(/^(undo|undo that|take (?:that|it) back|go back)$/.test(c)) return {kind:'undo'};
  var fix=correction(c); if(fix) return {kind:'fix',slot:fix};
  var cl=splitClauses(t); if(!cl.length) return {kind:'unknown'};
  var qs=cl.map(question); if(qs.every(Boolean)) return {kind:'ask',qs:qs};
  var steps=[];
  for(var i=0;i<cl.length;i++){ var s=parseClause(cl[i],i); if(!s) return {kind:'unknown'}; steps.push(s); }
  /* "move Bella and Max to Exam": a clause with no destination borrows the next one's */
  for(var j=steps.length-2;j>=0;j--){ var a=steps[j], b=steps[j+1]; if(a.noDest&&!b.noDest){ a.op=b.op; a.dest=b.dest; a.doc=b.doc; a.ds=b.ds; a.said=b.said; a.badDest=b.badDest; a.noDest=false; } }
  return {kind:'do',steps:steps}; }

/* ---------- answers ---------- */
function ms(v){ if(!v) return 0; if(v instanceof Date) return v.getTime(); if(v.toDate) return v.toDate().getTime(); if(typeof v.seconds==='number') return v.seconds*1000; var n=new Date(v).getTime(); return isNaN(n)?0:n; }
function dur(x){ var m=Math.max(0,Math.round(x/60000)); if(m<60) return m+' min'; var h=Math.floor(m/60); return h+' h'+(m%60?' '+(m%60)+' min':''); }
function docName(id){ var d=docs().find(function(x){ return x.id===id; }); return d?d.name:''; }
function ans(html){ return '<div class="fv-ans">'+html+'</div>'; }
function err(html){ return '<div class="fv-ans fv-err">'+html+'</div>'; }
function list(ps,fn){ return ps.length?ps.map(fn||function(p){ return pvxEsc(pName(p)); }).join(', '):'none'; }
var HELP_SHEET='<div class="fv-help"><div><b>Move</b>“Move Bella to Exam” · “Put Max in Room 3” · “Send Oscar to the back”</div>'
 +'<div><b>Doctor</b>“Give Bella to Dr. Downes” · “Dr. Koch is taking Max”</div>'
 +'<div><b>Two at once</b>“Move Max to Room 3 and give him to Dr. Downes”</div>'
 +'<div><b>Priority</b>“Make Luna critical” · “Max is P2”</div>'
 +'<div><b>Waiting on</b>“Bella is waiting on radiographs” · “Clear Bella’s flag”</div>'
 +'<div><b>Ask</b>“Who’s waiting?” · “What rooms are open?” · “How long has Max been waiting?” · “Where is Bella?”</div>'
 +'<div><b>Same names</b>“Bella in Room 4” · “Smith’s Bella” · “Bella the cat”</div>'
 +'<div><b>Fix it</b>“No, Room 4” · “Undo”</div></div>';
function answer(q){
  if(q.q==='help') return HELP_SHEET;
  var A=active();
  if(q.q==='waiting'){ var L=A.filter(function(p){ return p.status==='Waiting'; }); return ans('<b>'+L.length+' waiting:</b> '+(L.length?list(L,function(p){ return pvxEsc(pName(p))+' <small>'+dur(Date.now()-ms(p.arrival))+'</small>'; }):'no one')+'.'); }
  if(q.q==='critical'){ var C=A.filter(function(p){ return Number(p.prio)===1; }); return ans('<b>'+C.length+' critical:</b> '+(C.length?list(C,function(p){ return pvxEsc(pName(p))+' <small>'+pvxEsc(where(p))+'</small>'; }):'none')+'.'); }
  if(q.q==='who'){ if(!q.room) return err('Which room?'); var ps=A.filter(function(p){ return p.room===q.room; }); return ans(ps.length?'<b>'+pvxEsc(q.room)+':</b> '+list(ps)+'.':'<b>'+pvxEsc(q.room)+'</b> is empty.'); }
  if(q.q==='open'){ var R=roomList().filter(function(r){ return r!=='Treatment'&&!occupant(r); }); return ans(R.length?'<b>'+R.length+' open:</b> '+pvxEsc(R.join(', '))+'.':'Every room is taken right now.'); }
  if(q.q==='count'){ var by={}; A.forEach(function(p){ by[p.status]=(by[p.status]||0)+1; }); var order=['Waiting','Exam','Diagnostics','Ultrasound','Procedure','Hospitalized'];
    var parts=order.filter(function(s){ return by[s]; }).map(function(s){ return by[s]+' '+s; }); Object.keys(by).forEach(function(s){ if(order.indexOf(s)<0) parts.push(by[s]+' '+s); });
    return ans('<b>'+A.length+' on the board</b>'+(parts.length?': '+pvxEsc(parts.join(' · ')):'')+'.'); }
  if(q.q==='doctor'){ var d=findDoctor(q.said); if(!d) return err('No doctor named “'+pvxEsc(q.said)+'”.'); var D=A.filter(function(p){ return p.doctor===d.d.id; });
    return ans('<b>'+pvxEsc(d.d.name)+'</b> '+(D.length?'has '+D.length+': '+list(D,function(p){ return pvxEsc(pName(p))+' <small>'+pvxEsc(where(p))+'</small>'; })+'.':'has no patients right now.')); }
  if(q.q==='howlong'||q.q==='where'){ var M=findPatients(q.who); if(!M.length) return err('No patient named “'+pvxEsc(q.who)+'” on the board.');
    return M.map(function(x){ var p=x.p;
      if(q.q==='howlong'){ var inRoom=(p.room&&p.room!=='Lobby'&&p.roomSince)?' · '+dur(Date.now()-ms(p.roomSince))+' in '+pvxEsc(p.room):''; return ans('<b>'+pvxEsc(pName(p))+'</b> has been here '+dur(Date.now()-ms(p.arrival))+inRoom+' · '+pvxEsc(p.status)+'.'); }
      var dn=(p.doctor&&p.doctor!=='unassigned')?docName(p.doctor):''; return ans('<b>'+pvxEsc(pName(p))+'</b> is in '+pvxEsc(p.room||'Lobby')+' · '+pvxEsc(p.status)+(dn?' · '+pvxEsc(dn):' · no doctor yet')+'.'); }).join(''); }
  return err(HELP); }

/* ---------- actions ---------- */
function snapshot(p){ return {prio:p.prio, waitingOn:p.waitingOn||null, status:p.status, room:p.room, roomSince:p.roomSince, doctor:p.doctor, examStartedAt:p.examStartedAt, examStartedByDoctorId:p.examStartedByDoctorId, examWaitMinutes:p.examWaitMinutes, ultrasound:p.ultrasound, tl:(p.timeline||[]).length}; }
function restore(p,s){ p.prio=s.prio; p.waitingOn=s.waitingOn; p.status=s.status; p.room=s.room; p.roomSince=s.roomSince; var docChanged=p.doctor!==s.doctor; p.doctor=s.doctor; p.examStartedAt=s.examStartedAt; p.examStartedByDoctorId=s.examStartedByDoctorId; p.examWaitMinutes=s.examWaitMinutes; p.ultrasound=s.ultrasound;
  if(p.timeline&&p.timeline.length>s.tl) p.timeline.length=s.tl; if(docChanged){ try{ ctSyncPrimary(p); }catch(e){} }
  try{ scheduleRender(); }catch(e){ try{ renderAll(); }catch(_){} } }
function rollback(snaps){ for(var i=snaps.length-1;i>=0;i--){ var o=snaps[i][0], cur=null; try{ cur=PATIENTS.find(function(x){ return x.id===o.id; }); }catch(e){} restore(cur||o,snaps[i][1]); } }   /* PVX-N357: the patient as the board has it now */
function prioName(l){ try{ return 'P'+l+' · '+PRIO_LABEL[l]; }catch(e){ return 'P'+l; } }
function destLabel(s){ if(s.op==='prio') return prioName(s.level); if(s.op==='wait') return s.text?'Waiting on '+s.text:'No flag'; return s.op==='assign'?s.doc.name:s.dest.v; }
function fromLabel(s){ if(s.op==='prio') return prioName(s.p.prio); if(s.op==='wait') return s.p.waitingOn&&s.p.waitingOn.text?'Waiting on '+s.p.waitingOn.text:'No flag';
  if(s.op==='assign'){ return (s.p.doctor&&s.p.doctor!=='unassigned')?(docName(s.p.doctor)||'No doctor'):'No doctor'; } return s.dest.type==='status'?s.p.status:(s.p.room||'Lobby'); }
function sentence(s){ var n=pName(s.p); if(s.op==='prio') return n+' set to '+prioName(s.level); if(s.op==='wait') return s.text?n+' is waiting on '+s.text:n+'’s flag cleared';
  if(s.op==='assign') return n+' assigned to '+s.doc.name; if(s.dest.type==='room'&&/^(Room|Comfort)/.test(s.dest.v)&&s._from==='Lobby') return n+' roomed in '+s.dest.v; return 'Moved '+n+' to '+s.dest.v; }
function same(s){ if(s.op==='prio') return Number(s.p.prio)===s.level; if(s.op==='wait') return ((s.p.waitingOn&&s.p.waitingOn.text)||'')===(s.text||''); return s.op==='assign'?s.p.doctor===s.doc.id:(s.dest.type==='status'?s.p.status===s.dest.v:s.p.room===s.dest.v); }
/* Safe = easy to undo and hard to get wrong: doctor assignments, status changes (which never move a pet
   between rooms), and rooming a pet from the Lobby into an empty numbered room. Everything else asks first. */
function safe(s){ if((s.conf||0)<0.92) return false; if(s.op==='prio') return false; if(s.op==='wait') return true; if(s.op==='assign') return true; if(s.dest.type==='status') return true;
  var cur=s.p.room||'Lobby'; return /^Room \d+$/.test(s.dest.v)&&cur==='Lobby'&&!occupant(s.dest.v); }
function stepRow(s){ return '<div class="fv-row"><div class="fv-med" style="--c:'+color(s.p)+'">'+pvxEsc((s.p.name||'?')[0])+'</div><div class="fv-t"><b>'+pvxEsc(pName(s.p))+'</b><div class="fv-path"><span class="fv-pill">'+pvxEsc(fromLabel(s))+'</span> → <span class="fv-pill to">'+pvxEsc(destLabel(s))+'</span></div></div></div>'; }
function choose(M,raw,cb){
  pending={kind:'choose'};
  show(heard(raw)+ans('Which '+pvxEsc(M[0].p.name)+'?')+'<div class="fv-choices">'+M.slice(0,4).map(function(x){ var p=x.p; return '<button class="fv-choice" type="button" data-id="'+pvxEsc(p.id)+'"><span class="fv-med" style="--c:'+color(p)+'">'+pvxEsc((p.name||'?')[0])+'</span><span>'+pvxEsc(pName(p))+'<small>'+pvxEsc(where(p))+'</small></span></button>'; }).join('')+'</div>');
  inner.querySelectorAll('[data-id]').forEach(function(b){ b.onclick=function(){ var x=M.find(function(y){ return String(y.p.id)===b.getAttribute('data-id'); }); if(x) cb(x.p); }; });
}
function resolveAll(steps,raw){
  var out=[], lastP=null;
  (function next(i){
    if(i>=steps.length) return plan(out,raw);
    var s=steps[i];
    if(s.noDest) return show(heard(raw)+err('Move '+pvxEsc(s.who)+' where?'));
    if(s.badDest){ stat('bad_dest'); statWord('dest',s.badDest); } if(s.badDest) return show(heard(raw)+err('I didn’t catch where: “'+pvxEsc(s.badDest)+'”. Try Exam, Room 3, Ultrasound or Treatment.'));
    if(s.op==='assign'&&!s.doc&&/busy|available|free|next|whoever/.test(s.said||'')) return show(heard(raw)+err('Nobody is on today’s shift list yet. Set today’s shift assignments first.'));
    if(s.op==='assign'&&!s.doc) return show(heard(raw)+err('No doctor named “'+pvxEsc(s.said)+'”.'));
    if(s.op==='dest'&&s.dest.type==='room'&&roomList().indexOf(s.dest.v)<0&&s.dest.v!=='Treatment') return show(heard(raw)+err('There’s no '+pvxEsc(s.dest.v)+'.'));
    if(s.op==='prio'&&!s.level) return show(heard(raw)+err('Which priority? Critical, urgent or stable.'));
    var take=function(p,score){ lastP=p; out.push({op:s.op,p:p,dest:s.dest,doc:s.doc,level:s.level,text:s.text,conf:Math.min(score,s.op==='assign'?(s.ds||0):1)}); next(i+1); };
    if(PRONOUN.test(s.who)){ var pp=lastP||(ctx&&Date.now()-ctx.at<120000?ctx.steps[ctx.steps.length-1].p:null); if(!pp) return show(heard(raw)+err('Who do you mean?')); return take(pp,1); }
    var M=findPatients(s.who);
    if(!M.length){ stat('no_patient'); return show(heard(raw)+err('No patient named “'+pvxEsc(s.who)+'” on the board.')); }
    if(M.length===1) return take(M[0].p,M[0].s);
    choose(M,raw,function(p){ take(p,1); });
  })(0);
}
function plan(steps,raw){
  for(var i=0;i<steps.length;i++){ var s=steps[i]; if(s.op==='dest'&&s.dest.type==='room'&&s.dest.v!=='Treatment'){ var o=occupant(s.dest.v);
    var leaving=o&&steps.some(function(x){ return x.p===o&&x.op==='dest'&&x.dest.type==='room'&&x.dest.v!==s.dest.v; });
    if(o&&o!==s.p&&!leaving) return show(heard(raw)+err(pvxEsc(s.dest.v)+' has '+pvxEsc(pName(o))+' in it.')); } }
  var real=steps.filter(function(s){ return !same(s); });
  if(!real.length) return show(heard(raw)+ans(steps.map(function(s){ return pvxEsc(pName(s.p))+' is already '+(s.op==='prio'?pvxEsc(prioName(s.level)):s.op==='wait'?(s.text?'flagged waiting on '+pvxEsc(s.text):'unflagged'):s.op==='assign'?'with '+pvxEsc(s.doc.name):'in '+pvxEsc(s.dest.v)); }).join('. ')+'.'));
  stat('understood');
  if(real.every(safe)) return run(real,raw,true);
  propose(real,raw);
}
function propose(steps,raw){
  pending={steps:steps,raw:raw}; ctx={steps:steps,raw:raw,at:Date.now(),done:false};
  var one=steps.length===1, s=steps[0];
  var head=one?'<div class="fv-med" style="--c:'+color(s.p)+'">'+pvxEsc((s.p.name||'?')[0])+'</div><div class="fv-t"><b>'+pvxEsc((s.op==='prio'?'Priority · ':s.op==='wait'?'Flag · ':s.op==='assign'?'Assign ':(s.dest.type==='room'&&/^(Room|Comfort)/.test(s.dest.v)?'Room ':'Move '))+pName(s.p))+'</b><div class="fv-path"><span class="fv-pill">'+pvxEsc(fromLabel(s))+'</span> → <span class="fv-pill to">'+pvxEsc(destLabel(s))+'</span></div></div>'
    :'<div class="fv-t"><b>'+steps.length+' changes</b></div>';
  show(heard(raw)+'<div class="fv-act">'+head+'<div class="fv-btns"><button class="fv-no" type="button">Cancel</button><button class="fv-ok" type="button">'+(one?(s.op==='prio'?'Set priority':s.op==='wait'?(s.text?'Flag':'Remove flag'):s.op==='assign'?'Assign':'Move'):'Make '+steps.length+' changes')+'</button></div></div>'+(one?'':'<div class="fv-list">'+steps.map(stepRow).join('')+'</div>')+'<div class="fv-sub">'+(via==='typed'?'Press Return to confirm. Type “no, Room 4” to change it.':'Enter or “yes” to confirm. Say “no, Room 4” to change it.')+'</div>');
  inner.querySelector('.fv-ok').onclick=confirm; inner.querySelector('.fv-no').onclick=function(){ stat('cancelled'); hide(); };
  /* after a spoken command, keep listening a few seconds for “yes”, “no” or “no, Room 4” */
  if(via==='voice'&&ENABLED&&navigator.onLine&&!listening) setTimeout(function(){ if(pending&&pending.steps&&!listening) start(true,true); },350);
}
function confirm(){ var a=pending; if(!a||!a.steps) return; run(a.steps,a.raw,false); }
function userName(){ try{ return (typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):''; }catch(e){ return ''; } }
/* Every change made by voice or a typed command is marked in the patient's timeline, with who was signed in. */
function tagTimeline(p,from){ if(via!=='voice'&&via!=='typed') return; var tl=p.timeline||[], u=userName();
  for(var k=from;k<tl.length;k++){ var e=tl[k]; if(e&&!e.fvTagged){ e.fvTagged=1; e.meta=(e.meta?e.meta+' · ':'')+(via==='typed'?'typed command':'voice')+(u?' · '+u:''); } } }
function setWaiting(p,text){ var at=new Date(); p.waitingOn=text?{text:String(text).slice(0,40), at:at.toISOString(), by:userName()}:null;
  (p.timeline=p.timeline||[]).push({label:text?'Waiting on '+text:'Waiting-on flag cleared', at:at, meta:''});
  try{ notify(text?'Waiting on '+pvxEsc(text):'Flag cleared', pvxEsc(pName(p)), {icon:'info', color:'var(--accent)'}); }catch(e){}
  try{ scheduleRender(function(){ try{ if(activePatient===p.id) fillDrawer(p); }catch(e){} }); }catch(e){ try{ renderAll(); }catch(_){} } }
/* Small chip on the Flow card; click it to clear (with Undo). */
window.fvWaitChip=function(p){ var w=p&&p.waitingOn; if(!w||!w.text) return ''; var mins=Math.max(0,Math.round((Date.now()-new Date(w.at).getTime())/60000));
  var ago=isNaN(mins)?'':(mins<1?'now':mins<60?mins+'m':Math.floor(mins/60)+'h'), said=isNaN(mins)?'':(mins<1?', just now':', '+(typeof pvxSpoken==='function'?pvxSpoken(mins):mins+' minutes'));   /* PVX-N357: a real button that says what it does */
  return '<button type="button" class="fv-wait-chip" data-fvwait="'+pvxEsc(p.id)+'" title="Clear “Waiting on '+pvxEsc(w.text)+'”" aria-label="Waiting on '+pvxEsc(w.text)+said+'. Clear"><i></i><span class="fvw-t">Waiting on '+pvxEsc(w.text)+'</span><small>'+ago+'</small><svg class="fvw-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>'; };
document.addEventListener('click',function(e){ var c=e.target&&e.target.closest&&e.target.closest('[data-fvwait]'); if(!c) return; e.preventDefault(); e.stopPropagation();
  var p=active().find(function(x){ return String(x.id)===c.getAttribute('data-fvwait'); }); if(!p) return; via='board'; run([{op:'wait',p:p,text:'',conf:1}],'',true); },true);
function run(steps,raw,instant){
  if(listening){ sessionId++; stop(); }
  var snaps=[], done=[];
  for(var i=0;i<steps.length;i++){ var s=steps[i];
    if(!isActive(s.p)){ rollback(snaps); pending=null; return show(err(pvxEsc(pName(s.p))+' is no longer on the board.')); }
    s._from=s.p.room||'Lobby'; snaps.push([s.p,snapshot(s.p)]);
    try{
      if(s.op==='prio'){ setPriority(s.p,s.level); }
      else if(s.op==='wait'){ setWaiting(s.p,s.text); }
      else if(s.op==='assign'){ if(s.p.doctor!==s.doc.id) assignDoctor(s.p,s.doc.id); }
      else if(s.dest.type==='status'){ if(s.p.status!==s.dest.v) moveStatus(s.p,s.dest.v); }
      else if(s.p.room!==s.dest.v){ if(!canDropRoom(s.p,s.dest.v)){ rollback(snaps); pending=null; var o=occupant(s.dest.v); return show(heard(raw)+err(pvxEsc(s.dest.v)+(o?' has '+pvxEsc(pName(o))+' in it.':' isn’t available.'))); } moveRoom(s.p,s.dest.v); }
      tagTimeline(s.p,snaps[snaps.length-1][1].tl); done.push(s);
    }catch(e){ rollback(snaps); pending=null; return show(err('That didn’t work. Try again or use the board.')); }
  }
  stat(instant?'instant':'confirmed'); hide();
  ctx={steps:steps,raw:raw,at:Date.now(),done:true,snaps:snaps};
  undoFn=function(){ rollback(snaps); ctx=null; stat('undone'); toast('Undone'); };
  var groups=[]; done.forEach(function(s){ var g=groups[groups.length-1]; if(g&&g.p===s.p) g.d.push(destLabel(s)); else groups.push({p:s.p,d:[destLabel(s)]}); });
  toast(done.length===1?sentence(done[0]):groups.map(function(g){ return pName(g.p)+' → '+g.d.join(', '); }).join(' · '),true,instant?5000:7000);
}
function applyFix(slot,raw){
  var c=(pending&&pending.steps)?{steps:pending.steps,done:false}:((ctx&&Date.now()-ctx.at<60000)?ctx:null);
  if(!c) return show(heard(raw)+err('Nothing to change right now.'));
  var steps=c.steps.map(function(s){ return {op:s.op,p:s.p,dest:s.dest,doc:s.doc,level:s.level,text:s.text,conf:s.conf}; });
  var idx=-1, k;
  if(slot.doc){ for(k=steps.length-1;k>=0;k--) if(steps[k].op==='assign'){ idx=k; break; } if(idx<0) idx=steps.length-1; steps[idx].op='assign'; steps[idx].doc=slot.doc; steps[idx].dest=null; steps[idx].conf=Math.min(1,slot.ds||1); }
  else if(slot.dest){ for(k=steps.length-1;k>=0;k--) if(steps[k].op==='dest'){ idx=k; break; } if(idx<0) idx=steps.length-1; steps[idx].op='dest'; steps[idx].dest=slot.dest; steps[idx].doc=null;
    if(slot.dest.type==='room'&&roomList().indexOf(slot.dest.v)<0&&slot.dest.v!=='Treatment') return show(heard(raw)+err('There’s no '+pvxEsc(slot.dest.v)+'.')); }
  var go=function(np){ if(np){ var old=steps[steps.length-1].p; steps.forEach(function(s){ if(s.p===old) s.p=np; }); }
    if(c.done){ rollback(c.snaps); undoFn=null; } pending=null; stat('corrected'); plan(steps,raw); };
  if(slot.who){ var M=findPatients(slot.who); if(!M.length) return show(heard(raw)+err('No patient named “'+pvxEsc(slot.who)+'” on the board.')); if(M.length>1) return choose(M,raw,function(p){ go(p); }); return go(M[0].p); }
  go(null);
}
function handle(raw,opts){
  via=(opts&&opts.typed)?'typed':'voice'; stat(via==='typed'?'typed':'heard');
  var u=understand(raw);
  if(u.kind==='yes'){ if(pending&&pending.steps) confirm(); return; }
  if(u.kind==='no'){ if(pending&&pending.steps) stat('cancelled'); hide(); return; }
  if(u.kind==='undo'){ if(undoFn){ var f=undoFn; undoFn=null; f(); hide(); } else show(heard(raw)+err('Nothing to undo.')); return; }
  if(u.kind==='fix') return applyFix(u.slot,raw);
  if(u.kind==='ask'){ stat('understood'); pending=null; return show(heard(raw)+u.qs.map(answer).join('')); }
  if(u.kind==='unknown'){ stat('unknown'); statWord('unk',flat(norm(raw)).split(' ')[0]); return show(heard(raw)+err(HELP)); }
  resolveAll(u.steps,raw);
}

/* ---------- typed commands in the search bar ---------- */
var CMD_START=/^(no|nope|actually|make|mark|set|bump|change|flag|clear|remove|move|send|take|bring|put|walk|assign|give|hand|who|who's|whos|what|what's|how|where|where's|which|undo|is there|are there|any)\s/;
var CMD_ALT=/\s(?:is|are)\s+(?:still\s+)?waiting\s+(?:on|for)\s|\sis\s+(?:now\s+)?(?:critical|urgent|stable|p\s?[123])$/;
function typedCommand(q){ var t=flat(norm(q)); if(t==='undo') return {kind:'undo'}; if(t==='help'||t==='commands') return understand(t); if(!(CMD_START.test(t+' ')||CMD_ALT.test(t))||t.split(' ').length<2) return null;
  var u=understand(q); if(u.kind==='ask'||u.kind==='undo') return u;
  if(u.kind==='fix') return ((pending&&pending.steps)||(ctx&&Date.now()-ctx.at<60000))?u:null;
  if(u.kind!=='do') return null;
  for(var i=0;i<u.steps.length;i++){ var s=u.steps[i]; if(s.noDest||s.badDest||(s.op==='assign'&&!s.doc)||(s.op==='prio'&&!s.level)) return null; if(!PRONOUN.test(s.who)&&!findPatients(s.who).length) return null; }
  return u; }
function describe(u,q){
  if(u.kind==='undo') return {t:'Undo the last change', s:'Command'};
  if(u.kind==='fix'){ var sl=u.slot; return {t:'Change it to '+(sl.doc?sl.doc.name:sl.dest?sl.dest.v:sl.who), s:'Correction'}; }
  if(u.kind==='ask') return {t:u.qs[0].q==='help'?'Show what I can say':q.trim().replace(/\?*$/,'?'), s:'Ask Flow'};
  var last=null; return {t:u.steps.map(function(s){ var n; if(PRONOUN.test(s.who)) n=last?last:'them'; else { var M=findPatients(s.who); n=M.length?pName(M[0].p):s.who; last=n; } return n+' → '+(s.op==='prio'?prioName(s.level):s.op==='wait'?(s.text?'Waiting on '+s.text:'Clear flag'):s.op==='assign'?s.doc.name:s.dest.v); }).join('\n'), s:u.steps.length>1?u.steps.length+' changes':'Command'}; }
var CMD_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 10l-5 5 5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>';
function cmdHint(q){
  var box=document.getElementById('searchResults'); if(!box) return;
  var old=box.querySelector('.fv-cmd-g'); if(old) old.remove();
  var t=flat(norm(q)); if(!CMD_START.test(t+' ')&&!CMD_ALT.test(t)) return;
  /* a command is not a search: keep the board unfiltered while it's being typed */
  try{ if(typeof searchQ!=='undefined'&&searchQ){ searchQ=''; renderTable(); renderBoard(); } }catch(e){}
  var u=typedCommand(q), inr=box.querySelector('.sr-inner');
  if(!inr){ box.innerHTML='<div class="sr-inner"></div>'; inr=box.firstChild; }
  var none=inr.querySelector('.sr-none'); if(none) none.remove();
  var d=u?describe(u,q):{t:'Keep typing, like “move Bella to Exam”', s:'Command'};
  inr.insertAdjacentHTML('afterbegin','<div class="sr-group fv-cmd-g"><div class="sr-label">'+pvxEsc(d.s)+'</div><div class="fv-cmd'+(u?' ready':'')+'"><span class="sr-ic">'+CMD_ICON+'</span><div class="sr-main"><div class="sr-t">'+pvxEsc(d.t)+'</div></div>'+(u?'<kbd>return</kbd>':'')+'</div></div>');
  box.classList.add('open'); try{ positionSearchResults(); }catch(e){}
  var row=inr.querySelector('.fv-cmd.ready'); if(row) row.onclick=function(){ runTyped(); };
}
function runTyped(){ var el=document.getElementById('globalSearch'); if(!el) return false; var q=el.value; if(!typedCommand(q)) return false;
  el.value=''; try{ searchQ=''; closeSearch(); renderTable(); renderBoard(); }catch(e){} el.blur(); handle(q,{typed:true}); return true; }
document.addEventListener('input',function(e){ if(e.target&&e.target.id==='globalSearch') cmdHint(e.target.value); });
document.addEventListener('keydown',function(e){ if(e.key!=='Enter'||!e.target||e.target.id!=='globalSearch'||e.isComposing) return;
  if(typedCommand(e.target.value)){ e.preventDefault(); e.stopImmediatePropagation(); runTyped(); } },true);

/* ---------- microphone ---------- */
var TIP_KEY='flowVoiceTip';
function start(tap,cm){
  if(!ENABLED||listening) return; tapMode=!!tap; confirmMode=!!cm;
  if(!SR){ show('<div class="fv-ans fv-err">Voice needs Chrome or Safari on this computer.</div>'); return; }
  if(!navigator.onLine){ if(!cm) show('<div class="fv-ans fv-err">Voice needs internet. You can still type commands in the search bar.</div>'); return; }
  listening=true; finalText=''; interim=''; startedAt=Date.now();
  setOn(true); clearTimeout(maxT); maxT=setTimeout(function(){ if(listening) stop(); },cm?5000:15000);
  if(live){ if(!cm){ hide();
      /* first time on this computer: a one-time tip with three things to try */
      var seen=true; try{ seen=!!localStorage.getItem(TIP_KEY); if(!seen) localStorage.setItem(TIP_KEY,'1'); }catch(e){}
      if(!seen) show('<div class="fv-tip"><b>Try saying</b><span>“Move Bella to Exam”</span><span>“What rooms are open?”</span><span>“How long has Max been waiting?”</span><small>Say “what can I say?” anytime for the full list.</small></div>'); } }
  else { show('<div class="fv-heard" id="fvLive">Listening…</div>'+wave()); animate(); }
  if(cm) armSilence(4000);
  meterStart();
  rec=new SR(); rec._id=++sessionId; rec.lang='en-US'; rec.interimResults=true; rec.continuous=true;
  rec.onresult=function(e){ interim=''; for(var i=e.resultIndex;i<e.results.length;i++){ var r=e.results[i]; if(r.isFinal) finalText+=r[0].transcript+' '; else interim+=r[0].transcript; }
    var said=(finalText+interim).trim(); meter.syn=.7; if(live) liveText(said); var l=document.getElementById('fvLive'); if(l) l.innerHTML='<q>'+pvxEsc(said)+'</q>'; if(tapMode) armSilence(1400); };
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
  if(ENABLED&&e.code==='Space'&&!typing()&&!e.metaKey&&!e.ctrlKey&&!e.altKey){ e.preventDefault(); e.stopPropagation(); if(!e.repeat){ if(listening&&tapMode) stop(); else start(false); } return; }
  if(e.key==='Enter'&&panel&&panel.classList.contains('show')&&pending&&pending.steps&&!typing()){ e.preventDefault(); confirm(); return; }
  if(e.key==='Escape'&&panel&&panel.classList.contains('show')){ hide(); }
},true);
document.addEventListener('keyup',function(e){ if(e.code==='Space'&&listening&&!tapMode){ e.preventDefault(); stop(); } },true);
/* PVX-N348 - HIG Playing audio, handling interruptions: when Flow goes to the background, or the window loses focus while Space is held,
   the microphone closes and nothing half-heard is acted on (before, it stayed open for up to 15 s and then ran what it heard). */
function interrupted(why){ if(!listening) return; if(why==='blur'&&tapMode) return; sessionId++; stop(); hide(); try{ if(window.pvxSay) pvxSay('Stopped listening'); }catch(e){} }
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') interrupted('hidden'); });
window.addEventListener('pagehide',function(){ interrupted('hidden'); }); window.addEventListener('blur',function(){ interrupted('blur'); });
window.__pvxVoiceInterrupted=interrupted;
document.addEventListener('pointerdown',function(e){ if(panel&&panel.classList.contains('show')&&!panel.contains(e.target)&&(!talk||(e.target!==talk&&!talk.contains(e.target)))&&!(pending&&pending.steps)) hide(); },true);

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
window.__flowVoice={understand:understand, findPatients:findPatients, handle:handle, confirm:confirm, stats:stats};
/* PVX-N349 - HIG Settings: Talk to Flow on or off for this screen, from the + menu */
function voiceSync(){ if(talk) talk.hidden=!ENABLED; }
window.pvxVoice={can:function(){ return !!SR&&!LOBBY; }, on:function(){ return !!ENABLED; },
  set:function(v){ ENABLED=!!v&&!!SR; try{ if(ENABLED) localStorage.removeItem(KEY); else localStorage.setItem(KEY,'off'); }catch(e){}
    if(!ENABLED&&listening){ sessionId++; stop(); hide(); } voiceSync(); return ENABLED; }};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(voiceSync,0); }); else setTimeout(voiceSync,0);
})();