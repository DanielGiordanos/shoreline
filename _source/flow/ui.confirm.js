
/* showConfirm · its layers, innermost first: 1 n193 before · 2 #47 wrap · 3 #52 wrap   (PVX-N387; kept true by flow_t387) */
function showConfirm(title,okLabel,onOk,opts){ return pvxRun('showConfirm',showConfirm$base,this,arguments); }
function showConfirm$base(title, okLabel, onOk, opts){
opts=opts||{};
document.getElementById('confirmTitle').textContent=title;
document.getElementById('confirmOk').textContent=okLabel;
const sub=document.getElementById('confirmSub');
sub.textContent=opts.sub||''; sub.style.display=opts.sub?'':'none';
const ok=document.getElementById('confirmOk');
ok.classList.toggle('danger', !!opts.danger);
ok.classList.remove('is-confirming','is-success');
const scrim=document.getElementById('confirmScrim'), box=document.getElementById('confirmBox');
const close=()=>{scrim.classList.remove('open');box.classList.remove('open');};
scrim.classList.add('open');box.classList.add('open');
{ const cb=document.getElementById('confirmCancel'); cb.textContent=opts.cancelLabel||'Cancel'; cb.onclick=()=>{ close(); if(opts.onCancel) opts.onCancel(); }; }
document.getElementById('confirmScrim').onclick=close;
{
box.classList.remove('confirm-fancy');
ok.textContent=okLabel;
ok.onclick=()=>{close();onOk();};
}
}
