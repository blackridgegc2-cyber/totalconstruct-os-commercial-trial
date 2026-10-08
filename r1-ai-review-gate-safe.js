/* AI intake review gate: source-linked proposals, never silent financial writes.
 * This module is a client-side review layer, not an authoritative server audit.
 */
(()=>{'use strict';
const FINANCIAL=/amount|cost|price|fee|budget|contract|retainage|payment|invoice|gmp|sov|draw|change.?order/i;
const CRITICAL=/contract|gmp|budget|payment|invoice|retainage|change.?order|pay.?app|owner|lender/i;
function inspect(result,projectId){
 const fields=result&&typeof result==='object'?(result.extracted||result.fields||result.data||{}):{};
 const sources=result?.sources||{};
 const proposals=[];
 for(const [key,raw] of Object.entries(fields)){
  if(raw==null||typeof raw==='object')continue;
  const value=String(raw).trim();if(!value)continue;
  const source=sources[key]||null;
  const risk=CRITICAL.test(key)?'critical':FINANCIAL.test(key)?'high':'normal';
  proposals.push({id:projectId+':'+key,key,value,source,risk,status:'pending',reason:source?'':'No source citation provided'});
 }
 return {projectId,proposals,blocked:proposals.filter(p=>p.risk!=='normal'&&!p.source).length};
}
function validate(proposal,decision,reason){
 if(!['accept','reject','needs-review'].includes(decision))throw Error('Invalid decision');
 if(!proposal?.source&&decision==='accept')throw Error('Cannot accept a field without a traceable document/page source');
 if(proposal.risk==='critical'&&decision==='accept')throw Error('Critical contract and financial fields require server-side authorized approval; not available in this UI');
 if(decision==='reject'&&!String(reason||'').trim())throw Error('Rejection reason required');
 return {...proposal,status:decision,reason:String(reason||''),reviewedAt:new Date().toISOString()};
}
function reviewPanel(result,projectId){
 const report=inspect(result,projectId);
 const root=document.createElement('section');root.className='card section';
 const title=document.createElement('h3');title.textContent='AI Document Assimilation — Human Review Required';root.append(title);
 const info=document.createElement('p');info.textContent='AI findings are suggestions only. Source documents remain authoritative. No financial, contract, or project data is automatically changed here.';root.append(info);
 for(const p of report.proposals){
  const row=document.createElement('div');row.style.cssText='padding:12px 0;border-bottom:1px solid #ddd';
  const heading=document.createElement('strong');heading.textContent=p.key+' — '+p.risk.toUpperCase();row.append(heading);
  const value=document.createElement('p');value.textContent=p.value;row.append(value);
  const src=document.createElement('p');src.textContent=p.source?'Source: '+p.source:'BLOCKED: source document/page unavailable';row.append(src);
  const select=document.createElement('select');for(const [v,t] of [['pending','Pending'],['needs-review','Needs review'],['reject','Reject']]){const o=document.createElement('option');o.value=v;o.textContent=t;select.append(o)}
  const note=document.createElement('input');note.placeholder='Reviewer note / discrepancy';note.setAttribute('aria-label','Reviewer note for '+p.key);
  select.onchange=()=>{if(select.value==='reject'&&!note.value.trim()){select.value='pending';window.tcNotify?.('Add a rejection reason before rejecting.',{type:'warning'});return}p.status=select.value;p.reason=note.value;p.reviewedAt=new Date().toISOString()};
  row.append(select,note);root.append(row);
 }
 const foot=document.createElement('p');foot.textContent='Approval and posting require authenticated server validation, permissions, duplicate checks, source snapshots and immutable audit records.';root.append(foot);
 return root;
}
window.tcAiReviewGate={inspect,validate,reviewPanel};
})();