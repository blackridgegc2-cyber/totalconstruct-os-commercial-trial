(()=>{
'use strict';
function install(){
  if(typeof window.tcCreateProfessionalDocument!=='function')return false;
  const existing=window.tcProfessionalDocuments||{};
  const create=type=>window.tcCreateProfessionalDocument(type);
  window.tcProfessionalDocuments={
    ...existing,
    open:create,
    createTransmittal:()=>create('Transmittal'),
    createChangeOrder:()=>create('Change Order'),
    createRFI:()=>create('RFI'),
    createSubmittal:()=>create('Submittal'),
    createDailyReport:()=>create('Daily Report'),
    createMeetingMinutes:()=>create('Meeting Minutes'),
    createFormalNotice:()=>create('Formal Notice'),
    createCloseoutTransmittal:()=>create('Closeout Transmittal'),
    createSubcontract:()=>create('Subcontract / Work Order'),
    createPurchaseOrder:()=>create('Purchase Order'),
    createInspectionReport:()=>create('Inspection Report'),
    createPunchList:()=>create('Punch List'),
    createSafetyIncidentReport:()=>create('Safety Incident Report'),
    createToolboxTalk:()=>create('Toolbox Talk'),
    list:()=>Array.isArray(window.state?.professionalDocuments)?window.state.professionalDocuments:[],
    getById:id=>(Array.isArray(window.state?.professionalDocuments)?window.state.professionalDocuments:[]).find(x=>x.id===id)||null
  };
  window.dispatchEvent(new CustomEvent('tc:professional-documents-ready',{detail:{types:['Transmittal','Change Order','RFI','Submittal','Daily Report','Meeting Minutes','Formal Notice','Closeout Transmittal','Subcontract / Work Order','Purchase Order','Inspection Report','Punch List','Safety Incident Report','Toolbox Talk']}}));
  return true;
}
function boot(){if(install())return;let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>=20)clearInterval(t)},150)}
addEventListener('DOMContentLoaded',boot,{once:true});addEventListener('tc:r1-ready',boot);setTimeout(boot,1200);
window.tcInstallProfessionalDocumentCompatibility=install;
})();