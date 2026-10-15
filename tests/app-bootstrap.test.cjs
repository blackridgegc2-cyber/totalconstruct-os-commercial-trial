const {test}=require('node:test'),assert=require('node:assert/strict');
const app=require('../api/app');
test('bootstrap normalizes service origin for every module instead of duplicating REST paths',()=>{
 const original=process.env.NEXT_PUBLIC_SUPABASE_URL;
 try{for(const suffix of ['/rest/v1/','/auth/v1','/']){
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.invalid'+suffix;
  const res={code:null,html:'',setHeader(){},status(value){this.code=value;return this},send(value){this.html=value}};
  app({method:'GET',url:'/'},res);assert.equal(res.code,200);
  const match=res.html.match(/window\.__TC_SUPABASE__=(\{[^<]+?\});/);assert.ok(match);
  assert.equal(JSON.parse(match[1]).url,'https://example.invalid');
 }}finally{if(original===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=original}
});
