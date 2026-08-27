(() => {
  const cfg = window.__TC_SUPABASE__ || {};
  if (!cfg.url || !cfg.key) {
    console.error('TotalConstruct: Supabase runtime config missing');
    return;
  }

  const SUPABASE_ROOT = String(cfg.url).trim().replace(/\/+$/, '').replace(/\/(rest\/v1|auth\/v1)$/i, '');
  const API = SUPABASE_ROOT + '/rest/v1';
  const AUTH = SUPABASE_ROOT + '/auth/v1';
  const FUNCTIONS = SUPABASE_ROOT + '/functions/v1';
  let accessToken = localStorage.getItem('tc_access_token') || '';
  let authUser = null;
  let liveInvitations = [];

  const rolePermissions = {
    executive:['all'], admin:['all'],
    accounting:['project','financial_project','wip','payapps','contracts','employees_cost','timesheet','accounting','reports'],
    pm:['project','financial_project','contracts','rfi','submittal','schedule','payapps','internal','external','quality','tasks','meetings','daily','tm','procurement','closeout','timesheet','safety','equipment','drawings'],
    apm:['project','rfi','submittal','schedule','contracts','internal','external','tasks','meetings','daily','quality','procurement','closeout','drawings'],
    superintendent:['project','field','rfi','submittal','schedule','safety','timesheet','internal','quality','daily','tasks','tm','equipment','drawings'],
    safety:['project','safety','daily','tasks','reports'], qa_qc:['project','quality','daily','tasks','closeout','drawings'],
    employee:['project','timesheet','daily','tasks','drawings'], subcontractor:['project','rfi','submittal','schedule','daily','external'],
    architect:['project','rfi','submittal','schedule','drawings','meetings','tasks','external'], engineer:['project','rfi','submittal','schedule','drawings','meetings','tasks','external'],
    owner:['project','schedule','payapps','drawings','meetings','external'], lender:['project','payapps','schedule','drawings','reports']
  };
  const roleLabels = {
    executive:'Executive / Operations', admin:'Administrator', accounting:'Accounting / Controller', pm:'Project Manager', apm:'APM / Project Engineer',
    superintendent:'Superintendent', safety:'Safety', qa_qc:'QA / QC', employee:'Employee'
  };

  function headers(extra={}) {
    return Object.assign({ 'apikey': cfg.key, 'Content-Type':'application/json', 'Prefer':'return=representation' }, accessToken ? { 'Authorization':'Bearer ' + accessToken } : {}, extra);
  }
  async function rest(table, query='') {
    const r = await fetch(`${API}/${table}${query}`, { headers: headers() });
    if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
    return r.json();
  }
  async function insert(table, body) {
    const r = await fetch(`${API}/${table}`, { method:'POST', headers:headers(), body:JSON.stringify(body) });
    if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
    return r.json();
  }
  async function invokeFunction(name, body) {
    const r = await fetch(`${FUNCTIONS}/${name}`, { method:'POST', headers:headers(), body:JSON.stringify(body) });
    const data = await r.json().catch(()=>({}));
    if (!r.ok) throw new Error(data.error || data.message || `Function ${name} failed (${r.status})`);
    return data;
  }
  async function signIn(email,password) {
    const r = await fetch(`${AUTH}/token?grant_type=password`, { method:'POST', headers:{'apikey':cfg.key,'Content-Type':'application/json'}, body:JSON.stringify({email,password}) });
    if (!r.ok) {
      const err = await r.json().catch(()=>({}));
      throw new Error(err.error_description || err.msg || err.message || 'Sign in failed');
    }
    const data = await r.json();
    accessToken = data.access_token; authUser = data.user;
    localStorage.setItem('tc_access_token', accessToken);
    localStorage.setItem('tc_refresh_token', data.refresh_token || '');
    return data;
  }
  async function loadProfile() {
    const rows = await rest('profiles', `?id=eq.${authUser.id}&select=*`);
    if (!rows[0]) throw new Error('Your login exists, but no TotalConstruct profile is assigned yet.');
    return rows[0];
  }
  async function loadProjects() {
    const rows = await rest('projects', '?select=*&order=created_at.desc');
    let profiles = [];
    try { profiles = await rest('profiles','?select=id,display_name,first_name,last_name'); } catch(e) {}
    const names = Object.fromEntries(profiles.map(p=>[p.id,p.display_name || [p.first_name,p.last_name].filter(Boolean).join(' ') || 'TBD']));
    return rows.map(p=>({
      id:p.id, job:p.job_number||'TBD', name:p.name, client:p.client_name||'TBD', status:p.status||'Active', prob:100,
      contract:Number(p.contract_value||0), originalContract:Number(p.original_contract_value||0), estimatedCost:Number(p.forecast_cost||0), forecastCost:Number(p.forecast_cost||0),
      costToDate:Number(p.cost_to_date||0), billings:Number(p.billings_to_date||0), earnedRevenue:Number(p.billings_to_date||0), fee:0, feeEarned:0, feeBilled:0, feeCollected:0, ohRecovery:0,
      start:p.start_date||'', end:p.substantial_completion_date||'', pm:names[p.project_manager_id]||'TBD', super:names[p.superintendent_id]||'TBD',
      contractType:p.contract_method||'TBD', region:'', city:p.city||'', estValue:Number(p.contract_value||0), subValue:0, consultantFee:0, taxWithhold:0
    }));
  }
  async function loadInvitations() {
    if (!currentUser || !['executive','admin'].includes(currentUser.role)) return [];
    try {
      liveInvitations = await rest('user_invitations','?select=id,email,full_name,role,invitation_status,account_status,sent_at,viewed_at,accepted_at,expires_at,created_at&order=created_at.desc');
    } catch(e) { console.warn('Invitation status unavailable',e); liveInvitations=[]; }
    return liveInvitations;
  }
  async function loadLiveCollections() {
    const projectById = Object.fromEntries((state.projects||[]).map(p=>[p.id,p.name]));
    try {
      const rows = await rest('rfis','?select=*&order=created_at.desc');
      state.rfis = rows.map(r=>({project:projectById[r.project_id]||'', id:r.rfi_no, subject:r.subject, bic:r.current_ball_in_court||'', due:(r.due_at||'').slice(0,10), activity:r.schedule_activity_id?'Linked':'Pending', float:0, delay:0, tie:r.schedule_activity_id?'Linked':'Pending', status:r.status||'Open'}));
    } catch(e) { console.warn(e); }
    try {
      const rows = await rest('submittals','?select=*&order=created_at.desc');
      state.submittals = rows.map(s=>({project:projectById[s.project_id]||'', id:s.submittal_no, spec:'', desc:s.description, sub:'', bic:s.current_ball_in_court||'', ros:s.required_on_site||'', lead:'', activity:s.schedule_activity_id?'Linked':'Pending', exposure:0, tie:s.schedule_activity_id?'Linked':'Pending', status:s.status||'Pending'}));
    } catch(e) { console.warn(e); }
    try {
      const acts = await rest('schedule_activities','?select=*&order=planned_start.asc');
      state.schedule = state.schedule || {versions:[{id:1,label:'Live',date:new Date().toISOString().slice(0,10)}],activities:[]};
      state.schedule.activities = acts.map(a=>({project:projectById[a.project_id]||'', id:a.activity_id, activity:a.name, planned:Number(a.percent_complete||0), actual:Number(a.percent_complete||0), critical:!!a.critical, status:a.status||'Not Started'}));
    } catch(e) { console.warn(e); }
  }

  function addEnhancementStyles() {
    if (document.getElementById('tc-live-enhancements')) return;
    const s=document.createElement('style'); s.id='tc-live-enhancements'; s.textContent=`
      .tc-project-link{color:inherit;text-decoration:none;font-weight:800;cursor:pointer;border-bottom:1px dotted rgba(214,154,77,.75)}
      .tc-project-link:hover{color:var(--bronze2)}
      .tc-invite-summary{display:grid;grid-template-columns:repeat(4,minmax(130px,1fr));gap:10px;margin:12px 0}
      .tc-invite-toolbar{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
      .tc-modal{position:fixed;inset:0;background:#0009;z-index:220;display:grid;place-items:center;padding:18px}
      .tc-modal-card{width:min(620px,96vw);background:#fff;border-radius:16px;box-shadow:0 30px 90px #0007;overflow:hidden}
      .tc-modal-head{background:#15212b;color:#fff;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid var(--bronze)}
      .tc-modal-body{padding:18px 20px}.tc-modal-actions{padding:14px 20px;background:#f5f6f7;display:flex;justify-content:flex-end;gap:8px}
      .tc-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tc-preview-note{background:#fff5df;border:1px solid #e3bf83;border-radius:9px;padding:9px 11px;font-size:12px;margin-top:10px}
      .tc-project-hero{background:linear-gradient(135deg,#121c24,#1f303c);color:#fff;border:1px solid #31424f;border-radius:16px;padding:20px;display:grid;grid-template-columns:minmax(0,1.7fr) minmax(250px,.8fr);gap:18px;box-shadow:0 12px 30px #1113;position:relative;overflow:hidden}
      .tc-project-hero:after{content:'';position:absolute;right:-90px;top:-110px;width:260px;height:260px;border-radius:50%;background:rgba(214,154,77,.08)}
      .tc-project-hero h2{margin:0;font-size:27px}.tc-project-hero .meta{color:#b9c5cd;font-size:12px;margin-top:6px}.tc-hero-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}
      .tc-hero-image{min-height:150px;border-radius:12px;background:linear-gradient(145deg,#31424e,#17242d);border:1px solid #ffffff18;display:grid;place-items:center;position:relative;overflow:hidden}
      .tc-hero-image .placeholder{font-size:12px;color:#aebbc4;text-align:center}.tc-image-btn{position:absolute;right:10px;bottom:10px;padding:6px 9px!important;font-size:10px!important;z-index:2}
      .tc-drill-grid{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:10px;margin-top:12px}.tc-drill-card{cursor:pointer}.tc-drill-card:hover{border-color:#c49559;transform:translateY(-1px)}
      @media(max-width:850px){.tc-project-hero{grid-template-columns:1fr}.tc-invite-summary,.tc-drill-grid{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:520px){.tc-role-grid,.tc-invite-summary,.tc-drill-grid{grid-template-columns:1fr}}
    `; document.head.appendChild(s);
  }

  function formatDate(v){ if(!v) return '—'; try{return new Date(v).toLocaleString([], {year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});}catch{return v;} }
  function inviteStatusClass(status){status=String(status||'').toLowerCase(); if(status.includes('accept')||status==='active') return 'green'; if(status.includes('expire')||status.includes('fail')||status.includes('revok')) return 'red'; if(status.includes('sent')||status.includes('view')) return 'blue'; return 'amber';}
  function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

  function openProject(projectId, target='home') {
    const p=(state.projects||[]).find(x=>String(x.id)===String(projectId)); if(!p) return;
    const select=document.getElementById('projectSelect');
    if(select){ select.value=String(p.id); select.dispatchEvent(new Event('change',{bubbles:true})); }
    try { if(typeof currentProjectId!=='undefined') currentProjectId=p.id; } catch(e) {}
    if(typeof openPage==='function') openPage(target);
    setTimeout(()=>{ enhanceProjectLinks(); enhanceProjectDashboard(); },0);
  }
  window.tcOpenProject=openProject;

  function enhanceProjectLinks() {
    const projects=state.projects||[]; if(!projects.length) return;
    const scope=document.querySelector('main'); if(!scope) return;
    const nodes=[...scope.querySelectorAll('td,h3,h4,.metric-row span,.project-card h4')];
    nodes.forEach(el=>{
      if(el.dataset.tcLinked==='1' || el.querySelector('.tc-project-link')) return;
      const text=el.textContent.trim(); const p=projects.find(x=>x.name===text || x.job===text);
      if(!p) return;
      el.dataset.tcLinked='1'; el.innerHTML=`<button type="button" class="tc-project-link" data-project-id="${escapeHtml(p.id)}">${escapeHtml(text)}</button>`;
    });
    scope.querySelectorAll('.tc-project-link').forEach(btn=>{if(btn.dataset.bound)return;btn.dataset.bound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openProject(btn.dataset.projectId,'home');});});
  }

  function enhanceProjectDashboard() {
    const home=document.getElementById('home'); if(!home || !home.classList.contains('active')) return;
    const p=typeof currentProject==='function'?currentProject():null; if(!p) return;
    let hero=document.getElementById('tcProjectHero');
    if(!hero){
      hero=document.createElement('div'); hero.id='tcProjectHero'; hero.className='tc-project-hero';
      home.prepend(hero);
    }
    hero.innerHTML=`
      <div><div class="eyebrow">PROJECT COMMAND CENTER</div><h2>${escapeHtml(p.name)}</h2><div class="meta">${escapeHtml(p.job||'')} · ${escapeHtml(p.client||'')} · ${escapeHtml(p.city||'')} ${escapeHtml(p.status||'')}</div>
        <div class="tc-hero-actions"><button class="btn bronze" data-go="statusreport">Project Overview</button><button class="btn dark" data-go="financials">Cost Controls</button><button class="btn dark" data-go="schedule">Schedule</button><button class="btn dark" data-go="drawings">Drawings</button></div>
      </div>
      <div class="tc-hero-image"><div class="placeholder"><b>Project Image</b><br>Keep project photography visible and unobstructed.</div><button class="btn tc-image-btn" type="button" title="Project image management">Set Project Image</button></div>`;
    hero.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>openProject(p.id,b.dataset.go)));
    const imageBtn=hero.querySelector('.tc-image-btn'); if(imageBtn) imageBtn.onclick=()=>alert('Project image upload will use the project document/storage service. The control has been reduced so it does not cover the image.');
    let drill=document.getElementById('tcDrillGrid');
    if(!drill){drill=document.createElement('div');drill.id='tcDrillGrid';drill.className='tc-drill-grid';hero.insertAdjacentElement('afterend',drill);}
    const rfiCount=(state.rfis||[]).filter(x=>x.project===p.name).length, subCount=(state.submittals||[]).filter(x=>x.project===p.name).length;
    drill.innerHTML=`
      <div class="card tc-drill-card" data-go="financials"><div class="small muted">CURRENT CONTRACT</div><div class="value money" style="font-size:22px;font-weight:850">${typeof money==='function'?money(p.contract):'$'+Number(p.contract||0).toLocaleString()}</div><div class="small muted">Click for cost detail</div></div>
      <div class="card tc-drill-card" data-go="schedule"><div class="small muted">SCHEDULE</div><div class="value" style="font-size:22px;font-weight:850">${escapeHtml(p.end||'TBD')}</div><div class="small muted">Click for activities / delays</div></div>
      <div class="card tc-drill-card" data-go="rfis"><div class="small muted">RFIs</div><div class="value" style="font-size:22px;font-weight:850">${rfiCount}</div><div class="small muted">Click for filtered RFI log</div></div>
      <div class="card tc-drill-card" data-go="submittals"><div class="small muted">SUBMITTALS</div><div class="value" style="font-size:22px;font-weight:850">${subCount}</div><div class="small muted">Click for submittal log</div></div>`;
    drill.querySelectorAll('[data-go]').forEach(c=>c.addEventListener('click',()=>openProject(p.id,c.dataset.go)));
  }

  function showInviteModal() {
    if(!currentUser || !['executive','admin'].includes(currentUser.role)) return alert('Administrator access required.');
    document.getElementById('tcInviteModal')?.remove();
    const modal=document.createElement('div'); modal.id='tcInviteModal'; modal.className='tc-modal';
    const projectOptions=(state.projects||[]).map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('');
    modal.innerHTML=`<div class="tc-modal-card"><div class="tc-modal-head"><div><b>Invite Employee</b><div class="small" style="color:#b9c4cc">Create access and send a secure TotalConstruct invitation</div></div><button class="icon-btn" id="tcInviteClose" style="color:#fff">×</button></div>
      <form id="tcInviteForm"><div class="tc-modal-body">
        <div class="tc-role-grid"><div class="field"><label>Employee name</label><input id="tcInviteName" required placeholder="Full name"></div><div class="field"><label>Email</label><input id="tcInviteEmail" type="email" required placeholder="employee@company.com"></div></div>
        <div class="tc-role-grid"><div class="field"><label>Company role</label><select id="tcInviteRole">${Object.entries(roleLabels).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div><div class="field"><label>Initial project (optional)</label><select id="tcInviteProject"><option value="">Company access only</option>${projectOptions}</select></div></div>
        <div class="split-note">The employee receives their own secure login. Internal employees do not inherit Owner, Architect, Subcontractor or Lender portal permissions.</div>
        ${cfg.readOnly?'<div class="tc-preview-note"><b>Repair sandbox:</b> invitation sending is intentionally disabled here. This form is being verified without touching Blackridge access records.</div>':''}
        <div id="tcInviteMsg" class="small muted" style="margin-top:10px"></div>
      </div><div class="tc-modal-actions"><button class="btn" type="button" id="tcInviteCancel">Cancel</button><button class="btn bronze" type="submit" ${cfg.readOnly?'disabled title="Preview is read-only"':''}>Send Invitation</button></div></form></div>`;
    document.body.appendChild(modal);
    const close=()=>modal.remove(); modal.querySelector('#tcInviteClose').onclick=close; modal.querySelector('#tcInviteCancel').onclick=close; modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.querySelector('#tcInviteForm').onsubmit=async e=>{
      e.preventDefault(); if(cfg.readOnly) return;
      const msg=modal.querySelector('#tcInviteMsg'); const submit=modal.querySelector('[type=submit]'); submit.disabled=true;msg.textContent='Sending secure invitation…';
      try{
        await invokeFunction('invite-employee',{full_name:modal.querySelector('#tcInviteName').value.trim(),email:modal.querySelector('#tcInviteEmail').value.trim(),role:modal.querySelector('#tcInviteRole').value,project_id:modal.querySelector('#tcInviteProject').value||null});
        msg.textContent='Invitation sent.'; await loadInvitations(); setTimeout(()=>{close(); renderAccessLive();},500);
      }catch(err){msg.textContent=err.message;msg.style.color='#b9382e';submit.disabled=false;}
    };
  }
  window.addUser=showInviteModal;
  window.tcInviteEmployee=showInviteModal;

  function renderAccessLive() {
    const el=document.getElementById('access'); if(!el || !currentUser || !['executive','admin'].includes(currentUser.role)) return;
    const pending=liveInvitations.filter(i=>!['accepted','revoked'].includes(String(i.invitation_status||'').toLowerCase())).length;
    const accepted=liveInvitations.filter(i=>String(i.invitation_status||'').toLowerCase()==='accepted' || String(i.account_status||'').toLowerCase()==='active').length;
    const expired=liveInvitations.filter(i=>String(i.invitation_status||'').toLowerCase().includes('expire') || (i.expires_at && new Date(i.expires_at)<new Date() && !i.accepted_at)).length;
    const rows=liveInvitations.map(i=>`<tr><td><b>${escapeHtml(i.full_name||'—')}</b><br><span class="small muted">${escapeHtml(i.email)}</span></td><td>${escapeHtml(roleLabels[i.role]||i.role)}</td><td><span class="status ${inviteStatusClass(i.invitation_status)}">${escapeHtml(i.invitation_status||'pending')}</span></td><td><span class="status ${inviteStatusClass(i.account_status)}">${escapeHtml(i.account_status||'not created')}</span></td><td>${formatDate(i.sent_at||i.created_at)}</td><td>${formatDate(i.viewed_at)}</td><td>${formatDate(i.accepted_at)}</td><td>${formatDate(i.expires_at)}</td></tr>`).join('');
    el.innerHTML=`<div class="head"><div><h1>Users / Access</h1><div class="sub">Employee invitations, account activation, company role and access status</div></div><div class="actions"><button class="btn primary" id="tcInviteEmployeeBtn">+ Invite Employee</button></div></div>
      <div class="tc-invite-summary"><div class="card kpi"><div class="label">Invitations</div><div class="value">${liveInvitations.length}</div><div class="foot">All employee invites</div></div><div class="card kpi"><div class="label">Pending</div><div class="value">${pending}</div><div class="foot">Awaiting activation</div></div><div class="card kpi"><div class="label">Accepted / Active</div><div class="value">${accepted}</div><div class="foot">Usable accounts</div></div><div class="card kpi"><div class="label">Expired / Attention</div><div class="value">${expired}</div><div class="foot">Admin follow-up</div></div></div>
      <div class="card"><div class="tc-invite-toolbar"><div><b>Employee Invite Status</b><div class="small muted">Status remains visible to Admin / Executive.</div></div>${cfg.readOnly?'<span class="status amber">Preview · no writes</span>':''}</div>
      <div class="table-wrap"><table><tr><th>Employee</th><th>Role</th><th>Invite Status</th><th>Account Status</th><th>Sent</th><th>Viewed</th><th>Accepted</th><th>Expires</th></tr>${rows||'<tr><td colspan="8" class="muted">No employee invitations yet.</td></tr>'}</table></div></div>
      <div class="callout section">External Owner, Architect/Engineer, Subcontractor and Lender identities remain separate from internal employee accounts and follow their own portal permissions.</div>`;
    el.querySelector('#tcInviteEmployeeBtn').onclick=showInviteModal;
  }
  window.tcRenderAccessLive=renderAccessLive;

  function buildLogin() {
    const card = document.querySelector('.login-card'); if (!card) return;
    card.style.width = 'min(400px,88vw)';
    card.innerHTML = `<div class="mark">TC</div><div><div class="eyebrow">TOTALCONSTRUCT OS</div><h1>Commercial</h1><p>Secure project operations portal.</p></div><div class="field"><label>Email</label><input id="tcEmail" type="email" autocomplete="username" placeholder="you@company.com"></div><div class="field"><label>Password</label><input id="tcPassword" type="password" autocomplete="current-password" placeholder="Password"></div><button class="btn primary wide" id="tcLoginBtn">Sign in</button><div id="tcLoginMsg" class="muted small">Connected to TotalConstruct Cloud</div>`;
    document.getElementById('tcLoginBtn').onclick = async () => { const msg=document.getElementById('tcLoginMsg'); msg.textContent='Signing in…'; msg.style.color=''; try { await signIn(document.getElementById('tcEmail').value.trim(), document.getElementById('tcPassword').value); await bootLive(); } catch(e) { msg.textContent=e.message; msg.style.color='#b9382e'; } };
  }

  async function bootLive() {
    if (!authUser) { const r = await fetch(`${AUTH}/user`, {headers:headers()}); if (!r.ok) throw new Error('Session expired. Please sign in again.'); authUser = await r.json(); }
    const profile = await loadProfile();
    const projects = await loadProjects(); if (projects.length) state.projects = projects;
    const fullName = profile.display_name || [profile.first_name,profile.last_name].filter(Boolean).join(' ') || profile.email || 'User';
    currentUser = { id:profile.id, name:fullName, initials:fullName.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(), role:profile.role, projects:(state.projects||[]).map(p=>p.id), permissions:rolePermissions[profile.role]||['project'] };
    await Promise.all([loadLiveCollections(),loadInvitations()]);
    document.getElementById('login').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); document.getElementById('userAvatar').textContent=currentUser.initials;
    syncProjectSelect(); renderAll(); refreshBanner(); addEnhancementStyles();
    setTimeout(()=>{enhanceProjectLinks();enhanceProjectDashboard(); if(document.getElementById('access')?.classList.contains('active'))renderAccessLive();},0);
  }

  window.addProject = async function() { try { const name=prompt('Project / opportunity name'); if(!name)return; const companyRows = await rest('company_users', `?user_id=eq.${authUser.id}&active=eq.true&select=company_id&limit=1`); if(!companyRows[0]) throw new Error('No company assignment found for this user.'); const value=+(prompt('Contract / estimated value')||0); await insert('projects',{company_id:companyRows[0].company_id,name,status:'preconstruction',contract_value:value,original_contract_value:value,forecast_cost:0,cost_to_date:0,billings_to_date:0,collections_to_date:0}); state.projects=await loadProjects(); currentUser.projects=state.projects.map(p=>p.id); syncProjectSelect(); renderAll(); refreshBanner(); } catch(e) { alert(e.message); } };
  window.addRfi = async function() { const p=currentProject(); const subject=prompt('RFI subject'); if(!subject)return; try { const count=(await rest('rfis',`?project_id=eq.${p.id}&select=id`)).length+1; await insert('rfis',{project_id:p.id,rfi_no:'RFI-'+String(count).padStart(3,'0'),subject,question:prompt('Question / clarification requested')||subject,initiated_by_type:'GC',initiated_by_user_id:authUser.id,current_ball_in_court:'GC',status:'open',created_by:authUser.id}); await loadLiveCollections(); renderPage('rfis'); renderNav(); } catch(e){ alert(e.message); } };
  window.addSub = async function() { const p=currentProject(); const desc=prompt('Submittal description'); if(!desc)return; try { const count=(await rest('submittals',`?project_id=eq.${p.id}&select=id`)).length+1; await insert('submittals',{project_id:p.id,submittal_no:'SUB-'+String(count).padStart(3,'0'),revision_no:0,description:desc,submitted_by_user_id:authUser.id,current_ball_in_court:'GC',status:'pending'}); await loadLiveCollections(); renderPage('submittals'); renderNav(); } catch(e){ alert(e.message); } };

  document.addEventListener('click',e=>{ const nav=e.target.closest?.('.nav,[data-page]'); if(nav) setTimeout(()=>{enhanceProjectLinks();enhanceProjectDashboard(); if(document.getElementById('access')?.classList.contains('active'))renderAccessLive();},0); });
  const observer=new MutationObserver(()=>{ clearTimeout(observer._t); observer._t=setTimeout(()=>{enhanceProjectLinks(); if(document.getElementById('home')?.classList.contains('active'))enhanceProjectDashboard();},50); });
  addEnhancementStyles(); buildLogin();
  const main=document.querySelector('main'); if(main) observer.observe(main,{childList:true,subtree:true});
  if(accessToken){ bootLive().catch(()=>{ localStorage.removeItem('tc_access_token'); localStorage.removeItem('tc_refresh_token'); }); }
})();
