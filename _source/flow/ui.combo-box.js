/* PVX-COMBO n214 - shared by Flow and Client Check-In (HIG Combo boxes) */
(function(){
  if(window.pvxCombo) return;
  /* the best match first: name start, then a word start in the name, then nicknames; common breeds, then whole words, win ties */
  window.pvxBreedRank=function(list,q,pins,hl){ var qn=String(q||'').toLowerCase().replace(/[^a-z0-9]/g,''), ql=String(q||'').toLowerCase().trim(); if(!qn||!list||!list.length) return list;
    return list.map(function(r,i){ var low=String(r.name||'').toLowerCase(), words=low.split(/[^a-z0-9]+/).filter(Boolean), nn=low.replace(/[^a-z0-9]/g,'');
      var t=nn.indexOf(qn)===0?0:(words.some(function(w){ return w.indexOf(qn)===0; })?1:2), p=(pins||[]).indexOf(r.name);
      return {r:r,i:i,t:t,p:p<0?99:p,w:words.indexOf(qn)>=0?0:1}; })
      .sort(function(a,b){ return a.t-b.t||a.p-b.p||a.w-b.w||a.i-b.i; }).map(function(o){
        /* mark the word that matched ("Shorthair"), not the first place the letters appear ("Brit-ish") */
        if(o.t===1&&typeof hl==='function'&&ql){ var low=String(o.r.name).toLowerCase(), m=-1, re=/[^a-z0-9]/;
          for(var k=0;k<low.length;k++){ if((k===0||re.test(low[k-1]))&&low.substr(k,ql.length)===ql){ m=k; break; } }
          if(m>=0) o.r=Object.assign({},o.r,{html:hl(o.r.name,[[m,ql.length]])}); }
        return o.r; }); };
  /* a text field with a list is a combobox; its list is a listbox of options */
  window.pvxCombo=function(input,panel,o){ if(!input||!panel||input.__pvxCombo) return; input.__pvxCombo=1; o=o||{};
    if(!panel.id) panel.id=input.id+'List';
    input.setAttribute('role','combobox'); input.setAttribute('aria-controls',panel.id); input.setAttribute('aria-expanded','false');
    if(o.select) input.setAttribute('aria-haspopup','listbox'); else input.setAttribute('aria-autocomplete','list');
    panel.setAttribute('role','listbox'); if(o.label) panel.setAttribute('aria-label',o.label);
    var opt=o.opt||'.bc-opt', hl=o.hl||'hl', busy=false;
    function sync(){ if(busy) return; busy=true;
      try{ var open=panel.classList.contains('open')&&panel.getBoundingClientRect().height>4; input.setAttribute('aria-expanded',open?'true':'false');
        var cur=null; [].forEach.call(panel.querySelectorAll(opt),function(n,i){ if(!n.id) n.id=panel.id+'-o'+i; n.setAttribute('role','option'); var on=n.classList.contains(hl); n.setAttribute('aria-selected',on?'true':'false'); if(on) cur=n; });
        [].forEach.call(panel.querySelectorAll('.bc-list,.hv-list'),function(n){ n.setAttribute('role','presentation'); });
        if(cur&&open) input.setAttribute('aria-activedescendant',cur.id); else input.removeAttribute('aria-activedescendant'); }
      finally{ busy=false; } }
    new MutationObserver(sync).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); sync();
    /* Esc closes the open list first, never the sheet around it (window capture runs before the sheet's own Esc) */
    if(typeof o.close==='function') window.addEventListener('keydown',function(e){
      if(e.key!=='Escape'||document.activeElement!==input||input.getAttribute('aria-expanded')!=='true') return;
      e.preventDefault(); e.stopPropagation(); try{ o.close(); }catch(x){} sync(); },true); };
})();