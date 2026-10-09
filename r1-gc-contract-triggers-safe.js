/* GC-only, event-triggered contract intelligence policy.
 * Advisory client helper. Server MUST enforce project membership and role/RLS.
 * No automatic disclosure to owner, lender, architect, or subcontractors.
 */
(()=>{'use strict';
const TRIGGERS=Object.freeze({
 pay_app:/pay.?app|retainage|billing|notari[sz]|payment application|g702|g703/i,
 change_order:/change.?order|extra work|scope change|change directive/i,
 schedule:/delay|extension of time|completion|liquidated damages|schedule impact/i,
 design:/design|drawing|rfi|errors and omissions|coordination/i,
 subcontract:/subcontract|flow.?down|insurance|lien waiver|subcontractor payment/i,
 notice:/notice|claim|dispute|default|termination/i
});
const gcRole=role=>/\b(gc|general contractor|project manager|pm|superintendent|executive|administrator|admin|contract manager)\b/i.test(String(role||''));
function evaluate({event,clauses=[],user,projectId}={}){
 if(!user||!gcRole(user.role)||!projectId||!Array.isArray(user.projectIds)||!user.projectIds.includes(projectId))return {allowed:false,alerts:[]};
 const text=[event?.type,event?.description,event?.question].filter(Boolean).join(' ');
 const categories=Object.entries(TRIGGERS).filter(([,re])=>re.test(text)).map(([key])=>key);
 if(!categories.length)return {allowed:true,alerts:[]};
 const alerts=clauses.filter(c=>c?.projectId===projectId&&c?.documentStatus==='executed'&&c?.section&&c?.page&&c?.sourceDocumentId&&categories.some(k=>(c.categories||[]).includes(k))).map(c=>({
  category:(c.categories||[]).filter(k=>categories.includes(k)),section:c.section,page:c.page,sourceDocumentId:c.sourceDocumentId,
  clauseText:c.text||'',issue:text,level:'review',disclosure:'gc-only',
  explanation:'Potential contractual provision; verify applicability against the executed contract and event facts.'
 }));
 return {allowed:true,alerts};
}
window.tcContractTriggers={TRIGGERS,evaluate,gcRole};
})();