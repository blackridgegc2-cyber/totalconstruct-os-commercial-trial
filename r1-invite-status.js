(()=>{
  const cfg=window.__TC_SUPABASE__||{};
  const root=String(cfg.url||'').trim().replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,'');
  if(!root||!cfg.key)return;
  const API=root+'/rest/v1', FN=root+'/functions/v1';
  const roleLabels={executive:'Executive / Operations',admin:'Admin',accounting:'Accounting / Controller',pm:'Project Manager',apm:'APM / Project Engineer',superintendent:'Superintendent',safety:'Safety',qa_qc:'QA / QC',employee:'Employee',subcontractor:'Subcontractor',architect:'Architect',engineer:'Engineer',owner:'Owner / Client',lender:'Lender / Inspector'};
  let lastToken='';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function token(){return window.tcAuth?.getAccessToken?.()||localStorage.getItem('tc_access_token')||''}
  function headers(){const t=token();return {'apikey':cfg.key,'Authorization':'Bearer '+t,'Content-Type':'application/json'}}
  function label(i){
    if(i.accepted_at||String(i.invitation_status).toLowerCase()==='accepted')return'Invite Accepted';
    if(String(i.invitation_status).toLowerCase()==='failed')return'Invite Failed';
    if(i.expires_at&&new Date(i.expires_at)<new Date())return'Invite Expired';
    if(i.viewed_at||String(i.invitation_status).toLowerCase()==='viewed')return'Invite Viewed';
    if(['sent','pending'].includes(String(i.invitation_status).toLowerCase()))return'Invite Pending';
    return i.invitation_status||'Not Invited';
  }
  function cls(s){return s==='Invite Accepted'?'green':s==='Invite Failed'||s==='Invite Expired'?'red':s==='Invite Pending'||s==='Invite Viewed'?'amber':'gray'}
  async function claim(){
    const t=token();if(!t||t===lastToken)return;lastToken=t;
    try{await fetch(FN+'/claim-totalconstruct-invitation',{method:'POST',headers:headers(),body:'{}'});}catch(e){console.warn('Invitation claim',e)}
  }
  async function refresh(){
    const t=token();if(!t||!(window.currentUser?.permissions||[]).includes('all'))return;
    try{
      const r=await fetch(API+'/user_invitations?select=id,email,full_name,role,invitation_status,account_status,sent_at,viewed_at,accepted_at,expires_at,created_at&order=created_at.desc',{headers:headers()});
      if(!r.ok)throw new Error(await r.text());
      const rows=await r.json();
      state.invites=rows.map(i=>({id:i.id,name:i.full_name||'',email:i.email,role:roleLabels[i.role]||i.role,sent:i.sent_at?new Date(i.sent_at).toLocaleString():'—',viewed:i.viewed_at,accepted:i.accepted_at,expires:i.expires_at,status:label(i),serverConfirmed:true}));
      const tbody=document.querySelector('#tcInvitePanel tbody');
      if(tbody)tbody.innerHTML=state.invites.map(i=>`<tr><td>${esc(i.name||'—')}</td><td>${esc(i.email)}</td><td>${esc(i.role)}</td><td>${esc(i.sent)}</td><td><span class="status ${cls(i.status)}">${esc(i.status)}</span></td></tr>`).join('')||'<tr><td colspan="5" class="muted">No invitations sent yet.</td></tr>';
    }catch(e){console.warn('Invitation status refresh',e)}
  }
  window.tcInvitations={refresh,claim};
  const priorRender=window.renderPage;
  if(typeof priorRender==='function')window.renderPage=function(id,...args){const out=priorRender.call(this,id,...args);if(id==='access')setTimeout(refresh,80);return out};
  let tries=0;const boot=setInterval(async()=>{tries++;if(token()){clearInterval(boot);await claim();setTimeout(refresh,100)}else if(tries>30)clearInterval(boot)},250);
  addEventListener('focus',()=>{claim().then(refresh)});
})();
