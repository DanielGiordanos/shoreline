/* Morning brief on this phone: sign up for a notification at a chosen hour, and keep the brief's summary current.
   Works on shoreline.pravix.app (kura-web.js sets globalThis.kuraBrief) once the kuraBrief Cloud Function is deployed
   (cloud/functions/). On iPhone, web notifications need Kura added to the Home Screen first (iOS 16.4 or later). */
import { el, Button, Card, Dropdown } from './ui/components.js?v=3a7528f6ad';

const KEY = 'kura-brief-published';
const HOURS = [5, 6, 7, 8, 9, 10];
const remote = () => globalThis.kuraBrief || null;
const read = k => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } };
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushable = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), raw = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, c => c.charCodeAt(0)); };
const hourLabel = h => `${h}:00 AM`;

async function call(action, body = {}) {
  const r = remote(); if (!r) throw new Error('Phone notifications work on shoreline.pravix.app.');
  const token = await r.token(); if (!token) throw new Error('Sign in to Kura first.');
  let res; try { res = await fetch(`${r.url}/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) }); }
  catch { throw new Error('Kura couldn’t reach the morning brief service. Check the connection; if it keeps happening, it may not be set up yet.'); }
  let out = null; try { out = await res.json(); } catch { /* not JSON */ }
  if (!res.ok) throw new Error(out?.error?.message || (res.status === 404 ? 'The morning brief service isn’t set up yet.' : `The morning brief service answered ${res.status}.`));
  return out;
}

/* Keep the server's copy of the brief current (small; only when it changed, or every 6 hours). */
let pending = 0, broken = false;
export function publishBrief(brief, now = false) {
  if (!remote() || !brief || (broken && !now)) return;
  if (now) { broken = false; write(KEY, '{}'); }
  clearTimeout(pending);
  pending = setTimeout(async () => {
    const { as_of, ...facts } = brief, sig = JSON.stringify(facts), last = JSON.parse(read(KEY) || '{}');
    if (last.sig === sig && Date.now() - (last.at || 0) < 6 * 3600000) return;
    try { await call('publish', { brief }); write(KEY, JSON.stringify({ sig, at: Date.now() })); }
    catch { broken = true; }                                  // not deployed yet, or offline: try again next session
  }, 4000);
}

async function currentSubscription() {
  if (!pushable()) return null;
  const reg = await navigator.serviceWorker.getRegistration(); return reg ? reg.pushManager.getSubscription() : null;
}

/* The Settings card. */
export function briefCard({ navigate, timezone, toast, onBriefPage = false, onEnabled = null }) {
  const status = el('p', { className: 'muted small', role: 'status' }, 'Checking this device…');
  const actions = el('div', { className: 'inline' });
  const hour = Dropdown({ label: 'Send at', value: '7', options: HOURS.map(h => ({ value: String(h), label: hourLabel(h) })) });
  const card = Card({ title: 'Morning brief on your phone', className: 'brief-card', description: 'One notification each morning: what’s low, what’s arriving, what expires this week, and what to order before the weekend. Item and area names only — never patient information.',
    children: [el('div', { className: 'brief-card-body' }, [hour, status, actions])] });
  const busy = (b, label) => { for (const btn of actions.querySelectorAll('button')) btn.disabled = b; if (label) status.textContent = label; };
  async function draw() {
    const preview = onBriefPage ? null : Button({ label: 'See today’s brief', variant: 'ghost', icon: 'bell', onClick: () => navigate('brief') });
    if (!remote()) { status.textContent = 'Phone notifications work on shoreline.pravix.app. The brief is always here in Kura.'; hour.hidden = true; actions.replaceChildren(...[preview].filter(Boolean)); return; }
    if (!pushable() || (isIOS() && !installed())) {
      status.replaceChildren(isIOS() ? el('span', {}, ['On iPhone, add Kura to your Home Screen first: tap ', el('b', {}, 'Share'), ', then ', el('b', {}, 'Add to Home Screen'), '. Open Kura from there and turn the brief on.']) : 'This browser can’t show notifications.');
      hour.hidden = true; actions.replaceChildren(...[preview].filter(Boolean)); return;
    }
    const sub = await currentSubscription();
    let mine = null;
    if (sub) { try { const st = await call('status', { endpoint: sub.endpoint }); mine = st.devices.find(d => d.id === st.this_device) || null; } catch (e) { status.textContent = e.message; } }
    if (mine) {
      hour.control.value = String(mine.hour); hour.hidden = false;
      status.textContent = `On for this device · every day at ${hourLabel(mine.hour)}${mine.last_sent ? ` · last sent ${mine.last_sent}` : ''}.`;
      actions.replaceChildren(
        Button({ label: 'Send a test now', variant: 'secondary', onClick: async () => { busy(true, 'Sending…'); try { await call('test', { endpoint: sub.endpoint }); status.textContent = 'Sent. It should appear in a few seconds.'; } catch (e) { status.textContent = e.message; } busy(false); } }),
        Button({ label: 'Turn off on this device', variant: 'ghost', onClick: async () => { busy(true, 'Turning off…'); try { await call('unsubscribe', { endpoint: sub.endpoint }); await sub.unsubscribe(); toast('Morning brief turned off on this device.'); } catch (e) { status.textContent = e.message; } busy(false); draw(); } }),
        ...[preview].filter(Boolean));
    } else {
      hour.hidden = false;
      status.textContent = Notification.permission === 'denied' ? 'Notifications are blocked for Kura in this browser’s settings.' : 'Off on this device.';
      actions.replaceChildren(Button({ label: 'Turn on for this device', variant: 'primary', icon: 'bell', onClick: () => turnOn() }), ...[preview].filter(Boolean));
    }
  }
  async function turnOn() {
    busy(true, 'Asking for permission…');
    try {
      if ((await Notification.requestPermission()) !== 'granted') throw new Error('Notifications weren’t allowed. You can allow them in this browser’s settings.');
      const reg = await navigator.serviceWorker.ready, { publicKey } = await call('key');
      let sub = await reg.pushManager.getSubscription();
      if (sub && sub.options?.applicationServerKey && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== publicKey) { await sub.unsubscribe(); sub = null; }
      sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(publicKey) });
      await call('subscribe', { subscription: sub.toJSON(), hour: Number(hour.control.value), tz: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, label: isIOS() ? 'iPhone' : /Android/.test(navigator.userAgent) ? 'Android phone' : 'Computer' });
      await onEnabled?.();
      toast(`Morning brief on · ${hourLabel(hour.control.value)} every day.`);
    } catch (e) { status.textContent = e.message || String(e); busy(false); return; }
    busy(false); draw();
  }
  hour.control.addEventListener('change', async () => {
    const sub = await currentSubscription(); if (!sub) return;
    try { await call('subscribe', { subscription: sub.toJSON(), hour: Number(hour.control.value), tz: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone }); toast(`Morning brief moved to ${hourLabel(hour.control.value)}.`); draw(); }
    catch (e) { status.textContent = e.message; }
  });
  draw().catch(e => { status.textContent = e.message || String(e); });
  return card;
}
