





function examPickupsToday(){ return PATIENTS.filter(p=>p.examStartedAt && typeof p.examWaitMinutes==='number'&& isTodayHosp(p.examStartedAt)); }
function avgExamWaitToday(){ const w=examPickupsToday().map(p=>p.examWaitMinutes); return w.length? Math.round(w.reduce((a,b)=>a+b,0)/w.length) : null; }
function computeKPIs(){
const active = PATIENTS.filter(isActive);
const waiting = active.filter(p=>p.status==='Waiting');
const waits = active.map(waitMinutes);
const longest = active.length? Math.max(...waits):0;
const longestP = active.find(p=>waitMinutes(p)===longest);
const countBy = s=>active.filter(p=>p.status===s).length;
const num = String;
const awToday = avgExamWaitToday();
return [
{feature:true, lab:'On Floor', raw:active.length, fmt:num, sub:'Patients', wash:WASH.cyan},
{lab:'Waiting', raw:waiting.length, fmt:num, sub:'Awaiting assignment', wash:WASH.amber},
{lab:'Avg Wait', raw: awToday==null?'—': awToday, fmt: awToday==null? String : fmtWait, sub:'Check-in → Exam', wash:WASH.amber},
{lab:'Longest', raw: active.length? longest :'—', fmt: active.length? fmtWait : String, sub: longestP? (longestP.name+(longestP.last?' '+longestP.last:'')) :'—', wash:WASH.red},
{lab:'Exam', raw:countBy('Exam'), fmt:num, sub:'In Exam', wash:WASH.cyan},
{lab:'Diagnostics', raw:countBy('Diagnostics'), fmt:num, sub:'Lab & imaging', wash:WASH.lavender},
{lab:'Ultrasound', raw:countBy('Ultrasound'), fmt:num, sub:'Ultrasound queue', wash:WASH.blue},
{lab:'Procedure', raw:countBy('Procedure'), fmt:num, sub:'In Procedure', wash:WASH.coral},
];
}

const WASH = {
cyan:'rgba(56,189,210,0.12)', teal:'rgba(58,196,190,0.12)', green:'rgba(72,184,136,0.12)',
blue:'rgba(90,169,240,0.11)', lavender:'rgba(168,136,224,0.12)', amber:'rgba(235,201,93,0.11)',
coral:'rgba(232,100,74,0.11)', red:'rgba(228,52,43,0.10)'
};
const RAF = (typeof requestAnimationFrame!=='undefined') ? requestAnimationFrame : null;
const nowMs = ()=> (typeof performance!=='undefined'&& performance.now) ? performance.now() : Date.now();
function countUp(el, target, fmt){
if(!RAF){ el.textContent=fmt(target); return; }
const dur=850, start=nowMs();
(function step(){
let p=Math.min(1,(nowMs()-start)/dur); p=1-Math.pow(1-p,3);
{ const tx=String(fmt(Math.round(target*p))), n=el.firstChild; if(n&&n.nodeType===3&&!n.nextSibling){ if(n.nodeValue!==tx) n.nodeValue=tx; } else el.textContent=tx; }   /* PVX-N378 */
if(p<1) RAF(step);
})();
}


function ckpiCard(c,i,group){
return`<article class="command-kpi kpi-in command-kpi--${c.k}"
    style="animation-delay:${i*45}ms;--kaccent:${c.ac.h};--kaccent-rgb:${c.ac.r}">
    <div class="command-kpi__top">
      <span class="command-kpi__label">${pvxEscQ(c.lab)}</span>
      <span class="command-kpi__chip">${pvxEscQ(c.chip)}</span>
    </div>
    <div class="command-kpi__value${c.isName?' is-name':''}">${pvxEscQ(String(c.val))}</div>
    <div class="command-kpi__sub">${pvxEscQ(c.sub)}</div>
    ${ckpiSpark(group,c.lab)}
  </article>`;
}



const WAIT_ALERT_MIN=120;
const CQ_WAIT_ALERT_MIN=20;
const CKPI_AC={
cyan   :{h:'var(--accent)', r:'56,189,210'},  amber:{h:'var(--amber)', r:'235,201,93'},
purple :{h:'#A888E0', r:'168,136,224'}, blue :{h:'#5AA9F0', r:'90,169,240'},
coral  :{h:'#E8644A', r:'232,100,74'},  red  :{h:'var(--priority-p1)', r:'228,52,43'},
green  :{h:'var(--s-admitted)', r:'72,184,136'},  neutral:{h:'#8C9098', r:'140,144,152'}
};
 
const CKPI_META=[
{k:'onfloor',    ac:'cyan',    chip:()=>({t:'Live'})},
{k:'waiting',    ac:'amber',   chip:()=>({t:''})},
{k:'avg',        ac:'neutral', chip:()=>({t:'Today'})},
{k:'longest',    ac:'red',     chip:c=>(typeof c.raw==='number'&&c.raw>WAIT_ALERT_MIN)
?{t:'Above target',warn:true}:{t:'On target',ok:true}},
{k:'exam',       ac:'cyan',    chip:()=>({t:''})},
{k:'diagnostics',ac:'purple',  chip:()=>({t:''})},
{k:'ultrasound', ac:'blue',    chip:()=>({t:''})},
{k:'procedure',  ac:'coral',   chip:()=>({t:''})}
];


/* PVX-N191: sparklines keep the last hour (one sample a minute) on this device, and describe themselves */
const CKPI_HIST=(function(){ try{ const o=JSON.parse(localStorage.getItem('pvx:kpi:v1')||'{}'); return (o&&typeof o==='object')?o:{}; }catch(e){ return {}; } })(); const _ckpiMin={};

/* PVX-N341 - share the visit tracker link: the system share sheet on iPhone and iPad (Messages, Mail, AirDrop…), Copy with a mouse.
   "Copied" shows only after the copy really happened; a refused copy says so and shows the link. */
function pvxCanShare(){ try{ return typeof navigator.share==='function'; }catch(e){ return false; } }   /* PVX-N356: wherever the browser has a share sheet, a Mac's Safari too */
function pvxCopyTracker(u){ 
  try{ navigator.clipboard.writeText(u).then(function(){ pvxToast('Tracker link copied'); }, function(){ pvxToast('Couldn’t copy the link — '+u); }); }catch(e){ pvxToast('Couldn’t copy the link — '+u); } }
function pvxShareTracker(u, name){
  function copy(){ try{ navigator.clipboard.writeText(u).then(function(){ pvxToast('Tracker link copied'); }, function(){ pvxToast('Couldn’t copy the link — '+u); }); }catch(e){ pvxToast('Couldn’t copy the link — '+u); } }
  if(pvxCanShare()){ navigator.share({title:'Visit tracker'+(name?' · '+name:''), url:u}).catch(function(e){ if(!e||e.name!=='AbortError') copy(); }); return; }
  copy();
}
function ckpiSave(){ try{ localStorage.setItem('pvx:kpi:v1', JSON.stringify(CKPI_HIST)); }catch(e){} }
function ckpiSample(group,cards){
const m=Math.floor(Date.now()/60000);
if(_ckpiMin[group]===m) return; _ckpiMin[group]=m;
const cut=Date.now()-60*60000;
cards.forEach(c=>{ const k=group+'|'+c.lab; let a=Array.isArray(CKPI_HIST[k])?CKPI_HIST[k]:[];
a=a.filter(x=>x&&typeof x==='object'&&x.t>=cut);
if(typeof c.raw==='number'&&isFinite(c.raw)) a.push({t:Date.now(),v:c.raw});
CKPI_HIST[k]=a.slice(-60); });
ckpiSave();
}
/* PVX-N341 - a chart's words: the card's name in sentence case, and minutes where the values are minutes */
function pvxChartName(lab){ var s=String(lab||'').replace(/^Avg\b/,'Average'); return s.charAt(0)+s.slice(1).toLowerCase(); }
function pvxChartUnit(lab){ return /^(avg wait|longest)$/i.test(String(lab))?' min':''; }
function pvxSpoken(m){ m=Math.round(Math.abs(+m)||0); var h=Math.floor(m/60), r=m%60, w=function(n,u){ return n+' '+u+(n===1?'':'s'); };   /* PVX-N350: VoiceOver hears “1 hour 20 minutes”, not “1h 20m” */
  return h?(w(h,'hour')+(r?' '+w(r,'minute'):'')):w(r,'minute'); }
function pvxDur(m){ return (typeof fmtWait==='function')?fmtWait(m):(m+'m'); }   /* a trend reads like the wait beside it: 5h 30m, not 330m */
function ckpiSpark(group,lab){
const cut=Date.now()-60*60000, a=(Array.isArray(CKPI_HIST[group+'|'+lab])?CKPI_HIST[group+'|'+lab]:[]).filter(x=>x&&x.t>=cut), X0=2, X1=62, Y0=5, Y1=26;
if(a.length<2) return'<svg class="command-kpi__spark is-empty" viewBox="0 0 64 31" aria-hidden="true"></svg>';
const vs=a.map(x=>x.v); let mn=Math.min.apply(null,vs), mx=Math.max.apply(null,vs);
const need=Math.max(4, Math.abs(mx)*0.2); if(mx-mn<need){ const mid=(mx+mn)/2; mn=mid-need/2; mx=mid+need/2; }
const span=mx-mn, t0=a[0].t, t1=a[a.length-1].t;
const pts=a.map(x=>[ Math.round((X0+(X1-X0)*((x.t-t0)/Math.max(1,t1-t0)))*10)/10, Math.round((Y1-(x.v-mn)/span*(Y1-Y0))*10)/10 ]);
const d='M'+pts.map(q=>q[0]+' '+q[1]).join(' L'), last=pts[pts.length-1];
const f=vs[0], l=vs[vs.length-1], diff=l-f, fmtT=new Date(t0).toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
const r1=v=>Math.round(v*10)/10;
const nm=pvxChartName(lab), u=pvxChartUnit(lab), q=v=>u?pvxSpoken(r1(v)):String(r1(v));
const say=nm+' since '+fmtT+': '+q(f)+' to '+q(l)+(diff>0?', up '+q(diff):diff<0?', down '+q(-diff):', no change');
const esc=x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
return'<svg class="command-kpi__spark" viewBox="0 0 64 31" role="img" aria-label="'+esc(say)+'"><title>'+esc(say)+'</title>'+
'<path class="line" d="'+d+'"/><circle cx="'+last[0]+'" cy="'+last[1]+'" r="2"/></svg>';
}

function renderKPIs(animate){
const cards=computeKPIs();
const row=document.getElementById('kpiRow');
ckpiSample('top',cards);
if(!row.children || !row.children.length){
row.innerHTML = cards.map((c,i)=>{
const m=CKPI_META[i]||CKPI_META[0], ac=CKPI_AC[m.ac];
return`<article class="command-kpi kpi-in command-kpi--${m.k}"
        style="animation-delay:${i*50}ms;--kaccent:${ac.h};--kaccent-rgb:${ac.r}">
        <div class="command-kpi__top">
          <span class="command-kpi__label">${c.lab}</span>
          <span class="command-kpi__chip"></span>
        </div>
        <div class="command-kpi__value">0</div>
        <div class="command-kpi__sub">${pvxEscQ(c.sub)}</div>
      </article>`;}).join('');
}
const els=[...row.children];
cards.forEach((c,i)=>{
const el=els[i]; if(!el) return;
const val=el.querySelector('.command-kpi__value'),
sub=el.querySelector('.command-kpi__sub'),
chip=el.querySelector('.command-kpi__chip'),
m=CKPI_META[i]||CKPI_META[0];
if(sub){ const sv=String(c.sub==null?'':c.sub); if(sub.textContent!==sv) sub.textContent=sv; }   /* PVX-N378 */
if(chip){ const ch=m.chip(c), ct=String(ch.t||''), cd=ch.t?'':'none'; if(chip.textContent!==ct) chip.textContent=ct; if(chip.style.display!==cd) chip.style.display=cd; chip.classList.toggle('is-warn',!!ch.warn); chip.classList.toggle('is-ok',!!ch.ok); }
const spark=ckpiSpark('top',c.lab), old=el.querySelector('.command-kpi__spark');
if(!old || old.outerHTML!==spark){ if(old) old.remove(); el.insertAdjacentHTML('beforeend',spark); }
if(!val) return;
if(animate && typeof c.raw==='number') countUp(val, c.raw, c.fmt);
else { const vt=String(c.fmt(c.raw)); if(val.textContent!==vt) val.textContent = vt; }
});
}
