/* General arithmetic only. No drug data, dose extraction or prescribing authority. */
(function(root){
'use strict';
const PAIRS={
 weight:{label:'Weight · lb / kg',units:['lb','kg'],factor:0.45359237},
 mass:{label:'Mass · oz / g',units:['oz','g'],factor:28.349523125},
 smallMass:{label:'Mass · mg / mcg',units:['mg','mcg'],factor:1000},
 volume:{label:'Volume · US fl oz / mL',units:['US fl oz','mL'],factor:29.5735295625},
 temperature:{label:'Temperature · °F / °C',units:['°F','°C']}
};
function checked(n){if(!Number.isFinite(n))throw Error('Result is outside the supported numeric range.');return Object.is(n,-0)?0:n;}
function calculate(text){
 if(typeof text!=='string'||!text.trim())throw Error('Enter a calculation.');
 if(text.length>250)throw Error('Keep calculations under 250 characters.');
 const s=text.replace(/×/g,'*').replace(/[÷]/g,'/').replace(/−/g,'-');
 const tokens=[]; let p=0;
 while(p<s.length){
  if(/\s/.test(s[p])){p++;continue;}
  const number=s.slice(p).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
  if(number){tokens.push({number:checked(Number(number[0]))});p+=number[0].length;continue;}
  if('+-*/()%'.includes(s[p])){tokens.push(s[p++]);continue;}
  throw Error('Use numbers, parentheses and arithmetic symbols only.');
 }
 let i=0;
 function primary(){
  let value;
  if(tokens[i]==='+'||tokens[i]==='-'){const sign=tokens[i++];value=primary();return sign==='-'?-value:value;}
  if(tokens[i]==='('){i++;value=expression();if(tokens[i++]!==')')throw Error('Close each parenthesis.');}
  else if(tokens[i] && typeof tokens[i]==='object'){value=tokens[i++].number;}
  else throw Error('Enter a number after the operator.');
  while(tokens[i]==='%'){i++;value/=100;}
  return checked(value);
 }
 function term(){let value=primary();while(tokens[i]==='*'||tokens[i]==='/'){const op=tokens[i++],right=primary();if(op==='/'&&right===0)throw Error('Cannot divide by zero.');value=checked(op==='*'?value*right:value/right);}return value;}
 function expression(){let value=term();while(tokens[i]==='+'||tokens[i]==='-'){const op=tokens[i++],right=term();value=checked(op==='+'?value+right:value-right);}return value;}
 const result=expression();if(i!==tokens.length)throw Error('Separate numbers and parentheses with an operator.');return checked(result);
}
function convert(value,pairKey,reverse=false){
 const pair=PAIRS[pairKey];if(!pair)throw Error('Choose a supported conversion.');
 if(typeof value==='string'&&!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim()))throw Error('Enter a numeric value.');
 if(typeof value!=='string'&&typeof value!=='number')throw Error('Enter a numeric value.');
 const n=checked(Number(value));
 if(pairKey!=='temperature'&&n<0)throw Error('Weight, mass and volume must be zero or greater.');
 if(pairKey==='temperature')return checked(reverse?n*9/5+32:(n-32)*5/9);
 return checked(reverse?n/pair.factor:n*pair.factor);
}
function format(n){return String(Number(checked(n).toPrecision(12)));}
const api={PAIRS,calculate,convert,format};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PravixMath=api;
})(typeof window!=='undefined'?window:globalThis);
