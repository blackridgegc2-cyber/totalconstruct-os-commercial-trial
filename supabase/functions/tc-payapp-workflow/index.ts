import { createClient } from 'npm:@supabase/supabase-js@2.99.1';
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1';
import { appendCertificate, assertNoDigitalSeal } from './certificate.mjs';
const origin='https://totalconstruct-os-commercial-trial.vercel.app';
const hash=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes).buffer))).map(v=>v.toString(16).padStart(2,'0')).join('');
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
Deno.serve(async req=>{
 const requestOrigin=req.headers.get('origin')||origin;
 const allowed=requestOrigin===origin||/^https:\/\/totalconstruct-os-commercial-trial-[a-z0-9-]+\.vercel\.app$/.test(requestOrigin);
 const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':allowed?requestOrigin:origin,'Access-Control-Allow-Headers':'authorization,content-type,apikey','Vary':'Origin','Cache-Control':'no-store'};
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Method not allowed'},405);
 try{
  const jwt=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!jwt)return reply({error:'Authentication required'},401);
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await db.auth.getUser(jwt);
  if(authError||!user)return reply({error:'Invalid session'},401);
  // Strict revocation: an otherwise unexpired JWT from a revoked session is rejected.
  const payload=JSON.parse(atob(jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  const {data:activeSession,error:sessionError}=await db.schema('public').rpc('tc_payapp_session_active',{p_user:user.id,p_session:payload.session_id});
  if(sessionError||activeSession!==true)return reply({error:'Session is no longer active'},401);
  const body=await req.json();
  if(!uuid(body.projectId))return reply({error:'Valid project required'},400);
  const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await db.rpc(name,args);if(error)throw error;return data};
  const list=await rpc('tc_payapp_workflow_list',{p_actor:user.id,p_project:body.projectId});
  const download=async(path:string)=>{const {data,error}=await db.storage.from('tc-payapp-private').download(path);if(error||!data)throw Error('PDF unavailable');return new Uint8Array(await data.arrayBuffer())};
  if(body.action==='list')return reply(list);
  if(body.action==='hold'){
   if(!uuid(body.payappId)||body.holdId&&!uuid(body.holdId))return reply({error:'Valid pay application/hold required'},400);
   return reply({hold:await rpc('tc_payapp_billing_hold',{p_actor:user.id,p_project:body.projectId,p_payapp:body.payappId,p_line:String(body.line||''),p_reason:String(body.reason||'').slice(0,4000),p_hold:body.holdId||null,p_clear:body.clear===true})});
  }
  if(body.action==='prepare'){
   if(list.role!=='contractor')return reply({error:'Contractor access required'},403);
   if(![body.payappId,body.documentId,body.ownerId,body.lenderId].every(uuid))return reply({error:'Select the application, final PDF, project owner and lender'},400);
   const {data:doc,error}=await db.from('tc_payapp_documents').select('storage_path').eq('id',body.documentId).eq('project_id',body.projectId).eq('payapp_id',body.payappId).eq('kind','signature_pdf').single();
   if(error||!doc)return reply({error:'Final PDF not found'},404);
   const bytes=await download(doc.storage_path),sourceHash=await hash(bytes);
   // Parse before locking: corrupt/encrypted files cannot start the workflow.
   assertNoDigitalSeal(await PDFDocument.load(bytes,{ignoreEncryption:false}));
   const workflow=await rpc('tc_payapp_workflow_prepare',{p_actor:user.id,p_project:body.projectId,p_payapp:body.payappId,p_document:body.documentId,p_owner:body.ownerId,p_lender:body.lenderId,p_hash:sourceHash});
   return reply({workflow});
  }
  const w=list.workflows.find((x:any)=>x.id===body.workflowId);
  if(!w)return reply({error:'Workflow not found in this project'},404);
  if(body.action==='open'){
   const bytes=await download(w.current_path);if(await hash(bytes)!==w.current_sha256)return reply({error:'Document integrity check failed'},409);
   const {data,error}=await db.storage.from('tc-payapp-private').createSignedUrl(w.current_path,90);
   if(error)throw error;return reply({url:data.signedUrl,sha256:w.current_sha256});
  }
  if(!['sign','send_owner','send_lender','approve','return'].includes(body.action)||!uuid(body.requestId)||!Number.isInteger(body.version))return reply({error:'Valid action, request identifier and current version required'},400);
  // Return the committed result after retry without generating another PDF.
  const replay=w.events.find((e:any)=>e.request_id===body.requestId);
  if(replay){if(replay.actor_id!==user.id||replay.action!==body.action)return reply({error:'Request identifier reused'},409);return reply({workflow:w,replayed:true})}
  const actor=['contractor_signature','contractor_route'].includes(w.stage)?w.contractor_id:['owner_signature','owner_route'].includes(w.stage)?w.owner_id:w.stage==='lender_approval'?w.lender_id:null;
  if(actor!==user.id)return reply({error:'This action belongs to another signer'},403);
  if(body.version!==w.version)return reply({error:'Application changed; refresh before continuing'},409);
  let resultHash='',resultPath='';
  if(['sign','approve'].includes(body.action)){
   const name=String(body.signerName||'').trim();if(body.consent!==true||name.length<3||name.length>120)return reply({error:'Full legal name and explicit consent required'},400);
   if(/[^\x20-\x7e]/.test(name))return reply({error:'Use Latin characters for the signature certificate name'},400);
   const bytes=await download(w.current_path);if(await hash(bytes)!==w.current_sha256)return reply({error:'Document integrity check failed'},409);
   const signed=await appendCertificate(bytes,{payappId:w.payapp_id,workflowId:w.id,name,email:user.email,capacity:w.stage==='lender_approval'?'Lender funding approval':w.stage==='owner_signature'?'Owner':'Contractor',at:new Date().toISOString(),intent:body.action==='approve'?'approve':'sign',originalHash:w.source_sha256,reviewedHash:w.current_sha256},{PDFDocument,StandardFonts,rgb});
   resultHash=await hash(signed);resultPath=body.projectId+'/'+w.payapp_id+'/native/'+body.requestId+'-'+crypto.randomUUID()+'.pdf';
   const {error}=await db.storage.from('tc-payapp-private').upload(resultPath,signed,{contentType:'application/pdf',upsert:false});if(error)throw error;
  }
  // A failed DB transaction may have an indeterminate network outcome. Never delete
  // the uploaded artifact here: a successful commit may already reference it.
  const workflow=await rpc('tc_payapp_workflow_apply',{p_actor:user.id,p_workflow:w.id,p_expected:body.version,p_request:body.requestId,p_action:body.action,p_name:String(body.signerName||'').trim(),p_consent:body.consent===true,p_source_hash:w.current_sha256,p_result_hash:resultHash,p_result_path:resultPath,p_reason:String(body.reason||'').slice(0,4000)});
  return reply({workflow});
 }catch(error){const e=error as {code?:string,message?:string};const code=String(e?.code||'');return reply({error:String(e?.message||'Pay-app operation failed')},code==='42501'?403:code==='40001'||code==='23514'||code==='23505'?409:400)}
});
