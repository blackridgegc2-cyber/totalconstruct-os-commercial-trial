const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../api/project-intake.js'),'utf8');
async function test(){
 let response;
 const fetch=async(url,options)=>{
  if(url.includes('/auth/v1/user'))return {ok:true,json:async()=>({id:'test-user'})};
  return {ok:true,json:async()=>({output_text:JSON.stringify({data:{owner:'Orchard LLC',contractValue:'999999',budgetStatus:'Detailed Budget Required'},sources:{owner:{document:'contract.txt',quote:'Owner: Orchard LLC',confidence:0.97},contractValue:{document:'contract.txt',quote:'Contract amount: $999999',confidence:0.99}},warnings:[]})})};
 };
 const sandbox={module:{exports:{}},process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public-test',OPENAI_API_KEY:'test'}},fetch,console};
 vm.runInNewContext(src,sandbox,{filename:'project-intake.js'});
 const req={method:'POST',headers:{authorization:'Bearer test'},body:{files:[{name:'contract.txt',type:'text/plain',text:'Owner: Orchard LLC. Contract amount: $825000.'}]}};
 const res={status(n){this.code=n;return this},setHeader(){return this},end(s){response=JSON.parse(s);return this}};
 await sandbox.module.exports(req,res);
 assert.equal(res.code,200);
 assert.equal(response.data.owner,'Orchard LLC');
 assert.equal(response.data.contractValue,undefined,'Unverified amount must not enter project data');
 assert.equal(response.validation.verifiedFields,1);
 assert.equal(response.validation.withheldFields,1);
 assert.equal(response.reviewRequired,true);
 console.log('PASS: verified source retained, fabricated amount withheld, review required');
}
test().catch(e=>{console.error(e);process.exitCode=1});
