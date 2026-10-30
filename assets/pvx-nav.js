/* Pravix · the expanding app navigation in the shared top bar (n274, Oct 30 2026; Daniel's approved design handoff
   "Pravix navigation bar", the Monoline treatment).
   - At rest the top bar shows only the branding (left) and the account, language and appearance controls (right). Under
     it, in the middle, hangs a shallow lip that names the app you're in, with a small chevron.
   - Pointing at the top bar (or tapping the lip, or Tab to it) opens a broad panel from the lip, joined to the bar with
     curved shoulders: Flow · Yakuri · Treatment · Rounds · OR · Anesia · More. More opens Directory, Assets, Curriculum,
     Schedule and Ultrasound, plus the account-gated tools (Grid, Forms) for the accounts that may use them.
   - The panel lies over the page; opening and closing never moves anything. The lip's own strip under the bar is kept
     clear, so it never covers an app's sub-nav.
   - The links are the page's own links, moved, not copied: their addresses, Flow's in-place switching, the Grid and
     Forms gates and aria-current all keep working. window.pvxTopbar.setActive(id) still works for apps that switch in
     place. Nothing on the right (Log out, language, light/dark) is touched.
   Loaded by assets/pvx-appearance.js, which every staff page loads first (and by Yakuri's pvx-shell.js). A page without
   the shared top bar is left as it was. */
(function () {
  if (window.pvxNav) return;
  var MAIN = ['navFlow', 'navYakuri', 'navTreatment', 'navRounds', 'navOR', 'navAnesia'];
  var GROUPS = [['People & resources', ['navDirectory', 'navAssets']], ['Learning & planning', ['navCurriculum', 'navSchedule']],
                ['Additional tools', ['navUltrasound', 'navGrid', 'navForms']]];
  var GRACE = 240, R = 'pvxn';
  var api = { version: 'n274', ready: false }; window.pvxNav = api;
  var nav, center, dock, panel, lip, label, row, more, pop, travel, items = [], expanded = false, popOpen = false, t = 0, labelAnim = null, lastLabel = '';
  var mqReduce = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  var CSS = [
    /* the bar: brand left, controls right, their real widths kept; the lip's strip under it is kept clear */
    'html body nav.topnav.pvxn{display:grid!important;grid-template-columns:max-content minmax(0,1fr) max-content!important;align-items:center;overflow:visible!important;margin-bottom:var(--pvxn-lip-h,24px)!important}',
    'html body nav.topnav.pvxn.pvxn-static{position:relative!important}',
    'html body nav.topnav.pvxn>.brandwrap{grid-column:1!important;grid-row:1!important;min-width:0}',
    'html body nav.topnav.pvxn>.nav-right{grid-column:3!important;grid-row:1!important;justify-self:end}',
    'html body nav.topnav.pvxn>.pvxn-center{display:contents}',
    'html body nav.topnav.pvxn #pvxnPanel .nav-item.pvxn-off,html body nav.topnav.pvxn #pvxnMore .nav-item.pvxn-off{display:none!important}',
    'html.pvxn-wait body nav.topnav .nav-center{visibility:hidden!important;max-height:0!important;overflow:hidden!important}',
    /* one surface: the lip at rest, the panel when open (the bar's own colour, measured, made solid) */
    'nav.topnav .pvxn-dock{position:absolute;left:0;right:0;top:calc(100% - 1px);height:0;z-index:5;pointer-events:none}',
    /* the spring's small overshoot and the shoulders never make the window scroll sideways (Safari counts them) */
    '@supports (overflow:clip){nav.topnav .pvxn-dock{overflow-x:clip}}',
    'nav.topnav .pvxn-panel{position:absolute;top:0;left:50%;width:var(--pvxn-lip-w,154px);height:var(--pvxn-lip-h,24px);transform:translateX(-50%);box-sizing:border-box;',
    '  background:var(--pvxn-surface);border-radius:0 0 18px 18px;pointer-events:auto;',
    '  transition:width 480ms cubic-bezier(.18,.85,.25,1.055),height 450ms cubic-bezier(.18,.85,.25,1.025),border-radius 450ms cubic-bezier(.18,.85,.25,1.025),box-shadow 300ms ease}',
    'nav.topnav .pvxn-panel::before,nav.topnav .pvxn-panel::after{content:"";position:absolute;top:0;width:27px;height:27px;pointer-events:none;opacity:0;transition:opacity 160ms ease}',
    'nav.topnav .pvxn-panel::before{left:-27px;border-top-right-radius:27px;box-shadow:9px -9px 0 9px var(--pvxn-surface)}',
    'nav.topnav .pvxn-panel::after{right:-27px;border-top-left-radius:27px;box-shadow:-9px -9px 0 9px var(--pvxn-surface)}',
    'nav.topnav.pvxn.pvxn-open .pvxn-panel{width:var(--pvxn-open-w,min(calc(100% - 54px),1120px));height:var(--pvxn-open-h,119px);border-radius:0 0 32px 32px;box-shadow:var(--pvxn-shadow)}',
    'nav.topnav.pvxn.pvxn-open .pvxn-panel::before,nav.topnav.pvxn.pvxn-open .pvxn-panel::after{opacity:1}',
    /* the lip: the current app's name and a chevron; a 44 pt target without a bigger lip */
    'nav.topnav .pvxn-lip{position:absolute;top:0;left:50%;transform:translateX(-50%);width:var(--pvxn-lip-w,154px);height:var(--pvxn-lip-h,24px);margin:0;padding:0 18px;box-sizing:border-box;',
    '  display:flex;align-items:center;justify-content:center;gap:7px;border:0;border-radius:0 0 18px 18px;background:transparent;color:var(--pvxn-muted);cursor:pointer;z-index:3;',
    '  font:500 11px/1 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro",system-ui,sans-serif;letter-spacing:.015em;-webkit-tap-highlight-color:transparent}',
    '@media (pointer:coarse){nav.topnav .pvxn-lip::before{content:"";position:absolute;left:0;right:0;top:-10px;bottom:-10px}}',
    'nav.topnav .pvxn-lip:hover,nav.topnav .pvxn-lip:focus-visible{color:var(--pvxn-ink)}',
    'nav.topnav .pvxn-lip:focus-visible{outline:2px solid var(--pvxn-accent);outline-offset:-2px}',
    'nav.topnav .pvxn-lip .pvxn-lab{display:block;max-width:calc(var(--pvxn-lip-w,154px) - 50px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transform:translateY(-2px);transition:opacity 150ms ease}',
    'nav.topnav .pvxn-lip .pvxn-chev{display:block;flex:none;width:9px;height:9px;transform:translateY(-3px);opacity:.6;transition:opacity 150ms ease}',
    'nav.topnav .pvxn-lip .pvxn-chev path{fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}',
    'nav.topnav.pvxn.pvxn-open .pvxn-lip{height:8px}',
    'nav.topnav.pvxn.pvxn-open .pvxn-lip .pvxn-lab,nav.topnav.pvxn.pvxn-open .pvxn-lip .pvxn-chev{opacity:0}',
    /* the row of apps: Monoline, no square hover, a faint halo for the current app and one underline that travels */
    'nav.topnav .pvxn-clip{position:absolute;inset:0;overflow:hidden;border-radius:inherit;pointer-events:none}',
    'nav.topnav .pvxn-clip>*{pointer-events:auto}',
    'nav.topnav .pvxn-row{position:absolute;left:50%;width:calc(var(--pvxn-open-w,1120px) - 36px);margin-left:calc((var(--pvxn-open-w,1120px) - 36px)/-2);top:18px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;visibility:hidden;transition:visibility 0s linear 140ms}',
    'nav.topnav.pvxn.pvxn-open .pvxn-row{visibility:visible;transition-delay:0s}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.nav-item,html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.pvxn-more{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;',
    '  gap:8px!important;min-width:0!important;width:auto!important;height:auto!important;min-height:77px;margin:0!important;padding:0 2px 6px!important;box-sizing:border-box;position:relative;',
    '  border:0!important;border-radius:14px!important;background:transparent!important;box-shadow:none!important;color:var(--pvxn-muted)!important;',
    '  font:500 11px/1.2 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro",system-ui,sans-serif!important;letter-spacing:.02em!important;text-transform:none!important;text-decoration:none!important;white-space:nowrap;cursor:pointer;',
    '  opacity:0;transform:translateY(5px);transition:opacity 120ms ease,transform 200ms ease,color 160ms ease;-webkit-tap-highlight-color:transparent;outline-offset:2px}',
    'html body nav.topnav.pvxn.pvxn-open #pvxnPanel .pvxn-row>*{opacity:1;transform:none;transition:opacity 180ms ease,transform 320ms cubic-bezier(.16,1,.3,1),color 160ms ease;transition-delay:calc(85ms + var(--pvxn-i,0)*20ms),calc(85ms + var(--pvxn-i,0)*20ms),0ms}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.nav-item svg,html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.pvxn-more svg{width:20px!important;height:20px!important;padding:11px;box-sizing:content-box;flex:none;border-radius:50%;background:transparent;color:inherit;transition:color 160ms ease,transform 90ms ease}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.pvxn-more svg{fill:currentColor;stroke:none}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.nav-item>span,html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.pvxn-more>span{max-width:100%;overflow:hidden;text-overflow:ellipsis}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>*:hover{color:var(--pvxn-ink)!important;background:transparent!important}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>*:hover svg{color:var(--pvxn-accent)}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>*:active svg{transform:scale(.92)}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>[aria-current="page"],html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.pvxn-more[data-selected="true"]{color:var(--pvxn-ink)!important;font-weight:600!important}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>[aria-current="page"] svg,html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.pvxn-more[data-selected="true"] svg{color:var(--pvxn-accent);background:radial-gradient(circle,var(--pvxn-halo) 0%,transparent 72%);filter:drop-shadow(0 0 3px var(--pvxn-glow))}',
    'html body nav.topnav.pvxn #pvxnPanel .pvxn-row>*:focus-visible{outline:2px solid var(--pvxn-accent)!important;outline-offset:2px}',
    'nav.topnav .pvxn-travel{position:absolute;left:0;top:0;width:12px;height:2px;border-radius:3px;background:var(--pvxn-accent);pointer-events:none;opacity:0;transition:transform 340ms cubic-bezier(.16,1,.3,1),opacity 120ms ease}',
    'nav.topnav.pvxn.pvxn-open .pvxn-travel{opacity:.85;transition:transform 340ms cubic-bezier(.16,1,.3,1),opacity 200ms ease 160ms}',
    /* More: unfolds from its button, the same surface and treatment */
    'nav.topnav .pvxn-pop{position:absolute;z-index:6;width:250px;max-width:calc(100vw - 24px);box-sizing:border-box;padding:12px;border-radius:22px;pointer-events:auto;',
    '  background:var(--pvxn-pop);border:1px solid var(--pvxn-pop-edge);box-shadow:var(--pvxn-pop-shadow);transform-origin:85% 0;',
    '  font:400 13px/1.3 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro",system-ui,sans-serif}',
    'nav.topnav .pvxn-pop[hidden]{display:none!important}',
    'nav.topnav .pvxn-pop.pvxn-in{animation:pvxnUnfold 220ms cubic-bezier(.16,1,.3,1)}',
    '@keyframes pvxnUnfold{from{opacity:0;transform:translateY(-5px) scale(.97)}to{opacity:1;transform:none}}',
    'nav.topnav .pvxn-cat{font-size:11px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:var(--pvxn-muted);padding:12px 11px 4px}',
    'nav.topnav .pvxn-grp:first-child .pvxn-cat{padding-top:4px}',
    'nav.topnav .pvxn-grp[hidden]{display:none}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important;width:100%!important;height:auto!important;',
    '  min-height:44px;margin:0!important;padding:10px 11px!important;box-sizing:border-box;position:relative;border:0!important;border-radius:11px!important;background:transparent!important;box-shadow:none!important;',
    '  color:var(--pvxn-ink)!important;font:400 13px/1.3 -apple-system,BlinkMacSystemFont,"SF Pro Text","SF Pro",system-ui,sans-serif!important;letter-spacing:0!important;text-decoration:none!important;white-space:nowrap;outline-offset:-2px}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item svg{width:18px!important;height:18px!important;flex:none;color:var(--pvxn-muted);transition:color 160ms ease,transform 90ms ease}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item:hover{color:var(--pvxn-accent)!important}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item:hover svg{color:var(--pvxn-accent)}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item:active svg{transform:scale(.92)}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item[aria-current="page"]{font-weight:500!important}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item[aria-current="page"] svg{color:var(--pvxn-accent);filter:drop-shadow(0 0 3px var(--pvxn-glow))}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item[aria-current="page"]::after{content:"";position:absolute;right:12px;top:50%;width:5px;height:5px;margin-top:-2.5px;border-radius:50%;background:var(--pvxn-accent)}',
    'html body nav.topnav.pvxn #pvxnMore .nav-item:focus-visible{outline:2px solid var(--pvxn-accent)!important}',
    /* iPhone and narrow windows: the same panel, apps in four columns */
    '@media (max-width:700px){nav.topnav .pvxn-row{width:calc(var(--pvxn-open-w,366px) - 20px);margin-left:calc((var(--pvxn-open-w,366px) - 20px)/-2);top:14px;grid-template-columns:repeat(4,minmax(0,1fr));row-gap:6px}',
    '  nav.topnav.pvxn.pvxn-open .pvxn-panel{border-radius:0 0 26px 26px}',
    '  nav.topnav .pvxn-panel::before,nav.topnav .pvxn-panel::after{width:20px;height:20px}',
    '  nav.topnav .pvxn-panel::before{left:-20px;border-top-right-radius:20px;box-shadow:7px -7px 0 7px var(--pvxn-surface)}',
    '  nav.topnav .pvxn-panel::after{right:-20px;border-top-left-radius:20px;box-shadow:-7px -7px 0 7px var(--pvxn-surface)}',
    '  html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.nav-item,html body nav.topnav.pvxn #pvxnPanel .pvxn-row>.pvxn-more{min-height:70px;gap:6px!important}}',
    '@media (max-height:500px){html body nav.topnav.pvxn{margin-bottom:0!important}nav.topnav.pvxn:not(.pvxn-open) .pvxn-panel{height:0}nav.topnav.pvxn .pvxn-lip{top:-24px;border-radius:12px}nav.topnav.pvxn.pvxn-open .pvxn-lip{opacity:0;pointer-events:none}}',
    '@media (prefers-reduced-motion:reduce){nav.topnav .pvxn-panel,nav.topnav .pvxn-panel::before,nav.topnav .pvxn-panel::after,nav.topnav .pvxn-lip *,nav.topnav .pvxn-travel,nav.topnav .pvxn-row>*,nav.topnav .pvxn-row svg,nav.topnav .pvxn-pop .nav-item svg{transition:none!important}',
    '  html body nav.topnav.pvxn #pvxnPanel .pvxn-row>*{transform:none!important}nav.topnav .pvxn-pop.pvxn-in{animation:none}nav.topnav .pvxn-row>*:active svg{transform:none!important}}',
    '@media (forced-colors:active){nav.topnav .pvxn-panel,nav.topnav .pvxn-pop{border:1px solid CanvasText}nav.topnav .pvxn-travel{background:Highlight}}'
  ].join('\n');

  var CHEV = '<svg class="pvxn-chev" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.6 5 6.6 8 3.6"/></svg>';
  /* the suite's own More symbol (three dots, as the n132 More and Anesia's More), not a new one */
  var MORE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';

  /* ---- colours: the bar's own surface and the suite's accent, read from the page ---- */
  function rgb(c) { var m = String(c || '').match(/[\d.]+/g); return m ? m.map(Number) : null; }
  function isDark() { var b = document.body, h = document.documentElement; return !!((b && b.classList.contains('dark')) || h.dataset.theme === 'dark'); }
  function solid(top, under) {
    var a = rgb(top), b = rgb(under) || [255, 255, 255]; if (!a) return null;
    var al = a.length > 3 ? a[3] : 1; if (!(b.length > 3 && b[3] < 1) && al >= 1) return 'rgb(' + a.slice(0, 3).join(',') + ')';
    if (b.length > 3 && b[3] === 0) b = isDark() ? [8, 14, 26] : [242, 244, 248];
    return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] * al + b[i] * (1 - al)); }).join(',') + ')';
  }
  function hex(v) { v = String(v || '').trim(); var m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i); if (m) { var h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&'); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; } var r = rgb(v); return r && r.length >= 3 ? r.slice(0, 3) : null; }
  function tokens() {
    if (!nav) return;
    var d = isDark(), cs = getComputedStyle(nav), bs = getComputedStyle(document.body);
    var under = getComputedStyle(document.documentElement).backgroundColor; if (!rgb(under) || rgb(under)[3] === 0) under = bs.backgroundColor;
    var surf = solid(cs.backgroundColor, under) || (d ? 'rgb(13,23,48)' : 'rgb(255,255,255)');
    /* accent: the top bar's cyan in dark; in light the page's own accent ink (Treatment's cobalt, Flow's teal ink) */
    var acc = d ? [56, 189, 210] : (hex(bs.getPropertyValue('--accent-ink')) || hex(bs.getPropertyValue('--accent')) || [31, 143, 168]);
    if (!d && acc[0] > 40 && acc[1] > 160 && acc[2] > 180) acc = [31, 143, 168];   /* a pale cyan can't mark an icon on white: Flow's accent ink instead */
    var s = nav.style, A = acc.join(',');
    s.setProperty('--pvxn-surface', surf);
    s.setProperty('--pvxn-accent', 'rgb(' + A + ')');
    s.setProperty('--pvxn-halo', 'rgba(' + A + ',' + (d ? .16 : .12) + ')');
    s.setProperty('--pvxn-glow', 'rgba(' + A + ',' + (d ? .22 : .14) + ')');
    s.setProperty('--pvxn-ink', d ? '#E6EEF6' : '#1D1D1F');
    s.setProperty('--pvxn-muted', d ? '#8FA6BE' : '#5C5E62');
    s.setProperty('--pvxn-shadow', d ? '0 14px 24px rgba(0,0,0,.28)' : '0 14px 24px rgba(30,45,90,.08)');
    s.setProperty('--pvxn-pop', d ? '#101A32' : '#FFFFFF');
    s.setProperty('--pvxn-pop-edge', d ? 'rgba(255,255,255,.08)' : 'rgba(29,29,31,.10)');
    s.setProperty('--pvxn-pop-shadow', d ? '0 18px 44px rgba(0,0,0,.4)' : '0 18px 44px rgba(20,28,40,.18)');
  }

  /* ---- the links ---- */
  function isOn(a) { return a.classList.contains('active') || a.getAttribute('aria-current') === 'page'; }
  function shown(a) { return a.style.display !== 'none' && !a.hidden; }
  function current() { var i; for (i = 0; i < items.length; i++) if (items[i].getAttribute('aria-current') === 'page') return items[i]; for (i = 0; i < items.length; i++) if (isOn(items[i])) return items[i]; return null; }
  function name(a) { var t = ''; [].forEach.call(a.childNodes, function (n) { if (n.nodeType === 3) t += n.nodeValue; else if (n.tagName === 'SPAN') t += n.textContent; }); return (t || a.textContent || '').trim(); }

  function build() {
    nav = document.querySelector('nav.topnav'); if (!nav || nav.classList.contains(R)) return false;
    var right = nav.querySelector(':scope>.nav-right'), brand = nav.querySelector(':scope>.brandwrap'), old = nav.querySelector(':scope>.nav-center');
    if (!right || !brand || !old) return false;
    var st = document.createElement('style'); st.id = 'pvx-nav-css'; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
    items = [].slice.call(nav.querySelectorAll('.nav-item')).filter(function (a) { return a.tagName === 'A' && !a.classList.contains('pvx-more-btn') && !right.contains(a); });
    if (!items.length) return false;
    /* text nodes become spans so long names can be trimmed without touching the links' own markup otherwise */
    items.forEach(function (a) { [].slice.call(a.childNodes).forEach(function (n) { if (n.nodeType === 3 && n.nodeValue.trim()) { var s = document.createElement('span'); s.textContent = n.nodeValue.trim(); a.replaceChild(s, n); } }); a.removeAttribute('role'); a.removeAttribute('tabindex'); if (!a.getAttribute('aria-label')) { var nm = name(a); if (nm) a.setAttribute('aria-label', nm); } });
    center = document.createElement('div'); center.className = 'pvxn-center';
    dock = document.createElement('div'); dock.className = 'pvxn-dock';
    panel = document.createElement('div'); panel.className = 'pvxn-panel'; panel.id = 'pvxnPanel';
    lip = document.createElement('button'); lip.type = 'button'; lip.className = 'pvxn-lip'; lip.setAttribute('aria-expanded', 'false'); lip.setAttribute('aria-controls', 'pvxnPanel');
    lip.innerHTML = '<span class="pvxn-lab"></span>' + CHEV; label = lip.firstChild;
    row = document.createElement('div'); row.className = 'pvxn-row';
    more = document.createElement('button'); more.type = 'button'; more.className = 'pvxn-more'; more.id = 'pvxnMoreBtn';
    more.setAttribute('aria-expanded', 'false'); more.setAttribute('aria-controls', 'pvxnMore'); more.setAttribute('aria-label', 'More apps');
    more.innerHTML = MORE_SVG + '<span>More</span>';
    pop = document.createElement('div'); pop.className = 'pvxn-pop'; pop.id = 'pvxnMore'; pop.hidden = true; pop.setAttribute('role', 'group'); pop.setAttribute('aria-label', 'More apps');
    travel = document.createElement('span'); travel.className = 'pvxn-travel'; travel.setAttribute('aria-hidden', 'true');
    var byId = {}; items.forEach(function (a) { if (a.id) byId[a.id] = a; });
    var used = [];
    MAIN.forEach(function (id) { if (byId[id]) { row.appendChild(byId[id]); used.push(byId[id]); } });
    row.appendChild(more);
    var extra = items.filter(function (a) { return used.indexOf(a) < 0 && GROUPS.every(function (g) { return g[1].indexOf(a.id) < 0; }); });
    GROUPS.forEach(function (g, gi) {
      var list = g[1].map(function (id) { return byId[id]; }).filter(Boolean); if (gi === GROUPS.length - 1) list = list.concat(extra);
      if (!list.length) return;
      var grp = document.createElement('div'); grp.className = 'pvxn-grp'; grp.setAttribute('role', 'group');
      var cat = document.createElement('div'); cat.className = 'pvxn-cat'; cat.id = 'pvxnCat' + gi; cat.textContent = g[0]; grp.setAttribute('aria-labelledby', cat.id);
      grp.appendChild(cat); list.forEach(function (a) { grp.appendChild(a); }); pop.appendChild(grp);
    });
    [].forEach.call(row.children, function (b, i) { b.style.setProperty('--pvxn-i', i); });
    var clip = document.createElement('div'); clip.className = 'pvxn-clip'; clip.appendChild(row); clip.appendChild(travel);
    panel.appendChild(lip); panel.appendChild(clip); dock.appendChild(panel); dock.appendChild(pop); center.appendChild(dock);
    nav.replaceChild(center, old);           /* the old row (and the n132 More menu in it) leaves the page; the links came with us */
    nav.classList.add(R);
    if (getComputedStyle(nav).position === 'static') nav.classList.add('pvxn-static');
    document.documentElement.classList.remove('pvxn-wait');
    return true;
  }

  /* ---- state ---- */
  function sync() {
    /* aria-current follows the page's own .active (Flow switches it in place); pages that mark only aria-current keep it */
    var act = items.filter(function (a) { return a.classList.contains('active'); });
    if (act.length) items.forEach(function (a) { if (act.indexOf(a) > -1) { if (a.getAttribute('aria-current') !== 'page') a.setAttribute('aria-current', 'page'); } else if (a.hasAttribute('aria-current')) a.removeAttribute('aria-current'); });
    /* the page's own gates hide a link with style="display:none" (Grid, Forms): keep that, whatever the layout says */
    items.forEach(function (a) { var off = !shown(a); if (a.classList.contains('pvxn-off') !== off) a.classList.toggle('pvxn-off', off); });
    var cur = current(), inMore = !!(cur && pop.contains(cur));
    more.setAttribute('data-selected', inMore ? 'true' : 'false');
    [].forEach.call(pop.querySelectorAll('.pvxn-grp'), function (g) { g.hidden = ![].some.call(g.querySelectorAll('.nav-item'), shown); });
    setLabel(cur ? name(cur) : 'Apps');
    placeTravel();
  }
  function setLabel(txt, force) {
    if (txt === lastLabel && !force) return; var first = !lastLabel; lastLabel = txt;
    label.textContent = txt;
    lip.setAttribute('aria-label', txt + (expanded ? ', hide apps' : ', show apps'));
    /* the lip fits the name (154 pt at least) */
    var w = Math.max(154, Math.ceil(label.scrollWidth) + 18 * 2 + 16);
    nav.style.setProperty('--pvxn-lip-w', Math.min(w, 260) + 'px');
    if (!first) fadeLabel();
  }
  function fadeLabel() {
    if (mqReduce.matches || !label.animate) return; if (labelAnim) labelAnim.cancel();
    labelAnim = label.animate([{ opacity: 0, transform: 'translateY(3px)' }, { opacity: 1, transform: 'translateY(-2px)' }], { duration: 220, easing: 'cubic-bezier(.16,1,.3,1)' });
  }
  function placeTravel() {
    if (!travel || !row) return; var cur = current(), tg = cur && row.contains(cur) ? cur : (cur ? more : null);
    if (!tg) { travel.style.visibility = 'hidden'; return; } travel.style.visibility = '';
    var x = row.offsetLeft + tg.offsetLeft + tg.offsetWidth / 2 - 6, y = row.offsetTop + tg.offsetTop + tg.offsetHeight - 2;
    travel.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
  }
  function openWidth() { var w = nav.clientWidth, ow = innerWidth <= 700 ? w - 24 : Math.min(w - 54, 1120); nav.style.setProperty('--pvxn-open-w', Math.max(0, Math.round(ow)) + 'px'); }
  function openHeight() { openWidth(); var h = row.offsetTop + row.scrollHeight + (innerWidth <= 700 ? 16 : 24); nav.style.setProperty('--pvxn-open-h', Math.round(h) + 'px'); }
  function expand() {
    clearTimeout(t); if (expanded) return; expanded = true; openHeight();
    nav.classList.add('pvxn-open'); lip.setAttribute('aria-expanded', 'true'); lip.setAttribute('aria-label', lastLabel + ', hide apps');
    placeTravel();
  }
  function collapse(focusLip) {
    clearTimeout(t); closeMore(false);
    if (!expanded) { if (focusLip) lip.focus(); return; }
    var hadFocus = dock.contains(document.activeElement);
    expanded = false; nav.classList.remove('pvxn-open'); lip.setAttribute('aria-expanded', 'false'); lip.setAttribute('aria-label', lastLabel + ', show apps');
    if (focusLip || hadFocus) { try { lip.focus({ preventScroll: true }); } catch (e) { lip.focus(); } }
    fadeLabel();
  }
  function keyboardInside() { var a = document.activeElement; return !!(a && dock.contains(a) && a !== lip && a.matches && safe(function () { return a.matches(':focus-visible'); })); }
  function safe(f) { try { return f(); } catch (e) { return false; } }
  function hovered() { return safe(function () { return nav.matches(':hover') || pop.matches(':hover'); }); }
  function later() {
    clearTimeout(t);
    t = setTimeout(function () { if (popOpen || keyboardInside() || hovered()) return; collapse(false); }, GRACE);
  }
  /* under the panel, its right edge lined up with More's, inside the window (placed again once the panel has opened) */
  function placePop() {
    var nr = nav.getBoundingClientRect(), mr = more.getBoundingClientRect(), w = pop.offsetWidth || 250, oh = parseFloat(nav.style.getPropertyValue('--pvxn-open-h')) || 119;
    var left = Math.max(12, Math.min(mr.right - nr.left - w + 6, document.documentElement.clientWidth - nr.left - w - 12));
    pop.style.left = Math.round(left) + 'px'; pop.style.top = Math.round(oh + 8) + 'px';
  }
  function openMore(focusFirst) {
    clearTimeout(t); expand(); if (popOpen) return; popOpen = true; pop.hidden = false; more.setAttribute('aria-expanded', 'true');
    placePop(); pop.classList.remove('pvxn-in'); void pop.offsetWidth; pop.classList.add('pvxn-in');
    if (focusFirst) { var f = [].filter.call(pop.querySelectorAll('.nav-item'), shown)[0]; if (f) f.focus(); }
  }
  function closeMore(restore) {
    if (!popOpen) return; popOpen = false; pop.hidden = true; more.setAttribute('aria-expanded', 'false');
    if (restore) more.focus();
  }

  /* ---- wiring ---- */
  function wire() {
    var touchDown = false;
    /* it opens when the pointer moves over the bar, not when the page changes under a resting pointer (a sheet closing) */
    nav.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') clearTimeout(t); });
    nav.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') { if (!expanded) expand(); else clearTimeout(t); } });
    nav.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') later(); });
    nav.addEventListener('pointerdown', function (e) { touchDown = e.pointerType !== 'mouse'; }, true);
    lip.addEventListener('click', function (e) {
      if (e.detail === 0) { expand(); var f = row.querySelector('.nav-item,.pvxn-more'); if (f) f.focus(); return; }   /* Return or Space */
      if (touchDown) { if (expanded) collapse(false); else expand(); return; }
      expand();
    });
    more.addEventListener('click', function (e) { if (popOpen) { closeMore(false); if (touchDown || e.detail === 0) return; later(); } else openMore(e.detail === 0); });
    dock.addEventListener('focusin', function () { clearTimeout(t); if (document.activeElement !== lip) expand(); });
    dock.addEventListener('focusout', function (e) {
      var to = e.relatedTarget; if (to && dock.contains(to)) return;
      if (popOpen && (!to || !pop.contains(to))) closeMore(false);
      if (!to || !nav.contains(to) || !dock.contains(to)) later();
    });
    /* an app chosen with a finger closes the panel; with the mouse it stays while the pointer is there */
    dock.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a.nav-item'); if (!a) return;
      if (popOpen) closeMore(false);
      if (touchDown) setTimeout(function () { collapse(false); }, 0);
    });
    document.addEventListener('pointerdown', function (e) { if ((expanded || popOpen) && !nav.contains(e.target)) collapse(false); }, true);
    window.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !(expanded || popOpen)) return;
      var inside = nav.contains(document.activeElement);
      if (popOpen && inside) { e.preventDefault(); e.stopPropagation(); closeMore(true); return; }
      if (popOpen) { closeMore(false); collapse(false); return; }
      if (inside) { e.preventDefault(); e.stopPropagation(); collapse(true); }
      else if (hovered()) collapse(false);   /* open under the pointer, focus elsewhere: it closes, and the page still gets its Esc */
    }, true);
    /* arrows move along the row and down the More list; Tab still goes everywhere */
    row.addEventListener('keydown', function (e) {
      var l = [].filter.call(row.children, function (x) { return shown(x); }), i = l.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); l[(i + (e.key === 'ArrowRight' ? 1 : l.length - 1)) % l.length].focus(); }
      else if (e.key === 'ArrowDown' && document.activeElement === more) { e.preventDefault(); openMore(true); }
    });
    pop.addEventListener('keydown', function (e) {
      var l = [].filter.call(pop.querySelectorAll('.nav-item'), shown), i = l.indexOf(document.activeElement); if (i < 0) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); l[(i + (e.key === 'ArrowDown' ? 1 : l.length - 1)) % l.length].focus(); }
      else if (e.key === 'Home') { e.preventDefault(); l[0].focus(); } else if (e.key === 'End') { e.preventDefault(); l[l.length - 1].focus(); }
    });
    /* the page changes the current app (Flow switches in place), a gate opens Grid or Forms, the theme or the size changes */
    var mo = new MutationObserver(function () { sync(); });
    items.forEach(function (a) { mo.observe(a, { attributes: true, attributeFilter: ['class', 'aria-current', 'style', 'hidden'] }); });
    var th = new MutationObserver(function () { tokens(); });
    th.observe(document.body, { attributes: true, attributeFilter: ['class'] }); th.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    var rs = function () { openWidth(); if (expanded) openHeight(); placeTravel(); if (popOpen) placePop(); };
    if (window.ResizeObserver) new ResizeObserver(rs).observe(nav); window.addEventListener('resize', rs);
    panel.addEventListener('transitionend', function (e) { if (e.target === panel) { placeTravel(); if (popOpen) placePop(); } });
    if (window.ResizeObserver) new ResizeObserver(function () { placeTravel(); }).observe(panel);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setLabel(lastLabel, true); placeTravel(); });
  }
  function setActive(id) {
    items.forEach(function (a) { var on = a.id === id; a.classList.toggle('active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    sync();
  }

  function start() {
    if (api.ready || !build()) return false;
    openWidth(); tokens(); sync(); wire(); api.ready = true;
    api.expand = expand; api.collapse = collapse; api.openMore = openMore; api.closeMore = closeMore; api.refresh = function () { tokens(); sync(); };
    api.state = function () { return popOpen ? 'more' : expanded ? 'open' : 'rest'; };
    var prev = window.pvxTopbar; window.pvxTopbar = { layout: sync, setActive: setActive, version: 'n274', prev: prev && prev.version };
    return true;
  }
  /* run as soon as the top bar is complete (its right-hand controls exist). If the page's older top-bar code (n132)
     hasn't run yet, it sees window.pvxTopbar and stands down; if it has, its row leaves the page with nothing in it. */
  function tryStart() { var n = document.querySelector('nav.topnav'); if (n && n.querySelector('.nav-right')) { start(); return true; } return false; }
  if (!tryStart()) {
    var w = new MutationObserver(function () { if (tryStart()) w.disconnect(); });
    w.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () { w.disconnect(); tryStart(); document.documentElement.classList.remove('pvxn-wait'); });
  }
})();
