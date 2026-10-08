/* Dispute case workflow: attorney-first or GC-direct, with later escalation.
 * Local state-machine policy only; persistence, access control, and transmission
 * require server-side enforcement and immutable audit.
 */
(()=>{'use strict';
const ROUTES=Object.freeze({ATTORNEY_FIRST:'attorney-first',GC_DIRECT:'gc-direct'});
const STATES=Object.freeze({OPEN:'open',ATTORNEY_REVIEW:'attorney-review',ATTORNEY_DIRECTION:'attorney-direction-received',GC_DRAFT:'gc-draft',GC_APPROVAL:'gc-approval',SENT:'notice-sent',ESCALATED:'escalated-to-attorney',CLOSED:'closed'});
const ACTIONS={
 'open':{'send-to-attorney':'attorney-review','draft-direct':'gc-draft'},
 'attorney-review':{'record-attorney-direction':'attorney-direction-received'},
 'attorney-direction-received':{'prepare-notice':'gc-draft'},
 'gc-draft':{'submit-for-gc-approval':'gc-approval','send-to-attorney':'attorney-review'},
 'gc-approval':{'record-authorized-send':'notice-sent','return-to-draft':'gc-draft','send-to-attorney':'attorney-review'},
 'notice-sent':{'escalate':'escalated-to-attorney','close':'closed','record-followup':'gc-draft'},
 'escalated-to-attorney':{'record-attorney-direction':'attorney-direction-received'},
 'closed':{'reopen':'open'}
};
function create({projectId,subcontractorId,route=ROUTES.ATTORNEY_FIRST,actor}={}){
 if(!projectId||!subcontractorId||!actor)throw Error('Project, subcontractor and actor required');
 if(!Object.values(ROUTES).includes(route))throw Error('Invalid route');
 return {projectId,subcontractorId,route,status:STATES.OPEN,history:[],confidential:true,attorneyMaterial:[],outboundNotices:[]};
}
function transition(c,action,{actor,reason='',documentId=null,deliveryEvidence=null,approved=false,at=new Date().toISOString()}={}){
 if(!actor)throw Error('Actor required');
 const next=ACTIONS[c.status]?.[action];if(!next)throw Error('Invalid case transition');
 if(action==='record-attorney-direction'&&!documentId)throw Error('Attorney direction document required');
 if(action==='record-authorized-send'&&(!approved||!documentId||!deliveryEvidence))throw Error('GC approval, final notice and delivery evidence required');
 if(action==='close'&&!reason.trim())throw Error('Closure reason required');
 const entry={action,from:c.status,to:next,actor,reason,documentId,at};
 const result={...c,status:next,history:[...c.history,entry]};
 if(action==='record-attorney-direction')result.attorneyMaterial=[...c.attorneyMaterial,{documentId,at,restricted:true}];
 if(action==='record-authorized-send')result.outboundNotices=[...c.outboundNotices,{documentId,at,deliveryEvidence,approvedBy:actor}];
 return result;
}
function attorneyPacket(c){return {projectId:c.projectId,subcontractorId:c.subcontractorId,route:c.route,history:c.history,outboundNotices:c.outboundNotices,confidential:true,include:'chronology, executed contract clauses, billing and acceptance evidence, notices, delivery records, subcontractor replies, risks, open deadlines and questions for counsel'};}
window.tcDisputeCaseFlow={ROUTES,STATES,ACTIONS,create,transition,attorneyPacket};
})();