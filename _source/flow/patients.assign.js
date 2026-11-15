
/* assignDoctor · its layers, innermost first: 1 #8 after · 2 n350 wrap   (PVX-N387; kept true by flow_t387) */
function assignDoctor(p,id){ return pvxRun('assignDoctor',assignDoctor$base,this,arguments); }
function assignDoctor$base(p,id){
if(p.doctor===id) return;
p.doctor=id;
try{ ctSyncPrimary(p); }catch(e){}
const d=doc(id), off=(id==='unassigned');   /* PVX-N360: removing says so */
p.timeline.push({label:off?'Doctor removed':'Doctor assigned', at:new Date(), meta:off?'':d.name});
notify(off?'Doctor removed':'Doctor assigned', off?pvxEscQ(p.name):`${pvxEscQ(d.name)} → ${pvxEscQ(p.name)}`, {icon:'doctor', color:'var(--accent)'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
/* assignLiaison · its layers, innermost first: 1 n350 wrap   (PVX-N387; kept true by flow_t387) */
function assignLiaison(p,id){ return pvxRun('assignLiaison',assignLiaison$base,this,arguments); }
function assignLiaison$base(p,id){
if(p.liaison===id) return;
p.liaison=id;
const l=liaison(id);
p.timeline.push({label: l?'Liaison assigned':'Liaison removed', at:new Date(), meta: l?l.name:''});
notify(l?'Liaison assigned':'Liaison removed', l?`${pvxEscQ(l.name)} → ${pvxEscQ(p.name)}`:pvxEscQ(p.name), {icon:'liaison', color:'var(--purple)'});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}
/* setPriority · its layers, innermost first: 1 n350 wrap   (PVX-N387; kept true by flow_t387) */
function setPriority(p,level){ return pvxRun('setPriority',setPriority$base,this,arguments); }
function setPriority$base(p,level){
if(p.prio===level) return;
p.prio=level;
p.timeline.push({label:`Priority set to P${level}`, at:new Date(), meta:PRIO_LABEL[level]});
notify('Priority updated',`${pvxEscQ(p.name)} · P${level} · ${PRIO_LABEL[level]}`, {icon:'info', color:PRIO[level].c});
scheduleRender(function(){ if(activePatient===p.id) fillDrawer(p); });
}

function makeEditable(el, commit){
if(!el) return;
el.setAttribute('contenteditable','true'); el.spellcheck=false;
el.classList.add('editable');
el.dataset.orig=el.textContent;
el.onkeydown=ev=>{
if(ev.key==='Enter'){ ev.preventDefault(); el.blur(); }
else if(ev.key==='Escape'){ ev.preventDefault(); el._cancel=true; el.blur(); }
};
el.onblur=()=>{
if(el._cancel){ el._cancel=false; el.textContent=el.dataset.orig; return; }
const v=fxClean(el.textContent,true).trim();
if(v===el.dataset.orig.trim()) return;
commit(v);
};
}
