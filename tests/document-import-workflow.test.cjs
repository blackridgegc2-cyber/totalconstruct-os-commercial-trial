const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto');
const data=require('../tc-import-data');
function harness(){
 let signedIn=false;
 const project={id:'p1',name:'Test Project',forecastCost:50,estimatedCost:50},state={costLines:[{projectId:'p1',forecast:50}],contracts:[]},events=[];
 const window={__TC_SUPABASE__:{url:'https://example.invalid',key:'public'},tcAuth:{getAccessToken:()=>signedIn?'test-session':''},tcSecurity:{allowed:()=>true},tcImportData:data,confirm:()=>true,alert:s=>events.push(s)};
 const context={window,state,crypto,structuredClone,currentProject:()=>project,document:{getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[],addEventListener:()=>{},documentElement:{}},MutationObserver:class{observe(){}disconnect(){}},addEventListener:()=>{},setTimeout:()=>{},setInterval:()=>{},save:()=>{},renderAll:()=>{},console,fetch:async()=>({ok:false,status:500,json:async()=>({message:'Denied'})})};
 vm.runInNewContext(fs.readFileSync('r1-import-cloud.js','utf8'),context);signedIn=true;
 vm.runInNewContext(fs.readFileSync('r1-document-import.js','utf8'),context);
 return {window,state,project,events,context,api:window.tcDocumentImport};
}
function entry(){const out=data.extractBudget([['Code','Description','Budget','Forecast'],['01','Design',100,0]]);return {...out,projectId:'p1',fileName:'budget.csv',storagePath:'p1/budgets/budget.csv',proposedLines:out.lines,reviewStatus:'Pending approval'}}
function successFetch(url,options){
 if(url.includes('/storage/'))return Promise.resolve({ok:true});
 const input=JSON.parse(options.body),saving=url.includes('tc_save_project_import');
 return Promise.resolve({ok:true,json:async()=>saving?{id:'cloud1',project_id:input.p_project_id,kind:input.p_kind,status:'draft',revision:1,payload:input.p_payload}:{id:'cloud1',project_id:'p1',kind:'budget',status:'approved',revision:2}});
}
test('failed or unauthorized cloud budget update leaves local budget and review pending',async()=>{
 const h=harness(),e=entry();h.context.fetch=async()=>({ok:false,status:403,json:async()=>({message:'Not authorized'})});
 assert.equal(await h.api.approveBudgetImport(e),false);assert.equal(h.project.forecastCost,50);assert.equal(h.state.costLines[0].forecast,50);assert.equal(e.reviewStatus,'Pending approval');assert.equal(e.applying,undefined);
});
test('successful import populates canonical visible cost fields and preserves zero forecast',async()=>{
 const h=harness(),e=entry();h.context.fetch=successFetch;
 assert.equal(await h.api.approveBudgetImport(e),true);assert.equal(h.state.costLines[0].code,'01');assert.equal(h.state.costLines[0].item,'Design');assert.equal(h.state.costLines[0].budget,100);assert.equal(h.state.costLines[0].forecast,0);assert.equal(h.project.forecastCost,0);assert.equal(h.state.costLines[0].cloudImportId,'cloud1');
});
test('Store Only uploads and persists a contract without invoking AI or reading its content',async()=>{
 const h=harness();h.context.fetch=successFetch;let scans=0,reads=0;h.window.tcAiProjectIntake={analyze:async()=>{scans++}};
 const rec=await h.api.importContract({name:'terms.pdf',type:'application/pdf',size:100,arrayBuffer:async()=>{reads++}},{aiRead:false});
 assert.equal(scans,0);assert.equal(reads,0);assert.equal(rec.status,'Stored Only');assert.equal(rec.cloudImportId,'cloud1');assert.equal(h.state.contracts.length,1);
});
test('AI scan failure retains the cloud source without applying project terms',async()=>{
 const h=harness();h.context.fetch=successFetch;h.window.tcAiProjectIntake={analyze:async()=>{throw Error('AI not connected')}};
 await assert.rejects(()=>h.api.importContract({name:'terms.pdf',type:'application/pdf',size:100}),/source retained/);assert.equal(h.state.contracts[0].aiStatus,'Scan failed — source retained');assert.equal(h.project.contract,undefined);
});
