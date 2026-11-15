/* ═══ INCOMING n127 — "On the way" (Oct 13 2026) ═══
   A family calls: "we're coming in". Reception adds the patient as On the way from Add patient: pet, owner, the town
   or ZIP they're driving from, and whether they're leaving now, in 10 or in 20 minutes. Flow asks Google Maps for the
   drive time with live traffic (the same ETA as the Google Maps app), shows a countdown on the Command Center, refreshes
   it every 5 minutes, and says when they're late. Nothing for the family to tap.
   · incoming/{id} (staff only): the call, until they arrive. On arrival the town, phone and owner are cleared.
   · eta_log/{id}: how long arrivals really took vs the estimate (town, hour, minutes — no patient), so Flow learns.
   · ts_settings/maps {browser_key}: the Google Maps key Daniel adds (admin only). Without it, reception types the
     minutes the family gives, and Flow still learns from arrivals.
   Only the town (or ZIP) goes to Google, never a name, phone or address. The board, the waiting-room screen and the
   family tracker don't show patients who are on the way. */
(function(){
  if(typeof openAddPatient!=='function'||typeof createPatient!=='function'||!document.getElementById('apArrival')) return;
  var HOSP=(function(){ try{ return (window.PravixHospitals&&PravixHospitals.shoreline&&PravixHospitals.shoreline.address)||'895 Bridgeport Avenue, Shelton, CT 06484'; }catch(e){ return '895 Bridgeport Avenue, Shelton, CT 06484'; } })();
  function admin(){ try{ return typeof isAdminUser==='function'&&isAdminUser(pvxEmail()); }catch(e){ return false; } }
  function hm(ms){ try{ return fmtTime(new Date(ms)); }catch(e){ var d=new Date(ms),h=d.getHours(),m=d.getMinutes(); return (h%12||12)+':'+('0'+m).slice(-2)+(h>=12?' PM':' AM'); } }
  function hmShort(ms){ return hm(ms).replace(/ (AM|PM)$/,''); }
  function iso(ms){ return new Date(ms).toISOString(); }
  function ms(v){ return v?new Date(v).getTime():0; }

  /* Connecticut's 169 towns, for the "Coming from" suggestions (any town, ZIP or place can still be typed) */
  var TOWNS=('Andover,Ansonia,Ashford,Avon,Barkhamsted,Beacon Falls,Berlin,Bethany,Bethel,Bethlehem,Bloomfield,Bolton,Bozrah,Branford,Bridgeport,Bridgewater,Bristol,Brookfield,Brooklyn,Burlington,Canaan,Canterbury,Canton,Chaplin,Cheshire,Chester,Clinton,Colchester,Colebrook,Columbia,Cornwall,Coventry,Cromwell,Danbury,Darien,Deep River,Derby,Durham,East Granby,East Haddam,East Hampton,East Hartford,East Haven,East Lyme,East Windsor,Eastford,Easton,Ellington,Enfield,Essex,Fairfield,Farmington,Franklin,Glastonbury,Goshen,Granby,Greenwich,Griswold,Groton,Guilford,Haddam,Hamden,Hampton,Hartford,Hartland,Harwinton,Hebron,Kent,Killingly,Killingworth,Lebanon,Ledyard,Lisbon,Litchfield,Lyme,Madison,Manchester,Mansfield,Marlborough,Meriden,Middlebury,Middlefield,Middletown,Milford,Monroe,Montville,Morris,Naugatuck,New Britain,New Canaan,New Fairfield,New Hartford,New Haven,New London,New Milford,Newington,Newtown,Norfolk,North Branford,North Canaan,North Haven,North Stonington,Norwalk,Norwich,Old Lyme,Old Saybrook,Orange,Oxford,Plainfield,Plainville,Plymouth,Pomfret,Portland,Preston,Prospect,Putnam,Redding,Ridgefield,Rocky Hill,Roxbury,Salem,Salisbury,Scotland,Seymour,Sharon,Shelton,Sherman,Simsbury,Somers,South Windsor,Southbury,Southington,Sprague,Stafford,Stamford,Sterling,Stonington,Stratford,Suffield,Thomaston,Thompson,Tolland,Torrington,Trumbull,Union,Vernon,Voluntown,Wallingford,Warren,Washington,Waterbury,Waterford,Watertown,West Hartford,West Haven,Westbrook,Weston,Westport,Wethersfield,Willington,Wilton,Winchester,Windham,Windsor,Windsor Locks,Wolcott,Woodbridge,Woodbury,Woodstock').split(',');
  /* what goes to Google: a CT town as "Town, CT", a ZIP as "06460, USA", anything else as typed */
  function place(text){ var t=String(text||'').trim().replace(/\s+/g,' '); if(!t) return null;
    if(/^\d{5}$/.test(t)) return {label:'ZIP '+t, query:t+', USA', key:t};
    var town=TOWNS.filter(function(x){ return x.toLowerCase()===t.toLowerCase().replace(/,?\s*(ct|connecticut)$/i,''); })[0];
    if(town) return {label:town, query:town+', CT', key:town.toLowerCase()};
    return {label:t, query:t, key:t.toLowerCase()}; }

  /* ---------- Google Maps drive time (traffic-aware, the Google Maps app's ETA) ---------- */
  var ST={list:[], key:null, keyLoaded:false, log:[], tick:null, arriving:null, unsub:null, started:false, lastErr:null, lastOk:0};
  var gP=null;
  function maps(){
    if(window.google&&google.maps&&google.maps.importLibrary) return Promise.resolve(google.maps);
    if(!ST.key) return Promise.reject(new Error('no-key'));
    if(gP) return gP;
    gP=new Promise(function(ok,bad){ window.__pvxMapsReady=function(){ ok(google.maps); };
      var s=document.createElement('script'); s.async=true; s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(ST.key)+'&v=weekly&loading=async&callback=__pvxMapsReady';
      s.onerror=function(){ bad(new Error('Google Maps did not load')); }; document.head.appendChild(s); setTimeout(function(){ bad(new Error('Google Maps timed out')); },15000); });
    gP.catch(function(){ gP=null; }); return gP; }
  function driveMinutes(query, departAt){
    return maps().then(function(m){ return m.importLibrary('routes'); }).then(function(lib){
      var req={origin:query, destination:HOSP, travelMode:'DRIVING', routingPreference:'TRAFFIC_AWARE', region:'us', fields:['durationMillis','staticDurationMillis']};
      if(departAt&&departAt>Date.now()+60000) req.departureTime=new Date(departAt);
      return lib.Route.computeRoutes(req); })
    .then(function(r){ var rt=r&&r.routes&&r.routes[0], d=rt&&(rt.durationMillis||rt.staticDurationMillis); if(!d||!isFinite(d)) throw new Error('no-route');
      ST.lastOk=Date.now(); ST.lastErr=null; return Math.max(1,Math.round(d/60000)); })
    .catch(function(e){ ST.lastErr=String(e&&e.message||e); throw e; }); }
  function loadKey(){ var D=pvxDb(); if(!D) return Promise.resolve(null);
    return D.collection('ts_settings').doc('maps').get().then(function(s){ var k=s.exists&&(s.data()||{}).browser_key; ST.key=k?String(k).trim():null; ST.keyLoaded=true; return ST.key; })
      .catch(function(){ ST.keyLoaded=true; return null; }); }

  /* ---------- learning from real arrivals ---------- */
  function loadLog(){ var D=pvxDb(); if(!D) return; D.collection('eta_log').where('tenant_id','==',pvxTenant()).limit(400).get().then(function(s){ ST.log=s.docs.map(function(d){ return d.data(); }); }).catch(function(){}); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function pct(a,p){ var i=(a.length-1)*p, lo=Math.floor(i), hi=Math.ceil(i); return a[lo]+(a[hi]-a[lo])*(i-lo); }
  /* shift = how much later than estimated people from this town really arrive (median); the window = the middle half */
  function learned(key){
    var err=function(L){ return L.map(function(e){ return (+e.actual_min)-(+e.predicted_min); }).filter(function(x){ return isFinite(x); }).sort(function(a,b){ return a-b; }); };
    var town=err(ST.log.filter(function(e){ return e.town===key; })), all=err(ST.log), use=town.length>=3?town:all;
    if(use.length<5&&town.length<3) return {shift:0, lo:-3, hi:7, n:0, scope:'none'};
    var med=pct(use,.5); return {shift:Math.round(clamp(med,-10,25)), lo:Math.round(clamp(pct(use,.25)-med,-10,-2)), hi:Math.round(clamp(pct(use,.75)-med,4,20)), n:use.length, scope:town.length>=3?'town':'all'}; }
  function etaFrom(leaveAt, minutes, L){ var mid=leaveAt+(minutes+L.shift)*60000; return {mid:mid, lo:mid+L.lo*60000, hi:mid+L.hi*60000}; }

  /* ---------- Add patient: the "On the way" arrival type ---------- */
  var seg=document.getElementById('apArrival');
  var btn=document.createElement('button'); btn.type='button'; btn.className='ap-seg-btn'; btn.dataset.arrival='otw';
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14"/><path d="M6 17l1.6-5.2a2 2 0 0 1 1.9-1.4h5a2 2 0 0 1 1.9 1.4L18 17"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/><path d="M3 7h5M2 10h4"/></svg>On the way';
  var hospBtn=seg.querySelector('[data-arrival="hospitalized"]'); seg.insertBefore(btn,hospBtn||null);
  var sect=document.createElement('div'); sect.className='otw-sect'; sect.id='otwSect'; sect.style.display='none';
  sect.innerHTML='<div class="ap-grid c2"><div class="ap-field"><label for="otwFrom">Coming from — town or ZIP</label><div class="bc-wrap"><input class="ap-input" id="otwFrom" placeholder="e.g. Milford or 06460" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="otwTowns"><div class="otw-towns" id="otwTowns" role="listbox" aria-label="Towns"></div></div></div>'
    +'<div class="ap-field"><span class="otw-lbl" id="otwLeaveL">Leaving</span><div class="otw-leave" role="radiogroup" aria-labelledby="otwLeaveL"><button type="button" role="radio" data-leave="0" aria-checked="true">Now</button><button type="button" role="radio" data-leave="10" aria-checked="false">In 10 min</button><button type="button" role="radio" data-leave="20" aria-checked="false">In 20 min</button></div></div></div>'
    +'<div class="otw-eta" id="otwEta" aria-live="polite"></div>';
  var tr=document.getElementById('apTransfer'); tr.parentNode.insertBefore(sect,tr.nextSibling);
  var F={leave:0, minutes:null, source:null, place:null, looking:false, seq:0, typed:null};
  function isOtw(){ try{ return apArrivalType==='otw'; }catch(e){ return false; } }
  pvxWrap('apSetArrival',function(_set){ return function(type){ _set.apply(this,arguments); var on=type==='otw'; sect.style.display=on?'':'none';
    var as=document.getElementById('apLocationMount'), sec=as&&as.closest('.ap-field'); if(sec) sec.style.display=on?'none':'';
    var cb=document.getElementById('apCreate'); if(cb&&!ST.arriving) cb.textContent=on?'Add to On the way':'Create patient';
    if(on){ if(!ST.keyLoaded) loadKey().then(paintEta); paintEta(); setTimeout(function(){ var f=document.getElementById('otwFrom'); if(f&&!f.value) f.focus(); },60); } }; },'#21');
  pvxWrap('openAddPatient',function(_open){ return function(){ F={leave:0, minutes:null, source:null, place:null, looking:false, seq:0, typed:null}; var r=_open.apply(this,arguments);
    sect.style.display='none'; var f=document.getElementById('otwFrom'); if(f) f.value=''; paintLeave(); paintEta(); closeTowns();
    var as=document.getElementById('apLocationMount'), sec=as&&as.closest('.ap-field'); if(sec) sec.style.display=''; return r; }; },'#21');
  function paintLeave(){ sect.querySelectorAll('[data-leave]').forEach(function(b){ b.setAttribute('aria-checked',String(+b.dataset.leave===F.leave)); }); }
  function etaNow(){ if(F.minutes==null) return null; return etaFrom(Date.now()+F.leave*60000, F.minutes, learned(F.place?F.place.key:'')); }
  function paintEta(){ var e=document.getElementById('otwEta'); if(!e) return; var h='';
    if(F.looking) h='<span class="otw-spin" aria-hidden="true"></span><span>Asking Google Maps for the drive time…</span>';
    else if(F.minutes!=null){ var x=etaNow(); h='<div class="otw-eta-main"><span class="otw-k">Expected</span><b>'+pvxEscQ(hmShort(x.lo))+'–'+pvxEscQ(hm(x.hi))+'</b></div><span class="otw-src">'+(F.source==='google'?'about '+F.minutes+' min drive now · Google Maps':'about '+F.minutes+' min, as the family said')+'</span>'; }
    if(!F.looking&&(F.source!=='google')){
      var why=!F.place?'':(!ST.key?(admin()?'No Google Maps key yet. <button type="button" class="otw-link" data-otw="key">Add it…</button>':'Drive times from Google Maps aren’t set up yet.'):'Google Maps didn’t answer.');
      h+='<label class="otw-typed"><span>'+(F.place?(why?why+' ':'')+'How many minutes away did they say?':'Or the minutes they said')+'</span><span class="otw-minw"><input class="ap-input" id="otwMin" inputmode="numeric" autocomplete="off" role="spinbutton" aria-valuemin="1" aria-valuemax="240" maxlength="3" placeholder="20" value="'+(F.source==='family'&&F.minutes!=null?F.minutes:'')+'"><span class="otw-minu" aria-hidden="true">min</span></span></label>'; }
    e.innerHTML=h; }
  function lookup(){ var t=document.getElementById('otwFrom'); F.place=place(t&&t.value); var me=++F.seq;
    if(!F.place){ if(F.source==='google'){ F.minutes=null; F.source=null; } paintEta(); return; }
    var go=function(){ if(!ST.key&&!(window.google&&google.maps&&google.maps.importLibrary)){ F.looking=false; if(F.source==='google'){ F.minutes=null; F.source=null; } paintEta(); return; }
      F.looking=true; paintEta();
      driveMinutes(F.place.query, Date.now()+F.leave*60000).then(function(m){ if(me!==F.seq) return; F.looking=false; F.minutes=m; F.source='google'; paintEta(); })
        .catch(function(){ if(me!==F.seq) return; F.looking=false; if(F.source==='google'){ F.minutes=null; F.source=null; } paintEta(); }); };
    if(!ST.keyLoaded) loadKey().then(go); else go(); }
  var lt=null; function lookupSoon(){ clearTimeout(lt); lt=setTimeout(lookup,450); }
  /* town suggestions */
  var hl=-1;
  function closeTowns(){ var p=document.getElementById('otwTowns'); if(p){ p.innerHTML=''; p.classList.remove('open'); } var f=document.getElementById('otwFrom'); if(f) f.setAttribute('aria-expanded','false'); hl=-1; }
  function showTowns(){ var f=document.getElementById('otwFrom'), p=document.getElementById('otwTowns'); var q=String(f.value||'').trim().toLowerCase();
    if(!q){ var O=pvxOften(); if(!O.length){ closeTowns(); return; }   /* PVX-N371 */
      p.innerHTML='<div class="pvx-grp" role="presentation">Often from</div>'+O.map(function(t,i){ return '<button type="button" role="option" data-town="'+pvxEscQ(t.v)+'" aria-selected="'+(i===hl)+'">'+pvxEscQ(t.label)+'<span>'+(t.zip?'ZIP':'CT')+'</span></button>'; }).join('');
      p.classList.add('open'); f.setAttribute('aria-expanded','true'); return; }
    if(/^\d/.test(q)){ closeTowns(); return; }
    var L=TOWNS.filter(function(t){ return t.toLowerCase().indexOf(q)===0; }).concat(TOWNS.filter(function(t){ return t.toLowerCase().indexOf(q)>0; })).slice(0,6);
    if(!L.length||(L.length===1&&L[0].toLowerCase()===q)){ closeTowns(); return; }
    p.innerHTML=L.map(function(t,i){ return '<button type="button" role="option" data-town="'+pvxEscQ(t)+'" aria-selected="'+(i===hl)+'">'+pvxEscQ(t)+'<span>CT</span></button>'; }).join(''); p.classList.add('open'); f.setAttribute('aria-expanded','true'); }
  function pickTown(t){ var f=document.getElementById('otwFrom'); f.value=t; closeTowns(); lookup(); }
  /* PVX-N371: the places arrivals most often came from (Flow's own arrival log: town or ZIP only), most first */
  function pvxOften(){ var n={}; (ST.log||[]).forEach(function(r){ var k=String(r&&r.town||'').trim(); if(k) n[k]=(n[k]||0)+1; });
    return Object.keys(n).sort(function(a,b){ return n[b]-n[a]||a.localeCompare(b); }).slice(0,5).map(function(k){
      if(/^\d{5}$/.test(k)) return {v:k,label:k,zip:true};
      var t=TOWNS.filter(function(x){ return x.toLowerCase()===k; })[0]; return {v:t||k,label:t||k.replace(/\b\w/g,function(c){ return c.toUpperCase(); })}; }); }
  window.pvxOtw371={log:function(){ return ST.log; },often:pvxOften};
  ['focusin','click'].forEach(function(k){ sect.addEventListener(k,function(e){ if(e.target.id==='otwFrom'&&!String(e.target.value||'').trim()&&!document.getElementById('otwTowns').classList.contains('open')){ hl=-1; showTowns(); } }); });
  sect.addEventListener('input',function(e){ if(e.target.id==='otwFrom'){ hl=-1; showTowns(); lookupSoon(); }
    else if(e.target.id==='otwMin'){ var v=parseInt(e.target.value,10); if(v>0&&v<=240){ F.minutes=v; F.source='family'; } else if(F.source==='family'){ F.minutes=null; F.source=null; }
      var main=sect.querySelector('.otw-eta-main'), x=etaNow(); if(x){ var src=sect.querySelector('.otw-src'); if(main) main.querySelector('b').textContent=hmShort(x.lo)+'–'+hm(x.hi); else { var d=document.createElement('div'); d.className='otw-eta-main'; d.innerHTML='<span class="otw-k">Expected</span><b>'+pvxEscQ(hmShort(x.lo))+'–'+pvxEscQ(hm(x.hi))+'</b>'; document.getElementById('otwEta').prepend(d); } }
      else if(main) main.remove(); } });
  sect.addEventListener('keydown',function(e){ if(e.target.id!=='otwFrom') return; var p=document.getElementById('otwTowns'), B=p?[].slice.call(p.querySelectorAll('button')):[]; if(!B.length) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); hl=(hl+(e.key==='ArrowDown'?1:-1)+B.length)%B.length; B.forEach(function(b,i){ b.setAttribute('aria-selected',String(i===hl)); }); }
    else if(e.key==='Enter'&&hl>=0){ e.preventDefault(); pickTown(B[hl].dataset.town); } else if(e.key==='Escape'){ e.stopPropagation(); closeTowns(); } });
  sect.addEventListener('click',function(e){ var t=e.target.closest('[data-town]'); if(t){ pickTown(t.dataset.town); return; }
    var l=e.target.closest('[data-leave]'); if(l){ F.leave=+l.dataset.leave; paintLeave(); if(F.source==='google') lookup(); else paintEta(); return; }
    if(e.target.closest('[data-otw="key"]')) openKey(); });
  document.addEventListener('click',function(e){ if(!e.target.closest||e.target.closest('#otwSect .bc-wrap')) return; closeTowns(); });

  /* create: On the way goes to incoming/, never into PATIENTS (so the board, lobby screen and tracker stay as they are) */
  var cbtn=document.getElementById('apCreate'), _create=cbtn.onclick;
  cbtn.onclick=function(ev){ if(isOtw()) return saveIncoming(); var arriving=ST.arriving; var r=_create.call(this,ev); if(arriving) watchArrival(arriving); return r; };
  function val(id){ var el=document.getElementById(id); return el?String(el.value||'').trim():''; }
  function saveIncoming(){
    var name=val('apName'); if(!name){ try{ toast('Enter a patient name'); }catch(e){} var n=document.getElementById('apName'); if(n) n.focus(); return; }
    F.place=place(val('otwFrom'));
    if(!F.place&&F.minutes==null){ try{ toast('Add the town they’re coming from, or the minutes they said'); }catch(e){} var f=document.getElementById('otwFrom'); if(f) f.focus(); return; }
    var D=pvxDb(); if(!D){ try{ toast('Not connected — try again in a moment'); }catch(e){} return; }
    var now=Date.now(), leaveAt=now+F.leave*60000, L=learned(F.place?F.place.key:''), x=F.minutes!=null?etaFrom(leaveAt,F.minutes,L):null;
    var reason=val('apReason'); try{ if(!reason&&apProblems&&apProblems.length) reason=problemsToString(apProblems); }catch(e){}
    var doc={tenant_id:pvxTenant(), status:'on_the_way', name:name, species:val('apSpecies'), breed:val('apBreed'), owner:val('apOwner'), phone:val('apPhone'), prio:(function(){ try{ return apPrio; }catch(e){ return 2; } })(),
      reason:reason, from:F.place?{label:F.place.label, query:F.place.query, key:F.place.key}:null, leave_min:F.leave, leave_at:iso(leaveAt),
      minutes:F.minutes, minutes_source:F.source, shift:L.shift, eta_first:x?iso(x.mid):null, eta_at:x?iso(x.mid):null, eta_lo:x?iso(x.lo):null, eta_hi:x?iso(x.hi):null, eta_updated_at:iso(now), refreshes:0,
      doctor:(function(){ try{ return apDoctorId; }catch(e){ return 'unassigned'; } })(), room_plan:null, created_at:iso(now), created_by:pvxWho()};
    var b=document.getElementById('apCreate'); if(b){ b.disabled=true; b.textContent='Adding…'; }
    D.collection('incoming').add(doc).then(function(ref){ doc.id=ref.id; upsert(doc); if(b){ b.disabled=false; } closeAddPatient(); renderStrip();
      pvxNote(pvxEscQ(name)+' is on the way', x?'Expected '+hmShort(x.lo)+'–'+hm(x.hi)+(F.place?' · from '+pvxEscQ(F.place.label):''):'From '+pvxEscQ(F.place.label)+' · add the minutes when they call back'); })
      .catch(function(e){ console.warn('[otw] save',e); if(b){ b.disabled=false; b.textContent='Add to On the way'; } try{ toast('Couldn’t save — check the connection and try again'); }catch(_){} }); }

  /* ---------- the live list ---------- */
  function upsert(d){ var i=ST.list.findIndex(function(x){ return x.id===d.id; }); if(d.status!=='on_the_way'){ if(i>-1) ST.list.splice(i,1); return; } if(i>-1) ST.list[i]=d; else ST.list.push(d); }
  function start(){ if(ST.started) return; var D=pvxDb(); if(!D) return; var signed=false; try{ signed=!!(AUTH&&AUTH.currentUser); }catch(e){} if(!signed) return; ST.started=true;
    loadKey(); loadLog();
    try{ ST.unsub=D.collection('incoming').where('tenant_id','==',pvxTenant()).where('status','==','on_the_way').onSnapshot(function(s){ ST.list=s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }); renderStrip(); },
      function(e){ console.warn('[otw] listen',e); }); }catch(e){ console.warn('[otw] listen',e); }
    ST.tick=setInterval(function(){ renderStrip(); refreshDue(); matchArrivals(); },20000); }
  var boot=setInterval(function(){ start(); if(ST.started) clearInterval(boot); },700); start();
  window.addEventListener('focus',function(){ if(ST.started){ renderStrip(); refreshDue(); } });

  /* every 5 minutes, one workstation asks Google again (the one that finds the record oldest), at most 8 times a trip */
  function refreshDue(){ var D=pvxDb(); if(!D) return; var now=Date.now();
    ST.list.forEach(function(d){ if(d.minutes_source!=='google'||!d.from||!d.from.query) return; if(now-ms(d.eta_updated_at)<5*60000||(d.refreshes||0)>=8) return; if(d.eta_hi&&now>ms(d.eta_hi)+15*60000) return; if(d._busy) return;
      d._busy=true; var leaveAt=ms(d.leave_at);
      D.collection('incoming').doc(d.id).get().then(function(s){ var cur=s.exists?s.data():null; if(!cur||cur.status!=='on_the_way'||Date.now()-ms(cur.eta_updated_at)<5*60000) throw new Error('fresh');
        return driveMinutes(d.from.query, leaveAt); })
      .then(function(m){ var L={shift:d.shift||0, lo:-3, hi:7}; var l2=learned(d.from.key); L.lo=l2.lo; L.hi=l2.hi; var x=etaFrom(leaveAt,m,L);
        var up={minutes:m, eta_at:iso(x.mid), eta_lo:iso(x.lo), eta_hi:iso(x.hi), eta_updated_at:iso(Date.now()), refreshes:(d.refreshes||0)+1}; Object.assign(d,up);
        return D.collection('incoming').doc(d.id).update(up); })
      .catch(function(){}).then(function(){ d._busy=false; renderStrip(); }); }); }

  /* ---------- arrival: reception presses Arrived (or any check-in with the same pet name) ---------- */
  function matchArrivals(){ var P=[]; try{ P=PATIENTS||[]; }catch(e){ return; }
    ST.list.slice().forEach(function(d){ var first=String(d.name||'').trim().split(/\s+/)[0].toLowerCase(); if(!first) return;
      var p=P.filter(function(x){ var a=x.arrival?new Date(x.arrival).getTime():0; return a>=ms(d.created_at)-60000&&String(x.name||'').toLowerCase()===first&&(!d.species||!x.species||x.species==='—'||String(x.species).toLowerCase()===String(d.species).toLowerCase()); })[0];
      if(p) markArrived(d,p); }); }
  function watchArrival(a){ var n=0, t=setInterval(function(){ n++; matchArrivals(); if(!ST.list.some(function(d){ return d.id===a.id; })||n>40){ clearInterval(t); if(ST.arriving&&ST.arriving.id===a.id) ST.arriving=null; } },1500); }
  function markArrived(d,p){ var D=pvxDb(); if(!D||d._done) return; d._done=true; var now=p&&p.arrival?new Date(p.arrival).getTime():Date.now();
    var first=d.eta_first||d.eta_at, pred=first?Math.round((ms(first)-ms(d.created_at))/60000):null,   /* the estimate made on the call, not later +5s or refreshes */ act=Math.round((now-ms(d.created_at))/60000);
    var up={status:'arrived', arrived_at:iso(now), visit_id:p&&p.id!=null?String(p.id):null, from:null, phone:null, owner:null};
    D.collection('incoming').doc(d.id).update(up).catch(function(e){ console.warn('[otw] arrived',e); });
    if(pred!=null&&act>=0&&act<=360){ var dt=new Date(ms(d.created_at)); D.collection('eta_log').add({tenant_id:pvxTenant(), town:d.from&&d.from.key||'', dow:dt.getDay(), hour:dt.getHours(), leave_min:d.leave_min||0,
      predicted_min:pred, actual_min:act, source:d.minutes_source||'none', at:iso(now)}).then(function(){ ST.log.push({town:d.from&&d.from.key||'', predicted_min:pred, actual_min:act}); }).catch(function(){}); }
    upsert(Object.assign({},d,up)); renderStrip(); }
  function arrived(id){ var d=ST.list.filter(function(x){ return x.id===id; })[0]; if(!d) return; ST.arriving={id:id, at:Date.now()};
    openAddPatient(); try{ apSetArrival('walkin'); }catch(e){}
    var set=function(k,v){ var el=document.getElementById(k); if(el&&v) el.value=v; };
    set('apName',d.name); set('apBreed',d.breed); set('apOwner',d.owner); set('apPhone',d.phone); set('apReason',d.reason);
    var sp=document.getElementById('apSpecies'); if(sp&&d.species){ [].some.call(sp.options,function(o){ if(o.value===d.species||o.text===d.species){ sp.value=o.value||o.text; return true; } return false; }); }
    try{ apSetPrio(+d.prio||2); }catch(e){}
    try{ if(d.room_plan){ apLocation=d.room_plan; apMountLocation(); } }catch(e){}
    try{ if(d.doctor&&d.doctor!=='unassigned'){ apDoctorId=d.doctor; apMountDoctor(); } }catch(e){}
    var t=document.querySelector('#apModal .aph-t'); if(t) t.textContent='Check in '+(d.name||'');
    var s=document.querySelector('#apModal .aph-sub'); if(s) s.textContent='They were on the way. Check the details, then create the patient.';
    var cb=document.getElementById('apCreate'); if(cb) cb.textContent='Check in'; }
  function notComing(id){ var D=pvxDb(), d=ST.list.filter(function(x){ return x.id===id; })[0]; if(!D||!d) return;
    var up={status:'cancelled', cancelled_at:iso(Date.now()), cancelled_by:pvxWho(), from:null, phone:null, owner:null};
    var back={status:'on_the_way', cancelled_at:null, cancelled_by:null, from:d.from||null, phone:d.phone||null, owner:d.owner||null};
    D.collection('incoming').doc(id).update(up).then(function(){ upsert(Object.assign({},d,up)); renderStrip();
      var undo=function(){ D.collection('incoming').doc(id).update(back).then(function(){ upsert(Object.assign({},d,back)); renderStrip(); }).catch(function(){ try{ toast('Couldn’t undo — add them again from Add patient'); }catch(e){} }); };
      /* Apple: Undo instead of "Are you sure?" */
      if(window.fvNotifyAct) fvNotifyAct(pvxEscQ(d.name||'Patient')+' taken off On the way','','Undo',undo,{color:'#3E8FA5'}); else pvxNote(pvxEscQ(d.name||'Patient')+' taken off On the way',''); })
      .catch(function(){ try{ toast('Couldn’t update — try again'); }catch(e){} }); }
  function later(id,min){ var D=pvxDb(), d=ST.list.filter(function(x){ return x.id===id; })[0]; if(!D||!d||!d.eta_at) return; var k=min*60000;
    var up={eta_at:iso(ms(d.eta_at)+k), eta_lo:iso(ms(d.eta_lo)+k), eta_hi:iso(ms(d.eta_hi)+k), leave_at:iso(ms(d.leave_at)+k), shift:(d.shift||0)}; Object.assign(d,up); renderStrip();
    D.collection('incoming').doc(id).update(up).catch(function(){}); }
  function planRoom(id,room){ var D=pvxDb(), d=ST.list.filter(function(x){ return x.id===id; })[0]; if(!D||!d) return; d.room_plan=room||null; renderStrip();
    D.collection('incoming').doc(id).update({room_plan:room||null}).catch(function(){}); }

  /* ---------- the Command Center strip ---------- */
  var head=document.querySelector('#view-dashboard .view-head'), strip=document.createElement('section');
  strip.id='otwStrip'; strip.className='otw-strip'; strip.setAttribute('aria-labelledby','otwH'); strip.hidden=true;
  if(head&&head.parentNode) head.parentNode.insertBefore(strip,head.nextSibling);
  function rooms(cur){ var L=[]; try{ L=apAvailableLocations().map(function(x){ return x.id; }).filter(function(x){ return x!=='Lobby'; }); }catch(e){ L=['Room 1','Room 2','Room 3','Room 4','Room 5','Room 6','Room 7','Treatment']; }
    if(cur&&L.indexOf(cur)<0) L.unshift(cur); return L; }
  function taken(room){ try{ return !!room&&room!=='Treatment'&&PATIENTS.some(function(x){ return isActive(x)&&x.room===room; }); }catch(e){ return false; } }
  /* the card reads like an iPhone's "sharing ETA" notice: a small kicker, one bold line, one plain sentence */
  /* the patient's own Flow medallion (initial, species, priority ring) carries a small badge with a car — like a contact photo with an app badge on an iPhone ETA notice */
  var CAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M3.3 16C2.9 16 2.5 15.6 2.5 15.2V12.7C2.5 11.9 3 11.2 3.8 11L6.7 10.2L9 7.1C9.4 6.6 9.9 6.3 10.6 6.3H15.1C15.7 6.3 16.3 6.6 16.6 7.1L18.9 10.1L20.3 10.4C21 10.6 21.5 11.2 21.5 11.9V15.2C21.5 15.6 21.1 16 20.7 16H19.7A2.7 2.7 0 0 0 14.3 16H9.7A2.7 2.7 0 0 0 4.3 16ZM9.4 10.1L10.8 8C10.9 7.8 11.1 7.7 11.4 7.7H12.6V10.1ZM13.8 7.7H14.9C15.2 7.7 15.4 7.8 15.5 8L17.1 10.1H13.8Z"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>';
  function card(d){ var now=Date.now(), mid=ms(d.eta_at), hi=ms(d.eta_hi), has=!!mid;
    var left=has?Math.round((mid-now)/60000):null, late=has&&now>hi, lateBy=has?Math.max(1,Math.round((now-mid)/60000)):0, soon=has&&!late&&left<=5, call=late&&now-hi>=10*60000;
    var name=pvxEscQ(d.name||'Patient'), prio=+d.prio||2, from=d.from&&d.from.label?pvxEscQ(d.from.label):'';
    var state=late?'late':soon&&!d.room_plan?'soon':'', cls='otw-card'+(state?' '+state:'');   /* orange only when something needs doing */
    var kicker=late?'Running late':soon?'Arriving soon':'On the way';
    var right=!has?'':late?lateBy+' min late':left<=0?'now':'in '+left+' min';
    var title=late?name+' is running late':name+' is on the way';
    var room=d.room_plan?(taken(d.room_plan)?' <span class="otw-warn">'+pvxEscQ(d.room_plan)+' is taken right now.</span>':' <span class="otw-ok">'+pvxEscQ(d.room_plan)+' is ready.</span>'):soon||late?' <span class="otw-warn">No room planned yet.</span>':'';
    var src=d.minutes_source==='google'?' Live traffic from Google Maps.':d.minutes_source==='family'?' From what the family said.':'';
    var line;
    if(!has) line=name+' is coming'+(from?' from '+from:'')+'. Add the minutes when they call back.';
    else if(late) line=name+' was expected around '+pvxEscQ(hm(mid))+', '+lateBy+' min ago.'+room+(call&&d.phone?' <span class="otw-warn">Call '+pvxEscQ(d.owner&&d.owner!=='—'?d.owner:'the family')+': <a href="tel:'+pvxEscQ(String(d.phone).replace(/[^\d+]/g,''))+'">'+pvxEscQ(d.phone)+'</a></span>':'');
    else line=name+' will arrive'+(from?' from '+from:'')+' around '+pvxEscQ(hm(mid))+'.'+room+'<span class="otw-src">'+src+'</span>';
    var what=[d.species,d.breed,d.reason].filter(function(x){ return x&&x!=='—'; }).join(' · ');
    var med; try{ med=mono({name:d.name||'?', species:d.species||'', prio:prio},'patient-medallion patient-medallion--compact'); }catch(e){ med='<div class="pt-emoji">'+pvxEscQ(String(d.name||'?').charAt(0).toUpperCase())+'</div>'; }
    return '<article class="'+cls+'" data-otw-id="'+pvxEscQ(d.id)+'" aria-label="'+pvxEscQ((d.name||'Patient')+', '+kicker+(right?', '+right:''))+'">'
      +'<span class="otw-edge" style="background:var(--priority-p'+prio+')"></span>'
      +'<div class="otw-av">'+med+'<span class="otw-badge">'+CAR+'</span></div><div class="otw-body">'
      +'<div class="otw-top"><span class="otw-kick">'+pvxEscQ(kicker)+(from?' · '+from:'')+'</span><span class="otw-in">'+pvxEscQ(right)+'</span></div>'
      +'<div class="otw-tl"><b class="otw-t">'+title+'</b><span class="prio prio-'+prio+'" style="width:22px;height:22px;font-size:0.625rem">P'+prio+'</span></div><p class="otw-line">'+line+'</p>'+(what?'<span class="otw-what">'+pvxEscQ(what)+'</span>':'')
      +'<div class="otw-acts"><button type="button" class="otw-primary" data-otw-act="arrived">Arrived</button>'
      +'<label class="otw-room"><span class="otw-vh">Plan a room for '+name+'</span><select data-otw-act="room"><option value="">Plan a room…</option>'+rooms(d.room_plan).map(function(r){ return '<option'+(r===d.room_plan?' selected':'')+'>'+pvxEscQ(r)+'</option>'; }).join('')+'</select></label>'
      +(has?'<button type="button" class="otw-quiet" data-otw-act="later">+5 min</button>':'')+'<button type="button" class="otw-quiet" data-otw-act="cancel">Not coming</button></div></div></article>'; }
  function renderStrip(){ var L=ST.list.filter(function(d){ return d.status==='on_the_way'; }).sort(function(a,b){ return (ms(a.eta_at)||9e15)-(ms(b.eta_at)||9e15); });
    if(!L.length){ strip.hidden=true; strip.innerHTML=''; return; }
    var foc=document.activeElement&&strip.contains(document.activeElement)?[document.activeElement.closest('[data-otw-id]')&&document.activeElement.closest('[data-otw-id]').dataset.otwId,document.activeElement.dataset.otwAct]:null;
    strip.hidden=false;
    strip.innerHTML='<div class="otw-head"><h2 id="otwH">On the way</h2><span>'+L.length+'</span></div><div class="otw-cards">'+L.map(card).join('')+'</div>';
    if(foc&&foc[0]){ var el=strip.querySelector('[data-otw-id="'+foc[0]+'"] [data-otw-act="'+foc[1]+'"]'); if(el) el.focus(); } }
  strip.addEventListener('click',function(e){ var b=e.target.closest('button[data-otw-act]'); if(!b) return; var id=b.closest('[data-otw-id]').dataset.otwId, a=b.dataset.otwAct;
    if(a==='arrived') arrived(id); else if(a==='later') later(id,5); else if(a==='cancel') notComing(id); });
  strip.addEventListener('change',function(e){ var s=e.target.closest('select[data-otw-act="room"]'); if(!s) return; planRoom(s.closest('[data-otw-id]').dataset.otwId, s.value); });

  /* ---------- the Google Maps key (admins) ---------- */
  function openKey(){ if(!admin()) return; var old=document.getElementById('otwKey'); if(old) old.remove();
    var w=document.createElement('div'); w.id='otwKey'; w.className='otw-key-scrim';
    w.innerHTML='<div class="otw-key" role="dialog" aria-modal="true" aria-labelledby="otwKeyT"><h3 id="otwKeyT">Drive times from Google Maps</h3>'
      +'<p>Paste the browser key from the hospital’s Google Cloud project. Restrict it to shoreline.pravix.app and the Maps JavaScript API with Routes. Only the town a family is coming from is sent to Google.</p>'
      +'<label><span>Browser key</span><input id="otwKeyIn" type="text" autocomplete="off" spellcheck="false" value="'+pvxEscQ(ST.key||'')+'"></label>'
      +'<div class="otw-key-acts"><button type="button" class="otw-quiet" data-k="cancel">Cancel</button><button type="button" class="otw-primary" data-k="save">Save</button></div></div>';
    document.body.appendChild(w); var inp=document.getElementById('otwKeyIn'); if(inp) inp.focus();
    w.addEventListener('click',function(e){ var k=e.target.closest('[data-k]'); if(e.target===w||(k&&k.dataset.k==='cancel')){ w.remove(); return; }
      if(k&&k.dataset.k==='save'){ var v=String(inp.value||'').trim(), D=pvxDb(); if(!D) return;
        D.collection('ts_settings').doc('maps').set({browser_key:v||null, updated_at:iso(Date.now()), updated_by:pvxEmail()},{merge:true}).then(function(){ ST.key=v||null; ST.keyLoaded=true; gP=null; w.remove(); pvxNote('Google Maps key saved',''); lookup(); })
          .catch(function(){ try{ toast('Not saved — only an admin can change it'); }catch(e){} }); } });
    w.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); w.remove(); } }); }

  /* ---------- styles ---------- */
  var css=document.createElement('style'); css.textContent=[
    '#apArrival.ap-seg{grid-template-columns:repeat(4,minmax(0,1fr))}#apArrival .ap-seg-btn{white-space:nowrap}@media(max-width:700px){#apArrival.ap-seg{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:420px){#apArrival.ap-seg{grid-template-columns:1fr}}',
    '.otw-sect{margin-top:12px;padding:14px;border-radius:16px;background:rgba(77,200,224,.06);border:1px solid rgba(77,200,224,.28);display:flex;flex-direction:column;gap:12px}',
    '.otw-lbl{display:block;font-size:0.75rem;font-weight:600;color:var(--ink-700);margin-bottom:6px;letter-spacing:0}',
    '.otw-leave{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.otw-leave button{min-height:44px;border-radius:12px;border:1px solid var(--ctl-border,rgba(158,206,231,.22));background:var(--fill-soft,rgba(158,206,231,.05));color:var(--ink-700);font:600 0.875rem var(--font);cursor:pointer}',
    '.otw-leave button[aria-checked="true"]{color:var(--accent,#4dc8e0);border-color:rgba(56,189,210,.6);background:rgba(56,189,210,.12)}',
    '.otw-towns{display:none;position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:30;border-radius:12px;overflow:hidden;background:var(--navy-2,#0d1930);border:1px solid rgba(158,206,231,.22);box-shadow:0 14px 30px rgba(0,0,0,.35)}.otw-towns.open{display:block}',
    '.otw-towns button{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:44px;padding:0 14px;border:0;background:none;color:var(--ink-900,#f4f8fc);font:500 0.9375rem var(--font);cursor:pointer;text-align:left}.otw-towns button span{color:var(--ink-500,#93a6bd);font-size:0.75rem}',
    '.otw-towns button[aria-selected="true"],.otw-towns button:hover{background:rgba(77,200,224,.12)}',
    '.otw-eta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:0.8125rem;color:var(--ink-500,#93a6bd);min-height:24px}',
    '.otw-eta-main{display:flex;align-items:baseline;gap:8px}.otw-eta-main .otw-k{font-size:0.75rem;letter-spacing:0}.otw-eta-main b{font-size:1.25rem;font-weight:600;color:var(--ink-900,#f4f8fc)}',
    '.otw-typed{display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;font-size:0.8125rem;color:var(--ink-700)}.otw-typed input{width:96px}',
    '.otw-link{border:0;background:none;padding:0;min-height:32px;color:var(--accent,#4dc8e0);font:600 0.8125rem var(--font);text-decoration:underline;text-underline-offset:2px;cursor:pointer}',
    '.otw-spin{width:15px;height:15px;border-radius:50%;border:2px solid rgba(158,206,231,.3);border-top-color:#4dc8e0;animation:otwspin .8s linear infinite}@keyframes otwspin{to{transform:rotate(360deg)}}',
    '.otw-strip{margin:0 0 20px;display:flex;flex-direction:column;gap:12px}.otw-strip[hidden]{display:none}',
    '.otw-head{display:flex;align-items:baseline;gap:10px}.otw-head h2{margin:0;font-size:1.0625rem;font-weight:600;color:var(--ink-900,#f4f8fc)}.otw-head span{font-size:0.875rem;color:var(--ink-500,#93a6bd)}',
    '.otw-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(440px,100%),1fr));gap:14px}',
    '.otw-primary{min-height:44px;padding:0 18px;border-radius:12px;border:0;background:#187A91;color:#fff;font:600 0.875rem var(--font);cursor:pointer}',
    '.otw-quiet{min-height:44px;padding:0 12px;border-radius:12px;border:0;background:none;color:var(--ink-500,#93a6bd);font:500 0.875rem var(--font);cursor:pointer}.otw-quiet:hover{color:var(--ink-900,#f4f8fc)}',
    '.otw-card{position:relative;overflow:hidden;display:grid;grid-template-columns:48px minmax(0,1fr);gap:14px;padding:16px 18px 14px 20px;border-radius:22px;background:var(--navy-2,#0d1930);border:1px solid rgba(158,206,231,.14);box-shadow:0 12px 30px -12px rgba(0,0,0,.55)}',
    '.otw-edge{position:absolute;left:0;top:0;bottom:0;width:4px}',
    '.otw-av{position:relative;width:46px;height:46px}.otw-av .pt-emoji{position:relative;width:46px;height:46px;font-size:1.0625rem;border-radius:14px;display:flex;align-items:center;justify-content:center}',
    '.otw-badge{position:absolute;right:-6px;bottom:-6px;width:22px;height:22px;border-radius:50%;background:#187A91;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2.5px var(--navy-2,#0d1930)}.otw-badge svg{width:min(0.9375rem,22.5px);height:min(0.9375rem,22.5px);fill:#fff}',
    '.otw-card.soon .otw-badge,.otw-card.late .otw-badge{background:#E8743A}',
    '.otw-tl{display:flex;align-items:center;gap:8px;margin-top:2px}.otw-tl .prio{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;font-weight:800}',
    '.otw-t{font-size:1.0625rem;font-weight:600;line-height:1.3;color:var(--ink-900,#f4f8fc)}',
    '.otw-card .otw-in{font-weight:700;color:var(--accent,#4dc8e0)}',
    '@media (max-width:700px){.otw-card{grid-template-columns:40px minmax(0,1fr);gap:12px;padding:14px 14px 12px 16px;border-radius:20px}.otw-av,.otw-av .pt-emoji{width:40px;height:40px}.otw-av .pt-emoji{font-size:0.9375rem;border-radius:12px}.otw-acts .otw-room{flex:1 1 160px}.otw-acts .otw-room select{width:100%}}',
    'body:not(.dark) .otw-badge{box-shadow:0 0 0 2.5px #fff}body:not(.dark) .otw-card .otw-in{color:#1F7F96}',
    '.otw-body{min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.otw-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}',
    '.otw-kick{display:flex;align-items:center;gap:8px;font-size:0.75rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-500,#93a6bd)}',
    '.otw-card.soon .otw-kick,.otw-card.late .otw-kick{color:#F78B4A}',
    '.otw-in{font-size:0.8125rem;color:var(--ink-500,#93a6bd);font-variant-numeric:tabular-nums;white-space:nowrap}.otw-card.soon .otw-in,.otw-card.late .otw-in{color:#F78B4A}',
    '.otw-line{margin:0;font-size:0.9375rem;line-height:1.4;color:var(--ink-800,#dbe6f0)}.otw-src{color:var(--ink-500,#93a6bd)}',
    '.otw-what{font-size:0.8125rem;color:var(--ink-500,#93a6bd);margin-top:2px}',
    '.otw-warn{font-weight:600;color:#F78B4A}.otw-warn a{color:inherit}.otw-ok{font-weight:600;color:#7FD6AE}',
    '.otw-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}',
    'body:not(.dark) .otw-card{background:#fff;border-color:rgba(30,45,90,.10);box-shadow:0 8px 24px rgba(30,45,90,.10)}body:not(.dark) .otw-t{color:#14181F}body:not(.dark) .otw-line{color:#2F3742}body:not(.dark) .otw-card.soon .otw-kick,body:not(.dark) .otw-card.late .otw-kick,body:not(.dark) .otw-card.soon .otw-in,body:not(.dark) .otw-card.late .otw-in{color:#C2410C}',
    '.otw-room select{min-height:44px;border-radius:12px;border:1px solid rgba(158,206,231,.25);background:transparent;color:var(--ink-900,#f4f8fc);padding:0 10px;font:500 0.875rem var(--font)}',
    '.otw-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.otw-primary:active,.otw-quiet:active,.otw-leave button:active{transform:scale(.985);filter:brightness(.9)}',
    '.otw-key-scrim{position:fixed;inset:0;z-index:9000;background:rgba(3,7,14,.6);display:flex;align-items:center;justify-content:center;padding:16px}',
    '.otw-key{width:min(480px,100%);border-radius:20px;background:var(--navy-2,#0d1930);border:1px solid rgba(158,206,231,.2);padding:20px;display:flex;flex-direction:column;gap:12px;color:var(--ink-900,#f4f8fc)}',
    '.otw-key h3{margin:0;font-size:1.0625rem}.otw-key p{margin:0;font-size:0.875rem;line-height:1.5;color:var(--ink-700,#b9c8d8)}.otw-key label{display:flex;flex-direction:column;gap:6px;font-size:0.75rem;font-weight:600}',
    '.otw-key input{min-height:44px;border-radius:12px;border:1px solid rgba(158,206,231,.25);background:rgba(0,0,0,.2);color:inherit;padding:0 12px;font:500 0.875rem ui-monospace,Menlo,monospace}.otw-key-acts{display:flex;justify-content:flex-end;gap:8px}',
    'body:not(.dark) .otw-towns,body:not(.dark) .otw-key{background:#fff;border-color:rgba(30,45,90,.15)}',
    'body:not(.dark) .otw-head h2,body:not(.dark) .otw-eta-main b,body:not(.dark) .otw-towns button,body:not(.dark) .otw-room select,body:not(.dark) .otw-key{color:#14181F}',
    'body:not(.dark) .otw-warn{color:#C2410C}body:not(.dark) .otw-ok{color:#2E8A5E}',
    '@media (prefers-reduced-motion:reduce){.otw-spin{animation-duration:2s}.otw-primary:active,.otw-quiet:active{transform:none}}'
  ].join('\n'); document.head.appendChild(css);

  window.fvOnTheWay={state:function(){ return ST; }, form:function(){ return F; }, place:place, learned:learned, etaFrom:etaFrom, render:renderStrip, refreshDue:refreshDue, matchArrivals:matchArrivals, start:start, loadKey:loadKey, TOWNS:TOWNS};
})();