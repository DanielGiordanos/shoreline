/* ═════════ ROUNDS n118 — two people on one patient's rounds, and undo for removals (Oct 2026) ═════════
   1. Saving rounds merges instead of replacing. Before, a patient's whole `rounds` was one field: when two people changed different
      parts at the same time (a doctor writing the plan, a tech ticking a task), the later save wrote back its own copy and the other
      change was lost. Now each rounds save is a short transaction: read what the database has, lay this screen's changes (what it
      changed since it last heard from the database) on top, write the result. Problems, events, diagnostics, treatments, tasks,
      contingencies, flags and the care team merge item by item (by id); lists without ids (the audit, trend values) merge by value;
      single values take the change, and if both people changed the very same value the later save wins, as before.
      Saves for one patient go one after another, so a screen never merges against its own earlier save. Offline (a transaction needs
      the server) it falls back to the plain save it always did. While a save is on its way, a copy arriving from another screen does
      not undo what is on this screen.
   2. Removing a problem, event, diagnostic, treatment, task, contingency or flag shows "… removed · Undo" for 8 seconds; Undo puts it
      back where it was (and says so in the audit). */
(function(){
if(typeof window.fvSaveVisit!=='function'||typeof rdHandleAct!=='function') return;
var RDM_TAKE={snapshots:1,lastReviewSnapshot:1,summary:1};   /* derived from the rest: the newer save's copy, not merged piece by piece */
function J(x){ return JSON.stringify(x===undefined?null:x); }
function eq(a,b){ return J(a)===J(b); }
function isObj(x){ return x&&typeof x==='object'&&!Array.isArray(x); }
function idList(a){ return Array.isArray(a)&&a.every(function(x){ return isObj(x)&&x.id!=null; }); }
/* three-way merge: b = what this screen last heard from the database, m = this screen now, t = the database now */
function merge(b,m,t,key){
  if(eq(m,b)) return t;            /* this screen didn't touch it */
  if(eq(t,b)||eq(m,t)) return m;   /* nobody else did */
  if(key&&RDM_TAKE[key]) return m;
  if(Array.isArray(m)||Array.isArray(t)) return mergeArr(b,m,t);
  if(isObj(m)&&isObj(t)){ var out={}, B=isObj(b)?b:{}, keys={};
    [B,m,t].forEach(function(o){ Object.keys(o).forEach(function(k){ keys[k]=1; }); });
    Object.keys(keys).forEach(function(k){ var v=merge(B[k],m[k],t[k],key?null:k); if(v!==undefined) out[k]=v; });
    return out; }
  return m;                        /* both changed the same value: the later save wins */
}
function mergeArr(b,m,t){ b=Array.isArray(b)?b:[]; m=Array.isArray(m)?m:[]; t=Array.isArray(t)?t:[];
  if(idList(b)&&idList(m)&&idList(t)){
    var B={}, M={}, T={}; b.forEach(function(x){ B[x.id]=x; }); m.forEach(function(x){ M[x.id]=x; }); t.forEach(function(x){ T[x.id]=x; });
    var out=[];
    t.forEach(function(x){ var id=x.id;
      if(B[id]&&!M[id]) return;                                      /* removed here */
      out.push(B[id]&&M[id]&&!eq(B[id],M[id])?merge(B[id],M[id],x):x); });
    m.forEach(function(x){ var id=x.id; if(T[id]) return;
      if(!B[id]) out.push(x);                                         /* added here */
      else if(!eq(B[id],x)) out.push(x); });                          /* changed here, removed there: keep the change */
    /* this screen reordered (Rounds drag / ↑): its order for the items both have */
    var bo=b.map(function(x){ return x.id; }).filter(function(id){ return M[id]; }), mo=m.map(function(x){ return x.id; }).filter(function(id){ return B[id]; });
    if(!eq(bo,mo)){ var pos={}; m.forEach(function(x,i){ pos[x.id]=i; });
      out=out.map(function(x,i){ return [x,i]; }).sort(function(p,q){ var a=pos[p[0].id], c=pos[q[0].id]; if(a==null&&c==null) return p[1]-q[1]; if(a==null) return 1; if(c==null) return -1; return a-c; }).map(function(p){ return p[0]; }); }
    return out; }
  /* no ids (audit lines, trend points, payers): theirs, plus what was added here, minus what was removed here */
  var bs={}, ms={}; b.forEach(function(x){ bs[J(x)]=(bs[J(x)]||0)+1; }); m.forEach(function(x){ ms[J(x)]=1; });
  var res=t.filter(function(x){ var k=J(x); return !(bs[k]&&!ms[k]); }), have={}; res.forEach(function(x){ have[J(x)]=1; });
  m.forEach(function(x){ var k=J(x); if(!bs[k]&&!have[k]){ res.push(x); have[k]=1; } });
  return res; }
window.rdmMerge=merge;   /* tests */

/* ---------- saving: rounds by transaction, one after another per patient ---------- */
var chain={}, pending={};
function who(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} var n=''; try{ n=(typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):''; }catch(e){} return {uid:(u&&u.uid)||'',name:n||(u&&u.email)||''}; }
function saveRounds(id,base,mine){ var P=pending[id]=pending[id]||[]; var job={base:base,mine:mine}; P.push(job);
  var ref=DB.collection('visits').doc(String(id)), w=who(), stamp={last_by:w.name||null,last_by_uid:w.uid||null,last_at:new Date().toISOString()};
  chain[id]=(chain[id]||Promise.resolve()).then(function(){
    return DB.runTransaction(function(t){ return t.get(ref).then(function(s){ var cur=s&&s.exists?((s.data()||{}).rounds||null):null;
      var merged=cur?merge(job.base,job.mine,cur):job.mine; job.merged=merged; t.update(ref,Object.assign({rounds:merged},stamp)); }); })
    .catch(function(err){ console.warn('[rounds] merge save failed — saving this screen’s copy',(err&&err.message)||err);
      return ref.update(Object.assign({rounds:job.mine},stamp)).catch(function(e){ console.warn('[rounds] save',e); }); }); })
  .then(function(){ var i=P.indexOf(job); if(i>-1) P.splice(i,1); }); }
var saveBase=window.fvSaveVisit;
window.fvSaveVisit=function(batch,p,prev){
  var row=mapToDb(p), old=null; try{ old=prev[row.id]?JSON.parse(prev[row.id]):null; }catch(e){ old=null; }
  if(old&&old.rounds&&row.rounds&&!eq(old.rounds,row.rounds)){
    saveRounds(row.id,JSON.parse(J(old.rounds)),JSON.parse(J(row.rounds)));
    var p2=Object.assign({},prev); p2[row.id]=J(Object.assign({},old,{rounds:row.rounds}));   /* everything else as before, without rounds */
    return saveBase(batch,p,p2); }
  return saveBase(batch,p,prev); };
/* a copy from another screen arriving while this screen's rounds save is on its way: keep this screen's changes on top */
var resusBase=Backend._mergeResus;
Backend._mergeResus=function(){ var r=resusBase.apply(this,arguments);
  try{ Object.keys(pending).forEach(function(id){ var P=pending[id]; if(!P||!P.length) return; var p=PATIENTS.find(function(x){ return String(x.id)===String(id); }); if(!p||!p.rounds) return;
    var cur=JSON.parse(J(rdToDb(p.rounds))); P.forEach(function(job){ cur=merge(job.base,job.mine,cur); }); p.rounds=rdNorm(cur); }); }catch(e){ console.warn('[rounds] keep',e); }
  return r; };

/* ---------- undo for removals ---------- */
var DEL={'prob-del':['problems','Problem'],'ev-del':['events','Event'],'diag-del':['diagnostics','Diagnostic'],'tx-del':['treatments','Treatment'],
  'task-del':['tasks','Task'],'cont-del':['contingencies','Contingency'],'flag-del':['flags','Flag']};
var actBase=rdHandleAct, undoT=null;
function nameOf(x){ return (x&&(x.label||x.name||x.text||(x.trigger?'if '+x.trigger:'')))||''; }
function toastEl(){ var t=document.getElementById('rdUndo'); if(!t){ t=document.createElement('div'); t.id='rdUndo'; t.className='rd-undo'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); } return t; }
function hide(){ var t=document.getElementById('rdUndo'); if(t) t.classList.remove('open'); clearTimeout(undoT); }
var last=null, undoLeft=0, undoAt=0, MAC=/Mac|iP(hone|ad|od)/.test(navigator.platform||navigator.userAgent||'');
/* n304: a removal goes into the suite's one undo history (PVX-N202), so ⌘Z / Ctrl+Z brings it back even after the bar has gone */
function put(L){ hide(); if(last===L) last=null; var p=rdFind(L.pid), r=p&&p.rounds; if(!r) return false; r[L.arr]=r[L.arr]||[];
  if(!r[L.arr].some(function(x){ return x.id===L.item.id; })) r[L.arr].splice(Math.min(L.idx,r[L.arr].length),0,L.item);
  rdTouch(p,L.word+' restored'+(L.nm?' · '+L.nm:'')); return true; }
/* n304 (HIG Accessibility, time-boxed elements): pointing at the bar or moving focus into it stops the clock; leaving gives back the time it had, at least 4 s */
function pause(){ var t=document.getElementById('rdUndo'); if(!t||!t.classList.contains('open')||t.dataset.paused) return; clearTimeout(undoT); undoLeft=Math.max(0,undoLeft-(Date.now()-undoAt)); t.dataset.paused='1'; }
function resume(){ var t=document.getElementById('rdUndo'); if(!t||!t.dataset.paused) return; if(t.matches(':hover')||t.contains(document.activeElement)) return; delete t.dataset.paused; undoAt=Date.now(); undoLeft=Math.max(undoLeft,4000); clearTimeout(undoT); undoT=setTimeout(hide,undoLeft); }
function offer(pid,arr,word,item,idx){ var t=toastEl(), nm=nameOf(item), L={pid:pid,arr:arr,word:word,item:item,idx:idx,nm:nm};
  last=L; L.entry=window.pvxUndo?pvxUndo.push({label:word+' removed',undo:function(){ return put(L); }}):null;
  t.innerHTML='<span class="ru-msg"></span><button type="button" class="ru-undo" aria-keyshortcuts="'+(MAC?'Meta+Z':'Control+Z')+'">Undo<kbd class="ru-key" aria-hidden="true">'+(MAC?'⌘Z':'Ctrl+Z')+'</kbd></button><span class="ru-bar" aria-hidden="true"></span>';
  t.querySelector('.ru-msg').textContent=word+' removed'+(nm?' · '+(nm.length>40?nm.slice(0,40)+'…':nm):'');
  delete t.dataset.paused; t.classList.remove('open'); void t.offsetWidth; t.classList.add('open');
  if(!t.dataset.n304){ t.dataset.n304='1'; t.addEventListener('mouseenter',pause); t.addEventListener('focusin',pause); t.addEventListener('mouseleave',function(){ setTimeout(resume,0); }); t.addEventListener('focusout',function(){ setTimeout(resume,0); }); }
  t.querySelector('.ru-undo').onclick=function(){ if(L.entry&&window.pvxUndo&&pvxUndo.undoEntry(L.entry)) return; put(L); };
  undoLeft=8000; undoAt=Date.now(); clearTimeout(undoT); undoT=setTimeout(hide,8000); }
rdHandleAct=function(act,el){ var d=DEL[act]; if(!d||!el||!el.dataset) return actBase.apply(this,arguments);
  var pid=el.dataset.pid, id=el.dataset.id, p=pid?rdFind(pid):null, L=(p&&p.rounds&&p.rounds[d[0]])||[], idx=L.findIndex(function(x){ return x.id===id; }), item=idx>-1?JSON.parse(J(L[idx])):null;
  var out=actBase.apply(this,arguments);
  if(item&&p&&!(p.rounds[d[0]]||[]).some(function(x){ return x.id===id; })) offer(pid,d[0],d[1],item,idx);
  return out; };
window.rdmUndoHide=hide;
})();