(()=>{
 const $=s=>document.querySelector(s);
 const gates=[
  ['representativeWorkflows','Representative create/edit/reopen workflows'],
  ['projectSwitching','Project switching / reopen verification'],
  ['roleViews','Representative View As role verification'],
  ['realInvite','One real employee invite verified'],
  ['mobileField','Phone/tablet field workflow verified']
 ];
 function manager(){return !!currentUser&&(currentUser.permissions||[]).includes('all')}
 function ensure(){state.releaseGate=state.releaseGate||{manual:{},evidence:{},updatedAt:null,updatedBy:null};state.releaseGate.manual=state.releaseGate.manual||{};state.releaseGate.evidence=state.releaseGate.evidence||{};return state.releaseGate}
 function acceptancePassed(){return state.persistenceHealth?.acceptanceStatus==='Passed'}
 function gatePassed(k){const g=ensure();return g.manual[k]===true&&String(g.evidence[k]||'').trim().length>=5}
 function allManual(){return gates.every(([k])=>gatePassed(k))}
 function ready(){return acceptancePassed()&&allManual()}
 function esc(v){return String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
 function render(){if(!manager())return;const home=$('#home');if(!home)return;let box=$('#tcReleaseGate');if(!box){box=document.createElement('div');box.id='tcReleaseGate';box.className='card section';home.appendChild(box)}const g=ensure();const manualCount=gates.filter(([k])=>gatePassed(k)).length;box.innerHTML=`<div class="head"><div><h3>R1 Release Readiness</h3><div class="sub">Single go / no-go gate before PR #3 leaves draft. Each manual PASS requires a short evidence note.</div></div><span class="status ${ready()?'green':'red'}">${ready()?'READY':'BLOCKED'}</span></div><div class="statline"><span>Automated Sample-Project Acceptance</span><b><span class="status ${acceptancePassed()?'green':'red'}">${acceptancePassed()?'PASS':'PENDING'}</span>${state.persistenceHealth?.acceptanceSummary?' · '+state.persistenceHealth.acceptanceSummary:''}</b></div><div class="section">${gates.map(([k,label])=>`<div class="section" style="border-bottom:1px solid var(--line,#ddd);padding-bottom:10px"><label class="statline" style="cursor:pointer"><span>${label}</span><input class="tcReleaseCheck" data-key="${k}" type="checkbox" ${g.manual[k]?'checked':''}></label><input class="tcReleaseEvidence" data-key="${k}" value="${esc(g.evidence[k])}" placeholder="Evidence / device / record tested" style="width:100%;margin-top:6px"><div class="small muted">${gatePassed(k)?'PASS evidence recorded':'Requires checkbox + evidence note'}</div></div>`).join('')}</div><div class="small muted section">Manual checks with evidence: ${manualCount}/${gates.length}${g.updatedAt?' · Last updated '+new Date(g.updatedAt).toLocaleString():''}${g.updatedBy?' by '+esc(g.updatedBy):''}. This status is company-scoped and cloud-persisted.</div><div class="callout section">Do not move the R1 pull request from Draft to Ready for Review unless this panel shows READY and CI/deployment remain green.</div>`;
  const persist=()=>{const x=ensure();x.updatedAt=new Date().toISOString();x.updatedBy=currentUser?.name||'Management';if(typeof save==='function')save('Updated R1 release readiness','Release Gate');render()};
  box.querySelectorAll('.tcReleaseCheck').forEach(i=>i.addEventListener('change',()=>{ensure().manual[i.dataset.key]=i.checked;persist()}));
  box.querySelectorAll('.tcReleaseEvidence').forEach(i=>i.addEventListener('change',()=>{ensure().evidence[i.dataset.key]=i.value.trim();persist()}));
 }
 new MutationObserver(()=>{try{render()}catch(e){console.warn('R1 release gate',e)}}).observe(document.documentElement,{subtree:true,childList:true});addEventListener('DOMContentLoaded',()=>setTimeout(render,1100));setTimeout(render,1700);setInterval(()=>{if($('#tcReleaseGate'))render()},10000);window.tcReleaseGate={ready,render,gates,gatePassed};
})();