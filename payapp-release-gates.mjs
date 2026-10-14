// Pure release gate: no browser state, no automatic approvals, no signing side effects.
// All evidence must originate from trusted server-side records, not client assertions.
export function evaluatePayAppRelease({payapp,validation,actor,signatures=[],auditEvents=[]}={}) {
  const blockers=[];
  const fail=(code,detail)=>blockers.push({code,detail});
  if(!payapp||typeof payapp!=="object")fail("PAYAPP_MISSING","Canonical payment application required");
  if(!validation||validation.valid!==true||!Array.isArray(validation.issues)||validation.issues.length)fail("FINANCIAL_VALIDATION","Financial reconciliation must pass");
  const id=String(payapp?.id??"").trim(),projectId=String(payapp?.projectId??payapp?.project_id??"").trim();
  if(!id||!projectId)fail("PROJECT_IDENTITY","Pay application and project IDs required");
  if(!actor?.id||!actor?.authenticated)fail("AUTH_REQUIRED","Authenticated actor required");
  if(actor?.projectId!==projectId)fail("PROJECT_ACCESS","Actor is not assigned to this project");
  const status=String(payapp?.status??"").toLowerCase();
  if(!["contractor_signed","owner_approved"].includes(status))fail("INVALID_STATUS","Only signed submissions can advance");
  const digest=String(payapp?.documentDigest??"").trim();
  if(!/^[a-f0-9]{64}$/i.test(digest))fail("DOCUMENT_DIGEST","SHA-256 document digest required");
  const verified=(role)=>signatures.some(s=>s?.payappId===id&&s?.projectId===projectId&&s?.role===role&&s?.documentDigest===digest&&s?.verified===true&&s?.revoked!==true&&s?.signedAt);
  if(!verified("contractor"))fail("CONTRACTOR_SIGNATURE","Verified contractor signature on current document required");
  if(status==="owner_approved"&&!verified("owner"))fail("OWNER_SIGNATURE","Verified owner signature on current document required");
  if(!auditEvents.some(e=>e?.payappId===id&&e?.projectId===projectId&&e?.type==="document_locked"&&e?.documentDigest===digest))fail("DOCUMENT_AUDIT","Immutable document-lock audit event required");
  return {ready:blockers.length===0,blockers,nextAction:status==="contractor_signed"?"submit_to_owner":status==="owner_approved"?"submit_to_lender":null};
}
