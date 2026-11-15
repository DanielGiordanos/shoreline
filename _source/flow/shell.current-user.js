

let CURRENT_USER='Daniel Giordano';
function userDisplayName(u){ if(!u) return CURRENT_USER; if(u.displayName && u.displayName.trim()) return u.displayName.trim(); var lp=((u.email||'').split('@')[0]||''); if(lp.indexOf('.')>-1||lp.indexOf('_')>-1){ return lp.split(/[._]+/).filter(Boolean).map(function(w){return w.charAt(0).toUpperCase()+w.slice(1).toLowerCase();}).join(' '); } return'Front Desk'; }
