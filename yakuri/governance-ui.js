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
