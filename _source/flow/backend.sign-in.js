
// One-time, narrowly-scoped enrollment for the two authorized test accounts.
// No new passwords are collected; Firestore Rules verify the signed UID,
// approved email and role. Unverified email onboarding is available only to
// existing Heather email/password sign-ins until the temporary expiry.
/* PVX-N369 - the sign-in's own alert (HIG Alerts). It used the browser's confirm() and alert(): an unstyled box headed
   "shoreline.pravix.app says", "OK" for every answer, no dark mode. This one names its buttons, follows light and dark, is an
   action sheet on a phone, and Esc / Cmd-. (Ctrl-. off a Mac) cancels. Resolves true for the action, false for Cancel. */
function pvxAaCss(){
  if(document.getElementById('pvxAaCss')) return; var s=document.createElement('style'); s.id='pvxAaCss'; s.textContent=
      '.pvx-aa{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:16px;background:rgba(6,10,20,.45)}'+
      '.pvx-aa-box{width:min(340px,100%);border-radius:18px;padding:20px 18px 16px;background:#fff;color:#1d1d1f;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.35);font:15px/1.4 -apple-system,BlinkMacSystemFont,"SF Pro Text",system-ui,sans-serif}'+
      'body.dark .pvx-aa-box{background:#172440;color:#E8EEF8}'+
      '.pvx-aa-box:focus{outline:none}.pvx-aa-box h2{margin:0 0 6px;font-size:17px;font-weight:700;line-height:1.3}.pvx-aa-box p{margin:0 0 16px;font-size:13px;opacity:.82}'+
      '.pvx-aa-b{display:flex;gap:8px}.pvx-aa-b button{flex:1;min-height:44px;border-radius:12px;border:0;padding:0 12px;font-family:inherit;font-size:15px;font-weight:600;line-height:1;background:rgba(127,127,127,.16);color:inherit;cursor:pointer}'+
      '.pvx-aa-b .pvx-aa-ok{background:#38BDD2;color:#04121A}.pvx-aa-b button:focus-visible{outline:2px solid #38BDD2;outline-offset:2px}'+
      '.pvx-aa{padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}'+
      '@media (max-width:700px){.pvx-aa{place-items:end center}.pvx-aa-b{flex-direction:column-reverse}}'+
      '#sbLogin #sbErr.pvx-info{color:inherit;opacity:.74}';
  document.head.appendChild(s);
}
function pvxAuthAlert(o){
  return new Promise(function(res){
    var d=document, back=d.activeElement, w=d.createElement('div'), k=String(Date.now());
    pvxAaCss();
    w.className='pvx-aa';
    w.innerHTML='<div class="pvx-aa-box" role="alertdialog" aria-modal="true" aria-labelledby="pvxAaT'+k+'" aria-describedby="pvxAaM'+k+'" tabindex="-1">'
      +'<h2 id="pvxAaT'+k+'">'+pvxEsc(o.title)+'</h2><p id="pvxAaM'+k+'">'+pvxEsc(o.msg)+'</p><div class="pvx-aa-b">'
      +(o.cancel?'<button type="button" data-v="0">'+pvxEsc(o.cancel)+'</button>':'')+'<button type="button" data-v="1" class="pvx-aa-ok">'+pvxEsc(o.ok)+'</button></div></div>';
    d.body.appendChild(w);
    function trap(e){ if(w.parentNode&&!w.contains(e.target)){ try{ w.querySelector('.pvx-aa-ok').focus(); }catch(x){} } }   /* modal: focus can't wander behind it */
    function end(v){ d.removeEventListener('keydown',key,true); d.removeEventListener('focusin',trap,true); if(w.parentNode) w.parentNode.removeChild(w); try{ if(back&&back.focus) back.focus(); }catch(e){} res(v); }
    function key(e){
      if(e.key==='Escape'||((e.metaKey||e.ctrlKey)&&!e.altKey&&e.key==='.')){ e.preventDefault(); e.stopPropagation(); end(!o.cancel); return; }
      if(e.key==='Tab'){ var b=[].slice.call(w.querySelectorAll('button')), i=b.indexOf(d.activeElement); e.preventDefault(); e.stopPropagation(); b[(i+(e.shiftKey?-1:1)+b.length)%b.length].focus(); } }
    w.addEventListener('click',function(e){ var b=e.target.closest&&e.target.closest('button'); if(b) end(b.getAttribute('data-v')==='1'); });
    d.addEventListener('keydown',key,true); d.addEventListener('focusin',trap,true);
    try{ w.querySelector('.pvx-aa-ok').focus(); }catch(e){}
  });
}
/* PVX-N369: what happened at sign-in, said in place on the sign-in card (Brand §9.1: alerts only for decisions). The sign-out that
   follows shows the card (or keeps it), which picks the note up and puts its Sign in button back. A note that isn't a problem
   (info) is in the card's text colour, not red, until the person types or signs in again. */
var PVX_AUTH_NOTE='', PVX_AUTH_INFO=false;
function pvxAuthTone(e0,info){
  if(!e0) return; pvxAaCss(); e0.classList.toggle('pvx-info',!!info); var f=e0.closest&&e0.closest('form'); if(!info||!f) return;
  var off=function(){ e0.classList.remove('pvx-info'); f.removeEventListener('input',off,true); f.removeEventListener('submit',off,true); };
  f.addEventListener('input',off,true); f.addEventListener('submit',off,true);
}
function pvxAuthNote(t,info){ PVX_AUTH_NOTE=String(t||''); PVX_AUTH_INFO=!!info; var e0=document.getElementById('sbErr'); if(e0&&PVX_AUTH_NOTE){ e0.textContent=PVX_AUTH_NOTE; pvxAuthTone(e0,PVX_AUTH_INFO); } }
async function pvxActivateApprovedStaffMember(user){
  if(!user || !DB) return false;
  const approved={
    'daniel.giordano@pravix.app': {
      active:true,tenant_id:'shoreline',role:'owner',kura_owner:true,review_manager:true
    },
    'heather.galano@vca.com': {
      active:true,tenant_id:'shoreline',role:'management',kura_owner:false,review_manager:true
    }
  };
  const email=String(user.email||'').trim().toLowerCase();
  if(!Object.prototype.hasOwnProperty.call(approved,email)) return true;
  try{
    await user.reload();
    await user.getIdToken(true);
    // Existing Heather email/password authentication is sufficient for
    // prelaunch reviewer access; no additional verification email required.
    // The effective Firestore rules independently check the signed provider,
    // email, UID, hospital, exact role fields and temporary expiration.
    const heatherPasswordLogin = email==='heather.galano@vca.com' &&
      Array.isArray(user.providerData) &&
      user.providerData.some(p=>p&&p.providerId==='password');
    if(!user.emailVerified && !heatherPasswordLogin){
      const who=String(user.email||'your email');   /* PVX-N369: a Pravix alert for the decision; what happened is said in place on the sign-in card */
      if(await pvxAuthAlert({title:'Verify your email to use Pravix', msg:'Pravix needs to confirm '+who+' before your access can start. It will send you a link.', ok:'Send email', cancel:'Cancel'})){
        let sent=true; try{ await user.sendEmailVerification(); }catch(_){ sent=false; }
        pvxAuthNote(sent?'Link sent to '+who+'. Open it, then sign in again.':'The link didn’t send. Try again in a few minutes.', sent);
      } else pvxAuthNote('Verify your email, then sign in again.', true);
      return false;
    }
    const ref=DB.collection('staff_members').doc(user.uid);
    try{
      const existing=await ref.get();
      if(existing.exists && existing.data().active===true
          && existing.data().tenant_id==='shoreline') return true;
    }catch(_){ /* A missing membership is intentionally unreadable. */ }
    await ref.set(approved[email]);
    const verified=await ref.get();
    if(!verified.exists || verified.data().active!==true
        || verified.data().tenant_id!=='shoreline'){
      throw new Error('Membership confirmation failed');
    }
    try{ if(typeof toast==='function') toast('Pravix access is active'); }catch(_){}
    return true;
  }catch(_){
    pvxAuthNote('Pravix couldn’t start your access. Check that your email is verified, then sign in again.');
    return false;
  }
}
