(()=>{
  'use strict';
  const KEY='platformFeedback';
  const now=()=>new Date().toISOString();
  const uid=()=>`FB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const build=()=>window.__TC_SUPABASE__?.buildSha||'local';
  const get=()=>Array.isArray(window.state?.[KEY])?window.state[KEY]:[];
  const persist=(action='Updated platform feedback',record='Feedback Center')=>{try{window.save?.(action,record);}catch(e){console.warn('Feedback save failed',e)}};
  const role=()=>String(window.currentUser?.role||window.state?.currentUser?.role||window.state?.role||'').toLowerCase();
  const canManage=()=>/executive|admin|operations|platform|owner|super admin/.test(role());
  const currentModule=()=>window.currentPage||window.state?.activePage||window.state?.page||'Unknown';
  const currentProjectId=()=>{try{return window.currentProject?.()?.id||window.state?.selectedProject||window.state?.currentProject||null}catch(e){return window.state?.selectedProject||null}};
  const appActive=()=>{const app=document.getElementById('app');return !!window.currentUser&&!!app&&!app.classList.contains('hidden')};
  const severity=(type,text)=>{
    const s=(text||'').toLowerCase();
    if(/security|data loss|corrupt|wrong total|wrong balance|permission|unauthorized|cannot login|can't login|crash|blank screen/.test(s)) return 'Critical';
    if(type==='Bug / Deficiency' && /cannot|can't|broken|fails|error|missing/.test(s)) return 'High';
    return type==='Bug / Deficiency'?'Normal':'Backlog';
  };
  const disposition=sev=>sev==='Critical'?'Immediate AI / Release Review':sev==='High'?'Priority Review':'Quarterly AI Review';
  const assessment=(rec)=>{
    if(rec.severity==='Critical') return 'Potential critical defect. Reproduce immediately, assess security/data/financial impact, create protected fix, run automated verification and require release approval before deployment.';
    if(rec.severity==='High') return 'Priority defect. Confirm reproducibility and affected roles/modules; schedule correction ahead of normal enhancement backlog.';
    if(rec.type==='Bug / Deficiency') return 'Standard defect review. Confirm impact, duplicate pattern and workaround before scheduling.';
    return `Enhancement candidate. Include in quarterly review; weigh demand (${rec.demandCount||1}), workflow benefit, edition fit and implementation effort.`;
  };
  function submit(input={}){
    if(!window.state) return null;
    const description=String(input.description||'').trim();
    if(description.length<5) throw new Error('Please describe the issue or suggestion.');
    const type=input.type||'Suggested Change';
    const sev=severity(type,description);
    const rec={id:uid(),type,description,title:String(input.title||'').trim()||description.slice(0,80),module:input.module||currentModule(),projectId:input.projectId||currentProjectId(),userRole:role()||'Unknown',edition:String(window.state?.moduleConfig?.edition||window.state?.edition||'Commercial'),buildSha:build(),createdAt:now(),updatedAt:now(),status:'Received',severity:sev,reviewCadence:disposition(sev),duplicateOf:null,demandCount:1,aiAssessment:'Pending',device:navigator.userAgent||'',attachments:Array.isArray(input.attachments)?input.attachments:[]};
    const existing=get().find(x=>x.status!=='Released'&&x.type===rec.type&&x.module===rec.module&&String(x.description||'').trim().toLowerCase()===description.toLowerCase());
    if(existing){existing.demandCount=(existing.demandCount||1)+1;existing.updatedAt=now();existing.aiAssessment=assessment(existing);persist('Consolidated duplicate platform feedback',existing.id);render();return existing;}
    rec.aiAssessment=assessment(rec);
    window.state[KEY]=[...get(),rec];
    persist('Submitted platform feedback',rec.id);
    render();
    return rec;
  }
  function update(id,patch={}){const r=get().find(x=>x.id===id);if(!r)return null;Object.assign(r,patch,{updatedAt:now()});r.aiAssessment=patch.aiAssessment||assessment(r);persist('Updated platform feedback',id);render();return r;}
  function quarterlyReview(){return get().filter(x=>['Backlog','Received','AI Reviewing','Under Consideration'].includes(x.status)&&x.severity!=='Critical').sort((a,b)=>(b.demandCount||1)-(a.demandCount||1)).map(x=>({id:x.id,title:x.title,type:x.type,module:x.module,demand:x.demandCount||1,severity:x.severity,status:x.status,buildSha:x.buildSha,recommendation:assessment(x)}));}
  function prepareQuarterlyReview(){
    const list=quarterlyReview();
    const stamp=now();
    list.forEach(item=>{const r=get().find(x=>x.id===item.id);if(!r)return;r.status='AI Reviewing';r.aiAssessment=item.recommendation;r.updatedAt=stamp});
    if(list.length)persist('Prepared quarterly feedback review',`Feedback Center · ${list.length} items`);
    render();
    return list;
  }
  function openSubmit(){
    if(window.tcOpenRecordForm){window.tcOpenRecordForm({title:'Platform Feedback / Improvement Center',subtitle:'Report a deficiency, request a change, or suggest an improvement. Technical context is captured automatically.',fields:[{name:'type',label:'Feedback Type',type:'select',options:['Bug / Deficiency','Suggested Change','New Feature','Workflow Improvement','Other'],required:true},{name:'title',label:'Short Title',required:true},{name:'description',label:'Describe the issue or suggestion',type:'textarea',required:true}],onSave:async d=>{const r=submit(d);alert(`${r.id} received. Priority: ${r.severity}. Review: ${r.reviewCadence}.`)}});return;}
    const description=prompt('Describe the issue or suggestion:');if(description)submit({description});
  }
  function statusClass(x){return x==='Critical'?'red':x==='High'?'amber':x==='Released'?'green':'gray'}
  function ensureShell(){
    if(!document.getElementById('tcFeedbackStyle')){const s=document.createElement('style');s.id='tcFeedbackStyle';s.textContent='#tcFeedbackButton{position:fixed;right:18px;bottom:18px;z-index:8000;border-radius:22px;box-shadow:0 6px 18px rgba(0,0,0,.2)}#tcFeedbackDrawer{position:fixed;inset:0;z-index:7999;background:rgba(0,0,0,.42);display:none;align-items:center;justify-content:center;padding:20px}#tcFeedbackDrawer.open{display:flex}#tcFeedbackPanel{background:var(--card,#fff);color:var(--text,#1f2937);width:min(1080px,96vw);max-height:88vh;overflow:auto;border-radius:14px;padding:22px;box-shadow:0 16px 50px rgba(0,0,0,.28)}#tcFeedbackPanel .fb-desc{max-width:360px;white-space:normal}';document.head.appendChild(s)}
    let b=document.getElementById('tcFeedbackButton');
    if(!b){b=document.createElement('button');b.id='tcFeedbackButton';b.className='btn primary';b.textContent='Feedback / Report Problem';b.onclick=()=>{if(!appActive())return;document.getElementById('tcFeedbackDrawer')?.classList.add('open');render()};document.body.appendChild(b)}
    let d=document.getElementById('tcFeedbackDrawer');
    if(!d){d=document.createElement('div');d.id='tcFeedbackDrawer';d.innerHTML='<div id="tcFeedbackPanel"></div>';d.onclick=e=>{if(e.target===d)d.classList.remove('open')};document.body.appendChild(d)}
    const active=appActive();b.hidden=!active;if(!active)d.classList.remove('open');
  }
  function render(){
    ensureShell();if(!appActive())return;const p=document.getElementById('tcFeedbackPanel');if(!p)return;
    const rows=[...get()].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    const critical=rows.filter(x=>x.severity==='Critical'&&x.status!=='Released').length, backlog=rows.filter(x=>x.reviewCadence==='Quarterly AI Review'&&x.status!=='Released').length;
    p.innerHTML=`<div class="head"><div><h2>Platform Feedback / Improvement Center</h2><div class="sub">Deficiencies, change requests and product suggestions with build/context capture and controlled AI triage.</div></div><div class="actions"><button class="btn primary" id="tcFeedbackNew">+ Submit Feedback</button>${canManage()?'<button class="btn" id="tcQuarterlyReview">Quarterly AI Review</button>':''}<button class="btn" id="tcFeedbackClose">Close</button></div></div><div class="grid section"><div class="card"><div class="small muted">Open Critical</div><h2>${critical}</h2></div><div class="card"><div class="small muted">Quarterly Backlog</div><h2>${backlog}</h2></div><div class="card"><div class="small muted">Total Requests</div><h2>${rows.length}</h2></div></div><div class="table-wrap section"><table><thead><tr><th>ID</th><th>Type / Module</th><th>Description</th><th>Priority</th><th>Status</th><th>Demand</th><th>Review</th>${canManage()?'<th>Admin</th>':''}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td><b>${esc(r.id)}</b><div class="small muted">${esc(String(r.buildSha||'').slice(0,8))}</div></td><td>${esc(r.type)}<div class="small muted">${esc(r.module)} · ${esc(r.edition||'Commercial')}</div></td><td class="fb-desc"><b>${esc(r.title)}</b><div class="small muted">${esc(r.description)}</div><div class="small section">AI triage: ${esc(r.aiAssessment||'Pending')}</div></td><td><span class="status ${statusClass(r.severity)}">${esc(r.severity)}</span></td><td>${esc(r.status)}</td><td>${r.demandCount||1}</td><td>${esc(r.reviewCadence)}</td>${canManage()?`<td><select class="tcFbStatus" data-id="${esc(r.id)}"><option${r.status==='Received'?' selected':''}>Received</option><option${r.status==='AI Reviewing'?' selected':''}>AI Reviewing</option><option${r.status==='Confirmed Issue'?' selected':''}>Confirmed Issue</option><option${r.status==='Planned'?' selected':''}>Planned</option><option${r.status==='In Development'?' selected':''}>In Development</option><option${r.status==='Testing'?' selected':''}>Testing</option><option${r.status==='Released'?' selected':''}>Released</option><option${r.status==='Under Consideration'?' selected':''}>Under Consideration</option><option${r.status==='Not Planned'?' selected':''}>Not Planned</option></select></td>`:''}</tr>`).join(''):`<tr><td colspan="8" class="muted">No feedback submitted yet.</td></tr>`}</tbody></table></div><div class="callout section"><b>Release safeguard:</b> Critical feedback can be escalated immediately, but no AI-generated correction is silently released. Fixes remain subject to verification, role/security checks and the controlled release gate.</div>`;
    document.getElementById('tcFeedbackNew').onclick=openSubmit;document.getElementById('tcFeedbackClose').onclick=()=>document.getElementById('tcFeedbackDrawer').classList.remove('open');
    document.querySelectorAll('.tcFbStatus').forEach(x=>x.onchange=()=>update(x.dataset.id,{status:x.value}));
    const q=document.getElementById('tcQuarterlyReview');if(q)q.onclick=()=>{const list=prepareQuarterlyReview();alert(`Quarterly review prepared ${list.length} backlog item${list.length===1?'':'s'} for management review.`)};
  }
  if(window.state&&!Array.isArray(window.state[KEY]))window.state[KEY]=[];
  if(window.tcCloud?.companyTracked&&!window.tcCloud.companyTracked.includes(KEY))window.tcCloud.companyTracked.push(KEY);
  window.tcFeedbackCenter={submit,update,list:get,quarterlyReview,prepareQuarterlyReview,severity,render,open:()=>{ensureShell();if(!appActive())return;document.getElementById('tcFeedbackDrawer').classList.add('open');render()}};
  window.tcReportProblem=(description,module)=>description?submit({type:'Bug / Deficiency',description,module}):openSubmit();
  window.tcSuggestImprovement=(description,module)=>description?submit({type:'Suggested Change',description,module}):openSubmit();
  const init=()=>{if(window.state&&!Array.isArray(window.state[KEY]))window.state[KEY]=[];if(window.tcCloud?.companyTracked&&!window.tcCloud.companyTracked.includes(KEY))window.tcCloud.companyTracked.push(KEY);ensureShell()};
  new MutationObserver(init).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  addEventListener('DOMContentLoaded',init);setTimeout(init,800);setTimeout(init,1800);
})();
