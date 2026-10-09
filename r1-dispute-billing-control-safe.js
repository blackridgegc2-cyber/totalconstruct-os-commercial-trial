/* Cross-module dispute-to-billing control. Advisory logic only.
 * Server must enforce PM authority, project access, ledger persistence and audit.
 */
(()=>{'use strict';
const STATUS=Object.freeze({REVIEW:'pm-confirmation-required',HOLD:'billing-hold',CLEAR:'cleared-for-billing'});
function makeFlag({projectId,subcontractorId,sovIds=[],caseId,sourceDocumentId,reason,amount=null}={}){
 if(!projectId||!subcontractorId||!caseId||!sourceDocumentId||!String(reason||'').trim())throw Error('Traceable project, subcontractor, case, source and reason required');
 return {projectId,subcontractorId,sovIds:[...new Set(sovIds)],caseId,sourceDocumentId,reason,status:STATUS.REVIEW,amount,createdAt:new Date().toISOString(),decision:null};
}
function decide(flag,{status,actor,role,reason,contractAuthority,at=new Date().toISOString()}={}){
 if(!Object.values(STATUS).includes(status))throw Error('Invalid billing status');
 if(!/project manager|\bpm\b|executive|controller|administrator/i.test(String(role||'')))throw Error('Authorized PM/management review required');
 if(!actor||!String(reason||'').trim())throw Error('Decision actor and reason required');
 if(status===STATUS.HOLD&&!contractAuthority)throw Error('Hold requires documented contractual/legal authority');
 if(status===STATUS.CLEAR&&!contractAuthority)throw Error('Clearance requires documented billing basis');
 return {...flag,status,decision:{actor,role,reason,contractAuthority:contractAuthority||null,at}};
}
function preflight({projectId,rows=[],flags=[]}={}){
 const matched=flags.filter(f=>f.projectId===projectId&&f.status!==STATUS.CLEAR);
 const affected=rows.map((r,i)=>{const hits=matched.filter(f=>f.sovIds.includes(r.sovId||r.id||r.sov)||(!f.sovIds.length&&f.subcontractorId&&f.subcontractorId===r.subcontractorId));
 return {row:i,sov:r.sov||r.sovId||r.id,status:hits.some(f=>f.status===STATUS.HOLD)?STATUS.HOLD:hits.length?STATUS.REVIEW:STATUS.CLEAR,cases:hits.map(f=>f.caseId),flagIds:hits.map(f=>f.sourceDocumentId)};});
 return {affected,blocked:affected.some(x=>x.status!==STATUS.CLEAR),unresolved:affected.filter(x=>x.status!==STATUS.CLEAR)};
}
window.tcDisputeBilling={STATUS,makeFlag,decide,preflight};
})();