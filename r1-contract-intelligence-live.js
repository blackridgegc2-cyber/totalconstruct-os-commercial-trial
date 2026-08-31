(()=>{
 'use strict';
 const prj=()=>typeof currentProject==='function'?currentProject():null;
 const notify=(m,o={})=>window.tcNotify?window.tcNotify(m,o):console.log(m),now=()=>new Date().toISOString();
 function proposed(rec){const x=rec?.aiFields||{};return {contract:x.contractValue,client:x.client,contractType:x.contractType,retainage:x.retainage,substantialCompletion:x.substantialCompletion,paymentTerms:x.paymentTerms,liquidatedDamages:x.liquidatedDamages,noticeDays:x.noticeDays,insuranceRequirements:x.insurance,bondRequirements:x.bonds}}
 const labels={contract:'Contract Value',client:'Owner / Client',contractType:'Contract Type',retainage:'Retainage',substantialCompletion:'Substantial Completion',paymentTerms:'Payment Terms',liquidatedDamages:'Liquidated Damages',noticeDays:'Notice Requirement (Days)',insuranceRequirements:'Insurance Requirements',bondRequirements:'Bond Requirements'};
 async function apply(rec){const p=prj();if(!p)return {applied:[],skipped:[]};const gov=window.tcAiDocumentGovernance;if(!gov?.reviewAndApply)throw new Error('AI document governance is not loaded.');const values=proposed(rec),sources={};Object.keys(values).forEach(k=>sources[k]=rec?.fileName||rec?.id||'Uploaded owner contract');const result=await gov.reviewAndApply({target:p,proposed:values,labels,sources,fileName:rec?.fileName||'',onApply:({applied,skipped})=>{
   if(applied.includes('contract')){p.originalContract=p.contract;p.estValue=p.contract}
   if(applied.includes('contractType')){p.contractMethod=p.contractType;try{if(window.tcProjectLifecycle?.CONTRACT_TYPES?.includes(p.contractType))window.tcProjectLifecycle.setContractType(p.contractType)}catch(e){console.warn('Lifecycle contract type sync',e)}}
   p.contractIntakeHistory=p.contractIntakeHistory||[];p.contractIntakeHistory.push({at:now(),sourceFile:rec?.fileName||'',sourceId:rec?.id||'',applied:[...applied],skipped:[...skipped],reviewedBy:currentUser?.name||currentUser?.email||'Current User',policy:'AI proposed values; existing data requires field-level approval'});
 }});
 const saveFn=window.save||(typeof save==='function'?save:null);if(typeof saveFn==='function')saveFn('Reviewed extracted owner-contract controls',rec.fileName||rec.id);try{await window.tcCloud?.writeSnapshot?.('Owner contract uploaded; extracted terms reviewed under AI governance')}catch(e){console.warn('Contract snapshot',e)}try{window.renderAll?.()}catch(e){}return result
 }
 function wire(){const root=document.querySelector('#contracts'),b=document.querySelector('#tcImportContractBtn');if(!root||!b||b.dataset.tcContractLive)return;b.dataset.tcContractLive='1';b.textContent='Upload Contract + AI Review';b.classList.add('bronze');b.onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.pdf,.txt';i.onchange=async()=>{const file=i.files?.[0];if(!file)return;try{
   const gov=window.tcAiDocumentGovernance;let intake={read:true,purpose:'Populate / Update Project Data',overwritePolicy:'confirm'};if(gov?.askAiRead){const choice=await gov.askAiRead({fileName:file.name,purpose:'Populate / Update Project Data'});if(choice===false)return;intake=choice||intake}
   await window.tcLoadDocumentLibraries?.();const rec=await window.tcDocumentImport?.importContract?.(file,{contractKind:'Owner Contract',status:intake.read===false?'Stored Only':'Under Review',aiRead:intake.read!==false});if(!rec)throw new Error('Contract intake module is unavailable.');gov?.markIntake?.(rec,intake);
   if(intake.read===false){notify('Contract stored without AI extraction. No project fields were changed.',{type:'success',title:'Contract Stored'});return}
   const result=await apply(rec);notify(`Contract stored and reviewed. ${result.applied.length} extracted field(s) applied; ${result.skipped.length} kept unchanged.`,{type:'success',title:'Contract AI Review Complete'})
  }catch(e){notify(e.message||String(e),{type:'error',title:'Contract Upload Failed'})}};i.click()}}
 function install(){wire()}
 addEventListener('DOMContentLoaded',()=>setTimeout(install,250));addEventListener('tc:r1-ready',()=>setTimeout(install,80));document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="contracts"],[data-jump="contracts"]'))setTimeout(install,100)},true);setTimeout(install,700);
 window.tcContractIntelligenceLive={wire,apply,proposed};
})();
