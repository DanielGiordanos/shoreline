


const _unreadMsgs = new Set();
let _commOpen = false;
function updateCommMeta(p, count){
const m=document.getElementById('commMeta'); if(!m) return;
if(_unreadMsgs.has(p.id)){ m.className='comm-meta unread'; m.innerHTML='<span class="comm-dot"></span>New'; }
else if(typeof count==='number'&& count>0){ m.className='comm-meta'; m.textContent=count+(count===1?' message':' messages'); }
else { m.className='comm-meta'; m.textContent=''; }
}
function msgBadge(p){ return _unreadMsgs.has(p.id) ?'<span class="msg-badge" title="New family message"></span>':''; }
function makeQR(text){ try{ const qr=qrcode(0,'M'); qr.addData(text); qr.make(); return qr.createSvgTag({cellSize:4,margin:0,scalable:true}); }catch(e){ return''; } }
function trackUrlFor(p){ return'https://shoreline.pravix.app/track.html?t='+ (p.publicToken||''); }

function renderMessages(p){
const mount=document.getElementById('messagesMount'); if(!mount) return;
const url=trackUrlFor(p);
mount.innerHTML =
'<div class="msg-sect">'
+'<button class="comm-head" id="commHead" aria-expanded="'+(_commOpen?'true':'false')+'"><span class="comm-headwrap"><span class="sect-title">Messages</span><span class="comm-meta" id="commMeta"></span></span>'
+'<svg class="comm-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg></button>'
+'<div class="comm-body'+(_commOpen?'':' collapsed')+'" id="commBody">'
+'<div class="msg-track"><div class="mqr">'+(p.publicToken?makeQR(url):'')+'</div>'
+'<div class="mt-main"><div class="mt-code">Check-in code<b>'+pvxEscQ(p.trackCode||'—')+'</b></div>'
+'<div class="mt-acts"><button type="button" class="mt-copy" id="msgCopyLink" title="Copy the family’s tracker link"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7h6.5L19 10.5V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z"/><path d="M5 16V5a2 2 0 0 1 2-2h6"/></svg><span>Copy tracker link</span></button>'+'<button type="button" class="mt-copy mt-share" id="msgShareLink" aria-label="Share tracker link…" title="Share the tracker link: Messages, Mail, AirDrop…" hidden><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M8 7l4-4 4 4"/><path d="M8 10H7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg><span>Share…</span></button></div>'+'</div></div>'
+'<div class="msg-thread" id="msgThread">'+(window.pvxWaitHTML?pvxWaitHTML('msgs'):'<div class="msg-empty">Loading…</div>')+'</div>'
+'<div class="msg-compose"><textarea id="msgBox" rows="1" placeholder="Message" aria-label="Message to the family" enterkeyhint="send" autocapitalize="sentences"></textarea>'
+'<button class="msg-send" id="msgSendBtn" disabled aria-label="Send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="6 11 12 5 18 11"/></svg></button></div>'
+'</div></div>';
const commHead=document.getElementById('commHead'), commBody=document.getElementById('commBody');
commHead.onclick=function(){
_commOpen=!_commOpen;
commHead.setAttribute('aria-expanded', _commOpen?'true':'false');
commBody.classList.toggle('collapsed', !_commOpen);
if(_commOpen && _unreadMsgs.has(p.id)){ _unreadMsgs.delete(p.id); updateCommMeta(p); try{ renderTable(); renderBoard(); }catch(e){} }
};
updateCommMeta(p);
const copyBtn=document.getElementById('msgCopyLink');
copyBtn.onclick=function(){ pvxCopyTracker(url); };   /* PVX-N356: Copy copies; Share opens the share sheet */
const shareBtn=document.getElementById('msgShareLink'); if(shareBtn){ shareBtn.hidden=!pvxCanShare(); shareBtn.onclick=function(){ pvxShareTracker(url, (p.name||'')+(p.last?' '+p.last:'')); }; }
const box=document.getElementById('msgBox'), sbtn=document.getElementById('msgSendBtn');
box.addEventListener('input',function(){ box.style.height='auto'; box.style.height=Math.min(box.scrollHeight,110)+'px'; sbtn.disabled=!box.value.trim(); });
box.addEventListener('keydown',function(e){ if(e.key==='Enter'&& !e.shiftKey){ e.preventDefault(); if(box.value.trim()) sendStaffMsg(p, box.value.trim()); } });
sbtn.onclick=function(){ if(box.value.trim()) sendStaffMsg(p, box.value.trim()); };
loadThread(p);
}
async function loadThread(p){
const el=document.getElementById('msgThread'); if(!el || !DB) return;
if(!p.publicToken){ updateCommMeta(p, 0); el.innerHTML='<div class="msg-empty">No messages yet. Share the tracker link or QR above, or send the family a note.</div>'; return; }
let msgs=[];
try{
const q=await DB.collection('messages').doc(p.publicToken).collection('items').orderBy('created_at','asc').get();
msgs=q.docs.map(function(d){ const m=d.data(); return { sender:m.sender, body:m.body, staff_name:m.staff_name||null }; });
}catch(e){ el.innerHTML='<div class="msg-empty" role="status">Couldn’t get the messages. Check the connection. <button type="button" class="pvx-wait-retry" data-pvx-retry="msgs">Try again</button></div>'; return; }   /* PVX-N365 */
updateCommMeta(p, msgs.length);
if(!msgs.length){ el.innerHTML='<div class="msg-empty">No messages yet. Share the tracker link or QR above, or send the family a note.</div>'; return; }
el.innerHTML=msgs.map(function(m){ const staff=m.sender==='staff';
return'<div class="msg-row '+(staff?'staff':'client')+'"><div class="msg-b">'+pvxEscQ(m.body)+'</div></div>'; }).join('');
el.scrollTop=el.scrollHeight;
}
async function sendStaffMsg(p, body){
if(!body) return;
const box=document.getElementById('msgBox'); if(box){ box.value=''; box.style.height='auto'; }
const sbtn=document.getElementById('msgSendBtn'); if(sbtn) sbtn.disabled=true;
if(DB && Backend.mode==='staff'){
if(!p.publicToken){ p.publicToken=genToken(); if(!p.trackCode) p.trackCode=genTrackCode(); persist(); }
try{
await DB.collection('messages').doc(p.publicToken).collection('items').add({ tenant_id:TENANT_ID, visit_id:String(p.id), sender:'staff', body:body, staff_name:CURRENT_USER, created_at:new Date().toISOString() });
}catch(e){ toast('Couldn’t send the message — check the connection and try again'); if(sbtn) sbtn.disabled=false; return; }
}
loadThread(p);
}
