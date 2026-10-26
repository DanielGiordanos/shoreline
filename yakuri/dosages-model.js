/* Dosages by species (Oct 25 2026) · Daniel: "like this" (Licensed Reference Dosages: species headings, one line per use).
   The model only arranges the drug's own imported dose lines. It adds no dose, route or frequency, and it never fills a gap:
   a species with no lines says so, a held drug keeps its figures as TO CONFIRM, and a line under review shows its review status. */
(function(root){
  'use strict';
  const SPECIES={dog:'Dogs',cat:'Cats'};
  const ROUTE={oral:'PO',subcutaneous:'SUBQ',intravenous:'IV',intramuscular:'IM'};   /* the standard abbreviations; subcutaneous is SUBQ, never SC (ISMP, Oct 26 2026); anything else stays as recorded */
  const SN=root.YakuriSafeNotation||(typeof require==='function'?require('./safe-notation.js'):null),safe=t=>SN?SN.text(t):t;   /* numbers that can't be misread */
  const HELD='TO CONFIRM (licensed copy)';
  const clean=v=>{const t=String(v==null?'':v).trim();return t&&t!=='null'&&t!=='undefined'?t:'';};
  const first=t=>t?t.charAt(0).toUpperCase()+t.slice(1):t;
  const route=r=>{const t=clean(r.ro)||clean(r.rn);return ROUTE[t.toLowerCase()]||t;};
  function sourceName(r){if(clean(r.src))return clean(r.src);try{const h=new URL(r.u).hostname.replace(/^www\./,'');return h;}catch(_){return 'Source not recorded';}}

  /* species order: the chosen species first, then dogs, then cats */
  function order(chosen){const all=Object.keys(SPECIES);return chosen&&all.includes(chosen)?[chosen,...all.filter(s=>s!==chosen)]:all;}

  function build(d,opt){
    opt=opt||{};const held=opt.state==='Held',notices=(d.editorial&&d.editorial.record_notices)||[];
    const sources=[],srcIndex=(u,src)=>{const key=u||src;if(!key)return 0;let i=sources.findIndex(s=>s.key===key);if(i<0){sources.push({key,url:u,name:''});i=sources.length-1;}return i+1;};   /* a source without an address (the hosted copy) still numbers */
    const covered=new Set([...(d.species||[]),...d.records.flatMap(r=>r.s||[])].map(s=>String(s).toLowerCase()));
    const groups=order(opt.species).filter(s=>covered.has(s)).map(sp=>{
      const uses=[];
      d.records.forEach((r,n)=>{if(!(r.s||[]).map(s=>String(s).toLowerCase()).includes(sp))return;
        const name=first(clean(r.i))||'Use not recorded';let u=uses.find(x=>x.name===name);if(!u){u={name,lines:[]};uses.push(u);}
        const note=notices.find(x=>(x.records||[]).includes(n+1));
        const line={record:n+1,dose:safe(clean(r.do)),route:safe(route(r)),frequency:safe(clean(r.fo)),candidate:/candidate/.test(String(r.st||'')),source:srcIndex(clean(r.u),clean(r.src))};
        if(sources[line.source-1]&&!sources[line.source-1].name)sources[line.source-1].name=sourceName(r);
        if(held){line.dose=HELD;line.frequency='';line.held=true;}
        else if(note){line.review={status:note.status,section:note.section};line.dose='';line.route='';line.frequency='';}   /* under review: its status stands in for the figures, which stay in Imported records */
        if(!line.dose&&!line.held&&!line.review)line.dose='Dose not recorded';
        u.lines.push(line);});
      return {species:sp,label:SPECIES[sp],uses};});
    return {groups,sources,held,count:d.records.length};}

  /* one line of text, for copying and for screen readers */
  function text(l){return l.review?l.review.status:[l.dose,l.route,l.frequency].filter(Boolean).join(' · ');}

  const api={build,text,order,SPECIES,ROUTE,HELD};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YakuriDosages=api;
})(typeof window!=='undefined'?window:globalThis);
