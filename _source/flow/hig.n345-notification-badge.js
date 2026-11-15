/* PVX-N345 - HIG Managing notifications: a badge for what's waiting, so it reaches you when Flow isn't the tab or app in front.
   The tab's title starts with the number of unread family messages and says when a critical patient is waiting
   ("(2) Critical patient waiting · Pravix Flow…"); Flow installed on a Home Screen or Dock shows the same count on its icon.
   It clears as messages are read and the case is taken. The lobby TV keeps its own title. */
(function(){
  var BASE=null, last='';
  function upd(){ var b=document.body; if(!b) return; if(BASE===null) BASE=document.title;
    if(b.classList.contains('tv-mode')) return;
    if(/[?&](display|tv|lobby)=?/.test(location.search)) return;
    var n=0; try{ n=(typeof _unreadMsgs!=='undefined'&&_unreadMsgs)?_unreadMsgs.size:0; }catch(e){}
    var crit=b.classList.contains('crit-active'), signedIn=!(document.getElementById('sbLogin')&&getComputedStyle(document.getElementById('sbLogin')).display!=='none');
    if(!signedIn){ n=0; crit=false; }
    var t=(n?'('+n+') ':'')+(crit?'Critical patient waiting · ':'')+BASE;
    if(t!==last){ last=t; if(document.title!==t&&(document.title===BASE||/^(\(\d+\) )?(Critical patient waiting · )?/.test(document.title))) document.title=t;
      try{ if(navigator.setAppBadge){ if(n||crit) navigator.setAppBadge(n+(crit?1:0)); else if(navigator.clearAppBadge) navigator.clearAppBadge(); } }catch(e){} } }
  function go(){ upd(); setInterval(upd,1000); try{ pvxWatch(upd,{attributes:true,attributeFilter:['class']},document.body); }catch(e){} }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',go); else go();
  window.pvxBadgeNow=upd;   /* for checks */
})();