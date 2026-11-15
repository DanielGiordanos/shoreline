




const DOCTOR_NAMES = (window.Pravix && Pravix.getDoctors) ? Pravix.getDoctors() : [
'Annie Downes',
'Kelley Harpin',
'Amber Koch',
'Mara Kraenzlin',
'Marissa Marinaccio',
'Michael McCann',
'Shaylan Meyer',
'Sarah Schiff',
'Klaudia Polak',
'Morgan Vrana'
];

const DOC_PALETTE = (window.Pravix && Pravix.getDoctorPalette) ? Pravix.getDoctorPalette() : ['var(--accent)','var(--purple)','#E8644A','var(--amber)','var(--s-admitted)','#3E7CB1','#2C7FB8','#C0568E','#5EA9A0','#9B7BD4'];
function docSlug(s){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}
function docInitials(s){return s.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();}
const DOCTORS = DOCTOR_NAMES.map((name,i)=>({
id: docSlug(name), name,
initials: docInitials(name),
color: DOC_PALETTE[i % DOC_PALETTE.length],
baseColor: DOC_PALETTE[i % DOC_PALETTE.length]
}));
const UNASSIGNED = {id:'unassigned', name:'Unassigned', initials:'—', color:'#A9C0D4'};
function doc(id){return DOCTORS.find(d=>d.id===id) || UNASSIGNED;}

function patientsForDoctor(id){return PATIENTS.filter(p=>p.doctor===id);}
function activeCountForDoctor(id){return PATIENTS.filter(p=>p.doctor===id && isActive(p)).length;}



const LIAISON_NAMES = (window.Pravix && Pravix.getLiaisons) ? Pravix.getLiaisons() : [
'Melissa Hamilton',
'Jamie Cisneros',
'Tammy Guinto',
'Nyla Chase',
'Daniel Giordano',
'Alexa Marucci',
'Liz DeLauri',
'Alexandra Rimkus',
'Stephanie Bamford',
'Sara DeVitto',
'Rhiannon Cappannelli'
];
const LIA_PALETTE = (window.Pravix && Pravix.getLiaisonPalette) ? Pravix.getLiaisonPalette() : ['var(--purple)','var(--s-admitted)','var(--amber)','var(--accent)','#E8644A','#9B7BD4','#3E7CB1','#5EA9A0','#C0568E','#A888E0','#2C7FB8'];
const LIAISONS = LIAISON_NAMES.map((name,i)=>({
id: docSlug(name), name,
initials: docInitials(name),
color: LIA_PALETTE[i % LIA_PALETTE.length]
}));
const NO_LIAISON = {id:'none', name:'No liaison', initials:'', color:'#7A9BB5'};
function liaison(id){return id ? (LIAISONS.find(l=>l.id===id) || null) : null;}

function patientsForLiaison(id){return PATIENTS.filter(p=>p.liaison===id);}
function activeCountForLiaison(id){return PATIENTS.filter(p=>p.liaison===id && isActive(p)).length;}
