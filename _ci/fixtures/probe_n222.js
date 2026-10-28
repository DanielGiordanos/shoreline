(() => {
  const TOP = el => el.closest('#pvxTopnav,.topnav');
  const faded = el => { for (let x = el; x && x !== document.body; x = x.parentElement) if (getComputedStyle(x).opacity === '0') return true; return false; };
  const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden],[aria-hidden="true"],.pvx-sr') && !faded(el); };
  const lab = el => (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '') + ':' + (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  const own = el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('');
  const txt = [...document.querySelectorAll('body *')].filter(el => !TOP(el) && !['SCRIPT', 'STYLE'].includes(el.tagName) && !(el instanceof SVGElement) && own(el).trim() && vis(el));
  const o = {};
  const fam = txt.filter(el => !/^(-apple-system|system-ui|BlinkMacSystemFont|"SF Mono"|ui-monospace)/.test(getComputedStyle(el).fontFamily));
  o.fam = fam.length; o.famS = fam.slice(0, 4).map(el => lab(el) + ' ' + getComputedStyle(el).fontFamily.slice(0, 20));
  const sm = txt.filter(el => parseFloat(getComputedStyle(el).fontSize) < 10.95);
  o.small = sm.length; o.smallS = sm.slice(0, 5).map(el => lab(el) + ' ' + getComputedStyle(el).fontSize);
  const gl = txt.filter(el => /[✓✔✕✖×○⚠→←↗↺⟲✦⬢⬡✨💾🖨📷🖼📧⏱🔬📚⚙▸👁🔒✏]/u.test(own(el)));
  o.glyph = gl.length; o.glyphS = gl.slice(0, 6).map(lab);
  const bf = [...document.querySelectorAll('body *')].filter(el => !TOP(el) && vis(el) && (getComputedStyle(el).backdropFilter || 'none') !== 'none' && !el.closest('.toast,#toast,.edit-orb,#editOrb,.admin-btn,[role=menu]'));
  o.backdrop = bf.length; o.backdropS = bf.slice(0, 5).map(lab);
  o.anims = document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getTiming().iterations === Infinity).map(a => a.effect.target).filter(t => t && !(t.closest && (t.closest('#pvxTopnav') || t.closest('.badge-dot,.live-dot')))).map(lab).slice(0, 5);
  const fk = [...document.querySelectorAll('[onclick]:not(button):not(a):not(input):not(select):not(textarea):not(label):not([role])')].filter(el => !TOP(el) && vis(el) && !/stopPropagation\(\);?\s*$|event\.target\s*===?\s*this/.test(el.getAttribute('onclick')) && !/overlay|scrim/i.test(el.className + ' ' + el.id));
  o.fake = fk.length; o.fakeS = fk.slice(0, 5).map(lab);
  const nm = el => (el.getAttribute('aria-label') || (el.getAttribute('aria-labelledby') || '').split(' ').map(i => (document.getElementById(i) || {}).textContent || '').join('') || el.textContent || el.title || '').trim();
  const ctr = [...document.querySelectorAll('button,a[href],[role=button],[role=radio],[role=tab],input:not([type=hidden]),select,textarea')].filter(el => vis(el) && !TOP(el));
  o.unnamed = ctr.filter(el => !nm(el) && !(el.labels && el.labels.length) && !el.placeholder).map(lab).slice(0, 5);
  if (matchMedia('(pointer:coarse)').matches) {
    const s44 = ctr.filter(el => { if (el.classList.contains('cell-initials') || el.classList.contains('block-cell')) return false; if (el.tagName === 'A' && getComputedStyle(el).display === 'inline' && el.closest('p,li,.pvx-ho-note,.pvx-ck-note')) return false; if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'range' || el.type === 'file' || el.type === 'color') return false; const r = el.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; });
    o.small44 = s44.length; o.small44S = s44.slice(0, 8).map(el => lab(el) + ' ' + Math.round(el.getBoundingClientRect().width) + '×' + Math.round(el.getBoundingClientRect().height));
  } else { o.small44 = 0; o.small44S = []; }
  const vp = document.querySelector('meta[name=viewport]'); o.viewport = vp && vp.content;
  o.themeColor = [...document.querySelectorAll('meta[name=theme-color]')].map(m => m.content);
  o.apos = (document.body.innerText.match(/[A-Za-z]'[A-Za-z]/g) || []).slice(0, 4);
  o.longTips = [...document.querySelectorAll('[title]')].filter(el => !TOP(el) && el.title.length > 75).map(el => el.title.slice(0, 50)).slice(0, 3);
  const PROPER = new Set('VCA Pravix Shoreline LIU SGVP ER IM GP EM CE PLIT Apple Google Outlook QTrac Antech Plumb’s Workday Dayforce SharePoint Mixlab Wellness Calendar Payroll Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec Mon Tue Wed Thu Fri Sat Sun Monday Tuesday Wednesday Thursday Friday Saturday Sunday Block March July I II DVM VMD DACVIM PhD VREC Emergency Medicine Internal Surgery Neurology Oncology General Practice Elective Cardiology Thanksgiving Christmas Labor Memorial Independence New Year’s Day Kristi Wenger Jordan Hanson Rachel Eberle Alexa Vander Ploeg Sarah Herron Benjamin Kerns Marissa Peck Daniel Giordano Program Graduate Veterinarian Veterinary Referral Center Newtown Specialists Baybrook L.U.N.A. Resident Directory Assets Curriculum Schedule Flow Ultrasound Treatment Rounds OR Forms Anesia Kura Grid'.split(' '));
  const cands = [...document.querySelectorAll('button,a,[role=button],[role=tab],[role=radio],h1,h2,h3,h4,label,legend,th,.legend-title,.sec-label,.card-title,.cc-title,.fx-lab')].filter(el => vis(el) && !TOP(el));
  o.titleCase = [...new Set(cands.map(el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim()).filter(t => t && t.length < 70 && !/\bDr\.|Director|Coordinator/.test(t) && t.split(' ').slice(1).some(w => /^[A-Z][a-z]/.test(w) && !PROPER.has(w.replace(/[^A-Za-z.’]/g, '')))))].slice(0, 8);
  return o;
})()
