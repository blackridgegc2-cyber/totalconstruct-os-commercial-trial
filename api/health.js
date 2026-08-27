module.exports = function handler(req, res) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  res.status(200).json({
    ok: Boolean(url && key),
    supabaseUrlConfigured: Boolean(url),
    publishableKeyConfigured: Boolean(key)
  });
};
