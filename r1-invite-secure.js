(()=>{
 const $=s=>document.querySelector(s);
 function form(o){if(!window.tcOpenRecordForm)throw new Error('Form engine unavailable.');window.tcOpenRecordForm(o)}
 function wire(){
  const b=$('#tcInviteEmployee');if(!b||b.dataset.secureInvite==='1')return;
  b.dataset.secureInvite='1';
  b.onclick=()=>form({
   title:'Invite Employee',
   subtitle:'Creates the secured TotalConstruct account invitation. Legal/audit reviewers are granted separately from Legal / Audit Review.',
   fields:[
    {name:'name',label:'Name',required:true},
    {name:'email',label:'Email / Username',type:'email',required:true},
    {name:'role',label:'Role',type:'select',options:['Project Manager','APM / Project Engineer','Superintendent','Accounting / Controller','Estimator / Preconstruction','Safety','Field Employee','Executive / Operations']}
   ],
   onSave:async d=>{
    const token=window.tcAuth?.getAccessToken?.()||'';
    if(!token)throw new Error('Your session is not authenticated. Sign in again before sending an invitation.');
    const prj=typeof currentProject==='function'?currentProject():null;
    const r=await fetch('/api/invite-user',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({name:d.name,email:d.email,role:d.role,project_id:prj?.id||null})});
    const result=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(result.error||result.message||'Invitation failed.');
    state.invites=state.invites||[];
    state.invites.push({name:d.name,email:d.email,role:d.role,sent:new Date().toLocaleString(),status:'Invite Pending',serverConfirmed:true});
    if(typeof save==='function')save('Sent secured employee invitation',d.email);
    if(typeof renderAll==='function')renderAll();
   }
  });
 }
 const mo=new MutationObserver(()=>{try{wire()}catch(e){console.warn('Secure invite wiring',e)}});
 mo.observe(document.documentElement,{childList:true,subtree:true});
 addEventListener('DOMContentLoaded',wire);setTimeout(wire,700);
})();