/* PVX-N209 - alerts: a second action (opts.alt), a description for VoiceOver, Cancel is always Cancel */
(function(){
  var box=document.getElementById('confirmBox'), ok=document.getElementById('confirmOk'), cancel=document.getElementById('confirmCancel'), sub=document.getElementById('confirmSub');
  if(!box||!ok||typeof window.showConfirm!=='function') return;
  var alt=document.createElement('button'); alt.type='button'; alt.id='confirmAlt'; alt.className='btn ghost'; alt.hidden=true;
  ok.parentNode.insertBefore(alt, ok);   /* row: Cancel · second action · action; phone stack: action, second action, Cancel */
  pvxWrap('showConfirm',function(sc){ return function(title,okLabel,onOk,opts){
    opts=opts||{};
    var r=sc.apply(this,arguments);
    if(cancel) cancel.textContent='Cancel';
    if(opts.alt&&opts.alt.label){
      alt.hidden=false; alt.textContent=opts.alt.label; box.classList.add('has-alt');
      alt.onclick=function(){ document.getElementById('confirmScrim').classList.remove('open'); box.classList.remove('open'); try{ opts.alt.act&&opts.alt.act(); }catch(e){ console.warn('[confirm]',e); } };
    } else { alt.hidden=true; alt.onclick=null; box.classList.remove('has-alt'); }
    if(sub&&opts.sub) box.setAttribute('aria-describedby','confirmSub'); else box.removeAttribute('aria-describedby');
    if(!box.querySelector('.pvx-hwrap')) box.setAttribute('aria-labelledby','confirmTitle');
    return r;
  }; },'#52');
})();