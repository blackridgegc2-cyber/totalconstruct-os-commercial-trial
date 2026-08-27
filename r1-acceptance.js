(()=>{
 const $=s=>document.querySelector(s);
 function manager(){return !!currentUser&&(currentUser.permissions||[]).includes('all')}
 function current(){try{return currentProject()}catch(e){return null}}
 function isSample(p){return !!p&&/(training|sample)/i.test(`${p.name||''} ${p.job||''}`)}
 function line(name,ok,detail=''){return `<div class="statline"><span>${name}</span><b><span class="status ${ok?'green':'red'}">${ok?'PASS':'FAIL'}</span>${detail?` · ${detail}`:''}</b></div>`}
 async function run(){
  const btn=$('#tcAcceptanceRun'),out=$('#tcAcceptanceResults');if(!btn||!out)return;
  const p=current(),results=[];btn.disabled=true;out.innerHTML='<div class="muted">Running acceptance checks…</div>';
  const add=(name,ok,detail='')=>results.push({name,ok,detail});
  try{
   add('Management test context',manager(),currentUser?.role||'Unknown role');
   add('Training / Sample project selected',isSample(p),p?.name||'No project selected');
   add('Authenticated cloud session',!!window.tcAuth?.isAuthenticated?.(),window.tcAuth?.isAuthenticated?.()?'Signed in':'Not signed in');
   add('Cloud persistence module',!!window.tcCloud,'Project/company cloud module');
   add('Role-security module',!!window.tcSecurity,'Navigation/action permission guard');
   add('Role simulator',!!window.tcRoleTest,'Management-only UI acceptance tool');
   if(!manager()||!isSample(p)||!window.tcCloud)throw new Error('Acceptance writes are allowed only for a management login on the Training / Sample project.');

   const marker='TC-ACCEPT-'+Date.now();state.tasks=state.tasks||[];const before=state.tasks.filter(x=>x.project===p.name).length;
   state.tasks.push({project:p.name,title:marker,owner:'Acceptance Test',due:new Date().toISOString().slice(0,10),status:'Open',acceptanceTest:true});
   const wrote=await tcCloud.writeSnapshot('R1 acceptance write',marker);add('Project cloud write',!!wrote,wrote?'Snapshot written':'Write failed');
   state.tasks=state.tasks.filter(x=>x.title!==marker);
   const reopened=await tcCloud.loadSnapshot(true);const returned=state.tasks.some(x=>x.title===marker&&x.project===p.name);add('Project cloud reopen',!!reopened&&returned,returned?'Test record restored':'Test record not restored');
   const countAfter=state.tasks.filter(x=>x.project===p.name&&x.title!==marker).length;add('Project merge isolation',countAfter===before,`${before} baseline / ${countAfter} after reopen`);
   state.tasks=state.tasks.filter(x=>x.title!==marker);await tcCloud.writeSnapshot('R1 acceptance cleanup',marker);add('Acceptance cleanup',!state.tasks.some(x=>x.title===marker),'Temporary test record removed');

   if(window.tcRoleTest&&window.tcSecurity){
    const checks=[['Owner','financials',false],['Owner','drawings',true],['Subcontractor','financials',false],['Subcontractor','rfis',true],['Lender','rfis',false],['Lender','payapps',true],['Superintendent','accountinghub',false],['Project Manager','schedule',true]];
    for(const [role,page,expected] of checks){tcRoleTest.apply(role);await new Promise(r=>setTimeout(r,30));const got=tcSecurity.allowed(page);add(`${role}: ${page}`,got===expected,got?'Allowed':'Restricted')}
    tcRoleTest.restore();
   }
   add('Returned to actual login',!window.tcRoleTest?.isActive?.(),'Role simulator reset');
  }catch(e){add('Acceptance execution',false,e.message);try{window.tcRoleTest?.restore?.()}catch(_){}}
  finally{
   const passed=results.filter(x=>x.ok).length,total=results.length;state.persistenceHealth=state.persistenceHealth||{};state.persistenceHealth.lastAcceptanceTest=new Date().toISOString();state.persistenceHealth.acceptanceStatus=passed===total?'Passed':'Failed';state.persistenceHealth.acceptanceSummary=`${passed}/${total}`;
   out.innerHTML=`<div class="grid3"><div><b>Result</b><div class="small muted">${passed===total?'PASS':'FAIL'}</div></div><div><b>Checks</b><div class="small muted">${passed} of ${total} passed</div></div><div><b>Project</b><div class="small muted">${p?.name||'None'}</div></div></div><div class="section">${results.map(x=>line(x.name,x.ok,x.detail)).join('')}</div>`;btn.disabled=false;
  }
 }
 function inject(){if(!manager())return;const home=$('#home');if(!home)return;let box=$('#tcAcceptancePanel');if(!box){box=document.createElement('div');box.id='tcAcceptancePanel';box.className='card section';home.appendChild(box)}const p=current();box.innerHTML=`<h3>R1 Acceptance Test</h3><div class="small muted">Runs a controlled create → cloud save → remove → reopen → verify → cleanup cycle, plus role-permission checks. Database writes are blocked unless the current project name contains Training or Sample.</div><div class="actions section"><button class="btn primary" id="tcAcceptanceRun" type="button" ${isSample(p)?'':'disabled'}>Run Safe Acceptance Test</button><span class="small muted">Current project: ${p?.name||'None'}${isSample(p)?'':' — select Training / Sample Project'}</span></div><div id="tcAcceptanceResults" class="section"></div>`;$('#tcAcceptanceRun')?.addEventListener('click',run)}
 new MutationObserver(()=>{try{inject()}catch(e){console.warn('R1 acceptance panel',e)}}).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',()=>setTimeout(inject,1000));setTimeout(inject,1500);setInterval(()=>{if($('#tcAcceptancePanel'))inject()},12000);window.tcAcceptance={run,isSample};
})();