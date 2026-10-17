'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {test}=require('node:test');
const source=fs.readFileSync(require('node:path').join(__dirname,'../r1-error-tracker.js'),'utf8');
function harness(statuses){
 const calls=[];
 const window={addEventListener(){},fetch:async (url,init)=>{calls.push({url,method:init?.method||'GET'});return {status:statuses.shift()??200}}};
 const storage={getItem:()=>null,setItem(){}};
 const document={addEventListener(){},visibilityState:'visible'};
 const location={href:'https://app.example.com/operations',origin:'https://app.example.com',pathname:'/operations'};
 const sandbox={window,location,document,navigator:{userAgent:'test',language:'en'},sessionStorage:storage,localStorage:storage,URL,setInterval(){},setTimeout(){},addEventListener(){}};
 vm.runInNewContext(source,sandbox,{filename:'r1-error-tracker.js'});
 return {fetch:window.fetch,calls};
}
test('transient same-origin GET is retried once',async()=>{
 const ctx=harness([503,200]);
 const r=await ctx.fetch('/api/projects',{method:'GET'});
 assert.equal(r.status,200);
 assert.equal(ctx.calls.length,2);
});
test('POST never retries, regardless of status',async()=>{
 const ctx=harness([503,200]);
 const r=await ctx.fetch('/api/payapps',{method:'POST'});
 assert.equal(r.status,503);
 assert.equal(ctx.calls.length,1);
});
test('cross-origin read and permanent failures never retry',async()=>{
 const cross=harness([503,200]);await cross.fetch('https://other.example.com/rest/v1/projects',{method:'GET'});assert.equal(cross.calls.length,1);
 const permanent=harness([500,200]);await permanent.fetch('/api/projects',{method:'GET'});assert.equal(permanent.calls.length,1);
});
