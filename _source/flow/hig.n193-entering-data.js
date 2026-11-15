/* PVX-N193 - entering data: labels tied to fields, required data before Create, checks as you leave a field, units as
   choices, the signed-in user as the triager, an in-app hours sheet, full text of clipped fields on hover */
(function(){
  var $=function(id){ return document.getElementById(id); };
  function hint(id,msg){ var el=$(id), h=$(id==='apName'?'apNameErr':id+'Hint');   /* the name keeps Flow's own message slot (FLOW-14) */ if(el){ if(msg) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); }
    if(h){ h.textContent=msg||''; h.classList.toggle('show',!!msg); } return !msg; }

  /* ---- 3. every label tied to its field ---- */
  var n=0;
  function tie(root){ (root||document).querySelectorAll('.ap-field > label:not([for]), .alert-field > label:not([for]), .ap-field > .lbl, .te-field > label:not([for])').forEach(function(l){
    var f=l.parentElement.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea'); if(!f) return;
    if(f.closest('label')===l) return; if(!f.id) f.id='pvxf'+(++n); if(l.tagName==='LABEL') l.htmlFor=f.id; else { if(!l.id) l.id='pvxl'+n; if(!f.getAttribute('aria-labelledby')&&!f.getAttribute('aria-label')) f.setAttribute('aria-labelledby',l.id); } }); }
  var tt=0; function soon(){ if(tt) return; tt=setTimeout(function(){ tt=0; tie(); },60); }
  tie(); try{ pvxWatch(function(ms){ for(var i=0;i<ms.length;i++) if(ms[i].addedNodes.length){ soon(); return; } },{childList:true,subtree:true},document.body); }catch(e){}

  /* ---- 1. Add New Patient ---- */
  function unit(id){ var b=document.querySelector('[data-unit-for="'+id+'"] [aria-checked=true]'); return b?b.getAttribute('data-u'):''; }
  function setUnit(id,u){ document.querySelectorAll('[data-unit-for="'+id+'"] [data-u]').forEach(function(b){ b.setAttribute('aria-checked',String(b.getAttribute('data-u')===u)); }); }
  function bare(v){ return /^\d+(?:\.\d+)?$/.test(String(v||'').trim()); }
  function withUnit(id){ var el=$(id); if(!el) return ''; var v=el.value.trim(); return bare(v)?v+' '+unit(id):v; }
  var CHECK={
    apName:function(){ return $('apName').value.trim()?'':'Enter a patient name.'; },
    apSpecies:function(){ return (typeof apArrivalType!=='undefined'&&apArrivalType==='otw')||$('apSpecies').value?'':'Choose a species.'; },
    apPhone:function(){ var d=$('apPhone').value.replace(/\D/g,'').replace(/^1(?=\d{10})/,''); return !d||d.length===10?'':'Enter a 10-digit phone number.'; },
    apWeight:function(){ var v=withUnit('apWeight'); if(!v) return ''; var r=parseWeightInput(v); if(!r.valid) return 'Enter the weight as a number, in kg or lb.'; return r.kg>150?'Enter a weight from 0.01 to 150 kg.':''; },
    apAge:function(){ var v=$('apAge').value.trim(); if(!v) return ''; if(/^\d+\.\d+$/.test(v)) return 'Use whole numbers — for example 18 mo instead of 1.5 y.';
      if(bare(v)) return ''; return fmtAge(v)!==v||/^\d+\s*(years?|months?|weeks?|days?)(,\s*\d+\s*(years?|months?|weeks?|days?))*$/i.test(v)?'':'Enter the age as a number, in years or months.'; }
  };
  function need(){ return !$('apName').value.trim()||(!((typeof apArrivalType!=='undefined'&&apArrivalType==='otw'))&&!$('apSpecies').value&&!(typeof apReviewIntakeId!=='undefined'&&apReviewIntakeId)); }
  function syncCreate(){ var b=$('apCreate'); if(!b) return; var no=need(); b.classList.toggle('pvx-notyet',no); b.setAttribute('aria-disabled',String(no)); }
  function clearAll(){ Object.keys(CHECK).forEach(function(id){ hint(id,''); }); setUnit('apWeight','kg'); setUnit('apAge','y'); setTimeout(syncCreate,0); }
  function wireAp(){
    var M=$('apModal'); if(!M||M.__pvx193) return; M.__pvx193=1;
    M.addEventListener('input',function(e){ var id=e.target&&e.target.id; if(CHECK[id]&&e.target.getAttribute('aria-invalid')) hint(id,CHECK[id]());   /* fixed as you type once flagged */
      if(id==='apWeight'){ var v=e.target.value.toLowerCase(); if(/lb|#|pound/.test(v)) setUnit('apWeight','lb'); else if(/kg|kilo/.test(v)) setUnit('apWeight','kg'); }
      if(id==='apAge'){ var a=e.target.value.toLowerCase(); if(/m/.test(a)) setUnit('apAge','mo'); else if(/y/.test(a)) setUnit('apAge','y'); }
      syncCreate(); },true);
    M.addEventListener('change',function(e){ var id=e.target&&e.target.id; if(id==='apSpecies') hint(id,''); syncCreate(); },true);
    M.addEventListener('focusout',function(e){ var id=e.target&&e.target.id; if(id&&CHECK[id]&&id!=='apName'&&id!=='apSpecies') hint(id,CHECK[id]()); },true);
    M.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('.pvx-unit [data-u]'); if(b){ var id=b.parentElement.getAttribute('data-unit-for'); setUnit(id,b.getAttribute('data-u')); if($(id).getAttribute('aria-invalid')) hint(id,CHECK[id]()); }
      setTimeout(syncCreate,0); },true);
    M.addEventListener('keydown',function(e){ var b=e.target.closest&&e.target.closest('.pvx-unit [data-u]'); if(!b||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')) return; e.preventDefault(); var o=b.parentElement.querySelectorAll('[data-u]'), i=[].indexOf.call(o,b), j=(i+(e.key==='ArrowRight'?1:o.length-1))%o.length; o[j].click(); o[j].focus(); },true);
    var cb=$('apCreate'), prev=cb.onclick;
    cb.onclick=function(ev){
      var order=['apName','apSpecies','apPhone','apWeight','apAge'], first=null;
      order.forEach(function(id){ var m=CHECK[id](); if(id==='apSpecies'&&typeof apReviewIntakeId!=='undefined'&&apReviewIntakeId) m=''; if(!hint(id,m)&&!first) first=id; });
      if(first){ var el=$(first); try{ el.focus(); }catch(e){} if(window.pvxSay) pvxSay(CHECK[first]()); return; }
      ['apWeight','apAge'].forEach(function(id){ var el=$(id); if(el&&bare(el.value)) el.value=el.value.trim()+(id==='apAge'?(unit(id)==='mo'?' mo':' y'):' '+unit(id)); });   /* the unit choice goes with the number */
      return prev.call(this,ev);
    };
  }
  if(typeof window.openAddPatient==='function'){ pvxAfter('openAddPatient',function(){ wireAp(); clearAll(); },'n193'); }
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#apArrival .ap-seg-btn')) setTimeout(function(){ hint('apSpecies',''); syncCreate(); },0); },true);
  wireAp();

  /* ---- 2. Edit Triage: decimal keypad and Anesia's input limits ---- */
  var LIM={temp:[77,113,'temperature','°F'],hr:[0,400,'heart rate','bpm'],rr:[0,150,'respiratory rate','breaths/min']};
  function triMsg(el){ var k=el.getAttribute('data-vk'), v=el.value.trim(); if(!v) return '';
    if(k==='weight'){ var r=parseWeightInput(v); if(!r.valid) return 'Enter the weight in kg (or type lb).'; return r.kg>150?'Enter a weight from 0.01 to 150 kg.':''; }
    var L=LIM[k]; if(!L) return ''; var m=v.match(/^-?\d+(?:\.\d+)?/); var x=m?parseFloat(m[0]):NaN;
    if(!m||v.replace(m[0],'').replace(/[°\s]|f$|bpm|rpm|br\/?min/gi,'')!==''||!isFinite(x)) return 'Enter the '+L[2]+' as a number.';
    return x<L[0]||x>L[1]?'Enter '+L[2]+' from '+L[0]+' to '+L[1]+' '+L[3]+'.':''; }
  function triShow(el,msg){ var h=el.__h; if(!h){ h=document.createElement('div'); h.className='ap-hint'; h.id='pvxth'+(++n); h.setAttribute('aria-live','polite'); el.insertAdjacentElement('afterend',h); el.setAttribute('aria-describedby',h.id); el.__h=h; }
    h.textContent=msg||''; h.classList.toggle('show',!!msg); if(msg) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); return !msg; }
  if(typeof window.openTriageEdit==='function'){ pvxAfter('openTriageEdit',function(){ 
    document.querySelectorAll('#triEditBody [data-vk]').forEach(function(el){ el.setAttribute('inputmode','decimal'); el.setAttribute('autocomplete','off');
      el.addEventListener('blur',function(){ triShow(el,triMsg(el)); }); el.addEventListener('input',function(){ if(el.getAttribute('aria-invalid')) triShow(el,triMsg(el)); }); });
    var by=$('triEditBy'); if(by&&!by.value&&typeof CURRENT_USER==='string') by.value=CURRENT_USER;
    tie($('triEditModal')); },'n193'); }
  var ts=$('triEditSave'); if(ts){ var tsave=ts.onclick; ts.onclick=function(ev){ var bad=null;
    document.querySelectorAll('#triEditBody [data-vk]').forEach(function(el){ if(!triShow(el,triMsg(el))&&!bad) bad=el; });
    if(bad){ bad.focus(); if(window.pvxSay) pvxSay(bad.__h.textContent); return; } return tsave.call(this,ev); }; }

  /* ---- 4. authorized hours: an in-app sheet ---- */
  window.pvxHoursSheet=function(cur,done){
    showConfirm('Authorized hours','Save',function(){},{});
    var box=$('confirmBox'), ok=$('confirmOk'), sub=$('confirmSub'), old=box.querySelector('.pvx-hwrap'); if(old) old.remove();
    var w=document.createElement('div'); w.className='pvx-hwrap';
    w.innerHTML='<div class="pvx-hours"><button type="button" data-h="-1" aria-label="12 hours fewer">−</button><input id="pvxHours" inputmode="numeric" autocomplete="off" aria-label="Total authorized hours" aria-describedby="pvxHoursErr"><span class="pvx-hours-u">hours</span><button type="button" data-h="1" aria-label="12 hours more">+</button></div><div class="pvx-hours-err" id="pvxHoursErr" aria-live="polite"></div>';
    sub.insertAdjacentElement('afterend',w); box.setAttribute('aria-labelledby','confirmTitle');
    var inp=w.querySelector('input'), err=w.querySelector('.pvx-hours-err'); inp.value=String(Math.max(0,Math.round(+cur||0)));
    function read(){ var v=inp.value.trim(); return /^\d{1,3}$/.test(v)?+v:null; }
    w.querySelectorAll('[data-h]').forEach(function(b){ b.onclick=function(){ var v=read(); v=v===null?0:v; v=Math.max(0,Math.min(999,v+12*(+b.getAttribute('data-h')))); inp.value=String(v); err.textContent=''; inp.removeAttribute('aria-invalid'); }; });
    function close(){ $('confirmScrim').classList.remove('open'); box.classList.remove('open'); setTimeout(function(){ if(!box.classList.contains('open')) w.remove(); },300); }
    function save(){ var v=read(); if(v===null){ err.textContent='Enter whole hours from 0 to 999.'; inp.setAttribute('aria-invalid','true'); inp.focus(); return; } close(); done(v); }
    ok.onclick=save; inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); save(); } if(e.key==='Escape'){ e.preventDefault(); close(); } });
    $('confirmCancel').onclick=close; $('confirmScrim').onclick=close;
    setTimeout(function(){ inp.focus(); inp.select(); },60);
  };
  if(typeof window.showConfirm==='function'){ pvxBefore('showConfirm',function(){ var x=document.querySelector('#confirmBox .pvx-hwrap'); if(x) x.remove(); },'n193'); }

  /* ---- 5. Mac expansion tooltip: a clipped field shows its full text on hover ---- */
  document.addEventListener('mouseover',function(e){ var el=e.target; if(!el||el.tagName!=='INPUT'||!/^(text|search|email|tel|url|)$/.test(el.type||'')) return;
    if(el.title&&!el.__pvxTip) return; var clip=el.scrollWidth>el.clientWidth+1&&el.value;
    if(clip){ el.title=el.value; el.__pvxTip=1; } else if(el.__pvxTip){ el.removeAttribute('title'); el.__pvxTip=0; } },true);
})();