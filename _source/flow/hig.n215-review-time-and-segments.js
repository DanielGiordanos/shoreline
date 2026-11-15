/* PVX-N215 - the review time as Day + Time; single-choice segmented controls are radiogroups */
(function(){
  function pad(n){ return String(n).padStart(2,'0'); }
  function isoDay(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function clock(m){ var h=Math.floor(m/60)%24, mm=m%60; return (h%12||12)+':'+pad(mm)+' '+(h<12?'AM':'PM'); }
  function dayLabel(s){ var p=s.split('-'), d=new Date(+p[0],+p[1]-1,+p[2]); return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
  function review(){
    var inp=document.getElementById('alertReview'); if(!inp||inp.type==='hidden') return;
    var v=inp.value||'', vd=v.slice(0,10), vm=v.length>=16?(+v.slice(11,13))*60+(+v.slice(14,16)):null;
    inp.type='hidden';
    var field=inp.closest('.alert-field'), lab=field&&field.querySelector('label');
    var now=new Date(), days=[['','No review time'],[isoDay(now),'Today']];
    for(var i=1;i<=6;i++){ var x=new Date(now); x.setDate(now.getDate()+i); days.push([isoDay(x),i===1?'Tomorrow':dayLabel(isoDay(x))]); }
    if(vd&&!days.some(function(d){ return d[0]===vd; })) days.push([vd,dayLabel(vd)]);
    var times=[]; for(var m=0;m<24*60;m+=15) times.push(m);
    if(vm!==null&&times.indexOf(vm)<0){ times.push(vm); times.sort(function(a,b){ return a-b; }); }
    var wrap=document.createElement('div'); wrap.className='pvx-review';
    wrap.innerHTML='<select class="ap-input ap-select" id="alertReviewDay">'+days.map(function(d){ return '<option value="'+d[0]+'"'+(d[0]===vd?' selected':'')+'>'+d[1]+'</option>'; }).join('')+'</select>'
      +'<select class="ap-input ap-select" id="alertReviewTime" aria-label="Review time">'+times.map(function(m){ return '<option value="'+m+'"'+(m===vm?' selected':'')+'>'+clock(m)+'</option>'; }).join('')+'</select>';
    inp.parentNode.insertBefore(wrap,inp);
    if(lab){ lab.setAttribute('for','alertReviewDay'); }
    var ds=wrap.querySelector('#alertReviewDay'), ts=wrap.querySelector('#alertReviewTime');
    function sensible(){ if(ds.value===isoDay(new Date())){ var n=new Date(), m=Math.ceil((n.getHours()*60+n.getMinutes()+60)/15)*15; return Math.min(m,23*60+45); } return 8*60; }
    function put(){ ts.disabled=!ds.value; inp.value=ds.value?ds.value+'T'+pad(Math.floor(+ts.value/60))+':'+pad(+ts.value%60):''; }
    if(vm===null) ts.value=String(sensible());
    ds.addEventListener('change',function(){ if(!ds.dataset.touched&&vm===null) ts.value=String(sensible()); put(); });
    ts.addEventListener('change',function(){ ds.dataset.touched='1'; put(); });
    put();
  }
  if(typeof renderAlertModal==='function'){ pvxAfter('renderAlertModal',function(){ try{ review(); }catch(e){} },'#59'); }
  review();
  /* single-choice segmented controls */
  function fieldLabel(g){ var f=g.closest('.ap-field'), l=f&&f.querySelector('label'); return l?l.textContent.trim():'Choice'; }
  pvxSeg('.fv-or-seg',{item:'.ap-seg-btn',label:fieldLabel});
  pvxSeg('.fg-seg',{label:'Keep the flag'});
  pvxSeg('#rdShiftSeg',{label:'Rounds shift'});
})();