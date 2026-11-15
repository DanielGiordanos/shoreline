 
(function(root){
const zone='America/New_York';
function day(v){const d=new Date(v);if(!Number.isFinite(+d))return null;return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
function add(k,n){return new Date(Date.parse(k+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);}
function bounds(period,now=new Date()){const today=day(now);if(period==='today')return [today,add(today,1)];if(period==='week'){const dow=new Date(today+'T12:00:00Z').getUTCDay();return [add(today,-((dow+6)%7)),add(today,1)];}if(period==='month')return [today.slice(0,7)+'-01',add(today,1)];return [null,null];}
function aliases(staff){return new Set([staff.staffId,...(staff.flowIds||[])].filter(Boolean));}
function assignments(v){return (v.care_team?.assignments||[]).map(a=>({...a,staff_id:a.staff_id?.replace(/^manual:/,'')}));}
function positionRole(staff){const t=staff.title||'';if(/liaison/i.test(t))return'liaison';if(/technician|\btech\b|\bCVT\b|\bLVT\b|\bRVT\b/i.test(t))return'technician';if(!/coordinator|manager|administrat|assistant/i.test(t)&&(/veterinarian|surgeon|internist|neurologist|oncologist|criticalist|\bDVM\b|\bVMD\b/i.test(t)||staff.dept==='Interns'))return'veterinarian';return''; }
function roleMatches(a,role){if(!role)return true;if(role==='liaison')return a.role==='liaison'||a.staff_kind==='liaison';if(role==='technician')return a.role==='technician'&&a.staff_kind!=='liaison';if(role==='veterinarian')return ['veterinarian','primary','intern','supervising','consulting','covering'].includes(a.role)&&a.staff_kind!=='liaison';return a.role===role;}
function match(v,staff,period='active',role='',now=new Date()){
if(v._demo||v.tenant_id&&v.tenant_id!=='shoreline')return false;
const ids=aliases(staff),[from,to]=bounds(period,now);
return assignments(v).some(a=>{
if(!ids.has(a.staff_id)||!roleMatches(a,role))return false;
if(!['current','ended'].includes(a.status)||a.end_reason==='declined'||a.end_reason==='confirmed-into-primary')return false;
if(period==='active')return v.is_active===true&&a.status==='current'&&(!a.start_at||+new Date(a.start_at)<=+now)&&(!a.end_at||+new Date(a.end_at)>+now);
if(period==='all')return !a.start_at||+new Date(a.start_at)<=+now;
if(!a.start_at||+new Date(a.start_at)>+now)return false;
const start=day(a.start_at),end=a.end_at?day(a.end_at):(v.discharged_at?day(v.discharged_at):day(now));
return start&&end&&start<to&&end>=from;
});
}
function rows(visits,staff,period,role,now){const unique=new Map();visits.forEach(v=>{if(match(v,staff,period,role,now))unique.set(String(v.id),v);});return [...unique.values()];}
function summary(visits,staff,now){return Object.fromEntries(['active','today','week','month','all'].map(p=>[p,rows(visits,staff,p,'',now).length]));}
root.PravixActivity={day,bounds,match,rows,summary,aliases,positionRole};
if(typeof module!=='undefined')module.exports=root.PravixActivity;
})(typeof window==='undefined'?globalThis:window);