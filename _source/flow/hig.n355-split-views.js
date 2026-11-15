/* PVX-N355 - HIG Split views: with a patient open, ⌥↓ and ⌥↑ move to the next or previous patient in the order the view shows
   (Patients as sorted, the board stage by stage, Rooms room by room; from Command, most urgent first), the way Mail moves through
   a list with its message open. The drawer follows, the row or card stays highlighted (n354), and VoiceOver hears where it is
   ("Milo Chen, 3 of 9"). It stops at either end and says so. Text fields, menus and sheets keep their own arrow keys. */
(function(){
  function seq(){ var sel={list:'#tableBody tr[data-pid]',flow:'#board .card[data-pid]',rooms:'#view-rooms [data-pid]'}[pvxView()], ids=[];
    if(sel){ [].forEach.call(document.querySelectorAll(sel),function(el){ if(!el.offsetParent) return; var id=el.getAttribute('data-pid'); if(id&&ids.indexOf(id)<0) ids.push(id); }); }
    if(!ids.length){ try{ ids=PATIENTS.filter(isActive).slice().sort(pvxByUrgency).map(function(p){ return String(p.id); }); }catch(e){} }
    return ids; }
  function name(id){ try{ var p=PATIENTS.find(function(x){ return String(x.id)===String(id); }); return p?((p.name||'')+(p.last?' '+p.last:'')):''; }catch(e){ return ''; } }
  function say(t){ try{ if(window.pvxSay) pvxSay(t); }catch(e){} }
  function step(d){ var cur; try{ cur=String(activePatient); }catch(e){ return false; } var ids=seq(), i=ids.indexOf(cur);
    if(i<0){ if(!ids.length) return false; i=d>0?-1:ids.length; }
    var j=i+d; if(j<0||j>=ids.length){ say(d>0?'Last patient':'First patient'); return true; }
    openDrawer(ids[j]); say(name(ids[j])+', '+(j+1)+' of '+ids.length);
    var dr=document.getElementById('drawer'); if(dr&&!dr.contains(document.activeElement)){ var h=dr.querySelector('h2'); if(h){ h.tabIndex=-1; try{ h.focus({preventScroll:true}); }catch(e){ h.focus(); } } }
    try{ var row=document.querySelector('#view-'+pvxView()+' [data-pid="'+ids[j]+'"]'); if(row) row.scrollIntoView({block:'nearest'}); }catch(e){}
    return true; }
  window.pvxStepPatient=step;
  function covered(){ return [].some.call(document.querySelectorAll('.addpt-modal.open,.intake-modal.open,.us-modal.open,.confirm.open,#fvStale.show,.ops-menu.open,.dd-panel.open,[role=menu]:not([hidden])'),function(m){ return !!m.offsetParent; }); }
  document.addEventListener('keydown',function(e){
    if(!e.altKey||e.metaKey||e.ctrlKey||e.shiftKey||(e.key!=='ArrowDown'&&e.key!=='ArrowUp')) return;
    var dr=document.getElementById('drawer'); if(!dr||!dr.classList.contains('open')) return;
    if(pvxTyping()||covered()) return;
    if(step(e.key==='ArrowDown'?1:-1)){ e.preventDefault(); e.stopPropagation(); }
  },true);
})();