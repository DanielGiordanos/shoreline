
/* ━━━━━ PVX-N387 · steps: a function of the main script and what the layers add to it (stage 2c) ━━━━━
   A layer no longer replaces a function (saving the old one and calling it from the new one). It adds to it:
     pvxBefore('fillDrawer', function(p){ … }, 'who')     runs before the function, with the same arguments
     pvxAfter ('fillDrawer', function(p){ … }, 'who')     runs after it, with the same arguments; the function's result is returned
     pvxWrap  ('fillDrawer', function(inner){ return function(p){ … inner.apply(this,arguments) … }; }, 'who')
                                                          for a layer that decides whether the function runs, or changes what goes in or comes out
   The order is the order the layers were added, as when each wrapped the one before: the last one added is outermost. Its "before"
   runs first and its "after" runs last. The function itself is NAME$base; NAME(…) runs it with its layers. pvxSteps.of(NAME) lists them.
   A name without a NAME$base is wrapped the old way, so the three calls work for any page-wide function. */
var pvxSteps=(function(){
  var all={};
  function flat(inner){ var g={before:[],after:[],inner:inner};
    g.fn=function(){ var b=g.before, a=g.after, nb=b.length, na=a.length, i, r;
      for(i=nb-1;i>=0;i--) b[i].apply(this,arguments);
      r=g.inner.apply(this,arguments);
      for(i=0;i<na;i++) a[i].apply(this,arguments);
      return r; };
    return g; }
  function add(name,kind,fn,who){ var base=window[name+'$base'];
    if(typeof base!=='function'){ var old=window[name]; if(typeof old!=='function') throw new Error('pvxSteps: no function named '+name);
      window[name]= kind==='wrap' ? fn(old) : kind==='before' ? function(){ fn.apply(this,arguments); return old.apply(this,arguments); } : function(){ var r=old.apply(this,arguments); fn.apply(this,arguments); return r; };
      return; }
    var s=all[name]||(all[name]={top:base,group:null,list:[]});
    if(kind==='wrap'){ var w=fn(s.top); if(typeof w!=='function') throw new Error('pvxWrap('+name+'): the layer must return a function'); s.top=w; s.group=null; }
    else { if(!s.group){ s.group=flat(s.top); s.top=s.group.fn; } s.group[kind].push(fn); }
    s.list.push({kind:kind,who:who||''}); }
  return { s:all, add:add,
    of:function(name){ return all[name]?all[name].list.map(function(x){ return {kind:x.kind,who:x.who}; }):[]; },
    names:function(){ return Object.keys(all); } };
})();
function pvxRun(name,base,self,args){ var s=pvxSteps.s[name]; return (s?s.top:base).apply(self,args); }
function pvxBefore(name,fn,who){ pvxSteps.add(name,'before',fn,who); }
function pvxAfter(name,fn,who){ pvxSteps.add(name,'after',fn,who); }
function pvxWrap(name,make,who){ pvxSteps.add(name,'wrap',make,who); }
