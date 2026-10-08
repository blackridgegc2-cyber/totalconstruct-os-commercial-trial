/* Subcontract dispute triage: source-linked, GC-only advisory workflow.
   No autonomous default finding, legal conclusion, or outgoing notice. */
(()=>{'use strict';
const RULES=[
 ['work_suspension',/stop work|cease work|suspend|no further work|won.t (continue|return|work)|not (continue|return|work)/i],
 ['payment_dispute',/unpaid|not paid|payment|invoice|pay app|withhold|retainage/i],
 ['acceptance_deficiency',/reject|not accepted|deficien|punch.?list|defect|rework|failed inspection/i],
 ['schedule_impact',/delay|schedule|critical path|milestone|completion/i]
];
const REQUIRED=['executed subcontract','amendments and change orders','payment applications and payment ledger','inspection and acceptance records','deficiency or punch records','correspondence and prior notices','project schedule'];
function triage({projectId,subcontractorId,communication='',records=[],clauses=[]}={}){
 if(!projectId||!subcontractorId)throw Error('Project and subcontractor required');
 const text=String(communication);const issues=RULES.filter(([,re])=>re.test(text)).map(([k])=>k);
 const applicable=clauses.filter(c=>c.projectId===projectId&&c.subcontractorId===subcontractorId&&c.documentStatus==='executed'&&c.sourceDocumentId&&c.section&&c.page&&issues.some(i=>(c.categories||[]).includes(i)));
 const evidence=records.filter(r=>r.projectId===projectId&&r.subcontractorId===subcontractorId);
 const present=new Set(evidence.map(r=>r.category));
 return {projectId,subcontractorId,issues,clauses:applicable.map(c=>({section:c.section,page:c.page,documentId:c.sourceDocumentId,excerpt:c.text||'',categories:c.categories})),
  evidence:evidence.map(r=>({category:r.category,date:r.date||null,sourceId:r.sourceId||null,summary:r.summary||''})),
  missing:REQUIRED.filter(k=>!present.has(k)),status:'GC review required',legalConclusion:null,
  cautions:['Work suspension and withholding rights require independent verification under executed terms and applicable law.','Do not invent cure periods, defaults, unpaid amounts, acceptance decisions or delivery dates.']};
}
function draftingPacket(report,audience){
 if(!['subcontractor','attorney'].includes(audience))throw Error('Unsupported audience');
 const isAttorney=audience==='attorney';
 return {audience,reviewRequired:true,sendAuthorized:false,
  instruction:isAttorney?'Prepare a privileged-intended attorney briefing: complete dated chronology, parties, executed subcontract and all applicable clauses, full billing/payment and deficiency history, correspondence, verified schedule impact, disputed facts, missing evidence, risks, deadlines and questions for counsel. Do not assert privilege automatically.':'Prepare a professional factual subcontractor notice using only verified facts and cited executed terms. Choose deficiency notice, request for clarification, or notice to cure only if contract and evidence support it. Cite the exact clause, cure period, delivery method, and recipient if verified; otherwise mark for GC/attorney review. Do not make unsupported default assertions.',
  report};
}
window.tcSubcontractDispute={triage,draftingPacket,RULES,REQUIRED};
})();