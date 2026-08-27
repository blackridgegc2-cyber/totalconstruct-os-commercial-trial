(()=>{
 const $=s=>document.querySelector(s);
 function manager(){return !!currentUser&&(currentUser.permissions||[]).includes('all')}
 function current(){try{return currentProject()}catch(e){return null}}
 function buildSha(){return window.__TC_SUPABASE__?.buildSha||'unknown'}
 function isSample(p){return !!p&&/(training|sample)/i.test(`${p.name||''} ${p.job||''}`)}
 function line(name,ok,detail=''){return `<div class="statline"><span>${name}</span><b><span class="status ${ok?'green':'red'}">${ok?'PASS':'FAIL'}</span>${detail?` · ${detail}`:''}</b></div>`}
 function otherTaskFingerprint(p){return JSON.stringify((state.tasks||[]).filter(x=>x.project!==p.name).map(x=>[x.project,x.title,x.owner,x.due,x.status]))}
 async function run(){
  const btn=$('#tcAcceptanceRun'),out=$('#tcAcceptanceResults');if(!btn||!out)return;
  const p=current(),results=[];let marker='',wrote=false,cleanupNeeded=false;btn.disabled=true;out.innerHTML='<div class="muted">Running acceptance checks…</div>';
  const add=(name,ok,detail='')=>results.push({name,ok,detail});
  try{
   add('Management test context',manager(),currentUser?.role||'Unknown role');
   add('Training / Sample project selected',isSample(p),p?.name||'No project selected');
   add('Authenticated cloud session',!!window.tcAuth?.isAuthenticated?.(),window.tcAuth?.isAuthenticated?.()?'Signed in':'Not signed in');
   add('Deployed build identity',buildSha()!=='unknown',buildSha().slice(0,12));
   add('Cloud persistence module',!!window.tcCloud,'Project/company cloud module');
   add('Role-security module',!!window.tcSecurity,'Navigation/action permission guard');
   add('Role simulator',!!window.tcRoleTest,'Management-only UI acceptance tool');
   if(!manager()||!isSample(p)||!window.tcCloud)throw new Error('Acceptance writes are allowed only for a management login on the Training / Sample project.');

   marker='TC-ACCEPT-'+Date.now();state.tasks=state.tasks||[];
   const before=state.tasks.filter(x=>x.project===p.name).length;
   const otherBefore=otherTaskFingerprint(p);
   state.tasks.push({project:p.name,title:marker,owner:'Acceptance Test',due:new Date().toISOString().slice(0,10),status:'Open',acceptanceTest:true});cleanupNeeded=true;
   wrote=await tcCloud.writeSnapshot('R1 acceptance write',marker);add('Project cloud write',!!wrote,wrote?'Snapshot written':'Write failed');
   if(!wrote)throw new Error(state.persistenceHealth?.cloudError||'Acceptance cloud write failed.');

   state.tasks=state.tasks.filter(x=>x.title!==marker);
   const reopened=await tcCloud.loadSnapshot(true);const returned=state.tasks.some(x=>x.title===marker&&x.project===p.name);add('Project cloud reopen',!!reopened&&returned,returned?'Test record restored':'Test record not restored');
   const countAfter=state.tasks.filter(x=>x.project===p.name&&x.title!==marker).length;add('Selected-project merge isolation',countAfter===before,`${before} baseline / ${countAfter} after reopen`);
   const otherAfter=otherTaskFingerprint(p);add('Cross-project merge isolation',otherAfter===otherBefore,otherAfter===otherBefore?'Other project tasks unchanged':'Other project task state changed');
   if(!reopened||!returned)throw new Error('Cloud reopen did not restore the acceptance record.');

   if(window.tcRoleTest&&window.tcSecurity){
    const checks=[['Owner','financials',false],['Owner','drawings',true],['Subcontractor','financials',false],['Subcontractor','rfis',true],['Lender','rfis',false],['Lender','payapps',true],['Superintendent','accountinghub',false],['Project Manager','schedule',true]];
    for(const [role,page,expected] of checks){tcRoleTest.apply(role);await new Promise(r=>setTimeout(r,30));const got=tcSecurity.allowed(page);add(`${role}: ${page}`,got===expected,got?'Allowed':'Restricted')}
    tcRoleTest.restore();
   }
   add('Returned to actual login',!window.tcRoleTest?.isActive?.(),'Role simulator reset');
  }catch(e){add('Acceptance execution',false,e.message);try{window.tcRoleTest?.restore?.()}catch(_){}}
  finally{
   if(cleanupNeeded&&p&&marker){
    try{
     state.tasks=(state.tasks||[]).filter(x=>x.title!==marker);
     const cleaned=wrote?await tcCloud.writeSnapshot('R1 acceptance cleanup',marker):true;
     add('Acceptance cleanup',cleaned&&!state.tasks.some(x=>x.title===marker),cleaned?'Temporary test record removed':'Cleanup cloud write failed');
    }catch(e){add('Acceptance cleanup',false,e.message)}
   }
   try{window.tcRoleTest?.restore?.()}catch(_){}
   const passed=results.filter(x=>x.ok).length,total=results.length;state.persistenceHealth=state.persistenceHealth||{};state.persistenceHealth.lastAcceptanceTest=new Date().toISOString();state.persistenceHealth.acceptanceStatus=passed===total?'Passed':'Failed';state.persistenceHealth.acceptanceSummary=`${passed}/${total}`;state.persistenceHealth.acceptanceBuildSha=buildSha();
   out.innerHTML=`<div class="grid3"><div><b>Result</b><div class="small muted">${passed===total?'PASS':'FAIL'}</div></div><div><b>Checks</b><div class="small muted">${passed} of ${total} passed</div></div><div><b>Build</b><div class="small muted">${buildSha().slice(0,12)}</div></div></div><div class="section">${results.map(x=>line(x.name,x.ok,x.detail)).join('')}</div>`;btn.disabled=false;
  }
 }
 function inject(){if(!manager())return;const home=$('#home');if(!home)return;let box=$('#tcAcceptancePanel');if(!box){box=document.createElement('div');box.id='tcAcceptancePanel';box.className='card section';home.appendChild(box)}const p=current();box.innerHTML=`<h3>R1 Acceptance Test</h3><div class="small muted">Runs a controlled create → cloud save → remove → reopen → verify → cleanup cycle, plus role-permission checks. It also verifies that reopening the sample project does not alter task records belonging to other projects. Database writes are blocked unless the current project name contains Training or Sample. Results are valid only for build ${buildSha().slice(0,12)}.</div><div class="actions section"><button class="btn primary" id="tcAcceptanceRun" type="button" ${isSample(p)?'':'disabled'}>Run Safe Acceptance Test</button><span class="small muted">Current project: ${p?.name||'None'}${isSample(p)?'':' — select Training / Sample Project'}</span></div><div id="tcAcceptanceResults" class="section"></div>`;$('#tcAcceptanceRun')?.addEventListener('click',run)}
 new MutationObserver(()=>{try{inject()}catch(e){console.warn('R1 acceptance panel',e)}}).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',()=>setTimeout(inject,1000));setTimeout(inject,1500);setInterval(()=>{if($('#tcAcceptancePanel'))inject()},12000);window.tcAcceptance={run,isSample,buildSha};
})();