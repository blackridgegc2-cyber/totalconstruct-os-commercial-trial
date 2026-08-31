const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  try {
    const htmlPath = path.join(process.cwd(), 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    const config = {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
    };
    const inject = `\n<script>window.__TC_SUPABASE__=${JSON.stringify(config)};<\/script>\n<script src="/live.js"><\/script>\n<script src="/enterprise-forms.js"><\/script>\n<script src="/enterprise-forms-v2.js"><\/script>\n<script src="/enterprise-forms-v3.js"><\/script>\n<script src="/enterprise-forms-v4.js"><\/script>\n<script src="/enterprise-forms-v5.js"><\/script>\n<script src="/enterprise-forms-v6.js"><\/script>\n<script src="/enterprise-forms-v7.js"><\/script>\n<script src="/enterprise-forms-v8.js"><\/script>\n<script src="/enterprise-forms-v9.js"><\/script>\n`;
    html = html.replace('</body>', inject + '</body>');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('X-TotalConstruct-Form-System', 'CONTROLLED-TEMPLATE-APPROVAL-V1');
    res.status(200).send(html);
  } catch (err) {
    res.status(500).send('TotalConstruct bootstrap error: ' + err.message);
  }
};