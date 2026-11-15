/* PVX-N344 - HIG Loading: until the patient list has really arrived (Backend._gotVisits, n273), Flow shows that it is loading
   instead of saying the hospital is empty ("0 patients", "No attention items · All current patients are clear", "8 rooms available").
   After 12 s it says it's still loading and to check the connection. The lobby TV and the Client Display are untouched. */
(function(){
  var H=document.documentElement;
  if(/[?&](display|tv|lobby)=?/.test(location.search)) return;
  H.classList.add('pvx-flow-loading');
  var t0=Date.now(), st=null;
  function say(t){ if(!st){ st=document.createElement('div'); st.id='pvxLoadSay'; st.setAttribute('role','status'); st.className='pvx-sr'; (document.body||H).appendChild(st); } if(st.textContent!==t) st.textContent=t; }
  function tick(){
    var b=document.body; if(b&&(b.classList.contains('tv-mode'))){ H.classList.remove('pvx-flow-loading','pvx-flow-slow'); return; }
    if(typeof Backend!=='undefined'&&Backend._gotVisits){ H.classList.remove('pvx-flow-loading','pvx-flow-slow'); if(st) st.textContent=''; return; }
    if(b) say(Date.now()-t0>12000?'Still loading patients — check the connection':'Loading patients…');
    if(Date.now()-t0>12000) H.classList.add('pvx-flow-slow');
    setTimeout(tick,150); }
  tick();
  window.pvxFlowLoading=function(elapsed){ H.classList.add('pvx-flow-loading'); H.classList.remove('pvx-flow-slow'); t0=Date.now()-(elapsed||0); tick(); };   /* for checks */
})();