const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const htmlPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const config = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      readOnly: process.env.VERCEL_ENV !== 'production' || process.env.VERCEL_GIT_COMMIT_REF !== 'main'
    };
    const safety = config.readOnly ? `
<script>
(() => {
  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    const isSupabaseDataWrite = /\\/rest\\/v1(?:\\/|$)/i.test(url) && !['GET','HEAD','OPTIONS'].includes(method);
    if (isSupabaseDataWrite) {
      console.warn('TotalConstruct repair sandbox: blocked database write', method, url);
      return Promise.resolve(new Response(JSON.stringify({message:'Repair sandbox is read-only. No Blackridge data was changed.'}), {status:423, headers:{'Content-Type':'application/json'}}));
    }
    return originalFetch(input, init);
  };
})();
<\/script>` : '';
    const inject = `\n<script>window.__TC_SUPABASE__=${JSON.stringify(config)};<\/script>${safety}\n<script src="/live.js"><\/script>\n`;
    html = html.replace('</body>', inject + '</body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send('TotalConstruct bootstrap error: ' + err.message);
  }
};
