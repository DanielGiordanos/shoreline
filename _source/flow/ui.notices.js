
function toast(msg){const t=document.getElementById('toast');document.getElementById('toastMsg').textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);}

 
const NOTE_ICONS = {
move:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>',
doctor:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>',
liaison:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 20v-1a6 6 0 0 1 9.5-4"/><path d="M16 4a4 4 0 0 1 0 7.5"/></svg>',
discharge:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
room:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-6 9 6v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21V12h6v9"/></svg>',
info:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
check:'<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"/></svg>'
};
/* PVX-N377: a message's title and text are data. Allowed: a few inline tags and links to this site; the rest is shown as text. */
const PVX_NOTE_TAGS={A:1,B:1,STRONG:1,I:1,EM:1,SPAN:1,SMALL:1,U:1,BR:1}, PVX_NOTE_ATTR={class:1,href:1,target:1,rel:1,'aria-label':1,'aria-hidden':1,lang:1,dir:1};
function pvxNoteHref(v){ try{ const u=new URL(String(v),location.href); return (u.protocol==='https:'||u.protocol==='http:')&&(u.origin===location.origin||(u.protocol==='https:'&&/(^|\.)pravix\.app$/.test(u.hostname))); }catch(e){ return false; } }
function pvxNoteFrag(html){ const t=document.createElement('template'); t.innerHTML=String(html==null?'':html);
  (function walk(n){ Array.prototype.slice.call(n.childNodes).forEach(function(c){ if(c.nodeType===3) return; if(c.nodeType!==1){ c.remove(); return; }
      if(!PVX_NOTE_TAGS[c.tagName]||c.namespaceURI!=='http://www.w3.org/1999/xhtml'){ c.replaceWith(document.createTextNode(c.outerHTML)); return; }
      Array.prototype.slice.call(c.attributes).forEach(function(a){ const k=a.name.toLowerCase(); if(!PVX_NOTE_ATTR[k]||(k==='href'&&!pvxNoteHref(a.value))) c.removeAttribute(a.name); });
      if(c.tagName==='A'&&c.getAttribute('target')) c.setAttribute('rel','noopener');
      walk(c); }); })(t.content);
  return t.content; }
function pvxNoteColor(c){ c=String(c==null?'':c); return /^[#\w(),.%\s-]{1,60}$/.test(c)?c:'var(--accent)'; }
window.pvxNoteFrag=pvxNoteFrag;
function notify(title, sub, opts){
opts=opts||{};
const wrap=document.getElementById('notes'); if(!wrap) return;
const el=document.createElement('div'); el.className='note';
el.innerHTML=`<div class="n-ic" style="background:${pvxNoteColor(opts.color||'var(--accent)')}">${NOTE_ICONS[opts.icon]||NOTE_ICONS.info}</div>
    <div class="n-body"><div class="n-title"></div>${sub?`<div class="n-sub"></div>`:''}</div>
    <div class="n-time" aria-hidden="true" data-at="${Date.now()}">now</div>`;
el.querySelector('.n-title').appendChild(pvxNoteFrag(title)); if(sub) el.querySelector('.n-sub').appendChild(pvxNoteFrag(sub));   /* PVX-N377 */
if(typeof opts.open==='function'){ el.classList.add('n-open'); const tt=el.querySelector('.n-title'), go=document.createElement('button'); go.type='button'; go.className='n-go'; while(tt.firstChild) go.appendChild(tt.firstChild);
  go.setAttribute('aria-label', go.textContent+'. '+(opts.openLabel||'Open')); tt.appendChild(go);
  el.addEventListener('click',function(e){ if(e.target.closest('.n-x,a')) return; el.classList.add('hide'); setTimeout(()=>el.remove(),480); try{ opts.open(); }catch(x){ console.warn('[note]',x); } }); }   /* PVX-N376 */
wrap.appendChild(el);
RAF ? RAF(()=>el.classList.add('show')) : el.classList.add('show');
if(opts.sticky){ el.setAttribute('role','alert'); el.classList.add('sticky'); const x=document.createElement('button'); x.type='button'; x.className='n-x'; x.setAttribute('aria-label','Dismiss'); x.innerHTML=(window.PVX_GI?PVX_GI.xmark:'×');
  x.onclick=()=>{ el.classList.add('hide'); setTimeout(()=>el.remove(),480); }; el.appendChild(x); }   /* PVX-N197: a failure waits to be read */
else setTimeout(()=>{ el.classList.add('hide'); setTimeout(()=>el.remove(),480); }, opts.dur||4200);
while(wrap.children.length>4){ const old=[...wrap.children].find(n=>!n.classList.contains('sticky'))||wrap.firstChild; old.remove(); }   /* PVX-N197: the oldest routine message goes first */
}
