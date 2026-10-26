(function(){
'use strict';
const math=window.PravixMath, button=document.getElementById('utility-calculator');
if(!button||!math)return;
/* HIG Segmented controls (Oct 25 2026): two segments, Calculator | Convert; the unit pair is a pop-up under them (it was six segments in two rows) */
const pairs=[['weight','lb ↔ kg'],['mass','oz ↔ g'],['smallMass','mg ↔ mcg'],['volume','mL ↔ fl oz'],['temperature','°F ↔ °C']],tabs=[['arithmetic','Calculator'],['convert','Convert']];
const PAIR_KEY='yakuri-calc-pair',storedPair=()=>{try{const v=localStorage.getItem(PAIR_KEY);return pairs.some(p=>p[0]===v)?v:'weight';}catch{return 'weight';}};
const units={weight:['lb','kg'],mass:['oz','g'],smallMass:['mg','mcg'],volume:['mL','US fl oz'],temperature:['°F','°C']};
const panel=document.createElement('section');panel.id='utility-calculator-panel';panel.hidden=true;
panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','utility-calculator-title');
panel.innerHTML=`<header class="calc-header"><h2 id="utility-calculator-title">Calculator</h2><button type="button" id="calc-close" aria-label="Close calculator">×</button></header>
<div id="calc-readout" role="tabpanel" aria-labelledby="calc-tab-arithmetic">
<div id="calc-arithmetic" class="calc-display"><span id="calc-expression-note" aria-live="polite"></span><input id="calc-expression" aria-label="Calculation" value="0" autocomplete="off" spellcheck="false" maxlength="250" inputmode="decimal"></div>
<div id="calc-conversion" hidden>${[0,1].map(i=>`<label class="calc-unit" data-side="${i}"><span id="calc-unit-${i}"></span><input id="calc-value-${i}" type="text" autocomplete="off" spellcheck="false" maxlength="80" inputmode="decimal" value="0"></label>`).join('')}</div></div>
<div class="calc-tabs" role="tablist" aria-label="Calculator mode">${tabs.map(([key,label],i)=>`<button type="button" role="tab" id="calc-tab-${key}" data-mode="${key}" aria-controls="calc-readout" aria-selected="${i===0}" tabindex="${i===0?0:-1}">${label}</button>`).join('')}</div>
<label class="calc-pair" hidden><span>Units</span><select id="calc-pair">${pairs.map(([key,label])=>`<option value="${key}">${label}</option>`).join('')}</select></label>
<div class="calc-keypad">${[['Clear','clear'],['%','%'],['÷','÷'],['7','7'],['8','8'],['9','9'],['×','×'],['4','4'],['5','5'],['6','6'],['−','−'],['1','1'],['2','2'],['3','3'],['+','+'],['0','0'],['.','.'],['=','=']].map(([label,key])=>`<button type="button" data-calc-key="${key}" class="${key==='clear'||key==='0'?'calc-wide ':''}${['%','÷','×','−','+','='].includes(key)?'calc-operator':''}" ${key==='='?'aria-label="Equals"':''}>${label}</button>`).join('')}</div>
<p id="calc-error" role="status"></p><p id="calc-help" class="calc-help"></p><footer>General arithmetic and conversions. No drug doses are selected or approved.</footer>`;
document.body.append(panel);
const q=s=>panel.querySelector(s), expression=q('#calc-expression'), values=[q('#calc-value-0'),q('#calc-value-1')];
let mode='arithmetic',side=0,completed=false;
function fitValues(){for(const input of values){const width=input.clientWidth;if(width)input.style.fontSize=Math.max(12,Math.min(28,width/(Math.max(1,input.value.length)*.62)))+'px';}}
new ResizeObserver(fitValues).observe(panel);
const activeInput=()=>mode==='arithmetic'?expression:values[side];
function close(){panel.hidden=true;button.setAttribute('aria-expanded','false');button.focus();}
button.onclick=()=>{panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)activeInput().focus();};
q('#calc-close').onclick=close;
function convert(){
 q('#calc-error').textContent='';
 try{const result=math.convert(values[side].value.trim()||'0',mode,mode==='volume'?side===0:side===1);values[1-side].value=math.format(result);}
 catch(e){values[1-side].value='';q('#calc-error').textContent=e.message;}
 fitValues();
}
function setSide(next){side=next;values.forEach((input,i)=>{input.closest('label').classList.toggle('calc-active',i===side);});}
function clear(){q('#calc-error').textContent='';completed=false;if(mode==='arithmetic'){expression.value='0';q('#calc-expression-note').textContent='';}else{values[side].value='0';convert();}}
function choose(key){
 if(key==='convert')key=storedPair();
 mode=key;side=0;completed=false;q('#calc-error').textContent='';
 const tab=mode==='arithmetic'?'arithmetic':'convert';
 q('#calc-arithmetic').hidden=mode!=='arithmetic';q('#calc-conversion').hidden=mode==='arithmetic';q('.calc-pair').hidden=mode==='arithmetic';
 if(mode!=='arithmetic'){q('#calc-pair').value=mode;try{localStorage.setItem(PAIR_KEY,mode);}catch{}}
 q('#calc-readout').setAttribute('aria-labelledby','calc-tab-'+tab);
 for(const t of panel.querySelectorAll('[data-mode]')){const on=t.dataset.mode===tab;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;}
 for(const operator of panel.querySelectorAll('.calc-operator'))operator.disabled=mode!=='arithmetic';
 if(mode!=='arithmetic'){units[mode].forEach((unit,i)=>{q('#calc-unit-'+i).textContent=unit;values[i].setAttribute('aria-label','Value in '+unit);});setSide(0);}
 q('#calc-help').textContent=mode==='arithmetic'?'Keyboard supported. Standard order of operations; % divides the preceding value by 100.':mode==='volume'?'Select either box to enter a value. US fluid ounces, not Imperial.':mode==='temperature'?'Select either box to enter a value. Type a minus sign for negative temperatures.':'Select either box to enter a value. Conversions update instantly.';
 clear();
}
function run(){try{const before=expression.value,result=math.format(math.calculate(before));expression.value=result;q('#calc-expression-note').textContent=before+' =';q('#calc-error').textContent='';completed=true;}catch(e){q('#calc-error').textContent=e.message;completed=false;}}
function insert(key){
 const input=activeInput();
 if(key==='clear'){clear();input.focus();return;}
 if(key==='='){if(mode==='arithmetic')run();input.focus();return;}
 if(mode!=='arithmetic'&&!/^[\d.]$/.test(key))return;
 if(mode==='arithmetic'&&completed){if(/^[\d.(]$/.test(key))expression.value='';completed=false;}
 let start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
 if(input.value==='0'&&/^\d$/.test(key)){start=0;end=1;}
 if(input.value.length-(end-start)+key.length>input.maxLength)return;
 input.setRangeText(key,start,end,'end');
 if(mode==='arithmetic'){q('#calc-expression-note').textContent='';q('#calc-error').textContent='';}else convert();
 input.focus();
}
q('.calc-keypad').onclick=e=>{const target=e.target.closest('[data-calc-key]');if(target&&!target.disabled)insert(target.dataset.calcKey);};
for(const tab of panel.querySelectorAll('[data-mode]'))tab.onclick=()=>choose(tab.dataset.mode);
q('.calc-tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?'arithmetic':e.key==='End'?'convert':mode==='arithmetic'?'convert':'arithmetic';choose(next);q('#calc-tab-'+next).focus();};
q('#calc-pair').onchange=e=>{choose(e.target.value);values[0].focus();};
expression.oninput=()=>{completed=false;q('#calc-error').textContent='';q('#calc-expression-note').textContent='';};
expression.onkeydown=e=>{if(e.key==='Enter'||e.key==='='){e.preventDefault();run();}else if(completed&&/^[\d.]$/.test(e.key)&&!e.metaKey&&!e.ctrlKey){expression.value='';completed=false;}};
values.forEach((input,i)=>{input.onfocus=()=>{if(side!==i){setSide(i);input.select();}};input.oninput=()=>{setSide(i);convert();};});
panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close();}else if(e.target.tagName!=='INPUT'&&!e.ctrlKey&&!e.metaKey&&/^[\d.%/*+\-]$/.test(e.key)){e.stopPropagation();e.preventDefault();insert(e.key==='/'?'÷':e.key==='*'?'×':e.key==='-'?'−':e.key);}});
choose('arithmetic');
})();
