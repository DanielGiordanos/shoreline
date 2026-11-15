/* PVX-N214 - combo boxes (HIG Combo boxes): best match first, VoiceOver semantics, Sex as a pop-up */
(function(){
  /* Flow's breed search ranks the likeliest first */
  if(typeof breedFuzzyIndexed==='function'){ pvxWrap('breedFuzzyIndexed',function(bfi){ return function(IDX,q){ var r=bfi.apply(this,arguments), sp=(typeof breedSpecies==='function')?breedSpecies():null;
    return pvxBreedRank(r,q,(typeof BREED_PINS!=='undefined'&&sp&&BREED_PINS[sp])||[],typeof bcHighlight==='function'?bcHighlight:null); }; },'#57'); }
  pvxCombo(document.getElementById('apBreed'),document.getElementById('apBreedPanel'),{label:'Breeds',close:function(){ breedClose(); }});
  pvxCombo(document.getElementById('apRefHosp'),document.getElementById('apRefHospPanel'),{label:'Hospitals',opt:'.hv-opt,.bc-opt',close:function(){ rhClose(); }});
  pvxCombo(document.getElementById('apReason'),document.getElementById('rvList'),{label:'Reason suggestions',opt:'.rv-opt',hl:'active',close:function(){ if(typeof _rvCtrl!=='undefined'&&_rvCtrl) _rvCtrl.close(); }});
  /* a selected Reason token takes Esc (deselect) before the sheet does */
  if(typeof renderProblemChips==='function'){ pvxAfter('renderProblemChips',function(){ var i=document.getElementById('apReason'); if(i){ if(typeof _rpBackspaceArmed!=='undefined'&&_rpBackspaceArmed) i.setAttribute('data-pvx-esc',''); else i.removeAttribute('data-pvx-esc'); } },'#57'); }
  /* Sex: a value from elsewhere (check-in review, an older record) that isn't one of the five stays as an extra option */
  var sx=document.getElementById('apSex');
  if(sx&&sx.tagName==='SELECT'){ var D=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
    Object.defineProperty(sx,'value',{configurable:true,get:function(){ return D.get.call(sx); },set:function(v){ v=v==null?'':String(v);
      [].forEach.call(sx.querySelectorAll('option[data-pvx-extra]'),function(x){ if(x.value!==v) x.remove(); });
      if(v&&![].some.call(sx.options,function(x){ return x.value===v; })){ var x=document.createElement('option'); x.textContent=v; x.value=v; x.setAttribute('data-pvx-extra',''); sx.appendChild(x); }
      D.set.call(sx,v); }}); }
})();