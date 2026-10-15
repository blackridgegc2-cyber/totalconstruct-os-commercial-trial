/* Canonical import persistence. Server checks roles, revisions and atomic approval. */
(()=>{
'use strict';
const cfg=()=>window.__TC_SUPABASE__||{},project=()=>typeof currentProject==='function'?currentProject():null,token=()=>window.tcAuth?.getAccessToken?.()||'';
const scope=()=>({id:project()?.id||'',token:token()}),same=(a,b)=>a?.id===b?.id&&a?.token===b?.token;
let loaded=null,pending=null,sequence=0,lastSession='',failed=null,failedAt=0;
async function request(path,method='GET',body){
 const boundary=scope();if(!boundary.id||!boundary.token)throw Error('Sign in and select a project.');
 const root=String(cfg().url||'').replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
 const r=await fetch(root+'/rest/v1/'+path,{method,headers:{apikey:cfg().key||'',Authorization:'Bearer '+boundary.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.message||'Cloud import request failed ('+r.status+').');
 if(!same(boundary,scope()))throw Error('Project or login changed during the cloud request. Reopen the intended project.');
 return data;
}
function annotate(record,row){Object.assign(record,{cloudImportId:row.id,cloudRevision:row.revision,cloudStatus:row.status,cloudManaged:true});return record}
async function save(kind,record){
 if(record.projectId!==project()?.id)throw Error('Import project mismatch.');
 const payload=structuredClone(record);for(const key of ['cloudImportId','cloudRevision','cloudStatus','cloudManaged','applying'])delete payload[key];
 const row=await request('rpc/tc_save_project_import','POST',{p_project_id:record.projectId,p_kind:kind,p_import_id:record.cloudImportId||null,p_expected_revision:record.cloudRevision||0,p_file_name:record.fileName,p_source_path:record.storagePath,p_payload:payload});
 return annotate(record,row);
}
async function approve(kind,record,values={}){
 if(record.projectId!==project()?.id)throw Error('Import project mismatch.');
 if(!record.cloudImportId)await save(kind,record);
 const row=await request('rpc/tc_apply_project_import','POST',{p_import_id:record.cloudImportId,p_expected_revision:record.cloudRevision,p_values:values});
 if(row.project_id!==record.projectId||row.kind!==kind||row.status!=='approved')throw Error('Cloud did not confirm import approval.');
 annotate(record,row);return row;
}
function matches(record,p){return record.projectId?record.projectId===p.id:record.project===p.name}
function merge(p,rows){
 const canonical=rows.find(r=>r.project?.id===p.id)?.project;if(canonical){Object.assign(p,{company_id:canonical.company_id,companyId:canonical.company_id,contract:Number(canonical.contract_value||0),originalContract:Number(canonical.original_contract_value||0),client:canonical.client_name||'',contractType:canonical.contract_method||'',end:canonical.substantial_completion_date||''});}
 state.budgetImports=state.budgetImports||[];state.contracts=state.contracts||[];state.costLines=state.costLines||[];
 for(const [kind,key]of [['budget','budgetImports'],['contract','contracts']]){
  const relevant=rows.filter(r=>r.kind===kind),paths=new Set(relevant.map(r=>r.source_path));
  state[key]=state[key].filter(r=>!matches(r,p)||!r.cloudManaged&&!paths.has(r.storagePath));
  for(const row of relevant){const record=annotate({...row.payload,project:p.name,projectId:p.id,fileName:row.file_name,storagePath:row.source_path},row);
   if(row.status==='approved'){record.reviewStatus='Approved and applied';record.approvedAt=row.approved_at;if(kind==='contract'){record.aiReviewRequired=false;if(row.approved_values?.contract!==undefined)record.value=row.approved_values.contract;if(row.approved_values?.client!==undefined)record.counterparty=row.approved_values.client}}
   else if(row.status==='superseded')record.reviewStatus='Superseded';
   state[key].push(record);
  }
 }
 const budget=rows.find(r=>r.kind==='budget'&&r.status==='approved');
 state.costLines=state.costLines.filter(r=>!matches(r,p)||!r.cloudManaged);
 if(budget){
  const lines=budget.payload.proposedLines||[];
  state.costLines=state.costLines.filter(r=>!matches(r,p)||r.budgetLineId).concat(lines.map((r,i)=>({...r,code:r.costCode,item:r.description,cls:r.costType||r.cost_type||'Imported',budget:r.originalBudget,forecast:r.forecastCost,project:p.name,projectId:p.id,id:'BUD-'+String(i+1).padStart(4,'0'),sourceFile:budget.file_name,sourcePath:budget.source_path,cloudManaged:true,cloudImportId:budget.id,cloudRevision:budget.revision,cloudLineIndex:i})));
  p.estimatedCost=budget.payload.totalOriginal;p.forecastCost=budget.payload.totalForecast;
 }
 // Canonical project columns are loaded from projects; only additional reviewed
 // terms are restored from the immutable import approval history.
 for(const row of rows.filter(r=>r.kind==='contract'&&r.status==='approved').sort((a,b)=>String(a.approved_at).localeCompare(String(b.approved_at)))){
  for(const [key,value]of Object.entries(row.approved_values||{}))if(!['contract','client','contractType','substantialCompletion'].includes(key))p[key]=value;
 }
}
function status(message){for(const node of document.querySelectorAll('.tcImportCloudStatus'))node.textContent=message}
async function refresh(force=false){
 const boundary=scope();
 if(lastSession&&lastSession!==boundary.token){for(const key of ['budgetImports','contracts','costLines'])state[key]=(state[key]||[]).filter(r=>!r.cloudManaged);loaded=null;}
 lastSession=boundary.token;if(!boundary.id||!boundary.token)return;
 if(!force&&same(failed,boundary)&&Date.now()-failedAt<30000)return;
 if(!force&&same(loaded,boundary)||same(pending,boundary))return;
 const n=++sequence;pending=boundary;status('Loading saved budget and contract imports…');
 try{
  const rows=await request('tc_project_imports?project_id=eq.'+encodeURIComponent(boundary.id)+'&select=*,project:projects(id,company_id,contract_value,original_contract_value,client_name,contract_method,substantial_completion_date)&order=updated_at.asc&limit=1000');
  if(n!==sequence||!same(boundary,scope()))return;
  if(!Array.isArray(rows))throw Error('Cloud returned invalid import records.');
  merge(project(),rows);loaded=boundary;failed=null;status('Saved import records reopened from cloud.');
  if(typeof renderPage==='function'&&['financials','contracts','estimating'].includes(typeof currentPage==='undefined'?'':currentPage))renderPage(currentPage);install();
 }catch(e){if(n===sequence){loaded=null;failed=boundary;failedAt=Date.now();status('Imports not reopened: '+e.message)}}finally{if(n===sequence)pending=null}
}
function install(){for(const id of ['financials','contracts','estimating']){const host=document.getElementById(id);if(!host||host.querySelector('.tcImportCloudRefresh'))continue;const box=document.createElement('div');box.className='card section';const btn=document.createElement('button');btn.className='btn tcImportCloudRefresh';btn.textContent='Refresh saved imports';btn.onclick=()=>refresh(true);const info=document.createElement('p');info.className='tcImportCloudStatus';info.setAttribute('role','status');info.textContent=loaded?'Cloud imports loaded.':'Select this project to reopen saved imports.';box.append(btn,info);host.prepend(box)}}
async function updateForecast(line,value){const row=await request('rpc/tc_update_import_forecast','POST',{p_import_id:line.cloudImportId,p_expected_revision:line.cloudRevision,p_line_index:line.cloudLineIndex,p_forecast:value});if(row.status!=='approved')throw Error('Cloud did not confirm the forecast.');await refresh(true);return row}
window.tcImportCloud={save,approve,updateForecast,refresh:()=>refresh(true),merge};
addEventListener('tc:r1-ready',()=>{install();refresh()});addEventListener('DOMContentLoaded',()=>{install();refresh()});
document.addEventListener('click',e=>{if(e.target.closest?.('[data-page],[data-jump]'))setTimeout(()=>{install();refresh()},150)},true);
setInterval(()=>{if(!same(loaded,scope()))refresh()},1500);
install();refresh();
})();
