'use strict';
function send(res,status,obj){res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');return res.status(status).end(JSON.stringify(obj))}
async function authenticate(req){
 const base=String(process.env.NEXT_PUBLIC_SUPABASE_URL||'').replace(/\/+$/,'').replace(/\/(rest\/v1|auth\/v1)$/i,''),token=String(req.headers?.authorization||'');
 if(!base||!/^Bearer\s+\S+$/i.test(token))return null;
 const r=await fetch(base+'/auth/v1/user',{headers:{Authorization:token,apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||''},signal:AbortSignal.timeout(10000)});
 if(!r.ok)return null;const user=await r.json();return user?.id&&!user.is_anonymous?user:null;
}
function body(req){let value=req.body;try{if(typeof value==='string')value=JSON.parse(value)}catch{const e=Error('Request must contain valid JSON');e.status=400;throw e}if(!value||typeof value!=='object'||Array.isArray(value)){const e=Error('JSON object required');e.status=400;throw e}return value}
async function respond(instructions,content){
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_PROJECT_INTAKE_MODEL||'gpt-5-mini',instructions,input:[{role:'user',content}],text:{format:{type:'json_object'}},store:false}),signal:AbortSignal.timeout(90000)});
 const raw=await response.json();if(!response.ok){const e=Error('AI service could not complete this request. Retry or contact your administrator.');e.status=response.status===429?429:502;throw e}
 if(raw.status&&raw.status!=='completed'){const e=Error('AI response was incomplete. No extracted values were applied.');e.status=502;throw e}
 const text=raw.output_text||raw.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('');
 try{const out=JSON.parse(text);if(!out||Array.isArray(out)||typeof out!=='object')throw Error();return out}catch{const e=Error('AI returned invalid structured data. No values were applied.');e.status=502;throw e}
}
module.exports={send,authenticate,body,respond};
