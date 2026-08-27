const fs=require('fs');
const path=require('path');
const root=process.cwd();
const required=[
 'index.html','live.js','r1-ui.js','r1-ui.css','r1-workflows.js','r1-finance.js','r1-admin.js','r1-invite-secure.js','r1-operational2.js','r1-actions.js','r1-accounting.js','r1-field.js','r1-hardening.js','r1-cloud.js','r1-persistence.js','r1-security.js','r1-globalcreate.js','r1-verify.js','api/app.js','api/invite-user.js','api/health.js'
];
const errors=[];
for(const f of required){if(!fs.existsSync(path.join(root,f)))errors.push(`Missing required file: ${f}`)}
const app=fs.readFileSync(path.join(root,'api/app.js'),'utf8');
for(const f of required.filter(x=>/^r1-.*\.js$/.test(x))){if(!app.includes('/'+f))errors.push(`api/app.js does not inject ${f}`)}
if(!app.includes('/r1-ui.css'))errors.push('api/app.js does not inject r1-ui.css');
const live=fs.readFileSync(path.join(root,'live.js'),'utf8');
for(const token of ['window.tcOpenRecordForm','window.addRfi','window.addSub','window.tcAuth','getAccessToken'])if(!live.includes(token))errors.push(`live.js missing ${token}`);
const invite=fs.readFileSync(path.join(root,'api/invite-user.js'),'utf8');
for(const token of ['authorization','functions/v1/invite-employee','apikey'])if(!invite.toLowerCase().includes(token.toLowerCase()))errors.push(`invite-user edge-function proxy missing token: ${token}`);
if(invite.includes('SUPABASE_SERVICE_ROLE_KEY'))errors.push('invite-user must not require or expose the Supabase service role in Vercel');
const secureInvite=fs.readFileSync(path.join(root,'r1-invite-secure.js'),'utf8');
for(const token of ['/api/invite-user','Authorization','Bearer ','serverConfirmed'])if(!secureInvite.includes(token))errors.push(`secure employee invite workflow missing: ${token}`);
if(secureInvite.includes('Read Only / Auditor'))errors.push('Employee invite must not map legal/audit reviewers to a normal employee role; use Legal / Audit Review instead.');
const field=fs.readFileSync(path.join(root,'r1-field.js'),'utf8');
for(const token of ['photo','offline','observation'])if(!field.toLowerCase().includes(token))errors.push(`field workflow missing ${token}`);
const admin=fs.readFileSync(path.join(root,'r1-admin.js'),'utf8');
for(const token of ['Company Vault','Legal Hold','dailyRestorePoints','disasterSnapshotDays','Workspace Configuration'])if(!admin.includes(token))errors.push(`admin/storage requirement missing: ${token}`);
const accounting=fs.readFileSync(path.join(root,'r1-accounting.js'),'utf8');
for(const token of ['QuickBooks','Plaid','401','depreci'])if(!accounting.toLowerCase().includes(token.toLowerCase()))errors.push(`accounting requirement missing: ${token}`);
const security=fs.readFileSync(path.join(root,'r1-security.js'),'utf8');
for(const token of ['controllercpa','capitalplanning','storagevault','legalreview','access'])if(!security.includes(token))errors.push(`security role guard missing protected area: ${token}`);
const cloud=fs.readFileSync(path.join(root,'r1-cloud.js'),'utf8');
for(const token of ['form_instances','r1_runtime_snapshot','writeSnapshot','loadSnapshot','lastCloudWrite','lastCloudLoad'])if(!cloud.includes(token))errors.push(`cloud persistence/reopen requirement missing: ${token}`);
const persistence=fs.readFileSync(path.join(root,'r1-persistence.js'),'utf8');
for(const token of ['Test Cloud Save + Reopen','tcCloud.writeSnapshot','tcCloud.loadSnapshot','cloudTestStatus'])if(!persistence.includes(token))errors.push(`interactive persistence verification missing: ${token}`);
const jsFiles=required.filter(x=>x.endsWith('.js'));
for(const f of jsFiles){const src=fs.readFileSync(path.join(root,f),'utf8');try{new Function(src)}catch(e){errors.push(`${f} syntax parse failed: ${e.message}`)}}
if(errors.length){console.error('\nR1 STATIC CHECK FAILED');errors.forEach(e=>console.error(' - '+e));process.exit(1)}
console.log(`R1 static release gate passed (${required.length} required files checked).`);
