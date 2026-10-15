import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const internalRoles=new Set(["executive","admin","accounting","pm","apm","superintendent","safety","qa_qc","employee"]);
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return new Response(JSON.stringify({error:"Method not allowed"}),{status:405,headers:{...cors,"Content-Type":"application/json"}});
 const url=Deno.env.get("SUPABASE_URL")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,anonKey=Deno.env.get("SUPABASE_ANON_KEY")!,authHeader=req.headers.get("Authorization")||"";
 const admin=createClient(url,serviceKey,{auth:{persistSession:false}}),callerClient=createClient(url,anonKey,{global:{headers:{Authorization:authHeader}},auth:{persistSession:false}});
 try{
  const{data:callerData,error:callerErr}=await callerClient.auth.getUser();if(callerErr||!callerData.user)throw new Error("Unauthorized");const callerId=callerData.user.id;
  const{data:callerProfile}=await admin.from("profiles").select("id,role,active").eq("id",callerId).maybeSingle();if(!callerProfile||!callerProfile.active||!["executive","admin"].includes(String(callerProfile.role)))return new Response(JSON.stringify({error:"Administrator access required"}),{status:403,headers:{...cors,"Content-Type":"application/json"}});
  const body=await req.json(),cleanEmail=String(body.email||"").trim().toLowerCase(),cleanName=String(body.full_name||"").trim(),projectId=body.project_id||null,subcontractorId=body.subcontractor_id||null,requestedType=String(body.invite_type||"").trim().toLowerCase(),inviteType=requestedType==="owner"?"owner":(subcontractorId?"subcontractor":"employee"),cleanRole=inviteType==="subcontractor"?"subcontractor":inviteType==="owner"?"owner":String(body.role||"employee").trim();
  let accessPlan:any=null;
  if(body.access_plan){
   const {data:plan,error:planErr}=await admin.from("tc_invite_access_plans").select("*").eq("id",body.access_plan).eq("prepared_by",callerId).eq("status","pending").gt("expires_at",new Date().toISOString()).maybeSingle();
   if(planErr||!plan||plan.email!==cleanEmail||plan.role!==cleanRole)throw new Error("Invitation access plan is invalid or expired");
   const {data:membership}=await admin.from("company_users").select("company_id").eq("company_id",plan.company_id).eq("user_id",callerId).eq("active",true).maybeSingle();
   if(!membership)throw new Error("Administrator is outside the invitation company");
   const {data:existing}=await admin.from("profiles").select("id").eq("email",cleanEmail).limit(1);
   if(existing?.length)throw new Error("This email already has an account. Edit the existing user's project access instead.");
   accessPlan=plan;
  }
  if(!cleanEmail||!cleanEmail.includes("@"))throw new Error("A valid email address is required");if(inviteType==="employee"&&!internalRoles.has(cleanRole)&&!accessPlan)throw new Error("Invalid internal employee role");if(["subcontractor","owner"].includes(inviteType)&&!projectId)throw new Error("Project is required for an external portal invitation");
  const{data:companyRow}=await admin.from("company_users").select("company_id").eq("user_id",callerId).eq("active",true).order("is_primary",{ascending:false}).limit(1).maybeSingle();if(!companyRow)throw new Error("No active company assignment found for administrator");
  if(accessPlan&&companyRow.company_id!==accessPlan.company_id)companyRow.company_id=accessPlan.company_id;
  if(projectId){const{data:prj}=await admin.from("projects").select("id,company_id").eq("id",projectId).eq("company_id",companyRow.company_id).maybeSingle();if(!prj)throw new Error("Project is not part of this company");}
  if(inviteType==="subcontractor"){const{data:sub}=await admin.from("subcontractors").select("id,company_id,name").eq("id",subcontractorId).eq("company_id",companyRow.company_id).maybeSingle();if(!sub)throw new Error("Subcontractor is not part of this company");}
  const{data:existingInvite}=await admin.from("user_invitations").select("id,invitation_status,account_status").eq("email",cleanEmail).eq("project_id",projectId).in("invitation_status",["pending","sent","viewed"]).order("created_at",{ascending:false}).limit(1).maybeSingle();if(existingInvite)return new Response(JSON.stringify({error:"An active invitation already exists for this email/project",invitation:existingInvite}),{status:409,headers:{...cors,"Content-Type":"application/json"}});
  const expiresAt=new Date(Date.now()+7*24*60*60*1000).toISOString(),permissions=inviteType==="subcontractor"?{portal:true,subcontractor_id:subcontractorId}:inviteType==="owner"?{owner_portal:true}:{},now=new Date().toISOString();
  const{data:invitation,error:inviteRowErr}=await admin.from("user_invitations").insert({email:cleanEmail,full_name:cleanName||null,project_id:projectId,role:cleanRole,invited_by:callerId,invitation_status:"pending",account_status:"not_created",permissions,sent_at:now,expires_at:expiresAt}).select("*").single();if(inviteRowErr)throw inviteRowErr;
  const redirectTo=Deno.env.get("TOTALCONSTRUCT_INVITE_REDIRECT")||undefined,metadata={full_name:cleanName,role:cleanRole,company_id:companyRow.company_id,invitation_id:invitation.id,project_id:projectId,subcontractor_id:subcontractorId,invite_type:inviteType,...(accessPlan?{access_plan_id:accessPlan.id}:{})};const{data:invited,error:authErr}=await admin.auth.admin.inviteUserByEmail(cleanEmail,{redirectTo,data:metadata});if(authErr||!invited.user){await admin.from("user_invitations").update({invitation_status:"failed"}).eq("id",invitation.id);throw authErr||new Error("Unable to create invited user");}
  const userId=invited.user.id;if(!accessPlan){await admin.from("profiles").upsert({id:userId,email:cleanEmail,display_name:cleanName||cleanEmail,role:inviteType==="owner"?"employee":cleanRole,active:true,updated_at:now},{onConflict:"id"});
  if(inviteType==="employee"){await admin.from("company_users").upsert({company_id:companyRow.company_id,user_id:userId,is_primary:true,active:true},{onConflict:"company_id,user_id"});if(projectId)await admin.from("project_members").upsert({project_id:projectId,user_id:userId,role:cleanRole,active:true,permissions:{}},{onConflict:"project_id,user_id"});}
  else if(inviteType==="subcontractor"){await admin.from("subcontractor_portal_access").upsert({project_id:projectId,subcontractor_id:subcontractorId,user_id:userId,active:true,invited_by:callerId,invitation_id:invitation.id,updated_at:now},{onConflict:"project_id,subcontractor_id,user_id"});await admin.from("subcontractors").update({portal_status:"Invite Pending",invite_sent_at:now,updated_at:now}).eq("id",subcontractorId);}
  else{await admin.from("owner_portal_access").upsert({project_id:projectId,user_id:userId,owner_name:cleanName||null,owner_email:cleanEmail,active:true,status:"Invite Pending",invited_at:now,invited_by:callerId},{onConflict:"project_id,user_id"});}
  }
  await admin.from("user_invitations").update({invitation_status:"sent",account_status:"invited",sent_at:now}).eq("id",invitation.id);
  return new Response(JSON.stringify({ok:true,invitation_id:invitation.id,email:cleanEmail,role:cleanRole,invite_type:inviteType,project_id:projectId,subcontractor_id:subcontractorId,status:"sent"}),{status:200,headers:{...cors,"Content-Type":"application/json"}});
 }catch(err){return new Response(JSON.stringify({error:String(err?.message||err)}),{status:400,headers:{...cors,"Content-Type":"application/json"}})}
});
