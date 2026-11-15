/* ═════════ n116 — Rounds follows the treatment sheet ═════════
   One listener per Rounds patient with a sheet. Current treatment = the sheet's active meds, fluids and CRIs (tagged oid);
   untagged entries (typed in Rounds) are never touched. Location is shared both ways through rounds.locSheet. */
(function(){
  if(typeof rdTouch!=='function'||typeof rdId!=='function'||typeof rdNormLoc!=='function') return;
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search), subs={}, AT={};
  function ok(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    return !!u&&!LOBBY&&typeof DB!=='undefined'&&DB&&window.fvAdmitSheet&&!document.body.classList.contains('client-mode')&&!document.body.classList.contains('tv-mode'); }
  /* n117 — Rounds treatments: the dose you'd say at rounds (total mg / pump rate) first, the per-kg alongside */
  function line0(o){ var b=[];   /* n116's wording: still matches the one-time copy made at admit */
    if(o.cont||o.type==='fluid'||o.kind){ if(o.rate_v!=null) b.push(o.rate_v+' '+(o.rate_u||'mL/hr')); if(o.additive) b.push('+ '+o.additive); if(o.conc_label) b.push(o.conc_label); b.push(o.route||'IV'); return b.join(' · '); }
    if(o.dose!=null&&o.dose!=='') b.push(o.dose+(o.unit?' '+o.unit:'')); if(o.route) b.push(o.route); if(o.freq) b.push(o.freq); return b.join(' · '); }
  var UMG={mcg:0.001,mg:1,g:1000}, FEED=/\b(feed|food|diet|meal|rer|npo|water|nutrition)\b/i;
  function num(n){ n=Number(n); return !isFinite(n)?'':n>=100?String(Math.round(n)):n>=10?String(Math.round(n*10)/10):String(Math.round(n*100)/100); }
  function ab(u){ return String(u||'').replace(/\/day$/,'/d'); }
  function fq(f){ f=String(f||''); return /^once$/i.test(f)?'once':f; }
  function perHr(v,u,kg){ var t=Number(v)||0; if(/\/kg/.test(u)) t*=kg; if(/\/min$/.test(u)) t*=60; else if(/\/day$/.test(u)) t/=24; return t; }
  function mlhr(o,kg){ var u=String(o.rate_u||''); if(/\/kg/.test(u)&&!kg) return null; if(/^mL\//.test(u)) return perHr(o.rate_v,u,kg);   /* same math as the sheet's pump rate */
    var c=Number(o.conc)||0; if(!c) return null; var b=u.split('/')[0], cu=o.conc_u||String(((o.rates&&o.rates[0])||{}).u||u).split('/')[0]||b, x=perHr(o.rate_v,u,kg);
    if(b!==cu){ if(!(UMG[b]&&UMG[cu])) return null; x*=UMG[b]/UMG[cu]; } return x/c; }
  function bsa(kg,sp){ return (/cat|feline/i.test(String(sp||''))?10:10.1)*Math.pow(kg,2/3)/100; }
  function fmt(o,kg,sp){ var g,main,k='',sub='';
    if(o.type==='obs'||o.type==='care'||o.type==='diag'){ g=FEED.test(o.name||'')?'feed':'care'; main=fq(o.freq); if(g==='feed') sub=String(o.notes||'').trim(); }
    else if(o.cont||o.type==='fluid'||o.kind){ var u=String(o.rate_u||'mL/hr'), m=mlhr(o,kg), rt=o.route||'IV'; g='fl';
      if(Number(o.rate_v)===0) main='Paused';
      else if(o.kind==='cri'){ main=m!=null?num(m)+' mL/hr '+rt:o.rate_v+' '+ab(u)+' '+rt; if(m!=null) k=o.rate_v+' '+ab(u);
        var cl=o.conc_label||(o.conc?num(o.conc)+' '+(o.conc_u||u.split('/')[0])+'/mL':''); sub='CRI'+(cl?' · '+cl:''); }
      else { main=(m!=null?num(m)+' mL/hr':o.rate_v+' '+ab(u))+' '+rt; if(/^mL\/kg/.test(u)) k=o.rate_v+' '+ab(u); else if(m!=null&&kg) k=Math.round(m*24/kg)+' mL/kg/d'; }
      if(o.additive) sub=(sub?sub+' · ':'')+'+ '+o.additive; }
    else { var un=String(o.unit||''), per=un.split('/')[1]||'', base=un.split('/')[0], tot=null, w=[];
      if(per&&kg) tot=per==='kg'?o.dose*kg:per==='lb'?o.dose*kg*2.20462:per==='m²'?o.dose*bsa(kg,sp):null;
      w.push(tot!=null?num(tot)+' '+base:(o.dose!=null&&o.dose!==''?o.dose+(un?' '+un:''):'')); if(o.route) w.push(o.route); if(o.freq) w.push(fq(o.freq));
      main=w.filter(Boolean).join(' '); if(tot!=null) k=o.dose+' '+un; g='med'; }
    return {g:g,main:main||'',kg:k,sub:sub,detail:[sub,main,k].filter(Boolean).join(' · ')}; }
  function line(o,kg,sp){ return fmt(o,kg,sp).detail; }
  function isTx(o){ return !!o&&!o.draft&&(o.type==='med'||o.cont||o.type==='fluid'||!!o.kind||o.type==='obs'||o.type==='care'||o.type==='diag')&&!/^d\d+$/.test(String(o.id||'')); }
  function live(o){ return isTx(o)&&!o.dc&&!o.stopped&&!(/^once$/i.test(String(o.freq||''))&&o.once_done); }
  function me(){ var u=null; try{ u=AUTH.currentUser; }catch(e){} var n=(typeof CURRENT_USER==='string'&&CURRENT_USER)||(u&&(u.displayName||u.email))||'Flow';
    return {name:n,uid:u?u.uid:null,initials:n.split(/\s+/).map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase()}; }
  function oat(o){ return new Date(o.ordered_at||o.started_at||0).getTime()||0; }
  function apply(id,ref,d){ var p=(typeof PATIENTS!=='undefined')&&PATIENTS.find(function(x){ return String(x.id)===id; }); if(!p||!p.rounds||p.rounds.outcome||!d) return;
    var r=p.rounds, T=r.treatments=r.treatments||[], O=d.orders||{}, all=Object.keys(O).map(function(k){ return O[k]; }).filter(isTx).sort(function(a,b){ return oat(a)-oat(b); }), want=all.filter(live), msgs=[];
    var pt=d.patient||{}, kg=Number(pt.weight)||Number(p.weightKg)||0, sp=pt.species||p.species||'';
    var tagged={}; T.forEach(function(t){ if(t.oid) tagged[t.oid]=t; });
    all.forEach(function(o){ if(tagged[o.id]) return; var nm=o.name||'Treatment', a0=line0(o), a1=line(o,kg,sp);
      var m=T.find(function(t){ return !t.oid&&t.name===nm&&(t.detail===a0||t.detail===a1); }); if(m){ m.oid=o.id; tagged[o.id]=m; } });   /* the one-time copy at admit */
    var keep={}, quiet=0; want.forEach(function(o){ keep[o.id]=1; var nm=o.name||'Treatment', f=fmt(o,kg,sp), t=tagged[o.id];
      if(!t){ T.push({id:rdId(),name:nm,detail:f.detail,oid:o.id,g:f.g,main:f.main,kg:f.kg,sub:f.sub}); msgs.push('+'+nm); }
      else if(t.name!==nm||t.detail!==f.detail||t.g!==f.g||t.main!==f.main||(t.kg||'')!==f.kg||(t.sub||'')!==f.sub){ var old=!t.g&&t.name===nm;
        t.name=nm; t.detail=f.detail; t.g=f.g; t.main=f.main; t.kg=f.kg; t.sub=f.sub; if(old) quiet++; else msgs.push('~'+nm); } });
    for(var i=T.length-1;i>=0;i--){ var t=T[i]; if(t.oid&&!keep[t.oid]){ msgs.push('−'+t.name); T.splice(i,1); } }
    if(quiet&&!msgs.length) msgs.push('fmt');   /* n116 entries rewritten in the new layout: saved, nothing to announce */
    /* location: whichever side changed since the last sync wins */
    var sl=rdNormLoc(d.patient&&d.patient.location)||null, rl=rdNormLoc(r.location)||null;
    if(sl!==(r.locSheet||null)){ if(sl&&sl!==rl){ r.location=sl; msgs.push('Location '+sl); } r.locSheet=sl; if(!sl) r.locSheet=null; if(!msgs.length) msgs.push('loc'); }
    else if(rl&&rl!==sl){ var w=me(), at=new Date().toISOString();
      ref.update({'patient.location':rl, updated_at:at, updated_by:w.initials, audit:firebase.firestore.FieldValue.arrayUnion({at:at,type:'care',desc:'Location → <b>'+rl+'</b> (from Rounds)',who:w.initials,uid:w.uid})})
        .catch(function(e){ console.warn('[rounds → sheet location]',e); });
      r.locSheet=rl; msgs.push('loc'); }
    if(!msgs.length) return;
    var said=msgs.filter(function(x){ return x!=='loc'&&x!=='fmt'; }), tx=said.filter(function(x){ return /^[+~−]/.test(x); });
    rdTouch(p, tx.length?('Treatment sheet · '+tx.join(' ')).slice(0,180):(said[0]||(msgs.indexOf('fmt')>=0?'Treatments from the treatment sheet':'Location from the treatment sheet')), true); }
  function watch(){ if(!ok()||typeof PATIENTS==='undefined') return; var need={};
    PATIENTS.forEach(function(p){ if(!p||p._demo||!p.rounds||p.rounds.outcome) return; if(!(p.tsSheet||p.status==='Admitted'||p.status==='Hospitalized')) return;
      var id=String(p.id); need[id]=1; if(subs[id]) return;
      var ref=DB.collection('sheets').doc(fvAdmitSheet.id(p));
      subs[id]=ref.onSnapshot(function(s){ try{ if(s.exists){ AT[id]=Date.now(); apply(id,ref,s.data()); } }catch(e){ console.warn('[rounds ← sheet]',e); } },function(e){ console.warn('[rounds ← sheet listen]',e); delete subs[id]; }); });
    Object.keys(subs).forEach(function(id){ if(!need[id]){ try{ subs[id](); }catch(e){} delete subs[id]; } }); }
  setInterval(watch,10000); setTimeout(watch,2500);
  window.fvRoundsSheetSync={watch:watch,apply:apply,line:line,fmt:fmt,at:AT,isLive:function(id){ return !!subs[String(id)]; }};
})();