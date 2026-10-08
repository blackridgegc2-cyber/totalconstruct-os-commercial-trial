'use strict';
// Pure, side-effect-free validation for TotalConstruct budget CSV uploads.
// Never auto-post imported budgets to project financials or QuickBooks.
const REQUIRED=['Project_Code','Agreement_Code','CSI_Division','Cost_Code','Cost_Description','Cost_Type','Quantity','Unit','Unit_Cost','Budget_Amount'];
const TYPES=new Set(['SUBCONTRACT','LABOR','MATERIAL','EQUIPMENT','GENERAL_CONDITIONS','OVERHEAD','FEE','ALLOWANCE','CONTINGENCY','OTHER_DIRECT']);
function parseCSV(text){
 if(typeof text!=='string'||text.length>5_000_000)throw Error('CSV exceeds 5 MB or is invalid');
 const rows=[],row=[];let field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}
 else if(c==='"'){if(field)throw Error('Invalid CSV quote');quoted=true}
 else if(c===','){row.push(field);field=''}
 else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push([...row]);row.length=0;field=''}
 else field+=c}
 if(quoted)throw Error('Unterminated CSV quote');
 row.push(field);if(row.some(v=>v.trim()))rows.push(row);
 return rows;
}
function parseMoney(s){const raw=String(s??'').trim();if(!/^-?\d+(\.\d{1,2})?$/.test(raw))throw Error('Enter decimal currency without symbols');const negative=raw[0]==='-';const [whole,frac='']=raw.replace('-','').split('.');const n=Number(whole)*100+Number(frac.padEnd(2,'0'));if(!Number.isSafeInteger(n))throw Error('Currency out of range');return negative?-n:n}
function validateBudgetCSV(text,{projectCode,knownAgreements}={}){
 const parsed=parseCSV(text);if(!parsed.length)return {valid:false,rows:[],errors:[{row:1,message:'CSV is empty'}]};
 const headers=parsed.shift().map((h,i)=>i===0?h.replace(/^\uFEFF/,'').trim():h.trim()),missing=REQUIRED.filter(k=>!headers.includes(k));
 if(missing.length)return {valid:false,rows:[],errors:[{row:1,message:'Missing columns: '+missing.join(', ')}]};
 const errors=[],rows=[],seen=new Set();
 parsed.forEach((cells,index)=>{
  const line=index+2,obj=Object.fromEntries(headers.map((h,i)=>[h,String(cells[i]??'').trim()])),issues=[];
  if(cells.length!==headers.length)issues.push('Column count mismatch');
  for(const k of REQUIRED)if(!obj[k])issues.push(k+' required');
  if(!TYPES.has(obj.Cost_Type))issues.push('Invalid Cost_Type');
  if(projectCode&&obj.Project_Code!==projectCode)issues.push('Project_Code does not match selected project');
  if(knownAgreements&&!knownAgreements.includes(obj.Agreement_Code))issues.push('Unknown Agreement_Code');
  const key=obj.Project_Code+'|'+obj.Agreement_Code+'|'+obj.Cost_Code+'|'+obj.Cost_Type;
  if(seen.has(key))issues.push('Duplicate agreement / code / cost type');seen.add(key);
  if(!/^\d+(\.\d+)?$/.test(obj.Quantity))issues.push('Quantity must be nonnegative decimal');
  let unitCents=0,budgetCents=0;try{unitCents=parseMoney(obj.Unit_Cost);budgetCents=parseMoney(obj.Budget_Amount)}catch(e){issues.push(e.message)}
  if(unitCents<0||budgetCents<0)issues.push('Negative budgets require a separate approved adjustment');
  if(!issues.length&&Math.abs(Number(obj.Quantity)*unitCents-budgetCents)>1)issues.push('Quantity × Unit_Cost does not match Budget_Amount');
  if(issues.length)errors.push({row:line,message:issues.join('; ')});
  else rows.push({...obj,unitCostCents:unitCents,budgetCents});
 });
 return {valid:errors.length===0,rows,errors,totalCents:rows.reduce((s,r)=>s+r.budgetCents,0)};
}
module.exports={parseCSV,validateBudgetCSV,parseMoney,TYPES};
