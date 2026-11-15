




const TRIAGE_Q = [
{key:'eating',     label:'Eating Normally?',        normal:'yes'},
{key:'drinking',   label:'Drinking Normally?',      normal:'yes'},
{key:'vomiting',   label:'Vomiting?',               normal:'no',  note:true},
{key:'diarrhea',   label:'Diarrhea?',               normal:'no',  note:true},
{key:'urination',  label:'Normal Urination?',       normal:'yes'},
{key:'defecation', label:'Normal Defecation?',      normal:'yes'},
{key:'pain',       label:'Pain / Lameness?',        normal:'no',  note:true},
{key:'coughing',   label:'Coughing / Sneezing?',    normal:'no',  note:true},
{key:'collapse',   label:'Collapse?',               normal:'no',  note:true},
{key:'seizure',    label:'Seizures?',               normal:'no',  note:true},
{key:'dyspnea',    label:'Difficulty Breathing?',   normal:'no',  note:true},
{key:'toxin',      label:'Toxin Exposure?',         normal:'no',  note:true},
];
const TRIAGE_STATUS = {not_started:'Not started', in_progress:'In progress', complete:'Complete'};
function defaultIntake(){
const q={}, qnotes={}; TRIAGE_Q.forEach(x=>{q[x.key]=null; if(x.note)qnotes[x.key]='';});
return {status:'not_started', complaint:'', duration:'', history:'', medications:'', allergies:'', conditions:'', q, qnotes, notes:''};
}
function getIntake(p){ if(!p.intake) p.intake=defaultIntake(); return p.intake; }





const TRIAGE_VITALS = [
{key:'temp',   label:'Temperature',      unit:'°F',   fmt:fmtTemp},
{key:'hr',     label:'Heart rate',       unit:'bpm',  fmt:fmtHR},
{key:'rr',     label:'Respiratory rate', unit:'rpm',  fmt:fmtRR},
{key:'weight', label:'Weight',           unit:'kg',   fmt:fmtWeight},

];
const TRIAGE_ASSESS = [
{key:'mentation', label:'Mentation',        opts:['BAR','QAR','Dull','Obtunded','Stupor']},
{key:'mm',        label:'Mucous membranes', opts:['Pink','Pale Pink','Pale','White','Injected','Cyanotic']},
{key:'crt',       label:'Capillary refill time', fmt:fmtCRT, opts:['<2 sec','2 sec','>2 sec']},   /* same choices as Treatment Sheets' Vitals (V_OPTS) */

];
function defaultTriage(){ return {status:'not_started', vitals:{}, assess:{}, chief:[], history:'', by:'', at:''}; }
function getTriage(p){ if(!p.triage) p.triage=defaultTriage(); return p.triage; }
const TRIAGE_SHORT = {vomiting:'Vomiting',diarrhea:'Diarrhea',seizure:'Seizures',toxin:'Toxin exposure',coughing:'Coughing / sneezing',pain:'Pain / lameness',collapse:'Collapse',dyspnea:'Difficulty breathing'};
function summarizeIntake(k){
const parts=[];
Object.keys(TRIAGE_SHORT).forEach(key=>{ if(k.q[key]==='yes') parts.push(TRIAGE_SHORT[key]); });
parts.push((k.medications&&k.medications.trim())?k.medications.trim():'No medications');
if(k.q.eating==='no') parts.push('Appetite decreased'); else if(k.q.eating==='yes') parts.push('Eating normally');
return parts.slice(0,3).join(' • ') || (k.complaint ||'Intake recorded');
}
