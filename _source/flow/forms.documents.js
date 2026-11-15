/* ===== DOCUMENTS n122 (Oct 13 2026) — Pravix Forms inside Flow =====
   Daniel: "Build it" (the Pravix Forms prototype). Staff always go into the room with the iPad.
   · The patient drawer gets a Documents section: signed PDFs saved on the visit, the body tag, forms out with reception,
     and "Send a form" for any form the hospital has mapped in Pravix Forms (shoreline.pravix.app/forms).
   · Reception's Consent forms tab lists those forms too; "Start with the family" opens the family's iPad screens:
     read the form (already filled from the visit), answer what it asks, sign; the staff member in the room witnesses.
   · The signed copy is the hospital's own PDF, filled and locked, re-opened to check it, fingerprinted (SHA-256) and saved in
     visit_docs (staff only; never in the tracker or the waiting room). The euthanasia & aftercare form does the same when a
     mapped "Other ending" template exists; without one it keeps today's printable copy.
   · Viewer (with the fingerprint check), Print, Download, and Make a packet: documents in order, one bookmark each,
     contact details or fees blacked out by redrawing those pages (the text is removed, not covered).
   · The PDF work runs in this browser (forms/lib/pvx-pdf.js: pdf-lib + pdf.js today, PdfCraft's engine later). */
(function(){
  if(typeof fillDrawer!=='function'||typeof renderDisposition!=='function') return;
  var LIB='/forms/lib/', LV='20261013n';   /* n126: verify codes on signed copies */
  function pet(p){ try{ return dispFirstName(p); }catch(e){ return p&&p.name||'the pet'; } }
  function noteAct(t,s,a,fn,o){ if(window.fvNotifyAct) fvNotifyAct(t,s,a,fn,Object.assign({color:'#3E8FA5'},o||{})); else pvxNote(t,s,o); }
  var IC={doc:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>',tag:'<path d="M3 12l9-9h9v9l-9 9z"/><circle cx="16" cy="8" r="1.6"/>',send:'<path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/>',plus:'<path d="M12 5v14M5 12h14"/>',chev:'<path d="M9 6l6 6-6 6"/>',up:'<path d="M6 15l6-6 6 6"/>',down:'<path d="M6 9l6 6 6-6"/>',shield:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',warn:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',ipad:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',dl:'<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>'};
  function svg(n){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+IC[n]+'</svg>'; }

  /* ---------- the PDF libraries, loaded the first time they're needed ---------- */
  var libP=null;
  function load(src){ return new Promise(function(ok,bad){ var s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=function(){ bad(new Error('Could not load '+src)); }; document.head.appendChild(s); }); }
  function lib(){ if(libP) return libP; libP=(window.PvxPdf?Promise.resolve():load(LIB+'pvx-pdf.js?v='+LV)).then(function(){ return window.PvxForms?null:load(LIB+'pvx-forms.js?v='+LV); }).then(function(){ return PvxPdf.ready(); });
    libP.catch(function(){ libP=null; }); return libP; }

  /* ---------- templates (Pravix Forms) ---------- */
  var TPL={list:null,at:0,p:null};
  function templates(force){ if(!force&&TPL.list&&Date.now()-TPL.at<5*60000) return Promise.resolve(TPL.list); if(TPL.p&&!force) return TPL.p; var D=pvxDb(); if(!D) return Promise.resolve([]);
    TPL.p=D.collection('form_templates').where('tenant_id','==',pvxTenant()).get().then(function(s){ TPL.list=s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }).filter(function(t){ return t.status==='ready'; })
      .sort(function(a,b){ return String(b.updated_at||'').localeCompare(String(a.updated_at||'')); }); TPL.at=Date.now(); TPL.p=null; return TPL.list; })
      .catch(function(e){ console.warn('[docs] templates',e); TPL.p=null; return TPL.list||[]; });
    return TPL.p; }
  function endingTemplate(kind){ return templates().then(function(L){ return L.filter(function(t){ return t.purpose==='ending'&&(t.kind||'euthanasia')===(kind==='died'?'died':'euthanasia'); })[0]||null; }); }

  /* ---------- documents on a visit ---------- */
  var DOCS={};
  function loadDocs(p,force){ var k=String(p.id), c=DOCS[k]; if(c&&!force&&(c.list||c.p)) return c.p||Promise.resolve(c.list); var D=pvxDb(); if(!D) return Promise.resolve([]);
    c=DOCS[k]=c||{list:null}; c.p=D.collection('visit_docs').where('visit_id','==',k).where('tenant_id','==',pvxTenant()).get().then(function(s){
      c.list=s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }).filter(function(m){ return !m.tenant_id||m.tenant_id===pvxTenant(); }).sort(function(a,b){ return String(b.created_at||'').localeCompare(String(a.created_at||'')); });
      c.p=null; return c.list; }).catch(function(e){ console.warn('[docs] list',e); c.p=null; c.err=true; return c.list||[]; });
    return c.p; }
  function docsOf(p){ var c=p&&DOCS[String(p.id)]; return (c&&c.list)||[]; }
  function docForForm(p,formId){ return docsOf(p).filter(function(d){ return d.form_id&&d.form_id===formId; })[0]||null; }

  /* ---------- forms out with reception (form_requests) ---------- */
  var REQ=[], reqUnsub=null, reqSeen={};
  function listen(){ var D=pvxDb(); if(!D||reqUnsub) return;
    try{ reqUnsub=D.collection('form_requests').where('tenant_id','==',pvxTenant()).where('status','in',['requested','family']).onSnapshot(function(s){
      var before=REQ.map(function(r){ return r.id; }); REQ=s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
      REQ.forEach(function(r){ if(before.indexOf(r.id)<0&&!reqSeen[r.id]&&r.status==='requested'&&r.requested&&r.requested.uid!==pvxUid()&&(Date.now()-new Date(r.requested.at))<10*60000){ reqSeen[r.id]=1;
        var p=pvxPatientById(r.visit_id); noteAct('Form for reception',pvxEscQ(p?pet(p):'A patient')+' · '+pvxEscQ(r.template_name||'Form'),'Open',function(){ try{ switchView('consent'); }catch(e){} }); } });
      repaintAll(); },function(e){ console.warn('[docs] requests',e); reqUnsub=null; }); }catch(e){ console.warn('[docs] listen',e); } }
  var tries=0; (function wait(){ if(pvxDb()) return listen(); if(++tries<60) setTimeout(wait,500); })();
  function reqsOf(p){ return REQ.filter(function(r){ return String(r.visit_id)===String(p.id); }); }
  function queue(){ return REQ.filter(function(r){ return !!pvxPatientById(r.visit_id); }).sort(function(a,b){ return new Date(a.requested.at)-new Date(b.requested.at); }); }
  function dur(m){ return m<1?'just now':m<60?m+' min':Math.floor(m/60)+' h '+(m%60)+' min'; }
  function queueCards(G){ var DC=window.fvDCard; return G.map(function(r){ var p=pvxPatientById(r.visit_id), m=pvxMinsSince(r.requested.at), st=r.status;
      return '<div class="cfq-card fvq-card" data-rid="'+pvxEscQ(r.id)+'"><div class="cfq-wait'+(m>=15?' long':'')+'"><b>'+pvxEscQ(dur(m))+'</b><span>'+(st==='family'?'with the family':'waiting')+'</span></div>'
        +'<div class="cfq-main"><div class="cfq-name">'+pvxEscQ(((p.name||'')+' '+(p.last||'')).trim())+'</div><div class="cfq-meta">'+pvxEscQ([r.template_name||'Form',p.room&&p.room!=='Lobby'?p.room:'','sent by '+(r.requested.by||'')].filter(Boolean).join(' · '))+'</div></div>'
        +'<div class="cfq-acts"><button type="button" class="cfq-btn quiet" data-fvq="cancel" data-rid="'+pvxEscQ(r.id)+'">Cancel</button>'
        +(DC?DC({ic:IC.ipad,title:st==='family'?'Resume':'Start with the family',desc:'Opens the family form',arrow:'out',attrs:'data-fvq="family" data-rid="'+pvxEscQ(r.id)+'"'}):'<button type="button" class="cfq-btn" data-fvq="family" data-rid="'+pvxEscQ(r.id)+'">Start with the family</button>')+'</div></div>'; }).join(''); }
  function setReq(r,patch){ var D=pvxDb(); if(!D) return Promise.reject(new Error('offline')); Object.assign(r,patch); return D.collection('form_requests').doc(r.id).set(patch,{merge:true}); }
  function repaintAll(){ try{ if(window.fvConsentRepaint) fvConsentRepaint(); }catch(e){} var p=pvxActivePatient(); if(p) try{ paintDocs(p); }catch(e){} }

  /* ---------- the drawer: Documents ---------- */
  function mount(){ var m=document.getElementById('docsMount'); if(m) return m; var after=document.getElementById('intakeCardMount')||document.getElementById('recordsMount'); if(!after) return null;
    m=document.createElement('div'); m.id='docsMount'; after.insertAdjacentElement('afterend',m); return m; }
  pvxAfter('fillDrawer',function(p){ try{ if(p){ paintDocs(p); var k=String(p.id); if(!DOCS[k]||!DOCS[k].list||Date.now()-(DOCS[k].at||0)>60000){ (DOCS[k]=DOCS[k]||{}).at=Date.now(); loadDocs(p,true).then(function(){ var c=pvxActivePatient(); if(c&&c.id===p.id) paintDocs(c); }); } } }catch(e){ console.warn('[docs]',e); } },'#19');
  function paintDocs(p){ var m=mount(); if(!m) return; var D=docsOf(p), R=reqsOf(p), F=p.consentForm, e=p.ending, rows=[];
    D.forEach(function(d){ rows.push('<button type="button" class="fvd-item" data-fvd="view" data-doc="'+pvxEscQ(d.id)+'"><span class="fvd-thumb" aria-hidden="true">'+svg('doc')+'</span><span class="fvd-b"><span class="fvd-t">'+pvxEscQ(d.title||'Signed form')+'</span><span class="fvd-s">Signed '+pvxEscQ(pvxHm(d.signed_at||d.created_at))+(d.signed_by?' · '+pvxEscQ(d.signed_by):'')+(d.witness?' · witnessed':'')+'</span><span class="fvd-ok">'+(d.pages||1)+' page'+((d.pages||1)===1?'':'s')+' · PDF</span></span><span class="fvd-chev" aria-hidden="true">'+svg('chev')+'</span></button>'); });
    if(F&&F.status==='signed'&&!docForForm(p,F.id)) rows.push('<button type="button" class="fvd-item" data-fvd="print-consent"><span class="fvd-thumb" aria-hidden="true">'+svg('doc')+'</span><span class="fvd-b"><span class="fvd-t">'+(F.kind==='died'?'Aftercare form':'Euthanasia &amp; aftercare consent')+'</span><span class="fvd-s">Signed '+pvxEscQ(pvxHm(F.signed_at))+' · printable copy</span></span><span class="fvd-chev" aria-hidden="true">'+svg('chev')+'</span></button>');
    if(e&&e.aftercare) rows.push('<div class="fvd-item static"><span class="fvd-thumb" aria-hidden="true">'+svg('tag')+'</span><span class="fvd-b"><span class="fvd-t">Body tag · 4 × 6 in</span><span class="fvd-s">'+pvxEscQ((window.fvEndings&&fvEndings.summary)?fvEndings.summary(e,false):'')+'</span></span><button type="button" class="fvd-mini" data-fvd="tag">Print</button></div>');
    R.forEach(function(r){ rows.push('<div class="fvd-item static pending"><span class="fvd-thumb" aria-hidden="true">'+svg('send')+'</span><span class="fvd-b"><span class="fvd-t">'+pvxEscQ(r.template_name||'Form')+'</span><span class="fvd-s">'+(r.status==='family'?'With the family':'With reception')+' · sent '+pvxEscQ(pvxHm(r.requested.at))+'</span></span><button type="button" class="fvd-mini" data-fvd="cancel-req" data-rid="'+pvxEscQ(r.id)+'">Cancel</button></div>'); });
    var loading=DOCS[String(p.id)]&&DOCS[String(p.id)].p&&!D.length;
    var h='<div class="fvd"><div class="fvd-head"><p class="sect-title">Documents'+(rows.length?' · '+rows.length:'')+'</p>'+((D.length||(e&&e.aftercare))?'<button type="button" class="fvd-link" data-fvd="packet">Make a packet…</button>':'')+'</div>'
      +(rows.length?'<div class="fvd-list">'+rows.join('')+'</div>':(loading?(window.pvxWaitHTML?pvxWaitHTML('docs',p.id):'<div class="fvd-empty">Loading…</div>'):''))
      +(isCompleted(p)?'':'<button type="button" class="fvd-send" data-fvd="send">'+svg('plus')+'Send a form…</button>')+'</div>';
    if(m.innerHTML!==h) m.innerHTML=h; }

  /* ---------- sheets (the same sheet as the ending: centered on a computer, from the bottom on a phone) ---------- */
  var sheet=null;
  var backPend=null;   /* PVX-N211: on iPhone the drawer steps aside for this sheet and comes back after it */
  function openSheet(html,cls,label){ var bk=(sheet&&sheet.back)||backPend; if(sheet) sheet.back=null; closeSheet(); backPend=null; if(!bk&&window.pvxSheetBack) bk=pvxSheetBack(); var s=document.createElement('div'); s.id='fvdSheet'; s.className='end-sheet open';
    s.innerHTML='<div class="es-scrim" data-fvd="close"></div><div class="es-panel '+(cls||'')+'" role="dialog" aria-modal="true" aria-label="'+pvxEscQ(label||'')+'">'+html+'</div>';
    document.body.appendChild(s); sheet={el:s,last:document.activeElement,back:bk}; requestAnimationFrame(function(){ s.classList.add('shown'); var f=s.querySelector('[data-autofocus]')||s.querySelector('.es-panel button:not([data-fvd="close"])'); if(f) f.focus({preventScroll:true}); }); return s; }
  function closeSheet(){ if(!sheet) return; var s=sheet.el, l=sheet.last, bk=sheet.back; sheet=null; s.remove();
    if(bk){ backPend=bk; setTimeout(function(){ if(backPend===bk&&!sheet){ backPend=null; if(window.pvxSheetReturn) pvxSheetReturn(bk); } },0); return; }
    try{ if(l&&document.contains(l)) l.focus({preventScroll:true}); }catch(e){} }
  function bar(title,right){ return '<header class="es-bar"><button type="button" class="es-cancel" data-fvd="close">'+(right?'Cancel':'Close')+'</button><h2>'+pvxEscQ(title)+'</h2><span class="es-bar-r"></span></header>'; }
  document.addEventListener('keydown',function(e){ if(sheet&&e.key==='Escape'){ e.stopPropagation(); e.preventDefault(); closeSheet(); } },true);

  /* Send a form */
  var send=null;
  function openSend(p){ send={pid:p.id,tid:null,ans:{}};
    openSheet(bar('Send a form for '+pet(p),true)+'<div class="es-body"><div class="es-sec"><div class="es-text">Loading hospital forms…</div></div></div>','','Send a form');
    templates(true).then(function(){ paintSend(); }); }
  function paintSend(){ if(!send||!sheet) return; var p=pvxPatientById(send.pid); if(!p){ closeSheet(); return; }
    var L=(TPL.list||[]).filter(function(t){ return t.purpose!=='ending'; }), out=reqsOf(p).map(function(r){ return r.template_id; }), done=docsOf(p).map(function(d){ return d.template_id; });
    var h=bar('Send a form for '+pet(p),true)+'<div class="es-body">';
    if(!L.length) h+='<div class="es-sec"><div class="es-group es-text"><b>No forms are ready yet.</b><br>Map your hospital’s PDFs in Pravix Forms, then publish them to Flow.</div></div>';
    else{ h+='<div class="es-sec"><div class="es-h" id="fvdFormsH">Hospital forms</div><div class="es-group" role="radiogroup" aria-labelledby="fvdFormsH">';
      L.forEach(function(t){ var on=send.tid===t.id, isOut=out.indexOf(t.id)>-1, isDone=done.indexOf(t.id)>-1, pages=(t.file&&t.file.pages||[]).length;
        h+='<button type="button" class="es-row fvd-pickrow'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-fvd="pick" data-tid="'+pvxEscQ(t.id)+'"'+(isOut?' disabled':'')+'><span class="fvd-th" data-fvd-th="'+pvxEscQ(t.id)+'" aria-hidden="true"></span><span class="es-rl">'+pvxEscQ(t.name||'Form')+'<span class="es-rd">'+(isOut?'Already with reception':isDone?'Signed earlier today · send again':pages+' page'+(pages===1?'':'s'))+'</span></span><span class="es-check" aria-hidden="true"></span></button>'; });
      h+='</div></div>';
      var t=L.filter(function(x){ return x.id===send.tid; })[0];
      if(t){ var staffQ=(t.boxes||[]).filter(function(b){ return b.src==='staff.text'; });
        if(staffQ.length){ h+='<div class="es-sec"><div class="es-h">Before you send it</div><div class="es-group">'+staffQ.map(function(b){ return '<label class="es-row es-field"><span class="es-fl">'+pvxEscQ(b.label&&b.label.en||'Staff answer')+'</span><input type="text" data-fvd-staff="'+pvxEscQ(b.id)+'" value="'+pvxEscQ(send.ans[b.id]||'')+'" autocomplete="off"></label>'; }).join('')+'</div></div>'; }
        h+='<div class="es-sec fvd-filled"><div>Filled from '+pvxEscQ(pet(p))+'’s visit: <b>'+pvxEscQ([p.owner,p.hid].filter(Boolean).join(' · '))+'</b></div><div class="fvd-sub">Reception takes the tablet into the room with the family.</div></div>'; } }
    h+='</div><footer class="es-foot"><div class="end-hint" id="fvdHint" role="alert" hidden></div><button type="button" class="es-primary fvd-solid" data-fvd="do-send"'+(send.tid?'':' disabled')+'>Send to reception</button></footer>';
    var panel=sheet.el.querySelector('.es-panel'), fk=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.tid; panel.innerHTML=h;
    if(fk){ var f=panel.querySelector('[data-tid="'+fk+'"]'); if(f) f.focus(); }
    L.forEach(function(t){ tplThumb(t); }); }
  /* a small picture of each form's first page, so staff pick by sight */
  var THUMB={};
  function tplThumb(t){ var put=function(u){ var e=document.querySelector('#fvdSheet [data-fvd-th="'+t.id+'"]'); if(e&&!e.firstChild){ var i=new Image(); i.src=u; i.alt=''; e.appendChild(i); } };
    var k=t.id+':'+(t.file&&t.file.sha256); if(THUMB[k]){ if(THUMB[k]!==1) put(THUMB[k]); return; } THUMB[k]=1;
    lib().then(function(){ return PvxForms.templateBytes(pvxDb(),t); }).then(function(b){ return PvxPdf.renderPage(b,0,0.25); }).then(function(c){ THUMB[k]=c.toDataURL('image/png'); put(THUMB[k]); }).catch(function(){ delete THUMB[k]; }); }
  function doSend(){ var p=pvxPatientById(send.pid), t=(TPL.list||[]).filter(function(x){ return x.id===send.tid; })[0], D=pvxDb(); if(!p||!t||!D||send.busy) return;
    send.busy=true; var btn=document.querySelector('#fvdSheet [data-fvd="do-send"]'); if(btn){ btn.disabled=true; btn.innerHTML='<span class="fvd-spin" aria-hidden="true"></span>Sending…'; }
    var id='fr_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), r={tenant_id:pvxTenant(),visit_id:String(p.id),template_id:t.id,template_name:t.name||'Form',status:'requested',
      requested:{at:new Date().toISOString(),by:pvxWho(),uid:pvxUid()},pet:{name:pet(p)},owner:{name:p.owner||''},staff_answers:send.ans||{}};
    reqSeen[id]=1; D.collection('form_requests').doc(id).set(r).then(function(){ r.id=id; if(!REQ.some(function(x){ return x.id===id; })) REQ.push(r); closeSheet(); pvxNote('Form sent to reception',pvxEscQ(pet(p))+' · '+pvxEscQ(r.template_name)); repaintAll(); })
      .catch(function(e){ console.warn('[docs] send',e); send.busy=false; var b2=document.querySelector('#fvdSheet [data-fvd="do-send"]'); if(b2){ b2.disabled=false; b2.textContent='Send to reception'; } var h=document.getElementById('fvdHint'); if(h){ h.textContent='Couldn’t send it. Check the connection and try again.'; h.hidden=false; } }); }
  function cancelReq(id){ var r=REQ.filter(function(x){ return x.id===id; })[0]; if(!r) return; var before={status:r.status};
    setReq(r,{status:'cancelled',cancelled:{at:new Date().toISOString(),by:pvxWho()}}).then(function(){ REQ=REQ.filter(function(x){ return x.id!==id; }); repaintAll();
      noteAct('Form cancelled',pvxEscQ(r.template_name||'Form'),'Undo',function(){ setReq(r,{status:before.status,cancelled:null}).then(function(){ if(!REQ.some(function(x){ return x.id===id; })) REQ.push(r); repaintAll(); }); },{dur:8000}); })
      .catch(function(e){ console.warn('[docs] cancel',e); }); }

  /* ---------- the family's iPad screens for a mapped form ---------- */
  var L2={read:['Please read','Por favor, lea'],read_l:['This is the form you’re signing. Your details are already filled in.','Este es el formulario que va a firmar. Sus datos ya están completados.'],
    ask:['Your answers','Sus respuestas'],ask_l:['Check these and fill in anything missing.','Revíselos y complete lo que falte.'],sign:['Please sign','Por favor, firme'],
    sign_l:['By signing, you agree to the form you just read.','Al firmar, acepta el formulario que acaba de leer.'],name:['Your full name','Su nombre completo'],
    signhere:['Sign with your finger or Apple Pencil','Firme con el dedo o con el Apple Pencil'],clear:['Clear','Borrar'],cont:['Continue','Continuar'],signbtn:['Sign','Firmar'],
    back:['Back','Atrás'],staff:['Staff','Personal'],thanks:['Thank you','Gracias'],care:['We’ll take good care of {pet}.','Cuidaremos muy bien de {pet}.'],
    req:['Please answer this to continue.','Por favor, responda para continuar.'],e_name:['Please type your full name.','Por favor, escriba su nombre completo.'],e_sig:['Please sign in the box.','Por favor, firme en el recuadro.'],
    yes:['Yes','Sí'],loading:['Preparing the form…','Preparando el formulario…'],choose:['Choose one.','Elija una opción.'],
    page:['Page {n} of {t}','Página {n} de {t}'],zin:['Make it bigger','Ampliar'],zout:['Make it smaller','Reducir'],ztip:['Double-tap a page to zoom.','Toque dos veces una página para ampliarla.']};
  var FAM=null;
  function t2(k,v){ var r=(L2[k]||[k,k])[FAM&&FAM.lang==='es'?1:0]; return r.replace(/\{(\w+)\}/g,function(_,n){ return v&&v[n]!=null?v[n]:''; }); }
  function qTitle(q){ var t=q.title||{}; return (FAM.lang==='es'&&t.es)?t.es:(t.en||''); }
  function startFamily(rid){ var r=REQ.filter(function(x){ return x.id===rid; })[0]; if(!r) return; var p=pvxPatientById(r.visit_id); if(!p) return;
    var aw=document.getElementById('cfFamily'); if(aw&&aw.classList.contains('open')) return;   /* the euthanasia form is open */
    var kept=famDrafts[rid]||null; delete famDrafts[rid];
    FAM=kept||{rid:rid,pid:p.id,step:'read',lang:'en',ans:{},err:'',pages:null,tpl:null,sig:{}};
    if(r.status==='requested') setReq(r,{status:'family',family_at:new Date().toISOString(),family_by:pvxWho()}).catch(function(){});
    document.body.classList.add('cf-family-on'); paintFamily();
    lib().then(function(){ return templates(); }).then(function(L){ var tpl=L.filter(function(t){ return t.id===r.template_id; })[0]; if(!tpl) throw new Error('This form is no longer published.');
      FAM.tpl=tpl; var a=FAM.ans; PvxForms.questions(tpl).forEach(function(q){ if(a[q.key]!=null) return;
        if(q.src==='owner.name') a[q.key]=p.owner||''; else if(q.src==='owner.phone') a[q.key]=p.ownerPhone||''; else if(q.src==='family.state') a[q.key]='CT'; });
      Object.keys(r.staff_answers||{}).forEach(function(k){ a[k]=r.staff_answers[k]; });
      return preview(); }).catch(function(e){ console.warn('[docs] family',e); if(FAM){ FAM.err=String(e.message||e); paintFamily(); } }); }
  function preview(){ var p=pvxPatientById(FAM.pid); return PvxForms.templateBytes(pvxDb(),FAM.tpl).then(function(src){ FAM.src=src; return PvxPdf.fill(src,FAM.tpl.boxes,PvxForms.resolve(FAM.tpl,{p:p,answers:FAM.ans,hospital:'VCA Shoreline'}),{}); })
    .then(function(b){ var n=FAM.tpl.file.pages.length, out=[], ch=Promise.resolve(); for(var i=0;i<n;i++)(function(i){ ch=ch.then(function(){ return PvxPdf.renderPage(b,i,1.6); }).then(function(c){ out.push(c.toDataURL('image/jpeg',0.86)); }); })(i);
      return ch.then(function(){ if(!FAM) return; FAM.pages=out; paintFamily(); }); }); }
  function famEl(){ var w=document.getElementById('cfFamily'); if(!w){ w=document.createElement('div'); w.id='cfFamily'; w.setAttribute('role','dialog'); w.setAttribute('aria-modal','true'); document.body.appendChild(w); } return w; }
  function steps(){ var Q=FAM.tpl?PvxForms.questions(FAM.tpl):[]; return Q.length?['read','ask','sign']:['read','sign']; }
  function paintFamily(){ if(!FAM) return; var p=pvxPatientById(FAM.pid); if(!p){ closeFamily(); return; } readAnswers();
    var w=famEl(), S=steps(), idx=S.indexOf(FAM.step), fam=idx>-1, nm=pet(p), tpl=FAM.tpl, h='<div class="cff" lang="'+FAM.lang+'"><header class="cff-nav"><div class="cff-nav-l">'
      +(fam&&idx>0?'<button type="button" class="cff-back" data-fvd="fback"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>'+t2('back')+'</span></button>':'<img class="cff-logo" src="assets/img/logo-light.png" alt="VCA Shoreline">')+'</div>'
      +'<div class="cff-dots" aria-hidden="'+(!fam)+'">'+(fam?S.map(function(s,i){ return '<span class="'+(i===idx?'on':i<idx?'done':'')+'"></span>'; }).join(''):'')+'</div>'
      +'<div class="cff-nav-r">'+(fam?(window.fvTextSize?fvTextSize(FAM.lang):'')+'<div class="cff-lang" role="group" aria-label="Language / Idioma"><button type="button" lang="en" aria-pressed="'+(FAM.lang==='en')+'" data-fvl="en">English</button><button type="button" lang="es" aria-pressed="'+(FAM.lang==='es')+'" data-fvl="es">Español</button></div><button type="button" class="cff-staff" data-fvd="hold" aria-label="Staff: press and hold to leave the form">'+t2('staff')+'</button>':'')+'</div></header><main class="cff-card">';
    var primary='';
    if(!tpl&&!FAM.err) h+='<h1>'+t2('loading')+'</h1>';
    else if(FAM.step==='read'){ var NP=FAM.pages?FAM.pages.length:0;
      h+='<h1>'+t2('read')+'</h1><p class="cff-lead">'+t2('read_l')+'</p>'+(NP?'<div class="fvf-zoombar"><span>'+t2('ztip')+'</span><button type="button" class="fvf-zbtn" data-fvd="fzoom" aria-pressed="'+!!FAM.zoom+'">'+t2(FAM.zoom?'zout':'zin')+'</button></div>':'')
        +'<div class="fvf-pages'+(FAM.zoom?' zoomed':'')+'">'+(NP?FAM.pages.map(function(u,i){ return '<figure class="fvf-pg">'+(NP>1?'<figcaption>'+t2('page',{n:i+1,t:NP})+'</figcaption>':'')+'<div class="fvf-pz"><img src="'+u+'" alt="'+pvxEscQ((tpl&&tpl.name||'Form')+' · page '+(i+1))+'" data-fvd-pz="1"></div></figure>'; }).join(''):'<div class="fvf-wait">'+t2('loading')+'</div>')+'</div>';
      primary='<button type="button" class="cff-primary" data-fvd="fnext"'+(FAM.pages?'':' disabled')+'>'+t2('cont')+'</button>'; }
    else if(FAM.step==='ask'){ h+='<h1>'+t2('ask')+'</h1><p class="cff-lead">'+t2('ask_l')+'</p><div class="cff-grid">';
      PvxForms.questions(tpl).forEach(function(q){ var v=FAM.ans[q.key];
        if(q.kind==='text') h+='<label class="cff-field"><span>'+pvxEscQ(qTitle(q))+(q.required?'':'')+'</span><input data-fvq-k="'+pvxEscQ(q.key)+'" value="'+pvxEscQ(v||'')+'"'+(q.src==='family.zip'?' inputmode="numeric"':'')+'></label>';
        else if(q.kind==='check') h+=(window.fvDCard?fvDCard({ic:'',title:pvxEscQ(qTitle(q)),sel:!!v,box:true,wrap:true,cls:'fvf-noic cff-check'+(v?' on':''),attrs:'data-fvq-c="'+pvxEscQ(q.key)+'"'}):'');
        else if(q.kind==='choice'){ h+='<div class="cff-field"><span>'+pvxEscQ(qTitle(q))+'</span><div class="cff-care" role="radiogroup" aria-label="'+pvxEscQ(qTitle(q))+'">'+q.options.map(function(o){ var on=v===o.id, lab=(FAM.lang==='es'&&o.label.es)?o.label.es:o.label.en; return window.fvDCard?fvDCard({ic:'',title:pvxEscQ(lab||'—'),sel:on,wrap:true,cls:'fvf-noic cff-opt'+(on?' on':''),attrs:'data-fvq-o="'+pvxEscQ(q.key)+'" data-opt="'+pvxEscQ(o.id)+'"'}):''; }).join('')+'</div></div>'; } });
      h+='</div>'; primary='<button type="button" class="cff-primary" data-fvd="fnext">'+t2('cont')+'</button>'; }
    else if(FAM.step==='sign'){ h+='<h1>'+t2('sign')+'</h1><p class="cff-lead">'+t2('sign_l')+'</p><label class="cff-field"><span>'+t2('name')+'</span><input id="fvdSignName" value="'+pvxEscQ(FAM.signName!=null?FAM.signName:(FAM.ans['owner.name']||p.owner||''))+'" autocomplete="name"></label>'
        +'<div class="cff-sigwrap"><div class="cff-sigl">'+t2('signhere')+' <button type="button" class="cff-clear" data-fvd="fclear">'+t2('clear')+'</button></div><div class="cff-sigbox"><canvas class="cff-sig" id="fvdSigOwner" aria-label="'+pvxEscQ(t2('signhere'))+'"></canvas><span class="cff-x" aria-hidden="true">×</span></div></div>';
      primary='<button type="button" class="cff-primary" data-fvd="fsign">'+t2('signbtn')+'</button>'; }
    else if(FAM.step==='thanks'){ h+='<div class="cff-thanks"><h1 class="cff-big">'+t2('thanks')+'</h1><p class="cff-lead">'+t2('care',{pet:pvxEscQ(nm)})+'</p></div>';
      primary='<button type="button" class="cff-primary" data-fvd="'+(needsWitness()?'fwit':'fsave')+'">'+(needsWitness()?'Staff: witness the signature':'Staff: save the signed form')+'</button>'; }
    else if(FAM.step==='witness'){ h+='<h1>Witness</h1><p class="cff-lead">'+pvxEscQ(FAM.sign.owner.name)+' signed '+pvxEscQ(tpl.name||'the form')+' for '+pvxEscQ(nm)+'. Sign as the witness.</p>'
        +'<div class="cff-sigwrap"><div class="cff-sigl">'+pvxEscQ(pvxWho())+' <button type="button" class="cff-clear" data-fvd="fclearw">Clear</button></div><div class="cff-sigbox"><canvas class="cff-sig" id="fvdSigWitness" aria-label="Witness signature pad"></canvas><span class="cff-x" aria-hidden="true">×</span></div></div>';
      primary='<button type="button" class="cff-primary" data-fvd="fsave">Save the signed form</button>'; }
    else if(FAM.step==='saving'){ h+='<div class="cff-thanks" role="status"><span class="pvx-spin pvx-spin-l" aria-hidden="true"></span><h1>Saving…</h1><p class="cff-lead">Making the signed PDF and checking it.</p></div>'; }   /* PVX-N365 */
    if(FAM.err) h+='<div class="cff-err" role="alert">'+pvxEscQ(FAM.err)+'</div>';
    h+='</main><footer class="cff-bar">'+primary+'</footer></div>';
    var keep=document.activeElement&&w.contains(document.activeElement)&&(document.activeElement.id||document.activeElement.dataset.fvqK);
    w.className='cf-family-sheet open'; w.innerHTML=h;
    if(keep){ var k=document.getElementById(keep)||w.querySelector('[data-fvq-k="'+keep+'"]'); if(k&&k.focus) k.focus({preventScroll:true}); }
    if(window.fvSigPad){ fvSigPad.pad('fvdSigOwner','owner',FAM.sig); fvSigPad.pad('fvdSigWitness','witness',FAM.sig); } }
  function needsWitness(){ return !!(FAM&&FAM.tpl&&(FAM.tpl.boxes||[]).some(function(b){ return b.src==='sign.witness'; })); }
  function readAnswers(){ if(!FAM) return; [].forEach.call(document.querySelectorAll('#cfFamily [data-fvq-k]'),function(i){ FAM.ans[i.dataset.fvqK]=String(i.value||'').trim(); });
    var n=document.getElementById('fvdSignName'); if(n) FAM.signName=String(n.value||'').trim(); }
  function fgo(step){ FAM.err=''; FAM.step=step; paintFamily(); var b=document.getElementById('cfFamily'); if(b) b.scrollTop=0; }
  function fnext(){ readAnswers(); var S=steps(), i=S.indexOf(FAM.step);
    if(FAM.step==='ask'){ var miss=PvxForms.questions(FAM.tpl).filter(function(q){ var v=FAM.ans[q.key]; return q.required&&(v==null||v===''||v===false); })[0];
      if(miss){ FAM.err=t2('req'); paintFamily(); var f=document.querySelector('#cfFamily [data-fvq-k="'+miss.key+'"],#cfFamily [data-fvq-c="'+miss.key+'"],#cfFamily [data-fvq-o="'+miss.key+'"]'); if(f) f.focus(); return; } }
    if(i>-1&&i<S.length-1) fgo(S[i+1]); }
  function fsign(){ readAnswers(); if(!FAM.signName){ FAM.err=t2('e_name'); paintFamily(); var n=document.getElementById('fvdSignName'); if(n) n.focus(); return; }
    if(!window.fvSigPad||!fvSigPad.inked('owner',FAM.sig)){ FAM.err=t2('e_sig'); paintFamily(); return; }
    FAM.sign={owner:{name:FAM.signName,at:new Date().toISOString(),png:fvSigPad.png('owner','fvdSigOwner',FAM.sig)}}; if(FAM.ans['owner.name']==null) FAM.ans['owner.name']=FAM.signName; fgo('thanks'); }
  function fsave(){ var p=pvxPatientById(FAM.pid), r=REQ.filter(function(x){ return x.id===FAM.rid; })[0];
    if(FAM.step==='witness'){ if(!fvSigPad.inked('witness',FAM.sig)){ FAM.err='Please sign as the witness.'; paintFamily(); return; } FAM.sign.witness={name:pvxWho(),uid:pvxUid(),at:new Date().toISOString(),png:fvSigPad.png('witness','fvdSigWitness',FAM.sig)}; }
    var F0=FAM; F0.step='saving'; paintFamily();
    PvxForms.fileSigned(pvxDb(),{tpl:F0.tpl,p:p,answers:F0.ans,sign:F0.sign,lang:F0.lang,title:F0.tpl.name,by:pvxWho(),tenant:pvxTenant(),hospital:'VCA Shoreline',request_id:F0.rid}).then(function(meta){
      var k=String(p.id); (DOCS[k]=DOCS[k]||{list:[]}).list=[meta].concat((DOCS[k].list||[]).filter(function(d){ return d.id!==meta.id; }));
      return (r?setReq(r,{status:'signed',signed_at:meta.signed_at,doc_id:meta.id,sha256:meta.sha256}):Promise.resolve()).then(function(){ REQ=REQ.filter(function(x){ return x.id!==F0.rid; });
        FAM=null; closeFamily(); pvxNote('Form signed',pvxEscQ(pet(p))+' · '+pvxEscQ(meta.title)+' · saved as a PDF on the visit'); repaintAll(); }); })
    .catch(function(e){ console.warn('[docs] save',e); if(FAM===F0){ F0.step=F0.sign&&F0.sign.witness?'witness':'thanks'; F0.err='Couldn’t save the signed PDF. Check the connection, then tap Save again. Nothing has been lost.'; paintFamily(); } }); }
  function closeFamily(){ FAM=null; window.__cffTS='s'; var tw=document.getElementById('cfFamily'); if(tw) tw.removeAttribute('data-ts'); document.body.classList.remove('cf-family-on'); var w=document.getElementById('cfFamily'); if(w){ w.className='cf-family-sheet'; w.innerHTML=''; } repaintAll(); }
  var holdT=null, famDrafts={};
  document.addEventListener('pointerdown',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-fvd="hold"]'); if(!b) return; b.classList.add('holding');
    holdT=setTimeout(function(){ if(FAM){ readAnswers(); famDrafts[FAM.rid]=FAM; } FAM=null; closeFamily(); },1200); },true);
  ['pointerup','pointercancel','pointerleave'].forEach(function(t){ document.addEventListener(t,function(){ clearTimeout(holdT); var b=document.querySelector('[data-fvd="hold"].holding'); if(b) b.classList.remove('holding'); },true); });

  /* ---------- euthanasia & aftercare: file the hospital's PDF when the form is signed ---------- */
  function fileEnding(p,f){ if(!p||!f||f.status!=='signed') return Promise.resolve(null);
    return lib().then(function(){ return endingTemplate(f.kind); }).then(function(tpl){ if(!tpl) return null;
      if(docForForm(p,f.id)) return docForForm(p,f.id);
      var o=f.owner||{}, urn=''; try{ urn=window.fvConsent&&f.urn?fvConsent.urnLabel(f.urn):''; }catch(e){}
      return PvxForms.fileSigned(pvxDb(),{tpl:tpl,p:p,answers:{'owner.name':o.name||p.owner||'','family.address':o.address||'','family.city':o.city||'','family.state':o.state||'','family.zip':o.zip||'','owner.phone':p.ownerPhone||''},
        aftercare:{care:f.care,urn:urn,clay:!!f.clay,total:f.total},sign:{owner:f.owner_sig,witness:f.witness},lang:f.lang||'en',title:tpl.name||(f.kind==='died'?'Aftercare form':'Euthanasia & aftercare consent'),
        kind:f.kind,by:pvxWho(),tenant:pvxTenant(),hospital:'VCA Shoreline',form_id:f.id}).then(function(meta){ var k=String(p.id); (DOCS[k]=DOCS[k]||{list:[]}).list=[meta].concat(DOCS[k].list||[]); repaintAll(); return meta; }); })
      .catch(function(e){ console.warn('[docs] ending pdf',e); noteAct('PDF not saved',pvxEscQ(pet(p))+'’s signed form is safe; the PDF copy wasn’t made','Try again',function(){ fileEnding(pvxPatientById(p.id)||p,f); },{color:'#C85A50'}); return null; }); }

  /* ---------- viewer ---------- */
  var VIEW=null;
  function view(p,meta){ VIEW={pid:p.id,meta:meta,state:'loading'}; paintView(); lib().then(function(){ return PvxForms.docBytes(pvxDb(),meta); }).then(function(r){ if(!VIEW||VIEW.meta.id!==meta.id) return; VIEW.bytes=r.bytes; VIEW.intact=r.intact;
      var ch=Promise.resolve(), out=[]; for(var i=0;i<(meta.pages||1);i++)(function(i){ ch=ch.then(function(){ return PvxPdf.renderPage(r.bytes,i,1.5); }).then(function(c){ out.push(c.toDataURL('image/jpeg',0.88)); }); })(i);
      return ch.then(function(){ if(!VIEW) return; VIEW.pages=out; VIEW.state='ready'; paintView(); }); }).catch(function(e){ console.warn('[docs] view',e); if(VIEW){ VIEW.state='error'; VIEW.err=String(e.message||e); paintView(); } }); }
  function paintView(){ var V=VIEW, p=pvxPatientById(V.pid)||{}, m=V.meta, NP=(V.pages||[]).length;
    var h='<header class="es-bar"><button type="button" class="es-cancel es-x" data-fvd="close" aria-label="Close" title="Close">'+PVX_GI.xmark+'</button><h2>'+pvxEscQ(m.title||'Signed form')+'</h2><span class="es-bar-r"><button type="button" class="fvv-icon" data-fvd="v-dl" aria-label="Download the PDF" title="Download"'+(V.bytes?'':' disabled')+'>'+svg('dl')+'</button></span></header>';
    var who2=pvxEscQ([m.signed_by?'Signed by '+m.signed_by:'',pvxHm(m.signed_at)?pvxHm(m.signed_at):''].filter(Boolean).join(' · '));
    if(V.state==='ready') h+='<div class="fvv-status"><div class="fvv-check '+(V.intact?'ok':'bad')+'">'+svg(V.intact?'shield':'warn')+'<b>'+(V.intact?'Unchanged since signing':'This copy doesn’t match its fingerprint — don’t rely on it; ask an admin.')+'</b>'
      +'<button type="button" class="fvv-more" data-fvd="v-details" aria-expanded="'+!!V.details+'">'+(V.details?'Hide details':'Details')+'</button></div><span class="fvv-who">'+who2+'</span></div>';
    else h+='<div class="fvv-status"><span class="fvv-who">'+who2+'</span></div>';
    if(V.details) h+='<div class="fvv-meta">'+pvxEscQ([m.witness?'Witness '+m.witness:'',m.lang==='es'?'Filled in Spanish':'',(m.pages||NP||1)+' page'+((m.pages||NP||1)===1?'':'s')].filter(Boolean).join(' · '))+'<span>Fingerprint <code>'+pvxEscQ(String(m.sha256||'').slice(0,16).replace(/(.{4})/g,'$1 ').trim())+'</code></span>'+(m.verify_id?'<span>Verify code <code>'+pvxEscQ(String(m.verify_id).replace(/(.{4})(?=.)/g,'$1 '))+'</code> · on every page</span>':'')+'</div>';
    h+='<div class="es-body fvv-body">';
    if(V.state==='loading') h+='<div class="es-text">Opening the PDF…</div>';
    if(V.state==='error') h+='<div class="es-text">Couldn’t open this PDF. Try again in a moment; if it keeps happening, ask an admin.</div>';
    if(NP>1) h+='<span class="fvv-pno" aria-live="polite">1 of '+NP+'</span>';
    (V.pages||[]).forEach(function(u,i){ h+='<img class="fvv-page" src="'+u+'" alt="Page '+(i+1)+'" data-pno="'+(i+1)+'">'; });
    h+='</div><footer class="es-foot fvv-foot"><button type="button" class="fvd-mini fvd-mid" data-fvd="v-packet">Make a packet…</button><span class="fvv-sp"></span><button type="button" class="es-primary fvd-solid" data-fvd="v-print"'+(V.bytes?'':' disabled')+'>Print</button></footer>';
    var keep=V.details!=null&&document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.fvd==='v-details';
    if(sheet&&sheet.el.querySelector('.fvv')) sheet.el.querySelector('.es-panel').innerHTML=h; else openSheet(h,'fvv fvd-wide',m.title||'Signed form');
    if(keep){ var d=document.querySelector('#fvdSheet [data-fvd="v-details"]'); if(d) d.focus(); }
    var body=document.querySelector('#fvdSheet .fvv-body'); if(body&&NP>1) body.addEventListener('scroll',function(){ var pn=body.querySelector('.fvv-pno'), best=1, bd=1e9, mid=body.getBoundingClientRect().top+body.clientHeight/2;
      [].forEach.call(body.querySelectorAll('.fvv-page'),function(im){ var r=im.getBoundingClientRect(), dd=Math.abs((r.top+r.bottom)/2-mid); if(dd<bd){ bd=dd; best=+im.dataset.pno; } }); if(pn) pn.textContent=best+' of '+NP; },{passive:true}); }
  function blobUrl(bytes){ return URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})); }
  function fileName(p,title){ return (String((p&&((p.name||'')+' '+(p.last||'')))||'').trim()+' - '+(title||'document')+'.pdf').replace(/[\\/:*?"<>|]+/g,'-'); }
  function download(bytes,name){ var a=document.createElement('a'); a.href=blobUrl(bytes); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },4000); }
  function printBytes(bytes,win){ var u=blobUrl(bytes); if(win&&!win.closed){ win.location.href=u; } else { var w=window.open(u,'_blank'); if(!w) download(bytes,'print.pdf'); } }

  /* ---------- the body tag as a PDF (for the packet) ---------- */
  function tagPdf(p){ var e=p.ending; if(!e||!e.aftercare) return Promise.resolve(null);
    return lib().then(function(){ var PL=window.PDFLib; return PL.PDFDocument.create().then(function(doc){ return Promise.all([doc.embedFont(PL.StandardFonts.Helvetica),doc.embedFont(PL.StandardFonts.HelveticaBold)]).then(function(f){
      var H=f[0], B=f[1], pg=doc.addPage([288,432]), ink=PL.rgb(0,0,0), x=13, w=262, y=410, clean=PvxPdf.clean;
      var at=e.at?new Date(e.at):new Date(), when=at.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · '+at.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
      pg.drawText('VCA SHORELINE',{x:x,y:y,size:8,font:H,color:ink}); var hid=clean(p.hid||''); pg.drawText(hid,{x:x+w-B.widthOfTextAtSize(hid,11),y:y,size:11,font:B,color:ink});
      pg.drawLine({start:{x:x,y:y-5},end:{x:x+w,y:y-5},thickness:1.4,color:ink}); y-=36;
      var nm=clean(((p.name||'')+' '+(p.last||'')).trim()||'Patient'), sz=28; while(sz>14&&B.widthOfTextAtSize(nm,sz)>w) sz-=1; pg.drawText(nm,{x:x,y:y,size:sz,font:B,color:ink}); y-=16;
      pg.drawText(clean([p.species,p.breed,p.sex].filter(Boolean).join(' · ')),{x:x,y:y,size:10,font:H,color:ink}); y-=16;
      var band={private:['PRIVATE CREMATION','Ashes come back to VCA Shoreline'],communal:['COMMUNAL CREMATION','Ashes are not returned'],release:['RELEASE TO OWNER','Do not send to Final Gift'],hold:['HOLD','Then communal cremation, unless the family decides']}[e.aftercare]||[String(e.aftercare).toUpperCase(),''];
      if(e.aftercare==='hold'){ var u=new Date(at.getTime()+7*864e5); band[0]='HOLD UNTIL '+u.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}).toUpperCase(); }
      var bh=46; if(e.aftercare==='private') pg.drawRectangle({x:x,y:y-bh,width:w,height:bh,color:ink}); else pg.drawRectangle({x:x+1.5,y:y-bh+1.5,width:w-3,height:bh-3,borderColor:ink,borderWidth:e.aftercare==='release'?4:3,borderDashArray:e.aftercare==='hold'?[6,4]:undefined});
      var bc=e.aftercare==='private'?PL.rgb(1,1,1):ink, bs=15; while(bs>9&&B.widthOfTextAtSize(band[0],bs)>w-20) bs-=0.5;
      pg.drawText(band[0],{x:x+10,y:y-22,size:bs,font:B,color:bc}); if(band[1]) pg.drawText(band[1],{x:x+10,y:y-37,size:8.5,font:H,color:bc}); y-=bh+18;
      var line=function(l,v){ if(!v) return; pg.drawText(l.toUpperCase(),{x:x,y:y,size:7,font:H,color:PL.rgb(0.25,0.25,0.25)}); pg.drawText(clean(v).slice(0,60),{x:x+66,y:y,size:9.5,font:H,color:ink}); pg.drawLine({start:{x:x,y:y-5},end:{x:x+w,y:y-5},thickness:0.4,color:PL.rgb(0.7,0.7,0.7)}); y-=18; };
      line('Owner',p.owner); line('Urn',e.urn||''); line(e.type==='died'?'Died':'Euthanized',when); line('Doctor',(p.doctor&&p.doctor!=='unassigned')?p.doctor:'');
      if(e.type==='euthanasia'&&e.consent&&window.fvEndings&&fvEndings.consentLine) line('Consent',fvEndings.consentLine(e.consent).replace(/^Consent /,''));
      (e.keepsakes||[]).forEach(function(k){ pg.drawRectangle({x:x,y:y-2,width:9,height:9,borderColor:ink,borderWidth:1}); pg.drawText(k==='clay'?'Clay paw print made':String(k),{x:x+15,y:y,size:9.5,font:H,color:ink}); y-=16; });
      y=46; pg.drawLine({start:{x:x,y:y},end:{x:x+120,y:y},thickness:0.7,color:ink}); pg.drawLine({start:{x:x+142,y:y},end:{x:x+w,y:y},thickness:0.7,color:ink});
      pg.drawText('Tagged by',{x:x,y:y-10,size:7,font:H,color:ink}); pg.drawText('Picked up by Final Gift · date',{x:x+142,y:y-10,size:7,font:H,color:ink});
      pg.drawText(clean('Recorded by '+(e.by||'')+' · Pravix Flow'),{x:x,y:14,size:6.5,font:H,color:PL.rgb(0.35,0.35,0.35)});
      doc.setCreationDate(new Date(0)); doc.setModificationDate(new Date(0)); doc.setProducer('Pravix Forms'); return doc.save({useObjectStreams:false}); }); }); }); }

  /* ---------- packet ---------- */
  var PK=null;
  var AUD={family:{t:'The family',contact:false,fees:false},rdvm:{t:'Referring vet',contact:true,fees:true},crem:{t:'Final Gift',contact:true,fees:true}};
  function openPacket(p){ var items=docsOf(p).map(function(d){ return {key:'d:'+d.id,t:d.title||'Signed form',s:'Signed '+pvxHm(d.signed_at||d.created_at)+' · '+(d.pages||1)+' page'+((d.pages||1)===1?'':'s'),on:true,meta:d}; });
    if(p.ending&&p.ending.aftercare) items.push({key:'tag',t:'Body tag',s:'4 × 6 in · 1 page',on:true});
    PK={pid:p.id,aud:'rdvm',items:items,contact:true,fees:true,state:'edit',out:null}; paintPacket(); }
  function paintPacket(){ var P=PK, p=pvxPatientById(P.pid)||{}, hasC=P.items.some(function(i){ return i.meta&&i.meta.regions&&i.meta.regions.contact&&i.meta.regions.contact.length; }), hasF=P.items.some(function(i){ return i.meta&&i.meta.regions&&i.meta.regions.fees&&i.meta.regions.fees.length; });
    var h=bar('Packet · '+pet(p),true)+'<div class="es-body"><div class="es-sec"><div class="es-h">Who it’s for</div><span class="es-seg fvp-aud" role="radiogroup" aria-label="Who it’s for">'+Object.keys(AUD).map(function(k){ var on=P.aud===k; return '<button type="button" class="'+(on?'on':'')+'" role="radio" aria-checked="'+on+'" data-fvd="aud" data-aud="'+k+'">'+AUD[k].t+'</button>'; }).join('')+'</span></div>'
      +'<div class="es-sec"><div class="es-h">Documents, in order</div><div class="es-group">'+(P.items.length?P.items.map(function(it,i){ return '<div class="es-row fvp-row"><label class="fvp-l"><input type="checkbox" data-fvd-on="'+i+'"'+(it.on?' checked':'')+'><span class="es-rl">'+pvxEscQ(it.t)+'<span class="es-rd">'+pvxEscQ(it.s)+'</span></span></label><span class="fvp-ord"><button type="button" aria-label="Move up" data-fvd="up" data-i="'+i+'"'+(i===0?' disabled':'')+'>'+svg('up')+'</button><button type="button" aria-label="Move down" data-fvd="dn" data-i="'+i+'"'+(i===P.items.length-1?' disabled':'')+'>'+svg('down')+'</button></span></div>'; }).join(''):'<div class="es-text">No PDFs on this visit yet.</div>')+'</div></div>'
      +'<div class="es-sec"><div class="es-h">Before it leaves the hospital</div><div class="es-group">'
      +'<label class="es-row fvp-l"><span class="es-rl">Black out the owner’s contact details<span class="es-rd">'+(hasC?'Phone, address and email boxes · removed from the file, not just covered':'None mapped on these forms')+'</span></span><input type="checkbox" data-fvd-opt="contact"'+(P.contact&&hasC?' checked':'')+(hasC?'':' disabled')+'></label>'
      +'<label class="es-row fvp-l"><span class="es-rl">Leave out the fees<span class="es-rd">'+(hasF?'The fee boxes are blacked out':'No fee boxes on these forms')+'</span></span><input type="checkbox" data-fvd-opt="fees"'+(P.fees&&hasF?' checked':'')+(hasF?'':' disabled')+'></label></div>'
      +'<div class="es-foot-note">The packet is made in this browser. Nothing is saved or sent until you download or print it.</div></div>';
    if(P.state==='done') h+='<div class="es-sec"><div class="es-group es-text"><b>'+pvxEscQ(P.outName)+'</b><br>'+P.outPages+' pages · one bookmark per document'+(P.redacted?' · '+P.redacted+' page'+(P.redacted===1?'':'s')+' redrawn with details removed':'')+'</div></div>';
    if(P.state==='error') h+='<div class="es-sec"><div class="es-group es-text">'+(/fingerprint/.test(P.err||'')?pvxEscQ(P.err)+'. Leave it out of the packet and ask an admin.':'Couldn’t make the packet. Try again in a moment.')+'</div></div>';
    h+='</div><footer class="es-foot">'+(P.state==='done'?'<div class="fvv-foot"><button type="button" class="fvd-mini" data-fvd="p-dl">Download</button><button type="button" class="es-primary fvd-solid" data-fvd="p-print">Print</button></div>'
      :'<button type="button" class="es-primary fvd-solid" data-fvd="p-make"'+(P.items.some(function(i){ return i.on; })&&P.state!=='working'?'':' disabled')+'>'+(P.state==='working'?'Making the PDF…':'Make the packet')+'</button>')+'</footer>';
    if(sheet&&sheet.el.querySelector('.fvp')) sheet.el.querySelector('.es-panel').innerHTML=h; else openSheet(h,'fvp','Packet'); }
  function makePacket(){ var P=PK, p=pvxPatientById(P.pid); P.state='working'; paintPacket();
    lib().then(function(){ var sel=P.items.filter(function(i){ return i.on; });
      return Promise.all(sel.map(function(it){ return it.key==='tag'?tagPdf(p).then(function(b){ return {it:it,bytes:b}; }):PvxForms.docBytes(pvxDb(),it.meta).then(function(r){ if(!r.intact) throw new Error(it.t+' doesn’t match its fingerprint'); return {it:it,bytes:r.bytes}; }); })); })
    .then(function(parts){ parts=parts.filter(function(x){ return x.bytes; }); var regions=[], at=0;
      parts.forEach(function(x){ var m=x.it.meta, rg=m&&m.regions||{}; if(P.contact) (rg.contact||[]).forEach(function(r){ regions.push({page:at+(r.page|0),rect:r.rect}); }); if(P.fees) (rg.fees||[]).forEach(function(r){ regions.push({page:at+(r.page|0),rect:r.rect}); }); at+=(m&&m.pages)||1; });
      return PvxPdf.merge(parts.map(function(x){ return {bytes:x.bytes,title:x.it.t}; })).then(function(m){ return regions.length?PvxPdf.redact(m,regions,{dpi:150}):m; })
        .then(function(out){ return PvxPdf.check(out).then(function(c){ if(!c.ok) throw new Error(c.error||'the PDF did not open'); var pages={}; regions.forEach(function(r){ pages[r.page]=1; });
          P.out=out; P.outPages=c.pages; P.redacted=Object.keys(pages).length; P.outName=fileName(p,AUD[P.aud].t==='The family'?'packet':'packet for '+AUD[P.aud].t.toLowerCase()); P.state='done'; paintPacket(); }); }); })
    .catch(function(e){ console.warn('[docs] packet',e); P.state='error'; P.err=String(e&&e.message||e); paintPacket(); }); }

  /* ---------- clicks ---------- */
  document.addEventListener('click',function(ev){ var t=ev.target; if(!t||!t.closest) return;
    var q=t.closest('[data-fvq]'); if(q&&q.closest('#view-consent')){ var w0=q.dataset.fvq, rid=q.dataset.rid; if(w0==='family') startFamily(rid); else if(w0==='cancel') cancelReq(rid); return; }
    var fl=t.closest('#cfFamily [data-fvl]'); if(fl&&FAM){ readAnswers(); FAM.lang=fl.dataset.fvl; FAM.err=''; paintFamily(); return; }
    if(FAM&&t.closest('#cfFamily')){ var c=t.closest('[data-fvq-c]'); if(c){ readAnswers(); FAM.ans[c.dataset.fvqC]=!FAM.ans[c.dataset.fvqC]; FAM.err=''; paintFamily(); return; }
      var o=t.closest('[data-fvq-o]'); if(o){ readAnswers(); FAM.ans[o.dataset.fvqO]=o.dataset.opt; FAM.err=''; paintFamily(); return; } }
    var a=t.closest('[data-fvd]'); if(!a) return; var w=a.dataset.fvd, p=pvxActivePatient();
    if(w==='close'){ closeSheet(); VIEW=null; PK=null; send=null; return; }
    if(w==='send'&&p){ openSend(p); return; }
    if(w==='pick'&&send){ send.tid=a.dataset.tid; paintSend(); return; }
    if(w==='do-send'&&send){ [].forEach.call(document.querySelectorAll('#fvdSheet [data-fvd-staff]'),function(i){ send.ans[i.dataset.fvdStaff]=String(i.value||'').trim(); }); doSend(); return; }
    if(w==='cancel-req'){ cancelReq(a.dataset.rid); return; }
    if(w==='view'&&p){ var m=docsOf(p).filter(function(d){ return d.id===a.dataset.doc; })[0]; if(m) view(p,m); return; }
    if(w==='print-consent'&&p&&window.fvConsent){ fvConsent.print(p); return; }
    if(w==='tag'&&p&&window.fvEndings&&fvEndings.printTag){ fvEndings.printTag(p); return; }
    if(w==='packet'&&p){ openPacket(p); return; }
    if(w==='v-packet'&&VIEW){ var vp=pvxPatientById(VIEW.pid); closeSheet(); VIEW=null; if(vp) openPacket(vp); return; }
    if(w==='v-details'&&VIEW){ VIEW.details=!VIEW.details; paintView(); return; }
    if(w==='v-dl'&&VIEW&&VIEW.bytes){ download(VIEW.bytes,fileName(pvxPatientById(VIEW.pid),VIEW.meta.title)); return; }
    if(w==='v-print'&&VIEW&&VIEW.bytes){ printBytes(VIEW.bytes); try{ var D=pvxDb(); if(D) D.collection('visit_docs').doc(VIEW.meta.id).set({printed_at:new Date().toISOString(),printed_by:pvxWho()},{merge:true}).catch(function(){}); }catch(e){} return; }
    if(w==='aud'&&PK){ PK.aud=a.dataset.aud; PK.contact=AUD[PK.aud].contact; PK.fees=AUD[PK.aud].fees; PK.state='edit'; paintPacket(); return; }
    if((w==='up'||w==='dn')&&PK){ var i=+a.dataset.i, j=w==='up'?i-1:i+1; if(j<0||j>=PK.items.length) return; var x=PK.items[i]; PK.items[i]=PK.items[j]; PK.items[j]=x; PK.state='edit'; paintPacket(); var f=document.querySelector('#fvdSheet [data-fvd="'+w+'"][data-i="'+j+'"]'); if(f&&!f.disabled) f.focus(); return; }
    if(w==='p-make'&&PK){ makePacket(); return; }
    if(w==='p-dl'&&PK&&PK.out){ download(PK.out,PK.outName); return; }
    if(w==='p-print'&&PK&&PK.out){ printBytes(PK.out); return; }
    if(!FAM) return;
    if(w==='fback'){ readAnswers(); var S=steps(), k=S.indexOf(FAM.step); if(k>0) fgo(S[k-1]); return; }
    if(w==='fnext'){ fnext(); return; }
    if(w==='fsign'){ fsign(); return; }
    if(w==='fwit'){ fgo('witness'); return; }
    if(w==='fsave'){ fsave(); return; }
    if(w==='fclear'){ FAM.sig.owner=[]; paintFamily(); return; }
    if(w==='fclearw'){ FAM.sig.witness=[]; paintFamily(); return; }
    if(w==='fzoom'){ FAM.zoom=!FAM.zoom; paintFamily(); var zb=document.querySelector('#cfFamily [data-fvd="fzoom"]'); if(zb) zb.focus({preventScroll:true}); return; }
  });
  /* double-tap (or double-click) a page on the family's screen to zoom in and out */
  document.addEventListener('dblclick',function(ev){ var im=ev.target&&ev.target.closest&&ev.target.closest('#cfFamily [data-fvd-pz]'); if(!im||!FAM) return; ev.preventDefault(); FAM.zoom=!FAM.zoom; paintFamily(); });
  document.addEventListener('change',function(ev){ var t=ev.target; if(!PK||!t||!t.closest||!t.closest('#fvdSheet')) return;
    if(t.dataset.fvdOn!=null){ PK.items[+t.dataset.fvdOn].on=t.checked; PK.state='edit'; paintPacket(); }
    if(t.dataset.fvdOpt){ PK[t.dataset.fvdOpt]=t.checked; PK.state='edit'; paintPacket(); } });

  /* n125 · Return presses the sheet's main button (not while typing in a multi-line field, not on another button) */
  document.addEventListener('keydown',function(e){ if(e.key!=='Enter'||e.shiftKey||e.metaKey||e.ctrlKey||e.altKey) return; var sh=document.getElementById('fvdSheet'); if(!sh) return;
    var a=document.activeElement, tag=a&&a.tagName||''; if(/TEXTAREA|BUTTON|A|SELECT/.test(tag)) return; var b=sh.querySelector('.es-foot .es-primary:not([disabled])'); if(b){ e.preventDefault(); b.click(); } });
  /* n125 · a bottom sheet (iPad and phone) can be pulled down by its grabber or title bar to close it; it follows the sheet's own
     close rule (the scrim), so a half-filled ending sheet nudges instead of closing */
  (function(){ var D=null;
    document.addEventListener('pointerdown',function(e){ var bar=e.target&&e.target.closest&&e.target.closest('.end-sheet .es-bar'); if(!bar||e.target.closest('button,a,input,select,textarea')) return;
      if(!window.matchMedia('(max-width:820px)').matches) return; var panel=bar.closest('.es-panel'); if(!panel) return;
      D={p:panel,y0:e.clientY,dy:0,id:e.pointerId}; panel.style.transition='none'; try{ bar.setPointerCapture(e.pointerId); }catch(_){} },true);
    document.addEventListener('pointermove',function(e){ if(!D||e.pointerId!==D.id) return; D.dy=Math.max(0,e.clientY-D.y0); D.p.style.transform='translateY('+D.dy+'px)'; },true);
    function end(e){ if(!D||(e&&e.pointerId!==D.id)) return; var d=D; D=null; d.p.style.transition=''; d.p.style.transform='';
      if(d.dy>110){ var sc=d.p.parentNode&&d.p.parentNode.querySelector('.es-scrim'); if(sc) sc.click(); } }
    document.addEventListener('pointerup',end,true); document.addEventListener('pointercancel',end,true); })();
  window.fvDocs={lib:lib,templates:templates,loadDocs:loadDocs,docsOf:docsOf,docForForm:docForForm,fileEnding:fileEnding,view:view,openPacket:openPacket,openSend:openSend,
    queue:queue,queueCards:queueCards,startFamily:startFamily,tagPdf:tagPdf,state:function(){ return {REQ:REQ,FAM:FAM,PK:PK,VIEW:VIEW,DOCS:DOCS,TPL:TPL,send:send}; },close:closeSheet,listen:listen};
})();