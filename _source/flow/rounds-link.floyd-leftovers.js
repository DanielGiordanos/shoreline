/* ===== FLOYD LEFTOVERS n118 (Flow + Rounds) — what the Oct 11 end-to-end test found =====
   1. Rounds lists a problem once: the triage / intake complaint that check-in already turned into a problem
      ("Painful abdomen" → "Acute Pain") is not added a second time.
   2. Triage starts with the check-in weight filled in (marked "from check-in"; change it if the scale says otherwise).
   3. Names: capital letters are only fixed when a word is typed all lower case or all capitals
      (McDonald, DeLuca stay; "(floyd)" → "(Floyd)").
   4. The family name on the treatment sheet is the owner's surname only ("Test Owner (floyd)" → "Owner";
      "Mary Ann Smith" → "Smith"; "Smith, John" → "Smith").
   The Rounds surgery detail and the department name are string patches in patch_floyd_n118.py. */
(function(){
  if(typeof window==='undefined') return;
  var lc=function(x){ return String(x==null?'':x).trim().toLowerCase(); };
  /* ---- 1. one problem, once ---- */
  function keysOf(x){ var k=[lc(x)];
    try{ var m=parseModifiers(x); if(m&&m.remaining&&m.remaining.trim()) k.push(lc(m.remaining)); }catch(e){}
    try{ var pr=parseProblem(x); if(pr&&pr.label) k.push(lc(pr.label)); }catch(e){}
    return k.filter(Boolean); }
  function dedupe(p,before){
    var r=p&&p.rounds; if(!r||!Array.isArray(r.problems)) return;
    var seen={}; function mark(x){ keysOf(x).forEach(function(k){ seen[k]=1; }); }
    (before||[]).forEach(function(x){ if(x&&x.label) mark(x.label); });
    (p.reasonProblems||[]).forEach(function(pr){ if(!pr) return; if(pr.label) mark(pr.label); if(pr.originalInput) mark(pr.originalInput); });
    var keep=(before||[]).map(function(x){ return x&&x.id; });
    r.problems=r.problems.filter(function(x){
      if(!x||keep.indexOf(x.id)>-1) return true;          /* what was there before stays exactly as it was */
      var ks=keysOf(x.label); if(ks.some(function(k){ return seen[k]; })) return false;
      ks.forEach(function(k){ seen[k]=1; }); return true; }); }
  if(typeof window.fvRoundsPrefill==='function'){ var _pf=window.fvRoundsPrefill;
    window.fvRoundsPrefill=function(p,at){ var before=(p&&p.rounds&&Array.isArray(p.rounds.problems))?p.rounds.problems.slice():[];
      var out=_pf.apply(this,arguments); try{ dedupe(p,before); }catch(e){} return out; }; }
  window.fvDedupeProblems=dedupe;

  /* ---- 2. triage: the check-in weight is the starting value ---- */
  try{ if(typeof openTriageEdit==='function'){ 
    pvxAfter('openTriageEdit',function(p){ 
      try{ var t=getTriage(p), v=(t&&t.vitals)||{}; var el=document.querySelector('#triEditBody [data-vk="weight"]');
        if(el&&!String(el.value||'').trim()&&!(v.weight&&String(v.weight).trim())){
          var w=(typeof p.weightKg==='number'&&p.weightKg>0)?(p.weightKg+' kg'):String(p.weight||'').trim();
          if(w&&w!=='—'){ el.value=(typeof fmtWeight==='function')?fmtWeight(w):w;
            var lab=el.parentNode&&el.parentNode.querySelector('label');
            if(lab&&!lab.querySelector('.fv-from')){ var s=document.createElement('span'); s.className='fv-from'; s.textContent='from check-in'; lab.appendChild(s); }
            el.addEventListener('input',function rm(){ var f=lab&&lab.querySelector('.fv-from'); if(f) f.remove(); el.removeEventListener('input',rm); }); } } }catch(e){}
      },'#16'); } }catch(e){}

  /* ---- 3. names keep the capitals people type ---- */
  function nameCase(s){ if(!s||!String(s).trim()) return s;
    return String(s).trim().replace(/\s+/g,' ').split(' ').map(function(w){
      var letters=w.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g,'');
      var mixed=letters&&letters!==letters.toLowerCase()&&letters!==letters.toUpperCase();
      if(mixed) return w.replace(/^([^A-Za-zÀ-ÖØ-öø-ÿ]*)([a-zà-öø-ÿ])/,function(m,a,c){ return a+c.toUpperCase(); });
      return w.toLowerCase().replace(/(^|['’.\-(])([a-zà-öø-ÿ])/g,function(m,a,c){ return a+c.toUpperCase(); }); }).join(' '); }
  try{ if(typeof fmtTitleCase==='function') pvxWrap('fmtTitleCase',function(){ return nameCase; },'#16'); }catch(e){}
  window.fvNameCase=nameCase;

  /* ---- 4. the owner's surname ---- */
  window.fvOwnerSurname=function(own){ own=String(own||'').trim(); if(!own||own==='—') return '';
    if(own.indexOf(',')>-1){ var a=own.split(',')[0].replace(/\([^)]*\)/g,' ').trim(); return a; }
    var w=own.replace(/\([^)]*\)|\[[^\]]*\]|"[^"]*"/g,' ').split(/\s+/).map(function(x){ return x.replace(/^[^A-Za-zÀ-ÿ']+|[^A-Za-zÀ-ÿ']+$/g,''); })
      .filter(function(x){ return /[A-Za-zÀ-ÿ]{2,}/.test(x)&&!/^(jr|sr|ii|iii|iv|dvm|md|phd)$/i.test(x); });
    return w.length>1?w[w.length-1]:''; };
  var st=document.createElement('style'); st.textContent='#triEditBody .fv-from{margin-left:6px;font-size:0.6875rem;font-weight:600;color:var(--accent,#38BDD2);text-transform:none;letter-spacing:0}';
  (document.head||document.documentElement).appendChild(st);
})();