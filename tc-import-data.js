/* Shared, deterministic financial import validation; no writes or inferred amounts. */
(function(root){
'use strict';
function parseCSV(input){
 const text=String(input||'').replace(/^\uFEFF/,''),rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(field);field=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field=''}else field+=c}
 if(quoted)throw Error('CSV contains an unclosed quoted field.');row.push(field);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
function cents(value,label='Amount'){
 if(value===null||value===undefined||String(value).trim()==='')return null;
 if(typeof value==='object'||typeof value==='boolean')throw Error(label+' must be a valid amount');
 let s=String(value).trim();if(s==='-'||s==='—')return 0;
 const negative=/^\(.*\)$/.test(s);if(negative)s=s.slice(1,-1).trim();
 s=s.replace(/^\$\s*/,'');
 if(!/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(s)||negative&&s.startsWith('-'))throw Error(label+' must be a number with at most two decimal places');
 const n=Math.round(Number(s.replace(/,/g,''))*100)*(negative?-1:1);if(!Number.isSafeInteger(n))throw Error(label+' is outside the supported range');return n;
}
const normalized=x=>String(x??'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
const aliases={code:['cost code','code','csi','csi code'],desc:['description','scope','cost item','name','work item'],budget:['original budget','original amount','budget','budget amount','amount'],revised:['revised budget','current budget'],forecast:['forecast cost','forecast','projected cost','forecast at completion'],committed:['committed','commitments','subcontract','po amount'],actual:['actual cost','cost to date','actual']};
function budgetHeader(row){const h=row.map(normalized),idx={};for(const[key,names]of Object.entries(aliases))idx[key]=names.map(n=>h.indexOf(n)).find(i=>i>=0)??-1;return idx}
function extractBudget(rows){
 if(!Array.isArray(rows)||!rows.length)throw Error('No worksheet rows found.');
 let hi=-1,idx;
 for(let i=0;i<Math.min(rows.length,50);i++){const candidate=budgetHeader(rows[i]);if((candidate.code>=0||candidate.desc>=0)&&['budget','revised','forecast'].some(k=>candidate[k]>=0)){hi=i;idx=candidate;break}}
 if(hi<0)throw Error('Budget headings required: Description or Cost Code, plus Original Budget, Revised Budget or Forecast.');
 const lines=[],skipped=[];
 for(let i=hi+1;i<rows.length;i++){
  const row=rows[i];if(!Array.isArray(row)||!row.some(v=>String(v??'').trim()))continue;
  const code=idx.code>=0?String(row[idx.code]??'').trim():'',description=idx.desc>=0?String(row[idx.desc]??'').trim():'';
  if((!code&&/^(?:(?:grand|sub|section|division|project|budget)\s*)?totals?\b/i.test(description))||/^(?:(?:grand|sub)\s*)?totals?$/i.test(code)){skipped.push({row:i+1,reason:'Summary / total row'});continue}
  const amounts={};for(const key of ['budget','revised','forecast','committed','actual'])amounts[key]=idx[key]>=0?cents(row[idx[key]],'Row '+(i+1)+' '+key):null;
  if(Object.values(amounts).every(v=>v===null)){skipped.push({row:i+1,reason:'Heading without amounts'});continue}
  if(!code&&!description)throw Error('Row '+(i+1)+' has amounts without a description or cost code');
  const original=amounts.budget??0,revised=amounts.revised??original,forecast=amounts.forecast??revised;
  lines.push({costCode:code||'TBD',description:description||code,originalBudget:original/100,revisedBudget:revised/100,forecastCost:forecast/100,committed:(amounts.committed??0)/100,actual:(amounts.actual??0)/100,status:'Imported',sourceRow:i+1});
 }
 const total=key=>lines.reduce((sum,line)=>sum+Math.round(line[key]*100),0)/100;
 return {lines,totalOriginal:total('originalBudget'),totalRevised:total('revisedBudget'),totalForecast:total('forecastCost'),skipped};
}
const api={parseCSV,cents,extractBudget,budgetHeader};root.tcImportData=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
