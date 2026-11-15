/* ===== AFTERCARE FORMS n120 (Oct 12 2026) — the euthanasia / aftercare form on the reception iPad =====
   Daniel: "clicking on Euthanasia adds them to a queue where reception goes in with an iPad to fill our version of this form"
   (VCA Shoreline × Final Gift "Pet aftercare services and memorial center" + euthanasia consent). Choices: a Flow tab + family
   mode; drawn signatures + a printable copy; prices shown (kept in ts_settings/aftercare_prices, never in this public code);
   when signed, Flow tells the doctor. Then (Oct 12, "Do all of those"), Apple-style:
   · Family mode: a navigation bar (‹ Back · progress dots · English | Español · Staff), one filled primary button pinned at the
     bottom, "For Rosie" as the first title, a soft slide between screens (none under Reduce Motion).
       1 About you · 2 Care of Rosie (choices = Flow's drawer cards; the urn is a photo carousel) · 3 Review (each line with
       Change) · 4 Consent and signature (a pad with a baseline and ×, finger or Apple Pencil, the line follows the hand)
       → "Thank you" → the staff member in the room signs as witness → saved.
   · Español: every family-facing line, the care descriptions and the consent wording; the signed language is kept and the
     printed copy shows the consent as signed (plus the English wording for the record).
   · Flow › Consent forms: longest wait first, the wait shown on each card, the progress line (Sent → With the family → Signed),
     Cancel with Undo. Staff always go into the room with the iPad (Daniel, Oct 12), so there's no Guided Access tip.
   · Signed: every staff Flow screen gets a notice with "Record euthanasia" (opens the ending with the family's choices in).
   · Staff only: consent_form lives on the visit (staff rules); never in pub (tracker), lobby or Grid's field masks.
   · Urn pictures: placeholders until Daniel adds the photos (URN_IMG below, e.g. assets/img/urns/trail.jpg). */
(function(){
  if(typeof switchView!=='function'||typeof completePatient!=='function') return;
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
  var VER='vca-shoreline-finalgift-2026-10';
  var URNS=[['scatter','Blue scattering tube with paw prints'],['carved','Carved wood'],['cedar','Cedar memorial'],['serenity','Serenity photo'],['tin','Paw print tin'],['pouch','Satin pouch'],['trail','Trail to Heaven']];
  var URN_IMG={};   /* key → image path, filled in when the photos arrive; until then a quiet placeholder */
  var PRICE_KEYS=[['euth_outpatient','Euthanasia · outpatient'],['euth_consult','Euthanasia · with consult'],['communal','Communal cremation'],
    ['communal_clay','Communal cremation with clay paw print'],['private_clay','Private cremation with clay paw print'],['clay_only','Clay paw print only']];
  var CONSENT={en:'I, the undersigned, certify that I am the owner or the duly authorized agent of the pet described above, that I am 18 years of age or older, and I give VCA Shoreline, its agents, servants and representatives full and complete authority to humanely euthanize the said pet, and release the veterinary facility and its employees from any and all liability for so euthanizing the said pet. I also certify that, to the best of my knowledge, the said pet has not bitten any person or animal during the last 15 days and has not been exposed to rabies.',
    es:'Yo, la persona que firma, certifico que soy el dueño o el representante debidamente autorizado de la mascota descrita arriba, que tengo 18 años de edad o más, y otorgo a VCA Shoreline, a sus agentes, empleados y representantes plena y total autoridad para practicar la eutanasia de forma humanitaria a dicha mascota, y libero al centro veterinario y a sus empleados de toda responsabilidad por dicha eutanasia. También certifico que, a mi leal saber, dicha mascota no ha mordido a ninguna persona ni animal durante los últimos 15 días y no ha estado expuesta a la rabia.'};
  /* family-facing words: English and Spanish ({pet} and {date} are filled in) */
  var T={
    org2:['Pet aftercare with Final Gift','Cuidado posterior de mascotas con Final Gift'],
    back:['Back','Atrás'], staff:['Staff','Personal'],
    s1:['About you','Sus datos'], s2:['Care of {pet}','Cuidado de {pet}'], s3:['Review','Revisión'], s4c:['Consent','Consentimiento'], s4d:['Sign','Firma'],
    for:['For {pet}','Para {pet}'],
    lead1:['We’re so sorry. This tells us how you’d like us to care for {pet}. Take all the time you need, and ask us anything.','Lo sentimos mucho. Aquí nos indica cómo desea que cuidemos de {pet}. Tómese todo el tiempo que necesite y pregúntenos lo que quiera.'],
    name:['Your full name','Su nombre completo'], addr:['Street address','Dirección'], city:['City','Ciudad'], state:['State','Estado'], zip:['ZIP','Código postal'],
    petname:['Pet’s name','Nombre de la mascota'], dogcat:['Dog or cat','Perro o gato'], Dog:['Dog','Perro'], Cat:['Cat','Gato'], Other:['Other','Otro'],
    care:['Care of {pet}’s body','El cuidado del cuerpo de {pet}'], one:['Choose one.','Elija una opción.'],
    private_t:['Private cremation','Cremación privada'], private_d:['{pet} is cremated individually. The ashes come back to the hospital in the urn you choose, with a clay paw print, to be reunited with you and your family.','{pet} se crema de forma individual. Las cenizas regresan al hospital en la urna que usted elija, con una huella de su patita en arcilla, para volver con usted y su familia.'],
    communal_t:['Communal cremation','Cremación comunitaria'], communal_d:['{pet} is cremated together with other pets, with care and dignity. The ashes are not returned.','{pet} se crema junto con otras mascotas, con cuidado y dignidad. Las cenizas no se devuelven.'],
    release_t:['Take {pet} home','Llevar a {pet} a casa'], release_d:['We release {pet} to you for burial or other arrangements. Local laws apply.','Le entregamos a {pet} para el entierro u otros arreglos. Se aplican las leyes locales.'],
    hold_t:['Decide later','Decidir más tarde'], hold_d:['We can care for {pet} while you decide, for up to 7 days.','Podemos cuidar de {pet} mientras decide, hasta por 7 días.'],
    hold_n:['If we haven’t heard from you by {date}, {pet} will be communally cremated and you’ll be charged for it.','Si no sabemos de usted antes del {date}, se hará una cremación comunitaria de {pet} y se le cobrará.'],
    urn:['Choose an urn','Elija una urna'], urn1:['one is included','una está incluida'], incl:['Includes a clay paw print.','Incluye una huella de la patita en arcilla.'], photo:['Photo soon','Foto pronto'],
    clay:['Add a clay paw print','Añadir una huella de la patita en arcilla'], clay_d:['A keepsake of {pet}’s paw','Un recuerdo de la patita de {pet}'],
    review:['Please review','Revise sus opciones'], review_l:['Make sure everything is right. You can change anything.','Asegúrese de que todo esté bien. Puede cambiar lo que quiera.'],
    r_you:['You','Usted'], r_pet:['Pet','Mascota'], r_care:['Care','Cuidado'], r_urn:['Urn','Urna'], r_keep:['Keepsake','Recuerdo'], r_clay:['Clay paw print','Huella de la patita en arcilla'], r_none:['None','Ninguno'],
    change:['Change','Cambiar'], fees:['Fees','Costos'], totalw:['Total','Total'],
    hold_fee:['Communal cremation is charged if we haven’t heard from you within 7 days.','Si no sabemos de usted en 7 días, se cobrará la cremación comunitaria.'],
    consent_t:['Euthanasia consent','Consentimiento para la eutanasia'], sign_t:['Please sign','Por favor, firme'],
    sign_l:['Signing confirms {pet}’s care as you chose it.','Al firmar, confirma el cuidado de {pet} tal como lo eligió.'],
    signhere:['Sign with your finger or Apple Pencil','Firme con el dedo o con el Apple Pencil'], clear:['Clear','Borrar'],
    thanks:['Thank you','Gracias'], handback:['We’ll take good care of {pet}.','Cuidaremos muy bien de {pet}.'],
    cont:['Continue','Continuar'], toreview:['Review','Revisar'], tosign:['Continue to sign','Continuar para firmar'], signbtn:['Sign','Firmar'],
    e_name:['Please add your full name.','Por favor, escriba su nombre completo.'], e_addr:['Please add your address, so we can reach you about {pet}.','Por favor, escriba su dirección para poder comunicarnos con usted sobre {pet}.'],
    e_one:['Please choose one option.','Por favor, elija una opción.'], e_urn:['Please choose an urn.','Por favor, elija una urna.'], e_sname:['Please type your full name.','Por favor, escriba su nombre completo.'], e_sig:['Please sign in the box.','Por favor, firme en el recuadro.'],
    euth_outpatient:['Euthanasia · outpatient','Eutanasia · ambulatoria'], euth_consult:['Euthanasia · with consult','Eutanasia · con consulta'], communal:['Communal cremation','Cremación comunitaria'],
    communal_clay:['Communal cremation with clay paw print','Cremación comunitaria con huella en arcilla'], private_clay:['Private cremation with clay paw print','Cremación privada con huella en arcilla'], clay_only:['Clay paw print only','Solo huella en arcilla']
  };
  var PRICES=null, open=null, lang='en';
  function L(k,v){ var r=(T[k]||[k,k])[lang==='es'?1:0]; v=v||{}; return r.replace(/\{(\w+)\}/g,function(_,n){ return v[n]!=null?v[n]:''; }); }
  /* the drawer card (endings_n120 fvDCard) for every next-step choice here; a plain button if that module isn't there */
  function DC(o){ if(window.fvDCard) return fvDCard(o); return '<button type="button" class="cf-btn go '+(o.cls||'')+'" '+(o.attrs||'')+'>'+o.title+'</button>'; }
  var IC={ipad:'<rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M11 18h2"/>',print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    private:'<path d="M9 3h6M10 3v3c-2.5 1-4 3.4-4 6.5C6 17 8.5 21 12 21s6-4 6-8.5c0-3.1-1.5-5.5-4-6.5V3"/>',communal:'<circle cx="9" cy="12" r="4.5"/><circle cx="15" cy="12" r="4.5"/>',
    release:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',hold:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    paw:'<circle cx="7.5" cy="10" r="1.7"/><circle cx="10.8" cy="6.6" r="1.7"/><circle cx="14.8" cy="6.9" r="1.7"/><circle cx="17.8" cy="10.6" r="1.7"/><path d="M8.6 17.4c0-2.8 2-5 4.3-5s4.2 2.2 4.2 4.6c0 1.6-1.3 2.4-2.6 2-1-.3-1.6-.4-2-.4s-1.2.1-2 .4c-1.2.4-1.9-.3-1.9-1.6z"/>'};
  var CHEVL='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';

  function isAdmin(){ var e=pvxEmail().toLowerCase(); try{ if(typeof isAdminUser==='function'&&isAdminUser(e)) return true; }catch(_){} return e==='daniel.giordano@pravix.app'; }
  function pet(p){ return (p&&p.name)?String(p.name).split(' ')[0]:'your pet'; }
  function money(n){ return (typeof n==='number'&&isFinite(n))?'$'+n.toFixed(2):''; }
  function dur(m){ return m<1?'just now':m<60?m+' min':Math.floor(m/60)+' h '+(m%60?(m%60)+' min':''); }
  function day(d,l){ try{ return d.toLocaleDateString(l==='es'?'es-US':'en-US',{weekday:'long',month:'long',day:'numeric'}); }catch(e){ return ''; } }
  function today(iso){ try{ return isTodayHosp(new Date(iso)); }catch(e){ return new Date(iso).toDateString()===new Date().toDateString(); } }
  function species(p){ var s=String(p&&p.species||'').toLowerCase(); return /canine|dog/.test(s)?'Dog':/feline|cat/.test(s)?'Cat':(p&&p.species)||''; }
  function careLabel(k){ return ({private:'Private cremation',communal:'Communal cremation',release:'Release remains (take home)',hold:'Hold for further instructions'})[k]||''; }
  function urnLabel(k){ var u=URNS.filter(function(x){ return x[0]===k; })[0]; return u?u[1]:''; }
  function price(k){ var it=PRICES&&PRICES.items&&PRICES.items[k]; return it&&typeof it.amount==='number'?it:null; }
  /* the fee lines for a form: [{k,label,code,amount}] (labels in English for the staff copy) */
  function lines(f){ var L2=[], add=function(k){ var it=price(k), lab=(PRICE_KEYS.filter(function(x){ return x[0]===k; })[0]||[])[1]; L2.push({k:k,label:lab||k,code:it?it.code||'':'',amount:it?it.amount:null}); };
    if(f.kind==='euthanasia') add(f.fee==='consult'?'euth_consult':'euth_outpatient');
    if(f.care==='private') add('private_clay');
    else if(f.care==='communal') add(f.clay?'communal_clay':'communal');
    else if(f.care==='release'&&f.clay) add('clay_only');
    return L2; }
  function total(L2){ var t=0, ok=true; L2.forEach(function(l){ if(typeof l.amount==='number') t+=l.amount; else ok=false; }); return ok?Math.round(t*100)/100:null; }
  function summary(f){ if(!f) return ''; var b=[careLabel(f.care)]; if(f.care==='private'&&f.urn) b.push(urnLabel(f.urn)+' urn'); if(f.clay||f.care==='private') b.push('clay paw print'); return b.filter(Boolean).join(' · '); }
  function active(f){ return !!f&&(f.status==='requested'||f.status==='family'); }
  /* the progress line, for the drawer's sheet and the queue */
  function progress(f){ if(!f) return ''; var st=f.status, S=[['Sent',f.requested&&f.requested.at],['With the family',f.family_at],['Signed',f.signed_at]], at=st==='requested'?0:st==='family'?1:st==='signed'?2:-1;
    return '<ol class="cf-prog" aria-label="Form progress">'+S.map(function(x,i){ var c=i<at||(i===at&&st==='signed')?'done':i===at?'now':''; if(i===0&&at>0) c='done';
      return '<li class="'+c+'"'+(i===at?' aria-current="step"':'')+'>'+x[0]+(x[1]&&(c==='done'||c==='now')?'<small>'+pvxEscQ(pvxHm(x[1]))+'</small>':'')+'</li>'; }).join('')+'</ol>'; }

  /* ---------- prices: ts_settings/aftercare_prices (staff read, admin write — no rules change) ---------- */
  function loadPrices(){ try{ if(typeof DB==='undefined'||!DB) return; var ref=DB.collection('ts_settings').doc('aftercare_prices');
    ref.get().then(function(s){ if(s&&s.exists) { PRICES=s.data()||null; repaint(); } }).catch(function(){});
    if(ref.onSnapshot) ref.onSnapshot(function(s){ if(s&&s.exists){ PRICES=s.data()||null; repaint(); } },function(){}); }catch(e){} }

  /* ---------- saving: one transaction on the visit, never through the visit's own save ---------- */
  function write(p,f,force){
    p.consentForm=f; repaint();
    if(p._demo||typeof DB==='undefined'||!DB) return Promise.resolve(true);
    var ref=DB.collection('visits').doc(String(p.id));
    return DB.runTransaction(function(t){ return t.get(ref).then(function(s){
      var cur=(s&&s.exists&&(s.data()||{}).consent_form)||null;
      if(!force&&cur&&cur.id===f.id&&cur.status==='signed'&&f.status!=='signed') return 'signed-elsewhere';
      if(!force&&cur&&cur.id!==f.id&&active(cur)&&f.status==='requested') return 'other-open';
      t.update(ref,{consent_form:f,last_by:pvxWho(),last_at:new Date().toISOString()}); return true; }); })
      .then(function(r){ if(r!==true){ try{ notify('Not saved','The form changed on another screen',{icon:'info',color:'var(--accent)'}); }catch(_){} } return r===true; })
      .catch(function(e){ console.warn('[aftercare] save',e); try{ notify('Couldn’t save the form','Check the connection and try again',{icon:'info',color:'#C85A50'}); }catch(_){} return false; });
  }
  /* a notice with one action, like an iOS notification with a button */
  function notifyAct(title,sub,act,fn,opts){ try{ notify(title,sub,Object.assign({icon:'info',color:'#8A82A8',dur:12000},opts||{})); var w=document.getElementById('notes'), n=w&&w.lastElementChild; if(!n||!act) return;
    var b=document.createElement('button'); b.type='button'; b.className='n-act'; b.textContent=act;
    b.onclick=function(){ try{ fn(); }catch(e){} n.classList.add('hide'); setTimeout(function(){ n.remove(); },480); };
    var body=n.querySelector('.n-body')||n; body.appendChild(b); }catch(e){} }

  /* ---------- the doctor: send the form (from the ending sheet) ---------- */
  function send(p,kind,fee){
    if(!p) return; if(active(p.consentForm)) return;
    var f={id:'cf_'+Date.now().toString(36),v:VER,kind:kind==='died'?'died':'euthanasia',fee:kind==='died'?null:(fee==='consult'?'consult':'outpatient'),status:'requested',
      requested:{at:new Date().toISOString(),by:pvxWho(),uid:pvxUid()},pet:{name:pet(p),species:species(p)},owner:{name:p.owner||''}};
    write(p,f).then(function(ok){ if(ok) try{ notify('Form sent to reception',pvxEscQ(pet(p))+' · '+(f.kind==='died'?'Aftercare form':'Euthanasia & aftercare form'),{icon:'info',color:'#8A82A8'}); }catch(_){} });
  }
  /* cancel straight away, with Undo (no "are you sure") */
  function cancel(p){ var f=p&&p.consentForm; if(!active(f)) return; var before=JSON.parse(JSON.stringify(f));
    var g=Object.assign({},f,{status:'cancelled',cancelled:{at:new Date().toISOString(),by:pvxWho()}}); write(p,g);
    (window.fvNotifyAct||notifyAct)('Form cancelled',pvxEscQ(pet(p))+'’s '+(f.kind==='died'?'aftercare':'consent')+' form','Undo',function(){ var q=pvxPatientById(p.id); if(q&&q.consentForm&&q.consentForm.id===before.id&&q.consentForm.status==='cancelled') write(q,before,true); },{dur:8000}); }

  /* ---------- Flow › Consent forms ---------- */
  function seg(){ var sw=document.getElementById('switcher'); if(!sw||document.querySelector('#switcher .seg[data-view="consent"]')) return;
    var b=document.createElement('button'); b.className='seg'; b.dataset.view='consent';
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/></svg>Consent forms<span class="cf-badge" id="cfBadge" hidden></span>';
    var cl=sw.querySelector('.seg[data-view="client"]'); sw.insertBefore(b,cl||null); }
  function section(){ var el=document.getElementById('view-consent'); if(el) return el; var cl=document.getElementById('view-client'); if(!cl) return null;
    el=document.createElement('section'); el.className='view hidden'; el.id='view-consent'; cl.parentNode.insertBefore(el,cl); return el; }
  pvxAfter('switchView',function(v){ var el=section(); if(el){ el.classList.toggle('hidden',v!=='consent'); if(v==='consent'){ el.classList.remove('view'); void el.offsetWidth; el.classList.add('view'); renderQueue(); } } },'#18');
  if(typeof switchApp==='function'){ var saBase=switchApp; switchApp=function(app){ var r=saBase.apply(this,arguments); if(app!=='flow'){ var el=document.getElementById('view-consent'); if(el) el.classList.add('hidden'); } return r; }; }
  /* waiting forms first, the longest wait at the top; then today's signed forms, newest first */
  function queue(){ return (PATIENTS||[]).filter(function(p){ var f=p&&p.consentForm; return f&&(active(f)||(f.status==='signed'&&today(f.signed_at||f.requested.at))); })
    .sort(function(a,b){ var A=a.consentForm,B=b.consentForm, ra=active(A)?0:1, rb=active(B)?0:1; if(ra!==rb) return ra-rb;
      return ra===0?(new Date(A.requested.at)-new Date(B.requested.at)):(new Date(B.signed_at)-new Date(A.signed_at)); }); }
  function badge(){ var n=(PATIENTS||[]).filter(function(p){ return p&&active(p.consentForm); }).length+((window.fvDocs&&fvDocs.queue)?fvDocs.queue().length:0), b=document.getElementById('cfBadge'); if(b){ if(b.textContent!==String(n)) b.textContent=n; if(b.hidden!==!n) b.hidden=!n; } }
  function renderQueue(){ var el=section(); if(!el) return; badge(); if(el.classList.contains('hidden')) return;
    var Q=queue();
    var h='<div class="cfq-wrap"><div class="cfq-head"><div><h2 class="cfq-title">Consent forms</h2><div class="cfq-sub">Forms sent by the doctors. Take the tablet into the room, tap <b>Start with the family</b>, and go through it together.</div></div>'
      +'<button type="button" class="cfq-prices" data-cfa="prices">'+(isAdmin()?'Prices':'Price list')+'</button></div>';
    if(!PRICES) h+='<div class="cfq-note">Prices aren’t set yet, so the family form shows the choices without prices.'+(isAdmin()?' Open <b>Prices</b> to add them.':'')+'</div>';
    var G=[]; try{ if(window.fvDocs&&fvDocs.queue) G=fvDocs.queue(); }catch(e){}
    if(!Q.length&&!G.length) h+='<div class="cfq-empty"><b>No forms waiting</b><span>When a doctor sends a euthanasia or aftercare form, it appears here.</span></div>';
    Q.forEach(function(p){ var f=p.consentForm, st=f.status, m=pvxMinsSince(f.requested.at);
      var doc=''; try{ doc=(p.doctor&&p.doctor!=='unassigned')?docShort(p.doctor):''; }catch(e){}
      var wait=st==='signed'?'<div class="cfq-wait done"><b>Signed</b><span>'+pvxEscQ(pvxHm(f.signed_at))+'</span></div>'
        :'<div class="cfq-wait'+(m>=15?' long':'')+'"><b>'+pvxEscQ(dur(m))+'</b><span>'+(st==='family'?'with the family':'waiting')+'</span></div>';
      h+='<div class="cfq-card" data-pid="'+pvxEscQ(p.id)+'">'+wait
        +'<div class="cfq-main"><div class="cfq-name">'+pvxEscQ(((p.name||'')+' '+(p.last||'')).trim())+'</div>'
        +'<div class="cfq-meta">'+pvxEscQ([f.kind==='died'?'Aftercare form':'Euthanasia & aftercare',p.room&&p.room!=='Lobby'?p.room:'',doc,'sent by '+(f.requested.by||'')].filter(Boolean).join(' · '))+'</div>'
        +'<div class="cfq-prog">'+progress(f)+'</div>'
        +(st==='signed'?'<div class="cfq-meta strong">'+pvxEscQ(summary(f))+(f.witness?' · witnessed by '+pvxEscQ(f.witness.name||''):'')+'</div>':'')+'</div>'
        +'<div class="cfq-acts">'+(st==='signed'?DC({ic:IC.print,title:'Print · PDF',desc:'The signed form',arrow:'out',attrs:'data-cfa="print"'})
          :'<button type="button" class="cfq-btn quiet" data-cfa="cancel">Cancel</button>'+DC({ic:IC.ipad,title:st==='family'?'Resume':'Start with the family',desc:st==='family'?'Back to where they were':'Opens the family form',arrow:'out',attrs:'data-cfa="family"'}))+'</div></div>'; });
    try{ if(G.length) h+=fvDocs.queueCards(G); }catch(e){}
    el.innerHTML=h+'</div>'; }
  function repaint(){ try{ renderQueue(); }catch(e){} try{ if(open) paintFamily(); }catch(e){} try{ if(window.fvEndings&&fvEndings.repaint) fvEndings.repaint(); }catch(e){} }

  /* ---------- prices editor ---------- */
  function pricesSheet(){ var adm=isAdmin(), it=(PRICES&&PRICES.items)||{};
    var h='<div class="cfp-box" role="dialog" aria-modal="true" aria-label="Aftercare prices"><div class="cfp-t">Aftercare prices</div><div class="cfp-s">'+(adm?'Applies to this hospital.':'Only an admin can change these.')+'</div><div class="cfp-rows">';
    PRICE_KEYS.forEach(function(k){ var x=it[k[0]]||{}; h+='<label class="cfp-row"><span class="cfp-l">'+pvxEscQ(k[1])+'</span>'
      +'<input class="cfp-code" data-pk="'+k[0]+'" data-pf="code" placeholder="Code" aria-label="'+pvxEscQ(k[1])+' — code" value="'+pvxEscQ(x.code||'')+'"'+(adm?'':' disabled')+'>'
      +'<span class="cfp-dollar">$</span><input class="cfp-amt" data-pk="'+k[0]+'" data-pf="amount" inputmode="decimal" placeholder="0.00" aria-label="'+pvxEscQ(k[1])+' — amount, dollars" value="'+(typeof x.amount==='number'?x.amount.toFixed(2):'')+'"'+(adm?'':' disabled')+'></label>'; });
    h+='</div><div class="cfp-foot">'+(PRICES&&PRICES.updated_by?'<span class="cfp-by">Last changed by '+pvxEscQ(PRICES.updated_by)+'</span>':'<span></span>')
      +'<span><button type="button" class="cf-btn cancel" data-cfa="prices-close">'+(adm?'Cancel':'Close')+'</button>'+(adm?' <button type="button" class="cf-btn go" data-cfa="prices-save">Save</button>':'')+'</span></div></div>';
    var w=document.getElementById('cfPrices'); if(!w){ w=document.createElement('div'); w.id='cfPrices'; w.className='cfp-scrim open'; document.body.appendChild(w); }
    w.className='cfp-scrim open'; w.innerHTML=h; var f=w.querySelector('input:not([disabled])'); if(f) f.focus(); }
  function savePrices(){ var w=document.getElementById('cfPrices'); if(!w) return; var items={}, bad=null;
    PRICE_KEYS.forEach(function(k){ var a=w.querySelector('[data-pk="'+k[0]+'"][data-pf="amount"]'), c=w.querySelector('[data-pk="'+k[0]+'"][data-pf="code"]');
      var v=String(a.value||'').replace(/[$,\s]/g,''); if(v===''){ return; } var n=Number(v); if(!isFinite(n)||n<0){ bad=bad||a; return; }
      items[k[0]]={amount:Math.round(n*100)/100,code:String(c.value||'').trim().slice(0,20)}; });
    if(bad){ bad.focus(); bad.classList.add('cfp-bad'); return; }
    var doc={items:items,updated_at:new Date().toISOString(),updated_by:pvxWho()};
    PRICES=doc; w.className='cfp-scrim'; w.innerHTML=''; repaint();
    try{ if(typeof DB!=='undefined'&&DB) DB.runTransaction(function(t){ var ref=DB.collection('ts_settings').doc('aftercare_prices'); return t.get(ref).then(function(){ t.set(ref,doc); }); })
      .catch(function(e){ console.warn('[aftercare] prices',e); try{ notify('Prices not saved','Only an admin can change them',{icon:'info',color:'#C85A50'}); }catch(_){} }); }catch(e){} }

  /* ---------- family mode ---------- */
  var STEPS=4;   /* 1 about · 2 care · 3 review · 4 sign | 5 thank you · 6 witness (staff) */
  function startFamily(p){ if(!p||!p.consentForm) return; var f=JSON.parse(JSON.stringify(p.consentForm));
    f.owner=f.owner||{}; if(!f.owner.name) f.owner.name=p.owner||''; f.owner.state=f.owner.state||'CT'; f.pet=f.pet||{name:pet(p),species:species(p)};
    lang=f.lang||'en'; open={pid:p.id,step:1,f:f,err:'',dir:0};
    if(f.status==='requested'){ var g=Object.assign({},p.consentForm,{status:'family',family_at:new Date().toISOString(),family_by:pvxWho()}); write(p,g); open.f.status='family'; open.f.family_at=g.family_at; }
    document.body.classList.add('cf-family-on'); paintFamily(); var b=document.getElementById('cfFamily'); if(b) b.scrollTop=0; }
  function el(){ var w=document.getElementById('cfFamily'); if(!w){ w=document.createElement('div'); w.id='cfFamily'; w.setAttribute('role','dialog'); w.setAttribute('aria-modal','true'); document.body.appendChild(w); } return w; }
  function field(id,label,val,attrs){ return '<label class="cff-field"><span>'+label+'</span><input id="'+id+'" value="'+pvxEscQ(val||'')+'" '+(attrs||'')+'></label>'; }
  function careOpts(nm){ var v={pet:pvxEscQ(nm)}; return [
    {k:'private',t:L('private_t',v),d:L('private_d',v),urn:true,clay:'included'},
    {k:'communal',t:L('communal_t',v),d:L('communal_d',v),clay:'option'},
    {k:'release',t:L('release_t',v),d:L('release_d',v),clay:'option'},
    {k:'hold',t:L('hold_t',v),d:L('hold_d',v),clay:null}]; }
  function careName(k,nm){ return L(k+'_t',{pet:pvxEscQ(nm)}); }
  function paintFamily(){ if(!open) return; var p=pvxPatientById(open.pid), w=el(), f=open.f; if(!p){ closeFamily(); return; }
    if(w.querySelector('.cff')) readFields();   /* a live update repaints the form: keep what the family has typed */
    var nm=f.pet&&f.pet.name||pet(p), v={pet:pvxEscQ(nm)}, step=open.step, fam=step<=STEPS;
    var h='<div class="cff" lang="'+lang+'"><header class="cff-nav">'
      +'<div class="cff-nav-l">'+(step>1&&step<=STEPS?'<button type="button" class="cff-back" data-cfh="back">'+CHEVL+'<span>'+L('back')+'</span></button>':'<img class="cff-logo" src="assets/img/logo-light.png" alt="VCA Shoreline">')+'</div>'
      +'<div class="cff-dots" aria-hidden="'+(!fam)+'">'+(fam?Array.from({length:STEPS},function(_,i){ return '<span class="'+(i+1===step?'on':i+1<step?'done':'')+'"></span>'; }).join('')+'<em class="cff-sr">'+(lang==='es'?'Paso ':'Step ')+step+(lang==='es'?' de ':' of ')+STEPS+'</em>':'')+'</div>'
      +'<div class="cff-nav-r">'+(fam?window.fvTextSize(lang)+'<div class="cff-lang" role="group" aria-label="Language / Idioma"><button type="button" lang="en" aria-pressed="'+(lang==='en')+'" data-cfl="en">English</button><button type="button" lang="es" aria-pressed="'+(lang==='es')+'" data-cfl="es">Español</button></div>'
        +'<button type="button" class="cff-staff" data-cfh="hold" aria-label="Staff: press and hold to leave the form">'+L('staff')+'</button>':'')+'</div></header>';
    var anim=open.dir>0?' enter-fwd':open.dir<0?' enter-back':''; open.dir=0;
    h+='<main class="cff-card'+anim+'">';
    var primary='';
    if(step===1){
      h+='<h1 class="cff-big">'+L('for',v)+'</h1><p class="cff-lead">'+L('lead1',v)+'</p>'
        +'<div class="cff-grid">'+field('cffOwner',L('name'),f.owner.name,'autocomplete="name"')+field('cffAddr',L('addr'),f.owner.address,'autocomplete="street-address"')
        +field('cffCity',L('city'),f.owner.city,'autocomplete="address-level2"')+'<div class="cff-two">'+field('cffState',L('state'),f.owner.state,'autocomplete="address-level1" maxlength="2"')+field('cffZip',L('zip'),f.owner.zip,'inputmode="numeric" autocomplete="postal-code" maxlength="10"')+'</div>'
        +field('cffPet',L('petname'),f.pet.name,'')+'<div class="cff-field"><span>'+L('dogcat')+'</span><div class="cff-seg" role="radiogroup" aria-label="'+pvxEscQ(L('dogcat'))+'">'
        +['Dog','Cat','Other'].map(function(s){ var on=(f.pet.species||'')===s||(s==='Other'&&f.pet.species&&f.pet.species!=='Dog'&&f.pet.species!=='Cat'); return '<button type="button" role="radio" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-cfs="'+s+'">'+L(s)+'</button>'; }).join('')+'</div></div></div>';
      primary='<button type="button" class="cff-primary" data-cfh="next">'+L('cont')+'</button>';
    }else if(step===2){
      h+='<h1>'+L('care',v)+'</h1><p class="cff-lead">'+L('one')+'</p><div class="cff-care" role="radiogroup" aria-label="'+pvxEscQ(L('care',v))+'">';
      careOpts(nm).forEach(function(o){ var on=f.care===o.k, pr=o.k==='private'?price('private_clay'):o.k==='communal'?price('communal'):null;
        var dd=o.d+(o.k==='hold'?'<span class="cff-note">'+L('hold_n',{pet:pvxEscQ(nm),date:pvxEscQ(day(new Date(Date.now()+7*864e5),lang))})+'</span>':'');
        h+=DC({ic:IC[o.k],title:o.t,aside:pr?money(pr.amount):'',desc:dd,sel:on,wrap:true,cls:'cff-opt'+(on?' on':''),attrs:'data-cfc="'+o.k+'"'});
        if(on&&o.urn){ h+='<div class="cff-sub"><div class="cff-subt">'+L('urn')+' <span>'+L('urn1')+'</span></div><div class="cff-urns" role="radiogroup" aria-label="'+pvxEscQ(L('urn'))+'">';
          URNS.forEach(function(u){ var uo=f.urn===u[0]; h+='<button type="button" class="cff-urn'+(uo?' on':'')+'" role="radio" aria-checked="'+uo+'" data-cfu="'+u[0]+'">'
            +(URN_IMG[u[0]]?'<img src="'+pvxEscQ(URN_IMG[u[0]])+'" alt="">':'<span class="cff-urn-ph" aria-hidden="true"><svg viewBox="0 0 24 24">'+IC.private+'</svg><em>'+L('photo')+'</em></span>')
            +'<span class="cff-urn-t">'+pvxEscQ(u[1])+'</span><span class="cff-urn-ok" aria-hidden="true"></span></button>'; });
          h+='</div><div class="cff-incl">'+L('incl')+'</div></div>'; }
        if(on&&o.clay==='option'){ var cp=price('clay_only'), cc=price('communal_clay'), cm=price('communal'), add=(o.k==='communal'&&cc&&cm)?Math.round((cc.amount-cm.amount)*100)/100:(cp?cp.amount:null);
          h+='<div class="cff-sub">'+DC({ic:IC.paw,title:L('clay'),aside:add!=null?'+'+money(add):'',desc:L('clay_d',v),sel:!!f.clay,box:true,cls:'cff-check'+(f.clay?' on':''),attrs:'data-cfk="clay"'})+'</div>'; } });
      h+='</div>';
      primary='<button type="button" class="cff-primary" data-cfh="next">'+L('toreview')+'</button>';
    }else if(step===3){
      var L2=lines(f), Tt=total(L2), o=f.owner||{};
      var rowr=function(lbl,val,goStep,id){ return '<div class="cff-rrow"><span class="cff-rl">'+lbl+'</span><span class="cff-rv">'+val+'</span>'+(goStep?'<button type="button" class="cff-edit" data-cfe="'+goStep+'" aria-label="'+pvxEscQ(L('change')+' · '+lbl)+'">'+L('change')+'</button>':'<span></span>')+'</div>'; };
      h+='<h1>'+L('review')+'</h1><p class="cff-lead">'+L('review_l')+'</p><div class="cff-review">'
        +rowr(L('r_you'),pvxEscQ(o.name||'')+'<small>'+pvxEscQ([o.address,o.city,((o.state||'')+' '+(o.zip||'')).trim()].filter(Boolean).join(', '))+'</small>',1)
        +rowr(L('r_pet'),pvxEscQ(nm)+(f.pet&&f.pet.species?' · '+pvxEscQ(L(f.pet.species)||f.pet.species):''),1)
        +rowr(L('r_care'),careName(f.care,nm),2)
        +(f.care==='private'?rowr(L('r_urn'),pvxEscQ(urnLabel(f.urn)),2):'')
        +(f.care!=='hold'?rowr(L('r_keep'),(f.clay||f.care==='private')?L('r_clay'):L('r_none'),2):'')
        +'</div>';
      if(L2.length&&PRICES) h+='<div class="cff-sum"><div class="cff-sumt">'+L('fees')+'</div><table class="cff-fees">'+L2.map(function(l){ return '<tr><td>'+pvxEscQ(L(l.k))+'</td><td>'+(l.amount!=null?money(l.amount):'—')+'</td></tr>'; }).join('')+(Tt!=null?'<tr class="t"><td>'+L('totalw')+'</td><td>'+money(Tt)+'</td></tr>':'')+'</table></div>';
      if(f.care==='hold') h+='<div class="cff-note">'+L('hold_fee')+'</div>';
      primary='<button type="button" class="cff-primary" data-cfh="next">'+L('tosign')+'</button>';
    }else if(step===4){
      h+='<h1>'+(f.kind==='died'?L('sign_t'):L('consent_t'))+'</h1>';
      if(f.kind!=='died') h+='<p class="cff-consent">'+pvxEscQ(CONSENT[lang])+'</p>'; else h+='<p class="cff-lead">'+L('sign_l',v)+'</p>';
      h+=field('cffSignName',L('name'),f.owner.sign_name!=null?f.owner.sign_name:f.owner.name,'autocomplete="name"')
        +'<div class="cff-sigwrap"><div class="cff-sigl">'+L('signhere')+' <button type="button" class="cff-clear" data-cfh="clear-owner">'+L('clear')+'</button></div><div class="cff-sigbox"><canvas class="cff-sig" id="cffSigOwner" aria-label="'+pvxEscQ(L('signhere'))+'"></canvas><span class="cff-x" aria-hidden="true">×</span></div><div class="cff-sigd">'+pvxEscQ(day(new Date(),lang))+'</div></div>';
      primary='<button type="button" class="cff-primary" data-cfh="sign">'+L('signbtn')+'</button>';
    }else if(step===5){
      h+='<div class="cff-thanks"><h1 class="cff-big">'+L('thanks')+'</h1><p class="cff-lead">'+L('handback',{pet:pvxEscQ(nm)})+'</p></div>';
      primary='<button type="button" class="cff-primary" data-cfh="staff">Staff: witness the signature</button>';
    }else if(step===6){
      h+='<h1>Witness</h1><p class="cff-lead">'+pvxEscQ(f.owner_sig&&f.owner_sig.name||f.owner.name||'The owner')+' signed for '+pvxEscQ(nm)+(f.lang==='es'?' (in Spanish)':'')+'. Sign as the witness to the owner’s consent.</p>'
        +'<div class="cff-sum"><div class="cff-sumt">'+pvxEscQ(summary(f))+'</div></div>'
        +'<div class="cff-sigwrap"><div class="cff-sigl">'+pvxEscQ(pvxWho())+' <button type="button" class="cff-clear" data-cfh="clear-witness">Clear</button></div><div class="cff-sigbox"><canvas class="cff-sig" id="cffSigWitness" aria-label="Witness signature pad"></canvas><span class="cff-x" aria-hidden="true">×</span></div><div class="cff-sigd">'+pvxEscQ(day(new Date()))+'</div></div>';
      primary='<button type="button" class="cff-primary" data-cfh="witness">Save the signed form</button>';
    }
    if(open.err) h+='<div class="cff-err" role="alert">'+pvxEscQ(typeof open.err==='object'?L(open.err.k,open.err.v):open.err)+'</div>';
    h+='</main><footer class="cff-bar">'+primary+'</footer></div>';
    var keep=document.activeElement&&w.contains(document.activeElement)&&document.activeElement.id;
    w.className='cf-family-sheet open'; w.innerHTML=h;
    if(keep){ var k=document.getElementById(keep); if(k&&k.focus) k.focus({preventScroll:true}); }
    pad('cffSigOwner','sigOwner'); pad('cffSigWitness','sigWitness');
  }
  function readFields(){ var f=open.f, v=function(id){ var e=document.getElementById(id); return e?String(e.value||'').trim():null; };
    if(document.getElementById('cffOwner')){ f.owner.name=v('cffOwner'); f.owner.address=v('cffAddr'); f.owner.city=v('cffCity'); f.owner.state=(v('cffState')||'').toUpperCase(); f.owner.zip=v('cffZip'); f.pet.name=v('cffPet')||f.pet.name; }
    if(document.getElementById('cffSignName')) f.owner.sign_name=v('cffSignName'); }
  function E(k,v){ return {k:k,v:v}; }
  function go(step,dir){ open.err=''; open.step=step; open.dir=dir; paintFamily(); var b=document.getElementById('cfFamily'); if(b) b.scrollTop=0; }
  /* signature pads: smooth strokes whose width follows the hand (Apple Pencil pressure, or slower = thicker for a finger) */
  function pad(id,key,store){ var c=document.getElementById(id); if(!c) return; var r=c.getBoundingClientRect(), dpr=Math.max(1,window.devicePixelRatio||1);
    c.width=Math.round(r.width*dpr); c.height=Math.round(r.height*dpr); var x=c.getContext('2d'); x.scale(dpr,dpr);
    var H=store||open, S=H[key]=H[key]||[]; draw(x,S,r.width,r.height,1); var cur=null, last=null;
    function at(e){ var b=c.getBoundingClientRect(), px=Math.round((e.clientX-b.left)*10)/10, py=Math.round((e.clientY-b.top)*10)/10, now=performance.now(), w;
      if(e.pointerType==='pen'&&e.pressure>0) w=1.1+e.pressure*3.2;
      else { var sp=last?Math.hypot(px-last[0],py-last[1])/Math.max(1,now-last[3]):0; w=Math.max(1.5,Math.min(3.6,3.6-sp*1.4)); if(last) w=last[2]*0.6+w*0.4; }
      var pt=[px,py,Math.round(w*100)/100,now]; last=pt; return pt; }
    c.onpointerdown=function(e){ e.preventDefault(); if(open&&open.err&&open.err.k==='e_sig'){ open.err=''; var er=document.querySelector('#cfFamily .cff-err'); if(er) er.remove(); } try{ c.setPointerCapture(e.pointerId); }catch(_){} last=null; cur=[at(e)]; S.push(cur); draw(x,S,r.width,r.height,1); };
    c.onpointermove=function(e){ if(!cur) return; e.preventDefault(); var ev=e.getCoalescedEvents?e.getCoalescedEvents():[e]; (ev.length?ev:[e]).forEach(function(q){ cur.push(at(q)); }); draw(x,S,r.width,r.height,1); };
    c.onpointerup=c.onpointercancel=function(){ cur=null; };
    c.dataset.w=r.width; c.dataset.h=r.height; }
  function draw(x,S,w,h,k){ x.clearRect(0,0,w,h); x.lineCap='round'; x.lineJoin='round'; x.strokeStyle='#14181F';
    S.forEach(function(s){ if(s.length===1){ x.beginPath(); x.arc(s[0][0],s[0][1],(s[0][2]||2.4)/2,0,Math.PI*2); x.fillStyle='#14181F'; x.fill(); return; }
      for(var i=1;i<s.length;i++){ var a=s[i-1], b=s[i], m0=i>1?[(s[i-2][0]+a[0])/2,(s[i-2][1]+a[1])/2]:[a[0],a[1]], m1=[(a[0]+b[0])/2,(a[1]+b[1])/2];
        x.beginPath(); x.lineWidth=((a[2]||2.4)+(b[2]||2.4))/2; x.moveTo(m0[0],m0[1]); x.quadraticCurveTo(a[0],a[1],m1[0],m1[1]); x.stroke(); }
      var e=s[s.length-1], pv=s[s.length-2]; x.beginPath(); x.lineWidth=e[2]||2.4; x.moveTo((pv[0]+e[0])/2,(pv[1]+e[1])/2); x.lineTo(e[0],e[1]); x.stroke(); }); }
  function inked(key,store){ var H=store||open, S=H&&H[key]||[], n=0; S.forEach(function(s){ n+=s.length; }); return n>=8; }
  function png(key,id,store){ var c=document.getElementById(id); var S=(store||open)[key]||[]; var w=+(c&&c.dataset.w)||600, h=+(c&&c.dataset.h)||180;
    var o=document.createElement('canvas'), k=Math.min(1,640/w); o.width=Math.round(w*k); o.height=Math.round(h*k); var x=o.getContext('2d'); x.scale(k,k); draw(x,S,w,h,k);
    return o.toDataURL('image/png'); }
  function next(){ var f=open.f; readFields(); open.err='';
    if(open.step===1){ if(!f.owner.name){ open.err=E('e_name'); paintFamily(); focus('cffOwner'); return; }
      if(!f.owner.address||!f.owner.city||!f.owner.zip){ open.err=E('e_addr',{pet:f.pet.name||pet(pvxPatientById(open.pid))}); paintFamily(); focus(!f.owner.address?'cffAddr':!f.owner.city?'cffCity':'cffZip'); return; } }
    if(open.step===2){ if(!f.care){ open.err=E('e_one'); paintFamily(); return; } if(f.care==='private'&&!f.urn){ open.err=E('e_urn'); paintFamily(); var u=document.querySelector('[data-cfu]'); if(u) u.focus(); return; } }
    go(open.step+1,1); }
  function focus(id){ var e=document.getElementById(id); if(e) e.focus(); }
  function signOwner(){ var f=open.f; readFields(); open.err='';
    if(!f.owner.sign_name){ open.err=E('e_sname'); paintFamily(); focus('cffSignName'); return; }
    if(!inked('sigOwner')){ open.err=E('e_sig'); paintFamily(); return; }
    f.owner_sig={name:f.owner.sign_name,at:new Date().toISOString(),png:png('sigOwner','cffSigOwner')};
    f.lang=lang; f.lines=lines(f); f.total=total(f.lines); f.consent_text=f.kind==='died'?null:CONSENT[lang]; f.consent_text_en=f.kind==='died'?null:CONSENT.en; go(5,1); }
  function signWitness(){ var p=pvxPatientById(open.pid), f=open.f; open.err='';
    if(!inked('sigWitness')){ open.err='Please sign as the witness.'; paintFamily(); return; }
    f.witness={name:pvxWho(),uid:pvxUid(),at:new Date().toISOString(),png:png('sigWitness','cffSigWitness')};
    f.status='signed'; f.signed_at=f.witness.at; delete f.owner.sign_name;
    var done=JSON.parse(JSON.stringify(f));
    write(p,done).then(function(ok){ if(!ok){ open.err='Couldn’t save. Check the connection and tap Save again.'; open.f.status='family'; paintFamily(); return; }
      seen[p.id]=done.id+':signed'; try{ if(window.fvDocs&&fvDocs.fileEnding) fvDocs.fileEnding(p,done); }catch(e){ console.warn('[aftercare] pdf',e); } closeFamily(); try{ notify('Form signed',pvxEscQ(done.pet&&done.pet.name||pet(p))+' · '+pvxEscQ(summary(done)),{icon:'info',color:'#8A82A8'}); }catch(_){} }); }
  /* n125 · Aa text size for the family (Standard / Large / Extra large); resets when the family form closes */
  window.fvTextSize=function(lg){ var cur=window.__cffTS||'s', es=lg==='es', L3=es?['Normal','Grande','Muy grande']:['Standard','Large','Extra large'];
    return '<div class="cff-ts" role="group" aria-label="'+(es?'Tamaño del texto':'Text size')+'">'+['s','l','xl'].map(function(k,i){ return '<button type="button" data-cfts="'+k+'" aria-pressed="'+(cur===k)+'" aria-label="'+L3[i]+'">A</button>'; }).join('')+'</div>'; };
  window.fvApplyTS=function(){ var w=document.getElementById('cfFamily'); if(!w) return; var k=window.__cffTS||'s'; if(k==='s') w.removeAttribute('data-ts'); else w.setAttribute('data-ts',k);
    [].forEach.call(w.querySelectorAll('[data-cfts]'),function(b){ b.setAttribute('aria-pressed',String(b.dataset.cfts===k)); }); };
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#cfFamily [data-cfts]'); if(!b) return; window.__cffTS=b.dataset.cfts; window.fvApplyTS(); },true);
  function closeFamily(){ open=null; lang='en'; window.__cffTS='s'; var tw=document.getElementById('cfFamily'); if(tw) tw.removeAttribute('data-ts'); document.body.classList.remove('cf-family-on'); var w=document.getElementById('cfFamily'); if(w){ w.className='cf-family-sheet'; w.innerHTML=''; } renderQueue(); }

  /* staff leave: press and hold "Staff" for 1.2 s (the family can't leave by a stray tap); answers stay on this iPad for Resume */
  var holdT=null, drafts={};
  document.addEventListener('pointerdown',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-cfh="hold"]'); if(!b) return; b.classList.add('holding');
    holdT=setTimeout(function(){ if(open){ readFields(); drafts[open.pid]={f:open.f,step:Math.min(open.step,STEPS),lang:lang}; } closeFamily(); },1200); },true);
  ['pointerup','pointercancel','pointerleave'].forEach(function(t){ document.addEventListener(t,function(){ clearTimeout(holdT); var b=document.querySelector('[data-cfh="hold"].holding'); if(b) b.classList.remove('holding'); },true); });

  /* ---------- printable copy (Print · PDF): laid out like the paper form ---------- */
  function printCopy(p,html){ var f=p&&p.consentForm; if(!f||f.status!=='signed') return;
    if(!html&&window.fvDocs&&fvDocs.docForForm){ var d=fvDocs.docForForm(p,f.id); if(d){ fvDocs.view(p,d); return; } } var L2=f.lines||lines(f), Tt=f.total!=null?f.total:total(L2), o=f.owner||{};
    function box(on){ return '<span class="cpb">'+(on?'✓':'')+'</span>'; }
    var h='<div class="cp"><div class="cp-head"><img src="assets/img/logo-light.png" alt=""><div><b>VCA Shoreline Veterinary Referral &amp; Emergency Center</b><br>895 Bridgeport Ave, Shelton, CT 06484 · 203-929-8600</div></div>'
      +'<h1>Pet aftercare'+(f.kind==='died'?'':' and euthanasia consent')+'</h1><div class="cp-sub">Pet aftercare services and memorial center · Final Gift · Visit '+pvxEscQ(p.hid||'')+(f.lang==='es'?' · Signed in Spanish':'')+'</div>'
      +'<table class="cp-t"><tr><td>Owner</td><td>'+pvxEscQ(o.name||'')+'</td></tr><tr><td>Address</td><td>'+pvxEscQ([o.address,o.city,(o.state||'')+' '+(o.zip||'')].filter(function(x){ return String(x||'').trim(); }).join(', '))+'</td></tr>'
      +'<tr><td>Pet</td><td>'+pvxEscQ(f.pet&&f.pet.name||'')+' · '+pvxEscQ(f.pet&&f.pet.species||'')+'</td></tr></table>'
      +'<h2>Care of body</h2><div class="cp-care">'+['private','communal','release','hold'].map(function(k){ return '<div>'+box(f.care===k)+careLabel(k)+(k==='private'&&f.care==='private'&&f.urn?' — urn: '+pvxEscQ(urnLabel(f.urn)):'')+'</div>'; }).join('')
      +'<div>'+box(f.clay||f.care==='private')+'Clay paw print'+(f.care==='private'?' (included)':'')+'</div></div>'
      +(f.care==='hold'?'<p class="cp-note">We will hold the pet for 7 days from this date. If VCA Shoreline is not told of a decision within 7 days, a communal cremation is charged and the remains are released to Final Gift.</p>':'')
      +(f.consent_text?'<h2>Euthanasia</h2><p class="cp-consent">'+pvxEscQ(f.consent_text)+'</p>'+(f.lang==='es'&&f.consent_text_en?'<p class="cp-consent en"><b>English wording (for the record):</b> '+pvxEscQ(f.consent_text_en)+'</p>':''):'')
      +'<div class="cp-sigs"><div><img src="'+pvxEscQ(f.owner_sig&&f.owner_sig.png||'')+'" alt="Owner signature"><div class="cp-line">Signature · '+pvxEscQ(f.owner_sig&&f.owner_sig.name||'')+' · '+pvxEscQ(new Date(f.owner_sig&&f.owner_sig.at||f.signed_at).toLocaleString('en-US'))+'</div></div>'
      +'<div><img src="'+pvxEscQ(f.witness&&f.witness.png||'')+'" alt="Witness signature"><div class="cp-line">Witness to pet owner’s consent · '+pvxEscQ(f.witness&&f.witness.name||'')+' · '+pvxEscQ(new Date(f.signed_at).toLocaleString('en-US'))+'</div></div></div>'
      +(L2.length?'<h2>Fees (staff copy)</h2><table class="cp-fees">'+L2.map(function(l){ return '<tr><td>'+pvxEscQ(l.label)+'</td><td>'+pvxEscQ(l.code?'Code #'+l.code:'')+'</td><td>'+(l.amount!=null?money(l.amount):'—')+'</td></tr>'; }).join('')+(Tt!=null?'<tr class="t"><td>Total</td><td></td><td>'+money(Tt)+'</td></tr>':'')+'</table>':'')
      +'<div class="cp-foot">Sent by '+pvxEscQ(f.requested&&f.requested.by||'')+' · '+pvxEscQ(new Date(f.requested&&f.requested.at).toLocaleString('en-US'))+' · Pravix Flow</div></div>';
    var w=document.getElementById('cfPrint'); if(!w){ w=document.createElement('div'); w.id='cfPrint'; document.body.appendChild(w); }
    w.innerHTML=h; document.body.classList.add('cf-printing');
    var done=function(){ document.body.classList.remove('cf-printing'); window.removeEventListener('afterprint',done); };
    window.addEventListener('afterprint',done); setTimeout(function(){ try{ window.print(); }catch(e){} setTimeout(done,1500); },120); }

  /* ---------- clicks ---------- */
  document.addEventListener('click',function(e){ var t=e.target; if(!t||!t.closest) return;
    var a=t.closest('[data-cfa]'); if(a){ var c=a.closest('.cfq-card'), p=c?pvxPatientById(c.dataset.pid):null, w=a.dataset.cfa;
      if(w==='family'&&p){ var d=drafts[p.id]; if(d&&p.consentForm&&d.f.id===p.consentForm.id){ lang=d.lang||'en'; open={pid:p.id,step:d.step,f:d.f,err:'',dir:0}; document.body.classList.add('cf-family-on'); paintFamily(); } else startFamily(p); }
      else if(w==='cancel'&&p) cancel(p);
      else if(w==='print'&&p) printCopy(p);
      else if(w==='prices') pricesSheet();
      else if(w==='prices-close'){ var s=document.getElementById('cfPrices'); if(s){ s.className='cfp-scrim'; s.innerHTML=''; } }
      else if(w==='prices-save') savePrices();
      return; }
    if(!open) return; var f=open.f;
    var lg=t.closest('[data-cfl]'); if(lg){ readFields(); lang=lg.dataset.cfl; paintFamily(); var q0=document.querySelector('[data-cfl="'+lang+'"]'); if(q0) q0.focus(); return; }
    var ed=t.closest('[data-cfe]'); if(ed){ go(+ed.dataset.cfe,-1); return; }
    var h=t.closest('[data-cfh]'); if(h){ var x=h.dataset.cfh;
      if(x==='next') next(); else if(x==='back'){ readFields(); go(Math.max(1,open.step-1),-1); }
      else if(x==='sign') signOwner(); else if(x==='staff') go(6,1); else if(x==='witness') signWitness();
      else if(x==='clear-owner'){ open.sigOwner=[]; paintFamily(); } else if(x==='clear-witness'){ open.sigWitness=[]; paintFamily(); }
      return; }
    var s=t.closest('[data-cfs]'); if(s){ readFields(); f.pet.species=s.dataset.cfs; paintFamily(); return; }
    var cc=t.closest('[data-cfc]'); if(cc){ f.care=cc.dataset.cfc; if(f.care==='private'||f.care==='hold') f.clay=false; if(f.care!=='private') f.urn=null; open.err=''; paintFamily(); var q=document.querySelector('[data-cfc="'+f.care+'"]'); if(q) q.focus({preventScroll:true}); return; }
    var u=t.closest('[data-cfu]'); if(u){ f.urn=u.dataset.cfu; open.err=''; var sx=(document.querySelector('.cff-urns')||{}).scrollLeft||0; paintFamily(); var ur=document.querySelector('.cff-urns'); if(ur) ur.scrollLeft=sx; var q2=document.querySelector('[data-cfu="'+f.urn+'"]'); if(q2) q2.focus({preventScroll:true}); return; }
    var k=t.closest('[data-cfk]'); if(k){ f.clay=!f.clay; paintFamily(); var q3=document.querySelector('[data-cfk]'); if(q3) q3.focus({preventScroll:true}); return; }
  });

  /* ---------- the doctor hears about it: requests and signatures, on every staff screen ---------- */
  var seen={}, seeded=false;
  setInterval(function(){ if(LOBBY||typeof PATIENTS==='undefined') return; try{
    (PATIENTS||[]).forEach(function(p){ var f=p&&p.consentForm; if(!f) return; var k=f.id+':'+f.status, was=seen[p.id]; seen[p.id]=k; if(!seeded||was===k) return;
      if(f.status==='signed'){ var ended=(typeof isCompleted==='function')&&isCompleted(p);
        notifyAct('Form signed',pvxEscQ(f.pet&&f.pet.name||pet(p))+' · '+pvxEscQ(summary(f)),ended?null:(f.kind==='died'?'Record death':'Record euthanasia'),function(){ if(window.fvEndings&&fvEndings.openSigned) fvEndings.openSigned(pvxPatientById(p.id)); },{dur:15000}); }
      else if(f.status==='requested'&&(!f.requested||f.requested.uid!==pvxUid())) notifyAct('Form for reception',pvxEscQ(pet(p))+' · sent by '+pvxEscQ(f.requested&&f.requested.by||''),'Open',function(){ switchView('consent'); },{dur:9000}); });
    seeded=true; badge(); var v=document.getElementById('view-consent'); if(v&&!v.classList.contains('hidden')&&!open) renderQueue(); }catch(e){} },2000);

  seg(); section(); badge(); loadPrices();
  window.fvNotifyAct=notifyAct;
  window.fvSigPad={pad:function(id,key,store){ pad(id,key,store); },png:function(key,id,store){ return png(key,id,store); },inked:function(key,store){ return inked(key,store); },draw:draw};
  window.fvConsentRepaint=function(){ repaint(); badge(); };
  window.fvConsent={consentText:function(l){ return CONSENT[l]||CONSENT.en; },send:send,cancel:cancel,active:active,summary:summary,careLabel:careLabel,urnLabel:urnLabel,lines:lines,total:total,progress:progress,
    setPrices:function(d){ PRICES=d; repaint(); },open:function(p){ startFamily(p); },print:printCopy,URN_IMG:URN_IMG,state:function(){ return open; },lang:function(){ return lang; }};
})();