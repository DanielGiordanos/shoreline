/* Numbers that can't be misread (Oct 26 2026) · Daniel: "Add #1".
   Every dose Yakuri shows follows the ISMP List of Error-Prone Abbreviations, Symbols, and Dose Designations:
     - a leading zero before a decimal point: .5 mg → 0.5 mg;
     - no trailing zero after a whole number: 1.0 mg → 1 mg (doses and strengths only, not lab values, percentages or times);
     - mcg, never µg; units, never U or IU; mL, never cc;
     - SUBQ, never SC, SQ or sub q (SC is mistaken for SL, sublingual; SQ for "5 every");
     - daily and every other day, never QD or QOD.
   It changes how a dose is shown, never the data: the original records keep their wording (Imported records, References,
   Provenance and the approval panel, which shows each record as recorded, are left alone), and a number never changes value. YakuriSafeNotation.text() is the rule; the page part applies it
   to the monograph, the Dosages lines, Split view, Drug cards, Quick look and the medical calculators as they appear. */
(function(root){
  'use strict';
  const NUM='(?:\\d+(?:\\.\\d+)?|\\.\\d+)';
  const SEP='\\s*(?:–|—|-|to|or|and|/|,)\\s*';
  // the units a dose or a strength is written in; /dL, /L and % are lab values or rates and keep their precision
  const UNIT='(?:mg|mcg|µg|μg|ug|g|mL|ml|cc|L|units?|IU|U|mEq|mmol|tablets?|tabs?|capsules?|caps?|drops?|sprays?|puffs?)(?![a-zA-Z])(?!\\s*\\/\\s*d?L\\b)';
  const DOSE=new RegExp('('+NUM+'(?:'+SEP+NUM+')*)(\\s*)('+UNIT+')','g');
  const fixNum=n=>{let s=n;if(/^\.\d/.test(s))s='0'+s;if(/^\d+\.0+$/.test(s))s=s.replace(/\.0+$/,'');return s;};
  const fixRange=r=>r.replace(new RegExp(NUM,'g'),fixNum);
  const fixUnit=u=>/^(?:µg|μg|ug)$/.test(u)?'mcg':/^cc$/.test(u)?'mL':/^(?:IU|U)$/.test(u)?'units':u;
  const RULES=[
    [/(^|[^\w.])\.(\d)/g,(m,a,b)=>a+'0.'+b],                                  // a bare decimal anywhere a number starts: .5 → 0.5
    [/[µμ]g\b/g,'mcg'],
    [/\b(?:S\.C\.|s\.c\.)(?!\w)|\b(?:SC|SQ)(?!\w|\.\w)|\bsub\s?q\b|\bsubq\b/gi,'SUBQ'],    // ISMP: "Use SUBQ … or subcutaneous(ly)"
    [/\bsubcut\b/g,'SUBQ'],
    [/\bq\.?o\.?d\.?(?![\w])|\bQOD\b/gi,'every other day'],
    [/\bq\.?d\.(?![\w])|\bQD\b/g,'daily']];
  function text(s){if(!s||typeof s!=='string')return s;
    let t=s.replace(DOSE,(m,num,sp,unit)=>fixRange(num)+(/^(?:IU|U)$/.test(unit)?' ':sp)+fixUnit(unit));
    for(const [re,rep] of RULES)t=t.replace(re,rep);
    return t;}

  /* the page: where doses are read, as they appear; the original records and the references keep their wording */
  const WHERE='.reader > section[data-y-section]:not(#imported-records):not(#references):not(#provenance):not(#clinical-governance),#y-active-holds,.hold-reasons,.y-review-notes,.reader > .notice,.reader > section.notice,.y-dosages,.y-split-reader,.p-card-grid,.x-quick-look,#medical-content,.y-compare,.r-dialog .r-excerpt';
  const OPTIONS='#y-route option';
  const SKIP='script,style,textarea,input,select,option,code,pre,[contenteditable],.y-original,.references,.record,.source-meta,.y-find';
  function apply(scope){if(!scope||scope.nodeType!==1)return;
    const hosts=[...(scope.matches(WHERE)?[scope]:[]),...scope.querySelectorAll(WHERE)];
    const inside=scope.closest&&scope.closest(WHERE);if(inside&&!hosts.length)hosts.push(scope);
    for(const h of hosts){const w=document.createTreeWalker(h,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeValue.trim()&&!n.parentElement.closest(SKIP)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
      let n;while((n=w.nextNode())){const v=n.nodeValue,t=text(v);if(t!==v)n.nodeValue=t;}}
    /* pop-up choices show the safe form too; the value keeps the exact imported text, so matching and saved contexts don't change */
    for(const o of [...(scope.matches(OPTIONS)?[scope]:[]),...scope.querySelectorAll(OPTIONS)]){const v=o.textContent,t=text(v);if(t===v)continue;
      if(!o.hasAttribute('value'))o.setAttribute('value',v);o.textContent=t;}}
  const api={text,apply};
  if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
  root.YakuriSafeNotation=api;
  const start=()=>{apply(document.body);
    new MutationObserver(ms=>{for(const m of ms)for(const a of m.addedNodes){if(a.nodeType===1)apply(a);else if(a.nodeType===3&&a.parentElement)apply(a.parentElement);}}).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof window!=='undefined'?window:globalThis);
