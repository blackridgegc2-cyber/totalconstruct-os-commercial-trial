module.exports = async function handler(req, res) {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
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
  res.status(200).json({
    ok: Boolean(root && key && authReachable && restReachable),
    supabaseUrlConfigured: Boolean(root),
    publishableKeyConfigured: Boolean(key),
    authReachable,
    authStatus,
    restReachable,
    restStatus
  });
};
