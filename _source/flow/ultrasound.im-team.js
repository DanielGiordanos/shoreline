



 
const IM_DOCTOR_NAMES = (window.Pravix && Pravix.getIMDoctors) ? Pravix.getIMDoctors() : [
'Larry Berkwitt',
'Dianne Kittrell'
];
const IM_PALETTE=['#4F9AD6','var(--accent)','#5E8CA8','#2C7FB8','#6FA8C4'];
const IM_DOCTORS = IM_DOCTOR_NAMES.map((name,i)=>({ id:docSlug(name), name, initials:docInitials(name), color:IM_PALETTE[i%IM_PALETTE.length] }));


const IM_CONTACT={
'larry-berkwitt':{title:'Internist',dept:'Internal Medicine',phone:'(203) 926-8580',email:'Larry.Berkwitt@vca.com'},
'dianne-kittrell':{title:'Internist',dept:'Internal Medicine',phone:'(917) 558-6653',email:'Dianne.Kittrell@vca.com'}
};
function imContact(d){ return IM_CONTACT[d.id]||{title:'Internist',dept:'Internal Medicine',phone:'',email:''}; }
function imDoc(id){ return IM_DOCTORS.find(d=>d.id===id) || null; }
function drName(n){ return n ? ('Dr. '+String(n).trim().split(/\s+/).slice(-1)[0]) :'—'; }



const USX_STATUS_KEY='pravix:'+((typeof TENANT_ID!=='undefined')?TENANT_ID:'shoreline')+':usdocstatus:v1';
let USDOC_STATUS={};
try{ USDOC_STATUS=JSON.parse(localStorage.getItem(USX_STATUS_KEY))||{}; }catch(e){ USDOC_STATUS={}; }
