(() => {
  const cfg = window.__TC_SUPABASE__ || {};
  let trainingMode = false;

  const css = document.createElement('style');
  css.textContent = `
    .project-banner{height:118px;border:1px solid #2c3c47;box-shadow:0 10px 28px rgba(0,0,0,.18)}
    .project-banner .overlay{padding:16px 18px;background:linear-gradient(90deg,rgba(11,18,23,.88),rgba(11,18,23,.48),rgba(11,18,23,.18))}
    .project-banner h2{font-size:24px}.project-banner .meta{font-size:12px}
    #bannerImageBtn{padding:6px 9px;font-size:11px;align-self:flex-start;background:rgba(255,255,255,.92)}
    .tc-training-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 8px;border-radius:999px;background:#f4e8da;color:#84511f;font-size:11px;font-weight:800;margin-left:8px}
    .tc-viewas{background:#24333f;color:#fff;border:1px solid #465562;border-radius:8px;padding:7px 9px;font-size:12px;max-width:190px}
    .tc-project-link{color:inherit;text-decoration:none;border-bottom:1px dotted #b9792f;cursor:pointer}
    .tc-project-link:hover{color:#8d5724}
    .tc-helpbar{display:flex;gap:7px;flex-wrap:wrap;margin:0 0 12px}
    .tc-training-panel{background:linear-gradient(145deg,#16232d,#223440);color:#eef3f6;border-radius:14px;padding:14px;border:1px solid #ffffff12}
    .tc-training-panel h3{margin:0 0 8px}.tc-training-panel button{margin:4px 5px 0 0}
  `;
  document.head.appendChild(css);

  function enterTraining(userId='u1') {
    trainingMode = true;
    try { currentUser = state.users.find(u=>u.id===userId) || state.users[0]; } catch(e) { return; }
    const login = document.getElementById('login'), app = document.getElementById('app');
    if(login) login.classList.add('hidden'); if(app) app.classList.remove('hidden');
    const av=document.getElementById('userAvatar'); if(av) av.textContent=currentUser.initials;
    syncProjectSelect();
    const sel=document.getElementById('projectSelect'); if(sel && [...sel.options].some(o=>o.value==='training')) sel.value='training';
    installViewAs(); renderAll(); refreshBanner(); decorateProjectLinks(); addHelpBar();
  }

  function installTrainingEntry() {
    const card=document.querySelector('.login-card'); if(!card || document.getElementById('tcTrainingBtn')) return;
    const btn=document.createElement('button'); btn.id='tcTrainingBtn'; btn.className='btn bronze wide'; btn.textContent='Open Training / Sample Project';
    const note=document.createElement('div'); note.className='muted small'; note.textContent='Safe training mode. Sample data only; excluded from live company/project reporting.';
    btn.onclick=()=>enterTraining('u1');
    card.append(btn,note);
  }

  function installViewAs() {
    if(!trainingMode) return;
    const header=document.querySelector('header'); if(!header || document.getElementById('tcViewAs')) return;
    const sel=document.createElement('select'); sel.id='tcViewAs'; sel.className='tc-viewas';
    sel.innerHTML=state.users.map(u=>`<option value="${u.id}" ${u.id===currentUser.id?'selected':''}>View as: ${u.role}</option>`).join('');
    sel.onchange=()=>{ currentUser=state.users.find(u=>u.id===sel.value)||currentUser; const a=document.getElementById('userAvatar');if(a)a.textContent=currentUser.initials; syncProjectSelect(); const ps=document.getElementById('projectSelect');if(ps&&[...ps.options].some(o=>o.value==='training'))ps.value='training'; renderAll();refreshBanner();decorateProjectLinks();addHelpBar(); };
    const avatar=document.getElementById('userAvatar'); header.insertBefore(sel,avatar);
  }

  function goProject(id, page='home') {
    const sel=document.getElementById('projectSelect'); if(sel && [...sel.options].some(o=>o.value===id)) sel.value=id;
    openPage(page); refreshBanner(); decorateProjectLinks(); addHelpBar();
  }
  window.tcGoProject = goProject;

  function decorateProjectLinks() {
    try {
      const ps=visibleProjects();
      document.querySelectorAll('table tr').forEach(tr=>{
        const text=tr.innerText||''; const p=ps.find(x=>text.includes(x.name)); if(!p) return;
        tr.classList.add('clickable'); tr.dataset.tcProject=p.id;
        const cells=[...tr.querySelectorAll('td')];
        const c=cells.find(td=>td.innerText.includes(p.name));
        if(c && !c.querySelector('.tc-project-link')) c.innerHTML=c.innerHTML.replace(p.name,`<span class="tc-project-link">${p.name}</span>`);
      });
      document.querySelectorAll('.project-card').forEach(card=>{const p=ps.find(x=>(card.innerText||'').includes(x.name));if(p){card.classList.add('clickable');card.dataset.tcProject=p.id;}});
    } catch(e) { console.warn('Project link decoration skipped',e); }
  }
  document.addEventListener('click',e=>{const t=e.target.closest('[data-tc-project],[data-project]'); if(!t)return; const id=t.dataset.tcProject||t.dataset.project; if(id){e.preventDefault();goProject(id,'home');}});

  function addHelpBar() {
    const main=document.getElementById('main'); if(!main) return;
    const page=document.querySelector('.page.active'); if(!page || page.querySelector('.tc-helpbar')) return;
    const bar=document.createElement('div');bar.className='tc-helpbar';
    bar.innerHTML=`<button class="btn" type="button" data-help="page">? Help for this page</button>${trainingMode?'<span class="tc-training-badge">TRAINING / SAMPLE DATA</span>':''}`;
    page.prepend(bar);
    bar.querySelector('[data-help]')?.addEventListener('click',()=>alert(`Training help: ${currentPage}\n\nUse hover/tap ? prompts for field definitions. Guided tutorials will walk through the same controls used in live projects, but training actions remain isolated from production data.`));
  }

  const oldRenderPage = window.renderPage || renderPage;
  window.renderPage = function(id){ oldRenderPage(id); setTimeout(()=>{decorateProjectLinks();addHelpBar(); if(id==='access') enhanceAccess(); if(id==='home'&&trainingMode) enhanceTrainingHome();},0); };
  try { renderPage = window.renderPage; } catch(e) {}

  function enhanceTrainingHome(){
    const page=document.getElementById('home'); if(!page || page.querySelector('.tc-training-panel'))return;
    const panel=document.createElement('div');panel.className='tc-training-panel section';
    panel.innerHTML=`<h3>Training Center</h3><div class="small">Practice workflows using sample data. Switch roles above to see the system exactly as that role should see it.</div><button class="btn" data-tutorial="rfis">Learn RFIs</button><button class="btn" data-tutorial="submittals">Learn Submittals</button><button class="btn" data-tutorial="schedule">Learn Schedule</button><button class="btn" data-tutorial="daily">Learn Daily Reports</button><button class="btn" data-tutorial="financials">Learn Cost Controls</button>`;
    page.append(panel);
    panel.querySelectorAll('[data-tutorial]').forEach(b=>b.onclick=()=>{openPage(b.dataset.tutorial);setTimeout(()=>alert(`Guided tutorial mode: ${b.textContent}.\n\nThis module is using sample project data and cannot affect live reporting.`),30)});
  }

  async function liveInvites(){
    if(trainingMode || !window.__TC_SUPABASE__ || !window.__TC_SUPABASE__.url) return [];
    try {
      const root=String(cfg.url).replace(/\/+$/,'').replace(/\/rest\/v1$/i,'');
      const token=localStorage.getItem('tc_access_token')||'';
      const r=await fetch(root+'/rest/v1/user_invitations?select=id,email,full_name,role,invitation_status,account_status,sent_at,viewed_at,accepted_at,expires_at&order=created_at.desc',{headers:{apikey:cfg.key,Authorization:'Bearer '+token}});
      return r.ok?await r.json():[];
    } catch(e){return []}
  }

  async function sendInvite(){
    if(cfg.readOnly){alert('Sandbox verification mode: invitation email sending is intentionally disabled here. It will be enabled only after this verified patch is promoted to production.');return;}
    const full_name=prompt('Employee full name'); if(!full_name)return;
    const email=prompt('Employee email address'); if(!email)return;
    const role=(prompt('Role: executive, admin, accounting, pm, apm, superintendent, safety, qa_qc, employee','employee')||'employee').trim().toLowerCase();
    const root=String(cfg.url).replace(/\/+$/,'').replace(/\/rest\/v1$/i,'');
    const token=localStorage.getItem('tc_access_token')||'';
    const r=await fetch(root+'/functions/v1/invite-employee',{method:'POST',headers:{apikey:cfg.key,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({full_name,email,role})});
    const data=await r.json().catch(()=>({})); if(!r.ok){alert(data.error||'Invitation failed');return;} alert('Invitation sent to '+email); enhanceAccess(true);
  }
  window.tcSendInvite=sendInvite;

  async function enhanceAccess(force=false){
    const page=document.getElementById('access'); if(!page || (!force&&page.dataset.tcEnhanced==='1'))return; page.dataset.tcEnhanced='1';
    const btn=document.getElementById('addUser'); if(btn){btn.textContent=cfg.readOnly?'+ Preview Invite Employee':'+ Invite Employee';btn.onclick=sendInvite;}
    const invites=await liveInvites(); if(!invites.length){if(cfg.readOnly){const c=document.createElement('div');c.className='callout section';c.textContent='Invite status is production-backed. Sandbox is read-only and will not send or create invitation records.';page.append(c);}return;}
    const wrap=document.createElement('div');wrap.className='card section';wrap.innerHTML='<h3>Employee Invitation Status</h3><div class="table-wrap"><table><tr><th>Name</th><th>Email</th><th>Role</th><th>Invite</th><th>Account</th><th>Sent</th><th>Viewed</th><th>Accepted</th><th>Expires</th></tr>'+invites.map(i=>`<tr><td>${i.full_name||'—'}</td><td>${i.email}</td><td>${i.role}</td><td><span class="status ${statusClass(i.invitation_status)}">${i.invitation_status}</span></td><td>${i.account_status}</td><td>${i.sent_at?new Date(i.sent_at).toLocaleString():'—'}</td><td>${i.viewed_at?new Date(i.viewed_at).toLocaleString():'—'}</td><td>${i.accepted_at?new Date(i.accepted_at).toLocaleString():'—'}</td><td>${i.expires_at?new Date(i.expires_at).toLocaleDateString():'—'}</td></tr>`).join('')+'</table></div>';page.append(wrap);
  }

  setTimeout(()=>{installTrainingEntry();decorateProjectLinks();addHelpBar();},0);
})();