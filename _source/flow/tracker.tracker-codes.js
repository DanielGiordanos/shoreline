/* ===== TRACKER CODES n118 — a check-in code opens the family tracker only with the pet's name, and only while the visit is open =====
   Flow used to write codes/{CODE} = {public_token}, readable by anyone forever: every code ever given out could be guessed.
   Now it writes codes/{CODE}-{petkey} (one per way the family might type the name: the whole name and each word),
   with is_active (open visit; admitted and hospitalized pets count as open) and expires_at (30 days after check-in at most).
   The rules (Oct 12) refuse anything else. The ?t= link and QR are unchanged; the waiting room is not touched.
   Written in its own small batch, never in the visit's save, so a code write can't hold up or fail a save. */
(function(){
  if(typeof window==='undefined') return;
  var SIG={}, KEYS={}, CAP=30*864e5;
  function words(s){ return String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(' ').filter(Boolean); }
  function keys(name){ var w=words(name), out=[]; function add(k){ if(k&&out.indexOf(k)<0&&out.length<4) out.push(k); }
    add(w.join('')); w.forEach(function(x){ if(x.length>=2) add(x); }); return out; }
  function isOpen(p){
    try{ if(fxVisitEnd(p)) return false; }catch(e){}
    if(p.status==='Discharged'||p.status==='Euthanized'||p.status==='Deceased') return false;
    if(!p.completed) return true;
    return p.status==='Admitted'||p.status==='Hospitalized';   /* the front-desk visit closed, the pet is still with us */
  }
  function expires(p){ var a=null; try{ a=_fromTS(p.arrival); }catch(e){} if(!a||isNaN(a)) a=new Date(); return new Date(+a+CAP); }
  function staff(){ try{ return !!DB && typeof Backend!=='undefined' && Backend.mode==='staff'; }catch(e){ return false; } }
  /* write what changed for these visits; closedToo=false skips closed visits this screen never wrote (the backfill) */
  window.fxCodesSync=function(list,closedToo){
    if(!staff()) return Promise.resolve(0);
    var ops=[], done=[];
    (list||[]).forEach(function(p){
      if(!p||p._demo||!p.trackCode||!p.publicToken) return;
      var id=String(p.id), code=String(p.trackCode).toUpperCase(), on=isOpen(p), exp=expires(p);
      var ids=keys(p.name).map(function(k){ return code+'-'+k; });
      var sig=JSON.stringify([ids,p.publicToken,on,+exp]);
      if(SIG[id]===sig) return;
      if(SIG[id]===undefined&&!on&&!closedToo) return;
      var old=(KEYS[id]||[]).filter(function(d){ return ids.indexOf(d)<0; });   /* a renamed pet: the old name stops working */
      ids.forEach(function(d){ ops.push([d,{ v:2, public_token:p.publicToken, tenant_id:TENANT_ID, is_active:on, expires_at:exp },false]); });
      old.forEach(function(d){ ops.push([d,{ is_active:false },true]); });
      done.push([id,sig,ids,SIG[id]]); SIG[id]=sig;
    });
    if(!ops.length) return Promise.resolve(0);
    var chunks=[]; for(var i=0;i<ops.length;i+=400) chunks.push(ops.slice(i,i+400));
    return Promise.all(chunks.map(function(c){ var b=DB.batch();
      c.forEach(function(o){ b.set(DB.collection('codes').doc(o[0]),o[1],o[2]?{merge:true}:undefined); }); return b.commit(); }))
      .then(function(){ done.forEach(function(d){ KEYS[d[0]]=d[2]; }); return ops.length; })
      .catch(function(){ done.forEach(function(d){ if(SIG[d[0]]===d[1]){ if(d[3]===undefined) delete SIG[d[0]]; else SIG[d[0]]=d[3]; } }); return 0; });
  };
  /* after every board update: open visits get their codes (the first load writes today's visits once), and a visit
     that closed in the last two days is closed again in case it was closed on a screen that didn't have this yet */
  var t=null;
  function backfill(){ clearTimeout(t); t=setTimeout(function(){ try{
    var now=Date.now(), list=(PATIENTS||[]).filter(function(p){ return p&&!p._demo; });
    window.fxCodesSync(list.filter(isOpen),false);
    window.fxCodesSync(list.filter(function(p){ var c=null; try{ c=_fromTS(p.completedAt); }catch(e){} return !isOpen(p)&&c&&now-c<2*864e5; }),true);
  }catch(e){} },1500); }
  try{ var _mr=Backend._mergeResus; Backend._mergeResus=function(){ var out=_mr.apply(this,arguments); backfill(); return out; }; }catch(e){}
  window.__fxCodes={ keys:keys, isOpen:isOpen, sig:SIG, written:KEYS };
})();