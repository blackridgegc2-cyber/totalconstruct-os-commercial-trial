module.exports = async function handler(req, res) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const root = String(rawUrl).trim().replace(/\/+$/, '').replace(/\/(rest\/v1|auth\/v1)$/i, '');
  let authReachable = false;
  let restReachable = false;
  let authStatus = null;
  let restStatus = null;
  try {
    if (root && key) {
      const a = await fetch(root + '/auth/v1/settings', { headers: { apikey: key } });
      authStatus = a.status;
      authReachable = a.ok;
      const r = await fetch(root + '/rest/v1/projects?select=id&limit=1', { headers: { apikey: key } });
      restStatus = r.status;
      restReachable = r.status < 500;
    }
  } catch (e) {}
  const coreReady = Boolean(root && key && authReachable && restReachable);
  res.setHeader('Cache-Control','no-store, max-age=0');
  res.status(coreReady ? 200 : 503).json({
    ok: coreReady,
    timestamp: new Date().toISOString(),
    supabaseUrlConfigured: Boolean(root),
    publishableKeyConfigured: Boolean(key),
    inviteServiceConfigured: Boolean(service),
    authReachable,
    authStatus,
    restReachable,
    restStatus
  });
};
