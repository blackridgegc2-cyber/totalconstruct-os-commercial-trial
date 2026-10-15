const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function harness(){
 const state={project:'p1',token:'user-a',now:0},requests=[];
 const context={window:{__TC_SUPABASE__:{url:'https://example.invalid',key:'public'},tcAuth:{getAccessToken:()=>state.token}},currentProject:()=>({id:state.project}),fetch:()=>new Promise(resolve=>requests.push(resolve)),Date:{now:()=>state.now},setInterval:fn=>{state.tick=fn},addEventListener:()=>{},queueMicrotask,console:{warn:()=>{}}};
 vm.runInNewContext(fs.readFileSync('r1-project-permission-overrides.js','utf8'),context);
 return {state,requests,api:context.window.tcProjectPermissions,window:context.window,reply:(i,rows)=>requests[i]({ok:true,json:async()=>rows})};
}
const grants=api=>Array.from(api.permissions());
test('session and project switches immediately invalidate scoped permissions',async()=>{
 const h=harness(),p=h.api.refresh();h.reply(0,[{enabled:true,permission:'accounting'}]);await p;
 assert.deepEqual(grants(h.api),['accounting']);
 h.state.token='user-b';assert.deepEqual(grants(h.api),[]);
 const q=h.api.refresh();h.reply(1,[{enabled:true,permission:'drawings'}]);await q;
 assert.deepEqual(grants(h.api),['drawings']);
 h.state.project='p2';assert.deepEqual(grants(h.api),[]);
 h.state.token='';assert.deepEqual(grants(h.api),[]);
});
test('late responses cannot overwrite a newer session',async()=>{
 const h=harness(),a=h.api.refresh();h.state.token='user-b';const b=h.api.refresh();
 h.reply(1,[{enabled:true,permission:'drawings'}]);await b;
 h.reply(0,[{enabled:true,permission:'all'}]);await a;
 assert.deepEqual(grants(h.api),['drawings']);
 assert.equal(JSON.stringify(h.window.tcProjectGrants).includes('user-'),false);
});
test('expired or failed refreshes deny cached grants and accept revocation',async()=>{
 const h=harness(),p=h.api.refresh();h.reply(0,[{enabled:true,permission:'accounting'},{enabled:'false',permission:'all'}]);await p;
 assert.deepEqual(grants(h.api),['accounting']);
 h.state.now=30001;assert.deepEqual(grants(h.api),[]);
 const q=h.api.refresh();h.reply(1,[]);await q;assert.deepEqual(grants(h.api),[]);
 const r=h.api.refresh();h.requests[2]({ok:false,status:403});await r;assert.deepEqual(grants(h.api),[]);
});
test('logout during an in-flight request does not block subsequent login',async()=>{
 const h=harness(),p=h.api.refresh();h.state.token='';await h.api.refresh();
 h.state.token='user-a';const q=h.state.tick();assert.equal(h.requests.length,2);
 h.reply(1,[{enabled:true,permission:'rfi'}]);await q;
 h.reply(0,[{enabled:true,permission:'all'}]);await p;assert.deepEqual(grants(h.api),['rfi']);
});
