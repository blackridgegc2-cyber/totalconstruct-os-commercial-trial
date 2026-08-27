(() => {
  const cfg = window.__TC_SUPABASE__ || {};
  if (!cfg.url || !cfg.key) return;

  const root = String(cfg.url).trim().replace(/\/+$/, '').replace(/\/(rest\/v1|auth\/v1)$/i, '');
  const API = root + '/rest/v1';
  const token = () => localStorage.getItem('tc_access_token') || '';
  const headers = () => ({
    apikey: cfg.key,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
    ...(token() ? { Authorization: 'Bearer ' + token() } : {})
  });

  async function get(table, query='') {
    const r = await fetch(`${API}/${table}${query}`, { headers: headers() });
    const data = await r.json().catch(() => []);
    if (!r.ok) throw new Error((data && data.message) || `${table}: ${r.status}`);
    return data;
  }

  async function post(table, body) {
    const r = await fetch(`${API}/${table}`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body)
    });
    const data = await r.json().catch(() => []);
    if (!r.ok) throw new Error((data && (data.message || data.error_description || data.hint)) || `${table}: ${r.status}`);
    return data;
  }

  const internalRoles = ['executive','admin','accounting','pm','apm','superintendent','safety','qa_qc','employee'];

  async function inviteEmployee() {
    try {
      if (cfg.readOnly) {
        alert('Repair sandbox is read-only. The employee invite workflow is installed for testing, but it will not create or send a Blackridge invitation until the patch is promoted to production.');
        return;
      }

      const fullName = (prompt('Employee full name') || '').trim();
      if (!fullName) return;

      const email = (prompt('Employee email address') || '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('A valid employee email address is required.');

      const role = (prompt(`Role (${internalRoles.join(', ')})`, 'employee') || 'employee').trim().toLowerCase();
      if (!internalRoles.includes(role)) throw new Error('Please use one of the listed internal employee roles.');

      const existing = await get('user_invitations', `?email=eq.${encodeURIComponent(email)}&invitation_status=eq.pending&select=id,email,invitation_status&limit=1`);
      if (existing[0]) throw new Error('There is already a pending invitation for this email address.');

      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      await post('user_invitations', {
        email,
        full_name: fullName,
        role,
        invited_by: window.currentUser?.id || null,
        invitation_status: 'pending',
        account_status: 'not_created',
        permissions: {},
        sent_at: new Date().toISOString(),
        expires_at: expires
      });

      alert(`Employee invitation created for ${fullName} (${email}). Invitation status: Pending.`);
      if (typeof window.renderPage === 'function') window.renderPage('access');
    } catch (err) {
      alert(err.message || String(err));
    }
  }

  window.inviteEmployeeLive = inviteEmployee;

  function bindInviteButton() {
    const btn = document.getElementById('addUser');
    if (btn) btn.onclick = inviteEmployee;
  }

  const originalRenderPage = window.renderPage;
  if (typeof originalRenderPage === 'function') {
    window.renderPage = function(id) {
      const out = originalRenderPage.apply(this, arguments);
      if (id === 'access') setTimeout(bindInviteButton, 0);
      return out;
    };
  }

  setTimeout(bindInviteButton, 0);
})();
