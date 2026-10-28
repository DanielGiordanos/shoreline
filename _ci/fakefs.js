/* TEST ONLY — an in-memory stand-in for the Firebase compat SDK (Firestore + Auth). Nothing leaves the page.
   Seed with window.__fsSeed = {'sheets/v_x': {...}, 'visits/1': {...}} and window.__fsUser = {uid, displayName, email} (add_init_script).
   window.__fs is the store, window.__fsLog every write ([op, path, data]). Supports the parts Pravix uses: collection/doc/where
   (equality), get, set (merge), update (dotted paths, FieldValue.delete / arrayUnion / increment), onSnapshot (doc and query),
   runTransaction, batch. */
(function(){
var S=window.__fs={}, LOG=window.__fsLog=[], subs=[];
Object.keys(window.__fsSeed||{}).forEach(function(k){ S[k]=JSON.parse(JSON.stringify(window.__fsSeed[k])); });
function clone(x){ return x===undefined?undefined:JSON.parse(JSON.stringify(x)); }
var DEL={__fv:'del'};
function isFV(v,k){ return v&&typeof v==='object'&&v.__fv===k; }
function applyVal(cur,last,v){
  if(isFV(v,'del')) delete cur[last];
  else if(isFV(v,'union')){ var a=Array.isArray(cur[last])?cur[last]:[]; v.v.forEach(function(x){ if(!a.some(function(y){ return JSON.stringify(y)===JSON.stringify(x); })) a.push(clone(x)); }); cur[last]=a; }
  else if(isFV(v,'inc')) cur[last]=(cur[last]||0)+v.v;
  else cur[last]=clone(resolve(v)); }
function setPath(o,path,v){ var ks=path.split('.'), cur=o; for(var i=0;i<ks.length-1;i++){ if(!cur[ks[i]]||typeof cur[ks[i]]!=='object') cur[ks[i]]={}; cur=cur[ks[i]]; } applyVal(cur,ks[ks.length-1],v); }
function resolve(v){ if(Array.isArray(v)) return v.map(resolve); if(v&&typeof v==='object'&&!v.__fv){ var o={}; Object.keys(v).forEach(function(k){ if(!isFV(v[k],'del')) o[k]=resolve(v[k]); }); return o; } return v; }
function notify(){ setTimeout(function(){ subs.slice().forEach(function(s){ try{ s(); }catch(e){ console.error(e); } }); },0); }
function snapOf(path){ var d=S[path]; return {exists:!!d,id:path.split('/').pop(),ref:new D(path),data:function(){ return clone(d); },metadata:{hasPendingWrites:false,fromCache:false}}; }
function D(p){ this.path=p; this.id=p.split('/').pop(); }
D.prototype.get=function(){ return Promise.resolve(snapOf(this.path)); };
D.prototype.set=function(d,o){ var p=this.path; LOG.push(['set',p,clone(resolve(d)),!!(o&&o.merge)]);
  if(o&&o.merge){ var cur=S[p]||{}; (function mrg(t,src){ Object.keys(src).forEach(function(k){ var v=src[k]; if(v&&typeof v==='object'&&!Array.isArray(v)&&!v.__fv){ if(!t[k]||typeof t[k]!=='object') t[k]={}; mrg(t[k],v); } else applyVal(t,k,v); }); })(cur,d); S[p]=cur; notify(); return Promise.resolve(); }
  else S[p]=clone(resolve(d)); notify(); return Promise.resolve(); };
D.prototype.update=function(d){ var p=this.path; if(!S[p]) return Promise.reject({code:'not-found',message:'No document to update: '+p});
  LOG.push(['update',p,clone(d)]); Object.keys(d).forEach(function(k){ setPath(S[p],k,d[k]); }); notify(); return Promise.resolve(); };
D.prototype.delete=function(){ LOG.push(['delete',this.path]); delete S[this.path]; notify(); return Promise.resolve(); };
D.prototype.collection=function(n){ return new Q(this.path+'/'+n); };
D.prototype.onSnapshot=function(cb,c2){ if(typeof cb!=='function') cb=c2; var p=this.path, last=null; function f(){ var j=JSON.stringify(S[p]||null); if(j===last) return; last=j; cb(snapOf(p)); } subs.push(f); setTimeout(f,0); return function(){ var i=subs.indexOf(f); if(i>-1) subs.splice(i,1); }; };
function Q(n,F){ this.n=n; this.F=F||[]; }
Q.prototype.where=function(a,op,c){ return new Q(this.n,this.F.concat([[a,op,c]])); };
Q.prototype.orderBy=Q.prototype.limit=function(){ return this; };
Q.prototype.doc=function(id){ return new D(this.n+'/'+(id||('auto'+Math.random().toString(36).slice(2,10)))); };
Q.prototype.add=function(d){ var r=this.doc(); return r.set(d).then(function(){ return r; }); };
function get(o,k){ return k.split('.').reduce(function(a,b){ return a==null?a:a[b]; },o); }
Q.prototype._docs=function(){ var n=this.n, F=this.F; return Object.keys(S).filter(function(p){ var i=p.lastIndexOf('/'); return p.slice(0,i)===n; }).sort()
  .filter(function(p){ return F.every(function(f){ var v=get(S[p],f[0]); return f[1]==='=='?v===f[2]:f[1]==='in'?f[2].indexOf(v)>-1:f[1]==='>='?v>=f[2]:f[1]==='<='?v<=f[2]:true; }); })
  .map(function(p){ return snapOf(p); }); };
Q.prototype.get=function(){ var d=this._docs(); return Promise.resolve({docs:d,empty:!d.length,size:d.length,forEach:function(f){ d.forEach(f); }}); };
Q.prototype.onSnapshot=function(cb,c2){ if(typeof cb!=='function') cb=c2; var q=this, last=null; function f(){ var d=q._docs(), j=JSON.stringify(d.map(function(x){ return [x.id,x.data()]; })); if(j===last) return; last=j;
  cb({docs:d,empty:!d.length,size:d.length,forEach:function(g){ d.forEach(g); },docChanges:function(){ return []; },metadata:{hasPendingWrites:false,fromCache:false}}); }
  subs.push(f); setTimeout(f,window.__fsDelay||0); return function(){ var i=subs.indexOf(f); if(i>-1) subs.splice(i,1); }; };   /* __fsDelay: simulate a slow first load (n175 tests) */
var db={collection:function(n){ return new Q(n); },doc:function(p){ return new D(p); },
  batch:function(){ var ops=[]; return {set:function(r,d,o){ ops.push(function(){ return r.set(d,o); }); },update:function(r,d){ ops.push(function(){ return r.update(d); }); },delete:function(r){ ops.push(function(){ return r.delete(); }); },commit:function(){ ops.forEach(function(f){ f(); }); return Promise.resolve(); }}; },
  runTransaction:function(fn){ var w=[]; var tx={get:function(r){ return r.get(); },set:function(r,d,o){ w.push(function(){ return r.set(d,o); }); return tx; },update:function(r,d){ w.push(function(){ return r.update(d); }); return tx; },delete:function(r){ w.push(function(){ return r.delete(); }); return tx; }};
    return Promise.resolve(fn(tx)).then(function(res){ w.forEach(function(f){ f(); }); return res; }); },
  enablePersistence:function(){ return Promise.resolve(); }, settings:function(){}};
var fs=function(){ return db; };
fs.FieldValue={delete:function(){ return DEL; },arrayUnion:function(){ return {__fv:'union',v:[].slice.call(arguments)}; },increment:function(n){ return {__fv:'inc',v:n}; },serverTimestamp:function(){ return new Date().toISOString(); }};
fs.Timestamp={now:function(){ return {toDate:function(){ return new Date(); }}; },fromDate:function(d){ return {toDate:function(){ return d; }}; }};
var u=window.__fsUser||null, cbs=[];
var auth={get currentUser(){ return u; },onAuthStateChanged:function(cb){ cbs.push(cb); setTimeout(function(){ cb(u); },0); return function(){}; },signOut:function(){ u=null; cbs.forEach(function(c){ c(null); }); return Promise.resolve(); },setPersistence:function(){ return Promise.resolve(); },signInWithEmailAndPassword:function(e,p){ if(p==='right-password'){ u={uid:'u-'+e,email:e,displayName:''}; cbs.forEach(function(c){ c(u); }); return Promise.resolve({user:u}); } return Promise.reject({code:'auth/invalid-credential'}); },sendPasswordResetEmail:function(e){ (window.__fsResets=window.__fsResets||[]).push(e); return Promise.resolve(); }};
var au=function(){ return auth; }; au.Auth={Persistence:{LOCAL:'local',SESSION:'session',NONE:'none'}};
window.firebase={apps:[],initializeApp:function(){ this.apps.push({}); return {}; },firestore:fs,auth:au};
})();
