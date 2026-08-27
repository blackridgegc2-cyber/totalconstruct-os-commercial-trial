(() => {
  const cfg = window.__TC_SUPABASE__ || {};
  if (!cfg.url || !cfg.key) {
    console.error('TotalConstruct: Supabase runtime config missing');
    return;
  }

  const SUPABASE_ROOT = String(cfg.url)
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/(rest\/v1|auth\/v1)$/i, '');
  const API = SUPABASE_ROOT + '/rest/v1';
  const AUTH = SUPABASE_ROOT + '/auth/v1';
  let accessToken = localStorage.getItem('tc_access_token') || '';
  let authUser = null;

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
  async function loadProjects(profile) {
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

  function buildLogin() {
    const card = document.querySelector('.login-card'); if (!card) return;
    card.style.width = 'min(400px,88vw)';
    card.innerHTML = `
      <div class="mark">TC</div>
      <div><div class="eyebrow">TOTALCONSTRUCT OS</div><h1>Commercial</h1><p>Secure project operations portal.</p></div>
      <div class="field"><label>Email</label><input id="tcEmail" type="email" autocomplete="username" placeholder="you@company.com"></div>
      <div class="field"><label>Password</label><input id="tcPassword" type="password" autocomplete="current-password" placeholder="Password"></div>
      <button class="btn primary wide" id="tcLoginBtn">Sign in</button>
      <div id="tcLoginMsg" class="muted small">Connected to TotalConstruct Cloud</div>`;
    document.getElementById('tcLoginBtn').onclick = async () => {
      const msg=document.getElementById('tcLoginMsg'); msg.textContent='Signing in…'; msg.style.color='';
      try {
        await signIn(document.getElementById('tcEmail').value.trim(), document.getElementById('tcPassword').value);
        await bootLive();
      } catch(e) { msg.textContent=e.message; msg.style.color='#b9382e'; }
    };
  }

  async function bootLive() {
    if (!authUser) {
      const r = await fetch(`${AUTH}/user`, {headers:headers()});
      if (!r.ok) throw new Error('Session expired. Please sign in again.');
      authUser = await r.json();
    }
    const profile = await loadProfile();
    const projects = await loadProjects(profile);
    if (projects.length) state.projects = projects;
    const fullName = profile.display_name || [profile.first_name,profile.last_name].filter(Boolean).join(' ') || profile.email || 'User';
    currentUser = { id:profile.id, name:fullName, initials:fullName.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase(), role:profile.role, projects:(state.projects||[]).map(p=>p.id), permissions:rolePermissions[profile.role]||['project'] };
    await loadLiveCollections();
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('userAvatar').textContent=currentUser.initials;
    syncProjectSelect(); renderAll(); refreshBanner();
  }

  window.addProject = async function() {
    try {
      const name=prompt('Project / opportunity name'); if(!name)return;
      const companyRows = await rest('company_users', `?user_id=eq.${authUser.id}&active=eq.true&select=company_id&limit=1`);
      if(!companyRows[0]) throw new Error('No company assignment found for this user.');
      const value=+(prompt('Contract / estimated value')||0);
      await insert('projects',{company_id:companyRows[0].company_id,name,status:'preconstruction',contract_value:value,original_contract_value:value,forecast_cost:0,cost_to_date:0,billings_to_date:0,collections_to_date:0});
      state.projects=await loadProjects(await loadProfile()); currentUser.projects=state.projects.map(p=>p.id); syncProjectSelect(); renderAll(); refreshBanner();
    } catch(e) { alert(e.message); }
  };

  window.addRfi = async function() {
    const p=currentProject(); const subject=prompt('RFI subject'); if(!subject)return;
    try {
      const count=(await rest('rfis',`?project_id=eq.${p.id}&select=id`)).length+1;
      await insert('rfis',{project_id:p.id,rfi_no:'RFI-'+String(count).padStart(3,'0'),subject,question:prompt('Question / clarification requested')||subject,initiated_by_type:'GC',initiated_by_user_id:authUser.id,current_ball_in_court:'GC',status:'open',created_by:authUser.id});
      await loadLiveCollections(); renderPage('rfis'); renderNav();
    } catch(e){ alert(e.message); }
  };

  window.addSub = async function() {
    const p=currentProject(); const desc=prompt('Submittal description'); if(!desc)return;
    try {
      const count=(await rest('submittals',`?project_id=eq.${p.id}&select=id`)).length+1;
      await insert('submittals',{project_id:p.id,submittal_no:'SUB-'+String(count).padStart(3,'0'),revision_no:0,description:desc,submitted_by_user_id:authUser.id,current_ball_in_court:'GC',status:'pending'});
      await loadLiveCollections(); renderPage('submittals'); renderNav();
    } catch(e){ alert(e.message); }
  };

  buildLogin();
  if(accessToken){ bootLive().catch(()=>{ localStorage.removeItem('tc_access_token'); localStorage.removeItem('tc_refresh_token'); }); }
})();
