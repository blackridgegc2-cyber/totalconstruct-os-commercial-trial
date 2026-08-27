const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const htmlPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const config = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
      buildSha: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || 'local'
    };
    const inject = `\n<link rel="stylesheet" href="/r1-ui.css">\n<script>window.__TC_SUPABASE__=${JSON.stringify(config)};<\/script>\n<script src="/live.js"><\/script>\n<script src="/r1-ui.js"><\/script>\n<script src="/r1-workflows.js"><\/script>\n<script src="/r1-finance.js"><\/script>\n<script src="/r1-admin.js"><\/script>\n<script src="/r1-invite-secure.js"><\/script>\n<script src="/r1-operational2.js"><\/script>\n<script src="/r1-actions.js"><\/script>\n<script src="/r1-accounting.js"><\/script>\n<script src="/r1-field.js"><\/script>\n<script src="/r1-hardening.js"><\/script>\n<script src="/r1-cloud.js"><\/script>\n<script src="/r1-persistence.js"><\/script>\n<script src="/r1-security.js"><\/script>\n<script src="/r1-globalcreate.js"><\/script>\n<script src="/r1-role-test.js"><\/script>\n<script src="/r1-action-guard.js"><\/script>\n<script src="/r1-acceptance.js"><\/script>\n<script src="/r1-release-gate.js"><\/script>\n<script src="/r1-branding.js"><\/script>\n<script src="/r1-entry-ux.js"><\/script>\n<script src="/r1-verify.js"><\/script>\n`;
    html = html.replace('</body>', inject + '</body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send('TotalConstruct bootstrap error: ' + err.message);
  }
};