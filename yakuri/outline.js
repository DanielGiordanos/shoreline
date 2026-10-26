/* One outline for every drug (Oct 25 2026) · Daniel: "Anything else to make it look this organized and easy to follow?" … "Just do it".
   1 · The same headings in the same order on every drug (outline-model.js). Each section moves, word for word, under its heading.
   2 · An outline beside the text when there is room, marking where you are; otherwise a Sections button in the section bar.
   3 · Each section's two actions move into one More menu on its heading, so a page of thirty sections isn't sixty buttons.
   4 · The evidence label becomes a small tag beside the heading.
   5 · Find in this drug: matches marked in the text, with the count and next and previous.
   6 · Dosages, Dosage forms and Adverse effects one step from the drug's name. */
const beforeOutlineArticle=installYakuriArticle;
installYakuriArticle=function(){beforeOutlineArticle();if(window.yakuriOutlinePage)window.yakuriOutlinePage.install();};
window.yakuriOutlinePage=(function(){
 const svg=p=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${p}</svg>`;
 const I={more:svg('<circle cx="6" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="18" cy="12" r="1.6" fill="currentColor"/>'),
  find:svg('<circle cx="10.5" cy="10.5" r="6" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 15 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  list:svg('<path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="4.5" cy="6" r="1.3" fill="currentColor"/><circle cx="4.5" cy="12" r="1.3" fill="currentColor"/><circle cx="4.5" cy="18" r="1.3" fill="currentColor"/>'),
  up:svg('<path d="m6 15 6-6 6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  down:svg('<path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')};
 const JUMPS=[['dosages','Dosages','dosing'],['forms','Dosage forms','formulations'],['adverse','Adverse effects','safety']];
 let reader=null,layout=null,toc=null,nav=null,parts=[],find=null,side=false,finding=false;

 /* 1 · the headings */
 function arrange(){
  const sections=[...reader.querySelectorAll(':scope > section[data-y-section]')].filter(s=>s.id!=='clinical-governance'&&s.querySelector('h3'));if(!sections.length)return;
  const order=YakuriOutline.arrange(sections.map(el=>({id:el.id,title:el.querySelector('h3').textContent,el})));
  const mark=document.createComment('outline');sections[0].before(mark);const frag=document.createDocumentFragment();parts=[];let last=null;
  for(const s of order){if(s.part!==last){last=s.part;const h=document.createElement('h2');h.className='y-part';h.id='part-'+s.part;h.tabIndex=-1;h.textContent=YakuriOutline.LABEL[s.part];frag.append(h);parts.push({key:s.part,label:h.textContent,h,sections:[]});}
   s.el.dataset.yPart=s.part;frag.append(s.el);parts[parts.length-1].sections.push(s.el);}
  mark.replaceWith(frag);reader.classList.add('y-outlined');}

 /* 3 and 4 · one heading row: the title, its evidence tag, its More menu */
 function headings(){
  reader.querySelectorAll(':scope > section[data-y-section]').forEach(s=>{const h=s.querySelector(':scope > h3');if(!h||s.id==='dosages'||s.querySelector(':scope > .y-sec-head'))return;   /* Dosages redraws itself, and the outline heading names it */
   const head=document.createElement('div');head.className='y-sec-head';const title=document.createElement('div');title.className='y-sec-title';h.before(head);head.append(title);title.append(h);
   const tag=s.querySelector(':scope > .evidence-label');if(tag){tag.classList.add('y-ev-tag');title.append(tag);}
   const same=t=>String(t).toLowerCase().replace(/\band\b/g,'&').replace(/[^a-z&]+/g,'');if(s.dataset.yPart&&same(h.textContent)===same(YakuriOutline.LABEL[s.dataset.yPart]||''))h.classList.add('y-same-title');   /* "Interactions" under Interactions: the heading says it once */
   const acts=[...s.querySelectorAll(':scope > .x-inspect-section, :scope > .o-section-pin')];
   if(acts.length&&window.yakuriItemsMenu){acts.forEach(b=>{b.hidden=true;});
    const more=document.createElement('button');more.type='button';more.className='y-sec-more';more.setAttribute('aria-haspopup','menu');more.setAttribute('aria-label','More for '+h.textContent.trim());more.innerHTML=I.more;
    more.addEventListener('click',()=>{const r=more.getBoundingClientRect();window.yakuriItemsMenu(more,r.right-240,r.bottom+4,acts.map(b=>({label:b.textContent.trim(),fn:()=>b.click()})),h.textContent.trim());});
    head.append(more);}});}

 /* 2 · the outline, beside the text or behind the Sections button */
 function outline(){if(!toc)return;
  toc.setAttribute('aria-label','Outline');toc.classList.add('y-outline');
  toc.innerHTML=`<div class="eyebrow">Outline</div><div class="y-find-slot"></div><ol class="y-outline-list">${parts.map(p=>`<li data-part="${p.key}"><a href="#part-${p.key}" data-part="${p.key}">${esc(p.label)}</a></li>`).join('')}</ol>`;
  toc.querySelectorAll('a[data-part]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();jump(a.dataset.part);}));}
 function tools(){if(!nav||nav.querySelector('.y-nav-tools'))return;const t=document.createElement('div');t.className='y-nav-tools';
  t.innerHTML=`<button type="button" class="y-nav-tool" id="y-find-btn" aria-label="Find in ${esc(active.name)}" aria-expanded="false">${I.find}</button><button type="button" class="y-nav-tool" id="y-outline-btn" aria-label="Sections" aria-haspopup="dialog">${I.list}</button>`;
  const dock=nav.querySelector(':scope > .y-island-dock');if(dock)dock.before(t);else nav.append(t);t.querySelector('#y-find-btn').addEventListener('click',()=>{finding?closeFind():openFind();});t.querySelector('#y-outline-btn').addEventListener('click',sheet);}
 function sheet(){const shown=parts;
  const dlg=showYakuriDialog('Sections',`<ol class="y-outline-list y-outline-sheet">${shown.map(p=>`<li><button type="button" data-part="${p.key}">${esc(p.label)}</button></li>`).join('')}</ol>`,'y-outline-dialog');
  if(!dlg)return;dlg.querySelectorAll('button[data-part]').forEach(b=>b.addEventListener('click',()=>{dlg.close();jump(b.dataset.part);}));}
 function fit(){if(!layout)return;const room=layout.clientWidth>=860;side=room;layout.classList.toggle('y-side',room);
  dockVar();
  if(nav)nav.classList.toggle('y-has-rail',room);if(find){if(room){toc.querySelector('.y-find-slot')?.append(find);find.hidden=false;nav&&nav.classList.remove('y-finding');}
   else if(!finding){find.hidden=true;}else if(nav)nav.after(find);}
  refresh();}

 /* the Find and Sections buttons sit just left of the docked context, which arrives on its own schedule */
 let dockSeen=null;function dockVar(){if(!nav)return;const dock=nav.querySelector(':scope > .y-island-dock');nav.style.setProperty('--y-dock-w',(dock&&!dock.hidden?dock.offsetWidth:0)+'px');
  if(dock&&dock!==dockSeen&&ro2){dockSeen=dock;ro2.observe(dock);}}
 const ro2=window.ResizeObserver?new ResizeObserver(()=>dockVar()):null;const navWatch=new MutationObserver(()=>dockVar());
 /* what the current view shows */
 function refresh(){if(!reader)return;for(const p of parts){p.h.hidden=!p.sections.some(s=>!s.hidden);}   /* the outline lists every heading; one outside the current tab opens Full Monograph */
  if(toc)toc.hidden=!side||!parts.length;here();}
 function here(){if(!toc||!side)return;const cover=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--y-page-cover'))||0;
  let cur=null;for(const p of parts){if(p.h.hidden)continue;if(p.h.getBoundingClientRect().top<=cover+32)cur=p.key;}if(!cur){const f=parts.find(p=>!p.h.hidden);cur=f&&f.key;}
  toc.querySelectorAll('a[data-part]').forEach(a=>{if(a.dataset.part===cur)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}
 function jump(key,tab){const p=parts.find(x=>x.key===key);if(!p)return;
  if(tab&&typeof setYakuriView==='function')setYakuriView(tab);if(p.h.hidden&&typeof setYakuriView==='function')setYakuriView('all');refresh();
  p.h.scrollIntoView({block:'start'});p.h.focus({preventScroll:true});here();}

 /* 6 · under the drug's name */
 function jumps(){const hero=$('.article-hero');if(!hero||hero.querySelector('.y-jumps'))return;const have=JUMPS.filter(([k])=>parts.some(p=>p.key===k));if(!have.length)return;
  const n=document.createElement('nav');n.className='y-jumps';n.setAttribute('aria-label','Jump to');
  n.innerHTML=have.map(([k,l])=>`<a href="#part-${k}" data-part="${k}">${l}</a>`).join('');
  const chips=hero.querySelector('.chips');if(chips)chips.append(n);else(hero.querySelector('.subtitle')||hero.lastElementChild).after(n);   /* on the chips' line, so the page grows no taller */
  n.querySelectorAll('a').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();const j=JUMPS.find(x=>x[0]===a.dataset.part);jump(a.dataset.part,j&&j[2]);}));}

 /* 5 · find in this drug */
 let marks=[],at=-1,before=null,timer=0;
 function findBar(){const f=document.createElement('div');f.className='y-find';f.setAttribute('role','search');
  f.innerHTML=`<label class="y-find-field">${I.find}<input type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" placeholder="Find in this drug" aria-label="Find in ${esc(active.name)}"></label><span class="y-find-count" aria-live="polite"></span><button type="button" class="y-find-step" data-step="-1" aria-label="Previous match">${I.up}</button><button type="button" class="y-find-step" data-step="1" aria-label="Next match">${I.down}</button><button type="button" class="y-find-done">Done</button>`;
  const input=f.querySelector('input');input.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>run(input.value),140);});
  input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);if(!marks.length)run(input.value);else step(e.shiftKey?-1:1);}
   else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(input.value){input.value='';run('');}else if(!side)closeFind();}});
  f.querySelectorAll('.y-find-step').forEach(b=>b.addEventListener('click',()=>step(+b.dataset.step)));f.querySelector('.y-find-done').addEventListener('click',closeFind);
  return f;}
 function openFind(){finding=true;if(nav&&!side){nav.after(find);nav.classList.add('y-finding');}find.hidden=false;const b=$('#y-find-btn');if(b)b.setAttribute('aria-expanded','true');find.querySelector('input').focus();}
 function closeFind(){const input=find.querySelector('input');input.value='';run('');finding=false;if(!side){find.hidden=true;if(nav)nav.classList.remove('y-finding');}const b=$('#y-find-btn');if(b){b.setAttribute('aria-expanded','false');if(!side)b.focus();}}
 function clear(){if(!marks.length)return;const hosts=new Set();marks.forEach(m=>{if(!m.isConnected)return;hosts.add(m.parentNode);m.replaceWith(document.createTextNode(m.textContent));});hosts.forEach(h=>h.normalize&&h.normalize());marks=[];at=-1;}
 const SKIP='script,style,select,option,button,.y-vh,.y-find,svg,.y-sym';
 function run(q){clear();const count=find&&find.querySelector('.y-find-count');q=String(q||'').trim();if(find)find.classList.toggle('y-find-has',q.length>=2);
  if(q.length<2){if(count)count.textContent='';if(before&&typeof setYakuriView==='function'){setYakuriView(before);refresh();}before=null;return;}
  if(typeof setYakuriView==='function'&&yakuriView!=='all'){if(!before)before=yakuriView;setYakuriView('all');refresh();}
  const needle=q.toLocaleLowerCase(),w=document.createTreeWalker(reader,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeValue.trim()&&!n.parentElement.closest(SKIP)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
  const nodes=[];let n;while((n=w.nextNode()))nodes.push(n);
  for(const node of nodes){if(marks.length>=500)break;const text=node.nodeValue,low=text.toLocaleLowerCase();let i=low.indexOf(needle);if(i<0)continue;
   const hits=[];while(i>=0){hits.push(i);i=low.indexOf(needle,i+needle.length);}let cur=node;const made=[];
   for(let k=hits.length-1;k>=0;k--){const s=hits[k];const tail=cur.splitText(s);const rest=tail.splitText(needle.length);const m=document.createElement('mark');m.className='y-find-hit';m.textContent=tail.nodeValue;tail.replaceWith(m);made.unshift(m);void rest;}
   marks.push(...made);}
  if(count)count.textContent=marks.length?'':'No matches';if(marks.length)go(0);}
 function step(d){if(!marks.length)return;go((at+d+marks.length)%marks.length);}
 function go(i){if(marks[at])marks[at].classList.remove('y-find-cur');at=i;const m=marks[at];m.classList.add('y-find-cur');
  let p=m.parentElement;while(p&&p!==reader){if(p.tagName==='DETAILS')p.open=true;p=p.parentElement;}
  m.scrollIntoView({block:'center'});const c=find.querySelector('.y-find-count');if(c)c.textContent=(at+1)+' of '+marks.length+(marks.length>=500?'+':'');}

 function install(){reader=$('.reader');layout=$('.reading-layout');toc=$('.toc');nav=$('.y-section-nav');finding=false;marks=[];at=-1;before=null;
  if(!reader||!window.YakuriOutline||!active)return;
  observer.disconnect();if(ro)ro.disconnect();navWatch.disconnect();dockSeen=null;
  arrange();headings();outline();tools();jumps();find=findBar();find.hidden=true;fit();
  reader.querySelectorAll(':scope > section').forEach(s=>observer.observe(s,{attributes:true,attributeFilter:['hidden']}));   /* Clinical focus hides sections itself */
  /* the view was set before the sections had headings: set it again, now by heading (Clinical focus sets its own) */
  if(yakuriView==='clinical'&&typeof applyClinicalFocus==='function')applyClinicalFocus('clinical');else if(typeof setYakuriView==='function')setYakuriView(yakuriView||'overview');
  if(ro&&layout)ro.observe(layout);if(nav)navWatch.observe(nav,{childList:true,attributes:true,subtree:true,attributeFilter:['hidden']});}
 let raf2=0;const observer=new MutationObserver(()=>{if(raf2)return;raf2=requestAnimationFrame(()=>{raf2=0;refresh();});});
 let raf=0;const soon=()=>{if(!raf)raf=requestAnimationFrame(()=>{raf=0;here();});};
 addEventListener('scroll',soon,{passive:true,capture:true});
 let w0=0;const ro=window.ResizeObserver?new ResizeObserver(es=>{const w=Math.round(es[0].contentRect.width);if(w!==w0){w0=w;fit();}}):null;if(!ro)addEventListener('resize',()=>fit());
 /* the tabs are groups of the outline's headings, so each tab shows whole headings, its own first */
 const TABS={overview:['uses','pharmacology','client','limits','other'],dosing:['dosages'],safety:['contra','adverse','monitoring'],interactions:['interactions'],formulations:['forms','storage'],references:['refs']};
 if(typeof sectionCategory==='function'){const prevCat=sectionCategory;sectionCategory=function(s,c){const p=s&&s.dataset&&s.dataset.yPart;if(!p||!TABS[c])return prevCat(s,c);return TABS[c].includes(p);};}
 /* a tab or Full Monograph: the headings and the outline follow what it shows */
 if(typeof setYakuriView==='function'){const prev=setYakuriView;setYakuriView=function(v){prev(v);refresh();};}
 return {install,jump,run,refresh,parts:()=>parts.map(p=>({key:p.key,label:p.label,hidden:p.h.hidden,count:p.sections.length})),side:()=>side};
})();
