/* Yakuri in the Pravix family — behaviour for the Pravix layer (Oct 23 2026).
   Runs after Yakuri's own scripts. It only changes presentation: theme sync, the head's height, and SF-style line icons
   in place of text characters. No clinical text, state or action is touched. */
'use strict';
(function(){
  const root=document.documentElement,body=document.body;
  /* The shared light/dark choice (pvx-theme.js sets body.dark). Yakuri's older rules read html[data-theme]. */
  function theme(){root.dataset.theme=body.classList.contains('dark')?'dark':'light';const m=document.querySelector('meta[name=theme-color]');if(m)m.content=body.classList.contains('dark')?'#0A1222':'#F2F4F8';}
  theme();new MutationObserver(theme).observe(body,{attributes:true,attributeFilter:['class']});

  /* W9 · one date format in the interface: an ISO date reads "Oct 17, 2026"; a timestamp adds a 12-hour time (Brand §10) */
  window.yakuriDate=function(v){if(typeof v!=='string')return v;const m=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if(m)return new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});
    if(/^\d{4}-\d{2}-\d{2}T/.test(v)){const d=new Date(v);if(!isNaN(d))return d.toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});}
    return v;};

  /* Sticky parts sit under the shared head: keep its height in --pvx-head. */
  const head=document.getElementById('pvxHead');
  function measure(){if(head)root.style.setProperty('--pvx-head',Math.round(head.getBoundingClientRect().height)+'px');const rail=document.querySelector('.yakuri-rail');if(rail&&matchMedia('(max-width:760px)').matches)root.style.setProperty('--y-rail-h',Math.round(rail.getBoundingClientRect().height)+'px');}
  measure();if(window.ResizeObserver&&head){const ro=new ResizeObserver(measure);ro.observe(head);const rail=document.querySelector('.yakuri-rail');if(rail)ro.observe(rail);}addEventListener('resize',measure);

  /* SF-style line icons on the 24-pt grid (Brand Identity §7). Decorative: the label beside each is what's read. */
  const P={
    discover:'<circle cx="6.5" cy="15.5" r="3.5"/><circle cx="17.5" cy="15.5" r="3.5"/><path d="M10 15.5h4"/><path d="M3 15.5V10l2.2-4.5h2.6l1.6 4.8"/><path d="M21 15.5V10l-2.2-4.5h-2.6l-1.6 4.8"/>',
    library:'<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2.5H20v19H6.5A2.5 2.5 0 014 19v-14A2.5 2.5 0 016.5 2.5z"/>',
    compare:'<path d="M4 7.5h14.5"/><path d="M15 4l3.5 3.5L15 11"/><path d="M20 16.5H5.5"/><path d="M9 13l-3.5 3.5L9 20"/>',
    split:'<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M12 4v16"/>',
    interactions:'<rect x="2.2" y="7.6" width="13" height="6.2" rx="3.1" transform="rotate(-45 8.7 10.7)"/><path d="M6.4 8.4l4.6 4.6"/><circle cx="16.6" cy="16.6" r="4.4"/><path d="M13.5 19.7l6.2-6.2"/>',
    calculators:'<rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><path d="M8 6.5h8"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/>',
    saved:'<path d="M12 3.4l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 16.92l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86z"/>',
    recent:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    collections:'<path d="M3.5 7.5A2 2 0 015.5 5.5h4l2 2.5h7a2 2 0 012 2v7.5a2 2 0 01-2 2h-13a2 2 0 01-2-2z"/>',
    workspace:'<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
    research:'<path d="M9 3.5h6"/><path d="M10 3.5v5.2L5.2 17.4A2 2 0 007 20.5h10a2 2 0 001.8-3.1L14 8.7V3.5"/><path d="M7.5 14h9"/>',
    tools:'<path d="M14.7 6.3a4 4 0 00-5.4 5.2l-5.6 5.6a1.8 1.8 0 002.6 2.6l5.6-5.6a4 4 0 005.2-5.4l-2.5 2.5-2.4-.4-.4-2.4z"/>',
    transfer:'<path d="M12 3.5v11"/><path d="M8 7.5l4-4 4 4"/><path d="M5 13v5.5a2 2 0 002 2h10a2 2 0 002-2V13"/>',
    capture:'<path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"/><path d="M8 9.5h8M8 12h8M8 14.5h5"/>',
    review:'<path d="M9 4.5h6"/><rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M8.8 12.5l2.2 2.2 4.3-4.4"/>',
    cards:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M6.5 3.5h11"/><path d="M7 11h6M7 14.5h4"/>',
    context:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20.5 20.5"/>',
    /* the arithmetic Calculator is plus-slash-minus (plus.forwardslash.minus); the calculator shape stays with Medical calculators */
    calculator:'<path d="M7.5 4.5v6M4.5 7.5h6"/><path d="M13.5 16.5h6"/><path d="M18 5 6 19"/>',
    textsize:'<path d="M3.5 18.5 7.5 8l4 10.5"/><path d="M5 15h5"/><path d="M12.5 18.5 16.5 5.5l4 13"/><path d="M14 14.5h5"/>'
  };
  /* Optical corrections (Brand Identity §7, HIG Icons): [dx, dy, scale] on the 24-pt grid, measured from each symbol's ink
     so every rail symbol sits within 0.3 pt of centre and within ±10 % of the average size (tests/test_pravix_bii_browser.py) */
  const OPT={tools:[1.65,-1.05,1.1],interactions:[-0.1,-1.1,1],collections:[0,-0.5,1],review:[0,-0.75,1],cards:[0,0.75,1],saved:[0,0.3,1]};
  const svg=k=>{const o=OPT[k];const body=o?'<g transform="translate('+o[0]+' '+o[1]+') translate(12 12) scale('+(o[2]||1)+') translate(-12 -12)">'+P[k]+'</g>':P[k];
    return '<svg viewBox="0 0 24 24" aria-hidden="true">'+body+'</svg>';};
  const RAIL=[[/^discover/i,'discover'],[/^library/i,'library'],[/^compare/i,'compare'],[/^split/i,'split'],[/^interactions/i,'interactions'],[/^(medical )?calculators/i,'calculators'],
    [/^saved/i,'saved'],[/^recent/i,'recent'],[/^collections/i,'collections'],[/^(my workspace|organizer)/i,'workspace'],[/^research/i,'research'],[/^local tools/i,'tools'],
    [/^transfer/i,'transfer'],[/^label/i,'capture'],[/^(workspace review|library checks)/i,'review'],[/^drug cards/i,'cards'],[/^clinical context/i,'context']];
  function railIcons(){
    document.querySelectorAll('.yakuri-rail > button, .yakuri-rail > a').forEach(el=>{
      if(el.querySelector('.y-ico'))return;
      const old=el.querySelector(':scope > span:first-child'),label=(el.textContent.replace(old?old.textContent:'','')||'').trim();
      const hit=RAIL.find(([re])=>re.test(label));if(!hit)return;
      const s=document.createElement('span');s.className='y-ico';s.setAttribute('aria-hidden','true');s.innerHTML=svg(hit[1]);
      if(old&&old.children.length===0&&old.textContent.trim().length<=2)old.replaceWith(s);else el.prepend(s);
    });
  }
  function searchIcon(){const g=document.querySelector('.search>span[aria-hidden]');if(g&&!g.querySelector('svg'))g.innerHTML=svg('search');}
  function actionIcons(){
    const spot=document.getElementById('x-spotlight-open');
    if(spot&&!spot.querySelector('svg')){spot.innerHTML=svg('search')+'<span class="y-spot-label">Search drugs, brands, topics</span><kbd>⌘K</kbd>';spot.setAttribute('aria-label','Search drugs, brands, topics');spot.title='Search drugs, brands, classes and topics (⌘K)';}
    [['utility-calculator','calculator','Calculator'],['text-size','textsize','Text size']].forEach(([id,k,label])=>{const b=document.getElementById(id);if(b&&!b.querySelector('svg')){b.innerHTML='<span class="y-btn-ico">'+svg(k)+'</span><span class="y-btn-label">'+label+'</span>';if(!b.title)b.title=label;}});
  }
  /* favourites in the list show a star instead of the chevron: the glyph is drawn by CSS, the state comes from the row */
  function listMarks(){document.querySelectorAll('.drug-item .chevron, .p-drug-card header button').forEach(c=>{const fav=c.textContent.trim()==='★';if(fav)c.dataset.fav='';else delete c.dataset.fav;});}
  function backButton(){const b=document.getElementById('back');if(b&&!b.querySelector('.y-back-ico')){b.textContent=b.textContent.replace(/^\s*‹\s*/,'');const i=document.createElement('span');i.className='y-back-ico';i.setAttribute('aria-hidden','true');b.prepend(i);}}
  function all(){railIcons();searchIcon();actionIcons();listMarks();backButton();measure();}
  all();
  let q=0;const soon=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;all();});};
  ['#drug-list','#article','.yakuri-rail','#pvxSubnav'].forEach(s=>{const el=document.querySelector(s);if(el)new MutationObserver(soon).observe(el,{childList:true,subtree:true,characterData:true});});
  /* dialogs (Drug Cards and the rest) are added to <body> */
  new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeName==='DIALOG')))soon();}).observe(body,{childList:true});
  document.addEventListener('click',()=>setTimeout(soon,0),true);document.addEventListener('input',()=>setTimeout(soon,50),true);
  addEventListener('load',all);
})();

/* ═══ HIG Accessibility, Color and Layout fixes (Oct 23 2026; claude/hig-audit-yakuri-accessibility-color-layout.md) ═══
   Presentation and structure only. Every control keeps its own handler: buttons are moved, never copied.
   pravix.js loads before app.js, so this part starts once every deferred script has run (renderArticle, notify and cards exist). */
document.addEventListener('DOMContentLoaded',function(){
  const root=document.documentElement,body=document.body,$1=s=>document.querySelector(s);
  const ICON={chev:'<svg viewBox="0 0 24 24" aria-hidden="true" class="y-chev"><path d="M7 9.5l5 5 5-5"/></svg>',
    check:'<svg viewBox="0 0 24 24" aria-hidden="true" class="y-check"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    tools:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/></svg>',
    context:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/></svg>',
    share:'<svg viewBox="0 0 24 24" aria-hidden="true" class="y-share-glyph"><path d="M12 3.5v11M8 7.5l4-4 4 4M7.5 10.5H6.5a1.5 1.5 0 0 0-1.5 1.5v7a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5h-1"/></svg>'};

  /* ── Pull-down menus (Brand Identity §9.3): related actions only, ▾ chevron, aria-haspopup/expanded, arrows, Esc, focus returns ── */
  let openMenu=null;
  function closeMenu(focusBack){if(!openMenu)return;const {btn,list}=openMenu;list.hidden=true;btn.setAttribute('aria-expanded','false');openMenu=null;if(focusBack)btn.focus();}
  function items(list){return [...list.querySelectorAll('[role^=menuitem]')].filter(i=>!i.hidden&&!i.disabled);}
  function menu(label,id,entries,onOpen){
    const wrap=document.createElement('div');wrap.className='y-menu';
    const btn=document.createElement('button');btn.type='button';btn.className='y-menu-btn';btn.id='y-menu-'+id;btn.setAttribute('aria-haspopup','menu');btn.setAttribute('aria-expanded','false');btn.innerHTML='<span>'+label+'</span>'+ICON.chev;
    const list=document.createElement('div');list.className='y-menu-list';list.setAttribute('role','menu');list.id='y-menu-list-'+id;list.setAttribute('aria-label',label);list.hidden=true;btn.setAttribute('aria-controls',list.id);
    for(const e of entries){if(!e)continue;if(e==='-'){const s=document.createElement('div');s.className='y-menu-sep';s.setAttribute('role','separator');list.append(s);continue;}
      if(!e.getAttribute('role'))e.setAttribute('role','menuitem');e.tabIndex=-1;e.classList.add('y-menu-item');list.append(e);}
    btn.addEventListener('click',()=>{if(openMenu&&openMenu.btn===btn){closeMenu(false);return;}closeMenu(false);if(onOpen)onOpen();list.hidden=false;list.style.left='';list.style.right='';const r=list.getBoundingClientRect();if(r.right>innerWidth-8){list.style.left='auto';list.style.right='0';}btn.setAttribute('aria-expanded','true');openMenu={btn,list};const f=items(list)[0];if(f)f.focus();});
    btn.addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&list.hidden){e.preventDefault();btn.click();}});
    list.addEventListener('keydown',e=>{const f=items(list),i=f.indexOf(document.activeElement);
      if(e.key==='ArrowDown'){e.preventDefault();(f[i+1]||f[0]).focus();}else if(e.key==='ArrowUp'){e.preventDefault();(f[i-1]||f[f.length-1]).focus();}
      else if(e.key==='Home'){e.preventDefault();f[0]?.focus();}else if(e.key==='End'){e.preventDefault();f[f.length-1]?.focus();}
      else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu(true);}else if(e.key==='Tab'){closeMenu(false);}});
    list.addEventListener('click',e=>{if(e.target.closest('[role^=menuitem]'))setTimeout(()=>closeMenu(!document.querySelector('dialog[open]')),0);});
    wrap.append(btn,list);return wrap;}
  document.addEventListener('click',e=>{if(openMenu&&!openMenu.btn.parentElement.contains(e.target))closeMenu(false);},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openMenu&&!openMenu.list.contains(document.activeElement)){closeMenu(true);}},true);

  const byText=(scope,re)=>[...(scope||document).querySelectorAll('button')].find(b=>re.test(b.textContent.trim()));
  function proxy(text,onClick,role){const b=document.createElement('button');b.type='button';b.textContent=text;if(role)b.setAttribute('role',role);b.addEventListener('click',onClick);return b;}

  /* ── Item 5: the monograph's tools in one toolbar row (Layout: important content near the top; progressive disclosure) ── */
  function toolbar(){
    const acts=$1('#article .y-article-actions');if(!acts||acts.dataset.pvx)return;acts.dataset.pvx='1';
    const xr=$1('#article .x-reference-tools'),rt=$1('#article .r-tools'),art=$1('#article');
    const split=byText(acts,/^open split view$/i),compare=$1('#y-add-compare'),card=byText(acts,/^drug card$/i),timeline=$1('#y-timeline'),forms=$1('#x-form-open'),
      coll=byText(acts,/^add to collection$/i),saveRef=$1('#o-save-reference'),fav=$1('#favorite'),rws=$1('#r-open'),assistant=$1('#x-research-open'),organ=$1('#r-organ-open'),
      safety=$1('#r-safety-open'),focus=$1('#y-focus'),reading=$1('#y-reading'),modes=$1('#article .x-focus-modes');
    const bar=document.createElement('div');bar.className='y-toolbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Monograph tools');
    const favItem=fav&&proxy('Add to Saved',()=>fav.click());
    const savedLabel=()=>{if(favItem)favItem.textContent=fav.getAttribute('aria-pressed')==='true'?'Remove from Saved':'Add to Saved';};
    const open=menu('Open','open',[split,compare,card,timeline,forms]);
    const save=menu('Save','save',[favItem,coll,saveRef],savedLabel);
    const research=menu('Research','research',[rws,assistant,organ]);
    /* S1 · Share ▾ (HIG Collaboration and sharing; Brand §9.13a: Copy …, then Print…). Shared text is the reference card:
       name, evidence state, scope and source links. A Yakuri link opens only on this Mac, so it's offered as Copy link. */
    const pr=$1('#print');
    const cardText=()=>active&&window.YakuriCards?YakuriCards.copy(active):'';
    const copy=async(text,done)=>{try{await navigator.clipboard.writeText(text);notify(done);}catch{notify('Copy unavailable. Select the text to copy it.');}};
    const shareItem=navigator.share?proxy('Share…',async()=>{try{await navigator.share({title:active.name+' · Yakuri reference',text:cardText()});}catch(e){if(e&&e.name!=='AbortError')notify('Sharing unavailable. Use Copy reference card instead.');}}):null;
    const shareMenu=menu('Share','share',[shareItem,proxy('Copy reference card',()=>copy(cardText(),'Reference card copied with evidence state, scope and source links.')),
      proxy('Copy link',()=>copy(location.origin+'/yakuri/#drug='+encodeURIComponent(active.id),'Link copied. It opens Yakuri for anyone signed in to Pravix.')),'-',pr&&proxy('Print…',()=>pr.click())]);
    if(pr)pr.hidden=true;
    /* the toolbar's Share is the share glyph alone, as on the Mac (the name stays for VoiceOver and the tooltip), so the toolbar keeps one row */
    {const sb=shareMenu.querySelector('.y-menu-btn');sb.classList.add('y-icon-menu');sb.innerHTML='<span class="y-vh">Share</span>'+ICON.share;sb.title='Share';}
    /* View: reading mode is one choice (checkmark), Reading focus an on/off item */
    /* P12 · one text-size control: Large text left Reading mode (it duplicated Text size); a saved "large" becomes Text size 22 pt */
    const ts=$1('#text-size');
    if(reading&&reading.value==='large'){reading.value='standard';reading.dispatchEvent(new Event('change',{bubbles:true}));
      for(let i=0;i<3&&ts&&!/\b22 points/.test(ts.getAttribute('aria-label')||'');i++)ts.click();}
    if(reading)reading.querySelector('option[value=large]')?.remove();
    const modesList=[['standard','Standard'],['compact','Compact'],['contrast','High contrast']];
    const radios=reading?modesList.map(([v,l])=>{const b=proxy(l,()=>{reading.value=v;reading.dispatchEvent(new Event('change',{bubbles:true}));},'menuitemradio');b.dataset.value=v;b.insertAdjacentHTML('afterbegin',ICON.check);return b;}):[];
    const focusItem=focus&&proxy('Reading focus',()=>focus.click(),'menuitemcheckbox');if(focusItem)focusItem.insertAdjacentHTML('afterbegin',ICON.check);
    const sizeItem=ts&&proxy('Text size',()=>ts.click());if(sizeItem){sizeItem.id='y-view-text-size';sizeItem.insertAdjacentHTML('afterbegin',ICON.check.replace('class="y-check"','class="y-check" style="visibility:hidden"'));}
    const syncView=()=>{radios.forEach(r=>r.setAttribute('aria-checked',String(reading.value===r.dataset.value)));if(focusItem)focusItem.setAttribute('aria-checked',String(focus.getAttribute('aria-pressed')==='true'));
      if(sizeItem){const pt=((ts.getAttribute('aria-label')||'').match(/(\d+) points/)||[])[1]||'17';sizeItem.lastChild.textContent='Text size · '+pt+' pt';sizeItem.title='Steps the monograph text: 17, 20, 22 pt';}};
    const viewLabel=document.createElement('div');viewLabel.className='y-menu-group';viewLabel.textContent='Reading mode';viewLabel.setAttribute('role','presentation');
    const view=menu('View','view',[...radios,'-',sizeItem,focusItem],syncView);view.querySelector('[role=menu]').prepend(viewLabel);
    bar.append(open,save,research);
    if(safety){safety.classList.add('y-tool-btn');bar.append(safety);}
    bar.append(view,shareMenu);
    if(modes){modes.classList.add('y-modes');bar.append(modes);}
    acts.before(bar);
    /* one row: where the fonts run wide (another Mac's text settings, a Linux test browser) the "Clinical focus" caption gives way first;
       the group keeps its name for VoiceOver. Below 1150 pt the bar wraps by design, so the caption comes back. */
    const rows=()=>{const k=[...bar.children].filter(c=>c.offsetParent);return k.some(c=>c.offsetTop!==k[0].offsetTop);};
    const fit=()=>{bar.classList.remove('y-tight');if(!rows())return;bar.classList.add('y-tight');if(rows())bar.classList.remove('y-tight');};
    fit();if(window.ResizeObserver)new ResizeObserver(()=>requestAnimationFrame(fit)).observe(bar.parentElement||bar);
    if(reading){const lab=reading.closest('label');if(lab)lab.hidden=true;}
    if(focus)focus.hidden=true;  /* reached through View ▾ (the button stays for its handler and its state) */
    for(const box of [acts,xr,rt]){if(!box)continue;const left=[...box.querySelectorAll('button')].filter(b=>!b.hidden&&!b.closest('.y-toolbar'));if(!left.length)box.hidden=true;else{box.classList.add('y-tool-rest');}}
    art&&art.classList.add('y-has-toolbar');
  }

  /* ── Item 9: the clinical island docks into the sticky section tabs; nothing floats over content.
     The island itself stays outside #article (cards.js watches #article and rewrites the island, so moving it in would loop);
     the tab bar gets a mirror button that shows the island's words and opens it. ── */
  const island=$1('#p-island');
  function mirror(){const d=$1('#y-island-dock'),open=$1('#p-island-open');if(!d||!island||!open)return;
    const detail=(island.querySelector('.p-island-detail')?.textContent||'').trim(),name=(island.querySelector('.p-island-name')?.textContent||'').trim();
    /* the tabs already show the open view, so the bar shows species and state; the name keeps the whole line */
    const shown=detail.split(' · ').slice(0,2).join(' · ');const t=d.querySelector('.y-island-text');if(t.textContent!==shown)t.textContent=shown;
    const want=detail+' — open clinical context for '+name;if(d.getAttribute('aria-label')!==want)d.setAttribute('aria-label',want);
    if(d.title!==detail)d.title=detail;if(d.hidden!==island.hidden)d.hidden=island.hidden;}
  function dock(){const nav=$1('#article .y-section-nav');if(!island||!nav)return;body.classList.add('y-island-docked');
    if(!nav.querySelector('#y-island-dock')){const d=document.createElement('button');d.type='button';d.id='y-island-dock';d.className='y-island-dock';d.setAttribute('aria-haspopup','dialog');
      d.innerHTML='<span class="y-island-ico" aria-hidden="true">'+ICON.context+'</span><span class="y-island-text"></span>';d.addEventListener('click',()=>$1('#p-island-open')?.click());nav.append(d);}
    mirror();}
  if(island)new MutationObserver(mirror).observe(island,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});

  /* Wrap the one article render: rebuild the toolbar and the docked context after it */
  if(typeof window.renderArticle==='function'){const prior=window.renderArticle;window.renderArticle=function(){const r=prior.apply(this,arguments);toolbar();dock();heroTitle();return r;};}

  /* ── Item 4: drug names wrap only between words ── */
  function heroTitle(){const h=$1('.hero-line h2');if(h)h.classList.add('y-drug-title');}

  /* ── Item 2: at large text sizes the library column's intro steps aside so the list keeps room ── */
  function textSize(){const px=parseFloat(getComputedStyle(root).fontSize)||16;body.classList.toggle('y-large-text',px>=20);}

  /* ── Item 3: the sub-nav never cuts a view off: step by step, labels give way (the open view's last) ── */
  const sub=$1('#pvxSubnav');const STEPS=['y-fit-1','y-fit-2','y-fit-3','y-fit-4','y-fit-5'];
  function fits(){const sw=sub.querySelector('.switcher');const over=el=>el.scrollWidth>el.clientWidth+1;
    return !over(sub)&&(!sw||!over(sw))&&![...sub.querySelectorAll('.seg,.pvx-actions .tools>button,.y-spot-label')].some(b=>b.offsetParent&&over(b));}
  function fit(){if(!sub)return;sub.classList.remove(...STEPS);for(const s of STEPS){if(fits())break;sub.classList.add(s);}}

  /* ── Item 8: on iPhone every workspace tool stays reachable through one Workspace sheet ── */
  function workspaceButton(){
    const tools=$1('#y-tools');if(!tools||$1('#y-workspace-open'))return;
    const b=document.createElement('button');b.type='button';b.id='y-workspace-open';b.setAttribute('aria-haspopup','dialog');b.title='Workspace';
    b.innerHTML='<span class="y-btn-ico">'+ICON.tools+'</span><span class="y-btn-label">Workspace</span>';
    b.addEventListener('click',()=>{
      const rail=[...document.querySelectorAll('.yakuri-rail > button, .yakuri-rail > a')];
      const extra=[$1('#utility-calculator'),$1('#text-size')].filter(Boolean);
      const dialog=showYakuriDialog('Workspace','<p class="y-ws-intro">Every workspace tool, the calculator and text size.</p><div class="y-ws-list" role="list"></div>','y-ws-dialog');
      const list=dialog.querySelector('.y-ws-list');
      for(const src of [...rail,...extra]){const label=src.id==='text-size'?'Text size':src.id==='utility-calculator'?'Calculator':(src.textContent||'').trim();if(!label)continue;
        const item=document.createElement('button');item.type='button';item.setAttribute('role','listitem');item.className='y-ws-item';
        const ico=src.querySelector('.y-ico svg,.y-btn-ico svg');item.innerHTML=(ico?'<span class="y-ico">'+ico.outerHTML+'</span>':'')+'<span></span>';item.lastChild.textContent=label;
        if(src.getAttribute('aria-current')==='page')item.setAttribute('aria-current','page');
        item.addEventListener('click',()=>{dialog.close();if(src.tagName==='A')location.href=src.href;else src.click();});list.append(item);}
      list.querySelector('button')?.focus();});
    tools.append(b);}

  /* ── Item 11: messages (Brand Identity §9.7): ~4 s, longer for long text, paused while pointed at or focused; failures stay until closed ── */
  const toast=$1('#toast');
  if(toast&&typeof window.notify==='function'){
    let timer=0,remaining=0,started=0;
    const FAIL=/unavailable|no longer available|not recorded|could(?:n.t| not)|failed|can.t|blocked/i;
    const hide=()=>{toast.classList.remove('visible');toast.classList.remove('y-failure');};
    const arm=ms=>{clearTimeout(timer);remaining=ms;started=Date.now();timer=setTimeout(hide,ms);};
    const SILENT=/^(Saved to your library|Removed from saved drugs)\.?$/;   /* P15 · saving is silent (§12): the star shows the state */
    window.notify=function(text){
      if(SILENT.test(String(text).trim()))return;
      const failure=FAIL.test(String(text));clearTimeout(timer);
      toast.innerHTML='';const t=document.createElement('span');t.className='y-toast-text';t.textContent=text;toast.append(t);
      toast.setAttribute('role',failure?'alert':'status');toast.classList.toggle('y-failure',failure);
      if(failure){const x=document.createElement('button');x.type='button';x.className='y-toast-close';x.setAttribute('aria-label','Dismiss');x.addEventListener('click',hide);toast.append(x);}
      toast.classList.add('visible');if(!failure)arm(Math.min(8000,4000+Math.max(0,String(text).length-60)*50));};
    const pause=()=>{if(!toast.classList.contains('y-failure')&&toast.classList.contains('visible')){clearTimeout(timer);remaining=Math.max(800,remaining-(Date.now()-started));}};
    const resume=()=>{if(!toast.classList.contains('y-failure')&&toast.classList.contains('visible')&&!toast.matches(':hover')&&!toast.contains(document.activeElement))arm(remaining);};
    toast.addEventListener('pointerenter',pause);toast.addEventListener('pointerleave',resume);toast.addEventListener('focusin',pause);toast.addEventListener('focusout',resume);
  }

  /* ── Item 14: what Voice Control hears starts with what's on screen ── */
  function names(){const s=$1('#x-spotlight-open');if(s&&s.getAttribute('aria-label')!=='Search drugs, brands, topics'){s.setAttribute('aria-label','Search drugs, brands, topics');s.setAttribute('aria-keyshortcuts','Meta+K Control+K');}
    /* Item 7: in the iPad icon rail the names stay as tooltips */
    /* S9 · words only: the label, never the text character that used to stand in for its symbol */
    document.querySelectorAll('.yakuri-rail > button, .yakuri-rail > a').forEach(el=>{const label=[...el.childNodes].filter(n=>!(n.nodeType===1&&n.classList.contains('y-ico'))).map(n=>n.textContent).join('').replace(/^[^\p{L}\p{N}]+/u,'').trim();if(label&&el.title!==label)el.title=label;});}

  /* ── Item 17: Unverified is neutral everywhere; Held keeps its amber ── */
  function cardStates(){document.querySelectorAll('.p-evidence').forEach(p=>p.classList.toggle('held',/held/i.test(p.textContent)));}

  /* ── M3 · slow-device guard (Anesia n158): while scrolling, sample about 1 s of frames; if more than 1 in 10 take over 25 ms,
     the blur goes for good on this device (frosted solid). Yakuri keeps its own setting; it can't read the suite's from 127.0.0.1. ── */
  const BLUR_KEY='yakuri:v1:blur';let blurSetting=null;try{blurSetting=localStorage.getItem(BLUR_KEY);}catch{}
  if(blurSetting==='off')root.classList.add('y-noblur');
  else if(blurSetting!=='on'){let sampled=false;   /* 'on' skips the check (set by hand, or by tests) */const sample=()=>{if(sampled||document.hidden)return;sampled=true;removeEventListener('scroll',sample,true);
      const frames=[];let last=performance.now();const start=last;
      const tick=now=>{frames.push(now-last);last=now;if(now-start<1000){requestAnimationFrame(tick);return;}
        if(frames.length<20){sampled=false;addEventListener('scroll',sample,{passive:true,capture:true});return;}
        if(frames.filter(f=>f>25).length/frames.length>0.1){root.classList.add('y-noblur');try{localStorage.setItem(BLUR_KEY,'off');}catch{}}};
      requestAnimationFrame(tick);};
    addEventListener('scroll',sample,{passive:true,capture:true});}

  /* ── P14 · Quick view on demand: Space on a focused row (Finder), touch and hold on touch; the button shows on hover, focus and the open row ── */
  const quickOf=row=>row&&row.closest('.drug-card')?.querySelector('.x-quick-trigger');
  let spaceQuick=false;
  document.addEventListener('keydown',e=>{if(e.key!==' '||e.metaKey||e.ctrlKey||e.altKey)return;const row=e.target.closest&&e.target.closest('.drug-item');const q=quickOf(row);if(!q)return;
    e.preventDefault();e.stopPropagation();if(!e.repeat&&!spaceQuick){spaceQuick=true;q.click();}},true);
  document.addEventListener('keyup',e=>{if(e.key===' '&&spaceQuick){e.preventDefault();e.stopPropagation();spaceQuick=false;}},true);
  let hold=0,held=false,holdAt=null;
  document.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')return;const row=e.target.closest('.drug-item');const q=quickOf(row);if(!q)return;held=false;holdAt={x:e.clientX,y:e.clientY};clearTimeout(hold);hold=setTimeout(()=>{held=true;q.click();},500);},{passive:true});
  document.addEventListener('pointermove',e=>{if(holdAt&&Math.hypot(e.clientX-holdAt.x,e.clientY-holdAt.y)>10){clearTimeout(hold);holdAt=null;}},{passive:true});
  ['pointerup','pointercancel'].forEach(t=>document.addEventListener(t,()=>{clearTimeout(hold);holdAt=null;},{passive:true}));
  document.addEventListener('click',e=>{if(held&&e.target.closest('.drug-item')){e.preventDefault();e.stopPropagation();held=false;}},true);
  document.addEventListener('contextmenu',e=>{if(e.target.closest&&e.target.closest('.drug-item')&&matchMedia('(pointer:coarse)').matches)e.preventDefault();});
  function quickTitles(){document.querySelectorAll('.x-quick-trigger:not([aria-keyshortcuts])').forEach(q=>{q.setAttribute('aria-keyshortcuts','Space');if(!q.title)q.title='Quick view · Space on a selected row';});}

  /* ── B2 · brand names give way to content: the eyebrow carries the reference kind (from its chip), not the app's name ── */
  function eyebrow(){const e=$1('#article .article-hero .eyebrow'),k=$1('#article .article-hero .chips .chip.research');if(!e||!k)return;
    const kind=(k.textContent||'').trim();if(kind&&e.textContent!==kind)e.textContent=kind;if(!k.hidden)k.hidden=true;}

  /* ── I3 · symbols instead of text characters (Brand §7): a trailing ↗ becomes arrow.up.right (and VoiceOver hears
     "opens in a new tab" where it does), a trailing → becomes chevron.right; Print opens the print dialog, so it reads "Print…" ── */
  const EXT=/\s*↗\s*$/,GO=/\s*→\s*$/;
  function symbolize(scope){if(!scope||scope.nodeType!==1)return;
    const pr=scope.id==='print'?scope:scope.querySelector&&scope.querySelector('#print');if(pr&&pr.textContent.trim()!=='Print…'){pr.textContent='Print…';pr.setAttribute('aria-label','Print this reference…');}
    const w=document.createTreeWalker(scope,NodeFilter.SHOW_TEXT,{acceptNode:n=>/[↗→]\s*$/.test(n.nodeValue)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
    const hits=[];let n;while(n=w.nextNode())hits.push(n);
    for(const t of hits){const host=t.parentElement&&t.parentElement.closest('a,button');if(!host||host.closest('#pvxTopnav'))continue;
      const ext=EXT.test(t.nodeValue);t.nodeValue=t.nodeValue.replace(ext?EXT:GO,'');if(host.querySelector('.y-sym'))continue;
      const sym=document.createElement('span');sym.className='y-sym '+(ext?'y-sym-ext':'y-sym-go');sym.setAttribute('aria-hidden','true');host.append(sym);glue(sym);
      if(ext&&host.getAttribute('target')==='_blank')newTab(host);}
    /* every link that opens a new tab shows the symbol and says so, arrow or not (reference lists, sources) */
    const links=[...(scope.matches&&scope.matches('a[target=_blank]')?[scope]:[]),...scope.querySelectorAll('a[target=_blank]')];
    for(const a of links){if(a.closest('#pvxTopnav'))continue;if(!a.querySelector('.y-sym')){const sym=document.createElement('span');sym.className='y-sym y-sym-ext';sym.setAttribute('aria-hidden','true');a.append(sym);glue(sym);}newTab(a);}}
  /* S10 · the symbol never wraps away from its last word: the word and the symbol share one no-wrap span */
  function glue(sym){const host=sym.parentElement;if(!host||host.classList.contains('y-nowrap'))return;const w=document.createTreeWalker(host,NodeFilter.SHOW_TEXT);let last=null,n;
    while(n=w.nextNode()){if(n.parentElement.closest('.y-vh'))continue;if(n.compareDocumentPosition(sym)&Node.DOCUMENT_POSITION_FOLLOWING)last=n;}
    if(!last)return;last.nodeValue=last.nodeValue.replace(/\s+$/,'');const m=last.nodeValue.match(/(\S+)$/);if(!m)return;
    const word=m[1].length<last.nodeValue.length?last.splitText(last.nodeValue.length-m[1].length):last;const wrap=document.createElement('span');wrap.className='y-nowrap';word.before(wrap);wrap.append(word,sym);}
  function newTab(a){if(a.querySelector(':scope > .y-newtab'))return;const v=document.createElement('span');v.className='y-vh y-newtab';v.textContent=' (opens in a new tab)';a.append(v);}
  symbolize(body);
  new MutationObserver(ms=>{for(const m of ms)for(const a of m.addedNodes){if(a.nodeType===1)symbolize(a);else if(a.nodeType===3&&a.parentElement)symbolize(a.parentElement.closest('a,button')||a.parentElement);}}).observe(body,{childList:true,subtree:true});

  function run(){toolbar();dock();heroTitle();eyebrow();textSize();names();cardStates();workspaceButton();fit();quickTitles();}
  run();
  let q=0;const soon=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;run();});};
  ['#article','#drug-list','#pvxSubnav'].forEach(s=>{const el=$1(s);if(el)new MutationObserver(soon).observe(el,{childList:true,subtree:true});});
  new MutationObserver(ms=>{if(ms.some(m=>[...m.addedNodes].some(n=>n.nodeName==='DIALOG')))setTimeout(soon,30);}).observe(body,{childList:true});
  document.addEventListener('input',()=>setTimeout(cardStates,60),true);
  if(window.ResizeObserver&&sub)new ResizeObserver(()=>{textSize();fit();}).observe(sub);
  /* the root text size can change without the sub-nav changing size (its labels hold at 1.5×): watch a 1rem probe too */
  const remProbe=document.createElement('span');remProbe.setAttribute('aria-hidden','true');remProbe.style.cssText='position:absolute;left:-9999px;top:0;width:1rem;height:1px;visibility:hidden;pointer-events:none';body.append(remProbe);
  if(window.ResizeObserver)new ResizeObserver(()=>{textSize();fit();}).observe(remProbe);
  addEventListener('resize',()=>{textSize();fit();});addEventListener('load',run);
},{once:true});

/* ═══ HIG Layout, Motion and SF Symbols (Oct 23 2026; claude/hig-audit-yakuri-layout-motion-symbols.md) ═══ */
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const nav=()=>document.querySelector('#article .y-section-nav');
  const stickyTop=n=>parseFloat(getComputedStyle(n).top)||0;
  /* L3 · L5 · is the tab bar stuck under the head, and does it have more tabs past either edge? */
  function isStuck(n){if(!n||scrollY<=0)return false;const t=stickyTop(n),r=n.getBoundingClientRect();if(Math.abs(r.top-t)>1)return false;
    const prev=n.previousElementSibling;return !prev||prev.getBoundingClientRect().bottom<=t+1;}
  function edges(){const n=nav();if(!n)return;n.classList.toggle('y-stuck',isStuck(n));
    n.classList.toggle('y-more-start',n.scrollLeft>1);n.classList.toggle('y-more-end',n.scrollLeft+n.clientWidth<n.scrollWidth-1);}
  /* L5 · the current tab is kept in view (instantly), clear of the fades and the docked context */
  function showCurrent(){const n=nav();if(!n||n.scrollWidth<=n.clientWidth+1)return;const b=n.querySelector('[data-view][aria-pressed=true]');if(!b)return;
    const dock=n.querySelector('.y-island-dock:not([hidden])');const right=n.clientWidth-(dock?dock.offsetWidth:0)-24,left=24;
    const x=b.offsetLeft-n.scrollLeft;if(x<left)n.scrollLeft=Math.max(0,b.offsetLeft-left);else if(x+b.offsetWidth>right)n.scrollLeft=b.offsetLeft+b.offsetWidth-right;edges();}
  /* L2 · a section switch starts the new view at its top: if the tabs were stuck, the view's first line lands just under them */
  document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.y-section-nav [data-view]');if(!b)return;const was=isStuck(b.closest('.y-section-nav'));
    setTimeout(()=>{const n=nav();if(!n)return;if(was){const next=n.nextElementSibling;if(next){const want=stickyTop(n)+n.offsetHeight;const d=next.getBoundingClientRect().top-want;
        if(Math.abs(d)>1)scrollTo({top:Math.max(0,scrollY+d),behavior:'instant'});}}
      showCurrent();},0);},true);
  let q=0;const soon=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;edges();});};
  addEventListener('scroll',soon,{passive:true,capture:true});addEventListener('resize',()=>{soon();showCurrent();});
  const art=document.getElementById('article');if(art)new MutationObserver(()=>{soon();}).observe(art,{childList:true});
  edges();showCurrent();
  /* S13 · the star bounces once when you save (never when you unsave; the animation is off with Reduce Motion) */
  document.addEventListener('click',e=>{const f=e.target.closest&&e.target.closest('#favorite');if(!f)return;
    setTimeout(()=>{const s=document.getElementById('favorite');if(!s||s.getAttribute('aria-pressed')!=='true')return;s.classList.remove('y-bounce');void s.offsetWidth;s.classList.add('y-bounce');
      setTimeout(()=>s.classList.remove('y-bounce'),400);},0);});
},{once:true});

/* ═══ HIG Typography, Writing and Charting data (Oct 23 2026; claude/hig-audit-yakuri-typography-writing-charts.md) ═══ */
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  /* W8 · a field that can't be used says what to enter, under the field, and keeps saying it until it's fixed
     (instead of the browser's passing bubble). The first such field takes focus. */
  const lower=t=>t.charAt(0).toLowerCase()+t.slice(1);
  function message(f){const v=f.validity,label=((f.labels&&f.labels[0]&&f.labels[0].textContent)||f.getAttribute('aria-label')||'value').replace(/\s+/g,' ').trim(),what=lower(label);
    const ex=/^e\.g\.\s*/.test(f.placeholder||'')?f.placeholder.replace(/^e\.g\.\s*/,''):'';
    if(v.valueMissing||v.badInput)return 'Enter the '+what+(ex?', for example '+ex:'')+'.';
    if((v.rangeUnderflow||v.rangeOverflow)&&f.dataset.yRange)return 'Enter a '+what+' from '+f.dataset.yRange+'.';
    if(v.rangeUnderflow)return parseFloat(f.min)<=0.001?'Enter a '+what+' above 0.':'Enter a '+what+' of at least '+f.min+'.';
    if(v.rangeOverflow)return 'Enter a '+what+' up to '+f.max+'.';
    if(v.stepMismatch)return 'Enter a '+what+' in steps of '+f.step+'.';
    return f.validationMessage||'Check the '+what+'.';}
  function noteFor(f){const id=(f.id||('y-f'+Math.random().toString(36).slice(2)))+'-error';if(!f.id)f.id=id.replace(/-error$/,'');let p=document.getElementById(id);
    if(!p){p=document.createElement('p');p.id=id;p.className='y-field-error';p.setAttribute('role','alert');f.after(p);
      const ids=(f.getAttribute('aria-describedby')||'').split(' ').filter(Boolean);if(!ids.includes(id))f.setAttribute('aria-describedby',[...ids,id].join(' '));}
    return p;}
  let focused=false;
  document.addEventListener('invalid',e=>{const f=e.target;if(!(f instanceof HTMLInputElement||f instanceof HTMLSelectElement)||!f.closest('form'))return;
    e.preventDefault();f.setAttribute('aria-invalid','true');noteFor(f).textContent=message(f);
    if(!focused&&!window.yakuriLeaving){focused=true;f.focus();setTimeout(()=>{focused=false;},0);}},true);
  const clear=e=>{const f=e.target;if(!f||f.getAttribute('aria-invalid')!=='true')return;if(f.checkValidity()){f.removeAttribute('aria-invalid');const p=document.getElementById(f.id+'-error');if(p)p.remove();
      const ids=(f.getAttribute('aria-describedby')||'').split(' ').filter(x=>x&&x!==f.id+'-error');if(ids.length)f.setAttribute('aria-describedby',ids.join(' '));else f.removeAttribute('aria-describedby');}
    else{const p=document.getElementById(f.id+'-error');if(p)p.textContent=message(f);}};
  document.addEventListener('input',clear,true);document.addEventListener('change',clear,true);
  document.addEventListener('reset',e=>{setTimeout(()=>e.target.querySelectorAll&&e.target.querySelectorAll('[aria-invalid=true]').forEach(f=>{f.removeAttribute('aria-invalid');document.getElementById(f.id+'-error')?.remove();}),0);},true);
},{once:true});

/* ═══ HIG Collaboration and sharing, Drag and drop, Entering data (Oct 23 2026; claude/hig-audit-yakuri-sharing-dnd-entry.md) ═══ */
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s);
  const ss={get:k=>{try{return sessionStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{sessionStorage.setItem(k,v);}catch{}}};
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
  const say=(t)=>{if(typeof notify==='function')notify(t);};

  /* ── D2 · a file dropped where nothing takes it does nothing (the browser would open it and leave Yakuri) ── */
  const hasFiles=e=>!!e.dataTransfer&&[...(e.dataTransfer.types||[])].includes('Files');
  const zoneOf=e=>{const d=e.target&&e.target.closest&&e.target.closest('dialog[open]');if(!d)return null;
    if(d.querySelector('#c-file'))return {dialog:d,input:d.querySelector('#c-file'),ok:f=>/^image\/(png|jpeg)$/.test(f.type),fits:t=>/^image\/(png|jpeg)$/.test(t),why:'Label photos must be PNG or JPEG.'};
    if(d.querySelector('#t-file'))return {dialog:d,input:d.querySelector('#t-file'),ok:f=>/\.json$/i.test(f.name)||f.type==='application/json',fits:t=>!t||/json/.test(t),why:'Backups are .json files from Download backup.'};
    return null;};
  function note(dialog,text){let p=dialog.querySelector('.y-drop-error');if(!text){if(p)p.remove();return;}
    if(!p){p=document.createElement('p');p.className='y-drop-error y-field-error';p.setAttribute('role','alert');const anchor=dialog.querySelector('#c-file,#t-file');(anchor.closest('label')||anchor).after(p);}p.textContent=text;}
  function give(z,file){if(!z.ok(file)){note(z.dialog,z.why);return;}note(z.dialog,'');const dt=new DataTransfer();dt.items.add(file);z.input.files=dt.files;z.input.dispatchEvent(new Event('change',{bubbles:true}));}
  let over=null;
  const clearOver=()=>{if(over){over.classList.remove('y-drop-ok');over=null;}};
  document.addEventListener('dragover',e=>{if(!hasFiles(e))return;e.preventDefault();const z=zoneOf(e);
    /* the sheet highlights only for a file it takes; any file may still drop there, so a wrong one is told why in place */
    if(z){e.dataTransfer.dropEffect='copy';const fits=[...(e.dataTransfer.items||[])].some(i=>i.kind==='file'&&z.fits(i.type));
      if(fits&&over!==z.dialog){clearOver();over=z.dialog;over.classList.add('y-drop-ok');}else if(!fits)clearOver();}else{e.dataTransfer.dropEffect='none';clearOver();}});
  document.addEventListener('dragleave',e=>{if(over&&!over.contains(e.relatedTarget))clearOver();});
  document.addEventListener('drop',e=>{if(!hasFiles(e))return;e.preventDefault();const z=zoneOf(e);clearOver();if(z&&e.dataTransfer.files[0])give(z,e.dataTransfer.files[0]);});
  /* ── D3 · paste a label screenshot into Label & voice ── */
  document.addEventListener('paste',e=>{const d=document.querySelector('dialog[open]');if(!d||!d.querySelector('#c-file'))return;
    const f=[...(e.clipboardData&&e.clipboardData.files||[])][0];if(!f)return;if(e.target&&e.target.closest&&e.target.closest('textarea,input[type=text],input[type=search]')&&!/^image\//.test(f.type))return;
    e.preventDefault();give(zoneOf({target:d.querySelector('#c-file')}),f);});

  /* ── D4 · drag a drug: out to other apps as its reference card, or onto Compare / Split view in the rail ── */
  const DRUG='application/x-yakuri-drug';
  const drugOf=el=>{const row=el.closest&&el.closest('.drug-item[data-drug]');if(row)return row.dataset.drug;if(el.closest&&el.closest('#article .y-drug-title')&&typeof active!=='undefined'&&active)return active.id;return null;};
  function draggables(){document.querySelectorAll('.drug-item[data-drug]:not([draggable]),#article .y-drug-title:not([draggable])').forEach(el=>{el.draggable=true;});}
  document.addEventListener('dragstart',e=>{const id=drugOf(e.target);if(!id||typeof data==='undefined')return;const d=data.drugs.find(x=>x.id===id);if(!d)return;
    e.dataTransfer.setData(DRUG,id);e.dataTransfer.setData('text/plain',window.YakuriCards?YakuriCards.copy(d):d.name);e.dataTransfer.effectAllowed='copy';document.body.classList.add('y-dragging-drug');});
  document.addEventListener('dragend',()=>{document.body.classList.remove('y-dragging-drug');document.querySelectorAll('.y-drop-target.y-drop-ok').forEach(t=>t.classList.remove('y-drop-ok'));});
  const railTarget=e=>{const b=e.target.closest&&e.target.closest('.yakuri-rail > button');if(!b)return null;const t=(b.textContent||'').trim();return t==='Compare'||t==='Split view'?b:null;};
  document.addEventListener('dragover',e=>{if(!e.dataTransfer||![...e.dataTransfer.types].includes(DRUG))return;const b=railTarget(e);
    document.querySelectorAll('.yakuri-rail .y-drop-ok').forEach(t=>{if(t!==b)t.classList.remove('y-drop-ok');});if(!b)return;e.preventDefault();e.dataTransfer.dropEffect='copy';b.classList.add('y-drop-target','y-drop-ok');});
  document.addEventListener('drop',e=>{if(!e.dataTransfer||![...e.dataTransfer.types].includes(DRUG))return;const b=railTarget(e);if(!b)return;e.preventDefault();b.classList.remove('y-drop-ok');
    const id=e.dataTransfer.getData(DRUG);if(!id)return;const t=b.textContent.trim();
    if(t==='Compare'&&typeof openCompare==='function')openCompare(id);
    else if(typeof openSplit==='function'){if(typeof splitChoices!=='undefined'&&splitChoices[1])splitChoices[1].drug=id;openSplit(id);}});  /* a drop puts the drug in pane B; pane A keeps what you were reading */

  /* ── E5 · E6 · limits in the field, checked as you leave it ── */
  const RANGE={kg:[0.01,200],lb:[0.03,440]};
  function limits(){[['#med-weight','#med-unit'],['#cpr-weight',null]].forEach(([w,u])=>{const f=$1(w);if(!f)return;
      const unit=u?($1(u)?.value||'kg'):(document.querySelector('#cpr-form input[name=weight_unit]:checked')?.value||'kg');const [lo,hi]=RANGE[unit]||RANGE.kg;
      if(f.min!==String(lo))f.min=String(lo);if(f.max!==String(hi))f.max=String(hi);f.dataset.yRange=lo+' to '+hi+' '+unit;});}
  document.addEventListener('keydown',e=>{if(e.target&&e.target.type==='number'&&/^[eE+]$/.test(e.key))e.preventDefault();},true);
  document.addEventListener('change',e=>{const f=e.target;if(!(f instanceof HTMLInputElement||f instanceof HTMLTextAreaElement)||!f.form||f.type==='radio'||f.type==='checkbox'||f.type==='file')return;
    if(f.value==='')return;window.yakuriLeaving=true;try{f.checkValidity();}finally{window.yakuriLeaving=false;}},true);  /* the invalid handler writes the message; leaving a field never moves focus */

  /* ── E7 · the main button waits until its required fields are in (still focusable; pressing it names what's missing) ── */
  function waiting(){document.querySelectorAll('form').forEach(form=>{const need=[...form.elements].filter(x=>x.required&&!x.disabled);if(!need.length)return;
      const b=form.querySelector('button[type=submit],button:not([type])');if(!b)return;const ready=need.every(x=>x.validity.valid);
      if(ready)b.removeAttribute('aria-disabled');else b.setAttribute('aria-disabled','true');});}
  document.addEventListener('input',()=>setTimeout(waiting,0),true);document.addEventListener('change',()=>setTimeout(waiting,0),true);document.addEventListener('reset',()=>setTimeout(waiting,0),true);

  /* ── E8 · use what Yakuri knows: the species chosen in Clinical context and the drug being read, for this visit; kg/lb is remembered ── */
  document.addEventListener('change',e=>{const t=e.target;if(t.id==='y-species'&&t.value)ss.set('yakuri-visit-species',t.value);
    if(t.id==='med-unit')ls.set('yakuri-weight-unit',t.value);if(t.name==='weight_unit'&&t.closest('#cpr-form'))ls.set('yakuri-weight-unit',t.value);
    if(t.id==='med-unit'||(t.name==='weight_unit'))limits();},true);
  function carry(){if(typeof active!=='undefined'&&active&&active.id)ss.set('yakuri-visit-drug',active.id);
    const sp=ss.get('yakuri-visit-species');
    if(sp){document.querySelectorAll('#medical-main form input[name=species][value="'+sp+'"]:not([data-y-carried])').forEach(r=>{r.dataset.yCarried='1';if(!r.checked){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));}
        const fs=r.closest('fieldset');if(fs&&!fs.querySelector('.y-carried')){const p=document.createElement('p');p.className='medical-help y-carried';p.textContent='Species from Clinical context.';fs.append(p);}});
      const is=$1('#interaction-species');if(is&&!is.dataset.yCarried){is.dataset.yCarried='1';if(is.value!==sp&&[...is.options].some(o=>o.value===sp)){is.value=sp;is.dispatchEvent(new Event('change',{bubbles:true}));}
        if(!$1('.y-carried'))is.insertAdjacentHTML('afterend','<p class="medical-help y-carried">Species from Clinical context.</p>');}}
    const unit=ls.get('yakuri-weight-unit');
    if(unit){const u=$1('#med-unit');if(u&&!u.dataset.yCarried){u.dataset.yCarried='1';if(u.value!==unit&&[...u.options].some(o=>o.value===unit))u.value=unit;}
      document.querySelectorAll('#cpr-form input[name=weight_unit][value="'+unit+'"]:not([data-y-carried])').forEach(r=>{r.dataset.yCarried='1';r.checked=true;});}}

  /* ── E9 · search instead of 1,000-item menus: a search field with suggestions; the select stays for the logic, hidden ── */
  let listN=0;
  function pickers(){document.querySelectorAll('select:not([data-y-picker])').forEach(sel=>{if(sel.options.length<200||sel.closest('#pvxTopnav')||sel.matches('[data-split-drug]'))return;  /* Split view already has its own Find drug field */sel.dataset.yPicker='1';
      const id='y-pick-'+(++listN),dl=document.createElement('datalist');dl.id=id+'-list';
      const opts=[...sel.options].filter(o=>o.value);dl.innerHTML=opts.map(o=>'<option value="'+o.text.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'"></option>').join('');
      const inp=document.createElement('input');inp.type='search';inp.id=id;inp.className='y-picker';inp.setAttribute('list',dl.id);inp.setAttribute('autocomplete','off');inp.placeholder='e.g. '+(opts[0]?opts[0].text:'a drug name');
      const lab=sel.closest('label');const name=lab?[...lab.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim():(sel.getAttribute('aria-label')||'Drug');
      inp.setAttribute('aria-label',name+', search');
      const show=()=>{const o=sel.options[sel.selectedIndex];inp.value=o&&o.value?o.text:'';};show();
      inp.addEventListener('change',()=>{const v=inp.value.trim().toLowerCase();const hit=opts.find(o=>o.text.toLowerCase()===v)||(v?opts.filter(o=>o.text.toLowerCase().startsWith(v)).slice(0,2):[]);
        const pick=Array.isArray(hit)?(hit.length===1?hit[0]:null):hit;let err=inp.nextElementSibling&&inp.nextElementSibling.classList.contains('y-field-error')?inp.nextElementSibling:null;
        if(!v)return;if(!pick){if(!err){err=document.createElement('p');err.className='y-field-error';err.setAttribute('role','alert');err.id=id+'-error';inp.after(err);inp.setAttribute('aria-describedby',err.id);}err.textContent='Choose a drug from the suggestions.';inp.setAttribute('aria-invalid','true');return;}
        if(err){err.remove();inp.removeAttribute('aria-describedby');}inp.removeAttribute('aria-invalid');inp.value=pick.text;if(sel.value!==pick.value){sel.value=pick.value;sel.dispatchEvent(new Event('change',{bubbles:true}));}});
      sel.addEventListener('change',show);sel.hidden=true;sel.setAttribute('aria-hidden','true');sel.tabIndex=-1;sel.before(inp,dl);});}

  function run(){draggables();limits();waiting();carry();pickers();}
  run();let q=0;const soon=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;run();});};
  new MutationObserver(soon).observe(document.body,{childList:true,subtree:true});
},{once:true});
