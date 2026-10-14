import assert from "node:assert/strict";
import {test} from "node:test";
import handler from "./api/payapp-preflight.mjs";
const project="11111111-1111-4111-8111-111111111111",payapp="22222222-2222-4222-8222-222222222222",user="33333333-3333-4333-8333-333333333333";
const env={NEXT_PUBLIC_SUPABASE_URL:"https://example.supabase.co/",NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"test-public-key"};
async function run({method="POST",authorization="Bearer test-jwt",body={payapp_id:payapp,action:"submit_to_owner",expected_revision:1,request_id:"test-request-12345"},mock}={}){
 const original=globalThis.fetch,previous={NEXT_PUBLIC_SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY};
 Object.assign(process.env,env);let calls=[];
 globalThis.fetch=async(url,opts)=>{calls.push({url,authorization:opts?.headers?.Authorization});const data=mock?mock(url,opts):url.includes("/auth/v1/user")?{id:user}:url.includes("tc_owner_payapp_records")?[{id:payapp,project_id:project,status:"contractor_signed",revision:1,payload:{}}]:url.includes("project_members")?[{role:"contractor",active:true}]:[];return {ok:true,json:async()=>data}};
 const res={code:200,headers:{},status(n){this.code=n;return this},setHeader(k,v){this.headers[k]=v;return this},json(x){this.body=x;return this}};
 try{await handler({method,headers:{authorization},body},res);return {res,calls}}finally{globalThis.fetch=original;for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v}
}
test("preflight refuses unauthenticated requests without database calls",async()=>{const {res,calls}=await run({authorization:""});assert.equal(res.code,401);assert.equal(calls.length,0)});
test("preflight accepts standard bearer syntax and trims Supabase URL",async()=>{const {res,calls}=await run();assert.equal(res.code,200);assert.equal(res.body.allowed,false);assert.ok(calls[0].url==="https://example.supabase.co/auth/v1/user");assert.equal(calls[0].authorization,"Bearer test-jwt")});
test("preflight fails closed without project membership",async()=>{const {res}=await run({mock:url=>url.includes("/auth/v1/user")?{id:user}:url.includes("tc_owner_payapp_records")?[{id:payapp,project_id:project,status:"contractor_signed",revision:1,payload:{}}]:[]});assert.equal(res.code,403)});
test("preflight fails closed when financial and document evidence are absent",async()=>{const {res}=await run();assert.equal(res.body.allowed,false);assert.ok(res.body.blockers.includes("FINANCIAL_RECONCILIATION_REQUIRED"));assert.ok(res.body.blockers.includes("DOCUMENT_DIGEST"))});
test("preflight rejects malformed identifiers before contacting database",async()=>{const {res,calls}=await run({body:{payapp_id:"invalid",action:"submit_to_owner"}});assert.equal(res.code,400);assert.equal(calls.length,0)});
