
 
let apProblems=[], _rvCtrl=null, _rpBackspaceArmed=false, _rpLastRaw='';
let apReviewIntakeId=null;
function focusReasonInput(){ const i=document.getElementById('apReason'); if(i) try{ i.focus(); }catch(e){} }
let _rpSel=-1;   /* PVX-N213: the selected token (while _rpBackspaceArmed) */
/* renderProblemChips · its layers, innermost first: 1 #57 after   (PVX-N387; kept true by flow_t387) */
function renderProblemChips(){ return pvxRun('renderProblemChips',renderProblemChips$base,this,arguments); }
function renderProblemChips$base(){
const wrap=document.getElementById('apProblemsChips'); if(!wrap) return;
if(!_rpBackspaceArmed||_rpSel<0||_rpSel>=apProblems.length){ if(_rpBackspaceArmed&&apProblems.length) _rpSel=apProblems.length-1; else { _rpSel=-1; _rpBackspaceArmed=false; } }
wrap.setAttribute('role','list'); wrap.setAttribute('aria-label','Problems');
wrap.innerHTML = apProblems.map(function(pr,i){
const t=formatProblem(pr), armed=(_rpBackspaceArmed&&i===_rpSel)?' armed':'';
const o=String(pr.originalInput||''), tip=(o&&_rn(o).replace(/[^a-z0-9]+/g,'')!==_rn(t).replace(/[^a-z0-9]+/g,''))?'Edit · typed “'+o+'”':'Edit';   /* PVX-N364 */
return'<span class="rvp-chip'+armed+'" role="listitem" data-i="'+i+'"><button type="button" class="rvp-chip-t" data-i="'+i+'" title="'+pvxEscQ(tip)+'" aria-label="Edit '+pvxEscQ(t)+'">'+pvxEscQ(t)+'</button>'
+'<button type="button" class="rvp-chip-x" data-i="'+i+'" aria-label="Remove '+pvxEscQ(t)+'" title="Remove"><svg viewBox="0 0 24 24" aria-hidden="true" class="rvp-x-ic"><path d="M7 7l10 10M17 7L7 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/></svg></button></span>';
}).join('');
wrap.querySelectorAll('.rvp-chip-x').forEach(function(b){ b.onclick=function(){ rpRemove(+b.dataset.i); }; });
wrap.querySelectorAll('.rvp-chip-t').forEach(function(b){ b.onclick=function(){ rpEdit(+b.dataset.i); }; });
wrap.style.display = apProblems.length ?'flex':'none';
}
function rpSay(msg){ let l=document.getElementById('apTokLive'); if(!l){ l=document.createElement('div'); l.id='apTokLive'; l.className='pvx-vh'; l.setAttribute('role','status'); document.body.appendChild(l); }
l.textContent=''; setTimeout(function(){ l.textContent=msg; },40); }
function rpRemove(i){ const pr=apProblems[i]; if(!pr) return; const t=formatProblem(pr); apProblems.splice(i,1); _rpBackspaceArmed=false; renderProblemChips(); focusReasonInput(); rpSay('Removed '+t); }
function rpEdit(i){ const pr=apProblems[i]; if(!pr) return; const input=document.getElementById('apReason'); if(!input) return;
const t=formatProblem(pr); apProblems.splice(i,1); _rpBackspaceArmed=false; renderProblemChips();
input.value=pr.originalInput||t; _rpLastRaw=input.value; focusReasonInput(); try{ input.setSelectionRange(input.value.length,input.value.length); }catch(e){}
rpSay('Editing '+t); }
function rpMove(i,d){ const j=i+d; if(i<0||j<0||j>=apProblems.length) return; const pr=apProblems[i]; apProblems.splice(i,1); apProblems.splice(j,0,pr);   /* PVX-N364 */
  if(_rpBackspaceArmed) _rpSel=j; renderProblemChips(); const t=formatProblem(pr); rpSay(t+' moved '+(d<0?'earlier':'later')+', '+(j+1)+' of '+apProblems.length+(j===0?', now the main reason':''));
  if(!_rpBackspaceArmed){ const b=document.querySelector('#apProblemsChips .rvp-chip-t[data-i="'+j+'"]'); if(b) try{ b.focus(); }catch(e){} } }
function rpSaySel(){ const pr=apProblems[_rpSel]; if(pr) rpSay(formatProblem(pr)+' selected, '+(_rpSel+1)+' of '+apProblems.length+'. Backspace removes it, Return edits it'+(apProblems.length>1?', '+((window.PvxKeys&&!PvxKeys.mac)?'Alt':'Option')+' and an arrow move it.':'.')); }
/* addProblem · its layers, innermost first: 1 #55 wrap   (PVX-N387; kept true by flow_t387) */
function addProblem(item){ return pvxRun('addProblem',addProblem$base,this,arguments); }
function addProblem$base(item){
const input=document.getElementById('apReason'); if(!input) return;

const raw = item ? (_rpLastRaw || input.value.trim()) : input.value.trim();
let prob;
if(item){ const mods=parseModifiers(raw); apProblems.push(makeProblem(item.id,item.label,item.category,mods,raw||item.label)); }
else { if(!raw) return; splitComplaints(raw).forEach(function(seg){ apProblems.push(parseProblem(seg)); }); }
input.value=''; _rpLastRaw=''; _rpBackspaceArmed=false;
if(_rvCtrl) _rvCtrl.close();
renderProblemChips(); focusReasonInput();
}
function ensureReasonAutocomplete(){
if(_rvCtrl) return;
const input=document.getElementById('apReason'), listEl=document.getElementById('rvList');
if(!input || !listEl) return;
_rvCtrl=ReasonVisitAutocomplete.attach(input, listEl, {
onSelect:function(it){ addProblem(it); },
onInput:function(v){ _rpBackspaceArmed=false; _rpLastRaw=v; }
});

input.addEventListener('keydown', function(e){   /* PVX-N213: select, edit and remove tokens from the keyboard */
if((e.key==='Enter'|| e.key===';') && !e.defaultPrevented){
if(input.value.trim()){ e.preventDefault(); addProblem(null); return; }
if(e.key==='Enter'&&_rpBackspaceArmed&&_rpSel>=0){ e.preventDefault(); rpEdit(_rpSel); }
return;
}
if(input.value===''&&apProblems.length){
if(e.key==='Backspace'||e.key==='Delete'){ e.preventDefault(); if(_rpBackspaceArmed) rpRemove(_rpSel); else if(e.key==='Backspace'){ _rpBackspaceArmed=true; _rpSel=apProblems.length-1; renderProblemChips(); rpSaySel(); } return; }
if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&e.altKey&&_rpBackspaceArmed&&_rpSel>=0){ e.preventDefault(); rpMove(_rpSel,e.key==='ArrowLeft'?-1:1); return; }   /* PVX-N364: ⌥← ⌥→ move the selected problem */
if(e.key==='ArrowLeft'){ e.preventDefault(); if(!_rpBackspaceArmed){ _rpBackspaceArmed=true; _rpSel=apProblems.length-1; } else _rpSel=Math.max(0,_rpSel-1); renderProblemChips(); rpSaySel(); return; }
if(e.key==='ArrowRight'&&_rpBackspaceArmed){ e.preventDefault(); if(_rpSel<apProblems.length-1){ _rpSel++; renderProblemChips(); rpSaySel(); } else { _rpBackspaceArmed=false; renderProblemChips(); } return; }
if(e.key==='Escape'&&_rpBackspaceArmed){ e.preventDefault(); e.stopPropagation(); _rpBackspaceArmed=false; renderProblemChips(); return; }
}
if(_rpBackspaceArmed&&['Shift','Alt','Meta','Control','Tab'].indexOf(e.key)<0){ _rpBackspaceArmed=false; renderProblemChips(); }
});
}
