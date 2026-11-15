/* Pravix Flow — layers.js (n383). The scripts that followed the main script (assets/flow/app.js), up to where the Yakuri library loads.
   They sat inline in index.html, each in its own <script>. They are here in the order they ran, each as it was.
   A block that throws doesn't stop the ones after it: it runs inside try/catch and the error is thrown again on its own,
   so it still shows in the console. What a block declared for the whole page stays outside the try.
   After changing this file:  python3 _ci/seal_csp.py .   (it refreshes the ?v= in index.html) */

/* ━━━━━ 1 of 104 · no id ━━━━━ */
try{
window.PV3={"tenant":"shoreline","roster":[{"id":1,"staffId":"shoreline-staff-1","name":"Heather Galano","title":"Medical Director","dept":"Administration","initials":"HG","active":true,"flowIds":["heather-galano"]},{"id":2,"staffId":"shoreline-staff-2","name":"Daniel Giordano","title":"Graduate Veterinarian Program Coordinator","dept":"Administration","initials":"DG","active":true,"flowIds":["daniel-giordano"]},{"id":3,"staffId":"shoreline-staff-3","name":"Alexa Marucci","title":"Client Service Supervisor","dept":"Administration","initials":"AM","active":true,"flowIds":["alexa-marucci"]},{"id":4,"staffId":"shoreline-staff-4","name":"Alexandra Rimkus","title":"Liaison","dept":"Emergency Medicine","initials":"AR","active":true,"flowIds":["alexandra-rimkus"]},{"id":5,"staffId":"shoreline-staff-5","name":"Alexis Distasio","title":"Technician","dept":"Intensive Care Unit","initials":"AD","active":true,"flowIds":["alexis-distasio"]},{"id":6,"staffId":"shoreline-staff-6","name":"Allie Rodriguez","title":"Technician","dept":"Intensive Care Unit","initials":"AR","active":true,"flowIds":["allie-rodriguez"]},{"id":7,"staffId":"shoreline-staff-7","name":"Ally Tewksbury","title":"CVT, Technician","dept":"Oncology","initials":"AT","active":true,"flowIds":["ally-tewksbury"]},{"id":8,"staffId":"shoreline-staff-8","name":"Amanda Inzitari","title":"CVT, Technician","dept":"Oncology","initials":"AI","active":true,"flowIds":["amanda-inzitari"]},{"id":9,"staffId":"shoreline-staff-9","name":"Amanda Van Kuren","title":"Technician","dept":"Intensive Care Unit","initials":"AK","active":true,"flowIds":["amanda-van-kuren"]},{"id":10,"staffId":"shoreline-staff-10","name":"Amber Horvath","title":"CVT, Technician","dept":"Intensive Care Unit","initials":"AH","active":true,"flowIds":["amber-horvath"]},{"id":11,"staffId":"shoreline-staff-11","name":"Amber Koch","title":"Emergency Veterinarian","dept":"Emergency Medicine","initials":"AK","active":true,"flowIds":["amber-koch"]},{"id":12,"staffId":"shoreline-staff-12","name":"Angela Bulkley","title":"Liaison","dept":"Surgery","initials":"AB","active":true,"flowIds":["angela-bulkley"]},{"id":13,"staffId":"shoreline-staff-13","name":"Ann LeStrange","title":"Surgery Prep Assistant","dept":"Surgery","initials":"AL","active":true,"flowIds":["ann-lestrange"]},{"id":14,"staffId":"shoreline-staff-14","name":"Annie Downes","title":"Urgent Care Veterinarian","dept":"Urgent Care","initials":"AD","active":true,"flowIds":["annie-downes"]},{"id":15,"staffId":"shoreline-staff-15","name":"Anthony Roccisano","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"AR","active":true,"flowIds":["anthony-roccisano"]},{"id":16,"staffId":"shoreline-staff-16","name":"Ariana Phommarath","title":"Client Service Representative","dept":"Client Services","initials":"AP","active":true,"flowIds":["ariana-phommarath"]},{"id":17,"staffId":"shoreline-staff-17","name":"Bethany Oczkowski","title":"Triage Technician","dept":"Emergency Medicine","initials":"BO","active":true,"flowIds":["bethany-oczkowski"]},{"id":18,"staffId":"shoreline-staff-18","name":"Brandy Fellin","title":"Technician Supervisor","dept":"Administration","initials":"BF","active":true,"flowIds":["brandy-fellin"]},{"id":100,"staffId":"shoreline-staff-100","name":"Brian Reynoso","title":"Liaison","dept":"Emergency Medicine","initials":"BR","active":true,"flowIds":["brian-reynoso"]},{"id":19,"staffId":"shoreline-staff-19","name":"Carly Kudola","title":"CVT, Technician","dept":"Neurology","initials":"CK","active":true,"flowIds":["carly-kudola"]},{"id":20,"staffId":"shoreline-staff-20","name":"Cassandra Battaglino","title":"Client Service Representative","dept":"Client Services","initials":"CB","active":true,"flowIds":["cassandra-battaglino"]},{"id":21,"staffId":"shoreline-staff-21","name":"Catherine Fappiano","title":"Technician","dept":"Neurology","initials":"CF","active":true,"flowIds":["catherine-fappiano"]},{"id":22,"staffId":"shoreline-staff-22","name":"Chelsea Marko","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"CM","active":true,"flowIds":["chelsea-marko"]},{"id":23,"staffId":"shoreline-staff-23","name":"Chris Densky","title":"CVT, Technician","dept":"Internal Medicine","initials":"CD","active":true,"flowIds":["chris-densky"]},{"id":24,"staffId":"shoreline-staff-24","name":"Christina Rodriguez","title":"Technician Assistant","dept":"Emergency Medicine","initials":"CR","active":true,"flowIds":["christina-rodriguez"]},{"id":25,"staffId":"shoreline-staff-25","name":"Christine Fitzgerald","title":"Liaison","dept":"Surgery","initials":"CF","active":true,"flowIds":["christine-fitzgerald"]},{"id":26,"staffId":"shoreline-staff-26","name":"Courtney Thieke","title":"Technician","dept":"Intensive Care Unit","initials":"CT","active":true,"flowIds":["courtney-thieke"]},{"id":27,"staffId":"shoreline-staff-27","name":"Danelle Provost","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"DP","active":true,"flowIds":["danelle-provost"]},{"id":28,"staffId":"shoreline-staff-28","name":"Danielle Infante","title":"Hospital Assistant","dept":"Client Services","initials":"DI","active":true,"flowIds":["danielle-infante"]},{"id":29,"staffId":"shoreline-staff-29","name":"Danielle Kiley","title":"Technician","dept":"Internal Medicine","initials":"DK","active":true,"flowIds":["danielle-kiley"]},{"id":30,"staffId":"shoreline-staff-30","name":"Danielle Splawski","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"DS","active":true,"flowIds":["danielle-splawski"]},{"id":31,"staffId":"shoreline-staff-31","name":"Dawn Anderson","title":"Client Service Representative","dept":"Client Services","initials":"DA","active":true,"flowIds":["dawn-anderson"]},{"id":32,"staffId":"shoreline-staff-32","name":"Dawn Nolte","title":"Surgeon","dept":"Surgery","initials":"DN","active":true,"flowIds":["dawn-nolte"]},{"id":33,"staffId":"shoreline-staff-33","name":"Delahla Rosario","title":"Technician","dept":"Emergency Medicine","initials":"DR","active":true,"flowIds":["delahla-rosario"]},{"id":34,"staffId":"shoreline-staff-34","name":"Dharianna Villa","title":"Technician Assistant","dept":"Emergency Medicine","initials":"DV","active":true,"flowIds":["dharianna-villa"]},{"id":35,"staffId":"shoreline-staff-35","name":"Dianne Kittrell","title":"Internist","dept":"Internal Medicine","initials":"DK","active":true,"flowIds":["dianne-kittrell"]},{"id":36,"staffId":"shoreline-staff-36","name":"Elizabeth DeLauri","title":"Client Service Manager","dept":"Administration","initials":"ED","active":true,"flowIds":["elizabeth-delauri"]},{"id":37,"staffId":"shoreline-staff-37","name":"Erin Cummings","title":"Technician Assistant","dept":"Emergency Medicine","initials":"EC","active":true,"flowIds":["erin-cummings"]},{"id":38,"staffId":"shoreline-staff-38","name":"Felisha Barnes","title":"CVT, Technician","dept":"Intensive Care Unit","initials":"FB","active":true,"flowIds":["felisha-barnes"]},{"id":39,"staffId":"shoreline-staff-39","name":"Gabriella Palumbo","title":"Technician","dept":"Emergency Medicine","initials":"GP","active":true,"flowIds":["gabriella-palumbo"]},{"id":40,"staffId":"shoreline-staff-40","name":"Gabrielle Lungarini","title":"Technician","dept":"Neurology","initials":"GL","active":true,"flowIds":["gabrielle-lungarini"]},{"id":41,"staffId":"shoreline-staff-41","name":"Genesis Veloz","title":"Client Service Representative","dept":"Client Services","initials":"GV","active":true,"flowIds":["genesis-veloz"]},{"id":42,"staffId":"shoreline-staff-42","name":"Gregory Lalka","title":"Hospital Director","dept":"Administration","initials":"GL","active":true,"flowIds":["gregory-lalka"]},{"id":43,"staffId":"shoreline-staff-43","name":"Jamie Pinto","title":"Liaison","dept":"Internal Medicine","initials":"JP","active":true,"flowIds":["jamie-pinto"]},{"id":44,"staffId":"shoreline-staff-44","name":"Janitza Lopez","title":"Technician","dept":"Intensive Care Unit","initials":"JL","active":true,"flowIds":["janitza-lopez"]},{"id":45,"staffId":"shoreline-staff-45","name":"Jeffrey Sorraco","title":"Regional Referral Manager","dept":"Administration","initials":"JS","active":true,"flowIds":["jeffrey-sorraco"]},{"id":46,"staffId":"shoreline-staff-46","name":"Jessica Giannetto","title":"Surgeon","dept":"Surgery","initials":"JG","active":true,"flowIds":["jessica-giannetto"]},{"id":47,"staffId":"shoreline-staff-47","name":"Jordain Williams","title":"Technician","dept":"Emergency Medicine","initials":"JW","active":true,"flowIds":["jordain-williams"]},{"id":48,"staffId":"shoreline-staff-48","name":"Julie Humiston","title":"Office Manager","dept":"Administration","initials":"JH","active":true,"flowIds":["julie-humiston"]},{"id":49,"staffId":"shoreline-staff-49","name":"Kate Taikowski","title":"Oncologist","dept":"Oncology","initials":"KT","active":true,"flowIds":["kate-taikowski"]},{"id":50,"staffId":"shoreline-staff-50","name":"Kate Walsh","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"KW","active":true,"flowIds":["kate-walsh"]},{"id":51,"staffId":"shoreline-staff-51","name":"Kelley Harpin","title":"Emergency Veterinarian","dept":"Administration","initials":"KH2","active":true,"flowIds":["kelley-harpin"]},{"id":52,"staffId":"shoreline-staff-52","name":"Kimberly Hulme","title":"Technician Supervisor","dept":"Administration","initials":"KH","active":true,"flowIds":["kimberly-hulme"]},{"id":53,"staffId":"shoreline-staff-53","name":"Klaudia Polak","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"KP","active":true,"flowIds":["klaudia-polak"]},{"id":54,"staffId":"shoreline-staff-54","name":"Kristina Staff","title":"Hospital Manager","dept":"Administration","initials":"KS","active":true,"flowIds":["kristina-staff"]},{"id":55,"staffId":"shoreline-staff-55","name":"Larry Berkwitt","title":"Internist","dept":"Internal Medicine","initials":"LB","active":true,"flowIds":["larry-berkwitt"]},{"id":56,"staffId":"shoreline-staff-56","name":"Lauren Francione","title":"Technician","dept":"Intensive Care Unit","initials":"LF","active":true,"flowIds":["lauren-francione"]},{"id":57,"staffId":"shoreline-staff-57","name":"Lauren Whitney","title":"Triage Technician","dept":"Emergency Medicine","initials":"LW","active":true,"flowIds":["lauren-whitney"]},{"id":58,"staffId":"shoreline-staff-58","name":"Leah Bamford","title":"Liaison","dept":"Emergency Medicine","initials":"LB","active":true,"flowIds":["leah-bamford"]},{"id":59,"staffId":"shoreline-staff-59","name":"Leza Miller","title":"Client Service Representative","dept":"Client Services","initials":"LM","active":true,"flowIds":["leza-miller"]},{"id":60,"staffId":"shoreline-staff-60","name":"Lindsay Martin","title":"CVT, Technician","dept":"Administration","initials":"LM","active":true,"flowIds":["lindsay-martin"]},{"id":61,"staffId":"shoreline-staff-61","name":"Lizzy Dixon","title":"CVT, Technician","dept":"Intensive Care Unit","initials":"LD","active":true,"flowIds":["lizzy-dixon"]},{"id":62,"staffId":"shoreline-staff-62","name":"Louise Zona","title":"Client Service Representative","dept":"Client Services","initials":"LZ","active":true,"flowIds":["louise-zona"]},{"id":63,"staffId":"shoreline-staff-63","name":"Madison Roche","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"MR","active":true,"flowIds":["madison-roche"]},{"id":64,"staffId":"shoreline-staff-64","name":"Malachi Quinones","title":"Technician Assistant","dept":"Emergency Medicine","initials":"MQ","active":true,"flowIds":["malachi-quinones"]},{"id":65,"staffId":"shoreline-staff-65","name":"Malyssa Kubik","title":"Triage Technician","dept":"Emergency Medicine","initials":"MK","active":true,"flowIds":["malyssa-kubik"]},{"id":66,"staffId":"shoreline-staff-66","name":"Mara Kraenzlin","title":"Criticalist","dept":"Emergency Medicine","initials":"MK","active":true,"flowIds":["mara-kraenzlin"]},{"id":67,"staffId":"shoreline-staff-67","name":"Marissa Marinaccio","title":"Emergency Veterinarian","dept":"Emergency Medicine","initials":"MM2","active":true,"flowIds":["marissa-marinaccio"]},{"id":68,"staffId":"shoreline-staff-68","name":"Mary Dunn","title":"Client Service Representative","dept":"Client Services","initials":"MD","active":true,"flowIds":["mary-dunn"]},{"id":69,"staffId":"shoreline-staff-69","name":"Melissa Hamilton","title":"Liaison","dept":"Emergency Medicine","initials":"MH","active":true,"flowIds":["melissa-hamilton"]},{"id":70,"staffId":"shoreline-staff-70","name":"Michael McCann","title":"Emergency Veterinarian","dept":"Emergency Medicine","initials":"MM","active":true,"flowIds":["michael-mccann"]},{"id":71,"staffId":"shoreline-staff-71","name":"Miranda Stone","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"MS","active":true,"flowIds":["miranda-stone"]},{"id":72,"staffId":"shoreline-staff-72","name":"Morgan Vrana","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"MV","active":true,"flowIds":["morgan-vrana"]},{"id":73,"staffId":"shoreline-staff-73","name":"Myranda May","title":"Technician","dept":"Surgery","initials":"MM","active":true,"flowIds":["myranda-may"]},{"id":74,"staffId":"shoreline-staff-74","name":"Nelson Diaz","title":"Hospital Assistant","dept":"Client Services","initials":"ND","active":true,"flowIds":["nelson-diaz"]},{"id":75,"staffId":"shoreline-staff-75","name":"Nyla Chase","title":"Liaison","dept":"Oncology","initials":"NC","active":true,"flowIds":["nyla-chase"]},{"id":76,"staffId":"shoreline-staff-76","name":"Paola Velazquez","title":"Technician","dept":"Intensive Care Unit","initials":"PV","active":true,"flowIds":["paola-velazquez"]},{"id":77,"staffId":"shoreline-staff-77","name":"Rachel Pieger","title":"Assistant Technician Supervisor","dept":"Administration","initials":"RP","active":true,"flowIds":["rachel-pieger"]},{"id":78,"staffId":"shoreline-staff-78","name":"Rhiannon Cappannelli","title":"Liaison","dept":"Surgery","initials":"RC","active":true,"flowIds":["rhiannon-cappannelli"]},{"id":79,"staffId":"shoreline-staff-79","name":"Sam Mitchell","title":"Technician","dept":"Intensive Care Unit","initials":"SM","active":true,"flowIds":["sam-mitchell"]},{"id":80,"staffId":"shoreline-staff-80","name":"Samantha Corrado","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"SC","active":true,"flowIds":["samantha-corrado"]},{"id":81,"staffId":"shoreline-staff-81","name":"Sara Devitto","title":"Liaison","dept":"Emergency Medicine","initials":"SD","active":true,"flowIds":["sara-devitto"]},{"id":82,"staffId":"shoreline-staff-82","name":"Sarah Schiff","title":"Emergency Veterinarian","dept":"Emergency Medicine","initials":"SS","active":true,"flowIds":["sarah-schiff"]},{"id":83,"staffId":"shoreline-staff-83","name":"Shaylan Meyer","title":"Criticalist","dept":"Emergency Medicine","initials":"SM","active":true,"flowIds":["shaylan-meyer"]},{"id":84,"staffId":"shoreline-staff-84","name":"Shelsey Vega","title":"Technician","dept":"Emergency Medicine","initials":"SV","active":true,"flowIds":["shelsey-vega"]},{"id":85,"staffId":"shoreline-staff-85","name":"Stacey Smith","title":"Technician","dept":"Emergency Medicine","initials":"SS","active":true,"flowIds":["stacey-smith"]},{"id":86,"staffId":"shoreline-staff-86","name":"Stephanie Bamford","title":"Liaison","dept":"Emergency Medicine","initials":"SB","active":true,"flowIds":["stephanie-bamford"]},{"id":87,"staffId":"shoreline-staff-87","name":"Stephanie Cseh","title":"Head Purchaser","dept":"Administration","initials":"SC","active":true,"flowIds":["stephanie-cseh"]},{"id":88,"staffId":"shoreline-staff-88","name":"Tammy Guinto","title":"Liaison","dept":"Neurology","initials":"TG","active":true,"flowIds":["tammy-guinto"]},{"id":89,"staffId":"shoreline-staff-89","name":"Tanneil Buchanan","title":"Technician","dept":"Emergency Medicine","initials":"TB","active":true,"flowIds":["tanneil-buchanan"]},{"id":90,"staffId":"shoreline-staff-90","name":"Tara Fowler","title":"Relief Veterinarian","dept":"Emergency Medicine","initials":"TF","active":true,"flowIds":["tara-fowler"]},{"id":91,"staffId":"shoreline-staff-91","name":"Vanessa Ruiz","title":"Technician","dept":"Intensive Care Unit","initials":"VR","active":true,"flowIds":["vanessa-ruiz"]},{"id":92,"staffId":"shoreline-staff-92","name":"Viviana Fonseca","title":"Technician","dept":"Intensive Care Unit","initials":"VF","active":true,"flowIds":["viviana-fonseca"]},{"id":93,"staffId":"shoreline-staff-93","name":"Jordan Hanson","title":"Graduate Veterinarian Intern","dept":"Interns","initials":"JH2","active":true,"flowIds":["jordan-hanson"]},{"id":94,"staffId":"shoreline-staff-94","name":"Alexa Vander Ploeg","title":"Graduate Veterinarian Intern","dept":"Interns","initials":"AV","active":true,"flowIds":["alexa-vander-ploeg"]},{"id":95,"staffId":"shoreline-staff-95","name":"Rachel Eberle","title":"Graduate Veterinarian Intern","dept":"Interns","initials":"RE","active":true,"flowIds":["rachel-eberle"]},{"id":96,"staffId":"shoreline-staff-96","name":"Marissa Peck","title":"Graduate Veterinarian Intern","dept":"Interns","initials":"MP","active":true,"flowIds":["marissa-peck"]},{"id":97,"staffId":"shoreline-staff-97","name":"Benjamin Kerns","title":"Graduate Veterinarian Intern","dept":"Interns","initials":"BK","active":true,"flowIds":["benjamin-kerns"]},{"id":98,"staffId":"shoreline-staff-98","name":"Kristi Wenger","title":"Graduate Veterinarian Intern","dept":"Interns","initials":"KW","active":true,"flowIds":["kristen-wenger"]},{"id":99,"staffId":"shoreline-staff-99","name":"Sarah Herron","title":"Graduate Veterinarian Intern","dept":"Interns","initials":"SH","active":true,"flowIds":["sarah-herron"]}],"firebase":{"apiKey":"AIzaSyCf8iXW_wWRLvHi1G4YnYRH-iLpaDufZQE","authDomain":"shoreline-flow.firebaseapp.com","projectId":"shoreline-flow","storageBucket":"shoreline-flow.firebasestorage.app","messagingSenderId":"237404385636","appId":"1:237404385636:web:1ee3ba27f22c946f748a71"}};
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 2 of 104 · no id ━━━━━ */
try{
 
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
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 3 of 104 · no id ━━━━━ */
try{
(function(){
const X=window.PV3,A=PravixActivity;let roster=X.roster,rosterStatus='Showing the saved Directory list — live updates aren’t connected',stopRoster=null,stopHistory=null,sharedHistory=[],historyLive=false;
const q=new URLSearchParams(location.search);let staffFilter=q.get('staff')||'',period=q.get('period')||'active',roleFilter=q.get('role')||'';
if(!['active','today','week','month','all'].includes(period))period='active';
CT_ROLES.splice(2,0,{id:'intern',label:'Intern',missing:'No intern assigned'});CT_KIND_LABEL.directory='Directory staff';CT_KIND_LABEL.intern='Intern';
CARE_TEAM_CONFIG.directoryUrl=new URL('Directory.integrated.html',location.href).href;
pvxWrap('ctRoster',function(oldRoster){ return function(){const out=oldRoster();roster.filter(e=>e.active!==false).forEach(e=>{if(!out.some(x=>x.id===e.staffId))out.push({id:e.staffId,name:e.name,kind:e.dept==='Interns'?'intern':'directory',initials:e.initials||docInitials(e.name),color:'var(--accent)'});});return out;}; },'#3');
function currentStaff(p,r){return ctCurrent(p,r)[0]?.staffId||'';}
function canAssign(p){return (typeof Backend!=='undefined'&&Backend.mode==='staff')||(q.get('fixtures')==='1'&&p?._demo===true);}
function isSupervisor(e){const title=e.title||'';return e.dept!=='Interns'&&!/coordinator|technician|liaison|assistant|manager|administrat|client/i.test(title)&&/veterinarian|surgeon|internist|neurologist|oncologist|criticalist|\bDVM\b|\bVMD\b/i.test(title);}
function options(p,r){const chosen=currentStaff(p,r);const entries=roster.filter(e=>e.active!==false&&(r==='intern'?e.dept==='Interns':isSupervisor(e)));return'<option value="">'+(r==='intern'?'No intern assigned':'No supervising doctor assigned')+'</option>'+entries.map(e=>`<option value="${ctEsc(e.staffId)}" ${chosen===e.staffId?'selected':''}>${ctEsc(e.name)} · ${ctEsc(e.dept)}</option>`).join('')+(chosen&&!entries.some(e=>e.staffId===chosen)?`<option value="${ctEsc(chosen)}" selected>Current: ${ctEsc(ctCurrent(p,r)[0].staffName)} (not in active roster)</option>`:'');}
function mount(p){let el=document.getElementById('pv-intern');if(!el){el=document.createElement('section');el.id='pv-intern';el.className='pv-assignment';document.getElementById('careTeamMount')?.before(el);}const disabled=!canAssign(p);el.innerHTML=`<label for="pv-intern-select">Intern</label><select class="pv-input" id="pv-intern-select" ${disabled?'disabled':''}>${options(p,'intern')}</select><label for="pv-supervisor-select">Supervising doctor</label><select class="pv-input" id="pv-supervisor-select" ${disabled?'disabled':''}>${options(p,'supervising')}</select><p class="pv-note">${ctEsc(rosterStatus)}. Choose the supervisor here; it isn’t taken from the manager or the shift.</p>${currentStaff(p,'intern')&&!currentStaff(p,'supervising')?'<p role="status">Supervisor assignment needed for this intern’s case.</p>':''}<button class="pv-btn" type="button" id="pv-history">See history or hand off…</button>`;el.querySelector('#pv-intern-select').onchange=e=>assign(p,'intern',e.target.value);el.querySelector('#pv-supervisor-select').onchange=e=>assign(p,'supervising',e.target.value);el.querySelector('#pv-history').onclick=()=>openCareTeam(p.id);}
function assign(p,r,id){if(!canAssign(p))return;if(id===currentStaff(p,r))return;if(!id){ctCurrent(p,r).slice().forEach(a=>ctEnd(p,a.id));mount(p);return;}const e=roster.find(e=>e.staffId===id&&e.active!==false);if(!e)return;if(r==='intern'&&e.dept!=='Interns')return;if(r==='supervising'&&!isSupervisor(e))return;ctAssign(p,r,ctStaff(id),{});}
pvxWrap('fillDrawer',function(oldFill){ return function(p){oldFill(p);mount(p);}; },'#3');

pvxWrap('ctTouch',function(oldTouch){ return function(a){oldTouch(a);if(typeof AUTH!=='undefined'&&AUTH?.currentUser)a.actorUid=AUTH.currentUser.uid;}; },'#3');
pvxWrap('ctAssign',function(oldAssign){ return function(p,r,s,o){if(r==='intern'&&!roster.some(e=>e.staffId===s.id&&e.dept==='Interns'&&e.active!==false)){toast('Choose an active intern from Directory');return null;}const a=oldAssign(p,r,s,o);if(a&&AUTH?.currentUser){a.actorUid=AUTH.currentUser.uid;renderAll();}return a;}; },'#3');

pvxWrap('ctFormHTML',function(oldForm){ return function(p,r){let html=oldForm(p,r);if(r==='intern'){html=html.replace(/<select id="ctFormWho"[^>]*>[\s\S]*?<\/select>/,`<select id="ctFormWho">${roster.filter(e=>e.dept==='Interns'&&e.active!==false).map(e=>`<option value="${ctEsc(e.staffId)}">${ctEsc(e.name)}</option>`).join('')}</select>`);}return html;}; },'#3');
function asVisit(p){return {...mapToDb(p),_demo:!!p._demo};}
function selected(){return roster.find(e=>e.staffId===staffFilter||(e.flowIds||[]).includes(staffFilter));}
pvxWrap('filtered',function(oldFiltered){ return function(){const all=oldFiltered();if(!staffFilter)return all;const e=selected();if(!e)return [];return all.filter(p=>A.match(asVisit(p),e,period,roleFilter));}; },'#3');
const banner=document.createElement('section');banner.className='pv-connect';banner.id='pv-flow-filter';banner.hidden=!staffFilter;(document.querySelector('.subnav')||document.querySelector('.topnav'))?.after(banner);
function drawFilter(){banner.hidden=!staffFilter;if(!staffFilter)return;const e=selected();const history=e&&historyLive?A.rows(sharedHistory,e,period,roleFilter):[];banner.innerHTML=`<strong>${e?ctEsc(e.name):'Unknown staff profile'} · ${ctEsc(period)} assignments ${roleFilter?'· '+ctEsc(roleFilter):''}</strong><p class="pv-note">Active board filtered by explicit assignment. ${historyLive?'Retained encounter history loaded.':'Historical log unavailable until connected.'} Counts describe assignments, not care intensity.</p><button class="pv-btn" id="pv-clear">Clear staff filter</button><div class="pv-log">${history.map(v=>`<button class="pv-btn" data-visit="${ctEsc(v.id)}">${ctEsc(v.patient_name||'Patient')} · ${ctEsc(v.visit_code||v.id)}</button>`).join('')}</div>`;banner.querySelector('#pv-clear').onclick=()=>{staffFilter='';const u=new URL(location.href);['staff','period','role','patient'].forEach(k=>u.searchParams.delete(k));window.history.replaceState({},'',u);banner.hidden=true;renderAll();};banner.querySelectorAll('[data-visit]').forEach(b=>b.onclick=()=>openEncounter(b.dataset.visit));}
function openEncounter(id){const existing=PATIENTS.find(p=>String(p.id)===String(id));if(existing){openDrawer(existing.id);return;}const v=sharedHistory.find(v=>String(v.id)===String(id));if(!v)return;let log=document.getElementById('pv-history-detail');if(!log){log=document.createElement('details');log.id='pv-history-detail';log.className='pv-assignment';banner.appendChild(log);}log.open=true;log.innerHTML=`<summary>${ctEsc(v.patient_name||'Patient')} · Historical assignment log</summary><p class="pv-note">Read-only retained encounter. Not added to the active census.</p>`+(v.care_team?.assignments||[]).map(a=>`<p>${ctEsc(a.staff_name)} · ${ctEsc(a.role)} · ${ctEsc(a.status)}<br><small>${ctEsc(a.start_at||'Start unknown')} → ${ctEsc(a.end_at||'No end recorded')} · ${ctEsc(a.updated_by||'Actor unknown')}</small></p>`).join('');}
if(AUTH)AUTH.onAuthStateChanged(async user=>{if(stopRoster)stopRoster();if(stopHistory)stopHistory();sharedHistory=[];historyLive=false;roster=X.roster;rosterStatus='Showing the saved Directory list — live updates aren’t connected';drawFilter();if(!user)return;try{const token=await user.getIdTokenResult();if(AUTH.currentUser?.uid!==user.uid)return;if(token.claims.tenant_id!=='shoreline'){rosterStatus='The shared Directory list needs Shoreline access';return;}}catch(e){return;}stopRoster=DB.doc('tenants/shoreline/directory/roster').onSnapshot({includeMetadataChanges:true},s=>{if(s.exists){roster=s.data().records;rosterStatus=s.metadata.fromCache?'Showing the last saved Directory list — it may be out of date':'Directory list is up to date';}else rosterStatus='Showing the saved Directory list — the shared list isn’t set up yet';drawFilter();renderAll();if(activePatient){const p=PATIENTS.find(p=>p.id===activePatient);if(p)mount(p);}},()=>{rosterStatus='Showing the saved Directory list — the shared list needs access set up';if(activePatient){const p=PATIENTS.find(p=>p.id===activePatient);if(p)mount(p);}});if(staffFilter)stopHistory=DB.collection('visits').where('tenant_id','==','shoreline').onSnapshot({includeMetadataChanges:true},s=>{sharedHistory=s.docs.map(d=>({...d.data(),id:d.id}));historyLive=!s.metadata.fromCache;drawFilter();if(q.get('patient'))openEncounter(q.get('patient'));},()=>{historyLive=false;drawFilter();});});
drawFilter();window.PVFlow={getRoster:()=>roster,mount,assign,openEncounter};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 4 of 104 · luna-alert-bundled ━━━━━ */
try{
(() => {
const alertBody = document.getElementById('alertBody');
if (!alertBody) return;

const overlay = document.createElement('div');
overlay.className ='luna-announcement';
overlay.id ='lunaAnnouncement';
overlay.hidden = true;
overlay.setAttribute('role','dialog');
overlay.setAttribute('aria-modal','true');
overlay.setAttribute('aria-label','Luna’s diversion announcement');
overlay.innerHTML ='<div class="luna-announcement-backdrop"></div>'+
'<div class="luna-announcement-scene">'+
'<iframe title="Luna speaking" allow="autoplay" allowtransparency="true" tabindex="-1"></iframe>'+
'<div class="luna-announcement-error" hidden>Tap to hear Luna’s announcement.<button type="button">Play audio</button></div></div>';
document.body.appendChild(overlay);

const iframe = overlay.querySelector('iframe');
const error = overlay.querySelector('.luna-announcement-error');
const channel = typeof BroadcastChannel ==='function'? new BroadcastChannel('pravix-luna-diversion-'+ TENANT_ID) : null;
const startedAt = Date.now();
let ready = false;
let loading = false;
let pending = false;
let seenRequest = null;
let closeTimer;
let previousOverflow ='';

function isClientDisplay() {
return currentView ==='client'&& currentApp ==='flow'&& document.body.classList.contains('client-mode');
}

function isDiversion(alert) {
return !!(alert && alert.active && alert.type ==='diversion'&& alert.show_client !== false);
}

function ensureAction() {
if (!document.getElementById('alertModal').classList.contains('open')) return;
if (isClientDisplay() || !isDiversion(currentAlert) || alertModalMode !=='view') return;
if (alertBody.querySelector('[data-luna-announcement]')) return;
const action = document.createElement('div');
action.className ='luna-alert-action';
action.innerHTML ='<button type="button" data-luna-announcement><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>Announce with Luna on Client Display</button>'+
'<p>Plays on connected Client Displays only. The staff page stays here.</p>';
alertBody.appendChild(action);
action.querySelector('button').addEventListener('click', sendRequest);
}

new MutationObserver(ensureAction).observe(alertBody, { childList: true });

async function sendRequest(event) {
if (isClientDisplay() || !isDiversion(currentAlert)) return;
const button = event.currentTarget;
button.disabled = true;
const request = { id: (window.crypto?.randomUUID?.() || Date.now() +'-'+ Math.random().toString(36).slice(2)), at: Date.now() };
if (DB && Backend.mode ==='staff') {
try {
await DB.collection('alerts').doc(TENANT_ID).update({ announcement_request: request });
} catch {
button.disabled = false;
toast('Couldn’t reach the Client Display — try again');
return;
}
} else if (channel) {
channel.postMessage(request);
} else {
button.disabled = false;
toast('Can’t reach the Client Display — check the connection');
return;
}
closeAlertModal();
notify('Luna announcement requested','The connected Client Display will begin playback', { icon:'info', color:'var(--accent)'});
}

function prepare() {
if (loading) return;
loading = true;
iframe.src ='luna-orb.html?announcement=1&v=20260918-recording-sync';
window.setTimeout(() => { if (!ready && !overlay.hidden) { loading = false; error.hidden = false; } }, 8000);
}

function tellLuna(type) {
if (!iframe.contentWindow) return;
const url = new URL(iframe.src, location.href);
iframe.contentWindow.postMessage({ type }, url.protocol ==='file:'?'*': url.origin);
}

function play() {
error.hidden = true;
try { tellLuna('luna-announcement-play'); }
catch { error.hidden = false; }
}

function show() {
if (!isClientDisplay()) return;
clearTimeout(closeTimer);
previousOverflow = document.body.style.overflow;
document.body.style.overflow ='hidden';
overlay.hidden = false;
requestAnimationFrame(() => overlay.classList.add('open'));
if (ready) play();
else { pending = true; prepare(); }
}

function close() {
clearTimeout(closeTimer);
pending = false;
try { tellLuna('luna-announcement-stop'); } catch {}
overlay.classList.remove('open');
document.body.style.overflow = previousOverflow;
const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
closeTimer = setTimeout(() => { overlay.hidden = true; }, duration);
}

function receive(request) {
if (!isClientDisplay() || !isDiversion(currentAlert) || !request?.id || request.id === seenRequest) return;
seenRequest = request.id;
const at = Number(request.at), age = Date.now() - at;
if (!Number.isFinite(age) || age > 15000 || age < -5000 || at < startedAt - 1000) return;
show();
}

window.LunaAnnouncement = Object.freeze({ onAlert(alert) {
if (isClientDisplay()) {
prepare();
if (!isDiversion(alert)) { if (!overlay.hidden) close(); return; }
receive(alert.announcement_request);
} else if (!overlay.hidden) close();
} });
if (channel) channel.onmessage = event => receive(event.data);
overlay.querySelector('.luna-announcement-backdrop').addEventListener('click', () => { if (!document.body.classList.contains('tv-mode')) close(); });
error.querySelector('button').addEventListener('click', play);
document.addEventListener('keydown', event => {
if (event.key ==='Escape'&& !overlay.hidden) { event.preventDefault(); close(); }
});
window.addEventListener('message', event => {
if (event.source !== iframe.contentWindow) return;
if (location.protocol !=='file:'&& event.origin !== location.origin) return;
if (event.data?.type ==='luna-announcement-ready') {
ready = true;
if (pending && !overlay.hidden) { pending = false; play(); }
return;
}
if (overlay.hidden) return;
if (event.data?.type ==='luna-announcement-close') close();
if (event.data?.type ==='luna-announcement-ended') closeTimer = setTimeout(close, 850);
if (event.data?.type ==='luna-announcement-error') error.hidden = false;
});
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 5 of 104 · no id ━━━━━ */
try{
/* Critical Patient alert. One banner, one sound. Shows on every staff screen while an
   active P1 patient has no doctor and nobody has taken the case. Take Case picks a doctor
   from Today's Shift Assignments. Never shown or heard on the client display. */
(function(){
var lastTry=0, BOOT=Date.now(), announced=new Set(), shownIds=[], localTaken=new Set(), audioCtx=null, tickT=null;
var doneMsg=null, doneT=null, lastSig='', pickFor=null, showAll=false, phase='hidden', token=0, firstSeen=new Map(), reminded=new Set(), lastTake=null;
var REDUCE=false; try{ REDUCE=window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){}
var PILL_W=132, PILL_H=36;
var ECG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2.5-6 4 12 2.5-6h5"/></svg>';
var CHECK='<svg class="ci-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

function box(){var n=document.getElementById('critIsland');if(!n){n=document.createElement('div');n.id='critIsland';n.setAttribute('role','alert');n.setAttribute('aria-live','assertive');n.innerHTML='<span class="ci-seed" aria-hidden="true"></span><div class="ci-inner"></div>';document.body.appendChild(n);}return n;}
function inner(){return box().querySelector('.ci-inner');}
function pts(){try{return PATIENTS||[];}catch(e){return [];}}
function byId(id){return pts().find(function(x){return x.id===id;});}
function onTV(){try{ if(document.body.classList.contains('client-mode')) return true; return (typeof currentView!=='undefined' && currentView==='client'); }catch(e){return false;}}
function takenEntry(p){var t=p&&p.timeline;if(!t||!t.length)return null;for(var i=t.length-1;i>=0;i--){if(!t[i])continue;if(t[i].label==='Critical take undone')return null;if(t[i].label==='Critical case taken')return t[i];}return null;}
function docName(id){try{var d=DOCTORS.find(function(x){return x.id===id;});return d?d.name:'';}catch(e){return '';}}
function takenBy(p){if(p.critTakenBy)return p.critTakenBy;var e=takenEntry(p);if(e)return e.meta||'Staff';return (p.doctor&&p.doctor!=='unassigned')?docName(p.doctor):'';}
function untaken(p){try{return !!p && isActive(p) && Number(p.prio)===1 && !p.critTakenAt && !takenEntry(p) && (!p.doctor||p.doctor==='unassigned');}catch(e){return false;}}
function list(){return pts().filter(untaken).sort(function(a,b){return (new Date(a.arrival||0))-(new Date(b.arrival||0));});}
function me(){try{return CURRENT_USER||'Staff';}catch(e){return 'Staff';}}

/* sound */
function soundOn(){return !!(audioCtx&&audioCtx.state==='running');}
function wasActive(){try{return !!(navigator.userActivation&&navigator.userActivation.hasBeenActive);}catch(e){return false;}}
function unlock(){
  /* Browsers allow sound only after someone interacts with the page. Any click or key re-arms it,
     and a context the browser left suspended is replaced with a fresh one. */
  try{ var AC=window.AudioContext||window.webkitAudioContext; if(!AC) return;
    if(audioCtx&&audioCtx.state==='running') return;
    if(audioCtx){ try{ audioCtx.onstatechange=null; audioCtx.close(); }catch(e){} }
    audioCtx=new AC();
    audioCtx.onstatechange=function(){ lastSig=''; try{ window.renderCritAlert(); }catch(e){} };
    if(audioCtx.state!=='running'){ var pr=audioCtx.resume(); if(pr&&pr.then) pr.then(function(){ lastSig=''; window.renderCritAlert(); }).catch(function(){}); }
    lastSig='';
  }catch(e){}
}
['pointerdown','mousedown','click','keydown','touchstart'].forEach(function(t){document.addEventListener(t,function(){ unlock(); try{ window.renderCritAlert(); }catch(e){} },true);});
function chime(){
  if(!soundOn()&&wasActive()) unlock();
  if(!soundOn()) return;
  try{ var t0=audioCtx.currentTime+.03;
    [[659.25,0],[880,.17],[659.25,.55],[880,.72]].forEach(function(n){
      var o=audioCtx.createOscillator(), g=audioCtx.createGain(), t=t0+n[1];
      o.type='sine'; o.frequency.value=n[0];
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.22,t+.02); g.gain.exponentialRampToValueAtTime(.0001,t+.16);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+.18);
    });
  }catch(e){}
}

function softChime(){
  try{ if(localStorage.getItem('pvx:sound:reminder')==='off') return; }catch(e){}   /* PVX-N197: Operations > Reminder chime */
  if(!soundOn()&&wasActive()) unlock();
  if(!soundOn()) return;
  try{ var t0=audioCtx.currentTime+.03;
    [[587.33,0],[783.99,.2]].forEach(function(n){
      var o=audioCtx.createOscillator(), g=audioCtx.createGain(), t=t0+n[1];
      o.type='sine'; o.frequency.value=n[0];
      g.gain.setValueAtTime(.0001,t); g.gain.exponentialRampToValueAtTime(.12,t+.03); g.gain.exponentialRampToValueAtTime(.0001,t+.3);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+.32);
    });
  }catch(e){}
}

/* today's shift doctors */
function shiftDoctors(){
  var out=[];
  try{ SHIFTS.forEach(function(s){ var id=shiftAssign[s.key]; if(!id||id==='unassigned'||id==='relief') return;
      var d=DOCTORS.find(function(x){return x.id===id;}); if(!d) return;
      var hit=out.find(function(o){return o.d.id===id;});
      if(hit) hit.shifts.push(s); else out.push({d:d,shifts:[s]}); }); }catch(e){}
  return out;
}
function patientCount(id){var n=0;try{n=activeCountForDoctor(id);}catch(e){} return n===0?'No patients':(n===1?'1 patient':n+' patients');}
function initials(n){return String(n||'').split(/\s+/).map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();}
function docBtn(d,shifts,dl){
  var col=shifts&&shifts.length?shifts[0].color:(d.baseColor||d.color||'#5C5E62');
  var sub=(shifts&&shifts.length?shifts.map(function(s){return s.label;}).join(' + ')+' · ':'')+patientCount(d.id);
  return '<button class="ci-doc ci-s" style="--d:'+dl+'s" type="button" data-doc="'+pvxEsc(d.id)+'"><span class="ci-av" style="background:'+pvxEsc(col)+'">'+pvxEsc(initials(d.name))+'</span><span><b>'+pvxEsc(d.name)+'</b><small>'+pvxEsc(sub)+'</small></span></button>';
}

/* view html */
function dur(ms){var s=Math.max(0,Math.round(ms/1000));if(s>=3600){var h=Math.floor(s/3600),m=Math.floor((s%3600)/60);return h+'h '+String(m).padStart(2,'0')+'m';}return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function mmss(ms){var s=Math.max(0,Math.floor(ms/1000));if(s>=3600)return Math.floor(s/3600)+':'+String(Math.floor(s%3600/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
function arrMs(p){var t=new Date(p.arrival).getTime();return isFinite(t)?t:null;}
function sig(p){var sp='';try{sp=(typeof speciesEnglish==='function'?speciesEnglish(p.species):p.species)||'';}catch(e){sp=p.species||'';} var age='';try{age=formatPatientAge(p)||'';}catch(e){} return [sp,age].filter(Boolean).join(' ');}
function resus(p){try{return normalizeResusPref(p.resusPref);}catch(e){return '';}}
function alertHTML(p,more){
  var loc=(p.room&&p.room!=='Lobby')?p.room:'Lobby', a=arrMs(p), r=resus(p), g=sig(p);
  var h='<div class="ci-row"><div class="ci-ic ci-s" style="--d:.02s">'+ECG+'</div>'
   +'<button class="ci-main ci-s" style="--d:.07s" type="button" data-open="'+pvxEsc(p.id)+'" aria-label="Open '+pvxEsc(p.name)+'">'
   +'<span class="ci-kicker">Critical patient · '+pvxEsc(loc)+'</span>'
   +'<span class="ci-name">'+pvxEsc(p.name||'Unnamed patient')+(g?' <span class="ci-sig">'+pvxEsc(g)+'</span>':'')+'</span>'
   +'<span class="ci-meta">'+(a?'<span class="ci-wait" data-arr="'+a+'">Waiting '+mmss(Date.now()-a)+'</span>':'Just arrived')+(p.reason?', '+pvxEsc(p.reason):'')+'</span></button>'
   +(r?'<span class="ci-tag ci-s" style="--d:.11s">'.replace('ci-tag','ci-tag '+(r==='DNR'?'dnr':'cpr'))+r+'</span>':'')
   +(more>0?'<span class="ci-more ci-s" style="--d:.12s">+'+more+' more</span>':'')
   +(pickFor===p.id?'':'<button class="ci-take ci-s" style="--d:.14s" type="button" data-take="'+pvxEsc(p.id)+'">Take case</button>')+'</div>';
  if(pickFor===p.id){
    var on=shiftDoctors(), rest;
    try{ rest=DOCTORS.filter(function(d){return !on.some(function(o){return o.d.id===d.id;});}); }catch(e){ rest=[]; }
    h+='<div class="ci-pick">'+(on.length?'':'<div class="ci-pick-h ci-s" style="--d:.05s"><span>Shifts haven\'t been set today. Choose the doctor taking '+pvxEsc(p.name)+'.</span></div>');
    var grid=on.length?on:rest.map(function(d){return {d:d,shifts:[]};});
    h+='<div class="ci-docs">'+grid.map(function(o,i){return docBtn(o.d,o.shifts,(.08+i*.035).toFixed(3));}).join('')+'</div>';
    if(on.length&&rest.length&&showAll){ h+='<div class="ci-all"><div class="ci-docs">'+rest.map(function(d,i){return docBtn(d,[],(.03+i*.02).toFixed(3));}).join('')+'</div></div>'; }
    h+='<div class="ci-foot ci-s" style="--d:.16s">'+(on.length&&rest.length?'<button class="ci-link" type="button" data-all="1">'+(showAll?'Hide other doctors':'Another doctor')+'</button>':'<span></span>')+(on.length?'<span class="ci-keys">'+(on.length>1?'Press 1 to '+Math.min(9,on.length):'Press 1')+'</span>':'')+'<button class="ci-link" type="button" data-cancel="1">Cancel</button></div></div>';
  } else if(!soundOn()){
    h+='<div class="ci-hint ci-s" style="--d:.18s">Sound is off on this screen. '+(matchMedia('(pointer:coarse)').matches?'Tap':'Click')+' anywhere in Flow to turn it on.</div>';
  }
  return h;
}
function takenHTML(){
  return '<div class="ci-row"><div class="ci-ic ci-s" style="--d:0s">'+CHECK+'</div><div class="ci-main ci-s" style="--d:.06s;cursor:default">'
   +'<span class="ci-kicker">Case Taken</span><span class="ci-name">'+pvxEsc(doneMsg.name)+' · '+pvxEsc(doneMsg.doc)+'</span>'
   +'<span class="ci-meta">'+(doneMsg.took!=null?'Taken in '+dur(doneMsg.took):'Just now')+(doneMsg.by?' · by '+pvxEsc(doneMsg.by):'')+'</span></div>'
   +'<button class="ci-link ci-undo ci-s" style="--d:.12s" type="button" data-undo="1">Undo</button></div>';
}

/* island motion: pill -> expand -> content in; content out -> pill -> gone */
function targetW(){return Math.max(PILL_W,Math.min(660,(window.innerWidth||800)-24));}
function measure(){var b=box();b.style.setProperty('--ci-w',targetW()+'px');return Math.max(PILL_H,inner().offsetHeight);}
function size(w,h){var b=box();b.style.width=w+'px';b.style.height=h+'px';}
function later(ms,fn){var t=token;setTimeout(function(){ if(t===token) fn(); }, REDUCE?0:ms);}
function show(html,taken){
  var b=box(); token++;
  b.classList.toggle('taken',!!taken);
  if(phase==='hidden'||phase==='closing'){
    phase='opening';
    inner().innerHTML=html; wire();
    b.classList.remove('content'); b.classList.add('pill');
    size(PILL_W,PILL_H); void b.offsetWidth; b.classList.add('on');
    later(180,function(){ b.classList.remove('pill'); size(targetW(),measure());
      later(250,function(){ b.classList.add('content'); phase='open'; }); });
    return;
  }
  b.classList.remove('content');
  later(130,function(){ inner().innerHTML=html; wire(); b.classList.remove('pill'); b.classList.add('on'); size(targetW(),measure()); later(60,function(){ b.classList.add('content'); phase='open'; }); });
}
function hide(){
  if(phase==='hidden'||phase==='closing') return;
  var b=box(); token++; phase='closing';
  b.classList.remove('content');
  later(140,function(){ b.classList.add('pill'); size(PILL_W,PILL_H);
    later(420,function(){ b.classList.remove('on'); later(220,function(){ b.classList.remove('pill','taken'); inner().innerHTML=''; phase='hidden'; }); }); });
}
function wire(){
  var b=box();
  b.querySelectorAll('[data-take]').forEach(function(x){ x.onclick=function(){ pickFor=x.getAttribute('data-take'); showAll=false; lastSig=''; window.renderCritAlert(); }; });
  b.querySelectorAll('[data-open]').forEach(function(x){ x.onclick=function(){ window.critOpenPatient(x.getAttribute('data-open')); }; });
  b.querySelectorAll('[data-doc]').forEach(function(x){ x.onclick=function(){ window.critTakeCase(pickFor, x.getAttribute('data-doc')); }; });
  b.querySelectorAll('[data-all]').forEach(function(x){ x.onclick=function(){ showAll=!showAll; lastSig=''; window.renderCritAlert(); }; });
  b.querySelectorAll('[data-cancel]').forEach(function(x){ x.onclick=function(){ pickFor=null; lastSig=''; window.renderCritAlert(); }; });
  b.querySelectorAll('[data-undo]').forEach(function(x){ x.onclick=function(){ window.critUndoTake(); }; });
  if(pickFor){ var f=b.querySelector('.ci-pick>.ci-docs [data-doc]'); if(f) setTimeout(function(){ try{ f.focus({preventScroll:true}); }catch(e){} },REDUCE?0:420); }
}
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'&&pickFor){ pickFor=null; lastSig=''; window.renderCritAlert(); return; }
  if(!pickFor||!/^[1-9]$/.test(e.key)||e.metaKey||e.ctrlKey||e.altKey) return;
  var t=e.target, tag=t&&t.tagName; if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(t&&t.isContentEditable)) return;
  var btns=box().querySelectorAll('.ci-pick>.ci-docs [data-doc]'); var btn=btns[Number(e.key)-1];
  if(btn){ e.preventDefault(); btn.click(); }
});
window.addEventListener('resize',function(){ if(phase==='open'){ size(targetW(),measure()); } });
function tickStart(){ if(tickT) return; tickT=setInterval(function(){ var w=document.querySelector('#critIsland .ci-wait'); if(w){ var tx='Waiting '+mmss(Date.now()-Number(w.dataset.arr)), n=w.firstChild; if(n&&n.nodeType===3&&!n.nextSibling){ if(n.nodeValue!==tx) n.nodeValue=tx; } else w.textContent=tx; } },1000); }   /* PVX-N378 */
function tickStop(){ clearInterval(tickT); tickT=null; }

/* actions */
window.critTakeCase=function(id,doctorId){
  var p=byId(id);
  if(!p||!untaken(p)){ pickFor=null; lastSig=''; window.renderCritAlert(); return; }
  var d=null; try{ d=DOCTORS.find(function(x){return x.id===doctorId;})||null; }catch(e){}
  if(!d){ return; }
  var at=new Date(), by=me();
  p.critTakenAt=at; p.critTakenBy=d.name;
  try{ if(AUTH&&AUTH.currentUser) p.critTakenUid=AUTH.currentUser.uid; }catch(e){}
  (p.timeline=p.timeline||[]).push({label:'Critical case taken', at:at, meta:d.name+(by&&by!==d.name?' · by '+by:'')});
  try{ assignDoctor(p,d.id); }catch(e){ p.doctor=d.id; }
  localTaken.add(p.id); pickFor=null; showAll=false;
  var arr=new Date(p.arrival).getTime();
  doneMsg={id:p.id, name:p.name||'Patient', doc:d.name, docId:d.id, by:(by&&by!==d.name)?by:'', took:isFinite(arr)?(at.getTime()-arr):null};
  lastTake={id:doneMsg.id, doc:d.name, docId:d.id, until:Date.now()+9000};
  clearTimeout(doneT); doneT=setTimeout(function(){ doneMsg=null; lastSig=''; window.renderCritAlert(); },6000);
  try{ if(typeof scheduleRender==='function') scheduleRender(); else renderAll(); }catch(e){}
  lastSig=''; window.renderCritAlert();
};
window.critUndoTake=function(){
  var m=lastTake; if(!m||Date.now()>m.until) return;
  var p=byId(m.id); lastTake=null; doneMsg=null; clearTimeout(doneT);
  if(p&&p.critTakenAt){
    if(p.doctor===m.docId){ p.doctor='unassigned'; try{ ctSyncPrimary(p); }catch(e){} }
    p.critTakenAt=null; p.critTakenBy=null; p.critTakenUid=null;
    (p.timeline=p.timeline||[]).push({label:'Critical take undone', at:new Date(), meta:m.doc+' · by '+me()});
    localTaken.delete(p.id);
    try{ if(typeof scheduleRender==='function') scheduleRender(); else renderAll(); }catch(e){}
  }
  lastSig=''; window.renderCritAlert();
};
window.critOpenPatient=function(id){
  try{ if(typeof currentApp!=='undefined'&&currentApp!=='flow') switchView(currentView==='client'?'dashboard':currentView); }catch(e){}
  try{ openDrawer(id); }catch(e){}
};

window.renderCritAlert=function(){
  var tv=onTV(), L=tv?[]:list(), ids=L.map(function(p){return p.id;});
  shownIds.forEach(function(id){
    if(ids.indexOf(id)>-1||localTaken.has(id)||tv) return;
    var p=byId(id); var by=p?takenBy(p):'';
    if(by){ try{ notify('Critical case taken', pvxEsc(p.name)+' · '+pvxEsc(by), {icon:'doctor', color:'var(--priority-p1)'}); }catch(e){} }
  });
  shownIds=ids;
  if(pickFor&&ids.indexOf(pickFor)<0){ pickFor=null; showAll=false; }
  var fresh=L.filter(function(p){return !announced.has(p.id);});
  fresh.forEach(function(p){announced.add(p.id);});
  if(fresh.length && Date.now()-BOOT>8000){ chime(); try{ if(window.pvxSay) pvxSay('Critical case waiting: '+fresh.map(function(p){ return p.name; }).join(', ')); }catch(e){} }   /* PVX-N197 */
  var nowT=Date.now();
  L.forEach(function(p){ if(!firstSeen.has(p.id)) firstSeen.set(p.id,nowT); });
  var due=L.filter(function(p){ return !reminded.has(p.id) && nowT-firstSeen.get(p.id)>=120000; });
  if(due.length){ due.forEach(function(p){ reminded.add(p.id); }); softChime(); }
  if(L.length&&!soundOn()&&wasActive()&&Date.now()-lastTry>10000){ lastTry=Date.now(); unlock(); }
  document.body.classList.toggle('crit-active', L.length>0 && !doneMsg);
  var p=L[0];
  var onDocs=''; try{ onDocs=JSON.stringify(shiftAssign); }catch(e){}
  var key=tv+'|'+soundOn()+'|'+(doneMsg?doneMsg.name+doneMsg.doc:'')+'|'+pickFor+'|'+showAll+'|'+ids.join(',')+'|'+(pickFor?onDocs:'')+'|'+(p?[p.name,p.room,p.reason,p.resusPref,p.species,p.arrival&&new Date(p.arrival).getTime()].join('~'):'');
  if(key===lastSig) return;
  lastSig=key;
  if(tv||(!L.length&&!doneMsg)){ tickStop(); hide(); return; }
  if(doneMsg){ tickStop(); show(takenHTML(),true); return; }
  show(alertHTML(p,L.length-1),false);
  tickStart();
};
setInterval(function(){ try{ window.renderCritAlert(); }catch(e){} },2000);
try{ window.renderCritAlert(); }catch(e){}
})();

/* Today's Shift Assignments reset: Morning ER, Criticalist and Swing clear at midnight (hospital
   time); Overnight clears at 7:00 AM so the overnight doctor carries through the night. Assignments
   older than their reset are ignored on load, and at each reset one open screen saves the cleared list. */
(function(){
var OVERNIGHT_KEY='overnight', OVERNIGHT_RESET_H=7;
function dayKey(d){ try{ return _hospDayKey(d); }catch(e){ return new Date(d).toDateString(); } }
function cycKey(d){ return dayKey(new Date(new Date(d).getTime()-OVERNIGHT_RESET_H*3600e3)); }
function keys(a){ var k={}; try{ Object.keys(shiftAssign).forEach(function(x){ k[x]=1; }); }catch(e){} Object.keys(a||{}).forEach(function(x){ k[x]=1; }); return Object.keys(k); }
function filtered(data){
  var a=(data&&data.assignments)||{}, up=data&&data.updated_at, now=new Date(), out={}, dropped=false;
  keys(a).forEach(function(k){
    var v=a[k]||null, ok=!!up && (k===OVERNIGHT_KEY ? cycKey(up)===cycKey(now) : dayKey(up)===dayKey(now));
    out[k]=ok?v:null; if(v&&!ok) dropped=true;
  });
  return {out:out, dropped:dropped};
}
window._shiftsForToday=function(data){
  if(!data||!data.assignments) return data?data.assignments:null;
  var f=filtered(data); if(f.dropped) window.__shiftsStale=true; return f.out;
};
function applyLocal(a){
  try{ if(typeof _shiftModalOpen!=='undefined'&&_shiftModalOpen) return;
    Object.keys(shiftAssign).forEach(function(k){ shiftAssign[k]=null; }); Object.assign(shiftAssign,a||{});
    applyShiftColors(); renderAll(); }catch(e){}
}
async function rollover(){
  try{
    if(typeof DB==='undefined'||!DB){ var b={}; Object.keys(shiftAssign).forEach(function(k){ b[k]=(k===OVERNIGHT_KEY&&cycKey(new Date())===lastCyc)?shiftAssign[k]:null; }); applyLocal(b); return; }
    var ref=DB.collection('shifts').doc(TENANT_ID);
    var snap=await ref.get(); var data=snap.exists?snap.data():null;
    if(!data||!data.assignments) return;
    var f=filtered(data); applyLocal(f.out);
    if(f.dropped&&typeof Backend!=='undefined'&&Backend.mode==='staff'){
      await DB.runTransaction(async function(tx){
        var s=await tx.get(ref), d=s.exists?s.data():null; if(!d||!d.assignments) return;
        var g=filtered(d); if(!g.dropped) return;
        tx.set(ref,{tenant_id:TENANT_ID, assignments:g.out, updated_at:new Date().toISOString(), reset_reason:'scheduled'},{merge:true});
      });
    }
  }catch(e){}
}
var lastDay=dayKey(new Date()), lastCyc=cycKey(new Date());
setInterval(function(){ var d=dayKey(new Date()), c=cycKey(new Date()); if(d!==lastDay||c!==lastCyc){ lastDay=d; lastCyc=c; rollover(); } },30000);
setTimeout(function(){ if(window.__shiftsStale) rollover(); },12000);
window.__shiftReset={filtered:filtered, dayKey:dayKey, cycKey:cycKey};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 6 of 104 · no id ━━━━━ */
try{
/* Offline support and automatic updates.
   - Registers the service worker so Flow opens and shows the last board with no connection.
   - A small capsule appears only when something needs attention: offline, syncing, just synced,
     or an update ready. It stays hidden while everything is live.
   - New versions of Flow are detected in the background and applied when the screen is idle,
     online, and has nothing waiting to sync, so nobody loses what they are doing. */
(function(){
var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
var CHECK_EVERY=120000, IDLE_MS=45000, RELOAD_GUARD_MS=5*60000;
var state={online:navigator.onLine, fromCache:false, cacheSince:0, pending:0, offlineSince:navigator.onLine?0:Date.now(), wasOffline:!navigator.onLine, synced:0, update:false};
var lastInput=Date.now(), loadedTag=null, el=null, lastHTML='';

/* service worker */
if('serviceWorker' in navigator && location.protocol==='https:'){
  window.addEventListener('load',function(){ navigator.serviceWorker.register('/sw.js',{scope:'/'}).catch(function(){}); });
}

/* capsule */
function capsule(){ if(!el){ el=document.createElement('div'); el.id='flowNet'; el.setAttribute('role','status'); el.setAttribute('aria-live','polite'); document.body.appendChild(el); } return el; }
function clock(t){ try{ return new Date(t).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }
function onTV(){ try{ return document.body.classList.contains('client-mode')||LOBBY; }catch(e){ return false; } }
var ICON={
  off:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.8"/><path d="M14.7 10.2A10 10 0 0 1 19 12.9"/><path d="M2 8.8a15 15 0 0 1 4.2-2.7"/><path d="M10.7 5A15 15 0 0 1 22 8.8"/><path d="M12 20h.01"/></svg>',
  sync:'<svg class="fn-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>',
  ok:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
  up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>'
};
function feedDown(){ try{ return typeof Backend!=='undefined'&&Backend.mode==='staff'&&(Backend.conn==='reconnecting'||Backend.conn==='error')&&Backend._connSince&&Date.now()-Backend._connSince>6000; }catch(e){ return false; } }
function offline(){ return !state.online || (state.fromCache && state.cacheSince && Date.now()-state.cacheSince>8000) || feedDown(); }
function waiting(n){ return n===1?'1 change waiting':n+' changes waiting'; }
function render(){
  var c=capsule(), off=offline(), html='', cls='';
  if(off){
    if(!state.offlineSince) state.offlineSince=Date.now();
    state.wasOffline=true;
    cls='off'; html=ICON.off+'<span><b>'+(state.online?'Reconnecting':'Offline')+'</b> since '+clock(state.offlineSince)+' · '+(state.pending?waiting(state.pending):(state.online?'showing the last saved board':'Flow keeps working'))+'</span>';
  } else if(state.pending>0 && state.pendingSince && Date.now()-state.pendingSince>15000){
    cls='sync'; html=ICON.sync+'<span><b>Not saved yet</b> · '+(state.pending===1?'1 change':state.pending+' changes')+' still saving — keep this screen open</span>';
  } else if(state.pending>0 && state.wasOffline){
    cls='sync'; html=ICON.sync+'<span>Syncing '+(state.pending===1?'1 change':state.pending+' changes')+'</span>';
  } else if(state.wasOffline){
    state.wasOffline=false; state.offlineSince=0; state.synced=Date.now();
    cls='ok'; html=ICON.ok+'<span>Back online · all changes saved</span>';
  } else if(state.synced && Date.now()-state.synced<2600){
    cls='ok'; html=ICON.ok+'<span>Back online · all changes saved</span>';
  } else if(state.update){
    cls='up'; html=ICON.up+'<span>Update ready</span><button type="button" data-fn-refresh>Refresh</button>';
  }
  if(onTV()) { cls=''; html=''; }
  var key=cls+'|'+html;
  if(key===lastHTML) return;
  lastHTML=key;
  if(!cls){ c.className=''; return; }
  c.innerHTML=html; c.className='show '+cls;
  var b=c.querySelector('[data-fn-refresh]'); if(b) b.onclick=function(){ applyUpdate(true); };
}
setInterval(render,1000);
window.addEventListener('online',function(){ state.online=true; render(); checkUpdate(); });
window.addEventListener('offline',function(){ state.online=false; state.offlineSince=Date.now(); render(); });

/* pending writes and cache state, from Firestore itself */
function watch(){
  try{
    if(LOBBY||typeof DB==='undefined'||!DB||typeof TENANT_ID==='undefined') return;
    fvVisitsListen(function(docs,meta){   /* the same queries as the main list: Firestore shares them, nothing is read twice */
      state.pending=docs.filter(function(d){ return d.metadata.hasPendingWrites; }).length; if(state.pending&&!state.pendingSince) state.pendingSince=Date.now(); if(!state.pending) state.pendingSince=0;
      var fc=!!(meta&&meta.fromCache);
      if(fc&&!state.fromCache) state.cacheSince=Date.now();
      state.fromCache=fc; if(!fc) state.cacheSince=0;
      render();
    },function(){ setTimeout(watch,5000); },{includeMetadataChanges:true});   /* n92: restart after an error */
  }catch(e){}
}
try{ if(typeof AUTH!=='undefined'&&AUTH&&AUTH.onAuthStateChanged){ var started=false; AUTH.onAuthStateChanged(function(u){ if(u&&!started){ started=true; watch(); } }); } }catch(e){}

/* updates */
['pointerdown','keydown','wheel','touchstart'].forEach(function(t){ document.addEventListener(t,function(){ lastInput=Date.now(); },{capture:true,passive:true}); });
function myBuild(){ var m=document.querySelector('meta[name="flow-build"]'); return m?m.getAttribute('content'):null; }
async function liveBuild(){
  /* Reads only the first 2 KB of the live page, where the build stamp sits. */
  try{ var r=await fetch('/',{headers:{Range:'bytes=0-2047'},cache:'no-store'}); if(!(r.status===206||r.ok)) return null;
    var t=await r.text(); var m=t.match(/<meta name="flow-build" content="([^"]+)"/); return m?m[1]:null; }catch(e){ return null; }
}
function busy(){
  var a=document.activeElement, tag=a&&a.tagName;
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||(a&&a.isContentEditable)) return true;
  if(document.querySelector('#critIsland .ci-pick, #critIsland.taken')) return true;
  var open=document.querySelectorAll('.open');
  for(var i=0;i<open.length;i++){ var cn=(typeof open[i].className==='string')?open[i].className:''; var s=(open[i].id||'')+' '+cn; if(/modal|drawer|scrim|sheet|menu|popover|panel/i.test(s)) return true; }
  return false;
}
function canReload(){
  if(offline()||state.pending>0) return false;
  if(!onTV()&&(Date.now()-lastInput<IDLE_MS||busy())) return false;
  var last=0; try{ last=Number(sessionStorage.getItem('flowUpdateAt')||0); }catch(e){}
  return Date.now()-last>RELOAD_GUARD_MS;
}
function applyUpdate(now){
  if(!now&&!canReload()) return;
  if(offline()) return;
  try{ sessionStorage.setItem('flowUpdateAt',String(Date.now())); }catch(e){}
  location.reload();
}
async function checkUpdate(){
  if(!loadedTag||offline()) return;
  var cur=await liveBuild();
  if(cur&&cur!==loadedTag){ state.update=true; render(); applyUpdate(false); }
}
loadedTag=myBuild();
setInterval(checkUpdate,CHECK_EVERY);
setInterval(function(){ if(state.update) applyUpdate(false); },15000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') checkUpdate(); });
window.__flowNet={state:state, checkUpdate:checkUpdate, loadedTag:function(){ return loadedTag; }};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 7 of 104 · no id ━━━━━ */
try{
/* Voice commands. On for every workstation (approved by VCA IT). Click the mic in the search bar
   (stops after a pause), or hold Space when not typing, speak, release. Flow shows what it understood;
   safe changes happen at once with Undo, everything else waits for Confirm. Uses the browser's speech
   recognition (audio is processed by Google in Chrome). Never admits or discharges.
   A single screen can opt out with ?voice=off and back in with ?voice=on.
   Typed commands in the search bar always work, with or without the mic. */
(function(){
var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
var KEY='flowVoice', STATS='flowVoiceStats';
try{ var q=new URLSearchParams(location.search).get('voice');
  if(q==='on') localStorage.removeItem(KEY);
  if(q==='off') localStorage.setItem(KEY,'off');
}catch(e){}
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
/* The mic shows wherever the browser can do speech (Chrome, Edge, Safari), unless this screen opted out. */
var ENABLED=!!SR; try{ if(localStorage.getItem(KEY)==='off') ENABLED=false; }catch(e){}
if(LOBBY) return;

var talk,panel,inner,toastEl, pending=null, undoFn=null, listening=false, rec=null, finalText='', interim='', startedAt=0, waveT=null;

/* ---------- stats (counts only, no words or audio) ---------- */
function stat(k){ try{ var s=JSON.parse(localStorage.getItem(STATS)||'{}'); s[k]=(s[k]||0)+1; localStorage.setItem(STATS,JSON.stringify(s)); }catch(e){} bump(k); }
/* Shared, hospital-wide counts so we can see what voice misses and improve it. Only counters and
   command words (e.g. "unk_bump", "dest_rads_room"); never patient names, owners, or audio. */
var agg={}, aggT=null, aggOff=false;
function bump(k){ if(aggOff) return; agg[k]=(agg[k]||0)+1; if(!aggT) aggT=setTimeout(flush,60000); }
function statWord(prefix,w){ w=String(w||'').toLowerCase().replace(/[^a-z ]/g,'').trim().replace(/\s+/g,'_').slice(0,24); if(w) bump(prefix+'_'+w); }
function flush(){ aggT=null; var keys=Object.keys(agg); if(!keys.length||aggOff) return;
  try{ if(typeof DB==='undefined'||!DB||typeof firebase==='undefined'||!firebase.firestore||!firebase.auth||!firebase.auth().currentUser) { aggT=setTimeout(flush,60000); return; }
    var F=firebase.firestore.FieldValue, d=new Date(), day; try{ day=String(_hospDayKey(d)); }catch(e){ day=d.toISOString().slice(0,10); }
    var c={}; keys.forEach(function(k){ c[k]=F.increment(agg[k]); }); var sent=agg; agg={};
    DB.collection('voice_stats').doc(TENANT_ID+'_'+day).set({tenant_id:TENANT_ID, day:day, updated_at:F.serverTimestamp(), counts:c},{merge:true})
      .catch(function(e){ if(e&&e.code==='permission-denied'){ aggOff=true; } else { Object.keys(sent).forEach(function(k){ agg[k]=(agg[k]||0)+sent[k]; }); } });
  }catch(e){} }
window.addEventListener('pagehide',flush); document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') flush(); });
function stats(){ try{ return JSON.parse(localStorage.getItem(STATS)||'{}'); }catch(e){ return {}; } }

/* ---------- ui ---------- */
var MIC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>';
var confirmMode=false, sessionId=0, tapMode=false, silenceT=null, maxT=null, hintT=null, bar=null, wrap=null, live=null;
function build(){
  panel=document.createElement('div'); panel.id='fvPanel'; panel.setAttribute('role','dialog'); panel.setAttribute('aria-live','polite'); panel.innerHTML='<div class="fv-in"></div>';
  toastEl=document.createElement('div'); toastEl.id='fvToast'; toastEl.setAttribute('role','status');
  document.body.appendChild(panel); document.body.appendChild(toastEl);
  /* The mic lives inside Flow's search bar. If the bar is missing, fall back to a small glass circle. */
  var actions=document.querySelector('#subnavFlow .search-bar .actions');
  bar=actions?actions.closest('.search-bar'):null;
  inner=panel.querySelector('.fv-in');
  window.addEventListener('resize',function(){ place(); if(listening) placeLive(); });
  if(!SR) return;
  window.addEventListener('online',netState); window.addEventListener('offline',netState); setTimeout(netState,0);
  talk=document.createElement('button'); talk.id='fvTalk'; talk.type='button';
  talk.setAttribute('aria-label','Talk to Flow'); talk.title='Click, or hold Space, to talk';
  talk.innerHTML=MIC+'<span class="fv-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
  if(actions){ actions.insertBefore(talk,actions.firstChild);
    /* Listening happens in the search bar itself: a soft color ring around it and the words as you say them. */
    wrap=bar.closest('.search-wrap')||bar.parentElement;
    var ring=document.createElement('span'); ring.className='fv-ring'; ring.setAttribute('aria-hidden','true');
    var halo=document.createElement('span'); halo.className='fv-halo'; halo.setAttribute('aria-hidden','true');
    wrap.insertBefore(halo,wrap.firstChild); wrap.insertBefore(ring,wrap.firstChild);
    live=document.createElement('span'); live.className='fv-live'; live.setAttribute('aria-live','polite'); bar.appendChild(live);
  } else { talk.classList.add('fv-float'); document.body.appendChild(talk); }
  /* Click to talk (stops by itself after a pause), or press and hold, then let go. */
  talk.addEventListener('pointerdown',function(e){ e.preventDefault(); e.stopPropagation();
    if(listening&&tapMode){ stop(); return; }
    try{ talk.setPointerCapture(e.pointerId); }catch(_){} start(false); });
  talk.addEventListener('pointerup',function(){ if(!listening||tapMode) return;
    if(Date.now()-startedAt<350){ tapMode=true; armSilence(4000); } else stop(); });
  talk.addEventListener('pointercancel',function(){ if(listening&&!tapMode) stop(); });
  talk.addEventListener('click',function(e){ e.preventDefault(); e.stopPropagation(); });
  talk.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); if(e.repeat) return; if(listening) stop(); else { start(true); armSilence(4000); } } });
  if(new URLSearchParams(location.search).get('voice')==='stats'){ var s=stats(); show('<div class="fv-ans">Voice on this screen: '+(s.heard||0)+' commands heard, '+(s.understood||0)+' understood first try, '+(s.confirmed||0)+' confirmed, '+(s.cancelled||0)+' cancelled.</div>'); }
}
/* The panel drops down from the search bar, right-aligned with it. */
function place(){
  if(!panel) return;
  var r=(bar&&bar.offsetParent)?bar.getBoundingClientRect():null;
  if(r&&r.width){ panel.classList.remove('fv-bottom'); panel.style.top=Math.round(r.bottom+10)+'px'; panel.style.right=Math.max(12,Math.round(window.innerWidth-r.right))+'px';
    try{ var pw=panel.offsetWidth||Math.min(460,window.innerWidth-24); if(window.innerWidth-parseFloat(panel.style.right)-pw<12) panel.style.right=Math.max(12,window.innerWidth-12-pw)+'px'; }catch(e){}   /* PVX-N376: on iPhone the card ran off the left edge */
    try{ var ci=document.getElementById('critIsland'); if(ci&&ci.classList.contains('on')){ var q=ci.getBoundingClientRect(), pr=window.innerWidth-parseFloat(panel.style.right), pl=pr-(panel.offsetWidth||Math.min(460,window.innerWidth-24));
      if(q.right>pl&&q.left<pr&&q.bottom>r.bottom) panel.style.top=Math.round(q.bottom+10)+'px'; } }catch(e){}   /* PVX-N376: the card sits below the critical banner, never under it */ }
  else { panel.classList.add('fv-bottom'); panel.style.top=''; panel.style.right=''; }
}
function netState(){ if(!talk) return; var off=!navigator.onLine; talk.classList.toggle('fv-off',off);
  talk.title=off?'Voice needs internet. Typing commands in the search bar still works.':'Click, or hold Space, to talk'; talk.setAttribute('aria-disabled',off?'true':'false');
  if(off&&listening){ sessionId++; stop(); } }
function armSilence(ms){ clearTimeout(silenceT); silenceT=setTimeout(function(){ if(listening&&tapMode) stop(); },ms); }
function setOn(on){ talk.classList.toggle('on',on); talk.setAttribute('aria-pressed',on?'true':'false'); if(on&&wrap){ wrap.classList.remove('fv-thinking'); wrap.classList.add('fv-listening'); bar.classList.add('fv-listening'); placeLive(); liveText('',true); } }
/* ring + live words */
function placeLive(){ if(!live) return; var inp=bar.querySelector('input'); if(!inp) return; live.style.left=inp.offsetLeft+'px'; live.style.width=inp.offsetWidth+'px'; }
function liveText(t,idle){ if(!live) return; clearTimeout(hintT);
  if(idle){ live.className='fv-live idle'; live.textContent=confirmMode?'Say “yes” or “no”…':'Listening…'; if(confirmMode) return;
    hintT=setTimeout(function(){ if(listening&&!(finalText+interim).trim()){ live.className='fv-live idle hint'; live.textContent='Try “Move Bella to Exam”'; } },2600); return; }
  var tail=t.length>38?'…'+t.slice(-37).replace(/^\S*\s/,''):t;
  live.className='fv-live words'; live.textContent=tail; }
function endLive(){ clearTimeout(hintT); if(wrap){ wrap.classList.remove('fv-listening','fv-thinking'); bar.classList.remove('fv-listening'); } if(live){ live.className='fv-live'; live.textContent=''; } }
/* microphone level, drives the ring and the bars in the mic button */
var meter={ctx:null,stream:null,an:null,buf:null,raf:0,l:0,syn:0};
function meterStart(){ meter.l=0; meter.syn=0;
  try{ if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){ navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}).then(function(st){
    if(!listening){ st.getTracks().forEach(function(t){ t.stop(); }); return; }
    meter.stream=st; var C=window.AudioContext||window.webkitAudioContext; meter.ctx=new C(); meter.an=meter.ctx.createAnalyser(); meter.an.fftSize=512; meter.buf=new Uint8Array(meter.an.fftSize);
    meter.ctx.createMediaStreamSource(st).connect(meter.an); }).catch(function(){}); } }catch(e){}
  cancelAnimationFrame(meter.raf); meter.raf=requestAnimationFrame(meterLoop); }
var BARF=[.55,1,.8,.5];
function meterLoop(){
  var target=meter.syn;
  if(meter.an){ meter.an.getByteTimeDomainData(meter.buf); var sum=0; for(var i=0;i<meter.buf.length;i++){ var v=(meter.buf[i]-128)/128; sum+=v*v; } target=Math.min(1,Math.pow(Math.sqrt(sum/meter.buf.length)*7,.8)); }
  meter.syn*=.94; meter.l+=(target-meter.l)*(target>meter.l?.45:.1);
  var l=meter.l; if(wrap) wrap.style.setProperty('--fvL',l.toFixed(3));
  var bs=talk.querySelectorAll('.fv-bars i'); for(var j=0;j<bs.length;j++){ bs[j].style.height=(3+Math.min(1,l*BARF[j]*(.75+Math.random()*.5))*11).toFixed(1)+'px'; }
  if(listening) meter.raf=requestAnimationFrame(meterLoop); else meterStop(); }
function meterStop(){ cancelAnimationFrame(meter.raf); try{ if(meter.stream) meter.stream.getTracks().forEach(function(t){ t.stop(); }); }catch(e){} try{ if(meter.ctx) meter.ctx.close(); }catch(e){}
  meter.stream=meter.ctx=meter.an=null; meter.l=0; if(wrap) wrap.style.setProperty('--fvL','0'); }
function show(html){ inner.innerHTML=html; place(); panel.classList.add('show'); }
function hide(){ panel.classList.remove('show'); pending=null; if(listening&&confirmMode){ sessionId++; stop(); } }
function heard(t){ return '<div class="fv-heard">'+(via==='typed'?'':'Heard ')+'<q>'+pvxEsc(t)+'</q></div>'; }
function toast(t,withUndo,dur){
  toastEl.innerHTML='<span>'+pvxEsc(t)+'</span>'+(withUndo?'<button type="button">Undo</button>':'');
  toastEl.classList.add('show');
  var b=toastEl.querySelector('button'); if(b) b.onclick=function(){ toastEl.classList.remove('show'); if(undoFn){ undoFn(); undoFn=null; } };
  clearTimeout(toastEl._h); toastEl._h=setTimeout(function(){ toastEl.classList.remove('show'); undoFn=null; }, dur||(withUndo?7000:2200));
}
function wave(){ return '<div class="fv-wave">'+new Array(28).join('<i></i>')+'<i></i></div>'; }
function animate(){
  clearInterval(waveT);
  waveT=setInterval(function(){ var is=panel.querySelectorAll('.fv-wave i'); if(!is.length){ clearInterval(waveT); return; }
    var t=Date.now(); for(var i=0;i<is.length;i++){ is[i].style.height=(5+ (0.25+0.7*Math.abs(Math.sin(t/170+i*.55)))*26)+'px'; } },60);
}

/* ---------- board access ---------- */
function active(){ try{ return PATIENTS.filter(function(p){ return isActive(p)&&!p._voiceHidden; }); }catch(e){ return []; } }
function roomList(){ try{ return ROOMS.filter(function(r){ return r!=='Lobby'; }); }catch(e){ return []; } }
function docs(){ try{ return DOCTORS; }catch(e){ return []; } }
function occupant(room){ return active().find(function(p){ return p.room===room; }); }
function pName(p){ return ((p.name||'')+' '+(p.last||'')).trim(); }
function color(p){ try{ return STATUSES[p.status].color; }catch(e){ return '#6FD3E6'; } }
function where(p){ return (p.room&&p.room!=='Lobby')?p.room:(p.status==='Waiting'?'Lobby':p.status); }

/* ---------- understanding ----------
   One command engine for voice and typing. Handles chains ("… and give her to Dr. Lee"),
   corrections ("no, Room 4"), questions, and decides what is safe to do without a Confirm. */
var NUM={one:'1',won:'1',two:'2',to:'2',too:'2',three:'3',tree:'3',four:'4',for:'4',five:'5',six:'6',sex:'6',seven:'7',eight:'8',nine:'9'};
var STAGES=[
  {kind:'status', v:'Waiting', words:['waiting','lobby','the lobby','waiting room']},
  {kind:'status', v:'Exam', words:['exam','exams','exam room']},
  {kind:'status', v:'Diagnostics', words:['diagnostics','diagnostic','lab','labs','radiology','imaging','x-ray','xray','x ray','rads']},
  {kind:'status', v:'Ultrasound', words:['ultrasound','ultra sound','us']},
  {kind:'status', v:'Procedure', words:['procedure','procedures','surgery','or']},
  {kind:'room', v:'Treatment', words:['treatment','treatments','icu','the back','back','ward','wards']}
];
var PRONOUN=/^(her|him|it|them|she|he|that one|this one|the same one|same one)$/;
var HELP='Try “move Bella to Exam”, “move Max to Room 3 and give him to Dr. Meyer”, “how long has Oscar been waiting?” or “what rooms are open?”';
var ctx=null, via='voice';
function norm(t){ return String(t||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[.!?;:]/g,' ').replace(/^\s*(hey |ok |okay )?flow\b\s*,?/,'').replace(/\bplease\b/g,' ').replace(/^\s*(?:(?:um|uh|so|okay|ok|alright|now|and now|next|then)\s+)+/,'').replace(/\s+/g,' ').trim(); }
function flat(c){ return c.replace(/,/g,' ').replace(/\s+/g,' ').trim(); }
function splitClauses(t){ return t.split(/\s*,\s*(?:and\s+then\s+|and\s+|then\s+)?|\s+(?:and then|and also|then|and|also)\s+/).map(flat).filter(Boolean); }
function roomFrom(w){ w=(w||'').trim().replace(/^the\s+/,''); if(/^comfort/.test(w)) return 'Comfort Room';
  var m=w.match(/^(?:exam room|room|rm)\s*(\w+)$/)||w.match(/^(\w+)$/); if(!m) return null; var n=NUM[m[1]]||(/^\d+$/.test(m[1])?m[1]:''); return n?'Room '+n:null; }
function stageFrom(t){ t=(t||'').replace(/^the\s+/,''); for(var i=0;i<STAGES.length;i++){ if(STAGES[i].words.indexOf(t)>-1) return STAGES[i]; } return null; }
function jw(a,b){ if(a===b) return 1; var m=Math.max(0,Math.floor(Math.max(a.length,b.length)/2)-1), am=[], bm=[], mt=0, t=0, i, j;
  for(i=0;i<a.length;i++){ for(j=Math.max(0,i-m);j<Math.min(b.length,i+m+1);j++){ if(!bm[j]&&a[i]===b[j]){ am[i]=bm[j]=1; mt++; break; } } }
  if(!mt) return 0; var k=0; for(i=0;i<a.length;i++){ if(am[i]){ while(!bm[k]) k++; if(a[i]!==b[k]) t++; k++; } }
  var s=(mt/a.length+mt/b.length+(mt-t/2)/mt)/3, p=0; while(p<4&&a[p]&&a[p]===b[p]) p++; return s+p*0.1*(1-s); }
/* returns [{p,s}]: the best matches (ties within 0.03) */
/* How a name sounds, so "Kaiser" finds "Keyser" and "Bayer" finds "Bear" (a small Metaphone). */
function phon(w){ w=String(w||'').toLowerCase().replace(/[^a-z]/g,''); if(!w) return '';
  w=w.replace(/^(kn|gn|pn|wr|ps)/,function(m){ return m.charAt(1); }).replace(/^wh/,'w').replace(/^x/,'s');
  w=w.replace(/x/g,'ks').replace(/ph/g,'f').replace(/gh(?![aeiou])/g,'').replace(/ck/g,'k').replace(/(sch|sh|ch|tio|tia)/g,'X').replace(/th/g,'0')
     .replace(/c(?=[iey])/g,'s').replace(/[cq]/g,'k').replace(/dg(?=[iey])/g,'j').replace(/d/g,'t').replace(/g(?=[iey])/g,'j').replace(/z/g,'s').replace(/v/g,'f')
     .replace(/y(?![aeiou])/g,'').replace(/w(?![aeiou])/g,'').replace(/h(?![aeiou])/g,'');
  var f=w.charAt(0); if(/[aeiouy]/.test(f)) f='a'; return (f+w.slice(1).replace(/[aeiouy]/g,'')).replace(/(.)\1+/g,'$1'); }
function nameScore(a,b){ if(!a||!b) return 0; var s=jw(a,b); if(s<0.9){ var pa=phon(a), pb=phon(b); if(pa.length>1&&pa===pb) s=0.9; } return s; }
var SPECIES={cat:'feline',kitty:'feline',kitten:'feline',feline:'feline',dog:'canine',puppy:'canine',pup:'canine',doggy:'canine',canine:'canine',bunny:'rabbit',rabbit:'rabbit',bird:'avian',parrot:'avian',ferret:'ferret'};
function findPatients(q){
  q=(q||'').replace(/^(the|a)\s+/,'').trim(); var m, loc=null, sp=null;
  /* "the Bella in Room 4", "Max in Exam" */
  if(m=q.match(/^(.+?)\s+(?:in|from|at)\s+(?:the\s+)?(.+)$/)){ var st=stageFrom(m[2]), rm=/^treatment/.test(m[2])?'Treatment':roomFrom(m[2]);
    if(st&&st.kind==='status'){ loc={status:st.v}; q=m[1]; } else if(st||rm){ loc={room:(st&&st.v)||rm}; q=m[1]; } }
  /* "Bella the cat" */
  if((m=q.match(/^(.+?)\s+the\s+(\w+)$/))&&SPECIES[m[2]]){ sp=SPECIES[m[2]]; q=m[1]; }
  var w=q.replace(/^(the|a)\s+/,'').replace(/'s$/,'').split(' ').filter(Boolean); if(!w.length) return [];
  var pool=active().filter(function(p){ if(loc){ if(loc.status&&p.status!==loc.status) return false; if(loc.room&&(p.room||'Lobby')!==loc.room) return false; }
    if(sp&&String(p.species||'').toLowerCase().indexOf(sp)<0) return false; return true; });
  var sc=pool.map(function(p){ var nm=String(p.name||'').toLowerCase(), ln=String(p.last||'').toLowerCase(), ow=String(p.owner||'').toLowerCase().split(/\s+/).pop(), s;
      if(w.length===1) s=Math.max(nameScore(w[0],nm), 0.95*Math.max(nameScore(w[0],ln),nameScore(w[0],ow)));
      else { var a=w[0], b=w[w.length-1], o=a.replace(/'?s$/,'');
        /* "Bella Smith" or "Smith's Bella" */
        s=Math.max((nameScore(a,nm)+nameScore(b,ln))/2, Math.min(Math.max(nameScore(o,ln),nameScore(o,ow),nameScore(a,ln),nameScore(a,ow)), nameScore(b,nm))); }
      return {p:p,s:s}; })
    .filter(function(x){ return x.s>0.82; }).sort(function(a,b){ return b.s-a.s; });
  if(!sc.length) return []; var top=sc[0].s; return sc.filter(function(x){ return top-x.s<0.03; });
}
function findDoctor(t){ t=(t||'').replace(/^(dr|doctor)\s+/,'').replace(/'s$/,''); if(!t) return null; var best=null, bs=0;
  docs().forEach(function(d){ var n=String(d.name||'').toLowerCase().replace(/\./g,''), parts=n.split(' ').filter(function(x){ return x&&x!=='dr'; }); var s=Math.max.apply(null,[jw(t,n),jw(t,n.replace(/^dr\s+/,''))].concat(parts.map(function(x){ return nameScore(t,x); }))); if(s>bs){ bs=s; best=d; } });
  return bs>0.84?{d:best,s:bs}:null; }
function destFrom(x){ x=(x||'').replace(/^(the|a)\s+/,'').trim(); if(!x) return null;
  if(/^(?:least busy|next available|next|free|available|open)\s+(?:doctor|dr|vet)$|^whoever(?:'s| is)?\s+(?:free|available|least busy)$/.test(x)){ var lb=(typeof fvLeastBusy==='function')?fvLeastBusy():null; return lb?{doc:lb,ds:1}:{badDoc:x}; }
  if(/^(dr|doctor)\s/.test(x)){ var d=findDoctor(x); return d?{doc:d.d,ds:d.s}:{badDoc:x}; }
  var st=stageFrom(x); if(st) return {dest:{type:st.kind,v:st.v}};
  var r=roomFrom(x); if(r) return {dest:{type:'room',v:r}};
  var d2=findDoctor(x); if(d2&&d2.s>=0.9) return {doc:d2.d,ds:d2.s};
  return {unknown:x}; }
function withDest(o,x){ var d=destFrom(x)||{unknown:x};
  if(d.doc){ o.op='assign'; o.doc=d.doc; o.ds=d.ds; o.said=x; } else if(d.badDoc){ o.op='assign'; o.doc=null; o.said=x; } else if(d.dest){ o.dest=d.dest; } else { o.badDest=x; }
  return o; }
var PRI={critical:1,urgent:2,stable:3,'non urgent':3,'priority one':1,'priority two':2,'priority three':3};
function prioFrom(x){ x=String(x||'').replace(/^(a|an)\s+/,'').trim(); if(PRI[x]) return PRI[x]; var m=x.match(/^(?:p|priority)\s*([123]|one|two|three)$/); if(!m) return 0; return {'1':1,'2':2,'3':3,one:1,two:2,three:3}[m[1]]||0; }
var PRIO_WORDS='(critical|urgent|stable|non urgent|p\\s?[123]|priority\\s+(?:[123]|one|two|three))';
function parseClause(c,idx){ var m;
  c=c.replace(/^(and|then|also)\s+/,'');
  if(m=c.match(new RegExp('^(?:make|mark|set|bump|change|upgrade|downgrade|move)\\s+(.+?)(?:\'s priority)?\\s+(?:to\\s+|as\\s+|up to\\s+|down to\\s+)?'+PRIO_WORDS+'$'))) return {op:'prio',who:m[1],level:prioFrom(m[2])};
  if(m=c.match(new RegExp('^(.+?)\\s+is\\s+(?:now\\s+)?'+PRIO_WORDS+'$'))) return {op:'prio',who:m[1],level:prioFrom(m[2])};
  if(m=c.match(/^(?:flag\s+)?(.+?)(?:'s)?\s+(?:is\s+|are\s+)?(?:still\s+)?waiting\s+(?:on|for)\s+(.+)$/)) return {op:'wait',who:m[1],text:m[2].slice(0,40)};
  if(m=c.match(/^(?:clear|remove|drop)\s+(.+?)(?:'s)?\s+(?:flag|waiting|wait|waiting on)$/)) return {op:'wait',who:m[1],text:''};
  if(m=c.match(/^(.+?)(?:'s)\s+[a-z ]+?\s+(?:is|are)\s+(?:back|done|in|ready|finished)$/)) return {op:'wait',who:m[1],text:''};
  if(m=c.match(/^((?:dr|doctor)\s+.+?)\s+(?:is\s+)?(?:taking|takes|take|has|gets|got|will take|is seeing|sees|is on)\s+(.+)$/)){ var d=findDoctor(m[1]); return {op:'assign',who:m[2],doc:d&&d.d,ds:d&&d.s,said:m[1]}; }
  if(m=c.match(/^(?:assign|give|hand)\s+(.+?)\s+(?:over\s+)?to\s+(.+)$/)){
    if(/busy|available|free|next|whoever/.test(m[2])){ var lbx=destFrom(m[2]); if(lbx&&lbx.doc) return {op:'assign',who:m[1],doc:lbx.doc,ds:1,said:m[2]}; }
    var d1=findDoctor(m[2]); if(d1) return {op:'assign',who:m[1],doc:d1.d,ds:d1.s,said:m[2]};
    var d0=/^(dr|doctor)\s/.test(m[1])?findDoctor(m[1]):null; if(d0) return {op:'assign',who:m[2],doc:d0.d,ds:d0.s,said:m[1]};
    return {op:'assign',who:m[1],doc:null,said:m[2]}; }
  if(m=c.match(/^(?:move|send|take|bring|put|room|walk)\s+(.+)\s+(?:to|into|over to)\s+(.+)$/)) return withDest({op:'dest',who:m[1].replace(/\s+back$/,'')},m[2]);
  if(m=c.match(/^(?:move|send|take|bring|put|room|walk)\s+(.+?)\s+(?:back\s+)?(?:to|into|in to|in|over to)\s+(.+)$/)) return withDest({op:'dest',who:m[1]},m[2]);
  if(m=c.match(/^(?:move|send|take|bring|put|walk)\s+(.+)$/)) return {op:'dest',who:m[1],noDest:true};
  if(idx>0&&(m=c.match(/^(.+?)\s+(?:back\s+)?(?:to|into|in to|in|goes to|with)\s+(.+)$/))) return withDest({op:'dest',who:m[1]},m[2]);
  return null; }
function question(c){ var m; c=c.replace(/^(and|also)\s+/,'');
  if(/^(?:what can i (?:say|ask|do)|what can you do|help|voice help|show (?:me )?(?:the )?commands|commands|what do i say)$/.test(c)) return {q:'help'};
  if(/^(what|who)(?:'s| is|s| are)?\s*(?:waiting|in the lobby)/.test(c)||/^who(?:'s| is|s)? waiting/.test(c)) return {q:'waiting'};
  if(/^(?:who(?:'s| is|s| are)?\s+)?critical/.test(c)||/^(?:any|what|which)\s+critical/.test(c)) return {q:'critical'};
  if(m=c.match(/^who(?:'s| is|s| are)?\s+in\s+(.+)$/)) return {q:'who',room:/^(the\s+)?treatment/.test(m[1])?'Treatment':roomFrom(m[1])};
  if(m=c.match(/^how long (?:has|have|is|was|did)\s+(.+?)\s+(?:been\s+)?(?:waiting|here|in|there|been|wait)\b/)) return {q:'howlong',who:m[1]};
  if(/\b(?:open|free|available|empty|clean)\s+rooms?\b/.test(c)||/^(?:what|which|any)\s+rooms?\s+(?:are\s+|is\s+)?(?:open|free|available|empty)/.test(c)||/^rooms?\s+(?:open|free|available)/.test(c)||/^(?:is there|are there)\s+(?:a|an|any)\s+(?:open|free|empty)\s+room/.test(c)) return {q:'open'};
  if(m=c.match(/^(?:who|what patients?|which patients?)(?:'s| is|s| does| are| do)?\s+((?:dr|doctor)\s+.+?)\s+(?:seeing|have|has|got|with|working on|on)$/)) return {q:'doctor',said:m[1]};
  if(m=c.match(/^((?:dr|doctor)\s+.+?)(?:'s| s)\s+patients$/)) return {q:'doctor',said:m[1]};
  if(m=c.match(/^who(?:'s| is|s| are)\s+with\s+((?:dr|doctor)\s+.+)$/)) return {q:'doctor',said:m[1]};
  if(m=c.match(/^where(?:'s| is|s| are)\s+(.+)$/)) return {q:'where',who:m[1]};
  if(/^how many\b/.test(c)) return {q:'count'};
  return null; }
function correction(c){
  var m=c.match(/^(?:no|nope|nah|actually|sorry|oops|wait)\s+(?:no\s+)?(?:i meant\s+|i said\s+|make (?:it|that)\s+|it's\s+|its\s+|to\s+|in\s+|into\s+)?(.+)$/)||c.match(/^(?:i meant|i said|make (?:it|that)|change (?:it|that) to)\s+(.+)$/)||c.match(/^not\s+.+?\s+(?:but\s+)?(?:to\s+|in\s+)?((?:room|dr|doctor|comfort|treatment)\b.*|exam|diagnostics|ultrasound|procedure|lobby)$/);
  if(!m) return null; var x=m[1].trim(); if(!x||/^(wait|stop|cancel)$/.test(x)) return null;
  var d=destFrom(x); if(d&&(d.dest||d.doc)) return d;
  if(findPatients(x).length) return {who:x};
  return null; }
function understand(raw){
  var t=norm(raw), c=flat(t);
  if(/^(yes|yeah|yep|yup|confirm|do it|correct|go ahead|sure)$/.test(c)) return {kind:'yes'};
  if(/^(no|nope|cancel|stop|never ?mind|forget it)$/.test(c)) return {kind:'no'};
  if(/^(undo|undo that|take (?:that|it) back|go back)$/.test(c)) return {kind:'undo'};
  var fix=correction(c); if(fix) return {kind:'fix',slot:fix};
  var cl=splitClauses(t); if(!cl.length) return {kind:'unknown'};
  var qs=cl.map(question); if(qs.every(Boolean)) return {kind:'ask',qs:qs};
  var steps=[];
  for(var i=0;i<cl.length;i++){ var s=parseClause(cl[i],i); if(!s) return {kind:'unknown'}; steps.push(s); }
  /* "move Bella and Max to Exam": a clause with no destination borrows the next one's */
  for(var j=steps.length-2;j>=0;j--){ var a=steps[j], b=steps[j+1]; if(a.noDest&&!b.noDest){ a.op=b.op; a.dest=b.dest; a.doc=b.doc; a.ds=b.ds; a.said=b.said; a.badDest=b.badDest; a.noDest=false; } }
  return {kind:'do',steps:steps}; }

/* ---------- answers ---------- */
function ms(v){ if(!v) return 0; if(v instanceof Date) return v.getTime(); if(v.toDate) return v.toDate().getTime(); if(typeof v.seconds==='number') return v.seconds*1000; var n=new Date(v).getTime(); return isNaN(n)?0:n; }
function dur(x){ var m=Math.max(0,Math.round(x/60000)); if(m<60) return m+' min'; var h=Math.floor(m/60); return h+' h'+(m%60?' '+(m%60)+' min':''); }
function docName(id){ var d=docs().find(function(x){ return x.id===id; }); return d?d.name:''; }
function ans(html){ return '<div class="fv-ans">'+html+'</div>'; }
function err(html){ return '<div class="fv-ans fv-err">'+html+'</div>'; }
function list(ps,fn){ return ps.length?ps.map(fn||function(p){ return pvxEsc(pName(p)); }).join(', '):'none'; }
var HELP_SHEET='<div class="fv-help"><div><b>Move</b>“Move Bella to Exam” · “Put Max in Room 3” · “Send Oscar to the back”</div>'
 +'<div><b>Doctor</b>“Give Bella to Dr. Downes” · “Dr. Koch is taking Max”</div>'
 +'<div><b>Two at once</b>“Move Max to Room 3 and give him to Dr. Downes”</div>'
 +'<div><b>Priority</b>“Make Luna critical” · “Max is P2”</div>'
 +'<div><b>Waiting on</b>“Bella is waiting on radiographs” · “Clear Bella’s flag”</div>'
 +'<div><b>Ask</b>“Who’s waiting?” · “What rooms are open?” · “How long has Max been waiting?” · “Where is Bella?”</div>'
 +'<div><b>Same names</b>“Bella in Room 4” · “Smith’s Bella” · “Bella the cat”</div>'
 +'<div><b>Fix it</b>“No, Room 4” · “Undo”</div></div>';
function answer(q){
  if(q.q==='help') return HELP_SHEET;
  var A=active();
  if(q.q==='waiting'){ var L=A.filter(function(p){ return p.status==='Waiting'; }); return ans('<b>'+L.length+' waiting:</b> '+(L.length?list(L,function(p){ return pvxEsc(pName(p))+' <small>'+dur(Date.now()-ms(p.arrival))+'</small>'; }):'no one')+'.'); }
  if(q.q==='critical'){ var C=A.filter(function(p){ return Number(p.prio)===1; }); return ans('<b>'+C.length+' critical:</b> '+(C.length?list(C,function(p){ return pvxEsc(pName(p))+' <small>'+pvxEsc(where(p))+'</small>'; }):'none')+'.'); }
  if(q.q==='who'){ if(!q.room) return err('Which room?'); var ps=A.filter(function(p){ return p.room===q.room; }); return ans(ps.length?'<b>'+pvxEsc(q.room)+':</b> '+list(ps)+'.':'<b>'+pvxEsc(q.room)+'</b> is empty.'); }
  if(q.q==='open'){ var R=roomList().filter(function(r){ return r!=='Treatment'&&!occupant(r); }); return ans(R.length?'<b>'+R.length+' open:</b> '+pvxEsc(R.join(', '))+'.':'Every room is taken right now.'); }
  if(q.q==='count'){ var by={}; A.forEach(function(p){ by[p.status]=(by[p.status]||0)+1; }); var order=['Waiting','Exam','Diagnostics','Ultrasound','Procedure','Hospitalized'];
    var parts=order.filter(function(s){ return by[s]; }).map(function(s){ return by[s]+' '+s; }); Object.keys(by).forEach(function(s){ if(order.indexOf(s)<0) parts.push(by[s]+' '+s); });
    return ans('<b>'+A.length+' on the board</b>'+(parts.length?': '+pvxEsc(parts.join(' · ')):'')+'.'); }
  if(q.q==='doctor'){ var d=findDoctor(q.said); if(!d) return err('No doctor named “'+pvxEsc(q.said)+'”.'); var D=A.filter(function(p){ return p.doctor===d.d.id; });
    return ans('<b>'+pvxEsc(d.d.name)+'</b> '+(D.length?'has '+D.length+': '+list(D,function(p){ return pvxEsc(pName(p))+' <small>'+pvxEsc(where(p))+'</small>'; })+'.':'has no patients right now.')); }
  if(q.q==='howlong'||q.q==='where'){ var M=findPatients(q.who); if(!M.length) return err('No patient named “'+pvxEsc(q.who)+'” on the board.');
    return M.map(function(x){ var p=x.p;
      if(q.q==='howlong'){ var inRoom=(p.room&&p.room!=='Lobby'&&p.roomSince)?' · '+dur(Date.now()-ms(p.roomSince))+' in '+pvxEsc(p.room):''; return ans('<b>'+pvxEsc(pName(p))+'</b> has been here '+dur(Date.now()-ms(p.arrival))+inRoom+' · '+pvxEsc(p.status)+'.'); }
      var dn=(p.doctor&&p.doctor!=='unassigned')?docName(p.doctor):''; return ans('<b>'+pvxEsc(pName(p))+'</b> is in '+pvxEsc(p.room||'Lobby')+' · '+pvxEsc(p.status)+(dn?' · '+pvxEsc(dn):' · no doctor yet')+'.'); }).join(''); }
  return err(HELP); }

/* ---------- actions ---------- */
function snapshot(p){ return {prio:p.prio, waitingOn:p.waitingOn||null, status:p.status, room:p.room, roomSince:p.roomSince, doctor:p.doctor, examStartedAt:p.examStartedAt, examStartedByDoctorId:p.examStartedByDoctorId, examWaitMinutes:p.examWaitMinutes, ultrasound:p.ultrasound, tl:(p.timeline||[]).length}; }
function restore(p,s){ p.prio=s.prio; p.waitingOn=s.waitingOn; p.status=s.status; p.room=s.room; p.roomSince=s.roomSince; var docChanged=p.doctor!==s.doctor; p.doctor=s.doctor; p.examStartedAt=s.examStartedAt; p.examStartedByDoctorId=s.examStartedByDoctorId; p.examWaitMinutes=s.examWaitMinutes; p.ultrasound=s.ultrasound;
  if(p.timeline&&p.timeline.length>s.tl) p.timeline.length=s.tl; if(docChanged){ try{ ctSyncPrimary(p); }catch(e){} }
  try{ scheduleRender(); }catch(e){ try{ renderAll(); }catch(_){} } }
function rollback(snaps){ for(var i=snaps.length-1;i>=0;i--){ var o=snaps[i][0], cur=null; try{ cur=PATIENTS.find(function(x){ return x.id===o.id; }); }catch(e){} restore(cur||o,snaps[i][1]); } }   /* PVX-N357: the patient as the board has it now */
function prioName(l){ try{ return 'P'+l+' · '+PRIO_LABEL[l]; }catch(e){ return 'P'+l; } }
function destLabel(s){ if(s.op==='prio') return prioName(s.level); if(s.op==='wait') return s.text?'Waiting on '+s.text:'No flag'; return s.op==='assign'?s.doc.name:s.dest.v; }
function fromLabel(s){ if(s.op==='prio') return prioName(s.p.prio); if(s.op==='wait') return s.p.waitingOn&&s.p.waitingOn.text?'Waiting on '+s.p.waitingOn.text:'No flag';
  if(s.op==='assign'){ return (s.p.doctor&&s.p.doctor!=='unassigned')?(docName(s.p.doctor)||'No doctor'):'No doctor'; } return s.dest.type==='status'?s.p.status:(s.p.room||'Lobby'); }
function sentence(s){ var n=pName(s.p); if(s.op==='prio') return n+' set to '+prioName(s.level); if(s.op==='wait') return s.text?n+' is waiting on '+s.text:n+'’s flag cleared';
  if(s.op==='assign') return n+' assigned to '+s.doc.name; if(s.dest.type==='room'&&/^(Room|Comfort)/.test(s.dest.v)&&s._from==='Lobby') return n+' roomed in '+s.dest.v; return 'Moved '+n+' to '+s.dest.v; }
function same(s){ if(s.op==='prio') return Number(s.p.prio)===s.level; if(s.op==='wait') return ((s.p.waitingOn&&s.p.waitingOn.text)||'')===(s.text||''); return s.op==='assign'?s.p.doctor===s.doc.id:(s.dest.type==='status'?s.p.status===s.dest.v:s.p.room===s.dest.v); }
/* Safe = easy to undo and hard to get wrong: doctor assignments, status changes (which never move a pet
   between rooms), and rooming a pet from the Lobby into an empty numbered room. Everything else asks first. */
function safe(s){ if((s.conf||0)<0.92) return false; if(s.op==='prio') return false; if(s.op==='wait') return true; if(s.op==='assign') return true; if(s.dest.type==='status') return true;
  var cur=s.p.room||'Lobby'; return /^Room \d+$/.test(s.dest.v)&&cur==='Lobby'&&!occupant(s.dest.v); }
function stepRow(s){ return '<div class="fv-row"><div class="fv-med" style="--c:'+color(s.p)+'">'+pvxEsc((s.p.name||'?')[0])+'</div><div class="fv-t"><b>'+pvxEsc(pName(s.p))+'</b><div class="fv-path"><span class="fv-pill">'+pvxEsc(fromLabel(s))+'</span> → <span class="fv-pill to">'+pvxEsc(destLabel(s))+'</span></div></div></div>'; }
function choose(M,raw,cb){
  pending={kind:'choose'};
  show(heard(raw)+ans('Which '+pvxEsc(M[0].p.name)+'?')+'<div class="fv-choices">'+M.slice(0,4).map(function(x){ var p=x.p; return '<button class="fv-choice" type="button" data-id="'+pvxEsc(p.id)+'"><span class="fv-med" style="--c:'+color(p)+'">'+pvxEsc((p.name||'?')[0])+'</span><span>'+pvxEsc(pName(p))+'<small>'+pvxEsc(where(p))+'</small></span></button>'; }).join('')+'</div>');
  inner.querySelectorAll('[data-id]').forEach(function(b){ b.onclick=function(){ var x=M.find(function(y){ return String(y.p.id)===b.getAttribute('data-id'); }); if(x) cb(x.p); }; });
}
function resolveAll(steps,raw){
  var out=[], lastP=null;
  (function next(i){
    if(i>=steps.length) return plan(out,raw);
    var s=steps[i];
    if(s.noDest) return show(heard(raw)+err('Move '+pvxEsc(s.who)+' where?'));
    if(s.badDest){ stat('bad_dest'); statWord('dest',s.badDest); } if(s.badDest) return show(heard(raw)+err('I didn’t catch where: “'+pvxEsc(s.badDest)+'”. Try Exam, Room 3, Ultrasound or Treatment.'));
    if(s.op==='assign'&&!s.doc&&/busy|available|free|next|whoever/.test(s.said||'')) return show(heard(raw)+err('Nobody is on today’s shift list yet. Set today’s shift assignments first.'));
    if(s.op==='assign'&&!s.doc) return show(heard(raw)+err('No doctor named “'+pvxEsc(s.said)+'”.'));
    if(s.op==='dest'&&s.dest.type==='room'&&roomList().indexOf(s.dest.v)<0&&s.dest.v!=='Treatment') return show(heard(raw)+err('There’s no '+pvxEsc(s.dest.v)+'.'));
    if(s.op==='prio'&&!s.level) return show(heard(raw)+err('Which priority? Critical, urgent or stable.'));
    var take=function(p,score){ lastP=p; out.push({op:s.op,p:p,dest:s.dest,doc:s.doc,level:s.level,text:s.text,conf:Math.min(score,s.op==='assign'?(s.ds||0):1)}); next(i+1); };
    if(PRONOUN.test(s.who)){ var pp=lastP||(ctx&&Date.now()-ctx.at<120000?ctx.steps[ctx.steps.length-1].p:null); if(!pp) return show(heard(raw)+err('Who do you mean?')); return take(pp,1); }
    var M=findPatients(s.who);
    if(!M.length){ stat('no_patient'); return show(heard(raw)+err('No patient named “'+pvxEsc(s.who)+'” on the board.')); }
    if(M.length===1) return take(M[0].p,M[0].s);
    choose(M,raw,function(p){ take(p,1); });
  })(0);
}
function plan(steps,raw){
  for(var i=0;i<steps.length;i++){ var s=steps[i]; if(s.op==='dest'&&s.dest.type==='room'&&s.dest.v!=='Treatment'){ var o=occupant(s.dest.v);
    var leaving=o&&steps.some(function(x){ return x.p===o&&x.op==='dest'&&x.dest.type==='room'&&x.dest.v!==s.dest.v; });
    if(o&&o!==s.p&&!leaving) return show(heard(raw)+err(pvxEsc(s.dest.v)+' has '+pvxEsc(pName(o))+' in it.')); } }
  var real=steps.filter(function(s){ return !same(s); });
  if(!real.length) return show(heard(raw)+ans(steps.map(function(s){ return pvxEsc(pName(s.p))+' is already '+(s.op==='prio'?pvxEsc(prioName(s.level)):s.op==='wait'?(s.text?'flagged waiting on '+pvxEsc(s.text):'unflagged'):s.op==='assign'?'with '+pvxEsc(s.doc.name):'in '+pvxEsc(s.dest.v)); }).join('. ')+'.'));
  stat('understood');
  if(real.every(safe)) return run(real,raw,true);
  propose(real,raw);
}
function propose(steps,raw){
  pending={steps:steps,raw:raw}; ctx={steps:steps,raw:raw,at:Date.now(),done:false};
  var one=steps.length===1, s=steps[0];
  var head=one?'<div class="fv-med" style="--c:'+color(s.p)+'">'+pvxEsc((s.p.name||'?')[0])+'</div><div class="fv-t"><b>'+pvxEsc((s.op==='prio'?'Priority · ':s.op==='wait'?'Flag · ':s.op==='assign'?'Assign ':(s.dest.type==='room'&&/^(Room|Comfort)/.test(s.dest.v)?'Room ':'Move '))+pName(s.p))+'</b><div class="fv-path"><span class="fv-pill">'+pvxEsc(fromLabel(s))+'</span> → <span class="fv-pill to">'+pvxEsc(destLabel(s))+'</span></div></div>'
    :'<div class="fv-t"><b>'+steps.length+' changes</b></div>';
  show(heard(raw)+'<div class="fv-act">'+head+'<div class="fv-btns"><button class="fv-no" type="button">Cancel</button><button class="fv-ok" type="button">'+(one?(s.op==='prio'?'Set priority':s.op==='wait'?(s.text?'Flag':'Remove flag'):s.op==='assign'?'Assign':'Move'):'Make '+steps.length+' changes')+'</button></div></div>'+(one?'':'<div class="fv-list">'+steps.map(stepRow).join('')+'</div>')+'<div class="fv-sub">'+(via==='typed'?'Press Return to confirm. Type “no, Room 4” to change it.':'Enter or “yes” to confirm. Say “no, Room 4” to change it.')+'</div>');
  inner.querySelector('.fv-ok').onclick=confirm; inner.querySelector('.fv-no').onclick=function(){ stat('cancelled'); hide(); };
  /* after a spoken command, keep listening a few seconds for “yes”, “no” or “no, Room 4” */
  if(via==='voice'&&ENABLED&&navigator.onLine&&!listening) setTimeout(function(){ if(pending&&pending.steps&&!listening) start(true,true); },350);
}
function confirm(){ var a=pending; if(!a||!a.steps) return; run(a.steps,a.raw,false); }
function userName(){ try{ return (typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):''; }catch(e){ return ''; } }
/* Every change made by voice or a typed command is marked in the patient's timeline, with who was signed in. */
function tagTimeline(p,from){ if(via!=='voice'&&via!=='typed') return; var tl=p.timeline||[], u=userName();
  for(var k=from;k<tl.length;k++){ var e=tl[k]; if(e&&!e.fvTagged){ e.fvTagged=1; e.meta=(e.meta?e.meta+' · ':'')+(via==='typed'?'typed command':'voice')+(u?' · '+u:''); } } }
function setWaiting(p,text){ var at=new Date(); p.waitingOn=text?{text:String(text).slice(0,40), at:at.toISOString(), by:userName()}:null;
  (p.timeline=p.timeline||[]).push({label:text?'Waiting on '+text:'Waiting-on flag cleared', at:at, meta:''});
  try{ notify(text?'Waiting on '+pvxEsc(text):'Flag cleared', pvxEsc(pName(p)), {icon:'info', color:'var(--accent)'}); }catch(e){}
  try{ scheduleRender(function(){ try{ if(activePatient===p.id) fillDrawer(p); }catch(e){} }); }catch(e){ try{ renderAll(); }catch(_){} } }
/* Small chip on the Flow card; click it to clear (with Undo). */
window.fvWaitChip=function(p){ var w=p&&p.waitingOn; if(!w||!w.text) return ''; var mins=Math.max(0,Math.round((Date.now()-new Date(w.at).getTime())/60000));
  var ago=isNaN(mins)?'':(mins<1?'now':mins<60?mins+'m':Math.floor(mins/60)+'h'), said=isNaN(mins)?'':(mins<1?', just now':', '+(typeof pvxSpoken==='function'?pvxSpoken(mins):mins+' minutes'));   /* PVX-N357: a real button that says what it does */
  return '<button type="button" class="fv-wait-chip" data-fvwait="'+pvxEsc(p.id)+'" title="Clear “Waiting on '+pvxEsc(w.text)+'”" aria-label="Waiting on '+pvxEsc(w.text)+said+'. Clear"><i></i><span class="fvw-t">Waiting on '+pvxEsc(w.text)+'</span><small>'+ago+'</small><svg class="fvw-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg></button>'; };
document.addEventListener('click',function(e){ var c=e.target&&e.target.closest&&e.target.closest('[data-fvwait]'); if(!c) return; e.preventDefault(); e.stopPropagation();
  var p=active().find(function(x){ return String(x.id)===c.getAttribute('data-fvwait'); }); if(!p) return; via='board'; run([{op:'wait',p:p,text:'',conf:1}],'',true); },true);
function run(steps,raw,instant){
  if(listening){ sessionId++; stop(); }
  var snaps=[], done=[];
  for(var i=0;i<steps.length;i++){ var s=steps[i];
    if(!isActive(s.p)){ rollback(snaps); pending=null; return show(err(pvxEsc(pName(s.p))+' is no longer on the board.')); }
    s._from=s.p.room||'Lobby'; snaps.push([s.p,snapshot(s.p)]);
    try{
      if(s.op==='prio'){ setPriority(s.p,s.level); }
      else if(s.op==='wait'){ setWaiting(s.p,s.text); }
      else if(s.op==='assign'){ if(s.p.doctor!==s.doc.id) assignDoctor(s.p,s.doc.id); }
      else if(s.dest.type==='status'){ if(s.p.status!==s.dest.v) moveStatus(s.p,s.dest.v); }
      else if(s.p.room!==s.dest.v){ if(!canDropRoom(s.p,s.dest.v)){ rollback(snaps); pending=null; var o=occupant(s.dest.v); return show(heard(raw)+err(pvxEsc(s.dest.v)+(o?' has '+pvxEsc(pName(o))+' in it.':' isn’t available.'))); } moveRoom(s.p,s.dest.v); }
      tagTimeline(s.p,snaps[snaps.length-1][1].tl); done.push(s);
    }catch(e){ rollback(snaps); pending=null; return show(err('That didn’t work. Try again or use the board.')); }
  }
  stat(instant?'instant':'confirmed'); hide();
  ctx={steps:steps,raw:raw,at:Date.now(),done:true,snaps:snaps};
  undoFn=function(){ rollback(snaps); ctx=null; stat('undone'); toast('Undone'); };
  var groups=[]; done.forEach(function(s){ var g=groups[groups.length-1]; if(g&&g.p===s.p) g.d.push(destLabel(s)); else groups.push({p:s.p,d:[destLabel(s)]}); });
  toast(done.length===1?sentence(done[0]):groups.map(function(g){ return pName(g.p)+' → '+g.d.join(', '); }).join(' · '),true,instant?5000:7000);
}
function applyFix(slot,raw){
  var c=(pending&&pending.steps)?{steps:pending.steps,done:false}:((ctx&&Date.now()-ctx.at<60000)?ctx:null);
  if(!c) return show(heard(raw)+err('Nothing to change right now.'));
  var steps=c.steps.map(function(s){ return {op:s.op,p:s.p,dest:s.dest,doc:s.doc,level:s.level,text:s.text,conf:s.conf}; });
  var idx=-1, k;
  if(slot.doc){ for(k=steps.length-1;k>=0;k--) if(steps[k].op==='assign'){ idx=k; break; } if(idx<0) idx=steps.length-1; steps[idx].op='assign'; steps[idx].doc=slot.doc; steps[idx].dest=null; steps[idx].conf=Math.min(1,slot.ds||1); }
  else if(slot.dest){ for(k=steps.length-1;k>=0;k--) if(steps[k].op==='dest'){ idx=k; break; } if(idx<0) idx=steps.length-1; steps[idx].op='dest'; steps[idx].dest=slot.dest; steps[idx].doc=null;
    if(slot.dest.type==='room'&&roomList().indexOf(slot.dest.v)<0&&slot.dest.v!=='Treatment') return show(heard(raw)+err('There’s no '+pvxEsc(slot.dest.v)+'.')); }
  var go=function(np){ if(np){ var old=steps[steps.length-1].p; steps.forEach(function(s){ if(s.p===old) s.p=np; }); }
    if(c.done){ rollback(c.snaps); undoFn=null; } pending=null; stat('corrected'); plan(steps,raw); };
  if(slot.who){ var M=findPatients(slot.who); if(!M.length) return show(heard(raw)+err('No patient named “'+pvxEsc(slot.who)+'” on the board.')); if(M.length>1) return choose(M,raw,function(p){ go(p); }); return go(M[0].p); }
  go(null);
}
function handle(raw,opts){
  via=(opts&&opts.typed)?'typed':'voice'; stat(via==='typed'?'typed':'heard');
  var u=understand(raw);
  if(u.kind==='yes'){ if(pending&&pending.steps) confirm(); return; }
  if(u.kind==='no'){ if(pending&&pending.steps) stat('cancelled'); hide(); return; }
  if(u.kind==='undo'){ if(undoFn){ var f=undoFn; undoFn=null; f(); hide(); } else show(heard(raw)+err('Nothing to undo.')); return; }
  if(u.kind==='fix') return applyFix(u.slot,raw);
  if(u.kind==='ask'){ stat('understood'); pending=null; return show(heard(raw)+u.qs.map(answer).join('')); }
  if(u.kind==='unknown'){ stat('unknown'); statWord('unk',flat(norm(raw)).split(' ')[0]); return show(heard(raw)+err(HELP)); }
  resolveAll(u.steps,raw);
}

/* ---------- typed commands in the search bar ---------- */
var CMD_START=/^(no|nope|actually|make|mark|set|bump|change|flag|clear|remove|move|send|take|bring|put|walk|assign|give|hand|who|who's|whos|what|what's|how|where|where's|which|undo|is there|are there|any)\s/;
var CMD_ALT=/\s(?:is|are)\s+(?:still\s+)?waiting\s+(?:on|for)\s|\sis\s+(?:now\s+)?(?:critical|urgent|stable|p\s?[123])$/;
function typedCommand(q){ var t=flat(norm(q)); if(t==='undo') return {kind:'undo'}; if(t==='help'||t==='commands') return understand(t); if(!(CMD_START.test(t+' ')||CMD_ALT.test(t))||t.split(' ').length<2) return null;
  var u=understand(q); if(u.kind==='ask'||u.kind==='undo') return u;
  if(u.kind==='fix') return ((pending&&pending.steps)||(ctx&&Date.now()-ctx.at<60000))?u:null;
  if(u.kind!=='do') return null;
  for(var i=0;i<u.steps.length;i++){ var s=u.steps[i]; if(s.noDest||s.badDest||(s.op==='assign'&&!s.doc)||(s.op==='prio'&&!s.level)) return null; if(!PRONOUN.test(s.who)&&!findPatients(s.who).length) return null; }
  return u; }
function describe(u,q){
  if(u.kind==='undo') return {t:'Undo the last change', s:'Command'};
  if(u.kind==='fix'){ var sl=u.slot; return {t:'Change it to '+(sl.doc?sl.doc.name:sl.dest?sl.dest.v:sl.who), s:'Correction'}; }
  if(u.kind==='ask') return {t:u.qs[0].q==='help'?'Show what I can say':q.trim().replace(/\?*$/,'?'), s:'Ask Flow'};
  var last=null; return {t:u.steps.map(function(s){ var n; if(PRONOUN.test(s.who)) n=last?last:'them'; else { var M=findPatients(s.who); n=M.length?pName(M[0].p):s.who; last=n; } return n+' → '+(s.op==='prio'?prioName(s.level):s.op==='wait'?(s.text?'Waiting on '+s.text:'Clear flag'):s.op==='assign'?s.doc.name:s.dest.v); }).join('\n'), s:u.steps.length>1?u.steps.length+' changes':'Command'}; }
var CMD_ICON='<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 10l-5 5 5 5"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>';
function cmdHint(q){
  var box=document.getElementById('searchResults'); if(!box) return;
  var old=box.querySelector('.fv-cmd-g'); if(old) old.remove();
  var t=flat(norm(q)); if(!CMD_START.test(t+' ')&&!CMD_ALT.test(t)) return;
  /* a command is not a search: keep the board unfiltered while it's being typed */
  try{ if(typeof searchQ!=='undefined'&&searchQ){ searchQ=''; renderTable(); renderBoard(); } }catch(e){}
  var u=typedCommand(q), inr=box.querySelector('.sr-inner');
  if(!inr){ box.innerHTML='<div class="sr-inner"></div>'; inr=box.firstChild; }
  var none=inr.querySelector('.sr-none'); if(none) none.remove();
  var d=u?describe(u,q):{t:'Keep typing, like “move Bella to Exam”', s:'Command'};
  inr.insertAdjacentHTML('afterbegin','<div class="sr-group fv-cmd-g"><div class="sr-label">'+pvxEsc(d.s)+'</div><div class="fv-cmd'+(u?' ready':'')+'"><span class="sr-ic">'+CMD_ICON+'</span><div class="sr-main"><div class="sr-t">'+pvxEsc(d.t)+'</div></div>'+(u?'<kbd>return</kbd>':'')+'</div></div>');
  box.classList.add('open'); try{ positionSearchResults(); }catch(e){}
  var row=inr.querySelector('.fv-cmd.ready'); if(row) row.onclick=function(){ runTyped(); };
}
function runTyped(){ var el=document.getElementById('globalSearch'); if(!el) return false; var q=el.value; if(!typedCommand(q)) return false;
  el.value=''; try{ searchQ=''; closeSearch(); renderTable(); renderBoard(); }catch(e){} el.blur(); handle(q,{typed:true}); return true; }
document.addEventListener('input',function(e){ if(e.target&&e.target.id==='globalSearch') cmdHint(e.target.value); });
document.addEventListener('keydown',function(e){ if(e.key!=='Enter'||!e.target||e.target.id!=='globalSearch'||e.isComposing) return;
  if(typedCommand(e.target.value)){ e.preventDefault(); e.stopImmediatePropagation(); runTyped(); } },true);

/* ---------- microphone ---------- */
var TIP_KEY='flowVoiceTip';
function start(tap,cm){
  if(!ENABLED||listening) return; tapMode=!!tap; confirmMode=!!cm;
  if(!SR){ show('<div class="fv-ans fv-err">Voice needs Chrome or Safari on this computer.</div>'); return; }
  if(!navigator.onLine){ if(!cm) show('<div class="fv-ans fv-err">Voice needs internet. You can still type commands in the search bar.</div>'); return; }
  listening=true; finalText=''; interim=''; startedAt=Date.now();
  setOn(true); clearTimeout(maxT); maxT=setTimeout(function(){ if(listening) stop(); },cm?5000:15000);
  if(live){ if(!cm){ hide();
      /* first time on this computer: a one-time tip with three things to try */
      var seen=true; try{ seen=!!localStorage.getItem(TIP_KEY); if(!seen) localStorage.setItem(TIP_KEY,'1'); }catch(e){}
      if(!seen) show('<div class="fv-tip"><b>Try saying</b><span>“Move Bella to Exam”</span><span>“What rooms are open?”</span><span>“How long has Max been waiting?”</span><small>Say “what can I say?” anytime for the full list.</small></div>'); } }
  else { show('<div class="fv-heard" id="fvLive">Listening…</div>'+wave()); animate(); }
  if(cm) armSilence(4000);
  meterStart();
  rec=new SR(); rec._id=++sessionId; rec.lang='en-US'; rec.interimResults=true; rec.continuous=true;
  rec.onresult=function(e){ interim=''; for(var i=e.resultIndex;i<e.results.length;i++){ var r=e.results[i]; if(r.isFinal) finalText+=r[0].transcript+' '; else interim+=r[0].transcript; }
    var said=(finalText+interim).trim(); meter.syn=.7; if(live) liveText(said); var l=document.getElementById('fvLive'); if(l) l.innerHTML='<q>'+pvxEsc(said)+'</q>'; if(tapMode) armSilence(1400); };
  rec.onerror=function(e){ var m=e&&e.error; if(m==='not-allowed'||m==='service-not-allowed'){ listening=false; setOn(false); endLive(); meterStop(); show('<div class="fv-ans fv-err">The microphone is blocked. Click the icon in the address bar and allow the microphone for Flow.</div>'); } };
  try{ rec.start(); }catch(e){}
}
function stop(){
  if(!listening) return; listening=false; clearInterval(waveT);
  setOn(false); clearTimeout(silenceT); clearTimeout(maxT); meterStop();
  var r=rec; rec=null; if(!r){ endLive(); return; }
  if(wrap) wrap.classList.add('fv-thinking');
  var quick=!tapMode&&Date.now()-startedAt<350, cm=confirmMode; tapMode=false; confirmMode=false;
  var done=false;
  function finish(){ if(done) return; done=true; if(listening) return; endLive(); if(r._id!==sessionId) return; var t=(finalText+interim).trim(); if(cm&&!t) return; if(quick&&!t){ hide(); return; } if(t) handle(t); else show('<div class="fv-ans fv-err">Didn\'t catch that. Try again.</div>'); }
  r.onend=finish; setTimeout(finish,4000);
  try{ r.stop(); }catch(e){ finish(); }
}
function typing(){ var a=document.activeElement, t=a&&a.tagName; return t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(a&&a.isContentEditable); }
document.addEventListener('keydown',function(e){
  if(document.body.classList.contains('client-mode')) return;
  if(ENABLED&&e.code==='Space'&&!typing()&&!e.metaKey&&!e.ctrlKey&&!e.altKey){ e.preventDefault(); e.stopPropagation(); if(!e.repeat){ if(listening&&tapMode) stop(); else start(false); } return; }
  if(e.key==='Enter'&&panel&&panel.classList.contains('show')&&pending&&pending.steps&&!typing()){ e.preventDefault(); confirm(); return; }
  if(e.key==='Escape'&&panel&&panel.classList.contains('show')){ hide(); }
},true);
document.addEventListener('keyup',function(e){ if(e.code==='Space'&&listening&&!tapMode){ e.preventDefault(); stop(); } },true);
/* PVX-N348 - HIG Playing audio, handling interruptions: when Flow goes to the background, or the window loses focus while Space is held,
   the microphone closes and nothing half-heard is acted on (before, it stayed open for up to 15 s and then ran what it heard). */
function interrupted(why){ if(!listening) return; if(why==='blur'&&tapMode) return; sessionId++; stop(); hide(); try{ if(window.pvxSay) pvxSay('Stopped listening'); }catch(e){} }
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') interrupted('hidden'); });
window.addEventListener('pagehide',function(){ interrupted('hidden'); }); window.addEventListener('blur',function(){ interrupted('blur'); });
window.__pvxVoiceInterrupted=interrupted;
document.addEventListener('pointerdown',function(e){ if(panel&&panel.classList.contains('show')&&!panel.contains(e.target)&&(!talk||(e.target!==talk&&!talk.contains(e.target)))&&!(pending&&pending.steps)) hide(); },true);

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build); else build();
window.__flowVoice={understand:understand, findPatients:findPatients, handle:handle, confirm:confirm, stats:stats};
/* PVX-N349 - HIG Settings: Talk to Flow on or off for this screen, from the + menu */
function voiceSync(){ if(talk) talk.hidden=!ENABLED; }
window.pvxVoice={can:function(){ return !!SR&&!LOBBY; }, on:function(){ return !!ENABLED; },
  set:function(v){ ENABLED=!!v&&!!SR; try{ if(ENABLED) localStorage.removeItem(KEY); else localStorage.setItem(KEY,'off'); }catch(e){}
    if(!ENABLED&&listening){ sessionId++; stop(); hide(); } voiceSync(); return ENABLED; }};
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){ setTimeout(voiceSync,0); }); else setTimeout(voiceSync,0);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 8 of 104 · no id ━━━━━ */
try{
/* Flow operations layer
   1. Safer saving: only the fields that changed are written, so two screens never erase each other's work.
   2. Stale-patient sweep: anyone on the board over 12 hours gets a Discharge / Admit / Keep prompt.
   3. Milestones: roomed and doctor-assigned times are recorded quietly for analytics.
   4. Least-busy doctor: doctor pickers show on-shift doctors first, lightest load on top.
   5. Live presence: who else has a patient open, and "Kristi just moved Bella to Exam".
   Everything here is additive; if any part fails, Flow keeps working as before. */
(function(){
var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
function ms(v){ if(!v) return 0; if(v instanceof Date) return v.getTime(); if(v.toDate) return v.toDate().getTime(); if(typeof v==='number') return v; var n=new Date(v).getTime(); return isNaN(n)?0:n; }
function me(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} var n=''; try{ n=(typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):''; }catch(e){} return {uid:(u&&u.uid)||'', name:n||(u&&u.email)||''}; }
function first(n){ return String(n||'').trim().split(/\s+/)[0]||'Someone'; }
function inits(n){ var w=String(n||'').trim().split(/\s+/); return ((w[0]||'')[0]||'').toUpperCase()+((w.length>1?w[w.length-1][0]:'')||'').toUpperCase(); }
function pn(p){ return ((p.name||'')+' '+(p.last||'')).trim(); }
function onTV(){ try{ return LOBBY||document.body.classList.contains('client-mode')||document.body.classList.contains('tv-mode'); }catch(e){ return false; } }

/* ---------- 1. safer saving ---------- */
window.fvSaveVisit=function(batch,p,prev){
  var ref=DB.collection('visits').doc(String(p.id)), row=mapToDb(p), who=me();
  var stamp={last_by:who.name||null, last_by_uid:who.uid||null, last_at:new Date().toISOString()};
  var old=null; try{ old=prev[row.id]?JSON.parse(prev[row.id]):null; }catch(e){ old=null; }
  if(!old){ batch.set(ref, Object.assign({}, row, stamp), {merge:true}); return; }
  var d={}, n=0;
  Object.keys(row).forEach(function(k){ if(row[k]===undefined) return; if(JSON.stringify(row[k])!==JSON.stringify(old[k])){ d[k]=row[k]; n++; } });
  if(!n) return;
  batch.update(ref, Object.assign(d, stamp));
};
/* Unsafe whole-record merge fallback disabled. An operator must reconcile
   conflicts against the latest server version before retrying. */
window.fvSaveFallback=async function(){ throw new Error('Whole-record fallback is disabled to protect concurrent edits.'); };

/* ---------- 3. milestones ---------- */
try{ if(typeof moveRoom==='function'){ pvxWrap('moveRoom',function(_mr){ return function(p,r){ var was=p&&p.room; var out=_mr.apply(this,arguments);
  try{ if(p&&!p.msRoomedAt&&(!was||was==='Lobby')&&p.room&&p.room!=='Lobby') p.msRoomedAt=new Date(); }catch(e){} return out; }; },'#8'); } }catch(e){}
try{ if(typeof assignDoctor==='function'){ pvxAfter('assignDoctor',function(p,id){ 
  try{ if(p&&!p.msDoctorAt&&id&&id!=='unassigned'&&p.doctor===id) p.msDoctorAt=new Date(); }catch(e){} },'#8'); } }catch(e){}

/* ---------- 4. least-busy doctor ---------- */
function onShift(){ var on={}; try{ Object.keys(shiftAssign||{}).forEach(function(k){ if(shiftAssign[k]) on[shiftAssign[k]]=k; }); }catch(e){} return on; }
function load(id){ try{ return activeCountForDoctor(id); }catch(e){ return 0; } }
function ranked(){ var on=onShift();
  return DOCTORS.filter(function(d){ return d&&d.id&&d.id!=='unassigned'; }).map(function(d){ return {d:d,n:load(d.id),on:!!on[d.id]}; })
    .sort(function(a,b){ return (b.on-a.on)||(a.n-b.n)||String(a.d.name).localeCompare(String(b.d.name)); }); }
window.fvLeastBusy=function(){ var b=ranked().find(function(x){ return x.on; }); return b?b.d:null; };
window.fvDoctorItems=function(){ var r=ranked(), best=r.find(function(x){ return x.on; });
  return r.map(function(x){ var tag=x.n===0?'Free':(x.n+' active');
    var label=x===best?'Suggested':(x.on?'On shift · '+tag:tag);
    return Object.assign({}, x.d, {name:pvxEsc(x.d.name)+'<span class="fv-load'+(x===best?' best':'')+(x.on?'':' off')+'" title="'+(x.on?'On shift':'Off shift')+' · '+tag+'">'+label+'</span>'}); }); };

if(LOBBY) return;

/* ---------- 2. stale-patient sweep ---------- */
var STALE_H=12, sheet=null, pill=null, AUTO_KEY='fvStaleAuto';
function staleList(){ var now=Date.now(); try{ return PATIENTS.filter(function(p){ return isActive(p)&&!p._demo&&p.status!=='Hospitalized'&&ms(p.arrival)&&(now-ms(p.arrival))>STALE_H*3600000&&!(p.staleKeepUntil&&ms(p.staleKeepUntil)>now); })
  .sort(function(a,b){ return ms(a.arrival)-ms(b.arrival); }); }catch(e){ return []; } }
function hrs(p){ var h=Math.round((Date.now()-ms(p.arrival))/3600000); return h>=48?Math.round(h/24)+' days':h+' h'; }
function when(p){ try{ return new Date(ms(p.arrival)).toLocaleString([], {month:'short', day:'numeric', hour:'numeric', minute:'2-digit'}); }catch(e){ return ''; } }
function buildStale(){
  pill=document.createElement('button'); pill.id='fvStalePill'; pill.type='button'; document.body.appendChild(pill);
  pill.onclick=function(){ openSheet(); };
  sheet=document.createElement('div'); sheet.id='fvStale'; sheet.setAttribute('role','dialog'); sheet.setAttribute('aria-modal','true'); sheet.setAttribute('aria-label','Patients on the board over 12 hours');
  sheet.innerHTML='<div class="fs-scrim"></div><div class="fs-card"><div class="fs-head"><div><b>Still here?</b><span>These patients have been on the board over 12 hours. Clearing them keeps wait times and alerts accurate.</span></div><button class="fs-x" type="button" aria-label="Close">'+PVX_GI.xmark+'</button></div><div class="fs-list"></div><div class="fs-foot"><button class="fs-done" type="button">Done</button></div></div>';
  document.body.appendChild(sheet);
  sheet.querySelector('.fs-scrim').onclick=closeSheet; sheet.querySelector('.fs-x').onclick=closeSheet; sheet.querySelector('.fs-done').onclick=closeSheet;
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&sheet.classList.contains('show')){ e.stopPropagation(); closeSheet(); } },true);
  sheet.querySelector('.fs-list').addEventListener('click',function(e){ var b=e.target.closest('button[data-act]'); if(!b) return;
    var p=PATIENTS.find(function(x){ return String(x.id)===b.getAttribute('data-id'); }); if(!p) return; var act=b.getAttribute('data-act');
    if(act==='keep'){ p.staleKeepUntil=new Date(Date.now()+STALE_H*3600000); (p.timeline=p.timeline||[]).push({label:'Kept on board (12-hour review)', at:new Date(), meta:me().name}); try{ scheduleRender(); }catch(_){ try{ renderAll(); }catch(__){} } rowDone(b,'Kept'); return; }
    if(act==='admit'&&window.pvxCanAdmit&&!pvxCanAdmit()){ pvxAdmitDenied(); return; }   /* n253 */
    /* Discharge / Admit need a second tap */
    if(!b.classList.contains('arm')){ sheet.querySelectorAll('button.arm').forEach(function(x){ x.classList.remove('arm'); x.textContent=x.getAttribute('data-label'); });
      b.classList.add('arm'); b.textContent='Confirm'; clearTimeout(b._t); b._t=setTimeout(function(){ b.classList.remove('arm'); b.textContent=b.getAttribute('data-label'); },4000); return; }
    try{ completePatient(p, act==='admit'?'Admitted':'Discharged'); }catch(err){ return; }
    rowDone(b, act==='admit'?'Admitted':'Discharged'); });
}
function rowDone(b,label){ var r=b.closest('.fs-row'); if(!r) return; r.classList.add('done'); r.querySelector('.fs-act').innerHTML='<span class="fs-ok">'+pvxEsc(label)+'</span>';
  setTimeout(function(){ r.remove(); if(!sheet.querySelector('.fs-row')) closeSheet(); updatePill(); },900); }
function renderSheet(){ var L=staleList(), list=sheet.querySelector('.fs-list');
  list.innerHTML=L.map(function(p){ var c='#6FD3E6'; try{ c=STATUSES[p.status].color; }catch(e){}
    return '<div class="fs-row"><span class="fs-med" style="--c:'+c+'">'+pvxEsc((p.name||'?')[0])+'</span><div class="fs-t"><b>'+pvxEsc(pn(p))+'</b><small>'+pvxEsc(hrs(p))+' · arrived '+pvxEsc(when(p))+' · '+pvxEsc(p.status)+' · '+pvxEsc(p.room||'Lobby')+'</small></div>'
      +'<div class="fs-act"><button type="button" data-act="discharge" data-label="Discharge" data-id="'+pvxEsc(p.id)+'">Discharge</button><button type="button" data-act="admit" data-label="Admit" data-id="'+pvxEsc(p.id)+'">Admit</button><button type="button" class="ghost" data-act="keep" data-label="Keep" data-id="'+pvxEsc(p.id)+'">Keep</button></div></div>'; }).join('')
    ||'<div class="fs-empty">All clear.</div>'; }
function openSheet(){ if(!sheet) return; renderSheet(); sheet.classList.add('show'); try{ localStorage.setItem(AUTO_KEY,String(Date.now())); }catch(e){} }
function closeSheet(){ if(sheet) sheet.classList.remove('show'); updatePill(); }
function updatePill(){ if(!pill) return; var n=staleList().length, show=n>0&&!onTV()&&!!me().uid;
  pill.classList.toggle('show',show); if(show) pill.innerHTML='<i></i>'+n+(n===1?' patient':' patients')+' over 12 hours<span>Review</span>'; }
function busy(){ var a=document.activeElement, t=a&&a.tagName; if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT') return true;
  try{ if(document.getElementById('drawer').classList.contains('open')) return true; }catch(e){} return !!document.querySelector('#critIsland .ci-pick, .modal.open, .sheet.open'); }
function hospHour(){ try{ return Number(new Date().toLocaleString('en-US',{timeZone:'America/New_York',hour:'numeric',hour12:false}))%24; }catch(e){ return new Date().getHours(); } }
/* End-of-shift sweep at 7 AM / 7 PM, and at least once every 12 hours per screen */
function autoSweep(){ if(!sheet||onTV()||!me().uid||sheet.classList.contains('show')||busy()) return; if(!staleList().length) return;
  var last=0; try{ last=Number(localStorage.getItem(AUTO_KEY)||0); }catch(e){}
  var h=hospHour(), m=new Date().getMinutes(), shiftEdge=(h===7||h===19)&&m<30;
  if((shiftEdge&&Date.now()-last>45*60000)||Date.now()-last>12*3600000) openSheet(); }

/* ---------- 5. live presence ---------- */
var presId=null, presT=null, STALE_VIEW=150000;
function presWrite(id,on){ var u=me(); if(!u.uid||!DB||!id) return; var o={};
  try{ o['viewing.'+u.uid]=on?{name:u.name, at:Date.now()}:firebase.firestore.FieldValue.delete(); DB.collection('visits').doc(String(id)).update(o).catch(function(){}); }catch(e){} }
function presOpen(id){ if(presId&&presId!==id) presWrite(presId,false); presId=id; presWrite(id,true); clearInterval(presT);
  presT=setInterval(function(){ if(presId&&document.visibilityState==='visible') presWrite(presId,true); },60000); }
function presClose(){ if(presId) presWrite(presId,false); presId=null; clearInterval(presT); }
function viewers(p){ var v=p&&p.viewing, u=me(), out=[]; if(!v) return out; Object.keys(v).forEach(function(k){ var x=v[k]; if(k!==u.uid&&x&&Date.now()-ms(x.at)<STALE_VIEW) out.push(x.name||'Someone'); }); return out; }
window.fvPresenceChip=function(p){ var vs=viewers(p); if(!vs.length) return '';
  return '<div class="fv-pres" title="'+pvxEsc(vs.join(', '))+' viewing">'+vs.slice(0,3).map(function(n){ return '<span class="av">'+pvxEsc(inits(n))+'</span>'; }).join('')+'<span>'+pvxEsc(first(vs[0]))+(vs.length>1?' +'+(vs.length-1):'')+' viewing</span></div>'; };
try{ if(typeof openDrawer==='function'){ pvxAfter('openDrawer',function(pid){ try{ var p=PATIENTS.find(function(x){ return x.id===pid; }); if(p&&!p._demo) presOpen(pid); }catch(e){} tick(); },'#8'); } }catch(e){}
try{ if(typeof closeDrawer==='function'){ pvxAfter('closeDrawer',function(){ presClose(); },'#8'); } }catch(e){}
window.addEventListener('pagehide',presClose);

var bar=null, seen={}, warm=false, flashT=null, flashMsg='';
function sig(p){ return [p.status,p.room,p.doctor,p.prio,(p.waitingOn&&p.waitingOn.text)||''].join('|'); }
function describe(p,old){ var o=(old||'').split('|'), who=first(p.lastBy), n=p.name||'the patient';
  if(o[0]!==p.status) return who+' just moved '+n+' to '+p.status;
  if(o[1]!==p.room) return who+' just moved '+n+' to '+(p.room||'Lobby');
  if(o[2]!==p.doctor){ var d=''; try{ d=doc(p.doctor).name; }catch(e){} return who+' just assigned '+n+(d&&p.doctor!=='unassigned'?' to '+d:''); }
  if(o[3]!==String(p.prio)) return who+' just set '+n+' to P'+p.prio;
  return who+' just updated '+n; }
function tick(){
  try{
    var u=me(), dr=document.getElementById('drawer'), open=dr&&dr.classList.contains('open')&&typeof activePatient!=='undefined'&&activePatient;
    if(dr&&!bar){ bar=document.createElement('div'); bar.id='fvPresBar'; var head=dr.querySelector('.drawer-head'); (head||dr).appendChild(bar); }
    PATIENTS.forEach(function(p){ if(!isActive(p)) return; var s=sig(p), old=seen[p.id]; seen[p.id]=s;
      if(!warm||old===undefined||old===s) return;
      if(!p.lastByUid||p.lastByUid===u.uid||Date.now()-ms(p.lastAt)>20000) return;
      var msg=describe(p,old);
      var card=document.querySelector('.card[data-pid="'+p.id+'"]'); if(card){ card.classList.remove('fv-remote'); void card.offsetWidth; card.classList.add('fv-remote'); }
      if(open&&activePatient===p.id){ flashMsg=msg; clearTimeout(flashT); flashT=setTimeout(function(){ flashMsg=''; tick(); },8000); try{ notify(pvxEsc(msg),'',{icon:'info', color:'var(--accent)'}); }catch(e){} } });
    warm=true;
    if(bar){ var p=open?PATIENTS.find(function(x){ return x.id===activePatient; }):null, vs=p?viewers(p):[], html='';
      if(flashMsg) html='<span class="dot live"></span>'+pvxEsc(flashMsg);
      else if(vs.length) html=vs.slice(0,3).map(function(n){ return '<span class="av">'+pvxEsc(inits(n))+'</span>'; }).join('')+pvxEsc(vs.length===1?first(vs[0])+' is also viewing '+(p.name||''):first(vs[0])+' and '+(vs.length-1)+' more are viewing');
      if(bar._h!==html){ bar._h=html; bar.innerHTML=html; bar.classList.toggle('show',!!html); } }
    updatePill();
  }catch(e){}
}

function boot(){ buildStale(); setInterval(tick,1500); setInterval(autoSweep,60000); setTimeout(autoSweep,8000); tick(); }
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
window.__fvOps={staleList:staleList, openSheet:openSheet, ranked:ranked, viewers:viewers, tick:tick};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 9 of 104 · no id ━━━━━ */
try{
/* ═════════ patient-flags-oct7 ═════════
   Staff-only patient flags (Safety · Handling · Medical · Isolation · Owner). Stored on visits/{id}.flags
   [{id,k,t,scope:'always'|'visit',by,at,from}]. "Always" flags carry to the pet's next visit at check-in;
   "This visit" flags stay with the visit. Never written to pub/ or lobby/ (those projections list their fields). */
(function(){
var FK={safe:'Safety',hand:'Handling',med:'Medical',iso:'Isolation',own:'Owner'}, ORDER=['safe','hand','med','iso','own'];
var CAT={safe:['Bites','Muzzle','Dog aggressive','Scratches'],hand:['Fear Free','Hard stick','Sedate','E-collar'],
  med:['MDR1','No hydromorphone','Diabetic','Seizures'],iso:['Parvo','Ringworm','Kennel cough'],own:['Call first','Spanish','Approve estimate']};
var G={
 safe:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.695 2.85a1.5 1.5 0 0 1 2.61 0l9.03 15.9A1.5 1.5 0 0 1 21.03 21H2.97a1.5 1.5 0 0 1 -1.305 -2.25zM12 7.8a1.275 1.275 0 0 0 -1.275 1.35l0.3 5.4a0.975 0.975 0 0 0 1.95 0l0.3 -5.4A1.275 1.275 0 0 0 12 7.8zm0 9.15a1.275 1.275 0 1 0 0 2.55 1.275 1.275 0 0 0 0 -2.55z"/></svg>',
 hand:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.1 1.95c0.825 0 1.5 0.675 1.5 1.5v6.45h0.75V4.5c0 -0.825 0.675 -1.5 1.5 -1.5s1.5 0.675 1.5 1.5v6.45h0.6V6.6c0 -0.75 0.6 -1.35 1.35 -1.35s1.35 0.6 1.35 1.35v7.65c0 4.5 -3.3 7.8 -7.5 7.8 -2.85 0 -4.65 -1.2 -6.3 -3.45L3 14.1c-0.6 -0.75 -0.45 -1.65 0.3 -2.1 0.675 -0.45 1.5 -0.3 2.1 0.3l1.95 2.1V4.5c0 -0.825 0.675 -1.5 1.5 -1.5s1.5 0.675 1.5 1.5v5.4h0.75V3.45c0 -0.825 0.675 -1.5 1.5 -1.5z" transform="translate(-0.9 0)"/></svg>',
 med:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.35 2.4h3.3v6.15l5.325 -3.075 1.65 2.85L15.3 11.4l5.325 3.075 -1.65 2.85L13.65 14.25v6.15H10.35V14.25l-5.325 3.075 -1.65 -2.85L8.7 11.4 3.375 8.325l1.65 -2.85L10.35 8.55z"/></svg>',
 iso:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 1.8l8.1 3v6.45c0 4.95 -3.45 8.7 -8.1 10.35C7.35 19.95 3.9 16.2 3.9 11.25V4.8z"/></svg>',
 own:'<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.3 2.4c0.75 -0.15 1.5 0.3 1.8 1.05l1.35 3.45c0.3 0.675 0 1.5 -0.6 1.875l-1.5 0.975a12.9 12.9 0 0 0 6.9 6.9l0.975 -1.5c0.375 -0.6 1.2 -0.9 1.875 -0.6l3.45 1.35c0.75 0.3 1.2 1.05 1.05 1.8l-0.45 2.4c-0.15 0.9 -1.05 1.5 -1.95 1.5C9.9 21.45 2.55 14.1 2.4 4.8c0 -0.9 0.6 -1.8 1.5 -1.95z"/></svg>'};
var MINUS='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="var(--fg-red)"/><rect x="6" y="10.909" width="12" height="2.182" rx="1.091" fill="#fff"/></svg>';
var PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="var(--fg-green)"/><rect x="6" y="10.909" width="12" height="2.182" rx="1.091" fill="#fff"/><rect x="10.909" y="6" width="2.182" height="12" rx="1.091" fill="#fff"/></svg>';
var MAG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.9"/><path d="m15.6 15.6 5.1 5.1"/></svg>';
var CK='<svg class="fg-ck" viewBox="0 0 24 24" fill="none" stroke="var(--fg-blue)" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.25 12.75l4.5 4.5 9 -10.5"/></svg>';
var APP='<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4h7.2a5.2 5.2 0 0 1 0 10.4H9.6V20H6zm3.6 3.3v3.8h3.4a1.9 1.9 0 0 0 0-3.8z"/></svg>';
function E(s){ return (typeof bcEsc==='function')?bcEsc(s):String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function C(s){ return (typeof fxClean==='function')?fxClean(s):s; }
function uid(){ return 'f'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function iso(d){ try{ return d?new Date(d).toISOString():null; }catch(e){ return null; } }
function who(){ try{ return (typeof CURRENT_USER==='string'&&CURRENT_USER)?CURRENT_USER:'Staff'; }catch(e){ return 'Staff'; } }
function L(p){ return (p&&Array.isArray(p.flags))?p.flags:[]; }
function S(p){ return L(p).slice().sort(function(a,b){ return ORDER.indexOf(a.k)-ORDER.indexOf(b.k); }); }

/* Firestore ↔ app */
window.fgToDb=function(a){ return Array.isArray(a)?a.filter(function(f){ return f&&f.t; }).slice(0,30).map(function(f){
  return {id:String(f.id||uid()),k:FK[f.k]?f.k:'own',t:String(f.t).slice(0,40),scope:f.scope==='visit'?'visit':'always',by:f.by||null,at:iso(f.at),from:f.from||null}; }):[]; };
window.fgToApp=function(a){ return Array.isArray(a)?a.filter(function(f){ return f&&f.t; }).map(function(f){
  return {id:String(f.id||uid()),k:FK[f.k]?f.k:'own',t:C(String(f.t)),scope:f.scope==='visit'?'visit':'always',by:f.by?C(String(f.by)):null,at:f.at?new Date(f.at):null,from:f.from||null}; }):[]; };

/* atoms */
function tile(k,cls){ return '<i class="fg-t fg-k-'+k+(cls?' '+cls:'')+'">'+G[k]+'</i>'; }
function cap(t,cls){ return '<i class="fg-cap'+(cls?' '+cls:'')+'">'+G.safe+'<i>'+E(t)+'</i></i>'; }
var SEEN={}, PULSE=null;
function recent(d){ return d&&(Date.now()-new Date(d).getTime())<120000; }
function isNew(p,f){ var key=p.id+'|'+f.id; if(SEEN[key]) return false; SEEN[key]=1; return recent(f.at)||recent(p.arrival)||(f.from&&recent(p.arrival)); }

/* board card */
window.fgCard=function(p){ var a=S(p); if(!a.length) return ''; var s=a.filter(function(f){ return f.k==='safe'; }), o=a.filter(function(f){ return f.k!=='safe'; });
  return '<div class="fg-fl" aria-label="Flags: '+E(a.map(function(f){ return f.t; }).join(', '))+'">'
   +s.map(function(f){ var n=isNew(p,f); return cap(f.t,n?'fg-new fg-pulse':''); }).join('')
   +(o.length?'<span class="fg-stk">'+o.map(function(f,i){ return '<span class="fg-si'+(isNew(p,f)?' fg-new':'')+'" style="--i:'+i+'" title="'+E(f.t)+'">'+tile(f.k)+'<em>'+E(f.t)+'</em></span>'; }).join('')+'</span>':'')+'</div>'; };
/* patients table (inline after the name) and rooms */
function compact(p,small){ var a=S(p); if(!a.length) return ''; var s=a.filter(function(f){ return f.k==='safe'; }), o=a.filter(function(f){ return f.k!=='safe'; });
  return s.map(function(f){ return cap(f.t,small?'s':''); }).join('')+o.map(function(f){ return '<i class="fg-w" title="'+E(FK[f.k]+': '+f.t)+'">'+tile(f.k,small?'s':'')+'</i>'; }).join(''); }
window.fgInline=function(p){ var h=compact(p,true); return h?'<span class="fg-inl">'+h+'</span>':''; };
window.fgRoom=function(p){ var h=compact(p,false); return h?'<div class="fg-room">'+h+'</div>':''; };

/* mutations */
function save(p){ try{ renderAll(); }catch(e){} }
function add(p,k,t,scope){ t=C(String(t||'')).trim().slice(0,40); if(!t) return;
  if(L(p).some(function(f){ return f.t.toLowerCase()===t.toLowerCase(); })) return;
  p.flags=L(p).concat([{id:uid(),k:FK[k]?k:'own',t:t,scope:scope==='visit'?'visit':'always',by:who(),at:new Date(),from:null}]);
  try{ p.timeline.push({label:'Flag added',at:new Date(),meta:t}); }catch(e){}
  save(p); }
function remove(p,id){ var f=L(p).find(function(x){ return x.id===id; }); if(!f) return;
  p.flags=L(p).filter(function(x){ return x.id!==id; });
  try{ p.timeline.push({label:'Flag removed',at:new Date(),meta:f.t}); }catch(e){}
  save(p); }
window.fgAdd=add; window.fgRemove=remove;

/* drawer section */
var ST={pid:null,edit:false,sheet:false,scope:'always',touched:false,q:''};
function when(d){ if(!d) return ''; var x=new Date(d), t=new Date(); try{
  if(x.toDateString()===t.toDateString()) return x.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  return x.toLocaleDateString([], {month:'short',day:'numeric'}); }catch(e){ return ''; } }
function sectionHTML(p){ var a=S(p), pulse=PULSE===p.id; PULSE=null;
  var h='<div class="fg-sec'+(ST.edit?' edit':'')+'" id="fgSec"><div class="fg-hd"><p class="sect-title">Flags</p>'
   +(a.length?'<button type="button" class="fg-link" data-fg="edit">'+(ST.edit?'Done':'Edit')+'</button>':'')+'</div><div class="fg-group">';
  h+=a.map(function(f){ var meta=[f.scope==='visit'?'This visit':'Always', f.by?E(f.by):'', when(f.at)].filter(Boolean).join(' · ');
    return '<div class="fg-row" data-id="'+E(f.id)+'"><button type="button" class="fg-min" data-fg="arm" aria-label="Remove '+E(f.t)+'">'+MINUS+'</button>'
     +tile(f.k,'l'+(pulse&&f.k==='safe'?' fg-pulse':''))+'<div class="fg-tx"><b'+(f.k==='safe'?' style="color:var(--fg-red)"':'')+'>'+E(f.t)+'</b><small>'+E(FK[f.k])+' · '+meta+'</small></div>'
     +'<button type="button" class="fg-del" data-fg="del">Remove</button></div>'; }).join('');
  h+='<button type="button" class="fg-add" data-fg="add" aria-expanded="'+ST.sheet+'">'+PLUS+'<span>Add flag</span></button></div>';
  if(ST.sheet) h+=sheetHTML(p);
  return h+'</div>'; }
function sheetHTML(p){ var have={}; L(p).forEach(function(f){ have[f.t.toLowerCase()]=1; }); var q=ST.q.trim().toLowerCase(), any=false;
  var opts=ORDER.map(function(k){ var items=CAT[k].filter(function(t){ return !q||t.toLowerCase().indexOf(q)>-1; }); if(!items.length) return ''; any=true;
    return '<div class="fg-sh">'+FK[k]+'</div>'+items.map(function(t){ return '<button type="button" class="fg-opt'+(have[t.toLowerCase()]?' on':'')+'" data-fg="opt" data-k="'+k+'" data-t="'+E(t)+'">'+tile(k)+'<span class="fg-lb">'+E(t)+'</span>'+CK+'</button>'; }).join(''); }).join('');
  var custom=q&&!CAT.safe.concat(CAT.hand,CAT.med,CAT.iso,CAT.own).some(function(t){ return t.toLowerCase()===q; });
  return '<div class="fg-sheet" role="dialog" aria-label="Add flag"><label class="fg-search">'+MAG+'<input id="fgQ" type="search" enterkeyhint="search" placeholder="Search or new flag" value="'+E(ST.q)+'" autocomplete="off" aria-label="Search or new flag">'+(ST.q?'<button type="button" class="fg-x" data-fg="clearq" aria-label="Clear search" title="Clear"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".32"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg></button>':'')+'</label>'
   +'<div class="fg-seg" role="group" aria-label="Keep the flag"><button type="button" data-fg="scope" data-s="always" class="'+(ST.scope==='always'?'on':'')+'">Always</button><button type="button" data-fg="scope" data-s="visit" class="'+(ST.scope==='visit'?'on':'')+'">This visit</button></div>'
   +'<div class="fg-opts">'+opts+(custom?'<div class="fg-new-as">Add “'+E(ST.q.trim())+'” as'+ORDER.map(function(k){ return '<button type="button" data-fg="new" data-k="'+k+'">'+tile(k,'s')+FK[k]+'</button>'; }).join('')+'</div>':'')
   +(!any&&!custom?'<div class="fg-new-as">No matches</div>':'')+'</div>'
   +'<div class="fg-sheet-ft"><button type="button" class="fg-pill g" data-fg="close">Done</button></div></div>'; }
function mountFor(p){ var m=document.getElementById('flagsMount'); if(!m||!p) return; if(ST.pid!==p.id){ ST={pid:p.id,edit:false,sheet:false,scope:'always',touched:false,q:''}; }
  var hadFocus=document.activeElement&&document.activeElement.id==='fgQ', pos=hadFocus?document.activeElement.selectionStart:null, sc=m.querySelector('.fg-opts'), top=sc?sc.scrollTop:0;
  m.innerHTML=sectionHTML(p);
  var ns=m.querySelector('.fg-opts'); if(ns) ns.scrollTop=top;
  var qi=m.querySelector('#fgQ'); if(qi){ qi.oninput=function(){ ST.q=qi.value; mountFor(p); };
    qi.onkeydown=function(e){ if(e.key==='Escape'&&ST.q){ e.preventDefault(); e.stopPropagation(); ST.q=''; mountFor(p); var qe=document.getElementById('fgQ'); if(qe) qe.focus(); return; }   /* PVX-N361 */
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); ST.sheet=false; ST.q=''; mountFor(p); m.querySelector('[data-fg="add"]').focus(); }
      if(e.key==='Enter'&&ST.q.trim()){ var first=m.querySelector('.fg-opt:not(.on)'); if(first) first.click(); else { var nb=m.querySelector('[data-fg="new"][data-k="own"]'); if(nb) nb.click(); } } };
    if(hadFocus){ qi.focus(); try{ qi.setSelectionRange(pos,pos); }catch(e){} } } }
window.fgMount=function(p){ try{ mountFor(p); }catch(e){} };
document.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('#flagsMount [data-fg]'); if(!b) return;
  var p=PATIENTS.find(function(x){ return x.id===ST.pid; }); if(!p) return; var act=b.dataset.fg, row=b.closest('.fg-row');
  if(act==='clearq'){ ST.q=''; mountFor(p); var qc=document.getElementById('fgQ'); if(qc) qc.focus(); return; }   /* PVX-N361 */
  if(act==='edit'){ ST.edit=!ST.edit; if(!ST.edit) document.querySelectorAll('#flagsMount .fg-row.arm').forEach(function(r){ r.classList.remove('arm'); }); var sec=document.getElementById('fgSec'); sec.classList.toggle('edit',ST.edit); b.textContent=ST.edit?'Done':'Edit'; return; }
  if(act==='arm'){ var was=row.classList.contains('arm'); document.querySelectorAll('#flagsMount .fg-row.arm').forEach(function(r){ r.classList.remove('arm'); }); if(!was) row.classList.add('arm'); return; }
  if(act==='del'){ var id=row.dataset.id; row.style.maxHeight=row.offsetHeight+'px'; void row.offsetWidth; row.classList.add('gone');
    setTimeout(function(){ remove(p,id); if(!L(p).length) ST.edit=false; mountFor(p); }, pvxReduceMotion()?160:340); return; }
  if(act==='add'){ ST.sheet=!ST.sheet; ST.q=''; ST.touched=false; ST.scope='always'; mountFor(p); if(ST.sheet){ var qi=document.getElementById('fgQ'); if(qi) qi.focus(); } return; }
  if(act==='close'){ ST.sheet=false; ST.q=''; mountFor(p); return; }
  if(act==='scope'){ ST.scope=b.dataset.s; ST.touched=true; b.parentNode.querySelectorAll('button').forEach(function(x){ x.classList.toggle('on',x===b); }); return; }
  if(act==='opt'){ var t=b.dataset.t, k=b.dataset.k, ex=L(p).find(function(f){ return f.t.toLowerCase()===t.toLowerCase(); });
    if(ex){ remove(p,ex.id); b.classList.remove('on'); }
    else { add(p,k,t,ST.touched?ST.scope:(k==='iso'?'visit':ST.scope)); b.classList.add('on'); }
    setTimeout(function(){ mountFor(p); }, 380); return; }
  if(act==='new'){ add(p,b.dataset.k,ST.q,ST.touched?ST.scope:(b.dataset.k==='iso'?'visit':ST.scope)); ST.q=''; mountFor(p); var qi2=document.getElementById('fgQ'); if(qi2) qi2.focus(); return; }
});

/* check-in: "Always" flags from the pet's last visit come forward */
function key(v){ return String(v==null?'':v).toLowerCase().replace(/\s+/g,' ').trim(); }
function digits(v){ return String(v==null?'':v).replace(/\D/g,'').slice(-10); }
function priorFlags(p,pool){ var nm=key((p.name||'')+' '+(p.last||'')); if(!nm) return null; var ow=key(p.owner), ph=digits(p.ownerPhone);
  var prev=(pool||PATIENTS).filter(function(x){ return x!==p&&x.id!==p.id&&L(x).length&&key((x.name||'')+' '+(x.last||''))===nm&&((ow&&key(x.owner)===ow)||(ph.length>=7&&digits(x.ownerPhone)===ph)); })
    .sort(function(a,b){ return new Date(b.arrival||0)-new Date(a.arrival||0); });
  for(var i=0;i<prev.length;i++){ var al=L(prev[i]).filter(function(f){ return f.scope!=='visit'; }); if(al.length) return {from:prev[i],flags:al}; }
  return null; }
function carry(p){ if(L(p).length) return; var pr=priorFlags(p); if(!pr){ older(p); return; } carryFrom(p,pr); }
/* not in the last 30 days Flow keeps loaded: look up this pet's older visits by name (one small read) */
function older(p){ if(typeof fvVisitsByName!=='function'||typeof Backend==='undefined'||Backend._visitsMode!=='recent') return;
  fvVisitsByName((p.name||'')+' '+(p.last||'')).then(function(list){ var cur=PATIENTS.find(function(x){ return x.id===p.id; })||p; if(L(cur).length) return;
    var pr=priorFlags(cur,list); if(pr) carryFrom(cur,pr); }).catch(function(e){ console.warn('[flags] older visits',e); }); }
function carryFrom(p,pr){
  p.flags=pr.flags.map(function(f){ return {id:uid(),k:f.k,t:f.t,scope:'always',by:f.by||null,at:f.at||null,from:String(pr.from.id)}; });
  try{ p.timeline.push({label:'Flags from last visit',at:new Date(),meta:p.flags.map(function(f){ return f.t; }).join(', ')}); }catch(e){}
  save(p); notifyCheckin(p); }
window.fgCarry=carry;
if(typeof commitPatient==='function'){ 
  pvxWrap('commitPatient',function(_commit){ return function(){ var before={}; PATIENTS.forEach(function(x){ before[x.id]=1; }); var r=_commit.apply(this,arguments);
    try{ PATIENTS.filter(function(x){ return !before[x.id]; }).forEach(carry); }catch(e){} return r; }; },'#9'); }

function notifyCheckin(p){ var old=document.querySelector('.fg-ntf'); if(old) old.remove();
  var a=S(p), s=a.filter(function(f){ return f.k==='safe'; }), n=a.length, nm=((p.name||'')+' '+(p.last||'')).trim();
  var lead=s.length?s[0].t:a[0].t, rest=n-1;
  var el=document.createElement('div'); el.className='fg-ntf'; el.setAttribute('role','status');
  el.innerHTML='<span class="fg-app">'+APP+'</span><div class="fg-bd"><div class="fg-nh"><span class="fg-nk">Check-in</span><span aria-hidden="true">now</span></div><b>'+E(nm)+' is here</b>'
   +'<p>'+E(lead)+(rest?' and '+rest+' more flag'+(rest>1?'s':''):'')+' from the last visit.</p><div class="fg-rw">'+compact(p,false)+'</div>'
   +'<div class="fg-acts"><button type="button" class="fg-pill p" data-n="keep">Keep Flags</button><button type="button" class="fg-pill g" data-n="review">Review</button></div></div>';
  var wrap=document.getElementById('notes'); (wrap||document.body).appendChild(el); requestAnimationFrame(function(){ requestAnimationFrame(function(){ el.classList.add('show'); }); });
  var gone=false, timer=setTimeout(function(){ close(); }, 20000);
  function close(){ if(gone) return; gone=true; clearTimeout(timer); el.classList.add('out'); setTimeout(function(){ el.remove(); }, 450); }
  el.querySelector('[data-n="review"]').onclick=function(){ close(); try{ ST={pid:p.id,edit:true,sheet:false,scope:'always',touched:false,q:''}; openDrawer(p.id); }catch(e){} };
  el.querySelector('[data-n="keep"]').onclick=function(){ var to=document.querySelector('.card[data-pid="'+(window.CSS&&CSS.escape?CSS.escape(p.id):p.id)+'"] .fg-fl'), from=el.querySelectorAll('.fg-rw>*');
    var r=to&&to.getBoundingClientRect(), vis=r&&r.width&&r.top<innerHeight&&r.bottom>0;
    if(!vis||pvxReduceMotion()||!Element.prototype.animate){ close(); return; }
    var targets=to.querySelectorAll('.fg-cap,.fg-si'), done=0;
    [].forEach.call(from,function(src,i){ var a=src.getBoundingClientRect(), t=targets[i]||to, b=t.getBoundingClientRect(), c=src.cloneNode(true);
      c.classList.add('fg-fly'); c.style.left=a.left+'px'; c.style.top=a.top+'px'; document.body.appendChild(c); src.style.opacity=0;
      var dx=b.left-a.left, dy=b.top-a.top;
      var an=c.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate('+dx*.5+'px,'+(dy*.5-30)+'px) scale(1.12)',offset:.5},{transform:'translate('+dx+'px,'+dy+'px) scale(1)'}],{duration:640,delay:i*45,easing:'cubic-bezier(.32,.72,0,1)',fill:'forwards'});
      an.onfinish=function(){ c.remove(); if(++done===from.length){ var card=to.closest('.card'); if(card){ card.classList.remove('just-added'); void card.offsetWidth; card.classList.add('just-added'); setTimeout(function(){ card.classList.remove('just-added'); },750); } } }; });
    setTimeout(close,140); };
}
window.fgNotifyCheckin=notifyCheckin;

/* drawer hooks: section on every fill, Safety pulses once when the patient is opened */
if(typeof fillDrawer==='function'){ pvxAfter('fillDrawer',function(p){ try{ mountFor(p); }catch(e){} },'#9'); }
if(typeof openDrawer==='function'){ pvxBefore('openDrawer',function(pid){ PULSE=pid; },'#9'); }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 10 of 104 · no id ━━━━━ */
try{
/* ═════════ FLOW — Diagnostics → treatment sheet · Admit · Rounds pre-fill · lb→kg as you type (Oct 2026) ═════════
   · A patient moved to Diagnostics gets an outpatient treatment sheet; from an exam room (Room 1–7, Comfort Room) they also move to Treatment.
   · Once a visit has an outpatient sheet, its board card shows Admit: the sheet becomes inpatient and the patient joins Rounds, filled in
     from the visit (reason, triage, intake, flags, ultrasound, and the treatments already on the sheet).
   · Weight typed in pounds shows its kg as you type, and is stored in kg. */
(function(){
  function cur(p){ return (p&&PATIENTS.find(function(x){ return x.id===p.id; }))||p; }
  function active(p){ try{ return isActive(p); }catch(e){ return p&&!p.completed; } }
  function inRoom(p){ var r=String(p&&p.room||''); return r!=='Lobby'&&r!=='Treatment'&&/room/i.test(r); }

  /* the module (Flow → Treatment Sheets) reports what each sheet is now */
  window.fvSheetSeen=function(p,res,board){ var q=cur(p); if(!q) return;
    var b=(res==='closed'||res==='undone')?null:(res==='promoted'||res==='reopened')?'IP':(res==='demoted')?'OP':(board||null);
    if(!b&&!q.tsSheet) return; if(q.tsSheet&&q.tsSheet.board===b) return;
    q.tsSheet=b?{board:b,at:new Date().toISOString()}:null; try{ scheduleRender(function(){ if(activePatient===q.id) fillDrawer(q); }); }catch(e){} };
  function hasOP(p){ return !!(p&&p.tsSheet&&p.tsSheet.board==='OP'&&active(p)&&p.status!=='Hospitalized'); }

  /* Diagnostics: make the outpatient sheet; from a room, go to Treatment (the Treatment move makes the sheet itself) */
  if(typeof moveStatus==='function'){ 
    pvxWrap('moveStatus',function(_ms){ return function(p,newStatus){ var was=p&&p.status, r=_ms.apply(this,arguments);
      try{ if(p&&newStatus==='Diagnostics'&&was!=='Diagnostics'&&p.status==='Diagnostics'&&active(p)){
        if(p.room!=='Treatment'&&typeof moveRoom==='function') moveRoom(p,'Treatment');   /* a sheet means Treatment (n91: from the Lobby too); the move makes the sheet */
        else if(!p._demo&&window.fvAdmitSheet&&fvAdmitSheet.ensure) fvAdmitSheet.ensure(p,'OP'); } }catch(e){ console.warn('[flow diagnostics]',e); }
      return r; }; },'#10'); }

  /* drawer: the Admit card says what it will do; a visit from before this change is checked once */
  var looked={};
  if(typeof fillDrawer==='function'){ 
    pvxAfter('fillDrawer',function(p){ 
      try{ var n=document.getElementById('dAdmitNote'); if(n) n.hidden=!hasOP(p);
        if(p&&!p._demo&&!p.tsSheet&&!looked[p.id]&&active(p)&&typeof DB!=='undefined'&&DB&&window.fvAdmitSheet&&fvAdmitSheet.id){ looked[p.id]=1;
          DB.collection('sheets').doc(fvAdmitSheet.id(p)).get().then(function(s){ var d=s.exists&&s.data(); if(d&&d.status==='active') fvSheetSeen(p,'exists',d.board||'IP'); }).catch(function(){}); } }catch(e){}
      },'#10'); }

  /* Rounds pre-fill (called by rdEnroll) */
  function triAt(p,t){ var base=p.arrival?new Date(p.arrival):new Date(), m=String(t&&t.at||'').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i); if(!m) return base;
    var h=+m[1]%12; if(m[3]&&/p/i.test(m[3])) h+=12; var d=new Date(base); d.setHours(h,+m[2],0,0); if(p.arrival&&d<new Date(p.arrival)-60000) d.setDate(d.getDate()+1); if(d>new Date()) d=new Date(); return d; }
  function num(v){ var m=String(v==null?'':v).match(/-?\d+(\.\d+)?/); return m?parseFloat(m[0]):null; }
  window.fvRoundsPrefill=function(p,at){ var r=p.rounds; if(!r) return; var t=p.triage||{}, v=t.vitals||{}, a=t.assess||{}, k=p.intake||{}, cap=(typeof rdCap==='function')?rdCap:function(x){ return x; };
    /* working assessment: reason for visit (+ how long) */
    if(!r.assessment){ var why=[p.reason||k.complaint||'', k.duration?('× '+k.duration):''].filter(Boolean).join(' '); if(why) r.assessment=cap(why); }
    /* problems: intake complaint + triage chief complaints */
    var have={}; (r.problems||[]).forEach(function(x){ have[String(x.label).toLowerCase()]=1; });
    [].concat(String(k.complaint||'').split(/\s*,\s*/),t.chief||[]).map(function(x){ return String(x||'').trim(); }).filter(Boolean).forEach(function(x){ var l=cap(x); if(have[l.toLowerCase()]) return; have[l.toLowerCase()]=1; r.problems.push({id:rdId(),label:l,active:true,resolvedAt:null}); });
    /* triage: one event + trend points at the triage time */
    var ta=triAt(p,t), parts=[];
    [['temp','T'],['hr','HR'],['rr','RR'],['weight','']].forEach(function(x){ if(v[x[0]]) parts.push((x[1]?x[1]+' ':'')+v[x[0]]); });
    [['mentation','Mentation'],['mm','MM'],['crt','CRT']].forEach(function(x){ if(a[x[0]]) parts.push(x[1]+' '+a[x[0]]); });
    if(parts.length) r.events.push({id:rdId(),at:rdIso(ta),text:'Triage — '+parts.join(' · ')+(t.by?' ('+t.by+')':''),by:t.by||null,kind:'clinical'});
    r.series=r.series||{}; ['temp','hr','rr'].forEach(function(key){ var n=num(v[key]); if(n==null) return; (r.series[key]=r.series[key]||[]).push({at:rdIso(ta),v:n,v2:null}); });
    /* intake: owner history, meds, allergies, what was abnormal */
    var bits=[]; if(k.history) bits.push(String(k.history).trim());
    try{ (TRIAGE_Q||[]).forEach(function(q){ var ans=k.q&&k.q[q.key]; if(ans&&ans!==q.normal){ var base=q.label.replace(/\?$/,''), lab=ans==='no'?'Not '+base.toLowerCase():((typeof TRIAGE_SHORT!=='undefined'&&TRIAGE_SHORT[q.key])||base); bits.push(lab+(k.qnotes&&k.qnotes[q.key]?' ('+k.qnotes[q.key]+')':'')); } }); }catch(e){}
    if(k.medications) bits.push('Meds: '+k.medications); if(k.allergies) bits.push('Allergies: '+k.allergies); if(k.conditions) bits.push('History: '+k.conditions);
    if(bits.length) r.events.push({id:rdId(),at:rdIso(p.arrival?new Date(p.arrival):at),text:'Intake — '+bits.join(' · '),by:null,kind:'clinical'});
    /* safety / handling flags from Flow */
    var fl={}; (r.flags||[]).forEach(function(f){ fl[f.label]=1; });
    (Array.isArray(p.flags)?p.flags:[]).forEach(function(f){ if(f&&(f.k==='safe'||f.k==='hand')&&f.t&&!fl[f.t]){ fl[f.t]=1; r.flags.push({id:rdId(),label:f.t,kind:'safety'}); } });
    r.events.sort(function(x,y){ return new Date(x.at)-new Date(y.at); });
    /* treatments already on the treatment sheet arrive once the sheet is inpatient */
    if(!r.treatments.length) setTimeout(function(){ fvRoundsTreatments(p); },1800); };
  /* n250: triage saved after the patient is on Rounds: write or replace the triage line and its trend points */
  function triParts(t){ var v=t.vitals||{}, a=t.assess||{}, parts=[];
    [['temp','T'],['hr','HR'],['rr','RR'],['weight','']].forEach(function(x){ if(v[x[0]]) parts.push((x[1]?x[1]+' ':'')+v[x[0]]); });
    [['mentation','Mentation'],['mm','MM'],['crt','CRT']].forEach(function(x){ if(a[x[0]]) parts.push(x[1]+' '+a[x[0]]); });
    return parts; }
  window.fvRoundsTriage=function(p0){ var p=cur(p0)||p0, r=p&&p.rounds; if(!r||r.outcome) return false;
    var t=p.triage||{}, v=t.vitals||{}, parts=triParts(t); if(!parts.length) return false;
    var text='Triage — '+parts.join(' · ')+(t.by?' ('+t.by+')':''), at=rdIso(triAt(p,t));
    r.events=r.events||[]; r.series=r.series||{};
    var old=null; r.events.forEach(function(e){ if(!old&&e&&e.kind==='clinical'&&/^Triage — /.test(e.text||'')) old=e; });
    var oldAt=old?old.at:null, sig=function(){ return JSON.stringify([old&&[old.text,old.at,old.by],['temp','hr','rr'].map(function(k){ return r.series[k]||[]; })]); }, before=sig();
    if(old){ old.text=text; old.at=at; old.by=t.by||null; }
    else { old={id:rdId(),at:at,text:text,by:t.by||null,kind:'clinical'}; r.events.push(old); }
    ['temp','hr','rr'].forEach(function(k){ var L=(r.series[k]||[]).filter(function(pt){ return !oldAt||pt.at!==oldAt; }), n=num(v[k]);
      if(n!=null) L.push({at:at,v:n,v2:null});
      L.sort(function(x,y){ return new Date(x.at)-new Date(y.at); });
      if(L.length||r.series[k]) r.series[k]=L; });
    if(sig()===before) return false;
    r.events.sort(function(x,y){ return new Date(x.at)-new Date(y.at); });
    try{ rdTouch(p,'Triage vitals from Flow'); }catch(e){ try{ renderAll(); }catch(_){} }
    return true; };
  function rxLine(o){ var bits=[]; if(o.dose!=null&&o.dose!=='') bits.push(o.dose+(o.unit?' '+o.unit:'')); if(o.rate) bits.push(o.rate+(o.rate_u?' '+o.rate_u:' mL/hr')); if(o.route) bits.push(o.route); if(o.freq&&o.freq!=='CRI') bits.push(o.freq); return bits.join(' · '); }
  window.fvRoundsTreatments=function(p){ try{ if(typeof DB==='undefined'||!DB||!window.fvAdmitSheet) return;
    DB.collection('sheets').doc(fvAdmitSheet.id(p)).get().then(function(s){ var d=s.exists&&s.data(); if(!d) return; var q=cur(p); if(!q.rounds||q.rounds.outcome||q.rounds.treatments.length) return;
      var O=d.orders||{}, L=Object.keys(O).map(function(id){ return O[id]; }).filter(function(o){ return o&&!o.dc&&!o.draft&&(o.type==='med'||o.cont||o.type==='fluid'||o.kind)&&!/^d\d+$/.test(String(o.id||'')); });
      if(!L.length) return; L.forEach(function(o){ q.rounds.treatments.push({id:rdId(),name:o.name||'Treatment',detail:rxLine(o)}); });
      rdTouch(q,'Treatments from the treatment sheet · '+L.length); }).catch(function(e){ console.warn('[rounds treatments]',e); }); }catch(e){} };

  /* weight in pounds: its kg as you type */
  function kgHint(el){ var h=el.parentNode&&el.parentNode.querySelector('.fv-kg'); var r=(typeof parseWeightInput==='function')?parseWeightInput(el.value):null;
    var show=!!(r&&r.valid&&(r.lb||/lb|pound|#/i.test(el.value)));
    if(!show){ if(h) h.remove(); return; } if(!h){ h=document.createElement('div'); h.className='fv-kg'; h.setAttribute('aria-live','polite'); el.insertAdjacentElement('afterend',h); }
    h.textContent='= '+r.display; }
  document.addEventListener('input',function(e){ var el=e.target; if(el&&el.matches&&el.matches('#apWeight, #triEditBody [data-vk="weight"]')) kgHint(el); },true);
  document.addEventListener('blur',function(e){ var el=e.target; if(el&&el.matches&&el.matches('#apWeight, #triEditBody [data-vk="weight"]')) setTimeout(function(){ var h=el.parentNode&&el.parentNode.querySelector('.fv-kg'); if(h&&/kg\s*$/i.test(el.value)) h.remove(); },0); },true);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 11 of 104 · no id ━━━━━ */
try{
/* ═════════ FLOW — admits sent from an outpatient treatment sheet (Oct 2026) ═════════
   Treatment Sheets' Admit moves the sheet to the IP Board and leaves visits/{id}.admit_request. The first staff Flow screen that sees it
   claims it in a transaction (only one screen admits), admits the visit here — which adds the patient to Rounds, filled in — and clears it. */
(function(){
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search), busy={};
  function me(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} return u; }
  function clear(id){ try{ var o={}; o.admit_request=firebase.firestore.FieldValue.delete(); DB.collection('visits').doc(String(id)).update(o).catch(function(){}); }catch(e){} }
  window.fvAdmitRequests=function(){ var u=me(); if(LOBBY||!u||typeof DB==='undefined'||!DB||typeof PATIENTS==='undefined') return;
    try{ if(document.body.classList.contains('client-mode')||document.body.classList.contains('tv-mode')) return; }catch(e){}
    PATIENTS.forEach(function(p){ var q=p&&p.admitRequest; if(!q||p._demo||busy[p.id]) return;
      if(p.completed||(typeof isActive==='function'&&!isActive(p))){ busy[p.id]=1; clear(p.id); return; }   /* already admitted / discharged: nothing to do */
      busy[p.id]=1; var ref=DB.collection('visits').doc(String(p.id));
      DB.runTransaction(function(t){ return t.get(ref).then(function(snap){ var d=snap.exists&&snap.data(), r=d&&d.admit_request;
        if(!r||r.claimed) return false; t.update(ref,{'admit_request.claimed':u.uid,'admit_request.claimed_at':new Date().toISOString()}); return true; }); })
      .then(function(mine){ if(!mine) return; var cur=PATIENTS.find(function(x){ return x.id===p.id; })||p; if(cur.completed) { clear(p.id); return; }
        completePatient(cur,'Admitted');
        try{ var ev=(cur.timeline||[]).slice().reverse().find(function(e){ return /admit/i.test(e&&e.label||''); }); if(ev) ev.meta=(ev.meta?ev.meta+' · ':'')+'from Treatment Sheets'+(q.by?' · '+q.by:''); }catch(e){}
        setTimeout(function(){ clear(p.id); },1500); })
      .catch(function(e){ console.warn('[admit from sheet]',e); delete busy[p.id]; }); }); };
  setInterval(function(){ try{ fvAdmitRequests(); }catch(e){} },3000);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 12 of 104 · no id ━━━━━ */
try{
/* n114 Grid link: only for accounts Grid lets in (keep in step with grid/index.html ALLOWED) */(function(){var a=document.getElementById("navGrid");if(!a)return;var OK=["daniel.giordano@pravix.app"];function set(u){var e=u&&u.email?String(u.email).toLowerCase():"";a.style.display=OK.indexOf(e)>-1?"":"none";}try{if(typeof AUTH!=="undefined"&&AUTH&&AUTH.onAuthStateChanged){set(AUTH.currentUser);AUTH.onAuthStateChanged(set);}}catch(e){}})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 13 of 104 · no id ━━━━━ */
try{
/* ═════════ n116 — Rounds follows the treatment sheet ═════════
   One listener per Rounds patient with a sheet. Current treatment = the sheet's active meds, fluids and CRIs (tagged oid);
   untagged entries (typed in Rounds) are never touched. Location is shared both ways through rounds.locSheet. */
(function(){
  if(typeof rdTouch!=='function'||typeof rdId!=='function'||typeof rdNormLoc!=='function') return;
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search), subs={}, AT={};
  function ok(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    return !!u&&!LOBBY&&typeof DB!=='undefined'&&DB&&window.fvAdmitSheet&&!document.body.classList.contains('client-mode')&&!document.body.classList.contains('tv-mode'); }
  /* n117 — Rounds treatments: the dose you'd say at rounds (total mg / pump rate) first, the per-kg alongside */
  function line0(o){ var b=[];   /* n116's wording: still matches the one-time copy made at admit */
    if(o.cont||o.type==='fluid'||o.kind){ if(o.rate_v!=null) b.push(o.rate_v+' '+(o.rate_u||'mL/hr')); if(o.additive) b.push('+ '+o.additive); if(o.conc_label) b.push(o.conc_label); b.push(o.route||'IV'); return b.join(' · '); }
    if(o.dose!=null&&o.dose!=='') b.push(o.dose+(o.unit?' '+o.unit:'')); if(o.route) b.push(o.route); if(o.freq) b.push(o.freq); return b.join(' · '); }
  var UMG={mcg:0.001,mg:1,g:1000}, FEED=/\b(feed|food|diet|meal|rer|npo|water|nutrition)\b/i;
  function num(n){ n=Number(n); return !isFinite(n)?'':n>=100?String(Math.round(n)):n>=10?String(Math.round(n*10)/10):String(Math.round(n*100)/100); }
  function ab(u){ return String(u||'').replace(/\/day$/,'/d'); }
  function fq(f){ f=String(f||''); return /^once$/i.test(f)?'once':f; }
  function perHr(v,u,kg){ var t=Number(v)||0; if(/\/kg/.test(u)) t*=kg; if(/\/min$/.test(u)) t*=60; else if(/\/day$/.test(u)) t/=24; return t; }
  function mlhr(o,kg){ var u=String(o.rate_u||''); if(/\/kg/.test(u)&&!kg) return null; if(/^mL\//.test(u)) return perHr(o.rate_v,u,kg);   /* same math as the sheet's pump rate */
    var c=Number(o.conc)||0; if(!c) return null; var b=u.split('/')[0], cu=o.conc_u||String(((o.rates&&o.rates[0])||{}).u||u).split('/')[0]||b, x=perHr(o.rate_v,u,kg);
    if(b!==cu){ if(!(UMG[b]&&UMG[cu])) return null; x*=UMG[b]/UMG[cu]; } return x/c; }
  function bsa(kg,sp){ return (/cat|feline/i.test(String(sp||''))?10:10.1)*Math.pow(kg,2/3)/100; }
  function fmt(o,kg,sp){ var g,main,k='',sub='';
    if(o.type==='obs'||o.type==='care'||o.type==='diag'){ g=FEED.test(o.name||'')?'feed':'care'; main=fq(o.freq); if(g==='feed') sub=String(o.notes||'').trim(); }
    else if(o.cont||o.type==='fluid'||o.kind){ var u=String(o.rate_u||'mL/hr'), m=mlhr(o,kg), rt=o.route||'IV'; g='fl';
      if(Number(o.rate_v)===0) main='Paused';
      else if(o.kind==='cri'){ main=m!=null?num(m)+' mL/hr '+rt:o.rate_v+' '+ab(u)+' '+rt; if(m!=null) k=o.rate_v+' '+ab(u);
        var cl=o.conc_label||(o.conc?num(o.conc)+' '+(o.conc_u||u.split('/')[0])+'/mL':''); sub='CRI'+(cl?' · '+cl:''); }
      else { main=(m!=null?num(m)+' mL/hr':o.rate_v+' '+ab(u))+' '+rt; if(/^mL\/kg/.test(u)) k=o.rate_v+' '+ab(u); else if(m!=null&&kg) k=Math.round(m*24/kg)+' mL/kg/d'; }
      if(o.additive) sub=(sub?sub+' · ':'')+'+ '+o.additive; }
    else { var un=String(o.unit||''), per=un.split('/')[1]||'', base=un.split('/')[0], tot=null, w=[];
      if(per&&kg) tot=per==='kg'?o.dose*kg:per==='lb'?o.dose*kg*2.20462:per==='m²'?o.dose*bsa(kg,sp):null;
      w.push(tot!=null?num(tot)+' '+base:(o.dose!=null&&o.dose!==''?o.dose+(un?' '+un:''):'')); if(o.route) w.push(o.route); if(o.freq) w.push(fq(o.freq));
      main=w.filter(Boolean).join(' '); if(tot!=null) k=o.dose+' '+un; g='med'; }
    return {g:g,main:main||'',kg:k,sub:sub,detail:[sub,main,k].filter(Boolean).join(' · ')}; }
  function line(o,kg,sp){ return fmt(o,kg,sp).detail; }
  function isTx(o){ return !!o&&!o.draft&&(o.type==='med'||o.cont||o.type==='fluid'||!!o.kind||o.type==='obs'||o.type==='care'||o.type==='diag')&&!/^d\d+$/.test(String(o.id||'')); }
  function live(o){ return isTx(o)&&!o.dc&&!o.stopped&&!(/^once$/i.test(String(o.freq||''))&&o.once_done); }
  function me(){ var u=null; try{ u=AUTH.currentUser; }catch(e){} var n=(typeof CURRENT_USER==='string'&&CURRENT_USER)||(u&&(u.displayName||u.email))||'Flow';
    return {name:n,uid:u?u.uid:null,initials:n.split(/\s+/).map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase()}; }
  function oat(o){ return new Date(o.ordered_at||o.started_at||0).getTime()||0; }
  function apply(id,ref,d){ var p=(typeof PATIENTS!=='undefined')&&PATIENTS.find(function(x){ return String(x.id)===id; }); if(!p||!p.rounds||p.rounds.outcome||!d) return;
    var r=p.rounds, T=r.treatments=r.treatments||[], O=d.orders||{}, all=Object.keys(O).map(function(k){ return O[k]; }).filter(isTx).sort(function(a,b){ return oat(a)-oat(b); }), want=all.filter(live), msgs=[];
    var pt=d.patient||{}, kg=Number(pt.weight)||Number(p.weightKg)||0, sp=pt.species||p.species||'';
    var tagged={}; T.forEach(function(t){ if(t.oid) tagged[t.oid]=t; });
    all.forEach(function(o){ if(tagged[o.id]) return; var nm=o.name||'Treatment', a0=line0(o), a1=line(o,kg,sp);
      var m=T.find(function(t){ return !t.oid&&t.name===nm&&(t.detail===a0||t.detail===a1); }); if(m){ m.oid=o.id; tagged[o.id]=m; } });   /* the one-time copy at admit */
    var keep={}, quiet=0; want.forEach(function(o){ keep[o.id]=1; var nm=o.name||'Treatment', f=fmt(o,kg,sp), t=tagged[o.id];
      if(!t){ T.push({id:rdId(),name:nm,detail:f.detail,oid:o.id,g:f.g,main:f.main,kg:f.kg,sub:f.sub}); msgs.push('+'+nm); }
      else if(t.name!==nm||t.detail!==f.detail||t.g!==f.g||t.main!==f.main||(t.kg||'')!==f.kg||(t.sub||'')!==f.sub){ var old=!t.g&&t.name===nm;
        t.name=nm; t.detail=f.detail; t.g=f.g; t.main=f.main; t.kg=f.kg; t.sub=f.sub; if(old) quiet++; else msgs.push('~'+nm); } });
    for(var i=T.length-1;i>=0;i--){ var t=T[i]; if(t.oid&&!keep[t.oid]){ msgs.push('−'+t.name); T.splice(i,1); } }
    if(quiet&&!msgs.length) msgs.push('fmt');   /* n116 entries rewritten in the new layout: saved, nothing to announce */
    /* location: whichever side changed since the last sync wins */
    var sl=rdNormLoc(d.patient&&d.patient.location)||null, rl=rdNormLoc(r.location)||null;
    if(sl!==(r.locSheet||null)){ if(sl&&sl!==rl){ r.location=sl; msgs.push('Location '+sl); } r.locSheet=sl; if(!sl) r.locSheet=null; if(!msgs.length) msgs.push('loc'); }
    else if(rl&&rl!==sl){ var w=me(), at=new Date().toISOString();
      ref.update({'patient.location':rl, updated_at:at, updated_by:w.initials, audit:firebase.firestore.FieldValue.arrayUnion({at:at,type:'care',desc:'Location → <b>'+rl+'</b> (from Rounds)',who:w.initials,uid:w.uid})})
        .catch(function(e){ console.warn('[rounds → sheet location]',e); });
      r.locSheet=rl; msgs.push('loc'); }
    if(!msgs.length) return;
    var said=msgs.filter(function(x){ return x!=='loc'&&x!=='fmt'; }), tx=said.filter(function(x){ return /^[+~−]/.test(x); });
    rdTouch(p, tx.length?('Treatment sheet · '+tx.join(' ')).slice(0,180):(said[0]||(msgs.indexOf('fmt')>=0?'Treatments from the treatment sheet':'Location from the treatment sheet')), true); }
  function watch(){ if(!ok()||typeof PATIENTS==='undefined') return; var need={};
    PATIENTS.forEach(function(p){ if(!p||p._demo||!p.rounds||p.rounds.outcome) return; if(!(p.tsSheet||p.status==='Admitted'||p.status==='Hospitalized')) return;
      var id=String(p.id); need[id]=1; if(subs[id]) return;
      var ref=DB.collection('sheets').doc(fvAdmitSheet.id(p));
      subs[id]=ref.onSnapshot(function(s){ try{ if(s.exists){ AT[id]=Date.now(); apply(id,ref,s.data()); } }catch(e){ console.warn('[rounds ← sheet]',e); } },function(e){ console.warn('[rounds ← sheet listen]',e); delete subs[id]; }); });
    Object.keys(subs).forEach(function(id){ if(!need[id]){ try{ subs[id](); }catch(e){} delete subs[id]; } }); }
  setInterval(watch,10000); setTimeout(watch,2500);
  window.fvRoundsSheetSync={watch:watch,apply:apply,line:line,fmt:fmt,at:AT,isLive:function(id){ return !!subs[String(id)]; }};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 14 of 104 · no id ━━━━━ */
try{
/* ═════════ ROUNDS n118 — two people on one patient's rounds, and undo for removals (Oct 2026) ═════════
   1. Saving rounds merges instead of replacing. Before, a patient's whole `rounds` was one field: when two people changed different
      parts at the same time (a doctor writing the plan, a tech ticking a task), the later save wrote back its own copy and the other
      change was lost. Now each rounds save is a short transaction: read what the database has, lay this screen's changes (what it
      changed since it last heard from the database) on top, write the result. Problems, events, diagnostics, treatments, tasks,
      contingencies, flags and the care team merge item by item (by id); lists without ids (the audit, trend values) merge by value;
      single values take the change, and if both people changed the very same value the later save wins, as before.
      Saves for one patient go one after another, so a screen never merges against its own earlier save. Offline (a transaction needs
      the server) it falls back to the plain save it always did. While a save is on its way, a copy arriving from another screen does
      not undo what is on this screen.
   2. Removing a problem, event, diagnostic, treatment, task, contingency or flag shows "… removed · Undo" for 8 seconds; Undo puts it
      back where it was (and says so in the audit). */
(function(){
if(typeof window.fvSaveVisit!=='function'||typeof rdHandleAct!=='function') return;
var RDM_TAKE={snapshots:1,lastReviewSnapshot:1,summary:1};   /* derived from the rest: the newer save's copy, not merged piece by piece */
function J(x){ return JSON.stringify(x===undefined?null:x); }
function eq(a,b){ return J(a)===J(b); }
function isObj(x){ return x&&typeof x==='object'&&!Array.isArray(x); }
function idList(a){ return Array.isArray(a)&&a.every(function(x){ return isObj(x)&&x.id!=null; }); }
/* three-way merge: b = what this screen last heard from the database, m = this screen now, t = the database now */
function merge(b,m,t,key){
  if(eq(m,b)) return t;            /* this screen didn't touch it */
  if(eq(t,b)||eq(m,t)) return m;   /* nobody else did */
  if(key&&RDM_TAKE[key]) return m;
  if(Array.isArray(m)||Array.isArray(t)) return mergeArr(b,m,t);
  if(isObj(m)&&isObj(t)){ var out={}, B=isObj(b)?b:{}, keys={};
    [B,m,t].forEach(function(o){ Object.keys(o).forEach(function(k){ keys[k]=1; }); });
    Object.keys(keys).forEach(function(k){ var v=merge(B[k],m[k],t[k],key?null:k); if(v!==undefined) out[k]=v; });
    return out; }
  return m;                        /* both changed the same value: the later save wins */
}
function mergeArr(b,m,t){ b=Array.isArray(b)?b:[]; m=Array.isArray(m)?m:[]; t=Array.isArray(t)?t:[];
  if(idList(b)&&idList(m)&&idList(t)){
    var B={}, M={}, T={}; b.forEach(function(x){ B[x.id]=x; }); m.forEach(function(x){ M[x.id]=x; }); t.forEach(function(x){ T[x.id]=x; });
    var out=[];
    t.forEach(function(x){ var id=x.id;
      if(B[id]&&!M[id]) return;                                      /* removed here */
      out.push(B[id]&&M[id]&&!eq(B[id],M[id])?merge(B[id],M[id],x):x); });
    m.forEach(function(x){ var id=x.id; if(T[id]) return;
      if(!B[id]) out.push(x);                                         /* added here */
      else if(!eq(B[id],x)) out.push(x); });                          /* changed here, removed there: keep the change */
    /* this screen reordered (Rounds drag / ↑): its order for the items both have */
    var bo=b.map(function(x){ return x.id; }).filter(function(id){ return M[id]; }), mo=m.map(function(x){ return x.id; }).filter(function(id){ return B[id]; });
    if(!eq(bo,mo)){ var pos={}; m.forEach(function(x,i){ pos[x.id]=i; });
      out=out.map(function(x,i){ return [x,i]; }).sort(function(p,q){ var a=pos[p[0].id], c=pos[q[0].id]; if(a==null&&c==null) return p[1]-q[1]; if(a==null) return 1; if(c==null) return -1; return a-c; }).map(function(p){ return p[0]; }); }
    return out; }
  /* no ids (audit lines, trend points, payers): theirs, plus what was added here, minus what was removed here */
  var bs={}, ms={}; b.forEach(function(x){ bs[J(x)]=(bs[J(x)]||0)+1; }); m.forEach(function(x){ ms[J(x)]=1; });
  var res=t.filter(function(x){ var k=J(x); return !(bs[k]&&!ms[k]); }), have={}; res.forEach(function(x){ have[J(x)]=1; });
  m.forEach(function(x){ var k=J(x); if(!bs[k]&&!have[k]){ res.push(x); have[k]=1; } });
  return res; }
window.rdmMerge=merge;   /* tests */

/* ---------- saving: rounds by transaction, one after another per patient ---------- */
var chain={}, pending={};
function who(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} var n=''; try{ n=(typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):''; }catch(e){} return {uid:(u&&u.uid)||'',name:n||(u&&u.email)||''}; }
function saveRounds(id,base,mine){ var P=pending[id]=pending[id]||[]; var job={base:base,mine:mine}; P.push(job);
  var ref=DB.collection('visits').doc(String(id)), w=who(), stamp={last_by:w.name||null,last_by_uid:w.uid||null,last_at:new Date().toISOString()};
  chain[id]=(chain[id]||Promise.resolve()).then(function(){
    return DB.runTransaction(function(t){ return t.get(ref).then(function(s){ var cur=s&&s.exists?((s.data()||{}).rounds||null):null;
      var merged=cur?merge(job.base,job.mine,cur):job.mine; job.merged=merged; t.update(ref,Object.assign({rounds:merged},stamp)); }); })
    .catch(function(err){ console.warn('[rounds] merge save failed — saving this screen’s copy',(err&&err.message)||err);
      return ref.update(Object.assign({rounds:job.mine},stamp)).catch(function(e){ console.warn('[rounds] save',e); }); }); })
  .then(function(){ var i=P.indexOf(job); if(i>-1) P.splice(i,1); }); }
var saveBase=window.fvSaveVisit;
window.fvSaveVisit=function(batch,p,prev){
  var row=mapToDb(p), old=null; try{ old=prev[row.id]?JSON.parse(prev[row.id]):null; }catch(e){ old=null; }
  if(old&&old.rounds&&row.rounds&&!eq(old.rounds,row.rounds)){
    saveRounds(row.id,JSON.parse(J(old.rounds)),JSON.parse(J(row.rounds)));
    var p2=Object.assign({},prev); p2[row.id]=J(Object.assign({},old,{rounds:row.rounds}));   /* everything else as before, without rounds */
    return saveBase(batch,p,p2); }
  return saveBase(batch,p,prev); };
/* a copy from another screen arriving while this screen's rounds save is on its way: keep this screen's changes on top */
var resusBase=Backend._mergeResus;
Backend._mergeResus=function(){ var r=resusBase.apply(this,arguments);
  try{ Object.keys(pending).forEach(function(id){ var P=pending[id]; if(!P||!P.length) return; var p=PATIENTS.find(function(x){ return String(x.id)===String(id); }); if(!p||!p.rounds) return;
    var cur=JSON.parse(J(rdToDb(p.rounds))); P.forEach(function(job){ cur=merge(job.base,job.mine,cur); }); p.rounds=rdNorm(cur); }); }catch(e){ console.warn('[rounds] keep',e); }
  return r; };

/* ---------- undo for removals ---------- */
var DEL={'prob-del':['problems','Problem'],'ev-del':['events','Event'],'diag-del':['diagnostics','Diagnostic'],'tx-del':['treatments','Treatment'],
  'task-del':['tasks','Task'],'cont-del':['contingencies','Contingency'],'flag-del':['flags','Flag']};
var actBase=rdHandleAct, undoT=null;
function nameOf(x){ return (x&&(x.label||x.name||x.text||(x.trigger?'if '+x.trigger:'')))||''; }
function toastEl(){ var t=document.getElementById('rdUndo'); if(!t){ t=document.createElement('div'); t.id='rdUndo'; t.className='rd-undo'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); } return t; }
function hide(){ var t=document.getElementById('rdUndo'); if(t) t.classList.remove('open'); clearTimeout(undoT); }
var last=null, undoLeft=0, undoAt=0, MAC=/Mac|iP(hone|ad|od)/.test(navigator.platform||navigator.userAgent||'');
/* n304: a removal goes into the suite's one undo history (PVX-N202), so ⌘Z / Ctrl+Z brings it back even after the bar has gone */
function put(L){ hide(); if(last===L) last=null; var p=rdFind(L.pid), r=p&&p.rounds; if(!r) return false; r[L.arr]=r[L.arr]||[];
  if(!r[L.arr].some(function(x){ return x.id===L.item.id; })) r[L.arr].splice(Math.min(L.idx,r[L.arr].length),0,L.item);
  rdTouch(p,L.word+' restored'+(L.nm?' · '+L.nm:'')); return true; }
/* n304 (HIG Accessibility, time-boxed elements): pointing at the bar or moving focus into it stops the clock; leaving gives back the time it had, at least 4 s */
function pause(){ var t=document.getElementById('rdUndo'); if(!t||!t.classList.contains('open')||t.dataset.paused) return; clearTimeout(undoT); undoLeft=Math.max(0,undoLeft-(Date.now()-undoAt)); t.dataset.paused='1'; }
function resume(){ var t=document.getElementById('rdUndo'); if(!t||!t.dataset.paused) return; if(t.matches(':hover')||t.contains(document.activeElement)) return; delete t.dataset.paused; undoAt=Date.now(); undoLeft=Math.max(undoLeft,4000); clearTimeout(undoT); undoT=setTimeout(hide,undoLeft); }
function offer(pid,arr,word,item,idx){ var t=toastEl(), nm=nameOf(item), L={pid:pid,arr:arr,word:word,item:item,idx:idx,nm:nm};
  last=L; L.entry=window.pvxUndo?pvxUndo.push({label:word+' removed',undo:function(){ return put(L); }}):null;
  t.innerHTML='<span class="ru-msg"></span><button type="button" class="ru-undo" aria-keyshortcuts="'+(MAC?'Meta+Z':'Control+Z')+'">Undo<kbd class="ru-key" aria-hidden="true">'+(MAC?'⌘Z':'Ctrl+Z')+'</kbd></button><span class="ru-bar" aria-hidden="true"></span>';
  t.querySelector('.ru-msg').textContent=word+' removed'+(nm?' · '+(nm.length>40?nm.slice(0,40)+'…':nm):'');
  delete t.dataset.paused; t.classList.remove('open'); void t.offsetWidth; t.classList.add('open');
  if(!t.dataset.n304){ t.dataset.n304='1'; t.addEventListener('mouseenter',pause); t.addEventListener('focusin',pause); t.addEventListener('mouseleave',function(){ setTimeout(resume,0); }); t.addEventListener('focusout',function(){ setTimeout(resume,0); }); }
  t.querySelector('.ru-undo').onclick=function(){ if(L.entry&&window.pvxUndo&&pvxUndo.undoEntry(L.entry)) return; put(L); };
  undoLeft=8000; undoAt=Date.now(); clearTimeout(undoT); undoT=setTimeout(hide,8000); }
rdHandleAct=function(act,el){ var d=DEL[act]; if(!d||!el||!el.dataset) return actBase.apply(this,arguments);
  var pid=el.dataset.pid, id=el.dataset.id, p=pid?rdFind(pid):null, L=(p&&p.rounds&&p.rounds[d[0]])||[], idx=L.findIndex(function(x){ return x.id===id; }), item=idx>-1?JSON.parse(J(L[idx])):null;
  var out=actBase.apply(this,arguments);
  if(item&&p&&!(p.rounds[d[0]]||[]).some(function(x){ return x.id===id; })) offer(pid,d[0],d[1],item,idx);
  return out; };
window.rdmUndoHide=hide;
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 15 of 104 · no id ━━━━━ */
try{
/* ===== TRACKER CODES n118 — a check-in code opens the family tracker only with the pet's name, and only while the visit is open =====
   Flow used to write codes/{CODE} = {public_token}, readable by anyone forever: every code ever given out could be guessed.
   Now it writes codes/{CODE}-{petkey} (one per way the family might type the name: the whole name and each word),
   with is_active (open visit; admitted and hospitalized pets count as open) and expires_at (30 days after check-in at most).
   The rules (Oct 12) refuse anything else. The ?t= link and QR are unchanged; the waiting room is not touched.
   Written in its own small batch, never in the visit's save, so a code write can't hold up or fail a save. */
(function(){
  if(typeof window==='undefined') return;
  var SIG={}, KEYS={}, CAP=30*864e5;
  function words(s){ return String(s||'').normalize('NFKD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(' ').filter(Boolean); }
  function keys(name){ var w=words(name), out=[]; function add(k){ if(k&&out.indexOf(k)<0&&out.length<4) out.push(k); }
    add(w.join('')); w.forEach(function(x){ if(x.length>=2) add(x); }); return out; }
  function isOpen(p){
    try{ if(fxVisitEnd(p)) return false; }catch(e){}
    if(p.status==='Discharged'||p.status==='Euthanized'||p.status==='Deceased') return false;
    if(!p.completed) return true;
    return p.status==='Admitted'||p.status==='Hospitalized';   /* the front-desk visit closed, the pet is still with us */
  }
  function expires(p){ var a=null; try{ a=_fromTS(p.arrival); }catch(e){} if(!a||isNaN(a)) a=new Date(); return new Date(+a+CAP); }
  function staff(){ try{ return !!DB && typeof Backend!=='undefined' && Backend.mode==='staff'; }catch(e){ return false; } }
  /* write what changed for these visits; closedToo=false skips closed visits this screen never wrote (the backfill) */
  window.fxCodesSync=function(list,closedToo){
    if(!staff()) return Promise.resolve(0);
    var ops=[], done=[];
    (list||[]).forEach(function(p){
      if(!p||p._demo||!p.trackCode||!p.publicToken) return;
      var id=String(p.id), code=String(p.trackCode).toUpperCase(), on=isOpen(p), exp=expires(p);
      var ids=keys(p.name).map(function(k){ return code+'-'+k; });
      var sig=JSON.stringify([ids,p.publicToken,on,+exp]);
      if(SIG[id]===sig) return;
      if(SIG[id]===undefined&&!on&&!closedToo) return;
      var old=(KEYS[id]||[]).filter(function(d){ return ids.indexOf(d)<0; });   /* a renamed pet: the old name stops working */
      ids.forEach(function(d){ ops.push([d,{ v:2, public_token:p.publicToken, tenant_id:TENANT_ID, is_active:on, expires_at:exp },false]); });
      old.forEach(function(d){ ops.push([d,{ is_active:false },true]); });
      done.push([id,sig,ids,SIG[id]]); SIG[id]=sig;
    });
    if(!ops.length) return Promise.resolve(0);
    var chunks=[]; for(var i=0;i<ops.length;i+=400) chunks.push(ops.slice(i,i+400));
    return Promise.all(chunks.map(function(c){ var b=DB.batch();
      c.forEach(function(o){ b.set(DB.collection('codes').doc(o[0]),o[1],o[2]?{merge:true}:undefined); }); return b.commit(); }))
      .then(function(){ done.forEach(function(d){ KEYS[d[0]]=d[2]; }); return ops.length; })
      .catch(function(){ done.forEach(function(d){ if(SIG[d[0]]===d[1]){ if(d[3]===undefined) delete SIG[d[0]]; else SIG[d[0]]=d[3]; } }); return 0; });
  };
  /* after every board update: open visits get their codes (the first load writes today's visits once), and a visit
     that closed in the last two days is closed again in case it was closed on a screen that didn't have this yet */
  var t=null;
  function backfill(){ clearTimeout(t); t=setTimeout(function(){ try{
    var now=Date.now(), list=(PATIENTS||[]).filter(function(p){ return p&&!p._demo; });
    window.fxCodesSync(list.filter(isOpen),false);
    window.fxCodesSync(list.filter(function(p){ var c=null; try{ c=_fromTS(p.completedAt); }catch(e){} return !isOpen(p)&&c&&now-c<2*864e5; }),true);
  }catch(e){} },1500); }
  try{ var _mr=Backend._mergeResus; Backend._mergeResus=function(){ var out=_mr.apply(this,arguments); backfill(); return out; }; }catch(e){}
  window.__fxCodes={ keys:keys, isOpen:isOpen, sig:SIG, written:KEYS };
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 16 of 104 · no id ━━━━━ */
try{
/* ===== FLOYD LEFTOVERS n118 (Flow + Rounds) — what the Oct 11 end-to-end test found =====
   1. Rounds lists a problem once: the triage / intake complaint that check-in already turned into a problem
      ("Painful abdomen" → "Acute Pain") is not added a second time.
   2. Triage starts with the check-in weight filled in (marked "from check-in"; change it if the scale says otherwise).
   3. Names: capital letters are only fixed when a word is typed all lower case or all capitals
      (McDonald, DeLuca stay; "(floyd)" → "(Floyd)").
   4. The family name on the treatment sheet is the owner's surname only ("Test Owner (floyd)" → "Owner";
      "Mary Ann Smith" → "Smith"; "Smith, John" → "Smith").
   The Rounds surgery detail and the department name are string patches in patch_floyd_n118.py. */
(function(){
  if(typeof window==='undefined') return;
  var lc=function(x){ return String(x==null?'':x).trim().toLowerCase(); };
  /* ---- 1. one problem, once ---- */
  function keysOf(x){ var k=[lc(x)];
    try{ var m=parseModifiers(x); if(m&&m.remaining&&m.remaining.trim()) k.push(lc(m.remaining)); }catch(e){}
    try{ var pr=parseProblem(x); if(pr&&pr.label) k.push(lc(pr.label)); }catch(e){}
    return k.filter(Boolean); }
  function dedupe(p,before){
    var r=p&&p.rounds; if(!r||!Array.isArray(r.problems)) return;
    var seen={}; function mark(x){ keysOf(x).forEach(function(k){ seen[k]=1; }); }
    (before||[]).forEach(function(x){ if(x&&x.label) mark(x.label); });
    (p.reasonProblems||[]).forEach(function(pr){ if(!pr) return; if(pr.label) mark(pr.label); if(pr.originalInput) mark(pr.originalInput); });
    var keep=(before||[]).map(function(x){ return x&&x.id; });
    r.problems=r.problems.filter(function(x){
      if(!x||keep.indexOf(x.id)>-1) return true;          /* what was there before stays exactly as it was */
      var ks=keysOf(x.label); if(ks.some(function(k){ return seen[k]; })) return false;
      ks.forEach(function(k){ seen[k]=1; }); return true; }); }
  if(typeof window.fvRoundsPrefill==='function'){ var _pf=window.fvRoundsPrefill;
    window.fvRoundsPrefill=function(p,at){ var before=(p&&p.rounds&&Array.isArray(p.rounds.problems))?p.rounds.problems.slice():[];
      var out=_pf.apply(this,arguments); try{ dedupe(p,before); }catch(e){} return out; }; }
  window.fvDedupeProblems=dedupe;

  /* ---- 2. triage: the check-in weight is the starting value ---- */
  try{ if(typeof openTriageEdit==='function'){ 
    pvxAfter('openTriageEdit',function(p){ 
      try{ var t=getTriage(p), v=(t&&t.vitals)||{}; var el=document.querySelector('#triEditBody [data-vk="weight"]');
        if(el&&!String(el.value||'').trim()&&!(v.weight&&String(v.weight).trim())){
          var w=(typeof p.weightKg==='number'&&p.weightKg>0)?(p.weightKg+' kg'):String(p.weight||'').trim();
          if(w&&w!=='—'){ el.value=(typeof fmtWeight==='function')?fmtWeight(w):w;
            var lab=el.parentNode&&el.parentNode.querySelector('label');
            if(lab&&!lab.querySelector('.fv-from')){ var s=document.createElement('span'); s.className='fv-from'; s.textContent='from check-in'; lab.appendChild(s); }
            el.addEventListener('input',function rm(){ var f=lab&&lab.querySelector('.fv-from'); if(f) f.remove(); el.removeEventListener('input',rm); }); } } }catch(e){}
      },'#16'); } }catch(e){}

  /* ---- 3. names keep the capitals people type ---- */
  function nameCase(s){ if(!s||!String(s).trim()) return s;
    return String(s).trim().replace(/\s+/g,' ').split(' ').map(function(w){
      var letters=w.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g,'');
      var mixed=letters&&letters!==letters.toLowerCase()&&letters!==letters.toUpperCase();
      if(mixed) return w.replace(/^([^A-Za-zÀ-ÖØ-öø-ÿ]*)([a-zà-öø-ÿ])/,function(m,a,c){ return a+c.toUpperCase(); });
      return w.toLowerCase().replace(/(^|['’.\-(])([a-zà-öø-ÿ])/g,function(m,a,c){ return a+c.toUpperCase(); }); }).join(' '); }
  try{ if(typeof fmtTitleCase==='function') pvxWrap('fmtTitleCase',function(){ return nameCase; },'#16'); }catch(e){}
  window.fvNameCase=nameCase;

  /* ---- 4. the owner's surname ---- */
  window.fvOwnerSurname=function(own){ own=String(own||'').trim(); if(!own||own==='—') return '';
    if(own.indexOf(',')>-1){ var a=own.split(',')[0].replace(/\([^)]*\)/g,' ').trim(); return a; }
    var w=own.replace(/\([^)]*\)|\[[^\]]*\]|"[^"]*"/g,' ').split(/\s+/).map(function(x){ return x.replace(/^[^A-Za-zÀ-ÿ']+|[^A-Za-zÀ-ÿ']+$/g,''); })
      .filter(function(x){ return /[A-Za-zÀ-ÿ]{2,}/.test(x)&&!/^(jr|sr|ii|iii|iv|dvm|md|phd)$/i.test(x); });
    return w.length>1?w[w.length-1]:''; };
  var st=document.createElement('style'); st.textContent='#triEditBody .fv-from{margin-left:6px;font-size:0.6875rem;font-weight:600;color:var(--accent,#38BDD2);text-transform:none;letter-spacing:0}';
  (document.head||document.documentElement).appendChild(st);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 17 of 104 · no id ━━━━━ */
try{
/* ===== ENDINGS n120 (Oct 12 2026) — euthanasia and died, from the patient drawer =====
   Daniel's choices: a quiet "Other ending…" under Admit / Discharge; Died as well as Euthanasia; record aftercare,
   owner consent (euthanasia, required) and keepsakes. Then (Oct 12, "Do all of those"), Apple-style:
   · The ending opens in its own sheet, "Rosie's ending" (centered on a desk, a bottom sheet on iPad / phone), with grouped
     sections like iOS Settings: How (the drawer cards) · Consent & aftercare form · Consent · Aftercare · Keepsake.
   · What isn't actionable isn't shown: while the family's form is out, only its progress line (Sent → With the family → Signed)
     and "Cancel form" show; "Enter them here instead" opens the paper path.
   · p.ending = {type:'euthanasia'|'died', consent:{at,by,via}|null, aftercare, keepsakes:[], urn, form, at, by, edits:[]} on the visit.
     Staff only: the family tracker sees just the gentle ending (visit_end 'loss'); the waiting-room screen drops the visit as before.
   · Died is the final status "Deceased" (Rounds' word): Completed Today, Rounds (Deceased), the OP sheet closes ("deceased").
   · Dragging a card onto Completed Today › Euthanized opens this sheet instead of a plain confirm.
   · A patient with an inpatient treatment sheet ends on the sheet (it has Euthanasia and Died), so nobody ends it in two places.
   · Ended visits show the details in the drawer; aftercare and keepsakes can be changed later ("Edit details"). */
(function(){
  if(typeof completePatient!=='function'||typeof renderDisposition!=='function') return;
  /* the hospital's own choices (VCA Shoreline × Final Gift form, Oct 12): care of body + the clay paw print */
  var AFTER=[['private','Private cremation'],['communal','Communal cremation'],['release','Release remains'],['hold','Hold for instructions']];
  var KEEP=[['clay','Clay paw print']];
  var KIND={
    euthanasia:{status:'Euthanized',title:'Euthanasia',sub:'Owner’s consent',done:'Euthanized',go:'Record euthanasia',undo:'euthanasia recorded',
      ic:'<path d="M12 20.2 5.95 14.3C4.1 12.5 4.05 9.7 5.78 7.98c1.68-1.67 4.4-1.64 6.06.08l.16.17.16-.17c1.66-1.72 4.38-1.75 6.06-.08 1.73 1.72 1.68 4.52-.17 6.32L12 20.2Z"/>'},
    died:{status:'Deceased',title:'Died',sub:'During the visit',done:'Died',go:'Record death',undo:'death recorded',
      ic:'<path d="M19.5 14.6A8 8 0 1 1 9.4 4.5a6.4 6.4 0 0 0 10.1 10.1Z"/>'}
  };
  var CHEV='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';
  /* Flow's drawer card (Admit / Discharge) for every "pick one next step" button (Daniel, Oct 12: "use the same buttons we have
     for the drawer cards"). Same element and classes as #dispActions. Go cards carry an arrow (out ↗, in ↘, next →, back ←);
     choice cards carry a ring that fills when chosen (is-on). Text is passed already escaped. */
  var DC_ARROW={out:'<path d="M7 17L17 7"/><path d="M11 7h6v6"/>',in:'<path d="M7 7L17 17"/><path d="M17 11v6h-6"/>',next:'<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',back:'<path d="M19 12H5"/><path d="M11 6l-6 6 6 6"/>'};
  function dcard(o){
    var choice=typeof o.sel==='boolean';
    var mark=choice?'<span class="dc-mark'+(o.box?' sq':'')+'" aria-hidden="true"></span>':(o.arrow?'<span class="dc-arrow dc-'+o.arrow+'" aria-hidden="true"><svg viewBox="0 0 24 24">'+DC_ARROW[o.arrow]+'</svg></span>':'<span></span>');
    return '<button type="button" class="disposition-card fv-dc'+(o.cls?' '+o.cls:'')+(o.sel?' is-on':'')+(o.wrap?' dc-wrap':'')+'"'
      +(choice?' role="'+(o.box?'checkbox':'radio')+'" aria-checked="'+o.sel+'"':'')+(o.label?' aria-label="'+o.label+'"':'')+' '+(o.attrs||'')+'>'
      +'<span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+o.ic+'</svg></span>'
      +'<span class="dc-body"><span class="dc-title">'+o.title+(o.aside?'<span class="dc-aside">'+o.aside+'</span>':'')+'</span>'+(o.desc?'<span class="dc-desc">'+o.desc+'</span>':'')+'</span>'+mark+'</button>'; }
  var IC={form:'<path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/>',use:'<path d="M4 6h10M4 12h10M4 18h7"/><path d="M15 17l2 2 4-4"/>'};
  window.fvDCard=dcard; window.fvDCardIcons=IC;
  var draft=null;   /* the open sheet: {pid, type, fee, consent, aftercare, keepsakes, edit, manual, used} */

  function label(list,k){ var x=list.filter(function(a){ return a[0]===k; })[0]; return x?x[1]:''; }
  function who(){ try{ return (typeof CURRENT_USER!=='undefined'&&CURRENT_USER)?String(CURRENT_USER):'Flow'; }catch(e){ return 'Flow'; } }
  function kindOf(p){ return p&&p.ending&&KIND[p.ending.type]?p.ending.type:(p&&p.status==='Deceased'?'died':(p&&p.status==='Euthanized'?'euthanasia':null)); }
  function ipSheet(p){ return !!(p&&p.tsSheet&&p.tsSheet.board==='IP'); }
  function sheetHref(p){ var id=''; try{ id=window.fvAdmitSheet?fvAdmitSheet.id(p):''; }catch(e){} return '/treatment/'+(id?'#sheet='+encodeURIComponent(id)+'&discharge=1':''); }
  function fmtT(iso){ try{ return fmtTime(new Date(iso)); }catch(e){ return ''; } }
  function formOf(p){ var F=p&&p.consentForm; return (F&&F.status!=='cancelled')?F:null; }
  function formOpen(p){ var F=formOf(p); return !!F&&(F.status==='requested'||F.status==='family'); }
  function signedForm(p){ var F=formOf(p); return (F&&F.status==='signed')?F:null; }
  /* what the details say, in one line */
  function summary(e,withConsent){ if(!e) return '';
    var bits=[label(AFTER,e.aftercare)||'Aftercare not recorded'];
    if(e.aftercare==='hold') bits[0]='Held for instructions (up to 7 days)';
    if(e.urn) bits.push(e.urn+' urn');
    var k=(e.keepsakes||[]).map(function(x){ return label(KEEP,x); }).filter(Boolean); if(k.length) bits.push(k.join(', '));
    if(withConsent&&e.consent) bits.push(e.consent.via==='phone'?'Consent by phone':'Consent signed');
    return bits.join(' · '); }

  /* the consent line under an ended visit */
  function consentLine(c){ if(!c) return '';
    if(c.via==='phone'){ var w=(c.witnesses||[]).filter(Boolean); return 'Consent by phone'+(c.spoke_with?' from '+c.spoke_with:'')+(w.length?' · witnessed by '+w.join(' and '):''); }
    return 'Consent signed'+(c.via==='form'?' on the tablet':'')+(c.by?' · '+c.by:''); }
  /* names for the witness fields: the doctors, techs and liaisons Flow already knows */
  function staffNames(){ var a=[]; try{ a=a.concat(DOCTOR_NAMES||[]); }catch(e){} try{ a=a.concat(window.FV_TECHS||[]); }catch(e){} try{ if(window.Pravix&&Pravix.getLiaisons) a=a.concat(Pravix.getLiaisons()||[]); }catch(e){}
    var seen={}; return a.map(function(x){ return String(x&&x.name||x||'').trim(); }).filter(function(x){ var k=x.toLowerCase(); if(!x||seen[k]) return false; seen[k]=1; return true; }).sort(); }
  function sameName(a,b){ return String(a||'').trim().toLowerCase()===String(b||'').trim().toLowerCase(); }

  /* ---------- saved on the visit ---------- */
  window.fvEndingToDb=function(e){ if(!e||!KIND[e.type]) return null;
    return {type:e.type,consent:e.consent?{at:e.consent.at||null,by:e.consent.by||null,via:e.consent.via||null,form:e.consent.form||null,spoke_with:e.consent.spoke_with?String(e.consent.spoke_with).slice(0,80):null,witnesses:(e.consent.witnesses||[]).slice(0,2).map(function(w){ return String(w||'').slice(0,80); })}:null,aftercare:e.aftercare||null,
      keepsakes:(e.keepsakes||[]).filter(function(k){ return !!label(KEEP,k); }),urn:e.urn||null,form:e.form||null,at:e.at||null,by:e.by||null,
      edits:(e.edits||[]).slice(-20).map(function(x){ return {at:x.at||null,by:x.by||null,what:String(x.what||'').slice(0,200)}; })}; };

  /* ---------- the new final status: Deceased ---------- */
  try{ STATUSES.Deceased={color:'#8A82A8',bg:'rgba(138,130,168,.16)'}; }catch(e){}
  try{ COMPLETION.Deceased={tlLabel:'Patient died',title:'Patient died',icon:'info',color:'#8A82A8',stampKey:'deceasedAt'}; }catch(e){}
  if(typeof captureDispSnap==='function'&&typeof restoreDispSnap==='function'){
    pvxWrap('captureDispSnap',function(capBase){ return function(p){ var s=capBase.apply(this,arguments); s.deceasedAt=p.deceasedAt; s.ending=p.ending?JSON.parse(JSON.stringify(p.ending)):null; return s; }; },'#17');
    pvxWrap('restoreDispSnap',function(resBase){ return function(p,s){ resBase.apply(this,arguments); p.deceasedAt=s.deceasedAt; p.ending=s.ending||null; }; },'#17');
  }

  /* ---------- the drawer: "Other ending…" ---------- */
  function link(){ var el=document.getElementById('dispOther'); if(el) return el;
    var acts=document.getElementById('dispActions'); if(!acts) return null;
    el=document.createElement('button'); el.type='button'; el.id='dispOther'; el.className='disp-other';
    el.setAttribute('aria-label','Other ending — euthanasia or died'); el.setAttribute('aria-haspopup','dialog');
    el.innerHTML='<span>Other ending…</span>'+CHEV;
    acts.insertAdjacentElement('afterend',el); return el; }
  function showLink(on){ var el=link(); if(!el) return; el.hidden=!on; var p=pvxActivePatient(), F=formOf(p), sp=el.querySelector('span');
    var t=(F&&F.status==='requested')?'Other ending · form waiting for reception':(F&&F.status==='family')?'Other ending · form with the family':(F&&F.status==='signed'&&!isCompleted(p))?'Other ending · form signed — record it':'Other ending…';
    if(sp&&sp.textContent!==t) sp.textContent=t; el.classList.toggle('has-form',t!=='Other ending…'); }

  pvxAfter('renderDisposition',function(p){
    try{ showLink(!!p&&!isCompleted(p)); var k=kindOf(p); if(p&&isCompleted(p)&&k) terminal(p,k);
      if(draft&&p&&draft.pid===p.id) paintSheet();   /* a live update: keep the sheet and what's in it */
    }catch(e){ console.warn('[endings]',e); }
    },'#17');
  function terminal(p,k){
    var conf=document.getElementById('dispConfirm'); if(!conf) return; var K=KIND[k], e=p.ending;
    var when=''; try{ when=p.completedAt?fmtTime(p.completedAt):''; }catch(_){}
    var desc=e?summary(e,false):'Recorded in Completed Today';
    conf.className='disp-confirm mounted';
    conf.innerHTML='<div class="disp-terminal end-terminal"><span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+K.ic+'</svg></span>'
      +'<span class="dc-body"><span class="dc-title">'+pvxEscQ(K.done)+(when?' <span class="end-when">'+pvxEscQ(when)+'</span>':'')+'</span><span class="dc-desc">'+pvxEscQ(desc)+'</span>'
      +(e&&e.consent?'<span class="dc-desc end-consent-line">'+pvxEscQ(consentLine(e.consent))+'</span>':'')+'</span>'
      +'<span class="end-acts">'+(e&&e.aftercare?'<button type="button" class="end-edit" data-end="tag">Print tag</button>':'')+'<button type="button" class="end-edit" data-end="edit">Edit details</button></span></div>'; }

  /* ---------- the sheet ---------- */
  var lastFocus=null;
  function sheetEl(){ var s=document.getElementById('endSheet'); if(!s){ s=document.createElement('div'); s.id='endSheet'; s.className='end-sheet'; document.body.appendChild(s); } return s; }
  function openSheet(p,type,opts){
    opts=opts||{}; if(!p||(typeof _dispBusy!=='undefined'&&_dispBusy)) return;
    var edit=!!opts.edit; if(!edit&&isCompleted(p)) return;
    var e=edit?(p.ending||{type:kindOf(p)}):null;
    draft={pid:p.id,fee:'outpatient',type:edit?(e.type||kindOf(p)):(type||null),consent:edit?((e&&e.consent&&(e.consent.via||'paper'))||false):false,ph:{who:'',w1:'',w2:'',read:false,lang:'en'},aftercare:edit?(e.aftercare||null):null,
      keepsakes:edit?(e.keepsakes||[]).slice():[],edit:edit,manual:!!opts.manual,used:false};
    if(opts.useForm) useForm(p);
    lastFocus=document.activeElement; paintSheet(true);
    var s=sheetEl(); requestAnimationFrame(function(){ s.classList.add('shown'); });
    var f=s.querySelector(opts.useForm?'[data-end="go"]':draft.type?'[data-end-kind="'+draft.type+'"]':'[data-end-kind]'); if(f) f.focus({preventScroll:true});
  }
  function focusKey(){ var a=document.activeElement, s=document.getElementById('endSheet'); if(!a||!s||!s.contains(a)) return null;
    var n=['endPh','endKind','endAfter','endKeep','endConsent','endFee','endRl','end']; for(var i=0;i<n.length;i++){ var v=a.dataset&&a.dataset[n[i]]; if(v!=null) return '[data-'+n[i].replace(/[A-Z]/g,function(m){ return '-'+m.toLowerCase(); })+'="'+v+'"]'; } return null; }
  function row(o){   /* an inset-grouped row: label, optional detail, and a check (radio), a switch, or a chevron */
    var tail=o.kind==='radio'?'<span class="es-check" aria-hidden="true"></span>':o.kind==='switch'?'<span class="es-switch" aria-hidden="true"><span></span></span>':o.kind==='link'?'<span class="es-chev" aria-hidden="true">'+CHEV+'</span>':'';
    var role=o.kind==='radio'?' role="radio" aria-checked="'+!!o.on+'"':o.kind==='switch'?' role="switch" aria-checked="'+!!o.on+'"':'';
    return '<button type="button" class="es-row'+(o.on?' on':'')+(o.cls?' '+o.cls:'')+'"'+role+' '+(o.attrs||'')+'><span class="es-rl">'+o.t+(o.d?'<span class="es-rd">'+o.d+'</span>':'')+'</span>'+tail+'</button>'; }
  function field(k,lab,val,ph,list){ return '<label class="es-row es-field"><span class="es-fl">'+lab+'</span><input type="text" data-end-ph="'+k+'" value="'+pvxEscQ(val)+'" placeholder="'+pvxEscQ(ph)+'" autocomplete="off" autocapitalize="words" spellcheck="false"'+(list?' list="'+list+'"':'')+'></label>'; }
  function paintSheet(first){
    var p=draft&&pvxPatientById(draft.pid), s=sheetEl(); if(!p||!draft){ closeSheet(true); return; }
    var fk=first?null:focusKey(), scroll=(s.querySelector('.es-body')||{}).scrollTop||0, ae=document.activeElement, caret=(ae&&ae.tagName==='INPUT'&&s.contains(ae))?[ae.selectionStart,ae.selectionEnd]:null;
    var d=draft, nm=dispFirstName(p), K=d.type?KIND[d.type]:null, F=formOf(p), SF=signedForm(p), FO=formOpen(p);
    var fields=d.edit||d.manual||d.used||!window.fvConsent;
    var h='<div class="es-scrim" data-end="scrim"></div><div class="es-panel" role="dialog" aria-modal="true" aria-labelledby="endSheetT">'
      +'<header class="es-bar"><button type="button" class="es-cancel" data-end="cancel">Cancel</button><h2 id="endSheetT">'+pvxEscQ(d.edit?nm+' · ending details':nm+'’s ending')+'</h2><span class="es-bar-r"></span></header><div class="es-body">';
    var foot='';
    if(!d.edit&&ipSheet(p)){
      h+='<div class="es-sec"><div class="es-group es-text"><b>'+pvxEscQ(nm)+' has an inpatient treatment sheet.</b><br>Record the ending on the sheet — it has Euthanasia and Died — so it’s written once. Flow and Rounds follow.</div></div>';
      foot='<a class="es-primary" href="'+pvxEscQ(sheetHref(p))+'" target="_blank" rel="noopener" data-end="sheet">Open the treatment sheet</a>';
    }else{
      if(!d.edit){ h+='<div class="es-sec"><div class="es-h" id="endKindH">How did '+pvxEscQ(nm)+'’s visit end?</div><div class="end-kinds" role="radiogroup" aria-labelledby="endKindH">';
        ['euthanasia','died'].forEach(function(k){ var on=d.type===k, X=KIND[k]; h+=dcard({ic:X.ic,title:X.title,sel:on,label:X.title+' — '+X.sub,cls:'end-kind'+(on?' on':''),attrs:'data-end-kind="'+k+'"'}); });
        h+='</div></div>'; }
      if(K&&!d.edit&&window.fvConsent){
        h+='<div class="es-sec"><div class="es-h">'+(d.type==='died'?'Aftercare form':'Consent &amp; aftercare form')+'</div>';
        if(!F&&d.manual){
          h+='<div class="es-group">'+row({t:'Send the form to reception instead',d:'The family chooses and signs on the tablet',kind:'link',attrs:'data-end="unmanual"'})+'</div>';
        }else if(!F){
          h+='<div class="es-group">'+(d.type==='euthanasia'?'<div class="es-row es-static"><span class="es-rl">Fee</span><span class="es-seg" role="radiogroup" aria-label="Euthanasia fee">'
            +[['outpatient','Outpatient'],['consult','With consult']].map(function(x){ var on=(d.fee||'outpatient')===x[0]; return '<button type="button" class="'+(on?'on':'')+'" role="radio" aria-checked="'+on+'" data-end-fee="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</span></div>':'')
            +'<div class="es-cardrow">'+dcard({ic:IC.form,title:'Send form to reception',desc:'Shows up in Consent forms',arrow:'out',cls:'end-send',attrs:'data-end="send"'})+'</div></div>'
            +'<div class="es-foot-note">Reception takes the tablet into the room and goes over '+pvxEscQ(nm)+'’s aftercare'+(d.type==='died'?'':' and the consent')+' with the family.</div>';
          if(!d.manual) h+='<div class="es-group">'+row({t:'Record it here instead',d:'From a paper form, or with the family beside you',kind:'link',attrs:'data-end="manual"'})+'</div>';
        }else if(FO||SF){
          h+='<div class="es-group es-text">'+fvConsent.progress(F)+'</div>';
          if(SF){ h+='<div class="es-foot-note">'+pvxEscQ((SF.owner_sig&&SF.owner_sig.name)||'The owner')+' chose '+pvxEscQ(fvConsent.summary(SF))+'.</div>';
            if(!d.used) h+='<div class="es-group"><div class="es-cardrow">'+dcard({ic:IC.use,title:'Use the family’s choices',desc:'Fills in the ending for you',arrow:'in',cls:'end-use',attrs:'data-end="use-form"'})+'</div></div>';
            h+='<div class="es-group">'+row({t:'Print the form',kind:'link',attrs:'data-end="print-form"'})+'</div>';
          }else{
            h+='<div class="es-foot-note">Consent and aftercare will come from the family’s form. You’ll get a notice when it’s signed.</div>'
              +'<div class="es-group">'+row({t:'Cancel form',cls:'danger',attrs:'data-end="cancel-form"'})+(d.manual?'':row({t:'Enter them here instead',d:'If the family signed the paper form',kind:'link',attrs:'data-end="manual"'}))+'</div>';
          }
        }
        h+='</div>';
      }
      if(K&&fields){
        if(d.type==='euthanasia'){ h+='<div class="es-sec"><div class="es-h">Consent</div><div class="es-group">';
          var ec=d.edit&&pvxPatientById(d.pid)&&pvxPatientById(d.pid).ending&&pvxPatientById(d.pid).ending.consent;
          if(d.edit||SF) h+='<div class="es-row es-static on"><span class="es-rl">'+(SF?'Signed on the tablet · '+pvxEscQ(fmtT(SF.signed_at)):ec?pvxEscQ(ec.via==='phone'?consentLine(ec):ec.via==='form'?'Signed on the tablet':'Signed the paper form'):'Euthanasia consent signed by the owner')+'</span><span class="es-check" aria-hidden="true"></span></div></div>';
          else{ h=h.replace(/<div class="es-group">$/,'<div class="es-group" role="radiogroup" aria-label="How the owner consented">');
            h+=row({t:'Signed the paper form',kind:'radio',on:d.consent==='paper',attrs:'data-end-consent="paper"'})
              +row({t:'By phone',d:'Two staff witness the owner’s consent on the call',kind:'radio',on:d.consent==='phone',attrs:'data-end-consent="phone"'})+'</div>';
            if(d.consent==='phone'){ var P=d.ph;
              h+='<div class="es-group es-phone">'
                +field('who','Spoke with',P.who,'Owner or authorized agent','')
                +field('w1','Witness',P.w1,'Staff name','endStaff')
                +field('w2','Second witness',P.w2,'Another staff member','endStaff')
                +row({t:P.read?'Hide the consent wording':'Consent wording to read',d:P.read?'':'Read it to the owner, word for word',kind:'link',attrs:'data-end="read"'})
                +(P.read&&window.fvConsent&&fvConsent.consentText?'<div class="es-text es-read"><span class="es-seg es-rl-seg" role="radiogroup" aria-label="Language">'+[['en','English'],['es','Español']].map(function(x){ var on=P.lang===x[0]; return '<button type="button" class="'+(on?'on':'')+'" role="radio" aria-checked="'+on+'" data-end-rl="'+x[0]+'">'+x[1]+'</button>'; }).join('')+'</span><p>'+pvxEscQ(fvConsent.consentText(P.lang))+'</p></div>':'')
                +'</div><datalist id="endStaff">'+staffNames().map(function(n){ return '<option value="'+pvxEscQ(n)+'"></option>'; }).join('')+'</datalist>'
                +'<div class="es-foot-note">Both witnesses hear the owner give consent. The time is recorded when you tap Record.</div>'; }
            }
          h+='</div>'; }
        h+='<div class="es-sec"><div class="es-h" id="endAfterH">Aftercare</div><div class="es-group" role="radiogroup" aria-labelledby="endAfterH">';
        AFTER.forEach(function(a){ h+=row({t:a[1],kind:'radio',on:d.aftercare===a[0],attrs:'data-end-after="'+a[0]+'"'}); });
        h+='</div>'+(d.aftercare==='hold'?'<div class="es-foot-note">The family has up to 7 days to decide; after that a communal cremation is charged.</div>':'')+'</div>';
        h+='<div class="es-sec"><div class="es-h">Keepsake</div><div class="es-group">'+row({t:'Clay paw print',kind:'switch',on:d.keepsakes.indexOf('clay')>-1,attrs:'data-end-keep="clay"'})+'</div>'
          +(d.aftercare==='private'?'<div class="es-foot-note">Included with private cremation.</div>':'')+'</div>';
      }
      if(K) foot=(fields?'<button type="button" class="es-primary" data-end="go">'+pvxEscQ(d.edit?'Save':K.go)+'</button>':(FO?'<button type="button" class="es-primary quiet" data-end="cancel">Done</button>':''));
    }
    h+='</div><footer class="es-foot"><div class="end-hint" id="endHint" role="alert" hidden></div>'+foot+'</footer></div>';
    s.className='end-sheet open'+(s.classList.contains('shown')?' shown':''); s.innerHTML=h;
    var b=s.querySelector('.es-body'); if(b) b.scrollTop=scroll;
    if(fk){ var f=s.querySelector(fk); if(f){ f.focus({preventScroll:true}); if(caret&&f.setSelectionRange) try{ f.setSelectionRange(caret[0],caret[1]); }catch(_){} } }
  }
  function closeSheet(silent){ var s=document.getElementById('endSheet'); draft=null; if(s){ s.className='end-sheet'; s.innerHTML=''; }
    var p=pvxActivePatient(); if(p) showLink(!isCompleted(p)); if(!silent){ var lf=(lastFocus&&lastFocus!==document.body&&document.contains(lastFocus)&&lastFocus.offsetParent!==null)?lastFocus:document.getElementById('dispOther'); if(lf&&lf.focus&&!lf.hidden) try{ lf.focus({preventScroll:true}); }catch(e){} } }
  function hint(msg,sel){ var h=document.getElementById('endHint'); if(h){ h.textContent=msg; h.hidden=false; }
    var f=sel&&document.querySelector('#endSheet '+sel); if(f){ f.focus(); f.classList.remove('end-nudge'); void f.offsetWidth; f.classList.add('end-nudge'); } }
  function useForm(p){ var sf=signedForm(p); if(!sf||!draft) return; draft.type=draft.type||sf.kind; draft.aftercare=sf.care; draft.keepsakes=(sf.clay||sf.care==='private')?['clay']:[]; draft.used=true; }

  function record(p){
    var d=draft; if(!d||!d.type) return;
    var SF=signedForm(p);
    if(d.type==='euthanasia'&&!d.consent&&!SF&&!d.edit){ hint('Choose how the owner consented — the paper form or by phone — or send the form to reception.','[data-end-consent]'); return; }
    if(d.type==='euthanasia'&&d.consent==='phone'&&!SF&&!d.edit){ var P=d.ph; P.who=String(P.who||'').trim(); P.w1=String(P.w1||'').trim(); P.w2=String(P.w2||'').trim();
      if(!P.who){ hint('Add who gave consent on the phone.','[data-end-ph="who"]'); return; }
      if(!P.w1){ hint('Add the first witness.','[data-end-ph="w1"]'); return; }
      if(!P.w2){ hint('Add the second witness.','[data-end-ph="w2"]'); return; }
      if(sameName(P.w1,P.w2)){ hint('The two witnesses need to be different people.','[data-end-ph="w2"]'); return; } }
    if(!d.aftercare){ hint('Choose the aftercare — “Hold for instructions” is fine.','[data-end-after]'); return; }
    if(d.edit) return saveEdit(p,d);
    if(_dispBusy) return; if(isCompleted(p)){ closeSheet(true); showDispConflict(p); return; }
    var K=KIND[d.type], now=new Date(), by=who(), conf=document.getElementById('dispConfirm'), acts=document.getElementById('dispActions');
    closeSheet(true); _dispBusy=true; if(acts) acts.classList.add('mutation-locked');
    conf.className='disp-confirm mounted';
    conf.innerHTML='<div class="disp-terminal end-terminal" aria-live="polite"><span class="dc-ic" aria-hidden="true"><svg viewBox="0 0 24 24">'+K.ic+'</svg></span><span class="dc-body"><span class="dc-title">Recording…</span><span class="dc-desc">Saving to record</span></span></div>';
    var snap=captureDispSnap(p), end={type:d.type,consent:d.type==='euthanasia'?(SF?{at:SF.signed_at,by:(SF.witness&&SF.witness.name)||by,via:'form',form:SF.id}:(d.consent==='phone'?{at:now.toISOString(),by:by,via:'phone',spoke_with:d.ph.who,witnesses:[d.ph.w1,d.ph.w2]}:{at:now.toISOString(),by:by,via:'paper'})):null,aftercare:d.aftercare,keepsakes:d.keepsakes.slice(),urn:(SF&&SF.care==='private'&&d.aftercare==='private'&&window.fvConsent)?fvConsent.urnLabel(SF.urn):null,form:SF?SF.id:null,at:now.toISOString(),by:by,edits:[]};
    setTimeout(function(){
      var failed=false;
      try{ p.ending=end; completePatient(p,K.status);
        var ev=p.timeline&&p.timeline[p.timeline.length-1];
        if(ev) ev.meta=[ev.meta,summary(end,true),by].filter(Boolean).join(' · ');   /* meta stays staff-only: the tracker gets the label and time */
      }catch(e){ failed=true; console.warn('[endings]',e); }
      setTimeout(function(){
        _dispBusy=false;
        var bad=(typeof Backend!=='undefined'&&Backend&&Backend.conn==='error');
        if(failed||bad){ restoreDispSnap(p,snap); try{ renderAll(); }catch(_){} if(activePatient===p.id) fillDrawer(p);
          if(acts){ acts.classList.remove('mutation-locked'); acts.querySelectorAll('.disposition-card').forEach(function(c){ c.classList.remove('compress'); }); }
          conf.className='disp-confirm mounted';
          conf.innerHTML='<div class="disp-terminal" style="grid-template-columns:1fr" role="alert"><span class="dc-body"><span class="dc-title" style="color:rgba(232,152,146,.96)">Couldn’t record · Try again</span><span class="dc-desc">No patient state was changed</span></span></div>';
          return; }
        if(activePatient===p.id) fillDrawer(p);
        showUndo(p,d.type,snap);
      },360);
    },430);
  }
  function saveEdit(p,d){
    var e=p.ending||{type:d.type,consent:null,at:null,by:null,edits:[]};
    var before=summary(e,false); e.aftercare=d.aftercare; e.keepsakes=d.keepsakes.slice(); e.type=e.type||d.type;
    var after=summary(e,false); closeSheet();
    if(after!==before){ e.edits=(e.edits||[]); e.edits.push({at:new Date().toISOString(),by:who(),what:before+' → '+after}); }
    p.ending=e;
    try{ renderAll(); }catch(_){}
    if(activePatient===p.id) fillDrawer(p);
    if(after!==before) try{ if(window.fvNotifyAct) fvNotifyAct('Ending details saved',pvxEscQ(dispFirstName(p))+' · '+pvxEscQ(after),'Print new tag',function(){ printTag(pvxPatientById(p.id)); });
      else notify('Ending details saved',pvxEscQ(dispFirstName(p))+' · '+pvxEscQ(after),{icon:'info',color:'#8A82A8'}); }catch(_){}
  }
  function dirty(){ var d=draft; return !!d&&!d.edit&&!!(d.consent||d.aftercare||d.keepsakes.length||d.ph.who||d.ph.w2); }

  /* ---------- the body tag (4 × 6 in): who, and what happens to them, impossible to misread ---------- */
  var BAND={private:{cls:'solid',t:'Private cremation',s:'Ashes come back to VCA Shoreline'},communal:{cls:'outline',t:'Communal cremation',s:'Ashes are not returned'},
    release:{cls:'double',t:'Release to owner',s:'Do not send to Final Gift'},hold:{cls:'dashed',t:'Hold',s:''}};
  function tagDay(d){ try{ return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }catch(e){ return ''; } }
  function tagHtml(p){ var e=p&&p.ending; if(!e||!e.aftercare||!KIND[e.type]) return '';
    var K=KIND[e.type], at=e.at?new Date(e.at):(p.completedAt?new Date(p.completedAt):new Date()), B=Object.assign({},BAND[e.aftercare]||{cls:'outline',t:label(AFTER,e.aftercare),s:''});
    if(e.aftercare==='hold'){ var until=new Date(at.getTime()+7*864e5); B.t='Hold until '+tagDay(until); B.s='Then communal cremation, unless the family decides'; }
    var full=[p.name,p.last].filter(Boolean).join(' ')||'Patient', pet=[p.species,p.breed,p.sex,p.weight?(String(p.weight)+(/[a-z]/i.test(String(p.weight))?'':' kg')):''].filter(Boolean).join(' · ');
    var doc=(p.doctor&&p.doctor!=='unassigned')?p.doctor:'', time='';
    try{ time=fmtTime(at); }catch(_){ time=''; }
    var keep=(e.keepsakes||[]).map(function(k){ return label(KEEP,k); }).filter(Boolean);
    var line=function(l,v){ return v?'<tr><td>'+l+'</td><td>'+pvxEscQ(v)+'</td></tr>':''; };
    return '<div class="et"><div class="et-top"><span>VCA Shoreline</span><b>'+pvxEscQ(p.hid||'')+'</b></div>'
      +'<div class="et-name">'+pvxEscQ(full)+'</div><div class="et-pet">'+pvxEscQ(pet)+'</div>'
      +'<div class="et-band et-'+B.cls+'"><b>'+pvxEscQ(B.t)+'</b>'+(B.s?'<span>'+pvxEscQ(B.s)+'</span>':'')+'</div>'
      +'<table class="et-t">'+line('Owner',p.owner)+line('Urn',e.urn||'')+line(K.done,(tagDay(at)+' · '+time).replace(/ · $/,''))+line('Doctor',doc)+line('Consent',e.type==='euthanasia'?consentLine(e.consent).replace(/^Consent (\w)/,function(_,c){ return c.toUpperCase(); }):'')+'</table>'
      +(keep.length?'<div class="et-keep">'+keep.map(function(k){ return '<span><i></i>'+pvxEscQ(k)+' made</span>'; }).join('')+'</div>':'')
      +'<div class="et-sign"><span>Tagged by</span><span>Picked up by Final Gift · date</span></div>'
      +'<div class="et-foot">Recorded by '+pvxEscQ(e.by||'')+' · Pravix Flow</div></div>'; }
  function printTag(p){ var h=tagHtml(p); if(!h) return false;
    var w=document.getElementById('endTag'); if(!w){ w=document.createElement('div'); w.id='endTag'; document.body.appendChild(w); }
    w.innerHTML=h; document.body.classList.add('end-tagging');
    var done=function(){ document.body.classList.remove('end-tagging'); window.removeEventListener('afterprint',done); };
    window.addEventListener('afterprint',done); setTimeout(function(){ try{ window.print(); }catch(e){} setTimeout(done,1500); },120); return true; }

  /* ---------- clicks and keys ---------- */
  document.addEventListener('click',function(ev){
    var t=ev.target; if(!t||!t.closest) return;
    if(t.closest('#dispOther')){ openSheet(pvxActivePatient(),null); return; }
    if(t.closest('#dispConfirm [data-end="tag"]')){ var pt=pvxActivePatient(); if(pt) printTag(pt); return; }
    if(t.closest('#dispConfirm [data-end="edit"]')){ var pe=pvxActivePatient(); if(pe) openSheet(pe,null,{edit:true}); return; }
    var s=t.closest('#endSheet'); if(!s||!draft) return;
    var p=pvxPatientById(draft.pid); if(!p) return;
    var a=t.closest('[data-end]'); if(a){ var w=a.dataset.end;
      if(w==='cancel') closeSheet();
      else if(w==='scrim'){ if(dirty()){ var pn=s.querySelector('.es-panel'); if(pn){ pn.classList.remove('end-nudge'); void pn.offsetWidth; pn.classList.add('end-nudge'); } } else closeSheet(); }
      else if(w==='go') record(p);
      else if(w==='read'){ draft.ph.read=!draft.ph.read; paintSheet(); var rd=s.querySelector('[data-end="read"]'); if(rd) rd.focus(); }
      else if(w==='unmanual'){ draft.manual=false; draft.consent=false; paintSheet(); var sf=s.querySelector('[data-end="send"]'); if(sf) sf.focus(); }
      else if(w==='manual'){ draft.manual=true; paintSheet(); var f=s.querySelector('[data-end-consent],[data-end-after]'); if(f) f.focus(); }
      else if(w==='send'&&window.fvConsent){ fvConsent.send(p,draft.type,draft.fee); paintSheet(); }
      else if(w==='cancel-form'&&window.fvConsent){ fvConsent.cancel(p); setTimeout(paintSheet,0); }
      else if(w==='print-form'&&window.fvConsent) fvConsent.print(p);
      else if(w==='use-form'){ useForm(p); paintSheet(); var g=document.querySelector('#endSheet [data-end="go"]'); if(g) g.focus(); }
      return; }
    var fe=t.closest('[data-end-fee]'); if(fe){ draft.fee=fe.dataset.endFee; paintSheet(); var fq=s.querySelector('[data-end-fee="'+draft.fee+'"]'); if(fq) fq.focus(); return; }
    var k=t.closest('[data-end-kind]'); if(k){ draft.type=k.dataset.endKind; paintSheet(); var kf=s.querySelector('[data-end-kind="'+draft.type+'"]'); if(kf) kf.focus(); return; }
    if(t.closest('[data-end-ph]')) return;
    var rl=t.closest('[data-end-rl]'); if(rl){ draft.ph.lang=rl.dataset.endRl; paintSheet(); var rq=s.querySelector('[data-end-rl="'+draft.ph.lang+'"]'); if(rq) rq.focus(); return; }
    var cn=t.closest('[data-end-consent]'); if(cn){ var cv=cn.dataset.endConsent==='phone'?'phone':'paper'; draft.consent=cv;
      if(cv==='phone'){ if(!draft.ph.who) draft.ph.who=String(p.owner||'').trim(); if(!draft.ph.w1&&who()!=='Flow') draft.ph.w1=who(); }
      paintSheet(); var nx=cv==='phone'?(s.querySelector('[data-end-ph="who"]:placeholder-shown')||s.querySelector('[data-end-ph="w1"]:placeholder-shown')||s.querySelector('[data-end-ph="w2"]:placeholder-shown')):null;
      (nx||s.querySelector('[data-end-consent="'+cv+'"]')).focus(); return; }
    var af=t.closest('[data-end-after]'); if(af){ draft.aftercare=af.dataset.endAfter; paintSheet(); var x=s.querySelector('[data-end-after="'+draft.aftercare+'"]'); if(x) x.focus(); return; }
    var kp=t.closest('[data-end-keep]'); if(kp){ var v=kp.dataset.endKeep, i=draft.keepsakes.indexOf(v); if(i>-1) draft.keepsakes.splice(i,1); else draft.keepsakes.push(v); paintSheet(); var y=s.querySelector('[data-end-keep="'+v+'"]'); if(y) y.focus(); return; }
  });
  document.addEventListener('input',function(e){ var t=e.target; if(!draft||!t||!t.matches||!t.matches('#endSheet [data-end-ph]')) return; draft.ph[t.dataset.endPh]=t.value;
    var h=document.getElementById('endHint'); if(h&&!h.hidden) h.hidden=true; });
  document.addEventListener('keydown',function(e){ var t=e.target; if(!draft||e.key!=='Enter'||!t||!t.matches||!t.matches('#endSheet [data-end-ph]')) return; e.preventDefault();
    var all=[].slice.call(document.querySelectorAll('#endSheet [data-end-ph]')), i=all.indexOf(t); if(i<all.length-1) all[i+1].focus(); else { var g=document.querySelector('#endSheet [data-end-after]'); if(g) g.focus(); } });
  document.addEventListener('keydown',function(e){ if(!draft||!document.querySelector('#endSheet.open')) return;
    if(e.key==='Escape'){ e.stopPropagation(); e.preventDefault(); closeSheet(); return; }
    if(e.key==='Tab'){ var f=[].slice.call(document.querySelectorAll('#endSheet .es-panel button, #endSheet .es-panel a[href], #endSheet .es-panel input')).filter(function(x){ return x.offsetParent!==null; }); if(!f.length) return;
      var i=f.indexOf(document.activeElement); if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); } } },true);
  /* closing the drawer closes its sheet */
  if(typeof closeDrawer==='function'){ pvxBefore('closeDrawer',function(){ if(draft) closeSheet(true); },'#17'); }
  if(typeof openDispConfirm==='function'){ pvxWrap('openDispConfirm',function(odBase){ return function(){ if(draft) closeSheet(true); var r=odBase.apply(this,arguments); var c=document.getElementById('dispConfirm'); if(c&&c.querySelector('.confirmation')) showLink(false); return r; }; },'#17'); }
  if(typeof closeDispConfirm==='function'){ pvxAfter('closeDispConfirm',function(){ var p=pvxActivePatient(); if(p) showLink(!isCompleted(p)); },'#17'); }

  /* ---------- Completed Today › Euthanized: the same sheet, not a plain confirm ---------- */
  document.addEventListener('drop',function(ev){
    var z=ev.target&&ev.target.closest&&ev.target.closest('#czEuthanized'); if(!z) return;
    var id=(typeof dragId!=='undefined')?dragId:null; if(!id) return;
    ev.preventDefault(); ev.stopPropagation();
    z.classList.remove('cz-over'); var bd=document.getElementById('board'); if(bd) bd.classList.remove('board-dim');
    var p=PATIENTS.find(function(x){ return x.id===id; }); if(!p||isCompleted(p)) return;
    try{ openDrawer(p.id); }catch(e){}
    setTimeout(function(){ var q=pvxActivePatient(); if(q&&q.id===p.id) openSheet(q,'euthanasia'); },260);
  },true);

  /* ---------- Completed Today: the aftercare under the name ---------- */
  if(typeof renderComplete==='function'){ 
    pvxAfter('renderComplete',function(){ 
      try{ var tEl=document.getElementById('czTotal'); if(tEl) tEl.textContent=String((+tEl.textContent||0)+completedTodayCount('Deceased'));
        document.querySelectorAll('#czList .cz-item').forEach(function(n){ var p=PATIENTS.find(function(x){ return x.id===n.dataset.pid; });
          if(!p||!p.ending) return; var s=n.querySelector('.cz-sub'); if(!s||s.querySelector('.cz-end')) return;
          var a=p.ending.aftercare==='hold'?'Held for instructions':label(AFTER,p.ending.aftercare); if(a) s.insertAdjacentHTML('beforeend','<span class="cz-end"> · '+pvxEscQ(a)+'</span>'); });
      }catch(e){}
      },'#17'); }

  try{ link(); }catch(e){}
  window.fvEndings={open:function(p,t,o){ openSheet(p||pvxActivePatient(),t||null,o); },
    /* from the "Form signed" notice: the drawer, then this sheet with the family's choices in, focused on Record */
    openSigned:function(p){ if(!p) return; try{ if(activePatient!==p.id) openDrawer(p.id); }catch(e){}
      setTimeout(function(){ var q=pvxActivePatient(); if(q&&q.id===p.id&&!isCompleted(q)){ var sf=signedForm(q); openSheet(q,sf?sf.kind:null,{useForm:!!sf}); } },260); },
    summary:summary,consentLine:consentLine,tagHtml:tagHtml,printTag:function(p){ return printTag(p||pvxActivePatient()); },staffNames:staffNames,AFTER:AFTER,KEEP:KEEP,state:function(){ return draft; },close:function(){ closeSheet(); },
    repaint:function(){ var p=pvxActivePatient(); if(draft) paintSheet(); else if(p) showLink(!isCompleted(p)); }};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 18 of 104 · no id ━━━━━ */
try{
/* ===== AFTERCARE FORMS n120 (Oct 12 2026) — the euthanasia / aftercare form on the reception iPad =====
   Daniel: "clicking on Euthanasia adds them to a queue where reception goes in with an iPad to fill our version of this form"
   (VCA Shoreline × Final Gift "Pet aftercare services and memorial center" + euthanasia consent). Choices: a Flow tab + family
   mode; drawn signatures + a printable copy; prices shown (kept in ts_settings/aftercare_prices, never in this public code);
   when signed, Flow tells the doctor. Then (Oct 12, "Do all of those"), Apple-style:
   · Family mode: a navigation bar (‹ Back · progress dots · English | Español · Staff), one filled primary button pinned at the
     bottom, "For Rosie" as the first title, a soft slide between screens (none under Reduce Motion).
       1 About you · 2 Care of Rosie (choices = Flow's drawer cards; the urn is a photo carousel) · 3 Review (each line with
       Change) · 4 Consent and signature (a pad with a baseline and ×, finger or Apple Pencil, the line follows the hand)
       → "Thank you" → the staff member in the room signs as witness → saved.
   · Español: every family-facing line, the care descriptions and the consent wording; the signed language is kept and the
     printed copy shows the consent as signed (plus the English wording for the record).
   · Flow › Consent forms: longest wait first, the wait shown on each card, the progress line (Sent → With the family → Signed),
     Cancel with Undo. Staff always go into the room with the iPad (Daniel, Oct 12), so there's no Guided Access tip.
   · Signed: every staff Flow screen gets a notice with "Record euthanasia" (opens the ending with the family's choices in).
   · Staff only: consent_form lives on the visit (staff rules); never in pub (tracker), lobby or Grid's field masks.
   · Urn pictures: placeholders until Daniel adds the photos (URN_IMG below, e.g. assets/img/urns/trail.jpg). */
(function(){
  if(typeof switchView!=='function'||typeof completePatient!=='function') return;
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
  var VER='vca-shoreline-finalgift-2026-10';
  var URNS=[['scatter','Blue scattering tube with paw prints'],['carved','Carved wood'],['cedar','Cedar memorial'],['serenity','Serenity photo'],['tin','Paw print tin'],['pouch','Satin pouch'],['trail','Trail to Heaven']];
  var URN_IMG={};   /* key → image path, filled in when the photos arrive; until then a quiet placeholder */
  var PRICE_KEYS=[['euth_outpatient','Euthanasia · outpatient'],['euth_consult','Euthanasia · with consult'],['communal','Communal cremation'],
    ['communal_clay','Communal cremation with clay paw print'],['private_clay','Private cremation with clay paw print'],['clay_only','Clay paw print only']];
  var CONSENT={en:'I, the undersigned, certify that I am the owner or the duly authorized agent of the pet described above, that I am 18 years of age or older, and I give VCA Shoreline, its agents, servants and representatives full and complete authority to humanely euthanize the said pet, and release the veterinary facility and its employees from any and all liability for so euthanizing the said pet. I also certify that, to the best of my knowledge, the said pet has not bitten any person or animal during the last 15 days and has not been exposed to rabies.',
    es:'Yo, la persona que firma, certifico que soy el dueño o el representante debidamente autorizado de la mascota descrita arriba, que tengo 18 años de edad o más, y otorgo a VCA Shoreline, a sus agentes, empleados y representantes plena y total autoridad para practicar la eutanasia de forma humanitaria a dicha mascota, y libero al centro veterinario y a sus empleados de toda responsabilidad por dicha eutanasia. También certifico que, a mi leal saber, dicha mascota no ha mordido a ninguna persona ni animal durante los últimos 15 días y no ha estado expuesta a la rabia.'};
  /* family-facing words: English and Spanish ({pet} and {date} are filled in) */
  var T={
    org2:['Pet aftercare with Final Gift','Cuidado posterior de mascotas con Final Gift'],
    back:['Back','Atrás'], staff:['Staff','Personal'],
    s1:['About you','Sus datos'], s2:['Care of {pet}','Cuidado de {pet}'], s3:['Review','Revisión'], s4c:['Consent','Consentimiento'], s4d:['Sign','Firma'],
    for:['For {pet}','Para {pet}'],
    lead1:['We’re so sorry. This tells us how you’d like us to care for {pet}. Take all the time you need, and ask us anything.','Lo sentimos mucho. Aquí nos indica cómo desea que cuidemos de {pet}. Tómese todo el tiempo que necesite y pregúntenos lo que quiera.'],
    name:['Your full name','Su nombre completo'], addr:['Street address','Dirección'], city:['City','Ciudad'], state:['State','Estado'], zip:['ZIP','Código postal'],
    petname:['Pet’s name','Nombre de la mascota'], dogcat:['Dog or cat','Perro o gato'], Dog:['Dog','Perro'], Cat:['Cat','Gato'], Other:['Other','Otro'],
    care:['Care of {pet}’s body','El cuidado del cuerpo de {pet}'], one:['Choose one.','Elija una opción.'],
    private_t:['Private cremation','Cremación privada'], private_d:['{pet} is cremated individually. The ashes come back to the hospital in the urn you choose, with a clay paw print, to be reunited with you and your family.','{pet} se crema de forma individual. Las cenizas regresan al hospital en la urna que usted elija, con una huella de su patita en arcilla, para volver con usted y su familia.'],
    communal_t:['Communal cremation','Cremación comunitaria'], communal_d:['{pet} is cremated together with other pets, with care and dignity. The ashes are not returned.','{pet} se crema junto con otras mascotas, con cuidado y dignidad. Las cenizas no se devuelven.'],
    release_t:['Take {pet} home','Llevar a {pet} a casa'], release_d:['We release {pet} to you for burial or other arrangements. Local laws apply.','Le entregamos a {pet} para el entierro u otros arreglos. Se aplican las leyes locales.'],
    hold_t:['Decide later','Decidir más tarde'], hold_d:['We can care for {pet} while you decide, for up to 7 days.','Podemos cuidar de {pet} mientras decide, hasta por 7 días.'],
    hold_n:['If we haven’t heard from you by {date}, {pet} will be communally cremated and you’ll be charged for it.','Si no sabemos de usted antes del {date}, se hará una cremación comunitaria de {pet} y se le cobrará.'],
    urn:['Choose an urn','Elija una urna'], urn1:['one is included','una está incluida'], incl:['Includes a clay paw print.','Incluye una huella de la patita en arcilla.'], photo:['Photo soon','Foto pronto'],
    clay:['Add a clay paw print','Añadir una huella de la patita en arcilla'], clay_d:['A keepsake of {pet}’s paw','Un recuerdo de la patita de {pet}'],
    review:['Please review','Revise sus opciones'], review_l:['Make sure everything is right. You can change anything.','Asegúrese de que todo esté bien. Puede cambiar lo que quiera.'],
    r_you:['You','Usted'], r_pet:['Pet','Mascota'], r_care:['Care','Cuidado'], r_urn:['Urn','Urna'], r_keep:['Keepsake','Recuerdo'], r_clay:['Clay paw print','Huella de la patita en arcilla'], r_none:['None','Ninguno'],
    change:['Change','Cambiar'], fees:['Fees','Costos'], totalw:['Total','Total'],
    hold_fee:['Communal cremation is charged if we haven’t heard from you within 7 days.','Si no sabemos de usted en 7 días, se cobrará la cremación comunitaria.'],
    consent_t:['Euthanasia consent','Consentimiento para la eutanasia'], sign_t:['Please sign','Por favor, firme'],
    sign_l:['Signing confirms {pet}’s care as you chose it.','Al firmar, confirma el cuidado de {pet} tal como lo eligió.'],
    signhere:['Sign with your finger or Apple Pencil','Firme con el dedo o con el Apple Pencil'], clear:['Clear','Borrar'],
    thanks:['Thank you','Gracias'], handback:['We’ll take good care of {pet}.','Cuidaremos muy bien de {pet}.'],
    cont:['Continue','Continuar'], toreview:['Review','Revisar'], tosign:['Continue to sign','Continuar para firmar'], signbtn:['Sign','Firmar'],
    e_name:['Please add your full name.','Por favor, escriba su nombre completo.'], e_addr:['Please add your address, so we can reach you about {pet}.','Por favor, escriba su dirección para poder comunicarnos con usted sobre {pet}.'],
    e_one:['Please choose one option.','Por favor, elija una opción.'], e_urn:['Please choose an urn.','Por favor, elija una urna.'], e_sname:['Please type your full name.','Por favor, escriba su nombre completo.'], e_sig:['Please sign in the box.','Por favor, firme en el recuadro.'],
    euth_outpatient:['Euthanasia · outpatient','Eutanasia · ambulatoria'], euth_consult:['Euthanasia · with consult','Eutanasia · con consulta'], communal:['Communal cremation','Cremación comunitaria'],
    communal_clay:['Communal cremation with clay paw print','Cremación comunitaria con huella en arcilla'], private_clay:['Private cremation with clay paw print','Cremación privada con huella en arcilla'], clay_only:['Clay paw print only','Solo huella en arcilla']
  };
  var PRICES=null, open=null, lang='en';
  function L(k,v){ var r=(T[k]||[k,k])[lang==='es'?1:0]; v=v||{}; return r.replace(/\{(\w+)\}/g,function(_,n){ return v[n]!=null?v[n]:''; }); }
  /* the drawer card (endings_n120 fvDCard) for every next-step choice here; a plain button if that module isn't there */
  function DC(o){ if(window.fvDCard) return fvDCard(o); return '<button type="button" class="cf-btn go '+(o.cls||'')+'" '+(o.attrs||'')+'>'+o.title+'</button>'; }
  var IC={ipad:'<rect x="6" y="3" width="12" height="18" rx="2.5"/><path d="M11 18h2"/>',print:'<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
    private:'<path d="M9 3h6M10 3v3c-2.5 1-4 3.4-4 6.5C6 17 8.5 21 12 21s6-4 6-8.5c0-3.1-1.5-5.5-4-6.5V3"/>',communal:'<circle cx="9" cy="12" r="4.5"/><circle cx="15" cy="12" r="4.5"/>',
    release:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',hold:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    paw:'<circle cx="7.5" cy="10" r="1.7"/><circle cx="10.8" cy="6.6" r="1.7"/><circle cx="14.8" cy="6.9" r="1.7"/><circle cx="17.8" cy="10.6" r="1.7"/><path d="M8.6 17.4c0-2.8 2-5 4.3-5s4.2 2.2 4.2 4.6c0 1.6-1.3 2.4-2.6 2-1-.3-1.6-.4-2-.4s-1.2.1-2 .4c-1.2.4-1.9-.3-1.9-1.6z"/>'};
  var CHEVL='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';

  function isAdmin(){ var e=pvxEmail().toLowerCase(); try{ if(typeof isAdminUser==='function'&&isAdminUser(e)) return true; }catch(_){} return e==='daniel.giordano@pravix.app'; }
  function pet(p){ return (p&&p.name)?String(p.name).split(' ')[0]:'your pet'; }
  function money(n){ return (typeof n==='number'&&isFinite(n))?'$'+n.toFixed(2):''; }
  function dur(m){ return m<1?'just now':m<60?m+' min':Math.floor(m/60)+' h '+(m%60?(m%60)+' min':''); }
  function day(d,l){ try{ return d.toLocaleDateString(l==='es'?'es-US':'en-US',{weekday:'long',month:'long',day:'numeric'}); }catch(e){ return ''; } }
  function today(iso){ try{ return isTodayHosp(new Date(iso)); }catch(e){ return new Date(iso).toDateString()===new Date().toDateString(); } }
  function species(p){ var s=String(p&&p.species||'').toLowerCase(); return /canine|dog/.test(s)?'Dog':/feline|cat/.test(s)?'Cat':(p&&p.species)||''; }
  function careLabel(k){ return ({private:'Private cremation',communal:'Communal cremation',release:'Release remains (take home)',hold:'Hold for further instructions'})[k]||''; }
  function urnLabel(k){ var u=URNS.filter(function(x){ return x[0]===k; })[0]; return u?u[1]:''; }
  function price(k){ var it=PRICES&&PRICES.items&&PRICES.items[k]; return it&&typeof it.amount==='number'?it:null; }
  /* the fee lines for a form: [{k,label,code,amount}] (labels in English for the staff copy) */
  function lines(f){ var L2=[], add=function(k){ var it=price(k), lab=(PRICE_KEYS.filter(function(x){ return x[0]===k; })[0]||[])[1]; L2.push({k:k,label:lab||k,code:it?it.code||'':'',amount:it?it.amount:null}); };
    if(f.kind==='euthanasia') add(f.fee==='consult'?'euth_consult':'euth_outpatient');
    if(f.care==='private') add('private_clay');
    else if(f.care==='communal') add(f.clay?'communal_clay':'communal');
    else if(f.care==='release'&&f.clay) add('clay_only');
    return L2; }
  function total(L2){ var t=0, ok=true; L2.forEach(function(l){ if(typeof l.amount==='number') t+=l.amount; else ok=false; }); return ok?Math.round(t*100)/100:null; }
  function summary(f){ if(!f) return ''; var b=[careLabel(f.care)]; if(f.care==='private'&&f.urn) b.push(urnLabel(f.urn)+' urn'); if(f.clay||f.care==='private') b.push('clay paw print'); return b.filter(Boolean).join(' · '); }
  function active(f){ return !!f&&(f.status==='requested'||f.status==='family'); }
  /* the progress line, for the drawer's sheet and the queue */
  function progress(f){ if(!f) return ''; var st=f.status, S=[['Sent',f.requested&&f.requested.at],['With the family',f.family_at],['Signed',f.signed_at]], at=st==='requested'?0:st==='family'?1:st==='signed'?2:-1;
    return '<ol class="cf-prog" aria-label="Form progress">'+S.map(function(x,i){ var c=i<at||(i===at&&st==='signed')?'done':i===at?'now':''; if(i===0&&at>0) c='done';
      return '<li class="'+c+'"'+(i===at?' aria-current="step"':'')+'>'+x[0]+(x[1]&&(c==='done'||c==='now')?'<small>'+pvxEscQ(pvxHm(x[1]))+'</small>':'')+'</li>'; }).join('')+'</ol>'; }

  /* ---------- prices: ts_settings/aftercare_prices (staff read, admin write — no rules change) ---------- */
  function loadPrices(){ try{ if(typeof DB==='undefined'||!DB) return; var ref=DB.collection('ts_settings').doc('aftercare_prices');
    ref.get().then(function(s){ if(s&&s.exists) { PRICES=s.data()||null; repaint(); } }).catch(function(){});
    if(ref.onSnapshot) ref.onSnapshot(function(s){ if(s&&s.exists){ PRICES=s.data()||null; repaint(); } },function(){}); }catch(e){} }

  /* ---------- saving: one transaction on the visit, never through the visit's own save ---------- */
  function write(p,f,force){
    p.consentForm=f; repaint();
    if(p._demo||typeof DB==='undefined'||!DB) return Promise.resolve(true);
    var ref=DB.collection('visits').doc(String(p.id));
    return DB.runTransaction(function(t){ return t.get(ref).then(function(s){
      var cur=(s&&s.exists&&(s.data()||{}).consent_form)||null;
      if(!force&&cur&&cur.id===f.id&&cur.status==='signed'&&f.status!=='signed') return 'signed-elsewhere';
      if(!force&&cur&&cur.id!==f.id&&active(cur)&&f.status==='requested') return 'other-open';
      t.update(ref,{consent_form:f,last_by:pvxWho(),last_at:new Date().toISOString()}); return true; }); })
      .then(function(r){ if(r!==true){ try{ notify('Not saved','The form changed on another screen',{icon:'info',color:'var(--accent)'}); }catch(_){} } return r===true; })
      .catch(function(e){ console.warn('[aftercare] save',e); try{ notify('Couldn’t save the form','Check the connection and try again',{icon:'info',color:'#C85A50'}); }catch(_){} return false; });
  }
  /* a notice with one action, like an iOS notification with a button */
  function notifyAct(title,sub,act,fn,opts){ try{ notify(title,sub,Object.assign({icon:'info',color:'#8A82A8',dur:12000},opts||{})); var w=document.getElementById('notes'), n=w&&w.lastElementChild; if(!n||!act) return;
    var b=document.createElement('button'); b.type='button'; b.className='n-act'; b.textContent=act;
    b.onclick=function(){ try{ fn(); }catch(e){} n.classList.add('hide'); setTimeout(function(){ n.remove(); },480); };
    var body=n.querySelector('.n-body')||n; body.appendChild(b); }catch(e){} }

  /* ---------- the doctor: send the form (from the ending sheet) ---------- */
  function send(p,kind,fee){
    if(!p) return; if(active(p.consentForm)) return;
    var f={id:'cf_'+Date.now().toString(36),v:VER,kind:kind==='died'?'died':'euthanasia',fee:kind==='died'?null:(fee==='consult'?'consult':'outpatient'),status:'requested',
      requested:{at:new Date().toISOString(),by:pvxWho(),uid:pvxUid()},pet:{name:pet(p),species:species(p)},owner:{name:p.owner||''}};
    write(p,f).then(function(ok){ if(ok) try{ notify('Form sent to reception',pvxEscQ(pet(p))+' · '+(f.kind==='died'?'Aftercare form':'Euthanasia & aftercare form'),{icon:'info',color:'#8A82A8'}); }catch(_){} });
  }
  /* cancel straight away, with Undo (no "are you sure") */
  function cancel(p){ var f=p&&p.consentForm; if(!active(f)) return; var before=JSON.parse(JSON.stringify(f));
    var g=Object.assign({},f,{status:'cancelled',cancelled:{at:new Date().toISOString(),by:pvxWho()}}); write(p,g);
    (window.fvNotifyAct||notifyAct)('Form cancelled',pvxEscQ(pet(p))+'’s '+(f.kind==='died'?'aftercare':'consent')+' form','Undo',function(){ var q=pvxPatientById(p.id); if(q&&q.consentForm&&q.consentForm.id===before.id&&q.consentForm.status==='cancelled') write(q,before,true); },{dur:8000}); }

  /* ---------- Flow › Consent forms ---------- */
  function seg(){ var sw=document.getElementById('switcher'); if(!sw||document.querySelector('#switcher .seg[data-view="consent"]')) return;
    var b=document.createElement('button'); b.className='seg'; b.dataset.view='consent';
    b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/></svg>Consent forms<span class="cf-badge" id="cfBadge" hidden></span>';
    var cl=sw.querySelector('.seg[data-view="client"]'); sw.insertBefore(b,cl||null); }
  function section(){ var el=document.getElementById('view-consent'); if(el) return el; var cl=document.getElementById('view-client'); if(!cl) return null;
    el=document.createElement('section'); el.className='view hidden'; el.id='view-consent'; cl.parentNode.insertBefore(el,cl); return el; }
  pvxAfter('switchView',function(v){ var el=section(); if(el){ el.classList.toggle('hidden',v!=='consent'); if(v==='consent'){ el.classList.remove('view'); void el.offsetWidth; el.classList.add('view'); renderQueue(); } } },'#18');
  if(typeof switchApp==='function'){ var saBase=switchApp; switchApp=function(app){ var r=saBase.apply(this,arguments); if(app!=='flow'){ var el=document.getElementById('view-consent'); if(el) el.classList.add('hidden'); } return r; }; }
  /* waiting forms first, the longest wait at the top; then today's signed forms, newest first */
  function queue(){ return (PATIENTS||[]).filter(function(p){ var f=p&&p.consentForm; return f&&(active(f)||(f.status==='signed'&&today(f.signed_at||f.requested.at))); })
    .sort(function(a,b){ var A=a.consentForm,B=b.consentForm, ra=active(A)?0:1, rb=active(B)?0:1; if(ra!==rb) return ra-rb;
      return ra===0?(new Date(A.requested.at)-new Date(B.requested.at)):(new Date(B.signed_at)-new Date(A.signed_at)); }); }
  function badge(){ var n=(PATIENTS||[]).filter(function(p){ return p&&active(p.consentForm); }).length+((window.fvDocs&&fvDocs.queue)?fvDocs.queue().length:0), b=document.getElementById('cfBadge'); if(b){ if(b.textContent!==String(n)) b.textContent=n; if(b.hidden!==!n) b.hidden=!n; } }
  function renderQueue(){ var el=section(); if(!el) return; badge(); if(el.classList.contains('hidden')) return;
    var Q=queue();
    var h='<div class="cfq-wrap"><div class="cfq-head"><div><h2 class="cfq-title">Consent forms</h2><div class="cfq-sub">Forms sent by the doctors. Take the tablet into the room, tap <b>Start with the family</b>, and go through it together.</div></div>'
      +'<button type="button" class="cfq-prices" data-cfa="prices">'+(isAdmin()?'Prices':'Price list')+'</button></div>';
    if(!PRICES) h+='<div class="cfq-note">Prices aren’t set yet, so the family form shows the choices without prices.'+(isAdmin()?' Open <b>Prices</b> to add them.':'')+'</div>';
    var G=[]; try{ if(window.fvDocs&&fvDocs.queue) G=fvDocs.queue(); }catch(e){}
    if(!Q.length&&!G.length) h+='<div class="cfq-empty"><b>No forms waiting</b><span>When a doctor sends a euthanasia or aftercare form, it appears here.</span></div>';
    Q.forEach(function(p){ var f=p.consentForm, st=f.status, m=pvxMinsSince(f.requested.at);
      var doc=''; try{ doc=(p.doctor&&p.doctor!=='unassigned')?docShort(p.doctor):''; }catch(e){}
      var wait=st==='signed'?'<div class="cfq-wait done"><b>Signed</b><span>'+pvxEscQ(pvxHm(f.signed_at))+'</span></div>'
        :'<div class="cfq-wait'+(m>=15?' long':'')+'"><b>'+pvxEscQ(dur(m))+'</b><span>'+(st==='family'?'with the family':'waiting')+'</span></div>';
      h+='<div class="cfq-card" data-pid="'+pvxEscQ(p.id)+'">'+wait
        +'<div class="cfq-main"><div class="cfq-name">'+pvxEscQ(((p.name||'')+' '+(p.last||'')).trim())+'</div>'
        +'<div class="cfq-meta">'+pvxEscQ([f.kind==='died'?'Aftercare form':'Euthanasia & aftercare',p.room&&p.room!=='Lobby'?p.room:'',doc,'sent by '+(f.requested.by||'')].filter(Boolean).join(' · '))+'</div>'
        +'<div class="cfq-prog">'+progress(f)+'</div>'
        +(st==='signed'?'<div class="cfq-meta strong">'+pvxEscQ(summary(f))+(f.witness?' · witnessed by '+pvxEscQ(f.witness.name||''):'')+'</div>':'')+'</div>'
        +'<div class="cfq-acts">'+(st==='signed'?DC({ic:IC.print,title:'Print · PDF',desc:'The signed form',arrow:'out',attrs:'data-cfa="print"'})
          :'<button type="button" class="cfq-btn quiet" data-cfa="cancel">Cancel</button>'+DC({ic:IC.ipad,title:st==='family'?'Resume':'Start with the family',desc:st==='family'?'Back to where they were':'Opens the family form',arrow:'out',attrs:'data-cfa="family"'}))+'</div></div>'; });
    try{ if(G.length) h+=fvDocs.queueCards(G); }catch(e){}
    el.innerHTML=h+'</div>'; }
  function repaint(){ try{ renderQueue(); }catch(e){} try{ if(open) paintFamily(); }catch(e){} try{ if(window.fvEndings&&fvEndings.repaint) fvEndings.repaint(); }catch(e){} }

  /* ---------- prices editor ---------- */
  function pricesSheet(){ var adm=isAdmin(), it=(PRICES&&PRICES.items)||{};
    var h='<div class="cfp-box" role="dialog" aria-modal="true" aria-label="Aftercare prices"><div class="cfp-t">Aftercare prices</div><div class="cfp-s">'+(adm?'Applies to this hospital.':'Only an admin can change these.')+'</div><div class="cfp-rows">';
    PRICE_KEYS.forEach(function(k){ var x=it[k[0]]||{}; h+='<label class="cfp-row"><span class="cfp-l">'+pvxEscQ(k[1])+'</span>'
      +'<input class="cfp-code" data-pk="'+k[0]+'" data-pf="code" placeholder="Code" aria-label="'+pvxEscQ(k[1])+' — code" value="'+pvxEscQ(x.code||'')+'"'+(adm?'':' disabled')+'>'
      +'<span class="cfp-dollar">$</span><input class="cfp-amt" data-pk="'+k[0]+'" data-pf="amount" inputmode="decimal" placeholder="0.00" aria-label="'+pvxEscQ(k[1])+' — amount, dollars" value="'+(typeof x.amount==='number'?x.amount.toFixed(2):'')+'"'+(adm?'':' disabled')+'></label>'; });
    h+='</div><div class="cfp-foot">'+(PRICES&&PRICES.updated_by?'<span class="cfp-by">Last changed by '+pvxEscQ(PRICES.updated_by)+'</span>':'<span></span>')
      +'<span><button type="button" class="cf-btn cancel" data-cfa="prices-close">'+(adm?'Cancel':'Close')+'</button>'+(adm?' <button type="button" class="cf-btn go" data-cfa="prices-save">Save</button>':'')+'</span></div></div>';
    var w=document.getElementById('cfPrices'); if(!w){ w=document.createElement('div'); w.id='cfPrices'; w.className='cfp-scrim open'; document.body.appendChild(w); }
    w.className='cfp-scrim open'; w.innerHTML=h; var f=w.querySelector('input:not([disabled])'); if(f) f.focus(); }
  function savePrices(){ var w=document.getElementById('cfPrices'); if(!w) return; var items={}, bad=null;
    PRICE_KEYS.forEach(function(k){ var a=w.querySelector('[data-pk="'+k[0]+'"][data-pf="amount"]'), c=w.querySelector('[data-pk="'+k[0]+'"][data-pf="code"]');
      var v=String(a.value||'').replace(/[$,\s]/g,''); if(v===''){ return; } var n=Number(v); if(!isFinite(n)||n<0){ bad=bad||a; return; }
      items[k[0]]={amount:Math.round(n*100)/100,code:String(c.value||'').trim().slice(0,20)}; });
    if(bad){ bad.focus(); bad.classList.add('cfp-bad'); return; }
    var doc={items:items,updated_at:new Date().toISOString(),updated_by:pvxWho()};
    PRICES=doc; w.className='cfp-scrim'; w.innerHTML=''; repaint();
    try{ if(typeof DB!=='undefined'&&DB) DB.runTransaction(function(t){ var ref=DB.collection('ts_settings').doc('aftercare_prices'); return t.get(ref).then(function(){ t.set(ref,doc); }); })
      .catch(function(e){ console.warn('[aftercare] prices',e); try{ notify('Prices not saved','Only an admin can change them',{icon:'info',color:'#C85A50'}); }catch(_){} }); }catch(e){} }

  /* ---------- family mode ---------- */
  var STEPS=4;   /* 1 about · 2 care · 3 review · 4 sign | 5 thank you · 6 witness (staff) */
  function startFamily(p){ if(!p||!p.consentForm) return; var f=JSON.parse(JSON.stringify(p.consentForm));
    f.owner=f.owner||{}; if(!f.owner.name) f.owner.name=p.owner||''; f.owner.state=f.owner.state||'CT'; f.pet=f.pet||{name:pet(p),species:species(p)};
    lang=f.lang||'en'; open={pid:p.id,step:1,f:f,err:'',dir:0};
    if(f.status==='requested'){ var g=Object.assign({},p.consentForm,{status:'family',family_at:new Date().toISOString(),family_by:pvxWho()}); write(p,g); open.f.status='family'; open.f.family_at=g.family_at; }
    document.body.classList.add('cf-family-on'); paintFamily(); var b=document.getElementById('cfFamily'); if(b) b.scrollTop=0; }
  function el(){ var w=document.getElementById('cfFamily'); if(!w){ w=document.createElement('div'); w.id='cfFamily'; w.setAttribute('role','dialog'); w.setAttribute('aria-modal','true'); document.body.appendChild(w); } return w; }
  function field(id,label,val,attrs){ return '<label class="cff-field"><span>'+label+'</span><input id="'+id+'" value="'+pvxEscQ(val||'')+'" '+(attrs||'')+'></label>'; }
  function careOpts(nm){ var v={pet:pvxEscQ(nm)}; return [
    {k:'private',t:L('private_t',v),d:L('private_d',v),urn:true,clay:'included'},
    {k:'communal',t:L('communal_t',v),d:L('communal_d',v),clay:'option'},
    {k:'release',t:L('release_t',v),d:L('release_d',v),clay:'option'},
    {k:'hold',t:L('hold_t',v),d:L('hold_d',v),clay:null}]; }
  function careName(k,nm){ return L(k+'_t',{pet:pvxEscQ(nm)}); }
  function paintFamily(){ if(!open) return; var p=pvxPatientById(open.pid), w=el(), f=open.f; if(!p){ closeFamily(); return; }
    if(w.querySelector('.cff')) readFields();   /* a live update repaints the form: keep what the family has typed */
    var nm=f.pet&&f.pet.name||pet(p), v={pet:pvxEscQ(nm)}, step=open.step, fam=step<=STEPS;
    var h='<div class="cff" lang="'+lang+'"><header class="cff-nav">'
      +'<div class="cff-nav-l">'+(step>1&&step<=STEPS?'<button type="button" class="cff-back" data-cfh="back">'+CHEVL+'<span>'+L('back')+'</span></button>':'<img class="cff-logo" src="assets/img/logo-light.png" alt="VCA Shoreline">')+'</div>'
      +'<div class="cff-dots" aria-hidden="'+(!fam)+'">'+(fam?Array.from({length:STEPS},function(_,i){ return '<span class="'+(i+1===step?'on':i+1<step?'done':'')+'"></span>'; }).join('')+'<em class="cff-sr">'+(lang==='es'?'Paso ':'Step ')+step+(lang==='es'?' de ':' of ')+STEPS+'</em>':'')+'</div>'
      +'<div class="cff-nav-r">'+(fam?window.fvTextSize(lang)+'<div class="cff-lang" role="group" aria-label="Language / Idioma"><button type="button" lang="en" aria-pressed="'+(lang==='en')+'" data-cfl="en">English</button><button type="button" lang="es" aria-pressed="'+(lang==='es')+'" data-cfl="es">Español</button></div>'
        +'<button type="button" class="cff-staff" data-cfh="hold" aria-label="Staff: press and hold to leave the form">'+L('staff')+'</button>':'')+'</div></header>';
    var anim=open.dir>0?' enter-fwd':open.dir<0?' enter-back':''; open.dir=0;
    h+='<main class="cff-card'+anim+'">';
    var primary='';
    if(step===1){
      h+='<h1 class="cff-big">'+L('for',v)+'</h1><p class="cff-lead">'+L('lead1',v)+'</p>'
        +'<div class="cff-grid">'+field('cffOwner',L('name'),f.owner.name,'autocomplete="name"')+field('cffAddr',L('addr'),f.owner.address,'autocomplete="street-address"')
        +field('cffCity',L('city'),f.owner.city,'autocomplete="address-level2"')+'<div class="cff-two">'+field('cffState',L('state'),f.owner.state,'autocomplete="address-level1" maxlength="2"')+field('cffZip',L('zip'),f.owner.zip,'inputmode="numeric" autocomplete="postal-code" maxlength="10"')+'</div>'
        +field('cffPet',L('petname'),f.pet.name,'')+'<div class="cff-field"><span>'+L('dogcat')+'</span><div class="cff-seg" role="radiogroup" aria-label="'+pvxEscQ(L('dogcat'))+'">'
        +['Dog','Cat','Other'].map(function(s){ var on=(f.pet.species||'')===s||(s==='Other'&&f.pet.species&&f.pet.species!=='Dog'&&f.pet.species!=='Cat'); return '<button type="button" role="radio" aria-checked="'+on+'" class="'+(on?'on':'')+'" data-cfs="'+s+'">'+L(s)+'</button>'; }).join('')+'</div></div></div>';
      primary='<button type="button" class="cff-primary" data-cfh="next">'+L('cont')+'</button>';
    }else if(step===2){
      h+='<h1>'+L('care',v)+'</h1><p class="cff-lead">'+L('one')+'</p><div class="cff-care" role="radiogroup" aria-label="'+pvxEscQ(L('care',v))+'">';
      careOpts(nm).forEach(function(o){ var on=f.care===o.k, pr=o.k==='private'?price('private_clay'):o.k==='communal'?price('communal'):null;
        var dd=o.d+(o.k==='hold'?'<span class="cff-note">'+L('hold_n',{pet:pvxEscQ(nm),date:pvxEscQ(day(new Date(Date.now()+7*864e5),lang))})+'</span>':'');
        h+=DC({ic:IC[o.k],title:o.t,aside:pr?money(pr.amount):'',desc:dd,sel:on,wrap:true,cls:'cff-opt'+(on?' on':''),attrs:'data-cfc="'+o.k+'"'});
        if(on&&o.urn){ h+='<div class="cff-sub"><div class="cff-subt">'+L('urn')+' <span>'+L('urn1')+'</span></div><div class="cff-urns" role="radiogroup" aria-label="'+pvxEscQ(L('urn'))+'">';
          URNS.forEach(function(u){ var uo=f.urn===u[0]; h+='<button type="button" class="cff-urn'+(uo?' on':'')+'" role="radio" aria-checked="'+uo+'" data-cfu="'+u[0]+'">'
            +(URN_IMG[u[0]]?'<img src="'+pvxEscQ(URN_IMG[u[0]])+'" alt="">':'<span class="cff-urn-ph" aria-hidden="true"><svg viewBox="0 0 24 24">'+IC.private+'</svg><em>'+L('photo')+'</em></span>')
            +'<span class="cff-urn-t">'+pvxEscQ(u[1])+'</span><span class="cff-urn-ok" aria-hidden="true"></span></button>'; });
          h+='</div><div class="cff-incl">'+L('incl')+'</div></div>'; }
        if(on&&o.clay==='option'){ var cp=price('clay_only'), cc=price('communal_clay'), cm=price('communal'), add=(o.k==='communal'&&cc&&cm)?Math.round((cc.amount-cm.amount)*100)/100:(cp?cp.amount:null);
          h+='<div class="cff-sub">'+DC({ic:IC.paw,title:L('clay'),aside:add!=null?'+'+money(add):'',desc:L('clay_d',v),sel:!!f.clay,box:true,cls:'cff-check'+(f.clay?' on':''),attrs:'data-cfk="clay"'})+'</div>'; } });
      h+='</div>';
      primary='<button type="button" class="cff-primary" data-cfh="next">'+L('toreview')+'</button>';
    }else if(step===3){
      var L2=lines(f), Tt=total(L2), o=f.owner||{};
      var rowr=function(lbl,val,goStep,id){ return '<div class="cff-rrow"><span class="cff-rl">'+lbl+'</span><span class="cff-rv">'+val+'</span>'+(goStep?'<button type="button" class="cff-edit" data-cfe="'+goStep+'" aria-label="'+pvxEscQ(L('change')+' · '+lbl)+'">'+L('change')+'</button>':'<span></span>')+'</div>'; };
      h+='<h1>'+L('review')+'</h1><p class="cff-lead">'+L('review_l')+'</p><div class="cff-review">'
        +rowr(L('r_you'),pvxEscQ(o.name||'')+'<small>'+pvxEscQ([o.address,o.city,((o.state||'')+' '+(o.zip||'')).trim()].filter(Boolean).join(', '))+'</small>',1)
        +rowr(L('r_pet'),pvxEscQ(nm)+(f.pet&&f.pet.species?' · '+pvxEscQ(L(f.pet.species)||f.pet.species):''),1)
        +rowr(L('r_care'),careName(f.care,nm),2)
        +(f.care==='private'?rowr(L('r_urn'),pvxEscQ(urnLabel(f.urn)),2):'')
        +(f.care!=='hold'?rowr(L('r_keep'),(f.clay||f.care==='private')?L('r_clay'):L('r_none'),2):'')
        +'</div>';
      if(L2.length&&PRICES) h+='<div class="cff-sum"><div class="cff-sumt">'+L('fees')+'</div><table class="cff-fees">'+L2.map(function(l){ return '<tr><td>'+pvxEscQ(L(l.k))+'</td><td>'+(l.amount!=null?money(l.amount):'—')+'</td></tr>'; }).join('')+(Tt!=null?'<tr class="t"><td>'+L('totalw')+'</td><td>'+money(Tt)+'</td></tr>':'')+'</table></div>';
      if(f.care==='hold') h+='<div class="cff-note">'+L('hold_fee')+'</div>';
      primary='<button type="button" class="cff-primary" data-cfh="next">'+L('tosign')+'</button>';
    }else if(step===4){
      h+='<h1>'+(f.kind==='died'?L('sign_t'):L('consent_t'))+'</h1>';
      if(f.kind!=='died') h+='<p class="cff-consent">'+pvxEscQ(CONSENT[lang])+'</p>'; else h+='<p class="cff-lead">'+L('sign_l',v)+'</p>';
      h+=field('cffSignName',L('name'),f.owner.sign_name!=null?f.owner.sign_name:f.owner.name,'autocomplete="name"')
        +'<div class="cff-sigwrap"><div class="cff-sigl">'+L('signhere')+' <button type="button" class="cff-clear" data-cfh="clear-owner">'+L('clear')+'</button></div><div class="cff-sigbox"><canvas class="cff-sig" id="cffSigOwner" aria-label="'+pvxEscQ(L('signhere'))+'"></canvas><span class="cff-x" aria-hidden="true">×</span></div><div class="cff-sigd">'+pvxEscQ(day(new Date(),lang))+'</div></div>';
      primary='<button type="button" class="cff-primary" data-cfh="sign">'+L('signbtn')+'</button>';
    }else if(step===5){
      h+='<div class="cff-thanks"><h1 class="cff-big">'+L('thanks')+'</h1><p class="cff-lead">'+L('handback',{pet:pvxEscQ(nm)})+'</p></div>';
      primary='<button type="button" class="cff-primary" data-cfh="staff">Staff: witness the signature</button>';
    }else if(step===6){
      h+='<h1>Witness</h1><p class="cff-lead">'+pvxEscQ(f.owner_sig&&f.owner_sig.name||f.owner.name||'The owner')+' signed for '+pvxEscQ(nm)+(f.lang==='es'?' (in Spanish)':'')+'. Sign as the witness to the owner’s consent.</p>'
        +'<div class="cff-sum"><div class="cff-sumt">'+pvxEscQ(summary(f))+'</div></div>'
        +'<div class="cff-sigwrap"><div class="cff-sigl">'+pvxEscQ(pvxWho())+' <button type="button" class="cff-clear" data-cfh="clear-witness">Clear</button></div><div class="cff-sigbox"><canvas class="cff-sig" id="cffSigWitness" aria-label="Witness signature pad"></canvas><span class="cff-x" aria-hidden="true">×</span></div><div class="cff-sigd">'+pvxEscQ(day(new Date()))+'</div></div>';
      primary='<button type="button" class="cff-primary" data-cfh="witness">Save the signed form</button>';
    }
    if(open.err) h+='<div class="cff-err" role="alert">'+pvxEscQ(typeof open.err==='object'?L(open.err.k,open.err.v):open.err)+'</div>';
    h+='</main><footer class="cff-bar">'+primary+'</footer></div>';
    var keep=document.activeElement&&w.contains(document.activeElement)&&document.activeElement.id;
    w.className='cf-family-sheet open'; w.innerHTML=h;
    if(keep){ var k=document.getElementById(keep); if(k&&k.focus) k.focus({preventScroll:true}); }
    pad('cffSigOwner','sigOwner'); pad('cffSigWitness','sigWitness');
  }
  function readFields(){ var f=open.f, v=function(id){ var e=document.getElementById(id); return e?String(e.value||'').trim():null; };
    if(document.getElementById('cffOwner')){ f.owner.name=v('cffOwner'); f.owner.address=v('cffAddr'); f.owner.city=v('cffCity'); f.owner.state=(v('cffState')||'').toUpperCase(); f.owner.zip=v('cffZip'); f.pet.name=v('cffPet')||f.pet.name; }
    if(document.getElementById('cffSignName')) f.owner.sign_name=v('cffSignName'); }
  function E(k,v){ return {k:k,v:v}; }
  function go(step,dir){ open.err=''; open.step=step; open.dir=dir; paintFamily(); var b=document.getElementById('cfFamily'); if(b) b.scrollTop=0; }
  /* signature pads: smooth strokes whose width follows the hand (Apple Pencil pressure, or slower = thicker for a finger) */
  function pad(id,key,store){ var c=document.getElementById(id); if(!c) return; var r=c.getBoundingClientRect(), dpr=Math.max(1,window.devicePixelRatio||1);
    c.width=Math.round(r.width*dpr); c.height=Math.round(r.height*dpr); var x=c.getContext('2d'); x.scale(dpr,dpr);
    var H=store||open, S=H[key]=H[key]||[]; draw(x,S,r.width,r.height,1); var cur=null, last=null;
    function at(e){ var b=c.getBoundingClientRect(), px=Math.round((e.clientX-b.left)*10)/10, py=Math.round((e.clientY-b.top)*10)/10, now=performance.now(), w;
      if(e.pointerType==='pen'&&e.pressure>0) w=1.1+e.pressure*3.2;
      else { var sp=last?Math.hypot(px-last[0],py-last[1])/Math.max(1,now-last[3]):0; w=Math.max(1.5,Math.min(3.6,3.6-sp*1.4)); if(last) w=last[2]*0.6+w*0.4; }
      var pt=[px,py,Math.round(w*100)/100,now]; last=pt; return pt; }
    c.onpointerdown=function(e){ e.preventDefault(); if(open&&open.err&&open.err.k==='e_sig'){ open.err=''; var er=document.querySelector('#cfFamily .cff-err'); if(er) er.remove(); } try{ c.setPointerCapture(e.pointerId); }catch(_){} last=null; cur=[at(e)]; S.push(cur); draw(x,S,r.width,r.height,1); };
    c.onpointermove=function(e){ if(!cur) return; e.preventDefault(); var ev=e.getCoalescedEvents?e.getCoalescedEvents():[e]; (ev.length?ev:[e]).forEach(function(q){ cur.push(at(q)); }); draw(x,S,r.width,r.height,1); };
    c.onpointerup=c.onpointercancel=function(){ cur=null; };
    c.dataset.w=r.width; c.dataset.h=r.height; }
  function draw(x,S,w,h,k){ x.clearRect(0,0,w,h); x.lineCap='round'; x.lineJoin='round'; x.strokeStyle='#14181F';
    S.forEach(function(s){ if(s.length===1){ x.beginPath(); x.arc(s[0][0],s[0][1],(s[0][2]||2.4)/2,0,Math.PI*2); x.fillStyle='#14181F'; x.fill(); return; }
      for(var i=1;i<s.length;i++){ var a=s[i-1], b=s[i], m0=i>1?[(s[i-2][0]+a[0])/2,(s[i-2][1]+a[1])/2]:[a[0],a[1]], m1=[(a[0]+b[0])/2,(a[1]+b[1])/2];
        x.beginPath(); x.lineWidth=((a[2]||2.4)+(b[2]||2.4))/2; x.moveTo(m0[0],m0[1]); x.quadraticCurveTo(a[0],a[1],m1[0],m1[1]); x.stroke(); }
      var e=s[s.length-1], pv=s[s.length-2]; x.beginPath(); x.lineWidth=e[2]||2.4; x.moveTo((pv[0]+e[0])/2,(pv[1]+e[1])/2); x.lineTo(e[0],e[1]); x.stroke(); }); }
  function inked(key,store){ var H=store||open, S=H&&H[key]||[], n=0; S.forEach(function(s){ n+=s.length; }); return n>=8; }
  function png(key,id,store){ var c=document.getElementById(id); var S=(store||open)[key]||[]; var w=+(c&&c.dataset.w)||600, h=+(c&&c.dataset.h)||180;
    var o=document.createElement('canvas'), k=Math.min(1,640/w); o.width=Math.round(w*k); o.height=Math.round(h*k); var x=o.getContext('2d'); x.scale(k,k); draw(x,S,w,h,k);
    return o.toDataURL('image/png'); }
  function next(){ var f=open.f; readFields(); open.err='';
    if(open.step===1){ if(!f.owner.name){ open.err=E('e_name'); paintFamily(); focus('cffOwner'); return; }
      if(!f.owner.address||!f.owner.city||!f.owner.zip){ open.err=E('e_addr',{pet:f.pet.name||pet(pvxPatientById(open.pid))}); paintFamily(); focus(!f.owner.address?'cffAddr':!f.owner.city?'cffCity':'cffZip'); return; } }
    if(open.step===2){ if(!f.care){ open.err=E('e_one'); paintFamily(); return; } if(f.care==='private'&&!f.urn){ open.err=E('e_urn'); paintFamily(); var u=document.querySelector('[data-cfu]'); if(u) u.focus(); return; } }
    go(open.step+1,1); }
  function focus(id){ var e=document.getElementById(id); if(e) e.focus(); }
  function signOwner(){ var f=open.f; readFields(); open.err='';
    if(!f.owner.sign_name){ open.err=E('e_sname'); paintFamily(); focus('cffSignName'); return; }
    if(!inked('sigOwner')){ open.err=E('e_sig'); paintFamily(); return; }
    f.owner_sig={name:f.owner.sign_name,at:new Date().toISOString(),png:png('sigOwner','cffSigOwner')};
    f.lang=lang; f.lines=lines(f); f.total=total(f.lines); f.consent_text=f.kind==='died'?null:CONSENT[lang]; f.consent_text_en=f.kind==='died'?null:CONSENT.en; go(5,1); }
  function signWitness(){ var p=pvxPatientById(open.pid), f=open.f; open.err='';
    if(!inked('sigWitness')){ open.err='Please sign as the witness.'; paintFamily(); return; }
    f.witness={name:pvxWho(),uid:pvxUid(),at:new Date().toISOString(),png:png('sigWitness','cffSigWitness')};
    f.status='signed'; f.signed_at=f.witness.at; delete f.owner.sign_name;
    var done=JSON.parse(JSON.stringify(f));
    write(p,done).then(function(ok){ if(!ok){ open.err='Couldn’t save. Check the connection and tap Save again.'; open.f.status='family'; paintFamily(); return; }
      seen[p.id]=done.id+':signed'; try{ if(window.fvDocs&&fvDocs.fileEnding) fvDocs.fileEnding(p,done); }catch(e){ console.warn('[aftercare] pdf',e); } closeFamily(); try{ notify('Form signed',pvxEscQ(done.pet&&done.pet.name||pet(p))+' · '+pvxEscQ(summary(done)),{icon:'info',color:'#8A82A8'}); }catch(_){} }); }
  /* n125 · Aa text size for the family (Standard / Large / Extra large); resets when the family form closes */
  window.fvTextSize=function(lg){ var cur=window.__cffTS||'s', es=lg==='es', L3=es?['Normal','Grande','Muy grande']:['Standard','Large','Extra large'];
    return '<div class="cff-ts" role="group" aria-label="'+(es?'Tamaño del texto':'Text size')+'">'+['s','l','xl'].map(function(k,i){ return '<button type="button" data-cfts="'+k+'" aria-pressed="'+(cur===k)+'" aria-label="'+L3[i]+'">A</button>'; }).join('')+'</div>'; };
  window.fvApplyTS=function(){ var w=document.getElementById('cfFamily'); if(!w) return; var k=window.__cffTS||'s'; if(k==='s') w.removeAttribute('data-ts'); else w.setAttribute('data-ts',k);
    [].forEach.call(w.querySelectorAll('[data-cfts]'),function(b){ b.setAttribute('aria-pressed',String(b.dataset.cfts===k)); }); };
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#cfFamily [data-cfts]'); if(!b) return; window.__cffTS=b.dataset.cfts; window.fvApplyTS(); },true);
  function closeFamily(){ open=null; lang='en'; window.__cffTS='s'; var tw=document.getElementById('cfFamily'); if(tw) tw.removeAttribute('data-ts'); document.body.classList.remove('cf-family-on'); var w=document.getElementById('cfFamily'); if(w){ w.className='cf-family-sheet'; w.innerHTML=''; } renderQueue(); }

  /* staff leave: press and hold "Staff" for 1.2 s (the family can't leave by a stray tap); answers stay on this iPad for Resume */
  var holdT=null, drafts={};
  document.addEventListener('pointerdown',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-cfh="hold"]'); if(!b) return; b.classList.add('holding');
    holdT=setTimeout(function(){ if(open){ readFields(); drafts[open.pid]={f:open.f,step:Math.min(open.step,STEPS),lang:lang}; } closeFamily(); },1200); },true);
  ['pointerup','pointercancel','pointerleave'].forEach(function(t){ document.addEventListener(t,function(){ clearTimeout(holdT); var b=document.querySelector('[data-cfh="hold"].holding'); if(b) b.classList.remove('holding'); },true); });

  /* ---------- printable copy (Print · PDF): laid out like the paper form ---------- */
  function printCopy(p,html){ var f=p&&p.consentForm; if(!f||f.status!=='signed') return;
    if(!html&&window.fvDocs&&fvDocs.docForForm){ var d=fvDocs.docForForm(p,f.id); if(d){ fvDocs.view(p,d); return; } } var L2=f.lines||lines(f), Tt=f.total!=null?f.total:total(L2), o=f.owner||{};
    function box(on){ return '<span class="cpb">'+(on?'✓':'')+'</span>'; }
    var h='<div class="cp"><div class="cp-head"><img src="assets/img/logo-light.png" alt=""><div><b>VCA Shoreline Veterinary Referral &amp; Emergency Center</b><br>895 Bridgeport Ave, Shelton, CT 06484 · 203-929-8600</div></div>'
      +'<h1>Pet aftercare'+(f.kind==='died'?'':' and euthanasia consent')+'</h1><div class="cp-sub">Pet aftercare services and memorial center · Final Gift · Visit '+pvxEscQ(p.hid||'')+(f.lang==='es'?' · Signed in Spanish':'')+'</div>'
      +'<table class="cp-t"><tr><td>Owner</td><td>'+pvxEscQ(o.name||'')+'</td></tr><tr><td>Address</td><td>'+pvxEscQ([o.address,o.city,(o.state||'')+' '+(o.zip||'')].filter(function(x){ return String(x||'').trim(); }).join(', '))+'</td></tr>'
      +'<tr><td>Pet</td><td>'+pvxEscQ(f.pet&&f.pet.name||'')+' · '+pvxEscQ(f.pet&&f.pet.species||'')+'</td></tr></table>'
      +'<h2>Care of body</h2><div class="cp-care">'+['private','communal','release','hold'].map(function(k){ return '<div>'+box(f.care===k)+careLabel(k)+(k==='private'&&f.care==='private'&&f.urn?' — urn: '+pvxEscQ(urnLabel(f.urn)):'')+'</div>'; }).join('')
      +'<div>'+box(f.clay||f.care==='private')+'Clay paw print'+(f.care==='private'?' (included)':'')+'</div></div>'
      +(f.care==='hold'?'<p class="cp-note">We will hold the pet for 7 days from this date. If VCA Shoreline is not told of a decision within 7 days, a communal cremation is charged and the remains are released to Final Gift.</p>':'')
      +(f.consent_text?'<h2>Euthanasia</h2><p class="cp-consent">'+pvxEscQ(f.consent_text)+'</p>'+(f.lang==='es'&&f.consent_text_en?'<p class="cp-consent en"><b>English wording (for the record):</b> '+pvxEscQ(f.consent_text_en)+'</p>':''):'')
      +'<div class="cp-sigs"><div><img src="'+pvxEscQ(f.owner_sig&&f.owner_sig.png||'')+'" alt="Owner signature"><div class="cp-line">Signature · '+pvxEscQ(f.owner_sig&&f.owner_sig.name||'')+' · '+pvxEscQ(new Date(f.owner_sig&&f.owner_sig.at||f.signed_at).toLocaleString('en-US'))+'</div></div>'
      +'<div><img src="'+pvxEscQ(f.witness&&f.witness.png||'')+'" alt="Witness signature"><div class="cp-line">Witness to pet owner’s consent · '+pvxEscQ(f.witness&&f.witness.name||'')+' · '+pvxEscQ(new Date(f.signed_at).toLocaleString('en-US'))+'</div></div></div>'
      +(L2.length?'<h2>Fees (staff copy)</h2><table class="cp-fees">'+L2.map(function(l){ return '<tr><td>'+pvxEscQ(l.label)+'</td><td>'+pvxEscQ(l.code?'Code #'+l.code:'')+'</td><td>'+(l.amount!=null?money(l.amount):'—')+'</td></tr>'; }).join('')+(Tt!=null?'<tr class="t"><td>Total</td><td></td><td>'+money(Tt)+'</td></tr>':'')+'</table>':'')
      +'<div class="cp-foot">Sent by '+pvxEscQ(f.requested&&f.requested.by||'')+' · '+pvxEscQ(new Date(f.requested&&f.requested.at).toLocaleString('en-US'))+' · Pravix Flow</div></div>';
    var w=document.getElementById('cfPrint'); if(!w){ w=document.createElement('div'); w.id='cfPrint'; document.body.appendChild(w); }
    w.innerHTML=h; document.body.classList.add('cf-printing');
    var done=function(){ document.body.classList.remove('cf-printing'); window.removeEventListener('afterprint',done); };
    window.addEventListener('afterprint',done); setTimeout(function(){ try{ window.print(); }catch(e){} setTimeout(done,1500); },120); }

  /* ---------- clicks ---------- */
  document.addEventListener('click',function(e){ var t=e.target; if(!t||!t.closest) return;
    var a=t.closest('[data-cfa]'); if(a){ var c=a.closest('.cfq-card'), p=c?pvxPatientById(c.dataset.pid):null, w=a.dataset.cfa;
      if(w==='family'&&p){ var d=drafts[p.id]; if(d&&p.consentForm&&d.f.id===p.consentForm.id){ lang=d.lang||'en'; open={pid:p.id,step:d.step,f:d.f,err:'',dir:0}; document.body.classList.add('cf-family-on'); paintFamily(); } else startFamily(p); }
      else if(w==='cancel'&&p) cancel(p);
      else if(w==='print'&&p) printCopy(p);
      else if(w==='prices') pricesSheet();
      else if(w==='prices-close'){ var s=document.getElementById('cfPrices'); if(s){ s.className='cfp-scrim'; s.innerHTML=''; } }
      else if(w==='prices-save') savePrices();
      return; }
    if(!open) return; var f=open.f;
    var lg=t.closest('[data-cfl]'); if(lg){ readFields(); lang=lg.dataset.cfl; paintFamily(); var q0=document.querySelector('[data-cfl="'+lang+'"]'); if(q0) q0.focus(); return; }
    var ed=t.closest('[data-cfe]'); if(ed){ go(+ed.dataset.cfe,-1); return; }
    var h=t.closest('[data-cfh]'); if(h){ var x=h.dataset.cfh;
      if(x==='next') next(); else if(x==='back'){ readFields(); go(Math.max(1,open.step-1),-1); }
      else if(x==='sign') signOwner(); else if(x==='staff') go(6,1); else if(x==='witness') signWitness();
      else if(x==='clear-owner'){ open.sigOwner=[]; paintFamily(); } else if(x==='clear-witness'){ open.sigWitness=[]; paintFamily(); }
      return; }
    var s=t.closest('[data-cfs]'); if(s){ readFields(); f.pet.species=s.dataset.cfs; paintFamily(); return; }
    var cc=t.closest('[data-cfc]'); if(cc){ f.care=cc.dataset.cfc; if(f.care==='private'||f.care==='hold') f.clay=false; if(f.care!=='private') f.urn=null; open.err=''; paintFamily(); var q=document.querySelector('[data-cfc="'+f.care+'"]'); if(q) q.focus({preventScroll:true}); return; }
    var u=t.closest('[data-cfu]'); if(u){ f.urn=u.dataset.cfu; open.err=''; var sx=(document.querySelector('.cff-urns')||{}).scrollLeft||0; paintFamily(); var ur=document.querySelector('.cff-urns'); if(ur) ur.scrollLeft=sx; var q2=document.querySelector('[data-cfu="'+f.urn+'"]'); if(q2) q2.focus({preventScroll:true}); return; }
    var k=t.closest('[data-cfk]'); if(k){ f.clay=!f.clay; paintFamily(); var q3=document.querySelector('[data-cfk]'); if(q3) q3.focus({preventScroll:true}); return; }
  });

  /* ---------- the doctor hears about it: requests and signatures, on every staff screen ---------- */
  var seen={}, seeded=false;
  setInterval(function(){ if(LOBBY||typeof PATIENTS==='undefined') return; try{
    (PATIENTS||[]).forEach(function(p){ var f=p&&p.consentForm; if(!f) return; var k=f.id+':'+f.status, was=seen[p.id]; seen[p.id]=k; if(!seeded||was===k) return;
      if(f.status==='signed'){ var ended=(typeof isCompleted==='function')&&isCompleted(p);
        notifyAct('Form signed',pvxEscQ(f.pet&&f.pet.name||pet(p))+' · '+pvxEscQ(summary(f)),ended?null:(f.kind==='died'?'Record death':'Record euthanasia'),function(){ if(window.fvEndings&&fvEndings.openSigned) fvEndings.openSigned(pvxPatientById(p.id)); },{dur:15000}); }
      else if(f.status==='requested'&&(!f.requested||f.requested.uid!==pvxUid())) notifyAct('Form for reception',pvxEscQ(pet(p))+' · sent by '+pvxEscQ(f.requested&&f.requested.by||''),'Open',function(){ switchView('consent'); },{dur:9000}); });
    seeded=true; badge(); var v=document.getElementById('view-consent'); if(v&&!v.classList.contains('hidden')&&!open) renderQueue(); }catch(e){} },2000);

  seg(); section(); badge(); loadPrices();
  window.fvNotifyAct=notifyAct;
  window.fvSigPad={pad:function(id,key,store){ pad(id,key,store); },png:function(key,id,store){ return png(key,id,store); },inked:function(key,store){ return inked(key,store); },draw:draw};
  window.fvConsentRepaint=function(){ repaint(); badge(); };
  window.fvConsent={consentText:function(l){ return CONSENT[l]||CONSENT.en; },send:send,cancel:cancel,active:active,summary:summary,careLabel:careLabel,urnLabel:urnLabel,lines:lines,total:total,progress:progress,
    setPrices:function(d){ PRICES=d; repaint(); },open:function(p){ startFamily(p); },print:printCopy,URN_IMG:URN_IMG,state:function(){ return open; },lang:function(){ return lang; }};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 19 of 104 · no id ━━━━━ */
try{
/* ===== DOCUMENTS n122 (Oct 13 2026) — Pravix Forms inside Flow =====
   Daniel: "Build it" (the Pravix Forms prototype). Staff always go into the room with the iPad.
   · The patient drawer gets a Documents section: signed PDFs saved on the visit, the body tag, forms out with reception,
     and "Send a form" for any form the hospital has mapped in Pravix Forms (shoreline.pravix.app/forms).
   · Reception's Consent forms tab lists those forms too; "Start with the family" opens the family's iPad screens:
     read the form (already filled from the visit), answer what it asks, sign; the staff member in the room witnesses.
   · The signed copy is the hospital's own PDF, filled and locked, re-opened to check it, fingerprinted (SHA-256) and saved in
     visit_docs (staff only; never in the tracker or the waiting room). The euthanasia & aftercare form does the same when a
     mapped "Other ending" template exists; without one it keeps today's printable copy.
   · Viewer (with the fingerprint check), Print, Download, and Make a packet: documents in order, one bookmark each,
     contact details or fees blacked out by redrawing those pages (the text is removed, not covered).
   · The PDF work runs in this browser (forms/lib/pvx-pdf.js: pdf-lib + pdf.js today, PdfCraft's engine later). */
(function(){
  if(typeof fillDrawer!=='function'||typeof renderDisposition!=='function') return;
  var LIB='/forms/lib/', LV='20261013n';   /* n126: verify codes on signed copies */
  function pet(p){ try{ return dispFirstName(p); }catch(e){ return p&&p.name||'the pet'; } }
  function noteAct(t,s,a,fn,o){ if(window.fvNotifyAct) fvNotifyAct(t,s,a,fn,Object.assign({color:'#3E8FA5'},o||{})); else pvxNote(t,s,o); }
  var IC={doc:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6M10 17h6"/>',tag:'<path d="M3 12l9-9h9v9l-9 9z"/><circle cx="16" cy="8" r="1.6"/>',send:'<path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/>',plus:'<path d="M12 5v14M5 12h14"/>',chev:'<path d="M9 6l6 6-6 6"/>',up:'<path d="M6 15l6-6 6 6"/>',down:'<path d="M6 9l6 6 6-6"/>',shield:'<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/>',warn:'<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',ipad:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>',dl:'<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>'};
  function svg(n){ return '<svg viewBox="0 0 24 24" aria-hidden="true">'+IC[n]+'</svg>'; }

  /* ---------- the PDF libraries, loaded the first time they're needed ---------- */
  var libP=null;
  function load(src){ return new Promise(function(ok,bad){ var s=document.createElement('script'); s.src=src; s.onload=ok; s.onerror=function(){ bad(new Error('Could not load '+src)); }; document.head.appendChild(s); }); }
  function lib(){ if(libP) return libP; libP=(window.PvxPdf?Promise.resolve():load(LIB+'pvx-pdf.js?v='+LV)).then(function(){ return window.PvxForms?null:load(LIB+'pvx-forms.js?v='+LV); }).then(function(){ return PvxPdf.ready(); });
    libP.catch(function(){ libP=null; }); return libP; }

  /* ---------- templates (Pravix Forms) ---------- */
  var TPL={list:null,at:0,p:null};
  function templates(force){ if(!force&&TPL.list&&Date.now()-TPL.at<5*60000) return Promise.resolve(TPL.list); if(TPL.p&&!force) return TPL.p; var D=pvxDb(); if(!D) return Promise.resolve([]);
    TPL.p=D.collection('form_templates').where('tenant_id','==',pvxTenant()).get().then(function(s){ TPL.list=s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }).filter(function(t){ return t.status==='ready'; })
      .sort(function(a,b){ return String(b.updated_at||'').localeCompare(String(a.updated_at||'')); }); TPL.at=Date.now(); TPL.p=null; return TPL.list; })
      .catch(function(e){ console.warn('[docs] templates',e); TPL.p=null; return TPL.list||[]; });
    return TPL.p; }
  function endingTemplate(kind){ return templates().then(function(L){ return L.filter(function(t){ return t.purpose==='ending'&&(t.kind||'euthanasia')===(kind==='died'?'died':'euthanasia'); })[0]||null; }); }

  /* ---------- documents on a visit ---------- */
  var DOCS={};
  function loadDocs(p,force){ var k=String(p.id), c=DOCS[k]; if(c&&!force&&(c.list||c.p)) return c.p||Promise.resolve(c.list); var D=pvxDb(); if(!D) return Promise.resolve([]);
    c=DOCS[k]=c||{list:null}; c.p=D.collection('visit_docs').where('visit_id','==',k).where('tenant_id','==',pvxTenant()).get().then(function(s){
      c.list=s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }).filter(function(m){ return !m.tenant_id||m.tenant_id===pvxTenant(); }).sort(function(a,b){ return String(b.created_at||'').localeCompare(String(a.created_at||'')); });
      c.p=null; return c.list; }).catch(function(e){ console.warn('[docs] list',e); c.p=null; c.err=true; return c.list||[]; });
    return c.p; }
  function docsOf(p){ var c=p&&DOCS[String(p.id)]; return (c&&c.list)||[]; }
  function docForForm(p,formId){ return docsOf(p).filter(function(d){ return d.form_id&&d.form_id===formId; })[0]||null; }

  /* ---------- forms out with reception (form_requests) ---------- */
  var REQ=[], reqUnsub=null, reqSeen={};
  function listen(){ var D=pvxDb(); if(!D||reqUnsub) return;
    try{ reqUnsub=D.collection('form_requests').where('tenant_id','==',pvxTenant()).where('status','in',['requested','family']).onSnapshot(function(s){
      var before=REQ.map(function(r){ return r.id; }); REQ=s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); });
      REQ.forEach(function(r){ if(before.indexOf(r.id)<0&&!reqSeen[r.id]&&r.status==='requested'&&r.requested&&r.requested.uid!==pvxUid()&&(Date.now()-new Date(r.requested.at))<10*60000){ reqSeen[r.id]=1;
        var p=pvxPatientById(r.visit_id); noteAct('Form for reception',pvxEscQ(p?pet(p):'A patient')+' · '+pvxEscQ(r.template_name||'Form'),'Open',function(){ try{ switchView('consent'); }catch(e){} }); } });
      repaintAll(); },function(e){ console.warn('[docs] requests',e); reqUnsub=null; }); }catch(e){ console.warn('[docs] listen',e); } }
  var tries=0; (function wait(){ if(pvxDb()) return listen(); if(++tries<60) setTimeout(wait,500); })();
  function reqsOf(p){ return REQ.filter(function(r){ return String(r.visit_id)===String(p.id); }); }
  function queue(){ return REQ.filter(function(r){ return !!pvxPatientById(r.visit_id); }).sort(function(a,b){ return new Date(a.requested.at)-new Date(b.requested.at); }); }
  function dur(m){ return m<1?'just now':m<60?m+' min':Math.floor(m/60)+' h '+(m%60)+' min'; }
  function queueCards(G){ var DC=window.fvDCard; return G.map(function(r){ var p=pvxPatientById(r.visit_id), m=pvxMinsSince(r.requested.at), st=r.status;
      return '<div class="cfq-card fvq-card" data-rid="'+pvxEscQ(r.id)+'"><div class="cfq-wait'+(m>=15?' long':'')+'"><b>'+pvxEscQ(dur(m))+'</b><span>'+(st==='family'?'with the family':'waiting')+'</span></div>'
        +'<div class="cfq-main"><div class="cfq-name">'+pvxEscQ(((p.name||'')+' '+(p.last||'')).trim())+'</div><div class="cfq-meta">'+pvxEscQ([r.template_name||'Form',p.room&&p.room!=='Lobby'?p.room:'','sent by '+(r.requested.by||'')].filter(Boolean).join(' · '))+'</div></div>'
        +'<div class="cfq-acts"><button type="button" class="cfq-btn quiet" data-fvq="cancel" data-rid="'+pvxEscQ(r.id)+'">Cancel</button>'
        +(DC?DC({ic:IC.ipad,title:st==='family'?'Resume':'Start with the family',desc:'Opens the family form',arrow:'out',attrs:'data-fvq="family" data-rid="'+pvxEscQ(r.id)+'"'}):'<button type="button" class="cfq-btn" data-fvq="family" data-rid="'+pvxEscQ(r.id)+'">Start with the family</button>')+'</div></div>'; }).join(''); }
  function setReq(r,patch){ var D=pvxDb(); if(!D) return Promise.reject(new Error('offline')); Object.assign(r,patch); return D.collection('form_requests').doc(r.id).set(patch,{merge:true}); }
  function repaintAll(){ try{ if(window.fvConsentRepaint) fvConsentRepaint(); }catch(e){} var p=pvxActivePatient(); if(p) try{ paintDocs(p); }catch(e){} }

  /* ---------- the drawer: Documents ---------- */
  function mount(){ var m=document.getElementById('docsMount'); if(m) return m; var after=document.getElementById('intakeCardMount')||document.getElementById('recordsMount'); if(!after) return null;
    m=document.createElement('div'); m.id='docsMount'; after.insertAdjacentElement('afterend',m); return m; }
  pvxAfter('fillDrawer',function(p){ try{ if(p){ paintDocs(p); var k=String(p.id); if(!DOCS[k]||!DOCS[k].list||Date.now()-(DOCS[k].at||0)>60000){ (DOCS[k]=DOCS[k]||{}).at=Date.now(); loadDocs(p,true).then(function(){ var c=pvxActivePatient(); if(c&&c.id===p.id) paintDocs(c); }); } } }catch(e){ console.warn('[docs]',e); } },'#19');
  function paintDocs(p){ var m=mount(); if(!m) return; var D=docsOf(p), R=reqsOf(p), F=p.consentForm, e=p.ending, rows=[];
    D.forEach(function(d){ rows.push('<button type="button" class="fvd-item" data-fvd="view" data-doc="'+pvxEscQ(d.id)+'"><span class="fvd-thumb" aria-hidden="true">'+svg('doc')+'</span><span class="fvd-b"><span class="fvd-t">'+pvxEscQ(d.title||'Signed form')+'</span><span class="fvd-s">Signed '+pvxEscQ(pvxHm(d.signed_at||d.created_at))+(d.signed_by?' · '+pvxEscQ(d.signed_by):'')+(d.witness?' · witnessed':'')+'</span><span class="fvd-ok">'+(d.pages||1)+' page'+((d.pages||1)===1?'':'s')+' · PDF</span></span><span class="fvd-chev" aria-hidden="true">'+svg('chev')+'</span></button>'); });
    if(F&&F.status==='signed'&&!docForForm(p,F.id)) rows.push('<button type="button" class="fvd-item" data-fvd="print-consent"><span class="fvd-thumb" aria-hidden="true">'+svg('doc')+'</span><span class="fvd-b"><span class="fvd-t">'+(F.kind==='died'?'Aftercare form':'Euthanasia &amp; aftercare consent')+'</span><span class="fvd-s">Signed '+pvxEscQ(pvxHm(F.signed_at))+' · printable copy</span></span><span class="fvd-chev" aria-hidden="true">'+svg('chev')+'</span></button>');
    if(e&&e.aftercare) rows.push('<div class="fvd-item static"><span class="fvd-thumb" aria-hidden="true">'+svg('tag')+'</span><span class="fvd-b"><span class="fvd-t">Body tag · 4 × 6 in</span><span class="fvd-s">'+pvxEscQ((window.fvEndings&&fvEndings.summary)?fvEndings.summary(e,false):'')+'</span></span><button type="button" class="fvd-mini" data-fvd="tag">Print</button></div>');
    R.forEach(function(r){ rows.push('<div class="fvd-item static pending"><span class="fvd-thumb" aria-hidden="true">'+svg('send')+'</span><span class="fvd-b"><span class="fvd-t">'+pvxEscQ(r.template_name||'Form')+'</span><span class="fvd-s">'+(r.status==='family'?'With the family':'With reception')+' · sent '+pvxEscQ(pvxHm(r.requested.at))+'</span></span><button type="button" class="fvd-mini" data-fvd="cancel-req" data-rid="'+pvxEscQ(r.id)+'">Cancel</button></div>'); });
    var loading=DOCS[String(p.id)]&&DOCS[String(p.id)].p&&!D.length;
    var h='<div class="fvd"><div class="fvd-head"><p class="sect-title">Documents'+(rows.length?' · '+rows.length:'')+'</p>'+((D.length||(e&&e.aftercare))?'<button type="button" class="fvd-link" data-fvd="packet">Make a packet…</button>':'')+'</div>'
      +(rows.length?'<div class="fvd-list">'+rows.join('')+'</div>':(loading?(window.pvxWaitHTML?pvxWaitHTML('docs',p.id):'<div class="fvd-empty">Loading…</div>'):''))
      +(isCompleted(p)?'':'<button type="button" class="fvd-send" data-fvd="send">'+svg('plus')+'Send a form…</button>')+'</div>';
    if(m.innerHTML!==h) m.innerHTML=h; }

  /* ---------- sheets (the same sheet as the ending: centered on a computer, from the bottom on a phone) ---------- */
  var sheet=null;
  var backPend=null;   /* PVX-N211: on iPhone the drawer steps aside for this sheet and comes back after it */
  function openSheet(html,cls,label){ var bk=(sheet&&sheet.back)||backPend; if(sheet) sheet.back=null; closeSheet(); backPend=null; if(!bk&&window.pvxSheetBack) bk=pvxSheetBack(); var s=document.createElement('div'); s.id='fvdSheet'; s.className='end-sheet open';
    s.innerHTML='<div class="es-scrim" data-fvd="close"></div><div class="es-panel '+(cls||'')+'" role="dialog" aria-modal="true" aria-label="'+pvxEscQ(label||'')+'">'+html+'</div>';
    document.body.appendChild(s); sheet={el:s,last:document.activeElement,back:bk}; requestAnimationFrame(function(){ s.classList.add('shown'); var f=s.querySelector('[data-autofocus]')||s.querySelector('.es-panel button:not([data-fvd="close"])'); if(f) f.focus({preventScroll:true}); }); return s; }
  function closeSheet(){ if(!sheet) return; var s=sheet.el, l=sheet.last, bk=sheet.back; sheet=null; s.remove();
    if(bk){ backPend=bk; setTimeout(function(){ if(backPend===bk&&!sheet){ backPend=null; if(window.pvxSheetReturn) pvxSheetReturn(bk); } },0); return; }
    try{ if(l&&document.contains(l)) l.focus({preventScroll:true}); }catch(e){} }
  function bar(title,right){ return '<header class="es-bar"><button type="button" class="es-cancel" data-fvd="close">'+(right?'Cancel':'Close')+'</button><h2>'+pvxEscQ(title)+'</h2><span class="es-bar-r"></span></header>'; }
  document.addEventListener('keydown',function(e){ if(sheet&&e.key==='Escape'){ e.stopPropagation(); e.preventDefault(); closeSheet(); } },true);

  /* Send a form */
  var send=null;
  function openSend(p){ send={pid:p.id,tid:null,ans:{}};
    openSheet(bar('Send a form for '+pet(p),true)+'<div class="es-body"><div class="es-sec"><div class="es-text">Loading hospital forms…</div></div></div>','','Send a form');
    templates(true).then(function(){ paintSend(); }); }
  function paintSend(){ if(!send||!sheet) return; var p=pvxPatientById(send.pid); if(!p){ closeSheet(); return; }
    var L=(TPL.list||[]).filter(function(t){ return t.purpose!=='ending'; }), out=reqsOf(p).map(function(r){ return r.template_id; }), done=docsOf(p).map(function(d){ return d.template_id; });
    var h=bar('Send a form for '+pet(p),true)+'<div class="es-body">';
    if(!L.length) h+='<div class="es-sec"><div class="es-group es-text"><b>No forms are ready yet.</b><br>Map your hospital’s PDFs in Pravix Forms, then publish them to Flow.</div></div>';
    else{ h+='<div class="es-sec"><div class="es-h" id="fvdFormsH">Hospital forms</div><div class="es-group" role="radiogroup" aria-labelledby="fvdFormsH">';
      L.forEach(function(t){ var on=send.tid===t.id, isOut=out.indexOf(t.id)>-1, isDone=done.indexOf(t.id)>-1, pages=(t.file&&t.file.pages||[]).length;
        h+='<button type="button" class="es-row fvd-pickrow'+(on?' on':'')+'" role="radio" aria-checked="'+on+'" data-fvd="pick" data-tid="'+pvxEscQ(t.id)+'"'+(isOut?' disabled':'')+'><span class="fvd-th" data-fvd-th="'+pvxEscQ(t.id)+'" aria-hidden="true"></span><span class="es-rl">'+pvxEscQ(t.name||'Form')+'<span class="es-rd">'+(isOut?'Already with reception':isDone?'Signed earlier today · send again':pages+' page'+(pages===1?'':'s'))+'</span></span><span class="es-check" aria-hidden="true"></span></button>'; });
      h+='</div></div>';
      var t=L.filter(function(x){ return x.id===send.tid; })[0];
      if(t){ var staffQ=(t.boxes||[]).filter(function(b){ return b.src==='staff.text'; });
        if(staffQ.length){ h+='<div class="es-sec"><div class="es-h">Before you send it</div><div class="es-group">'+staffQ.map(function(b){ return '<label class="es-row es-field"><span class="es-fl">'+pvxEscQ(b.label&&b.label.en||'Staff answer')+'</span><input type="text" data-fvd-staff="'+pvxEscQ(b.id)+'" value="'+pvxEscQ(send.ans[b.id]||'')+'" autocomplete="off"></label>'; }).join('')+'</div></div>'; }
        h+='<div class="es-sec fvd-filled"><div>Filled from '+pvxEscQ(pet(p))+'’s visit: <b>'+pvxEscQ([p.owner,p.hid].filter(Boolean).join(' · '))+'</b></div><div class="fvd-sub">Reception takes the tablet into the room with the family.</div></div>'; } }
    h+='</div><footer class="es-foot"><div class="end-hint" id="fvdHint" role="alert" hidden></div><button type="button" class="es-primary fvd-solid" data-fvd="do-send"'+(send.tid?'':' disabled')+'>Send to reception</button></footer>';
    var panel=sheet.el.querySelector('.es-panel'), fk=document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.tid; panel.innerHTML=h;
    if(fk){ var f=panel.querySelector('[data-tid="'+fk+'"]'); if(f) f.focus(); }
    L.forEach(function(t){ tplThumb(t); }); }
  /* a small picture of each form's first page, so staff pick by sight */
  var THUMB={};
  function tplThumb(t){ var put=function(u){ var e=document.querySelector('#fvdSheet [data-fvd-th="'+t.id+'"]'); if(e&&!e.firstChild){ var i=new Image(); i.src=u; i.alt=''; e.appendChild(i); } };
    var k=t.id+':'+(t.file&&t.file.sha256); if(THUMB[k]){ if(THUMB[k]!==1) put(THUMB[k]); return; } THUMB[k]=1;
    lib().then(function(){ return PvxForms.templateBytes(pvxDb(),t); }).then(function(b){ return PvxPdf.renderPage(b,0,0.25); }).then(function(c){ THUMB[k]=c.toDataURL('image/png'); put(THUMB[k]); }).catch(function(){ delete THUMB[k]; }); }
  function doSend(){ var p=pvxPatientById(send.pid), t=(TPL.list||[]).filter(function(x){ return x.id===send.tid; })[0], D=pvxDb(); if(!p||!t||!D||send.busy) return;
    send.busy=true; var btn=document.querySelector('#fvdSheet [data-fvd="do-send"]'); if(btn){ btn.disabled=true; btn.innerHTML='<span class="fvd-spin" aria-hidden="true"></span>Sending…'; }
    var id='fr_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), r={tenant_id:pvxTenant(),visit_id:String(p.id),template_id:t.id,template_name:t.name||'Form',status:'requested',
      requested:{at:new Date().toISOString(),by:pvxWho(),uid:pvxUid()},pet:{name:pet(p)},owner:{name:p.owner||''},staff_answers:send.ans||{}};
    reqSeen[id]=1; D.collection('form_requests').doc(id).set(r).then(function(){ r.id=id; if(!REQ.some(function(x){ return x.id===id; })) REQ.push(r); closeSheet(); pvxNote('Form sent to reception',pvxEscQ(pet(p))+' · '+pvxEscQ(r.template_name)); repaintAll(); })
      .catch(function(e){ console.warn('[docs] send',e); send.busy=false; var b2=document.querySelector('#fvdSheet [data-fvd="do-send"]'); if(b2){ b2.disabled=false; b2.textContent='Send to reception'; } var h=document.getElementById('fvdHint'); if(h){ h.textContent='Couldn’t send it. Check the connection and try again.'; h.hidden=false; } }); }
  function cancelReq(id){ var r=REQ.filter(function(x){ return x.id===id; })[0]; if(!r) return; var before={status:r.status};
    setReq(r,{status:'cancelled',cancelled:{at:new Date().toISOString(),by:pvxWho()}}).then(function(){ REQ=REQ.filter(function(x){ return x.id!==id; }); repaintAll();
      noteAct('Form cancelled',pvxEscQ(r.template_name||'Form'),'Undo',function(){ setReq(r,{status:before.status,cancelled:null}).then(function(){ if(!REQ.some(function(x){ return x.id===id; })) REQ.push(r); repaintAll(); }); },{dur:8000}); })
      .catch(function(e){ console.warn('[docs] cancel',e); }); }

  /* ---------- the family's iPad screens for a mapped form ---------- */
  var L2={read:['Please read','Por favor, lea'],read_l:['This is the form you’re signing. Your details are already filled in.','Este es el formulario que va a firmar. Sus datos ya están completados.'],
    ask:['Your answers','Sus respuestas'],ask_l:['Check these and fill in anything missing.','Revíselos y complete lo que falte.'],sign:['Please sign','Por favor, firme'],
    sign_l:['By signing, you agree to the form you just read.','Al firmar, acepta el formulario que acaba de leer.'],name:['Your full name','Su nombre completo'],
    signhere:['Sign with your finger or Apple Pencil','Firme con el dedo o con el Apple Pencil'],clear:['Clear','Borrar'],cont:['Continue','Continuar'],signbtn:['Sign','Firmar'],
    back:['Back','Atrás'],staff:['Staff','Personal'],thanks:['Thank you','Gracias'],care:['We’ll take good care of {pet}.','Cuidaremos muy bien de {pet}.'],
    req:['Please answer this to continue.','Por favor, responda para continuar.'],e_name:['Please type your full name.','Por favor, escriba su nombre completo.'],e_sig:['Please sign in the box.','Por favor, firme en el recuadro.'],
    yes:['Yes','Sí'],loading:['Preparing the form…','Preparando el formulario…'],choose:['Choose one.','Elija una opción.'],
    page:['Page {n} of {t}','Página {n} de {t}'],zin:['Make it bigger','Ampliar'],zout:['Make it smaller','Reducir'],ztip:['Double-tap a page to zoom.','Toque dos veces una página para ampliarla.']};
  var FAM=null;
  function t2(k,v){ var r=(L2[k]||[k,k])[FAM&&FAM.lang==='es'?1:0]; return r.replace(/\{(\w+)\}/g,function(_,n){ return v&&v[n]!=null?v[n]:''; }); }
  function qTitle(q){ var t=q.title||{}; return (FAM.lang==='es'&&t.es)?t.es:(t.en||''); }
  function startFamily(rid){ var r=REQ.filter(function(x){ return x.id===rid; })[0]; if(!r) return; var p=pvxPatientById(r.visit_id); if(!p) return;
    var aw=document.getElementById('cfFamily'); if(aw&&aw.classList.contains('open')) return;   /* the euthanasia form is open */
    var kept=famDrafts[rid]||null; delete famDrafts[rid];
    FAM=kept||{rid:rid,pid:p.id,step:'read',lang:'en',ans:{},err:'',pages:null,tpl:null,sig:{}};
    if(r.status==='requested') setReq(r,{status:'family',family_at:new Date().toISOString(),family_by:pvxWho()}).catch(function(){});
    document.body.classList.add('cf-family-on'); paintFamily();
    lib().then(function(){ return templates(); }).then(function(L){ var tpl=L.filter(function(t){ return t.id===r.template_id; })[0]; if(!tpl) throw new Error('This form is no longer published.');
      FAM.tpl=tpl; var a=FAM.ans; PvxForms.questions(tpl).forEach(function(q){ if(a[q.key]!=null) return;
        if(q.src==='owner.name') a[q.key]=p.owner||''; else if(q.src==='owner.phone') a[q.key]=p.ownerPhone||''; else if(q.src==='family.state') a[q.key]='CT'; });
      Object.keys(r.staff_answers||{}).forEach(function(k){ a[k]=r.staff_answers[k]; });
      return preview(); }).catch(function(e){ console.warn('[docs] family',e); if(FAM){ FAM.err=String(e.message||e); paintFamily(); } }); }
  function preview(){ var p=pvxPatientById(FAM.pid); return PvxForms.templateBytes(pvxDb(),FAM.tpl).then(function(src){ FAM.src=src; return PvxPdf.fill(src,FAM.tpl.boxes,PvxForms.resolve(FAM.tpl,{p:p,answers:FAM.ans,hospital:'VCA Shoreline'}),{}); })
    .then(function(b){ var n=FAM.tpl.file.pages.length, out=[], ch=Promise.resolve(); for(var i=0;i<n;i++)(function(i){ ch=ch.then(function(){ return PvxPdf.renderPage(b,i,1.6); }).then(function(c){ out.push(c.toDataURL('image/jpeg',0.86)); }); })(i);
      return ch.then(function(){ if(!FAM) return; FAM.pages=out; paintFamily(); }); }); }
  function famEl(){ var w=document.getElementById('cfFamily'); if(!w){ w=document.createElement('div'); w.id='cfFamily'; w.setAttribute('role','dialog'); w.setAttribute('aria-modal','true'); document.body.appendChild(w); } return w; }
  function steps(){ var Q=FAM.tpl?PvxForms.questions(FAM.tpl):[]; return Q.length?['read','ask','sign']:['read','sign']; }
  function paintFamily(){ if(!FAM) return; var p=pvxPatientById(FAM.pid); if(!p){ closeFamily(); return; } readAnswers();
    var w=famEl(), S=steps(), idx=S.indexOf(FAM.step), fam=idx>-1, nm=pet(p), tpl=FAM.tpl, h='<div class="cff" lang="'+FAM.lang+'"><header class="cff-nav"><div class="cff-nav-l">'
      +(fam&&idx>0?'<button type="button" class="cff-back" data-fvd="fback"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>'+t2('back')+'</span></button>':'<img class="cff-logo" src="assets/img/logo-light.png" alt="VCA Shoreline">')+'</div>'
      +'<div class="cff-dots" aria-hidden="'+(!fam)+'">'+(fam?S.map(function(s,i){ return '<span class="'+(i===idx?'on':i<idx?'done':'')+'"></span>'; }).join(''):'')+'</div>'
      +'<div class="cff-nav-r">'+(fam?(window.fvTextSize?fvTextSize(FAM.lang):'')+'<div class="cff-lang" role="group" aria-label="Language / Idioma"><button type="button" lang="en" aria-pressed="'+(FAM.lang==='en')+'" data-fvl="en">English</button><button type="button" lang="es" aria-pressed="'+(FAM.lang==='es')+'" data-fvl="es">Español</button></div><button type="button" class="cff-staff" data-fvd="hold" aria-label="Staff: press and hold to leave the form">'+t2('staff')+'</button>':'')+'</div></header><main class="cff-card">';
    var primary='';
    if(!tpl&&!FAM.err) h+='<h1>'+t2('loading')+'</h1>';
    else if(FAM.step==='read'){ var NP=FAM.pages?FAM.pages.length:0;
      h+='<h1>'+t2('read')+'</h1><p class="cff-lead">'+t2('read_l')+'</p>'+(NP?'<div class="fvf-zoombar"><span>'+t2('ztip')+'</span><button type="button" class="fvf-zbtn" data-fvd="fzoom" aria-pressed="'+!!FAM.zoom+'">'+t2(FAM.zoom?'zout':'zin')+'</button></div>':'')
        +'<div class="fvf-pages'+(FAM.zoom?' zoomed':'')+'">'+(NP?FAM.pages.map(function(u,i){ return '<figure class="fvf-pg">'+(NP>1?'<figcaption>'+t2('page',{n:i+1,t:NP})+'</figcaption>':'')+'<div class="fvf-pz"><img src="'+u+'" alt="'+pvxEscQ((tpl&&tpl.name||'Form')+' · page '+(i+1))+'" data-fvd-pz="1"></div></figure>'; }).join(''):'<div class="fvf-wait">'+t2('loading')+'</div>')+'</div>';
      primary='<button type="button" class="cff-primary" data-fvd="fnext"'+(FAM.pages?'':' disabled')+'>'+t2('cont')+'</button>'; }
    else if(FAM.step==='ask'){ h+='<h1>'+t2('ask')+'</h1><p class="cff-lead">'+t2('ask_l')+'</p><div class="cff-grid">';
      PvxForms.questions(tpl).forEach(function(q){ var v=FAM.ans[q.key];
        if(q.kind==='text') h+='<label class="cff-field"><span>'+pvxEscQ(qTitle(q))+(q.required?'':'')+'</span><input data-fvq-k="'+pvxEscQ(q.key)+'" value="'+pvxEscQ(v||'')+'"'+(q.src==='family.zip'?' inputmode="numeric"':'')+'></label>';
        else if(q.kind==='check') h+=(window.fvDCard?fvDCard({ic:'',title:pvxEscQ(qTitle(q)),sel:!!v,box:true,wrap:true,cls:'fvf-noic cff-check'+(v?' on':''),attrs:'data-fvq-c="'+pvxEscQ(q.key)+'"'}):'');
        else if(q.kind==='choice'){ h+='<div class="cff-field"><span>'+pvxEscQ(qTitle(q))+'</span><div class="cff-care" role="radiogroup" aria-label="'+pvxEscQ(qTitle(q))+'">'+q.options.map(function(o){ var on=v===o.id, lab=(FAM.lang==='es'&&o.label.es)?o.label.es:o.label.en; return window.fvDCard?fvDCard({ic:'',title:pvxEscQ(lab||'—'),sel:on,wrap:true,cls:'fvf-noic cff-opt'+(on?' on':''),attrs:'data-fvq-o="'+pvxEscQ(q.key)+'" data-opt="'+pvxEscQ(o.id)+'"'}):''; }).join('')+'</div></div>'; } });
      h+='</div>'; primary='<button type="button" class="cff-primary" data-fvd="fnext">'+t2('cont')+'</button>'; }
    else if(FAM.step==='sign'){ h+='<h1>'+t2('sign')+'</h1><p class="cff-lead">'+t2('sign_l')+'</p><label class="cff-field"><span>'+t2('name')+'</span><input id="fvdSignName" value="'+pvxEscQ(FAM.signName!=null?FAM.signName:(FAM.ans['owner.name']||p.owner||''))+'" autocomplete="name"></label>'
        +'<div class="cff-sigwrap"><div class="cff-sigl">'+t2('signhere')+' <button type="button" class="cff-clear" data-fvd="fclear">'+t2('clear')+'</button></div><div class="cff-sigbox"><canvas class="cff-sig" id="fvdSigOwner" aria-label="'+pvxEscQ(t2('signhere'))+'"></canvas><span class="cff-x" aria-hidden="true">×</span></div></div>';
      primary='<button type="button" class="cff-primary" data-fvd="fsign">'+t2('signbtn')+'</button>'; }
    else if(FAM.step==='thanks'){ h+='<div class="cff-thanks"><h1 class="cff-big">'+t2('thanks')+'</h1><p class="cff-lead">'+t2('care',{pet:pvxEscQ(nm)})+'</p></div>';
      primary='<button type="button" class="cff-primary" data-fvd="'+(needsWitness()?'fwit':'fsave')+'">'+(needsWitness()?'Staff: witness the signature':'Staff: save the signed form')+'</button>'; }
    else if(FAM.step==='witness'){ h+='<h1>Witness</h1><p class="cff-lead">'+pvxEscQ(FAM.sign.owner.name)+' signed '+pvxEscQ(tpl.name||'the form')+' for '+pvxEscQ(nm)+'. Sign as the witness.</p>'
        +'<div class="cff-sigwrap"><div class="cff-sigl">'+pvxEscQ(pvxWho())+' <button type="button" class="cff-clear" data-fvd="fclearw">Clear</button></div><div class="cff-sigbox"><canvas class="cff-sig" id="fvdSigWitness" aria-label="Witness signature pad"></canvas><span class="cff-x" aria-hidden="true">×</span></div></div>';
      primary='<button type="button" class="cff-primary" data-fvd="fsave">Save the signed form</button>'; }
    else if(FAM.step==='saving'){ h+='<div class="cff-thanks" role="status"><span class="pvx-spin pvx-spin-l" aria-hidden="true"></span><h1>Saving…</h1><p class="cff-lead">Making the signed PDF and checking it.</p></div>'; }   /* PVX-N365 */
    if(FAM.err) h+='<div class="cff-err" role="alert">'+pvxEscQ(FAM.err)+'</div>';
    h+='</main><footer class="cff-bar">'+primary+'</footer></div>';
    var keep=document.activeElement&&w.contains(document.activeElement)&&(document.activeElement.id||document.activeElement.dataset.fvqK);
    w.className='cf-family-sheet open'; w.innerHTML=h;
    if(keep){ var k=document.getElementById(keep)||w.querySelector('[data-fvq-k="'+keep+'"]'); if(k&&k.focus) k.focus({preventScroll:true}); }
    if(window.fvSigPad){ fvSigPad.pad('fvdSigOwner','owner',FAM.sig); fvSigPad.pad('fvdSigWitness','witness',FAM.sig); } }
  function needsWitness(){ return !!(FAM&&FAM.tpl&&(FAM.tpl.boxes||[]).some(function(b){ return b.src==='sign.witness'; })); }
  function readAnswers(){ if(!FAM) return; [].forEach.call(document.querySelectorAll('#cfFamily [data-fvq-k]'),function(i){ FAM.ans[i.dataset.fvqK]=String(i.value||'').trim(); });
    var n=document.getElementById('fvdSignName'); if(n) FAM.signName=String(n.value||'').trim(); }
  function fgo(step){ FAM.err=''; FAM.step=step; paintFamily(); var b=document.getElementById('cfFamily'); if(b) b.scrollTop=0; }
  function fnext(){ readAnswers(); var S=steps(), i=S.indexOf(FAM.step);
    if(FAM.step==='ask'){ var miss=PvxForms.questions(FAM.tpl).filter(function(q){ var v=FAM.ans[q.key]; return q.required&&(v==null||v===''||v===false); })[0];
      if(miss){ FAM.err=t2('req'); paintFamily(); var f=document.querySelector('#cfFamily [data-fvq-k="'+miss.key+'"],#cfFamily [data-fvq-c="'+miss.key+'"],#cfFamily [data-fvq-o="'+miss.key+'"]'); if(f) f.focus(); return; } }
    if(i>-1&&i<S.length-1) fgo(S[i+1]); }
  function fsign(){ readAnswers(); if(!FAM.signName){ FAM.err=t2('e_name'); paintFamily(); var n=document.getElementById('fvdSignName'); if(n) n.focus(); return; }
    if(!window.fvSigPad||!fvSigPad.inked('owner',FAM.sig)){ FAM.err=t2('e_sig'); paintFamily(); return; }
    FAM.sign={owner:{name:FAM.signName,at:new Date().toISOString(),png:fvSigPad.png('owner','fvdSigOwner',FAM.sig)}}; if(FAM.ans['owner.name']==null) FAM.ans['owner.name']=FAM.signName; fgo('thanks'); }
  function fsave(){ var p=pvxPatientById(FAM.pid), r=REQ.filter(function(x){ return x.id===FAM.rid; })[0];
    if(FAM.step==='witness'){ if(!fvSigPad.inked('witness',FAM.sig)){ FAM.err='Please sign as the witness.'; paintFamily(); return; } FAM.sign.witness={name:pvxWho(),uid:pvxUid(),at:new Date().toISOString(),png:fvSigPad.png('witness','fvdSigWitness',FAM.sig)}; }
    var F0=FAM; F0.step='saving'; paintFamily();
    PvxForms.fileSigned(pvxDb(),{tpl:F0.tpl,p:p,answers:F0.ans,sign:F0.sign,lang:F0.lang,title:F0.tpl.name,by:pvxWho(),tenant:pvxTenant(),hospital:'VCA Shoreline',request_id:F0.rid}).then(function(meta){
      var k=String(p.id); (DOCS[k]=DOCS[k]||{list:[]}).list=[meta].concat((DOCS[k].list||[]).filter(function(d){ return d.id!==meta.id; }));
      return (r?setReq(r,{status:'signed',signed_at:meta.signed_at,doc_id:meta.id,sha256:meta.sha256}):Promise.resolve()).then(function(){ REQ=REQ.filter(function(x){ return x.id!==F0.rid; });
        FAM=null; closeFamily(); pvxNote('Form signed',pvxEscQ(pet(p))+' · '+pvxEscQ(meta.title)+' · saved as a PDF on the visit'); repaintAll(); }); })
    .catch(function(e){ console.warn('[docs] save',e); if(FAM===F0){ F0.step=F0.sign&&F0.sign.witness?'witness':'thanks'; F0.err='Couldn’t save the signed PDF. Check the connection, then tap Save again. Nothing has been lost.'; paintFamily(); } }); }
  function closeFamily(){ FAM=null; window.__cffTS='s'; var tw=document.getElementById('cfFamily'); if(tw) tw.removeAttribute('data-ts'); document.body.classList.remove('cf-family-on'); var w=document.getElementById('cfFamily'); if(w){ w.className='cf-family-sheet'; w.innerHTML=''; } repaintAll(); }
  var holdT=null, famDrafts={};
  document.addEventListener('pointerdown',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-fvd="hold"]'); if(!b) return; b.classList.add('holding');
    holdT=setTimeout(function(){ if(FAM){ readAnswers(); famDrafts[FAM.rid]=FAM; } FAM=null; closeFamily(); },1200); },true);
  ['pointerup','pointercancel','pointerleave'].forEach(function(t){ document.addEventListener(t,function(){ clearTimeout(holdT); var b=document.querySelector('[data-fvd="hold"].holding'); if(b) b.classList.remove('holding'); },true); });

  /* ---------- euthanasia & aftercare: file the hospital's PDF when the form is signed ---------- */
  function fileEnding(p,f){ if(!p||!f||f.status!=='signed') return Promise.resolve(null);
    return lib().then(function(){ return endingTemplate(f.kind); }).then(function(tpl){ if(!tpl) return null;
      if(docForForm(p,f.id)) return docForForm(p,f.id);
      var o=f.owner||{}, urn=''; try{ urn=window.fvConsent&&f.urn?fvConsent.urnLabel(f.urn):''; }catch(e){}
      return PvxForms.fileSigned(pvxDb(),{tpl:tpl,p:p,answers:{'owner.name':o.name||p.owner||'','family.address':o.address||'','family.city':o.city||'','family.state':o.state||'','family.zip':o.zip||'','owner.phone':p.ownerPhone||''},
        aftercare:{care:f.care,urn:urn,clay:!!f.clay,total:f.total},sign:{owner:f.owner_sig,witness:f.witness},lang:f.lang||'en',title:tpl.name||(f.kind==='died'?'Aftercare form':'Euthanasia & aftercare consent'),
        kind:f.kind,by:pvxWho(),tenant:pvxTenant(),hospital:'VCA Shoreline',form_id:f.id}).then(function(meta){ var k=String(p.id); (DOCS[k]=DOCS[k]||{list:[]}).list=[meta].concat(DOCS[k].list||[]); repaintAll(); return meta; }); })
      .catch(function(e){ console.warn('[docs] ending pdf',e); noteAct('PDF not saved',pvxEscQ(pet(p))+'’s signed form is safe; the PDF copy wasn’t made','Try again',function(){ fileEnding(pvxPatientById(p.id)||p,f); },{color:'#C85A50'}); return null; }); }

  /* ---------- viewer ---------- */
  var VIEW=null;
  function view(p,meta){ VIEW={pid:p.id,meta:meta,state:'loading'}; paintView(); lib().then(function(){ return PvxForms.docBytes(pvxDb(),meta); }).then(function(r){ if(!VIEW||VIEW.meta.id!==meta.id) return; VIEW.bytes=r.bytes; VIEW.intact=r.intact;
      var ch=Promise.resolve(), out=[]; for(var i=0;i<(meta.pages||1);i++)(function(i){ ch=ch.then(function(){ return PvxPdf.renderPage(r.bytes,i,1.5); }).then(function(c){ out.push(c.toDataURL('image/jpeg',0.88)); }); })(i);
      return ch.then(function(){ if(!VIEW) return; VIEW.pages=out; VIEW.state='ready'; paintView(); }); }).catch(function(e){ console.warn('[docs] view',e); if(VIEW){ VIEW.state='error'; VIEW.err=String(e.message||e); paintView(); } }); }
  function paintView(){ var V=VIEW, p=pvxPatientById(V.pid)||{}, m=V.meta, NP=(V.pages||[]).length;
    var h='<header class="es-bar"><button type="button" class="es-cancel es-x" data-fvd="close" aria-label="Close" title="Close">'+PVX_GI.xmark+'</button><h2>'+pvxEscQ(m.title||'Signed form')+'</h2><span class="es-bar-r"><button type="button" class="fvv-icon" data-fvd="v-dl" aria-label="Download the PDF" title="Download"'+(V.bytes?'':' disabled')+'>'+svg('dl')+'</button></span></header>';
    var who2=pvxEscQ([m.signed_by?'Signed by '+m.signed_by:'',pvxHm(m.signed_at)?pvxHm(m.signed_at):''].filter(Boolean).join(' · '));
    if(V.state==='ready') h+='<div class="fvv-status"><div class="fvv-check '+(V.intact?'ok':'bad')+'">'+svg(V.intact?'shield':'warn')+'<b>'+(V.intact?'Unchanged since signing':'This copy doesn’t match its fingerprint — don’t rely on it; ask an admin.')+'</b>'
      +'<button type="button" class="fvv-more" data-fvd="v-details" aria-expanded="'+!!V.details+'">'+(V.details?'Hide details':'Details')+'</button></div><span class="fvv-who">'+who2+'</span></div>';
    else h+='<div class="fvv-status"><span class="fvv-who">'+who2+'</span></div>';
    if(V.details) h+='<div class="fvv-meta">'+pvxEscQ([m.witness?'Witness '+m.witness:'',m.lang==='es'?'Filled in Spanish':'',(m.pages||NP||1)+' page'+((m.pages||NP||1)===1?'':'s')].filter(Boolean).join(' · '))+'<span>Fingerprint <code>'+pvxEscQ(String(m.sha256||'').slice(0,16).replace(/(.{4})/g,'$1 ').trim())+'</code></span>'+(m.verify_id?'<span>Verify code <code>'+pvxEscQ(String(m.verify_id).replace(/(.{4})(?=.)/g,'$1 '))+'</code> · on every page</span>':'')+'</div>';
    h+='<div class="es-body fvv-body">';
    if(V.state==='loading') h+='<div class="es-text">Opening the PDF…</div>';
    if(V.state==='error') h+='<div class="es-text">Couldn’t open this PDF. Try again in a moment; if it keeps happening, ask an admin.</div>';
    if(NP>1) h+='<span class="fvv-pno" aria-live="polite">1 of '+NP+'</span>';
    (V.pages||[]).forEach(function(u,i){ h+='<img class="fvv-page" src="'+u+'" alt="Page '+(i+1)+'" data-pno="'+(i+1)+'">'; });
    h+='</div><footer class="es-foot fvv-foot"><button type="button" class="fvd-mini fvd-mid" data-fvd="v-packet">Make a packet…</button><span class="fvv-sp"></span><button type="button" class="es-primary fvd-solid" data-fvd="v-print"'+(V.bytes?'':' disabled')+'>Print</button></footer>';
    var keep=V.details!=null&&document.activeElement&&document.activeElement.dataset&&document.activeElement.dataset.fvd==='v-details';
    if(sheet&&sheet.el.querySelector('.fvv')) sheet.el.querySelector('.es-panel').innerHTML=h; else openSheet(h,'fvv fvd-wide',m.title||'Signed form');
    if(keep){ var d=document.querySelector('#fvdSheet [data-fvd="v-details"]'); if(d) d.focus(); }
    var body=document.querySelector('#fvdSheet .fvv-body'); if(body&&NP>1) body.addEventListener('scroll',function(){ var pn=body.querySelector('.fvv-pno'), best=1, bd=1e9, mid=body.getBoundingClientRect().top+body.clientHeight/2;
      [].forEach.call(body.querySelectorAll('.fvv-page'),function(im){ var r=im.getBoundingClientRect(), dd=Math.abs((r.top+r.bottom)/2-mid); if(dd<bd){ bd=dd; best=+im.dataset.pno; } }); if(pn) pn.textContent=best+' of '+NP; },{passive:true}); }
  function blobUrl(bytes){ return URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})); }
  function fileName(p,title){ return (String((p&&((p.name||'')+' '+(p.last||'')))||'').trim()+' - '+(title||'document')+'.pdf').replace(/[\\/:*?"<>|]+/g,'-'); }
  function download(bytes,name){ var a=document.createElement('a'); a.href=blobUrl(bytes); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },4000); }
  function printBytes(bytes,win){ var u=blobUrl(bytes); if(win&&!win.closed){ win.location.href=u; } else { var w=window.open(u,'_blank'); if(!w) download(bytes,'print.pdf'); } }

  /* ---------- the body tag as a PDF (for the packet) ---------- */
  function tagPdf(p){ var e=p.ending; if(!e||!e.aftercare) return Promise.resolve(null);
    return lib().then(function(){ var PL=window.PDFLib; return PL.PDFDocument.create().then(function(doc){ return Promise.all([doc.embedFont(PL.StandardFonts.Helvetica),doc.embedFont(PL.StandardFonts.HelveticaBold)]).then(function(f){
      var H=f[0], B=f[1], pg=doc.addPage([288,432]), ink=PL.rgb(0,0,0), x=13, w=262, y=410, clean=PvxPdf.clean;
      var at=e.at?new Date(e.at):new Date(), when=at.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+' · '+at.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'});
      pg.drawText('VCA SHORELINE',{x:x,y:y,size:8,font:H,color:ink}); var hid=clean(p.hid||''); pg.drawText(hid,{x:x+w-B.widthOfTextAtSize(hid,11),y:y,size:11,font:B,color:ink});
      pg.drawLine({start:{x:x,y:y-5},end:{x:x+w,y:y-5},thickness:1.4,color:ink}); y-=36;
      var nm=clean(((p.name||'')+' '+(p.last||'')).trim()||'Patient'), sz=28; while(sz>14&&B.widthOfTextAtSize(nm,sz)>w) sz-=1; pg.drawText(nm,{x:x,y:y,size:sz,font:B,color:ink}); y-=16;
      pg.drawText(clean([p.species,p.breed,p.sex].filter(Boolean).join(' · ')),{x:x,y:y,size:10,font:H,color:ink}); y-=16;
      var band={private:['PRIVATE CREMATION','Ashes come back to VCA Shoreline'],communal:['COMMUNAL CREMATION','Ashes are not returned'],release:['RELEASE TO OWNER','Do not send to Final Gift'],hold:['HOLD','Then communal cremation, unless the family decides']}[e.aftercare]||[String(e.aftercare).toUpperCase(),''];
      if(e.aftercare==='hold'){ var u=new Date(at.getTime()+7*864e5); band[0]='HOLD UNTIL '+u.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}).toUpperCase(); }
      var bh=46; if(e.aftercare==='private') pg.drawRectangle({x:x,y:y-bh,width:w,height:bh,color:ink}); else pg.drawRectangle({x:x+1.5,y:y-bh+1.5,width:w-3,height:bh-3,borderColor:ink,borderWidth:e.aftercare==='release'?4:3,borderDashArray:e.aftercare==='hold'?[6,4]:undefined});
      var bc=e.aftercare==='private'?PL.rgb(1,1,1):ink, bs=15; while(bs>9&&B.widthOfTextAtSize(band[0],bs)>w-20) bs-=0.5;
      pg.drawText(band[0],{x:x+10,y:y-22,size:bs,font:B,color:bc}); if(band[1]) pg.drawText(band[1],{x:x+10,y:y-37,size:8.5,font:H,color:bc}); y-=bh+18;
      var line=function(l,v){ if(!v) return; pg.drawText(l.toUpperCase(),{x:x,y:y,size:7,font:H,color:PL.rgb(0.25,0.25,0.25)}); pg.drawText(clean(v).slice(0,60),{x:x+66,y:y,size:9.5,font:H,color:ink}); pg.drawLine({start:{x:x,y:y-5},end:{x:x+w,y:y-5},thickness:0.4,color:PL.rgb(0.7,0.7,0.7)}); y-=18; };
      line('Owner',p.owner); line('Urn',e.urn||''); line(e.type==='died'?'Died':'Euthanized',when); line('Doctor',(p.doctor&&p.doctor!=='unassigned')?p.doctor:'');
      if(e.type==='euthanasia'&&e.consent&&window.fvEndings&&fvEndings.consentLine) line('Consent',fvEndings.consentLine(e.consent).replace(/^Consent /,''));
      (e.keepsakes||[]).forEach(function(k){ pg.drawRectangle({x:x,y:y-2,width:9,height:9,borderColor:ink,borderWidth:1}); pg.drawText(k==='clay'?'Clay paw print made':String(k),{x:x+15,y:y,size:9.5,font:H,color:ink}); y-=16; });
      y=46; pg.drawLine({start:{x:x,y:y},end:{x:x+120,y:y},thickness:0.7,color:ink}); pg.drawLine({start:{x:x+142,y:y},end:{x:x+w,y:y},thickness:0.7,color:ink});
      pg.drawText('Tagged by',{x:x,y:y-10,size:7,font:H,color:ink}); pg.drawText('Picked up by Final Gift · date',{x:x+142,y:y-10,size:7,font:H,color:ink});
      pg.drawText(clean('Recorded by '+(e.by||'')+' · Pravix Flow'),{x:x,y:14,size:6.5,font:H,color:PL.rgb(0.35,0.35,0.35)});
      doc.setCreationDate(new Date(0)); doc.setModificationDate(new Date(0)); doc.setProducer('Pravix Forms'); return doc.save({useObjectStreams:false}); }); }); }); }

  /* ---------- packet ---------- */
  var PK=null;
  var AUD={family:{t:'The family',contact:false,fees:false},rdvm:{t:'Referring vet',contact:true,fees:true},crem:{t:'Final Gift',contact:true,fees:true}};
  function openPacket(p){ var items=docsOf(p).map(function(d){ return {key:'d:'+d.id,t:d.title||'Signed form',s:'Signed '+pvxHm(d.signed_at||d.created_at)+' · '+(d.pages||1)+' page'+((d.pages||1)===1?'':'s'),on:true,meta:d}; });
    if(p.ending&&p.ending.aftercare) items.push({key:'tag',t:'Body tag',s:'4 × 6 in · 1 page',on:true});
    PK={pid:p.id,aud:'rdvm',items:items,contact:true,fees:true,state:'edit',out:null}; paintPacket(); }
  function paintPacket(){ var P=PK, p=pvxPatientById(P.pid)||{}, hasC=P.items.some(function(i){ return i.meta&&i.meta.regions&&i.meta.regions.contact&&i.meta.regions.contact.length; }), hasF=P.items.some(function(i){ return i.meta&&i.meta.regions&&i.meta.regions.fees&&i.meta.regions.fees.length; });
    var h=bar('Packet · '+pet(p),true)+'<div class="es-body"><div class="es-sec"><div class="es-h">Who it’s for</div><span class="es-seg fvp-aud" role="radiogroup" aria-label="Who it’s for">'+Object.keys(AUD).map(function(k){ var on=P.aud===k; return '<button type="button" class="'+(on?'on':'')+'" role="radio" aria-checked="'+on+'" data-fvd="aud" data-aud="'+k+'">'+AUD[k].t+'</button>'; }).join('')+'</span></div>'
      +'<div class="es-sec"><div class="es-h">Documents, in order</div><div class="es-group">'+(P.items.length?P.items.map(function(it,i){ return '<div class="es-row fvp-row"><label class="fvp-l"><input type="checkbox" data-fvd-on="'+i+'"'+(it.on?' checked':'')+'><span class="es-rl">'+pvxEscQ(it.t)+'<span class="es-rd">'+pvxEscQ(it.s)+'</span></span></label><span class="fvp-ord"><button type="button" aria-label="Move up" data-fvd="up" data-i="'+i+'"'+(i===0?' disabled':'')+'>'+svg('up')+'</button><button type="button" aria-label="Move down" data-fvd="dn" data-i="'+i+'"'+(i===P.items.length-1?' disabled':'')+'>'+svg('down')+'</button></span></div>'; }).join(''):'<div class="es-text">No PDFs on this visit yet.</div>')+'</div></div>'
      +'<div class="es-sec"><div class="es-h">Before it leaves the hospital</div><div class="es-group">'
      +'<label class="es-row fvp-l"><span class="es-rl">Black out the owner’s contact details<span class="es-rd">'+(hasC?'Phone, address and email boxes · removed from the file, not just covered':'None mapped on these forms')+'</span></span><input type="checkbox" data-fvd-opt="contact"'+(P.contact&&hasC?' checked':'')+(hasC?'':' disabled')+'></label>'
      +'<label class="es-row fvp-l"><span class="es-rl">Leave out the fees<span class="es-rd">'+(hasF?'The fee boxes are blacked out':'No fee boxes on these forms')+'</span></span><input type="checkbox" data-fvd-opt="fees"'+(P.fees&&hasF?' checked':'')+(hasF?'':' disabled')+'></label></div>'
      +'<div class="es-foot-note">The packet is made in this browser. Nothing is saved or sent until you download or print it.</div></div>';
    if(P.state==='done') h+='<div class="es-sec"><div class="es-group es-text"><b>'+pvxEscQ(P.outName)+'</b><br>'+P.outPages+' pages · one bookmark per document'+(P.redacted?' · '+P.redacted+' page'+(P.redacted===1?'':'s')+' redrawn with details removed':'')+'</div></div>';
    if(P.state==='error') h+='<div class="es-sec"><div class="es-group es-text">'+(/fingerprint/.test(P.err||'')?pvxEscQ(P.err)+'. Leave it out of the packet and ask an admin.':'Couldn’t make the packet. Try again in a moment.')+'</div></div>';
    h+='</div><footer class="es-foot">'+(P.state==='done'?'<div class="fvv-foot"><button type="button" class="fvd-mini" data-fvd="p-dl">Download</button><button type="button" class="es-primary fvd-solid" data-fvd="p-print">Print</button></div>'
      :'<button type="button" class="es-primary fvd-solid" data-fvd="p-make"'+(P.items.some(function(i){ return i.on; })&&P.state!=='working'?'':' disabled')+'>'+(P.state==='working'?'Making the PDF…':'Make the packet')+'</button>')+'</footer>';
    if(sheet&&sheet.el.querySelector('.fvp')) sheet.el.querySelector('.es-panel').innerHTML=h; else openSheet(h,'fvp','Packet'); }
  function makePacket(){ var P=PK, p=pvxPatientById(P.pid); P.state='working'; paintPacket();
    lib().then(function(){ var sel=P.items.filter(function(i){ return i.on; });
      return Promise.all(sel.map(function(it){ return it.key==='tag'?tagPdf(p).then(function(b){ return {it:it,bytes:b}; }):PvxForms.docBytes(pvxDb(),it.meta).then(function(r){ if(!r.intact) throw new Error(it.t+' doesn’t match its fingerprint'); return {it:it,bytes:r.bytes}; }); })); })
    .then(function(parts){ parts=parts.filter(function(x){ return x.bytes; }); var regions=[], at=0;
      parts.forEach(function(x){ var m=x.it.meta, rg=m&&m.regions||{}; if(P.contact) (rg.contact||[]).forEach(function(r){ regions.push({page:at+(r.page|0),rect:r.rect}); }); if(P.fees) (rg.fees||[]).forEach(function(r){ regions.push({page:at+(r.page|0),rect:r.rect}); }); at+=(m&&m.pages)||1; });
      return PvxPdf.merge(parts.map(function(x){ return {bytes:x.bytes,title:x.it.t}; })).then(function(m){ return regions.length?PvxPdf.redact(m,regions,{dpi:150}):m; })
        .then(function(out){ return PvxPdf.check(out).then(function(c){ if(!c.ok) throw new Error(c.error||'the PDF did not open'); var pages={}; regions.forEach(function(r){ pages[r.page]=1; });
          P.out=out; P.outPages=c.pages; P.redacted=Object.keys(pages).length; P.outName=fileName(p,AUD[P.aud].t==='The family'?'packet':'packet for '+AUD[P.aud].t.toLowerCase()); P.state='done'; paintPacket(); }); }); })
    .catch(function(e){ console.warn('[docs] packet',e); P.state='error'; P.err=String(e&&e.message||e); paintPacket(); }); }

  /* ---------- clicks ---------- */
  document.addEventListener('click',function(ev){ var t=ev.target; if(!t||!t.closest) return;
    var q=t.closest('[data-fvq]'); if(q&&q.closest('#view-consent')){ var w0=q.dataset.fvq, rid=q.dataset.rid; if(w0==='family') startFamily(rid); else if(w0==='cancel') cancelReq(rid); return; }
    var fl=t.closest('#cfFamily [data-fvl]'); if(fl&&FAM){ readAnswers(); FAM.lang=fl.dataset.fvl; FAM.err=''; paintFamily(); return; }
    if(FAM&&t.closest('#cfFamily')){ var c=t.closest('[data-fvq-c]'); if(c){ readAnswers(); FAM.ans[c.dataset.fvqC]=!FAM.ans[c.dataset.fvqC]; FAM.err=''; paintFamily(); return; }
      var o=t.closest('[data-fvq-o]'); if(o){ readAnswers(); FAM.ans[o.dataset.fvqO]=o.dataset.opt; FAM.err=''; paintFamily(); return; } }
    var a=t.closest('[data-fvd]'); if(!a) return; var w=a.dataset.fvd, p=pvxActivePatient();
    if(w==='close'){ closeSheet(); VIEW=null; PK=null; send=null; return; }
    if(w==='send'&&p){ openSend(p); return; }
    if(w==='pick'&&send){ send.tid=a.dataset.tid; paintSend(); return; }
    if(w==='do-send'&&send){ [].forEach.call(document.querySelectorAll('#fvdSheet [data-fvd-staff]'),function(i){ send.ans[i.dataset.fvdStaff]=String(i.value||'').trim(); }); doSend(); return; }
    if(w==='cancel-req'){ cancelReq(a.dataset.rid); return; }
    if(w==='view'&&p){ var m=docsOf(p).filter(function(d){ return d.id===a.dataset.doc; })[0]; if(m) view(p,m); return; }
    if(w==='print-consent'&&p&&window.fvConsent){ fvConsent.print(p); return; }
    if(w==='tag'&&p&&window.fvEndings&&fvEndings.printTag){ fvEndings.printTag(p); return; }
    if(w==='packet'&&p){ openPacket(p); return; }
    if(w==='v-packet'&&VIEW){ var vp=pvxPatientById(VIEW.pid); closeSheet(); VIEW=null; if(vp) openPacket(vp); return; }
    if(w==='v-details'&&VIEW){ VIEW.details=!VIEW.details; paintView(); return; }
    if(w==='v-dl'&&VIEW&&VIEW.bytes){ download(VIEW.bytes,fileName(pvxPatientById(VIEW.pid),VIEW.meta.title)); return; }
    if(w==='v-print'&&VIEW&&VIEW.bytes){ printBytes(VIEW.bytes); try{ var D=pvxDb(); if(D) D.collection('visit_docs').doc(VIEW.meta.id).set({printed_at:new Date().toISOString(),printed_by:pvxWho()},{merge:true}).catch(function(){}); }catch(e){} return; }
    if(w==='aud'&&PK){ PK.aud=a.dataset.aud; PK.contact=AUD[PK.aud].contact; PK.fees=AUD[PK.aud].fees; PK.state='edit'; paintPacket(); return; }
    if((w==='up'||w==='dn')&&PK){ var i=+a.dataset.i, j=w==='up'?i-1:i+1; if(j<0||j>=PK.items.length) return; var x=PK.items[i]; PK.items[i]=PK.items[j]; PK.items[j]=x; PK.state='edit'; paintPacket(); var f=document.querySelector('#fvdSheet [data-fvd="'+w+'"][data-i="'+j+'"]'); if(f&&!f.disabled) f.focus(); return; }
    if(w==='p-make'&&PK){ makePacket(); return; }
    if(w==='p-dl'&&PK&&PK.out){ download(PK.out,PK.outName); return; }
    if(w==='p-print'&&PK&&PK.out){ printBytes(PK.out); return; }
    if(!FAM) return;
    if(w==='fback'){ readAnswers(); var S=steps(), k=S.indexOf(FAM.step); if(k>0) fgo(S[k-1]); return; }
    if(w==='fnext'){ fnext(); return; }
    if(w==='fsign'){ fsign(); return; }
    if(w==='fwit'){ fgo('witness'); return; }
    if(w==='fsave'){ fsave(); return; }
    if(w==='fclear'){ FAM.sig.owner=[]; paintFamily(); return; }
    if(w==='fclearw'){ FAM.sig.witness=[]; paintFamily(); return; }
    if(w==='fzoom'){ FAM.zoom=!FAM.zoom; paintFamily(); var zb=document.querySelector('#cfFamily [data-fvd="fzoom"]'); if(zb) zb.focus({preventScroll:true}); return; }
  });
  /* double-tap (or double-click) a page on the family's screen to zoom in and out */
  document.addEventListener('dblclick',function(ev){ var im=ev.target&&ev.target.closest&&ev.target.closest('#cfFamily [data-fvd-pz]'); if(!im||!FAM) return; ev.preventDefault(); FAM.zoom=!FAM.zoom; paintFamily(); });
  document.addEventListener('change',function(ev){ var t=ev.target; if(!PK||!t||!t.closest||!t.closest('#fvdSheet')) return;
    if(t.dataset.fvdOn!=null){ PK.items[+t.dataset.fvdOn].on=t.checked; PK.state='edit'; paintPacket(); }
    if(t.dataset.fvdOpt){ PK[t.dataset.fvdOpt]=t.checked; PK.state='edit'; paintPacket(); } });

  /* n125 · Return presses the sheet's main button (not while typing in a multi-line field, not on another button) */
  document.addEventListener('keydown',function(e){ if(e.key!=='Enter'||e.shiftKey||e.metaKey||e.ctrlKey||e.altKey) return; var sh=document.getElementById('fvdSheet'); if(!sh) return;
    var a=document.activeElement, tag=a&&a.tagName||''; if(/TEXTAREA|BUTTON|A|SELECT/.test(tag)) return; var b=sh.querySelector('.es-foot .es-primary:not([disabled])'); if(b){ e.preventDefault(); b.click(); } });
  /* n125 · a bottom sheet (iPad and phone) can be pulled down by its grabber or title bar to close it; it follows the sheet's own
     close rule (the scrim), so a half-filled ending sheet nudges instead of closing */
  (function(){ var D=null;
    document.addEventListener('pointerdown',function(e){ var bar=e.target&&e.target.closest&&e.target.closest('.end-sheet .es-bar'); if(!bar||e.target.closest('button,a,input,select,textarea')) return;
      if(!window.matchMedia('(max-width:820px)').matches) return; var panel=bar.closest('.es-panel'); if(!panel) return;
      D={p:panel,y0:e.clientY,dy:0,id:e.pointerId}; panel.style.transition='none'; try{ bar.setPointerCapture(e.pointerId); }catch(_){} },true);
    document.addEventListener('pointermove',function(e){ if(!D||e.pointerId!==D.id) return; D.dy=Math.max(0,e.clientY-D.y0); D.p.style.transform='translateY('+D.dy+'px)'; },true);
    function end(e){ if(!D||(e&&e.pointerId!==D.id)) return; var d=D; D=null; d.p.style.transition=''; d.p.style.transform='';
      if(d.dy>110){ var sc=d.p.parentNode&&d.p.parentNode.querySelector('.es-scrim'); if(sc) sc.click(); } }
    document.addEventListener('pointerup',end,true); document.addEventListener('pointercancel',end,true); })();
  window.fvDocs={lib:lib,templates:templates,loadDocs:loadDocs,docsOf:docsOf,docForForm:docForForm,fileEnding:fileEnding,view:view,openPacket:openPacket,openSend:openSend,
    queue:queue,queueCards:queueCards,startFamily:startFamily,tagPdf:tagPdf,state:function(){ return {REQ:REQ,FAM:FAM,PK:PK,VIEW:VIEW,DOCS:DOCS,TPL:TPL,send:send}; },close:closeSheet,listen:listen};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 20 of 104 · no id ━━━━━ */
try{
/* n122 Forms link: only for accounts Forms lets in (keep in step with forms/index.html ALLOWED) */(function(){var a=document.getElementById("navForms");if(!a)return;var OK=["daniel.giordano@pravix.app"];function set(u){var e=u&&u.email?String(u.email).toLowerCase():"";a.style.display=OK.indexOf(e)>-1?"":"none";}try{if(typeof AUTH!=="undefined"&&AUTH&&AUTH.onAuthStateChanged){set(AUTH.currentUser);AUTH.onAuthStateChanged(set);}}catch(e){}})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 21 of 104 · no id ━━━━━ */
try{
/* ═══ INCOMING n127 — "On the way" (Oct 13 2026) ═══
   A family calls: "we're coming in". Reception adds the patient as On the way from Add patient: pet, owner, the town
   or ZIP they're driving from, and whether they're leaving now, in 10 or in 20 minutes. Flow asks Google Maps for the
   drive time with live traffic (the same ETA as the Google Maps app), shows a countdown on the Command Center, refreshes
   it every 5 minutes, and says when they're late. Nothing for the family to tap.
   · incoming/{id} (staff only): the call, until they arrive. On arrival the town, phone and owner are cleared.
   · eta_log/{id}: how long arrivals really took vs the estimate (town, hour, minutes — no patient), so Flow learns.
   · ts_settings/maps {browser_key}: the Google Maps key Daniel adds (admin only). Without it, reception types the
     minutes the family gives, and Flow still learns from arrivals.
   Only the town (or ZIP) goes to Google, never a name, phone or address. The board, the waiting-room screen and the
   family tracker don't show patients who are on the way. */
(function(){
  if(typeof openAddPatient!=='function'||typeof createPatient!=='function'||!document.getElementById('apArrival')) return;
  var HOSP=(function(){ try{ return (window.PravixHospitals&&PravixHospitals.shoreline&&PravixHospitals.shoreline.address)||'895 Bridgeport Avenue, Shelton, CT 06484'; }catch(e){ return '895 Bridgeport Avenue, Shelton, CT 06484'; } })();
  function admin(){ try{ return typeof isAdminUser==='function'&&isAdminUser(pvxEmail()); }catch(e){ return false; } }
  function hm(ms){ try{ return fmtTime(new Date(ms)); }catch(e){ var d=new Date(ms),h=d.getHours(),m=d.getMinutes(); return (h%12||12)+':'+('0'+m).slice(-2)+(h>=12?' PM':' AM'); } }
  function hmShort(ms){ return hm(ms).replace(/ (AM|PM)$/,''); }
  function iso(ms){ return new Date(ms).toISOString(); }
  function ms(v){ return v?new Date(v).getTime():0; }

  /* Connecticut's 169 towns, for the "Coming from" suggestions (any town, ZIP or place can still be typed) */
  var TOWNS=('Andover,Ansonia,Ashford,Avon,Barkhamsted,Beacon Falls,Berlin,Bethany,Bethel,Bethlehem,Bloomfield,Bolton,Bozrah,Branford,Bridgeport,Bridgewater,Bristol,Brookfield,Brooklyn,Burlington,Canaan,Canterbury,Canton,Chaplin,Cheshire,Chester,Clinton,Colchester,Colebrook,Columbia,Cornwall,Coventry,Cromwell,Danbury,Darien,Deep River,Derby,Durham,East Granby,East Haddam,East Hampton,East Hartford,East Haven,East Lyme,East Windsor,Eastford,Easton,Ellington,Enfield,Essex,Fairfield,Farmington,Franklin,Glastonbury,Goshen,Granby,Greenwich,Griswold,Groton,Guilford,Haddam,Hamden,Hampton,Hartford,Hartland,Harwinton,Hebron,Kent,Killingly,Killingworth,Lebanon,Ledyard,Lisbon,Litchfield,Lyme,Madison,Manchester,Mansfield,Marlborough,Meriden,Middlebury,Middlefield,Middletown,Milford,Monroe,Montville,Morris,Naugatuck,New Britain,New Canaan,New Fairfield,New Hartford,New Haven,New London,New Milford,Newington,Newtown,Norfolk,North Branford,North Canaan,North Haven,North Stonington,Norwalk,Norwich,Old Lyme,Old Saybrook,Orange,Oxford,Plainfield,Plainville,Plymouth,Pomfret,Portland,Preston,Prospect,Putnam,Redding,Ridgefield,Rocky Hill,Roxbury,Salem,Salisbury,Scotland,Seymour,Sharon,Shelton,Sherman,Simsbury,Somers,South Windsor,Southbury,Southington,Sprague,Stafford,Stamford,Sterling,Stonington,Stratford,Suffield,Thomaston,Thompson,Tolland,Torrington,Trumbull,Union,Vernon,Voluntown,Wallingford,Warren,Washington,Waterbury,Waterford,Watertown,West Hartford,West Haven,Westbrook,Weston,Westport,Wethersfield,Willington,Wilton,Winchester,Windham,Windsor,Windsor Locks,Wolcott,Woodbridge,Woodbury,Woodstock').split(',');
  /* what goes to Google: a CT town as "Town, CT", a ZIP as "06460, USA", anything else as typed */
  function place(text){ var t=String(text||'').trim().replace(/\s+/g,' '); if(!t) return null;
    if(/^\d{5}$/.test(t)) return {label:'ZIP '+t, query:t+', USA', key:t};
    var town=TOWNS.filter(function(x){ return x.toLowerCase()===t.toLowerCase().replace(/,?\s*(ct|connecticut)$/i,''); })[0];
    if(town) return {label:town, query:town+', CT', key:town.toLowerCase()};
    return {label:t, query:t, key:t.toLowerCase()}; }

  /* ---------- Google Maps drive time (traffic-aware, the Google Maps app's ETA) ---------- */
  var ST={list:[], key:null, keyLoaded:false, log:[], tick:null, arriving:null, unsub:null, started:false, lastErr:null, lastOk:0};
  var gP=null;
  function maps(){
    if(window.google&&google.maps&&google.maps.importLibrary) return Promise.resolve(google.maps);
    if(!ST.key) return Promise.reject(new Error('no-key'));
    if(gP) return gP;
    gP=new Promise(function(ok,bad){ window.__pvxMapsReady=function(){ ok(google.maps); };
      var s=document.createElement('script'); s.async=true; s.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(ST.key)+'&v=weekly&loading=async&callback=__pvxMapsReady';
      s.onerror=function(){ bad(new Error('Google Maps did not load')); }; document.head.appendChild(s); setTimeout(function(){ bad(new Error('Google Maps timed out')); },15000); });
    gP.catch(function(){ gP=null; }); return gP; }
  function driveMinutes(query, departAt){
    return maps().then(function(m){ return m.importLibrary('routes'); }).then(function(lib){
      var req={origin:query, destination:HOSP, travelMode:'DRIVING', routingPreference:'TRAFFIC_AWARE', region:'us', fields:['durationMillis','staticDurationMillis']};
      if(departAt&&departAt>Date.now()+60000) req.departureTime=new Date(departAt);
      return lib.Route.computeRoutes(req); })
    .then(function(r){ var rt=r&&r.routes&&r.routes[0], d=rt&&(rt.durationMillis||rt.staticDurationMillis); if(!d||!isFinite(d)) throw new Error('no-route');
      ST.lastOk=Date.now(); ST.lastErr=null; return Math.max(1,Math.round(d/60000)); })
    .catch(function(e){ ST.lastErr=String(e&&e.message||e); throw e; }); }
  function loadKey(){ var D=pvxDb(); if(!D) return Promise.resolve(null);
    return D.collection('ts_settings').doc('maps').get().then(function(s){ var k=s.exists&&(s.data()||{}).browser_key; ST.key=k?String(k).trim():null; ST.keyLoaded=true; return ST.key; })
      .catch(function(){ ST.keyLoaded=true; return null; }); }

  /* ---------- learning from real arrivals ---------- */
  function loadLog(){ var D=pvxDb(); if(!D) return; D.collection('eta_log').where('tenant_id','==',pvxTenant()).limit(400).get().then(function(s){ ST.log=s.docs.map(function(d){ return d.data(); }); }).catch(function(){}); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function pct(a,p){ var i=(a.length-1)*p, lo=Math.floor(i), hi=Math.ceil(i); return a[lo]+(a[hi]-a[lo])*(i-lo); }
  /* shift = how much later than estimated people from this town really arrive (median); the window = the middle half */
  function learned(key){
    var err=function(L){ return L.map(function(e){ return (+e.actual_min)-(+e.predicted_min); }).filter(function(x){ return isFinite(x); }).sort(function(a,b){ return a-b; }); };
    var town=err(ST.log.filter(function(e){ return e.town===key; })), all=err(ST.log), use=town.length>=3?town:all;
    if(use.length<5&&town.length<3) return {shift:0, lo:-3, hi:7, n:0, scope:'none'};
    var med=pct(use,.5); return {shift:Math.round(clamp(med,-10,25)), lo:Math.round(clamp(pct(use,.25)-med,-10,-2)), hi:Math.round(clamp(pct(use,.75)-med,4,20)), n:use.length, scope:town.length>=3?'town':'all'}; }
  function etaFrom(leaveAt, minutes, L){ var mid=leaveAt+(minutes+L.shift)*60000; return {mid:mid, lo:mid+L.lo*60000, hi:mid+L.hi*60000}; }

  /* ---------- Add patient: the "On the way" arrival type ---------- */
  var seg=document.getElementById('apArrival');
  var btn=document.createElement('button'); btn.type='button'; btn.className='ap-seg-btn'; btn.dataset.arrival='otw';
  btn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14"/><path d="M6 17l1.6-5.2a2 2 0 0 1 1.9-1.4h5a2 2 0 0 1 1.9 1.4L18 17"/><circle cx="8" cy="17.5" r="1.5"/><circle cx="16" cy="17.5" r="1.5"/><path d="M3 7h5M2 10h4"/></svg>On the way';
  var hospBtn=seg.querySelector('[data-arrival="hospitalized"]'); seg.insertBefore(btn,hospBtn||null);
  var sect=document.createElement('div'); sect.className='otw-sect'; sect.id='otwSect'; sect.style.display='none';
  sect.innerHTML='<div class="ap-grid c2"><div class="ap-field"><label for="otwFrom">Coming from — town or ZIP</label><div class="bc-wrap"><input class="ap-input" id="otwFrom" placeholder="e.g. Milford or 06460" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="otwTowns"><div class="otw-towns" id="otwTowns" role="listbox" aria-label="Towns"></div></div></div>'
    +'<div class="ap-field"><span class="otw-lbl" id="otwLeaveL">Leaving</span><div class="otw-leave" role="radiogroup" aria-labelledby="otwLeaveL"><button type="button" role="radio" data-leave="0" aria-checked="true">Now</button><button type="button" role="radio" data-leave="10" aria-checked="false">In 10 min</button><button type="button" role="radio" data-leave="20" aria-checked="false">In 20 min</button></div></div></div>'
    +'<div class="otw-eta" id="otwEta" aria-live="polite"></div>';
  var tr=document.getElementById('apTransfer'); tr.parentNode.insertBefore(sect,tr.nextSibling);
  var F={leave:0, minutes:null, source:null, place:null, looking:false, seq:0, typed:null};
  function isOtw(){ try{ return apArrivalType==='otw'; }catch(e){ return false; } }
  pvxWrap('apSetArrival',function(_set){ return function(type){ _set.apply(this,arguments); var on=type==='otw'; sect.style.display=on?'':'none';
    var as=document.getElementById('apLocationMount'), sec=as&&as.closest('.ap-field'); if(sec) sec.style.display=on?'none':'';
    var cb=document.getElementById('apCreate'); if(cb&&!ST.arriving) cb.textContent=on?'Add to On the way':'Create patient';
    if(on){ if(!ST.keyLoaded) loadKey().then(paintEta); paintEta(); setTimeout(function(){ var f=document.getElementById('otwFrom'); if(f&&!f.value) f.focus(); },60); } }; },'#21');
  pvxWrap('openAddPatient',function(_open){ return function(){ F={leave:0, minutes:null, source:null, place:null, looking:false, seq:0, typed:null}; var r=_open.apply(this,arguments);
    sect.style.display='none'; var f=document.getElementById('otwFrom'); if(f) f.value=''; paintLeave(); paintEta(); closeTowns();
    var as=document.getElementById('apLocationMount'), sec=as&&as.closest('.ap-field'); if(sec) sec.style.display=''; return r; }; },'#21');
  function paintLeave(){ sect.querySelectorAll('[data-leave]').forEach(function(b){ b.setAttribute('aria-checked',String(+b.dataset.leave===F.leave)); }); }
  function etaNow(){ if(F.minutes==null) return null; return etaFrom(Date.now()+F.leave*60000, F.minutes, learned(F.place?F.place.key:'')); }
  function paintEta(){ var e=document.getElementById('otwEta'); if(!e) return; var h='';
    if(F.looking) h='<span class="otw-spin" aria-hidden="true"></span><span>Asking Google Maps for the drive time…</span>';
    else if(F.minutes!=null){ var x=etaNow(); h='<div class="otw-eta-main"><span class="otw-k">Expected</span><b>'+pvxEscQ(hmShort(x.lo))+'–'+pvxEscQ(hm(x.hi))+'</b></div><span class="otw-src">'+(F.source==='google'?'about '+F.minutes+' min drive now · Google Maps':'about '+F.minutes+' min, as the family said')+'</span>'; }
    if(!F.looking&&(F.source!=='google')){
      var why=!F.place?'':(!ST.key?(admin()?'No Google Maps key yet. <button type="button" class="otw-link" data-otw="key">Add it…</button>':'Drive times from Google Maps aren’t set up yet.'):'Google Maps didn’t answer.');
      h+='<label class="otw-typed"><span>'+(F.place?(why?why+' ':'')+'How many minutes away did they say?':'Or the minutes they said')+'</span><span class="otw-minw"><input class="ap-input" id="otwMin" inputmode="numeric" autocomplete="off" role="spinbutton" aria-valuemin="1" aria-valuemax="240" maxlength="3" placeholder="20" value="'+(F.source==='family'&&F.minutes!=null?F.minutes:'')+'"><span class="otw-minu" aria-hidden="true">min</span></span></label>'; }
    e.innerHTML=h; }
  function lookup(){ var t=document.getElementById('otwFrom'); F.place=place(t&&t.value); var me=++F.seq;
    if(!F.place){ if(F.source==='google'){ F.minutes=null; F.source=null; } paintEta(); return; }
    var go=function(){ if(!ST.key&&!(window.google&&google.maps&&google.maps.importLibrary)){ F.looking=false; if(F.source==='google'){ F.minutes=null; F.source=null; } paintEta(); return; }
      F.looking=true; paintEta();
      driveMinutes(F.place.query, Date.now()+F.leave*60000).then(function(m){ if(me!==F.seq) return; F.looking=false; F.minutes=m; F.source='google'; paintEta(); })
        .catch(function(){ if(me!==F.seq) return; F.looking=false; if(F.source==='google'){ F.minutes=null; F.source=null; } paintEta(); }); };
    if(!ST.keyLoaded) loadKey().then(go); else go(); }
  var lt=null; function lookupSoon(){ clearTimeout(lt); lt=setTimeout(lookup,450); }
  /* town suggestions */
  var hl=-1;
  function closeTowns(){ var p=document.getElementById('otwTowns'); if(p){ p.innerHTML=''; p.classList.remove('open'); } var f=document.getElementById('otwFrom'); if(f) f.setAttribute('aria-expanded','false'); hl=-1; }
  function showTowns(){ var f=document.getElementById('otwFrom'), p=document.getElementById('otwTowns'); var q=String(f.value||'').trim().toLowerCase();
    if(!q){ var O=pvxOften(); if(!O.length){ closeTowns(); return; }   /* PVX-N371 */
      p.innerHTML='<div class="pvx-grp" role="presentation">Often from</div>'+O.map(function(t,i){ return '<button type="button" role="option" data-town="'+pvxEscQ(t.v)+'" aria-selected="'+(i===hl)+'">'+pvxEscQ(t.label)+'<span>'+(t.zip?'ZIP':'CT')+'</span></button>'; }).join('');
      p.classList.add('open'); f.setAttribute('aria-expanded','true'); return; }
    if(/^\d/.test(q)){ closeTowns(); return; }
    var L=TOWNS.filter(function(t){ return t.toLowerCase().indexOf(q)===0; }).concat(TOWNS.filter(function(t){ return t.toLowerCase().indexOf(q)>0; })).slice(0,6);
    if(!L.length||(L.length===1&&L[0].toLowerCase()===q)){ closeTowns(); return; }
    p.innerHTML=L.map(function(t,i){ return '<button type="button" role="option" data-town="'+pvxEscQ(t)+'" aria-selected="'+(i===hl)+'">'+pvxEscQ(t)+'<span>CT</span></button>'; }).join(''); p.classList.add('open'); f.setAttribute('aria-expanded','true'); }
  function pickTown(t){ var f=document.getElementById('otwFrom'); f.value=t; closeTowns(); lookup(); }
  /* PVX-N371: the places arrivals most often came from (Flow's own arrival log: town or ZIP only), most first */
  function pvxOften(){ var n={}; (ST.log||[]).forEach(function(r){ var k=String(r&&r.town||'').trim(); if(k) n[k]=(n[k]||0)+1; });
    return Object.keys(n).sort(function(a,b){ return n[b]-n[a]||a.localeCompare(b); }).slice(0,5).map(function(k){
      if(/^\d{5}$/.test(k)) return {v:k,label:k,zip:true};
      var t=TOWNS.filter(function(x){ return x.toLowerCase()===k; })[0]; return {v:t||k,label:t||k.replace(/\b\w/g,function(c){ return c.toUpperCase(); })}; }); }
  window.pvxOtw371={log:function(){ return ST.log; },often:pvxOften};
  ['focusin','click'].forEach(function(k){ sect.addEventListener(k,function(e){ if(e.target.id==='otwFrom'&&!String(e.target.value||'').trim()&&!document.getElementById('otwTowns').classList.contains('open')){ hl=-1; showTowns(); } }); });
  sect.addEventListener('input',function(e){ if(e.target.id==='otwFrom'){ hl=-1; showTowns(); lookupSoon(); }
    else if(e.target.id==='otwMin'){ var v=parseInt(e.target.value,10); if(v>0&&v<=240){ F.minutes=v; F.source='family'; } else if(F.source==='family'){ F.minutes=null; F.source=null; }
      var main=sect.querySelector('.otw-eta-main'), x=etaNow(); if(x){ var src=sect.querySelector('.otw-src'); if(main) main.querySelector('b').textContent=hmShort(x.lo)+'–'+hm(x.hi); else { var d=document.createElement('div'); d.className='otw-eta-main'; d.innerHTML='<span class="otw-k">Expected</span><b>'+pvxEscQ(hmShort(x.lo))+'–'+pvxEscQ(hm(x.hi))+'</b>'; document.getElementById('otwEta').prepend(d); } }
      else if(main) main.remove(); } });
  sect.addEventListener('keydown',function(e){ if(e.target.id!=='otwFrom') return; var p=document.getElementById('otwTowns'), B=p?[].slice.call(p.querySelectorAll('button')):[]; if(!B.length) return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){ e.preventDefault(); hl=(hl+(e.key==='ArrowDown'?1:-1)+B.length)%B.length; B.forEach(function(b,i){ b.setAttribute('aria-selected',String(i===hl)); }); }
    else if(e.key==='Enter'&&hl>=0){ e.preventDefault(); pickTown(B[hl].dataset.town); } else if(e.key==='Escape'){ e.stopPropagation(); closeTowns(); } });
  sect.addEventListener('click',function(e){ var t=e.target.closest('[data-town]'); if(t){ pickTown(t.dataset.town); return; }
    var l=e.target.closest('[data-leave]'); if(l){ F.leave=+l.dataset.leave; paintLeave(); if(F.source==='google') lookup(); else paintEta(); return; }
    if(e.target.closest('[data-otw="key"]')) openKey(); });
  document.addEventListener('click',function(e){ if(!e.target.closest||e.target.closest('#otwSect .bc-wrap')) return; closeTowns(); });

  /* create: On the way goes to incoming/, never into PATIENTS (so the board, lobby screen and tracker stay as they are) */
  var cbtn=document.getElementById('apCreate'), _create=cbtn.onclick;
  cbtn.onclick=function(ev){ if(isOtw()) return saveIncoming(); var arriving=ST.arriving; var r=_create.call(this,ev); if(arriving) watchArrival(arriving); return r; };
  function val(id){ var el=document.getElementById(id); return el?String(el.value||'').trim():''; }
  function saveIncoming(){
    var name=val('apName'); if(!name){ try{ toast('Enter a patient name'); }catch(e){} var n=document.getElementById('apName'); if(n) n.focus(); return; }
    F.place=place(val('otwFrom'));
    if(!F.place&&F.minutes==null){ try{ toast('Add the town they’re coming from, or the minutes they said'); }catch(e){} var f=document.getElementById('otwFrom'); if(f) f.focus(); return; }
    var D=pvxDb(); if(!D){ try{ toast('Not connected — try again in a moment'); }catch(e){} return; }
    var now=Date.now(), leaveAt=now+F.leave*60000, L=learned(F.place?F.place.key:''), x=F.minutes!=null?etaFrom(leaveAt,F.minutes,L):null;
    var reason=val('apReason'); try{ if(!reason&&apProblems&&apProblems.length) reason=problemsToString(apProblems); }catch(e){}
    var doc={tenant_id:pvxTenant(), status:'on_the_way', name:name, species:val('apSpecies'), breed:val('apBreed'), owner:val('apOwner'), phone:val('apPhone'), prio:(function(){ try{ return apPrio; }catch(e){ return 2; } })(),
      reason:reason, from:F.place?{label:F.place.label, query:F.place.query, key:F.place.key}:null, leave_min:F.leave, leave_at:iso(leaveAt),
      minutes:F.minutes, minutes_source:F.source, shift:L.shift, eta_first:x?iso(x.mid):null, eta_at:x?iso(x.mid):null, eta_lo:x?iso(x.lo):null, eta_hi:x?iso(x.hi):null, eta_updated_at:iso(now), refreshes:0,
      doctor:(function(){ try{ return apDoctorId; }catch(e){ return 'unassigned'; } })(), room_plan:null, created_at:iso(now), created_by:pvxWho()};
    var b=document.getElementById('apCreate'); if(b){ b.disabled=true; b.textContent='Adding…'; }
    D.collection('incoming').add(doc).then(function(ref){ doc.id=ref.id; upsert(doc); if(b){ b.disabled=false; } closeAddPatient(); renderStrip();
      pvxNote(pvxEscQ(name)+' is on the way', x?'Expected '+hmShort(x.lo)+'–'+hm(x.hi)+(F.place?' · from '+pvxEscQ(F.place.label):''):'From '+pvxEscQ(F.place.label)+' · add the minutes when they call back'); })
      .catch(function(e){ console.warn('[otw] save',e); if(b){ b.disabled=false; b.textContent='Add to On the way'; } try{ toast('Couldn’t save — check the connection and try again'); }catch(_){} }); }

  /* ---------- the live list ---------- */
  function upsert(d){ var i=ST.list.findIndex(function(x){ return x.id===d.id; }); if(d.status!=='on_the_way'){ if(i>-1) ST.list.splice(i,1); return; } if(i>-1) ST.list[i]=d; else ST.list.push(d); }
  function start(){ if(ST.started) return; var D=pvxDb(); if(!D) return; var signed=false; try{ signed=!!(AUTH&&AUTH.currentUser); }catch(e){} if(!signed) return; ST.started=true;
    loadKey(); loadLog();
    try{ ST.unsub=D.collection('incoming').where('tenant_id','==',pvxTenant()).where('status','==','on_the_way').onSnapshot(function(s){ ST.list=s.docs.map(function(d){ return Object.assign({id:d.id},d.data()); }); renderStrip(); },
      function(e){ console.warn('[otw] listen',e); }); }catch(e){ console.warn('[otw] listen',e); }
    ST.tick=setInterval(function(){ renderStrip(); refreshDue(); matchArrivals(); },20000); }
  var boot=setInterval(function(){ start(); if(ST.started) clearInterval(boot); },700); start();
  window.addEventListener('focus',function(){ if(ST.started){ renderStrip(); refreshDue(); } });

  /* every 5 minutes, one workstation asks Google again (the one that finds the record oldest), at most 8 times a trip */
  function refreshDue(){ var D=pvxDb(); if(!D) return; var now=Date.now();
    ST.list.forEach(function(d){ if(d.minutes_source!=='google'||!d.from||!d.from.query) return; if(now-ms(d.eta_updated_at)<5*60000||(d.refreshes||0)>=8) return; if(d.eta_hi&&now>ms(d.eta_hi)+15*60000) return; if(d._busy) return;
      d._busy=true; var leaveAt=ms(d.leave_at);
      D.collection('incoming').doc(d.id).get().then(function(s){ var cur=s.exists?s.data():null; if(!cur||cur.status!=='on_the_way'||Date.now()-ms(cur.eta_updated_at)<5*60000) throw new Error('fresh');
        return driveMinutes(d.from.query, leaveAt); })
      .then(function(m){ var L={shift:d.shift||0, lo:-3, hi:7}; var l2=learned(d.from.key); L.lo=l2.lo; L.hi=l2.hi; var x=etaFrom(leaveAt,m,L);
        var up={minutes:m, eta_at:iso(x.mid), eta_lo:iso(x.lo), eta_hi:iso(x.hi), eta_updated_at:iso(Date.now()), refreshes:(d.refreshes||0)+1}; Object.assign(d,up);
        return D.collection('incoming').doc(d.id).update(up); })
      .catch(function(){}).then(function(){ d._busy=false; renderStrip(); }); }); }

  /* ---------- arrival: reception presses Arrived (or any check-in with the same pet name) ---------- */
  function matchArrivals(){ var P=[]; try{ P=PATIENTS||[]; }catch(e){ return; }
    ST.list.slice().forEach(function(d){ var first=String(d.name||'').trim().split(/\s+/)[0].toLowerCase(); if(!first) return;
      var p=P.filter(function(x){ var a=x.arrival?new Date(x.arrival).getTime():0; return a>=ms(d.created_at)-60000&&String(x.name||'').toLowerCase()===first&&(!d.species||!x.species||x.species==='—'||String(x.species).toLowerCase()===String(d.species).toLowerCase()); })[0];
      if(p) markArrived(d,p); }); }
  function watchArrival(a){ var n=0, t=setInterval(function(){ n++; matchArrivals(); if(!ST.list.some(function(d){ return d.id===a.id; })||n>40){ clearInterval(t); if(ST.arriving&&ST.arriving.id===a.id) ST.arriving=null; } },1500); }
  function markArrived(d,p){ var D=pvxDb(); if(!D||d._done) return; d._done=true; var now=p&&p.arrival?new Date(p.arrival).getTime():Date.now();
    var first=d.eta_first||d.eta_at, pred=first?Math.round((ms(first)-ms(d.created_at))/60000):null,   /* the estimate made on the call, not later +5s or refreshes */ act=Math.round((now-ms(d.created_at))/60000);
    var up={status:'arrived', arrived_at:iso(now), visit_id:p&&p.id!=null?String(p.id):null, from:null, phone:null, owner:null};
    D.collection('incoming').doc(d.id).update(up).catch(function(e){ console.warn('[otw] arrived',e); });
    if(pred!=null&&act>=0&&act<=360){ var dt=new Date(ms(d.created_at)); D.collection('eta_log').add({tenant_id:pvxTenant(), town:d.from&&d.from.key||'', dow:dt.getDay(), hour:dt.getHours(), leave_min:d.leave_min||0,
      predicted_min:pred, actual_min:act, source:d.minutes_source||'none', at:iso(now)}).then(function(){ ST.log.push({town:d.from&&d.from.key||'', predicted_min:pred, actual_min:act}); }).catch(function(){}); }
    upsert(Object.assign({},d,up)); renderStrip(); }
  function arrived(id){ var d=ST.list.filter(function(x){ return x.id===id; })[0]; if(!d) return; ST.arriving={id:id, at:Date.now()};
    openAddPatient(); try{ apSetArrival('walkin'); }catch(e){}
    var set=function(k,v){ var el=document.getElementById(k); if(el&&v) el.value=v; };
    set('apName',d.name); set('apBreed',d.breed); set('apOwner',d.owner); set('apPhone',d.phone); set('apReason',d.reason);
    var sp=document.getElementById('apSpecies'); if(sp&&d.species){ [].some.call(sp.options,function(o){ if(o.value===d.species||o.text===d.species){ sp.value=o.value||o.text; return true; } return false; }); }
    try{ apSetPrio(+d.prio||2); }catch(e){}
    try{ if(d.room_plan){ apLocation=d.room_plan; apMountLocation(); } }catch(e){}
    try{ if(d.doctor&&d.doctor!=='unassigned'){ apDoctorId=d.doctor; apMountDoctor(); } }catch(e){}
    var t=document.querySelector('#apModal .aph-t'); if(t) t.textContent='Check in '+(d.name||'');
    var s=document.querySelector('#apModal .aph-sub'); if(s) s.textContent='They were on the way. Check the details, then create the patient.';
    var cb=document.getElementById('apCreate'); if(cb) cb.textContent='Check in'; }
  function notComing(id){ var D=pvxDb(), d=ST.list.filter(function(x){ return x.id===id; })[0]; if(!D||!d) return;
    var up={status:'cancelled', cancelled_at:iso(Date.now()), cancelled_by:pvxWho(), from:null, phone:null, owner:null};
    var back={status:'on_the_way', cancelled_at:null, cancelled_by:null, from:d.from||null, phone:d.phone||null, owner:d.owner||null};
    D.collection('incoming').doc(id).update(up).then(function(){ upsert(Object.assign({},d,up)); renderStrip();
      var undo=function(){ D.collection('incoming').doc(id).update(back).then(function(){ upsert(Object.assign({},d,back)); renderStrip(); }).catch(function(){ try{ toast('Couldn’t undo — add them again from Add patient'); }catch(e){} }); };
      /* Apple: Undo instead of "Are you sure?" */
      if(window.fvNotifyAct) fvNotifyAct(pvxEscQ(d.name||'Patient')+' taken off On the way','','Undo',undo,{color:'#3E8FA5'}); else pvxNote(pvxEscQ(d.name||'Patient')+' taken off On the way',''); })
      .catch(function(){ try{ toast('Couldn’t update — try again'); }catch(e){} }); }
  function later(id,min){ var D=pvxDb(), d=ST.list.filter(function(x){ return x.id===id; })[0]; if(!D||!d||!d.eta_at) return; var k=min*60000;
    var up={eta_at:iso(ms(d.eta_at)+k), eta_lo:iso(ms(d.eta_lo)+k), eta_hi:iso(ms(d.eta_hi)+k), leave_at:iso(ms(d.leave_at)+k), shift:(d.shift||0)}; Object.assign(d,up); renderStrip();
    D.collection('incoming').doc(id).update(up).catch(function(){}); }
  function planRoom(id,room){ var D=pvxDb(), d=ST.list.filter(function(x){ return x.id===id; })[0]; if(!D||!d) return; d.room_plan=room||null; renderStrip();
    D.collection('incoming').doc(id).update({room_plan:room||null}).catch(function(){}); }

  /* ---------- the Command Center strip ---------- */
  var head=document.querySelector('#view-dashboard .view-head'), strip=document.createElement('section');
  strip.id='otwStrip'; strip.className='otw-strip'; strip.setAttribute('aria-labelledby','otwH'); strip.hidden=true;
  if(head&&head.parentNode) head.parentNode.insertBefore(strip,head.nextSibling);
  function rooms(cur){ var L=[]; try{ L=apAvailableLocations().map(function(x){ return x.id; }).filter(function(x){ return x!=='Lobby'; }); }catch(e){ L=['Room 1','Room 2','Room 3','Room 4','Room 5','Room 6','Room 7','Treatment']; }
    if(cur&&L.indexOf(cur)<0) L.unshift(cur); return L; }
  function taken(room){ try{ return !!room&&room!=='Treatment'&&PATIENTS.some(function(x){ return isActive(x)&&x.room===room; }); }catch(e){ return false; } }
  /* the card reads like an iPhone's "sharing ETA" notice: a small kicker, one bold line, one plain sentence */
  /* the patient's own Flow medallion (initial, species, priority ring) carries a small badge with a car — like a contact photo with an app badge on an iPhone ETA notice */
  var CAR='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M3.3 16C2.9 16 2.5 15.6 2.5 15.2V12.7C2.5 11.9 3 11.2 3.8 11L6.7 10.2L9 7.1C9.4 6.6 9.9 6.3 10.6 6.3H15.1C15.7 6.3 16.3 6.6 16.6 7.1L18.9 10.1L20.3 10.4C21 10.6 21.5 11.2 21.5 11.9V15.2C21.5 15.6 21.1 16 20.7 16H19.7A2.7 2.7 0 0 0 14.3 16H9.7A2.7 2.7 0 0 0 4.3 16ZM9.4 10.1L10.8 8C10.9 7.8 11.1 7.7 11.4 7.7H12.6V10.1ZM13.8 7.7H14.9C15.2 7.7 15.4 7.8 15.5 8L17.1 10.1H13.8Z"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/></svg>';
  function card(d){ var now=Date.now(), mid=ms(d.eta_at), hi=ms(d.eta_hi), has=!!mid;
    var left=has?Math.round((mid-now)/60000):null, late=has&&now>hi, lateBy=has?Math.max(1,Math.round((now-mid)/60000)):0, soon=has&&!late&&left<=5, call=late&&now-hi>=10*60000;
    var name=pvxEscQ(d.name||'Patient'), prio=+d.prio||2, from=d.from&&d.from.label?pvxEscQ(d.from.label):'';
    var state=late?'late':soon&&!d.room_plan?'soon':'', cls='otw-card'+(state?' '+state:'');   /* orange only when something needs doing */
    var kicker=late?'Running late':soon?'Arriving soon':'On the way';
    var right=!has?'':late?lateBy+' min late':left<=0?'now':'in '+left+' min';
    var title=late?name+' is running late':name+' is on the way';
    var room=d.room_plan?(taken(d.room_plan)?' <span class="otw-warn">'+pvxEscQ(d.room_plan)+' is taken right now.</span>':' <span class="otw-ok">'+pvxEscQ(d.room_plan)+' is ready.</span>'):soon||late?' <span class="otw-warn">No room planned yet.</span>':'';
    var src=d.minutes_source==='google'?' Live traffic from Google Maps.':d.minutes_source==='family'?' From what the family said.':'';
    var line;
    if(!has) line=name+' is coming'+(from?' from '+from:'')+'. Add the minutes when they call back.';
    else if(late) line=name+' was expected around '+pvxEscQ(hm(mid))+', '+lateBy+' min ago.'+room+(call&&d.phone?' <span class="otw-warn">Call '+pvxEscQ(d.owner&&d.owner!=='—'?d.owner:'the family')+': <a href="tel:'+pvxEscQ(String(d.phone).replace(/[^\d+]/g,''))+'">'+pvxEscQ(d.phone)+'</a></span>':'');
    else line=name+' will arrive'+(from?' from '+from:'')+' around '+pvxEscQ(hm(mid))+'.'+room+'<span class="otw-src">'+src+'</span>';
    var what=[d.species,d.breed,d.reason].filter(function(x){ return x&&x!=='—'; }).join(' · ');
    var med; try{ med=mono({name:d.name||'?', species:d.species||'', prio:prio},'patient-medallion patient-medallion--compact'); }catch(e){ med='<div class="pt-emoji">'+pvxEscQ(String(d.name||'?').charAt(0).toUpperCase())+'</div>'; }
    return '<article class="'+cls+'" data-otw-id="'+pvxEscQ(d.id)+'" aria-label="'+pvxEscQ((d.name||'Patient')+', '+kicker+(right?', '+right:''))+'">'
      +'<span class="otw-edge" style="background:var(--priority-p'+prio+')"></span>'
      +'<div class="otw-av">'+med+'<span class="otw-badge">'+CAR+'</span></div><div class="otw-body">'
      +'<div class="otw-top"><span class="otw-kick">'+pvxEscQ(kicker)+(from?' · '+from:'')+'</span><span class="otw-in">'+pvxEscQ(right)+'</span></div>'
      +'<div class="otw-tl"><b class="otw-t">'+title+'</b><span class="prio prio-'+prio+'" style="width:22px;height:22px;font-size:0.625rem">P'+prio+'</span></div><p class="otw-line">'+line+'</p>'+(what?'<span class="otw-what">'+pvxEscQ(what)+'</span>':'')
      +'<div class="otw-acts"><button type="button" class="otw-primary" data-otw-act="arrived">Arrived</button>'
      +'<label class="otw-room"><span class="otw-vh">Plan a room for '+name+'</span><select data-otw-act="room"><option value="">Plan a room…</option>'+rooms(d.room_plan).map(function(r){ return '<option'+(r===d.room_plan?' selected':'')+'>'+pvxEscQ(r)+'</option>'; }).join('')+'</select></label>'
      +(has?'<button type="button" class="otw-quiet" data-otw-act="later">+5 min</button>':'')+'<button type="button" class="otw-quiet" data-otw-act="cancel">Not coming</button></div></div></article>'; }
  function renderStrip(){ var L=ST.list.filter(function(d){ return d.status==='on_the_way'; }).sort(function(a,b){ return (ms(a.eta_at)||9e15)-(ms(b.eta_at)||9e15); });
    if(!L.length){ strip.hidden=true; strip.innerHTML=''; return; }
    var foc=document.activeElement&&strip.contains(document.activeElement)?[document.activeElement.closest('[data-otw-id]')&&document.activeElement.closest('[data-otw-id]').dataset.otwId,document.activeElement.dataset.otwAct]:null;
    strip.hidden=false;
    strip.innerHTML='<div class="otw-head"><h2 id="otwH">On the way</h2><span>'+L.length+'</span></div><div class="otw-cards">'+L.map(card).join('')+'</div>';
    if(foc&&foc[0]){ var el=strip.querySelector('[data-otw-id="'+foc[0]+'"] [data-otw-act="'+foc[1]+'"]'); if(el) el.focus(); } }
  strip.addEventListener('click',function(e){ var b=e.target.closest('button[data-otw-act]'); if(!b) return; var id=b.closest('[data-otw-id]').dataset.otwId, a=b.dataset.otwAct;
    if(a==='arrived') arrived(id); else if(a==='later') later(id,5); else if(a==='cancel') notComing(id); });
  strip.addEventListener('change',function(e){ var s=e.target.closest('select[data-otw-act="room"]'); if(!s) return; planRoom(s.closest('[data-otw-id]').dataset.otwId, s.value); });

  /* ---------- the Google Maps key (admins) ---------- */
  function openKey(){ if(!admin()) return; var old=document.getElementById('otwKey'); if(old) old.remove();
    var w=document.createElement('div'); w.id='otwKey'; w.className='otw-key-scrim';
    w.innerHTML='<div class="otw-key" role="dialog" aria-modal="true" aria-labelledby="otwKeyT"><h3 id="otwKeyT">Drive times from Google Maps</h3>'
      +'<p>Paste the browser key from the hospital’s Google Cloud project. Restrict it to shoreline.pravix.app and the Maps JavaScript API with Routes. Only the town a family is coming from is sent to Google.</p>'
      +'<label><span>Browser key</span><input id="otwKeyIn" type="text" autocomplete="off" spellcheck="false" value="'+pvxEscQ(ST.key||'')+'"></label>'
      +'<div class="otw-key-acts"><button type="button" class="otw-quiet" data-k="cancel">Cancel</button><button type="button" class="otw-primary" data-k="save">Save</button></div></div>';
    document.body.appendChild(w); var inp=document.getElementById('otwKeyIn'); if(inp) inp.focus();
    w.addEventListener('click',function(e){ var k=e.target.closest('[data-k]'); if(e.target===w||(k&&k.dataset.k==='cancel')){ w.remove(); return; }
      if(k&&k.dataset.k==='save'){ var v=String(inp.value||'').trim(), D=pvxDb(); if(!D) return;
        D.collection('ts_settings').doc('maps').set({browser_key:v||null, updated_at:iso(Date.now()), updated_by:pvxEmail()},{merge:true}).then(function(){ ST.key=v||null; ST.keyLoaded=true; gP=null; w.remove(); pvxNote('Google Maps key saved',''); lookup(); })
          .catch(function(){ try{ toast('Not saved — only an admin can change it'); }catch(e){} }); } });
    w.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); w.remove(); } }); }

  /* ---------- styles ---------- */
  var css=document.createElement('style'); css.textContent=[
    '#apArrival.ap-seg{grid-template-columns:repeat(4,minmax(0,1fr))}#apArrival .ap-seg-btn{white-space:nowrap}@media(max-width:700px){#apArrival.ap-seg{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:420px){#apArrival.ap-seg{grid-template-columns:1fr}}',
    '.otw-sect{margin-top:12px;padding:14px;border-radius:16px;background:rgba(77,200,224,.06);border:1px solid rgba(77,200,224,.28);display:flex;flex-direction:column;gap:12px}',
    '.otw-lbl{display:block;font-size:0.75rem;font-weight:600;color:var(--ink-700);margin-bottom:6px;letter-spacing:0}',
    '.otw-leave{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.otw-leave button{min-height:44px;border-radius:12px;border:1px solid var(--ctl-border,rgba(158,206,231,.22));background:var(--fill-soft,rgba(158,206,231,.05));color:var(--ink-700);font:600 0.875rem var(--font);cursor:pointer}',
    '.otw-leave button[aria-checked="true"]{color:var(--accent,#4dc8e0);border-color:rgba(56,189,210,.6);background:rgba(56,189,210,.12)}',
    '.otw-towns{display:none;position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:30;border-radius:12px;overflow:hidden;background:var(--navy-2,#0d1930);border:1px solid rgba(158,206,231,.22);box-shadow:0 14px 30px rgba(0,0,0,.35)}.otw-towns.open{display:block}',
    '.otw-towns button{display:flex;justify-content:space-between;align-items:center;width:100%;min-height:44px;padding:0 14px;border:0;background:none;color:var(--ink-900,#f4f8fc);font:500 0.9375rem var(--font);cursor:pointer;text-align:left}.otw-towns button span{color:var(--ink-500,#93a6bd);font-size:0.75rem}',
    '.otw-towns button[aria-selected="true"],.otw-towns button:hover{background:rgba(77,200,224,.12)}',
    '.otw-eta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:0.8125rem;color:var(--ink-500,#93a6bd);min-height:24px}',
    '.otw-eta-main{display:flex;align-items:baseline;gap:8px}.otw-eta-main .otw-k{font-size:0.75rem;letter-spacing:0}.otw-eta-main b{font-size:1.25rem;font-weight:600;color:var(--ink-900,#f4f8fc)}',
    '.otw-typed{display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;font-size:0.8125rem;color:var(--ink-700)}.otw-typed input{width:96px}',
    '.otw-link{border:0;background:none;padding:0;min-height:32px;color:var(--accent,#4dc8e0);font:600 0.8125rem var(--font);text-decoration:underline;text-underline-offset:2px;cursor:pointer}',
    '.otw-spin{width:15px;height:15px;border-radius:50%;border:2px solid rgba(158,206,231,.3);border-top-color:#4dc8e0;animation:otwspin .8s linear infinite}@keyframes otwspin{to{transform:rotate(360deg)}}',
    '.otw-strip{margin:0 0 20px;display:flex;flex-direction:column;gap:12px}.otw-strip[hidden]{display:none}',
    '.otw-head{display:flex;align-items:baseline;gap:10px}.otw-head h2{margin:0;font-size:1.0625rem;font-weight:600;color:var(--ink-900,#f4f8fc)}.otw-head span{font-size:0.875rem;color:var(--ink-500,#93a6bd)}',
    '.otw-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(440px,100%),1fr));gap:14px}',
    '.otw-primary{min-height:44px;padding:0 18px;border-radius:12px;border:0;background:#187A91;color:#fff;font:600 0.875rem var(--font);cursor:pointer}',
    '.otw-quiet{min-height:44px;padding:0 12px;border-radius:12px;border:0;background:none;color:var(--ink-500,#93a6bd);font:500 0.875rem var(--font);cursor:pointer}.otw-quiet:hover{color:var(--ink-900,#f4f8fc)}',
    '.otw-card{position:relative;overflow:hidden;display:grid;grid-template-columns:48px minmax(0,1fr);gap:14px;padding:16px 18px 14px 20px;border-radius:22px;background:var(--navy-2,#0d1930);border:1px solid rgba(158,206,231,.14);box-shadow:0 12px 30px -12px rgba(0,0,0,.55)}',
    '.otw-edge{position:absolute;left:0;top:0;bottom:0;width:4px}',
    '.otw-av{position:relative;width:46px;height:46px}.otw-av .pt-emoji{position:relative;width:46px;height:46px;font-size:1.0625rem;border-radius:14px;display:flex;align-items:center;justify-content:center}',
    '.otw-badge{position:absolute;right:-6px;bottom:-6px;width:22px;height:22px;border-radius:50%;background:#187A91;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2.5px var(--navy-2,#0d1930)}.otw-badge svg{width:min(0.9375rem,22.5px);height:min(0.9375rem,22.5px);fill:#fff}',
    '.otw-card.soon .otw-badge,.otw-card.late .otw-badge{background:#E8743A}',
    '.otw-tl{display:flex;align-items:center;gap:8px;margin-top:2px}.otw-tl .prio{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;border-radius:7px;font-weight:800}',
    '.otw-t{font-size:1.0625rem;font-weight:600;line-height:1.3;color:var(--ink-900,#f4f8fc)}',
    '.otw-card .otw-in{font-weight:700;color:var(--accent,#4dc8e0)}',
    '@media (max-width:700px){.otw-card{grid-template-columns:40px minmax(0,1fr);gap:12px;padding:14px 14px 12px 16px;border-radius:20px}.otw-av,.otw-av .pt-emoji{width:40px;height:40px}.otw-av .pt-emoji{font-size:0.9375rem;border-radius:12px}.otw-acts .otw-room{flex:1 1 160px}.otw-acts .otw-room select{width:100%}}',
    'body:not(.dark) .otw-badge{box-shadow:0 0 0 2.5px #fff}body:not(.dark) .otw-card .otw-in{color:#1F7F96}',
    '.otw-body{min-width:0;display:flex;flex-direction:column;gap:2px}',
    '.otw-top{display:flex;justify-content:space-between;align-items:baseline;gap:10px}',
    '.otw-kick{display:flex;align-items:center;gap:8px;font-size:0.75rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-500,#93a6bd)}',
    '.otw-card.soon .otw-kick,.otw-card.late .otw-kick{color:#F78B4A}',
    '.otw-in{font-size:0.8125rem;color:var(--ink-500,#93a6bd);font-variant-numeric:tabular-nums;white-space:nowrap}.otw-card.soon .otw-in,.otw-card.late .otw-in{color:#F78B4A}',
    '.otw-line{margin:0;font-size:0.9375rem;line-height:1.4;color:var(--ink-800,#dbe6f0)}.otw-src{color:var(--ink-500,#93a6bd)}',
    '.otw-what{font-size:0.8125rem;color:var(--ink-500,#93a6bd);margin-top:2px}',
    '.otw-warn{font-weight:600;color:#F78B4A}.otw-warn a{color:inherit}.otw-ok{font-weight:600;color:#7FD6AE}',
    '.otw-acts{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:center}',
    'body:not(.dark) .otw-card{background:#fff;border-color:rgba(30,45,90,.10);box-shadow:0 8px 24px rgba(30,45,90,.10)}body:not(.dark) .otw-t{color:#14181F}body:not(.dark) .otw-line{color:#2F3742}body:not(.dark) .otw-card.soon .otw-kick,body:not(.dark) .otw-card.late .otw-kick,body:not(.dark) .otw-card.soon .otw-in,body:not(.dark) .otw-card.late .otw-in{color:#C2410C}',
    '.otw-room select{min-height:44px;border-radius:12px;border:1px solid rgba(158,206,231,.25);background:transparent;color:var(--ink-900,#f4f8fc);padding:0 10px;font:500 0.875rem var(--font)}',
    '.otw-vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
    '.otw-primary:active,.otw-quiet:active,.otw-leave button:active{transform:scale(.985);filter:brightness(.9)}',
    '.otw-key-scrim{position:fixed;inset:0;z-index:9000;background:rgba(3,7,14,.6);display:flex;align-items:center;justify-content:center;padding:16px}',
    '.otw-key{width:min(480px,100%);border-radius:20px;background:var(--navy-2,#0d1930);border:1px solid rgba(158,206,231,.2);padding:20px;display:flex;flex-direction:column;gap:12px;color:var(--ink-900,#f4f8fc)}',
    '.otw-key h3{margin:0;font-size:1.0625rem}.otw-key p{margin:0;font-size:0.875rem;line-height:1.5;color:var(--ink-700,#b9c8d8)}.otw-key label{display:flex;flex-direction:column;gap:6px;font-size:0.75rem;font-weight:600}',
    '.otw-key input{min-height:44px;border-radius:12px;border:1px solid rgba(158,206,231,.25);background:rgba(0,0,0,.2);color:inherit;padding:0 12px;font:500 0.875rem ui-monospace,Menlo,monospace}.otw-key-acts{display:flex;justify-content:flex-end;gap:8px}',
    'body:not(.dark) .otw-towns,body:not(.dark) .otw-key{background:#fff;border-color:rgba(30,45,90,.15)}',
    'body:not(.dark) .otw-head h2,body:not(.dark) .otw-eta-main b,body:not(.dark) .otw-towns button,body:not(.dark) .otw-room select,body:not(.dark) .otw-key{color:#14181F}',
    'body:not(.dark) .otw-warn{color:#C2410C}body:not(.dark) .otw-ok{color:#2E8A5E}',
    '@media (prefers-reduced-motion:reduce){.otw-spin{animation-duration:2s}.otw-primary:active,.otw-quiet:active{transform:none}}'
  ].join('\n'); document.head.appendChild(css);

  window.fvOnTheWay={state:function(){ return ST; }, form:function(){ return F; }, place:place, learned:learned, etaFrom:etaFrom, render:renderStrip, refreshDue:refreshDue, matchArrivals:matchArrivals, start:start, loadKey:loadKey, TOWNS:TOWNS};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 22 of 104 · no id ━━━━━ */
try{
window.FV_TECHS=["Felisha Barnes", "Tanneil Buchanan", "Stephanie Cseh", "Erin Cummings", "Chris Densky", "Nelson Diaz", "Alexis Distasio", "Lizzy Dixon", "Catherine Fappiano", "Brandy Fellin", "Viviana Fonseca", "Lauren Francione", "Amber Horvath", "Kimberly Hulme", "Danielle Infante", "Amanda Inzitari", "Danielle Kiley", "Malyssa Kubik", "Carly Kudola", "Amanda Van Kuren", "Ann LeStrange", "Janitza Lopez", "Gabrielle Lungarini", "Lindsay Martin", "Myranda May", "Sam Mitchell", "Bethany Oczkowski", "Gabriella Palumbo", "Rachel Pieger", "Malachi Quinones", "Allie Rodriguez", "Christina Rodriguez", "Delahla Rosario", "Vanessa Ruiz", "Stacey Smith", "Ally Tewksbury", "Courtney Thieke", "Shelsey Vega", "Paola Velazquez", "Dharianna Villa", "Lauren Whitney", "Jordain Williams"];
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 23 of 104 · no id ━━━━━ */
try{
/* ═══ FLOW → TREATMENT SHEETS ═══
   One sheet per visit in the shared `sheets` collection (doc id v_<visitId>), on one of two boards:
     • Moved into the Treatment area  → OP sheet (OP Board)
     • Admitted                        → IP sheet (IP Board). An OP sheet is promoted in place, so charting carries over.
     • Discharged / euthanized in Flow → an OP sheet closes (IP sheets are discharged from Treatment Sheets).
   All writes are transactions: two screens can never create two sheets or overwrite charting. */
(function(){
  if(typeof completePatient!=='function') return;
  var COL='sheets';
  /* Mirrors Treatment Sheets' DEFAULT_ORDERS. OP sheets start with the first 8 (vitals, pain, weight); admission adds the rest. */
  var DEFAULTS=[
    ['Temperature','obs','Basic Observation','q4h','°F'],['Heart Rate','obs','Basic Observation','q4h','bpm'],['Respiratory Rate','obs','Basic Observation','q4h','rpm'],
    ['CRT','obs','Basic Observation','q4h'],['Mucous Membrane','obs','Basic Observation','q4h'],['Mentation','obs','Basic Observation','q4h'],['Pain Score','obs','Basic Observation','q4h'],
    ['Weight','obs','Basic Observation','q24h','kg',8],['Food','obs','Basic Observation','q8h'],['Water','obs','Basic Observation','q8h'],
    ['Urination','obs','Basic Observation','q8h',null,2],['Defecation','obs','Basic Observation','q8h',null,2],
    ['Check IV catheter','care','Patient Care','q4h'],['Walk','care','Patient Care','q6h',null,2],['Cage cleaned','care','Patient Care','q8h',null,4]];
  var OP_COUNT=8;   /* vitals, pain and weight */
  function defaultOrders(h,board){ var out={}; DEFAULTS.forEach(function(r,i){ if(board==='OP'&&i>=OP_COUNT) return; var id='d'+(i+1);
    out[id]={id:id,name:r[0],type:r[1],section:r[2],freq:r[3],start:r[5]!=null?r[5]:((h||0)+1)%4}; if(r[4]) out[id].unit=r[4]; }); return out; }
  function sheetId(p){ if(p&&p.tsSheetId) return String(p.tsSheetId); return 'v_'+String(p.id||p.hid||'').replace(/[\/\s.#$\[\]]/g,'_'); }
  function ready(){ return typeof DB!=='undefined'&&DB&&!(typeof LOBBY!=='undefined'&&LOBBY); }
  function doctorName(id){ try{ var L=(typeof rdAllDoctors==='function')?rdAllDoctors():(DOCTORS||[]); var d=L.find(function(x){ return x.id===id; }); return d?d.name:''; }catch(e){ return ''; } }
  /* Triage weight (measured) always wins over the weight typed at check-in. */
  function triageKg(p){ var v=p&&p.triage&&p.triage.vitals&&p.triage.vitals.weight; if(v==null||String(v).trim()==='') return null;
    try{ if(typeof parseWeightInput==='function'){ var r=parseWeightInput(v); if(r&&r.valid) return r.kg; } }catch(e){}
    var n=String(v).match(/\d+(\.\d+)?/); return n?parseFloat(n[0]):null; }
  function weightFix(p,d,into){ var tw=triageKg(p); if(tw&&(!d.patient||d.patient.weight!==tw)) into['patient.weight']=tw; return into; }
  /* charting lives in sheets/{id}/days/{YYYYMMDD}; Treatment Sheets rebuilds the board summary when digest_dirty is set */
  function dayRefOf(id,dk){ return DB.collection(COL).doc(id).collection('days').doc(dk); }
  function byDay(tm){ var g={}; Object.keys(tm).forEach(function(f){ if(f.indexOf('marks.')!==0) return; var k=f.slice(6), dk=k.slice(0,8); (g[dk]=g[dk]||{})[k]=tm[f]; }); return g; }
  function writeDays(t,id,g,nowIso){ Object.keys(g).forEach(function(dk){ t.set(dayRefOf(id,dk),{dk:dk,marks:g[dk],updated_at:nowIso},{merge:true}); }); return Object.keys(g).length; }
  function hasCharting(d){ var g=d.digest||{}, k1=Object.keys(g.done||{}).some(function(k){ return !/_triage$/.test(k); }), k2=Object.keys(d.marks||{}).some(function(k){ return !/_triage$/.test(k); }); return k1||k2||(d.notes||[]).length>0; }
  function patientFor(p){
    var wt=triageKg(p)||((typeof p.weightKg==='number'&&p.weightKg>0)?p.weightKg:(parseFloat(p.weight)||null));
    var sex=''; try{ sex=(typeof normalizeSexValue==='function'?normalizeSexValue(p.sex):'')||p.sex||''; }catch(e){ sex=p.sex||''; }
    var code=p.resusPref==='DNR'?'DNR':(p.resusPref==='CPR'?'CPR':'—');
    var cond={1:'Critical',2:'Watch'}[p.prio]||'Stable';
    var own=String(p.owner||'').trim(), oLast=(typeof fvOwnerSurname==='function')?fvOwnerSurname(own):(own.indexOf(',')>-1?own.split(',')[0].trim():(own.split(/\s+/).length>1?own.split(/\s+/).slice(1).join(' '):''));
    return {name:p.name||'Patient',last:p.last||oLast||'',owner:p.owner||'',phone:p.ownerPhone||'',species:p.species||'Dog',breed:p.breed||'',sex:sex,
      age:p.ageDisplay||p.age||'',weight:wt,reason:p.reason||'',doctor:doctorName(p.doctor),location:'',code:code,condition:cond,
      alerts:code==='DNR'?['DNR']:[],tech:(techNow(p)||{}).staffName||null,tech_at:techAt(p)||null,flags:flagsFor(p),problems:Array.isArray(p.reasonProblems)?p.reasonProblems.map(function(x){ return x.label; }).filter(Boolean):[]};
  }
  /* ---- triage → sheet: each triage reading becomes a completed entry at the triage time ---- */
  var TRI_MAP={temp:'Temperature',hr:'Heart Rate',rr:'Respiratory Rate',weight:'Weight',mentation:'Mentation',mm:'Mucous Membrane',crt:'CRT'};
  var NUMERIC={temp:1,hr:1,rr:1,weight:1};
  function dayKeyOf(d){ return d.getFullYear()+pvxPad2(d.getMonth()+1)+pvxPad2(d.getDate()); }
  function triageTime(p,t){
    var base=p.arrival?new Date(p.arrival):new Date(), m=String(t.at||'').match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
    if(!m) return new Date();
    var h=+m[1]%12; if(m[3]&&/p/i.test(m[3])) h+=12; if(!m[3]&&+m[1]===12) h=12;
    var d=new Date(base); d.setHours(h,+m[2],0,0);
    if(p.arrival&&d<new Date(p.arrival)-60000) d.setDate(d.getDate()+1);   /* triage after midnight */
    if(d>new Date()) d=new Date();
    return d;
  }
  function triInitials(name,who){ var w=String(name||'').trim().split(/\s+/).filter(Boolean); return w.length?w.map(function(x){ return x[0]; }).join('').slice(0,2).toUpperCase():who.initials; }
  /* -> { 'marks.<key>': mark } for every triage value whose order is on the sheet */
  function triageMarks(p,orders,who){
    var t=p&&p.triage; if(!t) return {};
    var vals={}; [t.vitals||{},t.assess||{}].forEach(function(src){ Object.keys(src).forEach(function(k){ if(TRI_MAP[k]&&src[k]!=null&&String(src[k]).trim()!=='') vals[k]=String(src[k]).trim(); }); });
    if(!Object.keys(vals).length) return {};
    var at=triageTime(p,t), dk=dayKeyOf(at), min=at.getHours()*60+at.getMinutes(), by=triInitials(t.by,who), out={};
    Object.keys(vals).forEach(function(k){
      var oid=null; Object.keys(orders||{}).forEach(function(id){ var o=orders[id]; if(o&&!o.dc&&o.name===TRI_MAP[k]&&!oid) oid=o.id||id; });
      if(!oid) return;
      var v=vals[k]; if(NUMERIC[k]){ var n=String(v).match(/-?\d+(\.\d+)?/); if(!n) return; v=n[0]; }
      out['marks.'+dk+'_'+oid+'_triage']={status:'completed',by:by,min:min,value:v,notes:'From triage',orderId:oid,sched:min,at:at.toISOString(),src:'triage'};
    });
    return out;
  }
  function audit(desc,who,now){ return {at:now.toISOString(),type:'doctor',desc:desc,who:who.initials,uid:who.uid}; }
  function openLink(id){ return '/treatment/#sheet='+encodeURIComponent(id); }
  function announce(p,id,res,board){
    var t={created:board==='OP'?'Treatment sheet ready · OP':'Treatment sheet ready',promoted:'Sheet moved to IP Board',reopened:'Treatment sheet reopened'}[res];
    if(!t) return;
    try{ notify(t, pvxEsc(p.name||'Patient')+' · <a href="'+openLink(id)+'" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700;text-decoration:none">Open sheet ›</a>',
      {icon:'info',color:'var(--s-admitted)',dur:9000}); }catch(e){}
  }
  function fail(p,e){ console.warn('[flow→sheet]',e);
    try{ notify('Couldn’t open a treatment sheet',pvxEsc(p.name||'')+' · <a href="/treatment/" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700;text-decoration:none">Open Treatment Sheets ›</a>',{icon:'info',color:'var(--priority-p1)',dur:7000}); }catch(_){} }

  /* Create the sheet on `board`, or promote OP → IP. createOnly: never reopen a closed sheet (used by background sweeps). */
  function ensureSheet(p,board,opts){
    opts=opts||{};
    if(!ready()||!p) return Promise.resolve(null);
    var id=sheetId(p); if(id==='v_') return Promise.resolve(null);
    var ref=DB.collection(COL).doc(id), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue, pt=patientFor(p), nm=pvxEsc((pt.name+' '+pt.last).trim()), outB=board;
    return DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(snap.exists){
        var d=snap.data()||{}, cur=d.board||'IP'; outB=cur;
        if(d.status==='active'){
          var promote=(board==='IP'&&cur==='OP'), upd={}, have=d.orders||{}, std=defaultOrders(now.getHours(),promote?'IP':cur);
          Object.keys(std).forEach(function(k){ if(!have[k]) upd['orders.'+k]=std[k]; });   /* sheets made before a standard order existed / admission adds the rest */
          var tm=triageMarks(p,Object.assign({},std,have),who), g=byDay(tm), dks=Object.keys(g), inbox=d.marks||{};
          return Promise.all(dks.map(function(dk){ return t.get(dayRefOf(id,dk)); })).then(function(snaps){
            snaps.forEach(function(ds,i){ var have3=(ds.exists&&ds.data().marks)||{}, dk=dks[i];
              Object.keys(g[dk]).forEach(function(k){ if(have3[k]||inbox[k]) delete g[dk][k]; }); if(!Object.keys(g[dk]).length) delete g[dk]; });
            weightFix(p,d,upd);
            if(promote){ upd.board='IP'; upd.ip_at=now.toISOString(); upd.updated_by=who.initials; upd.audit=FV.arrayUnion(audit('Admitted from Flow — moved to IP Board',who,now)); }
            if(writeDays(t,id,g,now.toISOString())) upd.digest_dirty=true;
            if(Object.keys(upd).length){ upd.updated_at=now.toISOString(); t.update(ref,upd); }
            if(promote) outB='IP'; return promote?'promoted':'exists'; });
        }
        if(opts.createOnly||board!=='IP') return 'closed';
        t.update(ref,{status:'active',board:'IP',ip_at:now.toISOString(),closed_at:FV.delete(),closed_reason:FV.delete(),updated_at:now.toISOString(),updated_by:who.initials,
          audit:FV.arrayUnion(audit('Re-admitted from Flow',who,now))});
        return 'reopened';
      }
      var doc={tenant_id:(typeof TENANT_ID==='string'&&TENANT_ID)||'shoreline',status:'active',board:board,visit_id:String(p.id||''),visit_code:p.hid||null,
        source:board==='OP'?'flow-treatment':'flow',created_at:now.toISOString(),
        admitted_at:(board==='IP'&&p.admittedAt?new Date(p.admittedAt):now).toISOString(),created_by:who.name,created_uid:who.uid,patient:pt,
        orders:defaultOrders(now.getHours(),board),notes:[],digest_dirty:true,
        audit:[audit((board==='OP'?'Moved to Treatment in Flow — <b>':'Admitted from Flow — <b>')+nm+'</b>'+(pt.doctor?' · '+pvxEsc(pt.doctor):''),who,now)],
        updated_at:now.toISOString(),updated_by:who.initials};
      if(board==='OP') doc.op_at=now.toISOString(); else doc.ip_at=now.toISOString();
      writeDays(t,id,byDay(triageMarks(p,doc.orders,who)),now.toISOString());
      var re0=roundsEst(p); if(re0) doc.estimate={low:re0.low,high:re0.high,current:re0.current||0,deposit:re0.deposit,approved_by:'Client — in person',approved_at:null,initials:'',plan:'',updated_at:now.toISOString(),updated_by:who.initials,updated_by_name:who.name,source:'rounds'};
      t.set(ref,doc); return 'created';
    }); }).then(function(res){ if(!opts.quiet) announce(p,id,res,board);
      /* n91: a new outpatient sheet puts the patient in the Treatment room (frees the exam room) */
      try{ if(res==='created'&&outB==='OP'&&p.room!=='Treatment'&&!p._demo&&(typeof isActive!=='function'||isActive(p))&&typeof moveRoom==='function') moveRoom(p,'Treatment'); }catch(e){ console.warn('[sheet → Treatment room]',e); }
      try{ if(window.fvSheetSeen&&res&&res!=='error'&&res!=='closed') fvSheetSeen(p,res,outB); }catch(e){}   /* the visit remembers its sheet (Admit on OP cards) */
      return res; })
      .catch(function(e){ if(!opts.quiet) fail(p,e); return 'error'; });
  }

  /* Discharged / euthanized from Flow: close an OP sheet. IP sheets are left alone. */
  function closeOP(p,why){
    if(!ready()||!p) return;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date();
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{};
      if(d.status!=='active'||(d.board||'IP')!=='OP') return;
      t.update(ref,{status:'closed',closed_at:now.toISOString(),closed_reason:String(why||'discharged').toLowerCase(),updated_at:now.toISOString(),updated_by:who.initials,
        audit:firebase.firestore.FieldValue.arrayUnion(audit(why+' in Flow — sheet closed',who,now))});
      return 'closed';
    }); }).then(function(r){ try{ if(r==='closed'&&window.fvSheetSeen) fvSheetSeen(p,'closed'); }catch(e){} }).catch(function(e){ console.warn('[flow→sheet close]',e); });
  }

  /* Undo of an Admit: an OP sheet that was promoted goes back to the OP Board; a sheet made by the admit closes
     (unless someone already charted on it). */
  function undoSheet(p){
    if(!ready()||!p||p.status==='Admitted') return;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return 'none'; var d=snap.data()||{};
      if(d.status!=='active'||(d.board||'IP')!=='IP') return 'skip';
      if(d.op_at){ t.update(ref,{board:'OP',ip_at:FV.delete(),updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Admission undone in Flow — back to OP Board',who,now))}); return 'demoted'; }
      if(hasCharting(d)) return 'kept';
      t.update(ref,{status:'closed',closed_at:now.toISOString(),closed_reason:'Admission undone',updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Admission undone in Flow — sheet closed',who,now))});
      return 'undone';
    }); }).then(function(r){ try{ if((r==='demoted'||r==='undone')&&window.fvSheetSeen) fvSheetSeen(p,r,r==='demoted'?'OP':null); }catch(e){} if(r==='kept'){ try{ notify('Treatment sheet kept',pvxEsc(p.name||'')+' · it already has charting',{icon:'info',color:'var(--accent)'}); }catch(e){} } })
      .catch(function(e){ console.warn('[flow→sheet undo]',e); });
  }

  /* ---- hooks ---- */
  pvxAfter('completePatient',function(p,finalStatus){
    if(p&&!p._demo){ try{
      if(finalStatus==='Admitted') ensureSheet(p,'IP').then(function(){ setTimeout(function(){ pullEstimate(p); pushEstimate(p); },400); });
      else if(finalStatus==='Discharged'||finalStatus==='Euthanized'||finalStatus==='Deceased') closeOP(p,finalStatus);
    }catch(e){ console.warn(e); } }
  },'#23');
  if(typeof moveRoom==='function'){
    pvxWrap('moveRoom',function(origMove){ return function(p,newRoom){
      var was=p&&p.room, r=origMove.apply(this,arguments);
      if(p&&!p._demo&&newRoom==='Treatment'&&was!=='Treatment'&&p.room==='Treatment'){ try{
        var active=(typeof isActive==='function')?isActive(p):!p.completed;
        if(active){ ensured[p.id]=1; ensureSheet(p,p.status==='Hospitalized'?'IP':'OP'); }
      }catch(e){ console.warn(e); } }
      return r;
    }; },'#23');
  }
  /* Triage edited after the sheet exists: refresh the triage entries on an open sheet. */
  function syncTriage(p){
    if(!ready()||!p||p._demo) return;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date();
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{}; if(d.status!=='active') return;
      var tm=triageMarks(p,d.orders||{},who), upd=weightFix(p,d,{}), id=sheetId(p);
      if(writeDays(t,id,byDay(tm),now.toISOString())) upd.digest_dirty=true;
      if(!Object.keys(upd).length) return;
      upd.updated_at=now.toISOString(); upd.updated_by=who.initials; t.update(ref,upd);
    }); }).catch(function(e){ console.warn('[flow→sheet triage]',e); });
  }
  /* n250: called by saveTriageEdit itself (wrapping it missed the Save button, which holds the original) */
  window.fvAfterTriage=function(p){ if(!p||p._demo) return; setTimeout(function(){
    try{ syncTriage(p); }catch(e){ console.warn('[flow→sheet triage]',e); }
    try{ if(typeof window.fvRoundsTriage==='function') window.fvRoundsTriage(p); }catch(e){ console.warn('[triage → Rounds]',e); } },300); };
  var prevUndo=window.rdOnFlowUndo;
  window.rdOnFlowUndo=function(p){ var r; if(typeof prevUndo==='function'){ try{ r=prevUndo.apply(this,arguments); }catch(e){} } try{ undoSheet(p); }catch(e){} return r; };

  /* ---- background sweeps (cover every other path: drawer room picker, voice, new hospitalized arrivals, other screens, offline) ---- */
  var ensured={};
  function sweepTreatment(){
    try{ (PATIENTS||[]).forEach(function(p,i){
      if(!p||p._demo||ensured[p.id]||p.room!=='Treatment') return;
      if(typeof isActive==='function'&&!isActive(p)) return;
      ensured[p.id]=1;
      setTimeout(function(){ ensureSheet(p,p.status==='Hospitalized'?'IP':'OP',{createOnly:true,quiet:true})
        .then(function(r){ if(r==='created') announce(p,sheetId(p),'created',p.status==='Hospitalized'?'IP':'OP'); }); },i*150);
    }); }catch(e){ console.warn(e); }
  }
  function catchUpAdmitted(){
    try{ (PATIENTS||[]).filter(function(p){ return p&&p.status==='Admitted'&&!p._demo&&p.completedAt&&(typeof isTodayHosp!=='function'||isTodayHosp(p.completedAt)); })
      .forEach(function(p,i){ setTimeout(function(){ ensureSheet(p,'IP',{createOnly:true,quiet:true}).then(function(r){ if(r==='created'||r==='promoted') announce(p,sheetId(p),r,'IP'); }); },i*250); });
    }catch(e){ console.warn(e); }
  }
  var caught=false;
  setInterval(function(){
    var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    if(!u||typeof PATIENTS==='undefined'||!PATIENTS.length) return;
    if(!caught){ caught=true; catchUpAdmitted(); }
    sweepTreatment();
  },8000);

  /* ---- estimate sync: Rounds (low end, high end, bill) <-> treatment sheet (low, high, current charges) ----
     Rounds → sheet: any Rounds save whose numbers differ from the sheet's pushes them over.
     Sheet → Rounds: Treatment Sheets writes visits/{id}.rounds.auth directly; Flow picks it up from its normal listener. */
  function roundsEst(p){ var a=(typeof rdAuthRead==='function')?rdAuthRead(p):(p&&p.rounds&&p.rounds.auth); if(!a||a.estimate==null) return null;
    var hi=+a.estimate, lo=(a.estimateLow!=null?+a.estimateLow:Math.round(hi*.8)), cur=(a.bill!=null?+a.bill:null);
    return {low:lo,high:hi,current:cur,deposit:(a.deposited!=null?+a.deposited:null)}; }
  function sameEst(e,r){ return !!e&&+e.low===r.low&&+e.high===r.high&&(r.current==null||+e.current===r.current)&&((e.deposit==null?null:+e.deposit)===r.deposit); }
  function money0(n){ return '$'+Math.round(n).toLocaleString('en-US'); }
  var lastEstSig={};
  function pushEstimate(p,why){
    if(!ready()||!p||p._demo) return; var r=roundsEst(p); if(!r) return;
    var sig=r.low+'|'+r.high+'|'+r.current+'|'+r.deposit; if(lastEstSig[p.id]===sig) return; lastEstSig[p.id]=sig;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{}; if(d.status!=='active') return;
      var e=(d.estimate&&typeof d.estimate==='object')?d.estimate:null; if(sameEst(e,r)) return;
      var est=Object.assign({approved_by:'Client — in person',approved_at:null,initials:'',plan:''},e||{},
        {low:r.low,high:r.high,current:(r.current!=null?r.current:(e&&e.current!=null?+e.current:0)),deposit:r.deposit,updated_at:now.toISOString(),updated_by:who.initials,updated_by_name:who.name,source:'rounds'});
      t.update(ref,{estimate:est,updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Estimate updated in Rounds — <b>'+money0(r.low)+' – '+money0(r.high)+'</b>'+(r.current!=null?' · charges '+money0(r.current):'')+(r.deposit!=null?' · deposit '+money0(r.deposit):''),who,now))});
    }); }).catch(function(e){ lastEstSig[p.id]=null; console.warn('[rounds→sheet estimate]',e); });
  }
  /* sheet has an estimate but Rounds doesn't yet (e.g. estimate set on an OP sheet, then admitted): fill Rounds in */
  function pullEstimate(p){
    if(!ready()||!p||!p.rounds||roundsEst(p)) return;
    DB.collection(COL).doc(sheetId(p)).get().then(function(snap){
      var e=snap.exists&&snap.data().estimate; if(!e||!(+e.high>0)||roundsEst(p)) return;
      var a=rdAuth(p); a.estimate=+e.high; a.estimateLow=+e.low; if(e.current!=null) a.bill=+e.current; if(e.deposit!=null) a.deposited=+e.deposit;
      lastEstSig[p.id]=a.estimateLow+'|'+a.estimate+'|'+(a.bill!=null?a.bill:null)+'|'+(a.deposited!=null?a.deposited:null);
      try{ rdTouch(p,'Estimate from treatment sheet'); }catch(err){ try{ renderAll(); }catch(_){} }
    }).catch(function(){});
  }
  if(typeof rdTouch==='function'){
    pvxAfter('rdTouch',function(p,what){ try{ if(p) pushEstimate(p,what); }catch(e){} },'#23');
  }
  /* ---- code status: Flow's CPR / DNR (staff or client via Care Connect) → the sheet ----
     DNR always wins. CPR keeps a more specific ALS / BLS the team set on the sheet. */
  var lastCode={};
  function syncCode(p){
    if(!ready()||!p||p._demo) return; var pref=p.resusPref; if(pref!=='CPR'&&pref!=='DNR') return;
    if(lastCode[p.id]===pref) return; lastCode[p.id]=pref;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists){ delete lastCode[p.id]; return; }
      var d=snap.data()||{}; if(d.status==='discharged'||d.status==='closed') return;
      var pt=d.patient||{}, cur=pt.code||'—';
      var next=pref==='DNR'?'DNR':((cur==='ALS'||cur==='BLS')?cur:'CPR');
      var al=Array.isArray(pt.alerts)?pt.alerts.slice():[], hasD=al.indexOf('DNR')>=0;
      if(next==='DNR'&&!hasD) al.unshift('DNR'); if(next!=='DNR'&&hasD) al=al.filter(function(x){ return x!=='DNR'; });
      if(next===cur&&hasD===(next==='DNR')) return;
      var src=p.resusSource==='staff_flow'?'in Flow':'by the client';
      t.update(ref,{'patient.code':next,'patient.alerts':al,updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Code status set '+src+' — <b>'+next+'</b>',who,now))});
    }); }).catch(function(e){ delete lastCode[p.id]; console.warn('[flow→sheet code]',e); });
  }
  /* ---- patient flags (staff-only) follow the patient onto the sheet, like the code status (Oct 2026) ---- */
  var FLAG_K={safe:1,hand:1,med:1,iso:1,own:1}, lastFlags={};
  function flagsFor(p){ return (Array.isArray(p&&p.flags)?p.flags:[]).filter(function(f){ return f&&f.t&&FLAG_K[f.k]; }).slice(0,30).map(function(f){ return {k:f.k,t:String(f.t).slice(0,40),scope:f.scope==='visit'?'visit':'always'}; }); }
  function syncFlags(p){
    if(!ready()||!p||p._demo) return; var L=flagsFor(p), sig=JSON.stringify(L); if(lastFlags[p.id]===sig) return; lastFlags[p.id]=sig;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists){ delete lastFlags[p.id]; return; }
      var d=snap.data()||{}; if(d.status==='discharged'||d.status==='closed') return;
      var had=JSON.stringify((d.patient&&d.patient.flags)||[]); if(had===sig) return;
      t.update(ref,{'patient.flags':L,updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit('Flags from Flow — '+(L.length?L.map(function(f){ return '<b>'+pvxEsc(f.t)+'</b>'; }).join(', '):'none'),who,now))});
    }); }).catch(function(e){ delete lastFlags[p.id]; console.warn('[flow→sheet flags]',e); });
  }
  function sweepCodes(){ try{ (PATIENTS||[]).forEach(function(p){ if(!p) return; var on=p.room==='Treatment'||p.status==='Hospitalized'||p.status==='Admitted'||ensured[p.id]||(p.tsSheet&&p.tsSheet.board);
      if(on){ syncCode(p); syncFlags(p); } }); }catch(e){} }
  setInterval(function(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} if(u&&typeof PATIENTS!=='undefined') sweepCodes(); },8000);
  if(typeof setResusPref==='function'){
    pvxAfter('setResusPref',function(p,pref){ try{ if(p){ delete lastCode[p.id]; syncCode(p); } }catch(e){} },'#23');
  }
  /* ---- Technician: replaces the Care Team card in the drawer; the tech follows the patient onto the treatment sheet (and My Board) ---- */
  var TECH_COLOR='#38BDD2';
  function techSlug(n){ return 'tech:'+String(n||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }
  function techItem(n){ return {id:techSlug(n),name:n,initials:String(n).split(/\s+/).map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase(),color:TECH_COLOR}; }
  var NO_TECH={id:'none',name:'No technician',initials:'',color:'#7A9BB5'};
  function techNow(p){ var a=(typeof ctCurrent==='function')?ctCurrent(p,'technician'):[]; return a.length?a[a.length-1]:null; }
  function techAt(p){ var L=(typeof ctList==='function')?ctList(p).filter(function(a){ return a.role==='technician'; }):[]; return L.reduce(function(m,a){ var t=String(a.updatedAt||''); return t>m?t:m; },''); }
  function setTech(p,id){
    var cur=techNow(p); if(id==='none'?!cur:(cur&&cur.staffId===id)) return;
    ctCurrent(p,'technician').slice().forEach(function(a){ ctEndAssignment(p,a,id==='none'?'unassigned':'replaced'); });
    if(id==='none'){ p.timeline.push({label:'Technician unassigned',at:new Date(),meta:CURRENT_USER}); notify('Technician removed',pvxEsc(p.name||''),{icon:'doctor',color:'var(--accent)'}); renderAll(); if(activePatient===p.id) fillDrawer(p); }
    else { var it=(window.FV_TECHS||[]).map(techItem).find(function(x){ return x.id===id; })||(cur&&cur.staffId===id?techItem(cur.staffName):null); if(!it) return;
      ctAssign(p,'technician',{id:it.id,name:it.name,kind:'manual'}); }
    delete lastTech[p.id]; setTimeout(function(){ syncTech(p); },300);
  }
  /* Flow → sheet: the newest change wins (a tech set on the sheet itself is newer until someone changes it here) */
  var lastTech={};
  function syncTech(p){
    if(!ready()||!p||p._demo||typeof ctList!=='function') return; var at=techAt(p); if(!at) return;
    var cur=techNow(p), name=cur?(cur.staffName||null):null, sig=(name||'')+'|'+at; if(lastTech[p.id]===sig) return; lastTech[p.id]=sig;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{}, pt=d.patient||{}; if(d.status==='closed') return;
      if((pt.tech||null)===name) return; if(String(pt.tech_at||'')>at) return;
      t.update(ref,{'patient.tech':name,'patient.tech_at':at,updated_at:now.toISOString(),updated_by:who.initials,
        audit:FV.arrayUnion(audit(name?'Technician assigned in Flow — <b>'+pvxEsc(name)+'</b>':'Technician unassigned in Flow',who,now))});
    }); }).catch(function(e){ delete lastTech[p.id]; console.warn('[flow→sheet tech]',e); });
  }
  /* Flow → sheet: the current doctor (Flow's doctor / Rounds' Current) and Rounds' Next doctor — a handoff in either app shows in both */
  var lastDoc={};
  function syncDoctor(p){
    if(!ready()||!p||p._demo) return; var cur=(p.doctor&&p.doctor!=='unassigned')?doctorName(p.doctor):'';
    var inRounds=!!(p.rounds&&typeof p.rounds==='object'), nx=inRounds&&p.rounds.next, nxName=nx&&nx.docId?doctorName(nx.docId):'';
    var sig=cur+'|'+(inRounds?nxName:'~'); if(lastDoc[p.id]===sig) return; lastDoc[p.id]=sig;
    var ref=DB.collection(COL).doc(sheetId(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists) return; var d=snap.data()||{}, pt=d.patient||{}, upd={}, msg=[]; if(d.status==='closed') return;
      if(cur&&pt.doctor!==cur){ upd['patient.doctor']=cur; upd['patient.doctor_at']=now.toISOString(); msg.push('Doctor in Flow — <b>'+pvxEsc(cur)+'</b>'); }
      if(inRounds){ var have=(pt.doctor_next&&pt.doctor_next.name)||''; if(have!==nxName&&!(nxName&&nxName===(upd['patient.doctor']||pt.doctor))){
        upd['patient.doctor_next']=nxName?{name:nxName,at:nx.at||now.toISOString(),by:nx.by||'Rounds'}:null; msg.push(nxName?'Next doctor in Rounds — <b>'+pvxEsc(nxName)+'</b>':'Next doctor cleared in Rounds'); } }
      if(!msg.length) return;
      upd.updated_at=now.toISOString(); upd.updated_by=who.initials; upd.audit=FV.arrayUnion(audit(msg.join(' · '),who,now)); t.update(ref,upd);
    }); }).catch(function(e){ delete lastDoc[p.id]; console.warn('[flow→sheet doctor]',e); });
  }
  setInterval(function(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){} if(!u||typeof PATIENTS==='undefined') return;
    try{ PATIENTS.forEach(function(p){ if(p&&(p.room==='Treatment'||p.status==='Hospitalized'||p.status==='Admitted'||ensured[p.id])){ syncTech(p); syncDoctor(p); } }); }catch(e){} },8000);
  window.fvAdmitSheet={syncTech:syncTech,syncDoctor:syncDoctor,syncCode:syncCode,sweepCodes:sweepCodes,ensure:ensureSheet,create:function(p,o){ return ensureSheet(p,'IP',o); },closeOP:closeOP,id:sheetId,undo:undoSheet,pushEstimate:pushEstimate,pullEstimate:pullEstimate,sweep:sweepTreatment,triageMarks:triageMarks,syncTriage:syncTriage};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 24 of 104 · no id ━━━━━ */
try{
/* ═════════ FLOW ⇄ OR (Oct 2026) ═════════
   A surgical case lives on the patient's treatment sheet (sheets/{id}.surgery) — the record Flow, Treatment Sheets and Pravix OR share.
     · Book surgery (drawer → Surgery): starts the outpatient sheet if there isn't one yet (as moving to Treatment does), then puts the case
       on it. Pravix OR shows it straight away, with readiness filled in from the visit and the sheet.
     · Pravix OR sends every step back to the visit (visits/{id}.or_status): the board card says "OR 2 · 2:30" → "In surgery · OR 2" →
       "Recovery", and the drawer's Surgery card follows along.
     · OR's hand-off to ICU / Ward / Treatment admits an outpatient (visits/{id}.admit_request → fvAdmitRequests); once the case is done,
       Rounds gets a Surgery line (procedure, surgeon, room, times, destination) — once per case.
   Staff-only: never shown on the family tracker or the waiting-room screen. */
(function(){
  if(typeof completePatient!=='function') return;
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
  var OR_URL='https://shoreline.pravix.app/or/';
  var ROOMS=[{id:'or1',name:'OR 1',service:'Orthopedics / Neurology'},{id:'or2',name:'OR 2',service:'Soft Tissue / Emergency'}];
  var SURGEONS=[{id:'galano',name:'Dr. Galano'},{id:'nolte',name:'Dr. Nolte'},{id:'giannetto',name:'Dr. Giannetto'}];   /* = Pravix OR */
  var PROC={'TPLO':'Orthopedics','Fracture Repair':'Orthopedics','Arthroscopy':'Orthopedics','Hemilaminectomy':'Neurology','GDV Surgery':'Emergency',
    'Splenectomy':'Soft Tissue','Exploratory Laparotomy':'Soft Tissue','Foreign Body Removal':'Soft Tissue','Cystotomy':'Soft Tissue','Mass Removal':'Soft Tissue',
    'Thoracotomy':'Soft Tissue','Total Ear Canal Ablation':'Soft Tissue','Liver Lobectomy':'Soft Tissue','Perineal Urethrostomy':'Soft Tissue'};
  var LIVE_ST=['in_room','anesthesia_started','procedure_started','closing','procedure_finished'], REC_ST=['out_of_room','recovery'], DONE_ST=['recovery_complete','out_of_recovery','complete'];
  function isoDay(d){ return d.getFullYear()+'-'+pvxPad2(d.getMonth()+1)+'-'+pvxPad2(d.getDate()); }
  function clock(iso){ if(!iso) return ''; var d=new Date(iso); if(isNaN(d)) return ''; var h=d.getHours(), m=d.getMinutes(); return (h%12||12)+':'+pvxPad2(m)+' '+(h<12?'AM':'PM'); }
  function minClock(m){ var h=Math.floor(m/60)%24, mm=Math.round(m%60); return (h%12||12)+':'+pvxPad2(mm)+' '+(h<12?'AM':'PM'); }
  function ok(){ return !LOBBY&&typeof DB!=='undefined'&&DB&&window.fvAdmitSheet&&!document.body.classList.contains('client-mode')&&!document.body.classList.contains('tv-mode'); }
  function curP(p){ return (p&&typeof PATIENTS!=='undefined'&&PATIENTS.find(function(x){ return x.id===p.id; }))||p; }
  function today(s){ return !!s&&String(s.date||'')===isoDay(new Date()); }
  function open(s){ return !!s&&s.status!=='cancelled'&&DONE_ST.indexOf(s.status)<0; }
  function caseLink(id){ return OR_URL+'#case='+encodeURIComponent(id||''); }

  /* ---------- the board card ---------- */
  window.fvOrChip=function(p){ var s=p&&p.orStatus; if(!s||!open(s)||(!today(s)&&LIVE_ST.indexOf(s.status)<0&&REC_ST.indexOf(s.status)<0)) return '';
    var live=LIVE_ST.indexOf(s.status)>-1, rec=REC_ST.indexOf(s.status)>-1;
    var t=live?'In surgery · '+pvxEsc(s.room):rec?'Recovery':pvxEsc(s.room)+' · '+clock(s.sched).replace(' ',' ');
    return '<div class="fv-or-chip'+(live?' live':rec?' rec':'')+'" title="'+pvxEsc((s.proc||'Surgery')+' · '+(s.surgeon||'')+' · '+(s.label||''))+'"><i></i>'+t+'</div>'; };

  /* ---------- the drawer: Surgery ---------- */
  var SG_IC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 4.5l5 5L9 20H4v-5z"/><path d="M12.5 6.5l5 5"/></svg>';
  function card(p){ var s=p.orStatus, booked=s&&s.case&&s.status!=='cancelled';
    var head='<div class="rec-ic">'+SG_IC+'</div><div class="rec-title">Surgery</div>';
    if(!booked||(!open(s)&&!today(s))) return '<div class="rec-card fv-or-card"><div class="rec-head">'+head+'<button class="rec-req" type="button" data-fvor="book">Book surgery…</button></div></div>';
    var st=LIVE_ST.indexOf(s.status)>-1?'live':REC_ST.indexOf(s.status)>-1?'rec':DONE_ST.indexOf(s.status)>-1?'done':'sched';
    var chip='<span class="rec-chip fv-or-st '+st+'">'+pvxEsc(st==='done'?(s.dest?'Done · '+s.dest:'Done'):s.label||'Scheduled')+'</span>';
    var when=(today(s)?'':String(s.date||'').slice(5).replace('-','/')+' ')+clock(s.sched);
    var line=[s.proc,s.room,st==='sched'?when:st==='live'?'in '+clock(s.in):st==='rec'?'out '+clock(s.out):'',s.surgeon].filter(Boolean).map(pvxEsc).join(' · ');
    return '<div class="rec-card fv-or-card"><div class="rec-head">'+head+chip+'<a class="rec-link" href="'+caseLink(s.case)+'" target="_blank" rel="noopener">Open in OR</a></div><div class="rec-summary">'+line+'</div></div>'; }
  function mount(p){ var m=document.getElementById('fvOrMount');
    if(!m){ var r=document.getElementById('recordsMount'); if(!r) return; m=document.createElement('div'); m.id='fvOrMount'; r.insertAdjacentElement('afterend',m); }
    if(!p||p._demo&&!window.FV_OR_DEMO){ m.innerHTML=''; return; } m.innerHTML=card(p); m.setAttribute('data-pid',p.id); }
  if(typeof fillDrawer==='function'){ 
    pvxAfter('fillDrawer',function(p){ try{ if(ok()||window.FV_OR_DEMO) mount(p); }catch(e){ console.warn('[flow OR card]',e); } },'#24'); }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('[data-fvor="book"]'); if(!b) return; e.preventDefault();
    var m=document.getElementById('fvOrMount'), id=m&&m.getAttribute('data-pid'), p=id&&PATIENTS.find(function(x){ return String(x.id)===id; }); if(p) bookOpen(p); });

  /* ---------- Book surgery ---------- */
  var BK=null;
  function seg(name,opts,val){ return '<div class="ap-seg fv-or-seg" data-seg="'+name+'" style="grid-template-columns:repeat('+opts.length+',1fr)">'+opts.map(function(o){ return '<button type="button" class="ap-seg-btn'+(o[0]===val?' active':'')+'" data-v="'+pvxEsc(o[0])+'">'+pvxEsc(o[1])+'</button>'; }).join('')+'</div>'; }
  function segVal(name){ var b=document.querySelector('#fvOrModal [data-seg="'+name+'"] .active'); return b?b.getAttribute('data-v'):''; }
  function ensureModal(){ if(document.getElementById('fvOrModal')) return;
    var sc=document.createElement('div'); sc.className='addpt-scrim'; sc.id='fvOrScrim'; sc.onclick=bookClose;
    var md=document.createElement('div'); md.className='addpt-modal fv-or-modal'; md.id='fvOrModal'; md.setAttribute('role','dialog'); md.setAttribute('aria-modal','true'); md.setAttribute('aria-labelledby','fvOrTitle');
    md.innerHTML='<div class="addpt-head"><div class="aph-title"><span class="aph-ic">'+SG_IC+'</span><div><div class="aph-t" id="fvOrTitle">Book surgery</div><div class="aph-sub" id="fvOrSub"></div></div></div>'
      +'<button class="close" type="button" aria-label="Close" data-fvor-x><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>'
      +'<div class="addpt-body" id="fvOrBody"></div><div class="addpt-foot" id="fvOrFoot"></div>';
    document.body.appendChild(sc); document.body.appendChild(md);
    md.addEventListener('click',function(e){ var x=e.target.closest('[data-fvor-x]'); if(x){ bookClose(); return; } var b=e.target.closest('.fv-or-seg .ap-seg-btn'); if(!b) return;
      b.parentNode.querySelectorAll('.ap-seg-btn').forEach(function(y){ y.classList.toggle('active',y===b); }); if(b.parentNode.getAttribute('data-seg')==='type'&&b.getAttribute('data-v')==='emergency') pickRoomFor('GDV Surgery'); });
    md.addEventListener('keydown',function(e){ if(e.key==='Escape'){ e.stopPropagation(); bookClose(); } }); }
  function pickRoomFor(proc){ var sv=PROC[proc]||'Soft Tissue', r=/Orthopedics|Neurology/.test(sv)?'or1':'or2';
    document.querySelectorAll('#fvOrModal [data-seg="room"] .ap-seg-btn').forEach(function(y){ y.classList.toggle('active',y.getAttribute('data-v')===r); }); }
  function bookOpen(p){ ensureModal(); BK={p:p}; var d=new Date(), nowM=d.getHours()*60+d.getMinutes(), def=Math.min(21*60,Math.ceil((nowM+60)/15)*15), times=[];
    for(var m=7*60;m<=22*60;m+=15) times.push(m);
    var days=[[isoDay(d),'Today']]; for(var i=1;i<=7;i++){ var x=new Date(d); x.setDate(d.getDate()+i); days.push([isoDay(x),i===1?'Tomorrow':x.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})]); }
    document.getElementById('fvOrSub').textContent=((p.name||'')+' '+(p.last||'')).trim();
    document.getElementById('fvOrBody').innerHTML=
      '<div class="ap-sect"><h4>Procedure</h4><div class="ap-grid c2"><div class="ap-field"><label for="fvOrProc">Procedure</label><input class="ap-input" id="fvOrProc" list="fvOrProcs" placeholder="e.g. Foreign Body Removal" autocomplete="off" value="'+pvxEsc(/foreign body/i.test(p.reason||'')?'Foreign Body Removal':'')+'"><datalist id="fvOrProcs">'+Object.keys(PROC).map(function(k){ return '<option value="'+pvxEsc(k)+'">'; }).join('')+'</datalist></div>'
      +'<div class="ap-field"><label>Side</label>'+seg('lat',[['','None'],['Left','Left'],['Right','Right'],['Bilateral','Both']],'')+'</div></div></div>'
      +'<div class="ap-sect"><h4>Team &amp; room</h4><div class="ap-grid c2"><div class="ap-field"><label>Surgeon</label>'+seg('surgeon',SURGEONS.map(function(s){ return [s.id,s.name]; }),'')+'</div>'
      +'<div class="ap-field"><label>Room</label>'+seg('room',ROOMS.map(function(r){ return [r.id,r.name]; }),'or2')+'</div></div></div>'
      +'<div class="ap-sect"><h4>When</h4><div class="ap-grid c3"><div class="ap-field"><label for="fvOrDate">Day</label><select class="ap-input ap-select" id="fvOrDate">'+days.map(function(x){ return '<option value="'+x[0]+'">'+pvxEsc(x[1])+'</option>'; }).join('')+'</select></div>'
      +'<div class="ap-field"><label for="fvOrTime">Time</label><select class="ap-input ap-select" id="fvOrTime">'+times.map(function(m){ return '<option value="'+m+'"'+(m===def?' selected':'')+'>'+minClock(m)+'</option>'; }).join('')+'</select></div>'
      +'<div class="ap-field"><label for="fvOrDur">About</label><select class="ap-input ap-select" id="fvOrDur">'+[30,45,60,75,90,120,150,180,240].map(function(m){ return '<option value="'+m+'"'+(m===90?' selected':'')+'>'+(m<60?m+' min':(m%60?Math.floor(m/60)+' h '+m%60+' min':m/60+' h'))+'</option>'; }).join('')+'</select></div></div>'
      +'<div class="ap-field" style="margin-top:13px"><label>Type</label>'+seg('type',[['scheduled','Scheduled'],['addon','Add-on'],['emergency','Emergency']],'addon')+'</div></div>'
      +'<div class="ap-sect"><h4>Note <span style="text-transform:none;letter-spacing:0;font-weight:500">· optional</span></h4><input class="ap-input" id="fvOrNote" placeholder="Anything the OR team should know"></div>'
      +'<div class="fv-or-err" id="fvOrErr" role="alert"></div>';
    document.getElementById('fvOrFoot').innerHTML='<button class="btn" type="button" data-fvor-x>Cancel</button><button class="btn primary" type="button" id="fvOrGo">Book surgery</button>';
    document.getElementById('fvOrGo').onclick=bookSave;
    var pr=document.getElementById('fvOrProc'); pr.addEventListener('change',function(){ if(PROC[pr.value]) pickRoomFor(pr.value); }); if(pr.value) pickRoomFor(pr.value);
    document.getElementById('fvOrScrim').classList.add('open'); document.getElementById('fvOrModal').classList.add('open'); setTimeout(function(){ pr.focus(); },60); }
  function bookClose(){ var a=document.getElementById('fvOrScrim'), b=document.getElementById('fvOrModal'); if(a) a.classList.remove('open'); if(b) b.classList.remove('open'); BK=null; }
  function err(t){ var e=document.getElementById('fvOrErr'); if(e) e.textContent=t||''; }
  function bookSave(){ if(!BK) return; var p=curP(BK.p), proc=(document.getElementById('fvOrProc').value||'').trim(), sg=segVal('surgeon');
    if(!proc){ err('Enter the procedure.'); document.getElementById('fvOrProc').focus(); return; }
    if(!sg){ err('Choose the surgeon.'); return; }
    var lat=segVal('lat')||null, type=segVal('type')||'scheduled', room=segVal('room')||'or2', date=document.getElementById('fvOrDate').value, sched=+document.getElementById('fvOrTime').value, dur=+document.getElementById('fvOrDur').value, note=(document.getElementById('fvOrNote').value||'').trim();
    var who=pvxMe(), at=new Date(), nm=at.getHours()*60+at.getMinutes(), id='c'+at.getTime().toString(36);
    var s={id:id, procedure:proc, laterality:lat, service:PROC[proc]||'Soft Tissue', surgeonId:sg, anesthesiaId:null, techId:null, assistantIds:[], roomId:room, date:date, sched:sched, dur:dur,
      type:type, priority:type==='emergency'?'emergency':type==='addon'?'urgent':'routine', asa:null, status:'scheduled', events:[{status:'scheduled',t:date===isoDay(at)?nm:0}],
      readiness:{}, rman:{}, readinessNotes:{}, delay:null, timeout:{done:false,t:null,checks:{}}, intraop:[], implants:[], specimens:[], kura:[], drugs:[], anesthesia:null, recovery:{}, record:null, prefCardId:null,
      notes:note, src:'flow', bookedBy:who.name, bookedUid:who.uid, bookedAt:at.toISOString()};
    var go=document.getElementById('fvOrGo'); go.disabled=true; go.textContent='Booking…'; err('');
    if(window.FV_OR_DEMO){ p.orStatus=statusOf(s); bookClose(); done(p,s); return; }
    var board=(p.status==='Hospitalized'||p.status==='Admitted'||(p.tsSheet&&p.tsSheet.board==='IP'))?'IP':'OP';
    Promise.resolve(fvAdmitSheet.ensure(p,board,{quiet:true})).then(function(res){ if(res==='error'||res==='closed'||res==null) throw new Error('sheet:'+res);
      var ref=DB.collection('sheets').doc(fvAdmitSheet.id(p)), FV=firebase.firestore.FieldValue;
      return DB.runTransaction(function(t){ return t.get(ref).then(function(snap){ var d=snap.exists&&snap.data(); if(!d) throw new Error('no sheet');
        var old=d.surgery; if(old&&open(old)&&old.id) throw new Error('booked:'+(old.procedure||''));
        var upd={surgery:s, updated_at:at.toISOString(), updated_by:who.initials,
          audit:FV.arrayUnion({at:at.toISOString(),type:'doctor',desc:'Surgery booked in Flow — <b>'+pvxEsc(proc+(lat?' — '+lat:''))+'</b> · '+pvxEsc((ROOMS.find(function(r){ return r.id===room; })||{}).name||'OR')+' · '+minClock(sched)+' · '+pvxEsc((SURGEONS.find(function(x){ return x.id===sg; })||{}).name||''),who:who.initials,uid:who.uid})};
        if(old&&old.id) upd.surgery_past=FV.arrayUnion(old);
        var al=p.intake&&p.intake.allergies; if(al&&String(al).trim()) upd['patient.allergies']=String(al).trim().slice(0,200);
        t.update(ref,upd); }); }); })
    .then(function(){ var os=statusOf(s); p.orStatus=os; DB.collection('visits').doc(String(p.id)).update({or_status:Object.assign({},os,{at:at.toISOString(),by:who.name})}).catch(function(e){ console.warn('[flow → OR status]',e); });
      bookClose(); done(p,s); })
    .catch(function(e){ console.warn('[book surgery]',e); go.disabled=false; go.textContent='Book surgery'; var m=String(e&&e.message||'');
      err(m.indexOf('booked:')===0?'There’s already a surgery booked for '+(p.name||'this patient')+' ('+m.slice(7)+'). Change it in the OR.':'Couldn’t book it — check the connection and try again.'); }); }
  function statusOf(s){ var r=ROOMS.find(function(x){ return x.id===s.roomId; })||ROOMS[1], sg=SURGEONS.find(function(x){ return x.id===s.surgeonId; });
    var d=new Date(s.date+'T00:00:00'); d.setMinutes(s.sched);
    return {case:s.id,status:'scheduled',label:'Scheduled',stage:'scheduled',room:r.name,proc:s.procedure+(s.laterality?' — '+s.laterality:''),surgeon:sg?sg.name:'',date:s.date,sched:d.toISOString(),in:null,out:null,dest:null,sent:false}; }
  function done(p,s){ try{ p.timeline=p.timeline||[]; p.timeline.push({label:'Surgery booked',at:new Date(),meta:s.procedure+' · '+(statusOf(s).room)+' · '+minClock(s.sched)}); }catch(e){}
    try{ notify('Surgery booked', pvxEsc(p.name||'Patient')+' · '+pvxEsc(s.procedure)+' · <a href="'+caseLink(s.id)+'" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700;text-decoration:none">Open in OR ›</a>',{icon:'info',color:'var(--accent)',dur:8000}); }catch(e){}
    try{ if(typeof renderAll==='function') renderAll(); }catch(e){} try{ if(typeof fillDrawer==='function'&&typeof activePatient!=='undefined'&&activePatient===p.id) fillDrawer(p); else mount(p); }catch(e){} }
  window.fvBookSurgery=bookOpen;

  /* ---------- Rounds: the surgery, once per case ---------- */
  function roundsLine(p){ var s=p.orStatus, r=p.rounds; if(!s||!s.case||!r||r.outcome||!Array.isArray(r.events)||DONE_ST.indexOf(s.status)<0) return;
    var eid='or_'+s.case, added=false;   /* n118: the surgery line, then each intra-op event and the recovery, once each */
    function put(id,at,text,by){ if(r.events.some(function(e){ return e&&e.id===id; })) return; r.events.push({id:id,at:at,text:text,by:by||null,kind:'clinical'}); added=true; }
    var bits=[s.proc,s.surgeon,s.room].filter(Boolean), tm=[s.in?'in '+clock(s.in):'',s.out?'out '+clock(s.out):''].filter(Boolean).join(', ');
    put(eid,(s.out||s.at||new Date().toISOString()),'Surgery — '+bits.join(' · ')+(tm?' · '+tm:'')+(s.dest?' → '+s.dest:''),s.surgeon);
    (Array.isArray(s.notes)?s.notes:[]).slice(0,8).forEach(function(n,i){ if(n&&n.text) put(eid+'_i'+i,(n.at||s.out||s.at||new Date().toISOString()),'Intra-op — '+String(n.text),s.surgeon); });
    var c=s.rec; if(c){ var rb=[c.ext?'extubated '+clock(c.ext):'',c.temp?'T '+c.temp:'',c.pain?'pain '+c.pain:'',c.o2?'O₂ '+c.o2:'',c.incision?'incision '+String(c.incision).toLowerCase():'',
        c.meds?'meds: '+c.meds:'',c.complications&&!/^none\.?$/i.test(String(c.complications).trim())?'complications: '+c.complications:''].filter(Boolean);
      if(rb.length) put(eid+'_rec',(c.at||s.out||s.at||new Date().toISOString()),'Recovery — '+rb.join(' · '),null); }
    if(!added) return;
    r.events.sort(function(x,y){ return new Date(x.at)-new Date(y.at); });
    try{ if(typeof rdTouch==='function') rdTouch(p,'Surgery from OR'); }catch(e){} }
  setInterval(function(){ if(!ok()||typeof PATIENTS==='undefined') return; try{ PATIENTS.forEach(function(p){ if(p&&!p._demo&&p.orStatus) roundsLine(p); }); }catch(e){} },4000);
  window.fvOrRoundsLine=roundsLine;
  /* the portal nav in Treatment Sheets and OR links to Ultrasound and Rounds as Flow#app=ultrasound / #app=rounds */
  /* Flow hides its views while it opens straight into Rounds / Ultrasound (html.pvx-app-boot, set at the top of <body>), so the Flow
     board never flashes first: switch now, again once Flow's own start-up has run, then show the page */
  function bootDone(){ document.documentElement.classList.remove('pvx-app-boot'); }
  function appFromHash(keep){ var m=String(location.hash||'').match(/app=(rounds|ultrasound|flow)/); if(!m||typeof switchApp!=='function'){ if(keep!==true) bootDone(); return; }
    try{ switchApp(m[1]); if(keep!==true) history.replaceState(null,'',location.pathname+location.search); }catch(e){ console.warn('[nav]',e); }
    if(keep!==true) requestAnimationFrame(function(){ requestAnimationFrame(bootDone); }); }
  appFromHash(true);
  setTimeout(appFromHash,250); setTimeout(bootDone,2500); window.addEventListener('hashchange',appFromHash);
  /* Logout from any other Pravix page (Directory, SGVP, Scheduling…) lands on Flow at #logout: sign out here too, then Flow's sign-in */
  function logoutFromHash(){ if(!/(^#|&)logout\b/.test(String(location.hash||''))) return; try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    try{ if(typeof logout==='function') logout(); else if(typeof AUTH!=='undefined'&&AUTH) AUTH.signOut(); }catch(e){ console.warn('[logout]',e); } }
  setTimeout(logoutFromHash,600); window.addEventListener('hashchange',logoutFromHash);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 25 of 104 · no id ━━━━━ */
try{
/* ═════════ ROUNDS ⇄ TREATMENT SHEET — discharge (Oct 2026) ═════════
   The doctor plans the discharge in Rounds; whoever is with the patient discharges on the treatment sheet. One Discharge button.
     · Rounds → sheet: Discharge Readiness "Likely today" / "Possible today" and its checklist travel to the sheet
       (sheets/{id}.patient.discharge_plan). The sheet shows it in the header with the Discharge button, the IP Board row gets a chip,
       and the Rounds row says GOING HOME TODAY.
     · Sheet → everything else: when the sheet closes (charge check, then how the stay ended), the admission ends in Rounds
       (rounds.outcome → the Rounds archive), the board card goes, and the family tracker gets its ending (visit_end, from the outcome).
     · Rounds' "End admission…" sends an admitted patient with an open sheet to the sheet, so nobody discharges in two places.
   Staff-only: none of this is on the family tracker or the waiting-room screen (the tracker only sees the ending). */
(function(){
  if(typeof completePatient!=='function') return;
  var LOBBY=/[?&](display|tv|lobby)=?/.test(location.search);
  var TS_URL='/treatment/';
  /* how the stay ended on the sheet → the Rounds outcome (RD_OUTCOMES; 'Admitted in error' is its own ending) */
  var OUT={home:'Discharged',ama:'Discharged',transfer:'Transferred',euth:'Euthanized',died:'Deceased',error:'Admitted in error'};
  var LEGACY={discharged:'Discharged',transferred:'Transferred',deceased:'Deceased',cancelled:'Admitted in error'};
  var LIKELY={likely:'Likely today',possible:'Possible today'};
  function dk(d){ return d.getFullYear()+pvxPad2(d.getMonth()+1)+pvxPad2(d.getDate()); }
  function ok(){ return !LOBBY&&typeof DB!=='undefined'&&DB&&window.fvAdmitSheet&&!document.body.classList.contains('client-mode')&&!document.body.classList.contains('tv-mode'); }
  function signedIn(){ try{ return !!(AUTH&&AUTH.currentUser); }catch(e){ return false; } }
  function sid(p){ return fvAdmitSheet.id(p); }
  function inRounds(p){ return !!(p&&p.rounds&&typeof p.rounds==='object'&&!p.rounds.outcome); }
  function sheetLink(id,go){ return TS_URL+'#sheet='+encodeURIComponent(id)+(go?'&discharge=1':''); }

  /* ---------- Rounds → sheet: the plan ---------- */
  function planFor(p){ var r=p.rounds, d=r&&r.discharge; if(!d||!LIKELY[d.likely]) return null;
    var a=(r.audit||[]).slice().reverse().find(function(x){ return x&&/^Discharge · (likely|possible)/i.test(x.what||''); })||{};
    var list=(Array.isArray(d.checklist)?d.checklist:[]).filter(function(c){ return c&&c.label; }).slice(0,12).map(function(c){ return {t:String(c.label).slice(0,60),done:!!c.done}; });
    return {k:d.likely,label:LIKELY[d.likely],at:a.at||null,by:a.by||null,list:list}; }
  var lastPlan={};
  function syncPlan(p){
    if(!ok()||!p||p._demo||!inRounds(p)) return; var pl=planFor(p), sig=JSON.stringify(pl); if(lastPlan[p.id]===sig) return; lastPlan[p.id]=sig;
    var ref=DB.collection('sheets').doc(sid(p)), who=pvxMe(), now=new Date(), FV=firebase.firestore.FieldValue;
    DB.runTransaction(function(t){ return t.get(ref).then(function(snap){
      if(!snap.exists){ delete lastPlan[p.id]; return; }
      var d=snap.data()||{}, had=(d.patient&&d.patient.discharge_plan)||null; if(d.status==='closed') return;
      if(JSON.stringify(had)===sig) return;
      var upd={'patient.discharge_plan':pl,updated_at:now.toISOString(),updated_by:who.initials};
      if((had&&had.k)!==(pl&&pl.k)) upd.audit=FV.arrayUnion({at:now.toISOString(),type:'doctor',desc:pl?'Discharge planned in Rounds — <b>'+pvxEsc(pl.label)+'</b>':'Discharge plan cleared in Rounds',who:who.initials,uid:who.uid});
      t.update(ref,upd);
    }); }).catch(function(e){ delete lastPlan[p.id]; console.warn('[rounds→sheet discharge]',e); });
  }
  setInterval(function(){ if(!signedIn()||typeof PATIENTS==='undefined') return; try{ PATIENTS.forEach(function(p){ if(p&&p.rounds) syncPlan(p); }); }catch(e){} },8000);

  /* ---------- sheet → Rounds, board, tracker: the sheet closed ---------- */
  function outcomeOf(d){ var k=d&&d.outcome&&d.outcome.k; return OUT[k]||LEGACY[String(d&&d.closed_reason||'').toLowerCase()]||null; }
  function endAdmission(p,d){
    var type=outcomeOf(d); if(!type||!inRounds(p)) return false;
    var by=d.closed_by||(d.outcome&&d.outcome.by)||'Treatment sheet', at=d.closed_at||new Date().toISOString(), lab=(d.outcome&&d.outcome.label)||type;
    p.rounds.outcome={type:type,at:at,by:by};
    p.timeline=p.timeline||[]; p.timeline.push({label:type,at:new Date(at),meta:'Treatment sheet · '+by});
    try{ if(typeof rdExpanded!=='undefined'&&rdExpanded===p.id) rdExpanded=null; }catch(e){}
    try{ rdTouch(p,'Admission ended on the treatment sheet · '+lab); }catch(e){ try{ renderAll(); }catch(_){} }
    if(p.status==='Hospitalized'&&!p.completed){ try{ completePatient(p,(type==='Euthanized'||type==='Deceased')?type:'Discharged'); }catch(e){} }   /* a direct admit leaves the board too */
    try{ if(window.fvSheetSeen) fvSheetSeen(p,'closed'); }catch(e){}
    try{ notify(type==='Discharged'?'Went home':type,pvxEsc(((p.name||'')+' '+(p.last||'')).trim())+' · '+pvxEsc(lab)+' on the treatment sheet',{icon:'info',color:'var(--s-admitted)',dur:7000}); }catch(e){}
    return true; }
  var claimed={};
  /* one screen ends it: claim the closed sheet first (rounds_ended_at), so two Flow screens never write the ending twice */
  function onClosed(id,d){ if(claimed[id]||!d||d.status!=='closed'||d.rounds_ended_at) return;
    var p=(PATIENTS||[]).find(function(x){ return x&&!x._demo&&sid(x)===id; }); if(!p||!inRounds(p)||!outcomeOf(d)) return;
    claimed[id]=1; var ref=DB.collection('sheets').doc(id), now=new Date().toISOString();
    DB.runTransaction(function(t){ return t.get(ref).then(function(s){ var x=s.exists&&s.data(); if(!x||x.status!=='closed'||x.rounds_ended_at) return null;
        t.update(ref,{rounds_ended_at:now,rounds_ended_by:pvxMe().initials}); return x; }); })
      .then(function(x){ if(x) endAdmission(p,x); else delete claimed[id]; })
      .catch(function(e){ delete claimed[id]; console.warn('[sheet→rounds discharge]',e); }); }
  /* sheets closed today or yesterday (closed_on, written by the sheet) — a handful of documents, not the whole collection */
  var unsub=null, onDay=null;
  function listen(){ if(!ok()||!signedIn()) return; var now=new Date(), y=new Date(now.getTime()-86400000), key=dk(now); if(onDay===key&&unsub) return;
    if(unsub){ try{ unsub(); }catch(e){} unsub=null; } onDay=key;
    try{ unsub=DB.collection('sheets').where('closed_on','in',[key,dk(y)]).onSnapshot(function(q){ q.forEach(function(s){ onClosed(s.id,s.data()); }); },function(e){ console.warn('[sheet→rounds listen]',e); unsub=null; onDay=null; }); }catch(e){ unsub=null; onDay=null; } }
  setInterval(listen,15000); setTimeout(listen,2500);

  /* ---------- Rounds' End admission… → the sheet, when the patient has one open ---------- */
  if(typeof rdSetOutcome==='function'){
    pvxWrap('rdSetOutcome',function(origOutcome){ return function(p,type){
      if(!ok()||!p||p._demo) return origOutcome.apply(this,arguments);
      var self=this, args=arguments, id=sid(p);
      DB.collection('sheets').doc(id).get().then(function(s){ var d=s.exists&&s.data();
        if(!d||d.status!=='active') return origOutcome.apply(self,args);
        var nm=((p.name||'')+' '+(p.last||'')).trim();
        showConfirm('Discharge '+nm+' on the treatment sheet?','Open sheet',function(){ window.open(sheetLink(id,true),'_blank','noopener'); },
          {sub:'The sheet runs the charge check; Rounds and the board update by themselves.'});   /* PVX-N198 */
      }).catch(function(){ origOutcome.apply(self,args); });
    }; },'#25');
  }

  /* ---------- the Rounds row chip (admitted patients are on Rounds, not on the Flow board) ---------- */
  window.fvDisRowChip=function(p){ var r=p&&p.rounds, d=r&&r.discharge; if(!r||r.outcome||!d||d.likely!=='likely') return '';
    var L=Array.isArray(d.checklist)?d.checklist:[], n=L.filter(function(c){ return c&&c.done; }).length;
    return '<span class="rd-chip home" title="Discharge planned · discharged on the treatment sheet">GOING HOME TODAY'+(L.length?' · '+n+'/'+L.length:'')+'</span>'; };
  window.fvDischarge={syncPlan:syncPlan,planFor:planFor,onClosed:onClosed,endAdmission:endAdmission,outcomeOf:outcomeOf,listen:listen};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 26 of 104 · no id · PVX-OVERLAY n133 (n132 + initial ':self' + refocus after re-render): closed overlays are hidden and inert; ope ━━━━━ */
try{
/* ═══ Pravix shared overlay primitive · n132 ═══
   One behaviour for every modal, drawer, popover and scrim in the suite (audit FL-01, FL-06, DTA-S02, DTA-A05, DTA-C05, DTA-M01, CL-T05, CL-O11):
   · CLOSED means closed: once an overlay's exit transition has finished it gets `inert` + visibility:hidden (class .pvx-closed), so its
     controls leave the Tab order and the accessibility tree. Opacity, transform and pointer-events alone never hide anything from a keyboard.
   · OPEN means active: a modal overlay gets role=dialog + aria-modal, a name, an initial focus inside it, Tab/Shift+Tab kept inside,
     Escape → its own Cancel/Close control (so the app's own cancel logic decides about unsaved edits), and focus back to the opener on close.
   · The app keeps its own open/close code and classes; this watches the class and reacts. Nothing here reads or writes app data.
   Registry entries: {sel, open:'open'|['open','show'], modal:true, dialog:'.inner-card' (where the dialog semantics go), close:'.close,.btn.ghost',
     label:'…', labelFrom:'h2', initial:'input', escape:true, delay:450}
   A registered element is only ever marked closed when it is also visually invisible (opacity 0, display none, or outside the viewport),
   so a mis-registered element that is really on screen is never hidden by mistake. */
(function(){
  if(window.pvxOverlay) return;
  var REG=[], timers=new WeakMap(), st=new WeakMap(), last=new WeakMap(), known=new WeakMap(), stack=[];
  function closestRegistered(n){ while(n&&n.nodeType===1){ if(cfgFor(n)) return n; n=n.parentElement; } return null; }
  function cfgFor(el){ for(var i=REG.length-1;i>=0;i--){ try{ if(el.matches(REG[i].sel)) return REG[i]; }catch(e){} } return null; }
  function isOpen(el,r){ if(r.openWhen) return !!r.openWhen(el); var o=r.open||'open'; return (Array.isArray(o)?o:[o]).some(function(c){ return el.classList.contains(c); }); }
  function invisible(el){ var s=getComputedStyle(el); if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0) return true;
    var b=el.getBoundingClientRect(); return b.width===0||b.height===0||b.right<=0||b.left>=innerWidth||b.bottom<=0||b.top>=innerHeight; }
  function visibleEl(el){ if(!el||!el.isConnected) return false; var n=el; while(n&&n.nodeType===1){ var s=getComputedStyle(n); if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0) return false; n=n.parentElement; }
    var b=el.getBoundingClientRect(); return b.width>0&&b.height>0; }
  function focusables(el){ return [].slice.call(el.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex],[contenteditable=true]')).filter(function(f){
    if(f.disabled||f.getAttribute('tabindex')==='-1'||f.getAttribute('aria-hidden')==='true') return false; if(f.closest('.pvx-closed,[inert],[hidden]')) return false; return visibleEl(f); }); }
  function hideNow(el,r){ if(isOpen(el,r)||!invisible(el)) return false; el.classList.add('pvx-closed'); el.setAttribute('inert',''); el.setAttribute('data-pvx-closed','1'); return true; }
  /* wait for the exit transition, then hide; if it is still moving, keep checking for a while (a .5 s slide must not leave it exposed) */
  function settle(el,r){ clearTimeout(timers.get(el)); var tries=0, step=function(){ if(isOpen(el,r)) return; if(!hideNow(el,r)&&tries++<16) timers.set(el,setTimeout(step,150)); };
    timers.set(el,setTimeout(step,r.delay!=null?r.delay:300)); }
  function reveal(el){ clearTimeout(timers.get(el)); el.classList.remove('pvx-closed'); el.removeAttribute('inert'); el.removeAttribute('data-pvx-closed'); }
  function name(el,r){ if(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')) return;
    var h=r.labelFrom?el.querySelector(r.labelFrom):el.querySelector('h1,h2,h3,.drawer-head h2,.modal-title,.sheet-title');
    if(h&&h.textContent.trim()){ if(!h.id) h.id='pvxlbl_'+Math.random().toString(36).slice(2,8); el.setAttribute('aria-labelledby',h.id); }
    else if(r.label) el.setAttribute('aria-label',r.label); }
  function dialogEl(el,r){ return (r.dialog&&el.querySelector(r.dialog))||el; }
  function semantics(el,r){ if(r.modal===false) return; var d=dialogEl(el,r); if(!d.getAttribute('role')) d.setAttribute('role','dialog'); d.setAttribute('aria-modal','true'); name(d,r); }
  function onOpen(el,r){ reveal(el); semantics(el,r);
    var opener=document.activeElement; if(opener===document.body||opener===document.documentElement) opener=null;
    /* n133: the opener may already have been re-rendered away by the time this runs (a list that redraws when a row is picked) — fall back to what held focus a moment ago */
    if(!opener&&lastFocus.el&&Date.now()-lastFocus.at<1500&&!el.contains(lastFocus.el)) opener=lastFocus.el;
    if(opener&&el.contains(opener)) opener=(st.get(el)||{}).opener||null;
    /* opened from inside another overlay (a menu item, say): remember that overlay's own opener as the fallback return point */
    var host=opener&&opener.closest?closestRegistered(opener.parentElement):null, opener2=host?(last.get(host)||{}).opener||null:null;
    st.set(el,{opener:opener,opener2:opener2,key:openerKey(opener),at:Date.now()}); last.set(el,{opener:opener,opener2:opener2,key:openerKey(opener)}); if(stack.indexOf(el)<0) stack.push(el);
    if(r.modal===false&&!r.focus) return;
    setTimeout(function(){ if(!isOpen(el,r)||!el.isConnected) return; var a=document.activeElement; if(a&&el.contains(a)) return;   /* the app already placed focus: keep it */
      var f=focusables(el), t=r.initial===':self'?el:(r.initial?el.querySelector(r.initial):null);
      if(t===el&&!el.hasAttribute('tabindex')) el.setAttribute('tabindex','-1');
      if(t&&!visibleEl(t)) t=null;
      t=t||f.filter(function(x){ return /^(INPUT|SELECT|TEXTAREA)$/.test(x.tagName)&&!/^(checkbox|radio|file)$/.test(x.type); })[0]||f.filter(function(x){ return !/close|cancel|dismiss/i.test((x.getAttribute('aria-label')||'')+' '+x.className+' '+x.textContent); })[0]||f[0];
      if(!t){ if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','-1'); t=el; }
      try{ t.focus({preventScroll:true}); }catch(e){} },r.focusDelay!=null?r.focusDelay:80); }
  /* n133: a selector that finds the opener again after the list it sits in re-renders (same id, or same data-pid/data-loc/data-id with the same classes) */
  function openerKey(o){ if(!o||!o.getAttribute) return null; if(o.id) return '#'+CSS.escape(o.id); var ks=['data-pid','data-loc','data-id','data-key'];
    for(var i=0;i<ks.length;i++){ var v=o.getAttribute(ks[i]); if(v){ var cls=(o.className&&typeof o.className==='string')?o.className.trim().split(/\s+/).map(function(c){ return '.'+CSS.escape(c); }).join(''):''; return o.tagName.toLowerCase()+cls+'['+ks[i]+'="'+v.replace(/"/g,'\\"')+'"]'; } } return null; }
  /* n133: the list the opener sits in may redraw right after the overlay closes (the app clears its selection) — if that drops focus, find the opener again by its key */
  function keepOn(key){ if(!key) return; [120,320,650].forEach(function(ms){ setTimeout(function(){ var a=document.activeElement; if(a&&a!==document.body&&a!==document.documentElement) return; if(topModal()) return;
      try{ var o=document.querySelector(key); if(o&&visibleEl(o)) o.focus({preventScroll:true}); }catch(e){} },ms); }); }
  var lastFocus={el:null,at:0}; document.addEventListener('focusin',function(e){ var x=e.target; if(x&&x!==document.body&&x!==document.documentElement) lastFocus={el:x,at:Date.now()}; },true);
  function onClose(el,r){ var s=st.get(el)||{}; st.delete(el); var i=stack.indexOf(el); if(i>-1) stack.splice(i,1); settle(el,r);
    var a=document.activeElement; if(a&&a!==document.body&&!el.contains(a)) return;   /* the app moved focus somewhere sensible already */
    var cands=[s.opener,s.opener2]; if(s.key){ try{ var again=document.querySelector(s.key); if(again) cands.splice(1,0,again); }catch(e){} }
    for(var k=0;k<cands.length;k++){ var o=cands[k]; if(o&&o.isConnected&&visibleEl(o)&&!o.closest('.pvx-closed,[inert]')){ try{ o.focus({preventScroll:true}); keepOn(s.key); return; }catch(e){} } }
    var top=topModal(); if(top){ var f=focusables(top)[0]||top; try{ f.focus({preventScroll:true}); }catch(e){} return; }
    var m=document.querySelector('main,[role=main]')||document.body; if(m!==document.body&&!m.hasAttribute('tabindex')) m.setAttribute('tabindex','-1'); try{ m.focus({preventScroll:true}); }catch(e){} }
  function sync(el){ var r=cfgFor(el); if(!r||!el.isConnected) return; var o=isOpen(el,r), was=known.get(el);
    if(was===undefined){ known.set(el,o); if(o){ reveal(el); semantics(el,r); if(stack.indexOf(el)<0) stack.push(el); } else settle(el,r); return; }
    if(o===was) return; known.set(el,o); if(o) onOpen(el,r); else onClose(el,r); }
  function otherDialogOpen(top){ var own=dialogEl(top,cfgFor(top)||{}); return [].slice.call(document.querySelectorAll('[role=dialog],[aria-modal=true]')).some(function(d){ return d!==top&&d!==own&&!d.contains(top)&&!d.closest('.pvx-closed,[inert]')&&visibleEl(d); }); }   /* a dialog nested inside the top one (an end-of-visit sheet in a drawer) counts too */
  function topModal(){ for(var i=stack.length-1;i>=0;i--){ var el=stack[i], r=cfgFor(el); if(el.isConnected&&r&&r.modal!==false&&isOpen(el,r)&&!invisible(el)) return el; } return null; }
  /* n133: when an open modal re-renders the element that held focus, the browser drops focus to <body> silently (no blur event); bring it back to the modal container */
  var refocusT; function refocus(){ clearTimeout(refocusT); refocusT=setTimeout(function(){ var top=topModal(); if(!top) return; var a=document.activeElement; if(a&&a!==document.body&&a!==document.documentElement) return;
    if(!top.hasAttribute('tabindex')) top.setAttribute('tabindex','-1'); try{ top.focus({preventScroll:true}); }catch(x){} },60); }
  var mo=new MutationObserver(function(ms){ var lost=false; ms.forEach(function(m){ if(m.type==='childList'&&m.removedNodes.length) lost=true; if(m.type==='attributes'){ sync(m.target); }
    else m.addedNodes.forEach(function(n){ if(n.nodeType!==1) return; if(cfgFor(n)) { observe(n); sync(n); } n.querySelectorAll&&REG.forEach(function(r){ n.querySelectorAll(r.sel).forEach(function(x){ observe(x); sync(x); }); }); }); }); if(lost) refocus(); });
  function observe(el){ if(el.__pvxObs) return; el.__pvxObs=1; mo.observe(el,{attributes:true,attributeFilter:['class','style','hidden','aria-hidden']}); }
  function scan(){ REG.forEach(function(r){ document.querySelectorAll(r.sel).forEach(function(el){ observe(el); sync(el); }); }); }
  /* on window, capture phase: runs before the app's own document listeners whatever the event's target */
  window.addEventListener('keydown',function(e){
    if(e.defaultPrevented) return; var top=topModal(); if(!top) return; var r=cfgFor(top);
    if(e.key==='Escape'){ var ae=document.activeElement; if(ae&&ae.getAttribute&&((ae.getAttribute('role')==='combobox'&&ae.getAttribute('aria-expanded')==='true')||ae.hasAttribute('data-pvx-esc'))) return; }   /* PVX-N214: an open list (or a selected token) takes Esc first */
    /* another dialog is open above this one (one the app mounts on demand and manages itself): leave the keys to the app */
    if(otherDialogOpen(top)) return;
    if(e.key==='Tab'){ var f=focusables(top); if(!f.length){ e.preventDefault(); try{ top.focus(); }catch(x){} return; }
      var a=document.activeElement, i=f.indexOf(a);
      if(i<0||!top.contains(a)){ e.preventDefault(); f[e.shiftKey?f.length-1:0].focus(); return; }
      if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); } else if(e.shiftKey&&i===0){ e.preventDefault(); f[f.length-1].focus(); } }
    else if(e.key==='Escape'&&r.escape!==false){ var c=null; (r.close||'.close,[data-close],.btn.ghost,[aria-label^="Close"],[aria-label^="Cancel"]').split(',').some(function(s){ var cands=[].slice.call(top.querySelectorAll(s.trim())).filter(visibleEl); if(cands.length){ c=cands[0]; return true; } return false; });
      if(typeof r.onEscape==='function'){ e.preventDefault(); r.onEscape(top); } else if(c){ e.preventDefault(); c.click(); } }
  },true);
  /* a focus that lands in a closed overlay anyway (programmatic focus from the app) is sent back to the page */
  document.addEventListener('focusin',function(e){ var el=e.target&&e.target.closest&&e.target.closest('.pvx-closed'); if(!el) return; var top=topModal(); var f=top?(focusables(top)[0]||top):(document.querySelector('main,[role=main]')||document.body); try{ f.focus({preventScroll:true}); }catch(x){} },true);
  window.pvxOverlay={register:function(list){ (list||[]).forEach(function(r){ if(r&&r.sel) REG.push(r); }); if(document.body){ scan(); mo.observe(document.body,{childList:true,subtree:true}); } else document.addEventListener('DOMContentLoaded',function(){ scan(); mo.observe(document.body,{childList:true,subtree:true}); });
    window.addEventListener('load',scan); },
    scan:scan, top:topModal, focusables:focusables, _reg:REG, _state:function(el){ return st.get(el)||null; }, version:'n133'};
})();

pvxOverlay.register([{"sel": ".addpt-modal,.intake-modal,.us-modal", "open": "open", "modal": true, "close": ".close,.btn.ghost,[data-fvor-x]"}, {"sel": ".confirm", "open": "open", "modal": true, "close": "#confirmCancel,.btn.ghost", "label": "Confirm"}, {"sel": "aside.drawer,#drawer,#locDrawer", "open": "open", "modal": true, "close": ".drawer-head .close,.close", "initial": ":self"}, {"sel": ".scrim,.confirm-scrim,.ops-scrim,.us-scrim,.intake-scrim,.addpt-scrim", "open": "open", "modal": false}, {"sel": ".ops-menu", "open": "open", "modal": false, "escape": false}, {"sel": "#fvPanel", "open": "show", "modal": false, "escape": false}, {"sel": ".dd-panel", "open": "open", "modal": false, "escape": false}]);
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 27 of 104 · pvx-app-links-js · PVX-TOPBAR n132: brand and controls keep their width; app links overflow into a More menu; Grid and Forms in e ━━━━━ */
try{
/* n132: Grid and Forms links show only for the accounts those apps let in (keep in step with grid/index.html and forms/index.html ALLOWED) */
(function(){var OK={navGrid:["daniel.giordano@pravix.app"],navForms:["daniel.giordano@pravix.app"]};
function show(e){e=String(e||"").toLowerCase();Object.keys(OK).forEach(function(id){var a=document.getElementById(id);if(a)a.style.display=OK[id].indexOf(e)>-1?"":"none"})}
function fromStore(){try{if(!window.indexedDB||!indexedDB.databases)return;indexedDB.databases().then(function(l){if(!l.some(function(d){return d.name==="firebaseLocalStorageDb"}))return;var r=indexedDB.open("firebaseLocalStorageDb");r.onsuccess=function(){var db=r.result;try{if(!db.objectStoreNames.contains("firebaseLocalStorage")){db.close();return}var q=db.transaction("firebaseLocalStorage","readonly").objectStore("firebaseLocalStorage").getAll();q.onsuccess=function(){var e="";(q.result||[]).forEach(function(x){if(x&&String(x.fbase_key||"").indexOf("firebase:authUser:")===0&&x.value&&x.value.email)e=x.value.email});show(e);db.close()};q.onerror=function(){db.close()}}catch(_){try{db.close()}catch(__){}}}}).catch(function(){})}catch(_){}}
var hooked=false;function live(){if(hooked)return;try{if(window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth){hooked=true;firebase.auth().onAuthStateChanged(function(u){if(u)show(u.email);else fromStore()})}}catch(_){}}
fromStore();live();window.addEventListener("load",function(){live();setTimeout(live,1500)})})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 28 of 104 · no id ━━━━━ */
try{
/* ═══ Pravix shared top bar · n132 (audit RX-01, FL-07, DTA-S01, CL-X02, US-04) ═══
   The same nav.topnav lives in every app. This block makes it fit any width without collisions:
   · the brand and the Logout/theme group keep their real width (grid: max-content · 1fr · max-content) — nothing can slide under them;
   · the app links get the middle; the ones that do not fit move into a "More" menu (a real button with a menu of the same links),
     instead of being clipped inside a scroller with its scrollbar hidden. The active app always stays visible;
   · the More menu is keyboard-operable (Enter/Space, arrows, Escape, focus return) and closed state is display:none;
   · aria-current="page" follows the active link (apps that switch in place call pvxTopbar.setActive(id)). */
(function(){
  if(window.pvxTopbar) return;
  var nav=document.querySelector('nav.topnav'); if(!nav) return;
  var center=nav.querySelector('.nav-center'); if(!center) return;
  var more=document.createElement('div'); more.className='pvx-more'; more.hidden=true;
  more.innerHTML='<button type="button" class="nav-item pvx-more-btn" aria-haspopup="true" aria-expanded="false" aria-label="More apps" title="More apps">'
    +'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>More</button>'
    +'<div class="pvx-more-menu" role="menu" aria-label="More apps" hidden></div>';
  center.appendChild(more); var btn=more.querySelector('button'), menu=more.querySelector('.pvx-more-menu');
  function items(){ return [].slice.call(center.querySelectorAll('.nav-item')).filter(function(a){ return a!==btn&&!a.classList.contains('pvx-more-btn'); }); }
  function shown(a){ return a.style.display!=='none'&&!a.hidden; }   /* account-gated links (Grid, Forms) are display:none until allowed */
  var gap=0, busy=false;
  function layout(){ if(busy) return; busy=true;
    try{ var ORD=['navDirectory','navAssets','navCurriculum','navSchedule','navFlow','navUltrasound','navTreatment','navRounds','navOR','navAnesia','navYakuri','navGrid','navForms'], all=items(), k=function(a){ var i=ORD.indexOf(a.id); return i<0?1000+all.indexOf(a):i; }; all=all.slice().sort(function(x,y){ return k(x)-k(y); });   /* n281: the apps keep the suite's order wherever they sit (the bar, More), whichever was current before */
      all.forEach(function(a){ center.insertBefore(a,more); a.removeAttribute('role'); });
      var vis=all.filter(shown); var PIN=['navGrid','navDirectory','navAssets','navUltrasound','navAnesia'];   /* PVX-N150: Grid always in More (unless it is the current app) · n281: Directory, Assets, Ultrasound and Anesia too (Daniel) */
      var pin=vis.filter(function(a){ return PIN.indexOf(a.id)>-1&&!(a.classList.contains('active')||a.getAttribute('aria-current')); }); vis=vis.filter(function(a){ return pin.indexOf(a)<0; });
      if(!vis.length&&!pin.length){ more.hidden=true; return; }
      gap=parseFloat(getComputedStyle(center).columnGap||getComputedStyle(center).gap)||0;
      more.hidden=true; var avail=center.clientWidth, w=vis.map(function(a){ return a.getBoundingClientRect().width; }), total=w.reduce(function(s,x){ return s+x; },0)+gap*(vis.length-1);
      if(!pin.length&&total<=avail+0.5){ menu.innerHTML=''; return; }
      more.hidden=false; var mw=more.getBoundingClientRect().width+gap, keep=0, used=0;
      for(var i=0;i<vis.length;i++){ if(used+w[i]+(i?gap:0)+mw<=avail){ used+=w[i]+(i?gap:0); keep++; } else break; }
      var active=vis.findIndex(function(a){ return a.classList.contains('active')||a.getAttribute('aria-current'); });
      if(active>=keep&&keep>0){ var a=vis.splice(active,1)[0]; vis.splice(keep-1,0,a); center.insertBefore(a,vis[keep]||more); }
      var hidden=vis.slice(keep).concat(pin); hidden.sort(function(x,y){ return all.indexOf(x)-all.indexOf(y); }); hidden.forEach(function(a){ menu.appendChild(a); a.setAttribute('role','menuitem'); });
      if(!hidden.length) more.hidden=true; }
    finally{ busy=false; } }
  function open(o){ var isOpen=!menu.hidden; if(o===undefined) o=!isOpen; if(o===isOpen) return; menu.hidden=!o; btn.setAttribute('aria-expanded',o?'true':'false');
    if(o){ var f=menu.querySelector('.nav-item'); if(f) f.focus(); } }
  btn.addEventListener('click',function(){ open(); });
  menu.addEventListener('keydown',function(e){ var f=[].slice.call(menu.querySelectorAll('.nav-item')), i=f.indexOf(document.activeElement);
    if(e.key==='ArrowDown'){ e.preventDefault(); (f[i+1]||f[0]).focus(); } else if(e.key==='ArrowUp'){ e.preventDefault(); (f[i-1]||f[f.length-1]).focus(); }
    else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); open(false); btn.focus(); } else if(e.key==='Tab'){ open(false); } });
  btn.addEventListener('keydown',function(e){ if(e.key==='ArrowDown'){ e.preventDefault(); open(true); } else if(e.key==='Escape'&&!menu.hidden){ e.preventDefault(); open(false); } });
  document.addEventListener('click',function(e){ if(!menu.hidden&&!more.contains(e.target)) open(false); },true);
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!menu.hidden&&!more.contains(document.activeElement)) open(false); });
  function setActive(id){ items().forEach(function(a){ var on=a.id===id; a.classList.toggle('active',on); if(on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); }); layout(); }
  /* keep aria-current in step with the visual active class, for apps that switch in place */
  items().forEach(function(a){ if(a.classList.contains('active')) a.setAttribute('aria-current','page'); else if(a.getAttribute('aria-current')==='page'&&!a.classList.contains('active')) a.removeAttribute('aria-current'); });
  var t; function soon(){ clearTimeout(t); t=setTimeout(layout,60); }
  if(window.ResizeObserver){ new ResizeObserver(soon).observe(nav); } window.addEventListener('resize',soon);
  new MutationObserver(function(ms){ if(ms.some(function(m){ return !more.contains(m.target); })) soon(); }).observe(center,{attributes:true,subtree:true,attributeFilter:['style','class','hidden']});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(soon); window.addEventListener('load',soon); layout();
  window.pvxTopbar={layout:layout,setActive:setActive,version:'n132'};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 29 of 104 · no id · PVX-N133: labels for every field (FL-05), keyboard entry points and a Move… menu in place of dragging (FL-02), ━━━━━ */
var PVX_MOVE_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>';
try{
(function(){
  /* FL-05 — a <label> without for= names the one control in its field container */
  function assoc(root){ (root||document).querySelectorAll('.ap-field label:not([for]),.field label:not([for]),.fv-field label:not([for]),.rd-field label:not([for]),.ct-field label:not([for]),.intake-field label:not([for])').forEach(function(l){
      if(l.querySelector('input,select,textarea')) return; var box=l.parentElement; if(!box) return;
      var ctl=box.querySelectorAll('input:not([type=hidden]):not([type=button]):not([type=submit]),select,textarea'); if(ctl.length!==1) return;
      var c=ctl[0]; if(!c.id) c.id='pvxf_'+Math.random().toString(36).slice(2,8); l.htmlFor=c.id; }); }
  /* FL-06 — icon-only close buttons say what they are */
  function closes(root){ (root||document).querySelectorAll('button.close:not([aria-label]),button.drawer-close:not([aria-label])').forEach(function(b){ if(!b.textContent.trim()) b.setAttribute('aria-label','Close'); }); }
  function run(){ try{ assoc(); closes(); }catch(e){} }
  var t; pvxWatch(function(){ clearTimeout(t); t=setTimeout(run,120); },{childList:true,subtree:true},document.documentElement);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run(); window.addEventListener('load',run);
  /* FL-02 — Open: the name buttons bubble to the row/card handlers the app already has; Enter/Space on the button is a click */
  /* FL-02 — Move…: the same moves a drop would make, with the same confirmations (moveStatus / canDropRoom + moveRoom) */
  var menu=null, opener=null;
  function closeMenu(){ if(menu){ menu.remove(); menu=null; } document.removeEventListener('click',onDoc,true); if(opener) opener.setAttribute('aria-expanded','false'); if(opener&&opener.isConnected){ try{ opener.focus(); }catch(e){} } opener=null; }
  function onDoc(e){ if(menu&&!menu.contains(e.target)&&e.target!==opener) closeMenu(); }
  function openMenu(btn){ closeMenu(); var pid=btn.getAttribute('data-pid'), kind=btn.getAttribute('data-kind'); var p=(typeof PATIENTS!=='undefined'?PATIENTS:[]).find(function(x){ return x.id===pid; }); if(!p) return;
    var items=[], title='';
    if(kind==='stage'){ title='Move '+p.name+' to'; (typeof STAGE_ORDER!=='undefined'?STAGE_ORDER:[]).forEach(function(st){ if(st===p.status) return; items.push({label:st,act:function(){ moveStatus(p,st); }}); }); }
    else { title='Move '+p.name+' to'; var rooms=(typeof ROOMS!=='undefined'?ROOMS:[]).concat(['Treatment']); rooms.forEach(function(rm){ if(rm===p.room) return; var ok=canDropRoom(p,rm); items.push({label:rm+(ok?'':' · occupied'),disabled:!ok,act:function(){ if(rm==='Comfort Room') showConfirm('Move patient to Comfort Room?','Move patient',function(){ moveRoom(p,rm); }); else moveRoom(p,rm); }}); }); }
    menu=document.createElement('div'); menu.className='pvx-menu'; menu.setAttribute('role','menu'); menu.setAttribute('aria-label',title);
    menu.innerHTML='<div class="pvx-mt">'+title.replace(/[&<>]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; })+'</div>';
    items.forEach(function(it){ var b=document.createElement('button'); b.type='button'; b.setAttribute('role','menuitem'); b.textContent=it.label; if(it.disabled) b.disabled=true; b.addEventListener('click',function(ev){ ev.stopPropagation(); var o=opener; closeMenu(); it.act(); }); menu.appendChild(b); });
    menu.addEventListener('keydown',function(ev){ var f=[].slice.call(menu.querySelectorAll('button:not([disabled])')), i=f.indexOf(document.activeElement);
      if(ev.key==='ArrowDown'){ ev.preventDefault(); (f[i+1]||f[0]).focus(); } else if(ev.key==='ArrowUp'){ ev.preventDefault(); (f[i-1]||f[f.length-1]).focus(); } else if(ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); closeMenu(); } else if(ev.key==='Tab'){ closeMenu(); } });
    document.body.appendChild(menu); opener=btn; btn.setAttribute('aria-expanded','true');   /* PVX-N206 */ var r=btn.getBoundingClientRect(); menu.style.left=Math.max(8,Math.min(r.left,innerWidth-menu.offsetWidth-8))+'px'; var top=r.bottom+6; if(top+menu.offsetHeight>innerHeight-8) top=Math.max(8,r.top-6-menu.offsetHeight); menu.style.top=top+'px';
    var first=menu.querySelector('button:not([disabled])'); if(first) first.focus(); setTimeout(function(){ document.addEventListener('click',onDoc,true); },0); }
  document.addEventListener('click',function(e){ var mv=e.target.closest&&e.target.closest('.pvx-move'); if(mv){ e.preventDefault(); e.stopPropagation(); openMenu(mv); return; } var op=e.target.closest&&e.target.closest('.pvx-open[data-loc]'); if(op){ e.stopPropagation(); if(typeof openLocDrawer==='function') openLocDrawer(op.getAttribute('data-loc')); } },true);
  /* the buttons sit inside draggable cards: a press-and-move still drags (the browser only clicks when the pointer stays put), so no drag guard is needed */
  window.pvxN133={openMenu:openMenu,closeMenu:closeMenu,assoc:assoc};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 30 of 104 · no id · PVX-N136: Rounds row toggle + keyboard for Rounds' role=button controls (RD-02); ultrasound queue keyboard reo ━━━━━ */
try{
(function(){
  function say(t){ var l=document.getElementById('pvxN136Live'); if(!l) return; l.textContent=''; setTimeout(function(){ l.textContent=t; },30); }
  /* RD-02: the name button toggles; after the census re-renders, focus goes back to the same patient's toggle */
  var refocus=null;
  document.addEventListener('click',function(e){ var t=e.target.closest&&e.target.closest('.rd-toggle'); if(t) refocus=t.dataset.pid; },true);
  if(typeof renderRdCensus==='function'){ var _r=renderRdCensus; renderRdCensus=function(){ var out=_r.apply(this,arguments); if(refocus){ var b=document.querySelector('.rd-toggle[data-pid="'+refocus+'"]'); refocus=null; if(b) b.focus({preventScroll:true}); } return out; }; }
  /* Rounds' own role=button controls (financial row, section headers…) had no key handling */
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ') return;
    var el=e.target; if(!el||!el.matches||!el.matches('#view-rd-census [role=button][data-act], #view-rd-archive [role=button][data-act]')) return;
    e.preventDefault(); if(el.dataset.pid) refocus=el.dataset.pid; if(typeof rdHandleAct==='function') rdHandleAct(el.dataset.act,el);
  });
  /* the case drawer is created on first open, in the same tick it opens, so the overlay primitive (n133) saw it already open and
     never moved focus into it: make sure it exists and is registered before it opens */
  if(typeof openUsxCase==='function'){ pvxBefore('openUsxCase',function(){ try{ if(typeof usxEnsureDrawer==='function') usxEnsureDrawer(); if(window.pvxOverlay&&pvxOverlay.scan) pvxOverlay.scan(); }catch(err){} },'#30'); }
  /* US-03: arrow keys on a grip move the case in the queue — the same renumbering a drop does */
  var toastT=null, usFocus=null;
  /* the queue re-renders again when the save echoes back; keep focus on the moved case's grip through those re-renders */
  function usBack(){ if(!usFocus||Date.now()>usFocus.until) return; var a=document.activeElement; if(a&&a!==document.body&&!(a.classList&&a.classList.contains('us-move'))) { usFocus=null; return; } var nb=document.querySelector(usFocus.sel); if(nb&&a!==nb) nb.focus({preventScroll:true}); }
  if(typeof renderUltrasound==='function'){ var _u=renderUltrasound; renderUltrasound=function(){ var out=_u.apply(this,arguments); usBack(); return out; }; }
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('.us-move')){ e.stopPropagation(); } },true);
  document.addEventListener('keydown',function(e){
    var b=e.target&&e.target.closest&&e.target.closest('.us-move'); if(!b) return;
    var k=e.key; if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].indexOf(k)<0) return;
    e.preventDefault(); e.stopPropagation();
    if(typeof usCanEdit!=='function'||!usCanEdit()) return;
    var ids=usQueue().map(function(x){ return x.id; }), id=b.dataset.move, i=ids.indexOf(id); if(i<0) return;
    var j=k==='Home'?0:k==='End'?ids.length-1:(k==='ArrowUp'||k==='ArrowLeft')?i-1:i+1; j=Math.max(0,Math.min(ids.length-1,j));
    var pt=PATIENTS.find(function(x){ return x.id===id; }), nm=(pt&&pt.name)||'Patient';
    if(j===i){ say(nm+' is already '+(i===0?'first':'last')+' in the queue.'); return; }
    ids.splice(j,0,ids.splice(i,1)[0]);
    ids.forEach(function(x,n){ var q=PATIENTS.find(function(y){ return y.id===x; }); if(q&&q.ultrasound) q.ultrasound.queuePosition=n+1; });
    var cls=b.classList.contains('um-rgrip')?'.um-rgrip':'.usb-grip';
    renderAll();
    usFocus={sel:cls+'.us-move[data-move="'+id+'"]',until:Date.now()+2000}; usBack();
    say(nm+' moved to position '+(j+1)+' of '+ids.length+'.');
    clearTimeout(toastT); toastT=setTimeout(function(){ try{ notify('Queue updated','Ultrasound order changed by Internal Medicine',{icon:'move',color:'var(--s-ultrasound)'}); }catch(err){} },1200);
  },true);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 31 of 104 · pvx-n144-js · PVX-N144 · Flow: tables, rooms, drawer, critical alert, New Patient, Client Display, selected state ━━━━━ */
try{
(function(){
  var $=function(s,r){ return (r||document).querySelector(s); }, $$=function(s,r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  /* FLOW-01: the table region is named and reachable; a hint appears only when columns are off screen */
  function tableRegion(){ var w=$('#view-list .tablewrap'); if(!w) return; if(!w.hasAttribute('role')){ w.setAttribute('role','region'); w.setAttribute('aria-label','Patients table'); w.tabIndex=0;
      var h=document.createElement('p'); h.className='pvx-tblhint'; h.id='pvxTblHint'; h.textContent='Scroll sideways for Status, Priority, Arrival and Wait.'; w.parentNode.insertBefore(h,w); w.setAttribute('aria-describedby','pvxTblHint'); }
    var over=w.scrollWidth>w.clientWidth+1, h2=$('#pvxTblHint'); if(h2) h2.classList.toggle('on',over); }
  /* FLOW-08: keep the alert under the app bar while it is on screen (it scrolls away with the page) */
  var ciRaf=0; function ciTop(){ ciRaf=0; var y=12;
    /* a dialog or drawer on top: the page behind is inert, so the alert keeps its original place instead of covering the dialog */
    if($('.addpt-modal.open, .intake-modal.open, .drawer.open, .confirm.open, .modal.open, .sheet.open')){ document.documentElement.style.setProperty('--pvx-ci-top','12px'); return; }
    $$('.topnav, .subnav').forEach(function(n){ if(n.offsetParent===null&&getComputedStyle(n).position!=='fixed') return; var b=n.getBoundingClientRect(); if(b.height&&b.bottom>0) y=Math.max(y,Math.round(b.bottom+8)); }); document.documentElement.style.setProperty('--pvx-ci-top',y+'px'); }
  function ciLater(){ if(!ciRaf) ciRaf=requestAnimationFrame(ciTop); }
  /* FLOW-13: arrival and priority are single-choice groups — roles, checked state, arrow keys */
  function radios(g,label){ if(!g) return; if(!g.dataset.pvxRg){ g.dataset.pvxRg='1'; g.setAttribute('role','radiogroup'); g.setAttribute('aria-label',label);
      g.addEventListener('keydown',function(e){ var k=e.key; if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].indexOf(k)<0) return; var bs=$$('button',g).filter(function(b){ return b.offsetParent!==null&&!b.disabled; }); var i=bs.indexOf(document.activeElement); if(i<0) return; e.preventDefault();
        var j=k==='Home'?0:k==='End'?bs.length-1:(i+((k==='ArrowRight'||k==='ArrowDown')?1:-1)+bs.length)%bs.length; bs[j].focus(); bs[j].click(); }); }
    $$('button',g).forEach(function(b){ var on=b.classList.contains('active'), c=on?'true':'false', ti=on?'0':'-1'; if(b.getAttribute('role')!=='radio') b.setAttribute('role','radio'); if(b.getAttribute('aria-checked')!==c) b.setAttribute('aria-checked',c); if(b.getAttribute('tabindex')!==ti) b.tabIndex=on?0:-1; }); }   /* PVX-N378 */
  /* FLOW-10 (state only), US-04, RD-05: the selected view / shift / filter is exposed, not only coloured */
  function selected(){ ['#switcher','#switcherUs','#switcherRd'].forEach(function(id){ $$(id+' .seg').forEach(function(b){ if(b.classList.contains('active')){ if(b.getAttribute('aria-current')!=='page') b.setAttribute('aria-current','page'); } else if(b.hasAttribute('aria-current')) b.removeAttribute('aria-current'); }); });
    $$('.rd-svcbtn').forEach(function(b){ var v=b.classList.contains('on')?'true':'false'; if(b.getAttribute('aria-pressed')!==v) b.setAttribute('aria-pressed',v); });
    radios($('#apArrival'),'Arrival type'); radios($('#apPrio'),'Priority'); tableRegion(); }
  var sRaf=0; function later(){ if(!sRaf) sRaf=requestAnimationFrame(function(){ sRaf=0; selected(); }); }
  function boot(){ selected(); ciTop();
    pvxWatch(function(ms){ for(var i=0;i<ms.length;i++){ var t=ms[i].target; if(t.nodeType===1&&(ms[i].type==='childList'||t.matches('.seg,.ap-seg-btn,.ap-prio-btn,.rd-svcbtn,#rdShiftSeg button'))){ later(); ciLater(); return; } if(ms[i].type==='attributes'&&t.nodeType===1&&/(^|\s)open(\s|$)/.test(t.className||'')!==/(^|\s)open(\s|$)/.test(ms[i].oldValue||'')) ciLater(); } },{subtree:true,childList:true,attributes:true,attributeOldValue:true,attributeFilter:['class']},document.body);
    addEventListener('scroll',ciLater,{passive:true,capture:true}); addEventListener('resize',function(){ ciLater(); later(); });
    /* FLOW-14: a blank name is marked on the field itself, stays until fixed, and is announced */
    var nm=$('#apName'), cb=$('#apCreate');
    if(nm&&cb){ nm.setAttribute('required',''); nm.setAttribute('aria-required','true'); var er=document.createElement('div'); er.className='pvx-fielderr'; er.id='apNameErr'; er.setAttribute('role','alert'); nm.parentNode.appendChild(er);
      var lab=nm.parentNode.querySelector('label'); if(lab&&!lab.htmlFor) lab.htmlFor='apName';
      cb.addEventListener('click',function(){ if(!String(nm.value||'').trim()){ nm.setAttribute('aria-invalid','true'); nm.setAttribute('aria-describedby','apNameErr'); er.textContent='Enter a patient name.'; setTimeout(function(){ try{ nm.focus(); }catch(e){} },0); } },true);
      nm.addEventListener('input',function(){ if(String(nm.value||'').trim()&&nm.getAttribute('aria-invalid')==='true'){ nm.removeAttribute('aria-invalid'); er.textContent=''; } }); }
    var tt=$('#toast'); if(tt&&!tt.hasAttribute('role')){ tt.setAttribute('role','status'); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 32 of 104 · pvx-n145-us-js · PVX-N145 · Ultrasound: focus return, request button, KPI badges ━━━━━ */
/* the case workspace / request editor re-render the queue and the board when they close, so the opening control is a new element:
   find it again by patient (the request button, the case row/card, then the patient's name) and focus it */
function pvxUsRefocus(pid,kind){ if(!pid) return; var a=document.activeElement; if(a&&a!==document.body&&a.id!=='stage'&&!(a.closest&&a.closest('.pvx-closed'))&&document.contains(a)&&a.offsetParent) return;
  var o=window.__pvxUsFrom; var c=[];
  if(o&&document.contains(o)&&o.offsetParent) c.push(o);
  if(kind==='req') c.push(document.querySelector('[data-usflag="'+pid+'"]'));
  ['[data-pid="'+pid+'"] .us-open','[data-pid="'+pid+'"][tabindex="0"]','[data-open="'+pid+'"]','tr[data-pid="'+pid+'"]','.usb-card[data-pid="'+pid+'"]','[data-pid="'+pid+'"] .pvx-open','.pvx-open[data-pid="'+pid+'"]','[data-usflag="'+pid+'"]'].forEach(function(s){ Array.prototype.forEach.call(document.querySelectorAll(s),function(e){ c.push(e); }); });
  for(var i=0;i<c.length;i++){ var e=c[i]; if(e&&e.offsetParent&&!(e.closest&&e.closest('[inert],.pvx-closed'))){ if(e.tabIndex<0&&!/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(e.tagName)) e.tabIndex=-1; try{ e.focus({preventScroll:false}); }catch(x){} if(document.activeElement===e) break; } }
 }
/* UR-05: case cards and rows without their own Open button (e.g. Completed rows) open the case with the keyboard too */
try{
(function(){ var SEL='.um-next,.um-rrow,.usb-card,#usxCompleted2 tr[data-pid],#usxCompleted tr[data-pid],.ums-detail';
  function pidOf(e){ return e.dataset.pid||e.dataset.open||((e.querySelector('[data-pid]')||{}).dataset||{}).pid; }
  function nameOf(pid){ try{ var p=PATIENTS.find(function(x){ return x.id===pid; }); return p?(p.name+' '+(p.last||'')).trim():''; }catch(e){ return ''; } }
  function wire(){ Array.prototype.forEach.call(document.querySelectorAll(SEL),function(e){ if(e.dataset.pvxCase) return; if(e.querySelector('.us-open,.pvx-open,button')) return; var pid=pidOf(e); if(!pid) return; e.dataset.pvxCase='1'; e.tabIndex=0; e.setAttribute('role','button'); var n=nameOf(pid); if(n) e.setAttribute('aria-label','Open ultrasound case: '+n); }); }
  document.addEventListener('keydown',function(ev){ var t=ev.target; if(!t||!t.matches||!t.matches(SEL)||!t.dataset.pvxCase) return; if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); window.__pvxUsFrom=t; t.click(); } });
  var raf=0; pvxWatch(function(){ if(!raf) raf=requestAnimationFrame(function(){ raf=0; wire(); }); },{childList:true,subtree:true},document.body); wire(); })();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 33 of 104 · pvx-n148-rd-js · PVX-N148 · Rounds: "Saved" after the server confirms; the Tomorrow list on the server ━━━━━ */
/* the chip: Saving… → Saved (only on the server's word) · Offline · Not saved */




/* the Tomorrow list on the server: rounds_queue/{id} = {tenant_id, key, text, done, done_at, created_at, created_by, updated_at, updated_by} */

function rdQDb(){ try{ return (typeof Backend!=='undefined'&&Backend.mode==='staff'&&typeof DB!=='undefined'&&DB&&DB.collection)?DB:null; }catch(e){ return null; } }
function rdQWho(){ try{ return rdActorName()||null; }catch(e){ return null; } }
function rdQWrite(p){ var d=rdQDb(); if(!d||!p){ return; } rdQ.pend++; window.__rdQWait=true; rdSaveState('saving');
  p.then(function(){ rdQ.pend--; if(!rdQ.pend){ window.__rdQWait=false; if(!window.__rdWaitSince) rdSaveState('saved'); } })
   .catch(function(e){ rdQ.pend--; console.warn('[rounds] tomorrow list',e); rdSaveState('error'); try{ toast('Tomorrow list not saved — check your connection'); }catch(x){} }); }
function rdQRef(id){ return rdQDb().collection('rounds_queue').doc(String(id)); }
function rdQAdd(key,x){ var d=rdQDb(); if(!d) return; var now=new Date().toISOString();
  rdQWrite(rdQRef(x.id).set({tenant_id:TENANT_ID,key:key,text:String(x.text).slice(0,200),done:!!x.done,done_at:x.doneAt||null,created_at:x.at||now,created_by:rdQWho(),updated_at:now,updated_by:rdQWho()})); }

/* ━━━━━ 34 of 104 · pvx-n149-flow-js · PVX-N149 · personal sign-in: the lobby account opens only the lobby display ━━━━━ */
try{
/* pvxLobbyAccountCard lives next to the account list in Flow's main script (the sign-in handler can run before this point) */
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 35 of 104 · pvx-n184-js ━━━━━ */
try{
/* PVX-N184 - 1. Dynamic Type on iPhone and iPad: -apple-system-body is 17 pt at the default size; the root follows it. */
(function(){
  var de=document.documentElement;
  function ios(){ return /iPhone|iPad|iPod/.test(navigator.userAgent)||(/Macintosh/.test(navigator.userAgent)&&navigator.maxTouchPoints>1); }
  function probe(){
    try{
      if(!ios()||!(window.CSS&&CSS.supports&&CSS.supports('font','-apple-system-body'))) return;
      var d=document.createElement('div'); d.setAttribute('data-pvx-probe','text'); d.style.cssText='position:absolute;visibility:hidden;pointer-events:none;font:-apple-system-body';
      de.appendChild(d); var f=parseFloat(getComputedStyle(d).fontSize); d.remove();
      if(!f) return; var pct=Math.max(82,Math.min(235,f/17*100));
      de.style.fontSize=Math.abs(pct-100)<1?'':pct.toFixed(1)+'%';
    }catch(e){}
  }
  function mark(){ var sc=parseFloat(getComputedStyle(de).fontSize)/16; de.classList.toggle('pvx-text-l',sc>=1.25); }
  probe(); mark();
  document.addEventListener('visibilitychange',function(){ if(!document.hidden){ probe(); mark(); } });
  window.addEventListener('resize',mark);
  try{ new MutationObserver(mark).observe(de,{attributes:true,attributeFilter:['style']}); }catch(e){}
  window.pvxTextScale=function(){ return parseFloat(getComputedStyle(de).fontSize)/16; };
})();
/* PVX-N184 - 5. sub-nav strips that scroll: fade at the edge that has more, a chevron to reach it, current view in sight */
(function(){
  var CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  function wire(sw){
    if(sw.__pvx) return; sw.__pvx=1; sw.classList.add('pvx-sw');
    var more=document.createElement('button'); more.type='button'; more.className='pvx-swmore'; more.tabIndex=-1; more.setAttribute('aria-hidden','true'); more.title='More'; more.innerHTML=CHEV;
    sw.parentNode.insertBefore(more,sw.nextSibling);
    more.addEventListener('click',function(){ sw.scrollBy({left:Math.max(120,sw.clientWidth*0.7),behavior:'smooth'}); });
    function upd(){
      var max=sw.scrollWidth-sw.clientWidth, x=sw.scrollLeft, ov=max>2 && sw.clientWidth>0;
      sw.classList.toggle('ov-l',ov&&x>2); sw.classList.toggle('ov-r',ov&&x<max-2);
      var on=ov&&x<max-2; more.classList.toggle('on',on);
      if(on){ var p=sw.parentNode.getBoundingClientRect(), r=sw.getBoundingClientRect(); more.style.left=Math.round(r.right-p.left-32)+'px'; more.style.top=Math.round(r.top-p.top)+'px'; more.style.height=Math.round(r.height)+'px'; }
    }
    var seated=null;
    function seat(){ var a=sw.querySelector('.seg.active'); if(!a||a===seated) return; if(sw.scrollWidth<=sw.clientWidth+2) return; seated=a; var l=a.offsetLeft-sw.offsetLeft, r=l+a.offsetWidth;
      if(l<sw.scrollLeft||r>sw.scrollLeft+sw.clientWidth) sw.scrollLeft=Math.max(0,l-24); }
    sw.addEventListener('scroll',upd,{passive:true}); window.addEventListener('resize',function(){ upd(); });
    try{ new ResizeObserver(upd).observe(sw); }catch(e){}
    try{ new MutationObserver(function(ms){ for(var i=0;i<ms.length;i++){ if(ms[i].target!==sw){ seat(); upd(); return; } } }).observe(sw,{subtree:true,attributes:true,attributeFilter:['class'],childList:true}); }catch(e){}
    seat(); upd(); sw.__pvxUpd=upd;
  }
  function all(){ document.querySelectorAll('.subnav .switcher').forEach(wire); document.querySelectorAll('.subnav .switcher.pvx-sw').forEach(function(sw){ sw.__pvxUpd&&sw.__pvxUpd(); }); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  window.addEventListener('load',all);
  try{ pvxWatch(function(ms){ for(var i=0;i<ms.length;i++){ var t=ms[i].target; if(t.classList&&t.classList.contains('subnav')){ requestAnimationFrame(all); return; } } },{subtree:true,attributes:true,attributeFilter:['class']},document.body); }catch(e){}
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 36 of 104 · pvx-n185-js ━━━━━ */
try{
/* PVX-N185 - Anesia's glass guard, shared on this device (same key): blur stays on only while the device keeps up. */
(function(){
  var KEY='anesia:v1:blur', root=document.documentElement;
  function get(){ try{ return localStorage.getItem(KEY); }catch(e){ return null; } }
  function set(v){ try{ localStorage.setItem(KEY,v); }catch(e){} }
  if(get()==='0'){ root.classList.add('pvx-noblur'); return; }
  var busy=false, rounds=0;
  function sample(){
    if(busy||root.classList.contains('pvx-noblur')||rounds>=6) return;
    busy=true; rounds++;
    var d=[], last=0, t0=0;
    requestAnimationFrame(function f(t){
      if(!t0){ t0=last=t; return requestAnimationFrame(f); }
      d.push(t-last); last=t;
      if(t-t0<1000) return requestAnimationFrame(f);
      busy=false;
      if(d.length>10 && d.filter(function(x){ return x>25; }).length/d.length>0.1){ root.classList.add('pvx-noblur'); set('0'); window.__pvxBlurOff={frames:d.length,at:Date.now()}; }
      else if(rounds>=3) set('1');
    });
  }
  window.addEventListener('scroll',sample,{passive:true,capture:true});
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#fabAdd,#globalSearch,#fvTalk')) sample(); },true);
  window.pvxGlass={sample:sample};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 37 of 104 · pvx-n188-js ━━━━━ */
try{
/* PVX-N188 - with Reduce Motion, scripted smooth scrolling jumps instead */
(function(){
  var q; try{ q=matchMedia('(prefers-reduced-motion: reduce)'); }catch(e){ return; }
  function fix(a){ if(q.matches&&a&&typeof a==='object'&&a.behavior==='smooth'){ a=Object.assign({},a,{behavior:'auto'}); } return a; }
  ['scrollTo','scrollBy'].forEach(function(n){ [window,Element.prototype].forEach(function(o){ var f=o[n]; if(!f) return;
    o[n]=function(a){ return arguments.length===1?f.call(this,fix(a)):f.apply(this,arguments); }; }); });
  var si=Element.prototype.scrollIntoView; Element.prototype.scrollIntoView=function(a){ return si.call(this,fix(a)); };
  window.pvxReducedMotion=function(){ return q.matches; };
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 38 of 104 · pvx-n189-js ━━━━━ */
try{
/* PVX-N189 - weight matching, Anesia's table: stroke on the 24-pt grid = W(weight) x font size x 0.05 x 24 / icon size,
   i.e. the same stroke-to-text ratio as Anesia's 1.2 em symbols */
(function(){
  var W={100:1.2,200:1.3,300:1.45,400:1.6,500:1.8,600:2,700:2.25,800:2.5,900:2.7};
  var SKIP='.fg-ck,.fg-search,.confirm-icon,.topnav,.cpr-pill,.dnr-pill,.spark,.us-spark-area,.kpi .spark,.command-kpi__spark,.fab-add,.aph-ic,.empty,.board-empty-state,.an-chart,.cl-vnode,.nextup-rail';
  function host(svg){ var h=svg.parentElement; while(h&&h!==document.body){ if(/^(BUTTON|A|LABEL|LI|H\d|P|TD|TH)$/.test(h.tagName)||h.getAttribute('role')==='button') return h; if(h.childNodes.length>1&&[].some.call(h.childNodes,function(n){return n.nodeType===3&&n.textContent.trim();})) return h; h=h.parentElement; } return svg.parentElement; }
  function label(h){ var w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT,{acceptNode:function(n){ return n.textContent.trim()&&!(n.parentElement&&n.parentElement.closest('svg'))?1:3; }}); var n=w.nextNode(); return n&&n.parentElement; }
  function one(svg){
    if(svg.classList.contains('pvx-gi')||svg.closest(SKIP)) return;
    var vb=svg.viewBox&&svg.viewBox.baseVal; if(!vb||vb.width!==24||vb.height!==24) return;
    var r=svg.getBoundingClientRect(); if(!r.width||r.width>28) return;
    var p=svg.querySelector('path,line,polyline,polygon,circle,rect'); if(!p||getComputedStyle(p).stroke==='none') return;
    var h=host(svg), lab=label(h)||h, cs=getComputedStyle(lab), fw=Math.min(900,Math.max(100,Math.round((parseInt(cs.fontWeight,10)||400)/100)*100));
    var u=(W[fw]*parseFloat(cs.fontSize)*0.05*24/r.width); u=Math.max(1.3,Math.min(3.2,u));
    var k=u.toFixed(2); if(svg.__pvxw===k) return; svg.__pvxw=k;
    svg.classList.add('pvx-sym'); svg.style.setProperty('--pvx-symw',k);
  }
  function all(){ document.querySelectorAll('svg').forEach(function(s){ try{ one(s); }catch(e){} }); }
  var t=0; function soon(){ if(t) return; t=setTimeout(function(){ t=0; requestAnimationFrame(all); },120); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  window.addEventListener('load',all); window.addEventListener('resize',function(){ document.querySelectorAll('svg.pvx-sym').forEach(function(s){ s.__pvxw=null; }); soon(); });
  try{ pvxWatch(function(ms){ for(var i=0;i<ms.length;i++){ if(ms[i].addedNodes.length){ soon(); return; } } },{childList:true,subtree:true},document.body); }catch(e){}
  try{ pvxWatch(function(){ document.querySelectorAll('svg.pvx-sym').forEach(function(s){ s.__pvxw=null; }); soon(); },{attributes:true,attributeFilter:['style','class']},document.documentElement); }catch(e){}
  document.addEventListener('click',soon,true); document.addEventListener('focusin',soon,true);
  window.pvxSymbols={sync:all};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 39 of 104 · pvx-n191-js ━━━━━ */
try{
/* PVX-N191 - bars read their value: capacity rails, status bars and utilisation bars become meters */
(function(){
  function pct(el){ var w=el&&(el.style.width||el.style.getPropertyValue('--w')||el.dataset.w); var n=parseFloat(w); return isFinite(n)?Math.max(0,Math.min(100,Math.round(n))):0; }
  function txt(e){ return e?e.textContent.replace(/\s+/g,' ').trim():''; }
  function set(el,lab,now,vt){ var s=function(k,v){ if(el.getAttribute(k)!==v) el.setAttribute(k,v); }; s('role','meter'); s('aria-valuemin','0'); s('aria-valuemax','100'); s('aria-valuenow',String(now)); if(lab) s('aria-label',String(lab)); if(vt) s('aria-valuetext',String(vt)); }   /* PVX-N378 */
  function all(){
    document.querySelectorAll('.command-kpi__rail').forEach(function(r){ var c=r.closest('.command-kpi'); if(!c) return;
      var v=txt(c.querySelector('.command-kpi__value')).replace(/\s*\/\s*(of\s+)?/,' of '), sub=txt(c.querySelector('.command-kpi__sub'));
      set(r, (window.pvxChartName?pvxChartName(txt(c.querySelector('.command-kpi__label'))):txt(c.querySelector('.command-kpi__label'))), pct(r.querySelector('i')), v+(sub?' · '+sub:'')); });
    document.querySelectorAll('.status-row .track').forEach(function(t){ var row=t.closest('.status-row'), f=t.querySelector('.fill');
      var n=txt(row.querySelector('.count')), p=f?parseFloat(f.dataset.w)||0:0; set(t, txt(row.querySelector('.status-label')), Math.round(p), n+' patients, '+Math.round(p)+' %'); });
    document.querySelectorAll('.util-fill').forEach(function(f){ var tr=f.parentElement; if(!tr) return; var box=tr.closest('[class*="util"],.panel,.card')||tr.parentElement;
      var lab=txt(box&&box.querySelector('h3,h4,.util-lab,.lbl,.label'))||'Utilisation'; set(tr, lab, pct(f), pct(f)+' %'); });
  }
  var t=0; function soon(){ if(t) return; t=setTimeout(function(){ t=0; all(); },150); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',all); else all();
  try{ pvxWatch(soon,{childList:true,subtree:true,characterData:true},document.body); }catch(e){}
  window.pvxMeters={sync:all};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 40 of 104 · pvx-n192-js ━━━━━ */
try{
/* PVX-N192 - drag and drop: Undo after a move, Escape cancels a Rounds drag, spoken refusals */
(function(){
  var live=null;
  function say(t){ if(!live){ live=document.createElement('div'); live.id='pvxDndLive'; live.className='pvx-sr'; live.setAttribute('aria-live','assertive'); document.body.appendChild(live); }
    live.textContent=''; setTimeout(function(){ live.textContent=t; },40); }
  window.pvxSay=say;
  /* PVX-N202 - one undo history shared by the Undo buttons and Cmd-Z / Shift-Cmd-Z */
  window.pvxUndo=window.pvxUndo||(function(){ var U=[],R=[],busy=0;
    function info(t){ notify(t,'',{icon:'info',color:'var(--accent)'}); say(t); }
    function push(e){ U.push(e); if(U.length>25) U.shift(); if(!busy) R.length=0; return e; }
    function undoEntry(e){ var i=U.indexOf(e); if(i<0) return false; U.splice(i,1); var ok; busy++; try{ ok=e.undo(); } finally { busy--; } if(ok!==false&&e.redo) R.push(e); if(ok!==false&&e.pid&&window.pvxTouch) setTimeout(function(){ pvxTouch(e.pid); },160); return ok!==false; }
    function undo(){ var e=U[U.length-1]; if(!e){ info('Nothing to undo'); return; } undoEntry(e); }
    function redo(){ var e=R.pop(); if(!e){ info('Nothing to redo'); return; } busy++; try{ e.redo(); } finally { busy--; } if(e.pid&&window.pvxTouch) setTimeout(function(){ pvxTouch(e.pid); },160); }
    return {push:push,undo:undo,redo:redo,undoEntry:undoEntry,remove:function(e){ var i=U.indexOf(e); if(i>-1) U.splice(i,1); },top:function(){ return U[U.length-1]||null; },size:function(){ return [U.length,R.length]; }}; })();
  function act(title,sub,fn,opts,redo,pid){
    var e=pvxUndo.push({label:title,undo:fn,redo:redo,pid:pid}), go=function(){ pvxUndo.undoEntry(e); }; go.__pvxU=1;
    if(typeof window.fvNotifyAct==='function') window.fvNotifyAct(title,sub,'Undo',go,Object.assign({dur:8000},opts||{})); else notify(title,sub,opts); }

  /* ---- stage and room moves ---- */
  var depth=0;
  function snap(p){ var o=Object.assign({},p); o.timeline=(p.timeline||[]).slice(); if(p.ultrasound&&typeof p.ultrasound==='object') o.ultrasound=Object.assign({},p.ultrasound); return o; }
  function restore(q,o){ Object.keys(q).forEach(function(k){ if(k.charAt(0)!=='_'&&!(k in o)) delete q[k]; }); Object.keys(o).forEach(function(k){ if(k.charAt(0)!=='_') q[k]=o[k]; }); }
  function undo(id,o,after){
    var q=PATIENTS.find(function(x){ return x.id===id; });
    if(!q||q.completed||q.status!==after.status||q.room!==after.room){ notify('Can’t undo','This patient has moved since',{icon:'info',color:'var(--accent)'}); say('Can’t undo: this patient has moved since'); return false; }
    var sheet=q.tsSheet&&q.tsSheet.board, sheetWas=o.tsSheet&&o.tsSheet.board;
    restore(q,o);
    try{ if(typeof _usPid!=='undefined'&&_usPid===id&&typeof closeUltrasound==='function') closeUltrasound(); }catch(e){}   /* the request the move opened */
    try{ var A=window.fvAdmitSheet; if(A&&sheet&&!sheetWas&&!q._demo){ if(sheet==='OP') A.closeOP(q,'Move undone'); else if(sheet==='IP') A.undo(q); } }catch(e){}   /* the sheet the move made */
    scheduleRender(function(){ if(typeof activePatient!=='undefined'&&activePatient===q.id) fillDrawer(q); });
    var where=(o.status===after.status)?o.room:o.status;
    notify('Move undone',bcEsc(q.name||'')+' · back in '+bcEsc(where||''),{icon:'move',color:'var(--accent)'});
  }
  function undoable(name,when){
    if(typeof window[name]!=='function') return;
    pvxWrap(name,function(f){ return function(p,to){
      if(depth||!p||!when(p,to)) return f.apply(this,arguments);
      var o=snap(p), real=window.notify, cap=null, r; depth++;
      window.notify=function(t,sub,op){ if(!cap){ cap=[t,sub,op]; return; } return real.apply(this,arguments); };   /* the move's own message gets the Undo */
      try{ r=f.apply(this,arguments); } finally { window.notify=real; depth--; }
      var after={status:p.status,room:p.room};
      if(after.status===o.status&&after.room===o.room){ if(cap) real.apply(null,cap); return r; }
      var args=[].slice.call(arguments,1);
      act(cap?cap[0]:'Moved',cap?cap[1]:'',function(){ return undo(p.id,o,after); },cap&&cap[2],function(){ var q=PATIENTS.find(function(x){ return x.id===p.id; }); if(q) window[name].apply(null,[q].concat(args)); },p.id);
      return r; }; },'n192');
  }
  undoable('moveStatus',function(p,ns){ return ns!=='Discharged'&&ns!=='Admitted'&&p.status!==ns; });   /* completions keep their own Undo */
  undoable('moveRoom',function(p,rm){ return !!rm&&p.room!==rm; });

  /* ---- ultrasound queue ---- */
  window.pvxQueueSnap=function(){ return PATIENTS.filter(function(x){ return x.ultrasound; }).map(function(x){ return [x.id,x.ultrasound.queuePosition]; }); };
  function qApply(qs){ qs.forEach(function(e){ var q=PATIENTS.find(function(x){ return x.id===e[0]; }); if(q&&q.ultrasound){ if(e[1]===undefined) delete q.ultrasound.queuePosition; else q.ultrasound.queuePosition=e[1]; } }); renderAll(); }
  window.pvxQueueUndo=function(q0){
    var q1=window.pvxQueueSnap();
    act('Queue updated','Ultrasound order changed by Internal Medicine',function(){
      qApply(q0); notify('Queue restored','Ultrasound order is back as it was',{icon:'move',color:'var(--s-ultrasound)'}); },{icon:'move',color:'var(--s-ultrasound)'},
      function(){ qApply(q1); window.pvxQueueUndo(q0); });
  };

  /* ---- Rounds order: Undo after a drag (arrow keys undo with the opposite arrow) ---- */
  var kbd=0, rdT=0;
  if(typeof window.rdRankMove==='function'){ var rm=window.rdRankMove; window.rdRankMove=function(){ kbd++; try{ return rm.apply(this,arguments); } finally { kbd--; } }; }
  if(typeof window.rdRankSave==='function'){ var rs=window.rdRankSave;
    window.rdRankSave=function(sec,pids,pid,to){
      var before=(pids||[]).map(function(id){ var q=rdFind(id); return q&&q.rounds?[id,q.rounds.rank,q.rounds.rankSec]:null; }).filter(Boolean);
      var r=rs.apply(this,arguments); if(r&&!kbd) rdOffer(before,pid,to); return r; }; }
  function rdOffer(before,pid,to){
    var t=document.getElementById('rdUndo'); if(!t){ t=document.createElement('div'); t.id='rdUndo'; t.className='rd-undo'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); document.body.appendChild(t); }
    var p=rdFind(pid), nm=p?rdFullName(p):'';
    t.innerHTML='<span class="ru-msg"></span><button type="button" class="ru-undo">Undo</button><span class="ru-bar" aria-hidden="true"></span>';
    t.querySelector('.ru-msg').textContent=(nm?nm+' moved ':'Moved ')+(to===0?'to the top':'to #'+(to+1));
    t.classList.remove('open'); void t.offsetWidth; t.classList.add('open');
    clearTimeout(rdT); rdT=setTimeout(function(){ t.classList.remove('open'); },8000);
    function rdApply(st){ st.forEach(function(e){ var q=rdFind(e[0]); if(!q||!q.rounds) return; if(e[1]===undefined) delete q.rounds.rank; else q.rounds.rank=e[1]; if(e[2]===undefined) delete q.rounds.rankSec; else q.rounds.rankSec=e[2]; }); }
    var after=before.map(function(e){ var q=rdFind(e[0]); return q&&q.rounds?[e[0],q.rounds.rank,q.rounds.rankSec]:e; });
    var ent=pvxUndo.push({label:'Rounds order',undo:function(){ clearTimeout(rdT); t.classList.remove('open'); rdApply(before); var q=rdFind(pid); rdTouch(q,'Rounds order — move undone',true); say('Rounds order restored'); },
      redo:function(){ rdApply(after); var q=rdFind(pid); rdTouch(q,'Rounds order — move redone',true); say('Rounds order: move redone'); rdOffer(before,pid,to); }});
    t.querySelector('.ru-undo').onclick=function(){ pvxUndo.undoEntry(ent); };
  }

  /* ---- Escape cancels a Rounds drag ---- */
  window.addEventListener('keydown',function(e){
    if(e.key!=='Escape'||!window.rdRk||typeof rdRankEnd!=='function') return;
    e.preventDefault(); e.stopImmediatePropagation();
    var d=window.rdRk; try{ d.row.releasePointerCapture(d.pid0); }catch(x){}
    rdRankEnd(false); say('Move cancelled');
  },true);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 41 of 104 · pvx-n192-guard ━━━━━ */
try{
/* PVX-N192 - a file or link dropped where nothing takes it does nothing (the page stays); text fields still take text */
(function(){
  function editable(t){ return t&&t.closest&&t.closest('input,textarea,[contenteditable]:not([contenteditable=false])'); }
  document.addEventListener('dragover',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); if(e.dataTransfer) e.dataTransfer.dropEffect='none'; });
  document.addEventListener('drop',function(e){ if(e.defaultPrevented||editable(e.target)) return; e.preventDefault(); });
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 42 of 104 · pvx-n193-js ━━━━━ */
try{
/* PVX-N193 - entering data: labels tied to fields, required data before Create, checks as you leave a field, units as
   choices, the signed-in user as the triager, an in-app hours sheet, full text of clipped fields on hover */
(function(){
  var $=function(id){ return document.getElementById(id); };
  function hint(id,msg){ var el=$(id), h=$(id==='apName'?'apNameErr':id+'Hint');   /* the name keeps Flow's own message slot (FLOW-14) */ if(el){ if(msg) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); }
    if(h){ h.textContent=msg||''; h.classList.toggle('show',!!msg); } return !msg; }

  /* ---- 3. every label tied to its field ---- */
  var n=0;
  function tie(root){ (root||document).querySelectorAll('.ap-field > label:not([for]), .alert-field > label:not([for]), .ap-field > .lbl, .te-field > label:not([for])').forEach(function(l){
    var f=l.parentElement.querySelector('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea'); if(!f) return;
    if(f.closest('label')===l) return; if(!f.id) f.id='pvxf'+(++n); if(l.tagName==='LABEL') l.htmlFor=f.id; else { if(!l.id) l.id='pvxl'+n; if(!f.getAttribute('aria-labelledby')&&!f.getAttribute('aria-label')) f.setAttribute('aria-labelledby',l.id); } }); }
  var tt=0; function soon(){ if(tt) return; tt=setTimeout(function(){ tt=0; tie(); },60); }
  tie(); try{ pvxWatch(function(ms){ for(var i=0;i<ms.length;i++) if(ms[i].addedNodes.length){ soon(); return; } },{childList:true,subtree:true},document.body); }catch(e){}

  /* ---- 1. Add New Patient ---- */
  function unit(id){ var b=document.querySelector('[data-unit-for="'+id+'"] [aria-checked=true]'); return b?b.getAttribute('data-u'):''; }
  function setUnit(id,u){ document.querySelectorAll('[data-unit-for="'+id+'"] [data-u]').forEach(function(b){ b.setAttribute('aria-checked',String(b.getAttribute('data-u')===u)); }); }
  function bare(v){ return /^\d+(?:\.\d+)?$/.test(String(v||'').trim()); }
  function withUnit(id){ var el=$(id); if(!el) return ''; var v=el.value.trim(); return bare(v)?v+' '+unit(id):v; }
  var CHECK={
    apName:function(){ return $('apName').value.trim()?'':'Enter a patient name.'; },
    apSpecies:function(){ return (typeof apArrivalType!=='undefined'&&apArrivalType==='otw')||$('apSpecies').value?'':'Choose a species.'; },
    apPhone:function(){ var d=$('apPhone').value.replace(/\D/g,'').replace(/^1(?=\d{10})/,''); return !d||d.length===10?'':'Enter a 10-digit phone number.'; },
    apWeight:function(){ var v=withUnit('apWeight'); if(!v) return ''; var r=parseWeightInput(v); if(!r.valid) return 'Enter the weight as a number, in kg or lb.'; return r.kg>150?'Enter a weight from 0.01 to 150 kg.':''; },
    apAge:function(){ var v=$('apAge').value.trim(); if(!v) return ''; if(/^\d+\.\d+$/.test(v)) return 'Use whole numbers — for example 18 mo instead of 1.5 y.';
      if(bare(v)) return ''; return fmtAge(v)!==v||/^\d+\s*(years?|months?|weeks?|days?)(,\s*\d+\s*(years?|months?|weeks?|days?))*$/i.test(v)?'':'Enter the age as a number, in years or months.'; }
  };
  function need(){ return !$('apName').value.trim()||(!((typeof apArrivalType!=='undefined'&&apArrivalType==='otw'))&&!$('apSpecies').value&&!(typeof apReviewIntakeId!=='undefined'&&apReviewIntakeId)); }
  function syncCreate(){ var b=$('apCreate'); if(!b) return; var no=need(); b.classList.toggle('pvx-notyet',no); b.setAttribute('aria-disabled',String(no)); }
  function clearAll(){ Object.keys(CHECK).forEach(function(id){ hint(id,''); }); setUnit('apWeight','kg'); setUnit('apAge','y'); setTimeout(syncCreate,0); }
  function wireAp(){
    var M=$('apModal'); if(!M||M.__pvx193) return; M.__pvx193=1;
    M.addEventListener('input',function(e){ var id=e.target&&e.target.id; if(CHECK[id]&&e.target.getAttribute('aria-invalid')) hint(id,CHECK[id]());   /* fixed as you type once flagged */
      if(id==='apWeight'){ var v=e.target.value.toLowerCase(); if(/lb|#|pound/.test(v)) setUnit('apWeight','lb'); else if(/kg|kilo/.test(v)) setUnit('apWeight','kg'); }
      if(id==='apAge'){ var a=e.target.value.toLowerCase(); if(/m/.test(a)) setUnit('apAge','mo'); else if(/y/.test(a)) setUnit('apAge','y'); }
      syncCreate(); },true);
    M.addEventListener('change',function(e){ var id=e.target&&e.target.id; if(id==='apSpecies') hint(id,''); syncCreate(); },true);
    M.addEventListener('focusout',function(e){ var id=e.target&&e.target.id; if(id&&CHECK[id]&&id!=='apName'&&id!=='apSpecies') hint(id,CHECK[id]()); },true);
    M.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('.pvx-unit [data-u]'); if(b){ var id=b.parentElement.getAttribute('data-unit-for'); setUnit(id,b.getAttribute('data-u')); if($(id).getAttribute('aria-invalid')) hint(id,CHECK[id]()); }
      setTimeout(syncCreate,0); },true);
    M.addEventListener('keydown',function(e){ var b=e.target.closest&&e.target.closest('.pvx-unit [data-u]'); if(!b||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')) return; e.preventDefault(); var o=b.parentElement.querySelectorAll('[data-u]'), i=[].indexOf.call(o,b), j=(i+(e.key==='ArrowRight'?1:o.length-1))%o.length; o[j].click(); o[j].focus(); },true);
    var cb=$('apCreate'), prev=cb.onclick;
    cb.onclick=function(ev){
      var order=['apName','apSpecies','apPhone','apWeight','apAge'], first=null;
      order.forEach(function(id){ var m=CHECK[id](); if(id==='apSpecies'&&typeof apReviewIntakeId!=='undefined'&&apReviewIntakeId) m=''; if(!hint(id,m)&&!first) first=id; });
      if(first){ var el=$(first); try{ el.focus(); }catch(e){} if(window.pvxSay) pvxSay(CHECK[first]()); return; }
      ['apWeight','apAge'].forEach(function(id){ var el=$(id); if(el&&bare(el.value)) el.value=el.value.trim()+(id==='apAge'?(unit(id)==='mo'?' mo':' y'):' '+unit(id)); });   /* the unit choice goes with the number */
      return prev.call(this,ev);
    };
  }
  if(typeof window.openAddPatient==='function'){ pvxAfter('openAddPatient',function(){ wireAp(); clearAll(); },'n193'); }
  document.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('#apArrival .ap-seg-btn')) setTimeout(function(){ hint('apSpecies',''); syncCreate(); },0); },true);
  wireAp();

  /* ---- 2. Edit Triage: decimal keypad and Anesia's input limits ---- */
  var LIM={temp:[77,113,'temperature','°F'],hr:[0,400,'heart rate','bpm'],rr:[0,150,'respiratory rate','breaths/min']};
  function triMsg(el){ var k=el.getAttribute('data-vk'), v=el.value.trim(); if(!v) return '';
    if(k==='weight'){ var r=parseWeightInput(v); if(!r.valid) return 'Enter the weight in kg (or type lb).'; return r.kg>150?'Enter a weight from 0.01 to 150 kg.':''; }
    var L=LIM[k]; if(!L) return ''; var m=v.match(/^-?\d+(?:\.\d+)?/); var x=m?parseFloat(m[0]):NaN;
    if(!m||v.replace(m[0],'').replace(/[°\s]|f$|bpm|rpm|br\/?min/gi,'')!==''||!isFinite(x)) return 'Enter the '+L[2]+' as a number.';
    return x<L[0]||x>L[1]?'Enter '+L[2]+' from '+L[0]+' to '+L[1]+' '+L[3]+'.':''; }
  function triShow(el,msg){ var h=el.__h; if(!h){ h=document.createElement('div'); h.className='ap-hint'; h.id='pvxth'+(++n); h.setAttribute('aria-live','polite'); el.insertAdjacentElement('afterend',h); el.setAttribute('aria-describedby',h.id); el.__h=h; }
    h.textContent=msg||''; h.classList.toggle('show',!!msg); if(msg) el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); return !msg; }
  if(typeof window.openTriageEdit==='function'){ pvxAfter('openTriageEdit',function(){ 
    document.querySelectorAll('#triEditBody [data-vk]').forEach(function(el){ el.setAttribute('inputmode','decimal'); el.setAttribute('autocomplete','off');
      el.addEventListener('blur',function(){ triShow(el,triMsg(el)); }); el.addEventListener('input',function(){ if(el.getAttribute('aria-invalid')) triShow(el,triMsg(el)); }); });
    var by=$('triEditBy'); if(by&&!by.value&&typeof CURRENT_USER==='string') by.value=CURRENT_USER;
    tie($('triEditModal')); },'n193'); }
  var ts=$('triEditSave'); if(ts){ var tsave=ts.onclick; ts.onclick=function(ev){ var bad=null;
    document.querySelectorAll('#triEditBody [data-vk]').forEach(function(el){ if(!triShow(el,triMsg(el))&&!bad) bad=el; });
    if(bad){ bad.focus(); if(window.pvxSay) pvxSay(bad.__h.textContent); return; } return tsave.call(this,ev); }; }

  /* ---- 4. authorized hours: an in-app sheet ---- */
  window.pvxHoursSheet=function(cur,done){
    showConfirm('Authorized hours','Save',function(){},{});
    var box=$('confirmBox'), ok=$('confirmOk'), sub=$('confirmSub'), old=box.querySelector('.pvx-hwrap'); if(old) old.remove();
    var w=document.createElement('div'); w.className='pvx-hwrap';
    w.innerHTML='<div class="pvx-hours"><button type="button" data-h="-1" aria-label="12 hours fewer">−</button><input id="pvxHours" inputmode="numeric" autocomplete="off" aria-label="Total authorized hours" aria-describedby="pvxHoursErr"><span class="pvx-hours-u">hours</span><button type="button" data-h="1" aria-label="12 hours more">+</button></div><div class="pvx-hours-err" id="pvxHoursErr" aria-live="polite"></div>';
    sub.insertAdjacentElement('afterend',w); box.setAttribute('aria-labelledby','confirmTitle');
    var inp=w.querySelector('input'), err=w.querySelector('.pvx-hours-err'); inp.value=String(Math.max(0,Math.round(+cur||0)));
    function read(){ var v=inp.value.trim(); return /^\d{1,3}$/.test(v)?+v:null; }
    w.querySelectorAll('[data-h]').forEach(function(b){ b.onclick=function(){ var v=read(); v=v===null?0:v; v=Math.max(0,Math.min(999,v+12*(+b.getAttribute('data-h')))); inp.value=String(v); err.textContent=''; inp.removeAttribute('aria-invalid'); }; });
    function close(){ $('confirmScrim').classList.remove('open'); box.classList.remove('open'); setTimeout(function(){ if(!box.classList.contains('open')) w.remove(); },300); }
    function save(){ var v=read(); if(v===null){ err.textContent='Enter whole hours from 0 to 999.'; inp.setAttribute('aria-invalid','true'); inp.focus(); return; } close(); done(v); }
    ok.onclick=save; inp.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); save(); } if(e.key==='Escape'){ e.preventDefault(); close(); } });
    $('confirmCancel').onclick=close; $('confirmScrim').onclick=close;
    setTimeout(function(){ inp.focus(); inp.select(); },60);
  };
  if(typeof window.showConfirm==='function'){ pvxBefore('showConfirm',function(){ var x=document.querySelector('#confirmBox .pvx-hwrap'); if(x) x.remove(); },'n193'); }

  /* ---- 5. Mac expansion tooltip: a clipped field shows its full text on hover ---- */
  document.addEventListener('mouseover',function(e){ var el=e.target; if(!el||el.tagName!=='INPUT'||!/^(text|search|email|tel|url|)$/.test(el.type||'')) return;
    if(el.title&&!el.__pvxTip) return; var clip=el.scrollWidth>el.clientWidth+1&&el.value;
    if(clip){ el.title=el.value; el.__pvxTip=1; } else if(el.__pvxTip){ el.removeAttribute('title'); el.__pvxTip=0; } },true);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 43 of 104 · pvx-n194-js ━━━━━ */
try{
/* PVX-N194 - full screen: Rounds Display stays in Rounds and follows full screen; the lobby TV's controls come back with a tap */
(function(){
  /* leaving full screen that Display entered ends Display (the top bar is never hidden in a normal window) */
  document.addEventListener('fullscreenchange',function(){
    if(!document.fullscreenElement&&window.__rdFs){ window.__rdFs=false; if(typeof rdToggleDisplay==='function') rdToggleDisplay(false); } });
  /* Display belongs to Rounds: leaving Rounds puts the top bar back, coming back resumes Display */
  if(typeof window.switchApp==='function'){ var sa=window.switchApp;
    window.switchApp=function(app){ var r=sa.apply(this,arguments);
      try{ if(app!=='rounds'&&document.body.classList.contains('rd-display')) rdDisplayState(false);
        else if(app==='rounds'&&window.__rdDisplayWant&&!document.body.classList.contains('rd-display')) rdDisplayState(true); }catch(e){}
      return r; }; }
  /* lobby TV: a tap shows Exit Full screen, like moving the mouse */
  ['pointerdown','touchstart'].forEach(function(ev){ document.addEventListener(ev,function(){ if(document.body.classList.contains('fs-mode')&&typeof fsPokeExit==='function') fsPokeExit(); },{capture:true,passive:true}); });
  /* lobby TV: if full screen ends, the tap-to-enter prompt comes back (entering is still a tap) */
  var armed=false;
  function arm(){ if(armed) return; armed=true;
    var go=function(){ teardown(); try{ enterFullscreen(); }catch(e){} try{ removeFsHint(); }catch(e){} };
    var teardown=function(){ armed=false; ['click','keydown','touchend'].forEach(function(ev){ document.removeEventListener(ev,go,true); }); };
    ['click','keydown','touchend'].forEach(function(ev){ document.addEventListener(ev,go,true); }); }
  ['fullscreenchange','webkitfullscreenchange'].forEach(function(ev){ document.addEventListener(ev,function(){
    var fs=!!(document.fullscreenElement||document.webkitFullscreenElement);
    if(!fs&&document.body.classList.contains('tv-mode')){ setTimeout(function(){ try{ showFsHint(); }catch(e){} arm(); },300); } }); });
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 44 of 104 · pvx-n195-js ━━━━━ */
try{
/* PVX-N195 - launching: theme transitions back on once the first screen is up; remember and restore where you were;
   the status bar follows the theme */
(function(){
  var d=document.documentElement;
  function up(){ d.classList.remove('pvx-pre-dark','pvx-pre-light'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ setTimeout(function(){ d.classList.remove('pvx-boot'); },120); }); }); }
  if(document.readyState==='complete') up(); else window.addEventListener('load',up);
  /* status bar */
  var meta=document.querySelector('meta[name="theme-color"]');
  function tint(){ if(meta) meta.setAttribute('content',document.body.classList.contains('dark')?'#0A1222':'#F2F4F8'); }
  tint(); try{ pvxWatch(tint,{attributes:true,attributeFilter:['class']},document.body); }catch(e){}
  /* where you were */
  var KEY='pvx:flow:where', R=window.__pvxRestore||null, ready=!R;
  function get(){ try{ return JSON.parse(localStorage.getItem(KEY)||'null')||{}; }catch(e){ return {}; } }
  function save(p){ if(!ready||document.body.classList.contains('tv-mode')) return; try{ var o=get(); for(var k in p) o[k]=p[k]; o.at=Date.now(); localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  function app(){ return typeof currentApp!=='undefined'?currentApp:'flow'; }
  function view(){ return app()==='ultrasound'?'us:'+(typeof currentUsView!=='undefined'?currentUsView:''):app()==='rounds'?'rounds':(typeof currentView!=='undefined'?currentView:''); }
  [['switchApp',function(a){ save({app:a}); }],['switchView',function(v){ save({app:'flow',view:v}); }],['switchUsView',function(v){ save({usView:v}); }]].forEach(function(x){
    var f=window[x[0]]; if(typeof f!=='function') return; window[x[0]]=function(a){ var r=f.apply(this,arguments); try{ x[1](a); }catch(e){} return r; }; });
  var st=document.getElementById('stage'), stT=0;
  function keep(){ if(!ready||!st) return; var o=get(); o.scroll=o.scroll||{}; o.scroll[view()]=Math.round(st.scrollTop); o.at=Date.now(); try{ localStorage.setItem(KEY,JSON.stringify(o)); }catch(e){} }
  if(st) st.addEventListener('scroll',function(){ if(!ready) return; clearTimeout(stT); stT=setTimeout(keep,200); },{passive:true});
  window.addEventListener('pagehide',keep); document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') keep(); });   /* an app the iPad closes keeps its place */
  function scrollBack(){ var o=get(), y=o.scroll&&o.scroll[view()]; if(!st||!y) return; var moved=false, mark=function(){ moved=true; };
    st.addEventListener('wheel',mark,{once:true,passive:true}); st.addEventListener('touchstart',mark,{once:true,passive:true});
    var go=function(){ if(!moved&&st.scrollHeight-st.clientHeight>=y-4) st.scrollTo({top:y,behavior:'instant'}); }; go(); setTimeout(go,500); setTimeout(go,1200); }
  if(R){
    /* the existing #app= boot switches the app at 250 ms and keeps Flow hidden until its two frames; the view goes first */
    setTimeout(function(){
      try{ if(R.app==='flow'&&R.view&&R.view!=='dashboard'&&typeof switchView==='function') switchView(R.view);
        if(R.app==='ultrasound'&&R.usView&&typeof switchUsView==='function') switchUsView(R.usView); }catch(e){ console.warn('[restore]',e); }
      ready=true; setTimeout(scrollBack,350);
    },260);
  } else setTimeout(scrollBack,600);
  window.pvxWhere={get:get};
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 45 of 104 · pvx-n196-js ━━━━━ */
try{
/* PVX-N196 - offering help: Tap on touch, Click with a mouse; money fields edit with one click, tap or Return */
(function(){
  var coarse=false; try{ coarse=matchMedia('(pointer:coarse)').matches; }catch(e){}
  function words(){ var w=coarse?'Tap':'Click'; document.querySelectorAll('.pvx-tapclick').forEach(function(x){ if(x.textContent!==w) x.textContent=w; }); }
  words(); try{ pvxWatch(function(){ words(); },{childList:true,subtree:true},document.body); }catch(e){}
  function edit(el){ el.dispatchEvent(new MouseEvent('dblclick',{bubbles:true,cancelable:true})); }   /* the existing editor opens on dblclick */
  document.addEventListener('click',function(e){ var el=e.target&&e.target.closest&&e.target.closest('.rd-fin-edit[data-fin-key]'); if(!el||e.detail>1) return; edit(el); });
  document.addEventListener('keydown',function(e){ var el=e.target&&e.target.closest&&e.target.closest('.rd-fin-edit[data-fin-key]'); if(!el||(e.key!=='Enter'&&e.key!==' ')) return; e.preventDefault(); e.stopPropagation(); edit(el); },true);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 46 of 104 · pvx-n197-js ━━━━━ */
try{
/* PVX-N197 - notifications: failures stay; critical ultrasound findings reach the board; Reminder chime setting */
(function(){
  /* failures stay until dismissed (and are read at once) */
  var FAIL=/^(Not saved|Couldn[’']t |Could not |Prices not saved)/;
  if(typeof window.notify==='function'){ var nf=window.notify; window.notify=function(t,sub,o){ o=o||{}; if(FAIL.test(String(t||''))&&o.sticky===undefined) o=Object.assign({},o,{sticky:true}); return nf.call(this,t,sub,o); }; }

  /* critical ultrasound findings: card flag (usFlag), Attention Center until seen, a message when one arrives */
  function crit(p){ var u=p&&p.ultrasound; return !!(u&&u.criticalFinding&&!u.critSeenAt&&isActive(p)); }
  function safe(f){ try{ return f()||''; }catch(e){ return ''; } }
  function by(p){ var u=p.ultrasound; return (u.performingDoctor&&safe(function(){ return drName(u.performingDoctor); }))||'Internal Medicine'; }
  if(typeof window.attentionItems==='function'){ 
    pvxWrap('attentionItems',function(ai){ return function(){ var a=ai.apply(this,arguments);
      try{ PATIENTS.filter(crit).forEach(function(p){ a.unshift({key:'uscrit:'+p.id,sev:'red',icon:'flask',t:p.name+' — critical ultrasound finding',s:'Flagged by '+by(p)+' · '+safe(function(){ return docShort(p.doctor); }),p:p}); }); }catch(e){ console.warn('[uscrit]',e); }
      return a; }; },'n197'); }
  function markSeen(pid){ var p=PATIENTS.find(function(x){ return x.id===pid; }); if(!p||!p.ultrasound) return;
    var by=(typeof CURRENT_USER==='string'&&CURRENT_USER)||'Staff'; p.ultrasound.critSeenAt=new Date(); p.ultrasound.critSeenBy=by;
    try{ usTimeline(p,'Critical ultrasound finding seen',by); }catch(e){ (p.timeline=p.timeline||[]).push({label:'Critical ultrasound finding seen',at:new Date(),meta:by}); }
    try{ renderAll(); }catch(e){} notify('Marked seen',bcEsc(pvxFullName(p))+' · critical ultrasound finding',{icon:'check',color:'var(--s-admitted)'}); }
  window.pvxCritSeen=markSeen;
  if(typeof window.dismissAlert==='function'){ pvxWrap('dismissAlert',function(da){ return function(key){ if(String(key||'').indexOf('uscrit:')===0){ markSeen(String(key).slice(7)); return; } return da.apply(this,arguments); }; },'n197'); }
  function label(){ document.querySelectorAll('#attnList .attn-item[data-key^="uscrit:"]').forEach(function(it){
    var b=it.querySelector('.attn-clear'); if(b){ b.setAttribute('aria-label','Mark seen'); b.title='Mark seen'; }
    var g=it.querySelector('.overdue-badge'); if(g){ g.setAttribute('aria-label','Critical'); var tx=g.querySelector('.overdue-text'); if(tx&&tx.textContent!=='CRITICAL') tx.textContent='CRITICAL'; } }); }   /* a finding, not a wait */
  if(typeof window.renderAttention==='function'){ pvxAfter('renderAttention',function(){ label(); },'n197'); }
  var announced=null, BOOT=Date.now();
  function sweep(){
    try{ label();
      var now=PATIENTS.filter(crit).map(function(p){ return p.id; });
      if(announced===null||Date.now()-BOOT<8000){ announced=new Set(now); return; }   /* at start-up the board and Attention Center show them */
      var tv=document.body.classList.contains('tv-mode'), us=(typeof currentApp!=='undefined'&&currentApp==='ultrasound');
      now.forEach(function(id){ if(announced.has(id)) return; announced.add(id); if(tv||us) return;
        var p=PATIENTS.find(function(x){ return x.id===id; }), fb=by(p);
        var o={icon:'info',color:'var(--priority-p1)',sticky:true};
        if(typeof window.fvNotifyAct==='function') fvNotifyAct('Critical ultrasound finding',bcEsc(pvxFullName(p))+' · flagged by '+bcEsc(fb),'Open',function(){ openDrawer(id); },o);
        else notify('Critical ultrasound finding',bcEsc(pvxFullName(p))+' · flagged by '+bcEsc(fb),o);
        if(window.pvxSay) pvxSay('Critical ultrasound finding: '+pvxFullName(p)+', flagged by '+fb); });
    }catch(e){}
  }
  if(typeof window.renderAll==='function'){ pvxAfter('renderAll',function(){ setTimeout(sweep,0); },'n197'); }
  setInterval(sweep,3000);

  /* Operations > Reminder chime, per screen */
  var K='pvx:sound:reminder';
  function on(){ try{ return localStorage.getItem(K)!=='off'; }catch(e){ return true; } }
  function paint(){ var b=document.getElementById('opsChime'), s2=document.getElementById('opsChimeS'); if(!b) return; var v=on(); b.setAttribute('aria-checked',String(v)); if(s2) s2.textContent=(v?'On':'Off')+' · this screen'; }
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#opsChime'); if(!b) return; e.preventDefault(); e.stopPropagation();
    try{ localStorage.setItem(K,on()?'off':'on'); }catch(x){} paint(); if(window.pvxSay) pvxSay('Reminder chime '+(on()?'on':'off')+' on this screen. A new critical case always chimes.'); },true);
  paint();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 47 of 104 · no id ━━━━━ */
try{
/* PVX-N198 - action sheets: confirmations and Rounds menus */
(function(){
  function phone(){ return window.innerWidth<600; }
  function coarse(){ try{ return matchMedia('(pointer:coarse)').matches; }catch(e){ return false; } }
  var box=document.getElementById('confirmBox'), cancel=document.getElementById('confirmCancel');

  /* 1-2. confirmations */
  var opener=null;
  if(box&&typeof window.showConfirm==='function'){
    pvxWrap('showConfirm',function(sc){ return function(title,okLabel,onOk,opts){
      var a=document.activeElement; opener=(a&&a!==document.body&&!box.contains(a))?a:opener;
      var r=sc.apply(this,arguments);
      box.classList.toggle('pvx-as',phone());
      var danger=!!(opts&&opts.danger);
      setTimeout(function(){
        if(!box.classList.contains('open')||box.querySelector('.pvx-hwrap')) return;   /* the hours sheet focuses its field */
        var f=danger?box:document.getElementById('confirmOk'); if(f) try{ f.focus({preventScroll:true}); }catch(e){ f.focus(); }   /* PVX-N209: no default on a destructive alert */
      },40);
      return r;
    }; },'#47');
    new MutationObserver(function(){
      if(box.classList.contains('open')) return;
      var a=document.activeElement, o=opener; opener=null;
      if(o&&o.isConnected&&(!a||a===document.body||box.contains(a))) try{ o.focus({preventScroll:true}); }catch(e){}
    }).observe(box,{attributes:true,attributeFilter:['class']});
    document.addEventListener('keydown',function(e){
      if(e.key!=='Escape'||!box.classList.contains('open')) return;
      e.preventDefault(); e.stopPropagation(); if(cancel) cancel.click();
    },true);
    window.addEventListener('resize',function(){ if(box.classList.contains('open')) box.classList.toggle('pvx-as',phone()); });
  }

  /* 3. Rounds menus */
  if(typeof window.rdMenu!=='function') return;
  var DANGER=/^(Clear |Undo |Remove )/;
  function esc(t){ return (typeof rdEsc==='function')?rdEsc(t):String(t).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  window.rdMenu=function(anchor,items,onPick){
    rdCloseMenus();
    var plain=[], bad=[];
    items.forEach(function(i){ (i.danger||DANGER.test(i.label||'')?bad:plain).push(i); });
    var radio=items.some(function(i){ return i.on; });
    function row(i,d){ return '<button type="button" tabindex="-1" role="'+(radio?'menuitemradio':'menuitem')+'"'+(radio?' aria-checked="'+(!!i.on)+'"':'')+' data-v="'+esc(i.value)+'" class="'+(i.on?'on ':'')+(d?'danger':'')+'">'+(radio?'<svg class="rd-ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>':'')+esc(i.label)+'</button>'; }
    var html=plain.map(function(i){ return i.sep?'<div class="rd-msep" role="separator"></div>':row(i,false); }).join('')+(bad.length&&plain.length?'<div class="rd-msep" role="separator"></div>':'')+bad.map(function(i){ return row(i,true); }).join('');
    var label=(anchor&&(anchor.getAttribute('aria-label')||anchor.getAttribute('title')||(anchor.textContent||'').trim().slice(0,40)))||'Options';
    var as=phone(), m=document.createElement('div');
    m.className='rd-menu'+(as?' rd-as':'')+(coarse()?' rd-touch':'')+(radio?' rd-radio':'');   /* PVX-N203 */
    if(as) m.innerHTML='<div class="rd-assheet" role="menu" aria-label="'+esc(label)+'"><div class="rd-asgroup">'+html+'</div><button type="button" class="rd-ascancel">Cancel</button></div>';
    else { m.setAttribute('role','menu'); m.setAttribute('aria-label',label); m.innerHTML=html; }
    document.body.appendChild(m);
    if(!as){
      var r=anchor.getBoundingClientRect(), vh=window.innerHeight, h=m.scrollHeight, below=vh-r.bottom-18, above=r.top-18, top, maxH;
      if(h<=below||below>=above){ maxH=Math.max(120,below); top=r.bottom+6; }
      else { maxH=Math.max(120,above); top=Math.max(12,r.top-6-Math.min(h,maxH)); }
      m.style.maxHeight=maxH+'px';
      m.style.left=Math.max(12,Math.min(r.left,window.innerWidth-m.offsetWidth-12))+'px';
      m.style.top=top+'px';
    }
    var opts=[].slice.call(m.querySelectorAll('button'));   /* the items, then Cancel on phones */
    function close(back){
      m.remove(); document.removeEventListener('click',outside,true);
      if(back&&anchor&&anchor.isConnected) try{ anchor.focus({preventScroll:true}); }catch(e){}
    }
    function outside(ev){ if(!m.isConnected){ document.removeEventListener('click',outside,true); return; } if(!m.contains(ev.target)) close(false); }
    m.addEventListener('click',function(e){
      if(e.target===m||e.target.closest('.rd-ascancel')){ e.stopPropagation(); close(true); return; }
      var b=e.target.closest('button[data-v]'); if(!b) return;
      var v=b.dataset.v; close(false); onPick(v);
    });
    m.addEventListener('keydown',function(e){
      var i=opts.indexOf(document.activeElement);
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); close(true); return; }
      if(e.key==='Tab'){ close(false); return; }
      var n=null;
      if(e.key==='ArrowDown') n=(i+1)%opts.length; else if(e.key==='ArrowUp') n=(i-1+opts.length)%opts.length;
      else if(e.key==='Home') n=0; else if(e.key==='End') n=opts.length-1;
      if(n!==null){ e.preventDefault(); opts[n].focus(); }
    });
    setTimeout(function(){ if(m.isConnected) document.addEventListener('click',outside,true); },0);
    var first=m.querySelector('button.on')||opts[0]; if(first) try{ first.focus({preventScroll:true}); }catch(e){ first.focus(); }
    if(anchor&&anchor.setAttribute){ anchor.setAttribute('aria-expanded','true');   /* PVX-N206: the trigger says its menu is open */
      var mo=new MutationObserver(function(){ if(!m.isConnected){ anchor.setAttribute('aria-expanded','false'); mo.disconnect(); } }); mo.observe(document.body,{childList:true}); }
  };
  /* Esc also closes a menu that lost focus */
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&document.querySelector('.rd-menu')){ e.preventDefault(); rdCloseMenus(); } });
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 48 of 104 · no id ━━━━━ */
try{
/* PVX-CTX n201 (n204: checked options) - one Pravix context menu (HIG Context menus; claude/hig-audit-context-menus.md).
   Shared by Flow and Anesia. Self-contained: it injects its own styles on first use.
   PvxCtx.open({items, x, y | anchor, label, preview, onClose}) -> opens a menu
     items: [{label, act(), danger, sub:[items], disabled}, {sep:1}, ...]; falsy entries are dropped (context menus hide);
       n207: {disabled:true} shows the item dimmed and inert (pull-downs keep the same items, HIG The menu bar)
     - destructive items always end the menu, after a separator; at most one level of submenu
     - no title and no keyboard shortcuts; arrow keys, Home/End, Return, Esc; focus returns to the item
     - on a phone (under 600 px) it is an action sheet from the bottom with Cancel
     - preview (HTML) shows above the commands, over a dimmed screen (touch and hold)
   PvxCtx.bind(selector, build(el) -> {items, preview, label} | null, {holdMs, touchOnly, holdPreview})
     right-click / Control-click / two-finger click / the keyboard's context-menu key, plus touch and hold */
(function () {
  if (window.PvxCtx) return;
  var CSS = [
    '.pvx-cx{position:fixed;inset:0;z-index:100000;-webkit-tap-highlight-color:transparent}',
    '.pvx-cx.dim{background:rgba(6,10,22,.42);animation:pvxCxFade .16s ease both}',
    '.pvx-cx-panel{position:absolute;display:flex;flex-direction:column;gap:8px;width:max-content;min-width:220px;max-width:min(320px,calc(100vw - 16px));transform-origin:var(--ox,0) var(--oy,0);animation:pvxCxIn .16s cubic-bezier(.2,.8,.2,1) both}',
    '.pvx-cx-pv{padding:12px 14px;border-radius:14px;background:#1A2438;color:#EEF3F8;border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 40px rgba(0,0,0,.35);font:600 .9375rem/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif}',
    '.pvx-cx-pv small{display:block;margin-top:2px;font-weight:500;font-size:.8125rem;opacity:.72}',
    '.pvx-cx-list{display:flex;flex-direction:column;padding:5px;border-radius:14px;background:#1A2438;border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 40px rgba(0,0,0,.35);overflow-y:auto;overscroll-behavior:contain;max-height:calc(100vh - 16px)}',
    '.pvx-cx-list button{all:unset;box-sizing:border-box;display:flex;align-items:center;gap:10px;min-height:36px;padding:7px 12px;border-radius:9px;color:#EEF3F8;cursor:pointer;font:500 .875rem/1.25 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;white-space:nowrap}',
    '.pvx-cx-list button .l{flex:1;overflow:hidden;text-overflow:ellipsis}',
    '.pvx-cx-list button .c{flex:none;opacity:.6;font-size:1rem;line-height:1}',
    '.pvx-cx-list button .k{flex:none;width:16px;height:16px;fill:none;stroke:#38BDD2;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
    '.pvx-cx-list button:hover,.pvx-cx-list button:focus-visible{background:rgba(56,189,210,.16);outline:none}',
    '.pvx-cx-list button:active{filter:brightness(.88)}',
    '.pvx-cx-list button.danger{color:#FF6B6B}',
    '.pvx-cx-list button.off{opacity:.42;cursor:default}.pvx-cx-list button.off:hover{background:none}',
    '.pvx-cx-list button.back{font-weight:700}',
    '.pvx-cx-list [role=separator]{height:1px;margin:4px 6px;background:rgba(255,255,255,.12);flex:none}',
    'body:not(.dark) .pvx-cx-list,body:not(.dark) .pvx-cx-pv{background:#FFFFFF;border-color:rgba(15,23,42,.10);box-shadow:0 18px 40px rgba(15,23,42,.18)}',
    'body:not(.dark) .pvx-cx-list button,body:not(.dark) .pvx-cx-pv{color:#14181F}',
    'body:not(.dark) .pvx-cx-list button.danger{color:#D92B22}',
    'body:not(.dark) .pvx-cx-list [role=separator]{background:rgba(15,23,42,.10)}',
    '@media (pointer:coarse){.pvx-cx-list button{min-height:44px}}',
    '.pvx-cx.sheet .pvx-cx-panel{left:8px!important;right:8px;top:auto!important;bottom:calc(8px + env(safe-area-inset-bottom,0px));width:auto;max-width:none;min-width:0;transform-origin:50% 100%;animation-name:pvxCxUp}',
    '.pvx-cx.sheet .pvx-cx-list{max-height:62vh}',
    '.pvx-cx.sheet .pvx-cx-list button{justify-content:center;min-height:48px;font-size:1.0625rem}',
    '.pvx-cx-cancel{all:unset;box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-height:52px;border-radius:14px;background:#1A2438;border:1px solid rgba(255,255,255,.10);color:#EEF3F8;font:700 1.0625rem/1 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;cursor:pointer}',
    'body:not(.dark) .pvx-cx-cancel{background:#FFFFFF;border-color:rgba(15,23,42,.10);color:#14181F}',
    '.pvx-cx-cancel:focus-visible{outline:2px solid #38BDD2;outline-offset:2px}',
    '.pvx-cx.out{opacity:0;transition:opacity .12s ease}',
    '.pvx-cx-lift{scale:1.02;transition:scale .16s ease}',
    '@keyframes pvxCxIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:none}}',
    '@keyframes pvxCxUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}',
    '@keyframes pvxCxFade{from{opacity:0}to{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.pvx-cx-panel,.pvx-cx.dim{animation:none}.pvx-cx-lift{scale:none}}',
    '@media (forced-colors:active){.pvx-cx-list,.pvx-cx-pv,.pvx-cx-cancel{border:1px solid CanvasText}}'
  ].join('\n');
  var cur = null, lastOpen = 0;
  function css() { if (document.getElementById('pvx-ctx-css')) return; var s = document.createElement('style'); s.id = 'pvx-ctx-css'; s.textContent = CSS; document.head.appendChild(s); }
  function rmo() { try { return matchMedia('(prefers-reduced-motion:reduce)').matches; } catch (e) { return false; } }
  function norm(items) {
    var a = [], d = [];
    (items || []).forEach(function (i) {
      if (!i) return; if (i.sep) { a.push(i); return; }
      if (i.sub) { i = Object.assign({}, i, { sub: norm(i.sub) }); if (!i.sub.length) return; }
      (i.danger ? d : a).push(i);
    });
    if (d.length) { a.push({ sep: 1 }); a = a.concat(d); }
    var out = []; a.forEach(function (i) { if (i.sep && (!out.length || out[out.length - 1].sep)) return; out.push(i); });
    while (out.length && out[out.length - 1].sep) out.pop();
    return out;
  }
  function focusEl(el) { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } }
  function close(back) {
    if (!cur) return; var c = cur; cur = null;
    document.removeEventListener('keydown', c.key, true); window.removeEventListener('resize', c.away); window.removeEventListener('wheel', c.sc, true); window.removeEventListener('touchmove', c.sc, true);
    if (c.lift) c.lift.classList.remove(c.liftCls);
    c.root.classList.add('out'); setTimeout(function () { c.root.remove(); }, rmo() ? 0 : 130);
    if (c.onClose) try { c.onClose(); } catch (e) { }
    if (back !== false && c.anchor && c.anchor.isConnected) focusEl(c.anchor);
  }
  function open(o) {
    close(false); css();
    var items = norm(o.items);
    if (!items.length) return null;
    var phone = window.innerWidth < 600;
    var root = document.createElement('div');
    root.className = 'pvx-cx' + (phone ? ' sheet dim' : '') + (o.preview && !phone ? ' dim' : '');
    var panel = document.createElement('div'); panel.className = 'pvx-cx-panel';
    root.appendChild(panel);
    if (o.preview) { var pv = document.createElement('div'); pv.className = 'pvx-cx-pv'; pv.setAttribute('aria-hidden', 'true'); pv.innerHTML = o.preview; panel.appendChild(pv); }
    var list = document.createElement('div'); list.className = 'pvx-cx-list'; list.setAttribute('role', 'menu'); list.setAttribute('aria-label', o.label || 'Actions');
    panel.appendChild(list);
    var cancel = null;
    if (phone) { cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'pvx-cx-cancel'; cancel.textContent = 'Cancel'; panel.appendChild(cancel); }
    var c = { root: root, panel: panel, list: list, anchor: o.anchor || null, onClose: o.onClose, lift: o.lift || null, liftCls: o.liftClass || 'pvx-cx-lift', stack: [] };
    function draw(level, title) {
      var h = '';
      if (title) h += '<button type="button" role="menuitem" class="back" data-back="1"><span class="c" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></span><span class="l">' + pvxEsc(title) + '</span></button><div role="separator"></div>';
      level.forEach(function (it, i) {
        if (it.sep) { h += '<div role="separator"></div>'; return; }
        var ck = it.checked !== undefined;   /* n204: an option can show a checkmark (the current choice) */
        h += '<button type="button" role="' + (ck ? 'menuitemradio' : 'menuitem') + '"' + (ck ? ' aria-checked="' + !!it.checked + '"' : '') + ' data-i="' + i + '"' + ((it.danger || it.disabled) ? ' class="' + (it.danger ? 'danger' : '') + (it.disabled ? ' off' : '') + '"' : '') + (it.disabled ? ' aria-disabled="true"' : '') + (it.sub ? ' aria-haspopup="menu"' : '') + '>' + (ck ? '<svg class="k" viewBox="0 0 24 24" aria-hidden="true"' + (it.checked ? '' : ' style="visibility:hidden"') + '><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>' : '') + (it.icon ? '<span class="i" aria-hidden="true">' + it.icon + '</span>' : '') + '<span class="l">' + pvxEsc(it.label) + '</span>' + (it.sub ? '<span class="c" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></span>' : '') + '</button>';
      });
      list.innerHTML = h; list.scrollTop = 0; c.level = level;
      focusEl(list.querySelector('button[data-i]:not([aria-disabled])') || list.querySelector('button'));
    }
    function enter(it) { c.stack.push(c.level); draw(it.sub, it.label); }
    function back() { if (!c.stack.length) return false; draw(c.stack.pop(), null); return true; }
    function pick(btn) {
      if (btn.hasAttribute('data-back')) { back(); return; }
      var it = c.level[+btn.getAttribute('data-i')]; if (!it || it.disabled) return;
      if (it.sub) { enter(it); return; }
      close(false); var a = c.anchor;
      try { it.act && it.act(); } finally { setTimeout(function () { var f = document.activeElement; if ((!f || f === document.body) && a && a.isConnected) focusEl(a); }, 0); }
    }
    list.addEventListener('click', function (e) { var b = e.target.closest('button'); if (!b) return; e.stopPropagation(); pick(b); });
    if (cancel) cancel.addEventListener('click', function (e) { e.stopPropagation(); close(true); });
    root.addEventListener('pointerdown', function (e) { if (e.target === root) { e.preventDefault(); e.stopPropagation(); close(true); } });
    root.addEventListener('click', function (e) { if (e.target === root) { e.stopPropagation(); close(true); } });
    root.addEventListener('contextmenu', function (e) { e.preventDefault(); if (e.target === root) close(true); });
    c.key = function (e) {
      if (!cur || cur !== c) return;
      var bs = [].slice.call(list.querySelectorAll('button')); if (cancel) bs.push(cancel);
      var i = bs.indexOf(document.activeElement), n = null;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); return; }
      if (e.key === 'Tab') { e.preventDefault(); close(true); return; }
      if (e.key === 'ArrowDown') n = (i + 1) % bs.length; else if (e.key === 'ArrowUp') n = (i - 1 + bs.length) % bs.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = bs.length - 1;
      else if (e.key === 'ArrowRight') { var b = document.activeElement; if (b && b.getAttribute('aria-haspopup')) { e.preventDefault(); pick(b); } return; }
      else if (e.key === 'ArrowLeft') { if (back()) e.preventDefault(); return; }
      if (n !== null) { e.preventDefault(); e.stopPropagation(); focusEl(bs[n]); }
    };
    c.away = function () { close(false); };
    c.sc = function (e) { if (cur === c && !(e.target && e.target.nodeType === 1 && c.panel.contains(e.target))) close(false); };
    document.body.appendChild(root);
    cur = c; lastOpen = Date.now();
    if (c.lift) c.lift.classList.add(c.liftCls);
    draw(items, null);
    if (!phone) {
      var W = window.innerWidth, H = window.innerHeight, pw = panel.offsetWidth, ph = panel.offsetHeight, x, y, ox = '0', oy = '0';
      if (o.anchor && (o.x == null || o.y == null)) {
        var r = o.anchor.getBoundingClientRect();
        x = Math.min(Math.max(8, r.left + r.width / 2 - pw / 2), W - pw - 8); ox = '50%';
        if (r.bottom + 8 + ph <= H - 8 || r.top - 8 - ph < 8) { y = Math.min(r.bottom + 8, H - ph - 8); oy = '0'; } else { y = r.top - 8 - ph; oy = '100%'; }
      } else {
        x = o.x; y = o.y;
        if (x + pw > W - 8) { x = Math.max(8, x - pw); ox = '100%'; }
        if (y + ph > H - 8) { y = Math.max(8, y - ph); oy = '100%'; }
      }
      panel.style.left = Math.round(x) + 'px'; panel.style.top = Math.round(Math.max(8, y)) + 'px';
      panel.style.setProperty('--ox', ox); panel.style.setProperty('--oy', oy);
      list.style.maxHeight = (H - 16 - (o.preview ? panel.querySelector('.pvx-cx-pv').offsetHeight + 8 : 0)) + 'px';
    }
    document.addEventListener('keydown', c.key, true);
    window.addEventListener('resize', c.away); window.addEventListener('wheel', c.sc, { capture: true, passive: true }); window.addEventListener('touchmove', c.sc, { capture: true, passive: true });   /* a scroll by the person closes it; programmatic smooth scrolls don't */
    return c;
  }
  function editable(t) { return !!(t && t.closest && t.closest('input,textarea,select,[contenteditable=""],[contenteditable=true]')); }
  function bind(sel, build, opt) {
    opt = opt || {};
    function show(el, e, how) {
      var o = build(el, how); if (!o || !o.items) return false;
      var m = open(Object.assign({ anchor: el }, o, how === 'hold' ? { x: null, y: null, preview: opt.holdPreview ? o.preview : null, lift: o.lift === undefined ? el : o.lift } : how === 'key' ? { x: null, y: null, preview: null } : { x: e.clientX, y: e.clientY, preview: null, lift: null }));
      return !!m;
    }
    document.addEventListener('contextmenu', function (e) {
      if (editable(e.target)) return;
      if (e.clientX || e.clientY) { try { var s = window.getSelection && getSelection(); if (s && !s.isCollapsed && String(s).trim()) { for (var k = 0; k < s.rangeCount; k++) { if (s.getRangeAt(k).intersectsNode(e.target)) return; } } } catch (x) {} }   /* n358: on selected text, the browser's Copy and Look Up */
      var el = e.target.closest && e.target.closest(sel); if (!el) return;
      if (opt.skip && opt.skip(el, e)) return;
      if (Date.now() - lastOpen < 700 && cur) { e.preventDefault(); return; }   /* a touch hold already opened it */
      var how = (!e.clientX && !e.clientY) ? 'key' : 'click';
      if (show(el, e, how)) e.preventDefault();
    }, true);
    var t = 0, sx = 0, sy = 0, eat = 0;
    function clear() { clearTimeout(t); t = 0; }
    document.addEventListener('pointerdown', function (e) {
      clear(); if (e.button > 0 || editable(e.target)) return;
      if (opt.touchOnly && e.pointerType === 'mouse') return;
      var el = e.target.closest && e.target.closest(sel); if (!el) return;
      if (opt.skip && opt.skip(el, e)) return;
      sx = e.clientX; sy = e.clientY;
      t = setTimeout(function () {
        t = 0; if (cur && Date.now() - lastOpen < 700) return; if (opt.beforeHold) try { opt.beforeHold(el); } catch (x) { }
        if (show(el, e, 'hold')) { eat = Date.now(); try { if (navigator.vibrate && matchMedia('(pointer:coarse)').matches) navigator.vibrate(6); } catch (x) { } }
      }, opt.holdMs || 500);
    }, true);
    document.addEventListener('pointermove', function (e) { if (t && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) clear(); }, { passive: true, capture: true });
    ['pointerup', 'pointercancel', 'dragstart'].forEach(function (k) { document.addEventListener(k, function (e) { clear(); if (k === 'dragstart' && cur && Date.now() - lastOpen < 1500) close(false); }, true); });
    document.addEventListener('click', function (e) { if (eat && Date.now() - eat < 900) { eat = 0; e.preventDefault(); e.stopPropagation(); } }, true);
  }
  window.PvxCtx = { open: open, close: close, bind: bind, isOpen: function () { return !!cur; } };
})();

/* PVX-N201 - Flow's context menus */
(function(){
  if(!window.PvxCtx) return;
  function find(pid){ return (typeof PATIENTS!=='undefined'?PATIENTS:[]).find(function(x){ return x.id===pid; }); }
  function shown(){ var b=document.body.classList; return !(b.contains('tv-mode')||b.contains('client-mode')); }
  function call(name){ var f=window[name]; return typeof f==='function'?f:null; }
  function copyLink(p){ pvxShareTracker(trackUrlFor(p), pvxFullName(p)); }
  function flowItems(p){
    var done=typeof isCompleted==='function'&&isCompleted(p);
    var stages=done?[]:STAGE_ORDER.filter(function(st){ return st!==p.status; }).map(function(st){ return {label:st,act:function(){ call('moveStatus')(p,st); }}; });
    var rooms=done?[]:ROOMS.concat(['Treatment']).filter(function(rm){ return rm!==p.room&&canDropRoom(p,rm); }).map(function(rm){ return {label:rm,act:function(){
      if(rm==='Comfort Room') showConfirm('Move patient to Comfort Room?','Move patient',function(){ call('moveRoom')(p,rm); }); else call('moveRoom')(p,rm); }}; });
    var docs=done?[]:DOCTORS.filter(function(d){ return d.id!==p.doctor; }).map(function(d){ return {label:d.name,act:function(){ call('assignDoctor')(p,d.id); try{ renderAll(); }catch(e){} }}; });
    return [{label:'Open',act:function(){ openDrawer(p.id); }}, (window.pvxNewWinItem&&pvxNewWinItem(p)), {sep:1},
      stages.length&&{label:'Move to',sub:stages}, rooms.length&&{label:'Room',sub:rooms}, docs.length&&{label:'Assign doctor',sub:docs},
      (!done&&p.waitingOn&&p.waitingOn.text)&&{label:'Clear “Waiting on '+p.waitingOn.text+'”',act:function(){ var t=document.createElement('button'); t.type='button'; t.hidden=true; t.setAttribute('data-fvwait',p.id); document.body.appendChild(t); t.click(); t.remove(); }}, {sep:1},
      (!done&&window.fvDocs&&fvDocs.openSend)&&{label:'Send a form…',icon:'<svg viewBox="0 0 24 24"><path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5L3 9.5 21 3z"/></svg>',act:function(){ fvDocs.openSend(p); }},
      (p.publicToken&&typeof trackUrlFor==='function')&&{label:'Copy tracker link',icon:'<svg viewBox="0 0 24 24"><path d="M9 7h6.5L19 10.5V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><path d="M5 16V5a2 2 0 0 1 2-2h6"/></svg>',act:function(){ pvxCopyTracker(trackUrlFor(p)); }},
      (p.publicToken&&typeof trackUrlFor==='function'&&typeof pvxCanShare==='function'&&pvxCanShare())&&{label:'Share tracker link…',icon:'<svg viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M8 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>',act:function(){ copyLink(p); }}];
  }
  function rdItems(p,row){
    var r=p.rounds||{}, ended=!!r.outcome, open=row.classList.contains('open');
    var cur=typeof rdCurrentDocId==='function'?rdCurrentDocId(p):null;
    return [{label:open?'Close':'Open',act:function(){ rdHandleAct('toggle',row.querySelector('.rd-rowmain')||row); }},
      !ended&&typeof RD_ACUITY!=='undefined'&&{label:'Status',sub:Object.keys(RD_ACUITY).filter(function(k){ return k!==r.acuity; }).map(function(k){ return {label:RD_ACUITY[k].label,act:function(){ rdSetAcuity(p,k); }}; })},
      !ended&&typeof rdAllDoctors==='function'&&{label:'Take case',sub:rdAllDoctors().filter(function(d){ return d.id!==cur; }).map(function(d){ return {label:drName(d.name)+(typeof rdActorId!=='undefined'&&rdActorId===d.id?' (you)':''),act:function(){ rdTakeCase(p,d.id); }}; })},
      {sep:1},
      find(p.id)&&{label:'Show in Flow',act:function(){ switchApp('flow'); setTimeout(function(){ openDrawer(p.id); },80); }}];
  }
  var SEL='#board .card[data-pid],#tableBody tr[data-pid],.r-pt[data-pid],.rd-row[data-pid]>.rd-rowmain,#view-dashboard .attn-item[data-pid]';   /* n357: the Attention center too */
  PvxCtx.bind(SEL,function(el){
    if(!shown()) return null;
    var row=el.classList.contains('rd-rowmain')?el.parentElement:null, pid=(row||el).getAttribute('data-pid');
    var p=row?(typeof rdFind==='function'?rdFind(pid):null):find(pid); if(!p) return null;
    return {items:row?rdItems(p,row):flowItems(p),label:'Actions for '+pvxFullName(p),lift:row||el};
  },{touchOnly:true,holdMs:500,
     skip:function(el,e){ return e.type==='pointerdown'&&!!(e.target.closest('button,a,input,select,textarea,[role=button]')&&e.target.closest('button,a,input,select,textarea,[role=button]')!==el); },
     beforeHold:function(){ if(window.rdRk&&typeof rdRankEnd==='function') rdRankEnd(false); }});
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 49 of 104 · pvx-n202-js ━━━━━ */
try{
/* PVX-N202 - Cmd-Z / Shift-Cmd-Z (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y) undo and redo the last change that offered Undo */
(function(){
  function modal(){ if(window.PvxCtx&&PvxCtx.isOpen()) return true; if(document.querySelector('.rd-menu,.pvx-menu')) return true;
    return [].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'),pvxShown); }
  document.addEventListener('keydown',function(e){
    if(!(e.metaKey||e.ctrlKey)||e.altKey||!window.pvxUndo) return;
    var k=(e.key||'').toLowerCase(), isUndo=k==='z'&&!e.shiftKey, isRedo=(k==='z'&&e.shiftKey)||(k==='y'&&e.ctrlKey&&!e.metaKey);
    if(!isUndo&&!isRedo) return;
    var b=document.body.classList; if(b.contains('tv-mode')||b.contains('client-mode')||pvxTyping()||modal()) return;   /* the field's own Undo, or nothing */
    e.preventDefault(); e.stopPropagation(); if(isUndo) pvxUndo.undo(); else pvxUndo.redo();
  },true);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 50 of 104 · pvx-n203-js ━━━━━ */
try{
/* PVX-N203 - the Operations menu works from the keyboard and gives focus back to + */
(function(){
  var menu=document.getElementById('opsMenu'), fab=document.getElementById('fabAdd'); if(!menu||!fab) return;
  fab.setAttribute('aria-haspopup','menu'); fab.setAttribute('aria-controls','opsMenu');
  function items(){ return [].slice.call(menu.querySelectorAll('.ops-item')).filter(function(b){ return b.offsetParent!==null&&!b.disabled; }); }
  function focusEl(el){ if(el) try{ el.focus({preventScroll:true}); }catch(e){ el.focus(); } }
  if(typeof window.opsMenuOpen==='function'){ pvxAfter('opsMenuOpen',function(){ setTimeout(function(){ if(menu.classList.contains('open')) focusEl(items()[0]); },30); },'n203'); }
  if(typeof window.opsMenuClose==='function'){ pvxWrap('opsMenuClose',function(cl){ return function(){ var inside=menu.contains(document.activeElement); var r=cl.apply(this,arguments); if(inside) focusEl(fab); return r; }; },'n203'); }
  menu.addEventListener('keydown',function(e){
    var b=items(), i=b.indexOf(document.activeElement), n=null;
    if(e.key==='ArrowDown') n=(i+1)%b.length; else if(e.key==='ArrowUp') n=(i-1+b.length)%b.length;
    else if(e.key==='Home') n=0; else if(e.key==='End') n=b.length-1;
    else if(e.key==='Tab'){ e.preventDefault(); window.opsMenuClose(); return; }
    else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); window.opsMenuClose(); return; }
    if(n!==null){ e.preventDefault(); focusEl(b[n]); }
  });
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 51 of 104 · no id ━━━━━ */
try{
/* PVX-KEYS n207 - the Keyboard shortcuts sheet, shared by Flow and Anesia (HIG The menu bar; claude/hig-audit-menu-bar.md).
   A web app can't put its commands in the Mac menu bar, so this sheet does the menu bar's other job: it lists every
   shortcut, by group, next to the command it runs. Self-contained: it injects its own styles on first use.
   PvxKeys.bind(groups())        -> "?" opens / closes the sheet (not while typing, not over another dialog or menu)
   PvxKeys.open(groups(), from)  -> opens it; ✕ Close, Esc, Command-Period or ? closes it (n211: a view-only sheet closes with ✕, not Done) and focus returns to `from`
   PvxKeys.cap(keys)             -> keycap HTML for ['alt','V'], ['mod','K'] (Mac: ⌥ ⌘; Windows: Alt, Ctrl)
   PvxKeys.aria(keys)            -> the aria-keyshortcuts value ("Alt+V", "Meta+K Control+K")
   groups: [{title, items:[{keys:['alt','V'], label:'Vitals now'}, ...]}, ...] */
(function () {
  if (window.PvxKeys) return;
  var MAC = /mac|iphone|ipad|ipod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent);
  var NAME = MAC ? { alt: '⌥', mod: '⌘', shift: '⇧', ctrl: '⌃', esc: 'Esc', 'return': 'Return' } : { alt: 'Alt', mod: 'Ctrl', shift: 'Shift', ctrl: 'Ctrl', esc: 'Esc', 'return': 'Enter' };
  var ARIA = { alt: 'Alt', shift: 'Shift', ctrl: 'Control' };
  var CSS = [
    '.pvx-ks{position:fixed;inset:0;z-index:100001;display:grid;place-items:center;padding:16px;background:rgba(6,10,22,.46);animation:pvxKsFade .16s ease both}',
    '.pvx-ks-box{width:min(520px,100%);max-height:min(760px,calc(100vh - 32px));display:flex;flex-direction:column;border-radius:18px;background:#1A2438;color:#EEF3F8;border:1px solid rgba(255,255,255,.10);box-shadow:0 24px 60px rgba(0,0,0,.40);font:500 .875rem/1.35 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;animation:pvxKsIn .18s cubic-bezier(.2,.8,.2,1) both}',
    '.pvx-ks-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 10px}',
    '.pvx-ks-head h2{margin:0;font:700 1.0625rem/1.25 -apple-system,BlinkMacSystemFont,"SF Pro Display",system-ui,sans-serif}',
    '.pvx-ks-body{overflow-y:auto;overscroll-behavior:contain;padding:0 20px 8px}',
    '.pvx-ks-body h3{margin:14px 0 6px;font:800 .6875rem/1 -apple-system,BlinkMacSystemFont,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8AA2BB}',
    '.pvx-ks-body dl{margin:0;display:grid;grid-template-columns:1fr auto;gap:0}',
    '.pvx-ks-body dt,.pvx-ks-body dd{margin:0;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.07)}',
    '.pvx-ks-body dd{text-align:right;white-space:nowrap}',
    '.pvx-ks-body{padding-bottom:18px}',
    '.pvx-ks-x{all:unset;box-sizing:border-box;flex:0 0 auto;display:inline-grid;place-items:center;width:36px;height:36px;border-radius:999px;background:rgba(255,255,255,.08);color:inherit;cursor:pointer}',
    '.pvx-ks-x svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}',
    '.pvx-ks-x:hover{background:rgba(255,255,255,.14)}',
    '.pvx-ks-x:focus-visible{outline:2px solid #38BDD2;outline-offset:2px}',
    '.pvx-ks-x:active{filter:brightness(.88)}',
    'kbd.pvx-kc{display:inline-block;letter-spacing:.02em;min-width:1.6em;padding:1px 6px;margin-left:4px;border-radius:6px;border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.06);font:600 .75rem/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif;text-align:center;color:inherit}',
    'body:not(.dark) .pvx-ks-box{background:#FFFFFF;color:#14181F;border-color:rgba(15,23,42,.10);box-shadow:0 24px 60px rgba(15,23,42,.20)}',
    'body:not(.dark) .pvx-ks-body h3{color:#5B6B80}',
    'body:not(.dark) .pvx-ks-body dt,body:not(.dark) .pvx-ks-body dd{border-bottom-color:rgba(15,23,42,.08)}',
    'body:not(.dark) kbd.pvx-kc{border-color:rgba(15,23,42,.16);background:rgba(15,23,42,.04)}',
    'body:not(.dark) .pvx-ks-x{background:rgba(15,23,42,.06)}',
    'body:not(.dark) .pvx-ks-x:hover{background:rgba(15,23,42,.10)}',
    '@media (pointer:coarse){.pvx-ks-x{width:44px;height:44px}}',
    '@keyframes pvxKsIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:none}}',
    '@keyframes pvxKsFade{from{opacity:0}to{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){.pvx-ks,.pvx-ks-box{animation:none}}',
    '@media (forced-colors:active){.pvx-ks-box,kbd.pvx-kc,.pvx-ks-x{border:1px solid CanvasText}}'
  ].join('\n');
  var cur = null;
  function css() { if (document.getElementById('pvx-keys-css')) return; var s = document.createElement('style'); s.id = 'pvx-keys-css'; s.textContent = CSS; document.head.appendChild(s); }
  function word(k) { return NAME[k] || k; }
  function text(keys) { return keys.map(word).join(MAC ? '' : '+'); }   /* for tooltips: ⌥2 / Alt+2 */
  function cap(keys) { return keys.map(function (k) { return '<kbd class="pvx-kc">' + pvxEsc(word(k)) + '</kbd>'; }).join(''); }
  function said(keys) { return keys.map(function (k) { return { alt: MAC ? 'Option' : 'Alt', mod: MAC ? 'Command' : 'Control', shift: 'Shift', ctrl: 'Control', esc: 'Escape', 'return': MAC ? 'Return' : 'Enter', '↑': 'Up arrow', '↓': 'Down arrow', '?': 'Question mark' }[k] || k; }).join(' '); }
  function aria(keys) {
    function one(mod) { return keys.map(function (k) { return k === 'mod' ? mod : (ARIA[k] || k); }).join('+'); }
    return keys.indexOf('mod') > -1 ? one('Meta') + ' ' + one('Control') : one();
  }
  function shown(el) { var r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; var c = getComputedStyle(el); return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05; }
  function busy() {
    if (window.PvxCtx && PvxCtx.isOpen()) return true;
    if (document.querySelector('.rd-menu,.pvx-menu')) return true;
    return [].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'), function (d) { return !d.closest('.pvx-ks') && shown(d); });
  }
  function close() {
    if (!cur) return; var c = cur; cur = null;
    window.removeEventListener('keydown', c.key, true); c.root.remove();
    if (c.from && c.from.isConnected) try { c.from.focus({ preventScroll: true }); } catch (e) { }
  }
  function open(groups, from) {
    close(); css();
    var root = document.createElement('div'); root.className = 'pvx-ks';
    var body = (groups || []).filter(function (g) { return g && g.items && g.items.length; }).map(function (g) {
      return '<h3>' + pvxEsc(g.title) + '</h3><dl>' + g.items.map(function (i) {
        return '<dt>' + pvxEsc(i.label) + '</dt><dd aria-label="' + pvxEsc(said(i.keys)) + '">' + cap(i.keys) + '</dd>';
      }).join('') + '</dl>';
    }).join('');
    root.innerHTML = '<div class="pvx-ks-box" role="dialog" aria-modal="true" aria-labelledby="pvxKsT"><div class="pvx-ks-head"><h2 id="pvxKsT">Keyboard shortcuts</h2>' +
      '<button type="button" class="pvx-ks-x" aria-label="Close" title="Close (Esc)"><svg viewBox="0 0 24 24" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>' +
      '<div class="pvx-ks-body">' + body + '</div></div>';
    var done = root.querySelector('.pvx-ks-x');   /* n211: ✕ Close, not Done */
    var c = { root: root, from: from || document.activeElement };
    c.key = function (e) {
      if (cur !== c) return;
      if (e.key === 'Escape' || (e.key === '?' && !pvxTyping())) { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') { e.preventDefault(); done.focus(); return; }   /* one control: focus stays on Close */
      e.stopPropagation();   /* the app's own shortcuts wait until the sheet closes (Return and Space still press Close) */
    };
    done.addEventListener('click', close);
    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    window.addEventListener('keydown', c.key, true);   /* window capture runs before the apps' own key handlers */
    document.body.appendChild(root); cur = c;
    try { done.focus({ preventScroll: true }); } catch (e) { done.focus(); }
    return root;
  }
  function bind(groups, opts) {
    opts = opts || {};
    document.addEventListener('keydown', function (e) {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey || cur) return;
      if (pvxTyping() || busy() || (opts.skip && opts.skip())) return;
      e.preventDefault(); open(typeof groups === 'function' ? groups() : groups, document.activeElement);
    });
  }
  /* n209: Command-Period cancels wherever Esc does (HIG Alerts) - it is passed on as an Esc press */
  window.addEventListener('keydown', function (e) {
    if (!(((e.metaKey && !e.ctrlKey) || (!MAC && e.ctrlKey && !e.metaKey)) && !e.altKey && (e.key === '.' || e.code === 'Period'))) return;   /* PVX-N366: Ctrl+. off a Mac */
    e.preventDefault(); e.stopPropagation();
    var t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document;
    var ev = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true });
    t.dispatchEvent(ev);
  }, true);
  window.PvxKeys = { open: open, close: close, bind: bind, cap: cap, aria: aria, word: word, text: text, mac: MAC, isOpen: function () { return !!cur; } };
})();

/* PVX-N207 - Flow's keyboard: view keys, the shortcuts sheet, the search keycap, /#op=new */
(function(){
  /* the views in their order on screen (Consent forms joins when it is available) */
  function views(){ return [].slice.call(document.querySelectorAll('#subnavFlow .seg[data-view]')).slice(0,9).map(function(b){ var c=b.cloneNode(true); [].forEach.call(c.querySelectorAll('[class*="badge"],[hidden],svg'),function(x){ x.remove(); }); return [b.dataset.view,(c.textContent||'').replace(/\s+/g,' ').trim(),b]; }); }
  function modal(){ if(window.PvxCtx&&PvxCtx.isOpen()) return true; if(PvxKeys.isOpen()) return true; if(document.querySelector('.rd-menu,.pvx-menu')) return true;
    if(document.getElementById('opsMenu')&&document.getElementById('opsMenu').classList.contains('open')) return true;
    return [].some.call(document.querySelectorAll('[role=dialog][aria-modal=true],[role=alertdialog]'),pvxShown); }
  function screenMode(){ var b=document.body.classList; return b.contains('tv-mode')||b.contains('client-mode'); }
  function app(){ try{ return currentApp; }catch(e){ return 'flow'; } }
  /* tooltips and aria-keyshortcuts on the view buttons, kept in step when a view joins */
  function label(){ views().forEach(function(v,i){ var k='Alt+'+(i+1); if(v[2].getAttribute('aria-keyshortcuts')===k) return; v[2].setAttribute('aria-keyshortcuts',k); v[2].title='Show '+v[1]+' ('+PvxKeys.text(['alt',String(i+1)])+')'; }); }
  label(); setTimeout(label,1500);
  var sw=document.querySelector('#subnavFlow .switcher')||document.getElementById('switcher'); if(sw&&window.MutationObserver) new MutationObserver(label).observe(sw,{childList:true});
  document.addEventListener('keydown',function(e){
    if(!e.altKey||e.metaKey||e.ctrlKey||e.shiftKey) return;
    var m=/^Digit([1-9])$/.exec(e.code||''); if(!m) return;
    if(pvxTyping()||modal()||screenMode()||app()!=='flow') return;
    var v=views()[+m[1]-1], b=v&&v[2]; if(!b||!pvxShown(b)) return;
    e.preventDefault(); b.click();
  });
  /* the search keycap: Ctrl K off the Mac; hidden while the field has text */
  var key=document.getElementById('globalSearchKey'), inp=document.getElementById('globalSearch');
  if(key&&!PvxKeys.mac) key.textContent='Ctrl K';
  if(inp){ var bar=inp.closest('.search-bar'); var sync=function(){ if(bar) bar.classList.toggle('has-text',!!inp.value); }; inp.addEventListener('input',sync); inp.addEventListener('change',sync); sync(); }
  /* the sheet */
  function groups(){
    return [
      {title:'Views', items:views().map(function(v,i){ return {keys:['alt',String(i+1)], label:v[1]}; })},
      {title:'Patients', items:[{keys:['mod','K'],label:'Search patients, rooms and commands'},{keys:['mod','P'],label:'Print this view'},{keys:['mod','Z'],label:'Undo the last change'},{keys:['shift','mod','Z'],label:'Redo'},{keys:['alt','↓'],label:'Next patient, with one open'},{keys:['alt','↑'],label:'Previous patient, with one open'}]},
      {title:'Menus and sheets', items:[{keys:['esc'],label:'Close the menu or sheet'},{keys:['↑','↓'],label:'Move through a menu'},{keys:['return'],label:'Choose'}]},
      {title:'Help', items:[{keys:['?'],label:'Show keyboard shortcuts'}]}
    ];
  }
  PvxKeys.bind(groups,{skip:screenMode});
  /* /#op=new - New patient from the Mac File menu, the Dock menu or a link */
  function opFromHash(){ if(!/(^#|&)op=new\b/.test(String(location.hash||''))) return;
    try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
    try{ if(app()!=='flow'&&typeof switchApp==='function') switchApp('flow'); }catch(e){}
    setTimeout(function(){ if(typeof openAddPatient==='function') openAddPatient(); },120); }
  setTimeout(opFromHash,700); window.addEventListener('hashchange',opFromHash);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 52 of 104 · no id · PVX-N207: keyboard and menu bar ━━━━━ */
try{
/* PVX-N209 - alerts: a second action (opts.alt), a description for VoiceOver, Cancel is always Cancel */
(function(){
  var box=document.getElementById('confirmBox'), ok=document.getElementById('confirmOk'), cancel=document.getElementById('confirmCancel'), sub=document.getElementById('confirmSub');
  if(!box||!ok||typeof window.showConfirm!=='function') return;
  var alt=document.createElement('button'); alt.type='button'; alt.id='confirmAlt'; alt.className='btn ghost'; alt.hidden=true;
  ok.parentNode.insertBefore(alt, ok);   /* row: Cancel · second action · action; phone stack: action, second action, Cancel */
  pvxWrap('showConfirm',function(sc){ return function(title,okLabel,onOk,opts){
    opts=opts||{};
    var r=sc.apply(this,arguments);
    if(cancel) cancel.textContent='Cancel';
    if(opts.alt&&opts.alt.label){
      alt.hidden=false; alt.textContent=opts.alt.label; box.classList.add('has-alt');
      alt.onclick=function(){ document.getElementById('confirmScrim').classList.remove('open'); box.classList.remove('open'); try{ opts.alt.act&&opts.alt.act(); }catch(e){ console.warn('[confirm]',e); } };
    } else { alt.hidden=true; alt.onclick=null; box.classList.remove('has-alt'); }
    if(sub&&opts.sub) box.setAttribute('aria-describedby','confirmSub'); else box.removeAttribute('aria-describedby');
    if(!box.querySelector('.pvx-hwrap')) box.setAttribute('aria-labelledby','confirmTitle');
    return r;
  }; },'#52');
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 53 of 104 · no id · PVX-N209: alerts ━━━━━ */
try{
/* PVX-N211 - iPhone sheets: Flow's main sheets match Anesia's (HIG Sheets) */
(function(){
  var PH=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false,addListener:function(){}};
  var RM=function(){ return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches); };
  var CFG=[{m:'apModal',l:'#apCancel',r:'#apCreate',x:'#apClose',close:function(){ closeAddPatient(); }},
           {m:'shiftModal',l:'#shiftCancel',r:'#shiftSave',x:'#shiftClose',close:function(){ closeShiftSetup(); }},
           {m:'alertModal',l:'#alertCancelBtn',r:'#alertActivateBtn',x:'#alertClose',close:function(){ closeAlertModal(); }}];
  function q(c,sel){ var m=document.getElementById(c.m); return m&&m.querySelector(sel); }
  function park(btn,cls,head,before){ if(!btn||btn.closest('.addpt-head')) return;
    var mk=document.createComment('pvx-ps'); btn.parentNode.insertBefore(mk,btn); btn._pvxMark=mk;
    btn.classList.add('pvx-ps-btn',cls); if(before) head.insertBefore(btn,before); else head.appendChild(btn); }
  function undo(c){ var m=document.getElementById(c.m); if(!m) return;
    [].slice.call(m.querySelectorAll('.addpt-head .pvx-ps-btn')).forEach(pvxUnpark);
    var x=q(c,c.x); if(x){ x.removeAttribute('aria-hidden'); x.removeAttribute('tabindex'); if(x._pvxMark) pvxUnpark(x); }
    var f=m.querySelector('.addpt-foot'); if(f) f.classList.remove('pvx-ps-empty');
    m.classList.remove('pvx-ps','pvx-ps-bar'); }
  function arrange(c){ var m=document.getElementById(c.m); if(!m) return; undo(c); if(!PH.matches) return;
    var head=m.querySelector('.addpt-head'), foot=m.querySelector('.addpt-foot'), t=m.querySelector('.aph-title'); if(!head||!t) return;
    m.classList.add('pvx-ps');
    if(!m.querySelector('.pvx-grab')){ var g=document.createElement('div'); g.className='pvx-grab'; g.setAttribute('aria-hidden','true'); m.insertBefore(g,m.firstChild); }
    var L=foot&&foot.querySelector(c.l), R=foot&&foot.querySelector(c.r), X=q(c,c.x);
    if(L&&R){ park(L,'pvx-ps-l',head,t); park(R,'pvx-ps-r',head,null); m.classList.add('pvx-ps-bar');
      if(X){ X.setAttribute('aria-hidden','true'); X.setAttribute('tabindex','-1'); } }
    else if(X&&X.parentNode===head){ var mk=document.createComment('pvx-ps'); head.insertBefore(mk,X); X._pvxMark=mk; head.insertBefore(X,t); }   /* view-only: ✕ Close, leading (as in Anesia) */
    if(foot) foot.classList.toggle('pvx-ps-empty', ![].some.call(foot.children,function(k){ return k.offsetParent!==null||getComputedStyle(k).display!=='none'; }));
  }
  function all(){ CFG.forEach(arrange); }
  window.pvxPhoneSheets=all;
  /* the alert sheet rebuilds its footer: hand the buttons back first */
  if(typeof renderAlertModal==='function'){ pvxWrap('renderAlertModal',function(ram){ return function(){ undo(CFG[2]); var r=ram.apply(this,arguments); arrange(CFG[2]); return r; }; },'#53'); }
  if(PH.addEventListener) PH.addEventListener('change',all); else PH.addListener(all);
  all();
  /* changes since the sheet opened: typing, picking, toggling */
  CFG.forEach(function(c){ var m=document.getElementById(c.m); if(!m) return; m._pvxDirty=false;
    new MutationObserver(function(){ var o=m.classList.contains('open'); if(o&&!m._pvxWas) m._pvxDirty=false; m._pvxWas=o; }).observe(m,{attributes:true,attributeFilter:['class']});
    ['input','change'].forEach(function(k){ m.addEventListener(k,function(e){ if(e.isTrusted!==false) m._pvxDirty=true; },true); });
    m.addEventListener('click',function(e){ if(e.target.closest&&e.target.closest('.ap-seg-btn,.ap-prio-btn,.alert-type,.pvx-unit button,.rvp-chip,.rvp-x,.dd-opt')) m._pvxDirty=true; },true);
  });
  document.addEventListener('click',function(e){ if(!(e.target.closest&&e.target.closest('.dd-panel .dd-opt'))) return;
    CFG.forEach(function(c){ var m=document.getElementById(c.m); if(m&&m.classList.contains('open')) m._pvxDirty=true; }); },true);
  function ask(c){ showConfirm('Discard your changes?','Discard',function(){ var m=document.getElementById(c.m); if(m) m._pvxDirty=false; c.close(); },{sub:'What you typed in this sheet will be lost.',danger:true});
    var k=document.getElementById('confirmCancel'); if(k) k.textContent='Keep editing'; }
  window.pvxSheetDirty=function(id){ var m=document.getElementById(id); return !!(m&&m._pvxDirty); };
  /* drag the sheet down by its top to close it */
  CFG.forEach(function(c){ var m=document.getElementById(c.m); if(!m) return;
    var y0=null, dy=0, ly=0, lt=0, v=0;
    m.addEventListener('touchstart',function(e){ if(!PH.matches||!m.classList.contains('open')||!pvxGrabZone(e)||e.touches.length>1) return;
      y0=ly=e.touches[0].clientY; lt=performance.now(); dy=0; v=0; m.classList.add('pvx-ps-drag'); },{passive:true});
    m.addEventListener('touchmove',function(e){ if(y0===null) return; var y=e.touches[0].clientY, t=performance.now();
      if(t>lt) v=v*.4+(y-ly)/(t-lt)*.6; ly=y; lt=t; dy=y-y0; dy=dy<0?dy/4:dy; m.style.transform='translateY('+dy+'px)'; },{passive:true});
    function end(){ if(y0===null) return; y0=null; m.classList.remove('pvx-ps-drag');
      var go=dy>90||(v>.5&&dy>24);
      if(go&&!m._pvxDirty){ if(RM()){ m.style.transform=''; c.close(); return; }
        m.style.transform='translateY('+(m.offsetHeight+24)+'px)'; setTimeout(function(){ c.close(); setTimeout(function(){ m.style.transform=''; },380); },200); return; }
      m.style.transform=''; if(go) ask(c); }
    m.addEventListener('touchend',end); m.addEventListener('touchcancel',end);
  });
})();
/* PVX-N211 - one sheet at a time on iPhone: the patient drawer steps aside for a sheet opened from it and comes back after */
(function(){
  function phone(){ return window.innerWidth<=820; }   /* wherever the drawer fills the screen */
  window.pvxSheetBack=function(){ var d=document.getElementById('drawer');
    if(!phone()||!d||!d.classList.contains('open')||typeof activePatient==='undefined'||!activePatient) return null;
    var b=d.querySelector('.drawer-body'), back={pid:activePatient, top:b?b.scrollTop:0}; closeDrawer(); return back; };
  window.pvxSheetReturn=function(back){ if(!back||!PATIENTS.some(function(x){ return x.id===back.pid; })) return;
    var d=document.getElementById('drawer'); if(d&&d.classList.contains('open')) return;
    openDrawer(back.pid); var put=function(){ var b=document.querySelector('#drawer .drawer-body'); if(b) b.scrollTop=back.top; };
    put(); requestAnimationFrame(function(){ put(); setTimeout(put,60); }); };
  if(typeof openCareTeam==='function'&&typeof closeCareTeam==='function'){
    var ctBack=null;
    pvxWrap('openCareTeam',function(oct){ return function(pid){ var b=pvxSheetBack(); var r=oct.apply(this,arguments); if(b) ctBack=b; return r; }; },'#53');
    pvxWrap('closeCareTeam',function(cct){ return function(){ var b=ctBack; ctBack=null; var r=cct.apply(this,arguments); if(b) setTimeout(function(){ pvxSheetReturn(b); },0); return r; }; },'#53');
  }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 54 of 104 · no id · PVX-N211: sheets ━━━━━ */
try{
/* PVX-N212 - search fields (HIG Search fields) */
(function(){
  var inp=document.getElementById('globalSearch'), box=document.getElementById('searchResults'); if(!inp||!box) return;
  var CW=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false};
  /* 1. the placeholder fits the width */
  var PH=['Search patients, doctors, rooms','Search patients, doctors','Search patients','Search'], cv;   /* PVX-N361: the longest whole phrase that fits */
  function ph(){ var cs=getComputedStyle(inp), room=inp.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);
    if(!(room>0)){ inp.placeholder=CW.matches?PH[2]:PH[0]; return; }
    try{ cv=cv||document.createElement('canvas').getContext('2d'); cv.font=cs.fontStyle+' '+cs.fontWeight+' '+cs.fontSize+' '+cs.fontFamily; }catch(e){ cv=null; }
    var pick=PH[3]; if(cv){ for(var k=0;k<PH.length;k++){ if(cv.measureText(PH[k]).width<=room-2){ pick=PH[k]; break; } } }
    if(inp.placeholder!==pick) inp.placeholder=pick; }
  try{ if(window.ResizeObserver) new ResizeObserver(function(){ ph(); }).observe(inp); }catch(e){}
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(ph);
  ph(); if(CW.addEventListener) CW.addEventListener('change',ph);
  /* 2. Clear */
  var X='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="currentColor" opacity=".32"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
  function clearer(field){ var bar=field&&field.closest('.search-bar'); if(!bar||bar.querySelector('.pvx-sclear')) return;
    var b=document.createElement('button'); b.type='button'; b.className='pvx-sclear'; b.setAttribute('aria-label','Clear search'); b.title='Clear'; b.innerHTML=X;
    field.parentNode.insertBefore(b,field.nextSibling);   /* right after the text, before the mic */
    function sync(){ bar.classList.toggle('pvx-has',!!field.value); }
    ['input','keyup','change','blur','focus'].forEach(function(k){ field.addEventListener(k,sync); });
    b.addEventListener('mousedown',function(e){ e.preventDefault(); });   /* keep the field focused */
    b.addEventListener('click',function(){ field.value=''; field.dispatchEvent(new Event('input',{bubbles:true})); sync(); try{ field.focus({preventScroll:true}); }catch(e){ field.focus(); } });
    sync(); }
  clearer(inp); clearer(document.getElementById('rdSearch'));
  /* 6. best match first */
  if(typeof searchIndex==='function'){ pvxWrap('searchIndex',function(si){ return function(q){ var r=si.apply(this,arguments), ql=String(q||'').trim().toLowerCase();
    function rank(x){ var t=String(x.title||'').toLowerCase(); if(t.indexOf(ql)===0) return 0; if(t.split(/[\s.\-']+/).some(function(w){ return w.indexOf(ql)===0; })) return 1; return 2; }
    return r.map(function(x,i){ return {x:x,i:i,k:rank(x)}; }).sort(function(a,b){ return a.k-b.k||a.i-b.i; }).map(function(o){ return o.x; }); }; },'#54'); }
  /* 3. recent patients, in memory only (this tab), never stored */
  var RECENT=[];
  window.pvxRecent={clear:function(){ RECENT=[]; }, list:function(){ return RECENT.slice(); }};   /* PVX-N349 */
  if(typeof openDrawer==='function'){ pvxAfter('openDrawer',function(pid){ try{ RECENT=[pid].concat(RECENT.filter(function(x){ return x!==pid; })).slice(0,5); }catch(e){} },'#54'); }
  function showRecent(){ if(document.activeElement!==inp||inp.value.trim()) return;
    var ps=RECENT.map(function(id){ return PATIENTS.find(function(p){ return p.id===id; }); }).filter(Boolean);
    var html='', flat=[];
    if(ps.length){ html+='<div class="sr-group"><div class="sr-label">Recent</div>';
      ps.forEach(function(p,i){ var st=(typeof STATUSES!=='undefined'&&STATUSES[p.status])||{};
        flat.push({kind:'Patient',act:function(){ closeSearch(); openDrawer(p.id); }});
        html+='<div class="sr-item" data-i="'+i+'"><span class="sr-ic" style="background:'+(st.color||'var(--accent)')+'">'+pvxEsc(typeof initials==='function'?initials(p):'')+'</span><div class="sr-main"><div class="sr-t">'+pvxEsc((p.name||'')+' '+(p.last||''))+'</div><div class="sr-s">'+pvxEsc([p.species,p.room,p.hid].filter(Boolean).join(' · '))+'</div></div><div class="sr-kind">Patient</div></div>'; });
      html+='</div>'; }
    var ex=(ps[0]&&ps[0].name)||'Bella';
    html+='<div class="sr-hint">Or type a command, like <b>“move '+pvxEsc(ex)+' to Exam”</b></div>';
    box.innerHTML='<div class="sr-inner">'+html+'</div>'; box.classList.add('open'); try{ positionSearchResults(); }catch(e){}
    searchFlat=flat; searchHl=-1;
    box.querySelectorAll('.sr-item').forEach(function(n){ n.onclick=function(){ var r=searchFlat[+n.dataset.i]; if(r) r.act(); }; });
    deco(); }
  if(typeof renderSearch==='function'){ pvxWrap('renderSearch',function(rs){ return function(q){ if(!String(q||'').trim()&&document.activeElement===inp){ showRecent(); return; } return rs.apply(this,arguments); }; },'#54'); }
  inp.addEventListener('focus',function(){ if(!inp.value.trim()) setTimeout(showRecent,0); });
  /* 5. combobox semantics */
  box.setAttribute('role','listbox'); box.setAttribute('aria-label','Search results');
  var live=document.createElement('div'); live.id='srLive'; live.className='pvx-vh'; live.setAttribute('role','status'); document.body.appendChild(live);
  var said='', st=0;
  function deco(){
    var open=box.classList.contains('open'); inp.setAttribute('aria-expanded',open?'true':'false');
    [].forEach.call(box.querySelectorAll('.sr-group'),function(g,gi){ g.setAttribute('role','group'); var l=g.querySelector('.sr-label'); if(l){ l.id='srG'+gi; l.setAttribute('role','presentation'); g.setAttribute('aria-labelledby',l.id); } });
    [].forEach.call(box.querySelectorAll('.sr-inner'),function(x){ x.setAttribute('role','presentation'); });
    var items=box.querySelectorAll('.sr-item');
    [].forEach.call(items,function(n,i){ n.id='srOpt'+i; n.setAttribute('role','option'); n.setAttribute('aria-selected',n.classList.contains('hl')?'true':'false'); });
    [].forEach.call(box.querySelectorAll('.fv-cmd'),function(n,i){ n.id='srCmd'+i; n.setAttribute('role','option'); n.setAttribute('aria-selected',n.classList.contains('ready')?'true':'false'); });
    [].forEach.call(box.querySelectorAll('.sr-none,.sr-hint'),function(n){ n.setAttribute('role','presentation'); });
    var hl=box.querySelector('.sr-item.hl'); if(hl) inp.setAttribute('aria-activedescendant',hl.id); else inp.removeAttribute('aria-activedescendant');
    /* say the count once, after typing settles */
    clearTimeout(st); st=setTimeout(function(){ if(!open||!inp.value.trim()){ said=''; return; }
      var cmd=box.querySelector('.fv-cmd.ready .sr-t'), n=items.length, msg=cmd?('Command: '+cmd.textContent.replace(/\s+/g,' ').trim()+'. Press Return.'):n?(n+' result'+(n===1?'':'s')):'No results';
      if(msg!==said){ said=msg; live.textContent=''; setTimeout(function(){ live.textContent=msg; },40); } },600);
  }
  new MutationObserver(deco).observe(box,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  deco();
})();
/* PVX-N212 - compact width: Flow's sections as a bottom tab bar (HIG Tab bars) */
(function(){
  var CW=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false}, sub=document.getElementById('subnavFlow'); if(!sub) return;
  function on(){ return CW.matches&&!sub.classList.contains('hidden')&&getComputedStyle(sub).display!=='none'; }
  /* Client Display is the lobby TV: in compact width it's offered in the + menu instead of a tab */
  var item=document.createElement('button'); item.className='ops-item pvx-op-client'; item.dataset.op='client'; item.setAttribute('role','menuitem');
  item.innerHTML='<span class="ops-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span><span class="ops-txt"><span class="ops-t">Show Client Display</span><span class="ops-s">The lobby TV view</span></span>';
  function sync(){ var t=on(); document.documentElement.classList.toggle('pvx-tabbar',t);
    var menu=document.getElementById('opsMenu'), sep=menu&&menu.querySelector('.ops-sep');
    if(t&&menu&&!item.isConnected) menu.insertBefore(item,sep||null); else if(!t&&item.isConnected) item.remove(); }
  if(CW.addEventListener) CW.addEventListener('change',sync);
  new MutationObserver(sync).observe(sub,{attributes:true,attributeFilter:['class','style']});
  window.addEventListener('resize',sync); sync(); setTimeout(sync,500);
  if(typeof opsAction==='function'){ pvxWrap('opsAction',function(oa){ return function(op){ if(op==='client'){ opsMenuClose(); switchView('client'); return; } return oa.apply(this,arguments); }; },'#54'); }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 55 of 104 · no id · PVX-N212: search fields and tab bars ━━━━━ */
try{
/* PVX-N213 - a context menu on every token, and "Added ..." announced once */
(function(){
  if(window.PvxCtx) PvxCtx.bind('#apProblemsChips .rvp-chip', function(el){
    var i=+el.getAttribute('data-i'), pr=apProblems[i]; if(!pr) return null;
    var t=formatProblem(pr), o=String(pr.originalInput||''), flat=function(x){ return _rn(x).replace(/[^a-z0-9]+/g,''); };
    var n=apProblems.length, items=[{label:'Edit',act:function(){ rpEdit(i); }}];   /* PVX-N364 */
    if(i>0) items.push({label:'Move earlier',act:function(){ rpMove(i,-1); }});
    if(i<n-1) items.push({label:'Move later',act:function(){ rpMove(i,1); }});
    items.push({sep:1},{label:'Remove',danger:true,act:function(){ rpRemove(i); }});
    return {items:items,label:'Problem: '+t,lift:el};
  },{holdMs:500});
  if(typeof addProblem==='function'){ pvxWrap('addProblem',function(ap){ return function(){ var n=apProblems.length, r=ap.apply(this,arguments);
    if(apProblems.length>n) rpSay('Added '+apProblems.slice(n).map(formatProblem).join(', ')); return r; }; },'#55'); }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 56 of 104 · no id · PVX-N213: tokens ━━━━━ */
try{
/* PVX-COMBO n214 - shared by Flow and Client Check-In (HIG Combo boxes) */
(function(){
  if(window.pvxCombo) return;
  /* the best match first: name start, then a word start in the name, then nicknames; common breeds, then whole words, win ties */
  window.pvxBreedRank=function(list,q,pins,hl){ var qn=String(q||'').toLowerCase().replace(/[^a-z0-9]/g,''), ql=String(q||'').toLowerCase().trim(); if(!qn||!list||!list.length) return list;
    return list.map(function(r,i){ var low=String(r.name||'').toLowerCase(), words=low.split(/[^a-z0-9]+/).filter(Boolean), nn=low.replace(/[^a-z0-9]/g,'');
      var t=nn.indexOf(qn)===0?0:(words.some(function(w){ return w.indexOf(qn)===0; })?1:2), p=(pins||[]).indexOf(r.name);
      return {r:r,i:i,t:t,p:p<0?99:p,w:words.indexOf(qn)>=0?0:1}; })
      .sort(function(a,b){ return a.t-b.t||a.p-b.p||a.w-b.w||a.i-b.i; }).map(function(o){
        /* mark the word that matched ("Shorthair"), not the first place the letters appear ("Brit-ish") */
        if(o.t===1&&typeof hl==='function'&&ql){ var low=String(o.r.name).toLowerCase(), m=-1, re=/[^a-z0-9]/;
          for(var k=0;k<low.length;k++){ if((k===0||re.test(low[k-1]))&&low.substr(k,ql.length)===ql){ m=k; break; } }
          if(m>=0) o.r=Object.assign({},o.r,{html:hl(o.r.name,[[m,ql.length]])}); }
        return o.r; }); };
  /* a text field with a list is a combobox; its list is a listbox of options */
  window.pvxCombo=function(input,panel,o){ if(!input||!panel||input.__pvxCombo) return; input.__pvxCombo=1; o=o||{};
    if(!panel.id) panel.id=input.id+'List';
    input.setAttribute('role','combobox'); input.setAttribute('aria-controls',panel.id); input.setAttribute('aria-expanded','false');
    if(o.select) input.setAttribute('aria-haspopup','listbox'); else input.setAttribute('aria-autocomplete','list');
    panel.setAttribute('role','listbox'); if(o.label) panel.setAttribute('aria-label',o.label);
    var opt=o.opt||'.bc-opt', hl=o.hl||'hl', busy=false;
    function sync(){ if(busy) return; busy=true;
      try{ var open=panel.classList.contains('open')&&panel.getBoundingClientRect().height>4; input.setAttribute('aria-expanded',open?'true':'false');
        var cur=null; [].forEach.call(panel.querySelectorAll(opt),function(n,i){ if(!n.id) n.id=panel.id+'-o'+i; n.setAttribute('role','option'); var on=n.classList.contains(hl); n.setAttribute('aria-selected',on?'true':'false'); if(on) cur=n; });
        [].forEach.call(panel.querySelectorAll('.bc-list,.hv-list'),function(n){ n.setAttribute('role','presentation'); });
        if(cur&&open) input.setAttribute('aria-activedescendant',cur.id); else input.removeAttribute('aria-activedescendant'); }
      finally{ busy=false; } }
    new MutationObserver(sync).observe(panel,{childList:true,subtree:true,attributes:true,attributeFilter:['class']}); sync();
    /* Esc closes the open list first, never the sheet around it (window capture runs before the sheet's own Esc) */
    if(typeof o.close==='function') window.addEventListener('keydown',function(e){
      if(e.key!=='Escape'||document.activeElement!==input||input.getAttribute('aria-expanded')!=='true') return;
      e.preventDefault(); e.stopPropagation(); try{ o.close(); }catch(x){} sync(); },true); };
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 57 of 104 · no id ━━━━━ */
try{
/* PVX-N214 - combo boxes (HIG Combo boxes): best match first, VoiceOver semantics, Sex as a pop-up */
(function(){
  /* Flow's breed search ranks the likeliest first */
  if(typeof breedFuzzyIndexed==='function'){ pvxWrap('breedFuzzyIndexed',function(bfi){ return function(IDX,q){ var r=bfi.apply(this,arguments), sp=(typeof breedSpecies==='function')?breedSpecies():null;
    return pvxBreedRank(r,q,(typeof BREED_PINS!=='undefined'&&sp&&BREED_PINS[sp])||[],typeof bcHighlight==='function'?bcHighlight:null); }; },'#57'); }
  pvxCombo(document.getElementById('apBreed'),document.getElementById('apBreedPanel'),{label:'Breeds',close:function(){ breedClose(); }});
  pvxCombo(document.getElementById('apRefHosp'),document.getElementById('apRefHospPanel'),{label:'Hospitals',opt:'.hv-opt,.bc-opt',close:function(){ rhClose(); }});
  pvxCombo(document.getElementById('apReason'),document.getElementById('rvList'),{label:'Reason suggestions',opt:'.rv-opt',hl:'active',close:function(){ if(typeof _rvCtrl!=='undefined'&&_rvCtrl) _rvCtrl.close(); }});
  /* a selected Reason token takes Esc (deselect) before the sheet does */
  if(typeof renderProblemChips==='function'){ pvxAfter('renderProblemChips',function(){ var i=document.getElementById('apReason'); if(i){ if(typeof _rpBackspaceArmed!=='undefined'&&_rpBackspaceArmed) i.setAttribute('data-pvx-esc',''); else i.removeAttribute('data-pvx-esc'); } },'#57'); }
  /* Sex: a value from elsewhere (check-in review, an older record) that isn't one of the five stays as an extra option */
  var sx=document.getElementById('apSex');
  if(sx&&sx.tagName==='SELECT'){ var D=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');
    Object.defineProperty(sx,'value',{configurable:true,get:function(){ return D.get.call(sx); },set:function(v){ v=v==null?'':String(v);
      [].forEach.call(sx.querySelectorAll('option[data-pvx-extra]'),function(x){ if(x.value!==v) x.remove(); });
      if(v&&![].some.call(sx.options,function(x){ return x.value===v; })){ var x=document.createElement('option'); x.textContent=v; x.value=v; x.setAttribute('data-pvx-extra',''); sx.appendChild(x); }
      D.set.call(sx,v); }}); }
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 58 of 104 · no id · PVX-N214: combo boxes ━━━━━ */
try{
/* PVX-SEG (n215, shared) - single-choice segmented controls (HIG Segmented controls).
   pvxSeg(selector, {label, item, mode, isOn})
     mode 'radio' (default): a named radiogroup, the choice aria-checked, one Tab stop, arrows / Home / End move it
     mode 'tabs'           : the same as a tablist (the control switches a panel), aria-selected
     mode 'current'        : an app's section switcher: the open section is aria-current, nothing else changes
   The app keeps drawing the highlight with its own class (active, on, ...). The state is read from that class every time
   it changes, so what VoiceOver hears is always what is on screen. A group that is drawn again later is picked up too.
   Moving with the keyboard clicks the next segment, so the app's own handler does the work. */
(function(){
  if(window.pvxSeg) return;
  var REG=[], ON=/(^|\s)(active|on|is-on|is-active|sel|selected|current)(\s|$)/;
  function isOn(b,o){ return o.isOn?!!o.isOn(b):ON.test(typeof b.className==='string'?b.className:''); }
  function shown(b){ if(b.hidden) return false; var s=getComputedStyle(b); return s.display!=='none'&&s.visibility!=='hidden'; }
  function items(g,o){ return [].filter.call(g.querySelectorAll(o.item||'button'),function(b){ return b.closest(o.sel)===g&&shown(b); }); }
  function set(e,k,v){ if(e.getAttribute(k)!==v) e.setAttribute(k,v); }
  function sync(g,o){
    var it=items(g,o); if(!it.length) return;
    if(g.__pvxSegO!==o){ g.__pvxSegO=o;
      if(o.mode!=='current'){ g.setAttribute('role',o.mode==='tabs'?'tablist':'radiogroup'); g.addEventListener('keydown',key); }
      if(o.label&&!g.hasAttribute('aria-labelledby')) set(g,'aria-label',typeof o.label==='function'?o.label(g):o.label);
    }
    var cur=-1; for(var i=0;i<it.length;i++){ if(isOn(it[i],o)){ cur=i; break; } }
    it.forEach(function(b,i){ var s=i===cur;
      if(o.mode==='current'){ if(s) set(b,'aria-current','true'); else if(b.hasAttribute('aria-current')) b.removeAttribute('aria-current'); return; }
      set(b,'role',o.mode==='tabs'?'tab':'radio'); set(b,o.mode==='tabs'?'aria-selected':'aria-checked',String(s));
      if(b.hasAttribute('aria-pressed')) b.removeAttribute('aria-pressed');
      set(b,'tabindex',(s||(cur<0&&i===0))?'0':'-1');
    });
  }
  function ident(b){ return b.getAttribute('data-v')||b.getAttribute('data-s')||b.getAttribute('data-shift')||b.getAttribute('data-ctab')||b.getAttribute('data-tab')||b.getAttribute('data-mode')||b.id||b.textContent.trim(); }
  function key(e){
    var g=e.currentTarget, o=g.__pvxSegO; if(!o||e.altKey||e.metaKey||e.ctrlKey) return;
    var k=e.key, rtl=getComputedStyle(g).direction==='rtl', it=items(g,o).filter(function(b){ return !b.disabled&&b.getAttribute('aria-disabled')!=='true'; });
    var i=it.indexOf(document.activeElement); if(i<0) return;
    var fwd=rtl?'ArrowLeft':'ArrowRight', back=rtl?'ArrowRight':'ArrowLeft';
    var n=(k===fwd||k==='ArrowDown')?i+1:(k===back||k==='ArrowUp')?i-1:k==='Home'?0:k==='End'?it.length-1:null;
    if(n===null) return;
    e.preventDefault(); e.stopPropagation();
    var b=it[(n+it.length)%it.length], id=ident(b); b.focus(); b.click();
    /* the app may draw the group again: keep the keyboard on the same choice */
    requestAnimationFrame(function(){ scan(); if(document.activeElement&&document.activeElement.closest&&document.activeElement.closest(o.sel)) return;
      var gs=document.querySelectorAll(o.sel); for(var j=0;j<gs.length;j++){ var m=items(gs[j],o).filter(function(x){ return ident(x)===id; })[0]; if(m){ m.focus(); return; } } });
  }
  var raf=0; function scan(){ raf=0; REG.forEach(function(o){ [].forEach.call(document.querySelectorAll(o.sel),function(g){ sync(g,o); }); }); }
  function later(){ if(!raf) raf=requestAnimationFrame(scan); }
  var obs=null;
  window.pvxSeg=function(sel,opts){ var o=Object.assign({sel:sel,mode:'radio'},opts||{}); REG.push(o);
    if(!obs&&document.body){ obs=pvxWatch(later,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']},document.body); }
    [].forEach.call(document.querySelectorAll(sel),function(g){ sync(g,o); }); return o; };
  window.pvxSeg.sync=scan;
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 59 of 104 · no id ━━━━━ */
try{
/* PVX-N215 - the review time as Day + Time; single-choice segmented controls are radiogroups */
(function(){
  function pad(n){ return String(n).padStart(2,'0'); }
  function isoDay(d){ return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function clock(m){ var h=Math.floor(m/60)%24, mm=m%60; return (h%12||12)+':'+pad(mm)+' '+(h<12?'AM':'PM'); }
  function dayLabel(s){ var p=s.split('-'), d=new Date(+p[0],+p[1]-1,+p[2]); return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
  function review(){
    var inp=document.getElementById('alertReview'); if(!inp||inp.type==='hidden') return;
    var v=inp.value||'', vd=v.slice(0,10), vm=v.length>=16?(+v.slice(11,13))*60+(+v.slice(14,16)):null;
    inp.type='hidden';
    var field=inp.closest('.alert-field'), lab=field&&field.querySelector('label');
    var now=new Date(), days=[['','No review time'],[isoDay(now),'Today']];
    for(var i=1;i<=6;i++){ var x=new Date(now); x.setDate(now.getDate()+i); days.push([isoDay(x),i===1?'Tomorrow':dayLabel(isoDay(x))]); }
    if(vd&&!days.some(function(d){ return d[0]===vd; })) days.push([vd,dayLabel(vd)]);
    var times=[]; for(var m=0;m<24*60;m+=15) times.push(m);
    if(vm!==null&&times.indexOf(vm)<0){ times.push(vm); times.sort(function(a,b){ return a-b; }); }
    var wrap=document.createElement('div'); wrap.className='pvx-review';
    wrap.innerHTML='<select class="ap-input ap-select" id="alertReviewDay">'+days.map(function(d){ return '<option value="'+d[0]+'"'+(d[0]===vd?' selected':'')+'>'+d[1]+'</option>'; }).join('')+'</select>'
      +'<select class="ap-input ap-select" id="alertReviewTime" aria-label="Review time">'+times.map(function(m){ return '<option value="'+m+'"'+(m===vm?' selected':'')+'>'+clock(m)+'</option>'; }).join('')+'</select>';
    inp.parentNode.insertBefore(wrap,inp);
    if(lab){ lab.setAttribute('for','alertReviewDay'); }
    var ds=wrap.querySelector('#alertReviewDay'), ts=wrap.querySelector('#alertReviewTime');
    function sensible(){ if(ds.value===isoDay(new Date())){ var n=new Date(), m=Math.ceil((n.getHours()*60+n.getMinutes()+60)/15)*15; return Math.min(m,23*60+45); } return 8*60; }
    function put(){ ts.disabled=!ds.value; inp.value=ds.value?ds.value+'T'+pad(Math.floor(+ts.value/60))+':'+pad(+ts.value%60):''; }
    if(vm===null) ts.value=String(sensible());
    ds.addEventListener('change',function(){ if(!ds.dataset.touched&&vm===null) ts.value=String(sensible()); put(); });
    ts.addEventListener('change',function(){ ds.dataset.touched='1'; put(); });
    put();
  }
  if(typeof renderAlertModal==='function'){ pvxAfter('renderAlertModal',function(){ try{ review(); }catch(e){} },'#59'); }
  review();
  /* single-choice segmented controls */
  function fieldLabel(g){ var f=g.closest('.ap-field'), l=f&&f.querySelector('label'); return l?l.textContent.trim():'Choice'; }
  pvxSeg('.fv-or-seg',{item:'.ap-seg-btn',label:fieldLabel});
  pvxSeg('.fg-seg',{label:'Keep the flag'});
  pvxSeg('#rdShiftSeg',{label:'Rounds shift'});
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 60 of 104 · pvx-n227-a11y · PVX-N215: pickers and segmented controls ━━━━━ */
try{
/* PVX-N227 - an icon beside its label is decorative: VoiceOver reads the label, not "image". Icons that stand alone keep
   whatever name they have (their button's name). Runs on icons drawn later too. The shared top bar is left as it is. */
(function(){
  function fix(){
    var top=document.getElementById('pvxTopnav')||document.querySelector('nav.topnav');
    var l=document.querySelectorAll('svg:not([aria-hidden]):not([role]):not([aria-label]):not([aria-labelledby])');
    for(var i=0;i<l.length;i++){
      var s=l[i]; if(top&&top.contains(s)) continue; if(s.querySelector('title')) continue;
      var host=s.closest('button,a,[role=button],[role=tab],[role=menuitem],[role=option],label,li,td,th,summary,.chip,.seg')||s.parentElement;
      if(!host) continue;
      var name=(host.getAttribute('aria-label')||host.getAttribute('title')||host.textContent||'').trim();
      if(name||s.getBoundingClientRect().width<=32) s.setAttribute('aria-hidden','true');
    }
  }
  var q=0; function soon(){ if(q) return; q=setTimeout(function(){ q=0; fix(); },150); }
  function boot(){ fix(); pvxWatch(soon,{childList:true,subtree:true},document.body); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 61 of 104 · pvx-n242-flow ━━━━━ */
try{
/* n242: a sheet started in Treatment Sheets joins Flow and Rounds */
(function(){
  var COL='sheets', busy={}, T0=Date.now(), STALE=3*60000;
  function T(){ return (typeof TENANT_ID==='string'&&TENANT_ID)||'shoreline'; }
  function ok(){ try{ if(typeof DB==='undefined'||!DB) return false; if(typeof LOBBY!=='undefined'&&LOBBY) return false;
      if(document.body&&document.body.classList.contains('tv-mode')) return false; if(typeof Backend!=='undefined'&&Backend.mode!=='staff') return false;
      return !!(typeof AUTH!=='undefined'&&AUTH&&AUTH.currentUser); }catch(e){ return false; } }
  function who(){ var u=(AUTH&&AUTH.currentUser)||{}, n=(typeof CURRENT_USER==='string'&&CURRENT_USER)||u.displayName||u.email||'Flow';
    return {name:n,uid:u.uid||null,ini:String(n).split(/[\s@.]+/).filter(Boolean).map(function(w){ return w[0]; }).join('').slice(0,3).toUpperCase()}; }
  function norm(v){ return String(v==null?'':v).trim().toLowerCase(); }
  function species(v){ var t=norm(v); return /cat|fel/.test(t)?'Feline':/dog|can|k9/.test(t)?'Canine':(t?t.charAt(0).toUpperCase()+t.slice(1):'—'); }
  function doctorId(name){ var n=norm(name).replace(/^dr\.?\s*/,''); if(!n) return 'unassigned';
    var all=(typeof rdAllDoctors==='function'?rdAllDoctors():(typeof DOCTORS!=='undefined'?DOCTORS:[]))||[];
    var hit=all.filter(function(d){ return norm(d.name)===n; }); if(hit.length===1) return hit[0].id;
    var ln=n.split(/\s+/).pop(); hit=all.filter(function(d){ return norm(d.name).split(/\s+/).pop()===ln; }); return hit.length===1?hit[0].id:'unassigned'; }
  function open(p){ return !!p&&!p._demo&&(p.status==='Hospitalized'||(p.status==='Admitted'&&!(p.rounds&&p.rounds.outcome))); }
  /* an open admission in Flow for the same pet, with no sheet of its own */
  function twin(pt){ var nm=norm(pt.name), ln=norm(pt.last), sp=species(pt.species); if(!nm) return null;
    return (PATIENTS||[]).filter(function(p){ return open(p)&&!p.tsSheetId&&!(p.tsSheet&&p.tsSheet.board)&&norm(p.name)===nm&&(!ln||norm(p.last)===ln)&&(sp==='—'||species(p.species)===sp); })[0]||null; }
  function problems(pt){ var out=[];
    try{ var l=Array.isArray(pt.problem_list)?pt.problem_list.filter(function(q){ return q&&q.text&&!q.resolved_at; }).map(function(q){ return q.text; }):[];
      if(!l.length&&pt.reason) l=(typeof splitComplaints==='function')?splitComplaints(pt.reason):[pt.reason];
      out=l.map(function(x){ try{ return (typeof parseProblem==='function')?parseProblem(x):{label:x}; }catch(e){ return {label:x}; } }); }catch(e){}
    return out; }
  function fieldsFor(id,x,vid,w){ var pt=x.patient||{}, arr=new Date(x.admitted_at||x.created_at||Date.now()); if(isNaN(arr)) arr=new Date();
    var wt=(typeof pt.weight==='number'&&pt.weight>0)?pt.weight:(parseFloat(pt.weight)||null), code=String(pt.code||'').toUpperCase(), cond=norm(pt.condition);
    var loc=/^icu/i.test(pt.location||'')?'ICU':/^ward/i.test(pt.location||'')?'Wards':/^iso/i.test(pt.location||'')?'Isolation':'Treatment';
    var pr=problems(pt), reason=pr.length&&typeof problemsToString==='function'?problemsToString(pr):(pt.reason||'Reason not specified'), now=new Date();
    var f={id:vid,name:pt.name||'Patient',last:pt.last||'',species:species(pt.species),age:'—',birthday:'',ageEstimated:true,ageDisplay:'',
      breed:pt.breed||'—',owner:pt.last||'—',ownerPhone:'',sex:pt.sex||'',weight:wt?(wt+' kg'):'',weightKg:wt,
      reason:reason,reasonProblems:pr,reasonId:pr.length?(pr[0].id||null):null,reasonCategory:pr.length?(pr[0].category||null):null,
      doctor:doctorId(pt.doctor),liaison:null,room:loc,status:'Hospitalized',prio:cond==='critical'?1:(cond==='watch'?2:3),arrival:arr,arrivalType:'hospitalized',
      referringHospital:'',referringHospitalInfo:null,transferNotes:'',tsSheetId:id,tsSheet:{board:'IP',at:now.toISOString()},
      timeline:[{label:'Checked in',at:arr,meta:'Direct admit · sheet started in Treatment Sheets'+(x.created_by?' by '+x.created_by:'')},{label:'Admitted to Treatment',at:arr,meta:'Hospitalized'}]};
    if(code==='DNR'||code==='ALS'||code==='BLS'||code==='CPR'){ f.resusPref=code==='DNR'?'DNR':'CPR'; f.resusStatus='confirmed'; f.resusSource='Treatment Sheets'; f.resusRecordedAt=now; }
    return f; }
  function save(){ try{ if(typeof persist==='function') persist(); }catch(e){} try{ renderAll(); }catch(e){} }
  function attach(id,x,vid,w,how){ var ref=DB.collection(COL).doc(id), p=(PATIENTS||[]).find(function(q){ return String(q.id)===String(vid); });
    if(how==='twin'&&p){ p.tsSheetId=id; p.tsSheet={board:'IP',at:new Date().toISOString()}; p.timeline=p.timeline||[]; p.timeline.push({label:'Treatment sheet linked',at:new Date(),meta:'Started in Treatment Sheets'});
      if(!p.rounds||p.rounds.outcome){ try{ rdEnroll(p); }catch(e){} } save(); }
    else if(!p){ var f=(typeof fxCleanPatient==='function')?fxCleanPatient(fieldsFor(id,x,vid,w)):fieldsFor(id,x,vid,w); p=patient(f); PATIENTS.push(p);
      try{ rdEnroll(p); var t0=new Date(x.admitted_at||x.created_at||0); if(p.rounds&&!isNaN(t0)&&t0>0&&t0<new Date()) p.rounds.admittedAt=(typeof rdIso==='function'?rdIso(t0):t0.toISOString()); }catch(e){ console.warn('[n242 rounds]',e); } save(); }   /* the stay counts from the sheet's admission, not from the link */
    if(p&&p.hid) ref.update({visit_code:p.hid}).catch(function(){}); }
  function stale(d){ var l=d&&d.flow_link; return !!(l&&l.visit&&d.visit_id===l.visit&&(Date.now()-new Date(l.at))>STALE&&!(PATIENTS||[]).some(function(q){ return String(q.id)===String(l.visit); })); }
  function claim(doc){ var id=doc.id, x=doc.data()||{}; if(busy[id]) return; if(x.status!=='active'||x.board==='OP'||x.tenant_id&&x.tenant_id!==T()) return;
    var fresh=!x.visit_id&&!x.flow_link, again=stale(x); if(!fresh&&!again) return;
    if((PATIENTS||[]).some(function(q){ return q&&String(q.tsSheetId||'')===id; })) return;
    busy[id]=1; var w=who(), now=new Date().toISOString(), FV=firebase.firestore.FieldValue, ref=DB.collection(COL).doc(id);
    var tw=fresh?twin(x.patient||{}):null, how=tw?'twin':'new';
    var vid=again?x.flow_link.visit:(tw?String(tw.id):((window.crypto&&crypto.randomUUID)?crypto.randomUUID():('pt-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6))));
    DB.runTransaction(function(t){ return t.get(ref).then(function(s){ var d=s.exists&&s.data(); if(!d||d.status!=='active'||d.board==='OP') return null;
        if(again){ if(!stale(d)) return null; t.update(ref,{'flow_link.at':now,'flow_link.by':w.name,'flow_link.uid':w.uid,updated_at:now}); return d; }
        if(d.visit_id||d.flow_link) return null;
        t.update(ref,{visit_id:vid,flow_link:{at:now,by:w.name,uid:w.uid,visit:vid,how:how},updated_at:now,updated_by:w.ini,
          audit:FV.arrayUnion({at:now,type:'doctor',desc:(how==='twin'?'Linked to Flow — the open admission for <b>'+pvxEsc((x.patient||{}).name)+'</b>':'Added to Flow and Rounds as a direct admit'),who:w.ini,uid:w.uid})});
        return d; }); })
      .then(function(d){ if(d) attach(id,d,vid,w,again?'new':how); })
      .catch(function(e){ console.warn('[n242 link]',e); })
      .then(function(){ setTimeout(function(){ delete busy[id]; },5000); }); }
  window.pvxSheetLink={claim:claim,twin:twin,fieldsFor:fieldsFor,doctorId:doctorId};
  var unsub=null, last=null;
  function listen(){ if(unsub||!ok()) return;
    unsub=DB.collection(COL).where('tenant_id','==',T()).where('status','==','active').onSnapshot(function(snap){ last=snap;
      if(Date.now()-T0<6000) return setTimeout(function(){ snap.forEach(claim); },6000-(Date.now()-T0));   /* let Flow load its visits first */
      snap.forEach(claim); },function(e){ console.warn('[n242 sheets]',e); unsub=null; }); }
  setInterval(listen,3000); setTimeout(listen,1500);
  setInterval(function(){ if(last&&ok()) last.forEach(claim); },60000);   /* a claim left unfinished by a closed screen */
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 62 of 104 · pvx-n252-net ━━━━━ */
try{
/* PVX-N252 - every ending acts on the current patient; admissions that never reached Rounds are added (see patch_n252.py) */
(function(){
  if(typeof completePatient!=='function') return;
  pvxWrap('completePatient',function(base){ return function(p,finalStatus){ var a=[].slice.call(arguments); a[0]=window.fvCurPatient?fvCurPatient(p):p; return base.apply(this,a); }; },'n252-net');
  if(typeof LOBBY!=='undefined'&&LOBBY) return;
  var tried={}, failed={};
  function ms(v){ var t=v?new Date(v).getTime():NaN; return isNaN(t)?null:t; }
  function sheetIdOf(p){ try{ if(window.fvAdmitSheet&&fvAdmitSheet.id) return fvAdmitSheet.id(p); }catch(e){} return p.tsSheetId?String(p.tsSheetId):'v_'+String(p.id||'').replace(/[\/\s.#$\[\]]/g,'_'); }
  function enroll(p,why){ var q=window.fvCurPatient?fvCurPatient(p):p; if(!q||q.rounds) return;
    try{ rdEnroll(q);
      var t0=ms(q.admittedAt)||ms(q.completedAt)||ms(q.arrival);
      if(q.rounds&&t0&&t0<Date.now()) q.rounds.admittedAt=rdIso(new Date(t0));
      try{ rdAudit(q,'Added to Rounds — '+why); }catch(e){}
      console.info('[flow-n252] added',q.name,'to Rounds —',why); clearFixed();
      try{ renderAll(); }catch(e){}
    }catch(e){ console.warn('[flow-n252] couldn’t add',q&&q.name,'to Rounds',e);
      if(!failed[q.id]){ failed[q.id]=1; try{ notify('Couldn’t add '+bcEsc(q.name||'a patient')+' to Rounds','Flow tries again in 5 minutes',{icon:'info',color:'var(--priority-p1)',dur:9000}); }catch(_){} } } }
  /* PVX-N376: a failure note goes once that patient is in Rounds (by this retry or any other way) */
  function clearFixed(){ try{ [].forEach.call(document.querySelectorAll('#notes .note.sticky .n-title'),function(t){ var m=/^Couldn’t add (.+) to Rounds$/.exec(t.textContent); if(!m) return;
      if(!PATIENTS.some(function(x){ return (x.name||'a patient')===m[1]&&failed[x.id]&&!x.rounds; })) t.closest('.note').remove(); }); }catch(_){} }
  function sweep(){ clearFixed();
    var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    if(!u||typeof PATIENTS==='undefined'||!PATIENTS.length||typeof DB==='undefined'||!DB||(typeof Backend!=='undefined'&&Backend.mode!=='staff')) return;
    var now=Date.now();
    PATIENTS.forEach(function(p){ if(!p||p._demo||p.rounds||p.id==null) return;
      var id=String(p.id); if(tried[id]&&now-tried[id]<300000) return;
      if(p.status==='Hospitalized'&&(typeof isActive!=='function'||isActive(p))){ tried[id]=now;
        setTimeout(function(){ enroll(p,'a direct admit that hadn’t reached Rounds'); },500+Math.random()*3000); return; }
      if(p.status==='Admitted'){ var at=ms(p.admittedAt)||ms(p.completedAt); if(!at||now-at>7*86400000) return; tried[id]=now;
        DB.collection('sheets').doc(sheetIdOf(p)).get().then(function(snap){ var d=snap&&snap.exists?snap.data():null;
          if(!d||d.status!=='active'||(d.board||'IP')!=='IP') return;
          setTimeout(function(){ enroll(p,'admitted in Flow, with an inpatient sheet'); },500+Math.random()*3000); }).catch(function(){ tried[id]=0; }); } });
  }
  window.fvRoundsSweep=sweep;
  setTimeout(sweep,6000); setInterval(sweep,30000);
})();
}catch(e){setTimeout(function(){throw e})}

/* ━━━━━ 63 of 104 · pvx-n253-admit ━━━━━ */
try{
/* PVX-N253 - only doctors, liaisons and management admit (see patch_n253.py) */
(function(){
  var role=null, WHO='Doctors, liaisons and management admit';
  function lists(){ var d=[], l=[];
    try{ d=d.concat(typeof DOCTOR_NAMES!=='undefined'?DOCTOR_NAMES:[]); }catch(e){}
    try{ d=d.concat((typeof IM_DOCTORS!=='undefined'?IM_DOCTORS:[]).map(function(x){ return x.name; })); }catch(e){}
    try{ l=l.concat(typeof LIAISON_NAMES!=='undefined'?LIAISON_NAMES:[]); }catch(e){}
    return {doctors:d, liaisons:l}; }
  window.pvxCanAdmit=function(){ try{ if(typeof IS_ADMIN!=='undefined'&&IS_ADMIN) return true; }catch(e){} return !!(window.PvxRoles&&PvxRoles.canAdmit(role)); };
  window.pvxAdmitRole=function(){ return role; };
  window.pvxAdmitDenied=function(){ try{ notify(WHO,'Ask a doctor, liaison or manager to admit this patient',{icon:'info',color:'var(--accent)'}); }catch(e){} };
  function apply(){ var ok=pvxCanAdmit();
    var c=document.querySelector('#dispActions .disposition-card.admit');
    if(c){ if(ok) c.removeAttribute('disabled'); else c.setAttribute('disabled',''); c.setAttribute('aria-disabled',String(!ok)); c.classList.toggle('pvx-locked',!ok);
      var body=c.querySelector('.dc-body'), n=c.querySelector('.dc-note.pvx-lock');
      if(!ok&&body&&!n){ n=document.createElement('span'); n.className='dc-note pvx-lock'; n.textContent='Doctors, liaisons and management'; body.appendChild(n); }
      if(ok&&n) n.remove(); c.title=ok?'':WHO; }
    var b=document.querySelector('#apArrival [data-arrival="hospitalized"]');
    if(b){ b.classList.toggle('pvx-locked',!ok); if(ok){ b.removeAttribute('aria-disabled'); b.title=''; } else { b.setAttribute('aria-disabled','true'); b.title=WHO; } } }
  window.pvxAdmitApply=apply;
  function refresh(){ var u=null; try{ u=AUTH&&AUTH.currentUser; }catch(e){}
    if(!u||!window.PvxRoles){ role=null; apply(); return; }
    var nm=''; try{ nm=(typeof CURRENT_USER==='string'&&CURRENT_USER)||u.displayName||''; }catch(e){}
    PvxRoles.resolve(u.email,nm,lists()).then(function(r){ role=r; apply(); }); }
  window.pvxAdmitRefresh=refresh;
  try{ if(AUTH&&AUTH.onAuthStateChanged) AUTH.onAuthStateChanged(function(){ setTimeout(refresh,0); }); }catch(e){}
  setTimeout(refresh,0);
  if(typeof fillDrawer==='function'){ pvxAfter('fillDrawer',function(){ try{ apply(); }catch(e){} },'n253-admit'); }
  if(typeof openAddPatient==='function'){ pvxAfter('openAddPatient',function(){ try{ apply(); }catch(e){} },'n253-admit'); }
  /* the arrival chip: a click on Direct admit is refused (it is not a real disabled button, so the others keep their keyboard order) */
  document.addEventListener('click',function(e){ var b=e.target&&e.target.closest&&e.target.closest('#apArrival [data-arrival="hospitalized"]');
    if(b&&!pvxCanAdmit()){ e.stopImmediatePropagation(); e.preventDefault(); pvxAdmitDenied(); } },true);
  if(typeof openDispConfirm==='function'){ pvxWrap('openDispConfirm',function(od){ return function(kind){ if(kind==='admit'&&!pvxCanAdmit()){ pvxAdmitDenied(); return; }
    var r=od.apply(this,arguments); try{ var cf=document.getElementById('dispConfirm'); if(cf&&typeof activePatient!=='undefined') cf.setAttribute('data-pid',String(activePatient)); }catch(e){} return r; }; },'n253-admit'); }
  /* a board refresh (any change on any screen) no longer closes an open Admit / Discharge confirmation or the "Admitting…" state */
  if(typeof renderDisposition==='function'){ pvxWrap('renderDisposition',function(rdp){ return function(p){ try{ var cf=document.getElementById('dispConfirm');
    if(p&&cf&&!isCompleted(p)&&((typeof _dispBusy!=='undefined'&&_dispBusy)||(cf.querySelector('.confirmation')&&cf.getAttribute('data-pid')===String(p.id)))){ apply(); return; } }catch(e){}
    return rdp.apply(this,arguments); }; },'n253-admit'); }
  if(typeof submitDisp==='function'){ pvxWrap('submitDisp',function(sd){ return function(kind){ if(kind==='admit'&&!pvxCanAdmit()){ pvxAdmitDenied(); try{ closeDispConfirm(); }catch(e){} return; } return sd.apply(this,arguments); }; },'n253-admit'); }
  if(typeof moveStatus==='function'){ pvxWrap('moveStatus',function(ms){ return function(p,st){ if(st==='Admitted'&&!pvxCanAdmit()){ pvxAdmitDenied(); try{ renderAll(); }catch(e){} return; } return ms.apply(this,arguments); }; },'n253-admit'); }
})();
}catch(e){setTimeout(function(){throw e})}
