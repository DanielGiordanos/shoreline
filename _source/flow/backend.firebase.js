
const FIREBASE_CONFIG = {
apiKey:'AIzaSyCf8iXW_wWRLvHi1G4YnYRH-iLpaDufZQE',
authDomain:'shoreline-flow.firebaseapp.com',
projectId:'shoreline-flow',
storageBucket:'shoreline-flow.firebasestorage.app',
messagingSenderId:'237404385636',
appId:'1:237404385636:web:1ee3ba27f22c946f748a71'
};
const SB_LOGIN_EMAIL ='au733@vca.com';
/* PVX-N149 decision #4: the shared front-desk login is now only the lobby screen's account. Keep in step with or/ and treatment/. */
const PVX_LOBBY_ACCOUNTS=['au733@vca.com'];
function pvxIsLobbyAccount(u){ var e=String(u&&u.email||u||'').toLowerCase(); return PVX_LOBBY_ACCOUNTS.indexOf(e)>-1; }
function pvxLobbyAccountCard(user){
  var el=document.getElementById('pvxLobbyAcct');
  if(!user){ if(el){ el.remove(); document.body.classList.remove('sb-locked'); document.querySelectorAll('.app, #mesh').forEach(function(x){ try{ x.removeAttribute('inert'); }catch(e){} }); } return; }
  try{ var ov=document.getElementById('sbLogin'); if(ov) ov.remove(); }catch(e){}
  if(el) return;
  el=document.createElement('div'); el.id='pvxLobbyAcct'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-labelledby','pvxLaT');
  el.innerHTML='<div class="card"><h2 id="pvxLaT">This is the lobby screen account</h2>'
    +'<p>'+String(user.email||'').replace(/[&<>"]/g,'')+' only shows the waiting-room display. To use the board, sign in with your own account.</p>'
    +'<div class="acts"><button type="button" class="primary" id="pvxLaOwn">Sign in with my own account</button><a href="?display=1" id="pvxLaTv">Open the lobby display</a></div></div>';
  document.body.appendChild(el); document.body.classList.add('sb-locked');
  document.querySelectorAll('.app, #mesh').forEach(function(x){ try{ x.setAttribute('inert',''); }catch(e){} });
  document.getElementById('pvxLaOwn').onclick=function(){ try{ AUTH.signOut(); }catch(e){} };   /* the normal sign-in card follows (showLogin) */
  setTimeout(function(){ try{ document.getElementById('pvxLaOwn').focus(); }catch(e){} },60);
}

try{ if(window.firebase && !firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG); }catch(e){}
const DB   = (window.firebase && firebase.firestore) ? firebase.firestore() : null;
/* Offline: keep a local copy of the board so Flow opens and keeps working without a connection. */
try{ if(DB && DB.settings) DB.settings({experimentalAutoDetectLongPolling:true, merge:true}); }catch(e){}   /* n92: Safari and SSL-inspection proxies stall Firestore's stream; long-polling keeps it live */
try{ if(DB && DB.enablePersistence && !(window.pvxFsMem&&pvxFsMem())) DB.enablePersistence({synchronizeTabs:true}).catch(function(){}); else if(window.pvxFsMem&&pvxFsMem()) console.warn('[flow-n249] running without the offline copy for this session'); }catch(e){}   /* n249: not after Safari lost its local database */
const AUTH = (window.firebase && firebase.auth)      ? firebase.auth()      : null;
const SB   = DB;
