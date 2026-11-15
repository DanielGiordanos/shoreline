/* ═════════ flow-round2-oct6 ═════════ */
/* Text that can come from the public check-in iPad. Every display point escapes, so ordinary characters (< > & quotes)
   are never touched; only control characters (→ a space; line breaks kept where asked) and invisible zero-width /
   direction-override characters (removed) go. Joiners stay, so emoji sequences survive. */
function fxClean(v,lines){ if(typeof v!=='string') return v;
  return v.replace(lines?/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2028\u2029]/g:/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g,' ')
    .replace(/[\u200B\u202A-\u202E\u2066-\u2069\uFEFF]/g,''); }
function fxCleanPatient(o){ if(!o) return o;
  ['name','last','owner','ownerPhone','breed','species','sex','age','ageDisplay','weight','referringHospital'].forEach(k=>{ if(typeof o[k]==='string') o[k]=fxClean(o[k]); });
  ['reason','transferNotes'].forEach(k=>{ if(typeof o[k]==='string') o[k]=fxClean(o[k],true); });
  if(Array.isArray(o.reasonProblems)) o.reasonProblems.forEach(x=>{ if(x&&typeof x==='object'){ ['label','originalInput','durationText','frequencyText','onsetText'].forEach(k=>{ if(typeof x[k]==='string') x[k]=fxClean(x[k]); }); } });
  return o; }

/* Already checked in? Same pet name and the same owner or phone, on a visit that hasn't ended. */
function fxKey(v){ const t=String(v==null?'':v).toLowerCase().replace(/\s+/g,' ').trim(); return t==='—'?'':t; }
function fxDigits(v){ return String(v==null?'':v).replace(/\D/g,'').slice(-10); }
function fxDupFind(f){
  const nm=fxKey((f.name||'')+' '+(f.last||'')); if(!nm) return null; const ow=fxKey(f.owner), ph=fxDigits(f.ownerPhone);
  return PATIENTS.find(p=>!p.completed&&!isCompleted(p)&&fxKey((p.name||'')+' '+(p.last||''))===nm
    &&((ow&&fxKey(p.owner)===ow)||(ph.length>=7&&fxDigits(p.ownerPhone)===ph)))||null; }
function fxDupAsk(f,go){
  const ex=fxDupFind(f); if(!ex) return false;
  const nm=((ex.name||'')+' '+(ex.last||'')).trim();
  showConfirm(nm+' is already checked in.','Open existing',()=>{ closeAddPatient(); openDrawer(ex.id); },   /* PVX-N209: Cancel never adds */
    {sub:'Owner '+(ex.owner||'—')+' · '+(ex.status||'')+' · '+(ex.room||'Lobby')+(ex.arrival instanceof Date?' · arrived '+fmtTime(ex.arrival):'')+'. Choose Add new visit only if this is a different pet.',
     alt:{label:'Add new visit', act:go}});
  return true; }
function fxCommitChecked(f){ if(fxDupAsk(f,()=>commitPatient(f))) return null; return commitPatient(f); }
