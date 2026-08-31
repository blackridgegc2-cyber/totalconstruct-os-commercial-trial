(()=>{
 'use strict';
 const form=o=>window.tcOpenRecordForm?.(o);
 const prj=()=>{try{return window.currentProject?.()}catch(e){return null}};
 const isLegacy=fn=>typeof fn==='function'&&/\bprompt\s*\(/.test(Function.prototype.toString.call(fn));
 function task(){const p=prj();if(!p||!form)return;form({recordType:'Project Task / Action Item',title:'Create Task / Action Item',subtitle:p.name,submitLabel:'Create Task',fields:[{section:'Task',name:'task',label:'Task / Action Item',required:true},{section:'Assignment',name:'owner',label:'Owner',value:window.currentUser?.name||''},{section:'Assignment',name:'due',label:'Due Date',type:'date'},{section:'Status',name:'status',label:'Status',type:'select',value:'Open',options:['Open','In Progress','Blocked','Complete']},{section:'Details',name:'notes',label:'Notes',type:'textarea',full:true}],onSave:async d=>{state.tasks=state.tasks||[];state.tasks.push({project:p.name,projectId:p.id,id:'T-'+String(state.tasks.length+1).padStart(3,'0'),source:'Manual',task:d.task,owner:d.owner||window.currentUser?.name||'User',due:d.due||'',status:d.status||'Open',notes:d.notes||'',createdAt:new Date().toISOString()});window.save?.('Created task',d.task);window.renderPage?.('tasks')}})}
 function time(){const p=prj();if(!form)return;form({recordType:'Time / Labor Allocation',title:'Add Time Entry',subtitle:p?.name||'Company Time',submitLabel:'Save Time Entry',fields:[{section:'Time',name:'date',label:'Date',type:'date',value:new Date().toISOString().slice(0,10),required:true},{section:'Time',name:'hours',label:'Hours',type:'number',required:true},{section:'Allocation',name:'category',label:'Category',type:'select',value:p?'Project':'Overhead',options:['Project','Overhead','Estimating','Business Development','Marketing','Training','PTO']},{section:'Allocation',name:'project',label:'Project / Corporate',value:p?.name||'Corporate'},{section:'Allocation',name:'costCode',label:'Cost Code / Activity'},{section:'Expense',name:'miles',label:'Mileage',type:'number'},{section:'Expense',name:'fuel',label:'Fuel $',type:'number'},{section:'Notes',name:'notes',label:'Notes',type:'textarea',full:true}],onSave:async d=>{state.time=state.time||[];state.time.push({employee:window.currentUser?.name||'User',date:d.date,hours:+d.hours||0,category:d.category,project:d.project||'Corporate',costCode:d.costCode||'',miles:+d.miles||0,fuel:+d.fuel||0,notes:d.notes||'',projectId:p?.id||null});window.save?.('Added time entry',window.currentUser?.name||'User')}})}
 function employee(){const b=document.getElementById('tcInviteEmployee');if(b)return b.click();window.tcNotify?.('Use Admin → Users & Access to invite employees securely by email.',{type:'info',title:'Secure Employee Invitation'})}
 function user(){employee()}
 function message(type='internal'){const id=type==='external'?'newExternal':'newInternal',b=document.getElementById(id);if(b)return b.click();window.tcNotify?.('Open Correspondence to create this message using the current controlled form.',{type:'info',title:'Correspondence'})}
 function globalCreate(){const b=document.getElementById('globalCreate');if(b&&b.onclick)return b.onclick(new Event('click'));window.tcNotify?.('The controlled Create New Record menu is loading. Please retry.',{type:'info',title:'Create Record'})}
 function install(){
  if(isLegacy(window.addTask))window.addTask=task;
  if(isLegacy(window.addTime))window.addTime=time;
  if(isLegacy(window.addEmployee))window.addEmployee=employee;
  if(isLegacy(window.addUser))window.addUser=user;
  if(isLegacy(window.addMessage))window.addMessage=message;
  if(isLegacy(window.globalCreate))window.globalCreate=globalCreate;
 }
 addEventListener('DOMContentLoaded',install);setTimeout(install,1000);setInterval(install,4000);
 window.tcLegacyActionGuard={install,task,time,employee,message};
})();