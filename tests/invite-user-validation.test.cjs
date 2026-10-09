const test=require('node:test');
const assert=require('node:assert/strict');
const handler=require('../api/invite-user.js');
function invoke(body,authorization='Bearer test-token'){
 const req={method:'POST',headers:{authorization},body};
 let status=200;const res={status(n){status=n;return this},json(value){return {status,body:value}}};
 return handler(req,res);
}
const previous={};
test.before(()=>{for(const k of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])previous[k]=process.env[k];process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='test-public-key'});
test.after(()=>{for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v}});
test('rejects missing bearer token',async()=>{assert.equal((await invoke({email:'person@example.com'},'')).status,401)});
test('rejects invalid email without calling upstream',async()=>{assert.equal((await invoke({email:'invalid'})).status,400)});
test('rejects unsupported roles',async()=>{assert.equal((await invoke({email:'person@example.com',role:'super_admin'})).status,400)});
test('rejects unscoped external roles',async()=>{assert.equal((await invoke({email:'person@example.com',role:'lender'})).status,400)});
test('rejects owner invite without project',async()=>{assert.equal((await invoke({email:'person@example.com',invite_type:'owner'})).status,400)});
test('rejects subcontractor invite without subcontractor identifier',async()=>{assert.equal((await invoke({email:'person@example.com',invite_type:'subcontractor',project_id:'11111111-1111-4111-8111-111111111111'})).status,400)});
test('rejects conflicting external role',async()=>{assert.equal((await invoke({email:'person@example.com',invite_type:'owner',role:'admin',project_id:'11111111-1111-4111-8111-111111111111'})).status,400)});
test('rejects invalid project identifier',async()=>{assert.equal((await invoke({email:'person@example.com',invite_type:'owner',project_id:'other-project'})).status,400)});

test('rejects inactive project member before invitation',async()=>{
 const original=global.fetch;
 global.fetch=async url=>{
  if(String(url).includes('/auth/v1/user'))return {ok:true,json:async()=>({id:'22222222-2222-4222-8222-222222222222'})};
  if(String(url).includes('/rest/v1/project_members'))return {ok:true,json:async()=>[]};
  throw new Error('Unexpected invitation upstream call');
 };
 try{const result=await invoke({email:'person@example.com',role:'PM',project_id:'11111111-1111-4111-8111-111111111111'});assert.equal(result.status,403)}finally{global.fetch=original}
});
