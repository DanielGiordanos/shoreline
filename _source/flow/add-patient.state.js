


const AP_LOCATIONS = ['Lobby','Room 1','Room 2','Room 3','Room 4','Room 5','Room 6','Room 7','Treatment','Comfort Room'];
let apArrivalType='walkin', apPrio=2, apDoctorId='unassigned', apLocation='Lobby';
let apDoctorDD=null, apLocationDD=null;

 

const BREED_PINS={Feline:["Domestic Shorthair","Domestic Medium Hair","Domestic Longhair"], Canine:["Mixed Breed Dog"]};

 
let bcResults=[], bcHl=-1, bcOpen=false;
const bcPanel=()=>document.getElementById('apBreedPanel');
const bcInput=()=>document.getElementById('apBreed');
