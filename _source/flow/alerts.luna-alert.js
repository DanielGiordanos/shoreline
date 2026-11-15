(() => {
const alertBody = document.getElementById('alertBody');
if (!alertBody) return;

const overlay = document.createElement('div');
overlay.className ='luna-announcement';
overlay.id ='lunaAnnouncement';
overlay.hidden = true;
overlay.setAttribute('role','dialog');
overlay.setAttribute('aria-modal','true');
overlay.setAttribute('aria-label','Luna’s diversion announcement');
overlay.innerHTML ='<div class="luna-announcement-backdrop"></div>'+
'<div class="luna-announcement-scene">'+
'<iframe title="Luna speaking" allow="autoplay" allowtransparency="true" tabindex="-1"></iframe>'+
'<div class="luna-announcement-error" hidden>Tap to hear Luna’s announcement.<button type="button">Play audio</button></div></div>';
document.body.appendChild(overlay);

const iframe = overlay.querySelector('iframe');
const error = overlay.querySelector('.luna-announcement-error');
const channel = typeof BroadcastChannel ==='function'? new BroadcastChannel('pravix-luna-diversion-'+ TENANT_ID) : null;
const startedAt = Date.now();
let ready = false;
let loading = false;
let pending = false;
let seenRequest = null;
let closeTimer;
let previousOverflow ='';

function isClientDisplay() {
return currentView ==='client'&& currentApp ==='flow'&& document.body.classList.contains('client-mode');
}

function isDiversion(alert) {
return !!(alert && alert.active && alert.type ==='diversion'&& alert.show_client !== false);
}

function ensureAction() {
if (!document.getElementById('alertModal').classList.contains('open')) return;
if (isClientDisplay() || !isDiversion(currentAlert) || alertModalMode !=='view') return;
if (alertBody.querySelector('[data-luna-announcement]')) return;
const action = document.createElement('div');
action.className ='luna-alert-action';
action.innerHTML ='<button type="button" data-luna-announcement><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>Announce with Luna on Client Display</button>'+
'<p>Plays on connected Client Displays only. The staff page stays here.</p>';
alertBody.appendChild(action);
action.querySelector('button').addEventListener('click', sendRequest);
}

new MutationObserver(ensureAction).observe(alertBody, { childList: true });

async function sendRequest(event) {
if (isClientDisplay() || !isDiversion(currentAlert)) return;
const button = event.currentTarget;
button.disabled = true;
const request = { id: (window.crypto?.randomUUID?.() || Date.now() +'-'+ Math.random().toString(36).slice(2)), at: Date.now() };
if (DB && Backend.mode ==='staff') {
try {
await DB.collection('alerts').doc(TENANT_ID).update({ announcement_request: request });
} catch {
button.disabled = false;
toast('Couldn’t reach the Client Display — try again');
return;
}
} else if (channel) {
channel.postMessage(request);
} else {
button.disabled = false;
toast('Can’t reach the Client Display — check the connection');
return;
}
closeAlertModal();
notify('Luna announcement requested','The connected Client Display will begin playback', { icon:'info', color:'var(--accent)'});
}

function prepare() {
if (loading) return;
loading = true;
iframe.src ='luna-orb.html?announcement=1&v=20260918-recording-sync';
window.setTimeout(() => { if (!ready && !overlay.hidden) { loading = false; error.hidden = false; } }, 8000);
}

function tellLuna(type) {
if (!iframe.contentWindow) return;
const url = new URL(iframe.src, location.href);
iframe.contentWindow.postMessage({ type }, url.protocol ==='file:'?'*': url.origin);
}

function play() {
error.hidden = true;
try { tellLuna('luna-announcement-play'); }
catch { error.hidden = false; }
}

function show() {
if (!isClientDisplay()) return;
clearTimeout(closeTimer);
previousOverflow = document.body.style.overflow;
document.body.style.overflow ='hidden';
overlay.hidden = false;
requestAnimationFrame(() => overlay.classList.add('open'));
if (ready) play();
else { pending = true; prepare(); }
}

function close() {
clearTimeout(closeTimer);
pending = false;
try { tellLuna('luna-announcement-stop'); } catch {}
overlay.classList.remove('open');
document.body.style.overflow = previousOverflow;
const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
closeTimer = setTimeout(() => { overlay.hidden = true; }, duration);
}

function receive(request) {
if (!isClientDisplay() || !isDiversion(currentAlert) || !request?.id || request.id === seenRequest) return;
seenRequest = request.id;
const at = Number(request.at), age = Date.now() - at;
if (!Number.isFinite(age) || age > 15000 || age < -5000 || at < startedAt - 1000) return;
show();
}

window.LunaAnnouncement = Object.freeze({ onAlert(alert) {
if (isClientDisplay()) {
prepare();
if (!isDiversion(alert)) { if (!overlay.hidden) close(); return; }
receive(alert.announcement_request);
} else if (!overlay.hidden) close();
} });
if (channel) channel.onmessage = event => receive(event.data);
overlay.querySelector('.luna-announcement-backdrop').addEventListener('click', () => { if (!document.body.classList.contains('tv-mode')) close(); });
error.querySelector('button').addEventListener('click', play);
document.addEventListener('keydown', event => {
if (event.key ==='Escape'&& !overlay.hidden) { event.preventDefault(); close(); }
});
window.addEventListener('message', event => {
if (event.source !== iframe.contentWindow) return;
if (location.protocol !=='file:'&& event.origin !== location.origin) return;
if (event.data?.type ==='luna-announcement-ready') {
ready = true;
if (pending && !overlay.hidden) { pending = false; play(); }
return;
}
if (overlay.hidden) return;
if (event.data?.type ==='luna-announcement-close') close();
if (event.data?.type ==='luna-announcement-ended') closeTimer = setTimeout(close, 850);
if (event.data?.type ==='luna-announcement-error') error.hidden = false;
});
})();