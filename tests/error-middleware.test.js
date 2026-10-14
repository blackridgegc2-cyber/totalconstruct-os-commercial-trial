'use strict';
const assert=require('node:assert/strict');
const {createErrorMiddleware}=require('../api/_error-middleware');
async function main(){
const events=[];const middleware=createErrorMiddleware({version:'test',sink:x=>events.push(x)});
const headers={};let result=null;
const res={headersSent:false,setHeader:(k,v)=>headers[k]=v,status(n){this.code=n;return this},json(v){result=v;return this}};
middleware(new Error('DB timeout for Bearer super-secret-token and alice@example.com'),{url:'/api/payapps?token=secret',method:'POST'},res);
assert.equal(res.code,500);assert.match(headers['X-TC-Incident-ID'],/^TC-[a-f0-9-]{36}$/);
assert.equal(result.incident_id,headers['X-TC-Incident-ID']);
assert.equal(events.length,1);
assert.equal(events[0].route,'/api/payapps');
assert.doesNotMatch(JSON.stringify(events),/super-secret-token|alice@example.com|token=secret/);
assert.equal(events[0].state.method,'POST');
console.log('PASS: server incident IDs, safe response, async sink, redaction, route');
}
main().catch(e=>{console.error(e);process.exitCode=1});
