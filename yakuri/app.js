'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeURL=u=>{try{const x=new URL(u);return ['http:','https:'].includes(x.protocol)?esc(x.href):'#';}catch{return '#';}};
const getStored=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def;}catch{return def;}};
const store=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch{notify('Browser storage unavailable; changes last for this visit.');}};
let concordance = {};
let data, active, species='all', savedOnly=false, query='', evidence='all', findingLimit=8;
let favorites=new Set(getStored('pravix-reference-saved',[]));
let theme=getStored('pravix-reference-theme','system'), fontStep=getStored('pravix-reference-text',0);
const media=matchMedia('(prefers-color-scheme: dark)');
// The Pravix top bar's light/dark switch (pvx-theme.js, the shared pvx_theme choice) sets body.dark; Yakuri's styles follow it.
function applyTheme(){document.documentElement.dataset.theme=document.body.classList.contains('dark')?'dark':'light';}applyTheme();new MutationObserver(applyTheme).observe(document.body,{attributes:true,attributeFilter:['class']});
function applyFont(){document.documentElement.style.setProperty('--reading',[17,20,22][fontStep]/16+'rem');$('#text-size').setAttribute('aria-label',fontStep?`Text size ${[17,20,22][fontStep]} points, increase`:'Text size automatic, increase');}   /* Oct 24 (HIG): the first size is Automatic: the device's own text size (Larger Text on iPhone and iPad; 17 pt on the Mac) */applyFont();
function notify(text){$('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#toast').classList.remove('visible'),2400);}
const slug=t=>t.toLowerCase().replace(/[^a-z0-9]+/g,'-');
const coverageSpecies=d=>[...new Set([...d.species,...(d.editorial?.coverage_species||[])])];
const quickSections=d=>{
 const sections=d.editorial?.sections||[];
 return [['Doses',/dose|dosage/i],['Dosage Forms',/formulation|dosage forms/i],['Adverse Effects',/adverse|safety & monitoring/i]].flatMap(([label,pattern])=>{
  const section=sections.find(s=>pattern.test(s.title)&&s.label!=='not assessed'&&(label!=='Doses'||!/forms/i.test(s.title)||/doses/i.test(s.title)))|| (label==='Doses'?sections.find(s=>/dose|dosage/i.test(s.title)&&!/forms/i.test(s.title)&&s.label!=='not assessed'):null);
  return section?[{label,id:slug(section.title)}]:[];
 });
};
const quickLinks=(d,library=false)=>quickSections(d).map(s=>`<a class="section-pill" href="#drug=${encodeURIComponent(d.id)}&section=${encodeURIComponent(s.id)}" ${library?`data-drug="${esc(d.id)}" data-section="${esc(s.id)}"`:`data-jump="${esc(s.id)}"`} aria-label="${esc(s.label)} for ${esc(d.name)}">${esc(s.label)}</a>`).join('');
function jumpToSection(id){if(window.yakuriRevealSection)yakuriRevealSection(id);const target=document.getElementById(id);if(!target)return;target.scrollIntoView({block:'start'});const heading=target.querySelector('h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}history.replaceState(history.state,'',`#drug=${encodeURIComponent(active.id)}&section=${encodeURIComponent(id)}`);}
const stage=d=>d.editorial?.kind==='monograph'?(d.editorial.revision?'Revised monograph':'Monograph'):d.editorial?'Research note':d.findings.length?'Workbook audit available':'Not yet assessed';
function renderList(){
 const list=data.drugs.filter(d=>(statusFilter==='all'||d.governance.state===statusFilter)&&(!savedOnly||favorites.has(d.id))&&(species==='all'||(species==='other'?coverageSpecies(d).some(s=>!['dog','cat'].includes(s)):coverageSpecies(d).includes(species)))&&(evidence==='all'||(evidence==='research'?(d.editorial||d.findings.length):evidence==='review'?(d.findings.some(f=>f.potential_high_consequence||f.label==='discrepancy requiring review')||d.editorial?.sections.some(s=>s.label==='discrepancy requiring review')):!d.editorial&&!d.findings.length))&&yakuriSearchMatch(d,query));
 /* A–Z (Oct 24 2026): names, then text mentions, then possible spellings, A–Z inside each; Recent lists the latest first */
 if(typeof yakuriSearchRank==='function')yakuriOrder(list,query);
 $('#result-count').textContent=typeof yakuriScopeCount==='function'?yakuriScopeCount(list.length):`${list.length} ${savedOnly?'saved ':''}${list.length===1?'drug':'drugs'}`;$('#saved-count').textContent=favorites.size;
 $('#drug-list').innerHTML=list.length?list.map(d=>`<div class="drug-card"><button class="drug-item" data-drug="${esc(d.id)}" aria-current="${d.id===active?.id}"><span><strong>${esc(d.name)}</strong><small>${d.governance.state==='Held'?'Held · ':''}${esc(stage(d))}${yakuriSpellingMatch(d,query)?' · Possible spelling match':''}</small></span><span class="chevron" aria-hidden="true">${favorites.has(d.id)?'★':'›'}</span></button>${quickSections(d).length?`<nav class="list-shortcuts" aria-label="${esc(d.name)} sections">${quickLinks(d,true)}</nav>`:''}</div>`).join(''):(savedOnly&&!favorites.size&&!query?'<div class="empty">No saved drugs yet.<br>Save a drug with the star on its monograph.</div>':'<div class="empty">No matching drugs.<br>Try another name, species or evidence stage.</div>');
 $('#library').classList.toggle('nav-active',!savedOnly);$('#saved').classList.toggle('nav-active',savedOnly);
}
function sourceLink(id){const s=data.sources[id];return s?`<a href="${safeURL(s.url)}" target="_blank" rel="noopener">${esc(id)} ↗</a>`:`<span>${esc(id)} · source unavailable</span>`;}
function findingsHTML(){return active.findings.slice(0,findingLimit).map(f=>`<article class="finding ${f.potential_high_consequence?'high':''}"><div class="label">${esc(f.label)}</div><h4>${esc(f.matching_context||f.finding_id)}</h4><p>${esc(f.interpretation)}</p><small>${esc(f.evidence_strength)} · ${f.source_ids.map(sourceLink).join(' · ')}</small>${f.potential_high_consequence?`<p><strong>Prompt veterinary review:</strong> ${esc(f.reason_for_prompt_review)}</p>`:''}<details><summary>Compare original, evidence and next step</summary><dl><dt>Workbook location</dt><dd>${esc(f.sheet)} · row ${esc(f.row)} · ${esc((f.cells||[]).join(', '))}</dd><dt>Original values (verbatim)</dt><dd>${Object.entries(f.original_cells_exact||{}).map(([k,v])=>`${esc(k)}: ${esc(v)}`).join('<br>')}</dd><dt>Evidence comparator</dt><dd>${esc(f.comparator_value)}</dd><dt>Proposed next step — not applied</dt><dd>${esc(f.proposed_next_step)}</dd></dl></details></article>`).join('');}
function recordNoticeHTML(number){
 const notes=(active.editorial?.record_notices||[]).filter(n=>n.records.includes(number));
 return notes.map(n=>`<div class="notice" role="note" aria-label="Imported record review"><strong>${esc(n.status)}</strong><p class="footnote">Read the reviewed context before using any dose. Original values are retained below for traceability.</p><a href="#${slug(n.section)}">Read the dose or safety review ↗</a></div>`).join('');
}
function recordsHTML(){return active.records.map((r,i)=>`<div class="record"><strong>Imported record ${i+1}</strong>${recordNoticeHTML(i+1)}<dl>${[['Species',r.s?.join(', ')],['Indication',r.i],['Route',r.ro],['Dose',r.do],['Frequency',r.fo],['Duration',r.duration],['Concentration',r.concentration],['Age restrictions',r.age]].map(([k,v])=>`<dt>${k}</dt><dd>${esc(v||'Unknown — not supplied')}</dd>`).join('')}</dl></div>`).join('');}
function citationHTML(r,i){return `<li id="ref-${i+1}">${esc(r.authors||'')} <a href="${safeURL(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a> ${r.journal?`<em>${esc(r.journal)}</em>. `:''}${esc(r.details||'')}<div class="source-meta">${esc(r.version)} · ${esc(r.section)}<br>${esc(r.access)}</div></li>`;}
function concordanceHTML(d){
 const a=concordance[d.id];
 if(d.editorial?.followup_review){const f=d.editorial.followup_review;return `<section class="notice" aria-label="Safety follow-up status"><strong>Safety follow-up · ${esc(f.date)} · ${esc(f.status)}</strong><p>${esc(f.action)}</p><p class="footnote"><strong>Still unverified:</strong> ${esc(f.remaining)}</p><a href="${esc(f.report)}#${esc(d.id)}">Read the latest source checks and remaining questions ↗</a>${d.editorial?.comprehensive_review?`<br><a href="comprehensive-review-09.html#${esc(d.id)}">Earlier comprehensive review ↗</a>`:''}</section>`;}
 if(!a)return '';
 if(d.editorial?.comprehensive_review)return `<section class="notice" aria-label="Review status"><strong>Comprehensive editorial review · ${esc(d.editorial.comprehensive_review.date)}</strong><p>Clinical discussion, safety, interactions, monitoring and product information have been expanded below. Unresolved source and prescribing questions remain identified in each entry.</p><p class="footnote">Veterinary approval and complete Plumb’s parity remain pending. Earlier comparison flags are historical findings from the scoped audit.</p><a href="comprehensive-review-09.html#${esc(d.id)}">Read this review’s corrections and source limits ↗</a><br><a href="${esc(a.report)}#${esc(d.id)}">View the earlier scoped comparison ↗</a></section>`;
 return `<section class="notice" aria-label="Plumb’s comparison"><strong>Plumb’s comparison · ${esc(a.accessed)}</strong><p>${esc(a.dose_assessment)}</p>${a.reconciled_guidance?`<p><strong>Reconciled guidance:</strong> ${esc(a.reconciled_guidance)}</p>`:''}<p class="footnote">${a.repair?`Selected sections have been revised below: ${a.repair.resolved} flags corrected, ${a.repair.partial} partly addressed, ${a.repair.open} open. Earlier versions are archived.`:"Selected claims checked; this monograph has not yet been revised in the correction pass."} Full monograph verification remains open.</p><a href="${esc(a.report)}#${esc(d.id)}">Review ${a.flags.length} historical flags, current repair status and sources ↗</a></section>`;
}
function renderReferenceArticle(){
 const d=active, ed=d.editorial;const auditSources=[...new Set(d.findings.flatMap(f=>f.source_ids))].map(id=>data.sources[id]).filter(Boolean);
 const sectionNames=[...(ed?ed.sections.map(s=>s.title):['Overview']),...(d.findings.length?['Workbook audit']:[]),...(!ed?.sections.some(s=>s.title==='Safety & monitoring')?['Safety & monitoring']:[]),...(d.records.length?['Imported records']:[]),'References','Provenance'];
 $('#article').innerHTML=`<div class="article-top"><button class="back" id="back">‹ Drug library</button><div class="crumb"><span>Drug library</span><span>/</span><span>${esc(d.name)}</span></div><button id="print">Print reference ↗</button></div><div class="article-hero"><div class="eyebrow">DRUG REFERENCE</div><div class="hero-line"><h2>${esc(d.name)}</h2><button id="favorite" class="save-button" aria-label="${favorites.has(d.id)?'Unsave':'Save'} ${esc(d.name)}" aria-pressed="${favorites.has(d.id)}">${favorites.has(d.id)?'★':'☆'}</button></div><p class="subtitle">${esc(ed?.subtitle||'Your formulary, with evidence in view')}</p><div class="chips"><span class="chip research">${esc(stage(d))}</span>${coverageSpecies(d).map(s=>`<span class="chip">${esc(s.charAt(0).toUpperCase()+s.slice(1))}</span>`).join('')}<span class="chip">Veterinary review pending</span></div>${quickSections(d).length?`<nav class="article-shortcuts" aria-label="Quick sections">${quickLinks(d)}</nav>`:''}</div><div class="reading-layout"><div class="reader"><div class="notice">${esc(ed?.notice||(ed?.kind==='monograph'?'US product-specific summary; consult the full label and stated evidence limits. Veterinary review pending.':'Selected evidence, not a complete prescribing monograph. No clinical approval has been provided.'))}</div>${concordanceHTML(d)}${ed?.finding_resolution?`<div class="notice"><strong>Source findings updated · ${esc(ed.finding_resolution.date)}</strong><p>${ed.finding_resolution.counts.resolved||0} scoped findings resolved; ${((ed.finding_resolution.counts.partial||0)+(ed.finding_resolution.counts.held||0))} selected findings remain open. Other unverified scope and veterinary approval remain pending.</p><a href="${esc(ed.finding_resolution.report||'findings-resolution-100-2026-10-21.html')}#${esc(d.id)}">View current resolution record</a></div>`:''}${ed?.full_plumbs_review?`<div class="notice"><strong>Full source comparison · ${esc(ed.full_plumbs_review.date)}</strong><p>All sections of the named Plumb’s monograph were compared. Missing details and source conflicts remain; full clinical verification is not established.</p><a href="plumbs-full100-2026-10-21.html#${esc(d.id)}">View findings</a></div>`:''}${ed?.plumbs_comparison?`<div class="notice"><strong>Historical Plumb’s comparison · ${esc(ed.plumbs_comparison.date)}</strong><p class="footnote">Earlier source assessment; it does not override the current approval state or holds above.</p><p>${esc(ed.plumbs_comparison.finding)}</p><p>Targeted dose and major-warning check. Full monograph verification and veterinary approval remain pending.</p><a href="plumbs-comparison-100-2026-10-21.html#${esc(d.id)}">View comparison record</a></div>`:''}${ed?.sections.length>12?`<details class="section-index"><summary>Browse ${ed.sections.length} sections</summary><nav aria-label="Monograph sections">${ed.sections.map(s=>`<a href="#${slug(s.title)}">${esc(s.title)}</a>`).join('')}</nav></details>`:''}${ed?ed.sections.map(s=>`<section id="${slug(s.title)}"><h3>${esc(s.title)}</h3>${ed.kind==='monograph'?`<div class="evidence-label">${esc(s.label)}</div>`:''}${s.context?`<div class="context">${esc(s.context)}</div>`:''}<p>${esc(s.text)}${s.refs.map(n=>`<a class="citation-link" href="#ref-${n}" aria-label="Reference ${n}">${n}</a>`).join('')}</p>${s.calculation?`<div class="calculation">${esc(s.calculation)}</div>`:''}</section>`).join(''):`<section id="overview"><h3>Overview</h3><p class="unassessed">${d.findings.length?'Selected claims from the original workbook have been researched. Review the exact population, product and route in each finding below. This does not validate the current app’s imported records.':'A public-source monograph has not yet been prepared for this drug. Imported records are preserved below as unverified source material.'}</p></section>`}${d.findings.length?`<section id="workbook-audit"><h3>Workbook audit <span class="muted">· ${d.findings.length}</span></h3><p class="footnote">These findings refer to the sign-off workbook, not a verified match to the app import. Support applies only within each stated context.</p><div class="findings">${findingsHTML()}</div>${d.findings.length>findingLimit?'<button id="more-findings" class="load-more">Show more findings</button>':''}</section>`:''}${!ed?.sections.some(s=>s.title==='Safety & monitoring')?`<section id="safety-monitoring"><h3>Safety & monitoring</h3><div class="unassessed">${ed?.comprehensive_review?'Safety, interactions and monitoring were reviewed in the clinical sections above. Evidence gaps, exact-product checks and veterinary approval remain pending.':d.findings.length?'Selected safety issues may appear in the workbook audit. A complete product-specific contraindication, interaction and monitoring review is still required.':'Contraindications, interactions and monitoring have not been comprehensively assessed for this entry.'} Missing evidence does not establish safety.</div></section>`:''}${d.records.length?`<section id="imported-records"><h3>Imported records</h3><p class="footnote">${d.records.length} ${d.records.length===1?'record':'records'} from your n136 app. Wording may be truncated in the source. Missing fields remain unknown. These are not recommended regimens.</p><details><summary>View original, unverified records</summary>${recordsHTML()}</details></section>`:''}<section id="references"><h3>References</h3>${ed?`<ol class="references">${ed.references.map(citationHTML).join('')}</ol>`:''}${auditSources.length?`<details ${!ed?'open':''}><summary>Workbook evidence sources (${auditSources.length})</summary><ol class="references">${auditSources.map(s=>`<li><a href="${safeURL(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><div class="source-meta">${esc(s.source_id)} · ${esc(s.date_version)}<br>${esc(s.page_section||'Section not recorded')}<br>Access: ${esc(s.access_status||'not recorded')} · ${esc(s.accessed||'')}<br>${esc(s.limitations||'')}</div></li>`).join('')}</ol></details>`:''}${!ed&&!auditSources.length?'<p class="unassessed">No public-source evidence dossier has been attached yet.</p>':''}</section><section id="provenance"><h3>Provenance</h3><p class="footnote">${esc(d.origin)}. Clinical summaries are original interpretations; imported values are displayed verbatim. ${ed?.creation_review?"New detailed monograph with source and product limits recorded; individual prescribing verification and veterinary approval remain pending.":ed?.comprehensive_review?"Comprehensive editorial review is recorded with remaining evidence limits. Original imported records and all prior versions are preserved; patient-specific prescribing verification remains pending.":ed?.revision?"Selected monograph sections have been revised; original imported records and earlier versions are preserved. Remaining audit changes are open.":"This entry has not been revised in the current correction pass; proposed workbook changes remain unapproved."} Prefilled approval cells are not authenticated veterinary sign-off.</p><p class="footnote">Library: ${data.counts.originalDrugs} original drugs · ${data.counts.originalRecords} imported regimen records · ${data.counts.catalog-data.counts.originalDrugs} public research additions. Workbook inventory and app inventory are distinct. <a href="CONTENT_COVERAGE.md" target="_blank">Read coverage and limitations ↗</a></p></section><div class="footnote">YAKURI BY PRAVIX · Research · Qualified veterinary review required</div></div><nav class="toc" aria-label="On this page"><div class="eyebrow">ON THIS PAGE</div>${sectionNames.map(t=>`<a href="#${slug(t)}">${esc(t)}</a>`).join('')}</nav></div>`;
 $('#favorite').onclick=()=>{favorites.has(d.id)?favorites.delete(d.id):favorites.add(d.id);store('pravix-reference-saved',[...favorites]);renderList();const b=$('#favorite');b.textContent=favorites.has(d.id)?'★':'☆';b.setAttribute('aria-pressed',favorites.has(d.id));b.setAttribute('aria-label',`${favorites.has(d.id)?'Unsave':'Save'} ${d.name}`);notify(favorites.has(d.id)?'Saved to your library':'Removed from saved drugs');};
 $('#print').onclick=()=>window.print();$('#back').onclick=()=>document.body.classList.remove('reading-mobile');
 if($('#more-findings'))$('#more-findings').onclick=()=>{findingLimit+=8;const y=scrollY;renderArticle();scrollTo(0,y);};
 $('#article').querySelectorAll('a[href^="#"]').forEach(a=>a.onclick=e=>{e.preventDefault();const id=a.dataset.jump||a.getAttribute('href').slice(1);jumpToSection(id);});
}
function openDrug(id,mobile=true){active=data.drugs.find(d=>d.id===id)||data.drugs.find(d=>d.name==='Alteplase');findingLimit=8;renderList();renderArticle();$('#drug-list [aria-current="true"]')?.scrollIntoView({block:'nearest'});if(mobile){document.body.classList.add('reading-mobile');$('#article').focus({preventScroll:true});}if(window.yakuriHistoryDrug)window.yakuriHistoryDrug(active.id);else history.replaceState(history.state,'',`#drug=${encodeURIComponent(active.id)}`);if(window.yakuriRemember&&!window.yakuriNoRemember)yakuriRemember(active.id);scrollTo(0,0);}
$('#search').addEventListener('input',e=>{query=e.target.value;renderList();});
$('#drug-list').onclick=e=>{const b=e.target.closest('[data-drug]');if(b){e.preventDefault();openDrug(b.dataset.drug);if(b.dataset.section)jumpToSection(b.dataset.section);}};
document.querySelectorAll('[data-species]').forEach(b=>b.onclick=()=>{species=b.dataset.species;document.querySelectorAll('[data-species]').forEach(x=>x.setAttribute('aria-pressed',x===b));renderList();});
$('#evidence-filter').onchange=e=>{evidence=e.target.value;renderList();};
function selectLibrary(saved){if(window.yakuriLibraryMode)yakuriLibraryMode(saved);savedOnly=saved;document.body.classList.remove('reading-mobile');renderList();}
$('#library').onclick=()=>selectLibrary(false);$('#saved').onclick=()=>selectLibrary(true);

$('#text-size').onclick=()=>{fontStep=(fontStep+1)%3;store('pravix-reference-text',fontStep);applyFont();notify(fontStep?`Text size: ${[17,20,22][fontStep]} pt`:'Text size: automatic');};
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();document.body.classList.remove('reading-mobile');$('#search').focus();}if(e.key==='Escape'&&document.activeElement===$('#search')){$('#search').value='';query='';renderList();$('#search').blur();}});
'use strict';
let integrationToken = '';
let statusFilter = 'all';
let currentCandidate = null;
let detailRequest = 0;
const sessionReady = fetch('/api/session').then(r => {if (!r.ok) throw Error('Local session unavailable');return r.json();}).then(x => {integrationToken=x.token;});

async function integrationRequest(path, payload) {
  await sessionReady;
  const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json','X-Pravix-Token':integrationToken}, body:JSON.stringify(payload)});
  const result = await response.json();
  return {status:response.status, ...result};
}
function statusBadge(state) {return `<span class="clinical-badge ${esc(state.toLowerCase())}">${esc(state === 'Approved' ? 'Approved for a defined use' : state==='Draft'?'Unverified':state)}</span>`;}
function installGovernance() {
  const counts=data.integration.counts;
  $('#integration-counts').textContent=`${counts.Draft} Unverified · ${counts.Held} Held · ${counts.Approved} Approved`;
  $('#clinical-filter').onchange=e=>{statusFilter=e.target.value;renderList();};
}
function showGovernance() {
  const drug=active;
  const block=document.createElement('section');
  block.id='clinical-governance';
  block.className='governance-panel';
  block.setAttribute('aria-label','Clinical access and evidence');
  block.innerHTML=`<div class="governance-heading"><div><h3>Evidence and approval</h3></div>${statusBadge(drug.governance.state)}</div>
    <p>Reference reading is available. Clinical actions require an approved, explicitly mapped regimen. An editorial review date is not a clinical approval.</p>
    <label for="recommendation-select">Review scope</label><select id="recommendation-select">${drug.governance.recommendations.map(r=>`<option value="${esc(r.id)}">${r.kind==='reference'?'Monograph · reference only':`Imported regimen ${r.record_number}`} · ${esc(r.state==='Draft'?'Unverified':r.state)}</option>`).join('')}</select>
    <div id="recommendation-detail" aria-live="polite">Loading scope…</div>
    <details class="integration-history"><summary>Source and change history</summary><div id="integration-history">Open to load the saved review and import history.</div></details>`;
  $('#article .reader').prepend(block);
  $('#recommendation-select').onchange=()=>loadRecommendation($('#recommendation-select').value);
  $('#article .integration-history').ontoggle=async e=>{
    if(!e.target.open)return;
    const target=$('#integration-history');
    try {const r=await fetch('/api/history/'+encodeURIComponent(drug.id));if(!r.ok)throw Error();const h=await r.json();
      if(active.id!==drug.id)return;
      const old=h.editorial_history;
      const revisions=[...(old.history||[]),...(old.snapshot?[old]:[])];
      target.innerHTML=`<p>${h.imports.length} saved content version(s); ${revisions.length} prior editorial revision(s).</p><ol>${h.events.slice(0,15).map(x=>`<li><strong>${esc(x.action.replaceAll('_',' '))}</strong> · ${esc(new Date(x.time).toLocaleString())}${x.details.reason?`<p>${esc(x.details.reason)}</p>`:''}</li>`).join('')}</ol><details><summary>Earlier editorial changes</summary><ol>${revisions.map(x=>`<li>${esc(x.reason||'Recorded editorial revision')}<small>Version ${esc((x.after_sha256||'').slice(0,12))} · clinical approval: ${x.clinical_approval===true?'recorded in historical source; not an integration approval':'not granted'}</small></li>`).join('')||'<li>No prior revision record.</li>'}</ol></details>`;
    } catch {target.textContent='History unavailable. Clinical actions remain blocked unless the server verifies approval.';}
  };
  loadRecommendation($('#recommendation-select').value);
}
async function loadRecommendation(id) {
  const request=++detailRequest;
  currentCandidate=null;
  const target=$('#recommendation-detail');
  target.textContent='Loading scope…';
  try {
    const response=await fetch('/api/recommendations/'+encodeURIComponent(id));
    if(!response.ok)throw Error();
    const r=await response.json();
    if(request!==detailRequest || !document.contains(target))return;
    currentCandidate=r;
    const field=(label,value)=>`<div><dt>${esc(label)}</dt><dd>${esc(value??'Not supplied / not verified')}</dd></div>`;
    target.innerHTML=`<p>${statusBadge(r.state)} <strong>${esc(r.reason)}</strong></p>
      ${r.holds.length?`<div class="hold-reasons"><strong>Open holds</strong><ul>${r.holds.map(h=>`<li>${esc(h.reason)}<small>${h.source==='local-editor'?'Local editorial hold':'Source hold · conservatively blocks clinical use for this drug until regimen-specific review'}</small></li>`).join('')}</ul></div>`:''}
      <dl class="scope-grid">${field('Species',r.species.join(', ')||null)}${field('Indication',r.indication)}${field('Formulation',r.formulation)}${field('Route',r.route)}${field('Imported dose wording',r.dose_text)}${field('Units / basis',r.units?`${r.units} / ${r.basis}`:null)}${field('Frequency',r.frequency)}${field('Concentration',r.concentration)}${field('Editorial review',r.editorial_review_date)}${field('Clinical approval',r.approval?.date||'Not approved')}${field('Content version',r.content_version.slice(0,12))}</dl>
      <p class="source-mapping">${esc(r.source_mapping)}</p>
      ${r.imported_source_url?`<p><a href="${safeURL(r.imported_source_url)}" target="_blank" rel="noopener">Original regimen source ↗</a></p>`:''}
      <details><summary>${r.sources.length} retained monograph ${r.sources.length===1?'source':'sources'}</summary><ol class="references">${r.sources.map(s=>`<li><a href="${safeURL(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a><small>${esc(s.version||'')} · ${esc(s.section||'')}<br>${esc(s.access||'')}</small></li>`).join('')}</ol></details>
      <div class="clinical-actions" aria-label="Clinical action access"><button disabled>Calculate dose · blocked</button><button disabled>Draft prescription · blocked</button><button disabled>Recommend · blocked</button></div>
      <p class="footnote">This test release has no clinician approval service. Imported prose and historical dose records cannot be activated here.</p>
      <button class="test-gate" id="check-action-block">Test that clinical use is blocked</button><p id="gate-result" role="status"></p>
      <details class="local-hold-controls"><summary>Manage a local editorial hold</summary><p>Adding a hold blocks clinical use. Releasing the local hold returns this scope to Unverified; it cannot clear a source hold or grant approval.</p><label for="hold-reason">Reason</label><textarea id="hold-reason" rows="3" maxlength="2000" placeholder="Record the reason for this change…"></textarea><div class="hold-buttons"><button id="add-local-hold">Add hold</button><button id="release-local-hold" ${r.holds.some(h=>h.source==='local-editor')?'':'disabled'}>Release local hold</button></div><p id="hold-result" role="status"></p></details>`;
    if(window.yakuriScopeLoaded)yakuriScopeLoaded(r);
    $('#check-action-block').onclick=()=>checkBlocks(r);
    $('#add-local-hold').onclick=()=>changeHold(r,false);
    $('#release-local-hold').onclick=()=>changeHold(r,true);
  } catch {if(request===detailRequest)target.textContent='Scope could not load. Clinical actions are unavailable. Reload the page.';}
}
async function checkBlocks(r) {
  const button=$('#check-action-block'), output=$('#gate-result');
  button.disabled=true;output.textContent='Checking each server boundary…';
  try {
    const result=[];
    for(const operation of ['calculate','prescription','recommendations']) {
      const response=await integrationRequest('/api/clinical/'+operation,{recommendation_id:r.id,version:r.content_version});
      result.push(`${operation==='calculate'?'Calculator':operation==='prescription'?'Prescription':'Recommendation'}: ${response.allowed===false&&response.status===403?'blocked by server':'review response ('+response.status+')'}`);
    }
    output.textContent=result.join(' · ');
  } catch {output.textContent='Could not reach the server. No clinical action was performed.';}
  finally {button.disabled=false;}
}
async function changeHold(r, release) {
  const output=$('#hold-result'),reason=$('#hold-reason').value;
  const buttons=[$('#add-local-hold'),$('#release-local-hold')];buttons.forEach(b=>b.disabled=true);
  try {
    const result=await integrationRequest(release?'/api/release-hold':'/api/hold',{recommendation_id:r.id,version:r.content_version,reason});
    if(result.status!==200){output.textContent=result.message;return;}
    const response=await fetch('/api/library');if(!response.ok)throw Error();
    data=await response.json();active=data.drugs.find(d=>d.id===active.id);installGovernance();renderList();
    if(active.id===r.drug_id){
      renderArticle();
      $('#recommendation-select').value=r.id;
      await loadRecommendation(r.id);
    }
    notify(release?'Local hold released; clinical approval still required.':'Hold saved. Clinical actions blocked.');
  } catch {output.textContent='Change could not be confirmed. Reload before trying again.';}
  finally {if(document.contains(buttons[0])){buttons[0].disabled=false;buttons[1].disabled=!r.holds.some(h=>h.source==='local-editor');}}
}

function renderArticle(){renderReferenceArticle();showGovernance();if(window.installYakuriArticle)installYakuriArticle();}
/* HIG Launching / Feedback (Oct 24 2026): open where you left off; say when loading is slow; a failed launch says what to do and can try again. */
function yakuriBoot(){
 const gen=yakuriBoot.n=(yakuriBoot.n||0)+1,art=$('#article');
 /* HIG Loading (Oct 24 2026): placeholders in the shape of what's coming, replaced as it arrives; VoiceOver hears only the status */
 art.innerHTML='<div class="y-skel-article" aria-hidden="true"><span class="y-skel y-skel-eyebrow"></span><span class="y-skel y-skel-title"></span><span class="y-skel y-skel-line"></span><span class="y-skel y-skel-line y-skel-short"></span></div><div class="loading" role="status">Loading the library…</div>';
 const list=$('#drug-list');if(list&&!list.querySelector('[data-drug]'))list.innerHTML='<div class="y-skel-list" aria-hidden="true">'+'<div class="y-skel-row"><span class="y-skel y-skel-name"></span><span class="y-skel y-skel-meta"></span></div>'.repeat(8)+'</div>';
 $('#integration-counts').textContent='Loading approval states…';
 const gated=()=>document.documentElement.classList.contains('yh-gated');   /* the hosted copy shows its own progress card */
 const slow=setTimeout(()=>{const l=art.querySelector('.loading');if(l&&!gated())l.textContent='Still loading the library…';},4000);
 const stuck=setTimeout(()=>{const l=art.querySelector('.loading');if(l&&!gated()&&!l.querySelector('button')){const b=document.createElement('button');b.type='button';b.className='y-retry';b.textContent='Try again';b.onclick=()=>{clearTimeout(slow);yakuriBoot();};l.append(' ',b);}},15000);
 fetch('/api/library').then(r=>{if(!r.ok)throw Error('Library unavailable');return r.json();}).then(d=>{if(gen!==yakuriBoot.n)return;clearTimeout(slow);clearTimeout(stuck);data=d;installGovernance();
  const p=new URLSearchParams(location.hash.slice(1));let id=p.get('drug');
  if(!id){const last=typeof recentDrugs!=='undefined'&&Array.isArray(recentDrugs)?recentDrugs.find(x=>data.drugs.some(d=>d.id===x)):null;if(last)id=last;else window.yakuriNoRemember=true;}
  try{openDrug(id,!!p.get('drug'));}finally{delete window.yakuriNoRemember;}
  if(p.get('section'))jumpToSection(p.get('section'));document.dispatchEvent(new CustomEvent('yakuri:launched'));})
 .catch(()=>{if(gen!==yakuriBoot.n)return;clearTimeout(slow);clearTimeout(stuck);const hosted=!!window.YakuriHosted;
  art.innerHTML='<div class="y-unavailable" role="alert"><h1>'+(hosted?'Can’t load the library':'Can’t reach Yakuri on this Mac')+'</h1><p>'+(hosted?'Check your connection, then try again.':'Make sure Yakuri is running, then try again.')+' Clinical actions stay blocked until the library loads.</p><button type="button" class="y-retry">Try again</button></div>';
  art.querySelector('.y-retry').onclick=yakuriBoot;$('#integration-counts').textContent='Approval states unavailable';const sk=$('#drug-list .y-skel-list');if(sk)sk.remove();});
}
yakuriBoot();
