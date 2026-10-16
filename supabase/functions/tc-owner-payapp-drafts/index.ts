import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers={"Content-Type":"application/json","Access-Control-Allow-Origin":"https://totalconstruct-os-commercial-trial.vercel.app","Access-Control-Allow-Headers":"authorization,content-type,apikey"};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 try{
 const jwt=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!jwt)return reply({error:"Authentication required"},401);
 const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data:{user},error}=await db.auth.getUser(jwt);
 if(error||!user)return reply({error:"Invalid session"},401);
 if(user.email?.toLowerCase()!=="blackridgegc2@gmail.com")return reply({error:"Access denied: pilot Executive only"},403);
 const body=await req.json(),action=body.action;
 const projectId=String(body.projectId||"");
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(projectId))return reply({error:"Valid project ID required"},400);
 if(action==="list"){
 const {data,error:e}=await db.from("tc_owner_payapp_records").select("id,project_id,application_number,revision,status,payload,created_at,updated_at").eq("project_id",projectId).order("created_at",{ascending:false});
 if(e)throw e;return reply({records:data});
 }
 if(action==="submit"||action==="revise"){
 const id=String(body.id||"");
 const {data:existing,error:lookupError}=await db.from("tc_owner_payapp_records").select("id,project_id,status").eq("id",id).eq("project_id",projectId).maybeSingle();
 if(lookupError)throw lookupError;
 if(!existing)return reply({error:"Application not found in this project"},404);
 if(action==="submit"){
 const {data,error:e}=await db.rpc("tc_payapp_submit",{p_id:id,p_actor:user.id});
 if(e)return reply({error:e.message},409);
 return reply({record:data});
 }
 const reason=String(body.reason||"").trim();
 if(!reason)return reply({error:"Revision reason required"},400);
 const {data,error:e}=await db.rpc("tc_payapp_revise",{p_id:id,p_actor:user.id,p_reason:reason});
 if(e)return reply({error:e.message},409);
 return reply({record:data});
 }
 if(action==="saveDraft"){
 const payload=body.payload;
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return reply({error:"Invalid draft payload"},400);
 const number=Number(body.applicationNumber);
 if(!Number.isInteger(number)||number<1)return reply({error:"Invalid application number"},400);
 let result;
 if(body.id){
 const {data,error:e}=await db.from("tc_owner_payapp_records").update({payload}).eq("id",String(body.id)).eq("project_id",projectId).eq("status","draft").select("id,status,updated_at").maybeSingle();
 if(e)throw e;if(!data)return reply({error:"Draft missing or no longer editable"},409);result=data;
 }else{
 const {data,error:e}=await db.from("tc_owner_payapp_records").insert({project_id:projectId,application_number:number,revision:1,status:"draft",payload,created_by:user.id}).select("id,status,updated_at").single();
 if(e)throw e;result=data;
 }
 await db.from("tc_owner_payapp_events").insert({payapp_id:result.id,event_type:"draft_saved",actor_id:user.id,details:{at:result.updated_at}});
 return reply({record:result});
 }

 if(action==="reconcileOwnerFundedPayment"){const id=String(body.id||"");if(body.confirmed!==true)return reply({error:"Explicit confirmation required"},400);const {data:p,error:e}=await db.from("tc_owner_payapp_records").select("id,status,payload").eq("id",id).eq("project_id",projectId).maybeSingle();if(e)throw e;if(!p||p.status!=="draft")return reply({error:"Draft not found"},409);if(Number(p.payload?.currentPaymentDue||0)!==0)return reply({error:"Billing amount has changed; reload"},409);const {data:docs}=await db.from("tc_payapp_documents").select("id,file_name").eq("payapp_id",id).eq("project_id",projectId).eq("kind","signature_pdf");if(!docs?.some(d=>d.file_name==="PA PD-01 Orchard Academy.pdf"))return reply({error:"Original PDF missing"},409);const payload={...p.payload,currentPaymentDue:24300,previousOwnerFundedPayments:20680,paymentFundingSource:"owner_funds",earnedLessRetainage:44980};const {data:updated,error:ue}=await db.from("tc_owner_payapp_records").update({payload}).eq("id",id).eq("project_id",projectId).eq("status","draft").select("id").single();if(ue)throw ue;await db.from("tc_owner_payapp_events").insert({payapp_id:id,event_type:"draft_saved",actor_id:user.id,details:{reason:"Owner-funded prior payment reconciliation",priorOwnerPayment:20680,currentPaymentDue:24300,source:"owner_funds",notBankDisbursement:true}});return reply({reconciled:true,currentPaymentDue:24300});}
 if(action==="getSignaturePreferences"){const {data,error:e}=await db.from("tc_signature_preferences").select("method,fallback_enabled,help_enabled").eq("payapp_id",String(body.id||"")).maybeSingle();if(e)throw e;return reply({preferences:data||{method:"standard",fallback_enabled:true,help_enabled:true}});}
 if(action==="setSignaturePreferences"){const id=String(body.id||"");const {data:p}=await db.from("tc_owner_payapp_records").select("id,status").eq("id",id).eq("project_id",projectId).maybeSingle();if(!p||p.status!=="draft")return reply({error:"Editable draft not found"},409);const method=String(body.method||"");if(!["standard","biometric_preferred","biometric_required"].includes(method))return reply({error:"Invalid signature method"},400);const {data,error:e}=await db.from("tc_signature_preferences").upsert({payapp_id:id,method,fallback_enabled:method==="biometric_required"?false:body.fallbackEnabled!==false,help_enabled:body.helpEnabled!==false,updated_at:new Date().toISOString()}).select().single();if(e)throw e;return reply({preferences:data});}
 if(action==="getSigningReadiness"||action==="completeStandardSignature"||action==="getSignedSignature"){const id=String(body.id||""),documentId=String(body.documentId||"");const {data:p,error:pe}=await db.from("tc_owner_payapp_records").select("id,status,payload,revision,application_number").eq("id",id).eq("project_id",projectId).maybeSingle();if(pe)throw pe;const {data:d,error:de}=await db.from("tc_payapp_documents").select("id,kind,storage_path,file_name").eq("id",documentId).eq("payapp_id",id).eq("project_id",projectId).maybeSingle();if(de)throw de;if(!p||!d||d.kind!=="signature_pdf")return reply({error:"Signature PDF or application not found"},404);const {data:prior,error:se}=await db.from("tc_signature_records").select("id,status").eq("payapp_id",id).eq("document_id",documentId).eq("status","signed").maybeSingle();if(se)throw se;if(action==="getSignedSignature"){if(!prior)return reply({error:"No signed document exists"},404);const {data:ev,error:ee}=await db.from("tc_signature_events").select("event_data").eq("signature_id",prior.id).eq("event_type","signed_pdf_stored").maybeSingle();if(ee)throw ee;const path=ev?.event_data?.storage_path;if(!path)return reply({error:"Signed PDF unavailable"},404);const {data:link,error:le}=await db.storage.from("tc-payapp-private").createSignedUrl(path,120);if(le)throw le;return reply({url:link.signedUrl,signatureId:prior.id});}const {data:policy}=await db.from("tc_signature_preferences").select("method,fallback_enabled").eq("payapp_id",id).maybeSingle();const method=policy?.method||"standard";const amount=Number(p.payload?.currentPaymentDue||0);if(action==="getSigningReadiness")return reply({ready:p.status==="draft"&&!prior&&amount>0&&method!=="biometric_required",signingSessionSupported:false,standardSigningSupported:method!=="biometric_required",reason:prior?"This PDF is already signed.":amount<=0?"Saved application amount is zero; reconcile with the PDF before signing.":method==="biometric_required"?"This document requires biometric verification, which is not available.":p.status!=="draft"?"Only drafts can be signed.":null,method});if(prior)return reply({error:"Document already signed"},409);if(p.status!=="draft"||amount<=0)return reply({error:"Draft billing amount must be reconciled before signing"},409);if(method==="biometric_required")return reply({error:"Biometric authentication required; standard signing is not permitted"},403);const signerName=String(body.signerName||"").trim();const consent=body.consent===true;if(!consent||signerName.length<3||signerName.length>120)return reply({error:"Full signer name and explicit consent required"},400);const {data:download,error:downError}=await db.storage.from("tc-payapp-private").download(d.storage_path);if(downError)throw downError;const original=new Uint8Array(await download.arrayBuffer());const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),v=>v.toString(16).padStart(2,"0")).join("");const hash=await digest(original);const {PDFDocument,StandardFonts,rgb}=await import("https://esm.sh/pdf-lib@1.17.1");const pdf=await PDFDocument.load(original,{ignoreEncryption:false});const page=pdf.getPages().at(-1);if(!page)return reply({error:"PDF has no pages"},422);const font=await pdf.embedFont(StandardFonts.Helvetica);const signedAt=new Date().toISOString();const text="Electronically signed by "+signerName+" | "+signedAt+" UTC | TotalConstruct";page.drawText(text.slice(0,145),{x:35,y:24,size:8,font,color:rgb(.1,.1,.1),maxWidth:page.getWidth()-70});const finalBytes=await pdf.save();const finalHash=await digest(finalBytes);const path=projectId+"/"+id+"/signed/"+crypto.randomUUID()+".pdf";const {error:upErr}=await db.storage.from("tc-payapp-private").upload(path,finalBytes,{contentType:"application/pdf",upsert:false});if(upErr)throw upErr;const consentText="I agree to use electronic records and signatures and intend to sign this specific Pay Application PDF.";const {data:sig,error:ie}=await db.from("tc_signature_records").insert({project_id:projectId,payapp_id:id,document_id:documentId,signer_id:user.id,signer_role:"contractor",document_sha256:hash,consent_text:consentText,authentication_method:"authenticated_session_explicit_consent",status:"signed"}).select("id,signed_at").single();if(ie){await db.storage.from("tc-payapp-private").remove([path]);return reply({error:ie.message},409)}const {error:eventErr}=await db.from("tc_signature_events").insert({signature_id:sig.id,event_type:"signed_pdf_stored",actor_id:user.id,event_data:{storage_path:path,signed_pdf_sha256:finalHash,source_pdf_sha256:hash,signer_name:signerName,consent:consentText,method:"standard",application_revision:p.revision,application_number:p.application_number,at:signedAt}});if(eventErr)return reply({error:"Signature evidence storage failed; contact administrator",signatureId:sig.id},500);return reply({signed:true,signatureId:sig.id,signedAt:sig.signed_at,documentSha256:hash,signedPdfSha256:finalHash,submitted:false});}
 if(action==="listDocuments"){
 const id=String(body.id||"");
 const {data:payapp}=await db.from("tc_owner_payapp_records").select("id").eq("id",id).eq("project_id",projectId).maybeSingle();
 if(!payapp)return reply({error:"Pay application not found"},404);
 const {data,error:e}=await db.from("tc_payapp_documents").select("id,kind,file_name,mime_type,byte_size,created_at").eq("payapp_id",id).eq("project_id",projectId).order("created_at",{ascending:false});
 if(e)throw e;return reply({documents:data});
 }
 if(action==="removeDraftDocument"){
 const id=String(body.id||""),documentId=String(body.documentId||"");
 const {data:pa,error:pe}=await db.from("tc_owner_payapp_records").select("id,status").eq("id",id).eq("project_id",projectId).maybeSingle();if(pe)throw pe;
 if(!pa)return reply({error:"Pay application not found"},404);
 if(pa.status!=="draft")return reply({error:"Submitted documents cannot be removed"},409);
 const {data:doc,error:de}=await db.from("tc_payapp_documents").select("id,storage_path,kind,file_name").eq("id",documentId).eq("payapp_id",id).eq("project_id",projectId).maybeSingle();if(de)throw de;
 if(!doc)return reply({error:"Document not found"},404);
 const {data:envelopes,error:ee}=await db.from("tc_native_signature_envelopes").select("id").eq("document_id",documentId).limit(1);if(ee)throw ee;
 if(envelopes?.length)return reply({error:"Document is linked to a signing envelope"},409);
 const {error:se}=await db.storage.from("tc-payapp-private").remove([doc.storage_path]);if(se)throw se;
 const {error:del}=await db.from("tc_payapp_documents").delete().eq("id",documentId).eq("payapp_id",id).eq("project_id",projectId);if(del)throw del;
 await db.from("tc_owner_payapp_events").insert({payapp_id:id,event_type:"draft_document_removed",actor_id:user.id,details:{document_id:documentId,kind:doc.kind,file_name:doc.file_name,removed_at:new Date().toISOString()}});
 return reply({removed:true,documentId});
 }
 if(action==="recordExternalSubmission"){
 const id=String(body.id||"");const {data:pa,error:e}=await db.from("tc_owner_payapp_records").select("id,status,application_number,payload").eq("id",id).eq("project_id",projectId).maybeSingle();if(e)throw e;if(!pa)return reply({error:"Application not found"},404);
 if(pa.application_number!==1)return reply({error:"This action is currently limited to the confirmed PA #1 submission"},409);
 const submittedAt=String(body.submittedAt||"");if(!/^2026-10-13$/.test(submittedAt))return reply({error:"Confirm the external submission date"},400);
 const {data:existing}=await db.from("tc_owner_payapp_events").select("id").eq("payapp_id",id).eq("event_type","external_email_submission_recorded").limit(1);
 if(existing?.length)return reply({recorded:true,alreadyRecorded:true});
 const {error:ev}=await db.from("tc_owner_payapp_events").insert({payapp_id:id,event_type:"external_email_submission_recorded",actor_id:user.id,details:{date:submittedAt,method:"email",recipients:["randie@academicorchard.org","tracym@ozona.bank"],amount:24300,payment_status:"unpaid",note:"Reported by contractor; delivery not independently verified"}});if(ev)throw ev;
 return reply({recorded:true});
 }
 if(action==="uploadDocument"){
 const id=String(body.id||""),kind=String(body.kind||""),fileName=String(body.fileName||"");
 const mime=kind==="signature_pdf"?"application/pdf":kind==="internal_workbook"?"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"";
 if(!mime)return reply({error:"Unsupported document classification"},400);
 if(!fileName||fileName.length>180||!/^[\w .()\-]+$/.test(fileName))return reply({error:"Invalid filename"},400);
 if(kind==="signature_pdf"&&!/\.pdf$/i.test(fileName))return reply({error:"A PDF is required"},400);
 if(kind==="internal_workbook"&&!/\.xlsx$/i.test(fileName))return reply({error:"An XLSX workbook is required"},400);
 const {data:payapp}=await db.from("tc_owner_payapp_records").select("id,status").eq("id",id).eq("project_id",projectId).maybeSingle();
 if(!payapp)return reply({error:"Pay application not found"},404);
 if(payapp.status!=="draft")return reply({error:"Only draft applications accept new attachments"},409);
 const encoded=String(body.base64||"");if(encoded.length>16000000||encoded.length<12)return reply({error:"File exceeds 12 MB limit or is empty"},413);
 let bytes;try{bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))}catch{return reply({error:"Invalid file encoding"},400)}
 if(bytes.length>12000000)return reply({error:"File exceeds 12 MB limit"},413);
 if(kind==="signature_pdf"&&new TextDecoder().decode(bytes.slice(0,5))!=="%PDF-")return reply({error:"Invalid PDF signature"},400);
 if(kind==="internal_workbook"&&!(bytes[0]===80&&bytes[1]===75))return reply({error:"Invalid XLSX container"},400);
 const path=projectId+"/"+id+"/"+crypto.randomUUID()+ (kind==="signature_pdf"?".pdf":".xlsx");
 const {error:upErr}=await db.storage.from("tc-payapp-private").upload(path,bytes,{contentType:mime,upsert:false});
 if(upErr)throw upErr;
 const {data,error:e}=await db.from("tc_payapp_documents").insert({project_id:projectId,payapp_id:id,kind,file_name:fileName,mime_type:mime,storage_path:path,byte_size:bytes.length,uploaded_by:user.id}).select("id,kind,file_name,mime_type,byte_size,created_at").single();
 if(e){await db.storage.from("tc-payapp-private").remove([path]);throw e}
 return reply({document:data});
 }


 if(action==="listProjectBankAccounts"){
 const {data,error:e}=await db.from("tc_project_bank_accounts").select("id,project_id,account_role,label,provider,bank_display_name,account_last4,verification_status,allow_incoming_ach,allow_outgoing_ach,is_primary_receiving,is_active,created_at,updated_at").eq("project_id",projectId).order("created_at",{ascending:true});
 if(e)throw e;return reply({accounts:data});
 }
 if(action==="addProjectBankAccount"){
 const role=String(body.accountRole||"").trim(),label=String(body.label||"").trim().slice(0,100);
 if(!["gl","overhead","fee","subcontractor","payroll","reserve","other"].includes(role))return reply({error:"Invalid bank account role"},400);
 if(!label)return reply({error:"Account label required"},400);
 const {data,error:e}=await db.from("tc_project_bank_accounts").insert({project_id:projectId,account_role:role,label,verification_status:"not_connected",allow_incoming_ach:false,allow_outgoing_ach:false,is_primary_receiving:false}).select("id,project_id,account_role,label,verification_status,is_primary_receiving,created_at").single();
 if(e)throw e;
 await db.from("tc_project_bank_account_events").insert({project_id:projectId,bank_account_id:data.id,actor_id:user.id,event_type:"account_placeholder_created",details:{role,label}});
 return reply({account:data});
 }
 if(action==="listPaymentDestination"){
 const {data,error:e}=await db.from("tc_project_payment_destinations").select("id,project_id,provider,bank_display_name,account_last4,verification_status,enabled,created_at,updated_at").eq("project_id",projectId).maybeSingle();
 if(e)throw e;return reply({destination:data});
 }
 if(action==="listRequests"){
 const {data,error:e}=await db.from("tc_payapp_requests").select("id,payapp_id,subject,message,status,recipient_roles,visible_to_roles,assigned_to,requested_by,due_at,closed_at,created_at,updated_at").eq("project_id",projectId).order("created_at",{ascending:false}).limit(100);
 if(e)throw e;return reply({requests:data});
 }
 if(action==="createRequest"){
 const payappId=String(body.id||"");
 const {data:payapp}=await db.from("tc_owner_payapp_records").select("id").eq("id",payappId).eq("project_id",projectId).maybeSingle();
 if(!payapp)return reply({error:"Pay application not found"},404);
 const subject=String(body.subject||"").trim().slice(0,180),message=String(body.message||"").trim().slice(0,5000);
 if(!subject||!message)return reply({error:"Subject and message required"},400);
 const roles=Array.isArray(body.recipientRoles)?body.recipientRoles.filter((v:unknown)=>["executive","project_manager","owner","lender"].includes(String(v))).slice(0,4):[];
 if(!roles.length)return reply({error:"At least one recipient role required"},400);
 const {data,error:e}=await db.from("tc_payapp_requests").insert({project_id:projectId,payapp_id:payappId,subject,message,requested_by:user.id,recipient_roles:roles,visible_to_roles:roles}).select().single();
 if(e)throw e;
 await db.from("tc_payapp_request_events").insert({request_id:data.id,actor_id:user.id,event_type:"created",message,new_status:"open"});
 return reply({request:data});
 }
 if(action==="updateRequest"){
 const id=String(body.requestId||""),status=String(body.status||"");
 const allowed=["open","response_pending","response_submitted","still_open","rejected","no_response_available","no_response_given","resolved","closed"];
 if(!allowed.includes(status))return reply({error:"Invalid request status"},400);
 const message=String(body.message||"").trim().slice(0,5000);
 if(["rejected","no_response_available","no_response_given"].includes(status)&&!message)return reply({error:"Explanation required"},400);
 const {data:previous,error:lookup}=await db.from("tc_payapp_requests").select("id,status").eq("id",id).eq("project_id",projectId).maybeSingle();
 if(lookup)throw lookup;if(!previous)return reply({error:"Request not found"},404);
 const {data,error:e}=await db.from("tc_payapp_requests").update({status,updated_at:new Date().toISOString(),closed_at:status==="closed"?new Date().toISOString():null}).eq("id",id).eq("project_id",projectId).select().single();
 if(e)throw e;
 await db.from("tc_payapp_request_events").insert({request_id:id,actor_id:user.id,event_type:"status_changed",previous_status:previous.status,new_status:status,message});
 return reply({request:data});
 }
 if(action==="listRequestEvents"){
 const requestId=String(body.requestId||"");
 const {data:existing}=await db.from("tc_payapp_requests").select("id").eq("id",requestId).eq("project_id",projectId).maybeSingle();
 if(!existing)return reply({error:"Request not found"},404);
 const {data,error:e}=await db.from("tc_payapp_request_events").select("id,actor_id,event_type,message,previous_status,new_status,attachment_document_id,created_at").eq("request_id",requestId).order("created_at",{ascending:true});
 if(e)throw e;return reply({events:data});
 }
 if(action==="verifyDocumentFingerprint"){
 const id=String(body.id||""),documentId=String(body.documentId||"");
 const {data:doc,error:de}=await db.from("tc_payapp_documents").select("id,storage_path,file_name,byte_size").eq("id",documentId).eq("payapp_id",id).eq("project_id",projectId).maybeSingle();
 if(de)throw de;if(!doc)return reply({error:"Document not found"},404);
 const {data:binary,error:downloadError}=await db.storage.from("tc-payapp-private").download(doc.storage_path);
 if(downloadError||!binary)return reply({error:"Unable to read protected PDF"},500);
 const bytes=new Uint8Array(await binary.arrayBuffer());
 const digest=await crypto.subtle.digest("SHA-256",bytes);
 const sha256=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
 const {data:prior,error:pe}=await db.from("tc_owner_payapp_events").select("id,details").eq("payapp_id",id).eq("event_type","pdf_fingerprint_verified").order("created_at",{ascending:false}).limit(1);
 if(pe)throw pe;
 const previous=prior?.find(e=>e.details?.document_id===documentId);
 const changed=Boolean(previous&&previous.details?.sha256!==sha256);
 await db.from("tc_owner_payapp_events").insert({payapp_id:id,event_type:"pdf_fingerprint_verified",actor_id:user.id,details:{document_id:documentId,file_name:doc.file_name,sha256,bytes:bytes.byteLength,changed,method:"server_sha256",signature:false}});
 return reply({documentId,sha256,bytes:bytes.byteLength,changed,verified:true,signed:false});
 }
 if(action==="createNativeSignatureEnvelope"){
 const id=String(body.id||""),documentId=String(body.documentId||"");
 const {data:payapp,error:paErr}=await db.from("tc_owner_payapp_records").select("id,status,payload").eq("id",id).eq("project_id",projectId).maybeSingle();
 if(paErr)throw paErr;if(!payapp||payapp.status!=="draft")return reply({error:"Only a draft application may begin signing"},409);
 const {data:doc,error:de}=await db.from("tc_payapp_documents").select("id,storage_path,mime_type").eq("id",documentId).eq("payapp_id",id).eq("project_id",projectId).eq("kind","signature_pdf").maybeSingle();
 if(de)throw de;if(!doc||doc.mime_type!=="application/pdf")return reply({error:"Final signature PDF required"},409);
 const {data:file,error:fe}=await db.storage.from("tc-payapp-private").download(doc.storage_path);if(fe||!file)throw fe||Error("PDF unavailable");
 const bytes=new Uint8Array(await file.arrayBuffer());const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join("");
 const {data:existing}=await db.from("tc_native_signature_envelopes").select("*").eq("payapp_id",id).eq("document_id",documentId).maybeSingle();
 if(existing)return reply({envelope:existing,created:false});
 const {data:envelope,error:ee}=await db.from("tc_native_signature_envelopes").insert({project_id:projectId,payapp_id:id,document_id:documentId,source_sha256:hash,created_by:user.id}).select().single();if(ee)throw ee;
 await db.from("tc_owner_payapp_events").insert({payapp_id:id,event_type:"native_signature_envelope_created",actor_id:user.id,details:{envelope_id:envelope.id,document_id:documentId,sha256:hash}});
 return reply({envelope,created:true});
 }
 if(action==="getNativeSignatureEnvelope"){
 const id=String(body.id||"");const {data,error:e}=await db.from("tc_native_signature_envelopes").select("*").eq("payapp_id",id).eq("project_id",projectId).maybeSingle();if(e)throw e;
 const {data:events}=data?await db.from("tc_native_signature_events").select("role,email,signer_name,verification_method,consented_at,created_at").eq("envelope_id",data.id).order("created_at",{ascending:true}):{data:[]};
 return reply({envelope:data,events:events||[]});
 }
 if(action==="getNativeSigningChecklist"){
 const id=String(body.id||"");
 const {data:envelope,error:e}=await db.from("tc_native_signature_envelopes").select("id,stage,status,source_sha256,document_id,created_at").eq("payapp_id",id).eq("project_id",projectId).maybeSingle();
 if(e)throw e;
 const {data:events,error:ev}=envelope?await db.from("tc_native_signature_events").select("role,email,signer_name,verification_method,consented_at,document_sha256").eq("envelope_id",envelope.id):{data:[],error:null};
 if(ev)throw ev;
 return reply({envelope,signers:events||[],readyForExternalSigning:false,requirements:["Signer-specific authenticated access","Consent and signature capture","Immutable finalized PDF","Owner and lender approval workflow","Complete audit certificate"]});
 }
 if(action==="cancelNativeSignatureEnvelope"){
 const id=String(body.id||""),envelopeId=String(body.envelopeId||"");
 const {data:env,error:findError}=await db.from("tc_native_signature_envelopes").select("id,status").eq("id",envelopeId).eq("payapp_id",id).eq("project_id",projectId).maybeSingle();
 if(findError)throw findError;if(!env)return reply({error:"Envelope not found"},404);
 if(env.status!=="pending")return reply({error:"Only an unsigned pending envelope can be cancelled"},409);
 const {data:updated,error:ue}=await db.from("tc_native_signature_envelopes").update({status:"cancelled",updated_at:new Date().toISOString()}).eq("id",envelopeId).eq("status","pending").select("id,status").maybeSingle();
 if(ue)throw ue;if(!updated)return reply({error:"Envelope status changed; retry"},409);
 await db.from("tc_owner_payapp_events").insert({payapp_id:id,event_type:"native_signature_envelope_cancelled",actor_id:user.id,details:{envelope_id:envelopeId}});
 return reply({envelope:updated});
 }
 if(action==="setNativeSignatureRecipients"){
 const id=String(body.id||""),envelopeId=String(body.envelopeId||"");
 const ownerEmail=String(body.ownerEmail||"").trim().toLowerCase(),lenderEmail=String(body.lenderEmail||"").trim().toLowerCase();
 const valid=(e)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)&&e.length<=254;
 if(!valid(ownerEmail)||!valid(lenderEmail)||ownerEmail===lenderEmail||ownerEmail===user.email?.toLowerCase()||lenderEmail===user.email?.toLowerCase())return reply({error:"Three distinct valid signer email addresses required"},400);
 const {data:envelope,error:e}=await db.from("tc_native_signature_envelopes").select("id,status").eq("id",envelopeId).eq("payapp_id",id).eq("project_id",projectId).maybeSingle();
 if(e)throw e;if(!envelope)return reply({error:"Envelope not found"},404);
 if(envelope.status!=="pending")return reply({error:"Recipient list locked once signing begins"},409);
 const {data:updated,error:ue}=await db.from("tc_native_signature_envelopes").update({owner_email:ownerEmail,lender_email:lenderEmail,updated_at:new Date().toISOString()}).eq("id",envelopeId).eq("status","pending").select("id,owner_email,lender_email").maybeSingle();
 if(ue)throw ue;if(!updated)return reply({error:"Recipient list update conflicted"},409);
 await db.from("tc_owner_payapp_events").insert({payapp_id:id,event_type:"native_signature_recipients_configured",actor_id:user.id,details:{envelope_id:envelopeId,owner_email:ownerEmail,lender_email:lenderEmail,invitations_sent:false}});
 return reply({envelope:updated,invitationsSent:false});
 }
 if(action==="getApprovedPayappInvoice"){
 const id=String(body.id||"");
 const {data,error:e}=await db.from("tc_payapp_approved_invoices").select("id,invoice_number,amount,status,approved_at,created_at,payapp_id,envelope_id").eq("payapp_id",id).eq("project_id",projectId).maybeSingle();
 if(e)throw e;return reply({invoice:data||null});
 }
 if(action==="openDocument"){
 const id=String(body.id||""),documentId=String(body.documentId||"");
 const {data,error:e}=await db.from("tc_payapp_documents").select("storage_path,kind,file_name").eq("id",documentId).eq("payapp_id",id).eq("project_id",projectId).maybeSingle();
 if(e)throw e;if(!data)return reply({error:"Document not found"},404);
 const {data:link,error:linkErr}=await db.storage.from("tc-payapp-private").createSignedUrl(data.storage_path,90,{download:false});
 if(linkErr)throw linkErr;return reply({url:link.signedUrl,kind:data.kind,fileName:data.file_name});
 }
 return reply({error:"Unsupported action"},400);
 }catch(e){return reply({error:String(e?.message||e)},500)}
});
