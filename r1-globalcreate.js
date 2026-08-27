(()=>{
 const $=s=>document.querySelector(s);
 const form=o=>window.tcOpenRecordForm?window.tcOpenRecordForm(o):alert('Form engine unavailable.');
 const perms=()=>currentUser?.permissions||[];
 const can=need=>perms().includes('all')||(need||[]).some(x=>perms().includes(x));
 function open(id){if(typeof openPage==='function')openPage(id)}
 function clickAfter(id,selector,text){open(id);setTimeout(()=>{const root=$('#'+id);if(!root)return;const b=selector?root.querySelector(selector):[...root.querySelectorAll('button')].find(x=>(x.textContent||'').includes(text));b?.click()},80)}
 const records=[
  ['RFI',['rfi']],['Submittal',['submittal']],['Meeting',['meetings']],['Daily Report',['daily']],['Field Report',['field','daily']],['A/E Observation',['quality']],['Task / Action Item',['tasks']],['T&M Ticket',['tm']],['Quality / Inspection',['quality']],['Safety Incident / Near Miss',['safety']],['Compliance Requirement',['quality','project']],['Procurement Item',['procurement']],['Schedule Activity',['schedule']],['Subcontractor',['contracts']],['Contract / Commitment',['contracts']],['Purchase / Receipt',['accounting','financial_project']],['Company Asset / Equipment',['equipment']],['Warranty / Project Asset',['closeout']],['Warranty Request',['closeout']],['Closeout Requirement',['closeout']],['Internal Correspondence',['internal']],['External Correspondence',['external']],['Cost Line',['financial_project','accounting']],['Project / Opportunity',['all']]
 ];
 const actions={
  'RFI':()=>clickAfter('rfis','#addRfi'),'Submittal':()=>clickAfter('submittals','#addSub'),'Meeting':()=>{open('meetings');setTimeout(()=>window.tcAddMeeting?.(),80)},'Daily Report':()=>{open('daily');setTimeout(()=>window.tcAddDaily?.(),80)},'Field Report':()=>clickAfter('daily',null,'Field Report'),'A/E Observation':()=>clickAfter('quality',null,'Observation'),'Task / Action Item':()=>{open('tasks');setTimeout(()=>window.tcAddTask?.(),80)},'T&M Ticket':()=>clickAfter('tm',null,'T&M Ticket'),'Quality / Inspection':()=>clickAfter('quality',null,'Action Plan'),'Safety Incident / Near Miss':()=>clickAfter('safety',null,'Incident / Near Miss'),'Compliance Requirement':()=>clickAfter('compliance',null,'Compliance Requirement'),'Procurement Item':()=>clickAfter('procurement',null,'Procurement'),'Schedule Activity':()=>clickAfter('schedule',null,'Activity'),'Subcontractor':()=>clickAfter('subcontractors','#addSubcontractor'),'Contract / Commitment':()=>clickAfter('contracts',null,'Contract'),'Purchase / Receipt':()=>clickAfter('accountinghub',null,'Purchase'),'Company Asset / Equipment':()=>clickAfter('equipment',null,'Equipment'),'Warranty / Project Asset':()=>clickAfter('warranty',null,'Warranty / Asset'),'Warranty Request':()=>clickAfter('warranty',null,'Warranty Request'),'Closeout Requirement':()=>clickAfter('closeout',null,'Closeout Requirement'),'Internal Correspondence':()=>clickAfter('correspondence','#newInternal'),'External Correspondence':()=>clickAfter('correspondence','#newExternal'),'Cost Line':()=>clickAfter('financials','#addCostLine'),'Project / Opportunity':()=>{open('projectboard');setTimeout(()=>window.addProject?.(),80)}
 };
 function allowedRecords(){return records.filter(([,need])=>can(need))}
 function chooser(){
  const allowed=allowedRecords();
  if(!allowed.length){alert('Your role does not have permission to create project records.');return}
  form({title:'Create New Record',subtitle:'Only record types permitted for your current role are shown. Known project information will be prepopulated.',fields:[{name:'type',label:'Record Type',type:'select',options:allowed.map(x=>x[0])}],onSave:async d=>{
   const rule=records.find(x=>x[0]===d.type);if(!rule||!can(rule[1]))throw new Error('Your role does not have permission to create this record type.');(actions[d.type]||(()=>{}))();
  }})
 }
 function costLine(){if(!can(['financial_project','accounting'])){alert('Your role does not have permission to modify project cost lines.');return}const p=typeof currentProject==='function'?currentProject():null;if(!p)return;form({title:'Add Budget / Cost Line',subtitle:p.name,fields:[{name:'code',label:'CSI / Cost Code',required:true},{name:'item',label:'Work Item',required:true},{name:'cls',label:'Classification',type:'select',options:['SUB','GR','OHP','MAT','LAB','EQUIP']},{name:'budget',label:'Original / Current Budget',type:'number'},{name:'forecast',label:'Forecast at Completion',type:'number'}],onSave:async d=>{if(!can(['financial_project','accounting']))throw new Error('Permission denied.');state.costLines=state.costLines||[];state.costLines.push({project:p.name,code:d.code,item:d.item,cls:d.cls,budget:+d.budget||0,committed:0,actual:0,forecast:+d.forecast||+d.budget||0});save('Added cost line',d.item)}})}
 function wire(){
  let gc=$('#globalCreate');if(gc&&!gc.dataset.tcHandled){const clean=gc.cloneNode(true);gc.replaceWith(clean);gc=clean;gc.onclick=chooser;gc.dataset.tcHandled='1'}
  if(gc){const allowed=allowedRecords();gc.disabled=!allowed.length;gc.title=allowed.length?'Create a permitted project record':'No record-creation permissions for this role'}
  const ac=$('#addCostLine');if(ac){ac.onclick=costLine;ac.dataset.tcHandled='1';ac.disabled=!can(['financial_project','accounting']);if(ac.disabled)ac.title='Insufficient permission'}
 }
 new MutationObserver(wire).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',wire);setTimeout(wire,500);
})();
