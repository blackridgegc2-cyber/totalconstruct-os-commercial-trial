const fs=require('fs');
const path=require('path');
const root=process.cwd();
const required=[
 'index.html','live.js','r1-ui.js','r1-ui.css','r1-workflows.js','r1-finance.js','r1-admin.js','r1-operational2.js','r1-actions.js','r1-accounting.js','r1-field.js','r1-hardening.js','r1-persistence.js','r1-verify.js','api/app.js','api/invite-user.js'
];
const errors=[];
for(const f of required){if(!fs.existsSync(path.join(root,f)))errors.push(`Missing required file: ${f}`)}
const app=fs.readFileSync(path.join(root,'api/app.js'),'utf8');
for(const f of required.filter(x=>/^r1-.*\.js$/.test(x))){if(!app.includes('/'+f))errors.push(`api/app.js does not inject ${f}`)}
if(!app.includes('/r1-ui.css'))errors.push('api/app.js does not inject r1-ui.css');
const live=fs.readFileSync(path.join(root,'live.js'),'utf8');
for(const token of ['window.tcOpenRecordForm','window.addRfi','window.addSub'])if(!live.includes(token))errors.push(`live.js missing ${token}`);
const invite=fs.readFileSync(path.join(root,'api/invite-user.js'),'utf8');
for(const token of ['SUPABASE_SERVICE_ROLE_KEY','authorization','admin','executive'])if(!invite.toLowerCase().includes(token.toLowerCase()))errors.push(`invite-user security check missing token: ${token}`);
const field=fs.readFileSync(path.join(root,'r1-field.js'),'utf8');
for(const token of ['photo','offline','observation'])if(!field.toLowerCase().includes(token))errors.push(`field workflow missing ${token}`);
const admin=fs.readFileSync(path.join(root,'r1-admin.js'),'utf8');
for(const token of ['Company Vault','Legal Hold','dailyRestorePoints','disasterSnapshotDays','Workspace Configuration'])if(!admin.includes(token))errors.push(`admin/storage requirement missing: ${token}`);
const accounting=fs.readFileSync(path.join(root,'r1-accounting.js'),'utf8');
for(const token of ['QuickBooks','Plaid','401','depreci'])if(!accounting.toLowerCase().includes(token.toLowerCase()))errors.push(`accounting requirement missing: ${token}`);
const jsFiles=required.filter(x=>x.endsWith('.js'));
for(const f of jsFiles){const src=fs.readFileSync(path.join(root,f),'utf8');try{new Function(src)}catch(e){errors.push(`${f} syntax parse failed: ${e.message}`)}}
if(errors.length){console.error('\nR1 STATIC CHECK FAILED');errors.forEach(e=>console.error(' - '+e));process.exit(1)}
console.log(`R1 static release gate passed (${required.length} required files checked).`);
