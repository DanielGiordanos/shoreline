


let ddOpen=null;
function createDropdown({items, selectedId=null, placeholder='Select', searchPlaceholder='Search…', variant='', onSelect, label=''}){
const lid='pvxdd'+(createDropdown.n=(createDropdown.n||0)+1);   /* PVX-N205 */
const field=label||String(placeholder).replace(/^(Assign|Add|Select)\s+(an?\s+)?/i,'').replace(/^All\s+/i,'Filter by ').replace(/^./,c=>c.toUpperCase());
const root=document.createElement('div');
root.className='dd'+(variant==='compact'?' dd-compact':'');
let sel=selectedId, hl=-1, q='';
const chev='<span class="chev"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';
const searchIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>';
const avatar=d=> d.badge ? '<span class="dd-badge" aria-hidden="true">'+d.badge+'</span>'
: d.initials ?`<span class="dd-av" aria-hidden="true">${d.initials}</span>`
:`<span class="dd-av dd-av-dot" aria-hidden="true" style="background:${d.color}"></span>`;
const parts=h=>{ const x=document.createElement('div'); x.innerHTML=String(h==null?'':h); return [...x.childNodes].map(n=>(n.textContent||'').trim()).filter(Boolean); };   /* PVX-N360: words, not run together */
const said=d=>parts(d.name).join(', ');
root.innerHTML=`
    <button type="button" class="dd-trigger" aria-haspopup="listbox" aria-expanded="false" aria-controls="${lid}"></button>
    <div class="dd-panel" role="presentation">
      <div class="dd-search">${searchIcon}<input type="text" placeholder="${searchPlaceholder}" aria-label="${String(searchPlaceholder||'Search').replace(/…$/,'')}" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="${lid}"/><button type="button" class="dd-clear" aria-label="Clear search" title="Clear" tabindex="-1" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".32"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button></div>
      <div class="dd-list" role="listbox" id="${lid}" aria-label="${field}"></div>
    </div>`;
const trigger=root.querySelector('.dd-trigger');
const panel=root.querySelector('.dd-panel');
const input=root.querySelector('.dd-search input');
if(items.length<=6){ panel.classList.add('dd-short'); input.setAttribute('aria-label', field); input.removeAttribute('placeholder'); }   /* PVX-N360 */
const list=root.querySelector('.dd-list');
const selItem=()=>items.find(i=>i.id===sel);
function renderTrigger(){
const d=selItem();
trigger.innerHTML = d
?`${avatar(d)}<span class="dd-name">${d.name}</span>${chev}`
:`<span class="dd-placeholder">${placeholder}</span>${chev}`;
trigger.setAttribute('aria-label', field+': '+(d?(parts(d.name)[0]||'none'):'none'));
}
const matches=()=>{const t=q.trim().toLowerCase();return t?items.filter(i=>i.name.toLowerCase().includes(t)):items;};
function renderList(){
const ms=matches();
if(!ms.length){list.innerHTML='<div class="dd-empty" role="status">No matches for “'+pvxEscQ(q.trim())+'”</div>';return;}
list.innerHTML=ms.map((i,idx)=>`
      <div class="dd-opt ${i.id===sel?'sel':''} ${idx===hl?'hl':''}${i.none?' dd-none':''}" data-id="${i.id}" role="option" id="${lid}-o${idx}" aria-selected="${i.id===sel}" aria-label="${said(i).replace(/"/g,'&quot;')}">
        ${avatar(i)}<span class="dd-name">${i.name}</span>
        <span class="dd-check"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="19 7 9.5 17 5 12.5"/></svg></span>
      </div>`).join('');
list.querySelectorAll('.dd-opt').forEach(o=>o.onclick=()=>choose(o.dataset.id));
if(hl>=0&&ms[hl]) input.setAttribute('aria-activedescendant',lid+'-o'+hl); else input.removeAttribute('aria-activedescendant');
}
function choose(id){sel=id;renderTrigger();close();if(onSelect)onSelect(id);}

function reposition(){
const r=trigger.getBoundingClientRect();
panel.style.position='fixed'; panel.style.zIndex='1000'; panel.style.right='auto';
panel.style.width=r.width+'px'; panel.style.left=r.left+'px'; panel.style.top=(r.bottom+6)+'px';
const pw=panel.offsetWidth, ph=panel.offsetHeight, vw=innerWidth, vh=innerHeight, M=8;
let left=Math.max(M, Math.min(r.left, vw-M-pw));
let top=r.bottom+6;
if(top+ph>vh-M){ const above=r.top-6-ph; top = above>=M ? above : Math.max(M, vh-M-ph); }
panel.style.left=left+'px'; panel.style.top=top+'px';
}
function open(){
if(ddOpen && ddOpen.close!==close) ddOpen.close();
document.body.appendChild(panel);
root.classList.add('open'); panel.classList.add('open'); trigger.setAttribute('aria-expanded','true');
q='';input.value='';hl=-1;if(clr) clr.hidden=true;renderList();
reposition();
window.addEventListener('scroll', reposition, true);
window.addEventListener('resize', reposition);
ddOpen={close, root, panel};
setTimeout(()=>input.focus(),50);
}
function close(){
window.removeEventListener('scroll', reposition, true);
window.removeEventListener('resize', reposition);
panel.classList.remove('open'); root.classList.remove('open'); trigger.setAttribute('aria-expanded','false');
panel.style.position=panel.style.top=panel.style.left=panel.style.right=panel.style.width=panel.style.zIndex='';
if(panel.parentNode!==root) root.appendChild(panel);
if(ddOpen && ddOpen.close===close){ ddOpen=null; if(window.__pvxDdClosed) setTimeout(window.__pvxDdClosed,0); }   /* PVX-N360 */
}
trigger.onclick=e=>{e.stopPropagation();root.classList.contains('open')?close():open();};
const clr=root.querySelector('.dd-clear'), syncClr=()=>{ if(clr) clr.hidden=!input.value; };   /* PVX-N361 */
if(clr){ clr.addEventListener('mousedown',e=>e.preventDefault()); clr.addEventListener('click',e=>{ e.stopPropagation(); input.value=''; q=''; hl=-1; syncClr(); renderList(); input.focus(); }); }
input.addEventListener('input',syncClr);
input.addEventListener('input',()=>{ if(panel.classList.contains('dd-short')){ const t=input.value.trim().toLowerCase(); input.value=''; q=''; const k=t?items.findIndex(i=>said(i).toLowerCase().split(/[^a-z0-9]+/).some(w=>w&&w.startsWith(t))):-1; if(k>=0) hl=k; renderList(); scrollHl(); return; } q=input.value;hl=-1;renderList();});
input.addEventListener('keydown',e=>{
const ms=matches();
if(e.key==='ArrowDown'){e.preventDefault();hl=Math.min(ms.length-1,hl+1);renderList();scrollHl();}
else if(e.key==='ArrowUp'){e.preventDefault();hl=Math.max(0,hl-1);renderList();scrollHl();}
else if(e.key==='PageDown'){e.preventDefault();hl=Math.min(ms.length-1,(hl<0?0:hl)+6);renderList();scrollHl();}
else if(e.key==='PageUp'){e.preventDefault();hl=Math.max(0,(hl<0?0:hl)-6);renderList();scrollHl();}
else if(e.key==='Home'){e.preventDefault();hl=0;renderList();scrollHl();}
else if(e.key==='End'){e.preventDefault();hl=ms.length-1;renderList();scrollHl();}
else if(e.key==='Enter'){e.preventDefault();if(ms[hl])choose(ms[hl].id);else if(ms.length===1)choose(ms[0].id);}
else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();try{trigger.focus({preventScroll:true});}catch(x){}}   /* PVX-N361 */
else if(e.key==='Tab'){e.preventDefault();}
});

list.addEventListener('wheel',e=>{ e.stopPropagation(); },{passive:true});
list.addEventListener('touchmove',e=>{ e.stopPropagation(); },{passive:true});
function scrollHl(){const el=list.querySelector('.dd-opt.hl');if(el)el.scrollIntoView({block:'nearest'});}
renderTrigger();
return root;
}

document.addEventListener('click',e=>{
if(ddOpen && !ddOpen.root.contains(e.target) && !ddOpen.panel.contains(e.target)) ddOpen.close();
});
