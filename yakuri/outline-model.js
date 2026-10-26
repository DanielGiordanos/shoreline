/* One outline for every drug (Oct 25 2026) · Daniel: "Anything else to make it look this organized and easy to follow?" … "Just do it".
   Licensed Reference uses the same headings in the same order for every drug. Yakuri's sections each have their own title, so this sorts each section,
   word for word, under the heading it belongs to. It reads only the section's title; nothing in the text changes, and a section
   that fits no heading goes under Other evidence. The earliest match in the title decides, so "Verified dose context and safety
   corrections" is a dose section, and "Adverse effects & practical administration" an adverse-effects one. */
(function(root){
  'use strict';
  /* the order on the page, as in Licensed Reference */
  const PARTS=[
    ['uses','Uses & indications',/overview|\buses?\b|indication|extra-label|experimental|\btrials?\b|endpoint|outcome|efficacy|clinical assessment|stud(y|ies)/i],
    ['pharmacology','Pharmacology',/pharmacolog|pharmacokinetic|mechanis|absorption|bioavailab|half-life|exposure/i],
    ['contra','Contraindications & precautions',/contraind|precaution|warning|pregnan|lactat|kidney|\brenal\b|hepatic|\bliver\b|\bbreeds?\b|mdr1|\bckd\b/i],
    ['adverse','Adverse effects',/adverse|side effect|toxic|overdos|safety|tolerab|injection pain|discomfort/i],
    ['interactions','Interactions',/interaction/i],
    ['dosages','Dosages',/\bdos(e|es|ed|ing|ages?)\b|regimen|administration|\broutes?\b|calculation|dilution|infusion|\bcri\b/i],
    ['monitoring','Monitoring',/monitor|blood pressure|examination|laborator|follow-up|follow-through/i],
    ['client','Client information',/client|owner|caregiver|handout/i],
    ['forms','Dosage forms',/dosage forms|formulation|\bproducts?\b|strength|concentrat/i],
    ['storage','Storage & compatibility',/storage|stabilit|compatib|handling/i],
    ['limits','Evidence & limits',/evidence|limitation|\blimits?\b|scope|unresolved|\bsources?\b|questions?/i],
    ['other','Other evidence',null],
    ['refs','References & records',null]];
  /* a tie at the same place goes to the more specific heading: "Dosage Forms & pharmacology" is a dosage-forms section */
  const TIE=['forms','interactions','adverse','contra','monitoring','pharmacology','client','storage','dosages','uses','limits'];
  const REF_IDS=new Set(['imported-records','references','provenance','workbook-audit']);
  const LABEL=Object.fromEntries(PARTS.map(([k,l])=>[k,l]));
  const RANK=Object.fromEntries(PARTS.map(([k],i)=>[k,i]));

  function partOf(title,id){
    if(id==='dosages')return 'dosages';if(id&&REF_IDS.has(id))return 'refs';
    const t=String(title||'');let best=null,at=Infinity;
    for(const [k,,re] of PARTS){if(!re)continue;const m=re.exec(t);if(!m)continue;
      if(m.index<at||(m.index===at&&TIE.indexOf(k)<TIE.indexOf(best))){best=k;at=m.index;}}
    return best||'other';}

  /* sections [{id,title}] in page order → the same sections in outline order, each with its part; a part keeps its sections' own order,
     with Overview and Dosages first in theirs */
  function arrange(sections){
    const lead=s=>(s.part==='uses'&&/^overview$/i.test(s.title.trim()))||(s.part==='dosages'&&s.id==='dosages')?0:1;
    return sections.map((s,i)=>({...s,part:partOf(s.title,s.id),i})).sort((a,b)=>RANK[a.part]-RANK[b.part]||lead(a)-lead(b)||a.i-b.i);}

  const api={PARTS:PARTS.map(([k,l])=>({key:k,label:l})),LABEL,partOf,arrange};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.YakuriOutline=api;
})(typeof window!=='undefined'?window:globalThis);
