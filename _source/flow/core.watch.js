
/* ━━━━━ PVX-N386 · pvxWatch: the layers that watch the whole page share one observer (stage 2b) ━━━━━
   pvxWatch(fn, options, target) stands in for  new MutationObserver(fn).observe(target, options)  when target is document.body
   or document.documentElement. There is one real observer per target. Each caller still gets only the records its own options
   would have given it (type, attributeFilter, subtree), as an array, in the order the callers registered; a caller with nothing
   to receive isn't called. Callers with the same options are handed the same array, so a caller must not change it.
   It returns {disconnect(), takeRecords()}. A watcher on one element keeps its own observer. */
var pvxWatch=(function(){
  var hubs=[], UNLISTED=1<<31;   /* an attribute no caller listed by name: only a caller that asked for every attribute receives it */
  function hubFor(target){ for(var i=0;i<hubs.length;i++) if(hubs[i].target===target) return hubs[i];
    var h={target:target,subs:[],sigs:{},mo:null,all:false,bits:{},nbits:0,oldV:false,cd:false,cl:false,st:false,last:'',batch:0}; hubs.push(h); return h; }
  /* A batch is sorted once. Each record gets one number: 1 nodes, 2 text, or the bit of its attribute. Callers with the same options
     share one answer, worked out the first time one of them is reached. */
  function pick(h,g,ms,kind,atT){ var out=[], m=g.mask, all=g.allAttr, deep=g.subtree;
    for(var j=0;j<ms.length;j++){ var k=kind[j]; if((k&m)||(all&&(k<0||k>=4))){ if(deep||atT[j]) out.push(ms[j]); } }
    return out; }
  function deliver(h,ms){ var list=h.subs.slice(), n=ms.length, kind=new Array(n), atT=new Array(n), t=h.target, b=++h.batch, j;
    for(j=0;j<n;j++){ var r=ms[j]; atT[j]=r.target===t; kind[j]= r.type==='childList'?1 : r.type==='characterData'?2 : (h.bits[r.attributeName]||UNLISTED); }
    for(var i=0;i<list.length;i++){ var s=list[i]; if(s.off) continue; var g=s.sig; if(g.batch!==b){ g.batch=b; g.out=pick(h,g,ms,kind,atT); }
      if(g.out.length){ try{ s.fn(g.out,s.obs); }catch(e){ (function(e){ setTimeout(function(){ throw e; },0); })(e); } } } }
  function start(h){ if(!h.mo) h.mo=new MutationObserver(function(ms){ deliver(h,ms); });
    var o={}; if(h.cl) o.childList=true; if(h.st) o.subtree=true; if(h.cd) o.characterData=true;
    if(h.all){ o.attributes=true; } else { var f=Object.keys(h.bits); if(f.length){ o.attributes=true; o.attributeFilter=f; } }
    if(o.attributes&&h.oldV) o.attributeOldValue=true;
    var k=JSON.stringify(o); if(k!==h.last){ h.last=k; h.mo.observe(h.target,o); } }
  function watch(fn,opts,target){ opts=opts||{}; target=target||document.body; var h=hubFor(target);
    var attrs=!!(opts.attributes||opts.attributeFilter||opts.attributeOldValue), filter=opts.attributeFilter?opts.attributeFilter.slice():null, mask=0;
    if(opts.childList) mask|=1; if(opts.characterData||opts.characterDataOldValue) mask|=2;
    if(filter) filter.forEach(function(a){ if(!h.bits[a]){ if(h.nbits>=27) throw new Error('pvxWatch: too many different attributes on one target'); h.bits[a]=4<<(h.nbits++); } mask|=h.bits[a]; });
    var key=mask+'|'+(attrs&&!filter?'a':'')+'|'+(opts.subtree?'s':''), g=h.sigs[key]||(h.sigs[key]={mask:mask,allAttr:attrs&&!filter,subtree:!!opts.subtree,batch:0,out:null});
    var s={fn:fn,off:false,sig:g};
    s.obs={disconnect:function(){ s.off=true; var i=h.subs.indexOf(s); if(i>-1) h.subs.splice(i,1); },takeRecords:function(){ return []; }};
    h.subs.push(s); if(mask&1) h.cl=true; if(opts.subtree) h.st=true; if(mask&2) h.cd=true; if(opts.attributeOldValue) h.oldV=true; if(attrs&&!filter) h.all=true;
    start(h); return s.obs; }
  watch.count=function(target){ return target?hubFor(target).subs.length:hubs.reduce(function(a,h){ return a+h.subs.length; },0); };
  watch.hubs=function(){ return hubs.map(function(h){ return {target:h.target,watchers:h.subs.length,options:h.last}; }); };
  return watch;
})();
