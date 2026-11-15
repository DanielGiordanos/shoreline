/* PVX-N348 - HIG Printing.
   1. Command, Patients, the board and Rooms print on white with the screen's controls, banners and sheets left off, and a line saying when it was printed.
      Before, the dark screen printed as it looked (top bar, search, the critical banner on every page), and the list stopped after the first page.
   2. Print is in the + menu (with the view's name) and in the keyboard shortcuts; search answers "print". It's offered only where there's a view to print. */
(function(){
  var NAMES={dashboard:'Command',list:'Patients',flow:'Board',rooms:'Rooms'};
  function can(){ var b=document.body; return !!NAMES[pvxView()]&&!b.classList.contains('client-mode')&&!b.classList.contains('tv-mode')&&!b.classList.contains('fs-mode')&&!b.classList.contains('app-ultrasound')&&!b.classList.contains('app-rounds'); }
  var head=document.createElement('div'); head.id='pvxPrintHead'; head.setAttribute('aria-hidden','true'); document.body.insertBefore(head,document.body.firstChild);
  var wasDark=false, on=false;
  function begin(){ var b=document.body; if(on||b.classList.contains('end-tagging')||b.classList.contains('cf-printing')||!can()) return; on=true;
    var d=new Date(), when=d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'})+', '+d.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
    head.innerHTML='<span>VCA Shoreline · Pravix Flow · '+NAMES[pvxView()]+'</span><span>Printed '+when+'</span>';
    wasDark=b.classList.contains('dark'); if(wasDark) b.classList.remove('dark'); b.classList.add('pvx-printing'); }
  function end(){ if(!on) return; on=false; var b=document.body; b.classList.remove('pvx-printing'); if(wasDark) b.classList.add('dark'); wasDark=false; }
  window.addEventListener('beforeprint',begin); window.addEventListener('afterprint',end);
  try{ var mq=matchMedia('print'), f=function(e){ if(e.matches) begin(); else end(); }; if(mq.addEventListener) mq.addEventListener('change',f); else if(mq.addListener) mq.addListener(f); }catch(e){}
  window.pvxPrintView=function(){ if(!can()) return false; begin(); try{ window.print(); }catch(e){} setTimeout(end,0); return true; };
  window.pvxPrintBegin=begin; window.pvxPrintEnd=end;
  /* the + menu item: named for the view, offered only where printing makes sense */
  function paint(){ var it=document.getElementById('opsPrint'), s=document.getElementById('opsPrintS'); if(!it) return; var ok=can(); it.hidden=!ok;
    if(s) s.textContent=(NAMES[pvxView()]||'This view')+' · '+((window.PvxKeys&&PvxKeys.mac===false)?'Ctrl P':'⌘P'); }
  var fab=document.getElementById('fabAdd'); if(fab) fab.addEventListener('click',paint,true); paint();
  /* search: "print" offers Print this view */
  if(typeof searchIndex==='function'){
    var IC='<path d="M6.5 9V3.5h11V9"/><rect x="2.5" y="9" width="19" height="8.5" rx="2"/><rect x="6.5" y="14" width="11" height="7" rx="1"/>';
    pvxWrap('searchIndex',function(_si){ return function(q){ var r=_si.apply(this,arguments); var t=String(q||'').trim().toLowerCase();
      if(/^prin(t|ti|tin|ting)?$/.test(t)&&can()) r.push({kind:'Help',icon:true,svg:IC,color:'var(--ink-500)',title:'Print '+(pvxView()==='flow'?'the board':NAMES[pvxView()]),sub:((window.PvxKeys&&PvxKeys.mac===false)?'Ctrl P':'⌘P'),
        act:function(){ try{ closeSearch(); }catch(e){} var s=document.getElementById('globalSearch'); if(s) s.blur(); setTimeout(function(){ pvxPrintView(); },60); }});
      return r; }; },'n348');
  }
})();