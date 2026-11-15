/* PVX-N191 - bars read their value: capacity rails, status bars and utilisation bars become meters */
(function(){
  function pct(el){ var w=el&&(el.style.width||el.style.getPropertyValue('--w')||el.dataset.w); var n=parseFloat(w); return isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0; }
  function txt(e){ return e?e.textContent.replace(/\s+/g,' ').trim():''; }
  function set(el,lab,now,vt){ var s=function(k,v){ if(el.getAttribute(k)!==v) el.setAttribute(k,v); }; s('role','meter'); s('aria-valuemin','0'); s('aria-valuemax','100'); s('aria-valuenow',String(now)); if(lab) s('aria-label',String(lab)); if(vt) s('aria-valuetext',String(vt)); }   /* PVX-N378 */
  function all(){
    document.querySelectorAll('.command-kpi__rail').forEach(function(r){ var c=r.closest('.command-kpi'); if(!c) return;
      var v=txt(c.querySelector('.command-kpi__value')).replace(/\s*\/\s*(of\s+)?/,' of '), sub=txt(c.querySelector('.command-kpi__sub'));
      set(r, (window.pvxChartName?pvxChartName(txt(c.querySelector('.command-kpi__label'))):txt(c.querySelector('.command-kpi__label'))), pct(r.querySelector('i')), v+(sub?' · '+sub:'')); });
    document.querySelectorAll('.status-row .track').forEach(function(t){ var row=t.closest('.status-row'), f=t.querySelector('.fill');
      var n=txt(row.querySelector('.count')), p=f?parseFloat(f.dataset.w)||0:0; set(t, txt(row.querySelector('.status-label')), Math.round(p), n+' patients, '+Math.round(p)+' %'); });
    document.querySelectorAll('.util-fill').forEach(function(f){ var tr=f.parentElement; if(!tr) return; var box=tr.closest('[class*="util"],.panel,.card')||tr.parentElement;
      var lab=txt(box&&box.querySelector('h3,h4,.util-lab,.lbl,.label'))||'Utilisation'; set(tr, lab, pct(f), pct(f)+' %'); });
  }
  var t=0; function soon(){ if(t) return; t=setTimeout(function(){ t=0; all(); },150); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  try{ pvxWatch(soon,{childList:true,subtree:true,characterData:true},document.body); }catch(e){}
  window.pvxMeters={sync:all};
})();