/* Dosages by species (Oct 25 2026) · Daniel showed Licensed Reference Gabapentin Dosages: "like this".
   The Dosing view opens with a Dosages section: a heading per species, a bold line per use, then its dose, route and how often,
   with a source number. The lines are the drug's own imported records (dosages-model.js), nothing more. The evidence sections follow
   as before. The chosen species (Clinical context) comes first. */
const beforeDosagesArticle=installYakuriArticle;
installYakuriArticle=function(){beforeDosagesArticle();
 const d=active,reader=$('.reader');if(!d||!reader||!window.YakuriDosages)return;
 const section=document.createElement('section');section.id='dosages';section.className='y-dosages';section.dataset.ySection='true';section.setAttribute('aria-labelledby','dosages-title');
 const dosing=[...reader.querySelectorAll(':scope > section[data-y-section]')].find(s=>categoryRules.dosing.test(s.querySelector('h3')?.textContent||''))||$('#imported-records')||$('#references');
 if(dosing)dosing.before(section);else reader.append(section);
 const species=$('#y-species');
 function lineHTML(l,sources){const src=l.source?sources[l.source-1]:null;
  const sup=!src?'':src.url?`<sup class="y-dl-src"><a href="${safeURL(src.url)}" target="_blank" rel="noopener" aria-label="Source ${l.source}: ${esc(src.name)}">${l.source}</a></sup>`:`<sup class="y-dl-src" aria-label="Source ${l.source}: ${esc(src.name)}">${l.source}</sup>`;
  if(l.review)return `<span class="y-dl-review">${esc(l.review.status)}</span>${sup} <a class="y-dl-jump" href="#${esc(slug(l.review.section||''))}">Read the dose review</a>`;
  const parts=[l.held?`<span class="y-dl-held">${esc(l.dose)}</span>`:`<span class="y-dl-dose">${esc(l.dose).replace(/(\d)\s+(?=[a-zµμ%])/gi,'$1\u00a0')}</span>`,l.route?`<span class="y-dl-route">${esc(l.route)}</span>`:'',l.frequency?`<span class="y-dl-freq">${esc(l.frequency)}</span>`:''].filter(Boolean);
  return `<span class="y-dl-line">${parts.join('<span class="y-dl-dot" aria-hidden="true"> · </span>')}</span>${sup}${l.candidate?' <span class="y-dl-tag">Candidate</span>':''}`;}
 function render(){const m=YakuriDosages.build(d,{species:species?.value||'',state:d.governance?.state});
  let body='<h3 id="dosages-title">Dosages</h3>';
  if(!m.count){body+='<p class="y-dl-note">Dose lines by species aren’t separated yet for this drug. Its dose text follows, as written.</p>';section.innerHTML=body;return;}
  body+='<p class="y-dl-note">Imported dose lines, as recorded. Unverified, and not recommended regimens. Wording may be shortened in the source.</p>';
  if(m.held)body+=`<p class="y-dl-hold" role="note"><strong>Safety hold.</strong> Dose figures stay ${esc(YakuriDosages.HELD)}.</p>`;
  for(const g of m.groups){body+=`<h4 class="y-dl-species" id="dosages-${g.species}">${esc(g.label)}</h4>`;
   if(!g.uses.length){body+=`<p class="y-dl-none">No dose lines for ${esc(g.label.toLowerCase())} are recorded yet. Read the dose text below.</p>`;continue;}
   body+='<ul class="y-dl-uses">'+g.uses.map(u=>u.lines.length===1?`<li><strong class="y-dl-use">${esc(u.name)}:</strong> ${lineHTML(u.lines[0],m.sources)}</li>`
     :`<li><strong class="y-dl-use">${esc(u.name)}</strong><ul class="y-dl-lines">${u.lines.map(l=>`<li>${lineHTML(l,m.sources)}</li>`).join('')}</ul></li>`).join('')+'</ul>';}
  if(m.sources.length)body+=`<div class="y-dl-foot"><ol class="y-dl-sources" aria-label="Dose line sources">${m.sources.map(s=>s.url?`<li><a href="${safeURL(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a></li>`:`<li>${esc(s.name)}</li>`).join('')}</ol>${$('#imported-records')?'<a class="y-dl-jump" href="#imported-records">View the original records</a>':''}</div>`;
  section.innerHTML=body;
  section.querySelectorAll('a.y-dl-jump').forEach(a=>a.onclick=e=>{e.preventDefault();jumpToSection(a.getAttribute('href').slice(1));});}
 render();if(species)species.addEventListener('change',render);
 if(typeof setYakuriView==='function')setYakuriView(yakuriView||'overview');
};
