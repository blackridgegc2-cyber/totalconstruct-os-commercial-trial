(()=>{
 const permsByRole={
  Executive:['all'],Admin:['all'],Accounting:['project','financial_project','wip','payapps','contracts','employees_cost','timesheet','accounting','reports'],
  'Project Manager':['project','financial_project','contracts','rfi','submittal','schedule','payapps','internal','external','quality','tasks','meetings','daily','tm','procurement','closeout','timesheet','safety','equipment','drawings'],
  'APM / Project Engineer':['project','rfi','submittal','schedule','contracts','internal','external','tasks','meetings','daily','quality','procurement','closeout','drawings'],
  Superintendent:['project','field','rfi','submittal','schedule','safety','timesheet','internal','quality','daily','tasks','tm','equipment','drawings'],
  Safety:['project','safety','daily','tasks','reports'],
  'QA / QC':['project','quality','daily','tasks','closeout','drawings'],
  Employee:['project','timesheet','daily','tasks','drawings'],
  Subcontractor:['project','rfi','submittal','schedule','daily','external'],
  Architect:['project','rfi','submittal','schedule','drawings','meetings','tasks','external'],
  Engineer:['project','rfi','submittal','schedule','drawings','meetings','tasks','external'],
  Owner:['project','schedule','payapps','drawings','meetings','external'],
  Lender:['project','payapps','schedule','drawings','reports']
 };
 let original=null,active=false,activeLabel='Actual Login';
 function actualManager(){return !!original?original.permissions.includes('all'):(currentUser?.permissions||[]).includes('all')}
 function rerender(){window.tcSecurity?.guard?.();if(typeof renderNav==='function')renderNav();if(typeof renderAll==='function')renderAll();setTimeout(()=>window.tcSecurity?.guard?.(),80)}
 function restore(){if(!original)return;currentUser.role=original.role;currentUser.permissions=[...original.permissions];active=false;activeLabel='Actual Login';renderBadge();const sel=document.getElementById('tcViewAsSelect');if(sel)sel.value='Actual Login';rerender()}
 function apply(role){if(!currentUser||!actualManager())return;if(!original)original={role:currentUser.role,permissions:[...(currentUser.permissions||[])]};if(role==='Actual Login'){restore();return}if(!permsByRole[role])return;currentUser.role='test_'+role.toLowerCase().replace(/[^a-z0-9]+/g,'_');currentUser.permissions=[...permsByRole[role]];active=true;activeLabel=role;renderBadge();rerender()}
 function renderBadge(){let b=document.getElementById('tcViewAsBadge');if(!active){b?.remove();return}if(!b){b=document.createElement('div');b.id='tcViewAsBadge';b.style.cssText='position:fixed;right:14px;bottom:14px;z-index:90;background:#fff3cd;border:1px solid #d39e00;padding:9px 12px;border-radius:8px;box-shadow:0 5px 18px #0002;font:600 12px/1.2 sans-serif';document.body.appendChild(b)}b.innerHTML=`TEST VIEW — ${activeLabel} <button type="button" id="tcExitViewAs" style="margin-left:8px">Return to Actual Login</button>`;b.querySelector('#tcExitViewAs').onclick=restore}
 function install(){if(!currentUser||!actualManager())return;let host=document.querySelector('header .actions')||document.querySelector('header');if(!host||document.getElementById('tcViewAs'))return;const wrap=document.createElement('label');wrap.id='tcViewAs';wrap.style.cssText='display:inline-flex;align-items:center;gap:6px;font-size:12px';wrap.innerHTML='<span>View As</span><select id="tcViewAsSelect" aria-label="View application as another role"><option>Actual Login</option>'+Object.keys(permsByRole).map(r=>`<option>${r}</option>`).join('')+'</select>';host.appendChild(wrap);wrap.querySelector('select').onchange=e=>apply(e.target.value)}
 new MutationObserver(()=>{try{install()}catch(e){console.warn('View As install',e)}}).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',()=>setTimeout(install,700));setTimeout(install,1200);window.tcRoleTest={apply,restore,permsByRole,isActive:()=>active};
})();