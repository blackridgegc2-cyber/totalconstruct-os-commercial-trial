(()=>{
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const form=o=>window.tcOpenRecordForm?window.tcOpenRecordForm(o):alert('Form engine unavailable.');
 function open(id){if(typeof openPage==='function')openPage(id)}
 function clickAfter(id,selector,text){open(id);setTimeout(()=>{const root=$('#'+id);if(!root)return;let b=selector?root.querySelector(selector):[...root.querySelectorAll('button')].find(x=>(x.textContent||'').includes(text));b?.click()},80)}
 function chooser(){
  form({title:'Create New Record',subtitle:'Select the record type. TotalConstruct will open the correct project form and prepopulate known information.',fields:[{name:'type',label:'Record Type',type:'select',options:['RFI','Submittal','Meeting','Daily Report','Field Report','A/E Observation','Task / Action Item','T&M Ticket','Quality / Inspection','Safety Incident / Near Miss','Compliance Requirement','Procurement Item','Schedule Activity','Subcontractor','Contract / Commitment','Purchase / Receipt','Company Asset / Equipment','Warranty / Project Asset','Warranty Request','Closeout Requirement','Internal Correspondence','External Correspondence','Cost Line','Project / Opportunity']}],onSave:async d=>{
   const map={
    'RFI':()=>clickAfter('rfis','#addRfi'),
    'Submittal':()=>clickAfter('submittals','#addSub'),
    'Meeting':()=>{open('meetings');setTimeout(()=>window.tcAddMeeting?.(),80)},
    'Daily Report':()=>{open('daily');setTimeout(()=>window.tcAddDaily?.(),80)},
    'Field Report':()=>clickAfter('daily',null,'Field Report'),
    'A/E Observation':()=>clickAfter('quality',null,'Observation'),
    'Task / Action Item':()=>{open('tasks');setTimeout(()=>window.tcAddTask?.(),80)},
    'T&M Ticket':()=>clickAfter('tm',null,'T&M Ticket'),
    'Quality / Inspection':()=>clickAfter('quality',null,'Action Plan'),
    'Safety Incident / Near Miss':()=>clickAfter('safety',null,'Incident / Near Miss'),
    'Compliance Requirement':()=>clickAfter('compliance',null,'Compliance Requirement'),
    'Procurement Item':()=>clickAfter('procurement',null,'Procurement'),
    'Schedule Activity':()=>clickAfter('schedule',null,'Activity'),
    'Subcontractor':()=>clickAfter('subcontractors','#addSubcontractor'),
    'Contract / Commitment':()=>clickAfter('contracts',null,'Contract'),
    'Purchase / Receipt':()=>clickAfter('accountinghub',null,'Purchase'),
    'Company Asset / Equipment':()=>clickAfter('equipment',null,'Equipment'),
    'Warranty / Project Asset':()=>clickAfter('warranty',null,'Warranty / Asset'),
    'Warranty Request':()=>clickAfter('warranty',null,'Warranty Request'),
    'Closeout Requirement':()=>clickAfter('closeout',null,'Closeout Requirement'),
    'Internal Correspondence':()=>clickAfter('correspondence','#newInternal'),
    'External Correspondence':()=>clickAfter('correspondence','#newExternal'),
    'Cost Line':()=>clickAfter('financials','#addCostLine'),
    'Project / Opportunity':()=>{open('projectboard');setTimeout(()=>window.addProject?.(),80)}
   };(map[d.type]||(()=>{}))();
  }})
 }
 function costLine(){const p=typeof currentProject==='function'?currentProject():null;if(!p)return;form({title:'Add Budget / Cost Line',subtitle:p.name,fields:[{name:'code',label:'CSI / Cost Code',required:true},{name:'item',label:'Work Item',required:true},{name:'cls',label:'Classification',type:'select',options:['SUB','GR','OHP','MAT','LAB','EQUIP']},{name:'budget',label:'Original / Current Budget',type:'number'},{name:'forecast',label:'Forecast at Completion',type:'number'}],onSave:async d=>{state.costLines=state.costLines||[];state.costLines.push({project:p.name,code:d.code,item:d.item,cls:d.cls,budget:+d.budget||0,committed:0,actual:0,forecast:+d.forecast||+d.budget||0});save('Added cost line',d.item)}})}
 function wire(){
  let gc=$('#globalCreate');
  if(gc&&!gc.dataset.tcHandled){
   const clean=gc.cloneNode(true);gc.replaceWith(clean);gc=clean;
   gc.onclick=chooser;gc.dataset.tcHandled='1';
  }
  const ac=$('#addCostLine');if(ac){ac.onclick=costLine;ac.dataset.tcHandled='1'}
 }
 new MutationObserver(wire).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',wire);setTimeout(wire,500);
})();
