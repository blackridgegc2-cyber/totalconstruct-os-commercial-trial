// Authenticated read-only preflight. Never mutates payapp status or creates a signature.
// Uses the caller's JWT with Supabase RLS; no service-role key is exposed.
import {evaluateServerPayAppTransition} from "../payapp-server-adapter.mjs";
import {validatePayApplication} from "../payapp-reconciliation.mjs";
const send=(res,status,data)=>res.status(status).setHeader("Cache-Control","no-store").json(data);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export default async function handler(req,res){
 if(req.method!=="POST")return send(res,405,{error:"POST required"});
 const root=String(process.env.NEXT_PUBLIC_SUPABASE_URL||"").replace(/\\/$/,"");
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"";
 const token=String(req.headers.authorization||"").match(/^Bearer\\s+([^\\s]+)$/i)?.[1];
 if(!root||!key)return send(res,503,{error:"Database connection unavailable"});
 if(!token)return send(res,401,{error:"Authentication required"});
 const body=typeof req.body==="object"&&req.body!==null?req.body:{};
 if(!uuid.test(String(body.payapp_id||""))||typeof body.action!=="string")return send(res,400,{error:"Valid pay application ID and action required"});
 const headers={apikey:key,Authorization:"Bearer "+token};
 async function get(path){const r=await fetch(root+"/rest/v1/"+path,{headers});if(!r.ok)throw Error("Database access failed ("+r.status+")");return r.json()}
 try{
  const userResponse=await fetch(root+"/auth/v1/user",{headers});if(!userResponse.ok)return send(res,401,{error:"Invalid session"});
  const user=await userResponse.json();if(!uuid.test(String(user.id||"")))return send(res,401,{error:"Invalid session"});
  const records=await get("tc_owner_payapp_records?select=*&id=eq."+encodeURIComponent(body.payapp_id)+"&limit=1");
  const payapp=records[0];if(!payapp)return send(res,404,{error:"Pay application unavailable"});
  const memberships=await get("project_members?select=role,active&project_id=eq."+payapp.project_id+"&user_id=eq."+user.id+"&active=eq.true&limit=1");
  if(!memberships.length)return send(res,403,{error:"Project membership required"});
  const [docs,sigs,audits]=await Promise.all([
    get("tc_payapp_documents?select=*&payapp_id=eq."+payapp.id+"&project_id=eq."+payapp.project_id+"&order=created_at.desc&limit=5"),
    get("tc_signature_records?select=*&payapp_id=eq."+payapp.id+"&project_id=eq."+payapp.project_id+"&limit=100"),
    get("tc_signature_audit?select=*&order=recorded_at.desc&limit=100")
  ]);
  // The existing documents table has no verified SHA-256 field. Fail closed until
  // document-lock evidence is persisted by a trusted signing service.
  const document=docs.find(d=>d.id===payapp.payload?.locked_document_id)||null;
  const data=payapp.payload?.financialValidationInput;
  const financialValidation=data?validatePayApplication(data):{valid:false,issues:[{code:"CANONICAL_FINANCIAL_INPUT_MISSING"}]};
  const decision=evaluateServerPayAppTransition({action:body.action,payapp,authenticatedUser:{id:user.id,authorizedProjectId:payapp.project_id},projectRole:memberships[0].role,document,signatureRecords:sigs,auditRecords:audits,financialValidation,expectedRevision:body.expected_revision,requestId:body.request_id});
  return send(res,200,{allowed:decision.allowed,blockers:decision.blockers,nextStatus:decision.nextStatus,revision:payapp.revision,readOnly:true});
 }catch(e){console.error("payapp-preflight",e.message);return send(res,503,{error:"Release preflight unavailable; approval blocked"});}
}
