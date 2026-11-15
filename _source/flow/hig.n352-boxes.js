/* PVX-N352 - HIG Boxes: each box says what it holds, for VoiceOver too.
   - The patient drawer's section titles (Flags, Assigned doctor, Liaison, Documents, Move to stage, Timeline) and its boxes'
     titles (pDVM records, Surgery, Triage, Care team, Triage intake, Family messages) are headings, so VoiceOver can move
     section to section; there was one heading, the patient's name.
   - Each box is a group named by its title: the drawer's boxes, Command's panels (Attention center, Client queue,
     Current wait by doctor) and its number tiles (On floor, Waiting…).
   - The intern supervision box had no title; it now reads "Intern supervision". */
(function(){
  function nm(s){ s=String(s||'').replace(/\s+/g,' ').trim(); return s; }
  function sentence(s){ s=nm(s); return (window.pvxChartName?pvxChartName(s):s); }
  var n=0; function idFor(el){ if(!el.id) el.id='pvxBoxT'+(++n); return el.id; }
  function head(el,level){ if(!el||el.getAttribute('role')==='heading'||/^H[1-6]$/.test(el.tagName)||el.closest('button,[role=button]')) return;   /* a title inside a button stays the button's name */ el.setAttribute('role','heading'); el.setAttribute('aria-level',String(level||3)); }
  function group(box,title){ if(!box||!title) return; if(box.matches('button,[role=button]')) return;
    if(!box.getAttribute('role')||box.getAttribute('role')==='group'){ var gid=idFor(title); if(box.getAttribute('role')!=='group') box.setAttribute('role','group'); if(box.getAttribute('aria-labelledby')!==gid) box.setAttribute('aria-labelledby',gid); } }
  function drawer(){ var d=document.getElementById('drawer'); if(!d) return;
    d.querySelectorAll('.sect-title,.timeline-title').forEach(function(t){ head(t,3); });
    d.querySelectorAll('.rec-card').forEach(function(b){ var t=b.querySelector('.rec-title'); if(t){ head(t,3); group(b,t); } });
    d.querySelectorAll('.triage-card:not([role=button]):not(button) .tc-title').forEach(function(t){ head(t,3); });
    var tri=d.querySelector('#triCard'); if(tri){ var tt=tri.querySelector('.tri-hmain b, .tri-hmain .tri-title, .tri-hmain > div:first-child'); if(tt){ head(tt,3); group(tri,tt); } }
    var ms=d.querySelector('.msg-sect'), mh=ms&&ms.querySelector('#commHead .comm-title, #commHead b, #commHead .comm-headwrap > :first-child'); if(ms&&mh){ head(mh,3); group(ms,mh); }
    d.querySelectorAll('.fg-sec,.fvd').forEach(function(b){ var t=b.querySelector('.sect-title'); if(t) group(b,t); });
    var pi=document.getElementById('pv-intern');
    if(pi){ var h=pi.querySelector(':scope > .pvx-box-t'); if(!h){ h=document.createElement('p'); h.className='sect-title pvx-box-t'; h.textContent='Intern supervision'; pi.insertBefore(h,pi.firstChild); }
      head(h,3); pi.setAttribute('aria-labelledby',idFor(h)); }
  }
  function command(){ var v=document.getElementById('view-dashboard'); if(!v) return;
    v.querySelectorAll('.panel').forEach(function(b){ var t=b.querySelector('h3,h2'); if(t) group(b,t); });
    v.querySelectorAll('.command-kpi').forEach(function(k){ var l=k.querySelector('.command-kpi__label'); if(!l) return; var s=sentence(l.textContent);
      if(k.getAttribute('aria-label')!==s){ k.setAttribute('role','group'); k.setAttribute('aria-label',s); } });
  }
  var t=0; function soon(){ if(t) return; t=requestAnimationFrame(function(){ t=0; try{ drawer(); command(); }catch(e){} }); }
  ['drawer','view-dashboard'].forEach(function(id){ var el=document.getElementById(id); if(el) new MutationObserver(soon).observe(el,{childList:true,subtree:true}); });
  soon();
})();