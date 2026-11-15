
function loadState(){ try{ Backend.init(); }catch(e){ if(SB) Backend.setConn('error'); } }




/* Oct 2026 — a copy, never the live objects: triage / intake are edited in place, and a live reference made every later change invisible */
function fvRowsCopy(list){ return (list||[]).map(function(p){ try{ return JSON.parse(JSON.stringify(mapToDb(p))); }catch(e){ return mapToDb(p); } }); }
function pvxPersistEvt(state,at){ try{ window.dispatchEvent(new CustomEvent('pvx:persist',{detail:{state:state,at:at}})); }catch(e){} }   /* PVX-N148 */
function persist(){
if(_persistLock) return;
if(Backend.mode!=='staff'|| !DB){ pvxPersistEvt('off',Date.now()); return; }   /* PVX-N148 */

const LIVE = PATIENTS.filter(function(p){ return !p._demo; });
LIVE.forEach(function(p){ if(!p.publicToken) p.publicToken=genToken(); if(!p.trackCode) p.trackCode=genTrackCode(); });
const rows = LIVE.map(mapToDb);
const prev = {}; (Backend._lastRows||[]).forEach(function(r){ prev[r.id]=JSON.stringify(r); });
const changed = LIVE.filter(function(p,i){ return prev[rows[i].id] !== JSON.stringify(rows[i]); });
if(!changed.length){ pvxPersistEvt('idle',Date.now()); return; }   /* PVX-N148: nothing waiting = everything is on the server */
clearTimeout(persist._t);
persist._t = setTimeout(async function(){
const pvxAt=Date.now();   /* PVX-N148: what this write covers */
try{
const batch = DB.batch();
changed.forEach(function(p){
if(typeof fvSaveVisit==='function') fvSaveVisit(batch,p,prev); else batch.set(DB.collection('visits').doc(String(p.id)), mapToDb(p));
batch.set(DB.collection('pub').doc(p.publicToken), safeProjection(p), { merge:true });
fxLobbyWrite(batch,p);
if(typeof fxCodesSync==='function') fxCodesSync([p],true);   /* n118: codes/{CODE}-{pet name}, its own batch (codes_n118.js) */
});
try{ await batch.commit(); }catch(err){ changed.forEach(function(p){ delete _fxLobby[String(p.id)]; }); throw err; /* Never rewrite a potentially stale entire patient record after a failed batch. */ }
Backend._lastRows = fvRowsCopy(LIVE);
if(Backend.conn!=='live') Backend.setConn('live');
pvxPersistEvt('saved',pvxAt);   /* PVX-N148: the server confirmed */
}catch(e){ Backend.setConn('error'); pvxPersistEvt('error',pvxAt); }
}, 250);
}




function showLogin(msg){
var existing=document.getElementById('sbLogin');
var pvxNoteInfo=false; if(!msg&&PVX_AUTH_NOTE){ msg=PVX_AUTH_NOTE; pvxNoteInfo=PVX_AUTH_INFO; PVX_AUTH_NOTE=''; }   /* PVX-N369 */
if(existing){ if(msg){ var e0=existing.querySelector('#sbErr'); if(e0){ e0.textContent=msg; pvxAuthTone(e0,pvxNoteInfo); } var b0=existing.querySelector('#sbBtn'); if(b0&&b0.disabled&&!b0.classList.contains('signed')){ b0.disabled=false; b0.textContent='Sign in'; } } return; }
var ov=document.createElement('div'); ov.id='sbLogin';
ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true'); ov.setAttribute('aria-label','Sign in to Pravix');
ov.innerHTML=`<div class="login-wrap"><form class="card" id="sbLoginForm" novalidate><div class="brand"><img class="pravix-logo-img logo-lite" src="assets/img/pravix-logo-lite.png" alt="Pravix"><img class="pravix-logo-img logo-drk" src="assets/img/pravix-logo-drk.png" alt="Pravix"><div class="product">Shoreline Patient Flow</div><div class="secure-line"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="3"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>Secure sign in</div></div><div class="heading"><h1>${Backend.mode==='lobby'?'Lobby screen':'Sign in to Pravix'}</h1><p id="sbLead">${Backend.mode==='lobby'?'Sign in with the lobby screen account to show the waiting-room display.':'Sign in with your own account.'}</p></div><div class="form-stack"><label class="field-label" for="sbEmail">Email</label><div class="field"><div class="lock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5.5" width="17" height="13" rx="3"></rect><path d="m5.5 8 6.5 5 6.5-5"></path></svg></div><input id="sbEmail" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="name@vca.com" /></div><label class="field-label" for="sbPass" style="margin-top:10px">Password</label><div class="field"><div class="lock-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="10" rx="3"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg></div><input id="sbPass" type="password" autocomplete="current-password" placeholder="Enter password" /><button class="reveal" id="sbReveal" type="button" aria-label="Show password"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg></button></div><div class="caps-hint" id="sbCaps">Caps Lock is on</div><div class="error" id="sbErr" role="status" style="height:auto;min-height:23px"></div><button type="button" id="sbForgot" style="display:block;margin:2px auto 12px;background:none;border:none;color:var(--accent);font:inherit;font-size:0.75rem;font-weight:600;cursor:pointer;">Forgot password?</button><button class="continue is-inactive" id="sbBtn" type="submit">Sign in</button></div></form><div class="page-foot"><b>VCA Shoreline</b> · Protected Pravix Workspace</div></div>`;
document.body.appendChild(ov);
document.body.classList.add('sb-locked');
document.querySelectorAll('.app, #mesh').forEach(function(el){ try{ el.setAttribute('inert',''); }catch(e){} });
var form=ov.querySelector('#sbLoginForm'), email=ov.querySelector('#sbEmail'), password=ov.querySelector('#sbPass'),
reveal=ov.querySelector('#sbReveal'), btn=ov.querySelector('#sbBtn'), error=ov.querySelector('#sbErr'),
card=ov.querySelector('.card'), loginWrap=ov.querySelector('.login-wrap'), capsHint=ov.querySelector('#sbCaps'),
emailField=email.closest('.field'), passwordField=password.closest('.field');
if(msg && error){ error.textContent=msg; pvxAuthTone(error,pvxNoteInfo); }   /* PVX-N369 */
function updateButtonState(){ var ready=email.value.trim() && password.value.trim(); btn.classList.toggle('is-inactive', !ready); }
reveal.addEventListener('click', function(){ var showing=password.type==='text'; password.type=showing?'password':'text'; reveal.setAttribute('aria-label', showing?'Show password':'Hide password'); password.focus(); });
[email,password].forEach(function(el){ el.addEventListener('input', function(){ if(error.textContent) error.textContent=''; updateButtonState(); }); });
var forgot=ov.querySelector('#sbForgot');
if(forgot){ forgot.addEventListener('click', async function(){
var em=email.value.trim();
if(!em){ error.textContent='Enter your email above, then choose Forgot password.'; shake(emailField); email.focus(); return; }
forgot.disabled=true;
try{ await AUTH.sendPasswordResetEmail(em); error.textContent='Reset link sent to '+em+'. Check your inbox and spam.'; }
catch(e2){ error.textContent='Could not send a reset email — check the address and try again.'; }
forgot.disabled=false;
}); }
function capsCheck(e){ if(typeof e.getModifierState==='function') capsHint.classList.toggle('show', e.getModifierState('CapsLock')); }
password.addEventListener('keydown', capsCheck); password.addEventListener('keyup', capsCheck);
password.addEventListener('blur', function(){ capsHint.classList.remove('show'); });
email.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); password.focus(); } });
password.addEventListener('keydown', function(e){ if(e.key==='Enter'&& email.value.trim() && password.value.trim()){ e.preventDefault(); form.requestSubmit(); } });
[emailField,passwordField].forEach(function(f){ f.addEventListener('animationend', function(){ f.classList.remove('error-shake'); }); });
card.addEventListener('pointermove', function(e){ var r=card.getBoundingClientRect(); card.style.setProperty('--mx', ((e.clientX-r.left)/r.width*100)+'%'); card.style.setProperty('--my', ((e.clientY-r.top)/r.height*100)+'%'); });
card.addEventListener('pointerleave', function(){ card.style.setProperty('--mx','50%'); card.style.setProperty('--my','18%'); });
function shake(field){ field.classList.remove('error-shake'); void field.offsetWidth; field.classList.add('error-shake'); }
form.addEventListener('submit', async function(e){
e.preventDefault();
if(!email.value.trim()){ error.textContent='Enter your email address.'; shake(emailField); email.focus(); return; }
if(!password.value.trim()){ error.textContent='Enter your password.'; shake(passwordField); password.focus(); return; }
error.textContent=''; btn.disabled=true; btn.classList.remove('signed'); btn.innerHTML='Signing in <span class="signin-progress" aria-hidden="true"></span>';
try{


await AUTH.signInWithEmailAndPassword(email.value.trim(), password.value);

}catch(err){
var wrong = err && (err.code==='auth/wrong-password'||err.code==='auth/invalid-credential'||err.code==='auth/user-not-found'||err.code==='auth/invalid-login-credentials'||err.code==='auth/invalid-email');
error.textContent = wrong ?'Incorrect email or password. Please try again.':'Connection problem. Try again.';
shake(passwordField); btn.disabled=false; btn.classList.remove('signed'); btn.textContent='Sign in';
try{ password.select(); }catch(e2){} updateButtonState();
}
});
updateButtonState();
setTimeout(function(){ try{ email.focus(); }catch(e){} }, 250);
}

function sbFinishLogin(ov){
try{ var btn=ov.querySelector('#sbBtn'), wrap=ov.querySelector('.login-wrap');
if(btn){ btn.disabled=true; btn.classList.add('signed'); btn.innerHTML='Signed in <span class="checkmark" aria-hidden="true"></span>'; }
if(wrap) wrap.classList.add('success'); }catch(e){}
setTimeout(function(){ try{ ov.remove(); }catch(e){}
document.body.classList.remove('sb-locked');
document.querySelectorAll('.app, #mesh').forEach(function(el){ try{ el.removeAttribute('inert'); }catch(e){} });
}, 480);
}

if(typeof window!=='undefined'&& window.addEventListener){
window.addEventListener('offline', function(){ Backend.setConn('offline'); });
window.addEventListener('online',  function(){ if(Backend.mode==='staff'){ Backend.setConn('reconnecting'); Backend.refetch(); } });
}
