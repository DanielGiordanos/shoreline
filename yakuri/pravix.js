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
  const RAIL=[[/^(library|all drugs)/i,'library'],[/^compare/i,'compare'],[/^split/i,'split'],[/^interactions/i,'interactions'],[/^(medical )?calculators/i,'calculators'],
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
    if(spot&&!spot.querySelector('svg')){spot.innerHTML=svg('search')+'<span class="y-spot-label">Drugs, topics and commands</span><kbd>⌘K</kbd>';spot.setAttribute('aria-label','Search drugs, brands, topics and commands');spot.title='Search drugs, brands, classes, topics and commands (⌘K)';}
    [['utility-calculator','calculator','Calculator'],['text-size','textsize','Text size']].forEach(([id,k,label])=>{const b=document.getElementById(id);if(b&&!b.querySelector('svg')){b.innerHTML='<span class="y-btn-ico">'+svg(k)+'</span><span class="y-btn-label">'+label+'</span>';if(!b.title)b.title=label;}});
  }
  /* favourites in the list show a star instead of the chevron: the glyph is drawn by CSS, the state comes from the row */
  function listMarks(){document.querySelectorAll('.drug-item .chevron, .p-drug-card header>button').forEach(c=>{const fav=c.textContent.trim()==='★';if(fav)c.dataset.fav='';else delete c.dataset.fav;});}
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
      coll=byText(acts,/^add to collection…?$/i),saveRef=$1('#o-save-reference'),fav=$1('#favorite'),rws=$1('#r-open'),assistant=$1('#x-research-open'),organ=$1('#r-organ-open'),
      safety=$1('#r-safety-open'),focus=$1('#y-focus'),reading=$1('#y-reading'),modes=$1('#article .x-focus-modes');
    const bar=document.createElement('div');bar.className='y-toolbar';bar.setAttribute('role','toolbar');bar.setAttribute('aria-label','Monograph tools');
    const favItem=fav&&proxy('Add to Saved',()=>fav.click());
    const savedLabel=()=>{if(favItem)favItem.textContent=fav.getAttribute('aria-pressed')==='true'?'Remove from Saved':'Add to Saved';};
    /* HIG Menus (Oct 24 2026): inside Open, the menu supplies the verb */
    [[split,'Split view'],[compare,'Compare'],[forms,'Formulations']].forEach(([b,t])=>{if(b){b.textContent=t;}});
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
      proxy('Copy link',()=>copy(location.origin+'/yakuri/#drug='+encodeURIComponent(active.id),'Link copied. It opens Yakuri for anyone signed in to Pravix.')),'-',pr&&(()=>{const b=proxy('Print…',()=>pr.click());const mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'');b.textContent='';b.insertAdjacentHTML('beforeend','<span class="y-menu-label">Print…</span><kbd class="y-menu-key" aria-hidden="true">'+(mac?'⌘P':'Ctrl+P')+'</kbd>');b.setAttribute('aria-keyshortcuts',mac?'Meta+P':'Control+P');return b;})()]);   /* HIG Menus (Oct 24 2026): its shortcut beside it, as Hide sidebar has */
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
    /* HIG Menus (Oct 24 2026): Text size is three checked choices, like Reading mode; each goes straight to its size through the sub-nav's own control */
    const curPt=()=>((ts&&ts.getAttribute('aria-label')||'').match(/(\d+) points/)||[])[1]||'17';
    const dyn=!!(window.CSS&&CSS.supports&&CSS.supports('font','-apple-system-body')&&matchMedia('(pointer:coarse)').matches);   /* on iPhone and iPad the base follows Larger Text, so the steps are relative */
    const sizeRadios=ts?[['17',dyn?'Automatic':'Automatic · 17 pt'],['20',dyn?'Larger':'20 pt'],['22',dyn?'Largest':'22 pt']].map(([pt,l])=>{const b=proxy(l,()=>{for(let k=0;k<3&&curPt()!==pt;k++)ts.click();},'menuitemradio');b.dataset.pt=pt;b.id='y-view-size-'+pt;b.insertAdjacentHTML('afterbegin',ICON.check);return b;}):[];
    const syncView=()=>{radios.forEach(r=>r.setAttribute('aria-checked',String(reading.value===r.dataset.value)));if(focusItem)focusItem.setAttribute('aria-checked',String(focus.getAttribute('aria-pressed')==='true'));
      const pt=curPt();sizeRadios.forEach(r=>r.setAttribute('aria-checked',String(r.dataset.pt===pt)));};
    const viewLabel=document.createElement('div');viewLabel.className='y-menu-group';viewLabel.textContent='Reading mode';viewLabel.setAttribute('role','presentation');
    const view=menu('View','view',[...radios,'-',...sizeRadios,'-',focusItem],syncView);view.querySelector('[role=menu]').prepend(viewLabel);
    if(sizeRadios[0]){const sizeLabel=document.createElement('div');sizeLabel.className='y-menu-group';sizeLabel.textContent='Text size';sizeLabel.setAttribute('role','presentation');sizeRadios[0].before(sizeLabel);}
    bar.append(open,save,research);
    if(safety){safety.classList.add('y-tool-btn');bar.append(safety);}
    /* HIG Toolbars (Oct 24 2026): where the tools don't fit one row (iPad, iPhone), Research and View fold into More, before Share.
       More is filled from the live menus each time it opens, so its items, checks and shortcuts are always theirs. */
    research.classList.add('y-fold');view.classList.add('y-fold');open.classList.add('y-fold2');   /* on iPhone, Open folds too */
    const fillMore=()=>{const list=more.querySelector('[role=menu]');list.textContent='';syncView();
      const add=el=>list.append(el);const head=t=>{const h=document.createElement('div');h.className='y-menu-group';h.textContent=t;h.setAttribute('role','presentation');add(h);};
      const sep=()=>{const x=document.createElement('div');x.className='y-menu-sep';x.setAttribute('role','separator');add(x);};
      [...(bar.classList.contains('y-folded2')?[[open,'Open']]:[]),[research,'Research'],[view,'View']].forEach(([wrap,name],n)=>{const src=wrap.querySelector('[role=menu]');if(!src)return;if(n)sep();if(!src.firstElementChild||!src.firstElementChild.classList.contains('y-menu-group'))head(name);
        for(const it of src.children){if(it.hidden)continue;if(it.getAttribute('role')==='separator'){sep();continue;}if(it.classList.contains('y-menu-group')){head(it.textContent);continue;}
          const b=document.createElement('button');b.type='button';b.className='y-menu-item'+(it.classList.contains('y-destructive')?' y-destructive':'');b.setAttribute('role',it.getAttribute('role')||'menuitem');b.tabIndex=-1;
          b.innerHTML=it.innerHTML;b.removeAttribute('id');b.querySelectorAll('[id]').forEach(x=>x.removeAttribute('id'));
          for(const a of ['aria-checked','aria-keyshortcuts','title'])if(it.hasAttribute(a))b.setAttribute(a,it.getAttribute(a));if(it.disabled)b.disabled=true;
          b.dataset.yFrom=it.id||'';b.addEventListener('click',()=>it.click());add(b);}});};
    const more=menu('More','more',[],fillMore);more.classList.add('y-more');
    {const mb=more.querySelector('.y-menu-btn');mb.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="8" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="16" cy="12" r=".9" fill="currentColor" stroke="none"/></svg>';mb.setAttribute('aria-label','More');mb.title='More: Research, View and, on narrow screens, Open';mb.classList.add('y-icon-menu');}
    bar.append(view,more,shareMenu);bar._ySync=()=>{syncView();savedLabel();};
    if(modes){modes.classList.add('y-modes');bar.append(modes);}
    acts.before(bar);
    /* one row: where the fonts run wide (another Mac's text settings, a Linux test browser) the "Clinical focus" caption gives way first;
       the group keeps its name for VoiceOver. Below 1150 pt the bar wraps by design, so the caption comes back. */
    const rows=()=>{const k=[...bar.children].filter(c=>c.offsetParent);return k.some(c=>c.offsetTop!==k[0].offsetTop);};
    const toolsWrap=()=>{const k=[...bar.children].filter(c=>c.offsetParent&&!c.classList.contains('y-modes'));return k.some(c=>c.offsetTop!==k[0].offsetTop);};
    const fit=()=>{bar.classList.remove('y-tight','y-folded','y-folded2');if(!rows())return;bar.classList.add('y-tight');if(!rows())return;bar.classList.remove('y-tight');
      if(toolsWrap())bar.classList.add('y-folded');if(toolsWrap())bar.classList.add('y-folded2');};   /* the tools keep one row; Clinical focus may take the next */
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
      const dialog=showYakuriDialog('Workspace','<p class="y-ws-intro">Every workspace tool, the calculator and text size.</p>','y-ws-dialog');
      /* HIG Sidebars (Oct 24 2026): the sheet keeps the rail's groups and order, and leaves out what Edit sidebar hides */
      let list=null;const group=name=>{if(name){const h=document.createElement('h3');h.className='y-ws-group';h.textContent=name;dialog.append(h);}list=document.createElement('div');list.className='y-ws-list';list.setAttribute('role','list');if(name)list.setAttribute('aria-label',name);dialog.append(list);};
      if(!rail.some(x=>x.dataset.yRailGroup))group('');
      let last=null;
      for(const src of [...rail,...extra]){const label=src.id==='text-size'?'Text size':src.id==='utility-calculator'?'Calculator':(src.textContent||'').trim();if(!label||src.hidden||src.classList.contains('y-rail-off')||src.classList.contains('y-rail-tab'))continue;
        const g=src.dataset.yRailGroup||(extra.includes(src)?'tools':'');if(g!==last&&rail.some(x=>x.dataset.yRailGroup)){group(g==='reference'?'Reference':'Tools');last=g;}
        const item=document.createElement('button');item.type='button';item.setAttribute('role','listitem');item.className='y-ws-item';
        const ico=src.querySelector('.y-ico svg,.y-btn-ico svg');item.innerHTML=(ico?'<span class="y-ico">'+ico.outerHTML+'</span>':'')+'<span></span>';item.lastChild.textContent=label;
        if(src.getAttribute('aria-current')==='page')item.setAttribute('aria-current','page');
        item.addEventListener('click',()=>{dialog.close();if(src.tagName==='A')location.href=src.href;else src.click();});list.append(item);}
      dialog.querySelector('.y-ws-list button')?.focus();});
    tools.append(b);}

  /* ── Item 11: messages (Brand Identity §9.7): ~4 s, longer for long text, paused while pointed at or focused; failures stay until closed ── */
  const toast=$1('#toast');
  if(toast&&typeof window.notify==='function'){
    let timer=0,remaining=0,started=0;
    const FAIL=/unavailable|no longer available|not recorded|could(?:n.t| not)|failed|can.t|blocked|isn.t responding/i;
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
  function names(){const s=$1('#x-spotlight-open');if(s&&s.getAttribute('aria-label')!=='Search drugs, brands, topics and commands'){s.setAttribute('aria-label','Search drugs, brands, topics and commands');s.setAttribute('aria-keyshortcuts','Meta+K Control+K');}
    /* Item 7: in the iPad icon rail the names stay as tooltips */
    /* S9 · words only: the label, never the text character that used to stand in for its symbol */
    document.querySelectorAll('.yakuri-rail > button, .yakuri-rail > a').forEach(el=>{const label=[...el.childNodes].filter(n=>!(n.nodeType===1&&n.classList.contains('y-ico'))).map(n=>n.textContent).join('').replace(/^[^\p{L}\p{N}]+/u,'').trim();const want=label&&typeof window.yakuriTip==='function'?window.yakuriTip(label,el):label;if(want&&el.title!==want)el.title=want;});}

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
  function showCurrent(){const n=nav();if(!n||n.scrollWidth<=n.clientWidth+1)return;const b=n.querySelector('[data-view][aria-selected=true],[data-view][aria-pressed=true]');if(!b)return;
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
  const railTarget=e=>{const b=e.target.closest&&e.target.closest('.yakuri-rail > button');if(!b)return null;const t=(b.textContent||'').trim();return t==='Compare'||t==='Split view'||/^(Saved|Collections)\b/.test(t)?b:null;};   /* HIG Split views (Oct 24 2026): also where drugs are kept */
  document.addEventListener('dragover',e=>{if(!e.dataTransfer||![...e.dataTransfer.types].includes(DRUG))return;const b=railTarget(e);
    document.querySelectorAll('.yakuri-rail .y-drop-ok').forEach(t=>{if(t!==b)t.classList.remove('y-drop-ok');});if(!b)return;e.preventDefault();e.dataTransfer.dropEffect='copy';b.classList.add('y-drop-target','y-drop-ok');});
  document.addEventListener('drop',e=>{if(!e.dataTransfer||![...e.dataTransfer.types].includes(DRUG))return;const b=railTarget(e);if(!b)return;e.preventDefault();b.classList.remove('y-drop-ok');
    const id=e.dataTransfer.getData(DRUG);if(!id)return;const t=b.textContent.trim();
    if(t==='Compare'&&typeof openCompare==='function')openCompare(id);
    else if(/^Saved\b/.test(t)){if(window.yakuriDropSave)window.yakuriDropSave(id);}
    else if(/^Collections\b/.test(t)){if(typeof openCollections==='function')openCollections(id);}
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

/* ═══ HIG Feedback, Going full screen and Launching (Oct 24 2026; claude/hig-audit-yakuri-feedback-fullscreen-launching.md) ═══ */
/* F5 · a request that can’t reach Yakuri says so plainly (never the browser’s raw network error); entries stay in their fields.
   Installed at once, before any page script fetches; it only rewrites the error of a failed /api/ request. */
(function(){
  const base=window.fetch;if(typeof base!=='function'||base.yakuriPlain)return;
  const plain=function(input,init){
    const url=typeof input==='string'?input:(input&&input.url)||'';
    const api=url.startsWith('/api/')||url.startsWith(location.origin+'/api/');
    const p=base.apply(this,arguments);if(!api)return p;
    return p.then(r=>{if(url.endsWith('/api/library')&&r&&r.headers){const v=r.headers.get('X-Yakuri-Revision');if(v)window.yakuriRevision=v;}return r;},e=>{if(e&&e.name==='AbortError')throw e;
      const err=new TypeError(window.YakuriHosted?'Yakuri can’t reach the library. Check your connection; your entries are kept. Try again.':'Yakuri on this Mac isn’t responding. Your entries are kept. Try again.');
      err.yakuriOffline=true;throw err;});};
  plain.yakuriPlain=true;window.fetch=plain;
})();

document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),body=document.body;
  const ss={get:k=>{try{return sessionStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{sessionStorage.setItem(k,v);}catch{}},del:k=>{try{sessionStorage.removeItem(k);}catch{}}};
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
  const json=(raw,fallback)=>{try{const v=JSON.parse(raw);return v&&typeof v==='object'?v:fallback;}catch{return fallback;}};

  /* ── L3 · reading state survives a relaunch: the drug's scroll position, the search, Reading focus ── */
  const PLACE='yakuri-place',place=json(ls.get(PLACE),{});   /* read before launch rewrites it */
  const savePlace=patch=>{const now=Object.assign(json(ls.get(PLACE),{}),patch);ls.set(PLACE,JSON.stringify(now));};
  if(ls.get('yakuri-reading-focus')==='1'&&$1('#drug-list'))body.classList.add('y-focus');
  new MutationObserver(()=>{if($1('#drug-list'))ls.set('yakuri-reading-focus',body.classList.contains('y-focus')?'1':'0');}).observe(body,{attributes:true,attributeFilter:['class']});
  let launched=false,st=0;
  document.addEventListener('yakuri:launched',()=>{
    const search=$1('#search');
    if(search&&typeof place.search==='string'&&place.search&&!search.value){search.value=place.search;search.dispatchEvent(new Event('input',{bubbles:true}));}
    const id=typeof active!=='undefined'&&active?active.id:null;
    const back=()=>{if(id&&place.drug===id&&place.y>0)window.scrollTo(0,Math.min(place.y,document.documentElement.scrollHeight));};
    requestAnimationFrame(()=>{back();setTimeout(()=>{back();launched=true;},120);});
  });
  if($1('#drug-list')){
    window.addEventListener('scroll',()=>{if(!launched)return;clearTimeout(st);st=setTimeout(()=>{if(typeof active!=='undefined'&&active)savePlace({drug:active.id,y:Math.round(window.scrollY)});},200);},{passive:true});
    document.addEventListener('input',e=>{if(e.target&&e.target.id==='search'&&launched)savePlace({search:e.target.value});},true);
  }

  /* ── L3 · the patient in the calculators is kept for this visit only (a reload keeps it; a new launch starts empty:
     yesterday's 20 kg dog never greets today's 4 kg cat) ── */
  const PATIENT='yakuri-visit-patient';
  const STALE=6*3600*1000;   /* a browser that restores old tabs could bring back sessionStorage: six quiet hours ends the visit too */
  const patient=()=>{const p=json(ss.get(PATIENT),{});if(p.at&&Date.now()-p.at>STALE){ss.del(PATIENT);return {};}return p;};
  const keepPatient=patch=>ss.set(PATIENT,JSON.stringify(Object.assign(patient(),patch,{at:Date.now()})));
  const unitOf=form=>{const sel=form.querySelector('#med-unit');if(sel)return sel.value;const r=form.querySelector('input[name=weight_unit]:checked');return r?r.value:'kg';};
  document.addEventListener('input',e=>{const t=e.target;if(!t||!t.matches||!t.matches('#med-weight,#cpr-weight'))return;
    if(t.value&&t.validity.valid)keepPatient({weight:t.value,unit:unitOf(t.form)});else if(!t.value)keepPatient({weight:''});},true);
  document.addEventListener('change',e=>{const t=e.target;if(!t||!t.matches)return;
    if(t.matches('#med-form input[name=species]')&&t.checked&&e.isTrusted)keepPatient({species:t.value,from:'calculator'});   /* only a choice made here, not one carried in */
    if(t.id==='y-species'&&t.value)keepPatient({species:t.value,from:'context'});   /* the latest choice wins; Clinical context's own carry-over (E8) shows it */
    if(t.matches('#med-unit,#cpr-form input[name=weight_unit]')){const w=t.form&&t.form.querySelector('#med-weight,#cpr-weight');if(w&&w.value)keepPatient({unit:unitOf(t.form)});}},true);
  document.addEventListener('reset',e=>{if(e.target&&e.target.matches&&e.target.matches('#med-form,#cpr-form')){ss.del(PATIENT);e.target.querySelectorAll('.y-restored').forEach(n=>n.remove());}},true);
  function restorePatient(){
    const p=patient();
    document.querySelectorAll('#med-form,#cpr-form').forEach(form=>{if(form.dataset.yRestored)return;form.dataset.yRestored='1';
      const w=form.querySelector('#med-weight,#cpr-weight');let did=false;
      let sp='';
      if(p.species&&p.from==='calculator'){const r=form.querySelector('input[name=species][value="'+p.species+'"]');if(r){form.querySelectorAll('input[name=species]').forEach(x=>x.dataset.yCarried='1');
        if(!r.checked){r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));}form.querySelectorAll('.y-carried').forEach(n=>n.remove());did=true;sp=p.species==='cat'?'Cat':'Dog';}}
      if(w&&!w.value&&p.weight){const sel=form.querySelector('#med-unit');
        if(p.unit){if(sel&&[...sel.options].some(o=>o.value===p.unit)){sel.value=p.unit;sel.dataset.yCarried='1';sel.dispatchEvent(new Event('change',{bubbles:true}));}
          const ur=form.querySelector('input[name=weight_unit][value="'+p.unit+'"]');if(ur){form.querySelectorAll('input[name=weight_unit]').forEach(x=>x.dataset.yCarried='1');ur.checked=true;}}
        w.value=p.weight;w.dispatchEvent(new Event('input',{bubbles:true}));did=true;}
      if(did&&w){const note=document.createElement('p');note.className='medical-help y-restored';
        const what=[sp,w.value?w.value+' '+(p.unit||'kg'):''].filter(Boolean).join(' · ');note.append('Patient from earlier in this visit: '+what+'. ');
        const clear=document.createElement('button');clear.type='button';clear.className='y-link-button';clear.textContent='Clear';
        clear.onclick=()=>{ss.del(PATIENT);note.remove();w.value='';w.dispatchEvent(new Event('input',{bubbles:true}));w.focus();};
        note.append(clear);(w.closest('.medical-field,label,div')||w).after(note);}
    });
  }

  /* ── FS · CPR drug dosages full screen: the one in-depth task in Yakuri. The system full screen where the browser offers it
     (Mac, iPad), the whole window elsewhere (iPhone). Weight, unit and Calculate stay in it; the screen stays awake;
     Exit and Escape leave, and it never leaves on its own. ── */
  const FS_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" class="y-fs-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-6.5 6.5M10 20H4v-6M4 20l6.5-6.5"/></svg>';
  const EXIT_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" class="y-fs-ico" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10h-6V4M14 10l6.5-6.5M4 14h6v6M10 14l-6.5 6.5"/></svg>';
  let lock=null;
  const fsEl=()=>document.fullscreenElement||document.webkitFullscreenElement||null;
  async function wake(){try{if(navigator.wakeLock&&document.visibilityState==='visible'&&!lock){lock=await navigator.wakeLock.request('screen');
      const s=$1('.y-cpr-on .y-awake');if(s)s.textContent='Screen stays on';lock.addEventListener('release',()=>{lock=null;const t=$1('.y-cpr-on .y-awake');if(t)t.textContent='';});}}catch{}}
  function label(b,on){b.setAttribute('aria-pressed',String(on));b.innerHTML=(on?EXIT_ICON:FS_ICON)+'<span>'+(on?'Exit full screen':'Full screen')+'</span>';b.title=on?'Return to the calculator (Esc)':'Show every CPR drug at once';}
  function enter(view){view.classList.add('y-cpr-on');body.classList.add('y-cpr-fullscreen');const b=view.querySelector('.y-cpr-fs');if(b)label(b,true);
    const req=view.requestFullscreen||view.webkitRequestFullscreen;
    if(req){try{const r=req.call(view);if(r&&r.catch)r.catch(()=>{});}catch{}}
    wake();if(b)b.focus();}
  function leave(view){if(view){view.classList.remove('y-cpr-on');delete view.dataset.yFsApi;const b=view.querySelector('.y-cpr-fs');if(b){label(b,false);b.focus();}}
    body.classList.remove('y-cpr-fullscreen');
    if(fsEl()){const x=document.exitFullscreen||document.webkitExitFullscreen;try{const r=x.call(document);if(r&&r.catch)r.catch(()=>{});}catch{}}
    if(lock){try{lock.release();}catch{}lock=null;}}
  const onFs=()=>{const v=$1('.y-cpr-on');if(v&&!fsEl()&&v.dataset.yFsApi==='1')leave(v);const w=$1('.y-cpr-on');if(w&&fsEl()===w)w.dataset.yFsApi='1';};
  document.addEventListener('fullscreenchange',onFs);document.addEventListener('webkitfullscreenchange',onFs);
  document.addEventListener('visibilitychange',()=>{if($1('.y-cpr-on')&&document.visibilityState==='visible')wake();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$1('.y-cpr-on')&&!document.querySelector('dialog[open]')){e.preventDefault();leave($1('.y-cpr-on'));}});
  function cprFull(){
    if(body.classList.contains('y-cpr-fullscreen')&&!$1('.y-cpr-on'))leave(null);   /* another calculator was chosen */
    const form=$1('#cpr-form');if(!form)return;const view=form.closest('section'),row=view&&view.querySelector('.cpr-title-row');
    if(!row||row.querySelector('.y-cpr-fs'))return;
    view.classList.add('y-cpr-view');
    const b=document.createElement('button');b.type='button';b.className='y-cpr-fs';label(b,false);b.onclick=()=>view.classList.contains('y-cpr-on')?leave(view):enter(view);
    const s=document.createElement('span');s.className='y-awake';s.setAttribute('role','status');
    const info=row.querySelector('#cpr-info');const g=document.createElement('div');g.className='y-cpr-tools';g.append(s,b);if(info)g.append(info);row.append(g);
  }
  /* the dose table keeps its table semantics when full screen lays it out as a grid */
  function tableRoles(){document.querySelectorAll('.cpr-sheet table:not([data-y-roles])').forEach(t=>{t.dataset.yRoles='1';t.setAttribute('role','table');
    t.querySelectorAll('tr').forEach(r=>r.setAttribute('role','row'));t.querySelectorAll('thead th').forEach(c=>c.setAttribute('role','columnheader'));
    t.querySelectorAll('tbody th').forEach(c=>c.setAttribute('role','rowheader'));t.querySelectorAll('td').forEach(c=>c.setAttribute('role','cell'));
    t.querySelectorAll('thead,tbody').forEach(g=>g.setAttribute('role','rowgroup'));});}

  function run(){restorePatient();cprFull();tableRoles();}
  run();let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;run();});}).observe(body,{childList:true,subtree:true});
},{once:true});

/* ═══ HIG Loading, Managing notifications and Modality (Oct 24 2026; claude/hig-audit-yakuri-loading-notifications-modality.md) ═══ */
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),body=document.body;
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},del:k=>{try{localStorage.removeItem(k);}catch{}}};
  const isLibrary=!!$1('#drug-list');
  const loaded=()=>typeof data!=='undefined'&&data&&Array.isArray(data.drugs);

  /* ── M5 · no lost text: a sheet or page with text you typed and haven't saved asks before it closes ── */
  const typed=f=>f.matches('textarea,input:not([type]),input[type=text],input[type=number],input[type=url],input[type=email]')&&!f.matches('.y-picker,[readonly],[disabled]')&&f.value.trim()!==''&&f.value!==f.defaultValue;
  const dirty=d=>!!d&&[...d.querySelectorAll('textarea,input')].some(typed);
  const settle=d=>d.querySelectorAll('textarea,input').forEach(f=>{f.defaultValue=f.value;});
  function ask(d,go){
    if(!dirty(d)){go();return;}
    if(d.querySelector('.y-discard'))return;
    const box=document.createElement('div');box.className='y-discard';box.setAttribute('role','alertdialog');box.setAttribute('aria-labelledby','y-discard-t');box.setAttribute('aria-describedby','y-discard-p');
    box.innerHTML='<p><strong id="y-discard-t">Discard your changes?</strong> <span id="y-discard-p">What you typed here hasn’t been saved.</span></p><div class="y-discard-actions"><button type="button" class="y-discard-keep">Keep editing</button><button type="button" class="y-discard-go y-destructive">Discard changes</button></div>';
    const head=d.querySelector('.y-dialog-head');if(head&&d.classList.contains('y-page'))head.append(box);else (head||d.firstChild).after(box);   /* on a page it sits in the sticky header, in view */
    const back=document.activeElement;
    const keep=()=>{box.remove();if(back&&d.contains(back))back.focus();};
    box.querySelector('.y-discard-keep').onclick=keep;
    box.querySelector('.y-discard-go').onclick=()=>{box.remove();d.querySelectorAll('textarea,input').forEach(f=>{f.defaultValue=f.value;});go();};
    box.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();keep();}});
    box.querySelector('.y-discard-keep').focus();
  }
  window.yakuriLeave=ask;

  /* ── M6 · Research and Library checks are pages, not sheets: long, in-depth work gets the window; sheets stay for short tasks ── */
  const PAGES={'Research':{key:'research',nav:'#r-research-nav'},'Library checks':{key:'checks',nav:'#v-review'}};
  const page=()=>$1('dialog.y-page[open]');
  function setCurrent(nav){document.querySelectorAll('.yakuri-rail [data-y-page-current]').forEach(b=>{b.removeAttribute('data-y-page-current');b.removeAttribute('aria-current');});
    if(nav){document.querySelectorAll('.yakuri-rail [data-y-nav]').forEach(b=>b.setAttribute('aria-current','false'));const b=$1(nav);if(b){b.setAttribute('aria-current','page');b.dataset.yPageCurrent='1';}}
    if(typeof updateRail==='function'&&!nav)updateRail();}
  function closePage(then){const d=page();if(!d){if(then)then();return;}ask(d,()=>{d.close();if(then)then();});}
  window.yakuriClosePage=closePage;
  const original=window.showYakuriDialog;
  if(isLibrary&&typeof original==='function'){
    window.showYakuriDialog=showYakuriDialog=function(title,html,className=''){
      const spec=PAGES[title];
      if(!spec){
        const d=original(title,html,className);
        /* the sheet's own ways out — ×, Escape, a click outside — ask first when something typed would be lost */
        const x=d.querySelector('.y-dialog-head button');if(x){x.onclick=null;x.addEventListener('click',()=>ask(d,()=>d.close()));}
        d.addEventListener('cancel',e=>{if(dirty(d)){e.preventDefault();ask(d,()=>d.close());}});
        d.addEventListener('click',e=>{if(e.target===d&&dirty(d)){e.stopImmediatePropagation();const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)ask(d,()=>d.close());}},true);
        d.addEventListener('submit',()=>setTimeout(()=>settle(d),0));
        return d;
      }
      const old=page();if(old){old.close();}
      const d=document.createElement('dialog');d.className='y-dialog y-page '+className;d.setAttribute('aria-labelledby','y-page-title');d.dataset.yPage=spec.key;
      const back=typeof active!=='undefined'&&active?active.name:'All drugs';
      d.innerHTML='<div class="y-dialog-head y-page-head"><button type="button" class="y-page-back" aria-label="Back to '+String(back).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))+'"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg><span></span></button><h2 id="y-page-title"></h2></div>'+html;
      d.querySelector('.y-page-back span').textContent=back;d.querySelector('#y-page-title').textContent=title;
      const ws=$1('.workspace');(ws||document.body).append(d);
      d.querySelector('.y-page-back').onclick=()=>closePage(()=>{const h=$1('#article h1');if(h){h.setAttribute('tabindex','-1');h.focus({preventScroll:true});}});
      d.addEventListener('close',()=>{d.remove();if(!page()){body.classList.remove('y-has-page');setCurrent(null);ls.del('yakuri-page');['.library','#article'].forEach(s=>{const n=$1(s);if(n)n.inert=false;});}});
      d.addEventListener('submit',()=>setTimeout(()=>settle(d),0));
      d.show();body.classList.add('y-has-page');setCurrent(spec.nav);ls.set('yakuri-page',spec.key);
      ['.library','#article'].forEach(s=>{const n=$1(s);if(n)n.inert=true;});
      window.scrollTo(0,0);const h=d.querySelector('#y-page-title');h.setAttribute('tabindex','-1');h.focus({preventScroll:true});
      return d;
    };
    /* the rail's places (Library, Saved, Recent) and opening a drug leave the page — after asking, if needed */
    document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.yakuri-rail [data-y-nav]');if(!b||!page())return;
      if(dirty(page())){e.preventDefault();e.stopImmediatePropagation();closePage(()=>b.click());}else page().close();},true);
    if(typeof window.openDrug==='function'){const od=window.openDrug;window.openDrug=openDrug=function(...a){const d=page();if(d&&!dirty(d))d.close();else if(d){closePage(()=>od.apply(this,a));return;}return od.apply(this,a);};}
    /* Local tools' two tools already live in Research; the rail keeps one way in */
    const lt=$1('#l-tools-nav');if(lt){lt.hidden=true;lt.setAttribute('aria-hidden','true');}
  }

  /* Research's local tools sit at the foot of its sidebar and open over the page (the page stays where it was) */
  if(isLibrary)new MutationObserver(()=>{const d=$1('dialog.y-page.r-dialog');if(!d)return;const nav=d.querySelector('.r-tabs');if(!nav)return;
    let side=d.querySelector(':scope>.y-page-side');if(!side){side=document.createElement('div');side.className='y-page-side';nav.before(side);side.append(nav);}   /* the same nav element: Research keeps drawing into it */
    const acts=d.querySelector(':scope>.r-actions [data-l-timeline]');if(!acts||side.querySelector('.y-page-tools'))return;
    const box=acts.parentElement;box.className='y-page-tools';box.insertAdjacentHTML('afterbegin','<span class="y-page-tools-label" aria-hidden="true">Local tools</span>');box.setAttribute('role','group');box.setAttribute('aria-label','Local tools');
    box.querySelectorAll('[data-l-timeline],[data-l-monitor]').forEach(b=>{b.onclick=null;b.addEventListener('click',e=>{e.stopImmediatePropagation();if(typeof openLocalTools==='function')openLocalTools(b.hasAttribute('data-l-timeline')?'timeline':'freshness');});});
    side.append(box);}).observe(document.body,{childList:true,subtree:true});

  /* ── L1/L2 · while the library loads: the rail says what it's waiting for and opens your choice as soon as it can ── */
  if(isLibrary&&!loaded()){
    let pending=null;
    const gated=()=>[...document.querySelectorAll('.yakuri-rail > button')].filter(b=>!b.disabled&&!b.hidden);
    gated().forEach(b=>{b.setAttribute('aria-disabled','true');b.dataset.yWaitLib='1';b.setAttribute('aria-description','Available once the library loads');});
    document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('.yakuri-rail [data-y-wait-lib]');if(!b||loaded())return;
      e.preventDefault();e.stopImmediatePropagation();pending=b;
      const l=$1('#article .loading');if(l&&!l.querySelector('.y-wait-note')){const n=document.createElement('span');n.className='y-wait-note';l.append(n);}
      const n=$1('#article .loading .y-wait-note');if(n)n.textContent=' '+(b.textContent||'').trim()+' opens as soon as it’s in.';},true);
    document.addEventListener('yakuri:launched',()=>{document.querySelectorAll('[data-y-wait-lib]').forEach(b=>{b.removeAttribute('aria-disabled');b.removeAttribute('aria-description');delete b.dataset.yWaitLib;});
      if(pending){const b=pending;pending=null;setTimeout(()=>b.click(),0);}},{once:true});
  }
  /* a page you were on comes back with the launch, like the drug you were reading */
  if(isLibrary)document.addEventListener('yakuri:launched',()=>{const k=ls.get('yakuri-page');if(!k)return;const spec=Object.values(PAGES).find(s=>s.key===k);const b=spec&&$1(spec.nav);
    if(b&&!page())setTimeout(()=>{if(!b.disabled)b.click();else ls.del('yakuri-page');},0);});

  /* ── L3 · a calculation that takes more than a moment says so in the result area ── */
  document.addEventListener('submit',e=>{const f=e.target;if(!f||!f.matches||!f.matches('#med-form,#cpr-form'))return;
    const btn=f.querySelector('[type=submit]');const out=f.id==='cpr-form'?$1('#cpr-result'):(f.parentElement&&f.parentElement.querySelector('.medical-result'))||$1('.medical-result');
    const started=Date.now();clearInterval(f._yCalc);
    f._yCalc=setInterval(()=>{const busy=btn&&btn.disabled&&Date.now()-started<30000;
      if(busy&&Date.now()-started>=300&&out&&!out.getAttribute('aria-busy')){out.setAttribute('aria-busy','true');const n=document.createElement('p');n.className='y-calculating';n.setAttribute('role','status');n.textContent='Calculating…';out.before(n);}
      if(!busy){clearInterval(f._yCalc);document.querySelectorAll('.y-calculating').forEach(n=>n.remove());if(out)out.removeAttribute('aria-busy');}},100);},true);

  /* ── N4 · the library changed elsewhere: a quiet notice with Reload; never reloads by itself ── */
  function changed(text){if($1('.y-changed'))return;
    const bar=document.createElement('div');bar.className='y-changed';bar.setAttribute('role','status');
    bar.innerHTML='<span></span><button type="button" class="y-changed-reload">Reload</button><button type="button" class="y-changed-later" aria-label="Not now">×</button>';
    bar.firstChild.textContent=text;document.body.append(bar);
    bar.querySelector('.y-changed-reload').onclick=()=>{const d=page()||$1('dialog[open]');if(d)ask(d,()=>location.reload());else location.reload();};
    bar.querySelector('.y-changed-later').onclick=()=>bar.remove();}
  const TEXT=isLibrary?'The library changed. Reload to see the current holds and states.':'The library changed. Reload to use the current holds and states.';
  window.addEventListener('yakuri:library-changed',()=>changed(TEXT));
  if(!window.YakuriHosted){
    let last=0;
    const check=()=>{if(document.visibilityState!=='visible'||$1('.y-changed'))return;const known=window.yakuriRevision;if(!known)return;
      if(Date.now()-last<1500)return;last=Date.now();
      fetch('/api/revision').then(r=>r.ok?r.json():null).then(j=>{if(j&&j.revision&&window.yakuriRevision&&j.revision!==window.yakuriRevision)changed(TEXT);}).catch(()=>{});};
    document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);setInterval(check,5*60*1000);
    window.yakuriCheckLibrary=check;
    /* pages without the library (calculators, interactions) learn the starting point themselves */
    if(!isLibrary)fetch('/api/revision').then(r=>r.ok?r.json():null).then(j=>{if(j&&j.revision&&!window.yakuriRevision)window.yakuriRevision=j.revision;}).catch(()=>{});
  }
},{once:true});

/* ═══ HIG Offering help, Onboarding and Printing (Oct 24 2026; claude/hig-audit-yakuri-help-onboarding-printing.md) ═══ */
/* H1 · tooltips say what a control does — verb first, short, never just its name. Icon-only (the iPad rail) keeps the name in front. */
window.YAKURI_TIPS={
  'All drugs':'Show every drug, A–Z','Library':'Show every drug, A–Z','Compare':'Put two drugs’ source text side by side',
  'Split view':'Read two sections or drugs at once','Interactions':'Check pairs of drugs for recorded interactions',
  'Medical calculators':'Body surface area, infusions, CPR doses and ideal weight','Saved':'Show the drugs you’ve starred',
  'Recent':'Show the drugs you opened last','Collections':'Group drugs into lists of your own','Organizer':'Keep boards, smart collections and saved items',
  'Research':'Take source-linked notes and inspect evidence','Local tools':'Medication timeline and source change monitor',
  'Transfer & offline':'Back up or move what you’ve saved in this browser','Label & voice':'Read a drug label or move around by voice, on this device',
  'Library checks':'Check the library’s health, sources and review queue','Drug cards':'Browse compact reference cards','Clinical context':'Set species, indication and route for this drug'};
window.yakuriTip=function(label,el){const d=window.YAKURI_TIPS[label];if(!d)return label;
  const iconOnly=el&&el.getBoundingClientRect().width>0&&el.getBoundingClientRect().width<90;return iconOnly?label+' — '+d:d;};
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),body=document.body;
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
  const isLibrary=!!$1('#drug-list');
  const mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'');const MOD=mac?'⌘':'Ctrl+';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const STATE={Draft:'Unverified',Held:'Held',Approved:'Approved'};
  const when=()=>new Date().toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});

  function titles(){
    const set=(el,t)=>{if(el&&t&&el.title!==t)el.title=t;};
    set($1('#utility-calculator'),'Open a quick unit and volume calculator');
    const ts=$1('#text-size');if(ts){const pt=((ts.getAttribute('aria-label')||'').match(/(\d+) points/)||[])[1]||'17';set(ts,pt==='22'?'Return reading text to automatic · now 22 pt':pt==='17'?'Make reading text larger · now automatic':'Make reading text larger · now '+pt+' pt');}
    set($1('#y-workspace-open'),'Every workspace tool, the calculator and text size');
    document.querySelectorAll('.y-icon-menu').forEach(b=>{if(/Share/.test(b.textContent))set(b,'Share, copy or print this reference');});
  }

  /* ── H2 · keyboard shortcuts: in Search (type "help" or "shortcuts"), or press ? ── */
  window.yakuriShortcuts=function(){
    if(document.querySelector('dialog[open]:not(.y-page)'))return;
    const rows=[['/', 'Search the library'],[MOD+'K','Search: any drug, action or setting'],[MOD+',','Yakuri Settings'],[MOD+'Z','Undo the last change'],[(mac?'⇧⌘':'Ctrl+Shift+')+'Z','Redo'],['Space','Quick view of the selected drug'],[mac?'⌃⌘S':'Ctrl+Alt+S','Hide or show the sidebar'],['Esc','Leave Reading focus, or close a sheet'],['?','Show these shortcuts'],[MOD+'P','Print what’s on screen']];
    const d=showYakuriDialog('Keyboard shortcuts','<table class="y-keys"><tbody>'+rows.map(([k,t])=>'<tr><th scope="row"><kbd>'+esc(k)+'</kbd></th><td>'+esc(t)+'</td></tr>').join('')+'</tbody></table>','y-keys-dialog');
    return d;};
  document.addEventListener('keydown',e=>{if(e.key!=='?'||e.metaKey||e.ctrlKey||e.altKey)return;const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    if(document.querySelector('dialog[open]:not(.y-page)'))return;e.preventDefault();window.yakuriShortcuts();});

  /* ── O3 · three tips, each beside what it explains; only for someone who hasn't used it; one a day; gone for good once closed or used ── */
  const TIPKEY='yakuri-tips',DAY=24*3600*1000;
  const tipState=()=>{try{const v=JSON.parse(ls.get(TIPKEY)||'{}');return v&&typeof v==='object'?v:{};}catch{return {};}};
  const saveTips=v=>ls.set(TIPKEY,JSON.stringify(v));
  const TIPS=[
    {id:'state',where:()=>$1('#article .y-state'),place:'pop',text:()=>active&&active.governance&&active.governance.state==='Held'?'Held means a safety question is open. Clinical use stays blocked until a veterinarian resolves it.':'Unverified means no veterinarian has approved this text yet. Read it as a reference, not as an order.'},
    {id:'focus',where:()=>$1('#article .x-focus-modes'),place:'pop',text:'Clinical focus shows only the overview, safety and interactions sections.'},
    {id:'search',where:()=>$1('.library .search'),place:'after',text:'Press / to search the library, or '+MOD+'K for any drug or action.'}];
  function done(id){const v=tipState();v.done=v.done||{};if(v.done[id])return;v.done[id]=Date.now();saveTips(v);document.querySelectorAll('.y-tip[data-tip="'+id+'"]').forEach(n=>n.remove());}
  window.yakuriTipDone=done;
  window.yakuriTipsReset=()=>{saveTips({});tipId=null;run();};   /* Settings › Show tips again (HIG Settings, Oct 24 2026) */
  function currentTip(){const v=tipState();v.done=v.done||{};
    if(v.today&&!v.done[v.today.id]&&Date.now()-v.today.at<DAY)return v.today.id;   /* today's tip stays until it's closed or used */
    if(v.today&&Date.now()-v.today.at<DAY)return null;                                  /* one a day */
    const next=TIPS.find(t=>!v.done[t.id]);if(!next)return null;v.today={id:next.id,at:Date.now()};saveTips(v);return next.id;}
  let tipId=null;
  function tips(){
    if(!isLibrary||typeof active==='undefined'||!active||body.classList.contains('y-has-page'))return;
    if(tipId===null)tipId=currentTip()||'';
    if(!tipId)return;if((tipState().done||{})[tipId]){tipId='';return;}const tip=TIPS.find(t=>t.id===tipId);if(!tip||document.querySelector('.y-tip[data-tip="'+tip.id+'"]'))return;
    const at=tip.where();if(!at||!at.offsetParent)return;
    const n=document.createElement('div');n.className='y-tip';n.dataset.tip=tip.id;n.setAttribute('role','note');n.setAttribute('aria-label','Tip');
    n.innerHTML='<svg class="y-tip-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.75a6.75 6.75 0 0 0-4.05 12.15c.66.5 1.05 1.27 1.05 2.1v.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V17c0-.83.39-1.6 1.05-2.1A6.75 6.75 0 0 0 12 2.75ZM9.5 20.25h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1 0-1.5Z"/></svg><p></p><button type="button" class="y-tip-close" aria-label="Close tip"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg></button>';
    n.querySelector('p').textContent=typeof tip.text==='function'?tip.text():tip.text;
    if(tip.more){const b=document.createElement('button');b.type='button';b.className='y-tip-more';b.textContent=tip.more[0];b.onclick=()=>{done(tip.id);tip.more[1]();};n.querySelector('p').after(b);}
    n.querySelector('.y-tip-close').onclick=()=>done(tip.id);
    if(tip.place==='pop'){n.classList.add('y-tip-pop');at.classList.add('y-tip-anchor');at.append(n);}else at.after(n);}   /* a popover tip keeps the page where it is */
  /* using the feature is as good as reading the tip */
  document.addEventListener('click',e=>{const t=e.target;if(!t||!t.closest)return;
    if(t.closest('#y-evidence'))done('state');if(t.closest('[data-focus-mode]'))done('focus');},true);
  document.addEventListener('keydown',e=>{if(e.key==='/'||((e.metaKey||e.ctrlKey)&&String(e.key).toLowerCase()==='k'))done('search');},true);
  document.addEventListener('focusin',e=>{if(e.target&&e.target.id==='search')done('search');});

  /* ── P4/P5/P6 · printing: a reference sheet without controls, with a line on every page saying what it is and when it was printed ── */
  function printLine(){
    let line=$1('.y-print-line');if(!line){line=document.createElement('div');line.className='y-print-line';line.setAttribute('aria-hidden','true');body.prepend(line);}
    let text='';
    if(isLibrary&&typeof active!=='undefined'&&active){text=active.name+' · '+(STATE[active.governance&&active.governance.state]||'Unverified')+' · Yakuri reference, not clinically approved';}
    else if($1('#cpr-form')){const h=$1('.cpr-sheet h2');text=(h?h.textContent:'CPR drug dosages')+' · Reference only · clinical validation pending';}
    else if($1('#interaction-main')){const names=[...document.querySelectorAll('#interaction-selected strong')].map(n=>n.textContent).join(', ');const sp=$1('#interaction-species');
      text='Interaction check'+(sp?' · '+(sp.value==='cat'?'Cat':'Dog'):'')+(names?' · '+names:'')+' · No result approves a combination';}
    else{const h=$1('main h1');text=(h?h.textContent:'Yakuri')+' · Yakuri reference, not clinically approved';}
    const t=text+' · printed '+when();if(line.textContent!==t)line.textContent=t;
    /* every page: the page's margin carries the same line (Chrome, Edge); Safari prints it once, at the top of the first page */
    let st=document.getElementById('y-print-page');if(!st){st=document.createElement('style');st.id='y-print-page';document.head.append(st);}
    const q=t.replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    const css='@media print{@page{@bottom-left{content:"'+q+'";font-size:8pt;color:#333;vertical-align:top;padding-top:3mm}@bottom-right{content:"Page " counter(page) " of " counter(pages);font-size:8pt;color:#333;vertical-align:top;padding-top:3mm}}}';
    if(st.textContent!==css)st.textContent=css;}
  window.addEventListener('beforeprint',printLine);
  if(window.matchMedia){const mq=matchMedia('print');if(mq.addEventListener)mq.addEventListener('change',e=>{if(e.matches)printLine();});}
  function printButtons(){
    const head=$1('.cpr-sheet .cpr-sheet-heading');
    if(head&&!head.querySelector('.y-print-btn')){const b=document.createElement('button');b.type='button';b.className='y-print-btn';b.textContent='Print…';b.title='Print this table on one page';
      b.onclick=()=>{printLine();window.print();};const copy=head.querySelector('#cpr-copy');const g=document.createElement('div');g.className='y-sheet-actions';(copy||head.lastChild).before(g);if(copy)g.append(copy);g.append(b);}
    const res=$1('#interaction-results');const h2=$1('#interaction-results-heading');
    if(res&&h2){const has=!!res.querySelector('article, .interaction-pair, [class*=pair]')||document.querySelectorAll('#interaction-selected [data-remove]').length>=2;
      let b=$1('#y-interaction-print');
      if(has&&!b){b=document.createElement('button');b.type='button';b.id='y-interaction-print';b.className='y-print-btn';b.textContent='Print…';b.title='Print these results with the selected drugs';b.onclick=()=>{printLine();window.print();};
        const wrap=h2.parentElement.querySelector('.interaction-view-controls');(wrap||h2).after(b);}
      else if(!has&&b)b.remove();}
  }
  function run(){titles();tips();printButtons();printLine();}
  run();let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;run();});}).observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label']});
},{once:true});

/* ═══ HIG Searching, Settings and Undo and redo (Oct 24 2026; claude/hig-audit-yakuri-searching-settings-undo.md) ═══ */
/* U1 · one undo history for the window: the last 50 changes, ⌘Z and ⇧⌘Z outside text fields. Each entry is
   {label, undo(), redo(), reveal()?, say()?}; undo and redo throw when the thing changed elsewhere, and nothing is touched then. */
(function(){
  'use strict';
  const MAX=50,done=[],undone=[];
  const reduce=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}};
  function flash(el){if(!el||!el.isConnected)return;el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'auto'});   /* no smooth scroll: the jump is the answer */
    el.classList.remove('y-undo-flash');void el.offsetWidth;el.classList.add('y-undo-flash');clearTimeout(el._yFlash);el._yFlash=setTimeout(()=>el.classList.remove('y-undo-flash'),reduce()?1200:1700);}
  function say(e,text){if(e&&typeof e.say==='function'){e.say(text);return;}
    const sheet=[...document.querySelectorAll('dialog[open]')].pop(),line=sheet&&sheet.querySelector('[role=status]:not(.y-set-done)');   /* inside a sheet, its own status line: the message bar sits under the sheet */
    if(line){line.textContent=text;return;}
    if(document.getElementById('toast')&&typeof window.notify==='function'){window.notify(text);return;}
    let live=document.getElementById('y-undo-live');if(!live){live=document.createElement('p');live.id='y-undo-live';live.className='y-undo-live';live.setAttribute('role','status');document.body.append(live);}
    live.textContent=text;live.classList.add('visible');clearTimeout(live._t);live._t=setTimeout(()=>live.classList.remove('visible'),4000);}
  function step(from,to,verb){const e=from.pop();if(!e)return false;
    try{e[verb]();}catch(err){say(e,'Couldn’t '+verb+' '+e.label+'. '+((err&&err.message)||''));return false;}   /* the entry is dropped: what it would restore no longer matches */
    to.push(e);say(e,(verb==='undo'?'Undid ':'Redid ')+e.label);
    if(typeof e.reveal==='function')requestAnimationFrame(()=>{let el=null;try{el=e.reveal();}catch{}flash(el);});
    return true;}
  window.yakuriUndo={
    record(e){if(!e||typeof e.undo!=='function'||typeof e.redo!=='function')return;done.push(e);if(done.length>MAX)done.shift();undone.length=0;},
    undo:()=>step(done,undone,'undo'),redo:()=>step(undone,done,'redo'),
    peek:()=>done.length?done[done.length-1].label:'',peekRedo:()=>undone.length?undone[undone.length-1].label:'',
    size:()=>done.length,flash};
  const mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'');
  const textField=t=>t&&(t.isContentEditable||t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&!/^(checkbox|radio|button|submit|reset|range|color|file|image)$/i.test(t.type))||t.tagName==='SELECT');
  document.addEventListener('keydown',e=>{
    const mod=mac?e.metaKey&&!e.ctrlKey:e.ctrlKey&&!e.metaKey;if(!mod||e.altKey)return;
    const k=(e.key||'').toLowerCase(),redo=(k==='z'&&e.shiftKey)||(!mac&&k==='y'&&!e.shiftKey),undo=k==='z'&&!e.shiftKey;if(!undo&&!redo)return;
    if(textField(e.target))return;   /* in text fields ⌘Z stays the system's own */
    const org=document.querySelector('.o-dialog[open]');
    if(org){const b=org.querySelector('#o-undo');if(undo&&b&&!b.disabled){e.preventDefault();b.click();}return;}   /* the Organizer keeps its own history while it's open */
    if(undo?done.length:undone.length){e.preventDefault();undo?window.yakuriUndo.undo():window.yakuriUndo.redo();}
  });
})();

document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),body=document.body,U=window.yakuriUndo;
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},del:k=>{try{localStorage.removeItem(k);}catch{}}};
  const ss={get:k=>{try{return sessionStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{sessionStorage.setItem(k,v);}catch{}},del:k=>{try{sessionStorage.removeItem(k);}catch{}}};
  const isLibrary=!!$1('#drug-list'),mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||''),MOD=mac?'⌘':'Ctrl+';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const drugName=id=>(typeof data!=='undefined'&&data&&data.drugs.find(d=>d.id===id)||{}).name||'drug';
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const changedElsewhere='It changed since. Nothing was undone.';

  /* ── U2 · star and un-star go into the history (un-starring stays silent; ⌘Z brings it back) ── */
  if(isLibrary&&typeof favorites!=='undefined'){
    let before=null;
    const star=()=>{const b=$1('#favorite');if(!b||typeof active==='undefined'||!active)return;const on=favorites.has(active.id);b.textContent=on?'★':'☆';b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',`${on?'Unsave':'Save'} ${active.name}`);};
    const setFav=(want,from)=>{if(!same([...favorites],from))throw Error(changedElsewhere);favorites.clear();want.forEach(id=>favorites.add(id));ls.set('pravix-reference-saved',JSON.stringify(want));renderList();star();};
    const row=id=>{const b=document.querySelector('#drug-list .drug-item[data-drug="'+CSS.escape(id)+'"]');return b?b.closest('.drug-card')||b:(typeof active!=='undefined'&&active&&active.id===id?$1('#favorite'):null);};
    document.addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('#favorite,[data-p-save]');before=b?[...favorites]:null;},true);
    document.addEventListener('click',()=>{if(!before)return;const was=before,now=[...favorites];before=null;if(same(was,now))return;
      const added=now.find(x=>!was.includes(x)),id=added||was.find(x=>!now.includes(x));
      U.record({label:(added?'Add to Saved · ':'Remove from Saved · ')+drugName(id),undo:()=>setFav(was,now),redo:()=>setFav(now,was),reveal:()=>row(id)});});
  }

  /* ── U3 · collections: add, remove, rename, archive, restore (and create) ── */
  if(isLibrary&&typeof saveCollection==='function'&&typeof namedCollections!=='undefined'){
    const original=saveCollection;let replaying=false;
    const put=(want,from,id)=>{if(JSON.stringify(namedCollections)!==from)throw Error(changedElsewhere);replaying=true;try{namedCollections=JSON.parse(want);ls.set('yakuri-collections-v1',want);}finally{replaying=false;}
      document.dispatchEvent(new CustomEvent('yakuri:collections-changed',{detail:{id}}));};
    const label=(a,list)=>{const c=list.find(x=>x.id===a.id),name=String((a.type==='create'?a.name:c&&c.name)||'collection').trim();
      return ({create:'New collection “'+name+'”',rename:'Rename “'+name+'” to “'+String(a.name||'').trim()+'”',archive:'Archive “'+name+'”',restore:'Restore “'+name+'”',add:'Add '+drugName(a.drug)+' to “'+name+'”',remove:'Remove '+drugName(a.drug)+' from “'+name+'”',move:'Move '+drugName(a.drug)})[a.type]||'Collection change';};
    saveCollection=function(action){const was=JSON.stringify(namedCollections),list=namedCollections;const result=original.apply(this,arguments);const now=JSON.stringify(namedCollections);
      if(!replaying&&was!==now){const id=action&&action.id,drug=action&&action.drug;
        U.record({label:label(action||{},list),undo:()=>put(was,now,id),redo:()=>put(now,was,id),
          reveal:()=>(drug&&document.querySelector('.y-collections-dialog[open] [data-remove-member="'+CSS.escape(drug)+'"]')?.closest('.y-member'))||document.querySelector('.y-collections-dialog[open] [data-collection="'+CSS.escape(id||'')+'"]')||document.querySelector('.y-collections-dialog[open] .y-archived')});}
      return result;};
  }

  /* ── S6 · Clear recent drugs: Recent, ⌘K's suggestions and the remembered search text. One Undo. ── */
  window.yakuriClearRecent=function(){
    if(!isLibrary||typeof recentDrugs==='undefined'){location.href='index.html#settings';return;}
    const search=$1('#search');
    const was={recent:[...recentDrugs],place:ls.get('yakuri-place'),visit:ss.get('yakuri-visit-drug'),text:search?search.value:''};
    if(!was.recent.length&&!was.text&&!(was.place&&/"search":"[^"]/.test(was.place))){window.notify&&window.notify('There are no recent drugs or searches to clear.');return false;}
    const apply=s=>{recentDrugs=[...s.recent];ls.set('yakuri-recent',JSON.stringify(s.recent));
      if(search&&search.value!==s.text){search.value=s.text;search.dispatchEvent(new Event('input',{bubbles:true}));}   /* the field first: typing into it rewrites the remembered place */
      if(s.place)ls.set('yakuri-place',s.place);else ls.del('yakuri-place');if(s.visit)ss.set('yakuri-visit-drug',s.visit);else ss.del('yakuri-visit-drug');
      if(typeof renderList==='function')renderList();document.dispatchEvent(new CustomEvent('yakuri:recent-changed'));};
    const empty={recent:[],place:null,visit:null,text:''};
    const now=()=>({recent:[...recentDrugs],text:search?search.value:''});
    const check=want=>{const n=now();if(!same(n.recent,want.recent)||n.text!==want.text)throw Error(changedElsewhere);};
    apply(empty);
    U.record({label:'Clear recent drugs',undo:()=>{check(empty);apply(was);},redo:()=>{check(was);apply(empty);},reveal:()=>typeof yakuriMode!=='undefined'&&yakuriMode==='recent'?$1('#drug-list'):null});
    const n=was.recent.length;
    if(window.notify){window.notify('Cleared '+(n?n+' recent drug'+(n===1?'':'s'):'recent searches')+'.');const t=$1('#toast');
      if(t){const u=document.createElement('button');u.type='button';u.className='y-undo';u.textContent='Undo';u.onclick=()=>{U.undo();};t.append(' ',u);}}
    return true;};

  /* the foot of Recent */
  function recentFoot(){if(!isLibrary||typeof yakuriMode==='undefined')return;const list=$1('#drug-list');if(!list)return;let foot=$1('#y-recent-foot');
    if(!foot){foot=document.createElement('div');foot.id='y-recent-foot';foot.className='y-list-foot';foot.innerHTML='<button type="button" class="y-clear-recent y-destructive">Clear recent drugs</button>';foot.querySelector('button').onclick=()=>window.yakuriClearRecent();list.after(foot);}
    const show=yakuriMode==='recent'&&typeof recentDrugs!=='undefined'&&recentDrugs.length>0;if(foot.hidden===show)foot.hidden=!show;}

  /* ── S4 · the page title names what's open: "Sertraline · Yakuri", "CPR · Yakuri", "Interactions · Yakuri" ── */
  function pageTitle(){let t='Yakuri';
    if(isLibrary){const page=$1('dialog.y-page[open]');const head=page&&(page.getAttribute('aria-label')||'').trim();
      if(head)t=head+' · Yakuri';
      else if(typeof active!=='undefined'&&active&&$1('#article'))t=active.name+' · Yakuri';
      else t=(typeof yakuriMode!=='undefined'&&yakuriMode==='saved'?'Saved':typeof yakuriMode!=='undefined'&&yakuriMode==='recent'?'Recent':'All drugs')+' · Yakuri';}
    else if($1('#medical-main')){const tool=$1('[data-tool][aria-current="page"]');const name=tool?(tool.getAttribute('aria-label')||(tool.innerText||tool.textContent||'').split('\n')[0]).replace(/\s+/g,' ').trim():'';t=(name||'Medical calculators')+' · Yakuri';}
    else if($1('#interaction-selected'))t='Interactions · Yakuri';
    if(document.title!==t)document.title=t;}

  /* ── S5 · ⌘F finds text in sections a view tab has hidden: hidden="until-found", and finding it opens the full monograph ── */
  const untilFound=(()=>{try{return 'onbeforematch' in document.body;}catch{return false;}})();
  function hide(){if(!untilFound)return;document.querySelectorAll('.reader > section[data-y-section][hidden]').forEach(s=>{if(s.getAttribute('hidden')!=='until-found')s.setAttribute('hidden','until-found');});}
  document.addEventListener('beforematch',e=>{const s=e.target&&e.target.closest&&e.target.closest('.reader > section[data-y-section]');if(!s)return;
    if(typeof clinicalFocus!=='undefined'&&clinicalFocus==='clinical'&&typeof applyClinicalFocus==='function')applyClinicalFocus('standard');
    if(typeof setYakuriView==='function')setYakuriView('all');hide();},true);

  /* ── S7 · Yakuri Settings: ⌘, (Ctrl+, elsewhere), Search, and the iPhone Workspace sheet. A small sheet that opens where you left it. ── */
  const SECTION='yakuri-settings-section';
  const TABS=[['general','General'],['reading','Reading'],['sidebar','Sidebar'],['history','History']];   /* Sidebar: HIG Sidebars (Oct 24 2026) */
  window.yakuriSettings=function(section){
    if(!isLibrary||typeof showYakuriDialog!=='function'){location.href='index.html#settings';return null;}
    const open=$1('.y-settings-dialog[open]');if(open){open.querySelector('[role=tab][aria-selected=true]')?.focus();return open;}
    let tab=TABS.some(t=>t[0]===section)?section:ls.get(SECTION);if(!TABS.some(t=>t[0]===tab))tab='general';
    const unit=ls.get('yakuri-weight-unit')==='lb'?'lb':'kg',step=typeof fontStep==='number'?fontStep:0;
    const dynType=!!(window.CSS&&CSS.supports&&CSS.supports('font','-apple-system-body')&&matchMedia('(pointer:coarse)').matches);   /* the same names as View ▸ Text size (Oct 24, HIG Toolbars) */
    const html='<div class="y-set-tabs" role="tablist" aria-label="Settings sections">'+TABS.map(([id,name])=>'<button type="button" role="tab" id="y-set-tab-'+id+'" aria-controls="y-set-'+id+'" data-set-tab="'+id+'">'+esc(name)+'</button>').join('')+'</div>'+
      '<section class="y-set-panel" role="tabpanel" id="y-set-general" aria-labelledby="y-set-tab-general">'+
        '<fieldset class="y-set-group"><legend>Weight</legend><div class="y-set-seg" role="radiogroup" aria-label="Weight unit">'+[['kg','Kilograms (kg)'],['lb','Pounds (lb)']].map(([v,l])=>'<label><input type="radio" name="y-set-unit" value="'+v+'"'+(v===unit?' checked':'')+'><span>'+l+'</span></label>').join('')+'</div>'+
        '<p class="y-set-note">Every calculator starts in this unit. You can still switch for one patient.</p></fieldset>'+
        '<div class="y-set-group"><h3>Tips</h3><p class="y-set-note">Closed tips come back, one a day, beside what they explain.</p><button type="button" class="y-set-btn" data-set-tips>Show tips again</button><p class="y-set-done" data-set-tips-done role="status"></p></div></section>'+
      '<section class="y-set-panel" role="tabpanel" id="y-set-reading" aria-labelledby="y-set-tab-reading">'+
        '<fieldset class="y-set-group"><legend>Reading text size</legend><div class="y-set-seg" role="radiogroup" aria-label="Reading text size">'+(dynType?['Automatic','Larger','Largest']:['Automatic · 17 pt','20 pt','22 pt']).map((l,i)=>'<label><input type="radio" name="y-set-size" value="'+i+'"'+(i===step?' checked':'')+'><span>'+l+'</span></label>').join('')+'</div>'+
        '<p class="y-set-sample">Monograph text appears at this size.</p><p class="y-set-note">The same as Text size in the toolbar.</p></fieldset></section>'+
      '<section class="y-set-panel" role="tabpanel" id="y-set-sidebar" aria-labelledby="y-set-tab-sidebar"><div data-set-rail></div></section>'+
      '<section class="y-set-panel" role="tabpanel" id="y-set-history" aria-labelledby="y-set-tab-history">'+
        '<div class="y-set-group"><h3>Recent drugs and searches</h3><p class="y-set-note" data-set-recent></p><button type="button" class="y-set-btn y-destructive" data-set-clear>Clear recent drugs and searches</button></div>'+
        '<div class="y-set-group"><h3>Backups</h3><p class="y-set-note">Back up or move your saved drugs, collections and notes as a file.</p><button type="button" class="y-set-btn" data-set-transfer>Transfer &amp; offline…</button></div></section>';
    const d=showYakuriDialog('Settings',html,'y-settings-dialog');
    const tabs=[...d.querySelectorAll('[role=tab]')];
    const show=id=>{tab=id;ls.set(SECTION,id);tabs.forEach(b=>{const on=b.dataset.setTab===id;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1;});d.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.id!=='y-set-'+id);};
    tabs.forEach(b=>b.addEventListener('click',()=>show(b.dataset.setTab)));
    d.querySelector('[role=tablist]').addEventListener('keydown',e=>{const i=tabs.indexOf(document.activeElement);if(i<0)return;let j=null;
      if(e.key==='ArrowRight')j=(i+1)%tabs.length;else if(e.key==='ArrowLeft')j=(i-1+tabs.length)%tabs.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=tabs.length-1;
      if(j===null)return;e.preventDefault();show(tabs[j].dataset.setTab);tabs[j].focus();});
    d.addEventListener('change',e=>{const t=e.target;
      if(t.name==='y-set-unit'){ls.set('yakuri-weight-unit',t.value);const u=$1('#med-unit');if(u&&[...u.options].some(o=>o.value===t.value)&&!$1('#med-weight')?.value){u.value=t.value;u.dispatchEvent(new Event('change',{bubbles:true}));}}
      if(t.name==='y-set-size'&&typeof applyFont==='function'){fontStep=Number(t.value);try{localStorage.setItem('pravix-reference-text',JSON.stringify(fontStep));}catch{}applyFont();sample();}});
    const sample=()=>{const p=d.querySelector('.y-set-sample');if(p)p.style.fontSize=[17,20,22][typeof fontStep==='number'?fontStep:0]/16+'rem';};sample();
    const recentLine=()=>{const n=typeof recentDrugs!=='undefined'?recentDrugs.length:0,p=d.querySelector('[data-set-recent]'),b=d.querySelector('[data-set-clear]');
      if(p)p.textContent=n?'Yakuri remembers the '+n+' drug'+(n===1?'':'s')+' you opened last and your last search, on this computer only. Clearing them helps on a shared computer.':'Nothing to clear. Drugs you open appear in Recent and in Search.';
      if(b)b.disabled=!n&&!($1('#search')&&$1('#search').value);};recentLine();
    const onRecent=()=>{if(!d.isConnected){document.removeEventListener('yakuri:recent-changed',onRecent);return;}recentLine();};document.addEventListener('yakuri:recent-changed',onRecent);
    d.querySelector('[data-set-clear]').onclick=()=>{window.yakuriClearRecent();recentLine();};
    d.querySelector('[data-set-tips]').onclick=()=>{if(window.yakuriTipsReset)window.yakuriTipsReset();d.querySelector('[data-set-tips-done]').textContent='Tips will show again, one a day.';};
    d.querySelector('[data-set-transfer]').onclick=()=>{d.close();if(typeof openPortable==='function')openPortable();};
    if(window.yakuriSidebarEditor)window.yakuriSidebarEditor(d.querySelector('[data-set-rail]'));
    show(tab);d.querySelector('[role=tab][aria-selected=true]').focus();
    return d;};
  document.addEventListener('keydown',e=>{const mod=mac?e.metaKey&&!e.ctrlKey:e.ctrlKey&&!e.metaKey;if(!mod||e.altKey||e.shiftKey||e.key!==',')return;
    const page=$1('dialog[open]:not(.y-page):not(.y-settings-dialog)');if(page)return;e.preventDefault();window.yakuriSettings();});
  if(isLibrary&&location.hash==='#settings')document.addEventListener('yakuri:launched',()=>{history.replaceState(history.state,'',location.pathname+location.search);window.yakuriSettings();},{once:true});
  /* HIG Dock menus (Oct 24 2026): the Dock's Search drugs and Saved drugs open what they name once the library is in, then leave the address */
  if(isLibrary&&(location.hash==='#search'||location.hash==='#saved')){const want=location.hash.slice(1);document.addEventListener('yakuri:launched',()=>{if(location.hash==='#'+want)history.replaceState(history.state,'',location.pathname+location.search);
    if(want==='saved'){if(typeof libraryMode==='function')libraryMode('saved');}else if(typeof openSpotlight==='function')openSpotlight();else if(typeof openCommands==='function')openCommands();},{once:true});}

  /* the Workspace sheet (iPhone) lists Settings last */
  document.addEventListener('click',e=>{if(!e.target.closest||!e.target.closest('#y-workspace-open'))return;
    requestAnimationFrame(()=>{const lists=document.querySelectorAll('.y-ws-dialog[open] .y-ws-list'),list=lists[lists.length-1];if(!list||list.closest('dialog').querySelector('[data-ws-settings]'))return;
      const item=document.createElement('button');item.type='button';item.setAttribute('role','listitem');item.className='y-ws-item';item.dataset.wsSettings='1';item.innerHTML='<span></span>';item.firstChild.textContent='Settings';
      const like=list.querySelector('.y-ico svg');if(like){const ico=document.createElement('span');ico.className='y-ico';const g=like.cloneNode(false);g.setAttribute('aria-hidden','true');g.innerHTML='<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>';ico.append(g);item.prepend(ico);}   /* the gear, drawn like the other symbols in the list */
      item.addEventListener('click',()=>{list.closest('dialog').close();window.yakuriSettings();});list.append(item);});});

  function run(){pageTitle();hide();recentFoot();}
  run();let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;run();});}).observe(body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','aria-current','open']});
},{once:true});

/* ═══ HIG Text views, Web views and Boxes (Oct 24 2026; claude/hig-audit-yakuri-text-web-boxes.md) ═══ */
/* W4 · Back and Forward move through what you've read: each drug and each page (Research, Library checks) is a history step.
   history.state = {y:1, idx, drug, page?, scroll?}; the furthest step is kept for this tab so Forward knows when to dim. */
(function(){
  'use strict';
  const MAXKEY='yakuri-hist-max';
  const getMax=()=>{try{return Number(sessionStorage.getItem(MAXKEY))||0;}catch{return 0;}};
  const setMax=n=>{try{sessionStorage.setItem(MAXKEY,String(n));}catch{}};
  const url=id=>'#drug='+encodeURIComponent(id);
  let restoring=false;
  let lastY=0;window.addEventListener('scroll',()=>{lastY=Math.round(window.scrollY);},{passive:true});
  window.yakuriHistoryY=()=>lastY;
  try{if('scrollRestoration' in history)history.scrollRestoration='manual';}catch{}
  const st=()=>history.state&&history.state.y?history.state:null;
  window.yakuriHistory={get restoring(){return restoring;},set restoring(v){restoring=v;},state:st,canBack:()=>!!(st()&&st().idx>0),canForward:()=>!!(st()&&st().idx<getMax())};
  /* HIG Outline views (Oct 24 2026): a step also keeps the tab you were on and which disclosures were open, so Back lands where you were.
     cur is kept as you go (a view click, a disclosure toggled), for the drug you're reading; it's read when you leave. */
  let cur=null;
  const dkeys=()=>{const art=document.getElementById('article'),seen={},open=[];if(!art)return open;
    art.querySelectorAll('details').forEach(d=>{const sm=d.querySelector('summary');const t=(sm?sm.textContent:'').replace(/\s+/g,' ').trim().slice(0,80);seen[t]=(seen[t]||0)+1;if(d.open)open.push(t+'#'+seen[t]);});return open;};
  const capture=()=>{if(typeof active==='undefined'||!active)return;cur={drug:active.id,view:typeof yakuriView==='string'?yakuriView:null,open:dkeys()};};
  const saved=id=>cur&&cur.drug===id?{view:cur.view,open:cur.open}:{};
  window.yakuriHistoryOpen=function(keys){const art=document.getElementById('article');if(!art||!Array.isArray(keys))return;const seen={};
    art.querySelectorAll('details').forEach(d=>{const sm=d.querySelector('summary');const t=(sm?sm.textContent:'').replace(/\s+/g,' ').trim().slice(0,80);seen[t]=(seen[t]||0)+1;const want=keys.includes(t+'#'+seen[t]);if(d.open!==want)d.open=want;});};
  window.yakuriHistoryCapture=capture;window.yakuriHistorySet=v=>{cur=v;};window.addEventListener('popstate',()=>clearTimeout(keepT),true);
  let keepT=0;const keep=()=>{clearTimeout(keepT);const at=st();const idx=at?at.idx:-1;keepT=setTimeout(()=>{const s=st();if(restoring||!s||s.idx!==idx||s.page||typeof active==='undefined'||!active||s.drug!==active.id)return;   /* only for the step it was asked for */
      const next={...s,scroll:lastY,...saved(s.drug)};if(next.scroll===s.scroll&&next.view===s.view&&JSON.stringify(next.open)===JSON.stringify(s.open))return;try{history.replaceState(next,'',location.href);}catch{}},500);};   /* the step you're on stays current, so Forward and Back again still find it */
  document.addEventListener('toggle',e=>{if(e.target instanceof HTMLDetailsElement&&e.target.closest('#article')&&!restoring){capture();keep();}},true);
  document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-view],[data-focus-mode]'))setTimeout(()=>{capture();keep();},0);},true);
  window.addEventListener('scroll',keep,{passive:true});
  window.yakuriHistoryDrug=function(id){const s=st();
    if(restoring&&s){history.replaceState({...s,y:1,drug:id},'',url(id));return;}   /* coming back: keep what this step remembers */
    if(!s||!s.drug||(s.drug===id&&!s.page)){history.replaceState({y:1,idx:s?s.idx:0,drug:id},'',url(id));if(!s)setMax(0);return;}
    history.replaceState({...s,scroll:lastY,...saved(s.drug)},'',location.href);   /* where you were, for when you come back (read before the new drug drew) */
    const idx=s.idx+1;history.pushState({y:1,idx,drug:id},'',url(id));setMax(idx);
    document.dispatchEvent(new CustomEvent('yakuri:history'));};
  /* ⌘[ and ⌘] work everywhere in Yakuri, also in the Dock app, which has no Safari toolbar */
  document.addEventListener('keydown',e=>{const mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'');const mod=mac?e.metaKey&&!e.ctrlKey:e.altKey&&!e.ctrlKey&&!e.metaKey;if(!mod||e.shiftKey)return;
    const t=e.target;if(t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))return;
    const k=mac?e.key:(e.key==='ArrowLeft'?'[':e.key==='ArrowRight'?']':'');if(k==='['){e.preventDefault();history.back();}else if(k===']'){e.preventDefault();history.forward();}});
})();

document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),H=window.yakuriHistory;if(!$1('#drug-list')||!H)return;
  const PAGE_NAV={research:'#r-research-nav',checks:'#v-review'};
  const openPage=()=>$1('dialog.y-page[open]');
  /* a page that opens becomes a step; closing it by its own Back is the same as Back */
  new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes){if(!(n instanceof HTMLDialogElement)||!n.classList.contains('y-page'))continue;const key=n.dataset.yPage;
      const s=H.state();if(!H.restoring&&s&&!(s.page===key)){history.replaceState({...s,scroll:window.yakuriHistoryY?window.yakuriHistoryY():Math.round(window.scrollY)},'',location.href);const idx=s.idx+1;history.pushState({y:1,idx,drug:s.drug,page:key},'',location.href);try{sessionStorage.setItem('yakuri-hist-max',String(idx));}catch{}}
      else if(H.restoring&&s)history.replaceState({...s,page:key},'',location.href);
      n.addEventListener('close',()=>{setTimeout(()=>{const t=H.state();if(!H.restoring&&t&&t.page===key)history.back();buttons();},0);});   /* if a drug was opened from the page, that push already moved on */
      buttons();}}).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('popstate',e=>{const s=e.state;if(!s||!s.y||typeof data==='undefined'||!data)return;
    H.restoring=true;
    try{const pg=openPage();
      let drew=false;
      if(s.drug&&(typeof active==='undefined'||!active||active.id!==s.drug)){if(pg)pg.close();openDrug(s.drug,document.body.classList.contains('reading-mobile'));drew=true;}
      /* O1 · the tab, then the disclosures, then the scroll: the scroll only means something in the layout it was saved in */
      if(drew&&s.view&&s.view!=='clinical'&&typeof setYakuriView==='function'&&document.body.dataset.clinicalFocus!=='clinical'&&document.querySelector('.y-section-nav [data-view="'+CSS.escape(s.view)+'"]'))setYakuriView(s.view);
      if(drew&&s.open&&window.yakuriHistoryOpen)window.yakuriHistoryOpen(s.open);
      if(drew&&window.yakuriHistorySet)window.yakuriHistorySet({drug:s.drug,view:s.view||null,open:s.open||[]});
      if(s.page&&!openPage()){const nav=$1(PAGE_NAV[s.page]);if(nav)nav.click();}
      else if(!s.page&&openPage())openPage().close();
      const y=s.page?0:(s.scroll||0),to=()=>window.scrollTo(0,Math.min(y,document.documentElement.scrollHeight));
      requestAnimationFrame(()=>{to();setTimeout(()=>{if(drew&&s.open&&window.yakuriHistoryOpen)window.yakuriHistoryOpen(s.open);to();},150);});}   /* again once late content has drawn, as the launch restore does */
    finally{setTimeout(()=>{H.restoring=false;buttons();},0);}});
  /* Back and Forward buttons before the path, on Mac and iPad; dimmed when there's nowhere to go */
  const CHEV=d=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="'+d+'"/></svg>';
  function buttons(){const top=$1('#article .article-top');if(!top)return;let nav=top.querySelector('#y-hist');
    if(!nav){nav=document.createElement('div');nav.id='y-hist';nav.className='y-hist';nav.setAttribute('role','group');nav.setAttribute('aria-label','History');
      nav.innerHTML='<button type="button" class="y-hist-back" aria-label="Back" title="Back ('+(/Mac|iPhone|iPad/.test(navigator.platform||'')?'⌘[':'Alt+Left Arrow')+')">'+CHEV('M15 5l-7 7 7 7')+'</button><button type="button" class="y-hist-fwd" aria-label="Forward" title="Forward ('+(/Mac|iPhone|iPad/.test(navigator.platform||'')?'⌘]':'Alt+Right Arrow')+')">'+CHEV('M9 5l7 7-7 7')+'</button>';
      nav.querySelector('.y-hist-back').onclick=()=>history.back();nav.querySelector('.y-hist-fwd').onclick=()=>history.forward();
      const crumb=top.querySelector('.crumb');(crumb||top.firstChild)?top.insertBefore(nav,crumb||top.firstChild):top.append(nav);}
    const b=nav.querySelector('.y-hist-back'),f=nav.querySelector('.y-hist-fwd'),cb=!H.canBack(),cf=!H.canForward();if(b.disabled!==cb)b.disabled=cb;if(f.disabled!==cf)f.disabled=cf;}
  document.addEventListener('yakuri:history',buttons);
  let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;buttons();});}).observe($1('#article'),{childList:true});
  buttons();
},{once:true});

/* ═══ HIG Collections, Column views and Disclosure controls (Oct 24 2026; claude/hig-audit-yakuri-collections-columns-disclosure.md) ═══ */
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),body=document.body;
  const reduce=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{return false;}};
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},del:k=>{try{localStorage.removeItem(k);}catch{}}};

  /* ── D6 · a closed filter says what it holds; Clear sits beside it ── */
  function filterLabel(){const d=$1('.library .y-library-filters');if(!d)return;const s=d.querySelector('summary');
    if(!d.parentElement.classList.contains('y-library-filters-row')){const row=document.createElement('div');row.className='y-library-filters-row';d.before(row);row.append(d);
      const b=document.createElement('button');b.type='button';b.className='y-filter-clear';b.textContent='Clear';b.hidden=true;b.setAttribute('aria-label','Clear filters');
      b.onclick=()=>{['#clinical-filter','#evidence-filter'].forEach(sel=>{const x=$1(sel);if(x&&x.value!=='all'){x.value='all';x.dispatchEvent(new Event('change',{bubbles:true}));}});s.focus();};row.append(b);}
    const on=['#clinical-filter','#evidence-filter'].map(sel=>$1(sel)).filter(x=>x&&x.value&&x.value!=='all').map(x=>x.options[x.selectedIndex].text.trim());
    const text='Filter library'+(on.length?' · '+on.join(' · '):'');if(s.textContent!==text)s.textContent=text;
    const clear=d.parentElement.querySelector('.y-filter-clear');if(clear.hidden===!!on.length)clear.hidden=!on.length;}
  document.addEventListener('change',e=>{if(e.target&&(e.target.id==='clinical-filter'||e.target.id==='evidence-filter'))filterLabel();},true);

  /* ── C2 · items arrive and leave visibly: after an add or remove, new rows fade in and removed ones fold away ── */
  const LISTS=[
    {scope:'.y-collections-dialog',list:'.y-collection-members',row:'.y-member',key:r=>{const b=r.querySelector('[data-remove-member]');return b&&b.dataset.removeMember;}},
    {scope:'#interaction-main',list:'#interaction-selected',row:'.interaction-row',key:r=>{const b=r.querySelector('[data-remove]');return b&&b.dataset.remove;}},
    {scope:'.workspace,.p-dialog',list:'#drug-list',row:'.drug-card',key:r=>{const b=r.querySelector('[data-drug]');return b&&b.dataset.drug;},when:()=>typeof yakuriMode!=='undefined'&&yakuriMode==='saved'},
    {scope:'.o-dialog',list:'.o-pins',row:':scope>article',key:r=>{const b=r.querySelector('[data-o-unpin]');return b&&b.dataset.oUnpin;}}];
  const rows=(list,c)=>[...list.querySelectorAll(c.row.startsWith(':scope')?c.row:':scope>'+c.row)].filter(r=>!r.classList.contains('y-row-out'));
  document.addEventListener('click',e=>{if(reduce()||!e.target||!e.target.closest)return;const btn=e.target.closest('button');if(!btn)return;
    for(const c of LISTS){if(!btn.closest(c.scope)||(c.when&&!c.when()))continue;const list=$1(c.list);if(!list)continue;
      const before=rows(list,c).map(r=>({k:c.key(r),clone:r.cloneNode(true),h:r.getBoundingClientRect().height})).filter(x=>x.k);
      requestAnimationFrame(()=>{const now=$1(c.list);if(!now)return;const after=rows(now,c),keys=new Set(after.map(c.key));const had=new Set(before.map(x=>x.k));
        if(before.length&&after.length>before.length+3)return;   /* a whole new list (another collection, another place), not an edit */
        after.forEach(r=>{if(!had.has(c.key(r))){r.classList.remove('y-row-in');void r.offsetWidth;r.classList.add('y-row-in');}});
        before.forEach((x,i)=>{if(keys.has(x.k))return;const g=x.clone;g.classList.add('y-row-out');g.setAttribute('aria-hidden','true');g.inert=true;g.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
          const next=before.slice(i+1).map(y=>after.find(r=>c.key(r)===y.k)).find(Boolean);if(next)now.insertBefore(g,next);else now.append(g);
          g.style.height=x.h+'px';void g.offsetHeight;g.style.height='0px';g.style.opacity='0';g.style.paddingTop=g.style.paddingBottom='0';g.style.marginTop=g.style.marginBottom='0';
          setTimeout(()=>g.remove(),240);});});}},true);

  /* ── C4 · the library column resizes: drag the divider, arrow keys move it, double-click resets; remembered ── */
  const ws=$1('.workspace'),lib=$1('.library');
  if(ws&&lib){const KEY='yakuri-list-width',MIN=240,MAX=480;
    const sep=document.createElement('div');sep.className='y-col-resize';sep.setAttribute('role','separator');sep.setAttribute('aria-orientation','vertical');sep.setAttribute('aria-label','Drug list width');sep.tabIndex=0;
    sep.setAttribute('aria-valuemin',MIN);sep.setAttribute('aria-valuemax',MAX);sep.title='Drag to resize the drug list · double-click to reset';body.append(sep);
    let width=Number(ls.get(KEY))||0;
    const wide=()=>innerWidth>=761&&!body.classList.contains('y-focus')&&lib.offsetParent!==null&&lib.getBoundingClientRect().width>0;
    function apply(){if(ws.style.gridTemplateColumns)ws.style.gridTemplateColumns='';const noRail=body.classList.contains('y-no-rail');   /* HIG Split views (Oct 24 2026): the sidebar button folds the rail's column away */
      const off=()=>{if(ws.hasAttribute('data-no-rail'))ws.removeAttribute('data-no-rail');};
      if((!width&&!noRail)||innerWidth<761||body.classList.contains('y-focus')){off();return;}const cols=getComputedStyle(ws).gridTemplateColumns.split(' ');if(cols.length!==3||!(parseFloat(cols[1])>0)){off();return;}   /* only the three-column layout; Reading focus and compact heights keep theirs */
      const want=(noRail?'0px':cols[0])+' '+(width?width+'px':cols[1])+' minmax(0px, 1fr)';if(ws.style.gridTemplateColumns!==want)ws.style.gridTemplateColumns=want;
      if(noRail){if(!ws.hasAttribute('data-no-rail'))ws.setAttribute('data-no-rail','');}else off();}
    function place(){const show=wide();if(sep.hidden===show)sep.hidden=!show;if(!show)return;const r=lib.getBoundingClientRect();sep.style.left=Math.round(r.right)+'px';sep.style.top=Math.round(Math.max(r.top,0))+'px';sep.style.height=Math.round(Math.min(r.bottom,innerHeight)-Math.max(r.top,0))+'px';
      const w=Math.round(r.width);sep.setAttribute('aria-valuenow',w);sep.setAttribute('aria-valuetext',w+' points');}
    const set=w=>{width=Math.max(MIN,Math.min(MAX,Math.round(w)));apply();ls.set(KEY,String(width));place();};
    const reset=()=>{width=0;ls.del(KEY);apply();place();};
    sep.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();sep.setPointerCapture(e.pointerId);sep.classList.add('dragging');body.classList.add('y-col-dragging');const left=lib.getBoundingClientRect().left;
      const move=ev=>set(ev.clientX-left),up=()=>{sep.classList.remove('dragging');body.classList.remove('y-col-dragging');sep.removeEventListener('pointermove',move);sep.removeEventListener('pointerup',up);sep.removeEventListener('pointercancel',up);};
      sep.addEventListener('pointermove',move);sep.addEventListener('pointerup',up);sep.addEventListener('pointercancel',up);});
    sep.addEventListener('dblclick',reset);
    sep.addEventListener('keydown',e=>{const cur=Math.round(lib.getBoundingClientRect().width),step=e.shiftKey?40:10;let w=null;
      if(e.key==='ArrowLeft')w=cur-step;else if(e.key==='ArrowRight')w=cur+step;else if(e.key==='Home')w=MIN;else if(e.key==='End')w=MAX;else if(e.key==='Enter'||e.key===' '){e.preventDefault();reset();return;}
      if(w===null)return;e.preventDefault();set(w);});
    apply();let q=0;const later=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;place();});};
    addEventListener('resize',()=>{apply();later();});addEventListener('scroll',later,{passive:true});new MutationObserver(()=>{apply();later();}).observe(body,{attributes:true,attributeFilter:['class']});
    if(typeof ResizeObserver==='function')new ResizeObserver(later).observe(lib);place();}

  filterLabel();
},{once:true});


/* ═══ HIG Labels, Lists and tables, Lockups (Oct 24 2026; claude/hig-audit-yakuri-labels-lists-lockups.md) ═══ */
/* L3 · reorder a personal list: drag the handle, or ↑ / ↓ / Home / End on it. commit(to) saves once, at the end. */
window.YAKURI_MOVE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 8h14M5 12h14M5 16h14"/></svg>';
window.yakuriReorder=function(handle,o){
  'use strict';
  if(!handle||handle.dataset.yReorder)return;handle.dataset.yReorder='1';
  handle.addEventListener('keydown',e=>{let to=null;if(e.key==='ArrowUp')to=o.index-1;else if(e.key==='ArrowDown')to=o.index+1;else if(e.key==='Home')to=0;else if(e.key==='End')to=o.count-1;
    if(to===null)return;e.preventDefault();if(to<0||to>=o.count||to===o.index)return;o.commit(to);});
  handle.addEventListener('pointerdown',e=>{if(e.button!==0||!o.row||!o.list)return;e.preventDefault();   /* listen on the document: moving the row in the DOM would end a pointer capture */
    const rows=()=>[...o.list.children].filter(r=>r.matches(o.rowSel)&&!r.classList.contains('y-row-out'));const start=rows().indexOf(o.row);
    o.row.classList.add('y-dragging');document.body.classList.add('y-reordering');let moved=false;
    const move=ev=>{const others=rows().filter(r=>r!==o.row);let ref=null;for(const r of others){const b=r.getBoundingClientRect();if(ev.clientY<b.top+b.height/2){ref=r;break;}}
      const all=rows();if(ref?o.row.nextElementSibling!==ref:all[all.length-1]!==o.row){o.list.insertBefore(o.row,ref||all[all.length-1].nextSibling);moved=true;}};
    const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',up);
      o.row.classList.remove('y-dragging');document.body.classList.remove('y-reordering');const end=rows().indexOf(o.row);if(moved&&end!==start&&end>=0)o.commit(end);};
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);});
};

document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  /* L2 · the list heading says how the list is ordered */
  const order=()=>{const el=document.getElementById('list-order');if(!el||typeof yakuriMode==='undefined')return;const q=typeof query==='string'&&query.trim();
    const t=q?'Best match':yakuriMode==='recent'?'Latest first':'A–Z';if(el.textContent!==t)el.textContent=t;};
  const head=document.querySelector('.list-heading');if(head){const span=[...head.children].find(x=>x.id!=='result-count');if(span&&!span.id)span.id='list-order';}
  let q=0;const list=document.getElementById('drug-list');if(list)new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;order();});}).observe(list,{childList:true});
  order();
},{once:true});

/* ═══ HIG Outline views, Split views and Tab views (Oct 24 2026; claude/hig-audit-yakuri-outline-split-tabs.md) ═══ */
/* T6 · every tab set Yakuri draws (.y-tabs, the monograph's .y-view-tabs) is one Tab stop: arrow keys, Home and End choose a tab */
document.addEventListener('keydown',function(e){
  if(e.metaKey||e.ctrlKey||e.altKey)return;const tab=e.target&&e.target.closest&&e.target.closest('[role=tab]');if(!tab)return;
  const list=tab.closest('.y-tabs[role=tablist],.y-view-tabs[role=tablist]');if(!list)return;
  const tabs=[...list.querySelectorAll('[role=tab]')].filter(t=>!t.disabled&&!t.hidden);const i=tabs.indexOf(tab);let j=null;
  if(e.key==='ArrowRight')j=(i+1)%tabs.length;else if(e.key==='ArrowLeft')j=(i-1+tabs.length)%tabs.length;else if(e.key==='Home')j=0;else if(e.key==='End')j=tabs.length-1;
  if(j===null||j===i)return;e.preventDefault();const t=tabs[j];t.click();t.focus();
});

document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),body=document.body;
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
  const mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'');
  const isLibrary=!!$1('#drug-list');if(!isLibrary)return;
  const compact=matchMedia('(max-width:760px)'),narrow=matchMedia('(min-width:761px) and (max-width:1150px) and (min-height:501px)');   /* narrow: HIG Sidebars (Oct 24 2026), the rail hides and the button shows it over the content */
  const over=()=>body.classList.contains('y-rail-over');

  /* ── S2 · the sidebar button: always on screen (Yakuri's bar stays put); hides the rail; in Reading focus brings back the rail and the list ── */
  const KEY='yakuri-sidebar',KEYS=mac?'⌃⌘S':'Ctrl+Alt+S';
  const SVG='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M9 4.5v15"/><path d="M5.5 8.5h1.5M5.5 11.5h1.5"/></svg>';
  if(ls.get(KEY)==='hidden')body.classList.add('y-no-rail');
  const focused=()=>body.classList.contains('y-focus');
  const label=()=>focused()?'Show sidebar and list':narrow.matches?(over()?'Hide sidebar':'Show sidebar'):body.classList.contains('y-no-rail')?'Show sidebar':'Hide sidebar';
  function leaveFocus(){const f=$1('#y-focus');if(f&&f.getAttribute('aria-pressed')==='true')f.click();if(focused()){body.classList.remove('y-focus');if(f)f.setAttribute('aria-pressed','false');}}
  function toggle(){if(compact.matches)return;
    if(focused()){leaveFocus();body.classList.remove('y-no-rail');ls.set(KEY,'shown');}
    else if(narrow.matches){if(window.yakuriRailOverlay)window.yakuriRailOverlay(!over());}
    else{const hide=!body.classList.contains('y-no-rail');body.classList.toggle('y-no-rail',hide);ls.set(KEY,hide?'hidden':'shown');}
    sync();}
  window.yakuriSidebar=toggle;
  const sub=$1('#pvxSubnav');let btn=null;
  if(sub){btn=document.createElement('button');btn.type='button';btn.id='y-sidebar';btn.className='y-sidebar-btn';btn.innerHTML=SVG;btn.setAttribute('aria-controls','y-rail');btn.addEventListener('click',toggle);sub.prepend(btn);}
  const rail=$1('.yakuri-rail');if(rail&&!rail.id)rail.id='y-rail';
  function sync(){const t=label();if(btn){if(btn.getAttribute('aria-label')!==t){btn.setAttribute('aria-label',t);btn.title=t+' ('+KEYS+')';}
      const exp=String(!focused()&&(narrow.matches?over():!body.classList.contains('y-no-rail')));if(btn.getAttribute('aria-expanded')!==exp)btn.setAttribute('aria-expanded',exp);}
    const it=$1('#y-view-sidebar');if(it){const sp=it.querySelector('.y-menu-label');if(sp&&sp.textContent!==t)sp.textContent=t;}}
  /* View ▸ Hide sidebar, with its shortcut beside it (the menu is redrawn with each drug) */
  function menuItem(){const list=$1('#y-menu-list-view');if(!list||list.querySelector('#y-view-sidebar'))return;
    const it=document.createElement('button');it.type='button';it.id='y-view-sidebar';it.className='y-menu-item';it.setAttribute('role','menuitem');it.tabIndex=-1;
    const chk=list.querySelector('.y-check');if(chk){const c=chk.cloneNode(true);c.style.visibility='hidden';it.append(c);}
    it.insertAdjacentHTML('beforeend','<span class="y-menu-label"></span><kbd class="y-menu-key" aria-hidden="true">'+KEYS+'</kbd>');it.setAttribute('aria-keyshortcuts',mac?'Control+Meta+S':'Control+Alt+S');
    it.addEventListener('click',toggle);const focus=[...list.querySelectorAll('[role=menuitemcheckbox]')].find(x=>/Reading focus/.test(x.textContent));(focus||list.lastElementChild).after(it);sync();}
  document.addEventListener('keydown',e=>{if(e.code!=='KeyS'||e.shiftKey)return;const want=mac?(e.ctrlKey&&e.metaKey&&!e.altKey):(e.ctrlKey&&e.altKey&&!e.metaKey);if(!want)return;
    if(compact.matches||document.querySelector('dialog[open]:not(.y-page)'))return;e.preventDefault();toggle();});
  new MutationObserver(sync).observe(body,{attributes:true,attributeFilter:['class']});
  if(narrow.addEventListener)narrow.addEventListener('change',sync);
  const art=$1('#article');if(art)new MutationObserver(menuItem).observe(art,{childList:true,subtree:true});
  menuItem();sync();

  /* ── S3 · a drug dropped on Saved is saved (⌘Z undoes it); on Collections, Add to collection opens for it ── */
  window.yakuriDropSave=function(id){if(typeof favorites==='undefined'||typeof data==='undefined'||!data)return;const d=data.drugs.find(x=>x.id===id);if(!d)return;
    const say=t=>{if(typeof notify==='function')notify(t);};
    if(favorites.has(id)){say(d.name+' is already in Saved.');return;}
    const was=[...favorites],now=[...was,id];
    const set=list=>{favorites.clear();list.forEach(x=>favorites.add(x));try{localStorage.setItem('pravix-reference-saved',JSON.stringify(list));}catch{}
      if(typeof renderList==='function')renderList();const b=$1('#favorite');if(b&&typeof active!=='undefined'&&active){const on=favorites.has(active.id);b.textContent=on?'★':'☆';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',(on?'Unsave ':'Save ')+active.name);}};
    set(now);say('Saved '+d.name+'.');
    if(window.yakuriUndo)window.yakuriUndo.record({label:'Add to Saved · '+d.name,undo:()=>set(was),redo:()=>set(now),reveal:()=>{const r=document.querySelector('#drug-list .drug-item[data-drug="'+CSS.escape(id)+'"]');return r?r.closest('.drug-card')||r:null;}});};

  /* ── S4 · on iPhone, Research and Library checks open as a list of their tools; a tool opens full width with Back to the list ── */
  const PAGE_KEYS=['research','checks'];let explicit=false;
  ['openResearchHub','openWorkspaceReview'].forEach(n=>{const f=window[n];if(typeof f!=='function')return;
    window[n]=function(...a){explicit=a.length>0&&a[0]!==undefined;try{return f.apply(this,a);}finally{setTimeout(()=>{explicit=false;},0);}};});
  const chosen=d=>d.querySelector('.r-tabs :is([aria-pressed=true],[aria-current=true],[aria-current=page],[aria-selected=true])');
  function mode(d,m){d.classList.toggle('y-page-list',m==='list');d.classList.toggle('y-page-tool',m==='tool');
    const back=d.querySelector('.y-page-back'),span=back&&back.querySelector('span'),h=d.querySelector('#y-page-title');if(!back||!span||!h)return;
    if(!('yOrig' in back.dataset)){back.dataset.yOrig=span.textContent;back.dataset.yOrigLabel=back.getAttribute('aria-label')||'';h.dataset.yOrig=h.textContent;}
    if(m==='tool'){const t=chosen(d);span.textContent=h.dataset.yOrig;back.setAttribute('aria-label','Back to '+h.dataset.yOrig);h.textContent=t?t.textContent.trim():h.dataset.yOrig;}
    else{span.textContent=back.dataset.yOrig;back.setAttribute('aria-label',back.dataset.yOrigLabel);h.textContent=h.dataset.yOrig;}}
  function setup(d){if(d.dataset.yCompact)return;d.dataset.yCompact='1';
    d.addEventListener('click',e=>{if(!compact.matches)return;
      if(e.target.closest&&e.target.closest('.y-page-back')&&d.classList.contains('y-page-tool')){e.preventDefault();e.stopImmediatePropagation();mode(d,'list');window.scrollTo(0,0);const c=chosen(d)||d.querySelector('.r-tabs button');if(c)c.focus({preventScroll:true});}},true);
    d.addEventListener('click',e=>{if(!compact.matches)return;const b=e.target.closest&&e.target.closest('.r-tabs button');if(!b)return;   /* capture: Research redraws its tabs on a click */
      setTimeout(()=>{if(!d.isConnected)return;mode(d,'tool');window.scrollTo(0,0);const h=d.querySelector('#y-page-title');if(h)h.focus({preventScroll:true});},0);},true);
    mode(d,compact.matches?(explicit?'tool':'list'):null);}
  new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n instanceof HTMLDialogElement&&n.classList.contains('y-page')&&PAGE_KEYS.includes(n.dataset.yPage))setup(n);}).observe(body,{childList:true,subtree:true});
  const onChange=()=>{document.querySelectorAll('dialog.y-page[data-y-compact]').forEach(d=>mode(d,compact.matches?'tool':null));};
  if(compact.addEventListener)compact.addEventListener('change',onChange);else if(compact.addListener)compact.addListener(onChange);
},{once:true});

/* ═══ HIG Activity views, Buttons and Context menus (Oct 24 2026; claude/hig-audit-yakuri-activity-buttons-context-menus.md) ═══ */
/* B6 · a slow server action says what it's doing in its own button: after about 0.4 s, a small spinner and an -ing label, until it's done */
(function(){
  'use strict';
  const BUSY={'#c-scan':'Reading…','#v-run':'Recalculating…','#check-action-block':'Checking…','#add-local-hold':'Adding hold…','#release-local-hold':'Releasing hold…',
    '.medical-actions button[type=submit]':'Calculating…','#cpr-form button[type=submit]':'Calculating…','[data-y-restore-run]':'Recalculating…'};
  const busyLabel=b=>{if(b.dataset.busy)return b.dataset.busy;for(const [sel,t] of Object.entries(BUSY))if(b.matches(sel))return t;return '';};
  let last=null,lastAt=0;
  const mark=b=>{if(b&&b.tagName==='BUTTON'){last=b;lastAt=performance.now();}};
  document.addEventListener('click',e=>mark(e.target.closest&&e.target.closest('button')),true);
  document.addEventListener('submit',e=>mark(e.submitter||e.target.querySelector('[type=submit],button:not([type])')),true);
  function on(b){const label=busyLabel(b);if(!label||b.classList.contains('y-busy'))return;b.dataset.yBusyWas=b.innerHTML;b.classList.add('y-busy');b.setAttribute('aria-busy','true');
    b.innerHTML='<span class="y-spin" aria-hidden="true"></span><span>'+label.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</span>';}
  function off(b){if(!b.classList.contains('y-busy'))return;b.classList.remove('y-busy');b.removeAttribute('aria-busy');if('yBusyWas' in b.dataset){b.innerHTML=b.dataset.yBusyWas;delete b.dataset.yBusyWas;}}
  window.yakuriBusyLabel=busyLabel;
  new MutationObserver(muts=>{for(const m of muts){const b=m.target;if(b.tagName!=='BUTTON')continue;
      if(b.disabled){if(b===last&&performance.now()-lastAt<1500&&busyLabel(b)){clearTimeout(b._yBusyT);b._yBusyT=setTimeout(()=>{if(b.disabled&&b.isConnected)on(b);},400);}}
      else{clearTimeout(b._yBusyT);off(b);}}}).observe(document.documentElement,{attributes:true,attributeFilter:['disabled'],subtree:true});
})();

/* C8 · a context menu for every drug, wherever it's listed: secondary click, Control-click, Shift+F10 or the menu key. A long press on touch still drags. */
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  if(!document.getElementById('drug-list'))return;
  const ROWS='#drug-list .drug-item,.y-member,.o-pins article[data-o-drug],.p-drug-card';
  const drugOf=row=>{if(row.matches('.drug-item'))return row.dataset.drug;if(row.matches('.y-member'))return row.querySelector('[data-open-drug]')?.dataset.openDrug;
    if(row.matches('.o-pins article'))return row.dataset.oDrug;if(row.matches('.p-drug-card'))return row.querySelector('[data-p-row]')?.dataset.pRow;return null;};
  const say=t=>{if(typeof notify==='function')notify(t);};
  const sheets=()=>document.querySelectorAll('dialog[open]:not(.y-page)').forEach(d=>d.close());
  const copy=async(t,done)=>{try{await navigator.clipboard.writeText(t);say(done);}catch{say('Copy unavailable. Select the text to copy it.');}};
  function unsave(id){if(typeof favorites==='undefined')return;const d=data.drugs.find(x=>x.id===id);const was=[...favorites],now=was.filter(x=>x!==id);
    const set=list=>{favorites.clear();list.forEach(x=>favorites.add(x));try{localStorage.setItem('pravix-reference-saved',JSON.stringify(list));}catch{}if(typeof renderList==='function')renderList();
      const b=document.getElementById('favorite');if(b&&typeof active!=='undefined'&&active){const on=favorites.has(active.id);b.textContent=on?'★':'☆';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',(on?'Unsave ':'Save ')+active.name);}};
    set(now);say('Removed '+d.name+' from Saved.');if(window.yakuriUndo)window.yakuriUndo.record({label:'Remove from Saved · '+d.name,undo:()=>set(was),redo:()=>set(now)});}
  function items(row,id){const d=data.drugs.find(x=>x.id===id);if(!d)return [];const list=[];const add=(label,fn,cls)=>list.push({label,fn,cls});const sep=()=>list.push('-');
    if(typeof openSplit==='function')add('Open in split view',()=>{sheets();if(typeof splitChoices!=='undefined'&&splitChoices[1])splitChoices[1].drug=id;openSplit(id);});
    if(typeof openCompare==='function')add('Compare',()=>{sheets();openCompare(id);});
    sep();
    if(typeof favorites!=='undefined')favorites.has(id)?add('Remove from Saved',()=>unsave(id)):add('Add to Saved',()=>window.yakuriDropSave&&window.yakuriDropSave(id));
    if(typeof openCollections==='function'&&!row.matches('.y-member'))add('Add to collection…',()=>{sheets();openCollections(id);});
    if(typeof openOrganizer==='function'&&window.YakuriOrganizer&&!row.matches('.o-pins article'))add('Pin to board…',()=>{sheets();openOrganizer('boards',YakuriOrganizer.target({kind:'reference',drug:id,view:'all',sourceVersion:YakuriOrganizer.version(d)}));});
    sep();
    if(navigator.clipboard&&window.YakuriCards)add('Copy reference card',()=>copy(YakuriCards.copy(d),'Reference card copied with evidence state, scope and source links.'));
    if(navigator.clipboard)add('Copy link',()=>copy(location.origin+'/yakuri/#drug='+encodeURIComponent(id),'Link copied. It opens Yakuri for anyone signed in to Pravix.'));
    const rm=row.matches('.y-member')?row.querySelector('[data-remove-member]'):row.matches('.o-pins article')?row.querySelector('[data-o-unpin]'):null;
    if(rm){sep();add(row.matches('.y-member')?'Remove from collection':'Unpin',()=>rm.click(),'y-destructive');}
    while(list[0]==='-')list.shift();while(list[list.length-1]==='-')list.pop();return list.filter((x,i,a)=>!(x==='-'&&a[i-1]==='-'));}
  let menu=null,from=null;
  function close(back){if(!menu)return;menu.remove();menu=null;if(back&&from&&from.isConnected)from.focus({preventScroll:true});from=null;}
  function open(row,x,y,focusFirst){close(false);const id=drugOf(row);if(!id)return false;const list=items(row,id);if(!list.length)return false;
    const d=data.drugs.find(z=>z.id===id);from=row.matches('button')?row:(row.querySelector('button')||row);
    menu=document.createElement('div');menu.className='y-menu-list y-context-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',d.name);
    for(const it of list){if(it==='-'){const s=document.createElement('div');s.className='y-menu-sep';s.setAttribute('role','separator');menu.append(s);continue;}
      const b=document.createElement('button');b.type='button';b.className='y-menu-item'+(it.cls?' '+it.cls:'');b.setAttribute('role','menuitem');b.tabIndex=-1;b.textContent=it.label;
      b.addEventListener('click',()=>{close(false);it.fn();});menu.append(b);}
    (row.closest('dialog[open]')||document.body).append(menu);
    menu.style.position='fixed';menu.style.top='0px';menu.style.left='0px';menu.style.zIndex='1000';
    const o=menu.getBoundingClientRect();const w=o.width,h=o.height;   /* a dialog with a filter becomes the menu's frame: correct for it */
    let L=Math.min(x,innerWidth-w-8),T=y+h>innerHeight-8?Math.max(8,y-h):y;L=Math.max(8,L);
    menu.style.left=(L-o.left)+'px';menu.style.top=(T-o.top)+'px';
    const f=menu.querySelector('[role=menuitem]');if(f&&focusFirst!==false)f.focus({preventScroll:true});else if(f)f.focus({preventScroll:true});
    return true;}
  window.yakuriContextMenu=(row,x,y)=>open(row,x,y);
  let lastType='mouse',kbAt=0;
  document.addEventListener('pointerdown',e=>{lastType=e.pointerType||'mouse';if(menu&&!menu.contains(e.target))close(false);},true);
  /* HIG Edit menus (Oct 24 2026): text is the system's. Selected text, a field, or the text of an opened card gets Copy, Look Up and Translate */
  const textual=e=>{const t=e.target;if(!t||!t.closest)return false;if(t.closest('input,textarea,select,[contenteditable=""],[contenteditable=true]'))return true;
    if(t.closest('.p-row-body'))return true;const sel=getSelection&&getSelection();if(sel&&!sel.isCollapsed&&String(sel).trim()){for(let i=0;i<sel.rangeCount;i++){if(sel.getRangeAt(i).intersectsNode(t))return true;}}return false;};
  window.yakuriContextTextual=textual;
  document.addEventListener('contextmenu',e=>{const row=e.target.closest&&e.target.closest(ROWS);if(!row)return;
    if(textual(e)){close(false);return;}
    if(performance.now()-kbAt<400){e.preventDefault();return;}
    if(lastType==='touch')return;   /* a long press drags (Oct 23) */
    if(open(row,e.clientX,e.clientY))e.preventDefault();},true);
  document.addEventListener('keydown',e=>{
    if(menu){const its=[...menu.querySelectorAll('[role=menuitem]')],i=its.indexOf(document.activeElement);
      if(e.key==='ArrowDown'){e.preventDefault();(its[i+1]||its[0]).focus();}else if(e.key==='ArrowUp'){e.preventDefault();(its[i-1]||its[its.length-1]).focus();}
      else if(e.key==='Home'){e.preventDefault();its[0].focus();}else if(e.key==='End'){e.preventDefault();its[its.length-1].focus();}
      else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}else if(e.key==='Tab'){e.preventDefault();close(true);}
      return;}
    if(!(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')))return;const row=document.activeElement&&document.activeElement.closest&&document.activeElement.closest(ROWS);if(!row)return;
    const r=(row.matches('.p-drug-card')?row.querySelector('summary')||row:row).getBoundingClientRect();kbAt=performance.now();
    if(open(row,r.left+12,r.bottom-4)){e.preventDefault();e.stopPropagation();}},true);
  addEventListener('resize',()=>close(false));addEventListener('scroll',e=>{if(menu&&!menu.contains(e.target))close(false);},true);
},{once:true});

/* ═══ HIG Pull-down buttons, The menu bar and Toolbars (Oct 24 2026; claude/hig-audit-yakuri-pulldowns-menubar-toolbars.md) ═══ */
/* M1 · a web app can't add to the Mac's menu bar, so command search lists the open drug's toolbar commands, read from the toolbar itself */
document.addEventListener('DOMContentLoaded',function(){
window.yakuriToolbarCommands=function(){
  const bar=document.querySelector('#article .y-toolbar');if(!bar)return [];const out=[];if(typeof bar._ySync==='function')bar._ySync();   /* each menu's checks and labels, as if it had opened */
  const label=el=>{const l=el.querySelector('.y-menu-label');return (l?l.textContent:[...el.childNodes].filter(n=>n.nodeType===3||(n.nodeType===1&&!/^(SVG|KBD)$/i.test(n.tagName))).map(n=>n.textContent).join('')).replace(/\s+/g,' ').trim();};
  for(const wrap of bar.querySelectorAll(':scope>.y-menu:not(.y-more)')){const list=wrap.querySelector('[role=menu]');if(!list)continue;let group='';
    for(const it of list.children){if(it.classList.contains('y-menu-group')){group=it.textContent.trim();continue;}if(it.getAttribute('role')==='separator'){group='';continue;}
      if(it.hidden||it.disabled||!/^menuitem/.test(it.getAttribute('role')||''))continue;const t=label(it);if(!t)continue;
      out.push({label:group?group+' · '+t:t,checked:it.getAttribute('aria-checked')==='true',kbd:(it.querySelector('kbd')||{}).textContent||'',run:()=>it.click()});}
  }
  for(const b of bar.querySelectorAll(':scope>button.y-tool-btn'))if(!b.hidden)out.push({label:label(b)||b.getAttribute('aria-label')||'',checked:false,kbd:'',run:()=>b.click()});
  return out;};
},{once:true});

/* ═══ HIG Path controls, Search fields and Sidebars (Oct 24 2026; claude/hig-audit-yakuri-path-search-sidebars.md) ═══ */
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),body=document.body;
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}},del:k=>{try{localStorage.removeItem(k);}catch{}}};
  if(!$1('#drug-list'))return;
  const say=t=>{if(typeof notify==='function')notify(t);};
  const rail=$1('.yakuri-rail');

  /* ── P1 · the rail in two groups, Reference and Tools; Edit sidebar shows, hides and orders items within their group ── */
  const TABKEYS=new Set(['interactions','medical']);   /* HIG Tab bars (Oct 24 2026): Interactions and Medical calculators are tabs; the rail is the Drug library's own */
  const GROUPS=[['reference','Reference',['library','saved','recent','collections','compare','split']],
                ['tools','Tools',['organizer','research','cards','context','label','transfer','checks','local']]];
  const IDS={'y-compare':'compare','y-split':'split','y-collections':'collections','o-workspace':'organizer','r-research-nav':'research','l-tools-nav':'local','t-portable':'transfer','c-capture':'label','v-review':'checks','p-cards':'cards','p-context':'context'};
  const keyOf=el=>{if(el.dataset.yNav)return el.dataset.yNav;if(IDS[el.id])return IDS[el.id];const h=el.getAttribute('href')||'';if(/interactions/.test(h))return 'interactions';if(/medical/.test(h))return 'medical';
    return 'x-'+(el.textContent||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');};
  const groupOf=k=>{for(const [g,,keys] of GROUPS)if(keys.includes(k))return g;return 'tools';};
  const nameOf=el=>(el.textContent||'').replace(/\u2318K/,'').trim();
  const PREF='yakuri-sidebar-items';
  const readPrefs=()=>{try{const p=JSON.parse(ls.get(PREF)||'{}');return {order:p&&typeof p.order==='object'&&p.order||{},off:Array.isArray(p&&p.off)?p.off:[]};}catch{return {order:{},off:[]};}};
  let prefs=readPrefs();
  const save=()=>{if(!Object.keys(prefs.order).length&&!prefs.off.length)ls.del(PREF);else ls.set(PREF,JSON.stringify(prefs));};
  const allItems=()=>rail?[...rail.children].filter(x=>x.matches('button,a')):[];
  const items=()=>allItems().filter(x=>!TABKEYS.has(keyOf(x)));
  function ordered(g){const def=GROUPS.find(x=>x[0]===g)[2],want=[...(prefs.order[g]||[]),...def];const at=k=>{const i=want.indexOf(k);return i<0?999:i;};
    return items().filter(el=>groupOf(keyOf(el))===g).sort((a,b)=>at(keyOf(a))-at(keyOf(b)));}
  let arranging=false;
  function arrange(){if(!rail||arranging)return;arranging=true;
    const labels=[...rail.querySelectorAll(':scope>.rail-label')];let [l1,l2]=labels;
    if(!l1){l1=document.createElement('div');l1.className='rail-label';}if(!l2){l2=document.createElement('div');l2.className='rail-label';}
    labels.slice(2).forEach(x=>x.remove());
    if(l1.textContent!=='Reference')l1.textContent='Reference';if(l2.textContent!=='Tools')l2.textContent='Tools';l1.dataset.yGroup='reference';l2.dataset.yGroup='tools';
    const tabs=allItems().filter(x=>TABKEYS.has(keyOf(x)));tabs.forEach(x=>{x.classList.add('y-rail-tab');if(x.dataset.yRail!==keyOf(x))x.dataset.yRail=keyOf(x);});
    const ref=ordered('reference'),tools=ordered('tools'),want=[l1,...ref,l2,...tools,...tabs],bottom=rail.querySelector(':scope>.rail-bottom');
    const now=[...rail.children].filter(x=>x!==bottom);
    if(now.length!==want.length||now.some((x,i)=>x!==want[i])){const f=document.activeElement;want.forEach(x=>rail.insertBefore(x,bottom||null));if(f&&f!==document.activeElement&&rail.contains(f))f.focus({preventScroll:true});}
    const off=new Set(prefs.off);
    for(const el of [...ref,...tools]){const k=keyOf(el),g=groupOf(k);if(el.dataset.yRail!==k)el.dataset.yRail=k;if(el.dataset.yRailGroup!==g)el.dataset.yRailGroup=g;el.classList.toggle('y-rail-off',off.has(k)&&k!=='library');}
    const shown=list=>list.some(el=>!el.hidden&&!el.classList.contains('y-rail-off'));l1.hidden=!shown(ref);l2.hidden=!shown(tools);
    queueMicrotask(()=>{arranging=false;});}
  window.yakuriArrangeSidebar=arrange;
  if(rail){arrange();new MutationObserver(arrange).observe(rail,{childList:true});}

  const setOff=(k,off)=>{const s=new Set(prefs.off);if(off&&k!=='library')s.add(k);else s.delete(k);prefs.off=[...s];save();arrange();};
  const groupKeys=g=>ordered(g).filter(el=>!el.hidden).map(keyOf);
  function move(k,by){const g=groupOf(k),keys=groupKeys(g),i=keys.indexOf(k),j=i+by;if(i<0||j<0||j>=keys.length)return false;[keys[i],keys[j]]=[keys[j],keys[i]];prefs.order[g]=keys;save();arrange();return true;}
  function moveTo(k,before){const g=groupOf(k),keys=groupKeys(g).filter(x=>x!==k);const i=before?keys.indexOf(before):keys.length;keys.splice(i<0?keys.length:i,0,k);prefs.order[g]=keys;save();arrange();}
  function reset(){prefs={order:{},off:[]};save();arrange();}

  /* Settings ▸ Sidebar */
  const UP='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 14.5l5-5 5 5"/></svg>';
  const DOWN='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9.5l5 5 5-5"/></svg>';
  const GRIP='<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><circle cx="9" cy="7" r="1.3"/><circle cx="15" cy="7" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="17" r="1.3"/><circle cx="15" cy="17" r="1.3"/></svg>';
  window.yakuriSidebarEditor=function(host){if(!host)return;
    const esc2=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    function draw(focus){const off=new Set(prefs.off);
      host.innerHTML='<p class="y-set-note">Choose what the sidebar shows, and its order. Hidden items stay in Search.</p>'+GROUPS.map(([g,title])=>{const els=ordered(g).filter(el=>!el.hidden);if(!els.length)return '';
        return '<fieldset class="y-set-group y-set-rail"><legend>'+title+'</legend><ul class="y-rail-edit" data-group="'+g+'">'+els.map((el,i)=>{const k=keyOf(el),n=esc2(nameOf(el)),ico=el.querySelector('.y-ico svg');const lib=k==='library';
          return '<li class="y-rail-row" data-key="'+k+'" draggable="true"><span class="y-rail-grip" aria-hidden="true">'+GRIP+'</span><label><input type="checkbox" data-rail-show="'+k+'"'+(off.has(k)&&!lib?'':' checked')+(lib?' disabled':'')+'>'+(ico?'<span class="y-ico">'+ico.outerHTML+'</span>':'')+'<span>'+n+'</span></label>'+
            (lib?'<span class="y-rail-note">Always shown</span>':'')+
            '<span class="y-rail-move"><button type="button" data-rail-move="-1" data-key="'+k+'" aria-label="Move '+n+' up"'+(i===0?' disabled':'')+'>'+UP+'</button><button type="button" data-rail-move="1" data-key="'+k+'" aria-label="Move '+n+' down"'+(i===els.length-1?' disabled':'')+'>'+DOWN+'</button></span></li>';}).join('')+'</ul></fieldset>';}).join('')+
        '<div class="y-set-group"><button type="button" class="y-set-btn" data-rail-reset'+(prefs.off.length||Object.keys(prefs.order).length?'':' disabled')+'>Restore default sidebar</button></div>';
      if(focus){let t=host.querySelector(focus);if(t&&t.disabled)t=t.parentElement&&t.parentElement.querySelector('button:not(:disabled)');t=t||host.querySelector('[data-rail-move]:not(:disabled)');if(t)t.focus({preventScroll:true});}}
    draw();
    host.addEventListener('change',e=>{const k=e.target.dataset&&e.target.dataset.railShow;if(!k)return;setOff(k,!e.target.checked);const el=items().find(x=>keyOf(x)===k);
      say((el?nameOf(el):'Item')+(e.target.checked?' shows in the sidebar.':' is hidden from the sidebar.'));draw('[data-rail-show="'+k+'"]');});
    host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!host.contains(b))return;
      if(b.hasAttribute('data-rail-reset')){reset();say('The sidebar is back to its default.');draw('[data-rail-reset]');return;}
      if(b.dataset.railMove){const k=b.dataset.key,by=Number(b.dataset.railMove);if(move(k,by)){const el=items().find(x=>keyOf(x)===k);say('Moved '+(el?nameOf(el):'item')+(by<0?' up.':' down.'));}
        draw('[data-rail-move="'+by+'"][data-key="'+k+'"]');}});
    let dragKey=null;
    host.addEventListener('dragstart',e=>{const r=e.target.closest&&e.target.closest('.y-rail-row');if(!r)return;dragKey=r.dataset.key;r.classList.add('y-rail-dragging');try{e.dataTransfer.setData('text/plain',nameOf(items().find(x=>keyOf(x)===dragKey)||r));e.dataTransfer.effectAllowed='move';}catch{}});
    host.addEventListener('dragover',e=>{const r=e.target.closest&&e.target.closest('.y-rail-row');if(!dragKey||!r||groupOf(r.dataset.key)!==groupOf(dragKey))return;e.preventDefault();
      host.querySelectorAll('.y-drop-before,.y-drop-after').forEach(x=>x.classList.remove('y-drop-before','y-drop-after'));const b=r.getBoundingClientRect();r.classList.add(e.clientY<b.top+b.height/2?'y-drop-before':'y-drop-after');});
    host.addEventListener('drop',e=>{const r=e.target.closest&&e.target.closest('.y-rail-row');if(!dragKey||!r)return;e.preventDefault();const after=r.classList.contains('y-drop-after');
      if(r.dataset.key!==dragKey){const keys=groupKeys(groupOf(dragKey)).filter(x=>x!==dragKey);const i=keys.indexOf(r.dataset.key)+(after?1:0);moveTo(dragKey,keys[i]||null);}draw();dragKey=null;});
    host.addEventListener('dragend',()=>{dragKey=null;host.querySelectorAll('.y-rail-dragging,.y-drop-before,.y-drop-after').forEach(x=>x.classList.remove('y-rail-dragging','y-drop-before','y-drop-after'));});};

  /* the rail's own context menu: Hide (undoable) and Edit sidebar… */
  let menu=null,from=null;
  const closeMenu=back=>{if(!menu)return;menu.remove();menu=null;if(back&&from&&from.isConnected)from.focus({preventScroll:true});from=null;};
  function railMenu(el,x,y){closeMenu(false);from=el;const k=keyOf(el),n=nameOf(el);
    menu=document.createElement('div');menu.className='y-menu-list y-context-menu y-rail-menu';menu.setAttribute('role','menu');menu.setAttribute('aria-label',n);
    const add=(label,fn)=>{const b=document.createElement('button');b.type='button';b.className='y-menu-item';b.setAttribute('role','menuitem');b.tabIndex=-1;b.textContent=label;b.addEventListener('click',()=>{closeMenu(false);fn();});menu.append(b);};
    if(k!=='library')add('Hide “'+n+'”',()=>{setOff(k,true);say(n+' is hidden from the sidebar. Settings ▸ Sidebar brings it back.');
      if(window.yakuriUndo)window.yakuriUndo.record({label:'Hide from sidebar · '+n,undo:()=>setOff(k,false),redo:()=>setOff(k,true),reveal:()=>items().find(z=>keyOf(z)===k)||null});
      const next=items().find(z=>z.offsetParent);if(next)next.focus({preventScroll:true});});
    add('Edit sidebar…',()=>{if(window.yakuriSettings){const d=window.yakuriSettings('sidebar');if(d&&d.querySelector){const t=d.querySelector('[data-set-tab=sidebar]');if(t&&t.getAttribute('aria-selected')!=='true')t.click();}}});
    body.append(menu);menu.style.position='fixed';menu.style.zIndex='1000';const w=menu.offsetWidth,h=menu.offsetHeight;
    menu.style.left=Math.max(8,Math.min(x,innerWidth-w-8))+'px';menu.style.top=(y+h>innerHeight-8?Math.max(8,y-h):y)+'px';menu.querySelector('[role=menuitem]').focus({preventScroll:true});}
  if(rail){
    rail.addEventListener('contextmenu',e=>{const el=e.target.closest&&e.target.closest('.yakuri-rail>button,.yakuri-rail>a');if(!el)return;e.preventDefault();railMenu(el,e.clientX,e.clientY);});
    rail.addEventListener('keydown',e=>{const el=e.target.closest&&e.target.closest('.yakuri-rail>button,.yakuri-rail>a');if(!el)return;if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10')){e.preventDefault();const r=el.getBoundingClientRect();railMenu(el,r.left+16,r.bottom);}});}
  document.addEventListener('pointerdown',e=>{if(menu&&!menu.contains(e.target))closeMenu(false);},true);
  document.addEventListener('keydown',e=>{if(!menu)return;const its=[...menu.querySelectorAll('[role=menuitem]')],i=its.indexOf(document.activeElement);
    if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeMenu(true);}
    else if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();its[(i+(e.key==='ArrowDown'?1:-1)+its.length)%its.length].focus();}
    else if(e.key==='Home'||e.key==='End'){e.preventDefault();its[e.key==='Home'?0:its.length-1].focus();}
    else if(e.key==='Tab'){closeMenu(false);}},true);
  addEventListener('resize',()=>closeMenu(false));

  /* ── P2 · narrow windows (761–1150 pt): the rail hides, and the sidebar button shows it over the content with its labels ── */
  const narrow=matchMedia('(min-width:761px) and (max-width:1150px) and (min-height:501px)');
  let scrim=null;
  function overlay(open,back){if(!rail)return;open=!!open&&narrow.matches&&!body.classList.contains('y-focus');if(open===body.classList.contains('y-rail-over'))return;
    body.classList.toggle('y-rail-over',open);
    if(open){if(!scrim){scrim=document.createElement('div');scrim.className='y-rail-scrim';scrim.addEventListener('pointerdown',e=>{e.preventDefault();overlay(false,true);});}body.append(scrim);
      const cur=rail.querySelector('[aria-current=page]:not(.y-rail-off)')||items().find(x=>x.offsetParent);if(cur)cur.focus({preventScroll:true});}
    else{if(scrim)scrim.remove();if(back){const b=$1('#y-sidebar');if(b)b.focus({preventScroll:true});}}}
  window.yakuriRailOverlay=open=>overlay(open,!open);
  if(rail)rail.addEventListener('click',e=>{if(!body.classList.contains('y-rail-over'))return;const el=e.target.closest&&e.target.closest('.yakuri-rail>button,.yakuri-rail>a');if(el)setTimeout(()=>overlay(false,false),0);});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!body.classList.contains('y-rail-over')||menu)return;if(document.querySelector('dialog[open]:not(.y-page)'))return;e.preventDefault();e.stopPropagation();overlay(false,true);},true);
  const onNarrow=()=>{if(!narrow.matches)overlay(false,false);};if(narrow.addEventListener)narrow.addEventListener('change',onNarrow);
  new MutationObserver(()=>{if(body.classList.contains('y-focus')&&body.classList.contains('y-rail-over'))overlay(false,false);}).observe(body,{attributes:true,attributeFilter:['class']});

  /* ── P3 · the breadcrumb names the list the drug was opened from, and takes you back to it ── */
  const LISTS={library:'All drugs',saved:'Saved',recent:'Recent'};   /* HIG Tab bars (Oct 24 2026): inside the Drug library tab, its list is All drugs */
  const modeNow=()=>typeof yakuriMode!=='undefined'&&LISTS[yakuriMode]?yakuriMode:'library';
  function crumb(){const top=$1('#article .article-top');if(!top||top.dataset.yCrumb)return;const c=top.querySelector('.crumb');if(!c)return;
    const mode=modeNow(),name=LISTS[mode];top.dataset.yCrumb=mode;const first=c.firstElementChild;if(!first||first.tagName==='BUTTON')return;
    const b=document.createElement('button');b.type='button';b.className='y-crumb-link';b.textContent=name;b.dataset.yList=mode;b.title='Show '+(mode==='library'?'all drugs':name);
    first.replaceWith(b);
    const back=top.querySelector('#back');if(back)for(const n of back.childNodes)if(n.nodeType===3&&/Drug library/.test(n.textContent))n.textContent=n.textContent.replace('Drug library',name);
    b.addEventListener('click',()=>{if(matchMedia('(max-width:760px)').matches){const bk=$1('#back');if(bk){bk.click();return;}}
      const id=typeof active!=='undefined'&&active?active.id:null;if(typeof yakuriMode!=='undefined'&&yakuriMode!==mode&&typeof libraryMode==='function')libraryMode(mode);
      requestAnimationFrame(()=>{const row=id&&document.querySelector('#drug-list .drug-item[data-drug="'+CSS.escape(id)+'"]');if(row){row.scrollIntoView({block:'nearest'});row.focus({preventScroll:true});}else{const f=$1('#search');if(f)f.focus();}});});}
  const art=$1('#article');if(art){new MutationObserver(crumb).observe(art,{childList:true});crumb();}

  /* a different list starts at its top, like a new mailbox */
  if(typeof window.libraryMode==='function'){const orig=window.libraryMode;window.libraryMode=function(mode){const was=typeof yakuriMode!=='undefined'?yakuriMode:null;const r=orig.apply(this,arguments);
    const now=typeof yakuriMode!=='undefined'?yakuriMode:null;const l=$1('aside.library');if(l&&was!==now)l.scrollTop=0;return r;};}

  /* ── P4 · the library's search field stays at the top of the list as it scrolls ── */
  const lib=$1('aside.library'),top=lib&&lib.querySelector(':scope>.library-top'),field=top&&top.querySelector(':scope>label.search');
  if(lib&&top&&field){const pin=document.createElement('div');pin.className='y-lib-search';const rest=document.createElement('div');rest.className='library-top y-lib-rest';
    let n=field.nextSibling;while(n){const next=n.nextSibling;rest.append(n);n=next;}
    pin.append(field);top.after(pin);pin.after(rest);top.classList.add('y-lib-head');
    const sentinel=document.createElement('div');sentinel.className='y-lib-sentinel';sentinel.setAttribute('aria-hidden','true');pin.before(sentinel);
    if(window.IntersectionObserver)new IntersectionObserver(([e])=>pin.classList.toggle('y-stuck',!e.isIntersecting&&e.boundingClientRect.top<(e.rootBounds?e.rootBounds.top+1:1)),{root:lib,threshold:0}).observe(sentinel);}
},{once:true});

/* ═══ HIG Tab bars and Token fields (Oct 24 2026; claude/hig-audit-yakuri-tab-bars-token-fields.md) ═══ */
document.addEventListener('DOMContentLoaded',function(){
  'use strict';
  const $1=s=>document.querySelector(s),body=document.body;
  const ls={get:k=>{try{return localStorage.getItem(k);}catch{return null;}},set:(k,v)=>{try{localStorage.setItem(k,v);}catch{}}};
  const sub=$1('#pvxSubnav'),isLibrary=!!$1('#drug-list');

  /* ── B1 · the Drug library tab keeps its place: the drug, its tab, its open disclosures and the scroll ── */
  if(isLibrary){const PLACE='yakuri-place';let place={};try{place=JSON.parse(ls.get(PLACE)||'{}')||{};}catch{}
    const dkeys=()=>{const art=$1('#article'),seen={},open=[];if(!art)return open;art.querySelectorAll('details').forEach(d=>{const sm=d.querySelector('summary');const t=(sm?sm.textContent:'').replace(/\s+/g,' ').trim().slice(0,80);seen[t]=(seen[t]||0)+1;if(d.open)open.push(t+'#'+seen[t]);});return open;};
    let ready=false,t=0;
    const save=()=>{if(!ready||typeof active==='undefined'||!active)return;clearTimeout(t);t=setTimeout(()=>{let now={};try{now=JSON.parse(ls.get(PLACE)||'{}')||{};}catch{}
      if(now.drug&&now.drug!==active.id)now.y=0;Object.assign(now,{drug:active.id,view:typeof yakuriView==='string'?yakuriView:null,open:dkeys()});ls.set(PLACE,JSON.stringify(now));},250);};
    document.addEventListener('yakuri:launched',()=>{const id=typeof active!=='undefined'&&active?active.id:null;
      if(id&&place.drug===id){
        if(place.view&&place.view!=='clinical'&&typeof setYakuriView==='function'&&body.dataset.clinicalFocus!=='clinical'&&$1('.y-section-nav [data-view="'+CSS.escape(place.view)+'"]'))setYakuriView(place.view);
        if(Array.isArray(place.open)&&window.yakuriHistoryOpen){window.yakuriHistoryOpen(place.open);setTimeout(()=>window.yakuriHistoryOpen(place.open),100);}
        if(window.yakuriHistorySet)window.yakuriHistorySet({drug:id,view:place.view||null,open:place.open||[]});}
      setTimeout(()=>{ready=true;},400);});
    document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('[data-view],[data-focus-mode]'))setTimeout(save,0);},true);
    document.addEventListener('toggle',e=>{if(e.target instanceof HTMLDetailsElement&&e.target.closest('#article'))save();},true);
    addEventListener('pagehide',()=>{if(!ready||typeof active==='undefined'||!active)return;clearTimeout(t);let now={};try{now=JSON.parse(ls.get(PLACE)||'{}')||{};}catch{}
      Object.assign(now,{drug:active.id,view:typeof yakuriView==='string'?yakuriView:null,open:dkeys(),y:Math.round(scrollY)});ls.set(PLACE,JSON.stringify(now));});}

  if(!sub)return;
  /* ── B2 · every tab has a label on iPhone: the symbol above one word ── */
  const SHORT={'Drug library':'Library','Interactions':'Interactions','Medical calculators':'Calculators'};
  sub.querySelectorAll('.switcher .seg').forEach(seg=>{if(seg.querySelector('.y-seg-short'))return;const full=(seg.getAttribute('aria-label')||seg.textContent||'').trim();const w=SHORT[full];if(!w)return;
    const sp=document.createElement('span');sp.className='y-seg-short';sp.setAttribute('aria-hidden','true');sp.textContent=w;seg.append(sp);if(!seg.getAttribute('aria-label'))seg.setAttribute('aria-label',full);});

  /* ── B4 · one bar on every page: Search and its shortcut everywhere; the tabs keep their place where there's no sidebar ── */
  if(!isLibrary){
    if(!$1('#y-sidebar')&&!sub.querySelector('.y-sidebar-slot')){const slot=document.createElement('span');slot.className='y-sidebar-btn y-sidebar-slot';slot.setAttribute('aria-hidden','true');sub.prepend(slot);}
    const lib=sub.querySelector('.switcher .seg');const href=(lib&&lib.getAttribute('href'))||'/';const go=()=>{location.href=href.replace(/#.*$/,'')+'#search';};
    if(!$1('#x-spotlight-open')){let actions=sub.querySelector('.pvx-actions');if(!actions){actions=document.createElement('div');actions.className='pvx-actions';sub.append(actions);}
      let tools=actions.querySelector('.tools');if(!tools){tools=document.createElement('span');tools.className='tools';actions.prepend(tools);}
      const b=document.createElement('button');b.type='button';b.id='x-spotlight-open';b.setAttribute('aria-keyshortcuts','Meta+K Control+K');b.setAttribute('aria-label','Search drugs, brands, topics and commands');b.title='Search the drug library (\u2318K)';
      b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 20.5 20.5"/></svg><span class="y-spot-label">Drugs, topics and commands</span><kbd>\u2318K</kbd>';
      b.addEventListener('click',go);tools.prepend(b);}
    document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&!e.altKey&&!e.shiftKey&&e.key.toLowerCase()==='k'){if(document.querySelector('dialog[open]'))return;e.preventDefault();go();}});}
},{once:true});
