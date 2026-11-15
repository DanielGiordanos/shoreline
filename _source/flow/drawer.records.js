const RECORDS_STATUS={
not_requested:{label:'Not requested', color:'#86868b'},
requested:{label:'Requested', color:'#3B82C4'},
partial:{label:'Partial', color:'#C98A1A'},
received:{label:'Received', color:'#3B9E74'},
unable:{label:'Unable to obtain', color:'var(--priority-p1)'}
};
const RECORD_METHODS=['Phone','Email'];
const REC_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>';
function defaultRecords(){ return {status:'not_requested', pdvm:'', method:'', note:'', requestedBy:'', requestedAt:null, history:[]}; }
function getRecords(p){ if(!p.records) p.records=defaultRecords(); return p.records; }
function requestRecords(p){
const r=getRecords(p); if(r.status!=='not_requested') return;
const at=new Date();
r.status='requested'; r.requestedBy=CURRENT_USER; r.requestedAt=at;
r.history.push({status:'requested', by:CURRENT_USER, at});
p.timeline.push({label:'pDVM records requested', at, meta:CURRENT_USER});
recExpanded=true;
notify('Records requested',`${pvxEscQ(p.name)} · pDVM records`, {icon:'info', color:'#3B82C4'});
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
function setRecordStatus(p, status){
const r=getRecords(p); if(r.status===status) return;
r.status=status; r.history.push({status, by:CURRENT_USER, at:new Date()});
renderAll(); if(activePatient===p.id) fillDrawer(p);
}
