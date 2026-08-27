const fs=require('fs');
const path=require('path');
const root=process.cwd();
const required=[
 'index.html','live.js','r1-ui.js','r1-ui.css','r1-workflows.js','r1-finance.js','r1-admin.js','r1-invite-secure.js','r1-operational2.js','r1-actions.js','r1-accounting.js','r1-field.js','r1-hardening.js','r1-cloud.js','r1-persistence.js','r1-security.js','r1-globalcreate.js','r1-role-test.js','r1-action-guard.js','r1-acceptance.js','r1-release-gate.js','r1-verify.js','api/app.js','api/invite-user.js','api/health.js'
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
const finance=fs.readFileSync(path.join(root,'r1-finance.js'),'utf8');
for(const token of ['taxModel','companyHealth','capitalPlan','overhead'])if(!finance.includes(token))errors.push(`executive/CPA finance model missing: ${token}`);
const security=fs.readFileSync(path.join(root,'r1-security.js'),'utf8');
for(const token of ['pagePermissions','managementOnly','financials','payapps','rfis','submittals','schedule','drawings','meetings','daily','quality','safety','equipment','closeout','controllercpa','capitalplanning','storagevault','legalreview','access','window.tcSecurity','tcRestrictedMask','unrestrictPage'])if(!security.includes(token))errors.push(`security role/navigation guard missing: ${token}`);
if(security.includes("page.innerHTML='<div class=\"head\"><div><h1>Restricted"))errors.push('Restricted handling must not destructively replace page contents.');
const cloud=fs.readFileSync(path.join(root,'r1-cloud.js'),'utf8');
for(const token of ['form_instances','r1_project_snapshot','r1_company_snapshot','projectTracked','companyTracked','belongsToProject','mergeProjectSnapshot','mergeCompanySnapshot','writeSnapshot','loadSnapshot','writeCompanySnapshot','loadCompanySnapshot','getCompanyId','lastCloudWrite','lastCloudLoad','lastCompanyCloudWrite','lastCompanyCloudLoad'])if(!cloud.includes(token))errors.push(`cloud persistence/scope requirement missing: ${token}`);
for(const token of ["'accounting'","'equipment'","'moduleConfig'","'storage'","'vaultProjects'","'legalHolds'","'invites'","'audit'","'taxModel'","'companyHealth'","'capitalPlan'","'overhead'","'releaseGate'"])if(!cloud.includes(token))errors.push(`company snapshot missing corporate collection: ${token}`);
const projectList=(cloud.match(/const projectTracked=\[(.*?)\];/s)||[])[1]||'';
const companyList=(cloud.match(/const companyTracked=\[(.*?)\];/s)||[])[1]||'';
if(projectList.includes("'equipment'"))errors.push('Company asset/equipment register must not be project-scoped.');
if(!companyList.includes("'equipment'"))errors.push('Company asset/equipment register must persist at company scope.');
if(!companyList.includes("'audit'"))errors.push('Audit/access history must persist at company scope.');
for(const token of ["'taxModel'","'companyHealth'","'capitalPlan'","'overhead'","'releaseGate'"])if(!companyList.includes(token))errors.push(`Company assumption/release state missing from company persistence: ${token}`);
for(const token of ["'internalMessages'","'externalMessages'"])if(!projectList.includes(token))errors.push(`Project correspondence collection missing from project persistence: ${token}`);
for(const token of ['scheduleActivities','state.schedule.activities','snapState.scheduleActivities','data.payapp','state.payapps[prj.name]'])if(!cloud.includes(token))errors.push(`Project non-array persistence missing: ${token}`);
if(cloud.includes('for(const [k,v] of Object.entries(snap.state))state[k]=v'))errors.push('Cloud reopen must not overwrite entire multi-project state arrays.');
if(!cloud.includes("form_data->>company_id"))errors.push('Company snapshot load must be keyed to authenticated company ID, not current project.');
const persistence=fs.readFileSync(path.join(root,'r1-persistence.js'),'utf8');
for(const token of ['Test Cloud Save + Reopen','tcCloud.writeSnapshot','tcCloud.loadSnapshot','cloudTestStatus'])if(!persistence.includes(token))errors.push(`interactive persistence verification missing: ${token}`);
const acceptance=fs.readFileSync(path.join(root,'r1-acceptance.js'),'utf8');
for(const token of ['Training / Sample','writeSnapshot','loadSnapshot','acceptanceTest','Acceptance cleanup','tcRoleTest.apply','tcSecurity.allowed','Returned to actual login','window.tcAcceptance','otherTaskFingerprint','Cross-project merge isolation','finally'])if(!acceptance.includes(token))errors.push(`safe acceptance harness missing: ${token}`);
if(!acceptance.includes('/(training|sample)/i'))errors.push('Acceptance harness must block database writes outside Training / Sample projects.');
if(!acceptance.includes("writeSnapshot('R1 acceptance cleanup'"))errors.push('Acceptance harness must write a cleanup snapshot after any successful test write.');
const releaseGate=fs.readFileSync(path.join(root,'r1-release-gate.js'),'utf8');
for(const token of ['R1 Release Readiness','representativeWorkflows','projectSwitching','roleViews','realInvite','mobileField','acceptanceStatus','READY','BLOCKED','window.tcReleaseGate'])if(!releaseGate.includes(token))errors.push(`release readiness gate missing: ${token}`);
const ui=fs.readFileSync(path.join(root,'r1-ui.js'),'utf8');
for(const token of ['navIcons','dataset.icon','aria-expanded','tcNavScrim','Escape'])if(!ui.includes(token))errors.push(`responsive navigation behavior missing: ${token}`);
const uiCss=fs.readFileSync(path.join(root,'r1-ui.css'),'utf8');
for(const token of ['content:attr(data-icon)','max-width:700px','tc-nav-open #tcNavScrim','overflow-x:auto'])if(!uiCss.includes(token))errors.push(`responsive navigation CSS missing: ${token}`);
const globalCreate=fs.readFileSync(path.join(root,'r1-globalcreate.js'),'utf8');
for(const token of ['allowedRecords','can(rule[1])','financial_project','Your role does not have permission'])if(!globalCreate.includes(token))errors.push(`role-aware global Create authorization missing: ${token}`);
if(!globalCreate.includes("['Project / Opportunity',['all']]"))errors.push('Project / Opportunity creation must remain management-only.');
const roleTest=fs.readFileSync(path.join(root,'r1-role-test.js'),'utf8');
for(const token of ['View As','Actual Login','actualManager','permsByRole','window.tcRoleTest','TEST VIEW','Return to Actual Login','original.permissions.includes'])if(!roleTest.includes(token))errors.push(`role acceptance simulator missing: ${token}`);
if(!roleTest.includes("(currentUser?.permissions||[]).includes('all')"))errors.push('View As role simulator must originate from a management login.');
const jsFiles=required.filter(x=>x.endsWith('.js'));
for(const f of jsFiles){const src=fs.readFileSync(path.join(root,f),'utf8');try{new Function(src)}catch(e){errors.push(`${f} syntax parse failed: ${e.message}`)}}
if(errors.length){console.error('\nR1 STATIC CHECK FAILED');errors.forEach(e=>console.error(' - '+e));process.exit(1)}
console.log(`R1 static release gate passed (${required.length} required files checked).`);
