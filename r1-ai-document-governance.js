(()=>{
 'use strict';
 const notify=(m,o={})=>window.tcNotify?window.tcNotify(m,o):console.log(m);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function meaningful(v){return !(v===undefined||v===null||String(v).trim()==='')}
 function same(a,b){return String(a??'').trim()===String(b??'').trim()}
 function askAiRead(meta={}){
  return new Promise(resolve=>{
   if(!window.tcOpenRecordForm){resolve(true);return}
   window.tcOpenRecordForm({recordType:'AI Document Intake',title:'AI Read This Document?',subtitle:`${meta.fileName||'Uploaded document'} · TotalConstruct can read this document, classify it, extract usable project data and route proposed values to the appropriate records.`,submitLabel:'Continue',fields:[{section:'Document Processing',name:'aiRead',label:'AI Processing',type:'select',value:'Read + Extract',options:['Read + Extract','Store Only'],required:true},{section:'Document Processing',name:'purpose',label:'Purpose',type:'select',value:meta.purpose||'Populate / Update Project Data',options:['Populate / Update Project Data','Create New Record','Reference / File Only']},{section:'Safeguards',name:'overwritePolicy',label:'Existing Data',value:'Require confirmation before replacement',readonly:true},{section:'Safeguards',name:'sourcePolicy',label:'Source Traceability',value:'Retain original document + source reference',readonly:true}],onSave:d=>{resolve({read:d.aiRead!=='Store Only',purpose:d.purpose,overwritePolicy:'confirm'})}})
  })
 }
 function confirmOverwrite(changes=[],meta={}){
  const conflicts=(changes||[]).filter(x=>meaningful(x.current)&&meaningful(x.proposed)&&!same(x.current,x.proposed));
  if(!conflicts.length)return Promise.resolve({approved:true,approvedFields:new Set((changes||[]).map(x=>x.field))});
  return new Promise(resolve=>{
   if(!window.tcOpenRecordForm){resolve({approved:false,approvedFields:new Set()});return}
   const fields=[];
   conflicts.forEach((x,i)=>{fields.push({section:`${x.label||x.field}`,name:`current_${i}`,label:'Current Value',value:String(x.current??''),readonly:true},{section:`${x.label||x.field}`,name:`proposed_${i}`,label:'AI Proposed Value',value:String(x.proposed??''),readonly:true},{section:`${x.label||x.field}`,name:`decision_${i}`,label:'Decision',type:'select',value:'Keep Current',options:['Keep Current','Replace with AI Value'],required:true},{section:`${x.label||x.field}`,name:`source_${i}`,label:'Source',value:x.source||meta.fileName||'Uploaded document',readonly:true})});
   window.tcOpenRecordForm({recordType:'AI Data Change Review',title:'Confirm Existing Data Changes',subtitle:'AI found values that differ from data already stored in TotalConstruct. Nothing below will be replaced unless you explicitly approve that field.',submitLabel:'Apply Approved Changes',fields,onSave:d=>{const approved=new Set((changes||[]).filter(x=>!meaningful(x.current)||same(x.current,x.proposed)).map(x=>x.field));conflicts.forEach((x,i)=>{if(d[`decision_${i}`]==='Replace with AI Value')approved.add(x.field)});resolve({approved:true,approvedFields:approved})}})
  })
 }
 async function reviewAndApply({target,proposed={},labels={},sources={},fileName='',onApply}={}){
  if(!target||!proposed)return {applied:[],skipped:[]};
  const changes=Object.keys(proposed).filter(k=>meaningful(proposed[k])).map(field=>({field,label:labels[field]||field,current:target[field],proposed:proposed[field],source:sources[field]||fileName}));
  const decision=await confirmOverwrite(changes,{fileName});if(!decision.approved)return {applied:[],skipped:changes.map(x=>x.field)};
  const applied=[],skipped=[];for(const c of changes){if(decision.approvedFields.has(c.field)){target[c.field]=c.proposed;applied.push(c.field)}else skipped.push(c.field)}
  if(typeof onApply==='function')await onApply({applied,skipped,changes});
  return {applied,skipped};
 }
 function markIntake(rec={},opts={}){rec.aiReadRequested=opts.read!==false;rec.aiReadStatus=opts.read===false?'Stored Only':'AI Review Requested';rec.overwritePolicy='Confirm before replacing existing values';rec.sourceTraceability=true;return rec}
 window.tcAiDocumentGovernance={askAiRead,confirmOverwrite,reviewAndApply,markIntake,meaningful,same};
 addEventListener('tc:r1-ready',()=>notify('AI document safeguards active: uploads should be read/extracted by default and existing values require confirmation before replacement.',{type:'info',title:'Document Intake Safeguard'}),{once:true});
})();
