
/* CPR/DNR from the family's tracker (pub) is a request: staff confirm it before it becomes the badge.
   No clock comparison (a family phone's clock can be behind the staff record): a pub value is ignored only when it is
   exactly a state staff had on record — the current one, one in the history, or one this screen replaced (a stale copy of
   our own write still on its way out of pub). */
var _fxStaffResus={};   /* tracker token → { 'CPR|<iso>':1 } states this screen replaced */
function fxIso(v){ if(!v) return ''; try{ if(v.toDate) v=v.toDate(); const d=new Date(v); return isNaN(d.getTime())?String(v):d.toISOString(); }catch(e){ return String(v); } }
function fxResusKey(pref,at){ return (pref||'')+'|'+fxIso(at); }
function fxStaffKnows(p,pref,at){ const k=fxResusKey(pref,at);
  if(fxResusKey(p.resusPref,p.resusRecordedAt)===k) return true;
  if((p.resusHistory||[]).some(h=>h&&h.source!=='client_tracker'&&fxResusKey(h.pref,h.at)===k)) return true;
  return !!(_fxStaffResus[p.publicToken]&&_fxStaffResus[p.publicToken][k]); }
function fxResusFromPub(p,r){
  if(!p||!r) return; const pref=normalizeResusPref(r.pref); if(!pref) return;
  const at=fxIso(r.at)||null;
  if(pref===p.resusPref){ if(p.resusRequest&&!fxStaffKnows(p,pref,at)) p.resusRequest=null; return; }   /* the family went back to what's on record */
  if(p.resusRequest&&p.resusRequest.pref===pref) return;                                                 /* already waiting */
  if(p.resusRequestDismissed===fxResusKey(pref,at)) return;                                              /* staff dismissed this one */
  if(fxStaffKnows(p,pref,at)) return;                                                                    /* our own earlier record */
  p.resusRequest={pref:pref, at:at};
}
function fxResusReqHTML(p){ const q=p&&p.resusRequest; if(!q) return '';
  return '<span class="fx-rr" role="group" aria-label="Client request — confirm"><span class="fx-rr-t">Client request — confirm <b>'+pvxEscQ(q.pref)+'</b>'
    +(q.at?'<small> · '+pvxEscQ(fmtTime(new Date(q.at)))+'</small>':'')+'</span>'
    +'<button type="button" class="fx-rr-ok" data-rr="ok">Confirm '+pvxEscQ(q.pref)+'</button><button type="button" class="fx-rr-no" data-rr="no">Dismiss</button></span>'; }
function fxResusReqChip(p){ const q=p&&p.resusRequest; if(!q) return '';
  return '<span class="fx-rr-chip" title="Client request — confirm in the patient panel">'+pvxEscQ(q.pref)+'?</span>'; }
function fxResusAccept(p){ const q=p&&p.resusRequest; if(!q) return;
  if(!Array.isArray(p.resusHistory)) p.resusHistory=[];
  p.resusHistory.push({ pref:q.pref, source:'client_tracker', at:q.at||new Date().toISOString(), by:null });
  if(p.resusPref===q.pref){ p.resusRequest=null; p.resusStatus='confirmed'; scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); }); }
  else setResusPref(p,q.pref);
  if(Array.isArray(p.timeline)) p.timeline.push({ label:'Client resuscitation request confirmed: '+q.pref, at:new Date(), meta:'Confirmed · '+CURRENT_USER }); }
function fxResusDismiss(p){ const q=p&&p.resusRequest; if(!q) return;
  p.resusRequestDismissed=fxResusKey(q.pref,q.at); p.resusRequest=null;
  if(Array.isArray(p.timeline)) p.timeline.push({ label:'Client resuscitation request dismissed: '+q.pref, at:new Date(), meta:'Kept '+(p.resusPref||'not set')+' · '+CURRENT_USER });
  scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); }); }
document.addEventListener('click',function(e){ const b=e.target.closest&&e.target.closest('[data-rr]'); if(!b) return;
  e.preventDefault(); e.stopPropagation(); const p=PATIENTS.find(x=>x.id===activePatient); if(!p) return;
  if(b.dataset.rr==='ok') fxResusAccept(p); else fxResusDismiss(p); },true);
