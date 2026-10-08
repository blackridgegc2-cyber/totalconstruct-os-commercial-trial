'use strict';
const {validateBudgetCSV}=require('../r1-project-budget-import-core.cjs');
const LIMIT=5_000_000;
function send(res,status,data){res.status(status).setHeader('Cache-Control','no-store').setHeader('Content-Type','application/json').end(JSON.stringify(data))}
function authToken(req){return /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization||''))?.[1]||''}
async function supa(path,token,params={}){
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
 if(!base||!key)throw Error('Supabase authentication not configured');
 const r=await fetch(base.replace(/\/$/,'')+path,{...params,headers:{apikey:key,Authorization:'Bearer '+token,...params.headers}});
 if(!r.ok)throw Error('Database permission or connection failure ('+r.status+')');
 return r.json();
}
module.exports=async(req,res)=>{
 if(req.method!=='POST')return send(res,405,{error:'POST required'});
 const token=authToken(req);if(!token)return send(res,401,{error:'Authenticated session required'});
 let user;try{user=await supa('/auth/v1/user',token)}catch{return send(res,401,{error:'Invalid session'})}
 if(!user?.id)return send(res,401,{error:'Invalid session'});
 let body;try{body=typeof req.body==='string'?JSON.parse(req.body):req.body||{}}catch{return send(res,400,{error:'Invalid JSON'})}
 const {projectId,csv}=body;
 if(!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(projectId)))return send(res,400,{error:'Persisted project ID required'});
 if(typeof csv!=='string'||Buffer.byteLength(csv,'utf8')>LIMIT)return send(res,413,{error:'CSV must be at most 5 MB'});
 try{
  const projects=await supa('/rest/v1/projects?id=eq.'+encodeURIComponent(projectId)+'&select=id,company_id,job_number',token);
  if(projects.length!==1)return send(res,403,{error:'Project unavailable'});
  const p=projects[0];
  const members=await supa('/rest/v1/company_members?company_id=eq.'+encodeURIComponent(p.company_id)+'&user_id=eq.'+encodeURIComponent(user.id)+'&select=role',token);
  if(!members.length)return send(res,403,{error:'Company access required'});
  const result=validateBudgetCSV(csv,{projectCode:p.job_number||undefined});
  const sums={};for(const line of result.rows){const k=line.Agreement_Code+' / '+line.Cost_Type;sums[k]=(sums[k]||0)+line.budgetCents}
  return send(res,200,{valid:result.valid,accepted:result.rows.length,errors:result.errors.slice(0,200),totalCents:result.totalCents,breakdownCents:sums,reviewRequired:true,posted:false,projectId:p.id});
 }catch(e){console.error('budget-preview',e.message);return send(res,503,{error:'Secure budget validation unavailable; no data posted'})}
};
