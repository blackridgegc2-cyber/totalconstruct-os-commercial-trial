// Server integration contract: map canonical Supabase rows to the pure release policy.
// Never use a browser-supplied actor role, signature status, hash, or project membership.
import {authorizePayAppTransition} from "./payapp-transition-policy.mjs";
const normalizedRole=role=>({gc:"contractor",general_contractor:"contractor",contractor:"contractor",owner:"owner",lender:"lender"}[String(role||"").toLowerCase()]||null);
export function evaluateServerPayAppTransition({action,payapp,authenticatedUser,projectRole,document,signatureRecords=[],auditRecords=[],financialValidation,expectedRevision,requestId}={}){
  const actor={id:authenticatedUser?.id,authenticated:!!authenticatedUser?.id,projectId:authenticatedUser?.authorizedProjectId,role:normalizedRole(projectRole)};
  const digest=String(document?.sha256||"");
  const canonical={id:payapp?.id,projectId:payapp?.project_id,status:payapp?.status,documentDigest:digest,version:payapp?.revision};
  const signatures=signatureRecords.filter(s=>s?.status==="verified"&&s?.signed_at&&s?.document_sha256===digest&&s?.document_id===document?.id).map(s=>({payappId:s.payapp_id,projectId:s.project_id,role:normalizedRole(s.signer_role),documentDigest:s.document_sha256,verified:true,revoked:false,signedAt:s.signed_at}));
  const auditEvents=auditRecords.filter(e=>e?.action==="document_locked"&&e?.evidence?.document_sha256===digest&&e?.evidence?.payapp_id===canonical.id&&e?.evidence?.project_id===canonical.projectId).map(e=>({payappId:e.evidence.payapp_id,projectId:e.evidence.project_id,type:"document_locked",documentDigest:digest}));
  return authorizePayAppTransition({action,payapp:canonical,actor,validation:financialValidation,signatures,auditEvents,expectedVersion:expectedRevision,requestId});
}
