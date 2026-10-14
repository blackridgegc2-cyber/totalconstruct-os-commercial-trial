// Pure, fail-closed workflow transition policy. Server must independently verify
// actor identity, project membership, signatures and document-lock audit evidence.
import {evaluatePayAppRelease} from "./payapp-release-gates.mjs";
const transitions=Object.freeze({
  submit_to_owner:{from:"contractor_signed",to:"owner_pending",role:"contractor",next:"submit_to_owner"},
  approve_owner:{from:"owner_pending",to:"owner_approved",role:"owner"},
  submit_to_lender:{from:"owner_approved",to:"lender_pending",role:"owner",next:"submit_to_lender"},
  approve_lender:{from:"lender_pending",to:"lender_approved",role:"lender"},
  reject_owner:{from:"owner_pending",to:"owner_rejected",role:"owner"},
  reject_lender:{from:"lender_pending",to:"lender_rejected",role:"lender"}
});
export function authorizePayAppTransition({action,payapp,actor,validation,signatures,auditEvents,expectedVersion,requestId}={}){
  const blockers=[];const fail=(code)=>blockers.push(code);
  const rule=transitions[action];
  if(!rule)fail("UNKNOWN_ACTION");
  if(!payapp||typeof payapp!=="object")fail("PAYAPP_REQUIRED");
  if(!actor?.authenticated||!actor?.id)fail("AUTH_REQUIRED");
  if(!actor?.projectId||actor.projectId!==payapp?.projectId)fail("PROJECT_ACCESS_DENIED");
  if(rule&&actor?.role!==rule.role)fail("ROLE_NOT_AUTHORIZED");
  if(rule&&payapp?.status!==rule.from)fail("INVALID_STATE_TRANSITION");
  if(!Number.isSafeInteger(expectedVersion)||expectedVersion<0||payapp?.version!==expectedVersion)fail("STALE_VERSION");
  if(typeof requestId!=="string"||!/^[-_a-zA-Z0-9]{12,128}$/.test(requestId))fail("IDEMPOTENCY_KEY_REQUIRED");
  if(!validation||validation.valid!==true||!Array.isArray(validation.issues)||validation.issues.length)fail("FINANCIAL_RECONCILIATION_REQUIRED");
  const gate=evaluatePayAppRelease({payapp,actor,validation,signatures,auditEvents});
  // For post-submission statuses, temporarily check the last signed document state;
  // this is only a policy decision, not an authenticated server-side transaction.
  const signedStatus=action==="submit_to_lender"?"owner_approved":"contractor_signed";
  const verified=evaluatePayAppRelease({payapp:{...payapp,status:signedStatus},actor,validation,signatures,auditEvents});
  if(!verified.ready)for(const b of verified.blockers)fail(b.code);
  if(["approve_owner","approve_lender"].includes(action)){
    const role=rule.role;
    if(!signatures?.some(s=>s?.payappId===payapp?.id&&s?.projectId===payapp?.projectId&&s?.role===role&&s?.documentDigest===payapp?.documentDigest&&s?.verified===true&&s?.revoked!==true&&s?.signedAt))fail("APPROVER_SIGNATURE_REQUIRED");
  }
  return {allowed:blockers.length===0,blockers:[...new Set(blockers)],nextStatus:blockers.length?null:rule.to,expectedVersion,requestId};
}
