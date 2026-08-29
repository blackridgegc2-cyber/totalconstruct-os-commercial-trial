(() => {
  const cfg = window.__TC_SUPABASE__ || {};
  const root = String(cfg.url || '').replace(/\/+$/, '').replace(/\/(rest\/v1|auth\/v1)$/i, '');
  const api = root ? root + '/rest/v1' : '';
  const fnBase = root ? root + '/functions/v1' : '';
  const roleLabels = {
    executive:'Executive / Super Admin', admin:'Administrator', accounting:'Accounting / Controller', pm:'Project Manager',
    apm:'APM / Project Engineer', superintendent:'Superintendent', safety:'Safety', qa_qc:'QA / QC', employee:'Employee',
    subcontractor:'Subcontractor', architect:'Architect', engineer:'Engineer', owner:'Owner / Client', lender:'Lender / Inspector'
  };

  function token(){ return localStorage.getItem('tc_access_token') || ''; }
  function h(extra={}){ return Object.assign({'apikey':cfg.key,'Authorization':'Bearer '+token(),'Content-Type':'application/json'},extra); }
  async function rest(path){
    const r=await fetch(api+'/'+path,{headers:h()});
    if(!r.ok) throw new Error(await r.text());
    return r.json();
  }
  async function invite(body){
    const r=await fetch(fnBase+'/invite-totalconstruct-user',{method:'POST',headers:h(),body:JSON.stringify(body)});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(data.error||'Invitation failed');
    return data;
  }
  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function fmt(d){if(!d)return '—'; try{return new Date(d).toLocaleString();}catch{return d;}}
  function statusClassR1(s){s=String(s||'').toLowerCase();if(s.includes('accepted')||s.includes('active'))return'green';if(s.includes('failed')||s.includes('expired')||s.includes('disabled'))return'red';if(s.includes('sent')||s.includes('pending')||s.includes('viewed'))return'amber';return'gray';}

  async function loadCompanyUsers(){
    const me = window.currentUser;
    if(!me?.id) return [];
    const memberships=await rest(`company_users?user_id=eq.${encodeURIComponent(me.id)}&active=eq.true&select=company_id&limit=1`);
    if(!memberships[0]) return [];
    const companyId=memberships[0].company_id;
    const links=await rest(`company_users?company_id=eq.${companyId}&select=user_id,active,is_primary,created_at&order=created_at.asc`);
    if(!links.length)return [];
    const ids=links.map(x=>x.user_id).join(',');
    const profiles=await rest(`profiles?id=in.(${ids})&select=id,email,display_name,first_name,last_name,title,role,active,created_at`);
    const byId=Object.fromEntries(profiles.map(p=>[p.id,p]));
    return links.map(l=>Object.assign({},byId[l.user_id]||{id:l.user_id},l));
  }
  async function loadInvitations(){
    try{return await rest('user_invitations?select=id,email,full_name,role,invitation_status,account_status,sent_at,viewed_at,accepted_at,expires_at,created_at&order=created_at.desc');}
    catch(e){console.warn('Invitation list unavailable',e);return [];}
  }

  window.addUser = async function(){
    const email=(prompt('Employee email address')||'').trim().toLowerCase();
    if(!email)return;
    if(!/^\S+@\S+\.\S+$/.test(email)){alert('Enter a valid email address.');return;}
    const full_name=(prompt('Employee full name')||'').trim();
    if(!full_name)return;
    const roleInput=(prompt('Role: executive, admin, accounting, pm, apm, superintendent, safety, qa_qc, employee','employee')||'employee').trim().toLowerCase();
    const internalRoles=['executive','admin','accounting','pm','apm','superintendent','safety','qa_qc','employee'];
    if(!internalRoles.includes(roleInput)){alert('Choose a valid internal employee role.');return;}
    try{
      await invite({email,full_name,role:roleInput,permissions:{source:'TotalConstruct Users / Access'}});
      if(typeof window.save==='function') window.save('Sent employee invitation',email);
      alert(`Invitation sent to ${email}.`);
      if(typeof window.renderAccess==='function') window.renderAccess();
    }catch(e){alert(e.message||String(e));}
  };

  window.renderAccess = async function(){
    const el=document.getElementById('access'); if(!el)return;
    if(!(window.allowed?.('all'))){el.innerHTML=window.head('Users / Access','Restricted')+'<div class="card">Administrator access required.</div>';return;}
    el.innerHTML=window.head('Users / Access','Company users, secure email invitations and activation status','<button class="btn primary" id="addUser">+ Invite Employee</button>')+'<div class="card">Loading users and invitations…</div>';
    document.getElementById('addUser')?.addEventListener('click',window.addUser);
    try{
      const [users,invitations]=await Promise.all([loadCompanyUsers(),loadInvitations()]);
      const userRows=users.map(u=>{
        const name=u.display_name||[u.first_name,u.last_name].filter(Boolean).join(' ')||u.email||'User';
        const status=u.active?'Active':'Inactive / Disabled';
        return `<tr><td><b>${esc(name)}</b></td><td>${esc(u.email||'—')}</td><td>${esc(roleLabels[u.role]||u.role||'—')}</td><td>${esc(u.title||'—')}</td><td><span class="status ${statusClassR1(status)}">${esc(status)}</span></td><td>${fmt(u.created_at)}</td></tr>`;
      });
      const inviteRows=invitations.map(i=>{
        const status=i.accepted_at?'Accepted / Active':i.viewed_at?'Viewed / Pending':(i.expires_at&&new Date(i.expires_at)<new Date())?'Expired':(i.invitation_status||'Pending');
        return `<tr><td><b>${esc(i.full_name||'—')}</b></td><td>${esc(i.email)}</td><td>${esc(roleLabels[i.role]||i.role)}</td><td><span class="status ${statusClassR1(status)}">${esc(status)}</span></td><td>${fmt(i.sent_at||i.created_at)}</td><td>${fmt(i.viewed_at)}</td><td>${fmt(i.accepted_at)}</td><td>${fmt(i.expires_at)}</td></tr>`;
      });
      el.innerHTML=window.head('Users / Access','Company users, secure email invitations and activation status','<button class="btn primary" id="addUser">+ Invite Employee</button>')+
        `<div class="card"><h3>Active / Existing Users</h3>${window.table(['User','Email','Company Role','Title','Account Status','Added'],userRows.length?userRows:['<tr><td colspan="6" class="muted">No company users found.</td></tr>'])}</div>`+
        `<div class="card section"><h3>Invitation Log</h3>${window.table(['Invitee','Email','Role','Invite Status','Sent','Viewed','Accepted','Expires'],inviteRows.length?inviteRows:['<tr><td colspan="8" class="muted">No invitations sent yet.</td></tr>'])}</div>`+
        `<div class="callout section"><b>Employee invitations now require an email address.</b> The invite remains visibly pending until the recipient accepts and activates the account. External Owner/Architect/Engineer/Sub/Lender identities remain separate from internal employee access.</div>`;
      document.getElementById('addUser')?.addEventListener('click',window.addUser);
    }catch(e){
      el.innerHTML=window.head('Users / Access','Invitation workflow')+`<div class="card"><b>Unable to load access data.</b><p>${esc(e.message||e)}</p></div>`;
    }
  };

  const originalOpenPage=window.openPage;
  if(typeof originalOpenPage==='function'){
    window.openPage=function(id){ originalOpenPage(id); if(id==='access') window.renderAccess(); };
  }
})();
