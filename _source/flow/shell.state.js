


let filters = {status:null, prio:null, doctor:null, liaison:null};
 
const HOSP_TZ = (function(){ try{ return (window.Pravix && Pravix.getHospitalSettings) ? (Pravix.getHospitalSettings().timezone||'America/New_York') :'America/New_York'; }catch(e){ return'America/New_York'; } })();
let _hospFmt=null;   /* built once (it was built per call — the slowest part of every render) */
function _hospDayKey(d){ try{ if(!_hospFmt) _hospFmt=new Intl.DateTimeFormat('en-CA',{timeZone:HOSP_TZ,year:'numeric',month:'2-digit',day:'2-digit'}); return _hospFmt.format(new Date(d)); }catch(e){ return new Date(d).toDateString(); } }



function isTodayHosp(d){ return d ? _hospDayKey(d)===_hospDayKey(new Date()) : false; }





let _hospDayNow = _hospDayKey(new Date());
function checkHospDayRollover(){
const k=_hospDayKey(new Date());
if(k!==_hospDayNow){ _hospDayNow=k; try{ if(typeof renderAll==='function') renderAll(); }catch(e){} }
}
setInterval(checkHospDayRollover, 30000);
function completedTodayCount(status){ return PATIENTS.filter(p=>p.status===status && p.completedAt && isTodayHosp(p.completedAt)).length; }
let searchQ ='';
let activePatient = null;
let _tlFreshOpen=false;
let triExpanded = false;
let recExpanded = false;
let activeLoc = null;
let currentView ='dashboard';
