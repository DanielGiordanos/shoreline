/* ===== ENDINGS n120 (Oct 12 2026) — euthanasia and died, from the patient drawer =====
   Daniel's choices: a quiet "Other ending…" under Admit / Discharge; Died as well as Euthanasia; record aftercare,
   owner consent (euthanasia, required) and keepsakes. Then (Oct 12, "Do all of those"), Apple-style:
   · The ending opens in its own sheet, "Rosie's ending" (centered on a desk, a bottom sheet on iPad / phone), with grouped
     sections like iOS Settings: How (the drawer cards) · Consent & aftercare form · Consent · Aftercare · Keepsake.
   · What isn't actionable isn't shown: while the family's form is out, only its progress line (Sent → With the family → Signed)
     and "Cancel form" show; "Enter them here instead" opens the paper path.
   · p.ending = {type:'euthanasia'|'died', consent:{at,by,via}|null, aftercare, keepsakes:[], urn, form, at, by, edits:[]} on the visit.
     Staff only: the family tracker sees just the gentle ending (visit_end 'loss'); the waiting-room screen drops the visit as before.
   · Died is the final status "Deceased" (Rounds' word): Completed Today, Rounds (Deceased), the OP sheet closes ("deceased").
   · Dragging a card onto Completed Today › Euthanized opens this sheet instead of a plain confirm.
   · A patient with an inpatient treatment sheet ends on the sheet (it has Euthanasia and Died), so nobody ends it in two places.
   · Ended visits show the details in the drawer; aftercare and keepsakes can be changed later ("Edit details"). */
(function(){
  if(typeof completePatient!=='function'||typeof renderDisposition!=='function') return;
  /* the hospital's own choices (VCA Shoreline × Final Gift form, Oct 12): care of body + the clay paw print */
  var AFTER=[['private','Private cremation'],['communal','Communal cremation'],['release','Release remains'],['hold','Hold for instructions']];
  var KEEP=[['clay','Clay paw print']];
  var KIND={
    euthanasia:{status:'Euthanized',title:'Euthanasia',sub:'Owner’s consent',done:'Euthanized',go:'Record euthanasia',undo:'euthanasia recorded',
      ic:'<path d="M12 20.2 5.95 14.3C4.1 12.5 4.05 9.7 5.78 7.98c1.68-1.67 4.4-1.64 6.06.08l.16.17.16-.17c1.66-1.72 4.38-1.75 6.06-.08 1.73 1.72 1.68 4.52-.17 6.32L12 20.2Z"/>'},
    died:{status:'Deceased',title:'Died',sub:'During the visit',done:'Died',go:'Record death',undo:'death recorded',
      ic:'<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1Z"/>'}
  };
  var CHEV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  /* Flow's drawer card (Admit / Discharge) for every "pick one next step" button (Daniel, Oct 12: "use the same buttons we have
     for the drawer cards"). Same element and classes as #dispActions. Go cards carry an arrow (out ↗, in ↘, next →, back ←);
     choice cards carry a ring that fills when chosen (is-on). Text is passed already escaped. */
  var DC_ARROW={out:'<path d="M7 17L17 7"/><path d="M11 7h6v6"/>',in:'<path d="M7 7L17 17"/><path d="M17 11v6h-6"/>',next:'<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',back:'<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>'};
  function dcard(o){
    var choice=typeof o.sel==='boolean';
    var mark=choice?'<span class="dc-mark'+(o.box?' sq':'')+'" aria-hidden="true"></span>':(o.arrow?'<span class="dc-arrow dc-'+o.arrow+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+DC_ARROW[o.arrow]+'</svg></span>':'<span></span>');
    return '<button type="button" class="disposition-card fv-dc'+(o.cls?' '+o.cls:'')+(o.sel?' is-on':'')+(o.wrap?' dc-wrap':'')+'"'
      +(choice?' role="'+(o.box?'checkbox':'radio')+'" aria-checked="'+o.sel+'"':'')+(o.label?' aria-label="'+o.label+'"':'')+' '+(o.attrs||'')+'>'
      +'<span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+o.ic+'</svg></span>'
      +'<span class="dc-body"><span class="dc-title">'+o.title+(o.aside?'<span class="dc-aside">'+o.aside+'</span>':'')+'</span>'+(o.desc?'<span class="dc-desc">'+o.desc+'</span>':'')+'</span>'+mark+'</button>'; }
  var IC={form:'<path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/>',use:'<path d="M4 6h10M4 12h10M4 18h7"/><path d="M15 17l2 2 4-4"/>'};
  window.fvDCard=dcard; window.fvDCardIcons=IC;
  var draft=null;   /* the open sheet: {pid, type, fee, consent, aftercare, keepsakes, edit, manual, used} */

  function label(list,k){ var x=list.filter(function(a){ return a[0]===k; })[0]; return x?x[1]:''; }
  function who(){ try{ return (typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):'Flow'; }catch(e){ return 'Flow'; } }
  function kindOf(p){ return p&&p.ending&&KIND[p.ending.type]?p.ending.type:(p&&p.status==='Deceased'?'died':(p&&p.status==='Euthanized'?'euthanasia':null)); }
  function ipSheet(p){ return !!(p&&p.tsSheet&&p.tsSheet.board==='IP'); }
  function sheetHref(p){ var id=''; try{ id=window.fvAdmitSheet?fvAdmitSheet.id(p):''; }catch(e){} return '/treatment/'+(id?'#sheet='+encodeURIComponent(id)+'&discharge=1':''); }
  function fmtT(iso){ try{ return fmtTime(new Date(iso)); }catch(e){ return ''; } }
  function formOf(p){ var F=p&&p.consentForm; return (F&&F.status!=='cancelled')?F:null; }
  function formOpen(p){ var F=formOf(p); return !!F&&(F.status==='requested'||F.status==='family'); }
  function signedForm(p){ var F=formOf(p); return (F&&F.status==='signed')?F:null; }
  /* what the details say, in one line */
  function summary(e,withConsent){ if(!e) return '';
    var bits=[label(AFTER,e.aftercare)||'Aftercare not recorded'];
    if(e.aftercare==='hold') bits[0]='Held for instructions (up to 7 days)';
    if(e.urn) bits.push(e.urn+' urn');
    var k=(e.keepsakes||[]).map(function(x){ return label(KEEP,x); }).filter(Boolean); if(k.length) bits.push(k.join(', '));
    if(withConsent&&e.consent) bits.push(e.consent.via==='phone'?'Consent by phone':'Consent signed');
    return bits.join(' · '); }

  /* the consent line under an ended visit */
  function consentLine(c){ if(!c) return '';
    if(c.via==='phone'){ var w=(c.witnesses||[]).filter(Boolean); return 'Consent by phone'+(c.spoke_with?' from '+c.spoke_with:'')+(w.length?' · witnessed by '+w.join(' and '):''); }
    return 'Consent signed'+(c.via==='form'?' on the tablet':'')+(c.by?' · '+c.by:''); }
  /* names for the witness fields: the doctors, techs and liaisons Flow already knows */
  function staffNames(){ var a=[]; try{ a=a.concat(DOCTOR_NAMES||[]); }catch(e){} try{ a=a.concat(window.FV_TECHS||[]); }catch(e){} try{ if(window.Pravix&&Pravix.getLiaisons) a=a.concat(Pravix.getLiaisons()||[]); }catch(e){}
    var seen={}; return a.map(function(x){ return String(x&&x.name||x||'').trim(); }).filter(function(x){ var k=x.toLowerCase(); if(!x||seen[k]) return false; seen[k]=1; return true; }).sort(); }
  function sameName(a,b){ return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase(); }

  /* ---------- saved on the visit ---------- */
  window.fvEndingToDb=function(e){ if(!e||!KIND[e.type]) return null;
    return {type:e.type,consent:e.consent?{at:e.consent.at||null,by:e.consent.by||null,via:e.consent.via||null,form:e.consent.form||null,spoke_with:e.consent.spoke_with?String(e.consent.spoke_with).slice(0,80):null,witnesses:(e.consent.witnesses||[]).slice(0,2).map(function(w){ return String(w||'').slice(0,80); })}:null,aftercare:e.aftercare||null,
      keepsakes:(e.keepsakes||[]).filter(function(k){ return !!label(KEEP,k); }),urn:e.urn||null,form:e.form||null,at:e.at||null,by:e.by||null,
      edits:(e.edits||[]).slice(-20).map(function(x){ return {at:x.at||null,by:x.by||null,what:String(x.what||'').slice(0,200)}; })}; };

  /* ---------- the new final status: Deceased ---------- */
  try{ STATUSES.Deceased={color:'#8A82A8',bg:'rgba(138,130,168,.16)'}; }catch(e){}
  try{ COMPLETION.Deceased={tlLabel:'Patient died',title:'Patient died',icon:'info',color:'#8A82A8',stampKey:'deceasedAt'}; }catch(e){}
  if(typeof captureDispSnap==='function'&&typeof restoreDispSnap==='function'){
    pvxWrap('captureDispSnap',function(capBase){ return function(p){ var s=capBase.apply(this,arguments); s.deceasedAt=p.deceasedAt; s.ending=p.ending?JSON.parse(JSON.stringify(p.ending)):null; return s; }; },'#17');
    pvxWrap('restoreDispSnap',function(resBase){ return function(p,s){ resBase.apply(this,arguments); p.deceasedAt=s.deceasedAt; p.ending=s.ending||null; }; },'#17');
  }

  /* ---------- the drawer: "Other ending…" ---------- */
  function link(){ var el=document.getElementById('dispOther'); if(el) return el;
    var acts=document.getElementById('dispActions'); if(!acts) return null;
    el=document.createElement('button'); el.type='button'; el.id='dispOther'; el.className='disp-other';
    el.setAttribute('aria-label','Other ending — euthanasia or died'); el.setAttribute('aria-haspopup','dialog');
    el.innerHTML='<span>Other ending…</span>'+CHEV;
    acts.insertAdjacentElement('afterend',el); return el; }
  function showLink(on){ var el=link(); if(!el) return; el.hidden=!on; var p=pvxActivePatient(), F=formOf(p), sp=el.querySelector('span');
    var t=(F&&F.status==='requested')?'Other ending · form waiting for reception':(F&&F.status==='family')?'Other ending · form with the family':(F&&F.status==='signed'&&!isCompleted(p))?'Other ending · form signed — record it':'Other ending…';
    if(sp&&sp.textContent!==t) sp.textContent=t; el.classList.toggle('has-form',t!=='Other ending…'); }

  pvxAfter('renderDisposition',function(p){
    try{ showLink(!!p&&!isCompleted(p)); var k=kindOf(p); if(p&&isCompleted(p)&&k) terminal(p,k);
      if(draft&&p&&draft.pid===p.id) paintSheet();   /* a live update: keep the sheet and what's in it */
    }catch(e){ console.warn('[endings]',e); }
    },'#17');
  function terminal(p,k){
    var conf=document.getElementById('dispConfirm'); if(!conf) return; var K=KIND[k], e=p.ending;
    var when=''; try{ when=p.completedAt?fmtTime(p.completedAt):''; }catch(_){}
    var desc=e?summary(e,false):'Recorded in Completed Today';
    conf.className='disp-confirm mounted';
    conf.innerHTML='<div class="disp-terminal end-terminal"><span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+K.ic+'</svg></span>'
      +'<span class="dc-body"><span class="dc-title">'+pvxEscQ(K.done)+(when?' <span class="end-when">'+pvxEscQ(when)+'</span>':'')+'</span><span class="dc-desc">'+pvxEscQ(desc)+'</span>'
      +(e&&e.consent?'<span class="dc-desc end-consent-line">'+pvxEscQ(consentLine(e.consent))+'</span>':'')+'</span>'
      +'<span class="end-acts">'+(e&&e.aftercare?'<button type="button" class="end-edit" data-end="tag">Print tag</button>':'')+'<button type="button" class="end-edit" data-end="edit">Edit details</button></span></div>'; }

  /* ---------- the sheet ---------- */
  var lastFocus=null;
  function sheetEl(){ var s=document.getElementById('endSheet'); if(!s){ s=document.createElement('div'); s.id='endSheet'; s.className='end-sheet'; document.body.appendChild(s); } return s; }
  function openSheet(p,type,opts){
    opts=opts||{}; if(!p||(typeof _dispBusy!=='undefined'&&_dispBusy)) return;
    var edit=!!opts.edit; if(!edit&&isCompleted(p)) return;
    var e=edit?(p.ending||{type:kindOf(p)}):null;
    draft={pid:p.id,fee:'outpatient',type:edit?(e.type||kindOf(p)):(type||null),consent:edit?((e&&e.consent&&(e.consent.via||'paper'))||false):false,ph:{who:'',w1:'',w2:'',read:false,lang:'en'},aftercare:edit?(e.aftercare||null):null,
      keepsakes:edit?(e.keepsakes||[]).slice():[],edit:edit,manual:!!opts.manual,used:false};
    if(opts.useForm) useForm(p);
    lastFocus=document.activeElement; paintSheet(true);
    var s=sheetEl(); requestAnimationFrame(function(){ s.classList.add('shown'); });
    var f=s.querySelector(opts.useForm?'[data-end="go"]':draft.type?'[data-end-kind="'+draft.type+'"]':'[data-end-kind]'); if(f) f.focus({preventScroll:true});
  }
  function focusKey(){ var a=document.activeElement, s=document.getElementById('endSheet'); if(!a||!s||!s.contains(a)) return null;
    var n=['endPh','endKind','endAfter','endKeep','endConsent','endFee','endRl','end']; for(var i=0;i<n.length;i++){ var v=a.dataset&&a.dataset[n[i]]; if(v!=null) return '[data-'+n[i].replace(/[A-Z]/g,function(m){ return '-'+m.toLowerCase(); })+'="'+v+'"]'; } return null; }
  function row(o){   /* an inset-grouped row: label, optional detail, and a check (radio), a switch, or a chevron */
    var tail=o.kind==='radio'?'<span class="es-check" aria-hidden="true"></span>':o.kind==='switch'?'<span class="es-switch" aria-hidden="true"><span></span></span>':o.kind==='link'?'<span class="es-chev" aria-hidden="true">'+CHEV+'</span>':'';
    var role=o.kind==='radio'?' role="radio" aria-checked="'+!!o.on+'"':o.kind==='switch'?' role="switch" aria-checked="'+!!o.on+'"':'';
    return '<button type="button" class="es-row'+(o.on?' on':'')+(o.cls?' '+o.cls:'')+'"'+role+' '+(o.attrs||'')+'><span class="es-rl">'+o.t+(o.d?'<span class="es-rd">'+o.d+'</span>':'')+'</span>'+tail+'</button>'; }
  function field(k,lab,val,ph,list){ return '<label class="es-row es-field"><span class="es-fl">'+lab+'</span><input type="text" data-end-ph="'+k+'" value="'+pvxEscQ(val)+'" placeholder="'+pvxEscQ(ph)+'" autocomplete="off" autocapitalize="words" spellcheck="false"'+(list?' list="'+list+'"':'')+'></label>'; }
  function paintSheet(first){
    var p=draft&&pvxPatientById(draft.pid), s=sheetEl(); if(!p||!draft){ closeSheet(true); return; }
    var fk=first?null:focusKey(), scroll=(s.querySelector('.es-body')||{}).scrollTop||0, ae=document.activeElement, caret=(ae&&ae.tagName==='INPUT'&&s.contains(ae))?[ae.selectionStart,ae.selectionEnd]:null;
    var d=draft, nm=dispFirstName(p), K=d.type?KIND[d.type]:null, F=formOf(p), SF=signedForm(p), FO=formOpen(p);
    var fields=d.edit||d.manual||d.used||!window.fvConsent;
    var h='<div class="es-scrim" data-end="scrim"></div><div class="es-panel" role="dialog" aria-modal="true" aria-labelledby="endSheetT">'
      +'<header class="es-bar"><button type="button" class="es-cancel" data-end="cancel">Cancel</button><h2 id="endSheetT">'+pvxEscQ(d.edit?nm+' · ending details':nm+'’s ending')+'</h2><span class="es-bar-r"></span></header><div class="es-body">';
    var foot='';
    if(!d.edit&&ipSheet(p)){
      h+='<div class="es-sec"><div class="es-group es-text"><b>'+pvxEscQ(nm)+' has an inpatient treatment sheet.</b><br>Record the ending on the sheet — it has Euthanasia and Died — so it’s written once. Flow and Rounds follow.</div></div>';
      foot='<a class="es-primary" href="'+pvxEscQ(sheetHref(p))+'" target="_blank" rel="noopener" data-end="sheet">Open the treatment sheet</a>';
    }else{
      if(!d.edit){ h+='<div class="es-sec"><div class="es-h" id="endKindH">How did '+pvxEscQ(nm)+'’s visit end?</div><div class="end-kinds" role="radiogroup" aria-labelledby="endKindH">';
        ['euthanasia','died'].forEach(function(k){ var on=d.type===k, X=KIND[k]; h+=dcard({ic:X.ic,title:X.title,sel:on,label:X.title+' — '+X.sub,cls:'end-kind'+(on?' on':''),attrs:'data-end-kind="'+k+'"'}); });
        h+='</div></div>'; }
      if(K&&!d.edit&&window.fvConsent){
        h+='<div class="es-sec"><div class="es-h">'+(d.type==='died'?'Aftercare form':'Consent &amp; aftercare form')+'</div>';
        if(!F&&d.manual){
          h+='<div class="es-group">'+row({t:'Send the form to reception instead',d:'The family chooses and signs on the tablet',kind:'link',attrs:'data-end="unmanual"'})+'</div>';
        }else if(!F){
          h+='<div class="es-group">'+(d.type==='euthanasia'?'<div class="es-row es-static"><span class="es-rl">Fee</span><span class="es-seg" role="radiogroup" aria-label="Euthanasia fee">'
            +[['outpatient','Outpatient'],['consult','With consult']].map(function(x){ var on=(d.fee||'outpatient')===x[0]; return '<button type="button" class="'+(on?'on':'')+'" role="radio" aria-checked="'+on+'" data-end-fee="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</span></div>':'')
            +'<div class="es-cardrow">'+dcard({ic:IC.form,title:'Send form to reception',desc:'Shows up in Consent forms',arrow:'out',cls:'end-send',attrs:'data-end="send"'})+'</div></div>'
            +'<div class="es-foot-note">Reception takes the tablet into the room and goes over '+pvxEscQ(nm)+'’s aftercare'+(d.type==='died'?'':' and the consent')+' with the family.</div>';
          if(!d.manual) h+='<div class="es-group">'+row({t:'Record it here instead',d:'From a paper form, or with the family beside you',kind:'link',attrs:'data-end="manual"'})+'</div>';
        }else if(FO||SF){
          h+='<div class="es-group es-text">'+fvConsent.progress(F)+'</div>';
          if(SF){ h+='<div class="es-foot-note">'+pvxEscQ((SF.owner_sig&&SF.owner_sig.name)||'The owner')+' chose '+pvxEscQ(fvConsent.summary(SF))+'.</div>';
            if(!d.used) h+='<div class="es-group"><div class="es-cardrow">'+dcard({ic:IC.use,title:'Use the family’s choices',desc:'Fills in the ending for you',arrow:'in',cls:'end-use',attrs:'data-end="use-form"'})+'</div></div>';
            h+='<div class="es-group">'+row({t:'Print the form',kind:'link',attrs:'data-end="print-form"'})+'</div>';
          }else{
            h+='<div class="es-foot-note">Consent and aftercare will come from the family’s form. You’ll get a notice when it’s signed.</div>'
              +'<div class="es-group">'+row({t:'Cancel form',cls:'danger',attrs:'data-end="cancel-form"'})+(d.manual?'':row({t:'Enter them here instead',d:'If the family signed the paper form',kind:'link',attrs:'data-end="manual"'}))+'</div>';
          }
        }
        h+='</div>';
      }
      if(K&&fields){
        if(d.type==='euthanasia'){ h+='<div class="es-sec"><div class="es-h">Consent</div><div class="es-group">';
          var ec=d.edit&&pvxPatientById(d.pid)&&pvxPatientById(d.pid).ending&&pvxPatientById(d.pid).ending.consent;
          if(d.edit||SF) h+='<div class="es-row es-static on"><span class="es-rl">'+(SF?'Signed on the tablet · '+pvxEscQ(fmtT(SF.signed_at)):ec?pvxEscQ(ec.via==='phone'?consentLine(ec):ec.via==='form'?'Signed on the tablet':'Signed the paper form'):'Euthanasia consent signed by the owner')+'</span><span class="es-check" aria-hidden="true"></span></div></div>';
          else{ h=h.replace(/<div class="es-group">$/,'<div class="es-group" role="radiogroup" aria-label="How the owner consented">');
            h+=row({t:'Signed the paper form',kind:'radio',on:d.consent==='paper',attrs:'data-end-consent="paper"'})
              +row({t:'By phone',d:'Two staff witness the owner’s consent on the call',kind:'radio',on:d.consent==='phone',attrs:'data-end-consent="phone"'})+'</div>';
            if(d.consent==='phone'){ var P=d.ph;
              h+='<div class="es-group es-phone">'
                +field('who','Spoke with',P.who,'Owner or authorized agent','')
                +field('w1','Witness',P.w1,'Staff name','endStaff')
                +field('w2','Second witness',P.w2,'Another staff member','endStaff')
                +row({t:P.read?'Hide the consent wording':'Consent wording to read',d:P.read?'':'Read it to the owner, word for word',kind:'link',attrs:'data-end="read"'})
                +(P.read&&window.fvConsent&&fvConsent.consentText?'<div class="es-text es-read"><span class="es-seg es-rl-seg" role="radiogroup" aria-label="Language">'+[['en','English'],['es','Español']].map(function(x){ var on=P.lang===x[0]; return '<button type="button" class="'+(on?'on':'')+'" role="radio" aria-checked="'+on+'" data-end-rl="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</span><p>'+pvxEscQ(fvConsent.consentText(P.lang))+'</p></div>':'')
                +'</div><datalist id="endStaff">'+staffNames().map(function(n){ return '<option value="'+pvxEscQ(n)+'"></option>'; }).join('')+'</datalist>'
                +'<div class="es-foot-note">Both witnesses hear the owner give consent. The time is recorded when you tap Record.</div>'; }
            }
          h+='</div>'; }
        h+='<div class="es-sec"><div class="es-h" id="endAfterH">Aftercare</div><div class="es-group" role="radiogroup" aria-labelledby="endAfterH">';
        AFTER.forEach(function(a){ h+=row({t:a[1],kind:'radio',on:d.aftercare===a[0],attrs:'data-end-after="'+a[0]+'"'}); });
        h+='</div>'+(d.aftercare==='hold'?'<div class="es-foot-note">The family has up to 7 days to decide; after that a communal cremation is charged.</div>':'')+'</div>';
        h+='<div class="es-sec"><div class="es-h">Keepsake</div><div class="es-group">'+row({t:'Clay paw print',kind:'switch',on:d.keepsakes.indexOf('clay')>-1,attrs:'data-end-keep="clay"'})+'</div>'
          +(d.aftercare==='private'?'<div class="es-foot-note">Included with private cremation.</div>':'')+'</div>';
      }
      if(K) foot=(fields?'<button type="button" class="es-primary" data-end="go">'+pvxEscQ(d.edit?'Save':K.go)+'</button>':(FO?'<button type="button" class="es-primary quiet" data-end="cancel">Done</button>':''));
    }
    h+='</div><footer class="es-foot"><div class="end-hint" id="endHint" role="alert" hidden></div>'+foot+'</footer></div>';
    s.className='end-sheet open'+(s.classList.contains('shown')?' shown':''); s.innerHTML=h;
    var b=s.querySelector('.es-body'); if(b) b.scrollTop=scroll;
    if(fk){ var f=s.querySelector(fk); if(f){ f.focus({preventScroll:true}); if(caret&&f.setSelectionRange) try{ f.setSelectionRange(caret[0],caret[1]); }catch(_){} } }
  }
  function closeSheet(silent){ var s=document.getElementById('endSheet'); draft=null; if(s){ s.className='end-sheet'; s.innerHTML=''; }
    var p=pvxActivePatient(); if(p) showLink(!isCompleted(p)); if(!silent){ var lf=(lastFocus&&lastFocus!==document.body&&document.contains(lastFocus)&&lastFocus.offsetParent!==null)?lastFocus:document.getElementById('dispOther'); if(lf&&lf.focus&&!lf.hidden) try{ lf.focus({preventScroll:true}); }catch(e){} } }
  function hint(msg,sel){ var h=document.getElementById('endHint'); if(h){ h.textContent=msg; h.hidden=false; }
    var f=sel&&document.querySelector('#endSheet '+sel); if(f){ f.focus(); f.classList.remove('end-nudge'); void f.offsetWidth; f.classList.add('end-nudge'); } }
  function useForm(p){ var sf=signedForm(p); if(!sf||!draft) return; draft.type=draft.type||sf.kind; draft.aftercare=sf.care; draft.keepsakes=(sf.clay||sf.care==='private')?['clay']:[]; draft.used=true; }

  function record(p){
    var d=draft; if(!d||!d.type) return;
    var SF=signedForm(p);
    if(d.type==='euthanasia'&&!d.consent&&!SF&&!d.edit){ hint('Choose how the owner consented — the paper form or by phone — or send the form to reception.','[data-end-consent]'); return; }
    if(d.type==='euthanasia'&&d.consent==='phone'&&!SF&&!d.edit){ var P=d.ph; P.who=String(P.who||'').trim(); P.w1=String(P.w1||'').trim(); P.w2=String(P.w2||'').trim();
      if(!P.who){ hint('Add who gave consent on the phone.','[data-end-ph="who"]'); return; }
      if(!P.w1){ hint('Add the first witness.','[data-end-ph="w1"]'); return; }
      if(!P.w2){ hint('Add the second witness.','[data-end-ph="w2"]'); return; }
      if(sameName(P.w1,P.w2)){ hint('The two witnesses need to be different people.','[data-end-ph="w2"]'); return; } }
    if(!d.aftercare){ hint('Choose the aftercare — “Hold for instructions” is fine.','[data-end-after]'); return; }
    if(d.edit) return saveEdit(p,d);
    if(_dispBusy) return; if(isCompleted(p)){ closeSheet(true); showDispConflict(p); return; }
    var K=KIND[d.type], now=new Date(), by=who(), conf=document.getElementById('dispConfirm'), acts=document.getElementById('dispActions');
    closeSheet(true); _dispBusy=true; if(acts) acts.classList.add('mutation-locked');
    conf.className='disp-confirm mounted';
    conf.innerHTML='<div class="disp-terminal end-terminal" aria-live="polite"><span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+K.ic+'</svg></span><span class="dc-body"><span class="dc-title">Recording…</span><span class="dc-desc">Saving to record</span></span></div>';
    var snap=captureDispSnap(p), end={type:d.type,consent:d.type==='euthanasia'?(SF?{at:SF.signed_at,by:(SF.witness&&SF.witness.name)||by,via:'form',form:SF.id}:(d.consent==='phone'?{at:now.toISOString(),by:by,via:'phone',spoke_with:d.ph.who,witnesses:[d.ph.w1,d.ph.w2]}:{at:now.toISOString(),by:by,via:'paper'})):null,aftercare:d.aftercare,keepsakes:d.keepsakes.slice(),urn:(SF&&SF.care==='private'&&d.aftercare==='private'&&window.fvConsent)?fvConsent.urnLabel(SF.urn):null,form:SF?SF.id:null,at:now.toISOString(),by:by,edits:[]};
    setTimeout(function(){
      var failed=false;
      try{ p.ending=end; completePatient(p,K.status);
        var ev=p.timeline&&p.timeline[p.timeline.length-1];
        if(ev) ev.meta=[ev.meta,summary(end,true),by].filter(Boolean).join(' · ');   /* meta stays staff-only: the tracker gets the label and time */
      }catch(e){ failed=true; console.warn('[endings]',e); }
      setTimeout(function(){
        _dispBusy=false;
        var bad=(typeof Backend!=='undefined'&&Backend&&Backend.conn==='error');
        if(failed||bad){ restoreDispSnap(p,snap); try{ renderAll(); }catch(_){} if(activePatient===p.id) fillDrawer(p);
          if(acts){ acts.classList.remove('mutation-locked'); acts.querySelectorAll('.disposition-card').forEach(function(c){ c.classList.remove('compress'); }); }
          conf.className='disp-confirm mounted';
          conf.innerHTML='<div class="disp-terminal" style="grid-template-columns:1fr" role="alert"><span class="dc-body"><span class="dc-title" style="color:rgba(232,152,146,.96)">Couldn’t record · Try again</span><span class="dc-desc">No patient state was changed</span></span></div>';
          return; }
        if(activePatient===p.id) fillDrawer(p);
        showUndo(p,d.type,snap);
      },360);
    },430);
  }
  function saveEdit(p,d){
    var e=p.ending||{type:d.type,consent:null,at:null,by:null,edits:[]};
    var before=summary(e,false); e.aftercare=d.aftercare; e.keepsakes=d.keepsakes.slice(); e.type=e.type||d.type;
    var after=summary(e,false); closeSheet();
    if(after!==before){ e.edits=(e.edits||[]); e.edits.push({at:new Date().toISOString(),by:who(),what:before+' → '+after}); }
    p.ending=e;
    try{ renderAll(); }catch(_){}
    if(activePatient===p.id) fillDrawer(p);
    if(after!==before) try{ if(window.fvNotifyAct) fvNotifyAct('Ending details saved',pvxEscQ(dispFirstName(p))+' · '+pvxEscQ(after),'Print new tag',function(){ printTag(pvxPatientById(p.id)); });
      else notify('Ending details saved',pvxEscQ(dispFirstName(p))+' · '+pvxEscQ(after),{icon:'info',color:'#8A82A8'}); }catch(_){}
  }
  function dirty(){ var d=draft; return !!d&&!d.edit&&!!(d.consent||d.aftercare||d.keepsakes.length||d.ph.who||d.ph.w2); }

  /* ---------- the body tag (4 × 6 in): who, and what happens to them, impossible to misread ---------- */
  var BAND={private:{cls:'solid',t:'Private cremation',s:'Ashes come back to VCA Shoreline'},communal:{cls:'outline',t:'Communal cremation',s:'Ashes are not returned'},
    release:{cls:'double',t:'Release to owner',s:'Do not send to Final Gift'},hold:{cls:'dashed',t:'Hold',s:''}};
  function tagDay(d){ try{ return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }catch(e){ return ''; } }
  function tagHtml(p){ var e=p&&p.ending; if(!e||!e.aftercare||!KIND[e.type]) return '';
    var K=KIND[e.type], at=e.at?new Date(e.at):(p.completedAt?new Date(p.completedAt):new Date()), B=Object.assign({},BAND[e.aftercare]||{cls:'outline',t:label(AFTER,e.aftercare),s:''});
    if(e.aftercare==='hold'){ var until=new Date(at.getTime()+7*864e5); B.t='Hold until '+tagDay(until); B.s='Then communal cremation, unless the family decides'; }
    var full=[p.name,p.last].filter(Boolean).join(' ')||'Patient', pet=[p.species,p.breed,p.sex,p.weight?(String(p.weight)+(/[a-z]/i.test(String(p.weight))?'':' kg')):''].filter(Boolean).join(' · ');
    var doc=(p.doctor&&p.doctor!=='unassigned')?p.doctor:'', time='';
    try{ time=fmtTime(at); }catch(_){ time=''; }
    var keep=(e.keepsakes||[]).map(function(k){ return label(KEEP,k); }).filter(Boolean);
    var line=function(l,v){ return v?'<tr><td>'+l+'</td><td>'+pvxEscQ(v)+'</td></tr>':''; };
    return '<div class="et"><div class="et-top"><span>VCA Shoreline</span><b>'+pvxEscQ(p.hid||'')+'</b></div>'
      +'<div class="et-name">'+pvxEscQ(full)+'</div><div class="et-pet">'+pvxEscQ(pet)+'</div>'
      +'<div class="et-band et-'+B.cls+'"><b>'+pvxEscQ(B.t)+'</b>'+(B.s?'<span>'+pvxEscQ(B.s)+'</span>':'')+'</div>'
      +'<table class="et-t">'+line('Owner',p.owner)+line('Urn',e.urn||'')+line(K.done,(tagDay(at)+' · '+time).replace(/ · $/,''))+line('Doctor',doc)+line('Consent',e.type==='euthanasia'?consentLine(e.consent).replace(/^Consent (\w)/,function(_,c){ return c.toUpperCase(); }):'')+'</table>'
      +(keep.length?'<div class="et-keep">'+keep.map(function(k){ return '<span><i></i>'+pvxEscQ(k)+' made</span>'; }).join('')+'</div>':'')
      +'<div class="et-sign"><span>Tagged by</span><span>Picked up by Final Gift · date</span></div>'
      +'<div class="et-foot">Recorded by '+pvxEscQ(e.by||'')+' · Pravix Flow</div></div>'; }
  function printTag(p){ var h=tagHtml(p); if(!h) return false;
    var w=document.getElementById('endTag'); if(!w){ w=document.createElement('div'); w.id='endTag'; document.body.appendChild(w); }
    w.innerHTML=h; document.body.classList.add('end-tagging');
    var done=function(){ document.body.classList.remove('end-tagging'); window.removeEventListener('afterprint',done); };
    window.addEventListener('afterprint',done); setTimeout(function(){ try{ window.print(); }catch(e){} setTimeout(done,1500); },120); return true; }

  /* ---------- clicks and keys ---------- */
  document.addEventListener('click',function(ev){
    var t=ev.target; if(!t||!t.closest) return;
    if(t.closest('#dispOther')){ openSheet(pvxActivePatient(),null); return; }
    if(t.closest('#dispConfirm [data-end="tag"]')){ var pt=pvxActivePatient(); if(pt) printTag(pt); return; }
    if(t.closest('#dispConfirm [data-end="edit"]')){ var pe=pvxActivePatient(); if(pe) openSheet(pe,null,{edit:true}); return; }
    var s=t.closest('#endSheet'); if(!s||!draft) return;
    var p=pvxPatientById(draft.pid); if(!p) return;
    var a=t.closest('[data-end]'); if(a){ var w=a.dataset.end;
      if(w==='cancel') closeSheet();
      else if(w==='scrim'){ if(dirty()){ var pn=s.querySelector('.es-panel'); if(pn){ pn.classList.remove('end-nudge'); void pn.offsetWidth; pn.classList.add('end-nudge'); } } else closeSheet(); }
      else if(w==='go') record(p);
      else if(w==='read'){ draft.ph.read=!draft.ph.read; paintSheet(); var rd=s.querySelector('[data-end="read"]'); if(rd) rd.focus(); }
      else if(w==='unmanual'){ draft.manual=false; draft.consent=false; paintSheet(); var sf=s.querySelector('[data-end="send"]'); if(sf) sf.focus(); }
      else if(w==='manual'){ draft.manual=true; paintSheet(); var f=s.querySelector('[data-end-consent],[data-end-after]'); if(f) f.focus(); }
      else if(w==='send'&&window.fvConsent){ fvConsent.send(p,draft.type,draft.fee); paintSheet(); }
      else if(w==='cancel-form'&&window.fvConsent){ fvConsent.cancel(p); setTimeout(paintSheet,0); }
      else if(w==='print-form'&&window.fvConsent) fvConsent.print(p);
      else if(w==='use-form'){ useForm(p); paintSheet(); var g=document.querySelector('#endSheet [data-end="go"]'); if(g) g.focus(); }
      return; }
    var fe=t.closest('[data-end-fee]'); if(fe){ draft.fee=fe.dataset.endFee; paintSheet(); var fq=s.querySelector('[data-end-fee="'+draft.fee+'"]'); if(fq) fq.focus(); return; }
    var k=t.closest('[data-end-kind]'); if(k){ draft.type=k.dataset.endKind; paintSheet(); var kf=s.querySelector('[data-end-kind="'+draft.type+'"]'); if(kf) kf.focus(); return; }
    if(t.closest('[data-end-ph]')) return;
    var rl=t.closest('[data-end-rl]'); if(rl){ draft.ph.lang=rl.dataset.endRl; paintSheet(); var rq=s.querySelector('[data-end-rl="'+draft.ph.lang+'"]'); if(rq) rq.focus(); return; }
    var cn=t.closest('[data-end-consent]'); if(cn){ var cv=cn.dataset.endConsent==='phone'?'phone':'paper'; draft.consent=cv;
      if(cv==='phone'){ if(!draft.ph.who) draft.ph.who=String(p.owner||'').trim(); if(!draft.ph.w1&&who()!=='Flow') draft.ph.w1=who(); }
      paintSheet(); var nx=cv==='phone'?(s.querySelector('[data-end-ph="who"]:placeholder-shown')||s.querySelector('[data-end-ph="w1"]:placeholder-shown')||s.querySelector('[data-end-ph="w2"]:placeholder-shown')):null;
      (nx||s.querySelector('[data-end-consent="'+cv+'"]')).focus(); return; }
    var af=t.closest('[data-end-after]'); if(af){ draft.aftercare=af.dataset.endAfter; paintSheet(); var x=s.querySelector('[data-end-after="'+draft.aftercare+'"]'); if(x) x.focus(); return; }
    var kp=t.closest('[data-end-keep]'); if(kp){ var v=kp.dataset.endKeep, i=draft.keepsakes.indexOf(v); if(i>-1) draft.keepsakes.splice(i,1); else draft.keepsakes.push(v); paintSheet(); var y=s.querySelector('[data-end-keep="'+v+'"]'); if(y) y.focus(); return; }
  });
  document.addEventListener('input',function(e){ var t=e.target; if(!draft||!t||!t.matches||!t.matches('#endSheet [data-end-ph]')) return; draft.ph[t.dataset.endPh]=t.value;
    var h=document.getElementById('endHint'); if(h&&!h.hidden) h.hidden=true; });
  document.addEventListener('keydown',function(e){ var t=e.target; if(!draft||e.key!=='Enter'||!t||!t.matches||!t.matches('#endSheet [data-end-ph]')) return; e.preventDefault();
    var all=[].slice.call(document.querySelectorAll('#endSheet [data-end-ph]')), i=all.indexOf(t); if(i<all.length-1) all[i+1].focus(); else { var g=document.querySelector('#endSheet [data-end-after]'); if(g) g.focus(); } });
  document.addEventListener('keydown',function(e){ if(!draft||!document.querySelector('#endSheet.open')) return;
    if(e.key==='Escape'){ e.stopPropagation(); e.preventDefault(); closeSheet(); return; }
    if(e.key==='Tab'){ var f=[].slice.call(document.querySelectorAll('#endSheet .es-panel button, #endSheet .es-panel a[href], #endSheet .es-panel input')).filter(function(x){ return x.offsetParent!==null; }); if(!f.length) return;
      var i=f.indexOf(document.activeElement); if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); } } },true);
  /* closing the drawer closes its sheet */
  if(typeof closeDrawer==='function'){ pvxBefore('closeDrawer',function(){ if(draft) closeSheet(true); },'#17'); }
  if(typeof openDispConfirm==='function'){ pvxWrap('openDispConfirm',function(odBase){ return function(){ if(draft) closeSheet(true); var r=odBase.apply(this,arguments); var c=document.getElementById('dispConfirm'); if(c&&c.querySelector('.confirmation')) showLink(false); return r; }; },'#17'); }
  if(typeof closeDispConfirm==='function'){ pvxAfter('closeDispConfirm',function(){ var p=pvxActivePatient(); if(p) showLink(!isCompleted(p)); },'#17'); }

  /* ---------- Completed Today › Euthanized: the same sheet, not a plain confirm ---------- */
  document.addEventListener('drop',function(ev){
    var z=ev.target&&ev.target.closest&&ev.target.closest('#czEuthanized'); if(!z) return;
    var id=(typeof dragId!=='undefined')?dragId:null; if(!id) return;
    ev.preventDefault(); ev.stopPropagation();
    z.classList.remove('cz-over'); var bd=document.getElementById('board'); if(bd) bd.classList.remove('board-dim');
    var p=PATIENTS.find(function(x){ return x.id===id; }); if(!p||isCompleted(p)) return;
    try{ openDrawer(p.id); }catch(e){}
    setTimeout(function(){ var q=pvxActivePatient(); if(q&&q.id===p.id) openSheet(q,'euthanasia'); },260);
  },true);

  /* ---------- Completed Today: the aftercare under the name ---------- */
  if(typeof renderComplete==='function'){ 
    pvxAfter('renderComplete',function(){ 
      try{ var tEl=document.getElementById('czTotal'); if(tEl) tEl.textContent=String((+tEl.textContent||0)+completedTodayCount('Deceased'));
        document.querySelectorAll('#czList .cz-item').forEach(function(n){ var p=PATIENTS.find(function(x){ return x.id===n.dataset.pid; });
          if(!p||!p.ending) return; var s=n.querySelector('.cz-sub'); if(!s||s.querySelector('.cz-end')) return;
          var a=p.ending.aftercare==='hold'?'Held for instructions':label(AFTER,p.ending.aftercare); if(a) s.insertAdjacentHTML('beforeend','<span class="cz-end"> · '+pvxEscQ(a)+'</span>'); });
      }catch(e){}
      },'#17'); }

  try{ link(); }catch(e){}
  window.fvEndings={open:function(p,t,o){ openSheet(p||pvxActivePatient(),t||null,o); },
    /* from the "Form signed" notice: the drawer, then this sheet with the family's choices in, focused on Record */
    openSigned:function(p){ if(!p) return; try{ if(activePatient!==p.id) openDrawer(p.id); }catch(e){}
      setTimeout(function(){ var q=pvxActivePatient(); if(q&&q.id===p.id&&!isCompleted(q)){ var sf=signedForm(q); openSheet(q,sf?sf.kind:null,{useForm:!!sf}); } },260); },
    summary:summary,consentLine:consentLine,tagHtml:tagHtml,printTag:function(p){ return printTag(p||pvxActivePatient()); },staffNames:staffNames,AFTER:AFTER,KEEP:KEEP,state:function(){ return draft; },close:function(){ closeSheet(); },
    repaint:function(){ var p=pvxActivePatient(); if(draft) paintSheet(); else if(p) showLink(!isCompleted(p)); }};
})();