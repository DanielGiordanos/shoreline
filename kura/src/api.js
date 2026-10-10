// Transport, device persistence and synchronization. No inventory calculations.
const listeners = new Set();
let current = null, syncing = false, database;
const remembered = 'kura.session-context.v1';
const uuid = () => crypto.randomUUID();
const notify = () => listeners.forEach(fn => fn());
const identity = () => current?.user ? `${current.user.tenant_id}:${current.user.id}` : null;
const offlineError = message => Object.assign(new Error(message), {code:'offline', status:0});
function remember(value) {
  current = value;
  // Context is not an authentication credential; the server session is HttpOnly.
  if(value?.user) sessionStorage.setItem(remembered, JSON.stringify(value));
  else sessionStorage.removeItem(remembered);
  return value;
}
function db() {
  return database ||= new Promise((resolve,reject) => {
    const request = indexedDB.open('kura-device-v1',1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('queue',{keyPath:'id'});
      request.result.createObjectStore('snapshots',{keyPath:'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Device storage is unavailable. Offline work cannot be saved.'));
  });
}
async function transaction(store, mode, operation) {
  const connection = await db();
  return new Promise((resolve,reject) => {
    const tx = connection.transaction(store,mode);
    const request = operation(tx.objectStore(store));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error || new Error('Device storage could not be updated.'));
    tx.onabort = () => reject(tx.error || new Error('Device storage update was cancelled.'));
  });
}
async function request(path, payload) {
  // shoreline.pravix.app: the page itself stands in for the Kura server (src/web/kura-web.js), same endpoints and errors.
  if(globalThis.kuraTransport) return globalThis.kuraTransport(path, payload);
  let response;
  try {
    response = await fetch(`/api/v1/${path}`, {
      method:payload===undefined?'GET':'POST', credentials:'same-origin', cache:'no-store',
      headers:{...(payload===undefined?{}:{'Content-Type':'application/json'}),...(current?.csrf?{'X-CSRF-Token':current.csrf}:{})},
      body:payload===undefined?undefined:JSON.stringify(payload), signal:AbortSignal.timeout(30000)
    });
  } catch(error) { throw offlineError('Kura could not reach the server. Check your connection and review the device queue before repeating a movement.'); }
  let body;
  try {body = await response.json();} catch {throw Object.assign(new Error('The server response was incomplete. Retry the same operation.'),{status:502,code:'response_incomplete'});}
  if(!response.ok) throw Object.assign(new Error(body.error || 'The request could not be completed.'),{status:response.status,code:body.code,details:body.details});
  return body;
}
const queueable = (command,payload) => command==='stock.move' && ['receive','use','waste','dispose','return','transfer','emergency'].includes(payload.kind);
const uncertain = error => !error.status || error.status>=500 || error.status===401 || ['csrf','origin_rejected','host_rejected','authentication','rate_limit'].includes(error.code);
const actionError = message => Object.assign(new Error(message),{status:409,code:'pending_action'});
function resourceScopes(command,payload={}) {
  if(command==='item.merge')return [`item:${payload.source_id}`,`item:${payload.target_id}`];
  if(command.startsWith('order.'))return [`order:${payload.id||`new:${payload.vendor_id}:${payload.location_id}`}`];
  if(command.startsWith('count.'))return [`count:${payload.id||`new:${payload.location_id||'all'}`}`];
  if(command.startsWith('item.'))return [`item:${payload.id||`new:${payload.sku||payload.name}`}`];
  if(command.startsWith('barcode.'))return [`item:${payload.item_id}`];
  if(command==='stock.move')return [`item:${payload.item_id}`,`stock:${payload.item_id}:${payload.location_id}`];
  if(command.startsWith('user.'))return [`user:${payload.id||payload.email}`];
  if(command.startsWith('integration.'))return [`event:${payload.id||`${payload.source}:${payload.event_id}`}`];
  return [`${command.split('.')[0]}:${payload.id||payload.item_id||payload.name||'new'}`];
}
function durablePayload(command,payload) {
  // Never persist credential fields, not even inside a signature/hash. A
  // redacted intent can still establish its outcome using the request key.
  const secret = /^(password|new_password|current_password|secret|token|api_key|authorization)$/i;
  let redacted = false;
  const clean = value => {
    if(Array.isArray(value))return value.map(clean);
    if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>{if(secret.test(key)){redacted=true;return false;}return true;}).map(([key,v])=>[key,clean(v)]));
    return value;
  };
  return {payload:clean(payload),requires_reentry:redacted};
}
async function confirmIdentity() {
  const owner = identity();
  const fresh = await request('session');
  if(!fresh.user || `${fresh.user.tenant_id}:${fresh.user.id}`!==owner)throw Object.assign(new Error('Sign back in with the account that recorded these actions.'),{status:401,code:'authentication'});
  remember(fresh);
}
async function recordIntent(row) {
  // Read/check/insert is one IndexedDB write transaction, including across
  // tabs. Two reopened forms cannot race into duplicate receipt intents.
  const connection = await db();
  return new Promise((resolve,reject)=>{
    const tx=connection.transaction('queue','readwrite'), store=tx.objectStore('queue');
    let failure;
    const existing=store.getAll();
    existing.onsuccess=()=>{
      if(existing.result.some(r=>r.id===row.id)){
        failure=actionError('This request key already belongs to a recorded action. Retry it from the device queue instead of replacing its saved details.');tx.abort();return;
      }
      const conflicts=existing.result.filter(r=>r.owner===row.owner&&r.id!==row.id&&
        (r.scopes||resourceScopes(r.command,r.payload)).some(scope=>row.scopes.includes(scope)));
      if(!row.allow_offline&&conflicts.length){failure=actionError('An earlier action for this record is awaiting confirmation. Review the device queue before submitting another action.');tx.abort();return;}
      store.put(row);
    };
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(failure||tx.error||new Error('The action could not be recorded on this device.'));
    tx.onabort=()=>reject(failure||tx.error||new Error('The action could not be recorded on this device.'));
  });
}
async function queue() {
  const owner = identity();
  if(!owner) return [];
  return (await transaction('queue','readonly',s=>s.getAll())).filter(row=>row.owner===owner).sort((a,b)=>a.created_at.localeCompare(b.created_at));
}
async function command(command,payload,key) {
  if(!identity()) throw Object.assign(new Error('Sign in before saving changes.'),{status:401,code:'authentication'});
  const allow_offline = queueable(command,payload);
  // Online-only workflows may recover an earlier transmission, but cannot
  // originate while disconnected. A successful session preflight also checks
  // the account and refreshes its CSRF token before recording that intent.
  if(!allow_offline){
    if(globalThis.navigator?.onLine===false)throw offlineError('This action requires a server connection. Reconnect before starting it.');
    await confirmIdentity();
  }
  // Each newly confirmed movement is a distinct action, even if its fields match
  // another pending movement. Queue retry alone reuses its original key.
  key ||= uuid();
  const row = {id:key,key,owner:identity(),command,...durablePayload(command,payload),scopes:resourceScopes(command,payload),
    allow_offline,created_at:new Date().toISOString(),status:'sending'};
  // Every authenticated command has a durable intent before transmission.
  // Receipt, count, merge and order acknowledgements must survive reload too.
  await recordIntent(row);
  try {
    const {result} = await request('command',{command,payload,key});
    await transaction('queue','readwrite',s=>s.delete(key));
    notify(); return result;
  } catch(error) {
    if(uncertain(error)) {
      try{await transaction('queue','readwrite',s=>s.put({...row,status:'pending',error:error.message}));}catch{/* The original durable sending record remains recoverable. */}
      notify(); return {queued:true,key,awaiting_confirmation:true,requires_reentry:row.requires_reentry};
    }
    await transaction('queue','readwrite',s=>s.delete(key));
    notify(); throw error;
  }
}
async function retryQueue() {
  if(syncing) return;
  syncing = true;
  try {
    await confirmIdentity();
    for(const row of await queue()) {
      try {
        if(row.requires_reentry){
          const outcome=await request(`request-outcome?key=${encodeURIComponent(row.key)}`);
          if(outcome.status==='unknown'){
            await transaction('queue','readwrite',s=>s.put({...row,status:'needs_review',error:'No committed result was found. Passwords and secrets were not stored. Discard this unresolved intent safely, then re-enter the credential action.'}));
            break;
          }
        }else await request('command',{command:row.command,payload:row.payload,key:row.key});
        await transaction('queue','readwrite',s=>s.delete(row.id));
      } catch(error) {
        await transaction('queue','readwrite',s=>s.put({...row,status:uncertain(error)?'pending':'needs_review',error:error.message}));
        // Preserve operation order. Later movements may depend on this one.
        break;
      }
    }
  } finally {syncing=false;notify();}
}
async function discardQueued(id) {
  const row = (await queue()).find(r=>r.id===id);
  if(!row) throw new Error('Queued movement not found for this account.');
  // An ambiguous transmission may already have committed. Replay the same key
  // online before discarding; never claim deleting the queue reverses stock.
  if(row.status!=='needs_review') throw new Error('Reconnect and retry this movement first. Its server outcome is uncertain; deleting it could hide a saved movement.');
  // Cancellation and posting use the same database write lock. A delayed
  // original request can never commit after this intent is cleared as cancelled.
  const outcome=await request('request-cancel',{key:row.key});
  await transaction('queue','readwrite',s=>s.delete(id));
  notify();
  if(outcome.status==='committed')throw Object.assign(new Error('This action was already saved by the server. Its queue entry was cleared; no inventory was reversed. Review the current activity before making a correction.'),{status:409,code:'already_committed'});
  return outcome;
}
async function clearOfflineData() {
  const owner=identity();
  if(owner) await transaction('snapshots','readwrite',s=>s.delete(owner));
  sessionStorage.removeItem(remembered); current=null;
}
export const api = {
  async session() {
    try {return remember(await request('session'));}
    catch(error) {
      if(error.status!==0) throw error;
      const cached=sessionStorage.getItem(remembered);
      if(!cached) throw error;
      return current={...JSON.parse(cached),offline:true};
    }
  },
  async setup(fields) {return remember(await request('setup',fields));},
  async login(fields) {return remember(await request('login',fields));},
  async logout() {
    if((await queue()).length) throw new Error('Resolve the device queue before signing out so recorded movements are not left behind.');
    await request('logout',{}); await clearOfflineData();
  },
  async state() {
    const state=await request('state');
    if(identity()) await transaction('snapshots','readwrite',s=>s.put({id:identity(),saved_at:new Date().toISOString(),state}));
    return state;
  },
  async loadOfflineState() {
    if(!identity()) return null;
    const cached=await transaction('snapshots','readonly',s=>s.get(identity()));
    return cached?{...cached.state,offline_snapshot_at:cached.saved_at}:null;
  },
  // Treatment Sheets connection: never queued offline, never journaled — the account password is sent once and not kept.
  async connector(action,fields={}) {return request('connector',{...fields,action});},
  command,queue,retryQueue,discardQueued,clearOfflineData,
  exportUrl:kind=>`/api/v1/export?kind=${encodeURIComponent(kind)}`,
  backupUrl:()=>'/api/v1/backup',
  web:()=>!!globalThis.kuraTransport,
  download(kind){
    if(globalThis.kuraDownload)return globalThis.kuraDownload(kind);
    location.assign(kind==='backup'?'/api/v1/backup':`/api/v1/export?kind=${encodeURIComponent(kind)}`);
  },
  subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}
};
addEventListener('online',notify); addEventListener('offline',notify);
