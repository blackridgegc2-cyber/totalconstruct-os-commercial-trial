const fs=require('fs');
const path=require('path');
const root=process.cwd();
const required=[
 'index.html','live.js','r1-ui.js','r1-ui.css','r1-notifications.js','r1-workflows.js','r1-finance.js','r1-admin.js','r1-invite-secure.js','r1-operational2.js','r1-actions.js','r1-accounting.js','r1-field.js','r1-hardening.js','r1-cloud.js','r1-persistence.js','r1-security.js','r1-globalcreate.js','r1-role-test.js','r1-action-guard.js','r1-acceptance.js','r1-release-gate.js','r1-branding.js','r1-entry-ux.js','r1-professional-forms.js','r1-document-import.js','r1-template-library.js','r1-form-renderers.js','r1-module-forms.js','r1-print-bridge.js','r1-package-controls.js','r1-workflow-gates.js','r1-record-lifecycle.js','r1-change-controls.js','r1-subcontract-workflow.js','r1-verify.js','api/app.js','api/invite-user.js','api/health.js'
];
const errors=[];
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const requireTokens=(file,tokens,label=file)=>{const src=read(file);for(const token of tokens)if(!src.includes(token))errors.push(`${label} missing: ${token}`)};
for(const f of required)if(!fs.existsSync(path.join(root,f)))errors.push(`Missing required file: ${f}`);
const app=read('api/app.js');
for(const f of required.filter(x=>/^r1-.*\.js$/.test(x)))if(!app.includes('/'+f))errors.push(`api/app.js does not inject ${f}`);
for(const token of ['VERCEL_GIT_COMMIT_SHA','buildSha','pdfjs-dist','xlsx.full.min.js'])if(!app.includes(token))errors.push(`app bootstrap/import runtime missing: ${token}`);
requireTokens('r1-notifications.js',['window.tcNotify','window.tcConfirm','Controlled Action'],'professional notification system');
requireTokens('r1-professional-forms.js',['Project Administration / RFI','Project Administration / Submittal','Financial Controls / Pay Application','Closeout / Turnover'],'professional forms');
requireTokens('r1-document-import.js',['project-documents','extractContract','extractBudget','Contract Extraction Review','Budget Import Review'],'document import');
requireTokens('r1-template-library.js',['Company Forms & Customization','Customize / Upload Company Form','Upload Project Document + AI Read','Upload Document for AI Read','project-documents','company-templates','Notice / NOI','Subcontract / Work Order'],'template/customization library');
requireTokens('r1-module-forms.js',['Create, Customize & AI Document Tools','Add New','Customize Forms','Upload + AI Read','Preview / Print / Save PDF','Notice / NOI','Subcontract / Work Order'],'module creation/customization controls');
requireTokens('r1-package-controls.js',['Document Package Control','Executed Contract / Work Order','Issued Notice / NOI','Upload + AI Read','Missing','Expired','Hold'],'document package controls');
requireTokens('r1-workflow-gates.js',['Workflow Release Gate','Approve Pay App','Release Payment','Issue Contract / Work Order','Issue Notice / NOI','Required','Missing','Expired','Hold'],'workflow release gates');
requireTokens('r1-record-lifecycle.js',['recordLifecycles','separationOfDuties','financialApprovalThresholds','Independent Review Required','Approval Authority Required'],'record lifecycle');
requireTokens('r1-change-controls.js',['changeOrders','Pricing Complete','Internal Approved','Submitted to Owner','Owner Approved','Executed','Schedule Days'],'change controls');
requireTokens('r1-subcontract-workflow.js',['NOI → Subcontract Assembly','Scope Development','NOI Negotiation','NOI Executed','Subcontract Assembly','Ready to Issue','Add to Scope','Modify & Add','Deny / Exclude','Subcontract Readiness','AI suggestions never silently change contractual scope or amount'],'NOI/subcontract workflow');
requireTokens('r1-security.js',['pagePermissions','managementOnly','financials','payapps','rfis','submittals','schedule','drawings','meetings','daily','quality','safety','closeout','window.tcSecurity'],'security/navigation guard');
requireTokens('r1-cloud.js',['writeSnapshot','loadSnapshot','writeCompanySnapshot','loadCompanySnapshot','getCompanyId'],'cloud persistence');
requireTokens('r1-release-gate.js',['R1 Release Readiness','READY','BLOCKED','buildSha','STALE'],'release readiness');
requireTokens('r1-acceptance.js',['Training / Sample','writeSnapshot','loadSnapshot','Acceptance cleanup','Cross-project merge isolation'],'acceptance harness');
requireTokens('api/invite-user.js',['authorization','functions/v1/invite-employee','apikey'],'invite proxy');
if(read('api/invite-user.js').includes('SUPABASE_SERVICE_ROLE_KEY'))errors.push('invite-user must not require or expose the Supabase service role in Vercel');
for(const f of required.filter(x=>x.endsWith('.js'))){const src=read(f);try{new Function(src)}catch(e){errors.push(`${f} syntax parse failed: ${e.message}`)}}
if(errors.length){console.error('\nR1 STATIC CHECK FAILED');errors.forEach(e=>console.error(' - '+e));process.exit(1)}
console.log(`R1 static release gate passed (${required.length} required files checked).`);