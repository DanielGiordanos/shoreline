
/* ━━━━━ PVX-N385 · Flow's shared helpers: one copy each (stage 2a) ━━━━━
   Each of these was declared again in several layer blocks, with the same code. A block that needs one calls it by this name;
   it does not declare its own. A helper belongs here only if it uses nothing but page-wide names. */
/* text made safe to place in markup: & < > " */
function pvxEsc(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
/* text made safe for markup and for a quoted attribute: & < > " ' */
function pvxEscQ(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
/* is the person typing in a field? */
function pvxTyping(){ var a=document.activeElement; return !!(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable)); }
/* the patient with this id, or null */
function pvxPatientById(id){ try{ return PATIENTS.find(function(x){ return String(x.id)===String(id); })||null; }catch(e){ return null; } }
/* the patient whose drawer is open, or null */
function pvxActivePatient(){ try{ return PATIENTS.find(function(x){ return x.id===activePatient; })||null; }catch(e){ return null; } }
/* the signed-in person's name, or 'Staff' */
function pvxWho(){ try{ return (typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):'Staff'; }catch(e){ return 'Staff'; } }
/* the signed-in person: {name, uid, initials} */
function pvxMe(){ var u=null; try{ u=(typeof AUTH!=='undefined'&&AUTH&&AUTH.currentUser)||null; }catch(e){}
    var name=(typeof CURRENT_USER==='string'&&CURRENT_USER)||(u&&(u.displayName||u.email))||'Flow';
    return {name:name,uid:u?u.uid:null,initials:name.split(/\s+/).map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase()}; }
/* the signed-in person's account id, or null */
function pvxUid(){ try{ return (AUTH&&AUTH.currentUser&&AUTH.currentUser.uid)||null; }catch(e){ return null; } }
/* the signed-in person's email, or '' */
function pvxEmail(){ try{ return (AUTH&&AUTH.currentUser&&AUTH.currentUser.email)||''; }catch(e){ return ''; } }
/* a number as two digits */
function pvxPad2(n){ return (n<10?'0':'')+n; }
/* an ISO time as the clock time */
function pvxHm(iso){ try{ return fmtTime(new Date(iso)); }catch(e){ return ''; } }
/* whole minutes since an ISO time */
function pvxMinsSince(iso){ return Math.max(0,Math.round((Date.now()-new Date(iso))/60000)); }
/* the hospital's id */
function pvxTenant(){ try{ return TENANT_ID||'shoreline'; }catch(e){ return 'shoreline'; } }
/* the database, or null before it is ready */
function pvxDb(){ try{ return (typeof DB!=='undefined'&&DB)?DB:null; }catch(e){ return null; } }
/* a quiet notice (notify with the info icon) */
function pvxNote(t,s,o){ try{ notify(t,s,Object.assign({icon:'info',color:'#3E8FA5'},o||{})); }catch(e){} }
/* a patient's first and last name */
function pvxFullName(p){ return ((p.name||'')+' '+(p.last||'')).trim(); }
/* is this element drawn and able to be clicked? */
function pvxShown(el){ var r=el.getBoundingClientRect(); if(!r.width||!r.height) return false; var c=getComputedStyle(el); return c.display!=='none'&&c.visibility!=='hidden'&&+c.opacity>0.05&&c.pointerEvents!=='none'; }
/* the Flow view on screen */
function pvxView(){ try{ return currentView; }catch(e){ return ''; } }
/* does the person ask for reduced motion? */
function pvxReduceMotion(){ try{ return matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
/* put a parked sheet button back where it was */
function pvxUnpark(btn){ if(!btn||!btn._pvxMark) return; var mk=btn._pvxMark; btn._pvxMark=null;
    btn.classList.remove('pvx-ps-btn','pvx-ps-l','pvx-ps-r'); if(mk.parentNode){ mk.parentNode.insertBefore(btn,mk); mk.remove(); } }
/* the grab area of a sheet under this event, if any */
function pvxGrabZone(e){ return e.target.closest&&e.target.closest('.pvx-grab,.addpt-head'); }/* a short notice, when notices are ready */
function pvxToast(t){ if(typeof toast==='function') toast(t); }
/* PVX-N388 · the main script declared the two escapes again under these names. They are the same functions now; new code uses pvxEsc and pvxEscQ. */
var rdEsc=pvxEsc, ctEsc=pvxEscQ, bcEsc=pvxEscQ;
