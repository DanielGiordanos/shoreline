/* PVX-N354 - HIG Lists and tables.
   1. Selection feedback: while a patient is open, their row on Patients and their card on the board stay highlighted
      (aria-current), so it's clear whose drawer it is. Nothing marked the row before.
   2. Column headings sort Patients (macOS: "let people click a column heading to sort"). The first click sorts the natural way
      for that column (names A to Z, P1 first, longest wait first, earliest arrival first), the second reverses it, the third goes
      back to most urgent first, Flow's own order. "Most urgent first" beside the count does the same. */
(function(){
  /* 1. the open patient */
  function cur(){ try{ return document.getElementById('drawer').classList.contains('open')?activePatient:null; }catch(e){ return null; } }
  function mark(){ var id=cur(); ['#tableBody tr[data-pid]','#board .card[data-pid]'].forEach(function(sel){ [].forEach.call(document.querySelectorAll(sel),function(el){
      var on=id!=null&&el.getAttribute('data-pid')===String(id); el.classList.toggle('pvx-current',on); if(on) el.setAttribute('aria-current','true'); else el.removeAttribute('aria-current'); }); }); }
  var mt=0; function soon(){ if(mt) return; mt=setTimeout(function(){ mt=0; mark(); },0); }   /* a timer, not the next frame: a page in the background gets no frames */
  ['tableBody','board'].forEach(function(id){ var el=document.getElementById(id); if(el) new MutationObserver(soon).observe(el,{childList:true,subtree:true}); });
  var dr=document.getElementById('drawer'); if(dr) new MutationObserver(soon).observe(dr,{attributes:true,attributeFilter:['class']});
  if(typeof window.openDrawer==='function'){ pvxAfter('openDrawer',function(){ try{ mark(); }catch(e){} soon(); },'n354'); }

  /* 2. sorting */
  var KEY=null, DIR=1;
  var NAT={patient:1,reason:1,doctor:1,location:1,status:1,priority:1,arrival:1,wait:-1};
  var WORD={patient:'patient',reason:'reason',doctor:'doctor',location:'location',status:'status',priority:'priority',arrival:'arrival',wait:'wait'};
  var DIRW={patient:['A to Z','Z to A'],reason:['A to Z','Z to A'],doctor:['A to Z','Z to A'],location:['A to Z','Z to A'],status:['in stage order','in reverse stage order'],priority:['P1 first','P3 first'],arrival:['earliest first','latest first'],wait:['shortest first','longest first']};
  var ARROW='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function val(p,k){ try{ switch(k){
      case 'patient': return ((p.name||'')+' '+(p.last||'')).toLowerCase();
      case 'reason': return String((typeof compactProblems==='function'?compactProblems(p):'')||p.reason||'').toLowerCase()||'\uffff';
      case 'doctor': return (!p.doctor||p.doctor==='unassigned')?'\uffff':String(doc(p.doctor).name||'').replace(/^Dr\.?\s*/,'').toLowerCase();
      case 'location': return String(p.room||'').toLowerCase().replace(/\d+/g,function(n){ return ('000'+n).slice(-4); });
      case 'status': var i=(typeof FLOW_COLS!=='undefined'?FLOW_COLS:[]).indexOf(p.status); return i<0?99:i;
      case 'priority': return Number(p.prio)||9;
      case 'arrival': return +new Date(p.arrival)||0;
      case 'wait': return (typeof waitMinutes==='function')?waitMinutes(p):0; } }catch(e){} return ''; }
  function find(id){ try{ return PATIENTS.find(function(x){ return String(x.id)===String(id); }); }catch(e){ return null; } }
  function apply(){ var tb=document.getElementById('tableBody'); if(!tb) return; var rows=[].slice.call(tb.querySelectorAll(':scope > tr[data-pid]')); if(!rows.length) return;
    var base=rows.map(function(r,i){ return {r:r,i:i,p:find(r.getAttribute('data-pid'))}; });
    if(KEY){ base.sort(function(a,b){ if(!a.p||!b.p) return a.i-b.i; var x=val(a.p,KEY), y=val(b.p,KEY); if(x<y) return -DIR; if(x>y) return DIR; return (typeof pvxByUrgency==='function')?pvxByUrgency(a.p,b.p):a.i-b.i; }); }
    else if(typeof pvxByUrgency==='function'){ base.sort(function(a,b){ if(!a.p||!b.p) return a.i-b.i; return pvxByUrgency(a.p,b.p)||a.i-b.i; }); }
    var changed=base.some(function(o,j){ return o.r!==rows[j]; }); if(changed) base.forEach(function(o){ tb.appendChild(o.r); });
    paint(); }
  function paint(){ [].forEach.call(document.querySelectorAll('#view-list thead th[data-sort]'),function(th){ var k=th.getAttribute('data-sort');
      if(!th.querySelector('.pvx-th')){ var t=th.textContent.trim(); th.textContent=''; var b=document.createElement('button'); b.type='button'; b.className='pvx-th'; b.innerHTML='<span class="pvx-th-t"></span><span class="pvx-sort" aria-hidden="true">'+ARROW+'</span>'; b.firstChild.textContent=t; th.appendChild(b);
        b.addEventListener('click',function(){ choose(k); }); }
      var b2=th.querySelector('.pvx-th'), name=b2.querySelector('.pvx-th-t').textContent;
      if(KEY===k){ th.setAttribute('aria-sort',DIR===1?'ascending':'descending'); var d=DIRW[k][DIR===1?0:1], nd=DIR===NAT[k]?DIRW[k][DIR===1?1:0]:'most urgent first'; b2.title='Sorted by '+WORD[k]+', '+d+'. Click for '+nd+'.'; b2.setAttribute('aria-label',name+', sorted '+d); }
      else { th.removeAttribute('aria-sort'); b2.title='Sort by '+WORD[k]; b2.setAttribute('aria-label','Sort by '+WORD[k]); } });
    var rc=document.getElementById('resCount'), rs=document.getElementById('pvxSortReset');
    if(rc&&!rs){ rs=document.createElement('button'); rs.type='button'; rs.id='pvxSortReset'; rs.textContent='Most urgent first'; rs.title='Back to Flow’s order: P1 first, then the longest wait'; rs.addEventListener('click',function(){ choose(null); }); rc.insertAdjacentElement('afterend',rs); }
    if(rs){ rs.hidden=!KEY; if(rc){ var cs=getComputedStyle(rc); rs.style.fontSize=cs.fontSize; rs.style.lineHeight=cs.lineHeight; } } }
  function choose(k){
    if(k===null){ KEY=null; DIR=1; }
    else if(KEY!==k){ KEY=k; DIR=NAT[k]; }
    else if(DIR===NAT[k]){ DIR=-DIR; }
    else { KEY=null; DIR=1; }
    apply();
    try{ if(window.pvxSay) pvxSay(KEY?('Sorted by '+WORD[KEY]+', '+DIRW[KEY][DIR===1?0:1]):'Sorted most urgent first'); }catch(e){}
    var th=KEY&&document.querySelector('#view-list thead th[data-sort="'+KEY+'"] .pvx-th'); if(th&&document.activeElement&&document.activeElement.closest&&document.activeElement.closest('thead')) th.focus(); }
  window.pvxListSort=function(k){ choose(k); return {key:KEY,dir:DIR}; };
  if(typeof renderTable==='function'){ pvxAfter('renderTable',function(){ try{ apply(); }catch(e){} },'n354'); }
  paint();
})();