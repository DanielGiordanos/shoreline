
const PRIO = {
1:{c:'var(--priority-p1)', t:'#fff',    l:'P1'},
2:{c:'var(--priority-p2)', t:'#1D1D1F', l:'P2'},
3:{c:'var(--priority-p3)', t:'#fff',    l:'P3'}
};
const PRIO_LABEL = {1:'Critical',2:'Urgent',3:'Stable'};


const now = new Date();
function mAgo(min){return new Date(now.getTime()-min*60000);}

let SEQ = 100;
function patient(o){
const n = SEQ++;
return Object.assign({
id:(window.crypto&&crypto.randomUUID)?crypto.randomUUID():('pt-'+Date.now().toString(36)+'-'+n), hid:'SH-'+(1042+(n-100)), tenant:TENANT_ID, tags:[], liaison:null, timeline:[], intake:null, careTeam:{assignments:[]}
}, o);
}


function tl(label, minAgo, meta){return {label, at:mAgo(minAgo), meta:meta||''};}

let PATIENTS = [];



const TENANT_ID = (function(){ try{ return (window.Pravix && Pravix.getCurrentHospital) ? (Pravix.getCurrentHospital().id||'shoreline') :'shoreline'; }catch(e){ return'shoreline'; } })();
