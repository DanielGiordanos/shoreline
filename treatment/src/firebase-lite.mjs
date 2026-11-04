/* Pravix · firebase-lite (n302, Nov 2 2026)
   The Firebase modular SDK (tree-shaken: app, firestore, auth) behind the small part of the compat API that Treatment Sheets and the
   shared assets use: window.firebase.{apps, initializeApp, firestore(), auth(), firestore.FieldValue}. Every app file keeps calling the
   compat shapes (collection().doc().onSnapshot(), snapshot.exists, FieldValue.serverTimestamp(), auth().currentUser …) and this file
   translates. It defines window.firebase only when nothing has yet (the test harness's fake stays in charge).
   Built by treatment/src/build.py (esbuild) into treatment/firebase-lite.js. Supported surface, checked against the emulator by
   n302/fb/conformance: see the list at the end of this file. Anything outside it throws a plain Error naming the method. */
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore, connectFirestoreEmulator, collection, doc, getDoc, getDocFromServer, getDocs, getDocsFromServer, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, query, where, orderBy, limit, writeBatch, runTransaction, serverTimestamp, arrayUnion, arrayRemove, deleteField, increment,
  Timestamp, FieldPath, documentId
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator, onAuthStateChanged, onIdTokenChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';

function unsupported(what) { return new Error('firebase-lite: ' + what + ' is not supported here'); }

/* ---------- Firestore ---------- */
function wrapDocSnap(s) {
  const ref = wrapDocRef(s.ref);
  return {
    get exists() { return s.exists(); },
    data(opts) { return s.data(opts); },
    get(field) { return s.get(field); },
    get id() { return s.id; },
    get ref() { return ref; },
    get metadata() { return s.metadata; },
    isEqual(o) { return !!o && !!o._raw && s.isEqual(o._raw); },
    _raw: s
  };
}
function wrapQuerySnap(s) {
  let docs = null;
  const out = {
    get docs() { return docs || (docs = s.docs.map(wrapDocSnap)); },
    get size() { return s.size; },
    get empty() { return s.empty; },
    get metadata() { return s.metadata; },
    forEach(fn, thisArg) { out.docs.forEach(d => fn.call(thisArg, d)); },
    docChanges(opts) { return s.docChanges(opts).map(c => ({ type: c.type, oldIndex: c.oldIndex, newIndex: c.newIndex, doc: wrapDocSnap(c.doc) })); },
    _raw: s
  };
  return out;
}
function snapArgs(args) {
  /* compat: onSnapshot(next, error?) | onSnapshot(options, next, error?) | onSnapshot({next, error}) */
  let opts = {}, next, err;
  if (typeof args[0] === 'function') { next = args[0]; err = args[1]; }
  else if (args[0] && typeof args[0].next === 'function') { next = args[0].next; err = args[0].error; }
  else { opts = args[0] || {}; if (args[1] && typeof args[1].next === 'function') { next = args[1].next; err = args[1].error; } else { next = args[1]; err = args[2]; } }
  return { opts, next, err };
}
function raw(x) { return x && x._raw ? x._raw : x; }
function wrapQuery(q, _ref) {
  return {
    where(f, op, v) { return wrapQuery(query(q, where(f, op, v))); },
    orderBy(f, dir) { return wrapQuery(query(q, orderBy(f, dir))); },
    limit(n) { return wrapQuery(query(q, limit(n))); },
    get(opts) { return (opts && opts.source === 'server' ? getDocsFromServer(q) : getDocs(q)).then(wrapQuerySnap); },
    onSnapshot() { const a = snapArgs(arguments); return onSnapshot(q, a.opts, s => a.next(wrapQuerySnap(s)), a.err); },
    _raw: q
  };
}
function wrapCollection(c) {
  const out = wrapQuery(c, c);
  out.doc = function (id) { return wrapDocRef(id == null ? doc(c) : doc(c, String(id))); };
  out.add = function (data) { return addDoc(c, data).then(wrapDocRef); };
  Object.defineProperty(out, 'id', { get() { return c.id; } });
  Object.defineProperty(out, 'path', { get() { return c.path; } });
  Object.defineProperty(out, 'parent', { get() { return c.parent ? wrapDocRef(c.parent) : null; } });
  return out;
}
function wrapDocRef(d) {
  return {
    get id() { return d.id; },
    get path() { return d.path; },
    get parent() { return wrapCollection(d.parent); },
    collection(p) { return wrapCollection(collection(d, p)); },
    get(opts) { return (opts && opts.source === 'server' ? getDocFromServer(d) : getDoc(d)).then(wrapDocSnap); },
    set(data, opts) { return opts ? setDoc(d, data, opts) : setDoc(d, data); },
    update() { return updateDoc.apply(null, [d].concat([].slice.call(arguments))); },
    delete() { return deleteDoc(d); },
    onSnapshot() { const a = snapArgs(arguments); return onSnapshot(d, a.opts, s => a.next(wrapDocSnap(s)), a.err); },
    isEqual(o) { return !!o && !!o._raw && d.path === o._raw.path; },
    _raw: d
  };
}
function wrapBatch(b) {
  const out = {
    set(ref, data, opts) { opts ? b.set(raw(ref), data, opts) : b.set(raw(ref), data); return out; },
    update(ref) { b.update.apply(b, [raw(ref)].concat([].slice.call(arguments, 1))); return out; },
    delete(ref) { b.delete(raw(ref)); return out; },
    commit() { return b.commit(); }
  };
  return out;
}
function wrapTx(t) {
  const out = {
    get(ref) { return t.get(raw(ref)).then(wrapDocSnap); },
    set(ref, data, opts) { opts ? t.set(raw(ref), data, opts) : t.set(raw(ref), data); return out; },
    update(ref) { t.update.apply(t, [raw(ref)].concat([].slice.call(arguments, 1))); return out; },
    delete(ref) { t.delete(raw(ref)); return out; }
  };
  return out;
}
function makeFirestore(app) {
  const db = getFirestore(app);
  const E = window.__pvxFbEmu; if (E && E.firestore) { try { connectFirestoreEmulator(db, E.firestore[0], E.firestore[1]); } catch (e) {} }   /* tests only: point at the local emulator before the first use */
  return {
    collection(p) { return wrapCollection(collection(db, p)); },
    doc(p) { return wrapDocRef(doc(db, p)); },
    batch() { return wrapBatch(writeBatch(db)); },
    runTransaction(fn) { return runTransaction(db, t => fn(wrapTx(t))); },
    useEmulator(host, port) { connectFirestoreEmulator(db, host, port); },
    settings() { /* compat settings() are a no-op here: the defaults are what Treatment used */ },
    _raw: db
  };
}
function FieldValue() { throw unsupported('new FieldValue()'); }   /* a function, as compat's class is (typeof 'function') */
FieldValue.serverTimestamp = function () { return serverTimestamp(); };
FieldValue.arrayUnion = function () { return arrayUnion.apply(null, arguments); };
FieldValue.arrayRemove = function () { return arrayRemove.apply(null, arguments); };
FieldValue['delete'] = function () { return deleteField(); };
FieldValue.increment = function (n) { return increment(n); };

/* ---------- Auth ---------- */
function makeAuth(app) {
  const auth = getAuth(app);
  const E = window.__pvxFbEmu; if (E && E.auth) { try { connectAuthEmulator(auth, E.auth, { disableWarnings: true }); } catch (e) {} }
  const out = {
    get currentUser() { return auth.currentUser; },
    onAuthStateChanged(next, err, done) { return onAuthStateChanged(auth, next, err, done); },
    onIdTokenChanged(next, err, done) { return onIdTokenChanged(auth, next, err, done); },
    signInWithEmailAndPassword(e, p) { return signInWithEmailAndPassword(auth, e, p); },
    signOut() { return signOut(auth); },
    sendPasswordResetEmail(e, s) { return sendPasswordResetEmail(auth, e, s); },
    setPersistence(p) { return setPersistence(auth, p === 'SESSION' ? browserSessionPersistence : p === 'NONE' ? inMemoryPersistence : browserLocalPersistence); },
    useEmulator(url, opts) { connectAuthEmulator(auth, url, opts || { disableWarnings: true }); },
    get app() { return app; },
    _raw: auth
  };
  return out;
}

/* ---------- the compat-shaped global ---------- */
if (!window.firebase) {
  const fsCache = new Map(), authCache = new Map();
  const fb = {
    SDK_VERSION: '10.12.5-lite',
    get apps() { return getApps(); },
    initializeApp(cfg, name) { return name ? initializeApp(cfg, name) : initializeApp(cfg); },
    app(name) { return getApp(name); },
    firestore(app) { app = app || getApp(); if (!fsCache.has(app)) fsCache.set(app, makeFirestore(app)); return fsCache.get(app); },
    auth(app) { app = app || getApp(); if (!authCache.has(app)) authCache.set(app, makeAuth(app)); return authCache.get(app); }
  };
  fb.firestore.FieldValue = FieldValue;
  fb.firestore.Timestamp = Timestamp;
  fb.firestore.FieldPath = FieldPath;
  fb.firestore.FieldPath.documentId = documentId;
  fb.auth.Auth = { Persistence: { LOCAL: 'LOCAL', SESSION: 'SESSION', NONE: 'NONE' } };
  window.firebase = fb;
}
/* Supported: firebase.apps · initializeApp · app · firestore() → collection(path) · doc(path) · batch() · runTransaction() · useEmulator ·
   firestore.FieldValue.{serverTimestamp, arrayUnion, arrayRemove, delete, increment} · firestore.Timestamp · firestore.FieldPath;
   CollectionReference/Query: doc · add · where · orderBy · limit · get({source}) · onSnapshot(next|opts,next|{next,error}) · id · path · parent;
   DocumentReference: id · path · parent · collection · get({source}) · set(data,{merge}) · update · delete · onSnapshot · isEqual;
   DocumentSnapshot: exists (property) · data() · get() · id · ref · metadata; QuerySnapshot: docs · size · empty · forEach · docChanges · metadata;
   WriteBatch / Transaction: get · set · update · delete · commit;
   auth() → currentUser · onAuthStateChanged · onIdTokenChanged · signInWithEmailAndPassword · signOut · sendPasswordResetEmail · setPersistence · useEmulator. */
