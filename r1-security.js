(()=>{
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 const pagePermissions={
  home:['project'],projectboard:['project'],projectstatus:['project'],
  wip:['wip','financial_project'],financials:['financial_project'],payapps:['payapps'],contracts:['contracts'],subcontractors:['contracts'],
  preconstruction:['project'],estimating:['project'],bidders:['project'],
  drawings:['drawings'],rfis:['rfi'],submittals:['submittal'],schedule:['schedule'],meetings:['meetings'],daily:['daily'],fieldreports:['field','daily'],
  correspondence:['internal','external'],tasks:['tasks'],tm:['tm'],procurement:['procurement'],quality:['quality'],compliance:['quality','project'],safety:['safety'],
  equipment:['equipment'],warranty:['closeout','project'],closeout:['closeout'],reports:['reports','project'],timesheet:['timesheet'],
  integrations:['accounting'],settings:['project'],
  controllercpa:['accounting'],capitalplanning:['all'],workspace:['all'],storagevault:['all'],legalreview:['all'],access:['all'],audit:['all'],employees:['employees_cost'],accountinghub:['accounting']
 };
 const managementOnly=new Set(['capitalplanning','workspace','storagevault','legalreview','access','audit']);
 function perms(){return currentUser?.permissions||[]}
 function hasAny(list){const p=perms();return p.includes('all')||list.some(x=>p.includes(x))}
 function allowed(id){const need=pagePermissions[id];if(!need)return true;if(managementOnly.has(id))return perms().includes('all');return hasAny(need)}
 function restrictPage(page){
  if(page.dataset.tcRestricted==='1')return;
  page.dataset.tcRestricted='1';
  page.innerHTML='<div class="head"><div><h1>Restricted</h1><div class="sub">Your role does not have access to this function.</div></div></div><div class="card">Access is controlled by your assigned TotalConstruct role and project permissions. Contact a company Administrator if this access is required.</div>';
 }
 function guard(){
  $$('.nav[data-page], [data-jump]').forEach(n=>{
   const id=n.dataset.page||n.dataset.jump;if(!id)return;
   const ok=allowed(id);n.style.display=ok?'':'none';n.setAttribute('aria-hidden',ok?'false':'true');
  });
  $$('.page').forEach(page=>{
   if(!page.id)return;
   const ok=allowed(page.id);
   if(!ok&&page.classList.contains('active'))restrictPage(page);
  });
  $$('[data-sensitive-action]').forEach(b=>{const need=(b.dataset.sensitiveAction||'all').split(',');const ok=hasAny(need);b.disabled=!ok;b.title=ok?'':'Insufficient permission';});
  const gc=$('#globalCreate');if(gc){const p=perms();const canCreate=p.includes('all')||['rfi','submittal','meetings','daily','field','tasks','tm','quality','safety','procurement','schedule','contracts','accounting','equipment','closeout','internal','external','financial_project'].some(x=>p.includes(x));gc.style.display=canCreate?'':'none';gc.setAttribute('aria-hidden',canCreate?'false':'true')}
 }
 window.tcSecurity={allowed,guard,pagePermissions};
 new MutationObserver(()=>{try{guard()}catch(e){console.warn('R1 security guard',e)}}).observe(document.documentElement,{subtree:true,childList:true});
 addEventListener('DOMContentLoaded',()=>setTimeout(guard,600));setInterval(guard,3000);
})();