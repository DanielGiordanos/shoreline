/* PVX-N371 - HIG Combo boxes */
/* 1. hospitals this workstation picked recently, newest first (names only, kept on this computer) */
(function(){
  var K='pvx:flow:refhosp';
  function read(){ try{ var a=JSON.parse(localStorage.getItem(K)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
  window.pvxRefRecent=function(){ var L=(typeof CT_VET_HOSPITALS!=='undefined'?CT_VET_HOSPITALS:[]), out=[];
    read().forEach(function(n){ var h=L.filter(function(x){ return x.name===n; })[0]; if(h&&out.indexOf(h)<0) out.push(h); }); return out.slice(0,5); };
  window.pvxRefRemember=function(name){ name=String(name||'').trim(); if(!name) return;
    var L=(typeof CT_VET_HOSPITALS!=='undefined'?CT_VET_HOSPITALS:[]); if(!L.some(function(x){ return x.name===name; })) return;   /* a typed name isn't added to the list */
    var a=read().filter(function(n){ return n!==name; }); a.unshift(name); try{ localStorage.setItem(K,JSON.stringify(a.slice(0,5))); }catch(e){} };
  if(typeof commitPatient==='function'){ pvxBefore('commitPatient',function(f){ try{ if(f&&f.referringHospital) pvxRefRemember(f.referringHospital); }catch(e){} },'n371'); }
})();
/* 3. the pull-down button of a combo box: opens and closes the list; not in the Tab order (↓ opens it from the keyboard) */
(function(){
  var SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var CFG=[{i:'apBreed',p:'apBreedPanel',label:'Show breeds',close:function(){ if(typeof breedClose==='function') breedClose(); },open:function(){ if(typeof breedRefresh==='function') breedRefresh(); }},
           {i:'apRefHosp',p:'apRefHospPanel',label:'Show hospitals',close:function(){ try{ _apRefCtrl&&_apRefCtrl.close(); }catch(e){} },
            open:function(inp){ inp.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true})); }}];
  function add(c){ var inp=document.getElementById(c.i), pan=document.getElementById(c.p); if(!inp||!pan||inp.__pvxCbx) return; inp.__pvxCbx=1;
    var wrap=inp.closest('.bc-wrap')||inp.parentNode, b=document.createElement('button');
    b.type='button'; b.className='pvx-cbx'; b.tabIndex=-1; b.setAttribute('aria-label',c.label); b.setAttribute('aria-controls',c.p); b.setAttribute('aria-expanded','false'); b.innerHTML=SVG;
    inp.parentNode.insertBefore(b,inp.nextSibling); wrap.classList.add('pvx-cbx-on');
    function isOpen(){ return pan.classList.contains('open'); }
    function sync(){ b.setAttribute('aria-expanded',String(isOpen())); }
    b.addEventListener('mousedown',function(e){ e.preventDefault(); });   /* keep the cursor in the field */
    b.addEventListener('click',function(e){ e.preventDefault();
      if(isOpen()){ c.close(); sync(); return; }
      if(document.activeElement!==inp){ inp.focus(); setTimeout(function(){ if(!isOpen()) c.open(inp); sync(); },0); }
      else { c.open(inp); sync(); } });
    try{ new MutationObserver(sync).observe(pan,{attributes:true,attributeFilter:['class']}); }catch(e){} }
  function all(){ CFG.forEach(add); }
  all(); if(typeof ensureHospitalAutocompletes==='function'){ pvxAfter('ensureHospitalAutocompletes',function(){ all(); },'n371'); }
  document.addEventListener('focusin',function(e){ if(e.target&&(e.target.id==='apBreed'||e.target.id==='apRefHosp')) all(); });
})();