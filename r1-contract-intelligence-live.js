(()=>{
 'use strict';
 const prj=()=>typeof currentProject==='function'?currentProject():null;
 const notify=(m,o={})=>window.tcNotify?window.tcNotify(m,o):console.log(m);
 function apply(rec){const p=prj(),x=rec?.aiFields||{};if(!p)return;
  if(x.contractValue){p.contract=x.contractValue;p.originalContract=x.contractValue;p.estValue=x.contractValue}
  if(x.client)p.client=x.client;
  if(x.contractType){p.contractType=x.contractType;p.contractMethod=x.contractType}
  if(x.retainage!=null)p.retainage=x.retainage;
  if(x.substantialCompletion)p.substantialCompletion=x.substantialCompletion;
  if(x.paymentTerms)p.paymentTerms=x.paymentTerms;
  if(x.liquidatedDamages)p.liquidatedDamages=x.liquidatedDamages;
  if(x.noticeDays)p.noticeDays=x.noticeDays;
  if(x.insurance)p.insuranceRequirements=x.insurance;
  if(x.bonds)p.bondRequirements=x.bonds;
  const saveFn=window.save||(typeof save==='function'?save:null);if(typeof saveFn==='function')saveFn('Applied extracted owner-contract controls',rec.fileName||rec.id);
  window.tcCloud?.writeSnapshot?.('Owner contract uploaded and extracted terms applied');
  try{window.renderAll?.()}catch(e){}
 }
 function wire(){const root=document.querySelector('#contracts'),b=document.querySelector('#tcImportContractBtn');if(!root||!b||b.dataset.tcContractLive)return;b.dataset.tcContractLive='1';b.textContent='Upload Contract + Auto-Read';b.classList.add('bronze');b.onclick=()=>{const i=document.createElement('input');i.type='file';i.accept='.pdf,.txt';i.onchange=async()=>{const file=i.files?.[0];if(!file)return;try{await window.tcLoadDocumentLibraries?.();const rec=await window.tcDocumentImport?.importContract?.(file,{contractKind:'Owner Contract',status:'Under Review'});if(!rec)throw new Error('Contract intake module is unavailable.');apply(rec);notify('Contract stored in project cloud. Extracted terms were applied to the project record and are ready for review.',{type:'success',title:'Contract Auto-Read Complete'})}catch(e){notify(e.message||String(e),{type:'error',title:'Contract Upload Failed'})}};i.click()}}
 new MutationObserver(wire).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',wire);addEventListener('tc:r1-ready',wire);setTimeout(wire,500);window.tcContractIntelligenceLive={wire,apply};
})();
